package com.example.webtest.nativehost;

public record NativeHostResponse(
        boolean ok,
        String requestId,
        Object data,
        NativeHostError error) {
    public static NativeHostResponse success(String requestId, Object data) {
        return new NativeHostResponse(true, requestId, data, null);
    }

    public static NativeHostResponse failure(String requestId, String code, String message) {
        return new NativeHostResponse(false, requestId, null, new NativeHostError(code, message));
    }

    public record NativeHostError(String code, String message) {
    }
}
