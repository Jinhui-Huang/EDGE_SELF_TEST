package com.example.webtest.execution.engine.service;

import com.example.webtest.dsl.model.TestCaseDefinition;
import com.example.webtest.dsl.parser.DslParser;
import com.example.webtest.execution.engine.orchestrator.TestOrchestrator;
import com.example.webtest.execution.engine.result.RunOptions;
import com.example.webtest.execution.engine.result.RunResult;
import java.nio.file.Path;
import java.util.Objects;

public class DefaultDslRunService implements DslRunService {
    private final DslParser dslParser;
    private final TestOrchestrator testOrchestrator;

    public DefaultDslRunService(DslParser dslParser, TestOrchestrator testOrchestrator) {
        this.dslParser = Objects.requireNonNull(dslParser, "dslParser must not be null");
        this.testOrchestrator = Objects.requireNonNull(testOrchestrator, "testOrchestrator must not be null");
    }

    @Override
    public RunResult execute(Path dslPath, RunOptions options) {
        TestCaseDefinition definition = dslParser.parse(dslPath);
        return testOrchestrator.execute(definition, options);
    }
}
