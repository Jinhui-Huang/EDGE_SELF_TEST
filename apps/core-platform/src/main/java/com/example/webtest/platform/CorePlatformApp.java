package com.example.webtest.platform;

import com.example.webtest.browser.page.DefaultPageController;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
import com.example.webtest.browser.session.BrowserSessionManager;
import com.example.webtest.browser.session.DefaultBrowserSessionManager;
import com.example.webtest.browser.session.ExecutionSession;
import com.example.webtest.browser.session.SessionOptions;
import com.example.webtest.cdp.client.CdpClient;
import com.example.webtest.cdp.client.DefaultCdpClient;
import com.example.webtest.dsl.parser.DefaultDslParser;
import com.example.webtest.dsl.validator.DefaultDslValidator;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.execution.engine.orchestrator.DefaultTestOrchestrator;
import com.example.webtest.execution.engine.result.RunOptions;
import com.example.webtest.execution.engine.result.RunResult;
import com.example.webtest.execution.engine.result.RunStatus;
import com.example.webtest.execution.engine.result.StepExecutionRecord;
import com.example.webtest.execution.engine.service.DefaultDslRunService;
import com.example.webtest.execution.engine.service.DslRunService;
import com.example.webtest.report.engine.DefaultReportEngine;
import com.example.webtest.report.engine.ReportCleanupOptions;
import com.example.webtest.report.engine.ReportCleanupResult;
import com.example.webtest.report.engine.ReportMaintenanceResult;
import com.example.webtest.report.engine.ReportStorageDiagnosticsResult;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public final class CorePlatformApp {
    private CorePlatformApp() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length > 0 && "report-cleanup".equals(args[0])) {
            runReportCleanup(args);
            return;
        }
        if (args.length > 0 && "report-maintenance".equals(args[0])) {
            runReportMaintenance(args);
            return;
        }
        if (args.length > 0 && "report-diagnostics".equals(args[0])) {
            runReportDiagnostics(args);
            return;
        }
        if (args.length > 0 && "dsl-smoke".equals(args[0])) {
            Path dslPath = args.length > 1
                    ? Path.of(args[1])
                    : workspaceRoot().resolve(Path.of("config", "smoke", "core-platform-smoke.yml"));
            runDslSmoke(dslPath);
            return;
        }
        runRawSmoke();
    }

    private static void runReportCleanup(String[] args) {
        Path reportRoot = workspaceRoot().resolve("runs");
        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setKeepLatest(20);
        options.setDryRun(true);

        for (int index = 1; index < args.length; index++) {
            String arg = args[index];
            if ("--help".equals(arg) || "-h".equals(arg)) {
                printReportCleanupUsage();
                return;
            } else if ("--apply".equals(arg)) {
                options.setDryRun(false);
            } else if ("--dry-run".equals(arg)) {
                options.setDryRun(true);
            } else if ("--keep-latest".equals(arg)) {
                options.setKeepLatest(Integer.parseInt(requiredValue(args, ++index, arg)));
            } else if (arg.startsWith("--keep-latest=")) {
                options.setKeepLatest(Integer.parseInt(arg.substring("--keep-latest=".length())));
            } else if ("--no-keep-latest".equals(arg)) {
                options.setKeepLatest(null);
            } else if ("--older-than-days".equals(arg)) {
                options.setDeleteFinishedBefore(daysCutoff(requiredValue(args, ++index, arg)));
            } else if (arg.startsWith("--older-than-days=")) {
                options.setDeleteFinishedBefore(daysCutoff(arg.substring("--older-than-days=".length())));
            } else if ("--status".equals(arg)) {
                addCleanupStatuses(options, requiredValue(args, ++index, arg));
            } else if (arg.startsWith("--status=")) {
                addCleanupStatuses(options, arg.substring("--status=".length()));
            } else if ("--max-total-mb".equals(arg)) {
                options.setMaxTotalBytes(megabytes(requiredValue(args, ++index, arg), arg));
            } else if (arg.startsWith("--max-total-mb=")) {
                options.setMaxTotalBytes(megabytes(arg.substring("--max-total-mb=".length()), "--max-total-mb"));
            } else if ("--prune-artifacts-only".equals(arg)) {
                options.setPruneArtifactsOnly(true);
            } else if ("--prune-unreferenced-files-only".equals(arg)) {
                options.setPruneUnreferencedFilesOnly(true);
            } else if ("--unreferenced-older-than-hours".equals(arg)) {
                options.setUnreferencedFileMinAgeSeconds(hours(requiredValue(args, ++index, arg), arg));
            } else if (arg.startsWith("--unreferenced-older-than-hours=")) {
                options.setUnreferencedFileMinAgeSeconds(hours(
                        arg.substring("--unreferenced-older-than-hours=".length()),
                        "--unreferenced-older-than-hours"));
            } else if ("--unreferenced-older-than-days".equals(arg)) {
                options.setUnreferencedFileMinAgeSeconds(days(requiredValue(args, ++index, arg), arg));
            } else if (arg.startsWith("--unreferenced-older-than-days=")) {
                options.setUnreferencedFileMinAgeSeconds(days(
                        arg.substring("--unreferenced-older-than-days=".length()),
                        "--unreferenced-older-than-days"));
            } else if ("--unreferenced-age-bucket".equals(arg)) {
                addUnreferencedAgeBuckets(options, requiredValue(args, ++index, arg));
            } else if (arg.startsWith("--unreferenced-age-bucket=")) {
                addUnreferencedAgeBuckets(options, arg.substring("--unreferenced-age-bucket=".length()));
            } else if ("--verbose-unreferenced-cleanup".equals(arg)) {
                options.setVerboseUnreferencedCleanupPlan(true);
            } else if ("--dry-run-html".equals(arg)) {
                options.setDryRunHtmlPath(Path.of(requiredValue(args, ++index, arg)));
            } else if (arg.startsWith("--dry-run-html=")) {
                options.setDryRunHtmlPath(Path.of(arg.substring("--dry-run-html=".length())));
            } else if (!arg.startsWith("--")) {
                reportRoot = Path.of(arg);
            } else {
                throw new IllegalArgumentException("Unknown report-cleanup option: " + arg);
            }
        }

        ReportCleanupResult result = new DefaultReportEngine().cleanupReportRuns(reportRoot, options);
        System.out.println("Report cleanup root: " + result.reportRoot());
        System.out.println("Mode: " + (result.dryRun() ? "dry-run" : "apply"));
        if (result.dryRunHtmlPath() != null) {
            System.out.println("Dry-run HTML: " + result.dryRunHtmlPath());
        }
        System.out.println("Scanned runs: " + result.scannedRuns());
        System.out.println("Kept runs: " + result.keptRuns());
        System.out.println("Delete statuses: " + (options.getDeleteStatuses().isEmpty() ? "(none)" : options.getDeleteStatuses()));
        System.out.println("Max total MB: " + (options.getMaxTotalBytes() == null ? "(none)" : options.getMaxTotalBytes() / 1024L / 1024L));
        System.out.println("Prune artifacts only: " + options.isPruneArtifactsOnly());
        System.out.println("Prune unreferenced files only: " + options.isPruneUnreferencedFilesOnly());
        System.out.println("Unreferenced min age seconds: "
                + (options.getUnreferencedFileMinAgeSeconds() == null ? "(none)" : options.getUnreferencedFileMinAgeSeconds()));
        System.out.println("Unreferenced age buckets: "
                + (options.getUnreferencedFileAgeBuckets().isEmpty() ? "(none)" : options.getUnreferencedFileAgeBuckets()));
        System.out.println("Verbose unreferenced cleanup: " + options.isVerboseUnreferencedCleanupPlan());
        System.out.println("Dry-run HTML path: "
                + (options.getDryRunHtmlPath() == null ? "(default)" : options.getDryRunHtmlPath()));
        printUnreferencedCleanupPlan(result.unreferencedCleanupPlan());
        System.out.println((result.dryRun() ? "Would delete" : "Deleted") + " runs: "
                + result.deletedRunDirectories().size());
        for (Path directory : result.deletedRunDirectories()) {
            System.out.println(directory);
        }
        System.out.println((result.dryRun() ? "Would delete" : "Deleted") + " artifacts: "
                + result.deletedArtifactPaths().size());
        for (Path artifact : result.deletedArtifactPaths()) {
            System.out.println(artifact);
        }
        System.out.println((result.dryRun() ? "Would delete" : "Deleted") + " unreferenced files: "
                + result.deletedUnreferencedFilePaths().size());
        System.out.println("Unreferenced file types:");
        for (ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary type : result.deletedUnreferencedFileTypes()) {
            System.out.println("  " + type.type()
                    + " count=" + type.count()
                    + " bytes=" + type.bytes());
        }
        printUnreferencedAgeSummary("Unreferenced file age:", result.deletedUnreferencedFileAgeSummary());
        System.out.println("Unreferenced retention hints:");
        if (result.deletedUnreferencedFileRetentionHints().isEmpty()) {
            System.out.println("  (none)");
        }
        for (ReportCleanupResult.UnreferencedFileRetentionHint hint
                : result.deletedUnreferencedFileRetentionHints()) {
            System.out.println("  " + hint.bucket()
                    + " count=" + hint.count()
                    + " bytes=" + hint.bytes()
                    + " minAgeSeconds=" + hint.minAgeSeconds()
                    + " maxAgeSeconds=" + hint.maxAgeSeconds());
        }
        for (Path file : result.deletedUnreferencedFilePaths()) {
            System.out.println(file);
        }
    }

    private static void printUnreferencedCleanupPlan(ReportCleanupResult.UnreferencedCleanupPlan plan) {
        if (plan == null || (plan.selectedRuns() == 0
                && plan.retainedRuns() == 0
                && plan.scannedUnreferencedFiles() == 0)) {
            return;
        }
        System.out.println("Unreferenced cleanup plan:");
        System.out.println("  selectedRuns=" + plan.selectedRuns()
                + " retainedRuns=" + plan.retainedRuns());
        System.out.println("  scannedFiles=" + plan.scannedUnreferencedFiles()
                + " scannedBytes=" + plan.scannedUnreferencedBytes());
        System.out.println("  selectedFiles=" + plan.selectedUnreferencedFiles()
                + " selectedBytes=" + plan.selectedUnreferencedBytes());
        System.out.println("  retainedFiles=" + plan.retainedUnreferencedFiles()
                + " retainedBytes=" + plan.retainedUnreferencedBytes());
        if (!plan.retentionReasons().isEmpty()) {
            System.out.println("  retainedReasons:");
            for (ReportCleanupResult.UnreferencedCleanupRetentionReason reason : plan.retentionReasons()) {
                System.out.println("    " + reason.reason()
                        + " count=" + reason.count()
                        + " bytes=" + reason.bytes());
            }
        }
        if (!plan.runs().isEmpty()) {
            System.out.println("  runs:");
            for (ReportCleanupResult.UnreferencedCleanupRunPlan run : plan.runs()) {
                System.out.println("    " + run.runId()
                        + " selected=" + run.selectedByCleanupSelectors()
                        + " scannedFiles=" + run.scannedUnreferencedFiles()
                        + " scannedBytes=" + run.scannedUnreferencedBytes()
                        + " selectedFiles=" + run.selectedUnreferencedFiles()
                        + " selectedBytes=" + run.selectedUnreferencedBytes()
                        + " retainedFiles=" + run.retainedUnreferencedFiles()
                        + " retainedBytes=" + run.retainedUnreferencedBytes()
                        + " dir=" + run.directory());
                ReportCleanupResult.UnreferencedCleanupRunSelectorPlan selector = run.selectorPlan();
                if (selector != null) {
                    System.out.println("      selectors:"
                            + " explanation=\"" + selector.explanation() + "\""
                            + " sortedIndex=" + selector.sortedIndex()
                            + " status=" + selector.status()
                            + " finishedAt=" + selector.finishedAt()
                            + " runBytes=" + selector.runBytes()
                            + " configuredKeepLatest="
                            + (selector.configuredKeepLatest() == null
                                    ? "(none)"
                                    : selector.configuredKeepLatest())
                            + " protectedByKeepLatest=" + selector.protectedByKeepLatest()
                            + " selectedByKeepLatest=" + selector.selectedByKeepLatest()
                            + " configuredDeleteFinishedBefore="
                            + (selector.configuredDeleteFinishedBefore() == null
                                    ? "(none)"
                                    : selector.configuredDeleteFinishedBefore())
                            + " selectedByCutoff=" + selector.selectedByCutoff()
                            + " configuredDeleteStatuses="
                            + (selector.configuredDeleteStatuses().isEmpty()
                                    ? "(none)"
                                    : selector.configuredDeleteStatuses())
                            + " selectedByStatus=" + selector.selectedByStatus()
                            + " configuredMaxTotalBytes="
                            + (selector.configuredMaxTotalBytes() == null
                                    ? "(none)"
                                    : selector.configuredMaxTotalBytes())
                            + " quotaEligible="
                            + (selector.quotaEligible() == null ? "(none)" : selector.quotaEligible())
                            + " quotaRetainedBytesBefore="
                            + (selector.quotaRetainedBytesBefore() == null
                                    ? "(none)"
                                    : selector.quotaRetainedBytesBefore())
                            + " quotaRetainedBytesAfter="
                            + (selector.quotaRetainedBytesAfter() == null
                                    ? "(none)"
                                    : selector.quotaRetainedBytesAfter())
                            + " quotaFreedBytes="
                            + (selector.quotaFreedBytes() == null ? "(none)" : selector.quotaFreedBytes())
                            + " selectedByQuota=" + selector.selectedByQuota());
                }
                if (!run.retentionReasons().isEmpty()) {
                    System.out.println("      retainedReasons:");
                    for (ReportCleanupResult.UnreferencedCleanupRetentionReason reason : run.retentionReasons()) {
                        System.out.println("        " + reason.reason()
                                + " count=" + reason.count()
                                + " bytes=" + reason.bytes());
                    }
                }
                if (!run.files().isEmpty()) {
                    System.out.println("      files:");
                    for (ReportCleanupResult.UnreferencedCleanupFilePlan file : run.files()) {
                        System.out.println("        " + file.decision()
                                + " reason=" + file.reason()
                                + " explanation=\"" + file.explanation() + "\""
                                + " ageSeconds=" + file.ageSeconds()
                                + " ageBucket=" + file.ageBucket()
                                + " configuredMinAgeSeconds="
                                + (file.configuredMinAgeSeconds() == null
                                        ? "(none)"
                                        : file.configuredMinAgeSeconds())
                                + " selectedAgeBuckets="
                                + (file.selectedAgeBuckets().isEmpty()
                                        ? "(none)"
                                        : file.selectedAgeBuckets())
                                + " type=" + file.type()
                                + " bytes=" + file.bytes()
                                + " lastModifiedAt=" + file.lastModifiedAt()
                                + " path=" + file.path());
                    }
                }
            }
        }
    }

    private static void printReportCleanupUsage() {
        System.out.println("""
                Usage: report-cleanup [reportRoot] [--keep-latest N|--no-keep-latest] [--older-than-days N] [--status OK|FAILED[,..]] [--max-total-mb N] [--prune-artifacts-only|--prune-unreferenced-files-only] [--unreferenced-older-than-hours N|--unreferenced-older-than-days N] [--unreferenced-age-bucket fresh,recent,stale,old,ancient] [--verbose-unreferenced-cleanup] [--dry-run-html PATH] [--apply|--dry-run]
                Defaults: reportRoot=./runs, keepLatest=20, dry-run.
                """);
    }

    private static void runReportMaintenance(String[] args) {
        Path reportRoot = workspaceRoot().resolve("runs");
        boolean dryRun = true;
        boolean markMissingArtifacts = false;

        for (int index = 1; index < args.length; index++) {
            String arg = args[index];
            if ("--help".equals(arg) || "-h".equals(arg)) {
                printReportMaintenanceUsage();
                return;
            } else if ("--apply".equals(arg)) {
                dryRun = false;
            } else if ("--dry-run".equals(arg)) {
                dryRun = true;
            } else if ("--mark-missing-artifacts".equals(arg)) {
                markMissingArtifacts = true;
            } else if (!arg.startsWith("--")) {
                reportRoot = Path.of(arg);
            } else {
                throw new IllegalArgumentException("Unknown report-maintenance option: " + arg);
            }
        }

        if (!markMissingArtifacts) {
            throw new IllegalArgumentException("No maintenance action selected. Use --mark-missing-artifacts.");
        }

        ReportMaintenanceResult result = new DefaultReportEngine().markMissingArtifactsPruned(reportRoot, dryRun);
        System.out.println("Report maintenance root: " + result.reportRoot());
        System.out.println("Mode: " + (result.dryRun() ? "dry-run" : "apply"));
        System.out.println("Scanned runs: " + result.scannedRuns());
        System.out.println("Updated runs: " + result.updatedRuns());
        System.out.println((result.dryRun() ? "Would mark" : "Marked") + " artifacts: "
                + result.markedArtifactPaths().size());
        for (Path artifact : result.markedArtifactPaths()) {
            System.out.println(artifact);
        }
    }

    private static void printReportMaintenanceUsage() {
        System.out.println("""
                Usage: report-maintenance [reportRoot] --mark-missing-artifacts [--apply|--dry-run]
                Defaults: reportRoot=./runs, dry-run.
                """);
    }

    private static void runReportDiagnostics(String[] args) {
        Path reportRoot = workspaceRoot().resolve("runs");

        for (int index = 1; index < args.length; index++) {
            String arg = args[index];
            if ("--help".equals(arg) || "-h".equals(arg)) {
                printReportDiagnosticsUsage();
                return;
            } else if (!arg.startsWith("--")) {
                reportRoot = Path.of(arg);
            } else {
                throw new IllegalArgumentException("Unknown report-diagnostics option: " + arg);
            }
        }

        ReportStorageDiagnosticsResult result = new DefaultReportEngine().diagnoseReportStorage(reportRoot);
        System.out.println("Report diagnostics root: " + result.reportRoot());
        System.out.println("Scanned runs: " + result.scannedRuns());
        System.out.println("Total run bytes: " + result.totalRunBytes());
        System.out.println("Referenced artifact bytes: " + result.referencedArtifactBytes());
        System.out.println("Unreferenced file bytes: " + result.unreferencedFileBytes());
        System.out.println("Referenced artifacts: " + result.referencedArtifactCount());
        System.out.println("Unreferenced files: " + result.unreferencedFileCount());
        System.out.println("Missing artifacts: " + result.missingArtifactCount());
        System.out.println("Pruned artifacts: " + result.prunedArtifactCount());
        System.out.println("Artifact types:");
        for (ReportStorageDiagnosticsResult.ArtifactTypeSummary type : result.artifactTypes()) {
            System.out.println("  " + type.type()
                    + " count=" + type.count()
                    + " bytes=" + type.bytes()
                    + " missing=" + type.missingCount()
                    + " pruned=" + type.prunedCount());
        }
        System.out.println("Unreferenced file types:");
        for (ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary type : result.unreferencedFileTypes()) {
            System.out.println("  " + type.type()
                    + " count=" + type.count()
                    + " bytes=" + type.bytes());
        }
        printUnreferencedAgeSummary("Unreferenced file age:", result.unreferencedFileAgeSummary());
        printUnreferencedAgeBuckets("Unreferenced age buckets:", result.unreferencedFileAgeBuckets(), "  ");
        System.out.println("Runs:");
        for (ReportStorageDiagnosticsResult.RunStorageSummary run : result.runs()) {
            System.out.println("  " + run.runId()
                    + " status=" + run.status()
                    + " runBytes=" + run.runBytes()
                    + " artifactBytes=" + run.referencedArtifactBytes()
                    + " unreferencedBytes=" + run.unreferencedFileBytes()
                    + " artifacts=" + run.referencedArtifactCount()
                    + " unreferencedFiles=" + run.unreferencedFileCount()
                    + " missing=" + run.missingArtifactCount()
                    + " pruned=" + run.prunedArtifactCount()
                    + " dir=" + run.directory());
            if (!run.unreferencedFileTypes().isEmpty()) {
                System.out.println("    unreferencedTypes:");
                for (ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary type : run.unreferencedFileTypes()) {
                    System.out.println("      " + type.type()
                            + " count=" + type.count()
                            + " bytes=" + type.bytes());
                }
            }
            printUnreferencedAgeSummary("    unreferencedAge:", run.unreferencedFileAgeSummary());
            printUnreferencedAgeBuckets("    unreferencedAgeBuckets:", run.unreferencedFileAgeBuckets(), "      ");
        }
    }

    private static void printUnreferencedAgeSummary(
            String label,
            ReportStorageDiagnosticsResult.UnreferencedFileAgeSummary ageSummary) {
        if (ageSummary == null) {
            System.out.println(label + " (none)");
            return;
        }
        System.out.println(label);
        System.out.println("  oldestLastModifiedAt=" + ageSummary.oldestLastModifiedAt()
                + " oldestAgeSeconds=" + ageSummary.oldestAgeSeconds());
        System.out.println("  newestLastModifiedAt=" + ageSummary.newestLastModifiedAt()
                + " newestAgeSeconds=" + ageSummary.newestAgeSeconds());
    }

    private static void printUnreferencedAgeBuckets(
            String label,
            List<ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary> buckets,
            String indent) {
        if (buckets.isEmpty()) {
            System.out.println(label + " (none)");
            return;
        }
        System.out.println(label);
        for (ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary bucket : buckets) {
            System.out.println(indent + bucket.key()
                    + " label=\"" + bucket.label() + "\""
                    + " minAgeSeconds=" + bucket.minAgeSeconds()
                    + " maxAgeSeconds=" + bucket.maxAgeSeconds()
                    + " count=" + bucket.count()
                    + " bytes=" + bucket.bytes());
        }
    }

    private static void printReportDiagnosticsUsage() {
        System.out.println("""
                Usage: report-diagnostics [reportRoot]
                Defaults: reportRoot=./runs.
                """);
    }

    private static String requiredValue(String[] args, int index, String option) {
        if (index >= args.length) {
            throw new IllegalArgumentException("Missing value for " + option);
        }
        return args[index];
    }

    private static Instant daysCutoff(String value) {
        long days = Long.parseLong(value);
        if (days < 0) {
            throw new IllegalArgumentException("--older-than-days must be greater than or equal to 0");
        }
        return Instant.now().minus(Duration.ofDays(days));
    }

    private static long megabytes(String value, String option) {
        long megabytes = Long.parseLong(value);
        if (megabytes < 0) {
            throw new IllegalArgumentException(option + " must be greater than or equal to 0");
        }
        return megabytes * 1024L * 1024L;
    }

    private static long hours(String value, String option) {
        long hours = nonNegativeLong(value, option);
        return Math.multiplyExact(hours, 60L * 60L);
    }

    private static long days(String value, String option) {
        long days = nonNegativeLong(value, option);
        return Math.multiplyExact(days, 24L * 60L * 60L);
    }

    private static long nonNegativeLong(String value, String option) {
        long parsed = Long.parseLong(value);
        if (parsed < 0) {
            throw new IllegalArgumentException(option + " must be greater than or equal to 0");
        }
        return parsed;
    }

    private static void addUnreferencedAgeBuckets(ReportCleanupOptions options, String value) {
        for (String bucket : value.split(",")) {
            options.addUnreferencedFileAgeBucket(bucket);
        }
    }

    private static void addCleanupStatuses(ReportCleanupOptions options, String value) {
        Set<String> statuses = new LinkedHashSet<>(options.getDeleteStatuses());
        for (String status : value.split(",")) {
            String normalized = status.trim();
            if (!normalized.isBlank()) {
                statuses.add(normalized);
            }
        }
        options.setDeleteStatuses(statuses);
    }

    private static void runRawSmoke() throws Exception {
        CdpClient cdpClient = new DefaultCdpClient();
        BrowserSessionManager sessionManager = new DefaultBrowserSessionManager(cdpClient);
        PageController pageController = new DefaultPageController(cdpClient);

        SessionOptions options = new SessionOptions();
        options.setHeadless(true);
        options.setInitialUrl("about:blank");

        ExecutionSession session = sessionManager.create(options);
        try {
            cdpClient.send("Page.enable", Map.of(), JsonNode.class);

            CountDownLatch loaded = new CountDownLatch(1);
            cdpClient.addEventListener("Page.loadEventFired", (eventName, params) -> loaded.countDown());

            ExecutionContext context = new ExecutionContext("smoke-run");
            pageController.navigate(smokeDataUrl(), context);
            if (!loaded.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out waiting for smoke page load event");
            }

            Path output = workspaceRoot().resolve(Path.of("runs", "smoke", "screenshot.png"));
            Files.createDirectories(output.getParent());
            Files.write(output, pageController.screenshot(context, new ScreenshotOptions()));

            System.out.println("Smoke screenshot: " + output.toAbsolutePath());
            System.out.println("Page title: " + pageController.title(context));
        } finally {
            sessionManager.close(session.getSessionId());
        }
    }

    private static void runDslSmoke(Path dslPath) {
        CdpClient cdpClient = new DefaultCdpClient();
        BrowserSessionManager sessionManager = new DefaultBrowserSessionManager(cdpClient);
        PageController pageController = new DefaultPageController(cdpClient);

        SessionOptions sessionOptions = new SessionOptions();
        sessionOptions.setHeadless(true);
        sessionOptions.setInitialUrl("about:blank");

        ExecutionSession session = sessionManager.create(sessionOptions);
        try {
            DslRunService runService = new DefaultDslRunService(
                    new DefaultDslParser(new DefaultDslValidator()),
                    new DefaultTestOrchestrator(pageController));

            RunOptions runOptions = new RunOptions();
            runOptions.setRunId("dsl-smoke-run");
            runOptions.setOutputDir(workspaceRoot().resolve(Path.of("runs", "dsl-smoke")));

            RunResult result = runService.execute(dslPath, runOptions);
            printRunResult(result);
            if (result.getStatus() != RunStatus.SUCCESS) {
                throw new IllegalStateException("DSL smoke failed: " + result.getStatus());
            }
        } finally {
            sessionManager.close(session.getSessionId());
        }
    }

    private static void printRunResult(RunResult result) {
        System.out.println("DSL smoke run: " + result.getRunId());
        System.out.println("Status: " + result.getStatus());
        System.out.println("Output dir: " + result.getOutputDir().toAbsolutePath());
        if (result.getStepRecords() == null) {
            return;
        }
        for (StepExecutionRecord record : result.getStepRecords()) {
            String artifact = record.getArtifactPath() == null ? "" : " artifact=" + record.getArtifactPath();
            String message = record.getMessage() == null ? "" : " message=" + record.getMessage();
            System.out.println(record.getStepId() + " " + record.getAction() + " " + record.getStatus()
                    + artifact + message);
        }
    }

    private static Path workspaceRoot() {
        Path current = Path.of("").toAbsolutePath();
        while (current != null) {
            if (Files.isRegularFile(current.resolve("00_project_index.md"))) {
                return current;
            }
            current = current.getParent();
        }
        return Path.of("").toAbsolutePath();
    }

    private static String smokeDataUrl() {
        String html = """
                <!doctype html>
                <html>
                  <head><title>Edge Self Test Smoke</title></head>
                  <body>
                    <main>
                      <h1>Edge Self Test Smoke</h1>
                      <p>CDP navigate and screenshot are wired.</p>
                    </main>
                  </body>
                </html>
                """;
        String encoded = Base64.getEncoder().encodeToString(html.getBytes(StandardCharsets.UTF_8));
        return "data:text/html;charset=utf-8;base64," + encoded;
    }
}
