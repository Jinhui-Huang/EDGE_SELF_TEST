package com.example.webtest.report.engine;

import java.nio.file.Path;
import java.util.List;

public record ReportStorageDiagnosticsResult(
        Path reportRoot,
        int scannedRuns,
        long totalRunBytes,
        long referencedArtifactBytes,
        int referencedArtifactCount,
        int missingArtifactCount,
        int prunedArtifactCount,
        List<ArtifactTypeSummary> artifactTypes,
        List<RunStorageSummary> runs) {

    public record ArtifactTypeSummary(
            String type,
            int count,
            int missingCount,
            int prunedCount,
            long bytes) {
    }

    public record RunStorageSummary(
            String runId,
            Path directory,
            String status,
            String finishedAt,
            long runBytes,
            long referencedArtifactBytes,
            int referencedArtifactCount,
            int missingArtifactCount,
            int prunedArtifactCount) {
    }
}
