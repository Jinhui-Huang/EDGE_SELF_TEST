package com.example.webtest.admin.service;

import com.example.webtest.json.Jsons;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class CatalogPersistenceService {
    private final Path catalogPath;
    private final Clock clock;

    public CatalogPersistenceService(Path catalogPath) {
        this(catalogPath, Clock.systemUTC());
    }

    public CatalogPersistenceService(Path catalogPath, Clock clock) {
        this.catalogPath = catalogPath;
        this.clock = clock == null ? Clock.systemUTC() : clock;
    }

    public Map<String, Object> upsertProject(String requestBody) throws IOException {
        Map<String, Object> payload = readObject(requestBody);
        String key = requiredText(payload, "key");
        String name = requiredText(payload, "name");
        String scope = requiredText(payload, "scope");
        List<String> environments = environments(payload.get("environments"));
        String note = optionalText(payload, "note");

        Path normalizedPath = catalogPath.toAbsolutePath().normalize();
        Path parent = normalizedPath.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }

        CatalogSnapshot snapshot = readSnapshot(normalizedPath);
        List<Map<String, Object>> projects = new ArrayList<>(snapshot.projects());
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("key", key);
        entry.put("name", name);
        entry.put("scope", scope);
        entry.put("environments", environments);
        entry.put("note", note == null ? "" : note);

        boolean updated = false;
        for (int index = 0; index < projects.size(); index++) {
            String existingKey = text(projects.get(index), "key");
            if (existingKey != null && existingKey.equalsIgnoreCase(key)) {
                projects.set(index, entry);
                updated = true;
                break;
            }
        }
        if (!updated) {
            projects.add(entry);
        }

        Map<String, Object> document = new LinkedHashMap<>();
        document.put("projects", projects);
        document.put("cases", snapshot.cases());
        Files.writeString(normalizedPath, Jsons.writeValueAsString(document), StandardCharsets.UTF_8);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ACCEPTED");
        response.put("kind", "catalog-project");
        response.put("path", normalizedPath.toString());
        response.put("updated", updated);
        response.put("totalProjects", projects.size());
        response.put("entry", entry);
        return response;
    }

    public Map<String, Object> upsertCase(String requestBody) throws IOException {
        Map<String, Object> payload = readObject(requestBody);
        String id = requiredText(payload, "id");
        String projectKey = requiredText(payload, "projectKey");
        String name = requiredText(payload, "name");
        List<String> tags = environments(payload.get("tags"));
        String status = stringOrDefault(optionalText(payload, "status"), "ACTIVE");
        String updatedAt = stringOrDefault(optionalText(payload, "updatedAt"), Instant.now(clock).toString());
        boolean archived = booleanValue(payload.get("archived"));

        Path normalizedPath = catalogPath.toAbsolutePath().normalize();
        Path parent = normalizedPath.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }

        CatalogSnapshot snapshot = readSnapshot(normalizedPath);
        List<Map<String, Object>> cases = new ArrayList<>(snapshot.cases());
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("id", id);
        entry.put("projectKey", projectKey);
        entry.put("name", name);
        entry.put("tags", tags);
        entry.put("status", status);
        entry.put("updatedAt", updatedAt);
        entry.put("archived", archived);
        copyOptional(payload, entry, "dsl");
        copyOptional(payload, entry, "sourceDocumentId");
        copyOptional(payload, entry, "generationMeta");

        boolean updated = false;
        for (int index = 0; index < cases.size(); index++) {
            String existingId = text(cases.get(index), "id");
            if (existingId != null && existingId.equalsIgnoreCase(id)) {
                cases.set(index, entry);
                updated = true;
                break;
            }
        }
        if (!updated) {
            cases.add(entry);
        }

        Map<String, Object> document = new LinkedHashMap<>();
        document.put("projects", snapshot.projects());
        document.put("cases", cases);
        Files.writeString(normalizedPath, Jsons.writeValueAsString(document), StandardCharsets.UTF_8);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ACCEPTED");
        response.put("kind", "catalog-case");
        response.put("path", normalizedPath.toString());
        response.put("updated", updated);
        response.put("totalCases", cases.size());
        response.put("entry", entry);
        return response;
    }

    public Map<String, Object> importPreview(String requestBody) throws IOException {
        Map<String, Object> payload = readObject(requestBody);
        String mode = normalizeMode(optionalText(payload, "mode"));
        List<Map<String, Object>> requestedRows = readObjectList(payload.get("rows"));

        CatalogSnapshot snapshot = readSnapshot(catalogPath.toAbsolutePath().normalize());
        Set<String> existingKeys = new HashSet<>();
        for (Map<String, Object> project : snapshot.projects()) {
            String key = text(project, "key");
            if (key != null) {
                existingKeys.add(normalizeKey(key));
            }
        }

        List<Map<String, Object>> previewRows = new ArrayList<>();
        List<Map<String, Object>> conflicts = new ArrayList<>();
        Set<String> payloadKeys = new HashSet<>();
        int createCount = 0;
        int updateCount = 0;

        for (Map<String, Object> row : requestedRows) {
            String key = text(row, "key");
            String name = text(row, "name");
            String scope = text(row, "scope");
            if (key == null || name == null || scope == null) {
                conflicts.add(conflictRow(key, "Missing required field: key/name/scope"));
                continue;
            }

            String normalizedKey = normalizeKey(key);
            if (!payloadKeys.add(normalizedKey)) {
                conflicts.add(conflictRow(key, "Duplicate key in import payload"));
                continue;
            }

            String action = existingKeys.contains(normalizedKey) && !"replace".equals(mode) ? "update" : "create";
            if ("update".equals(action)) {
                updateCount++;
            } else {
                createCount++;
            }

            Map<String, Object> previewRow = normalizedProjectRow(row);
            previewRow.put("action", action);
            previewRow.put("warnings", List.of());
            previewRows.add(previewRow);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalRows", requestedRows.size());
        summary.put("createCount", createCount);
        summary.put("updateCount", updateCount);
        summary.put("conflictCount", conflicts.size());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "PREVIEW_READY");
        response.put("kind", "catalog-project-import-preview");
        response.put("summary", summary);
        response.put("rows", previewRows);
        response.put("conflicts", conflicts);
        return response;
    }

    public Map<String, Object> importCommit(String requestBody) throws IOException {
        Map<String, Object> payload = readObject(requestBody);
        String mode = normalizeMode(optionalText(payload, "mode"));
        List<Map<String, Object>> requestedRows = readObjectList(payload.get("rows"));
        if (requestedRows.isEmpty()) {
            throw new IllegalArgumentException("Import rows are required.");
        }

        Path normalizedPath = catalogPath.toAbsolutePath().normalize();
        Path parent = normalizedPath.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }

        CatalogSnapshot snapshot = readSnapshot(normalizedPath);
        List<Map<String, Object>> existingProjects = new ArrayList<>(snapshot.projects());
        Set<String> existingKeys = new HashSet<>();
        for (Map<String, Object> project : existingProjects) {
            String key = text(project, "key");
            if (key != null) {
                existingKeys.add(normalizeKey(key));
            }
        }

        List<Map<String, Object>> normalizedRows = new ArrayList<>();
        Set<String> payloadKeys = new HashSet<>();
        int created = 0;
        int updated = 0;
        for (Map<String, Object> row : requestedRows) {
            Map<String, Object> normalizedRow = normalizedProjectRow(row);
            String key = String.valueOf(normalizedRow.get("key"));
            String normalizedKey = normalizeKey(key);
            if (!payloadKeys.add(normalizedKey)) {
                throw new IllegalArgumentException("Duplicate key in import payload: " + key);
            }
            if (existingKeys.contains(normalizedKey)) {
                updated++;
            } else {
                created++;
            }
            normalizedRows.add(normalizedRow);
        }

        List<Map<String, Object>> persistedProjects;
        if ("replace".equals(mode)) {
            persistedProjects = normalizedRows;
        } else {
            persistedProjects = new ArrayList<>(existingProjects);
            for (Map<String, Object> normalizedRow : normalizedRows) {
                String key = String.valueOf(normalizedRow.get("key"));
                boolean matched = false;
                for (int index = 0; index < persistedProjects.size(); index++) {
                    String existingKey = text(persistedProjects.get(index), "key");
                    if (existingKey != null && existingKey.equalsIgnoreCase(key)) {
                        persistedProjects.set(index, normalizedRow);
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    persistedProjects.add(normalizedRow);
                }
            }
        }

        writeSnapshot(normalizedPath, persistedProjects, snapshot.cases());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ACCEPTED");
        response.put("kind", "catalog-project-import");
        response.put("created", created);
        response.put("updated", updated);
        response.put("totalProjects", persistedProjects.size());
        response.put("path", normalizedPath.toString());
        return response;
    }

    private CatalogSnapshot readSnapshot(Path path) throws IOException {
        if (!Files.isRegularFile(path)) {
            return new CatalogSnapshot(List.of(), List.of());
        }
        String json = Files.readString(path, StandardCharsets.UTF_8);
        if (json.isBlank()) {
            return new CatalogSnapshot(List.of(), List.of());
        }
        Map<String, Object> document = readObject(json);
        return new CatalogSnapshot(readObjectList(document.get("projects")), readObjectList(document.get("cases")));
    }

    private void writeSnapshot(Path path, List<Map<String, Object>> projects, List<Map<String, Object>> cases) throws IOException {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("projects", projects);
        document.put("cases", cases);
        Files.writeString(path, Jsons.writeValueAsString(document), StandardCharsets.UTF_8);
    }

    private List<Map<String, Object>> readObjectList(Object value) {
        List<Map<String, Object>> items = new ArrayList<>();
        if (value instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    items.add(new LinkedHashMap<>(castMap(map)));
                }
            }
        }
        return items;
    }

    private List<String> environments(Object value) {
        List<String> items = new ArrayList<>();
        if (value instanceof List<?> list) {
            for (Object item : list) {
                if (item != null) {
                    String text = item.toString().trim();
                    if (!text.isEmpty()) {
                        items.add(text);
                    }
                }
            }
        } else if (value instanceof String textValue) {
            for (String item : textValue.split(",")) {
                String text = item.trim();
                if (!text.isEmpty()) {
                    items.add(text);
                }
            }
        }
        return items;
    }

    private Map<String, Object> readObject(String json) {
        Object value = Jsons.readValue(json, Map.class);
        if (!(value instanceof Map<?, ?> map)) {
            throw new IllegalArgumentException("JSON body must be an object.");
        }
        return castMap(map);
    }

    private Map<String, Object> castMap(Map<?, ?> source) {
        Map<String, Object> target = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : source.entrySet()) {
            if (entry.getKey() != null) {
                target.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }
        return target;
    }

    private String requiredText(Map<String, Object> payload, String key) {
        String value = text(payload, key);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Missing required field: " + key);
        }
        return value;
    }

    private String optionalText(Map<String, Object> payload, String key) {
        return text(payload, key);
    }

    private String stringOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String text(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private boolean booleanValue(Object value) {
        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }
        if (value instanceof String text) {
            return Boolean.parseBoolean(text.trim());
        }
        return false;
    }

    private Map<String, Object> normalizedProjectRow(Map<String, Object> row) {
        String key = requiredText(row, "key");
        String name = requiredText(row, "name");
        String scope = requiredText(row, "scope");
        List<String> environments = environments(row.get("environments"));
        String note = optionalText(row, "note");

        Map<String, Object> normalized = new LinkedHashMap<>();
        normalized.put("key", key);
        normalized.put("name", name);
        normalized.put("scope", scope);
        normalized.put("environments", environments);
        normalized.put("note", note == null ? "" : note);
        return normalized;
    }

    private Map<String, Object> conflictRow(String key, String reason) {
        Map<String, Object> conflict = new LinkedHashMap<>();
        conflict.put("key", key == null ? "" : key);
        conflict.put("reason", reason);
        return conflict;
    }

    private String normalizeMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return "merge";
        }
        String normalized = mode.trim().toLowerCase(Locale.ROOT);
        if (!"merge".equals(normalized) && !"replace".equals(normalized)) {
            throw new IllegalArgumentException("Unsupported import mode: " + mode);
        }
        return normalized;
    }

    private String normalizeKey(String key) {
        return key.trim().toLowerCase(Locale.ROOT);
    }

    private void copyOptional(Map<String, Object> source, Map<String, Object> target, String key) {
        if (source.containsKey(key) && source.get(key) != null) {
            target.put(key, source.get(key));
        }
    }

    private record CatalogSnapshot(List<Map<String, Object>> projects, List<Map<String, Object>> cases) {
    }
}
