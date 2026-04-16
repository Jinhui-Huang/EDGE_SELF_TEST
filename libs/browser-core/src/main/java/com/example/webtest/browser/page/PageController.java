package com.example.webtest.browser.page;

import com.example.webtest.execution.context.ExecutionContext;

public interface PageController {
    void navigate(String url, ExecutionContext context);

    void reload(ExecutionContext context);

    String currentUrl(ExecutionContext context);

    String title(ExecutionContext context);

    byte[] screenshot(ExecutionContext context, ScreenshotOptions options);

    String getHtml(ExecutionContext context);

    ElementState findElement(String by, String value, Integer index, ExecutionContext context);

    void clickElement(String by, String value, Integer index, ExecutionContext context);

    void fillElement(String by, String value, Integer index, String text, ExecutionContext context);
}
