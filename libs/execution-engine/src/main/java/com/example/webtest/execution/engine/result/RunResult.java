package com.example.webtest.execution.engine.result;

import java.nio.file.Path;
import java.time.Instant;
import java.util.List;

public class RunResult {
    private String runId;
    private RunStatus status;
    private Instant startedAt;
    private Instant finishedAt;
    private Path outputDir;
    private Path reportPath;
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

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }

    public Path getOutputDir() {
        return outputDir;
    }

    public void setOutputDir(Path outputDir) {
        this.outputDir = outputDir;
    }

    public Path getReportPath() {
        return reportPath;
    }

    public void setReportPath(Path reportPath) {
        this.reportPath = reportPath;
    }

    public List<StepExecutionRecord> getStepRecords() {
        return stepRecords;
    }

    public void setStepRecords(List<StepExecutionRecord> stepRecords) {
        this.stepRecords = stepRecords;
    }
}
