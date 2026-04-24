package com.example.webtest.admin.service;

import com.example.webtest.json.Jsons;
import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Deterministic, mock-realistic validation for Phase 3 model and datasource
 * connection-test endpoints. No external network or database calls are made.
 */
public final class ConnectionValidationService {
    private static final Set<String> MODEL_ROLES = Set.of("primary", "secondary", "fallback");
    private static final Set<String> MODEL_STATUSES = Set.of("active", "fallback", "disabled");
    private static final Set<String> DATABASE_TYPES = Set.of("Oracle", "MySQL", "PostgreSQL", "SQL Server", "MariaDB", "DB2");

    public Map<String, Object> testModelConnection(String body) throws IOException {
        Map<String, Object> request = parseBody(body);
        String providerName = firstNonBlank(
                stringField(request, "name"),
                stringField(request, "providerName"),
                stringField(request, "displayName"),
                stringField(request, "id"));
        String model = stringField(request, "model");
        String endpoint = stringField(request, "endpoint");
        String apiKey = stringField(request, "apiKey");
        String timeout = firstNonBlank(stringField(request, "timeoutMs"), stringField(request, "timeout"));
        String role = stringField(request, "role");
        String status = stringField(request, "status");

        List<Map<String, Object>> checks = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        addCheck(checks, "provider-name", isPresent(providerName), "Provider name is present.",
                "Provider name is required.");
        addCheck(checks, "model-id", isValidModelId(model),
                "Model identifier format looks valid.",
                "Model identifier is missing or contains unsupported characters.");
        addCheck(checks, "endpoint-format", isValidHttpEndpoint(endpoint),
                "Endpoint format looks valid.",
                "Endpoint must be an absolute http/https URL.");

        ValidationStatus timeoutStatus = validateTimeout(timeout);
        addCheck(checks, "timeout-ms", timeoutStatus.status,
                timeoutStatus.passMessage,
                timeoutStatus.failMessage);

        ValidationStatus credentialStatus = validateCredential(apiKey, "API key");
        addCheck(checks, "api-key", credentialStatus.status,
                credentialStatus.passMessage,
                credentialStatus.failMessage);
        if ("WARNING".equals(credentialStatus.status)) {
            warnings.add(credentialStatus.failMessage);
        }

        boolean lifecycleValid = MODEL_ROLES.contains(role) && MODEL_STATUSES.contains(status);
        addCheck(checks, "provider-lifecycle", lifecycleValid,
                "Provider role/status combination is recognized.",
                "Role/status must use documented Phase 3 values.");
        if ("primary".equals(role) && "disabled".equals(status)) {
            warnings.add("Primary providers should not remain disabled in the active routing set.");
            checks.add(Map.of(
                    "name", "role-status-alignment",
                    "status", "WARNING",
                    "message", "Primary role is configured as disabled."));
        }

        String overall = summarizeStatus(checks, warnings);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", overall);
        result.put("checks", checks);
        result.put("latencyMs", deterministicLatency(providerName, model, endpoint));
        result.put("resolvedModel", model);
        result.put("message", switch (overall) {
            case "PASSED" -> "Provider validation passed.";
            case "WARNING" -> "Provider validation completed with warnings.";
            default -> "Provider validation failed.";
        });
        result.put("warnings", warnings);
        return result;
    }

