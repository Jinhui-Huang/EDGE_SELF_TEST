package com.example.webtest.browser.session;

import com.example.webtest.common.ids.Ids;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class DefaultBrowserSessionManager implements BrowserSessionManager {
    private final Map<String, ExecutionSession> sessions = new ConcurrentHashMap<>();

    @Override
    public ExecutionSession create(SessionOptions options) {
        ExecutionSession session = new ExecutionSession();
        session.setSessionId(Ids.uuid());
        session.setDebugPort(options == null ? null : options.getDebugPort());
        session.setStatus(SessionStatus.CREATED);
        sessions.put(session.getSessionId(), session);
        return session;
    }

    @Override
    public Optional<ExecutionSession> findById(String sessionId) {
        return Optional.ofNullable(sessions.get(sessionId));
    }

    @Override
    public void close(String sessionId) {
        ExecutionSession session = sessions.remove(sessionId);
        if (session != null) {
            session.setStatus(SessionStatus.CLOSED);
        }
    }
}
