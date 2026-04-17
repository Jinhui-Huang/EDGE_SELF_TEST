package com.example.webtest.browser.page;

import com.example.webtest.cdp.client.CdpClient;
import com.example.webtest.cdp.event.CdpEventListener;
import com.example.webtest.browser.observer.ConsoleEvent;
import com.example.webtest.browser.observer.NetworkEvent;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.json.Jsons;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

public class DefaultPageController implements PageController {
    private static final int MAX_CAPTURED_BODY_CHARS = 12_000;
    private static final String NETWORK_BODY_SPOOL_PREFIX = "webtest-network-body-";
    private static final String NETWORK_BODY_SPOOL_SUFFIX = ".tmp";
    private static final Duration ORPHANED_NETWORK_BODY_SPOOL_MIN_AGE = Duration.ofHours(1);

    private final CdpClient cdpClient;
    private final Path tempDirectory;
    private final List<ConsoleEvent> consoleEvents = new CopyOnWriteArrayList<>();
    private final List<NetworkEvent> networkEvents = new CopyOnWriteArrayList<>();
    private final CdpEventListener consoleListener = this::recordConsoleEvent;
    private final CdpEventListener requestListener = this::recordNetworkRequest;
    private final CdpEventListener responseListener = this::recordNetworkResponse;
    private final CdpEventListener loadingFinishedListener = this::recordNetworkBody;
    private final CdpEventListener failureListener = this::recordNetworkFailure;
    private volatile boolean consoleCaptureStarted;
    private volatile boolean networkCaptureStarted;

    public DefaultPageController(CdpClient cdpClient) {
        this(cdpClient, Path.of(System.getProperty("java.io.tmpdir")));
    }

    DefaultPageController(CdpClient cdpClient, Path tempDirectory) {
        this.cdpClient = cdpClient;
        this.tempDirectory = tempDirectory;
        cleanupOrphanedNetworkBodySpools();
    }

    @Override
    public synchronized void startConsoleCapture(ExecutionContext context) {
        consoleEvents.clear();
        if (consoleCaptureStarted) {
            return;
        }
        cdpClient.addEventListener("Runtime.consoleAPICalled", consoleListener);
        cdpClient.send("Runtime.enable", MapParams.empty(), JsonNode.class);
        consoleCaptureStarted = true;
    }

    @Override
    public List<ConsoleEvent> consoleEvents(ExecutionContext context) {
        return new ArrayList<>(consoleEvents);
    }

    @Override
    public synchronized void startNetworkCapture(ExecutionContext context) {
        cleanupNetworkBodySpools(context);
        networkEvents.clear();
        if (networkCaptureStarted) {
            return;
        }
        cdpClient.addEventListener("Network.requestWillBeSent", requestListener);
        cdpClient.addEventListener("Network.responseReceived", responseListener);
        cdpClient.addEventListener("Network.loadingFinished", loadingFinishedListener);
        cdpClient.addEventListener("Network.loadingFailed", failureListener);
        cdpClient.send("Network.enable", MapParams.empty(), JsonNode.class);
        networkCaptureStarted = true;
    }

    @Override
    public List<NetworkEvent> networkEvents(ExecutionContext context) {
        for (NetworkEvent event : networkEvents) {
            if ("body".equals(event.getEvent()) && event.getResponseBody() == null && event.getBodyError() == null) {
                captureResponseBody(event);
            }
        }
        return new ArrayList<>(networkEvents);
    }

    @Override
    public void cleanupNetworkBodySpools(ExecutionContext context) {
        for (NetworkEvent event : networkEvents) {
            cleanupSpoolPath(event.getRequestBodySpoolPath());
            event.setRequestBodySpoolPath(null);
            cleanupSpoolPath(event.getResponseBodySpoolPath());
            event.setResponseBodySpoolPath(null);
        }
    }

