package com.example.webtest.report.engine;

import java.nio.file.Path;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

public class ReportCleanupOptions {
    private Integer keepLatest;
    private Instant deleteFinishedBefore;
    private Set<String> deleteStatuses = new LinkedHashSet<>();
    private Set<String> unreferencedFileAgeBuckets = new LinkedHashSet<>();
    private Long maxTotalBytes;
    private Long unreferencedFileMinAgeSeconds;
    private Path dryRunHtmlPath;
    private boolean pruneArtifactsOnly;
    private boolean pruneUnreferencedFilesOnly;
    private boolean verboseUnreferencedCleanupPlan;
    private boolean dryRun;

    public Integer getKeepLatest() {
        return keepLatest;
    }

    public void setKeepLatest(Integer keepLatest) {
        if (keepLatest != null && keepLatest < 0) {
            throw new IllegalArgumentException("keepLatest must be greater than or equal to 0");
        }
        this.keepLatest = keepLatest;
    }

    public Instant getDeleteFinishedBefore() {
        return deleteFinishedBefore;
    }

    public void setDeleteFinishedBefore(Instant deleteFinishedBefore) {
        this.deleteFinishedBefore = deleteFinishedBefore;
    }

    public Set<String> getDeleteStatuses() {
        return Collections.unmodifiableSet(deleteStatuses);
    }

    public void setDeleteStatuses(Set<String> deleteStatuses) {
        this.deleteStatuses = new LinkedHashSet<>();
        if (deleteStatuses == null) {
            return;
        }
        for (String status : deleteStatuses) {
            addDeleteStatus(status);
        }
    }

    public void addDeleteStatus(String status) {
        String normalized = normalizeStatus(status);
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("delete status must not be blank");
        }
        if (!"OK".equals(normalized) && !"FAILED".equals(normalized)) {
            throw new IllegalArgumentException("delete status must be OK or FAILED: " + status);
        }
        deleteStatuses.add(normalized);
    }

    public Set<String> getUnreferencedFileAgeBuckets() {
        return Collections.unmodifiableSet(unreferencedFileAgeBuckets);
    }

    public void setUnreferencedFileAgeBuckets(Set<String> unreferencedFileAgeBuckets) {
        this.unreferencedFileAgeBuckets = new LinkedHashSet<>();
        if (unreferencedFileAgeBuckets == null) {
            return;
        }
        for (String bucket : unreferencedFileAgeBuckets) {
            addUnreferencedFileAgeBucket(bucket);
        }
    }

    public void addUnreferencedFileAgeBucket(String bucket) {
        String normalized = normalizeBucket(bucket);
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("unreferenced file age bucket must not be blank");
        }
        if (!"fresh".equals(normalized)
                && !"recent".equals(normalized)
                && !"stale".equals(normalized)
                && !"old".equals(normalized)
                && !"ancient".equals(normalized)) {
            throw new IllegalArgumentException("unreferenced file age bucket must be fresh, recent, stale, old, or ancient: " + bucket);
        }
        unreferencedFileAgeBuckets.add(normalized);
    }

    public Long getMaxTotalBytes() {
        return maxTotalBytes;
    }

    public void setMaxTotalBytes(Long maxTotalBytes) {
        if (maxTotalBytes != null && maxTotalBytes < 0) {
            throw new IllegalArgumentException("maxTotalBytes must be greater than or equal to 0");
        }
        this.maxTotalBytes = maxTotalBytes;
    }

    public Long getUnreferencedFileMinAgeSeconds() {
        return unreferencedFileMinAgeSeconds;
    }

    public void setUnreferencedFileMinAgeSeconds(Long unreferencedFileMinAgeSeconds) {
        if (unreferencedFileMinAgeSeconds != null && unreferencedFileMinAgeSeconds < 0) {
            throw new IllegalArgumentException("unreferencedFileMinAgeSeconds must be greater than or equal to 0");
        }
        this.unreferencedFileMinAgeSeconds = unreferencedFileMinAgeSeconds;
    }

    public Path getDryRunHtmlPath() {
        return dryRunHtmlPath;
    }

    public void setDryRunHtmlPath(Path dryRunHtmlPath) {
        this.dryRunHtmlPath = dryRunHtmlPath;
    }

    public boolean isPruneArtifactsOnly() {
        return pruneArtifactsOnly;
    }

    public void setPruneArtifactsOnly(boolean pruneArtifactsOnly) {
        this.pruneArtifactsOnly = pruneArtifactsOnly;
    }

    public boolean isPruneUnreferencedFilesOnly() {
        return pruneUnreferencedFilesOnly;
    }

    public void setPruneUnreferencedFilesOnly(boolean pruneUnreferencedFilesOnly) {
        this.pruneUnreferencedFilesOnly = pruneUnreferencedFilesOnly;
    }

    public boolean isVerboseUnreferencedCleanupPlan() {
        return verboseUnreferencedCleanupPlan;
    }

    public void setVerboseUnreferencedCleanupPlan(boolean verboseUnreferencedCleanupPlan) {
        this.verboseUnreferencedCleanupPlan = verboseUnreferencedCleanupPlan;
    }

    public boolean isDryRun() {
        return dryRun;
    }

    public void setDryRun(boolean dryRun) {
        this.dryRun = dryRun;
    }

    private String normalizeStatus(String status) {
        return status == null ? "" : status.trim().toUpperCase();
    }

    private String normalizeBucket(String bucket) {
        return bucket == null ? "" : bucket.trim().toLowerCase();
    }
}
