package com.example.webtest.artifact.collector;

import com.example.webtest.artifact.model.ArtifactRef;
import com.example.webtest.execution.context.ExecutionContext;
import java.nio.file.Path;

public interface ArtifactCollector {
    ArtifactRef captureScreenshot(Path outputDir, String artifactName, ExecutionContext context);
}