    @Override
    public void navigate(String url, ExecutionContext context) {
        cdpClient.send("Page.enable", MapParams.empty(), JsonNode.class);
        CountDownLatch loaded = new CountDownLatch(1);
        CdpEventListener listener = (eventName, params) -> loaded.countDown();
        cdpClient.addEventListener("Page.loadEventFired", listener);
        try {
            cdpClient.send("Page.navigate", MapParams.of("url", url), JsonNode.class);
            if (!loaded.await(5, TimeUnit.SECONDS)) {
                throw new BaseException(ErrorCodes.CDP_REQUEST_FAILED, "Timed out waiting for page load event");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BaseException(ErrorCodes.CDP_REQUEST_FAILED, "Interrupted while waiting for page load event", e);
        } finally {
            cdpClient.removeEventListener("Page.loadEventFired", listener);
        }
    }

    @Override
    public void reload(ExecutionContext context) {
        cdpClient.send("Page.reload", MapParams.empty(), JsonNode.class);
    }

    @Override
    public String currentUrl(ExecutionContext context) {
        return evaluateString("window.location.href");
    }

    @Override
    public String title(ExecutionContext context) {
        return evaluateString("document.title");
    }

    @Override
    public byte[] screenshot(ExecutionContext context, ScreenshotOptions options) {
        ScreenshotOptions safeOptions = options == null ? new ScreenshotOptions() : options;
        JsonNode response = cdpClient.send(
                "Page.captureScreenshot",
                Map.of(
                        "format", safeOptions.getFormat(),
                        "captureBeyondViewport", safeOptions.isFullPage()),
                JsonNode.class);
        JsonNode data = response == null ? null : response.get("data");
        if (data == null || data.asText().isBlank()) {
            throw notImplemented("Page.captureScreenshot returned no data");
        }
        return Base64.getDecoder().decode(data.asText());
    }

    @Override
    public String getHtml(ExecutionContext context) {
        return evaluateString("document.documentElement.outerHTML");
    }

    @Override
    public ElementState findElement(String by, String value, Integer index, ExecutionContext context) {
        JsonNode valueNode = evaluate(locatorScript(by, value, index, "state", null));
        return Jsons.JSON.convertValue(valueNode, ElementState.class);
    }

    @Override
    public String elementText(String by, String value, Integer index, ExecutionContext context) {
        JsonNode result = evaluate(locatorScript(by, value, index, "text", null));
        boolean ok = result != null && result.path("ok").asBoolean(false);
        if (!ok) {
            String message = result == null ? "unknown error" : result.path("message").asText("unknown error");
            throw new BaseException(ErrorCodes.ELEMENT_NOT_FOUND, "Failed to read element text: " + message);
        }
        return result.path("text").asText("");
    }

    @Override
    public String elementValue(String by, String value, Integer index, ExecutionContext context) {
        JsonNode result = evaluate(locatorScript(by, value, index, "value", null));
        boolean ok = result != null && result.path("ok").asBoolean(false);
        if (!ok) {
            String message = result == null ? "unknown error" : result.path("message").asText("unknown error");
            throw new BaseException(ErrorCodes.ELEMENT_NOT_FOUND, "Failed to read element value: " + message);
        }
        return result.path("value").asText("");
    }

    @Override
    public String elementAttribute(String by, String value, Integer index, String attributeName, ExecutionContext context) {
        JsonNode result = evaluate(locatorScript(by, value, index, "attribute", attributeName));
        boolean ok = result != null && result.path("ok").asBoolean(false);
        if (!ok) {
            String message = result == null ? "unknown error" : result.path("message").asText("unknown error");
            throw new BaseException(ErrorCodes.ELEMENT_NOT_FOUND, "Failed to read element attribute: " + message);
        }
        JsonNode attributeValue = result.get("value");
        return attributeValue == null || attributeValue.isNull() ? null : attributeValue.asText();
    }

    @Override
    public void clickElement(String by, String value, Integer index, ExecutionContext context) {
        JsonNode result = evaluate(locatorScript(by, value, index, "click", null));
        assertDomActionSucceeded(result, "click");
    }

    @Override
    public void fillElement(String by, String value, Integer index, String text, ExecutionContext context) {
        JsonNode result = evaluate(locatorScript(by, value, index, "fill", text == null ? "" : text));
        assertDomActionSucceeded(result, "fill");
    }

    private BaseException notImplemented(String operation) {
        return new BaseException(
                ErrorCodes.CDP_REQUEST_FAILED,
                "Browser page operation is not implemented yet: " + operation);
    }

    private void recordConsoleEvent(String eventName, Object params) {
        JsonNode node = Jsons.JSON.convertValue(params, JsonNode.class);
        ConsoleEvent event = new ConsoleEvent();
        event.setTime(consoleTimestamp(node.get("timestamp")));
        event.setLevel(node.path("type").asText("log"));
        event.setMessage(consoleMessage(node.get("args")));
        consoleEvents.add(event);
    }

    private Instant consoleTimestamp(JsonNode timestamp) {
        if (timestamp == null || timestamp.isMissingNode() || !timestamp.isNumber()) {
            return Instant.now();
        }
        double raw = timestamp.asDouble();
        if (raw > 10_000_000_000D) {
            return Instant.ofEpochMilli((long) raw);
        }
        return Instant.ofEpochMilli((long) (raw * 1000D));
    }

    private String consoleMessage(JsonNode args) {
        if (args == null || !args.isArray()) {
            return "";
        }
        List<String> parts = new ArrayList<>();
        for (JsonNode arg : args) {
            JsonNode value = arg.get("value");
            if (value != null && !value.isMissingNode() && !value.isNull()) {
                parts.add(value.isTextual() ? value.asText() : value.toString());
                continue;
            }
            String description = arg.path("description").asText("");
            if (!description.isBlank()) {
                parts.add(description);
                continue;
            }
            parts.add(arg.path("type").asText(""));
        }
        return String.join(" ", parts);
    }

    private void recordNetworkRequest(String eventName, Object params) {
        JsonNode node = Jsons.JSON.convertValue(params, JsonNode.class);
        JsonNode request = node.path("request");
        NetworkEvent event = baseNetworkEvent(node, "request");
        event.setUrl(request.path("url").asText(null));
        event.setMethod(request.path("method").asText(null));
        event.setRequestHeaders(objectMap(request.get("headers")));
        setCapturedBody(
                event::setRequestBody,
                event::setRequestBodyFull,
                event::setRequestBodySpoolPath,
                event::setRequestBodyTruncated,
                request.path("postData").asText(null));
        networkEvents.add(event);
    }

    private void recordNetworkResponse(String eventName, Object params) {
        JsonNode node = Jsons.JSON.convertValue(params, JsonNode.class);
        JsonNode response = node.path("response");
        NetworkEvent event = baseNetworkEvent(node, "response");
        event.setUrl(response.path("url").asText(null));
        event.setStatus(response.has("status") ? response.path("status").asInt() : null);
        event.setResponseHeaders(objectMap(response.get("headers")));
        event.setMimeType(response.path("mimeType").asText(null));
        networkEvents.add(event);
    }

    private void recordNetworkBody(String eventName, Object params) {
        JsonNode node = Jsons.JSON.convertValue(params, JsonNode.class);
        NetworkEvent event = baseNetworkEvent(node, "body");
        event.setEncodedDataLength(node.has("encodedDataLength") ? node.path("encodedDataLength").asDouble() : null);
        networkEvents.add(event);
    }

    private void captureResponseBody(NetworkEvent event) {
        try {
            JsonNode response = cdpClient.send(
                    "Network.getResponseBody",
                    MapParams.of("requestId", event.getRequestId()),
                    JsonNode.class);
            String body = response == null ? null : response.path("body").asText(null);
            event.setResponseBodyBase64Encoded(
                    response == null || !response.has("base64Encoded") ? null : response.path("base64Encoded").asBoolean());
            setCapturedBody(
                    event::setResponseBody,
                    event::setResponseBodyFull,
                    event::setResponseBodySpoolPath,
                    event::setResponseBodyTruncated,
                    body);
        } catch (RuntimeException e) {
            event.setBodyError(e.getMessage());
        }
    }

    private void recordNetworkFailure(String eventName, Object params) {
        JsonNode node = Jsons.JSON.convertValue(params, JsonNode.class);
        NetworkEvent event = baseNetworkEvent(node, "failure");
        event.setErrorText(node.path("errorText").asText(null));
        networkEvents.add(event);
    }

    private NetworkEvent baseNetworkEvent(JsonNode node, String eventType) {
        NetworkEvent event = new NetworkEvent();
        event.setEvent(eventType);
        event.setTime(networkTimestamp(node));
        event.setRequestId(node.path("requestId").asText(null));
        return event;
    }

    private Map<String, Object> objectMap(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull() || !node.isObject()) {
            return null;
        }
        return Jsons.JSON.convertValue(node, Map.class);
    }

