package com.example.webtest.browser.page;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.webtest.browser.observer.ConsoleEvent;
import com.example.webtest.browser.observer.EventCheckpoint;
import com.example.webtest.browser.observer.EventDelta;
import com.example.webtest.browser.observer.NetworkEvent;
import com.example.webtest.cdp.client.CdpClient;
import com.example.webtest.cdp.event.CdpEventListener;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.json.Jsons;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class DefaultPageControllerTest {
    @TempDir
    Path tempDir;

    @Test
    void consoleCheckpointReturnsEventsSinceCheckpoint() {
        FakeCdpClient cdpClient = new FakeCdpClient();
        DefaultPageController controller = new DefaultPageController(cdpClient);
        ExecutionContext context = new ExecutionContext("run-1");

        controller.startConsoleCapture(context);
        cdpClient.emit("Runtime.consoleAPICalled", Map.of(
                "timestamp", 1776384000D,
                "type", "log",
                "args", List.of(Map.of("value", "before"))));
        EventCheckpoint checkpoint = controller.consoleCheckpoint(context);
        cdpClient.emit("Runtime.consoleAPICalled", Map.of(
                "timestamp", 1776384001D,
                "type", "error",
                "args", List.of(Map.of("value", "after one"))));
        cdpClient.emit("Runtime.consoleAPICalled", Map.of(
                "timestamp", 1776384002D,
                "type", "warning",
                "args", List.of(Map.of("value", "after two"))));

        EventDelta<ConsoleEvent> delta = controller.consoleEventsSince(context, checkpoint);

        assertEquals(List.of(
                "Runtime.enable"), cdpClient.sentMethods);
        assertEquals(2, delta.getEvents().size());
        assertEquals("after one", delta.getEvents().get(0).getMessage());
        assertEquals("after two", delta.getEvents().get(1).getMessage());
        assertEquals(3, delta.getCheckpoint().getPosition());
        assertEquals(0, controller.consoleEventsSince(context, delta.getCheckpoint()).getEvents().size());
    }

    @Test
    void startNetworkCaptureRecordsHeadersAndResponseBody() {
        FakeCdpClient cdpClient = new FakeCdpClient();
        DefaultPageController controller = new DefaultPageController(cdpClient);
        ExecutionContext context = new ExecutionContext("run-1");

        controller.startNetworkCapture(context);
        cdpClient.emit("Network.requestWillBeSent", Map.of(
                "requestId", "request-1",
                "wallTime", 1776384000D,
                "request", Map.of(
                        "url", "https://example.test/api",
                        "method", "POST",
                        "headers", Map.of("content-type", "application/json"),
                        "postData", "{\"query\":\"hello\"}")));
        cdpClient.emit("Network.responseReceived", Map.of(
                "requestId", "request-1",
                "wallTime", 1776384001D,
                "response", Map.of(
                        "url", "https://example.test/api",
                        "status", 200,
                        "headers", Map.of("x-trace", "abc"),
                        "mimeType", "application/json")));
        cdpClient.emit("Network.loadingFinished", Map.of(
                "requestId", "request-1",
                "wallTime", 1776384002D,
                "encodedDataLength", 19D));

        List<NetworkEvent> events = controller.networkEvents(context);

        assertEquals(List.of(
                "Network.enable",
                "Network.getResponseBody"), cdpClient.sentMethods);
        assertEquals(3, events.size());
        assertEquals("request", events.get(0).getEvent());
        assertEquals("POST", events.get(0).getMethod());
        assertEquals(Map.of("content-type", "application/json"), events.get(0).getRequestHeaders());
        assertEquals("{\"query\":\"hello\"}", events.get(0).getRequestBody());
        assertEquals(false, events.get(0).getRequestBodyTruncated());
        assertEquals("response", events.get(1).getEvent());
        assertEquals(200, events.get(1).getStatus());
        assertEquals(Map.of("x-trace", "abc"), events.get(1).getResponseHeaders());
        assertEquals("body", events.get(2).getEvent());
        assertEquals(19D, events.get(2).getEncodedDataLength());
        assertEquals("{\"ok\":true}", events.get(2).getResponseBody());
        assertEquals(false, events.get(2).getResponseBodyBase64Encoded());
        assertEquals(false, events.get(2).getResponseBodyTruncated());
    }

    @Test
    void networkCaptureSpoolsFullBodyWhenPreviewIsTruncated() throws IOException {
        FakeCdpClient cdpClient = new FakeCdpClient();
        cdpClient.responseBody = "x".repeat(12001);
        DefaultPageController controller = new DefaultPageController(cdpClient);
        ExecutionContext context = new ExecutionContext("run-1");

        controller.startNetworkCapture(context);
        cdpClient.emit("Network.requestWillBeSent", Map.of(
                "requestId", "request-1",
                "request", Map.of(
                        "url", "https://example.test/api",
                        "method", "POST",
                        "postData", "y".repeat(12001))));
        cdpClient.emit("Network.loadingFinished", Map.of(
                "requestId", "request-1",
                "encodedDataLength", 12001D));

        List<NetworkEvent> events = controller.networkEvents(context);

        assertEquals(12000, events.get(0).getRequestBody().length());
        assertNull(events.get(0).getRequestBodyFull());
        assertEquals(12001, Files.readString(events.get(0).getRequestBodySpoolPath()).length());
        assertEquals(true, events.get(0).getRequestBodyTruncated());
        assertEquals(12000, events.get(1).getResponseBody().length());
        assertNull(events.get(1).getResponseBodyFull());
        assertEquals(12001, Files.readString(events.get(1).getResponseBodySpoolPath()).length());
        assertEquals(true, events.get(1).getResponseBodyTruncated());
    }

    @Test
    void cleanupNetworkBodySpoolsDeletesTemporaryFiles() throws IOException {
        FakeCdpClient cdpClient = new FakeCdpClient();
        cdpClient.responseBody = "x".repeat(12001);
        DefaultPageController controller = new DefaultPageController(cdpClient, tempDir);
        ExecutionContext context = new ExecutionContext("run-1");

        controller.startNetworkCapture(context);
        cdpClient.emit("Network.requestWillBeSent", Map.of(
                "requestId", "request-1",
                "request", Map.of(
                        "url", "https://example.test/api",
                        "method", "POST",
                        "postData", "y".repeat(12001))));
        cdpClient.emit("Network.loadingFinished", Map.of(
                "requestId", "request-1",
                "encodedDataLength", 12001D));
        List<NetworkEvent> events = controller.networkEvents(context);
        var requestSpool = events.get(0).getRequestBodySpoolPath();
        var responseSpool = events.get(1).getResponseBodySpoolPath();

        controller.cleanupNetworkBodySpools(context);

        assertFalse(Files.exists(requestSpool));
        assertFalse(Files.exists(responseSpool));
        assertNull(events.get(0).getRequestBodySpoolPath());
        assertNull(events.get(1).getResponseBodySpoolPath());
    }

    @Test
    void startupSweepDeletesOnlyStaleOrphanNetworkBodySpools() throws IOException {
        Path staleSpool = Files.writeString(tempDir.resolve("webtest-network-body-stale.tmp"), "old");
        Path recentSpool = Files.writeString(tempDir.resolve("webtest-network-body-recent.tmp"), "new");
        Path unrelated = Files.writeString(tempDir.resolve("webtest-network-body-stale.log"), "old");
        Files.setLastModifiedTime(staleSpool, FileTime.from(Instant.now().minus(2, ChronoUnit.HOURS)));
        Files.setLastModifiedTime(recentSpool, FileTime.from(Instant.now()));
        Files.setLastModifiedTime(unrelated, FileTime.from(Instant.now().minus(2, ChronoUnit.HOURS)));

        new DefaultPageController(new FakeCdpClient(), tempDir);

        assertFalse(Files.exists(staleSpool));
        assertTrue(Files.exists(recentSpool));
        assertTrue(Files.exists(unrelated));
    }

    @Test
    void startupSweepUsesConfiguredOrphanNetworkBodySpoolMinAge() throws IOException {
        Path staleSpool = Files.writeString(tempDir.resolve("webtest-network-body-stale.tmp"), "old");
        Path recentSpool = Files.writeString(tempDir.resolve("webtest-network-body-recent.tmp"), "new");
        Files.setLastModifiedTime(staleSpool, FileTime.from(Instant.now().minus(10, ChronoUnit.MINUTES)));
        Files.setLastModifiedTime(recentSpool, FileTime.from(Instant.now().minus(2, ChronoUnit.MINUTES)));

        new DefaultPageController(new FakeCdpClient(), tempDir, Duration.ofMinutes(5));

        assertFalse(Files.exists(staleSpool));
        assertTrue(Files.exists(recentSpool));
    }

    @Test
    void runtimeConfigurationUpdatesOrphanNetworkBodySpoolMinAge() throws IOException {
        Path staleSpool = Files.writeString(tempDir.resolve("webtest-network-body-stale.tmp"), "old");
        Path recentSpool = Files.writeString(tempDir.resolve("webtest-network-body-recent.tmp"), "new");
        Files.setLastModifiedTime(staleSpool, FileTime.from(Instant.now().minus(10, ChronoUnit.MINUTES)));
        Files.setLastModifiedTime(recentSpool, FileTime.from(Instant.now().minus(2, ChronoUnit.MINUTES)));
        DefaultPageController controller = new DefaultPageController(new FakeCdpClient(), tempDir, Duration.ofHours(1));

        controller.configureNetworkBodySpoolCleanupGrace(new ExecutionContext("run-1"), Duration.ofMinutes(5));

        assertFalse(Files.exists(staleSpool));
        assertTrue(Files.exists(recentSpool));
    }

    @Test
    void startupSweepRejectsInvalidSystemPropertyMinAge() {
        String property = DefaultPageController.ORPHANED_NETWORK_BODY_SPOOL_MIN_AGE_SECONDS_PROPERTY;
        String original = System.getProperty(property);
        System.setProperty(property, "not-a-number");
        try {
            assertThrows(IllegalArgumentException.class, () -> new DefaultPageController(new FakeCdpClient()));
        } finally {
            if (original == null) {
                System.clearProperty(property);
            } else {
                System.setProperty(property, original);
            }
        }
    }

    private static final class FakeCdpClient implements CdpClient {
        private final Map<String, List<CdpEventListener>> listeners = new HashMap<>();
        private final List<String> sentMethods = new ArrayList<>();
        private String responseBody = "{\"ok\":true}";

        @Override
        public void connect(String wsUrl) {
        }

        @Override
        public void close() {
        }

        @Override
        public <T> T send(String method, Object params, Class<T> responseType) {
            sentMethods.add(method);
            if ("Network.getResponseBody".equals(method)) {
                JsonNode body = Jsons.JSON.valueToTree(Map.of(
                        "body", responseBody,
                        "base64Encoded", false));
                return responseType.cast(body);
            }
            return responseType.cast(Jsons.JSON.createObjectNode());
        }

        @Override
        public void addEventListener(String eventName, CdpEventListener listener) {
            listeners.computeIfAbsent(eventName, ignored -> new ArrayList<>()).add(listener);
        }

        @Override
        public void removeEventListener(String eventName, CdpEventListener listener) {
            listeners.computeIfAbsent(eventName, ignored -> new ArrayList<>()).remove(listener);
        }

        private void emit(String eventName, Object params) {
            for (CdpEventListener listener : listeners.getOrDefault(eventName, List.of())) {
                listener.onEvent(eventName, params);
            }
        }
    }
}
