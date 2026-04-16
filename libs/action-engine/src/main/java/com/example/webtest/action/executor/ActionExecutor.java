package com.example.webtest.action.executor;

import com.example.webtest.action.result.StepResult;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.execution.context.ExecutionContext;

public interface ActionExecutor {
    StepResult execute(StepDefinition step, ExecutionContext context);
}
