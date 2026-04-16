package com.example.webtest.execution.engine.orchestrator;

import com.example.webtest.action.executor.ActionExecutor;
import com.example.webtest.action.executor.DefaultActionExecutor;
import com.example.webtest.action.handler.ClickActionHandler;
import com.example.webtest.action.handler.DefaultBrowserInteractionService;
import com.example.webtest.action.handler.FillActionHandler;
import com.example.webtest.action.handler.WaitActionHandler;
import com.example.webtest.action.result.StepResult;
import com.example.webtest.assertion.engine.AssertionEngine;
import com.example.webtest.assertion.engine.DefaultAssertionEngine;
import com.example.webtest.assertion.handler.AssertTitleHandler;
import com.example.webtest.assertion.handler.AssertUrlHandler;
import com.example.webtest.assertion.model.AssertionResult;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.common.ids.Ids;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.dsl.model.TestCaseDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.execution.engine.result.RunOptions;
import com.example.webtest.execution.engine.result.RunResult;
import com.example.webtest.execution.engine.result.RunStatus;
import com.example.webtest.execution.engine.result.StepExecutionRecord;
import com.example.webtest.locator.resolver.DefaultElementResolver;
import com.example.webtest.locator.resolver.ElementResolver;
import com.example.webtest.wait.engine.DefaultWaitEngine;
import com.example.webtest.wait.engine.WaitEngine;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class DefaultTestOrchestrator implements TestOrchestrator {
    private final PageController pageController;
    private final ActionExecutor actionExecutor;
    private final AssertionEngine assertionEngine;

    public DefaultTestOrchestrator(PageController pageController) {
        this.pageController = Objects.requireNonNull(pageController, "pageController must not be null");
        ElementResolver elementResolver = new DefaultElementResolver(pageController);
        WaitEngine waitEngine = new DefaultWaitEngine(elementResolver, pageController);
        DefaultBrowserInteractionService browserInteractionService = new DefaultBrowserInteractionService(pageController);
        this.actionExecutor = new DefaultActionExecutor(List.of(
                new ClickActionHandler(elementResolver, browserInteractionService, waitEngine),
                new FillActionHandler(elementResolver, browserInteractionService, waitEngine),
                new WaitActionHandler(waitEngine)));
        this.assertionEngine = new DefaultAssertionEngine(List.of(
                new AssertTitleHandler(pageController),
                new AssertUrlHandler(pageController)));
    }

    public DefaultTestOrchestrator(PageController pageController, ActionExecutor actionExecutor) {
        this(pageController, actionExecutor, new DefaultAssertionEngine(List.of(
                new AssertTitleHandler(pageController),
                new AssertUrlHandler(pageController))));
    }

    public DefaultTestOrchestrator(
            PageController pageController,
            ActionExecutor actionExecutor,
            AssertionEngine assertionEngine) {
        this.pageController = Objects.requireNonNull(pageController, "pageController must not be null");
        this.actionExecutor = Objects.requireNonNull(actionExecutor, "actionExecutor must not be null");
        this.assertionEngine = Objects.requireNonNull(assertionEngine, "assertionEngine must not be null");
    }

    @Override
    public RunResult execute(TestCaseDefinition definition, RunOptions options) {
        Objects.requireNonNull(definition, "definition must not be null");
        RunOptions safeOptions = options == null ? new RunOptions() : options;
        String runId = safeOptions.getRunId() == null ? Ids.uuid() : safeOptions.getRunId();
        Path outputDir = safeOptions.getOutputDir() == null
                ? Path.of("runs", runId)
                : safeOptions.getOutputDir();

        ExecutionContext context = new ExecutionContext(runId);
        if (definition.getVars() != null) {
            definition.getVars().forEach(context::setVariable);
        }

        List<StepExecutionRecord> records = new ArrayList<>();
        boolean failed = false;

        failed = executeSteps(definition.getBeforeAll(), definition, context, outputDir, safeOptions, records, false);
        if (!failed || !safeOptions.isStopOnFailure()) {
            failed = executeSteps(definition.getSteps(), definition, context, outputDir, safeOptions, records, true) || failed;
        }
        failed = executeSteps(definition.getAfterAll(), definition, context, outputDir, safeOptions, records, false) || failed;

        RunResult result = new RunResult();
        result.setRunId(runId);
        result.setStatus(failed ? RunStatus.FAILED : RunStatus.SUCCESS);
        result.setOutputDir(outputDir);
        result.setStepRecords(records);
        return result;
    }

    private boolean executeSteps(
            List<StepDefinition> steps,
            TestCaseDefinition definition,
            ExecutionContext context,
            Path outputDir,
            RunOptions options,
            List<StepExecutionRecord> records,
            boolean stopOnFailure) {
        if (steps == null || steps.isEmpty()) {
            return false;
        }

        boolean failed = false;
        for (int i = 0; i < steps.size(); i++) {
            StepDefinition step = steps.get(i);
            StepExecutionRecord record = new StepExecutionRecord();
            record.setStepId(stepId(step, i));
            record.setStepName(step.getName());
            record.setAction(step.getAction() == null ? null : step.getAction().name());
            record.setStartedAt(Instant.now());
            try {
                executeStep(step, definition, context, outputDir, record);
                record.setStatus(RunStatus.SUCCESS.name());
            } catch (Exception e) {
                failed = true;
                record.setStatus(RunStatus.FAILED.name());
                record.setMessage(e.getMessage());
                records.add(record);
                if (stopOnFailure && options.isStopOnFailure()) {
                    return true;
                }
                continue;
            } finally {
                record.setFinishedAt(Instant.now());
            }
            records.add(record);
        }
        return failed;
    }

    private void executeStep(
            StepDefinition step,
            TestCaseDefinition definition,
            ExecutionContext context,
            Path outputDir,
            StepExecutionRecord record) {
        ActionType action = step.getAction();
        if (action == null) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Step action is required");
        }
        switch (action) {
            case GOTO -> pageController.navigate(resolveUrl(definition.getBaseUrl(), step.getUrl()), context);
            case REFRESH -> pageController.reload(context);
            case SCREENSHOT -> writeScreenshot(outputDir, record.getStepId(), context, record);
            case ASSERT_TITLE, ASSERT_URL -> executeAssertion(step, context);
            case CLICK, FILL, WAIT_FOR_ELEMENT, WAIT_FOR_VISIBLE, WAIT_FOR_HIDDEN, WAIT_FOR_URL -> executeAction(step, context);
            default -> throw new BaseException(
                    ErrorCodes.ACTION_EXECUTION_FAILED,
                    "Unsupported action in minimal orchestrator: " + action);
        }
    }

    private void executeAssertion(StepDefinition step, ExecutionContext context) {
        AssertionResult result = assertionEngine.assertStep(step, context);
        if (!result.isSuccess()) {
            throw new BaseException(ErrorCodes.ASSERTION_FAILED, result.getMessage());
        }
    }

    private void executeAction(StepDefinition step, ExecutionContext context) {
        StepResult result = actionExecutor.execute(step, context);
        if (!result.isSuccess()) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, result.getMessage());
        }
    }

    private void writeScreenshot(Path outputDir, String stepId, ExecutionContext context, StepExecutionRecord record) {
        Path screenshotPath = outputDir.resolve(stepId + ".png");
        try {
            Files.createDirectories(screenshotPath.getParent());
            Files.write(screenshotPath, pageController.screenshot(context, new ScreenshotOptions()));
            record.setArtifactPath(screenshotPath);
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Failed to write screenshot", e);
        }
    }

    private String resolveUrl(String baseUrl, String url) {
        if (url == null || url.isBlank()) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Goto step requires url");
        }
        if (baseUrl == null || baseUrl.isBlank()) {
            return url;
        }
        URI uri = URI.create(url);
        if (uri.isAbsolute()) {
            return url;
        }
        return URI.create(baseUrl).resolve(url).toString();
    }

    private String stepId(StepDefinition step, int index) {
        if (step.getId() != null && !step.getId().isBlank()) {
            return step.getId();
        }
        return "step-" + (index + 1);
    }
}
