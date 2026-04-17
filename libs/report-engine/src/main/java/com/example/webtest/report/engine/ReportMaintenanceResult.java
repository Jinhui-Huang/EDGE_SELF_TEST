package com.example.webtest.report.engine;

import java.nio.file.Path;
import java.util.List;

public record ReportMaintenanceResult(
        Path reportRoot,
        int scannedRuns,
        int updatedRuns,
        List<Path> markedArtifactPaths,
        boolean dryRun) {
}
