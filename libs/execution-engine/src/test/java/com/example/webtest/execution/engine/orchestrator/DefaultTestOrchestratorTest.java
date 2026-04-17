package com.example.webtest.execution.engine.orchestrator;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.webtest.browser.page.ElementState;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
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
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
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
    void executeStopsOnAssertionFailureByDefault() {
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
        assertEquals(List.of("title", "screenshot"), pageController.calls);
        assertEquals(tempDir.resolve("assert-title-failure.png"), result.getStepRecords().get(0).getArtifactPath());
        assertEquals(1, result.getStepRecords().get(0).getArtifacts().size());
        assertEquals(tempDir.resolve("assert-title-failure.png"), result.getStepRecords().get(0).getArtifacts().get(0).getPath());
    }

    @Test
    void executeSkipsFailureScreenshotWhenReportPolicyDisablesIt() {
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
        assertEquals(1, result.getStepRecords().get(0).getArtifacts().size());
        assertEquals(RunStatus.SUCCESS.name(), result.getStepRecords().get(1).getStatus());
        assertEquals(List.of("title", "screenshot", "reload"), pageController.calls);
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
                targetAssertStep("assert-hidden", ActionType.ASSERT_NOT_VISIBLE, "#hidden", null)));

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
                "findElement:css:#hidden:0"), pageController.calls);
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

    private static final class FakePageController implements PageController {
        private final List<String> calls = new ArrayList<>();
        private String title = "Dashboard";

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
            state.setActionable(!hidden);
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
        }
    }
}
