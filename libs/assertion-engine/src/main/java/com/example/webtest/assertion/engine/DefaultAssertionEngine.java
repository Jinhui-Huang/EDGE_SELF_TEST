package com.example.webtest.assertion.engine;

import com.example.webtest.assertion.handler.AssertionHandler;
import com.example.webtest.assertion.model.AssertionResult;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import java.util.List;

public class DefaultAssertionEngine implements AssertionEngine {
    private final List<AssertionHandler> handlers;

    public DefaultAssertionEngine(List<AssertionHandler> handlers) {
        this.handlers = handlers == null ? List.of() : List.copyOf(handlers);
    }

    @Override
    public AssertionResult assertStep(StepDefinition step, ExecutionContext context) {
        if (step == null || step.getAction() == null) {
            throw new BaseException(ErrorCodes.ASSERTION_FAILED, "Step action is required");
        }
        for (AssertionHandler handler : handlers) {
            if (handler.supports(step.getAction())) {
                return handler.handle(step, context);
            }
        }
        return AssertionResult.failure(step.getId(), "No assertion handler found for action: " + step.getAction());
    }
}
