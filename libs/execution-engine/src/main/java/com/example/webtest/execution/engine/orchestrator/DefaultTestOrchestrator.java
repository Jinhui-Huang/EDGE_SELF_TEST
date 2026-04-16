package com.example.webtest.execution.engine.orchestrator;

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

    public DefaultTestOrchestrator(PageController pageController) {
        this.pageController = Objects.requireNonNull(pageController, "pageController must not be null");
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
            case ASSERT_TITLE -> assertEquals(step.getExpected(), pageController.title(context), "title");
            case ASSERT_URL -> assertEquals(step.getExpected(), pageController.currentUrl(context), "url");
            default -> throw new BaseException(
                    ErrorCodes.ACTION_EXECUTION_FAILED,
                    "Unsupported action in minimal orchestrator: " + action);
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

    private void assertEquals(String expected, String actual, String field) {
        if (!Objects.equals(expected, actual)) {
            throw new BaseException(
                    ErrorCodes.ASSERTION_FAILED,
                    "Expected " + field + " [" + expected + "] but was [" + actual + "]");
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