    private void setCapturedBody(
            Consumer<String> bodySetter,
            Consumer<String> fullBodySetter,
            Consumer<Path> spoolPathSetter,
            Consumer<Boolean> truncatedSetter,
            String body) {
        if (body == null) {
            return;
        }
        boolean truncated = body.length() > MAX_CAPTURED_BODY_CHARS;
        if (truncated) {
            Path spoolPath = spoolBody(body);
            if (spoolPath == null) {
                fullBodySetter.accept(body);
            } else {
                spoolPathSetter.accept(spoolPath);
            }
        }
        bodySetter.accept(truncated ? body.substring(0, MAX_CAPTURED_BODY_CHARS) : body);
        truncatedSetter.accept(truncated);
    }

    private Path spoolBody(String body) {
        try {
            Path path = Files.createTempFile(tempDirectory, NETWORK_BODY_SPOOL_PREFIX, NETWORK_BODY_SPOOL_SUFFIX);
            Files.writeString(path, body, StandardCharsets.UTF_8);
            return path;
        } catch (IOException e) {
            return null;
        }
    }

    private void cleanupOrphanedNetworkBodySpools() {
        Instant cutoff = Instant.now().minus(ORPHANED_NETWORK_BODY_SPOOL_MIN_AGE);
        try (DirectoryStream<Path> paths = Files.newDirectoryStream(
                tempDirectory,
                NETWORK_BODY_SPOOL_PREFIX + "*" + NETWORK_BODY_SPOOL_SUFFIX)) {
            for (Path path : paths) {
                if (isStaleRegularFile(path, cutoff)) {
                    cleanupSpoolPath(path);
                }
            }
        } catch (IOException | SecurityException e) {
            // Startup cleanup is best-effort; normal run startup must continue.
        }
    }

