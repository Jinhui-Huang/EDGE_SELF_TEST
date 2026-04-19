package com.example.webtest.admin.service;

import com.example.webtest.admin.model.AdminConsoleSnapshot;
import com.example.webtest.admin.model.ExtensionPopupSnapshot;
import com.example.webtest.json.Jsons;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

public final class Phase3MockDataService {
    private static final DateTimeFormatter REPORT_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
            .withLocale(Locale.ROOT)
            .withZone(ZoneId.systemDefault());
    private static final DateTimeFormatter TIMELINE_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm")
            .withLocale(Locale.ROOT)
            .withZone(ZoneId.systemDefault());
    private static final Set<String> ACTIVE_EXECUTION_STATES = Set.of(
            "QUEUED",
            "WAITING",
            "RUNNING",
            "IN_PROGRESS",
            "NEEDS_REVIEW");
    private static final Set<String> SUCCESS_EXECUTION_STATES = Set.of("OK", "SUCCESS", "SUCCEEDED", "PASSED");
    private static final Set<String> FAILED_EXECUTION_STATES = Set.of("FAILED", "ERROR");

    private final Path reportRoot;
    private final Path schedulerRequestsPath;
    private final Path schedulerEventsPath;
    private final Path schedulerStatePath;
    private final Path queueSnapshotPath;
    private final Path catalogSnapshotPath;
    private final Path executionHistoryPath;
    private final Path modelConfigPath;
    private final Path environmentConfigPath;
    private final Clock clock;

    public Phase3MockDataService() {
        this(
                Path.of("runs"),
                Path.of("config", "phase3", "scheduler-requests.json"),
                Path.of("config", "phase3", "scheduler-events.json"),
                Path.of("config", "phase3", "scheduler-state.json"),
                Path.of("config", "phase3", "execution-queue.json"),
                Path.of("config", "phase3", "project-catalog.json"),
                Path.of("config", "phase3", "execution-history.json"),
                Path.of("config", "phase3", "model-config.json"),
                Path.of("config", "phase3", "environment-config.json"),
                Clock.systemUTC());
    }

    public Phase3MockDataService(
            Path reportRoot,
            Path schedulerRequestsPath,
            Path schedulerEventsPath,
            Path schedulerStatePath,
            Path queueSnapshotPath,
            Path catalogSnapshotPath,
            Path executionHistoryPath,
            Path modelConfigPath,
            Path environmentConfigPath,
            Clock clock) {
        this.reportRoot = reportRoot == null ? Path.of("runs") : reportRoot;
        this.schedulerRequestsPath = schedulerRequestsPath == null
                ? Path.of("config", "phase3", "scheduler-requests.json")
                : schedulerRequestsPath;
        this.schedulerEventsPath = schedulerEventsPath == null
                ? Path.of("config", "phase3", "scheduler-events.json")
                : schedulerEventsPath;
        this.schedulerStatePath = schedulerStatePath == null
                ? Path.of("config", "phase3", "scheduler-state.json")
                : schedulerStatePath;
        this.queueSnapshotPath = queueSnapshotPath == null ? Path.of("config", "phase3", "execution-queue.json") : queueSnapshotPath;
        this.catalogSnapshotPath = catalogSnapshotPath == null ? Path.of("config", "phase3", "project-catalog.json") : catalogSnapshotPath;
        this.executionHistoryPath = executionHistoryPath == null ? Path.of("config", "phase3", "execution-history.json") : executionHistoryPath;
        this.modelConfigPath = modelConfigPath == null ? Path.of("config", "phase3", "model-config.json") : modelConfigPath;
        this.environmentConfigPath = environmentConfigPath == null
                ? Path.of("config", "phase3", "environment-config.json")
                : environmentConfigPath;
        this.clock = clock == null ? Clock.systemUTC() : clock;
    }

