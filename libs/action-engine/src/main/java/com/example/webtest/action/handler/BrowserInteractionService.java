package com.example.webtest.action.handler;

import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.locator.model.ResolveResult;

public interface BrowserInteractionService {
    void click(ResolveResult resolveResult, ExecutionContext context);

    void fill(ResolveResult resolveResult, String value, ExecutionContext context);
}
