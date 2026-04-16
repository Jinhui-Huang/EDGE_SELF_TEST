package com.example.webtest.assertion.engine;

import com.example.webtest.assertion.model.AssertionResult;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.execution.context.ExecutionContext;

public interface AssertionEngine {
    AssertionResult assertStep(StepDefinition step, ExecutionContext context);
}
