package com.example.webtest.admin.service;

import com.example.webtest.json.Jsons;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class ExtensionActionService {
    private static final URI DEFAULT_PLATFORM_BASE_URI = URI.create("http://127.0.0.1:5173/");
    private final URI platformBaseUri;

    public ExtensionActionService() {
        this(DEFAULT_PLATFORM_BASE_URI);
    }

    ExtensionActionService(URI platformBaseUri) {
        this.platformBaseUri = platformBaseUri == null ? DEFAULT_PLATFORM_BASE_URI : platformBaseUri;
    }

    public Map<String, Object> buildPageSummary(String requestBody) {
        Map<String, Object> payload = parseBody(requestBody);
        String pageTitle = textOr(payload, "pageTitle", "Untitled page");
        String pageUrl = textOr(payload, "pageUrl", "");
        String pageDomain = firstNonBlank(
                textOr(payload, "pageDomain", ""),
                hostFromUrl(pageUrl));
        String pagePath = firstNonBlank(
                textOr(payload, "pagePath", ""),
                pathFromUrl(pageUrl));
        String runtimeMode = textOr(payload, "runtimeMode", "");
        String queueState = textOr(payload, "queueState", "");
        String auditState = textOr(payload, "auditState", "");
        String nextAction = textOr(payload, "nextAction", "");
        String locator = textOr(payload, "locator", "");
        String runtimeSummary = buildRuntimeSummary(runtimeMode, queueState, auditState);

        List<String> signals = new ArrayList<>();
        if (!pageDomain.isBlank()) {
            signals.add("Domain " + pageDomain + " came from the current extension/tab context.");
        }
        if (!pagePath.isBlank() && !"/".equals(pagePath)) {
            signals.add("Path " + pagePath + " came from the active tab URL.");
        }
        if (!runtimeSummary.isBlank()) {
            signals.add("Runtime summary " + runtimeSummary + " came from popup/native-host context.");
        }
        if (!locator.isBlank()) {
            signals.add("Recommended locator " + locator + " is ready for clipboard or DSL handoff.");
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "READY");
        response.put("title", pageTitle);
        response.put("url", pageUrl);
        response.put("domain", pageDomain);
        response.put("host", pageDomain);
        response.put("path", pagePath);
        response.put("runtimeSummary", runtimeSummary);
        response.put("summary", buildSummary(pageTitle, pageDomain, pagePath, runtimeSummary, locator));
        response.put("signals", signals);
        response.put("recommendedAction", !nextAction.isBlank()
                ? nextAction
                : !locator.isBlank()
                    ? "Open the platform or send the recommended locator into DSL review."
                    : "Refresh popup context or open the platform for deeper inspection.");
        return response;
    }

    public Map<String, Object> preparePlatformHandoff(String requestBody) {
        Map<String, Object> payload = parseBody(requestBody);
        String target = textOr(payload, "target", "execution").toLowerCase(Locale.ROOT);
        Map<String, String> params = new LinkedHashMap<>();
        params.put("source", "plugin");

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "READY");

        switch (target) {
            case "execution" -> {
                params.put("screen", "execution");
                copyIfPresent(payload, params, "runId", "projectKey", "owner", "environment", "targetUrl", "detail");
                response.put("screen", "execution");
                response.put("handoffKind", "platform-execution");
                response.put("summary", "Open the platform execution workspace with popup page context prefilled.");
            }
            case "aigenerate" -> {
                params.put("screen", "aiGenerate");
                copyIfPresent(payload, params, "projectKey", "projectName", "pageTitle", "pageUrl", "locator");
                response.put("screen", "aiGenerate");
                response.put("handoffKind", "platform-ai-generate");
                response.put("summary", "Open the platform AI generate workspace with locator review context.");
            }
            default -> throw new IllegalArgumentException("Unsupported platform handoff target: " + target);
        }

        String url = buildUrl(params);
        response.put("url", url);
        return response;
    }

    private String buildUrl(Map<String, String> params) {
        StringBuilder builder = new StringBuilder(platformBaseUri.toString());
        builder.append(platformBaseUri.toString().contains("?") ? "&" : "?");
        boolean first = true;
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (entry.getValue() == null || entry.getValue().isBlank()) {
                continue;
            }
            if (!first) {
                builder.append("&");
            }
            first = false;
            builder.append(encode(entry.getKey())).append("=").append(encode(entry.getValue()));
        }
        return builder.toString();
    }

    private void copyIfPresent(Map<String, Object> source, Map<String, String> target, String... keys) {
        for (String key : keys) {
            String value = textOr(source, key, "");
            if (!value.isBlank()) {
                target.put(key, value);
            }
        }
    }

    private String buildRuntimeSummary(String runtimeMode, String queueState, String auditState) {
        List<String> parts = new ArrayList<>();
        if (!runtimeMode.isBlank()) {
            parts.add(runtimeMode);
        }
        if (!queueState.isBlank()) {
            parts.add(queueState);
        }
        if (!auditState.isBlank()) {
            parts.add(auditState);
        }
        return String.join(" | ", parts);
    }

    private String buildSummary(
            String pageTitle,
            String pageDomain,
            String pagePath,
            String runtimeSummary,
            String locator) {
        String route = !pageDomain.isBlank()
                ? pageDomain + (pagePath.isBlank() ? "" : pagePath)
                : (!pagePath.isBlank() ? pagePath : pageTitle);
        StringBuilder builder = new StringBuilder("Viewing ")
                .append(pageTitle.isBlank() ? "the current tab" : pageTitle)
                .append(" on ")
                .append(route.isBlank() ? "the current page" : route)
                .append(".");
        if (!runtimeSummary.isBlank()) {
            builder.append(" Runtime: ").append(runtimeSummary).append(".");
        }
        if (!locator.isBlank()) {
            builder.append(" Locator ").append(locator).append(" is ready.");
        }
        return builder.toString();
    }

    private String hostFromUrl(String rawUrl) {
        if (rawUrl.isBlank()) {
            return "";
        }
        try {
            return URI.create(rawUrl).getHost();
        } catch (RuntimeException exception) {
            return "";
        }
    }

    private String pathFromUrl(String rawUrl) {
        if (rawUrl.isBlank()) {
            return "";
        }
        try {
            String path = URI.create(rawUrl).getPath();
            return path == null ? "" : path;
        } catch (RuntimeException exception) {
            return "";
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseBody(String requestBody) {
        if (requestBody == null || requestBody.isBlank()) {
            return Map.of();
        }
        Object parsed = Jsons.readValue(requestBody, Map.class);
        if (parsed instanceof Map<?, ?> map) {
            Map<String, Object> typed = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getKey() != null) {
                    typed.put(String.valueOf(entry.getKey()), entry.getValue());
                }
            }
            return typed;
        }
        return Map.of();
    }

    private String textOr(Map<String, Object> payload, String key, String fallback) {
        Object value = payload.get(key);
        if (value == null) {
            return fallback;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? fallback : text;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
