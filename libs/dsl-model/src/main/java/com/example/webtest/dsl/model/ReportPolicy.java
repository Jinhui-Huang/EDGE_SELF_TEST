package com.example.webtest.dsl.model;

public class ReportPolicy {
    private boolean screenshotOnFailure = true;
    private boolean saveDomOnFailure = true;

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
}