    public Map<String, Object> testDatasourceConnection(String body) throws IOException {
        Map<String, Object> request = parseBody(body);
        String type = stringField(request, "type");
        String driver = stringField(request, "driver");
        String url = stringField(request, "url");
        String schema = stringField(request, "schema");
        String username = stringField(request, "username");
        String password = stringField(request, "password");
        String mybatisEnv = stringField(request, "mybatisEnv");

        List<Map<String, Object>> checks = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        addCheck(checks, "db-type", DATABASE_TYPES.contains(type),
                "Database type is recognized.",
                "Database type must use a supported Phase 3 datasource value.");
        addCheck(checks, "jdbc-url-shape", isValidJdbcUrl(type, url),
                "JDBC URL shape matches the datasource type.",
                "JDBC URL is missing or does not match the selected datasource type.");
        addCheck(checks, "driver-type-match", isDriverCompatible(type, driver),
                "Driver matches the datasource type.",
                "Driver class does not match the selected datasource type.");
        addCheck(checks, "schema-name", isValidSchema(schema),
                "Schema name format looks valid.",
                "Schema is required and must use a simple identifier format.");
        addCheck(checks, "username", isPresent(username),
                "Username is present.",
                "Username is required.");

        ValidationStatus passwordStatus = validateCredential(password, "Password");
        addCheck(checks, "password", passwordStatus.status,
                passwordStatus.passMessage,
                passwordStatus.failMessage);
        if ("WARNING".equals(passwordStatus.status)) {
            warnings.add(passwordStatus.failMessage);
        }

        addCheck(checks, "mybatis-env", isValidMybatisEnv(mybatisEnv),
                "MyBatis environment id looks valid.",
                "MyBatis environment is required and must use letters, numbers, dot, dash, or underscore.");

        if (isPresent(mybatisEnv) && isPresent(type) && !mybatisEnvMatchesType(mybatisEnv, type)) {
            warnings.add("MyBatis environment name does not obviously match the datasource type.");
            checks.add(Map.of(
                    "name", "mybatis-type-hint",
                    "status", "WARNING",
                    "message", "MyBatis environment naming is unusual for the selected datasource type."));
        }

        String overall = summarizeStatus(checks, warnings);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", overall);
        result.put("checks", checks);
        result.put("resolvedDriver", defaultDriver(type, driver));
        result.put("message", switch (overall) {
            case "PASSED" -> "Datasource validation passed.";
            case "WARNING" -> "Datasource validation completed with warnings.";
            default -> "Datasource validation failed.";
        });
        result.put("warnings", warnings);
        return result;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> parseBody(String body) throws IOException {
        if (body == null || body.isBlank()) {
            return Map.of();
        }
        Object parsed = Jsons.readValue(body, Map.class);
        if (parsed instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }

    private static String stringField(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value == null ? "" : value.toString().trim();
    }

    private static String firstNonBlank(String... candidates) {
        for (String candidate : candidates) {
            if (candidate != null && !candidate.isBlank()) {
                return candidate.trim();
            }
        }
        return "";
    }

    private static boolean isPresent(String value) {
        return value != null && !value.isBlank();
    }

    private static boolean isValidModelId(String value) {
        return isPresent(value) && value.matches("[A-Za-z0-9][A-Za-z0-9._:/-]{1,127}");
    }

    private static boolean isValidHttpEndpoint(String value) {
        if (!isPresent(value) || value.contains(" ")) {
            return false;
        }
        try {
            URI uri = URI.create(value);
            return uri.isAbsolute()
                    && ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static ValidationStatus validateTimeout(String value) {
        if (!isPresent(value)) {
            return ValidationStatus.failed("Timeout is required.");
        }
        try {
            int timeoutMs = Integer.parseInt(value);
            if (timeoutMs < 1000 || timeoutMs > 300000) {
                return ValidationStatus.failed("Timeout must be between 1000 and 300000 ms.");
            }
            return ValidationStatus.passed("Timeout is within the accepted range.");
        } catch (NumberFormatException e) {
            return ValidationStatus.failed("Timeout must be an integer millisecond value.");
        }
    }

    private static ValidationStatus validateCredential(String value, String label) {
        if (!isPresent(value)) {
            return ValidationStatus.failed(label + " is required.");
        }
        String normalized = value.toLowerCase(Locale.ROOT);
        if (normalized.contains("***")
                || normalized.contains("placeholder")
                || normalized.contains("your-")
                || normalized.contains("replace")
                || normalized.contains("changeme")
                || normalized.startsWith("<")
                || normalized.endsWith(">")) {
            return ValidationStatus.warning(label + " looks like a placeholder value.");
        }
        return ValidationStatus.passed(label + " is populated.");
    }

    private static boolean isValidJdbcUrl(String type, String url) {
        if (!isPresent(url)) {
            return false;
        }
        return switch (type) {
            case "Oracle" -> url.startsWith("jdbc:oracle:");
            case "MySQL" -> url.startsWith("jdbc:mysql://");
            case "PostgreSQL" -> url.startsWith("jdbc:postgresql://");
            case "SQL Server" -> url.startsWith("jdbc:sqlserver://");
            case "MariaDB" -> url.startsWith("jdbc:mariadb://");
            case "DB2" -> url.startsWith("jdbc:db2://");
            default -> false;
        };
    }

    private static boolean isDriverCompatible(String type, String driver) {
        if (!isPresent(driver)) {
            return false;
        }
        String normalized = driver.toLowerCase(Locale.ROOT);
        return switch (type) {
            case "Oracle" -> normalized.contains("oracle");
            case "MySQL" -> normalized.contains("mysql");
            case "PostgreSQL" -> normalized.contains("postgresql");
            case "SQL Server" -> normalized.contains("sqlserver");
            case "MariaDB" -> normalized.contains("mariadb");
            case "DB2" -> normalized.contains("db2");
            default -> false;
        };
    }

    private static boolean isValidSchema(String schema) {
        return isPresent(schema) && schema.matches("[A-Za-z_][A-Za-z0-9_$]{0,63}");
    }

    private static boolean isValidMybatisEnv(String value) {
        return isPresent(value) && value.matches("[A-Za-z0-9][A-Za-z0-9._-]{1,63}");
    }

    private static boolean mybatisEnvMatchesType(String mybatisEnv, String type) {
        String normalized = mybatisEnv.toLowerCase(Locale.ROOT);
        return switch (type) {
            case "Oracle" -> normalized.contains("oracle");
            case "MySQL" -> normalized.contains("mysql");
            case "PostgreSQL" -> normalized.contains("postgres") || normalized.contains("pgsql") || normalized.contains("pg");
            case "SQL Server" -> normalized.contains("sqlserver") || normalized.contains("mssql");
            case "MariaDB" -> normalized.contains("mariadb");
            case "DB2" -> normalized.contains("db2");
            default -> true;
        };
    }

    private static String defaultDriver(String type, String driver) {
        if (isDriverCompatible(type, driver)) {
            return driver;
        }
        return switch (type) {
            case "Oracle" -> "oracle.jdbc.OracleDriver";
            case "MySQL" -> "com.mysql.cj.jdbc.Driver";
            case "PostgreSQL" -> "org.postgresql.Driver";
            case "SQL Server" -> "com.microsoft.sqlserver.jdbc.SQLServerDriver";
            case "MariaDB" -> "org.mariadb.jdbc.Driver";
            case "DB2" -> "com.ibm.db2.jcc.DB2Driver";
            default -> driver;
        };
    }

    private static void addCheck(List<Map<String, Object>> checks, String name, boolean pass, String passMessage, String failMessage) {
        checks.add(Map.of(
                "name", name,
                "status", pass ? "PASSED" : "FAILED",
                "message", pass ? passMessage : failMessage));
    }

    private static void addCheck(List<Map<String, Object>> checks, String name, String status, String passMessage, String failMessage) {
        checks.add(Map.of(
                "name", name,
                "status", status,
                "message", "PASSED".equals(status) ? passMessage : failMessage));
    }

    private static String summarizeStatus(List<Map<String, Object>> checks, List<String> warnings) {
        boolean failed = checks.stream().anyMatch(item -> "FAILED".equals(item.get("status")));
        if (failed) {
            return "FAILED";
        }
        boolean warned = !warnings.isEmpty() || checks.stream().anyMatch(item -> "WARNING".equals(item.get("status")));
        return warned ? "WARNING" : "PASSED";
    }

    private static int deterministicLatency(String providerName, String model, String endpoint) {
        int seed = Math.abs((providerName + "|" + model + "|" + endpoint).hashCode());
        return 60 + (seed % 180);
    }

    private record ValidationStatus(String status, String passMessage, String failMessage) {
        private static ValidationStatus passed(String message) {
            return new ValidationStatus("PASSED", message, message);
        }

        private static ValidationStatus failed(String message) {
            return new ValidationStatus("FAILED", message, message);
        }

        private static ValidationStatus warning(String message) {
            return new ValidationStatus("WARNING", message, message);
        }
    }
}
