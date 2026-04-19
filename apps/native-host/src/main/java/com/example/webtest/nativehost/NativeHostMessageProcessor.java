package com.example.webtest.nativehost;

import java.util.Map;

final class NativeHostMessageProcessor {
    private static final String PROTOCOL_VERSION = "1.0";
    private final LocalAdminApiBridge localAdminApiBridge;

    NativeHostMessageProcessor(LocalAdminApiBridge localAdminApiBridge) {
        this.localAdminApiBridge = localAdminApiBridge;
    }

    NativeHostResponse process(NativeHostRequest request) {
        if (request == null) {
            return NativeHostResponse.failure(null, "INVALID_REQUEST", "Request payload is required.");
        }
        if (request.type() == null || request.type().isBlank()) {
            return NativeHostResponse.failure(request.requestId(), "INVALID_REQUEST", "Request type is required.");
        }
        try {
            return switch (request.type()) {
                case "PING" -> NativeHostResponse.success(request.requestId(), Map.of(
                        "host", "phase3-native-host",
                        "version", PROTOCOL_VERSION,
                        "status", "READY"));
                case "POPUP_SNAPSHOT_GET" -> NativeHostResponse.success(
                        request.requestId(),
                        localAdminApiBridge.fetchPopupSnapshot());
                case "SCHEDULER_REQUEST_CREATE" -> NativeHostResponse.success(
                        request.requestId(),
                        localAdminApiBridge.createSchedulerRequest(safePayload(request.payload())));
                case "SCHEDULER_EVENT_CREATE" -> NativeHostResponse.success(
                        request.requestId(),
                        localAdminApiBridge.createSchedulerEvent(safePayload(request.payload())));
                default -> NativeHostResponse.failure(
                        request.requestId(),
                        "UNSUPPORTED_TYPE",
                        "Unsupported request type: " + request.type());
            };
        } catch (RuntimeException exception) {
            return NativeHostResponse.failure(
                    request.requestId(),
                    "LOCAL_API_ERROR",
                    exception.getMessage() == null ? "Native host request failed." : exception.getMessage());
        }
    }

    private Map<String, Object> safePayload(Map<String, Object> payload) {
        return payload == null ? Map.of() : payload;
    }
}
