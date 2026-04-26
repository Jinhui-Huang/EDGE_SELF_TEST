package com.example.webtest.admin.service;

import com.example.webtest.json.Jsons;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * Reads real report artifacts from {@code runs/<runId>/report.json} and derives
 * structured run-summary, report-detail, assertion, artifact, and data-diff
 * responses for the admin-console report pages.
 */
public final class ReportArtifactService {
    private final Path reportRoot;

    public ReportArtifactService(Path reportRoot) {
        this.reportRoot = reportRoot;
    }

    // ---- GET /api/phase3/runs/ ----

    @SuppressWarnings("unchecked")
    public Object listRuns() {
        Path root = reportRoot.toAbsolutePath().normalize();
        if (!Files.isDirectory(root)) {
            return Map.of("items", List.of());
        }
        List<Map<String, Object>> items = new ArrayList<>();
        try (Stream<Path> children = Files.list(root)) {
            children.filter(Files::isDirectory).forEach(dir -> {
                Path reportJson = dir.resolve("report.json");
                if (!Files.isRegularFile(reportJson)) {
                    return;
                }
                try {
                    Map<String, Object> raw = Jsons.readValue(Files.readString(reportJson), Map.class);
                    items.add(buildSummary(raw, dir));
                } catch (IOException ignored) {
                }
            });
        } catch (IOException ignored) {
        }
        items.sort((a, b) -> String.valueOf(b.getOrDefault("finishedAt", ""))
                .compareTo(String.valueOf(a.getOrDefault("finishedAt", ""))));
        return Map.of("items", items);
    }

    // ---- GET /api/phase3/runs/{runId}/report ----

    @SuppressWarnings("unchecked")
    public Object getReport(String runId) {
        Path dir = resolveRunDir(runId);
        Path reportJson = dir.resolve("report.json");
        if (!Files.isRegularFile(reportJson)) {
            return buildFallbackReport(runId);
        }
        try {
            Map<String, Object> raw = Jsons.readValue(Files.readString(reportJson), Map.class);
            return buildFullReport(raw, dir);
        } catch (IOException e) {
            return buildFallbackReport(runId);
        }
    }

    // ---- GET /api/phase3/runs/{runId}/data-diff ----

    @SuppressWarnings("unchecked")
    public Object getDataDiff(String runId) {
        Path dir = resolveRunDir(runId);
        Path diffJson = dir.resolve("data-diff.json");
        if (Files.isRegularFile(diffJson)) {
            try {
                return Jsons.readValue(Files.readString(diffJson), Map.class);
            } catch (IOException ignored) {
            }
        }
        return buildMockDataDiff(runId);
    }

    // ---- GET /api/phase3/runs/{runId}/assertions ----

    @SuppressWarnings("unchecked")
    public Object getAssertions(String runId) {
        Path reportJson = resolveRunDir(runId).resolve("report.json");
        List<Map<String, Object>> assertionItems = new ArrayList<>();
        if (Files.isRegularFile(reportJson)) {
            try {
                Map<String, Object> raw = Jsons.readValue(Files.readString(reportJson), Map.class);
                List<Map<String, Object>> steps = listValue(raw.get("steps"));
                for (Map<String, Object> step : steps) {
                    String action = stringValue(step.get("action"));
                    if (action.startsWith("ASSERT")) {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("name", stringValue(step.get("stepName")));
                        item.put("action", action);
                        item.put("status", stringValue(step.get("status")));
                        item.put("message", step.get("message") != null ? step.get("message") : "");
                        item.put("pass", "SUCCESS".equals(stringValue(step.get("status"))));
                        assertionItems.add(item);
                    }
                }
            } catch (IOException ignored) {
            }
        }
        return Map.of("runId", runId, "items", assertionItems);
    }

    // ---- GET /api/phase3/runs/{runId}/artifacts ----

    public Object getArtifacts(String runId) {
        Path dir = resolveRunDir(runId);
        List<Map<String, String>> artifactItems = new ArrayList<>();
        if (Files.isDirectory(dir)) {
            try (Stream<Path> files = Files.list(dir)) {
                files.filter(Files::isRegularFile).forEach(file -> {
                    String name = file.getFileName().toString();
                    artifactItems.add(Map.of(
                            "kind", inferArtifactKind(name),
                            "label", name,
                            "path", file.toAbsolutePath().normalize().toString()));
                });
            } catch (IOException ignored) {
            }
        }
        return Map.of("runId", runId, "items", artifactItems);
    }

    // ---- GET /api/phase3/runs/{runId}/recovery ----

