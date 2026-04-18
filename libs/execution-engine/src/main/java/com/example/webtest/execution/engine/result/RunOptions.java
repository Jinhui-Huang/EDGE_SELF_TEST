package com.example.webtest.execution.engine.result;

import java.nio.file.Path;
import java.time.Duration;

public class RunOptions {
    private String runId;
    private Path outputDir;
    private boolean stopOnFailure = true;
    private Duration networkBodySpoolCleanupGracePeriod;

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

    public Duration getNetworkBodySpoolCleanupGracePeriod() {
        return networkBodySpoolCleanupGracePeriod;
    }

    public void setNetworkBodySpoolCleanupGracePeriod(Duration networkBodySpoolCleanupGracePeriod) {
        if (networkBodySpoolCleanupGracePeriod != null && networkBodySpoolCleanupGracePeriod.isNegative()) {
            throw new IllegalArgumentException("Network body spool cleanup grace period must be zero or greater");
        }
        this.networkBodySpoolCleanupGracePeriod = networkBodySpoolCleanupGracePeriod;
    }
}
