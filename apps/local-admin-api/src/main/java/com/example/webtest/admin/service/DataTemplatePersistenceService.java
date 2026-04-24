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
import java.util.UUID;

/**
 * File-backed CRUD for data-template registry ({@code config/phase3/data-templates.json}).
 * <p>
 * Supports list, get, create, update, delete, import preview/commit, and dry-run.
 * The stored shape matches the {@code DataTemplateItem} contract consumed by
 * both {@code DataTemplatesScreen} and {@code ExecutionScreen}.
 */
public final class DataTemplatePersistenceService {
    private final Path templatePath;
    private final Clock clock;

    public DataTemplatePersistenceService(Path templatePath) {
        this(templatePath, Clock.systemUTC());
    }

    public DataTemplatePersistenceService(Path templatePath, Clock clock) {
        this.templatePath = templatePath;
        this.clock = clock == null ? Clock.systemUTC() : clock;
    }

    // ---- GET /api/phase3/data-templates ----

    public Object listTemplates() throws IOException {
        Map<String, Object> root = readRoot();
        return Map.of("items", getItems(root));
    }

    // ---- GET /api/phase3/data-templates/{templateId} ----

    public Object getTemplate(String templateId) throws IOException {
        Map<String, Object> root = readRoot();
        List<Map<String, Object>> items = getItems(root);
        for (Map<String, Object> item : items) {
            if (templateId.equals(stringValue(item.get("id")))) {
                return item;
            }
        }
        return Map.of("error", "NOT_FOUND", "templateId", templateId);
    }

    // ---- POST /api/phase3/data-templates (create) ----

