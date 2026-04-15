package com.example.webtest.execution.context;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class ExecutionContext {
    private final String runId;
    private final Map<String, Object> variables = new ConcurrentHashMap<>();
    private String sessionId;

    public ExecutionContext(String runId) {
        this.runId = runId;
    }

    public String getRunId() {
        return runId;
    }

    public Optional<String> getSessionId() {
        return Optional.ofNullable(sessionId);
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public Optional<Object> getVariable(String name) {
        return Optional.ofNullable(variables.get(name));
    }

    public void setVariable(String name, Object value) {
        variables.put(name, value);
    }

    public Map<String, Object> getVariables() {
        return Collections.unmodifiableMap(variables);
    }
}
