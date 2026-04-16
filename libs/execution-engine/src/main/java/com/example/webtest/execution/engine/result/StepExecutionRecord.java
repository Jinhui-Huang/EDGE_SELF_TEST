package com.example.webtest.execution.engine.result;

import java.nio.file.Path;
import java.time.Instant;

public class StepExecutionRecord {
    private String stepId;
    private String stepName;
    private String action;
    private String status;
    private String message;
    private Instant startedAt;
    private Instant finishedAt;
    private Path artifactPath;

    public String getStepId() {
        return stepId;
    }

    public void setStepId(String stepId) {
        this.stepId = stepId;
    }

    public String getStepName() {
        return stepName;
    }

    public void setStepName(String stepName) {
        this.stepName = stepName;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
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

    public Path getArtifactPath() {
        return artifactPath;
    }

    public void setArtifactPath(Path artifactPath) {
        this.artifactPath = artifactPath;
    }
}
