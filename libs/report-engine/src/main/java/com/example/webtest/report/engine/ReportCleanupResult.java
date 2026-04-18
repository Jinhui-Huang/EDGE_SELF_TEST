package com.example.webtest.report.engine;

import java.nio.file.Path;
import java.util.List;

public record ReportCleanupResult(
        Path reportRoot,
        int scannedRuns,
        int keptRuns,
        List<Path> deletedRunDirectories,
        List<Path> deletedArtifactPaths,
        List<Path> deletedUnreferencedFilePaths,
        List<ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary> deletedUnreferencedFileTypes,
        ReportStorageDiagnosticsResult.UnreferencedFileAgeSummary deletedUnreferencedFileAgeSummary,
        List<UnreferencedFileRetentionHint> deletedUnreferencedFileRetentionHints,
        UnreferencedCleanupPlan unreferencedCleanupPlan,
        boolean dryRun) {

    public record UnreferencedFileRetentionHint(
            String bucket,
            long minAgeSeconds,
            long maxAgeSeconds,
            int count,
            long bytes) {
    }

    public record UnreferencedCleanupPlan(
            int selectedRuns,
            int retainedRuns,
            int scannedUnreferencedFiles,
            long scannedUnreferencedBytes,
            int selectedUnreferencedFiles,
            long selectedUnreferencedBytes,
            int retainedUnreferencedFiles,
            long retainedUnreferencedBytes,
            List<UnreferencedCleanupRetentionReason> retentionReasons,
            List<UnreferencedCleanupRunPlan> runs) {
    }

    public record UnreferencedCleanupRunPlan(
            String runId,
            Path directory,
            boolean selectedByCleanupSelectors,
            int scannedUnreferencedFiles,
            long scannedUnreferencedBytes,
            int selectedUnreferencedFiles,
            long selectedUnreferencedBytes,
            int retainedUnreferencedFiles,
            long retainedUnreferencedBytes,
            List<UnreferencedCleanupRetentionReason> retentionReasons,
            List<UnreferencedCleanupFilePlan> files) {
    }

    public record UnreferencedCleanupRetentionReason(
            String reason,
            int count,
            long bytes) {
    }

    public record UnreferencedCleanupFilePlan(
            Path path,
            String decision,
            String reason,
            String type,
            long bytes,
            String lastModifiedAt) {
    }
}
