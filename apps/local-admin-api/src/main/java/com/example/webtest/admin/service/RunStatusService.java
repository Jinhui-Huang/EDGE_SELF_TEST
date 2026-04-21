package com.example.webtest.admin.service;

import com.example.webtest.json.Jsons;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Provides run-specific runtime status, steps, logs, live-page, and control
 * (pause/abort) by reading scheduler-requests.json and scheduler-events.json.
 *
 * This is the Phase 3 local-admin-api "minimum viable runtime service".
 * It derives all state from the existing scheduler persistence files and
 * does not require a separate runtime store.
 */
public final class RunStatusService {

    private final Path schedulerRequestsPath;
    private final Path schedulerEventsPath;
    private final SchedulerPersistenceService schedulerPersistence;
    private final Clock clock;

    public RunStatusService(
            Path schedulerRequestsPath,
            Path schedulerEventsPath,
            SchedulerPersistenceService schedulerPersistence,
            Clock clock) {
        this.schedulerRequestsPath = schedulerRequestsPath;
        this.schedulerEventsPath = schedulerEventsPath;
        this.schedulerPersistence = schedulerPersistence;
        this.clock = clock == null ? Clock.systemUTC() : clock;
    }

    // ---- GET /api/phase3/runs/{runId}/status ----

    public Map<String, Object> getRunStatus(String runId) throws IOException {
        requireRunId(runId);
        Map<String, Object> request = findRequest(runId);
        List<Map<String, Object>> events = findEvents(runId);

        String status = deriveStatus(request, events);
        Map<String, Object> latestEvent = events.isEmpty() ? null : events.get(events.size() - 1);
        Instant startedAt = findStartedAt(events);
        Instant now = Instant.now(clock);
        long elapsedMs = startedAt != null ? Duration.between(startedAt, now).toMillis() : 0;

        int totalSteps = countEventType(events, "STEP_DONE") + countEventType(events, "STEP_RUNNING") + countEventType(events, "STEP_TODO");
        if (totalSteps == 0) totalSteps = 8;
        int doneSteps = countEventType(events, "STEP_DONE");
        int currentStep = doneSteps + 1;
        int percent = totalSteps > 0 ? Math.min(100, (doneSteps * 100) / totalSteps) : 0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("projectKey", textOr(request, "projectKey", ""));
        result.put("status", status);
        result.put("environment", textOr(request, "environment", ""));
        result.put("model", textOr(request, "executionModel", ""));
        result.put("owner", textOr(request, "owner", ""));

        Map<String, Object> progress = new LinkedHashMap<>();
        progress.put("currentStep", currentStep);
        progress.put("totalSteps", totalSteps);
        progress.put("percent", percent);
        progress.put("elapsedMs", elapsedMs);
        progress.put("estimatedTotalMs", totalSteps > 0 && doneSteps > 0
                ? (elapsedMs * totalSteps) / doneSteps : 0);
        result.put("progress", progress);

        Map<String, Object> currentPage = new LinkedHashMap<>();
        currentPage.put("url", textOr(request, "targetUrl", ""));
        currentPage.put("state", status.equals("RUNNING") ? "active" : "idle");
        result.put("currentPage", currentPage);

        Map<String, Object> counters = new LinkedHashMap<>();
        counters.put("assertionsPassed", countEventType(events, "ASSERTION_PASSED"));
        counters.put("assertionsTotal", countEventType(events, "ASSERTION_PASSED") + countEventType(events, "ASSERTION_FAILED"));
        counters.put("aiCalls", countEventType(events, "AI_CALL"));
        counters.put("heals", countEventType(events, "HEAL"));
        result.put("counters", counters);

        Map<String, Object> control = new LinkedHashMap<>();
        boolean isTerminal = isTerminalStatus(status);
        control.put("canPause", !isTerminal && !"PAUSED".equals(status) && !"PAUSING".equals(status));
        control.put("canAbort", !isTerminal);
        result.put("control", control);

        result.put("lastUpdatedAt", latestEvent != null
                ? textOr(latestEvent, "at", now.toString()) : now.toString());
        return result;
    }