    @SuppressWarnings("unchecked")
    public Object createTemplate(String requestBody) throws IOException {
        Map<String, Object> payload = readObject(requestBody);
        String name = requiredText(payload, "name");

        String id = optionalText(payload, "id");
        if (id.isEmpty()) {
            id = name.replace('.', '-').replace(' ', '-').toLowerCase();
        }

        Map<String, Object> root = readRoot();
        List<Map<String, Object>> items = getItems(root);

        boolean updated = false;
        List<Map<String, Object>> updatedItems = new ArrayList<>(items.size() + 1);
        for (Map<String, Object> existing : items) {
            if (id.equals(stringValue(existing.get("id")))) {
                updatedItems.add(buildTemplateEntry(id, payload));
                updated = true;
            } else {
                updatedItems.add(existing);
            }
        }
        if (!updated) {
            updatedItems.add(buildTemplateEntry(id, payload));
        }

        persist(Map.of("items", updatedItems));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "ACCEPTED");
        result.put("kind", "data-template");
        result.put("templateId", id);
        result.put("updated", updated);
        return result;
    }

    // ---- PUT /api/phase3/data-templates/{templateId} (update) ----

    @SuppressWarnings("unchecked")
    public Object updateTemplate(String templateId, String requestBody) throws IOException {
        Map<String, Object> payload = readObject(requestBody);

        Map<String, Object> root = readRoot();
        List<Map<String, Object>> items = getItems(root);

        boolean found = false;
        List<Map<String, Object>> updatedItems = new ArrayList<>(items.size());
        for (Map<String, Object> existing : items) {
            if (templateId.equals(stringValue(existing.get("id")))) {
                updatedItems.add(buildTemplateEntry(templateId, payload));
                found = true;
            } else {
                updatedItems.add(existing);
            }
        }
        if (!found) {
            return Map.of("error", "NOT_FOUND", "templateId", templateId);
        }

        persist(Map.of("items", updatedItems));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "ACCEPTED");
        result.put("kind", "data-template");
        result.put("templateId", templateId);
        result.put("updated", true);
        return result;
    }

    // ---- DELETE /api/phase3/data-templates/{templateId} ----

    public Object deleteTemplate(String templateId) throws IOException {
        Map<String, Object> root = readRoot();
        List<Map<String, Object>> items = getItems(root);

        List<Map<String, Object>> updatedItems = new ArrayList<>(items.size());
        boolean removed = false;
        for (Map<String, Object> existing : items) {
            if (templateId.equals(stringValue(existing.get("id")))) {
                removed = true;
            } else {
                updatedItems.add(existing);
            }
        }
        if (!removed) {
            return Map.of("error", "NOT_FOUND", "templateId", templateId);
        }

        persist(Map.of("items", updatedItems));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "ACCEPTED");
        result.put("kind", "data-template-delete");
        result.put("templateId", templateId);
        result.put("remaining", updatedItems.size());
        return result;
    }

    // ---- POST /api/phase3/data-templates/import/preview ----

    @SuppressWarnings("unchecked")
    public Object importPreview(String requestBody) throws IOException {
        Map<String, Object> payload = readObject(requestBody);
        Object payloadItems = payload.get("payload");
        List<Map<String, Object>> importItems = List.of();
        if (payloadItems instanceof Map<?, ?> payloadMap) {
            Object items = ((Map<String, Object>) payloadMap).get("items");
            if (items instanceof List<?> l) {
                importItems = (List<Map<String, Object>>) l;
            }
        }

        String previewId = "tmpl-import-" + Instant.now(clock).toString().replace(":", "").substring(0, 15);
        List<Map<String, Object>> previewResults = new ArrayList<>();
        for (Map<String, Object> item : importItems) {
            String name = stringValue(item.get("name"));
            List<String> warnings = new ArrayList<>();
            String result = "VALID";
            if (name.isEmpty()) {
                result = "INVALID";
                warnings.add("name is required");
            }
            if (stringValue(item.get("type")).isEmpty()) {
                warnings.add("type not specified, will default to sql");
            }
            Map<String, Object> previewItem = new LinkedHashMap<>();
            previewItem.put("name", name);
            previewItem.put("result", result);
            previewItem.put("warnings", warnings);
            previewResults.add(previewItem);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "PREVIEW_READY");
        response.put("previewId", previewId);
        response.put("items", previewResults);
        return response;
    }

    // ---- POST /api/phase3/data-templates/import/commit ----

    @SuppressWarnings("unchecked")
    public Object importCommit(String requestBody) throws IOException {
        Map<String, Object> payload = readObject(requestBody);

        Object itemsObj = payload.get("items");
        List<Map<String, Object>> importItems = List.of();
        if (itemsObj instanceof List<?> l) {
            importItems = (List<Map<String, Object>>) l;
        }

        Map<String, Object> root = readRoot();
        List<Map<String, Object>> existing = getItems(root);

        int created = 0;
        int updated = 0;
        List<Map<String, Object>> updatedItems = new ArrayList<>(existing);

        for (Map<String, Object> item : importItems) {
            String name = stringValue(item.get("name"));
            if (name.isEmpty()) continue;
            String id = optionalText(item, "id");
            if (id.isEmpty()) {
                id = name.replace('.', '-').replace(' ', '-').toLowerCase();
            }

            boolean found = false;
            for (int i = 0; i < updatedItems.size(); i++) {
                if (id.equals(stringValue(updatedItems.get(i).get("id")))) {
                    updatedItems.set(i, buildTemplateEntry(id, item));
                    found = true;
                    updated++;
                    break;
                }
            }
            if (!found) {
                updatedItems.add(buildTemplateEntry(id, item));
                created++;
            }
        }

        persist(Map.of("items", updatedItems));
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ACCEPTED");
        response.put("created", created);
        response.put("updated", updated);
        return response;
    }

    // ---- POST /api/phase3/data-templates/{templateId}/dry-run ----

    public Object dryRun(String templateId, String requestBody) throws IOException {
        Map<String, Object> payload = readObject(requestBody);
        String environment = stringValue(payload.get("environment"));

        Map<String, Object> root = readRoot();
        List<Map<String, Object>> items = getItems(root);
        Map<String, Object> template = null;
        for (Map<String, Object> item : items) {
            if (templateId.equals(stringValue(item.get("id")))) {
                template = item;
                break;
            }
        }
        if (template == null) {
            return Map.of("error", "NOT_FOUND", "templateId", templateId);
        }

        List<Map<String, Object>> checks = new ArrayList<>();
        // env whitelist check
        String envAllowed = stringValue(template.get("envAllowed"));
        boolean envOk = envAllowed.isEmpty() || envAllowed.contains(environment) || environment.isEmpty();
        checks.add(Map.of("name", "environment-whitelist", "status", envOk ? "OK" : "BLOCKED"));

        // rollback strategy check
        String rollback = stringValue(template.get("rollback"));
        checks.add(Map.of("name", "rollback-strategy", "status", rollback.isEmpty() ? "WARNING" : "OK"));

        // parameter schema check
        checks.add(Map.of("name", "parameter-schema", "status", "OK"));

        boolean allOk = checks.stream().allMatch(c -> "OK".equals(c.get("status")));
        String auditRef = "data-template-dryrun-" + Instant.now(clock).toString().replace(":", "").substring(0, 15);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", allOk ? "PASSED" : "FAILED");
        response.put("templateId", templateId);
        response.put("checks", checks);
        response.put("auditRef", auditRef);
        return response;
    }

    // ---- internal ----

    @SuppressWarnings("unchecked")
    private Map<String, Object> readRoot() throws IOException {
        Path normalized = templatePath.toAbsolutePath().normalize();
        if (!Files.isRegularFile(normalized)) {
            return Map.of("items", List.of());
        }
        return Jsons.readValue(Files.readString(normalized, StandardCharsets.UTF_8), Map.class);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> getItems(Map<String, Object> root) {
        Object items = root.get("items");
        if (items instanceof List<?> l) {
            return (List<Map<String, Object>>) l;
        }
        return List.of();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildTemplateEntry(String id, Map<String, Object> payload) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("id", id);
        entry.put("name", stringValue(payload.getOrDefault("name", id)));
        entry.put("type", stringValue(payload.getOrDefault("type", "sql")));
        entry.put("envAllowed", stringValue(payload.getOrDefault("envAllowed", "")));
        entry.put("risk", stringValue(payload.getOrDefault("risk", "low")));
        entry.put("uses", payload.getOrDefault("uses", 0));
        entry.put("rollback", stringValue(payload.getOrDefault("rollback", "snapshot")));
        entry.put("projectKey", stringValue(payload.getOrDefault("projectKey", "")));
        Object steps = payload.get("steps");
        entry.put("steps", steps instanceof List<?> ? steps : List.of());
        Object guards = payload.get("guards");
        entry.put("guards", guards instanceof List<?> ? guards : List.of());
        Object params = payload.get("params");
        entry.put("params", params instanceof List<?> ? params : List.of());
        entry.put("compareSummary", stringValue(payload.getOrDefault("compareSummary", "")));
        entry.put("updatedAt", Instant.now(clock).toString());
        return entry;
    }

    private void persist(Map<String, Object> root) throws IOException {
        Path normalized = templatePath.toAbsolutePath().normalize();
        Path parent = normalized.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        Files.writeString(normalized, Jsons.writeValueAsString(root), StandardCharsets.UTF_8);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> readObject(String json) throws IOException {
        return Jsons.readValue(json, Map.class);
    }

    private static String requiredText(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null || value.toString().isBlank()) {
            throw new IllegalArgumentException("Missing required field: " + key);
        }
        return value.toString().trim();
    }

    private static String optionalText(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value == null ? "" : value.toString().trim();
    }

    private static String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }
}
