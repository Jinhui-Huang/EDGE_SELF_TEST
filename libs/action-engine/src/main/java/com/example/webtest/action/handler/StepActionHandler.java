package com.example.webtest.action.handler;

import com.example.webtest.action.result.StepResult;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.execution.context.ExecutionContext;

public interface StepActionHandler {
    boolean supports(ActionType actionType);

    StepResult handle(StepDefinition step, ExecutionContext context);
}
