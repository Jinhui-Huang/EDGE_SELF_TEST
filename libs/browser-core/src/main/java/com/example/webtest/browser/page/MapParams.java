package com.example.webtest.browser.page;

import java.util.Collections;
import java.util.Map;

final class MapParams {
    private MapParams() {
    }

    static Map<String, Object> empty() {
        return Collections.emptyMap();
    }

    static Map<String, Object> of(String key, Object value) {
        return Collections.singletonMap(key, value);
    }
}
