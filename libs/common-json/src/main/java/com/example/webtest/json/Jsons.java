package com.example.webtest.json;

import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import java.io.IOException;

public final class Jsons {
    public static final ObjectMapper JSON = configure(new ObjectMapper());
    public static final ObjectMapper YAML = configure(new ObjectMapper(new YAMLFactory()));

    private Jsons() {
    }

    public static <T> T readValue(String json, Class<T> type) {
        try {
            return JSON.readValue(json, type);
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.JSON_NOT_CONFIGURED, "Failed to read JSON as " + type.getName(), e);
        }
    }

    public static String writeValueAsString(Object value) {
        try {
            return JSON.writeValueAsString(value);
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.JSON_NOT_CONFIGURED, "Failed to write JSON value", e);
        }
    }

    public static <T> T readYamlValue(String yaml, Class<T> type) {
        try {
            return YAML.readValue(yaml, type);
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.JSON_NOT_CONFIGURED, "Failed to read YAML as " + type.getName(), e);
        }
    }

    private static ObjectMapper configure(ObjectMapper mapper) {
        return mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .configure(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS, true);
    }
}
