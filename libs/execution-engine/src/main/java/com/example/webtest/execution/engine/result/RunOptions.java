package com.example.webtest.execution.engine.result;

import java.nio.file.Path;

public class RunOptions {
    private String runId;
    private Path outputDir;
    private boolean stopOnFailure = true;

    public String getRunId() {
        return runId;
    }

    public void setRunId(String runId) {
        this.runId = runId;
    }

    public Path getOutputDir() {
        return outputDir;
    }

    public void setOutputDir(Path outputDir) {
        this.outputDir = outputDir;
    }

    public boolean isStopOnFailure() {
        return stopOnFailure;
    }

    public void setStopOnFailure(boolean stopOnFailure) {
        this.stopOnFailure = stopOnFailure;
    }
}
