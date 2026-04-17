package com.example.webtest.assertion.handler;

import com.example.webtest.assertion.model.AssertionResult;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.locator.model.ResolveResult;
import com.example.webtest.locator.resolver.ElementResolver;
import java.util.Objects;

public class AssertAttrHandler implements AssertionHandler {
    private final ElementResolver elementResolver;
    private final PageController pageController;

    public AssertAttrHandler(ElementResolver elementResolver, PageController pageController) {
        this.elementResolver = Objects.requireNonNull(elementResolver, "elementResolver must not be null");
        this.pageController = Objects.requireNonNull(pageController, "pageController must not be null");
    }

    @Override
    public boolean supports(ActionType actionType) {
        return actionType == ActionType.ASSERT_ATTR;
    }

    @Override
    public AssertionResult handle(StepDefinition step, ExecutionContext context) {
        String attributeName = String.valueOf(step.getValue());
        ResolveResult resolved = elementResolver.resolve(step.getTarget(), context);
        if (!resolved.isFound()) {
            return AssertionResult.failure(step.getId(), "Expected attribute [" + attributeName + "] to be ["
                    + step.getExpected() + "] but element was not found");
        }
        String actual = pageController.elementAttribute(
                resolved.getBy(), resolved.getValue(), resolved.getIndex(), attributeName, context);
        if (!Objects.equals(step.getExpected(), actual)) {
            return AssertionResult.failure(
                    step.getId(),
                    "Expected attribute [" + attributeName + "] to be [" + step.getExpected()
                            + "] but was [" + actual + "]");
        }
        return AssertionResult.success(step.getId(), "attribute assertion success");
    }
}
