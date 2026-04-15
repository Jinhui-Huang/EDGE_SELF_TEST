package com.example.webtest.platform;

import com.example.webtest.browser.page.DefaultPageController;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
import com.example.webtest.browser.session.BrowserSessionManager;
import com.example.webtest.browser.session.DefaultBrowserSessionManager;
import com.example.webtest.browser.session.SessionOptions;
import com.example.webtest.cdp.client.CdpClient;
import com.example.webtest.cdp.client.DefaultCdpClient;
import com.example.webtest.execution.context.ExecutionContext;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public final class CorePlatformApp {
    private CorePlatformApp() {
    }

    public static void main(String[] args) throws Exception {
        CdpClient cdpClient = new DefaultCdpClient();
        BrowserSessionManager sessionManager = new DefaultBrowserSessionManager(cdpClient);
        PageController pageController = new DefaultPageController(cdpClient);

        SessionOptions options = new SessionOptions();
        options.setHeadless(true);
        options.setInitialUrl("about:blank");

        sessionManager.create(options);
        try {
            cdpClient.send("Page.enable", Map.of(), JsonNode.class);

            CountDownLatch loaded = new CountDownLatch(1);
            cdpClient.addEventListener("Page.loadEventFired", (eventName, params) -> loaded.countDown());

            ExecutionContext context = new ExecutionContext("smoke-run");
            pageController.navigate(smokeDataUrl(), context);
            loaded.await(5, TimeUnit.SECONDS);

            Path output = Path.of("runs", "smoke", "screenshot.png");
            Files.createDirectories(output.getParent());
            Files.write(output, pageController.screenshot(context, new ScreenshotOptions()));

            System.out.println("Smoke screenshot: " + output.toAbsolutePath());
            System.out.println("Page title: " + pageController.title(context));
        } finally {
            cdpClient.close();
        }
    }

    private static String smokeDataUrl() {
        String html = """
                <!doctype html>
                <html>
                  <head><title>Edge Self Test Smoke</title></head>
                  <body>
                    <main>
                      <h1>Edge Self Test Smoke</h1>
                      <p>CDP navigate and screenshot are wired.</p>
                    </main>
                  </body>
                </html>
                """;
        return "data:text/html;charset=utf-8," + URLEncoder.encode(html, StandardCharsets.UTF_8);
    }
}
