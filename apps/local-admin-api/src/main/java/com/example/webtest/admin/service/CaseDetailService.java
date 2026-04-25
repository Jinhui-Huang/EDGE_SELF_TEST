package com.example.webtest.admin.service;

import com.example.webtest.json.Jsons;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * File-backed case-detail service for DSL, state-machine, plans, and history.
 * Each case stores its detail artifacts under {@code <caseDetailRoot>/<caseId>/}.
 */
public final class CaseDetailService {
    private final Path caseDetailRoot;
    private final Clock clock;

    public CaseDetailService(Path caseDetailRoot) {
        this(caseDetailRoot, Clock.systemUTC());
    }

    public CaseDetailService(Path caseDetailRoot, Clock clock) {
        this.caseDetailRoot = caseDetailRoot;
        this.clock = clock == null ? Clock.systemUTC() : clock;
    }

    // ---- GET /api/phase3/cases/{caseId}/dsl ----

    @SuppressWarnings("unchecked")
    public Object getDsl(String caseId) throws IOException {
        Path dslFile = resolveCaseFile(caseId, "dsl.json");
        if (Files.isRegularFile(dslFile)) {
            return Jsons.readValue(Files.readString(dslFile, StandardCharsets.UTF_8), Map.class);
        }
        return buildDefaultDsl(caseId);
    }

    // ---- POST /api/phase3/cases/{caseId}/dsl/validate ----

