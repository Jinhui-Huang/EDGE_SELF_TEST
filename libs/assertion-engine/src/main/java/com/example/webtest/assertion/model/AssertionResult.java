package com.example.webtest.assertion.model;

public class AssertionResult {
    private final String stepId;
    private final boolean success;
    private final String message;

    public AssertionResult(String stepId, boolean success, String message) {
        this.stepId = stepId;
        this.success = success;
        this.message = message;
    }

    public static AssertionResult success(String stepId, String message) {
        return new AssertionResult(stepId, true, message);
    }

    public static AssertionResult failure(String stepId, String message) {
        return new AssertionResult(stepId, false, message);
    }

    public String getStepId() {
        return stepId;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }
}
