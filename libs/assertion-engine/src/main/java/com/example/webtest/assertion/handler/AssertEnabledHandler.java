package com.example.webtest.assertion.handler;

import com.example.webtest.assertion.model.AssertionResult;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.locator.model.ResolveResult;
import com.example.webtest.locator.resolver.ElementResolver;
import java.util.Objects;

public class AssertEnabledHandler implements AssertionHandler {
    private final ElementResolver elementResolver;

    public AssertEnabledHandler(ElementResolver elementResolver) {
        this.elementResolver = Objects.requireNonNull(elementResolver, "elementResolver must not be null");
    }

    @Override
    public boolean supports(ActionType actionType) {
        return actionType == ActionType.ASSERT_ENABLED || actionType == ActionType.ASSERT_DISABLED;
    }

    @Override
    public AssertionResult handle(StepDefinition step, ExecutionContext context) {
        ResolveResult resolved = elementResolver.resolve(step.getTarget(), context);
        if (step.getAction() == ActionType.ASSERT_DISABLED) {
            if (resolved.isFound() && !resolved.isEnabled()) {
                return AssertionResult.success(step.getId(), "disabled assertion success");
            }
            return AssertionResult.failure(step.getId(), "Expected element to be disabled");
        }
        if (resolved.isFound() && resolved.isEnabled()) {
            return AssertionResult.success(step.getId(), "enabled assertion success");
        }
        return AssertionResult.failure(step.getId(), "Expected element to be enabled");
    }
}
