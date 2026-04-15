package com.example.webtest.browser.page;

import com.example.webtest.cdp.client.CdpClient;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.execution.context.ExecutionContext;

public class DefaultPageController implements PageController {
    private final CdpClient cdpClient;

    public DefaultPageController(CdpClient cdpClient) {
        this.cdpClient = cdpClient;
    }

    @Override
    public void navigate(String url, ExecutionContext context) {
        cdpClient.send("Page.navigate", MapParams.of("url", url), Object.class);
    }

    @Override
    public void reload(ExecutionContext context) {
        cdpClient.send("Page.reload", MapParams.empty(), Object.class);
    }

    @Override
    public String currentUrl(ExecutionContext context) {
        throw notImplemented("Runtime.evaluate currentUrl");
    }

    @Override
    public String title(ExecutionContext context) {
        throw notImplemented("Runtime.evaluate title");
    }

    @Override
    public byte[] screenshot(ExecutionContext context, ScreenshotOptions options) {
        throw notImplemented("Page.captureScreenshot");
    }

    @Override
    public String getHtml(ExecutionContext context) {
        throw notImplemented("Runtime.evaluate outerHTML");
    }

    private BaseException notImplemented(String operation) {
        return new BaseException(
                ErrorCodes.CDP_REQUEST_FAILED,
                "Browser page operation is not implemented yet: " + operation);
    }
}
