package com.example.webtest.dsl.model;

import java.util.Map;

public class StepDefinition {
    private String id;
    private String name;
    private ActionType action;
    private TargetDefinition target;
    private Object value;
    private String expected;
    private String url;
    private Long timeoutMs;
    private RetryPolicy retry;
    private FailurePolicy onFailure;
    private Map<String, Object> extra;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ActionType getAction() {
        return action;
    }

    public void setAction(ActionType action) {
        this.action = action;
    }

    public TargetDefinition getTarget() {
        return target;
    }

    public void setTarget(TargetDefinition target) {
        this.target = target;
    }

    public Object getValue() {
        return value;
    }

    public void setValue(Object value) {
        this.value = value;
    }

    public String getExpected() {
        return expected;
    }

    public void setExpected(String expected) {
        this.expected = expected;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public Long getTimeoutMs() {
        return timeoutMs;
    }

    public void setTimeoutMs(Long timeoutMs) {
        this.timeoutMs = timeoutMs;
    }

    public RetryPolicy getRetry() {
        return retry;
    }

    public void setRetry(RetryPolicy retry) {
        this.retry = retry;
    }

    public FailurePolicy getOnFailure() {
        return onFailure;
    }

    public void setOnFailure(FailurePolicy onFailure) {
        this.onFailure = onFailure;
    }

    public Map<String, Object> getExtra() {
        return extra;
    }

    public void setExtra(Map<String, Object> extra) {
        this.extra = extra;
    }
}
