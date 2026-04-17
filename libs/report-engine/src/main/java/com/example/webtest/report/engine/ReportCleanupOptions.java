package com.example.webtest.report.engine;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

public class ReportCleanupOptions {
    private Integer keepLatest;
    private Instant deleteFinishedBefore;
    private Set<String> deleteStatuses = new LinkedHashSet<>();
    private Long maxTotalBytes;
    private boolean pruneArtifactsOnly;
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

    public Long getMaxTotalBytes() {
        return maxTotalBytes;
    }

    public void setMaxTotalBytes(Long maxTotalBytes) {
        if (maxTotalBytes != null && maxTotalBytes < 0) {
            throw new IllegalArgumentException("maxTotalBytes must be greater than or equal to 0");
        }
        this.maxTotalBytes = maxTotalBytes;
    }

    public boolean isPruneArtifactsOnly() {
        return pruneArtifactsOnly;
    }

    public void setPruneArtifactsOnly(boolean pruneArtifactsOnly) {
        this.pruneArtifactsOnly = pruneArtifactsOnly;
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
}
