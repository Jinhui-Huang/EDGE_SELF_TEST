package com.example.webtest.cdp.client;

import com.example.webtest.cdp.event.CdpEventListener;

public interface CdpClient {
    void connect(String wsUrl);

    void close();

    <T> T send(String method, Object params, Class<T> responseType);

    void addEventListener(String eventName, CdpEventListener listener);

    void removeEventListener(String eventName, CdpEventListener listener);
}