    public AdminConsoleSnapshot buildAdminConsoleSnapshot() {
        Instant now = Instant.now(clock);
        SchedulerStateSnapshotData schedulerState = loadSchedulerState();
        List<LocalExecutionSummary> executions = loadExecutionSummaries(schedulerState);
        List<QueueSnapshotItem> queueItems = loadQueueSnapshotItems(schedulerState);
        CatalogSnapshot catalog = loadCatalogSnapshot();
        List<AdminConsoleSnapshot.ConfigItem> modelConfig = loadConfigItems(
                modelConfigPath,
                List.of(
                        new AdminConsoleSnapshot.ConfigItem("Provider", "OpenAI-compatible placeholder"),
                        new AdminConsoleSnapshot.ConfigItem("Mode", "Audit-first / recommendation-only"),
                        new AdminConsoleSnapshot.ConfigItem("Output guard", "JSON schema plus rule validation")));
        List<AdminConsoleSnapshot.ConfigItem> environmentConfig = loadConfigItems(
                environmentConfigPath,
                List.of(
                        new AdminConsoleSnapshot.ConfigItem("Browser pool", "Edge stable / staging"),
                        new AdminConsoleSnapshot.ConfigItem("Account slots", "smoke_bot_01, ops_audit_02"),
                        new AdminConsoleSnapshot.ConfigItem(
                                "Data policy",
                                "Projects/config stay file-backed; queue and execution state prefer scheduler requests plus events, then scheduler-state.json, then local compatibility snapshots.")));
        return new AdminConsoleSnapshot(
                now.toString(),
                "/api/phase3",
                new AdminConsoleSnapshot.PlatformSummary(
                        "Phase 3 Local API",
                        "Enterprise Web Test Platform",
                        "Platform management stays primary, runtime AI remains advisory, and queue/execution views now prefer scheduler requests plus events before falling back to scheduler snapshots, reports, and compatibility files.",
                        "Rule-first runtime AI with audited recommendations"),
                List.of(
                        new AdminConsoleSnapshot.NavItem("dashboard", "Dashboard", "Platform load, risk, and queue visibility"),
                        new AdminConsoleSnapshot.NavItem("projects", "Projects", "Project list and detail entry"),
                        new AdminConsoleSnapshot.NavItem("cases", "Cases", "Case catalog, tags, and maintenance status"),
                        new AdminConsoleSnapshot.NavItem("execution", "Execution", "Start runs, inspect queue, and preflight"),
                        new AdminConsoleSnapshot.NavItem("reports", "Reports", "Recent runs, failures, and maintenance"),
                        new AdminConsoleSnapshot.NavItem("models", "Model Config", "Model access and audit toggles"),
                        new AdminConsoleSnapshot.NavItem("environments", "Environment Config", "Target environments and browser pools")),
                buildStats(executions, queueItems, catalog, now),
                buildProjectRows(catalog, executions),
                buildCaseRows(catalog),
                buildWorkQueue(queueItems, executions),
                buildReportRows(executions),
                modelConfig,
                environmentConfig,
                buildTimeline(executions, queueItems, now),
                List.of(
                        "Runtime AI can recommend but cannot directly drive browser actions.",
                        "Phase 3 pages stay within platform management scope and exclude Phase 5 document flows.",
                        "The Edge extension remains a lightweight assistive entry point."),
                buildCaseTags(catalog));
    }

    public ExtensionPopupSnapshot buildExtensionPopupSnapshot() {
        Instant now = Instant.now(clock);
        SchedulerStateSnapshotData schedulerState = loadSchedulerState();
        List<LocalExecutionSummary> executions = loadExecutionSummaries(schedulerState);
        List<QueueSnapshotItem> queueItems = loadQueueSnapshotItems(schedulerState);
        LocalExecutionSummary latestExecution = executions.isEmpty() ? null : executions.get(0);
        return new ExtensionPopupSnapshot(
                now.toString(),
                "READY",
                "Phase 3 popup remains assistive and mirrors local platform queue and report status without owning heavy configuration.",
                new ExtensionPopupSnapshot.PageSummary(
                        "Checkout - Payment",
                        "https://staging.example.test/checkout/payment",
                        "staging.example.test",
                        now.toString()),
                new ExtensionPopupSnapshot.RuntimeStatus(
                        "Audit-first",
                        queueState(queueItems, executions),
                        auditState(latestExecution),
                        nextAction(queueItems, latestExecution)),
                List.of(
                        "Use the platform UI for configuration and report review.",
                        "Queue and execution state prefer config/phase3/scheduler-requests.json plus scheduler-events.json when present.",
                        "If the derived scheduler service files are absent, the popup falls back to config/phase3/scheduler-state.json.",
                        "Queue status otherwise falls back to config/phase3/execution-queue.json.",
                        "Execution history otherwise falls back to config/phase3/execution-history.json.",
                        "Latest run status is read from runs/*/report.json when present."));
    }

