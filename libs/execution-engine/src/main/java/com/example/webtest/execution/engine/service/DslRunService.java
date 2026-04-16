package com.example.webtest.execution.engine.service;

import com.example.webtest.execution.engine.result.RunOptions;
import com.example.webtest.execution.engine.result.RunResult;
import java.nio.file.Path;

public interface DslRunService {
    RunResult execute(Path dslPath, RunOptions options);
}
