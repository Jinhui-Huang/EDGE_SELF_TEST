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
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public final class CorePlatformApp {
    private CorePlatformApp() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length > 0 && "dsl-smoke".equals(args[0])) {
            Path dslPath = args.length > 1
                    ? Path.of(args[1])
                    : workspaceRoot().resolve(Path.of("config", "smoke", "core-platform-smoke.yml"));
            runDslSmoke(dslPath);
            return;
        }
        runRawSmoke();
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
