package com.example.webtest.browser.page;

import com.example.webtest.cdp.client.CdpClient;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.execution.context.ExecutionContext;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Base64;
import java.util.Map;

public class DefaultPageController implements PageController {
    private final CdpClient cdpClient;

    public DefaultPageController(CdpClient cdpClient) {
        this.cdpClient = cdpClient;
    }

    @Override
    public void navigate(String url, ExecutionContext context) {
        cdpClient.send("Page.navigate", MapParams.of("url", url), JsonNode.class);
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
}
