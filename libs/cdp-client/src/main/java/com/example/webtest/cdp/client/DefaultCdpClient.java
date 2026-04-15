package com.example.webtest.cdp.client;

import com.example.webtest.cdp.event.CdpEventListener;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

public class DefaultCdpClient implements CdpClient {
    private final Map<String, List<CdpEventListener>> listeners = new ConcurrentHashMap<>();
    private volatile boolean connected;
    private String wsUrl;

    @Override
    public void connect(String wsUrl) {
        this.wsUrl = wsUrl;
        this.connected = true;
    }

    @Override
    public void close() {
        this.connected = false;
    }

    @Override
    public <T> T send(String method, Object params, Class<T> responseType) {
        if (!connected) {
            throw new BaseException(ErrorCodes.CDP_REQUEST_FAILED, "CDP client is not connected");
        }
        throw new BaseException(
                ErrorCodes.CDP_REQUEST_FAILED,
                "CDP WebSocket transport is not implemented yet for method: " + method);
    }

    @Override
    public void addEventListener(String eventName, CdpEventListener listener) {
        listeners.computeIfAbsent(eventName, ignored -> new CopyOnWriteArrayList<>()).add(listener);
    }

    @Override
    public void removeEventListener(String eventName, CdpEventListener listener) {
        List<CdpEventListener> eventListeners = listeners.get(eventName);
        if (eventListeners != null) {
            eventListeners.remove(listener);
        }
    }

    public boolean isConnected() {
        return connected;
    }

    public String getWsUrl() {
        return wsUrl;
    }

    protected void dispatchEvent(String eventName, Object params) {
        List<CdpEventListener> eventListeners = listeners.get(eventName);
        if (eventListeners == null) {
            return;
        }
        for (CdpEventListener listener : eventListeners) {
            listener.onEvent(eventName, params);
        }
    }
}