    private List<AdminConsoleSnapshot.StatCard> buildStats(
            List<LocalExecutionSummary> executions,
            List<QueueSnapshotItem> queueItems,
            CatalogSnapshot catalog,
            Instant now) {
        int inProgress = countQueueState(queueItems, "In progress");
        int projectCount = catalog.projects().size();
        int caseCount = (int) catalog.cases().stream()
                .filter(caseRecord -> !caseRecord.archived())
                .count();
        List<LocalExecutionSummary> last24Hours = executions.stream()
                .filter(execution -> execution.finishedAt() != null && !execution.finishedAt().isBefore(now.minusSeconds(86_400)))
                .toList();
        long successful24Hours = last24Hours.stream()
                .filter(LocalExecutionSummary::isSuccess)
                .count();
        String successRate = last24Hours.isEmpty()
                ? "n/a"
                : Math.round((successful24Hours * 1000.0) / last24Hours.size()) / 10.0 + "%";
        LocalExecutionSummary latestExecution = executions.isEmpty() ? null : executions.get(0);
        return List.of(
                new AdminConsoleSnapshot.StatCard(
                        "Active projects",
                        Integer.toString(projectCount),
                        projectCount == 0
                                ? "No project-catalog.json projects detected under " + catalogSnapshotPath
                                : caseCount + " active cases are mapped from " + catalogSnapshotPath),
                new AdminConsoleSnapshot.StatCard(
                        "Queued runs",
                        Long.toString(queueItems.isEmpty() ? countActiveExecutions(executions) : queueItems.size()),
                        inProgress > 0
                                ? inProgress + " items currently marked In progress"
                                : queueItems.isEmpty()
                                ? "Derived from active execution-history.json entries"
                                : "No active item is currently marked In progress"),
                new AdminConsoleSnapshot.StatCard(
                        "24h success rate",
                        successRate,
                        last24Hours.isEmpty()
                                ? "No local executions finished in the last 24 hours"
                                : successful24Hours + " of " + last24Hours.size() + " local executions finished successfully"),
                new AdminConsoleSnapshot.StatCard(
                        "Latest run status",
                        latestExecution == null ? "No runs" : latestExecution.status(),
                        latestExecution == null
                                ? "Start a run to populate the local execution summary"
                                : latestExecution.runId() + " updated at " + formatReportTime(latestExecution.sortInstant())));
    }

    private List<AdminConsoleSnapshot.ProjectRow> buildProjectRows(CatalogSnapshot catalog, List<LocalExecutionSummary> executions) {
        if (catalog.projects().isEmpty()) {
            return List.of(new AdminConsoleSnapshot.ProjectRow(
                    "no-projects",
                    "No local projects",
                    "Add config/phase3/project-catalog.json to surface project and case summaries",
                    0,
                    0,
                    "Project rows fall back to this empty state until a local catalog exists."));
        }
        return catalog.projects().stream()
                .map(project -> {
                    List<CatalogCaseRecord> projectCases = catalog.cases().stream()
                            .filter(caseRecord -> project.key().equals(caseRecord.projectKey()) && !caseRecord.archived())
                            .toList();
                    LocalExecutionSummary latestProjectExecution = executions.stream()
                            .filter(execution -> execution.belongsToProject(project.key()))
                            .findFirst()
                            .orElse(null);
                    return new AdminConsoleSnapshot.ProjectRow(
                            project.key(),
                            project.name(),
                            project.scope(),
                            projectCases.size(),
                            project.environments().size(),
                            projectNote(project, projectCases, latestProjectExecution));
                })
                .toList();
    }

    private List<AdminConsoleSnapshot.CaseRow> buildCaseRows(CatalogSnapshot catalog) {
        if (catalog.cases().isEmpty()) {
            return List.of(new AdminConsoleSnapshot.CaseRow(
                    "no-cases",
                    "n/a",
                    "No local cases",
                    List.of("catalog-pending"),
                    "INFO",
                    "-",
                    false));
        }
        return catalog.cases().stream()
                .sorted(Comparator.comparing(
                        (CatalogCaseRecord caseRecord) -> caseRecord.updatedAt() == null ? Instant.EPOCH : caseRecord.updatedAt())
                        .reversed())
                .limit(12)
                .map(caseRecord -> new AdminConsoleSnapshot.CaseRow(
                        caseRecord.id(),
                        caseRecord.projectKey(),
                        caseRecord.name(),
                        caseRecord.tags(),
                        caseRecord.status(),
                        formatReportTime(caseRecord.updatedAt()),
                        caseRecord.archived()))
                .toList();
    }

    private List<AdminConsoleSnapshot.WorkQueueItem> buildWorkQueue(
            List<QueueSnapshotItem> queueItems,
            List<LocalExecutionSummary> executions) {
        if (!queueItems.isEmpty()) {
            return queueItems.stream()
                    .map(item -> new AdminConsoleSnapshot.WorkQueueItem(item.title(), item.owner(), item.state(), item.detail()))
                    .limit(6)
                    .toList();
        }
        List<AdminConsoleSnapshot.WorkQueueItem> derivedItems = executions.stream()
                .filter(LocalExecutionSummary::isActive)
                .limit(6)
                .map(execution -> new AdminConsoleSnapshot.WorkQueueItem(
                        execution.runId(),
                        execution.owner(),
                        execution.status(),
                        execution.detail()))
                .toList();
        if (!derivedItems.isEmpty()) {
            return derivedItems;
        }
        return List.of(new AdminConsoleSnapshot.WorkQueueItem(
                "No queued work",
                "local-admin-api",
                "Idle",
                "Add config/phase3/execution-queue.json or execution-history.json to surface local execution state."));
    }

