package com.example.webtest.nativehost;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.webtest.json.Jsons;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class NativeHostMessageProcessorTest {
    @Test
    void proxiesPopupSnapshotReadsToLocalAdminApi() throws Exception {
        try (TestHttpServer server = new TestHttpServer()) {
            server.respondJson("/api/phase3/extension-popup", Map.of(
                    "status", "READY",
                    "summary", "Bridge online",
                    "runtime", Map.of(
                            "mode", "Audit-first",
                            "queueState", "Synced",
                            "auditState", "Idle",
                            "nextAction", "Proceed")));

            NativeHostMessageProcessor processor = new NativeHostMessageProcessor(
                    new LocalAdminApiBridge(server.baseUri()));
            NativeHostResponse response = processor.process(new NativeHostRequest(
                    "1.0",
                    "POPUP_SNAPSHOT_GET",
                    "req-1",
                    Map.of()));

            assertTrue(response.ok());
            Map<String, Object> data = (Map<String, Object>) response.data();
            assertEquals("READY", data.get("status"));
            assertEquals("req-1", response.requestId());
        }
    }

    @Test
    void proxiesSchedulerWritesToLocalAdminApi() throws Exception {
        try (TestHttpServer server = new TestHttpServer()) {
            AtomicReference<String> requestBody = new AtomicReference<>();
            server.respondJson("/api/phase3/scheduler/requests", "POST", exchange -> {
                requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
                return Map.of("status", "accepted", "schedulerId", "local-phase3-scheduler");
            });

            NativeHostMessageProcessor processor = new NativeHostMessageProcessor(
                    new LocalAdminApiBridge(server.baseUri()));
            NativeHostResponse response = processor.process(new NativeHostRequest(
                    "1.0",
                    "SCHEDULER_REQUEST_CREATE",
                    "req-2",
                    Map.of(
                            "runId", "popup-checkout-smoke",
                            "projectKey", "checkout-web")));

            assertTrue(response.ok());
            assertTrue(requestBody.get().contains("\"runId\":\"popup-checkout-smoke\""));
            Map<String, Object> data = (Map<String, Object>) response.data();
            assertEquals("accepted", data.get("status"));
        }
    }

    @Test
    void returnsStructuredErrorForUnsupportedRequestType() {
        NativeHostMessageProcessor processor = new NativeHostMessageProcessor(
                new LocalAdminApiBridge(URI.create("http://127.0.0.1:8787")));

        NativeHostResponse response = processor.process(new NativeHostRequest("1.0", "UNKNOWN", "req-3", Map.of()));

        assertFalse(response.ok());
        assertEquals("UNSUPPORTED_TYPE", response.error().code());
    }

    @Test
    void nativeHostAppEncodesAndDecodesLengthPrefixedMessages() throws Exception {
        ByteArrayOutputStream outbound = new ByteArrayOutputStream();
        byte[] requestBytes = Jsons.writeValueAsString(Map.of(
                "version", "1.0",
                "type", "PING",
                "requestId", "req-4",
                "payload", Map.of())).getBytes(StandardCharsets.UTF_8);
        NativeHostApp.writeMessage(outbound, requestBytes);

        ByteArrayInputStream inbound = new ByteArrayInputStream(outbound.toByteArray());
        ByteArrayOutputStream responseStream = new ByteArrayOutputStream();
        NativeHostApp.run(inbound, responseStream, new NativeHostMessageProcessor(
                new LocalAdminApiBridge(URI.create("http://127.0.0.1:8787"))));

        byte[] rawResponse = responseStream.toByteArray();
        int length = ByteBuffer.wrap(rawResponse, 0, 4).order(ByteOrder.nativeOrder()).getInt();
        byte[] body = new byte[length];
        System.arraycopy(rawResponse, 4, body, 0, length);
        NativeHostResponse response = Jsons.readValue(new String(body, StandardCharsets.UTF_8), NativeHostResponse.class);

        assertTrue(response.ok());
        Map<String, Object> data = (Map<String, Object>) response.data();
        assertEquals("READY", data.get("status"));
    }

    @Test
    void parsesEdgeLaunchArgumentsWithoutRejectingOriginOrParentWindow() {
        NativeHostApp.LaunchOptions options = NativeHostApp.parseArguments(new String[] {
                "chrome-extension://abcdefghijklmnopabcdefghijklmnop/",
                "--parent-window=0",
                "--api-base-url",
                "http://127.0.0.1:9898"
        });

        assertEquals(URI.create("http://127.0.0.1:9898"), options.apiBaseUri());
        assertEquals("chrome-extension://abcdefghijklmnopabcdefghijklmnop/", options.callerOrigin());
        assertEquals("0", options.parentWindow());
        assertFalse(options.helpRequested());
    }

    @Test
    void rejectsUnknownArguments() {
        try {
            NativeHostApp.parseArguments(new String[] {"--unexpected"});
        } catch (IllegalArgumentException exception) {
            assertTrue(exception.getMessage().contains("--unexpected"));
            return;
        }
        throw new AssertionError("Expected IllegalArgumentException for unknown argument.");
    }

    private static final class TestHttpServer implements AutoCloseable {
        private final HttpServer server;
        private final URI baseUri;

        private TestHttpServer() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.start();
            baseUri = URI.create("http://127.0.0.1:" + server.getAddress().getPort());
        }

        private URI baseUri() {
            return baseUri;
        }

        private void respondJson(String path, Map<String, Object> body) {
            respondJson(path, "GET", exchange -> body);
        }

        private void respondJson(String path, String method, JsonHandler handler) {
            server.createContext(path, exchange -> {
                if (!exchange.getRequestMethod().equalsIgnoreCase(method)) {
                    exchange.sendResponseHeaders(405, -1);
                    exchange.close();
                    return;
                }
                Map<String, Object> body = handler.handle(exchange);
                byte[] payload = Jsons.writeValueAsString(body).getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, payload.length);
                exchange.getResponseBody().write(payload);
                exchange.close();
            });
        }

        @Override
        public void close() {
            server.stop(0);
        }
    }

    @FunctionalInterface
    private interface JsonHandler {
        Map<String, Object> handle(HttpExchange exchange) throws IOException;
    }
}
