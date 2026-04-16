package com.example.webtest.assertion.handler;

import com.example.webtest.assertion.model.AssertionResult;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.execution.context.ExecutionContext;

public interface AssertionHandler {
    boolean supports(ActionType actionType);

    AssertionResult handle(StepDefinition step, ExecutionContext context);
}
