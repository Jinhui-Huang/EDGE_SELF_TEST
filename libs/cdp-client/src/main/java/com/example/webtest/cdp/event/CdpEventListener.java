package com.example.webtest.cdp.event;

public interface CdpEventListener {
    void onEvent(String eventName, Object params);
}