    private List<AdminConsoleSnapshot.ReportRow> buildReportRows(List<LocalExecutionSummary> executions) {
        if (executions.isEmpty()) {
            return List.of(new AdminConsoleSnapshot.ReportRow(
                    "No local reports",
                    "INFO",
                    "-",
                    "No report.json files or execution-history.json entries were found."));
        }
        return executions.stream()
                .limit(8)
                .map(execution -> new AdminConsoleSnapshot.ReportRow(
                        execution.runId(),
                        execution.status(),
                        formatReportTime(execution.sortInstant()),
                        execution.entry()))
                .toList();
    }

    private List<String> buildCaseTags(CatalogSnapshot catalog) {
        List<String> tags = catalog.cases().stream()
                .filter(caseRecord -> !caseRecord.archived())
                .flatMap(caseRecord -> caseRecord.tags().stream())
                .filter(tag -> tag != null && !tag.isBlank())
                .distinct()
                .sorted()
                .toList();
        if (!tags.isEmpty()) {
            return tags;
        }
        return List.of("smoke", "regression", "locator-repair-needed", "depends-on-test-data");
    }

    private List<AdminConsoleSnapshot.TimelineItem> buildTimeline(
            List<LocalExecutionSummary> executions,
            List<QueueSnapshotItem> queueItems,
            Instant now) {
        List<TimelineEvent> events = new ArrayList<>();
        executions.stream()
                .limit(4)
                .forEach(execution -> events.add(new TimelineEvent(
                        execution.sortInstant() == null ? now : execution.sortInstant(),
                        execution.runId() + " update",
                        execution.summaryText())));
        queueItems.stream()
                .limit(3)
                .forEach(item -> events.add(new TimelineEvent(
                        item.updatedAt() == null ? now : item.updatedAt(),
                        item.title() + " queue update",
                        item.state() + " by " + item.owner() + ". " + item.detail())));
        if (events.isEmpty()) {
            events.add(new TimelineEvent(
                    now,
                    "Local state pending",
                    "No report, queue, or execution history files were found yet; the admin shell will update when local state appears."));
        }
        return events.stream()
                .sorted(Comparator.comparing(TimelineEvent::at).reversed())
                .limit(6)
                .map(event -> new AdminConsoleSnapshot.TimelineItem(
                        TIMELINE_TIME_FORMATTER.format(event.at()),
                        event.title(),
                        event.detail()))
                .toList();
    }

    private String queueState(List<QueueSnapshotItem> queueItems, List<LocalExecutionSummary> executions) {
        if (queueItems.isEmpty()) {
            long active = countActiveExecutions(executions);
            return active == 0 ? "Idle" : active + " active execution-history items";
        }
        int inProgress = countQueueState(queueItems, "In progress");
        int waiting = countQueueState(queueItems, "Waiting");
        int review = countQueueState(queueItems, "Needs review");
        return queueItems.size() + " queued / " + inProgress + " active / " + waiting + " waiting / " + review + " review";
    }

    private String auditState(LocalExecutionSummary latestExecution) {
        if (latestExecution == null) {
            return "Decision logging enabled, awaiting first local run";
        }
        if (latestExecution.isFailure()) {
            return "Latest local run failed; audit trail review recommended";
        }
        if (latestExecution.isActive()) {
            return "Latest local run is still active; keep audit review open until it settles";
        }
        return "Latest local run completed without failures";
    }

    private String nextAction(List<QueueSnapshotItem> queueItems, LocalExecutionSummary latestExecution) {
        boolean hasReview = queueItems.stream().anyMatch(item -> "Needs review".equalsIgnoreCase(item.state()));
        if (hasReview) {
            return "Open the platform queue and resolve items marked Needs review.";
        }
        if (latestExecution != null && latestExecution.isFailure()) {
            return "Open the latest failed report in the platform dashboard before accepting runtime suggestions.";
        }
        if (latestExecution != null && latestExecution.isActive()) {
            return "Keep the platform dashboard open and monitor the active run before accepting runtime suggestions.";
        }
        if (queueItems.isEmpty()) {
            return "No queued local work detected; use the platform to start or schedule the next run.";
        }
        return "Refresh current page summary or open platform dashboard for queue details.";
    }

    private int countQueueState(List<QueueSnapshotItem> queueItems, String state) {
        return (int) queueItems.stream()
                .filter(item -> state.equalsIgnoreCase(item.state()))
                .count();
    }

