package com.example.webtest.admin.service;

import com.example.webtest.json.Jsons;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
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

    private static final String[] LIVE_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"};

    private final Path runsRoot;
    private final Path schedulerRequestsPath;
    private final Path schedulerEventsPath;
    private final SchedulerPersistenceService schedulerPersistence;
    private final Clock clock;

    public RunStatusService(
            Path schedulerRequestsPath,
            Path schedulerEventsPath,
            SchedulerPersistenceService schedulerPersistence,
            Clock clock) {
        this(null, schedulerRequestsPath, schedulerEventsPath, schedulerPersistence, clock);
    }

    public RunStatusService(
            Path runsRoot,
            Path schedulerRequestsPath,
            Path schedulerEventsPath,
            SchedulerPersistenceService schedulerPersistence,
            Clock clock) {
        this.runsRoot = runsRoot != null ? runsRoot.toAbsolutePath().normalize() : null;
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
        Path runDir = resolveRunDir(runId);
        ReportStatusContext reportContext = readReportStatusContext(runDir);
        LivePageStatusContext livePageContext = readLivePageStatusContext(runDir);
        String fallbackStatus = deriveStatus(request, events);
        String status = firstNonBlank(reportContext.status(), fallbackStatus, "UNKNOWN");
        Instant now = Instant.now(clock);
        Map<String, Object> latestEvent = events.isEmpty() ? null : events.get(events.size() - 1);
        Instant startedAt = reportContext.startedAt() != null ? reportContext.startedAt() : findStartedAt(events);
        Instant finishedAt = reportContext.finishedAt();
        long elapsedMs = resolveElapsedMs(reportContext.durationMs(), startedAt, finishedAt, now);

        ProgressInfo progressInfo = deriveProgressInfo(reportContext, events, status, elapsedMs);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("projectKey", firstNonBlank(reportContext.projectKey(), textOr(request, "projectKey", "")));
        result.put("status", status);
        result.put("environment", firstNonBlank(reportContext.environment(), textOr(request, "environment", "")));
        result.put("model", firstNonBlank(reportContext.model(), textOr(request, "executionModel", "")));
        result.put("owner", firstNonBlank(reportContext.owner(), textOr(request, "owner", "")));

        Map<String, Object> progress = new LinkedHashMap<>();
        progress.put("currentStep", progressInfo.currentStep());
        progress.put("totalSteps", progressInfo.totalSteps());
        progress.put("percent", progressInfo.percent());
        progress.put("elapsedMs", elapsedMs);
        progress.put("estimatedTotalMs", progressInfo.estimatedTotalMs());
        result.put("progress", progress);

        Map<String, Object> currentPage = new LinkedHashMap<>();
        currentPage.put("url", firstNonBlank(
                livePageContext.url(),
                requestPageUrl(request)));
        currentPage.put("state", firstNonBlank(
                livePageContext.pageState(),
                requestPageState(request),
                "RUNNING".equals(status) ? "active" : "idle"));
        result.put("currentPage", currentPage);

        int eventAssertionsPassed = countEventType(events, "ASSERTION_PASSED");
        int eventAssertionsTotal = eventAssertionsPassed + countEventType(events, "ASSERTION_FAILED");
        Map<String, Object> counters = new LinkedHashMap<>();
        counters.put("assertionsPassed", reportContext.assertionsTotal() > 0
                ? reportContext.assertionsPassed()
                : eventAssertionsPassed);
        counters.put("assertionsTotal", reportContext.assertionsTotal() > 0
                ? reportContext.assertionsTotal()
                : eventAssertionsTotal);
        counters.put("aiCalls", countEventType(events, "AI_CALL"));
        counters.put("heals", countEventType(events, "HEAL"));
        result.put("counters", counters);

        Map<String, Object> control = new LinkedHashMap<>();
        boolean isTerminal = isTerminalStatus(status);
        control.put("canPause", !isTerminal && !"PAUSED".equals(status) && !"PAUSING".equals(status));
        control.put("canAbort", !isTerminal);
        result.put("control", control);

        result.put("lastUpdatedAt", resolveLastUpdatedAt(now, latestEvent, reportContext, livePageContext, runDir));
        return result;
    }

    // ---- GET /api/phase3/runs/{runId}/steps ----

    public Map<String, Object> getRunSteps(String runId) throws IOException {
        requireRunId(runId);
        Path runDir = resolveRunDir(runId);
        List<Map<String, Object>> artifactSteps = readReportBackedSteps(runDir);
        if (!artifactSteps.isEmpty()) {
            Map<String, Object> artifactResult = new LinkedHashMap<>();
            artifactResult.put("runId", runId);
            artifactResult.put("items", artifactSteps);
            return artifactResult;
        }

        List<Map<String, Object>> events = findEvents(runId);

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

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("items", items);
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> readReportBackedSteps(Path runDir) throws IOException {
        if (runDir == null || !Files.isDirectory(runDir)) {
            return List.of();
        }
        Path reportJson = runDir.resolve("report.json").normalize();
        if (!reportJson.startsWith(runDir) || !Files.isRegularFile(reportJson)) {
            return List.of();
        }

        Map<String, Object> report;
        try {
            report = Jsons.readValue(Files.readString(reportJson, StandardCharsets.UTF_8), Map.class);
        } catch (IOException ignored) {
            return List.of();
        }
        Object rawSteps = report.get("steps");
        if (!(rawSteps instanceof List<?> stepList) || stepList.isEmpty()) {
            return List.of();
        }

        List<Map<String, Object>> items = new ArrayList<>();
        int stepIndex = 0;
        for (Object rawStep : stepList) {
            if (!(rawStep instanceof Map<?, ?> map)) {
                continue;
            }
            stepIndex++;
            Map<String, Object> step = new LinkedHashMap<>();
            step.put("index", stepIndex);
            step.put("label", firstNonBlank(
                    stringValue(map.get("stepName")),
                    stringValue(map.get("action")),
                    "step " + stepIndex));
            step.put("state", normalizeReportStepState(stringValue(map.get("status"))));
            step.put("durationMs", longValue(map.get("durationMs")));

            String startedAt = stringValue(map.get("startedAt"));
            if (!startedAt.isBlank()) {
                step.put("startedAt", startedAt);
            }

            String note = firstNonBlank(
                    stringValue(map.get("message")),
                    stringValue(map.get("artifactPath")));
            if (!note.isBlank()) {
                step.put("note", note);
            }
            items.add(step);
        }
        return items;
    }

    // ---- GET /api/phase3/runs/{runId}/runtime-log ----

    public Map<String, Object> getRunRuntimeLog(String runId) throws IOException {
        requireRunId(runId);
        Path runDir = resolveRunDir(runId);
        List<Map<String, Object>> artifactItems = readRuntimeLogArtifact(runDir);
        if (!artifactItems.isEmpty()) {
            Map<String, Object> artifactResult = new LinkedHashMap<>();
            artifactResult.put("runId", runId);
            artifactResult.put("items", artifactItems);
            artifactResult.put("nextCursor", null);
            return artifactResult;
        }

        Map<String, Object> request = findRequest(runId);
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
                entry.put("source", "scheduler-events");
                items.add(entry);
            }
        }
        if (items.isEmpty()) {
            items.addAll(buildRequestContextRuntimeLogEntries(runId, request));
        }

        // If no log events exist, return an empty but valid list
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("items", items);
        result.put("nextCursor", null);
        return result;
    }

    private List<Map<String, Object>> readRuntimeLogArtifact(Path runDir) throws IOException {
        if (runDir == null || !Files.isDirectory(runDir)) {
            return List.of();
        }
        Path runtimeLog = runDir.resolve("runtime.log").normalize();
        if (!runtimeLog.startsWith(runDir) || !Files.isRegularFile(runtimeLog)) {
            return List.of();
        }

        List<String> lines = Files.readAllLines(runtimeLog, StandardCharsets.UTF_8);
        if (lines.isEmpty()) {
            return List.of();
        }

        Instant fallbackAt = resolveArtifactModifiedAt(runtimeLog);
        List<Map<String, Object>> items = new ArrayList<>();
        for (int index = 0; index < lines.size(); index++) {
            String rawLine = lines.get(index);
            String trimmed = rawLine == null ? "" : rawLine.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("at", resolveRuntimeLogTimestamp(trimmed, fallbackAt));
            entry.put("type", classifyRuntimeLogType(trimmed));
            entry.put("model", "");
            entry.put("summary", summarizeRuntimeLogLine(trimmed));
            entry.put("source", "runtime.log");
            entry.put("message", trimmed);
            entry.put("detail", Map.of(
                    "artifactPath", "runtime.log",
                    "line", index + 1));
            items.add(entry);
        }
        return items;
    }

    private List<Map<String, Object>> buildRequestContextRuntimeLogEntries(String runId, Map<String, Object> request) {
        if (request == null || request.isEmpty()) {
            return List.of();
        }

        String at = firstNonBlank(
                textOr(request, "requestedAt", ""),
                Instant.now(clock).toString());
        List<Map<String, Object>> items = new ArrayList<>();

        String pageUrl = requestPageUrl(request);
        String pageTitle = firstNonBlank(
                textOr(request, "pageTitle", ""),
                textOr(request, "title", ""),
                requestPageIdentity(request));
        if (!pageTitle.isBlank() || !pageUrl.isBlank()) {
            Map<String, Object> pageDetail = new LinkedHashMap<>();
            putIfNotBlank(pageDetail, "pageTitle", pageTitle);
            putIfNotBlank(pageDetail, "pageUrl", pageUrl);
            putIfNotBlank(pageDetail, "runId", runId);
            items.add(runtimeLogShellEntry(
                    at,
                    "INFO",
                    "Prepared page context is available for fallback monitor inspection.",
                    firstNonBlank(
                            !pageTitle.isBlank() && !pageUrl.isBlank()
                                    ? pageTitle + " at " + pageUrl
                                    : "",
                            pageTitle,
                            pageUrl,
                            runId),
                    pageDetail));
        }

        String runtimeSummary = requestPageState(request);
        Map<String, Object> runtimeDetail = new LinkedHashMap<>();
        putIfNotBlank(runtimeDetail, "runtimeMode", textOr(request, "runtimeMode", ""));
        putIfNotBlank(runtimeDetail, "queueState", textOr(request, "queueState", ""));
        putIfNotBlank(runtimeDetail, "auditState", textOr(request, "auditState", ""));
        if (!runtimeSummary.isBlank()) {
            items.add(runtimeLogShellEntry(
                    at,
                    "INFO",
                    "Persisted runtime context is the strongest fallback signal currently available.",
                    runtimeSummary,
                    runtimeDetail));
        }

        String guidance = firstNonBlank(
                textOr(request, "nextAction", ""),
                textOr(request, "bodySummary", ""));
        Map<String, Object> guidanceDetail = new LinkedHashMap<>();
        putIfNotBlank(guidanceDetail, "nextAction", textOr(request, "nextAction", ""));
        putIfNotBlank(guidanceDetail, "bodySummary", textOr(request, "bodySummary", ""));
        if (!guidance.isBlank()) {
            items.add(runtimeLogShellEntry(
                    at,
                    "DECISION",
                    guidance,
                    "Persisted startup guidance is shown because no stronger runtime-log artifact or scheduler runtime event is available.",
                    guidanceDetail));
        }

        String locator = textOr(request, "locator", "");
        if (!locator.isBlank()) {
            Map<String, Object> locatorDetail = new LinkedHashMap<>();
            putIfNotBlank(locatorDetail, "locator", locator);
            items.add(runtimeLogShellEntry(
                    at,
                    "INFO",
                    "Persisted locator cue is available for live inspection fallback.",
                    locator,
                    locatorDetail));
        }
        return items;
    }

    private Map<String, Object> runtimeLogShellEntry(
            String at,
            String type,
            String summary,
            String message,
            Map<String, Object> detail) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("at", at);
        entry.put("type", type);
        entry.put("model", "");
        entry.put("summary", summary);
        entry.put("source", "scheduler-request-context");
        entry.put("message", message);
        if (detail != null && !detail.isEmpty()) {
            entry.put("detail", detail);
        }
        return entry;
    }

    @SuppressWarnings("unchecked")
    private ReportStatusContext readReportStatusContext(Path runDir) throws IOException {
        if (runDir == null || !Files.isDirectory(runDir)) {
            return ReportStatusContext.empty();
        }
        Path reportJson = runDir.resolve("report.json").normalize();
        if (!reportJson.startsWith(runDir) || !Files.isRegularFile(reportJson)) {
            return ReportStatusContext.empty();
        }

        Map<String, Object> report;
        try {
            report = Jsons.readValue(Files.readString(reportJson, StandardCharsets.UTF_8), Map.class);
        } catch (IOException ignored) {
            return ReportStatusContext.empty();
        }
        if (report == null || report.isEmpty()) {
            return ReportStatusContext.empty();
        }

        Map<String, Object> summary = mapValue(report.get("summary"));
        List<Map<String, Object>> steps = listValue(report.get("steps"));
        int totalSteps = steps.isEmpty() ? intValue(summary.get("total")) : steps.size();
        int completedSteps = 0;
        int runningSteps = 0;
        int todoSteps = 0;
        int failedSteps = 0;
        int assertionsTotal = 0;
        int assertionsPassed = 0;
        for (Map<String, Object> step : steps) {
            String state = normalizeReportStepState(stringValue(step.get("status")));
            switch (state) {
                case "DONE", "SKIPPED" -> completedSteps++;
                case "FAILED" -> {
                    completedSteps++;
                    failedSteps++;
                }
                case "RUNNING" -> runningSteps++;
                default -> todoSteps++;
            }

            String action = stringValue(step.get("action")).toUpperCase(Locale.ROOT);
            if (action.startsWith("ASSERT")) {
                assertionsTotal++;
                if ("DONE".equals(state)) {
                    assertionsPassed++;
                }
            }
        }

        int summaryFailed = intValue(summary.get("failed"));
        int summaryPassed = intValue(summary.get("passed"));
        if (totalSteps <= 0 && intValue(summary.get("total")) > 0) {
            totalSteps = intValue(summary.get("total"));
            completedSteps = Math.min(totalSteps, summaryPassed + summaryFailed);
            failedSteps = Math.max(failedSteps, summaryFailed);
        }

        Instant startedAt = instantValue(report.get("startedAt"));
        Instant finishedAt = instantValue(report.get("finishedAt"));
        long durationMs = longValue(summary.get("durationMs"));
        if (durationMs <= 0 && startedAt != null && finishedAt != null) {
            durationMs = Math.max(0, Duration.between(startedAt, finishedAt).toMillis());
        }

        String status = deriveReportStatus(
                normalizeLifecycleStatus(stringValue(report.get("status"))),
                totalSteps,
                completedSteps,
                runningSteps,
                todoSteps,
                Math.max(failedSteps, summaryFailed),
                finishedAt != null);

        Instant updatedAt = latestInstant(
                finishedAt,
                startedAt,
                resolveArtifactModifiedAt(reportJson));

        return new ReportStatusContext(
                status,
                startedAt,
                finishedAt,
                durationMs,
                totalSteps,
                completedSteps,
                assertionsPassed,
                assertionsTotal,
                stringValue(report.get("projectKey")),
                stringValue(report.get("environment")),
                firstNonBlank(stringValue(report.get("model")), stringValue(report.get("executionModel"))),
                firstNonBlank(stringValue(report.get("operator")), stringValue(report.get("owner"))),
                updatedAt);
    }

    private LivePageStatusContext readLivePageStatusContext(Path runDir) throws IOException {
        if (runDir == null) {
            return LivePageStatusContext.empty();
        }
        Path livePageJson = runDir.resolve("live-page.json").normalize();
        Map<String, Object> liveArtifact = readLivePageArtifact(livePageJson);
        Path screenshot = resolveLiveScreenshot(runDir, liveArtifact);
        if (liveArtifact.isEmpty() && screenshot == null) {
            return LivePageStatusContext.empty();
        }

        Instant updatedAt = latestInstant(
                instantValue(liveArtifact.get("capturedAt")),
                screenshot != null ? resolveArtifactModifiedAt(screenshot) : null,
                Files.isRegularFile(livePageJson) ? resolveArtifactModifiedAt(livePageJson) : null);
        return new LivePageStatusContext(
                firstNonBlank(textOr(liveArtifact, "url", ""), ""),
                textOr(liveArtifact, "pageState", ""),
                updatedAt);
    }

    // ---- GET /api/phase3/runs/{runId}/live-page ----

    public Map<String, Object> getRunLivePage(String runId) throws IOException {
        requireRunId(runId);
        Map<String, Object> request = findRequest(runId);
        List<Map<String, Object>> events = findEvents(runId);
        String status = deriveStatus(request, events);
        Path runDir = resolveRunDir(runId);
        Path livePageJson = runDir != null ? runDir.resolve("live-page.json") : null;
        Map<String, Object> liveArtifact = readLivePageArtifact(livePageJson);
        Path screenshot = resolveLiveScreenshot(runDir, liveArtifact);

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

        if (!liveArtifact.isEmpty() || screenshot != null) {
            return buildAvailableLivePage(runId, request, status, latestStep, latestStepIndex, liveArtifact, screenshot);
        }

        return buildUnavailableLivePage(runId, request, status);
    }

    private Map<String, Object> buildAvailableLivePage(
            String runId,
            Map<String, Object> request,
            String status,
            Map<String, Object> latestStep,
            int latestStepIndex,
            Map<String, Object> liveArtifact,
            Path screenshot) throws IOException {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("status", "AVAILABLE");
        result.put("capturedAt", resolveCapturedAt(liveArtifact, screenshot));
        result.put("url", firstNonBlank(
                textOr(liveArtifact, "url", ""),
                requestPageUrl(request)));
        result.put("title", firstNonBlank(
                textOr(liveArtifact, "title", ""),
                textOr(request, "pageTitle", ""),
                textOr(request, "title", ""),
                requestPageIdentity(request),
                runId));
        result.put("pageState", firstNonBlank(
                textOr(liveArtifact, "pageState", ""),
                requestPageState(request),
                screenshot != null ? "artifact-captured" : "",
                status.equals("RUNNING") ? "active" : "idle"));

        Map<String, Object> highlight = new LinkedHashMap<>();
        Map<String, Object> artifactHighlight = mapValue(liveArtifact.get("highlight"));
        highlight.put("stepIndex", intValue(artifactHighlight.getOrDefault("stepIndex", latestStepIndex)));
        highlight.put("action", firstNonBlank(
                textOr(artifactHighlight, "action", ""),
                latestStep != null ? textOr(latestStep, "detail", "") : "",
                textOr(request, "nextAction", ""),
                textOr(request, "bodySummary", "")));
        highlight.put("target", firstNonBlank(
                textOr(artifactHighlight, "target", ""),
                textOr(request, "locator", "")));
        result.put("highlight", highlight);
        result.put("screenshotPath", screenshot != null
                ? runDirRelativePath(resolveRunDir(runId), screenshot)
                : null);
        return result;
    }

    private Map<String, Object> buildUnavailableLivePage(String runId, Map<String, Object> request, String status) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runId", runId);
        result.put("status", "UNAVAILABLE");
        result.put("capturedAt", Instant.now(clock).toString());
        result.put("url", requestPageUrl(request));
        result.put("title", firstNonBlank(
                textOr(request, "pageTitle", ""),
                textOr(request, "title", ""),
                requestPageIdentity(request)));
        result.put("pageState", firstNonBlank(
                requestPageState(request),
                "RUNNING".equals(status) ? "active" : "unavailable"));
        result.put("highlight", Map.of(
                "stepIndex", 0,
                "action", firstNonBlank(
                        textOr(request, "nextAction", ""),
                        textOr(request, "bodySummary", "")),
                "target", textOr(request, "locator", "")));
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

    private Path resolveRunDir(String runId) {
        if (runsRoot == null) {
            return null;
        }
        Path resolved = runsRoot.resolve(runId).normalize();
        if (!resolved.startsWith(runsRoot)) {
            throw new IllegalArgumentException("Invalid runId: path traversal detected");
        }
        return resolved;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readLivePageArtifact(Path livePageJson) {
        if (livePageJson == null || !Files.isRegularFile(livePageJson)) {
            return Map.of();
        }
        try {
            Map<String, Object> value = Jsons.readValue(Files.readString(livePageJson, StandardCharsets.UTF_8), Map.class);
            return value != null ? value : Map.of();
        } catch (IOException ignored) {
            return Map.of();
        }
    }

    private Path resolveLiveScreenshot(Path runDir, Map<String, Object> liveArtifact) throws IOException {
        if (runDir == null || !Files.isDirectory(runDir)) {
            return null;
        }
        String rawPath = textOr(liveArtifact, "screenshotPath", "");
        Path normalized = normalizeArtifactPath(runDir, rawPath);
        if (normalized != null) {
            return normalized;
        }
        try (var walk = Files.walk(runDir, 2)) {
            return walk
                    .filter(Files::isRegularFile)
                    .filter(this::isImageArtifact)
                    .sorted((left, right) -> Long.compare(scoreLiveScreenshot(right), scoreLiveScreenshot(left)))
                    .findFirst()
                    .orElse(null);
        }
    }

    private Path normalizeArtifactPath(Path runDir, String rawPath) {
        if (rawPath == null || rawPath.isBlank()) {
            return null;
        }
        Path candidate;
        try {
            candidate = Path.of(rawPath).normalize();
        } catch (RuntimeException ignored) {
            return null;
        }
        if (!candidate.isAbsolute()) {
            candidate = runDir.resolve(candidate).normalize();
        }
        if (!candidate.startsWith(runDir) || !Files.isRegularFile(candidate)) {
            return null;
        }
        return candidate;
    }

    private Instant resolveArtifactModifiedAt(Path file) {
        try {
            FileTime modifiedAt = Files.getLastModifiedTime(file);
            return modifiedAt.toInstant();
        } catch (IOException ignored) {
            return Instant.now(clock);
        }
    }

    private String resolveRuntimeLogTimestamp(String line, Instant fallbackAt) {
        int separator = line.indexOf(' ');
        if (separator > 0) {
            String firstToken = line.substring(0, separator).trim();
            try {
                return Instant.parse(firstToken).toString();
            } catch (RuntimeException ignored) {
                // fall back to file-modified time
            }
        }
        return fallbackAt.toString();
    }

    private String summarizeRuntimeLogLine(String line) {
        int separator = line.indexOf(' ');
        if (separator > 0) {
            String firstToken = line.substring(0, separator).trim();
            try {
                Instant.parse(firstToken);
                String remainder = line.substring(separator + 1).trim();
                if (!remainder.isEmpty()) {
                    return remainder;
                }
            } catch (RuntimeException ignored) {
                // use raw line
            }
        }
        return line;
    }

    private String classifyRuntimeLogType(String line) {
        String normalized = line.toUpperCase(Locale.ROOT);
        if (normalized.contains("ERROR")) {
            return "ERROR";
        }
        if (normalized.contains("WARN")) {
            return "WARNING";
        }
        if (normalized.contains("HEAL")) {
            return "HEAL";
        }
        if (normalized.contains("DECISION")) {
            return "DECISION";
        }
        return "INFO";
    }

    private String normalizeReportStepState(String status) {
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "SUCCESS", "SUCCEEDED", "PASSED", "DONE" -> "DONE";
            case "RUNNING", "STARTED", "IN_PROGRESS" -> "RUNNING";
            case "FAILED", "FAIL", "ERROR", "BROKEN", "TIMEOUT" -> "FAILED";
            case "SKIPPED", "SKIP", "CANCELLED", "ABORTED" -> "SKIPPED";
            default -> "TODO";
        };
    }

    private String normalizeLifecycleStatus(String status) {
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "SUCCESS", "SUCCEEDED", "PASSED", "DONE", "OK" -> "OK";
            case "RUNNING", "STARTED", "IN_PROGRESS" -> "RUNNING";
            case "FAILED", "FAIL", "ERROR", "BROKEN", "TIMEOUT", "NEEDS_REVIEW" -> "FAILED";
            case "PAUSED", "PAUSING", "ABORTED", "ABORTING", "PRE_EXECUTION", "QUEUED", "WAITING" -> status.toUpperCase(Locale.ROOT);
            default -> "";
        };
    }

    private String deriveReportStatus(
            String rawStatus,
            int totalSteps,
            int completedSteps,
            int runningSteps,
            int todoSteps,
            int failedSteps,
            boolean finished) {
        if (finished && !rawStatus.isBlank() && isTerminalStatus(rawStatus)) {
            return rawStatus;
        }
        if (runningSteps > 0) {
            return "RUNNING";
        }
        if (failedSteps > 0 && (finished || (totalSteps > 0 && completedSteps >= totalSteps && todoSteps == 0))) {
            return "FAILED";
        }
        if (totalSteps > 0 && completedSteps < totalSteps) {
            return "RUNNING";
        }
        if (totalSteps > 0 && completedSteps >= totalSteps) {
            return failedSteps > 0 ? "FAILED" : "OK";
        }
        return rawStatus;
    }

    private boolean isImageArtifact(Path file) {
        String filename = file.getFileName().toString().toLowerCase(Locale.ROOT);
        for (String extension : LIVE_IMAGE_EXTENSIONS) {
            if (filename.endsWith(extension)) {
                return true;
            }
        }
        return false;
    }

    private long scoreLiveScreenshot(Path file) {
        String normalized = file.toString().replace('\\', '/').toLowerCase(Locale.ROOT);
        long score = 0;
        if (normalized.contains("/live/")) {
            score += 4;
        }
        if (normalized.contains("live-page")) {
            score += 3;
        }
        if (normalized.contains("screenshot")) {
            score += 2;
        }
        try {
            score += Files.getLastModifiedTime(file).toMillis();
        } catch (IOException ignored) {
        }
        return score;
    }

    private String resolveCapturedAt(Map<String, Object> liveArtifact, Path screenshot) throws IOException {
        String capturedAt = textOr(liveArtifact, "capturedAt", "");
        if (!capturedAt.isBlank()) {
            return capturedAt;
        }
        if (screenshot != null && Files.isRegularFile(screenshot)) {
            return Files.getLastModifiedTime(screenshot).toInstant().toString();
        }
        return Instant.now(clock).toString();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String runDirRelativePath(Path runDir, Path artifactPath) {
        if (runDir == null || artifactPath == null) {
            return "";
        }
        return runDir.relativize(artifactPath).toString().replace('\\', '/');
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> mapValue(Object value) {
        if (value instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        return Map.of();
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

    private ProgressInfo deriveProgressInfo(
            ReportStatusContext reportContext,
            List<Map<String, Object>> events,
            String status,
            long elapsedMs) {
        int totalSteps = reportContext.totalSteps();
        int completedSteps = reportContext.completedSteps();
        int runningSteps = 0;
        if (totalSteps <= 0) {
            int doneSteps = countEventType(events, "STEP_DONE");
            int eventRunning = countEventType(events, "STEP_RUNNING");
            int todoSteps = countEventType(events, "STEP_TODO");
            totalSteps = doneSteps + eventRunning + todoSteps;
            completedSteps = doneSteps;
            runningSteps = eventRunning;
        }

        if (totalSteps <= 0) {
            return new ProgressInfo(0, 0, 0, 0);
        }

        int currentStep;
        int percent;
        if (isTerminalStatus(status)) {
            currentStep = totalSteps;
            percent = 100;
        } else {
            currentStep = runningSteps > 0 || completedSteps < totalSteps
                    ? Math.min(totalSteps, completedSteps + 1)
                    : Math.min(totalSteps, completedSteps);
            percent = Math.min(100, (completedSteps * 100) / totalSteps);
        }

        long estimatedTotalMs = completedSteps > 0 && totalSteps > 0
                ? Math.max(elapsedMs, (elapsedMs * totalSteps) / completedSteps)
                : 0;
        return new ProgressInfo(currentStep, totalSteps, percent, estimatedTotalMs);
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

    private long resolveElapsedMs(long artifactDurationMs, Instant startedAt, Instant finishedAt, Instant now) {
        if (artifactDurationMs > 0) {
            return artifactDurationMs;
        }
        if (startedAt == null) {
            return 0;
        }
        Instant end = finishedAt != null ? finishedAt : now;
        return Math.max(0, Duration.between(startedAt, end).toMillis());
    }

    private String resolveLastUpdatedAt(
            Instant now,
            Map<String, Object> latestEvent,
            ReportStatusContext reportContext,
            LivePageStatusContext livePageContext,
            Path runDir) {
        Instant runtimeLogAt = null;
        if (runDir != null) {
            Path runtimeLog = runDir.resolve("runtime.log").normalize();
            if (runtimeLog.startsWith(runDir) && Files.isRegularFile(runtimeLog)) {
                runtimeLogAt = resolveArtifactModifiedAt(runtimeLog);
            }
        }
        Instant eventAt = latestEvent != null ? instantValue(latestEvent.get("at")) : null;
        Instant resolved = latestInstant(
                eventAt,
                reportContext.updatedAt(),
                livePageContext.updatedAt(),
                runtimeLogAt);
        return (resolved != null ? resolved : now).toString();
    }

    private Instant latestInstant(Instant... candidates) {
        Instant latest = null;
        for (Instant candidate : candidates) {
            if (candidate != null && (latest == null || candidate.isAfter(latest))) {
                latest = candidate;
            }
        }
        return latest;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> listValue(Object value) {
        if (!(value instanceof List<?> list)) {
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

    private int intValue(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return 0;
    }

    private String stringValue(Object value) {
        if (value == null) {
            return "";
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? "" : text;
    }

    private Instant instantValue(Object value) {
        String text = stringValue(value);
        if (text.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(text);
        } catch (RuntimeException ignored) {
            return null;
        }
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

    private String requestPageUrl(Map<String, Object> request) {
        return firstNonBlank(
                textOr(request, "pageUrl", ""),
                textOr(request, "targetUrl", ""));
    }

    private String requestPageIdentity(Map<String, Object> request) {
        String domain = textOr(request, "pageDomain", "");
        String path = textOr(request, "pagePath", "");
        if (!domain.isBlank() && !path.isBlank()) {
            return domain + path;
        }
        return firstNonBlank(domain, path, "");
    }

    private String requestPageState(Map<String, Object> request) {
        List<String> parts = new ArrayList<>();
        addIfPresent(parts, textOr(request, "runtimeMode", ""));
        addIfPresent(parts, textOr(request, "queueState", ""));
        addIfPresent(parts, textOr(request, "auditState", ""));
        return String.join(" / ", parts);
    }

    private void addIfPresent(List<String> target, String value) {
        if (value != null && !value.isBlank()) {
            target.add(value.trim());
        }
    }

    private void putIfNotBlank(Map<String, Object> target, String key, String value) {
        if (value != null && !value.isBlank()) {
            target.put(key, value.trim());
        }
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

    private record ProgressInfo(int currentStep, int totalSteps, int percent, long estimatedTotalMs) {}

    private record ReportStatusContext(
            String status,
            Instant startedAt,
            Instant finishedAt,
            long durationMs,
            int totalSteps,
            int completedSteps,
            int assertionsPassed,
            int assertionsTotal,
            String projectKey,
            String environment,
            String model,
            String owner,
            Instant updatedAt) {
        private static ReportStatusContext empty() {
            return new ReportStatusContext("", null, null, 0, 0, 0, 0, 0, "", "", "", "", null);
        }
    }

    private record LivePageStatusContext(String url, String pageState, Instant updatedAt) {
        private static LivePageStatusContext empty() {
            return new LivePageStatusContext("", "", null);
        }
    }
}