    @SuppressWarnings("unchecked")
    public Object validateDsl(String caseId, String requestBody) throws IOException {
        Map<String, Object> payload = Jsons.readValue(requestBody, Map.class);
        Object definition = payload.get("definition");
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        if (definition == null) {
            errors.add("definition is required");
        } else if (definition instanceof Map<?, ?> defMap) {
            if (defMap.get("steps") == null) {
                warnings.add("definition has no steps");
            }
            Object steps = defMap.get("steps");
            if (steps instanceof List<?> stepList) {
                if (stepList.isEmpty()) {
                    warnings.add("steps list is empty");
                }
                for (int i = 0; i < stepList.size(); i++) {
                    if (stepList.get(i) instanceof Map<?, ?> stepMap) {
                        if (stepMap.get("action") == null || stepMap.get("action").toString().isBlank()) {
                            errors.add("step " + (i + 1) + ": action is required");
                        }
                    }
                }
            }
            if (defMap.get("id") == null || defMap.get("id").toString().isBlank()) {
                errors.add("definition.id is required");
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", errors.isEmpty() ? "VALID" : "INVALID");
        response.put("errors", errors);
        response.put("warnings", warnings);
        return response;
    }

    // ---- PUT /api/phase3/cases/{caseId}/dsl ----

    @SuppressWarnings("unchecked")
    public Object saveDsl(String caseId, String requestBody) throws IOException {
        Map<String, Object> payload = Jsons.readValue(requestBody, Map.class);
        Object definition = payload.get("definition");
        if (definition == null) {
            throw new IllegalArgumentException("Missing required field: definition");
        }

        String updatedBy = stringValue(payload.get("updatedBy"));
        if (updatedBy.isEmpty()) updatedBy = "operator";

        Path caseDir = caseDetailRoot.resolve(caseId);
        Files.createDirectories(caseDir);
        Path dslFile = caseDir.resolve("dsl.json");

        int version = 1;
        if (Files.isRegularFile(dslFile)) {
            Map<String, Object> existing = Jsons.readValue(Files.readString(dslFile, StandardCharsets.UTF_8), Map.class);
            Object v = existing.get("dslVersion");
            if (v instanceof Number n) version = n.intValue() + 1;
        }

        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("caseId", caseId);
        doc.put("projectKey", stringValue(payload.getOrDefault("projectKey", "")));
        doc.put("dslVersion", version);
        doc.put("updatedAt", Instant.now(clock).toString());
        doc.put("updatedBy", updatedBy);
        doc.put("definition", definition);

        Files.writeString(dslFile, Jsons.writeValueAsString(doc), StandardCharsets.UTF_8);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ACCEPTED");
        response.put("kind", "case-dsl");
        response.put("caseId", caseId);
        response.put("dslVersion", version);
        response.put("updatedAt", doc.get("updatedAt"));
        return response;
    }

    // ---- GET /api/phase3/cases/{caseId}/state-machine ----

    @SuppressWarnings("unchecked")
    public Object getStateMachine(String caseId) throws IOException {
        Path smFile = resolveCaseFile(caseId, "state-machine.json");
        if (Files.isRegularFile(smFile)) {
            return Jsons.readValue(Files.readString(smFile, StandardCharsets.UTF_8), Map.class);
        }
        return buildDefaultStateMachine(caseId);
    }

    // ---- PUT /api/phase3/cases/{caseId}/state-machine ----

    @SuppressWarnings("unchecked")
    public Object saveStateMachine(String caseId, String requestBody) throws IOException {
        Map<String, Object> payload = Jsons.readValue(requestBody, Map.class);

        Path caseDir = caseDetailRoot.resolve(caseId);
        Files.createDirectories(caseDir);
        Path smFile = caseDir.resolve("state-machine.json");

        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("caseId", caseId);
        doc.put("projectKey", stringValue(payload.getOrDefault("projectKey", "")));
        doc.put("updatedAt", Instant.now(clock).toString());
        doc.put("nodes", payload.getOrDefault("nodes", List.of()));
        doc.put("edges", payload.getOrDefault("edges", List.of()));
        doc.put("guards", payload.getOrDefault("guards", List.of()));

        Files.writeString(smFile, Jsons.writeValueAsString(doc), StandardCharsets.UTF_8);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ACCEPTED");
        response.put("kind", "case-state-machine");
        response.put("caseId", caseId);
        response.put("updatedAt", doc.get("updatedAt"));
        return response;
    }

    // ---- GET /api/phase3/cases/{caseId}/plans ----

    @SuppressWarnings("unchecked")
    public Object getPlans(String caseId) throws IOException {
        Path plansFile = resolveCaseFile(caseId, "plans.json");
        if (Files.isRegularFile(plansFile)) {
            return Jsons.readValue(Files.readString(plansFile, StandardCharsets.UTF_8), Map.class);
        }
        return buildDefaultPlans(caseId);
    }

    // ---- GET /api/phase3/cases/{caseId}/history ----

    @SuppressWarnings("unchecked")
    public Object getHistory(String caseId) throws IOException {
        Path histFile = resolveCaseFile(caseId, "history.json");
        if (Files.isRegularFile(histFile)) {
            return Jsons.readValue(Files.readString(histFile, StandardCharsets.UTF_8), Map.class);
        }
        return buildDefaultHistory(caseId);
    }

    // ---- internal ----

    private Path resolveCaseFile(String caseId, String filename) {
        Path root = caseDetailRoot.toAbsolutePath().normalize();
        Path resolved = root.resolve(caseId).resolve(filename).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("Invalid caseId: path traversal detected");
        }
        return resolved;
    }

    private Map<String, Object> buildDefaultDsl(String caseId) {
        String projectKey = deriveProjectKey(caseId);
        String entryPath = "/" + projectKey.replace("-web", "").replace("-center", "/profile").replace("-console", "/ops");

        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("caseId", caseId);
        doc.put("projectKey", projectKey);
        doc.put("dslVersion", 1);
        doc.put("updatedAt", Instant.now(clock).toString());
        doc.put("updatedBy", "system");

        Map<String, Object> definition = new LinkedHashMap<>();
        definition.put("id", caseId);
        definition.put("name", caseId.replace("-", " "));
        definition.put("steps", List.of(
                Map.of("action", "goto", "url", entryPath),
                Map.of("action", "click", "target", "#primary-entry"),
                Map.of("action", "fill", "target", "[name=account]", "value", caseId + "@demo.local"),
                Map.of("action", "click", "target", "button.primary"),
                Map.of("action", "assert", "target", "url", "value", entryPath + "/success/*")));
        doc.put("definition", definition);
        return doc;
    }

    private Map<String, Object> buildDefaultStateMachine(String caseId) {
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("caseId", caseId);
        doc.put("projectKey", deriveProjectKey(caseId));
        doc.put("updatedAt", Instant.now(clock).toString());
        doc.put("nodes", List.of(
                Map.of("id", "landing", "label", "Landing"),
                Map.of("id", "form", "label", "Form"),
                Map.of("id", "submit", "label", "Submit"),
                Map.of("id", "success", "label", "Success")));
        doc.put("edges", List.of(
                Map.of("from", "landing", "to", "form", "action", "navigate"),
                Map.of("from", "form", "to", "submit", "action", "fillAndClick"),
                Map.of("from", "submit", "to", "success", "action", "assertResult")));
        doc.put("guards", List.of(
                Map.of("id", "env-check", "description", "Environment must be unlocked")));
        return doc;
    }

    private Map<String, Object> buildDefaultPlans(String caseId) {
        String projectKey = deriveProjectKey(caseId);
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("caseId", caseId);
        doc.put("projectKey", projectKey);
        doc.put("plans", List.of(
                Map.of("id", "seed", "type", "data-seed",
                        "name", "plan." + projectKey + ".seed.v2",
                        "summary", "Seed account, basket, and coupon fixtures"),
                Map.of("id", "compare", "type", "compare",
                        "name", "plan.diff.expected",
                        "summary", "Compare order and inventory deltas"),
                Map.of("id", "restore", "type", "restore",
                        "name", "plan.restore.snapshot",
                        "summary", "Restore SQL snapshot after run")));
        doc.put("preconditions", List.of(
                "Project environment must be unlocked",
                "Snapshot must exist before execution"));
        return doc;
    }

    private Map<String, Object> buildDefaultHistory(String caseId) {
        String now = Instant.now(clock).toString();
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("caseId", caseId);
        doc.put("runs", List.of(
                Map.of("runName", caseId + "-run-001", "status", "SUCCESS",
                        "finishedAt", now, "reportEntry", "HTML / artifacts / cleanup"),
                Map.of("runName", caseId + "-run-002", "status", "FAILED",
                        "finishedAt", now, "reportEntry", "Locator mismatch on entry")));
        doc.put("maintenanceEvents", List.of(
                Map.of("at", now, "type", "DSL_UPDATED",
                        "operator", "system",
                        "summary", "Default DSL generated")));
        return doc;
    }

    private static String deriveProjectKey(String caseId) {
        if (caseId.contains("checkout")) return "checkout-web";
        if (caseId.contains("member") || caseId.contains("profile")) return "member-center";
        if (caseId.contains("ops") || caseId.contains("audit")) return "ops-console";
        return "unknown-project";
    }

    private static String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }
}
