package com.example.webtest.artifact.collector;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.example.webtest.artifact.model.ArtifactRef;
import com.example.webtest.browser.page.ElementState;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
import com.example.webtest.execution.context.ExecutionContext;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
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

    private static final class FakePageController implements PageController {
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
            return "";
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
