package com.example.webtest.report.engine;

import java.nio.file.Path;
import java.util.List;

public record ReportCleanupResult(
        Path reportRoot,
        int scannedRuns,
        int keptRuns,
        List<Path> deletedRunDirectories,
        List<Path> deletedArtifactPaths,
        boolean dryRun) {
}
