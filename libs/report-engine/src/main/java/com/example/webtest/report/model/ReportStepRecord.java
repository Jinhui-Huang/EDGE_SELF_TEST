package com.example.webtest.report.model;

import com.example.webtest.artifact.model.ArtifactRef;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class ReportStepRecord {
    private String stepId;
    private String stepName;
    private String action;
    private String status;
    private String message;
    private Instant startedAt;
    private Instant finishedAt;
    private Path artifactPath;
    private List<ArtifactRef> artifacts = new ArrayList<>();

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

    public List<ArtifactRef> getArtifacts() {
        return artifacts;
    }

    public void setArtifacts(List<ArtifactRef> artifacts) {
        this.artifacts = artifacts == null ? new ArrayList<>() : new ArrayList<>(artifacts);
    }
}