    private long countActiveExecutions(List<LocalExecutionSummary> executions) {
        return executions.stream()
                .filter(LocalExecutionSummary::isActive)
                .count();
    }

    private List<LocalExecutionSummary> loadExecutionSummaries(SchedulerStateSnapshotData schedulerState) {
        List<LocalExecutionSummary> reports = loadLocalReports();
        List<LocalExecutionSummary> history = !schedulerState.executions().isEmpty()
                ? schedulerState.executions()
                : loadExecutionHistoryItems();
        Map<String, LocalExecutionSummary> merged = new LinkedHashMap<>();
        for (LocalExecutionSummary entry : history) {
            merged.put(entry.runId(), entry);
        }
        for (LocalExecutionSummary entry : reports) {
            merged.put(entry.runId(), entry);
        }
        return merged.values().stream()
                .sorted(Comparator.comparing(LocalExecutionSummary::sortInstant, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    private List<LocalExecutionSummary> loadLocalReports() {
        Path normalizedRoot = reportRoot.toAbsolutePath().normalize();
        if (!Files.isDirectory(normalizedRoot)) {
            return List.of();
        }
        try (Stream<Path> children = Files.list(normalizedRoot)) {
            return children
                    .filter(Files::isDirectory)
                    .map(this::readLocalReport)
                    .flatMap(java.util.Optional::stream)
                    .toList();
        } catch (IOException e) {
            return List.of();
        }
    }

    private java.util.Optional<LocalExecutionSummary> readLocalReport(Path runDirectory) {
        Path reportJson = runDirectory.resolve("report.json");
        if (!Files.isRegularFile(reportJson)) {
            return java.util.Optional.empty();
        }
        try {
            Map<String, Object> report = Jsons.readValue(Files.readString(reportJson), Map.class);
            String runId = stringValue(report.get("runId"), runDirectory.getFileName().toString());
            Instant startedAt = instantValue(report.get("startedAt"));
            Instant finishedAt = instantValue(report.get("finishedAt"));
            Map<String, Object> summary = mapValue(report.get("summary"));
            int total = intValue(summary.get("total"));
            int failed = intValue(summary.get("failed"));
            int artifacts = artifactCount(listValue(report.get("steps")));
            String status = total == 0 ? "INFO" : failed > 0 ? "FAILED" : "OK";
            String entry = buildReportEntry(reportRoot.toAbsolutePath().normalize(), runDirectory, artifacts);
            return java.util.Optional.of(new LocalExecutionSummary(
                    runId,
                    null,
                    status,
                    startedAt,
                    finishedAt,
                    total,
                    failed,
                    artifacts,
                    entry,
                    "Report summary from " + runDirectory.getFileName() + " with " + total + " total steps and " + failed + " failures.",
                    "report.json",
                    "local-report",
                    false));
        } catch (IOException e) {
            return java.util.Optional.empty();
        }
    }

    private List<LocalExecutionSummary> loadExecutionHistoryItems() {
        Path normalizedPath = executionHistoryPath.toAbsolutePath().normalize();
        if (!Files.isRegularFile(normalizedPath)) {
            return List.of();
        }
        try {
            ExecutionHistorySnapshot snapshot = Jsons.readValue(Files.readString(normalizedPath), ExecutionHistorySnapshot.class);
            if (snapshot == null || snapshot.items() == null) {
                return List.of();
            }
            return snapshot.items().stream()
                    .filter(item -> item != null && item.runId() != null && !item.runId().isBlank())
                    .map(item -> {
                        String status = normalizeStatus(item.status());
                        Instant startedAt = instantValue(item.startedAt());
                        Instant finishedAt = instantValue(item.finishedAt());
                        return new LocalExecutionSummary(
                                item.runId(),
                                blankToNull(item.projectKey()),
                                status,
                                startedAt,
                                finishedAt,
                                intValue(item.total()),
                                intValue(item.failed()),
                                intValue(item.artifacts()),
                                buildHistoryEntry(item),
                                historyDetail(item, status),
                                stringValue(item.owner(), "local-admin-api"),
                                stringValue(item.environment(), "n/a"),
                                ACTIVE_EXECUTION_STATES.contains(status));
                    })
                    .toList();
        } catch (IOException e) {
            return List.of();
        }
    }

    private List<QueueSnapshotItem> loadQueueSnapshotItems(SchedulerStateSnapshotData schedulerState) {
        if (!schedulerState.queueItems().isEmpty()) {
            return schedulerState.queueItems();
        }
        Path normalizedPath = queueSnapshotPath.toAbsolutePath().normalize();
        if (!Files.isRegularFile(normalizedPath)) {
            return List.of();
        }
        try {
            QueueSnapshot snapshot = Jsons.readValue(Files.readString(normalizedPath), QueueSnapshot.class);
            if (snapshot == null || snapshot.items() == null) {
                return List.of();
            }
            return snapshot.items().stream()
                    .filter(item -> item != null && item.title() != null && !item.title().isBlank())
                    .map(item -> new QueueSnapshotItem(
                            item.title(),
                            stringValue(item.owner(), "unknown"),
                            stringValue(item.state(), "Waiting"),
                            stringValue(item.detail(), ""),
                            instantValue(item.updatedAt())))
                    .toList();
        } catch (IOException e) {
            return List.of();
        }
    }

    private SchedulerStateSnapshotData loadSchedulerState() {
        LocalSchedulerStateReader.SchedulerStateData schedulerState = new LocalSchedulerStateReader().read(
                schedulerRequestsPath,
                schedulerEventsPath,
                schedulerStatePath);
        if (schedulerState.isEmpty()) {
            return SchedulerStateSnapshotData.empty();
        }
        List<QueueSnapshotItem> queueItems = schedulerState.queueItems().stream()
                .map(item -> new QueueSnapshotItem(
                        item.title(),
                        stringValue(item.owner(), "scheduler"),
                        stringValue(item.state(), "Waiting"),
                        stringValue(item.detail(), ""),
                        item.updatedAt()))
                .toList();
        List<LocalExecutionSummary> executions = schedulerState.executions().stream()
                .map(item -> {
                    String status = normalizeStatus(item.status());
                    return new LocalExecutionSummary(
                            item.runId(),
                            blankToNull(item.projectKey()),
                            status,
                            item.startedAt(),
                            item.finishedAt(),
                            item.total(),
                            item.failed(),
                            item.artifacts(),
                            buildSchedulerEntry(item),
                            schedulerDetail(item, status),
                            stringValue(item.owner(), "scheduler"),
                            stringValue(item.environment(), "n/a"),
                            ACTIVE_EXECUTION_STATES.contains(status));
                })
                .toList();
        return new SchedulerStateSnapshotData(queueItems, executions);
    }

    private CatalogSnapshot loadCatalogSnapshot() {
        Path normalizedPath = catalogSnapshotPath.toAbsolutePath().normalize();
        if (!Files.isRegularFile(normalizedPath)) {
            return new CatalogSnapshot(List.of(), List.of());
        }
        try {
            CatalogSnapshotRecord snapshot = Jsons.readValue(Files.readString(normalizedPath), CatalogSnapshotRecord.class);
            if (snapshot == null) {
                return new CatalogSnapshot(List.of(), List.of());
            }
            List<CatalogProjectRecord> projects = snapshot.projects() == null ? List.of() : snapshot.projects().stream()
                    .filter(project -> project != null && project.key() != null && !project.key().isBlank())
                    .map(project -> new CatalogProjectRecord(
                            project.key(),
                            stringValue(project.name(), project.key()),
                            stringValue(project.scope(), "Project scope pending"),
                            project.environments() == null ? List.of() : project.environments().stream()
                                    .filter(environment -> environment != null && !environment.isBlank())
                                    .toList(),
                            stringValue(project.note(), "")))
                    .toList();
            List<CatalogCaseRecord> cases = snapshot.cases() == null ? List.of() : snapshot.cases().stream()
                    .filter(caseRecord -> caseRecord != null && caseRecord.id() != null && !caseRecord.id().isBlank())
                    .map(caseRecord -> new CatalogCaseRecord(
                            caseRecord.id(),
                            stringValue(caseRecord.projectKey(), "unknown"),
                            stringValue(caseRecord.name(), caseRecord.id()),
                            caseRecord.tags() == null ? List.of() : caseRecord.tags().stream()
                                    .filter(tag -> tag != null && !tag.isBlank())
                                    .toList(),
                            stringValue(caseRecord.status(), "Draft"),
                            instantValue(caseRecord.updatedAt()),
                            Boolean.TRUE.equals(caseRecord.archived())))
                    .toList();
            return new CatalogSnapshot(projects, cases);
        } catch (IOException e) {
            return new CatalogSnapshot(List.of(), List.of());
        }
    }

    private List<AdminConsoleSnapshot.ConfigItem> loadConfigItems(
            Path configPath,
            List<AdminConsoleSnapshot.ConfigItem> fallbackItems) {
        Path normalizedPath = configPath.toAbsolutePath().normalize();
        if (!Files.isRegularFile(normalizedPath)) {
            return fallbackItems;
        }
        try {
            ConfigSnapshot snapshot = Jsons.readValue(Files.readString(normalizedPath), ConfigSnapshot.class);
            if (snapshot == null || snapshot.items() == null) {
                return fallbackItems;
            }
            List<AdminConsoleSnapshot.ConfigItem> items = snapshot.items().stream()
                    .filter(item -> item != null && item.label() != null && !item.label().isBlank())
                    .map(item -> new AdminConsoleSnapshot.ConfigItem(
                            item.label(),
                            stringValue(item.value(), "n/a")))
                    .toList();
            return items.isEmpty() ? fallbackItems : items;
        } catch (IOException e) {
            return fallbackItems;
        }
    }

    private String buildReportEntry(Path normalizedReportRoot, Path runDirectory, int artifacts) {
        String runName = normalizedReportRoot.relativize(runDirectory.toAbsolutePath().normalize()).toString().replace('\\', '/');
        List<String> parts = new ArrayList<>();
        if (Files.isRegularFile(runDirectory.resolve("report.html"))) {
            parts.add(runName + "/report.html");
        }
        parts.add(runName + "/report.json");
        parts.add(artifacts + (artifacts == 1 ? " artifact" : " artifacts"));
        return String.join(" / ", parts);
    }

    private String buildHistoryEntry(ExecutionHistoryRecord item) {
        List<String> parts = new ArrayList<>();
        parts.add("execution-history.json");
        if (item.environment() != null && !item.environment().isBlank()) {
            parts.add(item.environment());
        }
        if (item.owner() != null && !item.owner().isBlank()) {
            parts.add(item.owner());
        }
        return String.join(" / ", parts);
    }

    private String buildSchedulerEntry(LocalSchedulerStateReader.SchedulerExecutionData item) {
        List<String> parts = new ArrayList<>();
        parts.add(stringValue(item.source(), "scheduler-service"));
        if (item.schedulerId() != null && !item.schedulerId().isBlank()) {
            parts.add(item.schedulerId());
        }
        if (item.environment() != null && !item.environment().isBlank()) {
            parts.add(item.environment());
        }
        if (item.owner() != null && !item.owner().isBlank()) {
            parts.add(item.owner());
        }
        return String.join(" / ", parts);
    }

    private String historyDetail(ExecutionHistoryRecord item, String status) {
        List<String> parts = new ArrayList<>();
        parts.add("Status " + status);
        if (item.detail() != null && !item.detail().isBlank()) {
            parts.add(item.detail());
        }
        if (item.environment() != null && !item.environment().isBlank()) {
            parts.add("env " + item.environment());
        }
        if (item.owner() != null && !item.owner().isBlank()) {
            parts.add("owner " + item.owner());
        }
        if (intValue(item.total()) > 0 || intValue(item.failed()) > 0) {
            parts.add("total " + intValue(item.total()) + ", failed " + intValue(item.failed()));
        }
        return String.join(". ", parts) + ".";
    }

    private String schedulerDetail(LocalSchedulerStateReader.SchedulerExecutionData item, String status) {
        List<String> parts = new ArrayList<>();
        parts.add("Scheduler status " + status);
        if (item.detail() != null && !item.detail().isBlank()) {
            parts.add(item.detail());
        }
        if (item.schedulerId() != null && !item.schedulerId().isBlank()) {
            parts.add("scheduler " + item.schedulerId());
        }
        if (item.environment() != null && !item.environment().isBlank()) {
            parts.add("env " + item.environment());
        }
        if (item.owner() != null && !item.owner().isBlank()) {
            parts.add("owner " + item.owner());
        }
        if (item.position() > 0) {
            parts.add("queue position " + item.position());
        }
        if (item.total() > 0 || item.failed() > 0) {
            parts.add("total " + item.total() + ", failed " + item.failed());
        }
        return String.join(". ", parts) + ".";
    }

    private String normalizeStatus(String rawStatus) {
        String normalized = stringValue(rawStatus, "INFO").trim().replace(' ', '_').toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "SUCCEEDED", "SUCCESS" -> "OK";
            case "INPROGRESS" -> "IN_PROGRESS";
            case "REVIEW" -> "NEEDS_REVIEW";
            default -> normalized;
        };
    }

    private int artifactCount(List<Object> steps) {
        int count = 0;
        for (Object stepObject : steps) {
            Map<String, Object> step = mapValue(stepObject);
            count += listValue(step.get("artifacts")).size();
        }
        return count;
    }

    private Map<String, Object> mapValue(Object value) {
        if (value instanceof Map<?, ?> map) {
            return map.entrySet().stream()
                    .filter(entry -> entry.getKey() instanceof String)
                    .collect(java.util.stream.Collectors.toMap(
                            entry -> (String) entry.getKey(),
                            Map.Entry::getValue,
                            (left, right) -> right,
                            java.util.LinkedHashMap::new));
        }
        return Map.of();
    }

    private List<Object> listValue(Object value) {
        if (value instanceof List<?> list) {
            return List.copyOf(list);
        }
        return List.of();
    }

    private String stringValue(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = value.toString();
        return text.isBlank() ? fallback : text;
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
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

    private Instant instantValue(Object value) {
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Instant.parse(text);
            } catch (RuntimeException ignored) {
                return null;
            }
        }
        return null;
    }

    private String formatReportTime(Instant value) {
        return value == null ? "-" : REPORT_TIME_FORMATTER.format(value);
    }

    private String projectNote(
            CatalogProjectRecord project,
            List<CatalogCaseRecord> projectCases,
            LocalExecutionSummary latestProjectExecution) {
        long locatorRepairCases = projectCases.stream()
                .filter(caseRecord -> caseRecord.tags().stream().anyMatch("locator-repair-needed"::equalsIgnoreCase))
                .count();
        if (latestProjectExecution != null) {
            return "Latest run " + latestProjectExecution.status() + " at " + formatReportTime(latestProjectExecution.sortInstant())
                    + "; " + locatorRepairCases + " cases marked locator-repair-needed.";
        }
        if (project.note() != null && !project.note().isBlank()) {
            return project.note();
        }
        return projectCases.isEmpty()
                ? "No active cases cataloged yet."
                : projectCases.size() + " active cases cataloged; local run history not found yet.";
    }

    private record LocalExecutionSummary(
            String runId,
            String projectKey,
            String status,
            Instant startedAt,
            Instant finishedAt,
            int total,
            int failed,
            int artifacts,
            String entry,
            String detail,
            String owner,
            String environment,
            boolean active) {
        private String summaryText() {
            if (detail != null && !detail.isBlank()) {
                return detail;
            }
            return "Total " + total + ", failed " + failed + ", artifacts " + artifacts + ".";
        }

        private boolean belongsToProject(String candidateProjectKey) {
            String normalizedProjectKey = candidateProjectKey == null ? "" : candidateProjectKey.toLowerCase(Locale.ROOT);
            if (normalizedProjectKey.isBlank()) {
                return false;
            }
            if (projectKey != null && projectKey.equalsIgnoreCase(candidateProjectKey)) {
                return true;
            }
            String normalizedRunId = runId == null ? "" : runId.toLowerCase(Locale.ROOT);
            return normalizedRunId.equals(normalizedProjectKey)
                    || normalizedRunId.startsWith(normalizedProjectKey + "-")
                    || normalizedRunId.startsWith(normalizedProjectKey + "_");
        }

        private Instant sortInstant() {
            return finishedAt != null ? finishedAt : startedAt;
        }

        private boolean isActive() {
            return active;
        }

        private boolean isSuccess() {
            return SUCCESS_EXECUTION_STATES.contains(status);
        }

        private boolean isFailure() {
            return FAILED_EXECUTION_STATES.contains(status);
        }
    }

    private record CatalogSnapshot(List<CatalogProjectRecord> projects, List<CatalogCaseRecord> cases) {
    }

    private record CatalogProjectRecord(
            String key,
            String name,
            String scope,
            List<String> environments,
            String note) {
    }

    private record CatalogCaseRecord(
            String id,
            String projectKey,
            String name,
            List<String> tags,
            String status,
            Instant updatedAt,
            boolean archived) {
    }

    private record CatalogSnapshotRecord(List<CatalogProjectRecord> projects, List<CatalogCaseRecordRecord> cases) {
    }

    private record CatalogCaseRecordRecord(
            String id,
            String projectKey,
            String name,
            List<String> tags,
            String status,
            String updatedAt,
            Boolean archived) {
    }

    private record QueueSnapshot(List<QueueSnapshotRecord> items) {
    }

    private record QueueSnapshotRecord(String title, String owner, String state, String detail, String updatedAt) {
    }

    private record QueueSnapshotItem(String title, String owner, String state, String detail, Instant updatedAt) {
    }

    private record ExecutionHistorySnapshot(List<ExecutionHistoryRecord> items) {
    }

    private record ExecutionHistoryRecord(
            String runId,
            String projectKey,
            String status,
            String owner,
            String environment,
            String detail,
            Object total,
            Object failed,
            Object artifacts,
            String startedAt,
            String finishedAt) {
    }

    private record SchedulerStateSnapshotData(
            List<QueueSnapshotItem> queueItems,
            List<LocalExecutionSummary> executions) {
        private static SchedulerStateSnapshotData empty() {
            return new SchedulerStateSnapshotData(List.of(), List.of());
        }
    }

    private record ConfigSnapshot(List<ConfigSnapshotItem> items) {
    }

    private record ConfigSnapshotItem(String label, String value) {
    }

    private record TimelineEvent(Instant at, String title, String detail) {
    }
}
