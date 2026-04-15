package com.example.webtest.browser.session;

import java.util.Optional;

public interface BrowserSessionManager {
    ExecutionSession create(SessionOptions options);

    Optional<ExecutionSession> findById(String sessionId);

    void close(String sessionId);
}
