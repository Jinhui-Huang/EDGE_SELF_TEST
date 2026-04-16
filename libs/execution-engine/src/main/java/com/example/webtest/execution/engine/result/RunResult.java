package com.example.webtest.execution.engine.result;

import java.nio.file.Path;
import java.util.List;

public class RunResult {
    private String runId;
    private RunStatus status;
    private Path outputDir;
    private List<StepExecutionRecord> stepRecords;

    public String getRunId() {
        return runId;
    }

    public void setRunId(String runId) {
        this.runId = runId;
    }

    public RunStatus getStatus() {
        return status;
    }

    public void setStatus(RunStatus status) {
        this.status = status;
    }

    public Path getOutputDir() {
        return outputDir;
    }

    public void setOutputDir(Path outputDir) {
        this.outputDir = outputDir;
    }

    public List<StepExecutionRecord> getStepRecords() {
        return stepRecords;
    }

    public void setStepRecords(List<StepExecutionRecord> stepRecords) {
        this.stepRecords = stepRecords;
    }
}
