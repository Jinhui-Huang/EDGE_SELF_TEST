package com.example.webtest.admin.service;

import com.example.webtest.json.Jsons;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ConfigPersistenceService {
    private final Path modelConfigPath;
    private final Path environmentConfigPath;

    public ConfigPersistenceService(Path modelConfigPath, Path environmentConfigPath) {
        this.modelConfigPath = modelConfigPath;
        this.environmentConfigPath = environmentConfigPath;
    }

    public Map<String, Object> upsertModelConfigItem(String requestBody) throws IOException {
        return upsertConfigItem("model", modelConfigPath, requestBody);
    }

    public Map<String, Object> upsertEnvironmentConfigItem(String requestBody) throws IOException {
        return upsertConfigItem("environment", environmentConfigPath, requestBody);
    }

    private Map<String, Object> upsertConfigItem(String configKind, Path path, String requestBody) throws IOException {
        Map<String, Object> payload = readObject(requestBody);
        String label = requiredText(payload, "label");
        String value = requiredText(payload, "value");

        Path normalizedPath = path.toAbsolutePath().normalize();
        Path parent = normalizedPath.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }

        ConfigSnapshot snapshot = readSnapshot(normalizedPath);
        List<Map<String, Object>> items = new ArrayList<>(snapshot.items());
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("label", label);
        entry.put("value", value);

        boolean updated = false;
        for (int index = 0; index < items.size(); index++) {
            String existingLabel = text(items.get(index), "label");
            if (existingLabel != null && existingLabel.equalsIgnoreCase(label)) {
                items.set(index, entry);
                updated = true;
                break;
            }
        }
        if (!updated) {
            items.add(entry);
        }

        Map<String, Object> document = new LinkedHashMap<>();
        document.put("items", items);
        Files.writeString(normalizedPath, Jsons.writeValueAsString(document), StandardCharsets.UTF_8);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ACCEPTED");
        response.put("kind", configKind + "-config-item");
        response.put("path", normalizedPath.toString());
        response.put("updated", updated);
        response.put("totalItems", items.size());
        response.put("entry", entry);
        return response;
    }

    private ConfigSnapshot readSnapshot(Path path) throws IOException {
        if (!Files.isRegularFile(path)) {
            return new ConfigSnapshot(List.of());
        }
        String json = Files.readString(path, StandardCharsets.UTF_8);
        if (json.isBlank()) {
            return new ConfigSnapshot(List.of());
        }
        Map<String, Object> document = readObject(json);
        Object rawItems = document.get("items");
        List<Map<String, Object>> items = new ArrayList<>();
        if (rawItems instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    items.add(new LinkedHashMap<>(castMap(map)));
                }
            }
        }
        return new ConfigSnapshot(items);
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

    private String text(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private record ConfigSnapshot(List<Map<String, Object>> items) {
    }
}