    @SuppressWarnings("unchecked")
    public Object getRecovery(String runId) {
        Path dir = resolveRunDir(runId);
        Path recoveryJson = dir.resolve("recovery.json");
        if (Files.isRegularFile(recoveryJson)) {
            try {
                return Jsons.readValue(Files.readString(recoveryJson), Map.class);
            } catch (IOException ignored) {
            }
        }
        return buildMockRecovery(runId);
    }

    // ---- GET /api/phase3/runs/{runId}/ai-decisions ----

    @SuppressWarnings("unchecked")
    public Object getAiDecisions(String runId) {
        Path dir = resolveRunDir(runId);
        Path aiJson = dir.resolve("ai-decisions.json");
        if (Files.isRegularFile(aiJson)) {
            try {
                return Jsons.readValue(Files.readString(aiJson), Map.class);
            } catch (IOException ignored) {
            }
        }
        return buildMockAiDecisions(runId);
    }

    // ---- internal ----

    private Path resolveRunDir(String runId) {
        Path root = reportRoot.toAbsolutePath().normalize();
        Path resolved = root.resolve(runId).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("Invalid runId: path traversal detected");
        }
        return resolved;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildSummary(Map<String, Object> raw, Path dir) {
        String runId = stringValue(raw.getOrDefault("runId", dir.getFileName().toString()));
        Map<String, Object> summary = mapValue(raw.get("summary"));
        List<Map<String, Object>> steps = listValue(raw.get("steps"));
        int total = intValue(summary.get("total"));
        int passed = intValue(summary.get("passed"));
        int failed = intValue(summary.get("failed"));
        int durationMs = intValue(summary.get("durationMs"));
        String status = total == 0 ? "INFO" : failed > 0 ? "FAILED" : "OK";

        int assertionsTotal = 0;
        int assertionsPassed = 0;
        int artifactCount = 0;
        for (Map<String, Object> step : steps) {
            String action = stringValue(step.get("action"));
            if (action.startsWith("ASSERT")) {
                assertionsTotal++;
                if ("SUCCESS".equals(stringValue(step.get("status")))) {
                    assertionsPassed++;
                }
            }
            String artifactPath = stringValue(step.get("artifactPath"));
            if (!artifactPath.isEmpty()) {
                artifactCount++;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("status", status);
        result.put("startedAt", stringValue(raw.get("startedAt")));
        result.put("finishedAt", stringValue(raw.get("finishedAt")));
        result.put("durationMs", durationMs);
        result.put("stepsTotal", total);
        result.put("stepsPassed", passed);
        result.put("assertionsTotal", assertionsTotal);
        result.put("assertionsPassed", assertionsPassed);
        result.put("artifactCount", artifactCount);
        result.put("outputDir", stringValue(raw.get("outputDir")));
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildFullReport(Map<String, Object> raw, Path dir) {
        Map<String, Object> result = new LinkedHashMap<>(buildSummary(raw, dir));
        result.put("summary", mapValue(raw.get("summary")));
        result.put("steps", listValue(raw.get("steps")));

        List<Map<String, Object>> assertions = new ArrayList<>();
        for (Map<String, Object> step : listValue(raw.get("steps"))) {
            String action = stringValue(step.get("action"));
            if (action.startsWith("ASSERT")) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("name", stringValue(step.get("stepName")));
                item.put("action", action);
                item.put("status", stringValue(step.get("status")));
                item.put("message", step.get("message") != null ? step.get("message") : "");
                item.put("pass", "SUCCESS".equals(stringValue(step.get("status"))));
                assertions.add(item);
            }
        }
        result.put("assertions", assertions);

        List<Map<String, String>> artifacts = new ArrayList<>();
        if (Files.isDirectory(dir)) {
            try (Stream<Path> files = Files.list(dir)) {
                files.filter(Files::isRegularFile).forEach(file -> {
                    String name = file.getFileName().toString();
                    artifacts.add(Map.of(
                            "kind", inferArtifactKind(name),
                            "label", name,
                            "path", file.toAbsolutePath().normalize().toString()));
                });
            } catch (IOException ignored) {
            }
        }
        result.put("artifacts", artifacts);

        return result;
    }

    private Map<String, Object> buildFallbackReport(String runId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("status", "UNKNOWN");
        result.put("startedAt", "");
        result.put("finishedAt", "");
        result.put("durationMs", 0);
        result.put("stepsTotal", 0);
        result.put("stepsPassed", 0);
        result.put("assertionsTotal", 0);
        result.put("assertionsPassed", 0);
        result.put("artifactCount", 0);
        result.put("outputDir", "");
        result.put("summary", Map.of("total", 0, "passed", 0, "failed", 0, "skipped", 0));
        result.put("steps", List.of());
        result.put("assertions", List.of());
        result.put("artifacts", List.of());
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildMockDataDiff(String runId) {
        String status = "UNKNOWN";
        Path reportJson = resolveRunDir(runId).resolve("report.json");
        if (Files.isRegularFile(reportJson)) {
            try {
                Map<String, Object> raw = Jsons.readValue(Files.readString(reportJson), Map.class);
                Map<String, Object> summary = mapValue(raw.get("summary"));
                int failed = intValue(summary.get("failed"));
                status = failed > 0 ? "FAILED" : "OK";
            } catch (IOException ignored) {
            }
        }
        boolean isFailed = "FAILED".equals(status);
        String pkSuffix = runId.length() >= 6 ? runId.substring(0, 6) : runId;

        List<Map<String, Object>> rows = List.of(
                diffRow("orders", "ord_8821", "status", "null",
                        isFailed ? "\"pending\"" : "\"paid\"", "null", true, true),
                diffRow("orders", "ord_8821", "total_cents", "null", "8910", "null", true, true),
                diffRow("order_items", "oi_9104", "(row)", "-", "inserted", "-", true, true),
                diffRow("order_items", "oi_9105", "(row)", "-", "inserted", "-", true, true),
                diffRow("products", "sku_A", "stock", "50",
                        isFailed ? "50" : "49", "50", true, true),
                diffRow("products", "sku_B", "stock", "28",
                        isFailed ? "28" : "27", "28", true, true),
                diffRow("coupons", "SAVE10", "used_count", "142",
                        isFailed ? "142" : "143", "142", true, true),
                diffRow("audit_log", "log_" + pkSuffix, "(row)", "-",
                        "inserted", "kept", false, false));

        long expected = rows.stream().filter(r -> Boolean.TRUE.equals(r.get("expected"))).count();
        long unexpected = rows.size() - expected;
        long restored = rows.stream().filter(r -> Boolean.TRUE.equals(r.get("restored"))).count();
        long tables = rows.stream().map(r -> r.get("table")).distinct().count();

        return Map.of(
                "runId", runId,
                "summary", Map.of(
                        "expectedChanges", expected,
                        "unexpectedChanges", unexpected,
                        "restoredCount", restored,
                        "totalRows", (long) rows.size(),
                        "affectedTables", tables),
                "rows", rows);
    }

    private static Map<String, Object> diffRow(String table, String pk, String field,
            String before, String after, String afterRestore,
            boolean expected, boolean restored) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("table", table);
        row.put("pk", pk);
        row.put("field", field);
        row.put("before", before);
        row.put("after", after);
        row.put("afterRestore", afterRestore);
        row.put("expected", expected);
        row.put("restored", restored);
        return row;
    }

    private static String inferArtifactKind(String filename) {
        if (filename.endsWith(".html")) {
            return "report-html";
        }
        if (filename.endsWith(".json")) {
            return "report-json";
        }
        if (filename.endsWith(".png") || filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
            return "screenshot";
        }
        return "other";
    }

    private static String stringValue(Object value) {
        if (value == null) {
            return "";
        }
        return value.toString();
    }

    private static int intValue(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> mapValue(Object value) {
        if (value instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        return Map.of();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> listValue(Object value) {
        if (value instanceof List<?> l) {
            return (List<Map<String, Object>>) l;
        }
        return List.of();
    }

    private Map<String, Object> buildMockRecovery(String runId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("status", "PARTIAL");
        result.put("items", List.of(
                Map.of("step", "restore snapshot", "status", "SUCCESS",
                        "detail", "Primary checkout schema restored from pre-run backup"),
                Map.of("step", "verify row counts", "status", "SUCCESS",
                        "detail", "Row counts match pre-run baseline"),
                Map.of("step", "restore audit_log", "status", "SKIPPED",
                        "detail", "Audit log rows are kept by policy")));
        return result;
    }

    private Map<String, Object> buildMockAiDecisions(String runId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("items", List.of(
                Map.of("at", "2026-04-20T05:37:12Z", "type", "LOCATOR_HEAL",
                        "model", "claude-4.5-sonnet",
                        "summary", "Candidate[1] selected after primary locator #pay-now failed"),
                Map.of("at", "2026-04-20T05:38:01Z", "type", "WAIT_STRATEGY",
                        "model", "claude-4.5-sonnet",
                        "summary", "Extended wait to 8s for payment iframe to settle"),
                Map.of("at", "2026-04-20T05:39:45Z", "type", "ASSERTION_SUGGESTION",
                        "model", "claude-4.5-sonnet",
                        "summary", "Suggested adding URL pattern assertion for /order/confirm/*")));
        return result;
    }
}
