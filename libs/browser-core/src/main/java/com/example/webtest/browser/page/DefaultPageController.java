package com.example.webtest.browser.page;

import com.example.webtest.cdp.client.CdpClient;
import com.example.webtest.cdp.event.CdpEventListener;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.json.Jsons;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class DefaultPageController implements PageController {
    private final CdpClient cdpClient;

    public DefaultPageController(CdpClient cdpClient) {
        this.cdpClient = cdpClient;
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
                    if (!element) return {found: false, count: candidates.length, visible: false, actionable: false, tagName: null};
                    const rect = element.getBoundingClientRect();
                    const style = window.getComputedStyle(element);
                    const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden'
                      && style.display !== 'none' && Number(style.opacity || '1') > 0;
                    const actionable = visible && !element.disabled && element.getAttribute('aria-disabled') !== 'true';
                    return {found: true, count: candidates.length, visible, actionable, tagName: element.tagName};
                  };
                  const current = state(element);
                  if (operation === 'state') return current;
                  if (!current.found) return {ok: false, message: 'element not found'};
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
