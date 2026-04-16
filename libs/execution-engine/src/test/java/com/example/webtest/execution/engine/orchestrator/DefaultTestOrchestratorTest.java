package com.example.webtest.execution.engine.orchestrator;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
import com.example.webtest.dsl.parser.DefaultDslParser;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.dsl.model.TestCaseDefinition;
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
        assertEquals(List.of("navigate:https://example.test/app/dashboard", "title", "screenshot"), pageController.calls);
        assertEquals(3, result.getStepRecords().size());
        assertArrayEquals(new byte[] {1, 2, 3}, Files.readAllBytes(tempDir.resolve("shot.png")));
        assertEquals(tempDir.resolve("shot.png"), result.getStepRecords().get(2).getArtifactPath());
    }

    @Test
    void executeStopsOnAssertionFailureByDefault() {
        FakePageController pageController = new FakePageController();
        pageController.title = "Actual";
        TestCaseDefinition definition = new TestCaseDefinition();
        definition.setSteps(List.of(
                step("assert-title", ActionType.ASSERT_TITLE, null, "Expected"),
                step("refresh", ActionType.REFRESH, null, null)));

        RunResult result = new DefaultTestOrchestrator(pageController).execute(definition, new RunOptions());

        assertEquals(RunStatus.FAILED, result.getStatus());
        assertEquals(1, result.getStepRecords().size());
        assertEquals(RunStatus.FAILED.name(), result.getStepRecords().get(0).getStatus());
        assertTrue(result.getStepRecords().get(0).getMessage().contains("Expected title"));
        assertEquals(List.of("title"), pageController.calls);
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

        RunResult result = service.execute(dslFile, new RunOptions());

        assertEquals(RunStatus.SUCCESS, result.getStatus());
        assertEquals(List.of("navigate:https://example.test"), pageController.calls);
    }

    private StepDefinition step(String id, ActionType action, String url, String expected) {
        StepDefinition step = new StepDefinition();
        step.setId(id);
        step.setAction(action);
        step.setUrl(url);
        step.setExpected(expected);
        return step;
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
    }
}
