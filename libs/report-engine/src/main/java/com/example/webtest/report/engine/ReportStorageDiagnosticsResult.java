package com.example.webtest.report.engine;

import java.nio.file.Path;
import java.util.List;

public record ReportStorageDiagnosticsResult(
        Path reportRoot,
        int scannedRuns,
        long totalRunBytes,
        long referencedArtifactBytes,
        long unreferencedFileBytes,
        int referencedArtifactCount,
        int unreferencedFileCount,
        int missingArtifactCount,
        int prunedArtifactCount,
        List<ArtifactTypeSummary> artifactTypes,
        List<UnreferencedFileTypeSummary> unreferencedFileTypes,
        UnreferencedFileAgeSummary unreferencedFileAgeSummary,
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
            long unreferencedFileBytes,
            int referencedArtifactCount,
            int unreferencedFileCount,
            int missingArtifactCount,
            int prunedArtifactCount,
            List<UnreferencedFileTypeSummary> unreferencedFileTypes,
            UnreferencedFileAgeSummary unreferencedFileAgeSummary) {
    }

    public record UnreferencedFileTypeSummary(
            String type,
            int count,
            long bytes) {
    }

    public record UnreferencedFileAgeSummary(
            String oldestLastModifiedAt,
            long oldestAgeSeconds,
            String newestLastModifiedAt,
            long newestAgeSeconds) {
    }
}
