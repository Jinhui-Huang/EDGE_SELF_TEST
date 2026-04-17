package com.example.webtest.artifact.collector;

import com.example.webtest.artifact.model.ArtifactRef;
import com.example.webtest.browser.observer.ConsoleEvent;
import com.example.webtest.browser.observer.NetworkEvent;
import com.example.webtest.execution.context.ExecutionContext;
import java.nio.file.Path;
import java.util.List;

public interface ArtifactCollector {
    ArtifactRef captureScreenshot(Path outputDir, String artifactName, ExecutionContext context);

    ArtifactRef captureDomDump(Path outputDir, String artifactName, ExecutionContext context);

    ArtifactRef captureConsoleDump(Path outputDir, String artifactName, ExecutionContext context);

    ArtifactRef captureConsoleDump(Path outputDir, String artifactName, List<ConsoleEvent> events);

    ArtifactRef captureNetworkDump(Path outputDir, String artifactName, ExecutionContext context);

    ArtifactRef captureNetworkDump(Path outputDir, String artifactName, List<NetworkEvent> events);
}