    private boolean isStaleRegularFile(Path path, Instant cutoff) {
        try {
            FileTime modifiedAt = Files.getLastModifiedTime(path);
            return Files.isRegularFile(path) && modifiedAt.toInstant().isBefore(cutoff);
        } catch (IOException | SecurityException e) {
            return false;
        }
    }

    private void cleanupSpoolPath(Path path) {
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            // Best-effort cleanup; OS temp cleanup remains the final fallback.
        }
    }

    private Instant networkTimestamp(JsonNode node) {
        JsonNode wallTime = node.get("wallTime");
        if (wallTime != null && wallTime.isNumber()) {
            return Instant.ofEpochMilli((long) (wallTime.asDouble() * 1000D));
        }
        return Instant.now();
    }

    private String evaluateString(String expression) {
        JsonNode response = cdpClient.send(
                "Runtime.evaluate",
                Map.of("expression", expression, "returnByValue", true),
                JsonNode.class);
        JsonNode value = response == null ? null : response.at("/result/value");
        return value == null || value.isMissingNode() ? null : value.asText();
    }

    private JsonNode evaluate(String expression) {
        JsonNode response = cdpClient.send(
                "Runtime.evaluate",
                Map.of("expression", expression, "returnByValue", true),
                JsonNode.class);
        JsonNode value = response == null ? null : response.at("/result/value");
        if (value == null || value.isMissingNode()) {
            throw new BaseException(ErrorCodes.CDP_REQUEST_FAILED, "Runtime.evaluate returned no value");
        }
        return value;
    }

    private void assertDomActionSucceeded(JsonNode result, String action) {
        boolean ok = result != null && result.path("ok").asBoolean(false);
        if (!ok) {
            String message = result == null ? "unknown error" : result.path("message").asText("unknown error");
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Failed to " + action + " element: " + message);
        }
    }

    private String locatorScript(String by, String value, Integer index, String operation, String text) {
        String safeBy = by == null ? "css" : by;
        int safeIndex = index == null ? 0 : index;
        return """
                (() => {
                  const by = %s;
                  const value = %s;
                  const index = %d;
                  const operation = %s;
                  const fillValue = %s;
                  const candidates = (() => {
                    if (!value) return [];
                    const normalizedBy = String(by || 'css').toLowerCase();
                    if (normalizedBy === 'css' || normalizedBy === 'selector') return Array.from(document.querySelectorAll(value));
                    if (normalizedBy === 'id') {
                      const element = document.getElementById(value);
                      return element ? [element] : [];
                    }
                    if (normalizedBy === 'name') return Array.from(document.getElementsByName(value));
                    if (normalizedBy === 'tag') return Array.from(document.getElementsByTagName(value));
                    if (normalizedBy === 'text') {
                      return Array.from(document.querySelectorAll('body *')).filter((element) =>
                        (element.innerText || element.textContent || '').includes(value));
                    }
                    if (normalizedBy === 'role') return Array.from(document.querySelectorAll('[role=\"' + CSS.escape(value) + '\"]'));
                    if (normalizedBy === 'testid' || normalizedBy === 'data-testid') {
                      return Array.from(document.querySelectorAll('[data-testid=\"' + CSS.escape(value) + '\"]'));
                    }
                    return Array.from(document.querySelectorAll(value));
                  })();
                  const element = candidates[index] || null;
                  const state = (element) => {
                    if (!element) return {found: false, count: candidates.length, visible: false, enabled: false, actionable: false, tagName: null};
                    const rect = element.getBoundingClientRect();
                    const style = window.getComputedStyle(element);
                    const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden'
                      && style.display !== 'none' && Number(style.opacity || '1') > 0;
                    const enabled = !element.disabled && element.getAttribute('aria-disabled') !== 'true';
                    const actionable = visible && enabled;
                    return {found: true, count: candidates.length, visible, enabled, actionable, tagName: element.tagName};
                  };
                  const current = state(element);
                  if (operation === 'state') return current;
                  if (!current.found) return {ok: false, message: 'element not found'};
                  if (operation === 'text') return {ok: true, text: element.innerText || element.textContent || ''};
                  if (operation === 'value') return {ok: true, value: 'value' in element ? element.value : ''};
                  if (operation === 'attribute') return {ok: true, value: element.getAttribute(fillValue)};
                  if (!current.actionable) return {ok: false, message: 'element is not actionable'};
                  element.scrollIntoView({block: 'center', inline: 'center'});
                  element.focus();
                  if (operation === 'click') {
                    element.click();
                    return {ok: true};
                  }
                  if (operation === 'fill') {
                    if ('value' in element) {
                      element.value = fillValue;
                    } else {
                      element.textContent = fillValue;
                    }
                    element.dispatchEvent(new Event('input', {bubbles: true}));
                    element.dispatchEvent(new Event('change', {bubbles: true}));
                    return {ok: true};
                  }
                  return {ok: false, message: 'unsupported operation ' + operation};
                })()
                """.formatted(
                Jsons.writeValueAsString(safeBy),
                Jsons.writeValueAsString(value),
                safeIndex,
                Jsons.writeValueAsString(operation),
                Jsons.writeValueAsString(text));
    }
}
