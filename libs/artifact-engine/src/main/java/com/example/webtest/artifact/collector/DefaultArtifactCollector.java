package com.example.webtest.artifact.collector;

import com.example.webtest.artifact.model.ArtifactRef;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.execution.context.ExecutionContext;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Objects;

public class DefaultArtifactCollector implements ArtifactCollector {
    private final PageController pageController;

    public DefaultArtifactCollector(PageController pageController) {
        this.pageController = Objects.requireNonNull(pageController, "pageController must not be null");
    }

    @Override
    public ArtifactRef captureScreenshot(Path outputDir, String artifactName, ExecutionContext context) {
        Objects.requireNonNull(outputDir, "outputDir must not be null");
        String safeArtifactName = artifactName == null || artifactName.isBlank() ? "screenshot" : artifactName;
        Path screenshotPath = outputDir.resolve(safeArtifactName + ".png");
        try {
            Files.createDirectories(screenshotPath.getParent());
            Files.write(screenshotPath, pageController.screenshot(context, new ScreenshotOptions()));
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Failed to write screenshot", e);
        }

        ArtifactRef ref = new ArtifactRef();
        ref.setType("screenshot");
        ref.setPath(screenshotPath);
        ref.setContentType("image/png");
        ref.setCreatedAt(Instant.now());
        return ref;
    }
}
