package com.example.webtest.assertion.handler;

import com.example.webtest.assertion.model.AssertionResult;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.locator.model.ResolveResult;
import com.example.webtest.locator.resolver.ElementResolver;
import java.util.Objects;

public class AssertVisibleHandler implements AssertionHandler {
    private final ElementResolver elementResolver;

    public AssertVisibleHandler(ElementResolver elementResolver) {
        this.elementResolver = Objects.requireNonNull(elementResolver, "elementResolver must not be null");
    }

    @Override
    public boolean supports(ActionType actionType) {
        return actionType == ActionType.ASSERT_VISIBLE || actionType == ActionType.ASSERT_NOT_VISIBLE;
    }

    @Override
    public AssertionResult handle(StepDefinition step, ExecutionContext context) {
        ResolveResult resolved = elementResolver.resolve(step.getTarget(), context);
        if (step.getAction() == ActionType.ASSERT_NOT_VISIBLE) {
            if (!resolved.isFound() || !resolved.isVisible()) {
                return AssertionResult.success(step.getId(), "not visible assertion success");
            }
            return AssertionResult.failure(step.getId(), "Expected element to be not visible");
        }
        if (resolved.isFound() && resolved.isVisible()) {
            return AssertionResult.success(step.getId(), "visible assertion success");
        }
        return AssertionResult.failure(step.getId(), "Expected element to be visible");
    }
}
