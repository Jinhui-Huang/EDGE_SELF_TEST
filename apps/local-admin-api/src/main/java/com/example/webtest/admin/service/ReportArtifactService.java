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
    public record ArtifactContent(byte[] bytes, String contentType) {}

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

    // ---- GET /api/phase3/runs/{runId}/report-summary ----

    @SuppressWarnings("unchecked")
    public Object getReportSummary(String runId) {
        Path dir = resolveRunDir(runId);
        Path reportJson = dir.resolve("report.json");
        if (!Files.isRegularFile(reportJson)) {
            return buildFallbackSummary(runId);
        }
        try {
            Map<String, Object> raw = Jsons.readValue(Files.readString(reportJson), Map.class);
            return buildSummary(raw, dir);
        } catch (IOException e) {
            return buildFallbackSummary(runId);
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
        return buildUnavailableDataDiff(runId);
    }

    // ---- GET /api/phase3/runs/{runId}/data-diff/raw ----

    @SuppressWarnings("unchecked")
    public Object getRawDataDiff(String runId) {
        Path dir = resolveRunDir(runId);
        Path rawDiffJson = dir.resolve("data-diff-raw.json");
        if (Files.isRegularFile(rawDiffJson)) {
            try {
                return Jsons.readValue(Files.readString(rawDiffJson), Map.class);
            } catch (IOException ignored) {
            }
        }
        return buildUnavailableRawDataDiff(runId);
    }

    // ---- GET /api/phase3/runs/{runId}/restore-result ----

    @SuppressWarnings("unchecked")
    public Object getRestoreResult(String runId) {
        Path dir = resolveRunDir(runId);
        Path restoreJson = dir.resolve("restore-result.json");
        if (Files.isRegularFile(restoreJson)) {
            try {
                return Jsons.readValue(Files.readString(restoreJson), Map.class);
            } catch (IOException ignored) {
            }
        }
        return buildUnavailableRestoreResult(runId);
    }

    // ---- POST /api/phase3/runs/{runId}/restore/retry ----

    @SuppressWarnings("unchecked")
    public Map<String, Object> restoreRetry(String runId, String body) {
        resolveRunDir(runId); // validate runId (path traversal check)

        Map<String, Object> input = Map.of();
        if (body != null && !body.isBlank()) {
            try {
                input = Jsons.readValue(body, Map.class);
            } catch (Exception ignored) {
            }
        }

        String operator = stringValue(input.getOrDefault("operator", "unknown"));
        String reason = stringValue(input.getOrDefault("reason", ""));

        // Check current restore state — reject if already retrying
        Object current = getRestoreResult(runId);
        if (current instanceof Map<?, ?> m) {
            String currentStatus = stringValue(m.get("status"));
            if ("RETRY_IN_PROGRESS".equals(currentStatus)) {
                Map<String, Object> rejected = new LinkedHashMap<>();
                rejected.put("status", "REJECTED");
                rejected.put("kind", "restore-retry");
                rejected.put("runId", runId);
                rejected.put("requestedState", "RESTORE_RETRY_QUEUED");
                rejected.put("message", "Restore retry already in progress for run " + runId);
                return rejected;
            }
        }

        Map<String, Object> accepted = new LinkedHashMap<>();
        accepted.put("status", "ACCEPTED");
        accepted.put("kind", "restore-retry");
        accepted.put("runId", runId);
        accepted.put("requestedState", "RESTORE_RETRY_QUEUED");
        accepted.put("message", "Restore retry queued by " + operator
                + (reason.isEmpty() ? "" : " — " + reason));
        return accepted;
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
                    String relativePath = dir.relativize(file).toString().replace('\\', '/');
                    artifactItems.add(Map.of(
                            "kind", inferArtifactKind(name),
                            "label", name,
                            "path", relativePath));
                });
            } catch (IOException ignored) {
            }
        }
        return Map.of("runId", runId, "items", artifactItems);
    }

    public ArtifactContent getArtifactContent(String runId, String artifactPath) throws IOException {
        Path runDir = resolveRunDir(runId);
        Path resolved = runDir.resolve(artifactPath).normalize();
        if (!resolved.startsWith(runDir) || !Files.isRegularFile(resolved)) {
            throw new IllegalArgumentException("Artifact not found: " + artifactPath);
        }
        return new ArtifactContent(Files.readAllBytes(resolved), inferContentType(resolved.getFileName().toString()));
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
        return buildUnavailableRecovery(runId);
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
        return buildUnavailableAiDecisions(runId);
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
        String runName = stringValue(raw.getOrDefault("runName", runId));
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
        result.put("runName", runName);
        result.put("status", status);
        result.put("startedAt", stringValue(raw.get("startedAt")));
        result.put("finishedAt", stringValue(raw.get("finishedAt")));
        result.put("durationMs", durationMs);
        result.put("projectKey", stringValue(raw.get("projectKey")));
        result.put("projectName", stringValue(raw.get("projectName")));
        result.put("caseId", stringValue(raw.get("caseId")));
        result.put("caseName", stringValue(raw.get("caseName")));
        result.put("tags", stringListValue(raw.get("tags")));
        result.put("environment", stringValue(raw.get("environment")));
        result.put("model", stringValue(raw.get("model")));
        result.put("operator", stringValue(raw.get("operator")));
        result.put("entry", stringValue(raw.get("entry")));
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
                    String relativePath = dir.relativize(file).toString().replace('\\', '/');
                    artifacts.add(Map.of(
                            "kind", inferArtifactKind(name),
                            "label", name,
                            "path", relativePath));
                });
            } catch (IOException ignored) {
            }
        }
        result.put("artifacts", artifacts);

        return result;
    }

    private Map<String, Object> buildFallbackSummary(String runId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("runName", runId);
        result.put("status", "UNAVAILABLE");
        result.put("startedAt", "");
        result.put("finishedAt", "");
        result.put("durationMs", 0);
        result.put("projectKey", "");
        result.put("projectName", "");
        result.put("caseId", "");
        result.put("caseName", "");
        result.put("tags", List.of());
        result.put("environment", "");
        result.put("model", "");
        result.put("operator", "");
        result.put("entry", "");
        result.put("stepsTotal", 0);
        result.put("stepsPassed", 0);
        result.put("assertionsTotal", 0);
        result.put("assertionsPassed", 0);
        result.put("artifactCount", 0);
        result.put("outputDir", "");
        return result;
    }

    private Map<String, Object> buildFallbackReport(String runId) {
        Map<String, Object> result = new LinkedHashMap<>(buildFallbackSummary(runId));
        result.put("summary", Map.of("total", 0, "passed", 0, "failed", 0, "skipped", 0));
        result.put("steps", List.of());
        result.put("assertions", List.of());
        result.put("artifacts", List.of());
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildUnavailableDataDiff(String runId) {
        String projectKey = "";
        String caseId = "";
        String caseName = "";
        Map<String, Object> database = Map.of("id", "", "name", "");
        Path reportJson = resolveRunDir(runId).resolve("report.json");
        if (Files.isRegularFile(reportJson)) {
            try {
                Map<String, Object> raw = Jsons.readValue(Files.readString(reportJson), Map.class);
                projectKey = stringValue(raw.get("projectKey"));
                caseId = stringValue(raw.get("caseId"));
                caseName = stringValue(raw.get("caseName"));
                database = Map.of(
                        "id", stringValue(raw.get("databaseId")),
                        "name", stringValue(raw.get("databaseName")));
            } catch (IOException ignored) {
            }
        }

        return Map.of(
                "runId", runId,
                "status", "UNAVAILABLE",
                "projectKey", projectKey,
                "caseId", caseId,
                "caseName", caseName,
                "database", database,
                "summary", Map.of(
                        "expectedChanges", 0,
                        "unexpectedChanges", 0,
                        "restoredCount", 0,
                        "totalRows", 0,
                        "affectedTables", 0),
                "rows", List.of());
    }

    private static String inferArtifactKind(String filename) {
        if (filename.endsWith(".html")) {
            return "report-html";
        }
        if (filename.endsWith(".json")) {
            return "report-json";
        }
        if (filename.endsWith(".log")) {
            return "log";
        }
        if (filename.endsWith(".png") || filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
            return "screenshot";
        }
        return "other";
    }

    private static String inferContentType(String filename) {
        String normalized = filename.toLowerCase();
        if (normalized.endsWith(".png")) {
            return "image/png";
        }
        if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (normalized.endsWith(".gif")) {
            return "image/gif";
        }
        if (normalized.endsWith(".webp")) {
            return "image/webp";
        }
        if (normalized.endsWith(".svg")) {
            return "image/svg+xml";
        }
        if (normalized.endsWith(".html")) {
            return "text/html; charset=utf-8";
        }
        if (normalized.endsWith(".json")) {
            return "application/json; charset=utf-8";
        }
        if (normalized.endsWith(".txt") || normalized.endsWith(".log")) {
            return "text/plain; charset=utf-8";
        }
        return "application/octet-stream";
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

    private static List<String> stringListValue(Object value) {
        if (value instanceof List<?> l) {
            List<String> result = new ArrayList<>();
            for (Object item : l) {
                String normalized = stringValue(item).trim();
                if (!normalized.isEmpty()) {
                    result.add(normalized);
                }
            }
            return result;
        }
        String raw = stringValue(value).trim();
        if (raw.isEmpty()) {
            return List.of();
        }
        String[] parts = raw.split(",");
        List<String> result = new ArrayList<>();
        for (String part : parts) {
            String normalized = part.trim();
            if (!normalized.isEmpty()) {
                result.add(normalized);
            }
        }
        return result;
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

    private Map<String, Object> buildUnavailableRecovery(String runId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("status", "UNAVAILABLE");
        result.put("items", List.of());
        return result;
    }

    private Map<String, Object> buildUnavailableRawDataDiff(String runId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("status", "UNAVAILABLE");
        result.put("before", List.of());
        result.put("after", List.of());
        result.put("afterRestore", List.of());
        return result;
    }

    private Map<String, Object> buildUnavailableRestoreResult(String runId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("status", "UNAVAILABLE");
        result.put("items", List.of());
        return result;
    }

    private Map<String, Object> buildUnavailableAiDecisions(String runId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("status", "UNAVAILABLE");
        result.put("items", List.of());
        return result;
    }
}
