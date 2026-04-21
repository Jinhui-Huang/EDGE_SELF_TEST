package com.example.webtest.admin.service;

import com.example.webtest.json.Jsons;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Handles AI-assisted case generation, DSL validation, and dry-run checks.
 * Currently returns deterministic mock responses shaped by input context.
 * When a real AI agent is integrated, the generation methods will delegate
 * to the agent while keeping the same response contracts.
 */
public final class AgentGenerateService {

    public Map<String, Object> generateCase(String body) throws IOException {
        Map<String, Object> request = parseBody(body);
        String projectKey = stringField(request, "projectKey", "unknown-project");
        String documentId = stringField(request, "documentId", "unknown-doc");
        String caseId = stringField(request, "caseId", "unknown-case");
        String promptMode = stringField(request, "promptMode", "GENERATE");

        String caseName = humanize(caseId);
        String altCaseName = caseName + " - alt path";
        String altCaseId = caseId + "-alt";

        List<Map<String, Object>> generatedCases = new ArrayList<>();
        generatedCases.add(Map.of(
                "id", "gen-" + caseId + "-a",
                "name", caseName,
                "category", "happy",
                "confidence", "0.94",
                "summary", "Covers main flow with DB and delta assertions."));
        if ("REGENERATE".equals(promptMode)) {
            generatedCases.add(Map.of(
                    "id", "gen-" + altCaseId + "-b",
                    "name", altCaseName,
                    "category", "boundary",
                    "confidence", "0.81",
                    "summary", "Adds boundary branch and explicit wait checkpoint."));
        }

        String dslContent = buildDsl(caseName, projectKey, documentId);

        List<Map<String, Object>> flowTree = List.of(
                Map.of("label", "page.loaded", "tone", "accent", "indent", 0),
                Map.of("label", "click proceed", "tone", "muted", "indent", 1),
                Map.of("label", "form.visible", "tone", "accent", "indent", 0),
                Map.of("label", "fill fields", "tone", "muted", "indent", 1),
                Map.of("label", "click submit", "tone", "muted", "indent", 1),
                Map.of("label", "processing", "tone", "warning", "indent", 0),
                Map.of("label", "wait spinner gone", "tone", "muted", "indent", 1),
                Map.of("label", "confirmed", "tone", "success", "indent", 0),
                Map.of("label", "assert url", "tone", "muted", "indent", 1),
                Map.of("label", "assert text", "tone", "muted", "indent", 1),
                Map.of("label", "assert db", "tone", "muted", "indent", 1));

        Map<String, Object> stateMachine = Map.of(
                "states", List.of(
                        Map.of("id", "page.loaded", "label", "page.loaded"),
                        Map.of("id", "form.visible", "label", "form.visible"),
                        Map.of("id", "processing", "label", "processing"),
                        Map.of("id", "confirmed", "label", "confirmed")),
                "edges", List.of(
                        Map.of("from", "page.loaded", "to", "form.visible", "trigger", "click proceed"),
                        Map.of("from", "form.visible", "to", "processing", "trigger", "click submit"),
                        Map.of("from", "processing", "to", "confirmed", "trigger", "wait complete"),
                        Map.of("from", "processing", "to", "form.visible", "trigger", "retry on error")));

        List<Map<String, String>> reasoning = List.of(
                Map.of("label", "Coverage",
                        "body", "Expanded main flow, form validation, and rollback checkpoints from document context."),
                Map.of("label", "Locators",
                        "body", "Primary locators scored above 0.8; fragile CSS paths excluded."),
                Map.of("label", "Data plan",
                        "body", "Restore plan references snapshot-based rollback; comparison plan covers delta assertions."));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("documentId", documentId);
        result.put("selectedCaseId", caseId);
        result.put("generatedCases", generatedCases);
        result.put("reasoning", reasoning);
        result.put("selectedDsl", Map.of("format", "text/x-phase3-dsl", "content", dslContent));
        result.put("stateMachine", stateMachine);
        result.put("flowTree", flowTree);
        return result;
    }

    public Map<String, Object> validateDsl(String body) throws IOException {
        Map<String, Object> request = parseBody(body);
        String dsl = stringField(request, "dsl", "");

        List<Map<String, String>> errors = new ArrayList<>();
        List<Map<String, String>> warnings = new ArrayList<>();

        if (dsl.isBlank()) {
            errors.add(Map.of("code", "EMPTY_DSL", "message", "DSL content is empty."));
        }
        if (!dsl.contains("case ") && !dsl.contains("case\"") && !dsl.isBlank()) {
            warnings.add(Map.of("code", "MISSING_CASE_BLOCK",
                    "message", "DSL does not contain a recognizable case block declaration."));
        }

        String status = errors.isEmpty() ? "VALID" : "INVALID";
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", status);
        result.put("errors", errors);
        result.put("warnings", warnings);
        if (errors.isEmpty()) {
            result.put("normalizedDsl", dsl.strip());
        }
        return result;
    }

    public Map<String, Object> dryRun(String body) throws IOException {
        Map<String, Object> request = parseBody(body);
        String projectKey = stringField(request, "projectKey", "unknown-project");
        String environment = stringField(request, "environment", "staging");
        String dsl = stringField(request, "dsl", "");

        // First validate DSL
        List<Map<String, String>> errors = new ArrayList<>();
        if (dsl.isBlank()) {
            errors.add(Map.of("code", "EMPTY_DSL", "message", "DSL content is empty."));
        }

        String parserStatus = errors.isEmpty() ? "OK" : "FAILED";

        List<Map<String, String>> runtimeChecks = List.of(
                Map.of("name", "restorePlanRef", "status", "OK"),
                Map.of("name", "comparisonPlanRef", "status", "OK"),
                Map.of("name", "environmentAccess", "status", "OK"));

        String overallStatus = errors.isEmpty() ? "PASSED" : "FAILED";

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", overallStatus);
        result.put("parser", Map.of("status", parserStatus, "errors", errors));
        result.put("runtimeChecks", runtimeChecks);
        if (errors.isEmpty()) {
            result.put("suggestedLaunchForm", Map.of(
                    "projectKey", projectKey,
                    "environment", environment));
        }
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

    private static String stringField(Map<String, Object> map, String key, String fallback) {
        Object value = map.get(key);
        if (value instanceof String s && !s.isBlank()) {
            return s;
        }
        return fallback;
    }

    private static String humanize(String id) {
        if (id == null || id.isBlank()) return "Unknown case";
        return id.replace('-', ' ').replace('_', ' ');
    }

    private static String buildDsl(String caseName, String projectKey, String documentId) {
        return "case \"" + caseName + "\" {\n"
                + "  meta {\n"
                + "    project: \"" + projectKey + "\"\n"
                + "    sourceDocument: \"" + documentId + "\"\n"
                + "    environment: \"staging\"\n"
                + "    owner: \"ai.generate\"\n"
                + "    restorePlanRef: \"plan.snapshot.sql\"\n"
                + "    comparisonPlanRef: \"plan.delta.check\"\n"
                + "  }\n"
                + "\n"
                + "  step open \"/main\"\n"
                + "  step click \"#proceed-btn\"\n"
                + "  step fill \"[name=field]\" = \"test-value\"\n"
                + "  step click \"button:has-text('Submit')\"\n"
                + "\n"
                + "  assert url = /confirm/*\n"
                + "  assert text \"Operation completed\"\n"
                + "  assert db records.status = \"done\"\n"
                + "}";
    }
}
