package com.example.webtest.action.executor;

import com.example.webtest.action.handler.StepActionHandler;
import com.example.webtest.action.result.StepResult;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import java.util.List;

public class DefaultActionExecutor implements ActionExecutor {
    private final List<StepActionHandler> handlers;

    public DefaultActionExecutor(List<StepActionHandler> handlers) {
        this.handlers = handlers == null ? List.of() : List.copyOf(handlers);
    }

    @Override
    public StepResult execute(StepDefinition step, ExecutionContext context) {
        if (step == null || step.getAction() == null) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Step action is required");
        }
        for (StepActionHandler handler : handlers) {
            if (handler.supports(step.getAction())) {
                return handler.handle(step, context);
            }
        }
        return StepResult.failure(step.getId(), "No handler found for action: " + step.getAction());
    }
}
