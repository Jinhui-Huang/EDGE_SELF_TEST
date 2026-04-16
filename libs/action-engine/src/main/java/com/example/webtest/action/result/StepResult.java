package com.example.webtest.action.result;

public class StepResult {
    private final String stepId;
    private final boolean success;
    private final String message;

    public StepResult(String stepId, boolean success, String message) {
        this.stepId = stepId;
        this.success = success;
        this.message = message;
    }

    public static StepResult success(String stepId, String message) {
        return new StepResult(stepId, true, message);
    }

    public static StepResult failure(String stepId, String message) {
        return new StepResult(stepId, false, message);
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