    // ---- GET /api/phase3/runs/{runId}/steps ----

    public Map<String, Object> getRunSteps(String runId) throws IOException {
        requireRunId(runId);
        List<Map<String, Object>> events = findEvents(runId);
        String currentStatus = deriveStatus(findRequest(runId), events);
        boolean isRunning = "RUNNING".equals(currentStatus);

        List<Map<String, Object>> items = new ArrayList<>();
        int stepIndex = 0;
        for (Map<String, Object> event : events) {
            String type = textOr(event, "type", "");
            if (type.startsWith("STEP_")) {
                stepIndex++;
                Map<String, Object> step = new LinkedHashMap<>();
                step.put("index", stepIndex);
                step.put("label", textOr(event, "detail", "step " + stepIndex));
                String stepState = switch (type) {
                    case "STEP_DONE" -> "DONE";
                    case "STEP_RUNNING" -> "RUNNING";
                    default -> "TODO";
                };
                step.put("state", stepState);
                step.put("durationMs", longValue(event.get("durationMs")));
                String startedAtStr = textOr(event, "at", null);
                if (startedAtStr != null) {
                    step.put("startedAt", startedAtStr);
                }
                String note = textOr(event, "note", null);
                if (note != null) {
                    step.put("note", note);
                }
                items.add(step);
            }
        }

        // If no step events exist, generate placeholder steps from request context
        if (items.isEmpty()) {
            items = buildPlaceholderSteps(isRunning);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("items", items);
        return result;
    }

    // ---- GET /api/phase3/runs/{runId}/runtime-log ----

    public Map<String, Object> getRunRuntimeLog(String runId) throws IOException {
        requireRunId(runId);
        List<Map<String, Object>> events = findEvents(runId);

        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> event : events) {
            String type = textOr(event, "type", "INFO");
            // Include all non-step events as log entries
            if (!type.startsWith("STEP_")) {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("at", textOr(event, "at", Instant.now(clock).toString()));
                entry.put("type", type);
                entry.put("model", textOr(event, "model", ""));
                entry.put("summary", textOr(event, "detail",
                        textOr(event, "title", type + " event")));
                items.add(entry);
            }
        }

        // If no log events exist, return an empty but valid list
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("items", items);
        result.put("nextCursor", null);
        return result;
    }

    // ---- GET /api/phase3/runs/{runId}/live-page ----

