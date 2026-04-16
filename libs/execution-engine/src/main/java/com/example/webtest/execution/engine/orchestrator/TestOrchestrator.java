package com.example.webtest.execution.engine.orchestrator;

import com.example.webtest.dsl.model.TestCaseDefinition;
import com.example.webtest.execution.engine.result.RunOptions;
import com.example.webtest.execution.engine.result.RunResult;

public interface TestOrchestrator {
    RunResult execute(TestCaseDefinition definition, RunOptions options);
}
