package com.example.webtest.browser.session;

public class SessionOptions {
    private String edgeExecutable;
    private boolean headless;
    private String userDataDir;
    private Integer debugPort;
    private String initialUrl;

    public String getEdgeExecutable() {
        return edgeExecutable;
    }

    public void setEdgeExecutable(String edgeExecutable) {
        this.edgeExecutable = edgeExecutable;
    }

    public boolean isHeadless() {
        return headless;
    }

    public void setHeadless(boolean headless) {
        this.headless = headless;
    }

    public String getUserDataDir() {
        return userDataDir;
    }

    public void setUserDataDir(String userDataDir) {
        this.userDataDir = userDataDir;
    }

    public Integer getDebugPort() {
        return debugPort;
    }

    public void setDebugPort(Integer debugPort) {
        this.debugPort = debugPort;
    }

    public String getInitialUrl() {
        return initialUrl;
    }

    public void setInitialUrl(String initialUrl) {
        this.initialUrl = initialUrl;
    }
}
