package com.example.webtest.wait.engine;

import com.example.webtest.dsl.model.TargetDefinition;
import com.example.webtest.execution.context.ExecutionContext;

public interface WaitEngine {
    void waitForElement(TargetDefinition target, long timeoutMs, ExecutionContext context);

    void waitForVisible(TargetDefinition target, long timeoutMs, ExecutionContext context);

    void waitForHidden(TargetDefinition target, long timeoutMs, ExecutionContext context);

    void waitForUrl(String expectedUrl, long timeoutMs, ExecutionContext context);
}
