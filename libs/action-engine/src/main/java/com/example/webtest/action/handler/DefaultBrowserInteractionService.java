package com.example.webtest.action.handler;

import com.example.webtest.browser.page.PageController;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.locator.model.ResolveResult;
import java.util.Objects;

public class DefaultBrowserInteractionService implements BrowserInteractionService {
    private final PageController pageController;

    public DefaultBrowserInteractionService(PageController pageController) {
        this.pageController = Objects.requireNonNull(pageController, "pageController must not be null");
    }

    @Override
    public void click(ResolveResult resolveResult, ExecutionContext context) {
        ResolveResult result = requireActionable(resolveResult);
        pageController.clickElement(result.getBy(), result.getValue(), result.getIndex(), context);
    }

    @Override
    public void fill(ResolveResult resolveResult, String value, ExecutionContext context) {
        ResolveResult result = requireActionable(resolveResult);
        pageController.fillElement(result.getBy(), result.getValue(), result.getIndex(), value, context);
    }

    private ResolveResult requireActionable(ResolveResult result) {
        if (result == null || !result.isFound()) {
            throw new BaseException(ErrorCodes.ELEMENT_NOT_FOUND, "Element was not found");
        }
        if (!result.isVisible()) {
            throw new BaseException(ErrorCodes.ELEMENT_NOT_VISIBLE, "Element is not visible");
        }
        if (!result.isActionable()) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Element is not actionable");
        }
        return result;
    }
}
