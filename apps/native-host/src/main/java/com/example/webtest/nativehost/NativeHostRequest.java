package com.example.webtest.nativehost;

import java.util.Map;

public record NativeHostRequest(
        String version,
        String type,
        String requestId,
        Map<String, Object> payload) {
}
