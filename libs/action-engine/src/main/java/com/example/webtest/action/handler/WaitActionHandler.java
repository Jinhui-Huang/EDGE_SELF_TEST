package com.example.webtest.action.handler;

import com.example.webtest.action.result.StepResult;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.wait.engine.DefaultWaitEngine;
import com.example.webtest.wait.engine.WaitEngine;
import java.util.Objects;

public class WaitActionHandler implements StepActionHandler {
    private final WaitEngine waitEngine;

    public WaitActionHandler(WaitEngine waitEngine) {
        this.waitEngine = Objects.requireNonNull(waitEngine, "waitEngine must not be null");
    }

    @Override
    public boolean supports(ActionType actionType) {
        return actionType == ActionType.WAIT_FOR_ELEMENT
                || actionType == ActionType.WAIT_FOR_VISIBLE
                || actionType == ActionType.WAIT_FOR_HIDDEN
                || actionType == ActionType.WAIT_FOR_URL;
    }

    @Override
    public StepResult handle(StepDefinition step, ExecutionContext context) {
        long timeout = step.getTimeoutMs() == null ? DefaultWaitEngine.DEFAULT_TIMEOUT_MS : step.getTimeoutMs();
        switch (step.getAction()) {
            case WAIT_FOR_ELEMENT -> waitEngine.waitForElement(step.getTarget(), timeout, context);
            case WAIT_FOR_VISIBLE -> waitEngine.waitForVisible(step.getTarget(), timeout, context);
            case WAIT_FOR_HIDDEN -> waitEngine.waitForHidden(step.getTarget(), timeout, context);
            case WAIT_FOR_URL -> waitEngine.waitForUrl(waitUrl(step), timeout, context);
            default -> throw new BaseException(
                    ErrorCodes.ACTION_EXECUTION_FAILED,
                    "Unsupported wait action: " + step.getAction());
        }
        return StepResult.success(step.getId(), "wait success");
    }

    private String waitUrl(StepDefinition step) {
        if (step.getExpected() != null && !step.getExpected().isBlank()) {
            return step.getExpected();
        }
        return step.getUrl();
    }
}
