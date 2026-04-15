package com.example.webtest.browser.page;

public class ScreenshotOptions {
    private boolean fullPage = true;
    private String format = "png";

    public boolean isFullPage() {
        return fullPage;
    }

    public void setFullPage(boolean fullPage) {
        this.fullPage = fullPage;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
    }
}
