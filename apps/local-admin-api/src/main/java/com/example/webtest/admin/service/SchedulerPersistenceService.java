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
import java.util.Locale;
import java.util.Map;

public final class SchedulerPersistenceService {
    private final Path schedulerRequestsPath;
    private final Path schedulerEventsPath;
    private final Clock clock;

    public SchedulerPersistenceService(Path schedulerRequestsPath, Path schedulerEventsPath, Clock clock) {
        this.schedulerRequestsPath = schedulerRequestsPath;
        this.schedulerEventsPath = schedulerEventsPath;
        this.clock = clock == null ? Clock.systemUTC() : clock;
    }

    public Map<String, Object> appendRequest(String requestBody) throws IOException {
        Map<String, Object> payload = readObject(requestBody);
        String runId = requiredText(payload, "runId");
        String environment = text(payload, "environment");
        String schedulerId = firstNonBlank(
                text(payload, "schedulerId"),
                existingSchedulerId(schedulerRequestsPath, "requests"),
                existingSchedulerId(schedulerEventsPath, "events"),
                "local-phase3-scheduler");
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("runId", runId);
        putIfNotBlank(entry, "projectKey", text(payload, "projectKey"));
        entry.put("owner", firstNonBlank(text(payload, "owner"), "scheduler"));
        putIfNotBlank(entry, "environment", environment);
        entry.put("title", firstNonBlank(text(payload, "title"), buildTitle(runId, environment)));
        entry.put("detail", firstNonBlank(text(payload, "detail"), "Accepted into the local scheduler request queue."));
        entry.put("status", normalizeRequestStatus(firstNonBlank(text(payload, "status"), "QUEUED")));
        entry.put("schedulerId", schedulerId);
        Integer position = integerValue(payload.get("position"));
        if (position != null && position > 0) {
            entry.put("position", position);
        }
        entry.put("requestedAt", firstNonBlank(text(payload, "requestedAt"), Instant.now(clock).toString()));
        int totalEntries = appendEntry(schedulerRequestsPath, "requests", schedulerId, entry);
        return accepted("scheduler-request", schedulerRequestsPath, schedulerId, totalEntries, entry);
    }

    public Map<String, Object> appendEvent(String requestBody) throws IOException {
        Map<String, Object> payload = readObject(requestBody);
        String runId = requiredText(payload, "runId");
        String environment = text(payload, "environment");
        String schedulerId = firstNonBlank(
                text(payload, "schedulerId"),
                existingSchedulerId(schedulerEventsPath, "events"),
                existingSchedulerId(schedulerRequestsPath, "requests"),
                "local-phase3-scheduler");
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("runId", runId);
        putIfNotBlank(entry, "projectKey", text(payload, "projectKey"));
        entry.put("owner", firstNonBlank(text(payload, "owner"), "scheduler"));
        putIfNotBlank(entry, "environment", environment);
        putIfNotBlank(entry, "title", firstNonBlank(text(payload, "title"), buildTitle(runId, environment)));
        putIfNotBlank(entry, "detail", text(payload, "detail"));
        putIfNotBlank(entry, "type", normalizeEventType(text(payload, "type")));
        putIfNotBlank(entry, "state", normalizeEventType(text(payload, "state")));
        putIfNotBlank(entry, "status", normalizeEventType(text(payload, "status")));
        entry.put("schedulerId", schedulerId);
        putIfPositive(entry, "position", integerValue(payload.get("position")));
        putIfNonNegative(entry, "total", integerValue(payload.get("total")));
        putIfNonNegative(entry, "failed", integerValue(payload.get("failed")));
        putIfNonNegative(entry, "artifacts", integerValue(payload.get("artifacts")));
        entry.put("at", firstNonBlank(text(payload, "at"), Instant.now(clock).toString()));
        if (!entry.containsKey("type") && !entry.containsKey("status") && !entry.containsKey("state")) {
            entry.put("type", "INFO");
        }
        int totalEntries = appendEntry(schedulerEventsPath, "events", schedulerId, entry);
        return accepted("scheduler-event", schedulerEventsPath, schedulerId, totalEntries, entry);
    }

    private int appendEntry(Path path, String listKey, String schedulerId, Map<String, Object> entry) throws IOException {
        Path normalizedPath = path.toAbsolutePath().normalize();
        Path parent = normalizedPath.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        SnapshotContainer snapshot = readSnapshot(normalizedPath, listKey);
        List<Map<String, Object>> entries = new ArrayList<>(snapshot.entries());
        entries.add(entry);
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("schedulerId", firstNonBlank(snapshot.schedulerId(), schedulerId));
        document.put(listKey, entries);
        Files.writeString(normalizedPath, Jsons.writeValueAsString(document), StandardCharsets.UTF_8);
        return entries.size();
    }

    private SnapshotContainer readSnapshot(Path path, String listKey) throws IOException {
        if (!Files.isRegularFile(path)) {
            return new SnapshotContainer(null, List.of());
        }
        String json = Files.readString(path, StandardCharsets.UTF_8);
        if (json.isBlank()) {
            return new SnapshotContainer(null, List.of());
        }
        Map<String, Object> document = readObject(json);
        Object rawEntries = document.get(listKey);
        List<Map<String, Object>> entries = new ArrayList<>();
        if (rawEntries instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    entries.add(new LinkedHashMap<>(castMap(map)));
                }
            }
        }
        return new SnapshotContainer(text(document, "schedulerId"), entries);
    }

    private String existingSchedulerId(Path path, String listKey) throws IOException {
        return readSnapshot(path.toAbsolutePath().normalize(), listKey).schedulerId();
    }

    private Map<String, Object> accepted(
            String kind,
            Path path,
            String schedulerId,
            int totalEntries,
            Map<String, Object> entry) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ACCEPTED");
        response.put("kind", kind);
        response.put("path", path.toAbsolutePath().normalize().toString());
        response.put("schedulerId", schedulerId);
        response.put("totalEntries", totalEntries);
        response.put("entry", entry);
        return response;
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

    private Integer integerValue(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private void putIfNotBlank(Map<String, Object> target, String key, String value) {
        if (value != null && !value.isBlank()) {
            target.put(key, value);
        }
    }

    private void putIfPositive(Map<String, Object> target, String key, Integer value) {
        if (value != null && value > 0) {
            target.put(key, value);
        }
    }

    private void putIfNonNegative(Map<String, Object> target, String key, Integer value) {
        if (value != null && value >= 0) {
            target.put(key, value);
        }
    }

    private String buildTitle(String runId, String environment) {
        return environment == null || environment.isBlank() ? runId : runId + " / " + environment;
    }

    private String normalizeRequestStatus(String rawStatus) {
        String normalized = normalizeEventType(rawStatus);
        return normalized == null ? "QUEUED" : normalized;
    }

    private String normalizeEventType(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }
        return rawValue.trim().replace(' ', '_').toUpperCase(Locale.ROOT);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private record SnapshotContainer(String schedulerId, List<Map<String, Object>> entries) {
    }
}
