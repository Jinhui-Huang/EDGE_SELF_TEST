package com.example.webtest.artifact.collector;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.example.webtest.artifact.model.ArtifactRef;
import com.example.webtest.browser.observer.ConsoleEvent;
import com.example.webtest.browser.observer.NetworkEvent;
import com.example.webtest.browser.page.ElementState;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
import com.example.webtest.execution.context.ExecutionContext;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class DefaultArtifactCollectorTest {
    @TempDir
    Path tempDir;

    @Test
    void captureScreenshotWritesPngAndReturnsReference() throws IOException {
        DefaultArtifactCollector collector = new DefaultArtifactCollector(new FakePageController());

        ArtifactRef ref = collector.captureScreenshot(tempDir, "step-1", new ExecutionContext("run-1"));

        assertEquals("screenshot", ref.getType());
        assertEquals("image/png", ref.getContentType());
        assertEquals(tempDir.resolve("step-1.png"), ref.getPath());
        assertNotNull(ref.getCreatedAt());
        assertArrayEquals(new byte[] {1, 2, 3}, Files.readAllBytes(ref.getPath()));
    }

    @Test
    void captureDomDumpWritesHtmlAndReturnsReference() throws IOException {
        DefaultArtifactCollector collector = new DefaultArtifactCollector(new FakePageController());

        ArtifactRef ref = collector.captureDomDump(tempDir, "step-1-dom", new ExecutionContext("run-1"));

        assertEquals("dom", ref.getType());
        assertEquals("text/html", ref.getContentType());
        assertEquals(tempDir.resolve("step-1-dom.html"), ref.getPath());
        assertNotNull(ref.getCreatedAt());
        assertEquals("<html><body>snapshot</body></html>", Files.readString(ref.getPath()));
    }

    @Test
    void captureConsoleDumpWritesJsonAndReturnsReference() throws IOException {
        DefaultArtifactCollector collector = new DefaultArtifactCollector(new FakePageController());

        ArtifactRef ref = collector.captureConsoleDump(tempDir, "step-1-console", new ExecutionContext("run-1"));

        assertEquals("console", ref.getType());
        assertEquals("application/json", ref.getContentType());
        assertEquals(tempDir.resolve("step-1-console.json"), ref.getPath());
        assertNotNull(ref.getCreatedAt());
        String json = Files.readString(ref.getPath());
        assertEquals(true, json.contains("\"level\":\"error\""));
        assertEquals(true, json.contains("\"message\":\"boom\""));
    }

    @Test
    void captureConsoleDumpCanWriteProvidedEventSubset() throws IOException {
        DefaultArtifactCollector collector = new DefaultArtifactCollector(new FakePageController());
        ConsoleEvent event = new ConsoleEvent();
        event.setTime(Instant.parse("2026-04-17T00:00:02Z"));
        event.setLevel("info");
        event.setMessage("step only");

        ArtifactRef ref = collector.captureConsoleDump(tempDir, "step-1-after-console", List.of(event));

        assertEquals("console", ref.getType());
        String json = Files.readString(ref.getPath());
        assertEquals(true, json.contains("\"message\":\"step only\""));
        assertEquals(false, json.contains("\"message\":\"boom\""));
    }

    @Test
    void captureNetworkDumpWritesJsonAndReturnsReference() throws IOException {
        DefaultArtifactCollector collector = new DefaultArtifactCollector(new FakePageController());

        ArtifactRef ref = collector.captureNetworkDump(tempDir, "step-1-network", new ExecutionContext("run-1"));

        assertEquals("network", ref.getType());
        assertEquals("application/json", ref.getContentType());
        assertEquals(tempDir.resolve("step-1-network.json"), ref.getPath());
        assertNotNull(ref.getCreatedAt());
        String json = Files.readString(ref.getPath());
        assertEquals(true, json.contains("\"event\":\"response\""));
        assertEquals(true, json.contains("\"url\":\"https://example.test/api\""));
        assertEquals(true, json.contains("\"status\":200"));
        assertEquals(true, json.contains("\"responseHeaders\":{\"content-type\":\"application/json\"}"));
        assertEquals(true, json.contains("\"responseBody\":\"{\\\"ok\\\":true}\""));
        assertEquals(true, json.contains("\"responseBodyBase64Encoded\":false"));
    }

    @Test
    void captureNetworkDumpCanWriteProvidedEventSubset() throws IOException {
        DefaultArtifactCollector collector = new DefaultArtifactCollector(new FakePageController());
        NetworkEvent event = new NetworkEvent();
        event.setTime(Instant.parse("2026-04-17T00:00:03Z"));
        event.setEvent("request");
        event.setRequestId("request-2");
        event.setUrl("https://example.test/step");
        event.setMethod("POST");

        ArtifactRef ref = collector.captureNetworkDump(tempDir, "step-1-after-network", List.of(event));

        assertEquals("network", ref.getType());
        String json = Files.readString(ref.getPath());
        assertEquals(true, json.contains("\"url\":\"https://example.test/step\""));
        assertEquals(false, json.contains("\"url\":\"https://example.test/api\""));
    }

    @Test
    void captureNetworkDumpWritesLargeBodySidecarArtifacts() throws IOException {
        DefaultArtifactCollector collector = new DefaultArtifactCollector(new FakePageController());
        String requestBody = "request-".repeat(2000);
        String responseBody = "response-".repeat(2000);
        NetworkEvent event = new NetworkEvent();
        event.setEvent("body");
        event.setRequestId("request/large:1");
        event.setRequestBody(requestBody.substring(0, 12000));
        event.setRequestBodyFull(requestBody);
        event.setRequestBodyTruncated(true);
        event.setResponseBody(responseBody.substring(0, 12000));
        event.setResponseBodyFull(responseBody);
        event.setResponseBodyBase64Encoded(false);
        event.setResponseBodyTruncated(true);

        ArtifactRef ref = collector.captureNetworkDump(tempDir, "step-1-network", List.of(event));

        assertEquals(2, ref.getRelatedArtifacts().size());
        assertEquals("network-request-body", ref.getRelatedArtifacts().get(0).getType());
        assertEquals(tempDir.resolve("step-1-network-bodies").resolve("001-request-large-1-request-body.txt"),
                ref.getRelatedArtifacts().get(0).getPath());
        assertEquals("text/plain", ref.getRelatedArtifacts().get(0).getContentType());
        assertEquals("network-response-body", ref.getRelatedArtifacts().get(1).getType());
        assertEquals(tempDir.resolve("step-1-network-bodies").resolve("001-request-large-1-response-body.txt"),
                ref.getRelatedArtifacts().get(1).getPath());
        assertEquals("text/plain", ref.getRelatedArtifacts().get(1).getContentType());
        String json = Files.readString(ref.getPath());
        assertEquals(true, json.contains("\"requestBodyArtifactPath\":\"step-1-network-bodies\\\\001-request-large-1-request-body.txt\"")
                || json.contains("\"requestBodyArtifactPath\":\"step-1-network-bodies/001-request-large-1-request-body.txt\""));
        assertEquals(true, json.contains("\"responseBodyArtifactPath\":\"step-1-network-bodies\\\\001-request-large-1-response-body.txt\"")
                || json.contains("\"responseBodyArtifactPath\":\"step-1-network-bodies/001-request-large-1-response-body.txt\""));
        assertEquals(
                requestBody,
                Files.readString(tempDir.resolve("step-1-network-bodies").resolve("001-request-large-1-request-body.txt")));
        assertEquals(
                responseBody,
                Files.readString(tempDir.resolve("step-1-network-bodies").resolve("001-request-large-1-response-body.txt")));
    }

    @Test
    void captureNetworkDumpWritesLargeBodySidecarsFromSpoolFiles() throws IOException {
        DefaultArtifactCollector collector = new DefaultArtifactCollector(new FakePageController());
        Path requestSpool = Files.writeString(tempDir.resolve("request-spool.tmp"), "request-".repeat(2000));
        Path responseSpool = Files.writeString(tempDir.resolve("response-spool.tmp"), "cmVzcG9uc2UtYm9keQ==");
        NetworkEvent event = new NetworkEvent();
        event.setEvent("body");
        event.setRequestId("request-spooled");
        event.setRequestBody("request-".repeat(1500));
        event.setRequestBodySpoolPath(requestSpool);
        event.setRequestBodyTruncated(true);
        event.setResponseBody("cmVzcG9uc2UtYm9keQ==");
        event.setResponseBodySpoolPath(responseSpool);
        event.setResponseBodyBase64Encoded(true);
        event.setResponseBodyTruncated(true);

        ArtifactRef ref = collector.captureNetworkDump(tempDir.resolve("out"), "step-1-network", List.of(event));

        Path requestBodyPath = tempDir.resolve("out")
                .resolve("step-1-network-bodies")
                .resolve("001-request-spooled-request-body.txt");
        Path responseBodyPath = tempDir.resolve("out")
                .resolve("step-1-network-bodies")
                .resolve("001-request-spooled-response-body.bin");
        assertEquals(2, ref.getRelatedArtifacts().size());
        assertEquals("request-".repeat(2000), Files.readString(requestBodyPath));
        assertArrayEquals("response-body".getBytes(), Files.readAllBytes(responseBodyPath));
        assertFalse(Files.exists(requestSpool));
        assertFalse(Files.exists(responseSpool));
    }

    private static final class FakePageController implements PageController {
        @Override
        public List<ConsoleEvent> consoleEvents(ExecutionContext context) {
            ConsoleEvent event = new ConsoleEvent();
            event.setTime(Instant.parse("2026-04-17T00:00:00Z"));
            event.setLevel("error");
            event.setMessage("boom");
            return List.of(event);
        }

        @Override
        public List<NetworkEvent> networkEvents(ExecutionContext context) {
            NetworkEvent event = new NetworkEvent();
            event.setTime(Instant.parse("2026-04-17T00:00:01Z"));
            event.setEvent("response");
            event.setRequestId("request-1");
            event.setUrl("https://example.test/api");
            event.setStatus(200);
            event.setResponseHeaders(Map.of("content-type", "application/json"));
            event.setMimeType("application/json");
            event.setEncodedDataLength(42D);
            event.setResponseBody("{\"ok\":true}");
            event.setResponseBodyBase64Encoded(false);
            event.setResponseBodyTruncated(false);
            return List.of(event);
        }

        @Override
        public void navigate(String url, ExecutionContext context) {
        }

        @Override
        public void reload(ExecutionContext context) {
        }

        @Override
        public String currentUrl(ExecutionContext context) {
            return "";
        }

        @Override
        public String title(ExecutionContext context) {
            return "";
        }

        @Override
        public byte[] screenshot(ExecutionContext context, ScreenshotOptions options) {
            return new byte[] {1, 2, 3};
        }

        @Override
        public String getHtml(ExecutionContext context) {
            return "<html><body>snapshot</body></html>";
        }

        @Override
        public ElementState findElement(String by, String value, Integer index, ExecutionContext context) {
            return new ElementState();
        }

        @Override
        public String elementText(String by, String value, Integer index, ExecutionContext context) {
            return "";
        }

        @Override
        public String elementValue(String by, String value, Integer index, ExecutionContext context) {
            return "";
        }

        @Override
        public String elementAttribute(
                String by, String value, Integer index, String attributeName, ExecutionContext context) {
            return "";
        }

        @Override
        public void clickElement(String by, String value, Integer index, ExecutionContext context) {
        }

        @Override
        public void fillElement(String by, String value, Integer index, String text, ExecutionContext context) {
        }
    }
}