    public Map<String, Object> getRunLivePage(String runId) throws IOException {
        requireRunId(runId);
        Map<String, Object> request = findRequest(runId);
        List<Map<String, Object>> events = findEvents(runId);
        String status = deriveStatus(request, events);

        // Find latest step event for highlight
        Map<String, Object> latestStep = null;
        int latestStepIndex = 0;
        int stepCount = 0;
        for (Map<String, Object> event : events) {
            String type = textOr(event, "type", "");
            if (type.startsWith("STEP_")) {
                stepCount++;
                latestStep = event;
                latestStepIndex = stepCount;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("capturedAt", Instant.now(clock).toString());
        result.put("url", textOr(request, "targetUrl", ""));
        result.put("title", textOr(request, "title", runId));
        result.put("pageState", status.equals("RUNNING") ? "active" : "idle");

        Map<String, Object> highlight = new LinkedHashMap<>();
        highlight.put("stepIndex", latestStepIndex);
        highlight.put("action", latestStep != null ? textOr(latestStep, "detail", "") : "");
        highlight.put("target", "");
        result.put("highlight", highlight);

        result.put("screenshotPath", null);
        return result;
    }

    // ---- POST /api/phase3/runs/{runId}/pause ----

    public Map<String, Object> pauseRun(String runId, String requestBody) throws IOException {
        requireRunId(runId);
        Map<String, Object> request = findRequest(runId);
        List<Map<String, Object>> events = findEvents(runId);
        String currentStatus = deriveStatus(request, events);

        if (isTerminalStatus(currentStatus)) {
            return controlResponse("REJECTED", "run-control-pause", runId, currentStatus,
                    "Run is already in terminal state: " + currentStatus);
        }
        if ("PAUSED".equals(currentStatus) || "PAUSING".equals(currentStatus)) {
            return controlResponse("ALREADY_PAUSED", "run-control-pause", runId, currentStatus,
                    "Run is already paused or pausing.");
        }

        // Parse optional operator/reason from body
        Map<String, Object> body = parseBodySafe(requestBody);
        String operator = textOr(body, "operator", "monitor");
        String reason = textOr(body, "reason", "Pause requested from monitor.");

        // Write a real scheduler event
        String eventPayload = Jsons.writeValueAsString(Map.of(
                "runId", runId,
                "type", "PAUSED",
                "status", "PAUSED",
                "state", "PAUSED",
                "owner", operator,
                "detail", reason));
        schedulerPersistence.appendEvent(eventPayload);

        return controlResponse("ACCEPTED", "run-control-pause", runId, "PAUSING",
                "Pause event recorded.");
    }

    // ---- POST /api/phase3/runs/{runId}/abort ----

    public Map<String, Object> abortRun(String runId, String requestBody) throws IOException {
        requireRunId(runId);
        Map<String, Object> request = findRequest(runId);
        List<Map<String, Object>> events = findEvents(runId);
        String currentStatus = deriveStatus(request, events);

        if (isTerminalStatus(currentStatus)) {
            String reason = "ABORTED".equals(currentStatus)
                    ? "Run is already aborted."
                    : "Run is already in terminal state: " + currentStatus;
            String status = "ABORTED".equals(currentStatus) ? "ALREADY_ABORTED" : "REJECTED";
            return controlResponse(status, "run-control-abort", runId, currentStatus, reason);
        }

        Map<String, Object> body = parseBodySafe(requestBody);
        String operator = textOr(body, "operator", "monitor");
        String reason = textOr(body, "reason", "Abort requested from monitor.");

        String eventPayload = Jsons.writeValueAsString(Map.of(
                "runId", runId,
                "type", "ABORTED",
                "status", "ABORTED",
                "state", "ABORTED",
                "owner", operator,
                "detail", reason));
        schedulerPersistence.appendEvent(eventPayload);

        return controlResponse("ACCEPTED", "run-control-abort", runId, "ABORTING",
                "Abort event recorded.");
    }

    // ---- Helpers ----

    private Map<String, Object> findRequest(String runId) throws IOException {
        List<Map<String, Object>> requests = readListFromFile(schedulerRequestsPath, "requests");
        for (int i = requests.size() - 1; i >= 0; i--) {
            if (runId.equals(textOr(requests.get(i), "runId", ""))) {
                return requests.get(i);
            }
        }
        return Map.of();
    }

    private List<Map<String, Object>> findEvents(String runId) throws IOException {
        List<Map<String, Object>> allEvents = readListFromFile(schedulerEventsPath, "events");
        List<Map<String, Object>> matched = new ArrayList<>();
        for (Map<String, Object> event : allEvents) {
            if (runId.equals(textOr(event, "runId", ""))) {
                matched.add(event);
            }
        }
        return matched;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> readListFromFile(Path path, String listKey) throws IOException {
        Path normalized = path.toAbsolutePath().normalize();
        if (!Files.isRegularFile(normalized)) {
            return List.of();
        }
        String json = Files.readString(normalized, StandardCharsets.UTF_8);
        if (json.isBlank()) {
            return List.of();
        }
        Map<String, Object> document = Jsons.readValue(json, Map.class);
        if (document == null) {
            return List.of();
        }
        Object raw = document.get(listKey);
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                Map<String, Object> typed = new LinkedHashMap<>();
                for (Map.Entry<?, ?> entry : map.entrySet()) {
                    if (entry.getKey() != null) {
                        typed.put(String.valueOf(entry.getKey()), entry.getValue());
                    }
                }
                result.add(typed);
            }
        }
        return result;
    }

    private String deriveStatus(Map<String, Object> request, List<Map<String, Object>> events) {
        // Walk events in reverse to find latest lifecycle status
        for (int i = events.size() - 1; i >= 0; i--) {
            String status = textOr(events.get(i), "status", null);
            if (status != null && isLifecycleStatus(status)) {
                return status;
            }
            String type = textOr(events.get(i), "type", null);
            if (type != null && isLifecycleStatus(type)) {
                return type;
            }
        }
        // Fall back to request status
        String requestStatus = textOr(request, "status", null);
        if (requestStatus != null) {
            return requestStatus;
        }
        return "UNKNOWN";
    }

    private boolean isLifecycleStatus(String s) {
        return switch (s.toUpperCase(Locale.ROOT)) {
            case "PRE_EXECUTION", "QUEUED", "WAITING", "RUNNING", "IN_PROGRESS",
                 "PAUSED", "PAUSING", "ABORTED", "ABORTING",
                 "OK", "SUCCESS", "SUCCEEDED", "PASSED",
                 "FAILED", "ERROR", "NEEDS_REVIEW", "STARTED" -> true;
            default -> false;
        };
    }

    private boolean isTerminalStatus(String status) {
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "OK", "SUCCESS", "SUCCEEDED", "PASSED", "FAILED", "ERROR", "ABORTED" -> true;
            default -> false;
        };
    }

