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
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashSet;
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
            } else if (!arg.startsWith("--")) {
                reportRoot = Path.of(arg);
            } else {
                throw new IllegalArgumentException("Unknown report-cleanup option: " + arg);
            }
        }

        ReportCleanupResult result = new DefaultReportEngine().cleanupReportRuns(reportRoot, options);
        System.out.println("Report cleanup root: " + result.reportRoot());
        System.out.println("Mode: " + (result.dryRun() ? "dry-run" : "apply"));
        System.out.println("Scanned runs: " + result.scannedRuns());
        System.out.println("Kept runs: " + result.keptRuns());
        System.out.println("Delete statuses: " + (options.getDeleteStatuses().isEmpty() ? "(none)" : options.getDeleteStatuses()));
        System.out.println("Max total MB: " + (options.getMaxTotalBytes() == null ? "(none)" : options.getMaxTotalBytes() / 1024L / 1024L));
        System.out.println("Prune artifacts only: " + options.isPruneArtifactsOnly());
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
    }

    private static void printReportCleanupUsage() {
        System.out.println("""
                Usage: report-cleanup [reportRoot] [--keep-latest N] [--older-than-days N] [--status OK|FAILED[,..]] [--max-total-mb N] [--prune-artifacts-only] [--apply|--dry-run]
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
