package com.example.webtest.admin.service;

import com.example.webtest.json.Jsons;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class LocalSchedulerStateReader {
    private static final Set<String> ACTIVE_EXECUTION_STATES = Set.of(
            "PRE_EXECUTION",
            "QUEUED",
            "WAITING",
            "RUNNING",
            "IN_PROGRESS",
            "NEEDS_REVIEW");
    private static final Set<String> TERMINAL_EXECUTION_STATES = Set.of(
            "OK",
            "FAILED",
            "ERROR",
            "CANCELLED");

    SchedulerStateData read(Path requestsPath, Path eventsPath, Path snapshotPath) {
        SchedulerStateData derivedState = readDerivedState(requestsPath, eventsPath);
        if (!derivedState.isEmpty()) {
            return derivedState;
        }
        return readSnapshotState(snapshotPath);
    }

    private SchedulerStateData readDerivedState(Path requestsPath, Path eventsPath) {
        SchedulerRequestSnapshot requests = readRequests(requestsPath);
        SchedulerEventLogSnapshot eventLog = readEvents(eventsPath);
        if ((requests == null || requests.requests() == null || requests.requests().isEmpty())
                && (eventLog == null || eventLog.events() == null || eventLog.events().isEmpty())) {
            return SchedulerStateData.empty();
        }

        Map<String, RunAggregate> runs = new LinkedHashMap<>();
        String schedulerId = firstNonBlank(
                eventLog == null ? null : eventLog.schedulerId(),
                requests == null ? null : requests.schedulerId());

        if (requests != null && requests.requests() != null) {
            for (SchedulerRequestRecord request : requests.requests()) {
                if (request == null || isBlank(request.runId())) {
                    continue;
                }
                RunAggregate run = runs.computeIfAbsent(request.runId(), RunAggregate::new);
                run.projectKey = blankToNull(request.projectKey());
                run.owner = firstNonBlank(request.owner(), run.owner, "scheduler");
                run.environment = firstNonBlank(request.environment(), run.environment, "n/a");
                run.title = firstNonBlank(request.title(), run.title, buildTitle(request.runId(), request.environment()));
                run.status = normalizeStatus(firstNonBlank(request.status(), run.status, "QUEUED"));
                run.detail = firstNonBlank(request.detail(), run.detail, "Run request accepted by local scheduler.");
                run.position = firstPositive(intValue(request.position()), run.position);
                run.startedAt = firstInstant(instantValue(request.requestedAt()), run.startedAt);
                run.updatedAt = firstInstant(instantValue(request.requestedAt()), run.updatedAt);
                run.schedulerId = firstNonBlank(request.schedulerId(), run.schedulerId, schedulerId);
            }
        }

        if (eventLog != null && eventLog.events() != null) {
            List<SchedulerEventRecord> events = eventLog.events().stream()
                    .filter(event -> event != null && !isBlank(event.runId()))
                    .sorted(Comparator.comparing(
                            event -> instantValue(event.at()),
                            Comparator.nullsLast(Comparator.naturalOrder())))
                    .toList();
            for (SchedulerEventRecord event : events) {
                RunAggregate run = runs.computeIfAbsent(event.runId(), RunAggregate::new);
                Instant eventAt = instantValue(event.at());
                String nextStatus = eventStatus(event, run.status);
                run.projectKey = firstNonBlank(event.projectKey(), run.projectKey);
                run.owner = firstNonBlank(event.owner(), run.owner, "scheduler");
                run.environment = firstNonBlank(event.environment(), run.environment, "n/a");
                run.title = firstNonBlank(event.title(), run.title, buildTitle(event.runId(), run.environment));
                run.status = nextStatus;
                run.detail = firstNonBlank(event.detail(), run.detail, detailForStatus(nextStatus));
                run.schedulerId = firstNonBlank(event.schedulerId(), run.schedulerId, schedulerId);
                run.position = firstPositive(intValue(event.position()), run.position);
                run.total = firstNonNegative(intValue(event.total()), run.total);
                run.failed = firstNonNegative(intValue(event.failed()), run.failed);
                run.artifacts = firstNonNegative(intValue(event.artifacts()), run.artifacts);
                if (eventAt != null) {
                    run.updatedAt = eventAt;
                    if (run.startedAt == null && ACTIVE_EXECUTION_STATES.contains(nextStatus)) {
                        run.startedAt = eventAt;
                    }
                    if (TERMINAL_EXECUTION_STATES.contains(nextStatus)) {
                        run.finishedAt = eventAt;
                    }
                }
            }
        }

        List<SchedulerQueueItemData> queueItems = runs.values().stream()
                .filter(run -> ACTIVE_EXECUTION_STATES.contains(run.status))
                .sorted(Comparator.comparing(RunAggregate::queueSortInstant, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(run -> new SchedulerQueueItemData(
                        firstNonBlank(run.title, buildTitle(run.runId, run.environment)),
                        firstNonBlank(run.owner, "scheduler"),
                        queueLabel(run.status),
                        firstNonBlank(run.detail, detailForStatus(run.status)),
                        firstInstant(run.updatedAt, run.startedAt)))
                .toList();

        List<SchedulerExecutionData> executions = runs.values().stream()
                .sorted(Comparator.comparing(RunAggregate::sortInstant, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(run -> new SchedulerExecutionData(
                        run.runId,
                        run.projectKey,
                        firstNonBlank(run.status, "INFO"),
                        firstNonBlank(run.owner, "scheduler"),
                        firstNonBlank(run.environment, "n/a"),
                        firstNonBlank(run.detail, detailForStatus(run.status)),
                        firstNonBlank(run.schedulerId, schedulerId),
                        run.position,
                        run.total,
                        run.failed,
                        run.artifacts,
                        run.startedAt,
                        run.finishedAt,
                        "scheduler-service"))
                .toList();
        return executions.isEmpty() && queueItems.isEmpty()
                ? SchedulerStateData.empty()
                : new SchedulerStateData(queueItems, executions);
    }

    private SchedulerStateData readSnapshotState(Path snapshotPath) {
        if (snapshotPath == null) {
            return SchedulerStateData.empty();
        }
        Path normalizedPath = snapshotPath.toAbsolutePath().normalize();
        if (!Files.isRegularFile(normalizedPath)) {
            return SchedulerStateData.empty();
        }
        try {
            SchedulerStateSnapshot snapshot = Jsons.readValue(Files.readString(normalizedPath), SchedulerStateSnapshot.class);
            if (snapshot == null) {
                return SchedulerStateData.empty();
            }
            List<SchedulerQueueItemData> queueItems = snapshot.queue() == null ? List.of() : snapshot.queue().stream()
                    .filter(item -> item != null && !isBlank(item.title()))
                    .map(item -> new SchedulerQueueItemData(
                            item.title(),
                            firstNonBlank(item.owner(), "scheduler"),
                            firstNonBlank(item.state(), "Waiting"),
                            firstNonBlank(item.detail(), ""),
                            instantValue(item.updatedAt())))
                    .toList();
            List<SchedulerExecutionData> executions = snapshot.executions() == null ? List.of() : snapshot.executions().stream()
                    .filter(item -> item != null && !isBlank(item.runId()))
                    .map(item -> new SchedulerExecutionData(
                            item.runId(),
                            blankToNull(item.projectKey()),
                            normalizeStatus(item.status()),
                            firstNonBlank(item.owner(), "scheduler"),
                            firstNonBlank(item.environment(), "n/a"),
                            firstNonBlank(item.detail(), ""),
                            firstNonBlank(item.schedulerId(), snapshot.schedulerId()),
                            intValue(item.position()),
                            intValue(item.total()),
                            intValue(item.failed()),
                            intValue(item.artifacts()),
                            instantValue(item.startedAt()),
                            instantValue(item.finishedAt()),
                            "scheduler-state.json"))
                    .toList();
            return executions.isEmpty() && queueItems.isEmpty()
                    ? SchedulerStateData.empty()
                    : new SchedulerStateData(queueItems, executions);
        } catch (RuntimeException | IOException ignored) {
            return SchedulerStateData.empty();
        }
    }

    private SchedulerRequestSnapshot readRequests(Path path) {
        if (path == null) {
            return null;
        }
        Path normalizedPath = path.toAbsolutePath().normalize();
        if (!Files.isRegularFile(normalizedPath)) {
            return null;
        }
        try {
            return Jsons.readValue(Files.readString(normalizedPath), SchedulerRequestSnapshot.class);
        } catch (RuntimeException | IOException ignored) {
            return null;
        }
    }

    private SchedulerEventLogSnapshot readEvents(Path path) {
        if (path == null) {
            return null;
        }
        Path normalizedPath = path.toAbsolutePath().normalize();
        if (!Files.isRegularFile(normalizedPath)) {
            return null;
        }
        try {
            return Jsons.readValue(Files.readString(normalizedPath), SchedulerEventLogSnapshot.class);
        } catch (RuntimeException | IOException ignored) {
            return null;
        }
    }

    private String eventStatus(SchedulerEventRecord event, String currentStatus) {
        String explicitStatus = normalizeStatus(firstNonBlank(event.status(), event.state()));
        if (!isBlank(explicitStatus) && !"INFO".equals(explicitStatus)) {
            return explicitStatus;
        }
        String type = normalizeStatus(event.type());
        return switch (type) {
            case "PRE_EXECUTION", "PREPARED" -> "PRE_EXECUTION";
            case "REQUESTED", "QUEUED" -> "QUEUED";
            case "WAITING" -> "WAITING";
            case "STARTED", "RUNNING", "HEARTBEAT" -> "RUNNING";
            case "NEEDS_REVIEW", "REVIEW" -> "NEEDS_REVIEW";
            case "FAILED", "ERROR" -> "FAILED";
            case "SUCCEEDED", "SUCCESS", "COMPLETED", "FINISHED" -> "OK";
            case "CANCELLED" -> "CANCELLED";
            default -> firstNonBlank(currentStatus, "INFO");
        };
    }

    private String queueLabel(String status) {
        return switch (normalizeStatus(status)) {
            case "PRE_EXECUTION" -> "Pre-execution";
            case "RUNNING", "IN_PROGRESS" -> "In progress";
            case "NEEDS_REVIEW" -> "Needs review";
            case "WAITING", "QUEUED" -> "Waiting";
            default -> "Waiting";
        };
    }

    private String detailForStatus(String status) {
        return switch (normalizeStatus(status)) {
            case "PRE_EXECUTION" -> "Run definition is stored as pre-execution and awaits an Execution trigger.";
            case "RUNNING", "IN_PROGRESS" -> "Local scheduler has promoted the run to an active worker.";
            case "NEEDS_REVIEW" -> "Local scheduler is waiting for operator review.";
            case "WAITING", "QUEUED" -> "Local scheduler accepted the run and is waiting for capacity.";
            case "FAILED" -> "Local scheduler marked the run as failed.";
            case "CANCELLED" -> "Local scheduler marked the run as cancelled.";
            case "OK" -> "Local scheduler marked the run as completed successfully.";
            default -> "Local scheduler state is available.";
        };
    }

    private String buildTitle(String runId, String environment) {
        if (isBlank(runId)) {
            return "scheduler-run";
        }
        return isBlank(environment) ? runId : runId + " / " + environment;
    }

    private String normalizeStatus(String rawStatus) {
        String normalized = firstNonBlank(rawStatus, "INFO").trim().replace(' ', '_').toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "SUCCEEDED", "SUCCESS", "COMPLETED", "FINISHED" -> "OK";
            case "INPROGRESS" -> "IN_PROGRESS";
            case "REVIEW" -> "NEEDS_REVIEW";
            default -> normalized;
        };
    }

    private String blankToNull(String value) {
        return isBlank(value) ? null : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private int intValue(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Integer.parseInt(text);
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
        return 0;
    }

    private Instant instantValue(String value) {
        if (isBlank(value)) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (!isBlank(value)) {
                return value;
            }
        }
        return null;
    }

    private Instant firstInstant(Instant... values) {
        for (Instant value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private int firstPositive(int candidate, int current) {
        return candidate > 0 ? candidate : current;
    }

    private int firstNonNegative(int candidate, int current) {
        return candidate > 0 || current == 0 ? candidate : current;
    }

    record SchedulerStateData(
            List<SchedulerQueueItemData> queueItems,
            List<SchedulerExecutionData> executions) {
        static SchedulerStateData empty() {
            return new SchedulerStateData(List.of(), List.of());
        }

        boolean isEmpty() {
            return queueItems.isEmpty() && executions.isEmpty();
        }
    }

    record SchedulerQueueItemData(String title, String owner, String state, String detail, Instant updatedAt) {
    }

    record SchedulerExecutionData(
            String runId,
            String projectKey,
            String status,
            String owner,
            String environment,
            String detail,
            String schedulerId,
            int position,
            int total,
            int failed,
            int artifacts,
            Instant startedAt,
            Instant finishedAt,
            String source) {
    }

    private static final class RunAggregate {
        private final String runId;
        private String projectKey;
        private String status;
        private String owner;
        private String environment;
        private String detail;
        private String title;
        private String schedulerId;
        private int position;
        private int total;
        private int failed;
        private int artifacts;
        private Instant startedAt;
        private Instant finishedAt;
        private Instant updatedAt;

        private RunAggregate(String runId) {
            this.runId = runId;
        }

        private Instant sortInstant() {
            return finishedAt != null ? finishedAt : (updatedAt != null ? updatedAt : startedAt);
        }

        private Instant queueSortInstant() {
            return updatedAt != null ? updatedAt : startedAt;
        }
    }

    private record SchedulerRequestSnapshot(String schedulerId, List<SchedulerRequestRecord> requests) {
    }

    private record SchedulerRequestRecord(
            String runId,
            String projectKey,
            String owner,
            String environment,
            String title,
            String detail,
            String status,
            String schedulerId,
            Object position,
            String requestedAt) {
    }

    private record SchedulerEventLogSnapshot(String schedulerId, List<SchedulerEventRecord> events) {
    }

    private record SchedulerEventRecord(
            String runId,
            String projectKey,
            String owner,
            String environment,
            String title,
            String detail,
            String type,
            String state,
            String status,
            String schedulerId,
            Object position,
            Object total,
            Object failed,
            Object artifacts,
            String at) {
    }

    private record SchedulerStateSnapshot(
            String schedulerId,
            List<SchedulerQueueRecord> queue,
            List<SchedulerExecutionRecord> executions) {
    }

    private record SchedulerQueueRecord(
            String title,
            String owner,
            String state,
            String detail,
            String updatedAt) {
    }

    private record SchedulerExecutionRecord(
            String runId,
            String projectKey,
            String status,
            String owner,
            String environment,
            String detail,
            String schedulerId,
            Object position,
            Object total,
            Object failed,
            Object artifacts,
            String startedAt,
            String finishedAt) {
    }
}
