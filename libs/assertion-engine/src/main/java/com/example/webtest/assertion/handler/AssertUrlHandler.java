package com.example.webtest.assertion.handler;

import com.example.webtest.assertion.model.AssertionResult;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import java.util.Objects;

public class AssertUrlHandler implements AssertionHandler {
    private final PageController pageController;

    public AssertUrlHandler(PageController pageController) {
        this.pageController = Objects.requireNonNull(pageController, "pageController must not be null");
    }

    @Override
    public boolean supports(ActionType actionType) {
        return actionType == ActionType.ASSERT_URL;
    }

    @Override
    public AssertionResult handle(StepDefinition step, ExecutionContext context) {
        String actual = pageController.currentUrl(context);
        if (!Objects.equals(step.getExpected(), actual)) {
            return AssertionResult.failure(
                    step.getId(),
                    "Expected url [" + step.getExpected() + "] but was [" + actual + "]");
        }
        return AssertionResult.success(step.getId(), "url assertion success");
    }
}
