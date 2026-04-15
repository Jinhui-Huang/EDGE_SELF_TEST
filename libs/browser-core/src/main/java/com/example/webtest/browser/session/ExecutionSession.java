package com.example.webtest.browser.session;

public class ExecutionSession {
    private String sessionId;
    private String browserProcessId;
    private Integer debugPort;
    private String wsEndpoint;
    private String currentTargetId;
    private String currentFrameId;
    private SessionStatus status;

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getBrowserProcessId() {
        return browserProcessId;
    }

    public void setBrowserProcessId(String browserProcessId) {
        this.browserProcessId = browserProcessId;
    }

    public Integer getDebugPort() {
        return debugPort;
    }

    public void setDebugPort(Integer debugPort) {
        this.debugPort = debugPort;
    }

    public String getWsEndpoint() {
        return wsEndpoint;
    }

    public void setWsEndpoint(String wsEndpoint) {
        this.wsEndpoint = wsEndpoint;
    }

    public String getCurrentTargetId() {
        return currentTargetId;
    }

    public void setCurrentTargetId(String currentTargetId) {
        this.currentTargetId = currentTargetId;
    }

    public String getCurrentFrameId() {
        return currentFrameId;
    }

    public void setCurrentFrameId(String currentFrameId) {
        this.currentFrameId = currentFrameId;
    }

    public SessionStatus getStatus() {
        return status;
    }

    public void setStatus(SessionStatus status) {
        this.status = status;
    }
}
