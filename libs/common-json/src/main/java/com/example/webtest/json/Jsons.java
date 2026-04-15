package com.example.webtest.json;

import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;

public final class Jsons {
    private Jsons() {
    }

    public static <T> T readValue(String json, Class<T> type) {
        throw new BaseException(
                ErrorCodes.JSON_NOT_CONFIGURED,
                "JSON parser dependency is not configured yet for type: " + type.getName());
    }

    public static String writeValueAsString(Object value) {
        throw new BaseException(
                ErrorCodes.JSON_NOT_CONFIGURED,
                "JSON writer dependency is not configured yet for value: " + value);
    }
}