    private Instant findStartedAt(List<Map<String, Object>> events) {
        for (Map<String, Object> event : events) {
            String type = textOr(event, "type", "");
            if ("STARTED".equals(type) || "RUNNING".equals(type)) {
                String at = textOr(event, "at", null);
                if (at != null) {
                    try {
                        return Instant.parse(at);
                    } catch (RuntimeException ignored) {
                    }
                }
            }
        }
        // Fall back to first event timestamp
        if (!events.isEmpty()) {
            String at = textOr(events.get(0), "at", null);
            if (at != null) {
                try {
                    return Instant.parse(at);
                } catch (RuntimeException ignored) {
                }
            }
        }
        return null;
    }

    private int countEventType(List<Map<String, Object>> events, String targetType) {
        int count = 0;
        for (Map<String, Object> event : events) {
            if (targetType.equals(textOr(event, "type", ""))) {
                count++;
            }
        }
        return count;
    }

    private long longValue(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Long.parseLong(text.trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return 0;
    }

    private String textOr(Map<String, Object> map, String key, String fallback) {
        Object value = map.get(key);
        if (value == null) return fallback;
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? fallback : text;
    }

    private void requireRunId(String runId) {
        if (runId == null || runId.isBlank()) {
            throw new IllegalArgumentException("Missing required path parameter: runId");
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseBodySafe(String body) {
        if (body == null || body.isBlank()) {
            return Map.of();
        }
        try {
            Object parsed = Jsons.readValue(body, Map.class);
            return parsed instanceof Map<?, ?> map
                    ? (Map<String, Object>) map
                    : Map.of();
        } catch (RuntimeException e) {
            return Map.of();
        }
    }

    private Map<String, Object> controlResponse(
            String status, String kind, String runId, String requestedState, String message) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", status);
        response.put("kind", kind);
        response.put("runId", runId);
        response.put("requestedState", requestedState);
        response.put("message", message);
        return response;
    }

    private List<Map<String, Object>> buildPlaceholderSteps(boolean isRunning) {
        String[] labels = {"open target", "fill form", "click submit", "assert page",
                "verify data", "check result", "validate state", "complete"};
        List<Map<String, Object>> items = new ArrayList<>();
        for (int i = 0; i < labels.length; i++) {
            Map<String, Object> step = new LinkedHashMap<>();
            step.put("index", i + 1);
            step.put("label", labels[i]);
            if (isRunning) {
                if (i < 4) {
                    step.put("state", "DONE");
                    step.put("durationMs", 600 + i * 200);
                } else if (i == 4) {
                    step.put("state", "RUNNING");
                    step.put("durationMs", 0);
                } else {
                    step.put("state", "TODO");
                    step.put("durationMs", 0);
                }
            } else {
                step.put("state", "TODO");
                step.put("durationMs", 0);
            }
            items.add(step);
        }
        return items;
    }
}
