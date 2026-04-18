package com.example.webtest.dsl.model;

import java.util.ArrayList;
import java.util.List;

public class ReportPolicy {
    private boolean screenshotOnFailure = true;
    private boolean saveDomOnFailure = true;
    private boolean saveConsoleOnFailure = true;
    private boolean saveNetworkOnFailure = true;
    private boolean screenshotBeforeStep;
    private boolean screenshotAfterStep;
    private boolean saveDomBeforeStep;
    private boolean saveDomAfterStep;
    private boolean saveConsoleBeforeStep;
    private boolean saveConsoleAfterStep;
    private boolean saveNetworkBeforeStep;
    private boolean saveNetworkAfterStep;
    private Long networkBodySpoolCleanupGraceSeconds;
    private boolean retentionCleanupOnRun;
    private Integer retentionKeepLatest;
    private Integer retentionOlderThanDays;
    private Long retentionMaxTotalMb;
    private boolean retentionPruneArtifactsOnly;
    private List<String> retentionDeleteStatuses = new ArrayList<>();

    public boolean isScreenshotOnFailure() {
        return screenshotOnFailure;
    }

    public void setScreenshotOnFailure(boolean screenshotOnFailure) {
        this.screenshotOnFailure = screenshotOnFailure;
    }

    public boolean isSaveDomOnFailure() {
        return saveDomOnFailure;
    }

    public void setSaveDomOnFailure(boolean saveDomOnFailure) {
        this.saveDomOnFailure = saveDomOnFailure;
    }

    public boolean isSaveConsoleOnFailure() {
        return saveConsoleOnFailure;
    }

    public void setSaveConsoleOnFailure(boolean saveConsoleOnFailure) {
        this.saveConsoleOnFailure = saveConsoleOnFailure;
    }

    public boolean isSaveNetworkOnFailure() {
        return saveNetworkOnFailure;
    }

    public void setSaveNetworkOnFailure(boolean saveNetworkOnFailure) {
        this.saveNetworkOnFailure = saveNetworkOnFailure;
    }

    public boolean isScreenshotBeforeStep() {
        return screenshotBeforeStep;
    }

    public void setScreenshotBeforeStep(boolean screenshotBeforeStep) {
        this.screenshotBeforeStep = screenshotBeforeStep;
    }

    public boolean isScreenshotAfterStep() {
        return screenshotAfterStep;
    }

    public void setScreenshotAfterStep(boolean screenshotAfterStep) {
        this.screenshotAfterStep = screenshotAfterStep;
    }

    public boolean isSaveDomBeforeStep() {
        return saveDomBeforeStep;
    }

    public void setSaveDomBeforeStep(boolean saveDomBeforeStep) {
        this.saveDomBeforeStep = saveDomBeforeStep;
    }

    public boolean isSaveDomAfterStep() {
        return saveDomAfterStep;
    }

    public void setSaveDomAfterStep(boolean saveDomAfterStep) {
        this.saveDomAfterStep = saveDomAfterStep;
    }

    public boolean isSaveConsoleBeforeStep() {
        return saveConsoleBeforeStep;
    }

    public void setSaveConsoleBeforeStep(boolean saveConsoleBeforeStep) {
        this.saveConsoleBeforeStep = saveConsoleBeforeStep;
    }

    public boolean isSaveConsoleAfterStep() {
        return saveConsoleAfterStep;
    }

    public void setSaveConsoleAfterStep(boolean saveConsoleAfterStep) {
        this.saveConsoleAfterStep = saveConsoleAfterStep;
    }

    public boolean isSaveNetworkBeforeStep() {
        return saveNetworkBeforeStep;
    }

    public void setSaveNetworkBeforeStep(boolean saveNetworkBeforeStep) {
        this.saveNetworkBeforeStep = saveNetworkBeforeStep;
    }

    public boolean isSaveNetworkAfterStep() {
        return saveNetworkAfterStep;
    }

    public void setSaveNetworkAfterStep(boolean saveNetworkAfterStep) {
        this.saveNetworkAfterStep = saveNetworkAfterStep;
    }

    public Long getNetworkBodySpoolCleanupGraceSeconds() {
        return networkBodySpoolCleanupGraceSeconds;
    }

    public void setNetworkBodySpoolCleanupGraceSeconds(Long networkBodySpoolCleanupGraceSeconds) {
        this.networkBodySpoolCleanupGraceSeconds = networkBodySpoolCleanupGraceSeconds;
    }

    public boolean isRetentionCleanupOnRun() {
        return retentionCleanupOnRun;
    }

    public void setRetentionCleanupOnRun(boolean retentionCleanupOnRun) {
        this.retentionCleanupOnRun = retentionCleanupOnRun;
    }

    public Integer getRetentionKeepLatest() {
        return retentionKeepLatest;
    }

    public void setRetentionKeepLatest(Integer retentionKeepLatest) {
        this.retentionKeepLatest = retentionKeepLatest;
    }

    public Integer getRetentionOlderThanDays() {
        return retentionOlderThanDays;
    }

    public void setRetentionOlderThanDays(Integer retentionOlderThanDays) {
        this.retentionOlderThanDays = retentionOlderThanDays;
    }

    public Long getRetentionMaxTotalMb() {
        return retentionMaxTotalMb;
    }

    public void setRetentionMaxTotalMb(Long retentionMaxTotalMb) {
        this.retentionMaxTotalMb = retentionMaxTotalMb;
    }

    public boolean isRetentionPruneArtifactsOnly() {
        return retentionPruneArtifactsOnly;
    }

    public void setRetentionPruneArtifactsOnly(boolean retentionPruneArtifactsOnly) {
        this.retentionPruneArtifactsOnly = retentionPruneArtifactsOnly;
    }

    public List<String> getRetentionDeleteStatuses() {
        return retentionDeleteStatuses;
    }

    public void setRetentionDeleteStatuses(List<String> retentionDeleteStatuses) {
        this.retentionDeleteStatuses = retentionDeleteStatuses == null
                ? new ArrayList<>()
                : new ArrayList<>(retentionDeleteStatuses);
    }
}
