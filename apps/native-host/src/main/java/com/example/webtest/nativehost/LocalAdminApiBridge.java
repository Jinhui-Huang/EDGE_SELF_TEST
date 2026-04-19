package com.example.webtest.nativehost;

import com.example.webtest.json.Jsons;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

final class LocalAdminApiBridge {
    private final HttpClient httpClient;
    private final URI baseUri;

    LocalAdminApiBridge(URI baseUri) {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build(), baseUri);
    }

    LocalAdminApiBridge(HttpClient httpClient, URI baseUri) {
        this.httpClient = httpClient;
        this.baseUri = baseUri;
    }

    Map<String, Object> fetchPopupSnapshot() {
        return exchange("GET", "/api/phase3/extension-popup", null);
    }

    Map<String, Object> createSchedulerRequest(Map<String, Object> payload) {
        return exchange("POST", "/api/phase3/scheduler/requests", payload);
    }

    Map<String, Object> createSchedulerEvent(Map<String, Object> payload) {
        return exchange("POST", "/api/phase3/scheduler/events", payload);
    }

    private Map<String, Object> exchange(String method, String path, Map<String, Object> payload) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(baseUri.resolve(path))
                    .timeout(Duration.ofSeconds(10));
            if ("POST".equals(method)) {
                builder.header("Content-Type", "application/json");
                builder.POST(HttpRequest.BodyPublishers.ofString(
                        Jsons.writeValueAsString(payload == null ? Map.of() : payload),
                        StandardCharsets.UTF_8));
            } else {
                builder.GET();
            }
            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("Local admin API returned HTTP " + response.statusCode());
            }
            return Jsons.readValue(response.body(), Map.class);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to reach local admin API.", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting for local admin API.", exception);
        }
    }
}
