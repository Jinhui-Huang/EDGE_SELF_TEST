package com.example.webtest.execution.engine.orchestrator;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.webtest.artifact.model.ArtifactRef;
import com.example.webtest.browser.page.ElementState;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
import com.example.webtest.browser.observer.ConsoleEvent;
import com.example.webtest.browser.observer.NetworkEvent;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.FailurePolicy;
import com.example.webtest.dsl.model.ReportPolicy;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.dsl.model.TargetDefinition;
import com.example.webtest.dsl.model.TestCaseDefinition;
import com.example.webtest.dsl.parser.DefaultDslParser;
import com.example.webtest.dsl.validator.DefaultDslValidator;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.execution.engine.result.RunOptions;
import com.example.webtest.execution.engine.result.RunResult;
import com.example.webtest.execution.engine.result.RunStatus;
import com.example.webtest.execution.engine.service.DefaultDslRunService;
import com.example.webtest.report.engine.DefaultReportEngine;
import com.example.webtest.report.model.ReportStepRecord;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class DefaultTestOrchestratorTest {
    @TempDir
    Path tempDir;

    @Test
    void executeRunsSupportedStepsAndWritesScreenshot() throws IOException {
        FakePageController pageController = new FakePageController();
        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setBaseUrl("https://example.test/app/");
        definition.setSteps(List.of(
                step("open", ActionType.GOTO, "dashboard", null),
                step("check-title", ActionType.ASSERT_TITLE, null, "Dashboard"),
                step("shot", ActionType.SCREENSHOT, null, null)));
        RunOptions options = new RunOptions();
        options.setRunId("run-1");
        options.setOutputDir(tempDir);

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, options);

        assertEquals(RunStatus.SUCCESS, result.getStatus());
        assertNotNull(result.getStartedAt());
        assertNotNull(result.getFinishedAt());
        assertTrue(!result.getFinishedAt().isBefore(result.getStartedAt()));
        assertEquals(tempDir.resolve("report.json"), result.getReportPath());
        assertTrue(Files.isRegularFile(result.getReportPath()));
        assertEquals(List.of("navigate:https://example.test/app/dashboard", "title", "screenshot"), pageController.calls);
        assertEquals(3, result.getStepRecords().size());
        assertArrayEquals(new byte[] {1, 2, 3}, Files.readAllBytes(tempDir.resolve("shot.png")));
        assertEquals(tempDir.resolve("shot.png"), result.getStepRecords().get(2).getArtifactPath());
        assertEquals(1, result.getStepRecords().get(2).getArtifacts().size());
        assertEquals("screenshot", result.getStepRecords().get(2).getArtifacts().get(0).getType());
        assertEquals(tempDir.resolve("shot.png"), result.getStepRecords().get(2).getArtifacts().get(0).getPath());
    }

    @Test
    void executeCleansNetworkBodySpoolsAfterRun() {
        FakePageController pageController = new FakePageController();
        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setSteps(List.of(step("open", ActionType.GOTO, "https://example.test", null)));

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, tempRunOptions());

        assertEquals(RunStatus.SUCCESS, result.getStatus());
        assertEquals(1, pageController.cleanupNetworkBodySpoolsCalls);
    }

    @Test
    void executeAppliesReportRetentionPolicyAfterReportGeneration() throws IOException {
        writeExistingReportRun("old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        FakePageController pageController = new FakePageController();
        ReportPolicy reportPolicy = new ReportPolicy();
        reportPolicy.setRetentionCleanupOnRun(true);
        reportPolicy.setRetentionKeepLatest(1);

        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setReportPolicy(reportPolicy);
        definition.setSteps(List.of(step("open", ActionType.GOTO, "https://example.test", null)));

        RunOptions options = new RunOptions();
        options.setRunId("new-run");
        options.setOutputDir(tempDir.resolve("new-run"));

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, options);

        assertEquals(RunStatus.SUCCESS, result.getStatus());
        assertTrue(Files.isDirectory(tempDir.resolve("new-run")));
        assertTrue(!Files.exists(tempDir.resolve("old-run")));
        assertTrue(Files.readString(tempDir.resolve("index.html")).contains("<td>new-run</td>"));
        assertTrue(!Files.readString(tempDir.resolve("index.html")).contains("<td>old-run</td>"));
    }

    @Test
    void executeAppliesReportRetentionStatusPolicyAfterReportGeneration() throws IOException {
        writeExistingReportRun("old-failed-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z", "FAILED");
        writeExistingReportRun("old-ok-run", "2026-04-17T00:01:00Z", "2026-04-17T00:01:01Z", "SUCCESS");
        FakePageController pageController = new FakePageController();
        ReportPolicy reportPolicy = new ReportPolicy();
        reportPolicy.setRetentionCleanupOnRun(true);
        reportPolicy.setRetentionDeleteStatuses(List.of("FAILED"));

        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setReportPolicy(reportPolicy);
        definition.setSteps(List.of(step("open", ActionType.GOTO, "https://example.test", null)));

        RunOptions options = new RunOptions();
        options.setRunId("new-run");
        options.setOutputDir(tempDir.resolve("new-run"));

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, options);

        assertEquals(RunStatus.SUCCESS, result.getStatus());
        assertTrue(!Files.exists(tempDir.resolve("old-failed-run")));
        assertTrue(Files.isDirectory(tempDir.resolve("old-ok-run")));
        assertTrue(Files.isDirectory(tempDir.resolve("new-run")));
        String index = Files.readString(tempDir.resolve("index.html"));
        assertTrue(!index.contains("<td>old-failed-run</td>"));
        assertTrue(index.contains("<td>old-ok-run</td>"));
        assertTrue(index.contains("<td>new-run</td>"));
    }

    @Test
    void executeAppliesReportRetentionArtifactPrunePolicyAfterReportGeneration() throws IOException {
        writeExistingReportRunWithArtifact("old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        FakePageController pageController = new FakePageController();
        ReportPolicy reportPolicy = new ReportPolicy();
        reportPolicy.setRetentionCleanupOnRun(true);
        reportPolicy.setRetentionKeepLatest(1);
        reportPolicy.setRetentionPruneArtifactsOnly(true);

        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setReportPolicy(reportPolicy);
        definition.setSteps(List.of(step("open", ActionType.GOTO, "https://example.test", null)));

        RunOptions options = new RunOptions();
        options.setRunId("new-run");
        options.setOutputDir(tempDir.resolve("new-run"));

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, options);

        assertEquals(RunStatus.SUCCESS, result.getStatus());
        assertTrue(Files.isDirectory(tempDir.resolve("old-run")));
        assertTrue(Files.isRegularFile(tempDir.resolve("old-run").resolve("report.json")));
        assertTrue(!Files.exists(tempDir.resolve("old-run").resolve("artifact.txt")));
        String index = Files.readString(tempDir.resolve("index.html"));
        assertTrue(index.contains("<td>old-run</td>"));
        assertTrue(index.contains("<td>new-run</td>"));
    }

    @Test
    void executeStopsOnAssertionFailureByDefault() throws IOException {
        FakePageController pageController = new FakePageController();
        pageController.title = "Actual";
        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setSteps(List.of(
                step("assert-title", ActionType.ASSERT_TITLE, null, "Expected"),
                step("refresh", ActionType.REFRESH, null, null)));
        RunOptions options = new RunOptions();
        options.setOutputDir(tempDir);

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, options);

        assertEquals(RunStatus.FAILED, result.getStatus());
        assertEquals(1, result.getStepRecords().size());
        assertEquals(RunStatus.FAILED.name(), result.getStepRecords().get(0).getStatus());
        assertTrue(result.getStepRecords().get(0).getMessage().contains("Expected title"));
        assertEquals(List.of("title", "screenshot", "getHtml"), pageController.calls);
        assertEquals(tempDir.resolve("assert-title-failure.png"), result.getStepRecords().get(0).getArtifactPath());
        assertEquals(4, result.getStepRecords().get(0).getArtifacts().size());
        assertEquals(tempDir.resolve("assert-title-failure.png"), result.getStepRecords().get(0).getArtifacts().get(0).getPath());
        assertEquals("dom", result.getStepRecords().get(0).getArtifacts().get(1).getType());
        assertEquals(tempDir.resolve("assert-title-failure-dom.html"), result.getStepRecords().get(0).getArtifacts().get(1).getPath());
        assertEquals("console", result.getStepRecords().get(0).getArtifacts().get(2).getType());
        assertEquals(tempDir.resolve("assert-title-failure-console.json"), result.getStepRecords().get(0).getArtifacts().get(2).getPath());
        assertEquals("network", result.getStepRecords().get(0).getArtifacts().get(3).getType());
        assertEquals(tempDir.resolve("assert-title-failure-network.json"), result.getStepRecords().get(0).getArtifacts().get(3).getPath());
        assertEquals("<html></html>", Files.readString(tempDir.resolve("assert-title-failure-dom.html")));
        assertTrue(Files.readString(tempDir.resolve("assert-title-failure-console.json")).contains("[]"));
        assertTrue(Files.readString(tempDir.resolve("assert-title-failure-network.json")).contains("[]"));
    }

    @Test
    void executeSkipsFailureScreenshotButKeepsDomWhenReportPolicyDisablesScreenshotOnly() {
        FakePageController pageController = new FakePageController();
        pageController.title = "Actual";
        ReportPolicy reportPolicy = new ReportPolicy();
        reportPolicy.setScreenshotOnFailure(false);
        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setReportPolicy(reportPolicy);
        definition.setSteps(List.of(step("assert-title", ActionType.ASSERT_TITLE, null, "Expected")));
        RunOptions options = new RunOptions();
        options.setOutputDir(tempDir);

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, options);

        assertEquals(RunStatus.FAILED, result.getStatus());
        assertEquals(List.of("title", "getHtml"), pageController.calls);
        assertEquals(tempDir.resolve("assert-title-failure-dom.html"), result.getStepRecords().get(0).getArtifactPath());
        assertEquals(3, result.getStepRecords().get(0).getArtifacts().size());
        assertEquals("dom", result.getStepRecords().get(0).getArtifacts().get(0).getType());
        assertEquals("console", result.getStepRecords().get(0).getArtifacts().get(1).getType());
        assertEquals("network", result.getStepRecords().get(0).getArtifacts().get(2).getType());
    }

    @Test
    void executeSkipsFailureArtifactsWhenReportPolicyDisablesScreenshotAndDom() {
        FakePageController pageController = new FakePageController();
        pageController.title = "Actual";
        ReportPolicy reportPolicy = new ReportPolicy();
        reportPolicy.setScreenshotOnFailure(false);
        reportPolicy.setSaveDomOnFailure(false);
        reportPolicy.setSaveConsoleOnFailure(false);
        reportPolicy.setSaveNetworkOnFailure(false);
        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setReportPolicy(reportPolicy);
        definition.setSteps(List.of(step("assert-title", ActionType.ASSERT_TITLE, null, "Expected")));
        RunOptions options = new RunOptions();
        options.setOutputDir(tempDir);

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, options);

        assertEquals(RunStatus.FAILED, result.getStatus());
        assertEquals(List.of("title"), pageController.calls);
        assertNull(result.getStepRecords().get(0).getArtifactPath());
        assertTrue(result.getStepRecords().get(0).getArtifacts().isEmpty());
    }

    @Test
    void executeStepFailurePolicyCanCaptureScreenshotAndContinue() {
        FakePageController pageController = new FakePageController();
        pageController.title = "Actual";
        ReportPolicy reportPolicy = new ReportPolicy();
        reportPolicy.setScreenshotOnFailure(false);
        StepDefinition failingStep = step("assert-title", ActionType.ASSERT_TITLE, null, "Expected");
        failingStep.setOnFailure(FailurePolicy.SCREENSHOT_AND_CONTINUE);
        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setReportPolicy(reportPolicy);
        definition.setSteps(List.of(
                failingStep,
                step("refresh", ActionType.REFRESH, null, null)));
        RunOptions options = new RunOptions();
        options.setOutputDir(tempDir);

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, options);

        assertEquals(RunStatus.FAILED, result.getStatus());
        assertEquals(2, result.getStepRecords().size());
        assertEquals(RunStatus.FAILED.name(), result.getStepRecords().get(0).getStatus());
        assertEquals(tempDir.resolve("assert-title-failure.png"), result.getStepRecords().get(0).getArtifactPath());
        assertEquals(4, result.getStepRecords().get(0).getArtifacts().size());
        assertEquals(RunStatus.SUCCESS.name(), result.getStepRecords().get(1).getStatus());
        assertEquals(List.of("title", "screenshot", "getHtml", "reload"), pageController.calls);
    }

    @Test
    void executeCapturesOptInBeforeAndAfterStepArtifacts() {
        FakePageController pageController = new FakePageController();
        ReportPolicy reportPolicy = new ReportPolicy();
        reportPolicy.setScreenshotBeforeStep(true);
        reportPolicy.setSaveDomBeforeStep(true);
        reportPolicy.setScreenshotAfterStep(true);
        reportPolicy.setSaveDomAfterStep(true);
        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setReportPolicy(reportPolicy);
        definition.setSteps(List.of(step("open", ActionType.GOTO, "https://example.test", null)));
        RunOptions options = new RunOptions();
        options.setOutputDir(tempDir);

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, options);

        assertEquals(RunStatus.SUCCESS, result.getStatus());
        assertEquals(List.of(
                "screenshot",
                "getHtml",
                "navigate:https://example.test",
                "screenshot",
                "getHtml"), pageController.calls);
        assertEquals(4, result.getStepRecords().get(0).getArtifacts().size());
        assertEquals(tempDir.resolve("open-before.png"), result.getStepRecords().get(0).getArtifacts().get(0).getPath());
        assertEquals(tempDir.resolve("open-before-dom.html"), result.getStepRecords().get(0).getArtifacts().get(1).getPath());
        assertEquals(tempDir.resolve("open-after.png"), result.getStepRecords().get(0).getArtifacts().get(2).getPath());
        assertEquals(tempDir.resolve("open-after-dom.html"), result.getStepRecords().get(0).getArtifacts().get(3).getPath());
        assertTrue(Files.isRegularFile(tempDir.resolve("open-before.png")));
        assertTrue(Files.isRegularFile(tempDir.resolve("open-before-dom.html")));
        assertTrue(Files.isRegularFile(tempDir.resolve("open-after.png")));
        assertTrue(Files.isRegularFile(tempDir.resolve("open-after-dom.html")));
    }

    @Test
    void executeRunsAfterStepArtifactHookWhenStepFails() {
        FakePageController pageController = new FakePageController();
        pageController.title = "Actual";
        ReportPolicy reportPolicy = new ReportPolicy();
        reportPolicy.setScreenshotOnFailure(false);
        reportPolicy.setSaveDomOnFailure(false);
        reportPolicy.setSaveConsoleOnFailure(false);
        reportPolicy.setSaveNetworkOnFailure(false);
        reportPolicy.setSaveDomAfterStep(true);
        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setReportPolicy(reportPolicy);
        definition.setSteps(List.of(step("assert-title", ActionType.ASSERT_TITLE, null, "Expected")));
        RunOptions options = new RunOptions();
        options.setOutputDir(tempDir);

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, options);

        assertEquals(RunStatus.FAILED, result.getStatus());
        assertEquals(List.of("title", "getHtml"), pageController.calls);
        assertEquals(1, result.getStepRecords().get(0).getArtifacts().size());
        assertEquals("dom", result.getStepRecords().get(0).getArtifacts().get(0).getType());
        assertEquals(tempDir.resolve("assert-title-after-dom.html"), result.getStepRecords().get(0).getArtifactPath());
    }

    @Test
    void executeCapturesOptInAfterStepConsoleAndNetworkDeltas() throws IOException {
        FakePageController pageController = new FakePageController();
        pageController.seedPreStepEvents();
        ReportPolicy reportPolicy = new ReportPolicy();
        reportPolicy.setSaveConsoleOnFailure(false);
        reportPolicy.setSaveNetworkOnFailure(false);
        reportPolicy.setSaveConsoleAfterStep(true);
        reportPolicy.setSaveNetworkAfterStep(true);
        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setReportPolicy(reportPolicy);
        definition.setSteps(List.of(targetStep("fill-search", ActionType.FILL, "#search", "codex")));
        RunOptions options = new RunOptions();
        options.setOutputDir(tempDir);

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, options);

        assertEquals(RunStatus.SUCCESS, result.getStatus());
        assertEquals(2, result.getStepRecords().get(0).getArtifacts().size());
        assertEquals("console", result.getStepRecords().get(0).getArtifacts().get(0).getType());
        assertEquals("network", result.getStepRecords().get(0).getArtifacts().get(1).getType());
        String consoleJson = Files.readString(tempDir.resolve("fill-search-after-console.json"));
        String networkJson = Files.readString(tempDir.resolve("fill-search-after-network.json"));
        assertTrue(consoleJson.contains("\"message\":\"filled #search\""));
        assertTrue(networkJson.contains("\"url\":\"https://example.test/fill\""));
        assertTrue(!consoleJson.contains("before run"));
        assertTrue(!networkJson.contains("https://example.test/before"));
    }

    @Test
    void dslRunServiceParsesFileBeforeExecuting() throws IOException {
        Path dslFile = tempDir.resolve("case.json");
        Files.writeString(dslFile, """
                {
                  "id": "parsed-case",
                  "steps": [
                    {
                      "id": "open",
                      "action": "goto",
                      "url": "https://example.test"
                    }
                  ]
                }
                """);
        FakePageController pageController = new FakePageController();
        DefaultDslRunService service = new DefaultDslRunService(
                new DefaultDslParser(new DefaultDslValidator()),
                new DefaultTestOrchestrator(pageController));

        RunResult result = service.execute(dslFile, tempRunOptions());

        assertEquals(RunStatus.SUCCESS, result.getStatus());
        assertEquals(List.of("navigate:https://example.test"), pageController.calls);
    }

    @Test
    void executeRoutesClickAndFillThroughActionEngine() {
        FakePageController pageController = new FakePageController();
        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setSteps(List.of(
                targetStep("fill-search", ActionType.FILL, "#search", "codex"),
                targetStep("click-submit", ActionType.CLICK, "#submit", null)));

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, tempRunOptions());

        assertEquals(RunStatus.SUCCESS, result.getStatus());
        assertEquals(List.of(
                "findElement:css:#search:0",
                "findElement:css:#search:0",
                "fillElement:css:#search:0=codex",
                "findElement:css:#submit:0",
                "findElement:css:#submit:0",
                "clickElement:css:#submit:0"), pageController.calls);
    }

    @Test
    void executeRoutesExplicitWaitsThroughActionEngine() {
        FakePageController pageController = new FakePageController();
        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setSteps(List.of(
                targetStep("wait-search", ActionType.WAIT_FOR_ELEMENT, "#search", null),
                targetStep("wait-submit", ActionType.WAIT_FOR_VISIBLE, "#submit", null),
                targetStep("wait-hidden", ActionType.WAIT_FOR_HIDDEN, "#hidden", null),
                waitUrlStep("wait-url", "https://example.test/app/dashboard")));

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, tempRunOptions());

        assertEquals(RunStatus.SUCCESS, result.getStatus());
        assertEquals(List.of(
                "findElement:css:#search:0",
                "findElement:css:#submit:0",
                "findElement:css:#hidden:0",
                "currentUrl"), pageController.calls);
    }

    @Test
    void executeRoutesElementAssertionsThroughAssertionEngine() {
        FakePageController pageController = new FakePageController();
        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setSteps(List.of(
                targetAssertStep("assert-text", ActionType.ASSERT_TEXT, "#headline", "Hello"),
                targetAssertStep("assert-value", ActionType.ASSERT_VALUE, "#search", "codex"),
                attrAssertStep("assert-attr", "#search", "aria-label", "Search"),
                targetAssertStep("assert-visible", ActionType.ASSERT_VISIBLE, "#headline", null),
                targetAssertStep("assert-hidden", ActionType.ASSERT_NOT_VISIBLE, "#hidden", null),
                targetAssertStep("assert-enabled", ActionType.ASSERT_ENABLED, "#search", null),
                targetAssertStep("assert-disabled", ActionType.ASSERT_DISABLED, "#disabled", null)));

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, tempRunOptions());

        assertEquals(RunStatus.SUCCESS, result.getStatus());
        assertEquals(List.of(
                "findElement:css:#headline:0",
                "elementText:css:#headline:0",
                "findElement:css:#search:0",
                "elementValue:css:#search:0",
                "findElement:css:#search:0",
                "elementAttribute:css:#search:0:aria-label",
                "findElement:css:#headline:0",
                "findElement:css:#hidden:0",
                "findElement:css:#search:0",
                "findElement:css:#disabled:0"), pageController.calls);
    }

    private StepDefinition step(String id, ActionType action, String url, String expected) {
        StepDefinition step = new StepDefinition();
        step.setId(id);
        step.setAction(action);
        step.setUrl(url);
        step.setExpected(expected);
        return step;
    }

    private StepDefinition targetStep(String id, ActionType action, String selector, Object value) {
        TargetDefinition target = new TargetDefinition();
        target.setBy("css");
        target.setValue(selector);
        StepDefinition step = new StepDefinition();
        step.setId(id);
        step.setAction(action);
        step.setTarget(target);
        step.setValue(value);
        return step;
    }

    private StepDefinition waitUrlStep(String id, String expectedUrl) {
        StepDefinition step = new StepDefinition();
        step.setId(id);
        step.setAction(ActionType.WAIT_FOR_URL);
        step.setExpected(expectedUrl);
        return step;
    }

    private StepDefinition targetAssertStep(String id, ActionType action, String selector, String expected) {
        StepDefinition step = targetStep(id, action, selector, null);
        step.setExpected(expected);
        return step;
    }

    private StepDefinition attrAssertStep(String id, String selector, String attributeName, String expected) {
        StepDefinition step = targetAssertStep(id, ActionType.ASSERT_ATTR, selector, expected);
        step.setValue(attributeName);
        return step;
    }

    private RunOptions tempRunOptions() {
        RunOptions options = new RunOptions();
        options.setOutputDir(tempDir);
        return options;
    }

    private void writeExistingReportRun(String runId, String startedAt, String finishedAt) {
        writeExistingReportRun(runId, startedAt, finishedAt, "SUCCESS");
    }

    private void writeExistingReportRun(String runId, String startedAt, String finishedAt, String status) {
        ReportStepRecord step = new ReportStepRecord();
        step.setStepId(runId + "-step");
        step.setAction("ASSERT_TITLE");
        step.setStatus(status);
        step.setStartedAt(Instant.parse(startedAt));
        step.setFinishedAt(Instant.parse(finishedAt));
        new DefaultReportEngine().generateRunReport(
                new ExecutionContext(runId),
                tempDir.resolve(runId),
                Instant.parse(startedAt),
                Instant.parse(finishedAt),
                List.of(step));
    }

    private void writeExistingReportRunWithArtifact(String runId, String startedAt, String finishedAt)
            throws IOException {
        Path runDir = tempDir.resolve(runId);
        Path artifactPath = runDir.resolve("artifact.txt");
        Files.createDirectories(runDir);
        Files.writeString(artifactPath, "artifact");

        ArtifactRef artifact = new ArtifactRef();
        artifact.setType("text");
        artifact.setPath(artifactPath);
        artifact.setContentType("text/plain");
        artifact.setCreatedAt(Instant.parse(finishedAt));

        ReportStepRecord step = new ReportStepRecord();
        step.setStepId(runId + "-step");
        step.setAction("ASSERT_TITLE");
        step.setStatus("SUCCESS");
        step.setStartedAt(Instant.parse(startedAt));
        step.setFinishedAt(Instant.parse(finishedAt));
        step.setArtifactPath(artifactPath);
        step.setArtifacts(List.of(artifact));

        new DefaultReportEngine().generateRunReport(
                new ExecutionContext(runId),
                runDir,
                Instant.parse(startedAt),
                Instant.parse(finishedAt),
                List.of(step));
    }

    private static final class FakePageController implements PageController {
        private final List<String> calls = new ArrayList<>();
        private final List<ConsoleEvent> consoleEvents = new ArrayList<>();
        private final List<NetworkEvent> networkEvents = new ArrayList<>();
        private int cleanupNetworkBodySpoolsCalls;
        private String title = "Dashboard";

        @Override
        public void startConsoleCapture(ExecutionContext context) {
        }

        @Override
        public List<ConsoleEvent> consoleEvents(ExecutionContext context) {
            return new ArrayList<>(consoleEvents);
        }

        @Override
        public void startNetworkCapture(ExecutionContext context) {
        }

        private void seedPreStepEvents() {
            ConsoleEvent consoleEvent = new ConsoleEvent();
            consoleEvent.setTime(Instant.parse("2026-04-17T00:00:00Z"));
            consoleEvent.setLevel("info");
            consoleEvent.setMessage("before run");
            consoleEvents.add(consoleEvent);

            NetworkEvent event = new NetworkEvent();
            event.setTime(Instant.parse("2026-04-17T00:00:00Z"));
            event.setEvent("request");
            event.setRequestId("before");
            event.setUrl("https://example.test/before");
            event.setMethod("GET");
            networkEvents.add(event);
        }

        @Override
        public List<NetworkEvent> networkEvents(ExecutionContext context) {
            return new ArrayList<>(networkEvents);
        }

        @Override
        public void cleanupNetworkBodySpools(ExecutionContext context) {
            cleanupNetworkBodySpoolsCalls++;
        }

        @Override
        public void navigate(String url, ExecutionContext context) {
            calls.add("navigate:" + url);
        }

        @Override
        public void reload(ExecutionContext context) {
            calls.add("reload");
        }

        @Override
        public String currentUrl(ExecutionContext context) {
            calls.add("currentUrl");
            return "https://example.test/app/dashboard";
        }

        @Override
        public String title(ExecutionContext context) {
            calls.add("title");
            return title;
        }

        @Override
        public byte[] screenshot(ExecutionContext context, ScreenshotOptions options) {
            calls.add("screenshot");
            return new byte[] {1, 2, 3};
        }

        @Override
        public String getHtml(ExecutionContext context) {
            calls.add("getHtml");
            return "<html></html>";
        }

        @Override
        public ElementState findElement(String by, String value, Integer index, ExecutionContext context) {
            calls.add("findElement:" + by + ":" + value + ":" + index);
            ElementState state = new ElementState();
            boolean hidden = "#hidden".equals(value);
            state.setFound(!hidden);
            state.setCount(hidden ? 0 : 1);
            state.setVisible(!hidden);
            state.setEnabled(!"#disabled".equals(value));
            state.setActionable(!hidden && state.isEnabled());
            return state;
        }

        @Override
        public String elementText(String by, String value, Integer index, ExecutionContext context) {
            calls.add("elementText:" + by + ":" + value + ":" + index);
            return "Hello";
        }

        @Override
        public String elementValue(String by, String value, Integer index, ExecutionContext context) {
            calls.add("elementValue:" + by + ":" + value + ":" + index);
            return "codex";
        }

        @Override
        public String elementAttribute(
                String by, String value, Integer index, String attributeName, ExecutionContext context) {
            calls.add("elementAttribute:" + by + ":" + value + ":" + index + ":" + attributeName);
            return "Search";
        }

        @Override
        public void clickElement(String by, String value, Integer index, ExecutionContext context) {
            calls.add("clickElement:" + by + ":" + value + ":" + index);
        }

        @Override
        public void fillElement(String by, String value, Integer index, String text, ExecutionContext context) {
            calls.add("fillElement:" + by + ":" + value + ":" + index + "=" + text);
            ConsoleEvent consoleEvent = new ConsoleEvent();
            consoleEvent.setTime(Instant.parse("2026-04-17T00:00:01Z"));
            consoleEvent.setLevel("log");
            consoleEvent.setMessage("filled " + value);
            consoleEvents.add(consoleEvent);

            NetworkEvent networkEvent = new NetworkEvent();
            networkEvent.setTime(Instant.parse("2026-04-17T00:00:01Z"));
            networkEvent.setEvent("request");
            networkEvent.setRequestId("fill");
            networkEvent.setUrl("https://example.test/fill");
            networkEvent.setMethod("POST");
            networkEvents.add(networkEvent);
        }
    }
}
