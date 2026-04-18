package com.example.webtest.report.engine;

import com.example.webtest.artifact.model.ArtifactRef;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.json.Jsons;
import com.example.webtest.report.model.ReportStepRecord;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

public class DefaultReportEngine implements ReportEngine {
    private static final List<RetentionBucketDefinition> RETENTION_BUCKETS = List.of(
            new RetentionBucketDefinition("fresh", "fresh <1h", 0L, 3_599L),
            new RetentionBucketDefinition("recent", "recent 1h-24h", 3_600L, 86_399L),
            new RetentionBucketDefinition("stale", "stale 1d-7d", 86_400L, 604_799L),
            new RetentionBucketDefinition("old", "old 7d-30d", 604_800L, 2_591_999L),
            new RetentionBucketDefinition("ancient", "ancient >=30d", 2_592_000L, Long.MAX_VALUE));

    @Override
    public Path generateRunReport(
            ExecutionContext context,
            Path outputDir,
            Instant runStartedAt,
            Instant runFinishedAt,
            List<ReportStepRecord> stepRecords) {
        if (context == null) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Execution context is required for report");
        }
        Path safeOutputDir = outputDir == null ? Path.of("runs", context.getRunId()) : outputDir;
        Path reportPath = safeOutputDir.resolve("report.json");
        Path htmlReportPath = safeOutputDir.resolve("report.html");
        try {
            Files.createDirectories(safeOutputDir);
            Map<String, Object> report = report(
                            context,
                            safeOutputDir,
                            runStartedAt,
                            runFinishedAt,
                            stepRecords);
            Files.writeString(reportPath, Jsons.writeValueAsString(report),
                    StandardCharsets.UTF_8);
            Files.writeString(htmlReportPath, htmlReport(report), StandardCharsets.UTF_8);
            writeReportIndex(safeOutputDir, report);
            return reportPath;
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Failed to write run report: " + reportPath, e);
        }
    }

    @Override
    public ReportCleanupResult cleanupReportRuns(Path reportRoot, ReportCleanupOptions options) {
        if (reportRoot == null) {
            throw new BaseException(ErrorCodes.REPORT_GENERATION_FAILED, "Report root is required for cleanup");
        }
        ReportCleanupOptions safeOptions = options == null ? new ReportCleanupOptions() : options;
        if (safeOptions.isPruneArtifactsOnly() && safeOptions.isPruneUnreferencedFilesOnly()) {
            throw new BaseException(
                    ErrorCodes.REPORT_GENERATION_FAILED,
                    "Artifact-only cleanup and unreferenced-file cleanup cannot be combined");
        }
        Path normalizedReportRoot = reportRoot.toAbsolutePath().normalize();
        if (!Files.isDirectory(normalizedReportRoot)) {
            throw new BaseException(
                    ErrorCodes.REPORT_GENERATION_FAILED,
                    "Report root does not exist or is not a directory: " + normalizedReportRoot);
        }
        try {
            List<ReportIndexEntry> entries = reportIndexEntries(normalizedReportRoot, null, null);
            CleanupOutcome cleanup = cleanupEntries(entries, safeOptions);
            if (!safeOptions.isDryRun()) {
                List<ReportIndexEntry> remaining = safeOptions.isPruneArtifactsOnly()
                        || safeOptions.isPruneUnreferencedFilesOnly()
                        ? reportIndexEntries(normalizedReportRoot, null, null)
                        : remainingEntries(entries, cleanup.deletedRunDirectories());
                Files.writeString(normalizedReportRoot.resolve("index.html"), reportIndex(normalizedReportRoot, remaining),
                        StandardCharsets.UTF_8);
            }
            Path dryRunHtmlPath = dryRunHtmlPath(normalizedReportRoot, safeOptions);
            ReportCleanupResult result = new ReportCleanupResult(
                    normalizedReportRoot,
                    entries.size(),
                    entries.size() - cleanup.deletedRunDirectories().size(),
                    List.copyOf(cleanup.deletedRunDirectories()),
                    List.copyOf(cleanup.deletedArtifactPaths()),
                    List.copyOf(cleanup.deletedUnreferencedFilePaths()),
                    List.copyOf(cleanup.deletedUnreferencedFileTypes()),
                    cleanup.deletedUnreferencedFileAgeSummary(),
                    List.copyOf(cleanup.deletedUnreferencedFileRetentionHints()),
                    cleanup.unreferencedCleanupPlan(),
                    dryRunHtmlPath,
                    safeOptions.isDryRun());
            if (dryRunHtmlPath != null) {
                Files.createDirectories(dryRunHtmlPath.getParent());
                Files.writeString(dryRunHtmlPath, cleanupDryRunHtml(result), StandardCharsets.UTF_8);
                List<ReportIndexEntry> refreshedEntries = reportIndexEntries(normalizedReportRoot, null, null);
                Files.writeString(normalizedReportRoot.resolve("index.html"),
                        reportIndex(normalizedReportRoot, refreshedEntries, dryRunHtmlPath),
                        StandardCharsets.UTF_8);
            }
            return result;
        } catch (IOException e) {
            throw new BaseException(
                    ErrorCodes.REPORT_GENERATION_FAILED,
                    "Failed to clean report runs under: " + normalizedReportRoot,
                    e);
        }
    }

    private Path dryRunHtmlPath(Path reportRoot, ReportCleanupOptions options) {
        if (!options.isDryRun()) {
            return null;
        }
        Path configuredPath = options.getDryRunHtmlPath();
        Path dryRunHtmlPath = configuredPath == null
                ? reportRoot.resolve("cleanup-dry-run.html")
                : configuredPath;
        if (!dryRunHtmlPath.isAbsolute()) {
            dryRunHtmlPath = reportRoot.resolve(dryRunHtmlPath);
        }
        return dryRunHtmlPath.toAbsolutePath().normalize();
    }

    @Override
    public ReportMaintenanceResult markMissingArtifactsPruned(Path reportRoot, boolean dryRun) {
        if (reportRoot == null) {
            throw new BaseException(ErrorCodes.REPORT_GENERATION_FAILED, "Report root is required for maintenance");
        }
        Path normalizedReportRoot = reportRoot.toAbsolutePath().normalize();
        if (!Files.isDirectory(normalizedReportRoot)) {
            throw new BaseException(
                    ErrorCodes.REPORT_GENERATION_FAILED,
                    "Report root does not exist or is not a directory: " + normalizedReportRoot);
        }
        try {
            List<ReportIndexEntry> entries = reportIndexEntries(normalizedReportRoot, null, null);
            List<Path> markedArtifacts = new ArrayList<>();
            int updatedRuns = 0;
            for (ReportIndexEntry entry : entries) {
                List<Path> missingArtifacts = markMissingArtifactsPrunedInRun(entry.directory(), dryRun);
                if (!missingArtifacts.isEmpty()) {
                    updatedRuns++;
                    markedArtifacts.addAll(missingArtifacts);
                }
            }
            return new ReportMaintenanceResult(
                    normalizedReportRoot,
                    entries.size(),
                    updatedRuns,
                    List.copyOf(markedArtifacts),
                    dryRun);
        } catch (IOException e) {
            throw new BaseException(
                    ErrorCodes.REPORT_GENERATION_FAILED,
                    "Failed to maintain report runs under: " + normalizedReportRoot,
                    e);
        }
    }

    @Override
    public ReportStorageDiagnosticsResult diagnoseReportStorage(Path reportRoot) {
        if (reportRoot == null) {
            throw new BaseException(ErrorCodes.REPORT_GENERATION_FAILED, "Report root is required for diagnostics");
        }
        Path normalizedReportRoot = reportRoot.toAbsolutePath().normalize();
        if (!Files.isDirectory(normalizedReportRoot)) {
            throw new BaseException(
                    ErrorCodes.REPORT_GENERATION_FAILED,
                    "Report root does not exist or is not a directory: " + normalizedReportRoot);
        }
        try {
            List<ReportIndexEntry> entries = reportIndexEntries(normalizedReportRoot, null, null);
            return diagnosticsForEntries(normalizedReportRoot, entries);
        } catch (IOException e) {
            throw new BaseException(
                    ErrorCodes.REPORT_GENERATION_FAILED,
                    "Failed to diagnose report storage under: " + normalizedReportRoot,
                    e);
        }
    }

    private Map<String, Object> report(
            ExecutionContext context,
            Path outputDir,
            Instant runStartedAt,
            Instant runFinishedAt,
            List<ReportStepRecord> stepRecords) {
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("runId", context.getRunId());
        report.put("startedAt", instant(runStartedAt));
        report.put("finishedAt", instant(runFinishedAt));
        report.put("outputDir", path(outputDir));
        report.put("summary", summary(runStartedAt, runFinishedAt, stepRecords));
        report.put("steps", steps(outputDir, stepRecords));
        return report;
    }

    private Map<String, Object> summary(
            Instant runStartedAt,
            Instant runFinishedAt,
            List<ReportStepRecord> stepRecords) {
        Map<String, Object> summary = new LinkedHashMap<>();
        int total = 0;
        int passed = 0;
        int failed = 0;
        int skipped = 0;
        long durationMs = 0L;
        if (stepRecords != null) {
            total = stepRecords.size();
            for (ReportStepRecord record : stepRecords) {
                if ("SUCCESS".equals(record.getStatus())) {
                    passed++;
                } else if ("FAILED".equals(record.getStatus())) {
                    failed++;
                } else if ("SKIPPED".equals(record.getStatus())) {
                    skipped++;
                }
                Long stepDurationMs = durationMs(record.getStartedAt(), record.getFinishedAt());
                if (stepDurationMs != null) {
                    durationMs += stepDurationMs;
                }
            }
        }
        Long runDurationMs = durationMs(runStartedAt, runFinishedAt);
        if (runDurationMs != null) {
            durationMs = runDurationMs;
        }
        summary.put("total", total);
        summary.put("passed", passed);
        summary.put("failed", failed);
        summary.put("skipped", skipped);
        summary.put("durationMs", durationMs);
        return summary;
    }

    private List<Map<String, Object>> steps(Path outputDir, List<ReportStepRecord> stepRecords) {
        List<Map<String, Object>> steps = new ArrayList<>();
        if (stepRecords == null) {
            return steps;
        }
        for (ReportStepRecord record : stepRecords) {
            Map<String, Object> step = new LinkedHashMap<>();
            step.put("stepId", record.getStepId());
            step.put("stepName", record.getStepName());
            step.put("action", record.getAction());
            step.put("status", record.getStatus());
            step.put("message", record.getMessage());
            step.put("startedAt", instant(record.getStartedAt()));
            step.put("finishedAt", instant(record.getFinishedAt()));
            step.put("durationMs", durationMs(record.getStartedAt(), record.getFinishedAt()));
            step.put("artifactPath", reportPath(outputDir, record.getArtifactPath()));
            step.put("artifacts", artifacts(outputDir, record.getArtifacts()));
            steps.add(step);
        }
        return steps;
    }

    private List<Map<String, Object>> artifacts(Path outputDir, List<ArtifactRef> artifacts) {
        List<Map<String, Object>> values = new ArrayList<>();
        if (artifacts == null) {
            return values;
        }
        for (ArtifactRef artifact : artifacts) {
            Map<String, Object> value = new LinkedHashMap<>();
            value.put("type", artifact.getType());
            value.put("path", reportPath(outputDir, artifact.getPath()));
            value.put("contentType", artifact.getContentType());
            value.put("createdAt", instant(artifact.getCreatedAt()));
            value.put("preview", artifactPreviewContent(artifact.getPath(), artifact.getContentType()));
            values.add(value);
        }
        return values;
    }

    private String artifactPreviewContent(Path artifactPath, String contentType) {
        if (artifactPath == null
                || isHtmlArtifact(artifactPath, contentType)
                || !isTextArtifact(artifactPath, contentType)
                || !Files.isRegularFile(artifactPath)) {
            return null;
        }
        try {
            String content = Files.readString(artifactPath, StandardCharsets.UTF_8);
            int maxPreviewChars = 12000;
            if (content.length() > maxPreviewChars) {
                return content.substring(0, maxPreviewChars) + "\n... truncated ...";
            }
            return content;
        } catch (IOException e) {
            return null;
        }
    }

    private String path(Path path) {
        return path == null ? null : path.toString();
    }

    private String reportPath(Path outputDir, Path value) {
        if (value == null) {
            return null;
        }
        if (outputDir == null) {
            return path(value);
        }
        try {
            Path normalizedOutputDir = outputDir.toAbsolutePath().normalize();
            Path normalizedValue = value.toAbsolutePath().normalize();
            if (normalizedValue.startsWith(normalizedOutputDir)) {
                return normalizedOutputDir.relativize(normalizedValue).toString();
            }
        } catch (IllegalArgumentException e) {
            return path(value);
        }
        return path(value);
    }

    private String instant(Instant instant) {
        return instant == null ? null : instant.toString();
    }

    private Long durationMs(Instant startedAt, Instant finishedAt) {
        if (startedAt == null || finishedAt == null) {
            return null;
        }
        return Duration.between(startedAt, finishedAt).toMillis();
    }

    private void writeReportIndex(Path outputDir, Map<String, Object> currentReport) throws IOException {
        Path reportRoot = outputDir.toAbsolutePath().normalize().getParent();
        if (reportRoot == null) {
            return;
        }
        List<ReportIndexEntry> entries = reportIndexEntries(reportRoot, outputDir, currentReport);
        Files.writeString(reportRoot.resolve("index.html"), reportIndex(reportRoot, entries), StandardCharsets.UTF_8);
    }

    private List<ReportIndexEntry> reportIndexEntries(
            Path reportRoot,
            Path currentOutputDir,
            Map<String, Object> currentReport) throws IOException {
        List<ReportIndexEntry> entries = new ArrayList<>();
        Path normalizedCurrentOutputDir = currentOutputDir == null
                ? null
                : currentOutputDir.toAbsolutePath().normalize();
        try (Stream<Path> children = Files.list(reportRoot)) {
            for (Path child : children.filter(Files::isDirectory).toList()) {
                Path normalizedChild = child.toAbsolutePath().normalize();
                Map<String, Object> report = normalizedChild.equals(normalizedCurrentOutputDir)
                        ? currentReport
                        : readReportJson(child.resolve("report.json"));
                if (report == null) {
                    continue;
                }
                entries.add(reportIndexEntry(reportRoot, child, report));
            }
        }
        entries.sort(Comparator
                .comparing((ReportIndexEntry entry) -> text(entry.finishedAt()))
                .reversed()
                .thenComparing(entry -> text(entry.runId())));
        return entries;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readReportJson(Path reportPath) {
        if (!Files.isRegularFile(reportPath)) {
            return null;
        }
        try {
            return Jsons.JSON.readValue(Files.readString(reportPath), Map.class);
        } catch (IOException e) {
            return null;
        }
    }

    private ReportIndexEntry reportIndexEntry(Path reportRoot, Path outputDir, Map<String, Object> report)
            throws IOException {
        Map<?, ?> summary = map(report.get("summary"));
        String runDirectory = hrefPath(reportRoot.relativize(outputDir));
        return new ReportIndexEntry(
                text(report.get("runId")),
                text(report.get("startedAt")),
                text(report.get("finishedAt")),
                intValue(summary.get("total")),
                intValue(summary.get("passed")),
                intValue(summary.get("failed")),
                intValue(summary.get("skipped")),
                longValue(summary.get("durationMs")),
                runDirectory + "/report.html",
                runDirectory + "/report.json",
                directorySize(outputDir),
                outputDir.toAbsolutePath().normalize());
    }

    private CleanupOutcome cleanupEntries(List<ReportIndexEntry> entries, ReportCleanupOptions options) throws IOException {
        QuotaCleanupPlan quotaPlan = quotaCleanupPlan(entries, options);
        List<Path> deletedRunDirectories = new ArrayList<>();
        List<Path> deletedArtifactPaths = new ArrayList<>();
        List<Path> deletedUnreferencedFilePaths = new ArrayList<>();
        List<UnreferencedFileInfo> deletedUnreferencedFiles = new ArrayList<>();
        Map<String, FileTypeTotals> deletedUnreferencedFileTypeTotals = new LinkedHashMap<>();
        UnreferencedCleanupPlanTotals unreferencedCleanupPlan = new UnreferencedCleanupPlanTotals();
        Instant measuredAt = Instant.now();
        for (int index = 0; index < entries.size(); index++) {
            ReportIndexEntry entry = entries.get(index);
            boolean selectedRun = shouldDelete(entry, index, options, quotaPlan);
            if (options.isPruneUnreferencedFilesOnly()) {
                UnreferencedFileDiagnostic unreferencedFiles = unreferencedFileDiagnostic(entry.directory());
                ReportCleanupResult.UnreferencedCleanupRunSelectorPlan selectorPlan =
                        cleanupRunSelectorPlan(entry, index, options, quotaPlan);
                UnreferencedCleanupRunPlanTotals runPlan =
                        unreferencedCleanupPlan.addRun(
                                entry,
                                selectedRun,
                                unreferencedFiles.files(),
                                options.isVerboseUnreferencedCleanupPlan(),
                                selectorPlan,
                                options,
                                measuredAt);
                if (!selectedRun) {
                    unreferencedCleanupPlan.addRetained(runPlan,
                            "run-retained-by-cleanup-selectors",
                            unreferencedFiles.files());
                    continue;
                }
                UnreferencedFileSelection selection =
                        selectUnreferencedFiles(unreferencedFiles.files(), options, measuredAt);
                unreferencedCleanupPlan.addSelected(runPlan, selection.selected());
                unreferencedCleanupPlan.addRetained(runPlan, "younger-than-min-age", selection.retainedByMinAge());
                unreferencedCleanupPlan.addRetained(runPlan, "outside-selected-age-buckets", selection.retainedByBucket());
                deletedUnreferencedFilePaths.addAll(selection.selected().stream()
                        .map(UnreferencedFileInfo::path)
                        .toList());
                deletedUnreferencedFiles.addAll(selection.selected());
                addUnreferencedFileTypeTotals(deletedUnreferencedFileTypeTotals, selection.selected());
                if (!options.isDryRun()) {
                    deleteUnreferencedFiles(entry.directory(), selection.selected());
                }
                continue;
            }
            if (!selectedRun) {
                continue;
            }
            if (options.isPruneArtifactsOnly()) {
                deletedArtifactPaths.addAll(pruneArtifacts(entry.directory(), options.isDryRun()));
            } else {
                deletedRunDirectories.add(entry.directory());
            }
            if (!options.isDryRun()
                    && !options.isPruneArtifactsOnly()
                    && !options.isPruneUnreferencedFilesOnly()) {
                deleteDirectory(entry.directory());
            }
        }
        List<ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary> deletedUnreferencedFileTypes =
                deletedUnreferencedFileTypeTotals.entrySet()
                        .stream()
                        .map(entry -> entry.getValue().summary(entry.getKey()))
                        .toList();
        return new CleanupOutcome(
                deletedRunDirectories,
                deletedArtifactPaths,
                deletedUnreferencedFilePaths,
                deletedUnreferencedFileTypes,
                unreferencedFileAgeSummary(deletedUnreferencedFiles, measuredAt),
                unreferencedFileRetentionHints(deletedUnreferencedFiles, measuredAt),
                unreferencedCleanupPlan.summary());
    }

    private QuotaCleanupPlan quotaCleanupPlan(List<ReportIndexEntry> entries, ReportCleanupOptions options) {
        Long maxTotalBytes = options.getMaxTotalBytes();
        if (maxTotalBytes == null) {
            return QuotaCleanupPlan.empty();
        }
        Set<Path> selected = new HashSet<>();
        Map<Path, QuotaTraversalStep> steps = new HashMap<>();
        long retainedBytes = 0L;
        for (int index = 0; index < entries.size(); index++) {
            ReportIndexEntry entry = entries.get(index);
            if (!shouldDeleteWithoutQuota(entry, index, options)) {
                retainedBytes = saturatedAdd(retainedBytes, entry.sizeBytes());
            }
        }
        for (int index = entries.size() - 1; index >= 0; index--) {
            ReportIndexEntry entry = entries.get(index);
            boolean quotaEligible = !isProtectedByLatest(index, options)
                    && !shouldDeleteWithoutQuota(entry, index, options);
            long retainedBytesBefore = retainedBytes;
            long freedBytes = 0L;
            boolean selectedByQuota = false;
            if (quotaEligible && retainedBytes > maxTotalBytes) {
                selectedByQuota = true;
                selected.add(entry.directory());
                freedBytes = entry.sizeBytes();
                retainedBytes = Math.max(0L, retainedBytes - entry.sizeBytes());
            }
            steps.put(entry.directory(), new QuotaTraversalStep(
                    retainedBytesBefore,
                    retainedBytes,
                    freedBytes,
                    quotaEligible,
                    selectedByQuota));
        }
        return new QuotaCleanupPlan(selected, steps);
    }

    private boolean shouldDelete(
            ReportIndexEntry entry,
            int sortedIndex,
            ReportCleanupOptions options,
            QuotaCleanupPlan quotaPlan) {
        return shouldDeleteWithoutQuota(entry, sortedIndex, options) || quotaPlan.selected(entry.directory());
    }

    private boolean shouldDeleteWithoutQuota(ReportIndexEntry entry, int sortedIndex, ReportCleanupOptions options) {
        if (isProtectedByLatest(sortedIndex, options)) {
            return false;
        }
        Integer keepLatest = options.getKeepLatest();
        boolean deleteByKeepLatest = keepLatest != null && sortedIndex >= keepLatest;
        boolean deleteByCutoff = isFinishedBefore(entry.finishedAt(), options.getDeleteFinishedBefore());
        boolean deleteByStatus = options.getDeleteStatuses().contains(entry.status());
        return deleteByKeepLatest || deleteByCutoff || deleteByStatus;
    }

    private ReportCleanupResult.UnreferencedCleanupRunSelectorPlan cleanupRunSelectorPlan(
            ReportIndexEntry entry,
            int sortedIndex,
            ReportCleanupOptions options,
            QuotaCleanupPlan quotaPlan) {
        boolean protectedByKeepLatest = isProtectedByLatest(sortedIndex, options);
        boolean selectedByKeepLatest = !protectedByKeepLatest
                && options.getKeepLatest() != null
                && sortedIndex >= options.getKeepLatest();
        boolean selectedByCutoff = !protectedByKeepLatest
                && isFinishedBefore(entry.finishedAt(), options.getDeleteFinishedBefore());
        boolean selectedByStatus = !protectedByKeepLatest
                && options.getDeleteStatuses().contains(entry.status());
        QuotaTraversalStep quotaStep = quotaPlan.step(entry.directory());
        boolean selectedByQuota = quotaStep != null && quotaStep.selectedByQuota();
        return new ReportCleanupResult.UnreferencedCleanupRunSelectorPlan(
                sortedIndex,
                entry.status(),
                entry.finishedAt(),
                entry.sizeBytes(),
                options.getKeepLatest(),
                protectedByKeepLatest,
                selectedByKeepLatest,
                options.getDeleteFinishedBefore() == null ? null : options.getDeleteFinishedBefore().toString(),
                selectedByCutoff,
                List.copyOf(options.getDeleteStatuses()),
                selectedByStatus,
                options.getMaxTotalBytes(),
                quotaStep == null ? null : quotaStep.retainedBytesBefore(),
                quotaStep == null ? null : quotaStep.retainedBytesAfter(),
                quotaStep == null ? null : quotaStep.freedBytes(),
                quotaStep == null ? null : quotaStep.eligible(),
                selectedByQuota,
                cleanupRunSelectorExplanation(
                        protectedByKeepLatest,
                        selectedByKeepLatest,
                        selectedByCutoff,
                        selectedByStatus,
                        selectedByQuota));
    }

    private String cleanupRunSelectorExplanation(
            boolean protectedByKeepLatest,
            boolean selectedByKeepLatest,
            boolean selectedByCutoff,
            boolean selectedByStatus,
            boolean selectedByQuota) {
        if (protectedByKeepLatest) {
            return "Run is protected by the keep-latest selector.";
        }
        List<String> selectors = new ArrayList<>();
        if (selectedByKeepLatest) {
            selectors.add("keep-latest");
        }
        if (selectedByCutoff) {
            selectors.add("cutoff");
        }
        if (selectedByStatus) {
            selectors.add("status");
        }
        if (selectedByQuota) {
            selectors.add("quota");
        }
        if (selectors.isEmpty()) {
            return "Run did not match keep-latest, cutoff, status, or quota cleanup selectors.";
        }
        return "Run matched cleanup selector(s): " + String.join(", ", selectors) + ".";
    }

    private boolean isProtectedByLatest(int sortedIndex, ReportCleanupOptions options) {
        Integer keepLatest = options.getKeepLatest();
        return keepLatest != null && sortedIndex < keepLatest;
    }

    private record QuotaCleanupPlan(Set<Path> selected, Map<Path, QuotaTraversalStep> steps) {
        private static QuotaCleanupPlan empty() {
            return new QuotaCleanupPlan(Set.of(), Map.of());
        }

        private boolean selected(Path directory) {
            return selected.contains(directory);
        }

        private QuotaTraversalStep step(Path directory) {
            return steps.get(directory);
        }
    }

    private record QuotaTraversalStep(
            long retainedBytesBefore,
            long retainedBytesAfter,
            long freedBytes,
            boolean eligible,
            boolean selectedByQuota) {
    }

    private long saturatedAdd(long left, long right) {
        return saturatedAddStatic(left, right);
    }

    private static long saturatedAddStatic(long left, long right) {
        long result = left + right;
        if (((left ^ result) & (right ^ result)) < 0) {
            return Long.MAX_VALUE;
        }
        return result;
    }

    private long directorySize(Path directory) throws IOException {
        if (directory == null || !Files.exists(directory)) {
            return 0L;
        }
        try (Stream<Path> paths = Files.walk(directory)) {
            long size = 0L;
            for (Path path : paths.filter(Files::isRegularFile).toList()) {
                size = saturatedAdd(size, Files.size(path));
            }
            return size;
        }
    }

    private boolean isFinishedBefore(String finishedAt, Instant cutoff) {
        if (cutoff == null || finishedAt == null || finishedAt.isBlank()) {
            return false;
        }
        try {
            return Instant.parse(finishedAt).isBefore(cutoff);
        } catch (RuntimeException e) {
            return false;
        }
    }

    private void deleteDirectory(Path directory) throws IOException {
        try (Stream<Path> paths = Files.walk(directory)) {
            List<Path> ordered = paths.sorted(Comparator.reverseOrder()).toList();
            for (Path path : ordered) {
                Files.deleteIfExists(path);
            }
        }
    }

    private List<Path> pruneArtifacts(Path runDirectory, boolean dryRun) throws IOException {
        Map<String, Object> report = readReportJson(runDirectory.resolve("report.json"));
        if (report == null) {
            return List.of();
        }
        List<Path> artifacts = artifactPaths(runDirectory, report);
        List<Path> deleted = new ArrayList<>();
        for (Path artifact : artifacts) {
            if (!Files.exists(artifact)) {
                continue;
            }
            deleted.add(artifact);
            if (!dryRun) {
                if (Files.isDirectory(artifact)) {
                    deleteDirectory(artifact);
                } else {
                    Files.deleteIfExists(artifact);
                }
            }
        }
        if (!dryRun) {
            deleteEmptyArtifactDirectories(runDirectory);
            if (!deleted.isEmpty()) {
                markPrunedArtifacts(runDirectory, report, deleted);
                Files.writeString(runDirectory.resolve("report.json"), Jsons.writeValueAsString(report),
                        StandardCharsets.UTF_8);
                Files.writeString(runDirectory.resolve("report.html"), htmlReport(report), StandardCharsets.UTF_8);
            }
        }
        return deleted;
    }

    private UnreferencedFileDiagnostic unreferencedFileDiagnostic(Path runDirectory) throws IOException {
        Map<String, Object> report = readReportJson(runDirectory.resolve("report.json"));
        if (report == null) {
            return new UnreferencedFileDiagnostic(0, 0L, List.of());
        }
        List<ArtifactDiagnostic> artifacts = artifactDiagnostics(runDirectory, report);
        return unreferencedFiles(runDirectory, artifacts);
    }

    private UnreferencedFileSelection selectUnreferencedFiles(
            List<UnreferencedFileInfo> unreferencedFiles,
            ReportCleanupOptions options,
            Instant measuredAt) {
        List<UnreferencedFileInfo> selected = new ArrayList<>();
        List<UnreferencedFileInfo> retainedByMinAge = new ArrayList<>();
        List<UnreferencedFileInfo> retainedByBucket = new ArrayList<>();
        for (UnreferencedFileInfo file : unreferencedFiles) {
            long fileAgeSeconds = ageSeconds(file.lastModifiedAt(), measuredAt);
            Long minAgeSeconds = options.getUnreferencedFileMinAgeSeconds();
            if (minAgeSeconds != null && fileAgeSeconds < minAgeSeconds) {
                retainedByMinAge.add(file);
                continue;
            }
            if (!options.getUnreferencedFileAgeBuckets().isEmpty()
                    && !options.getUnreferencedFileAgeBuckets().contains(retentionBucket(fileAgeSeconds).key())) {
                retainedByBucket.add(file);
                continue;
            }
            selected.add(file);
        }
        return new UnreferencedFileSelection(
                List.copyOf(selected),
                List.copyOf(retainedByMinAge),
                List.copyOf(retainedByBucket));
    }

    private void deleteUnreferencedFiles(Path runDirectory, List<UnreferencedFileInfo> files) throws IOException {
        for (UnreferencedFileInfo file : files) {
            Files.deleteIfExists(file.path());
        }
        if (!files.isEmpty()) {
            deleteEmptyArtifactDirectories(runDirectory);
        }
    }

    private void markPrunedArtifacts(Path runDirectory, Map<String, Object> report, List<Path> deletedArtifacts) {
        Set<Path> deleted = new HashSet<>();
        for (Path artifact : deletedArtifacts) {
            deleted.add(artifact.toAbsolutePath().normalize());
        }
        String prunedAt = Instant.now().toString();
        Path normalizedRunDirectory = runDirectory.toAbsolutePath().normalize();
        for (Object value : list(report.get("steps"))) {
            Map<String, Object> step = mutableMap(value);
            if (step == null) {
                continue;
            }
            if (deleted.contains(normalizedArtifactPath(normalizedRunDirectory, step.get("artifactPath")))) {
                step.put("artifactPruned", true);
                step.put("artifactPrunedAt", prunedAt);
            }
            for (Object artifactValue : list(step.get("artifacts"))) {
                Map<String, Object> artifact = mutableMap(artifactValue);
                if (artifact != null && deleted.contains(normalizedArtifactPath(normalizedRunDirectory, artifact.get("path")))) {
                    artifact.put("pruned", true);
                    artifact.put("prunedAt", prunedAt);
                    artifact.put("preview", null);
                }
            }
        }
    }

    private List<Path> markMissingArtifactsPrunedInRun(Path runDirectory, boolean dryRun) throws IOException {
        Map<String, Object> report = readReportJson(runDirectory.resolve("report.json"));
        if (report == null) {
            return List.of();
        }
        List<Path> missingArtifacts = missingUnmarkedArtifactPaths(runDirectory, report);
        if (!dryRun && !missingArtifacts.isEmpty()) {
            markPrunedArtifacts(runDirectory, report, missingArtifacts);
            Files.writeString(runDirectory.resolve("report.json"), Jsons.writeValueAsString(report),
                    StandardCharsets.UTF_8);
            Files.writeString(runDirectory.resolve("report.html"), htmlReport(report), StandardCharsets.UTF_8);
        }
        return missingArtifacts;
    }

    private List<Path> missingUnmarkedArtifactPaths(Path runDirectory, Map<String, Object> report) {
        Set<Path> paths = new LinkedHashSet<>();
        Path normalizedRunDirectory = runDirectory.toAbsolutePath().normalize();
        for (Object value : list(report.get("steps"))) {
            Map<?, ?> step = map(value);
            addMissingArtifactPath(
                    paths,
                    normalizedRunDirectory,
                    step.get("artifactPath"),
                    booleanValue(step.get("artifactPruned")));
            for (Object artifactValue : list(step.get("artifacts"))) {
                Map<?, ?> artifact = map(artifactValue);
                addMissingArtifactPath(
                        paths,
                        normalizedRunDirectory,
                        artifact.get("path"),
                        booleanValue(artifact.get("pruned")));
            }
        }
        return List.copyOf(paths);
    }

    private void addMissingArtifactPath(Set<Path> paths, Path runDirectory, Object value, boolean alreadyPruned) {
        if (alreadyPruned) {
            return;
        }
        String pathText = text(value);
        if (pathText.isBlank()) {
            return;
        }
        Path path = Path.of(pathText);
        Path normalized = path.isAbsolute()
                ? path.toAbsolutePath().normalize()
                : runDirectory.resolve(path).normalize();
        if (normalized.startsWith(runDirectory)
                && !normalized.equals(runDirectory.resolve("report.json"))
                && !normalized.equals(runDirectory.resolve("report.html"))
                && !Files.exists(normalized)) {
            paths.add(normalized);
        }
    }

    private Path normalizedArtifactPath(Path runDirectory, Object value) {
        String pathText = text(value);
        if (pathText.isBlank()) {
            return null;
        }
        Path path = Path.of(pathText);
        return path.isAbsolute()
                ? path.toAbsolutePath().normalize()
                : runDirectory.resolve(path).normalize();
    }

    private List<Path> artifactPaths(Path runDirectory, Map<String, Object> report) {
        Set<Path> paths = new LinkedHashSet<>();
        Path normalizedRunDirectory = runDirectory.toAbsolutePath().normalize();
        for (Object value : list(report.get("steps"))) {
            Map<?, ?> step = map(value);
            addArtifactPath(paths, normalizedRunDirectory, step.get("artifactPath"));
            for (Object artifactValue : list(step.get("artifacts"))) {
                addArtifactPath(paths, normalizedRunDirectory, map(artifactValue).get("path"));
            }
        }
        return List.copyOf(paths);
    }

    private List<ArtifactDiagnostic> artifactDiagnostics(Path runDirectory, Map<String, Object> report)
            throws IOException {
        Map<Path, ArtifactDiagnostic> artifacts = new LinkedHashMap<>();
        Path normalizedRunDirectory = runDirectory.toAbsolutePath().normalize();
        for (Object value : list(report.get("steps"))) {
            Map<?, ?> step = map(value);
            addArtifactDiagnostic(
                    artifacts,
                    normalizedRunDirectory,
                    step.get("artifactPath"),
                    "legacy",
                    booleanValue(step.get("artifactPruned")));
            for (Object artifactValue : list(step.get("artifacts"))) {
                Map<?, ?> artifact = map(artifactValue);
                addArtifactDiagnostic(
                        artifacts,
                        normalizedRunDirectory,
                        artifact.get("path"),
                        text(artifact.get("type")),
                        booleanValue(artifact.get("pruned")));
            }
        }
        return List.copyOf(artifacts.values());
    }

    private void addArtifactDiagnostic(
            Map<Path, ArtifactDiagnostic> artifacts,
            Path runDirectory,
            Object value,
            String type,
            boolean pruned) throws IOException {
        Path normalized = normalizedArtifactPath(runDirectory, value);
        if (normalized == null
                || !normalized.startsWith(runDirectory)
                || normalized.equals(runDirectory.resolve("report.json"))
                || normalized.equals(runDirectory.resolve("report.html"))) {
            return;
        }
        String safeType = type == null || type.isBlank() ? "unknown" : type;
        boolean exists = Files.exists(normalized);
        long bytes = 0L;
        if (exists) {
            bytes = Files.isDirectory(normalized) ? directorySize(normalized) : Files.size(normalized);
        }
        ArtifactDiagnostic previous = artifacts.get(normalized);
        if (previous != null) {
            String mergedType = "legacy".equals(previous.type()) && !"legacy".equals(safeType)
                    ? safeType
                    : previous.type();
            artifacts.put(normalized, new ArtifactDiagnostic(
                    mergedType,
                    normalized,
                    bytes,
                    !exists && !(previous.pruned() || pruned),
                    previous.pruned() || pruned));
            return;
        }
        artifacts.put(normalized, new ArtifactDiagnostic(
                safeType,
                normalized,
                bytes,
                !exists && !pruned,
                pruned));
    }

    private void addArtifactPath(Set<Path> paths, Path runDirectory, Object value) {
        String pathText = text(value);
        if (pathText.isBlank()) {
            return;
        }
        Path path = Path.of(pathText);
        Path normalized = path.isAbsolute()
                ? path.toAbsolutePath().normalize()
                : runDirectory.resolve(path).normalize();
        if (normalized.startsWith(runDirectory)
                && !normalized.equals(runDirectory.resolve("report.json"))
                && !normalized.equals(runDirectory.resolve("report.html"))) {
            paths.add(normalized);
        }
    }

    private void deleteEmptyArtifactDirectories(Path runDirectory) throws IOException {
        Path normalizedRunDirectory = runDirectory.toAbsolutePath().normalize();
        try (Stream<Path> paths = Files.walk(normalizedRunDirectory)) {
            List<Path> directories = paths.filter(Files::isDirectory)
                    .sorted(Comparator.reverseOrder())
                    .toList();
            for (Path directory : directories) {
                if (directory.equals(normalizedRunDirectory)) {
                    continue;
                }
                try (Stream<Path> children = Files.list(directory)) {
                    if (children.findAny().isEmpty()) {
                        Files.deleteIfExists(directory);
                    }
                }
            }
        }
    }

    private List<ReportIndexEntry> remainingEntries(List<ReportIndexEntry> entries, List<Path> deleted) {
        if (deleted.isEmpty()) {
            return entries;
        }
        List<ReportIndexEntry> remaining = new ArrayList<>();
        for (ReportIndexEntry entry : entries) {
            if (!deleted.contains(entry.directory())) {
                remaining.add(entry);
            }
        }
        return remaining;
    }

    private String cleanupDryRunHtml(ReportCleanupResult result) {
        StringBuilder html = new StringBuilder();
        html.append("""
                <!doctype html>
                <html lang="en">
                  <head>
                    <meta charset="utf-8">
                    <title>Cleanup Dry Run</title>
                    <style>
                      body { font-family: Arial, sans-serif; margin: 24px; color: #1f2933; background: #f7f9fb; }
                      h1 { margin: 0 0 8px; font-size: 28px; }
                      h2 { margin: 20px 0 10px; font-size: 18px; }
                      .meta { color: #52616b; margin-bottom: 16px; overflow-wrap: anywhere; }
                      .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 14px 0; }
                      .metric { border: 1px solid #d9e2ec; border-radius: 8px; padding: 10px; background: #ffffff; color: #52616b; }
                      .metric strong { display: block; margin-top: 4px; color: #1f2933; font-size: 18px; }
                      .notice { margin: 12px 0; padding: 12px; border: 1px solid #d9e2ec; border-radius: 8px; background: #ffffff; color: #52616b; }
                      table { width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #d9e2ec; margin-bottom: 16px; }
                      th, td { text-align: left; border-bottom: 1px solid #d9e2ec; padding: 8px; vertical-align: top; font-size: 13px; }
                      th { background: #edf2f7; }
                      .selected { color: #0f7b3f; font-weight: 700; }
                      .retained { color: #7c5e10; font-weight: 700; }
                      code { background: #edf2f7; border-radius: 8px; padding: 2px 5px; overflow-wrap: anywhere; }
                    </style>
                  </head>
                  <body>
                    <h1>Cleanup Dry Run</h1>
                """);
        html.append("<div class=\"meta\">Report root: ").append(escape(result.reportRoot()))
                .append("<br>Artifact: ").append(escape(result.dryRunHtmlPath()))
                .append("</div>\n");
        html.append("<section class=\"summary\">");
        cleanupMetric(html, "Scanned runs", result.scannedRuns());
        cleanupMetric(html, "Kept runs", result.keptRuns());
        cleanupMetric(html, "Would delete runs", result.deletedRunDirectories().size());
        cleanupMetric(html, "Would delete artifacts", result.deletedArtifactPaths().size());
        cleanupMetric(html, "Would delete unreferenced", result.deletedUnreferencedFilePaths().size());
        cleanupMetric(html, "Selected bytes", cleanupSelectedUnreferencedBytes(result));
        html.append("</section>\n");
        cleanupDryRunPaths(html, "Runs", result.deletedRunDirectories());
        cleanupDryRunPaths(html, "Artifacts", result.deletedArtifactPaths());
        cleanupDryRunPaths(html, "Unreferenced Files", result.deletedUnreferencedFilePaths());
        cleanupDryRunUnreferencedPlan(html, result.unreferencedCleanupPlan());
        html.append("</body></html>\n");
        return html.toString();
    }

    private String cleanupSelectedUnreferencedBytes(ReportCleanupResult result) {
        ReportCleanupResult.UnreferencedCleanupPlan plan = result.unreferencedCleanupPlan();
        if (plan != null) {
            return formatBytes(plan.selectedUnreferencedBytes());
        }
        return formatBytes(result.deletedUnreferencedFileRetentionHints()
                .stream()
                .mapToLong(ReportCleanupResult.UnreferencedFileRetentionHint::bytes)
                .reduce(0L, DefaultReportEngine::saturatedAddStatic));
    }

    private void cleanupMetric(StringBuilder html, String label, Object value) {
        html.append("<div class=\"metric\">").append(escape(label)).append("<strong>")
                .append(escape(value)).append("</strong></div>");
    }

    private void cleanupDryRunPaths(StringBuilder html, String title, List<Path> paths) {
        html.append("<h2>").append(escape(title)).append("</h2>\n");
        if (paths.isEmpty()) {
            html.append("<div class=\"notice\">No matching paths.</div>\n");
            return;
        }
        html.append("<table><thead><tr><th>Path</th></tr></thead><tbody>\n");
        for (Path path : paths) {
            html.append("<tr><td><code>").append(escape(path)).append("</code></td></tr>\n");
        }
        html.append("</tbody></table>\n");
    }

    private void cleanupDryRunUnreferencedPlan(
            StringBuilder html,
            ReportCleanupResult.UnreferencedCleanupPlan plan) {
        html.append("<h2>Unreferenced Cleanup Plan</h2>\n");
        if (plan == null) {
            html.append("<div class=\"notice\">No unreferenced-file cleanup plan was requested.</div>\n");
            return;
        }
        html.append("<section class=\"summary\">");
        cleanupMetric(html, "Selected runs", plan.selectedRuns());
        cleanupMetric(html, "Retained runs", plan.retainedRuns());
        cleanupMetric(html, "Scanned files", plan.scannedUnreferencedFiles());
        cleanupMetric(html, "Selected files", plan.selectedUnreferencedFiles());
        cleanupMetric(html, "Retained files", plan.retainedUnreferencedFiles());
        cleanupMetric(html, "Selected bytes", formatBytes(plan.selectedUnreferencedBytes()));
        html.append("</section>\n");
        if (!plan.retentionReasons().isEmpty()) {
            html.append("<table><thead><tr><th>Retention reason</th><th>Count</th><th>Bytes</th></tr></thead><tbody>\n");
            for (ReportCleanupResult.UnreferencedCleanupRetentionReason reason : plan.retentionReasons()) {
                html.append("<tr><td>").append(escape(reason.reason())).append("</td><td>")
                        .append(reason.count()).append("</td><td>")
                        .append(escape(formatBytes(reason.bytes()))).append("</td></tr>\n");
            }
            html.append("</tbody></table>\n");
        }
        cleanupDryRunSelectorRows(html, plan);
        cleanupDryRunFileRows(html, plan);
    }

    private void cleanupDryRunSelectorRows(
            StringBuilder html,
            ReportCleanupResult.UnreferencedCleanupPlan plan) {
        html.append("<table><thead><tr><th>Run</th><th>Decision</th><th>Selectors</th><th>Explanation</th><th>Bytes</th></tr></thead><tbody>\n");
        for (ReportCleanupResult.UnreferencedCleanupRunPlan run : plan.runs()) {
            ReportCleanupResult.UnreferencedCleanupRunSelectorPlan selector = run.selectorPlan();
            html.append("<tr><td>").append(escape(run.runId())).append("<br><code>")
                    .append(escape(run.directory())).append("</code></td><td class=\"")
                    .append(run.selectedByCleanupSelectors() ? "selected" : "retained")
                    .append("\">")
                    .append(run.selectedByCleanupSelectors() ? "selected" : "retained")
                    .append("</td><td>")
                    .append(cleanupDryRunSelectorSummary(selector))
                    .append("</td><td>")
                    .append(escape(selector == null ? "" : selector.explanation()))
                    .append("</td><td>")
                    .append(escape(formatBytes(run.scannedUnreferencedBytes())))
                    .append("</td></tr>\n");
        }
        html.append("</tbody></table>\n");
    }

    private String cleanupDryRunSelectorSummary(
            ReportCleanupResult.UnreferencedCleanupRunSelectorPlan selector) {
        if (selector == null) {
            return "";
        }
        return "index " + selector.sortedIndex()
                + ", keep-latest " + escape(selector.configuredKeepLatest() == null
                        ? "(none)"
                        : selector.configuredKeepLatest())
                + ", protected " + selector.protectedByKeepLatest()
                + ", keep-latest match " + selector.selectedByKeepLatest()
                + ", cutoff match " + selector.selectedByCutoff()
                + ", status match " + selector.selectedByStatus()
                + ", quota eligible " + (selector.quotaEligible() == null ? "(none)" : selector.quotaEligible())
                + ", quota before " + escape(selector.quotaRetainedBytesBefore() == null
                        ? "(none)"
                        : formatBytes(selector.quotaRetainedBytesBefore()))
                + ", quota after " + escape(selector.quotaRetainedBytesAfter() == null
                        ? "(none)"
                        : formatBytes(selector.quotaRetainedBytesAfter()))
                + ", quota freed " + escape(selector.quotaFreedBytes() == null
                        ? "(none)"
                        : formatBytes(selector.quotaFreedBytes()))
                + ", quota match " + selector.selectedByQuota();
    }

    private void cleanupDryRunFileRows(
            StringBuilder html,
            ReportCleanupResult.UnreferencedCleanupPlan plan) {
        boolean hasFiles = plan.runs().stream().anyMatch(run -> !run.files().isEmpty());
        if (!hasFiles) {
            html.append("<div class=\"notice\">Run with <code>--verbose-unreferenced-cleanup</code> to include per-file predicate rows.</div>\n");
            return;
        }
        html.append("<table><thead><tr><th>Run</th><th>Decision</th><th>Reason</th><th>Predicates</th><th>File</th></tr></thead><tbody>\n");
        for (ReportCleanupResult.UnreferencedCleanupRunPlan run : plan.runs()) {
            for (ReportCleanupResult.UnreferencedCleanupFilePlan file : run.files()) {
                html.append("<tr><td>").append(escape(run.runId())).append("</td><td class=\"")
                        .append(escape(file.decision())).append("\">").append(escape(file.decision()))
                        .append("</td><td>").append(escape(file.reason())).append("<br>")
                        .append(escape(file.explanation())).append("</td><td>")
                        .append("ageSeconds ").append(file.ageSeconds())
                        .append(", bucket ").append(escape(file.ageBucket()))
                        .append(", minAge ").append(escape(file.configuredMinAgeSeconds() == null
                                ? "(none)"
                                : file.configuredMinAgeSeconds()))
                        .append(", selectedBuckets ").append(escape(file.selectedAgeBuckets().isEmpty()
                                ? "(none)"
                                : file.selectedAgeBuckets()))
                        .append("</td><td><code>").append(escape(file.path())).append("</code><br>")
                        .append(escape(file.type())).append(", ")
                        .append(escape(formatBytes(file.bytes()))).append(", modified ")
                        .append(escape(file.lastModifiedAt())).append("</td></tr>\n");
            }
        }
        html.append("</tbody></table>\n");
    }

    private String reportIndex(Path reportRoot, List<ReportIndexEntry> entries) {
        return reportIndex(reportRoot, entries, null);
    }

    private String reportIndex(
            Path reportRoot,
            List<ReportIndexEntry> entries,
            Path latestDryRunHtmlPath) {
        StringBuilder html = new StringBuilder();
        int failedRuns = failedRunCount(entries);
        ReportStorageDiagnosticsResult diagnostics = reportIndexDiagnostics(entries);
        Map<Path, ReportStorageDiagnosticsResult.RunStorageSummary> storageByDirectory =
                storageByDirectory(diagnostics);
        html.append("""
                <!doctype html>
                <html lang="en">
                  <head>
                    <meta charset="utf-8">
                    <title>Report Index</title>
                    <style>
                      body { font-family: Arial, sans-serif; margin: 24px; color: #1f2933; background: #f7f9fb; }
                      h1 { margin: 0 0 8px; font-size: 28px; }
                      .meta { color: #52616b; margin-bottom: 20px; }
                      .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 12px 0; }
                      .toolbar input, .toolbar select { border: 1px solid #9fb3c8; border-radius: 8px; padding: 8px 10px; }
                      .toolbar input[type="search"] { min-width: min(320px, 100%); }
                      .toolbar button { border: 1px solid #9fb3c8; border-radius: 8px; background: #ffffff; color: #1f2933; padding: 8px 12px; cursor: pointer; }
                      .toolbar button.active { border-color: #1769aa; background: #e6f0f8; font-weight: 700; }
                      .toolbar button:disabled { color: #9aa5b1; cursor: default; }
                      .index-status { color: #52616b; margin: 8px 0 16px; }
                      .maintenance-note { margin: 0 0 12px; padding: 12px; border: 1px solid #d9e2ec; border-radius: 8px; background: #ffffff; color: #52616b; }
                      .maintenance-note strong { color: #1f2933; }
                      .maintenance-note code { display: block; margin-top: 6px; padding: 8px; background: #edf2f7; border-radius: 8px; color: #1f2933; overflow-wrap: anywhere; }
                      .storage-diagnostics { margin: 0 0 16px; padding: 12px; border: 1px solid #d9e2ec; border-radius: 8px; background: #ffffff; }
                      .storage-diagnostics h2 { margin: 0 0 10px; font-size: 18px; }
                      .storage-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 12px; }
                      .storage-metric { border: 1px solid #d9e2ec; border-radius: 8px; padding: 10px; color: #52616b; }
                      .storage-metric strong { display: block; margin-top: 4px; color: #1f2933; font-size: 18px; }
                      .storage-table { margin-top: 8px; }
                      .storage-table th, .storage-table td { padding: 8px; font-size: 13px; }
                      .quick-links { margin: 0 0 12px; padding: 12px; border: 1px solid #d9e2ec; border-radius: 8px; background: #ffffff; }
                      .quick-links.failed { border-color: #d92d20; background: #fff4f2; color: #912018; font-weight: 700; }
                      .quick-links a { margin-right: 8px; }
                      table { width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #d9e2ec; }
                      th, td { text-align: left; border-bottom: 1px solid #d9e2ec; padding: 10px; vertical-align: top; }
                      th { background: #edf2f7; }
                      tr.failed { background: #fff8f7; }
                      tr:target { outline: 3px solid #1769aa; outline-offset: -3px; }
                      tr.hidden { display: none; }
                      .status-ok { color: #0f7b3f; font-weight: 700; }
                      .status-failed { color: #b42318; font-weight: 700; }
                      a { color: #1769aa; }
                    </style>
                  </head>
                  <body>
                    <h1>Report Index</h1>
                """);
        html.append("<div class=\"meta\">Runs: ").append(entries.size()).append("</div>\n");
        html.append(reportIndexQuickLinks(entries, failedRuns));
        html.append(reportIndexToolbar(reportRoot, entries, failedRuns, diagnostics, latestDryRunHtmlPath));
        html.append(reportIndexStorageDiagnostics(diagnostics));
        html.append("<table><thead><tr><th>Run</th><th>Status</th><th>Summary</th><th>Storage</th><th>Started</th><th>Finished</th><th>Links</th></tr></thead><tbody>\n");
        for (int index = 0; index < entries.size(); index++) {
            ReportIndexEntry entry = entries.get(index);
            boolean failed = entry.failed() > 0;
            String status = failed ? "FAILED" : "OK";
            ReportStorageDiagnosticsResult.RunStorageSummary storage =
                    storageByDirectory.get(entry.directory().toAbsolutePath().normalize());
            String searchText = String.join(" ",
                    entry.runId(),
                    status,
                    entry.startedAt(),
                    entry.finishedAt(),
                    entry.htmlPath(),
                    entry.jsonPath());
            html.append("<tr id=\"run-").append(index + 1)
                    .append("\" data-index=\"").append(index)
                    .append("\" data-status=\"").append(status)
                    .append("\" data-started=\"").append(escape(entry.startedAt()))
                    .append("\" data-finished=\"").append(escape(entry.finishedAt()))
                    .append("\" data-search=\"").append(escape(searchText)).append("\"");
            if (failed) {
                html.append(" class=\"failed\"");
            }
            html.append("><td>").append(escape(entry.runId())).append("</td>");
            html.append("<td class=\"").append(failed ? "status-failed" : "status-ok").append("\">")
                    .append(failed ? "FAILED" : "OK").append("</td>");
            html.append("<td>Total ").append(entry.total())
                    .append(", Passed ").append(entry.passed())
                    .append(", Failed ").append(entry.failed())
                    .append(", Skipped ").append(entry.skipped())
                    .append(", Duration ").append(entry.durationMs() == null ? "" : entry.durationMs())
                    .append(" ms</td>");
            html.append("<td>").append(reportIndexRunStorage(entry, storage)).append("</td>");
            html.append("<td>").append(escape(entry.startedAt())).append("</td>");
            html.append("<td>").append(escape(entry.finishedAt())).append("</td>");
            html.append("<td><a href=\"").append(escape(entry.htmlPath())).append("\">HTML</a> ")
                    .append("<a href=\"").append(escape(entry.jsonPath())).append("\">JSON</a></td></tr>\n");
        }
        html.append("</tbody></table>\n");
        html.append("""
                <script>
                  const rows = Array.from(document.querySelectorAll('tbody tr[data-status]'));
                  const searchInput = document.querySelector('[data-search-input]');
                  const dateFromInput = document.querySelector('[data-date-from]');
                  const dateToInput = document.querySelector('[data-date-to]');
                  const pageSizeSelect = document.querySelector('[data-page-size]');
                  const previousPageButton = document.querySelector('[data-page-prev]');
                  const nextPageButton = document.querySelector('[data-page-next]');
                  const indexStatus = document.querySelector('[data-index-status]');
                  const failedRows = rows.filter((row) => row.dataset.status === 'FAILED');
                  let activeFilter = 'ALL';
                  let failedCursor = -1;
                  let currentPage = 1;
                  function matchesSearch(row) {
                    const query = (searchInput?.value || '').trim().toLowerCase();
                    return query === '' || row.dataset.search.toLowerCase().includes(query);
                  }
                  function matchesDateRange(row) {
                    const startedDate = (row.dataset.started || '').slice(0, 10);
                    const dateFrom = dateFromInput?.value || '';
                    const dateTo = dateToInput?.value || '';
                    return (dateFrom === '' || startedDate >= dateFrom) && (dateTo === '' || startedDate <= dateTo);
                  }
                  function filteredRows() {
                    return rows.filter((row) => {
                      const matchesStatus = activeFilter === 'ALL' || row.dataset.status === activeFilter;
                      return matchesStatus && matchesSearch(row) && matchesDateRange(row);
                    });
                  }
                  function applyIndexFilter() {
                    const matches = filteredRows();
                    const pageSize = Number(pageSizeSelect?.value || 25);
                    const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
                    currentPage = Math.min(Math.max(1, currentPage), totalPages);
                    const firstVisible = (currentPage - 1) * pageSize;
                    const lastVisible = firstVisible + pageSize;
                    rows.forEach((row) => {
                      const filteredIndex = matches.indexOf(row);
                      row.classList.toggle('hidden', filteredIndex < firstVisible || filteredIndex >= lastVisible);
                    });
                    if (indexStatus) {
                      const firstMatch = matches.length === 0 ? 0 : firstVisible + 1;
                      const lastMatch = Math.min(lastVisible, matches.length);
                      indexStatus.textContent = `Showing ${firstMatch}-${lastMatch} of ${matches.length} matching runs. Page ${currentPage} of ${totalPages}.`;
                    }
                    if (previousPageButton) {
                      previousPageButton.disabled = currentPage <= 1;
                    }
                    if (nextPageButton) {
                      nextPageButton.disabled = currentPage >= totalPages;
                    }
                  }
                  function openAndFocus(row) {
                    if (!row) {
                      return;
                    }
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    history.replaceState(null, '', '#' + row.id);
                  }
                  function focusFailed(offset) {
                    if (failedRows.length === 0) {
                      return;
                    }
                    failedCursor = (failedCursor + offset + failedRows.length) % failedRows.length;
                    openAndFocus(failedRows[failedCursor]);
                  }
                  document.querySelectorAll('[data-filter]').forEach((button) => {
                    button.addEventListener('click', () => {
                      activeFilter = button.getAttribute('data-filter');
                      currentPage = 1;
                      document.querySelectorAll('[data-filter]').forEach((item) => item.classList.remove('active'));
                      button.classList.add('active');
                      applyIndexFilter();
                    });
                  });
                  searchInput?.addEventListener('input', () => {
                    currentPage = 1;
                    applyIndexFilter();
                  });
                  dateFromInput?.addEventListener('input', () => {
                    currentPage = 1;
                    applyIndexFilter();
                  });
                  dateToInput?.addEventListener('input', () => {
                    currentPage = 1;
                    applyIndexFilter();
                  });
                  pageSizeSelect?.addEventListener('change', () => {
                    currentPage = 1;
                    applyIndexFilter();
                  });
                  previousPageButton?.addEventListener('click', () => {
                    currentPage -= 1;
                    applyIndexFilter();
                  });
                  nextPageButton?.addEventListener('click', () => {
                    currentPage += 1;
                    applyIndexFilter();
                  });
                  applyIndexFilter();
                  document.addEventListener('keydown', (event) => {
                    const tag = event.target.tagName;
                    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.ctrlKey || event.metaKey || event.altKey) {
                      return;
                    }
                    if (event.key === '/') {
                      event.preventDefault();
                      searchInput?.focus();
                    } else if (event.key === 'f') {
                      failedCursor = -1;
                      focusFailed(1);
                    } else if (event.key === 'n') {
                      focusFailed(1);
                    } else if (event.key === 'p') {
                      focusFailed(-1);
                    }
                  });
                </script>
                """);
        html.append("</body></html>\n");
        return html.toString();
    }

    private ReportStorageDiagnosticsResult reportIndexDiagnostics(List<ReportIndexEntry> entries) {
        if (entries.isEmpty()) {
            return new ReportStorageDiagnosticsResult(
                    Path.of(""),
                    0,
                    0L,
                    0L,
                    0L,
                    0,
                    0,
                    0,
                    0,
                    List.of(),
                    List.of(),
                    null,
                    List.of(),
                    List.of());
        }
        Path reportRoot = entries.get(0).directory().toAbsolutePath().normalize().getParent();
        if (reportRoot == null) {
            reportRoot = Path.of("");
        }
        try {
            return diagnosticsForEntries(reportRoot, entries);
        } catch (IOException e) {
            long totalRunBytes = 0L;
            for (ReportIndexEntry entry : entries) {
                totalRunBytes = saturatedAdd(totalRunBytes, entry.sizeBytes());
            }
            return new ReportStorageDiagnosticsResult(
                    reportRoot,
                    entries.size(),
                    totalRunBytes,
                    0L,
                    0L,
                    0,
                    0,
                    0,
                    0,
                    List.of(),
                    List.of(),
                    null,
                    List.of(),
                    List.of());
        }
    }

    private ReportStorageDiagnosticsResult diagnosticsForEntries(Path reportRoot, List<ReportIndexEntry> entries)
            throws IOException {
        List<ReportStorageDiagnosticsResult.RunStorageSummary> runs = new ArrayList<>();
        Map<String, ArtifactTypeTotals> artifactTypeTotals = new LinkedHashMap<>();
        Map<String, FileTypeTotals> unreferencedFileTypeTotals = new LinkedHashMap<>();
        List<UnreferencedFileInfo> allUnreferencedFiles = new ArrayList<>();
        Instant diagnosedAt = Instant.now();
        long totalRunBytes = 0L;
        long referencedArtifactBytes = 0L;
        long unreferencedFileBytes = 0L;
        int referencedArtifactCount = 0;
        int unreferencedFileCount = 0;
        int missingArtifactCount = 0;
        int prunedArtifactCount = 0;
        for (ReportIndexEntry entry : entries) {
            Map<String, Object> report = readReportJson(entry.directory().resolve("report.json"));
            List<ArtifactDiagnostic> artifacts = report == null
                    ? List.of()
                    : artifactDiagnostics(entry.directory(), report);
            UnreferencedFileDiagnostic unreferencedFiles = unreferencedFiles(entry.directory(), artifacts);
            List<ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary> runUnreferencedFileTypes =
                    unreferencedFileTypes(unreferencedFiles.files());
            ReportStorageDiagnosticsResult.UnreferencedFileAgeSummary runUnreferencedFileAgeSummary =
                    unreferencedFileAgeSummary(unreferencedFiles.files(), diagnosedAt);
            List<ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary> runUnreferencedFileAgeBuckets =
                    unreferencedFileAgeBuckets(unreferencedFiles.files(), diagnosedAt);
            long runArtifactBytes = 0L;
            int runMissingArtifacts = 0;
            int runPrunedArtifacts = 0;
            for (ArtifactDiagnostic artifact : artifacts) {
                runArtifactBytes = saturatedAdd(runArtifactBytes, artifact.bytes());
                if (artifact.missing()) {
                    runMissingArtifacts++;
                }
                if (artifact.pruned()) {
                    runPrunedArtifacts++;
                }
                artifactTypeTotals
                        .computeIfAbsent(artifact.type(), ignored -> new ArtifactTypeTotals())
                        .add(artifact);
            }
            totalRunBytes = saturatedAdd(totalRunBytes, entry.sizeBytes());
            referencedArtifactBytes = saturatedAdd(referencedArtifactBytes, runArtifactBytes);
            unreferencedFileBytes = saturatedAdd(unreferencedFileBytes, unreferencedFiles.bytes());
            referencedArtifactCount += artifacts.size();
            unreferencedFileCount += unreferencedFiles.count();
            missingArtifactCount += runMissingArtifacts;
            prunedArtifactCount += runPrunedArtifacts;
            addUnreferencedFileTypeTotals(unreferencedFileTypeTotals, unreferencedFiles.files());
            allUnreferencedFiles.addAll(unreferencedFiles.files());
            runs.add(new ReportStorageDiagnosticsResult.RunStorageSummary(
                    entry.runId(),
                    entry.directory(),
                    entry.status(),
                    entry.finishedAt(),
                    entry.sizeBytes(),
                    runArtifactBytes,
                    unreferencedFiles.bytes(),
                    artifacts.size(),
                    unreferencedFiles.count(),
                    runMissingArtifacts,
                    runPrunedArtifacts,
                    runUnreferencedFileTypes,
                    runUnreferencedFileAgeSummary,
                    runUnreferencedFileAgeBuckets));
        }
        List<ReportStorageDiagnosticsResult.ArtifactTypeSummary> artifactTypes = artifactTypeTotals.entrySet()
                .stream()
                .map(entry -> entry.getValue().summary(entry.getKey()))
                .toList();
        List<ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary> unreferencedFileTypes =
                unreferencedFileTypeTotals.entrySet()
                        .stream()
                        .map(entry -> entry.getValue().summary(entry.getKey()))
                        .toList();
        return new ReportStorageDiagnosticsResult(
                reportRoot,
                entries.size(),
                totalRunBytes,
                referencedArtifactBytes,
                unreferencedFileBytes,
                referencedArtifactCount,
                unreferencedFileCount,
                missingArtifactCount,
                prunedArtifactCount,
                List.copyOf(artifactTypes),
                List.copyOf(unreferencedFileTypes),
                unreferencedFileAgeSummary(allUnreferencedFiles, diagnosedAt),
                unreferencedFileAgeBuckets(allUnreferencedFiles, diagnosedAt),
                List.copyOf(runs));
    }

    private UnreferencedFileDiagnostic unreferencedFiles(Path runDirectory, List<ArtifactDiagnostic> artifacts)
            throws IOException {
        long bytes = 0L;
        List<UnreferencedFileInfo> files = new ArrayList<>();
        for (Path path : unreferencedFilePaths(runDirectory, artifacts)) {
            long fileBytes = Files.size(path);
            Instant lastModifiedAt = Files.getLastModifiedTime(path).toInstant();
            files.add(new UnreferencedFileInfo(path, unreferencedFileType(path), fileBytes, lastModifiedAt));
            bytes = saturatedAdd(bytes, fileBytes);
        }
        return new UnreferencedFileDiagnostic(files.size(), bytes, List.copyOf(files));
    }

    private ReportStorageDiagnosticsResult.UnreferencedFileAgeSummary unreferencedFileAgeSummary(
            List<UnreferencedFileInfo> files,
            Instant measuredAt) {
        if (files.isEmpty()) {
            return null;
        }
        Instant oldest = files.get(0).lastModifiedAt();
        Instant newest = oldest;
        for (UnreferencedFileInfo file : files) {
            Instant lastModifiedAt = file.lastModifiedAt();
            if (lastModifiedAt.isBefore(oldest)) {
                oldest = lastModifiedAt;
            }
            if (lastModifiedAt.isAfter(newest)) {
                newest = lastModifiedAt;
            }
        }
        return new ReportStorageDiagnosticsResult.UnreferencedFileAgeSummary(
                oldest.toString(),
                ageSeconds(oldest, measuredAt),
                newest.toString(),
                ageSeconds(newest, measuredAt));
    }

    private long ageSeconds(Instant lastModifiedAt, Instant measuredAt) {
        return ageSecondsStatic(lastModifiedAt, measuredAt);
    }

    private static long ageSecondsStatic(Instant lastModifiedAt, Instant measuredAt) {
        return Math.max(0L, Duration.between(lastModifiedAt, measuredAt).toSeconds());
    }

    private List<ReportCleanupResult.UnreferencedFileRetentionHint> unreferencedFileRetentionHints(
            List<UnreferencedFileInfo> files,
            Instant measuredAt) {
        List<RetentionBucketTotals> buckets = RETENTION_BUCKETS.stream()
                .map(RetentionBucketTotals::new)
                .toList();
        for (UnreferencedFileInfo file : files) {
            long ageSeconds = ageSeconds(file.lastModifiedAt(), measuredAt);
            for (RetentionBucketTotals bucket : buckets) {
                if (bucket.accepts(ageSeconds)) {
                    bucket.add(file);
                    break;
                }
            }
        }
        return buckets.stream()
                .filter(RetentionBucketTotals::hasFiles)
                .map(RetentionBucketTotals::summary)
                .toList();
    }

    private List<ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary> unreferencedFileAgeBuckets(
            List<UnreferencedFileInfo> files,
            Instant measuredAt) {
        List<RetentionBucketTotals> buckets = RETENTION_BUCKETS.stream()
                .map(RetentionBucketTotals::new)
                .toList();
        for (UnreferencedFileInfo file : files) {
            long ageSeconds = ageSeconds(file.lastModifiedAt(), measuredAt);
            for (RetentionBucketTotals bucket : buckets) {
                if (bucket.accepts(ageSeconds)) {
                    bucket.add(file);
                    break;
                }
            }
        }
        return buckets.stream()
                .filter(RetentionBucketTotals::hasFiles)
                .map(RetentionBucketTotals::diagnosticsSummary)
                .toList();
    }

    private RetentionBucketDefinition retentionBucket(long ageSeconds) {
        return retentionBucketStatic(ageSeconds);
    }

    private static RetentionBucketDefinition retentionBucketStatic(long ageSeconds) {
        for (RetentionBucketDefinition bucket : RETENTION_BUCKETS) {
            if (bucket.accepts(ageSeconds)) {
                return bucket;
            }
        }
        return RETENTION_BUCKETS.get(RETENTION_BUCKETS.size() - 1);
    }

    private void addUnreferencedFileTypeTotals(Map<String, FileTypeTotals> totals, List<UnreferencedFileInfo> files) {
        for (UnreferencedFileInfo file : files) {
            totals.computeIfAbsent(file.type(), ignored -> new FileTypeTotals()).add(file);
        }
    }

    private List<ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary> unreferencedFileTypes(
            List<UnreferencedFileInfo> files) {
        Map<String, FileTypeTotals> totals = new LinkedHashMap<>();
        addUnreferencedFileTypeTotals(totals, files);
        return totals.entrySet()
                .stream()
                .map(entry -> entry.getValue().summary(entry.getKey()))
                .toList();
    }

    private String unreferencedFileType(Path file) {
        String name = file.getFileName() == null ? "" : file.getFileName().toString().toLowerCase();
        if (name.endsWith(".log")) {
            return "log";
        }
        if (name.endsWith(".tmp")
                || name.endsWith(".temp")
                || name.endsWith(".bak")
                || name.endsWith(".swp")
                || name.endsWith("~")) {
            return "temp";
        }
        if (name.endsWith(".txt")
                || name.endsWith(".json")
                || name.endsWith(".xml")
                || name.endsWith(".csv")
                || name.endsWith(".yaml")
                || name.endsWith(".yml")) {
            return "text";
        }
        if (name.endsWith(".html") || name.endsWith(".htm")) {
            return "html";
        }
        if (name.endsWith(".png")
                || name.endsWith(".jpg")
                || name.endsWith(".jpeg")
                || name.endsWith(".gif")
                || name.endsWith(".webp")
                || name.endsWith(".svg")) {
            return "image";
        }
        if (name.endsWith(".zip")
                || name.endsWith(".gz")
                || name.endsWith(".tgz")
                || name.endsWith(".tar")
                || name.endsWith(".7z")) {
            return "archive";
        }
        return "other";
    }

    private List<Path> unreferencedFilePaths(Path runDirectory, List<ArtifactDiagnostic> artifacts)
            throws IOException {
        Path normalizedRunDirectory = runDirectory.toAbsolutePath().normalize();
        Set<Path> referencedPaths = new LinkedHashSet<>();
        for (ArtifactDiagnostic artifact : artifacts) {
            referencedPaths.add(artifact.path().toAbsolutePath().normalize());
        }
        List<Path> unreferencedFiles = new ArrayList<>();
        try (Stream<Path> paths = Files.walk(normalizedRunDirectory)) {
            for (Path path : paths.filter(Files::isRegularFile).toList()) {
                Path normalized = path.toAbsolutePath().normalize();
                if (isReportMetadataFile(normalizedRunDirectory, normalized)
                        || isReferencedArtifactFile(normalized, referencedPaths)) {
                    continue;
                }
                unreferencedFiles.add(normalized);
            }
        }
        return List.copyOf(unreferencedFiles);
    }

    private boolean isReportMetadataFile(Path runDirectory, Path file) {
        return file.equals(runDirectory.resolve("report.json"))
                || file.equals(runDirectory.resolve("report.html"));
    }

    private boolean isReferencedArtifactFile(Path file, Set<Path> referencedPaths) {
        for (Path referencedPath : referencedPaths) {
            if (file.equals(referencedPath) || file.startsWith(referencedPath)) {
                return true;
            }
        }
        return false;
    }

    private Map<Path, ReportStorageDiagnosticsResult.RunStorageSummary> storageByDirectory(
            ReportStorageDiagnosticsResult diagnostics) {
        Map<Path, ReportStorageDiagnosticsResult.RunStorageSummary> byDirectory = new LinkedHashMap<>();
        for (ReportStorageDiagnosticsResult.RunStorageSummary run : diagnostics.runs()) {
            byDirectory.put(run.directory().toAbsolutePath().normalize(), run);
        }
        return byDirectory;
    }

    private String reportIndexStorageDiagnostics(ReportStorageDiagnosticsResult diagnostics) {
        StringBuilder html = new StringBuilder();
        html.append("<section class=\"storage-diagnostics\"><h2>Storage diagnostics</h2>\n");
        html.append("<div class=\"storage-grid\">");
        storageMetric(html, "Run storage", formatBytes(diagnostics.totalRunBytes()));
        storageMetric(html, "Referenced artifacts", formatBytes(diagnostics.referencedArtifactBytes()));
        storageMetric(html, "Unreferenced files", formatBytes(diagnostics.unreferencedFileBytes()));
        storageMetric(html, "Artifact files", diagnostics.referencedArtifactCount());
        storageMetric(html, "Unreferenced count", diagnostics.unreferencedFileCount());
        storageMetric(html, "Oldest unreferenced", formatUnreferencedLastModified(
                diagnostics.unreferencedFileAgeSummary(), true));
        storageMetric(html, "Newest unreferenced", formatUnreferencedLastModified(
                diagnostics.unreferencedFileAgeSummary(), false));
        storageMetric(html, "Missing links", diagnostics.missingArtifactCount());
        storageMetric(html, "Pruned links", diagnostics.prunedArtifactCount());
        html.append("</div>\n");
        if (diagnostics.artifactTypes().isEmpty()) {
            html.append("<div class=\"meta\">No referenced artifacts found in scanned reports.</div>\n");
        } else {
            html.append("<table class=\"storage-table\"><thead><tr><th>Artifact type</th><th>Count</th><th>Bytes</th><th>Missing</th><th>Pruned</th></tr></thead><tbody>\n");
            for (ReportStorageDiagnosticsResult.ArtifactTypeSummary type : diagnostics.artifactTypes()) {
                html.append("<tr><td>").append(escape(type.type())).append("</td>")
                        .append("<td>").append(type.count()).append("</td>")
                        .append("<td>").append(formatBytes(type.bytes())).append("</td>")
                        .append("<td>").append(type.missingCount()).append("</td>")
                        .append("<td>").append(type.prunedCount()).append("</td></tr>\n");
            }
            html.append("</tbody></table>\n");
        }
        if (diagnostics.unreferencedFileTypes().isEmpty()) {
            html.append("<div class=\"meta\">No unreferenced files found in scanned reports.</div>\n");
        } else {
            html.append("<table class=\"storage-table\"><thead><tr><th>Unreferenced type</th><th>Count</th><th>Bytes</th></tr></thead><tbody>\n");
            for (ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary type : diagnostics.unreferencedFileTypes()) {
                html.append("<tr><td>").append(escape(type.type())).append("</td>")
                        .append("<td>").append(type.count()).append("</td>")
                        .append("<td>").append(formatBytes(type.bytes())).append("</td></tr>\n");
            }
            html.append("</tbody></table>\n");
        }
        if (!diagnostics.unreferencedFileAgeBuckets().isEmpty()) {
            html.append("<table class=\"storage-table\"><thead><tr><th>Unreferenced age bucket</th><th>Count</th><th>Bytes</th></tr></thead><tbody>\n");
            for (ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary bucket
                    : diagnostics.unreferencedFileAgeBuckets()) {
                html.append("<tr><td>").append(escape(bucket.label())).append("</td>")
                        .append("<td>").append(bucket.count()).append("</td>")
                        .append("<td>").append(formatBytes(bucket.bytes())).append("</td></tr>\n");
            }
            html.append("</tbody></table>\n");
        }
        html.append("</section>\n");
        return html.toString();
    }

    private void storageMetric(StringBuilder html, String label, Object value) {
        html.append("<div class=\"storage-metric\">").append(escape(label)).append("<strong>")
                .append(escape(value)).append("</strong></div>");
    }

    private String reportIndexRunStorage(
            ReportIndexEntry entry,
            ReportStorageDiagnosticsResult.RunStorageSummary storage) {
        long runBytes = storage == null ? entry.sizeBytes() : storage.runBytes();
        long artifactBytes = storage == null ? 0L : storage.referencedArtifactBytes();
        long unreferencedBytes = storage == null ? 0L : storage.unreferencedFileBytes();
        int artifactCount = storage == null ? 0 : storage.referencedArtifactCount();
        int unreferencedCount = storage == null ? 0 : storage.unreferencedFileCount();
        int missingCount = storage == null ? 0 : storage.missingArtifactCount();
        int prunedCount = storage == null ? 0 : storage.prunedArtifactCount();
        String typeSummary = storage == null || storage.unreferencedFileTypes().isEmpty()
                ? ""
                : "<br>Types " + reportIndexUnreferencedTypeSummary(storage.unreferencedFileTypes());
        String ageSummary = storage == null || storage.unreferencedFileAgeSummary() == null
                ? ""
                : "<br>Oldest " + escape(formatUnreferencedLastModified(
                        storage.unreferencedFileAgeSummary(), true));
        String bucketSummary = storage == null || storage.unreferencedFileAgeBuckets().isEmpty()
                ? ""
                : "<br>Buckets " + reportIndexUnreferencedAgeBucketSummary(storage.unreferencedFileAgeBuckets());
        return "Run " + escape(formatBytes(runBytes))
                + "<br>Artifacts " + escape(formatBytes(artifactBytes))
                + " (" + artifactCount + ")"
                + "<br>Unreferenced " + escape(formatBytes(unreferencedBytes))
                + " (" + unreferencedCount + ")"
                + typeSummary
                + ageSummary
                + bucketSummary
                + "<br>Missing " + missingCount
                + ", Pruned " + prunedCount;
    }

    private String formatUnreferencedLastModified(
            ReportStorageDiagnosticsResult.UnreferencedFileAgeSummary ageSummary,
            boolean oldest) {
        if (ageSummary == null) {
            return "(none)";
        }
        String lastModifiedAt = oldest ? ageSummary.oldestLastModifiedAt() : ageSummary.newestLastModifiedAt();
        long ageSeconds = oldest ? ageSummary.oldestAgeSeconds() : ageSummary.newestAgeSeconds();
        return lastModifiedAt + " (" + formatDuration(ageSeconds) + " old)";
    }

    private String formatDuration(long seconds) {
        long days = seconds / 86_400L;
        long hours = (seconds % 86_400L) / 3_600L;
        long minutes = (seconds % 3_600L) / 60L;
        if (days > 0) {
            return days + "d " + hours + "h";
        }
        if (hours > 0) {
            return hours + "h " + minutes + "m";
        }
        if (minutes > 0) {
            return minutes + "m";
        }
        return seconds + "s";
    }

    private String reportIndexUnreferencedTypeSummary(
            List<ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary> types) {
        StringBuilder summary = new StringBuilder();
        for (int index = 0; index < types.size(); index++) {
            ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary type = types.get(index);
            if (index > 0) {
                summary.append(", ");
            }
            summary.append(escape(type.type()))
                    .append(" ")
                    .append(type.count())
                    .append(" (")
                    .append(escape(formatBytes(type.bytes())))
                    .append(")");
        }
        return summary.toString();
    }

    private String reportIndexUnreferencedAgeBucketSummary(
            List<ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary> buckets) {
        StringBuilder summary = new StringBuilder();
        for (int index = 0; index < buckets.size(); index++) {
            ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary bucket = buckets.get(index);
            if (index > 0) {
                summary.append(", ");
            }
            summary.append(escape(bucket.label()))
                    .append(" ")
                    .append(bucket.count())
                    .append(" (")
                    .append(escape(formatBytes(bucket.bytes())))
                    .append(")");
        }
        return summary.toString();
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024L) {
            return bytes + " B";
        }
        long kib = bytes / 1024L;
        long remainder = bytes % 1024L;
        if (kib < 1024L) {
            return remainder == 0L ? kib + " KiB" : kib + "." + ((remainder * 10L) / 1024L) + " KiB";
        }
        long mib = kib / 1024L;
        long kibRemainder = kib % 1024L;
        return kibRemainder == 0L ? mib + " MiB" : mib + "." + ((kibRemainder * 10L) / 1024L) + " MiB";
    }

    private String reportIndexQuickLinks(List<ReportIndexEntry> entries, int failedRuns) {
        if (failedRuns == 0) {
            return "<div class=\"quick-links\">No failed runs.</div>\n";
        }
        StringBuilder links = new StringBuilder("<div class=\"quick-links failed\">Failed runs:");
        for (int index = 0; index < entries.size(); index++) {
            ReportIndexEntry entry = entries.get(index);
            if (entry.failed() == 0) {
                continue;
            }
            links.append(" <a href=\"#run-").append(index + 1).append("\">")
                    .append(escape(entry.runId()))
                    .append("</a>");
        }
        links.append("</div>\n");
        return links.toString();
    }

    private String reportIndexToolbar(
            Path reportRoot,
            List<ReportIndexEntry> entries,
            int failedRuns,
            ReportStorageDiagnosticsResult diagnostics,
            Path latestDryRunHtmlPath) {
        int okRuns = entries.size() - failedRuns;
        return """
                <div class="toolbar" aria-label="Run tools">
                  <input type="search" data-search-input placeholder="Search runs, status, time, or report path" aria-label="Search runs">
                  <input type="date" data-date-from aria-label="Started from date">
                  <input type="date" data-date-to aria-label="Started to date">
                  <label>Page size <select data-page-size aria-label="Page size">
                    <option value="10">10</option>
                    <option value="25" selected>25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select></label>
                  <button type="button" class="active" data-filter="ALL">All (%d)</button>
                  <button type="button" data-filter="FAILED">Failed (%d)</button>
                  <button type="button" data-filter="OK">OK (%d)</button>
                  <button type="button" data-page-prev>Previous page</button>
                  <button type="button" data-page-next>Next page</button>
                </div>
                <div class="index-status" data-index-status></div>
                %s
                <div class="meta">Keyboard: / search, f first failed, n next failed, p previous failed.</div>
                """.formatted(
                        entries.size(),
                        failedRuns,
                        okRuns,
                        reportIndexMaintenanceNote(reportRoot, diagnostics, latestDryRunHtmlPath));
    }

    private String reportIndexMaintenanceNote(
            Path reportRoot,
            ReportStorageDiagnosticsResult diagnostics,
            Path latestDryRunHtmlPath) {
        List<String> commands = new ArrayList<>();
        commands.add("report-cleanup runs --dry-run --keep-latest 20");
        commands.add("report-cleanup runs --dry-run --keep-latest 20 --prune-artifacts-only");
        String bucketRecommendation = "";
        String unreferencedCleanupBuckets = null;
        if (diagnostics.unreferencedFileCount() > 0) {
            ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary dominantBucket =
                    reportIndexDominantUnreferencedAgeBucket(diagnostics.unreferencedFileAgeBuckets());
            String buckets = reportIndexUnreferencedCleanupBuckets(dominantBucket);
            unreferencedCleanupBuckets = buckets;
            if (dominantBucket != null) {
                bucketRecommendation = "  <div class=\"meta\">Dominant unreferenced bucket: "
                        + escape(dominantBucket.label())
                        + ", " + dominantBucket.count()
                        + " files, " + escape(formatBytes(dominantBucket.bytes()))
                        + ".</div>\n";
            }
            commands.add("report-cleanup runs --dry-run --keep-latest 0 --prune-unreferenced-files-only"
                    + " --unreferenced-age-bucket " + buckets);
            commands.add("report-cleanup runs --dry-run --keep-latest 0 --prune-unreferenced-files-only"
                    + " --unreferenced-age-bucket " + buckets + " --verbose-unreferenced-cleanup");
        }
        if (diagnostics.missingArtifactCount() > 0) {
            commands.add("report-maintenance runs --mark-missing-artifacts --dry-run");
        }
        commands.add("report-diagnostics runs");

        StringBuilder html = new StringBuilder();
        html.append("<div class=\"maintenance-note\">\n")
                .append("  <strong>Report maintenance:</strong> commands are based on current storage diagnostics; start with dry-run.\n");
        html.append(reportIndexCleanupSelectorSummary(diagnostics, unreferencedCleanupBuckets));
        html.append(reportIndexDryRunArtifactLink(reportRoot, latestDryRunHtmlPath));
        html.append(bucketRecommendation);
        for (String command : commands) {
            html.append("  <code>").append(escape(command)).append("</code>\n");
        }
        html.append("</div>");
        return html.toString();
    }

    private String reportIndexDryRunArtifactLink(Path reportRoot, Path latestDryRunHtmlPath) {
        Path normalizedReportRoot = reportRoot.toAbsolutePath().normalize();
        Path dryRunHtmlPath = latestDryRunHtmlPath == null
                ? normalizedReportRoot.resolve("cleanup-dry-run.html")
                : latestDryRunHtmlPath.toAbsolutePath().normalize();
        if (!Files.isRegularFile(dryRunHtmlPath)) {
            return "";
        }
        String href;
        String label;
        if (dryRunHtmlPath.startsWith(normalizedReportRoot)) {
            Path relativePath = normalizedReportRoot.relativize(dryRunHtmlPath);
            href = htmlPath(relativePath);
            label = href;
        } else {
            href = dryRunHtmlPath.toUri().toString();
            label = dryRunHtmlPath.toString();
        }
        return "  <div class=\"meta\">Latest cleanup dry-run: <a href=\""
                + escape(href)
                + "\">"
                + escape(label)
                + "</a></div>\n";
    }

    private String htmlPath(Path path) {
        return path.toString().replace('\\', '/');
    }

    private String reportIndexCleanupSelectorSummary(
            ReportStorageDiagnosticsResult diagnostics,
            String unreferencedCleanupBuckets) {
        int protectedRuns = Math.min(diagnostics.scannedRuns(), 20);
        int selectedRuns = Math.max(0, diagnostics.scannedRuns() - protectedRuns);
        StringBuilder summary = new StringBuilder("  <div class=\"meta\">Cleanup selector summary: keep-latest 20 protects ")
                .append(protectedRuns)
                .append(" run")
                .append(protectedRuns == 1 ? "" : "s")
                .append(" and selects ")
                .append(selectedRuns)
                .append(" older run")
                .append(selectedRuns == 1 ? "" : "s")
                .append(".");
        if (unreferencedCleanupBuckets != null) {
            BucketMatch bucketMatch = reportIndexUnreferencedBucketMatch(
                    diagnostics.unreferencedFileAgeBuckets(),
                    unreferencedCleanupBuckets);
            summary.append(" Unreferenced selector keep-latest 0 selects ")
                    .append(diagnostics.scannedRuns())
                    .append(" run")
                    .append(diagnostics.scannedRuns() == 1 ? "" : "s")
                    .append("; buckets ")
                    .append(escape(unreferencedCleanupBuckets))
                    .append(" match ")
                    .append(bucketMatch.count())
                    .append(" file")
                    .append(bucketMatch.count() == 1 ? "" : "s")
                    .append(", ")
                    .append(escape(formatBytes(bucketMatch.bytes())))
                    .append(".");
        }
        summary.append("</div>\n");
        return summary.toString();
    }

    private BucketMatch reportIndexUnreferencedBucketMatch(
            List<ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary> buckets,
            String selectedBuckets) {
        Set<String> selected = new LinkedHashSet<>();
        for (String bucket : selectedBuckets.split(",")) {
            String normalized = bucket.trim();
            if (!normalized.isBlank()) {
                selected.add(normalized);
            }
        }
        int count = 0;
        long bytes = 0L;
        for (ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary bucket : buckets) {
            if (selected.contains(bucket.key())) {
                count += bucket.count();
                bytes = saturatedAdd(bytes, bucket.bytes());
            }
        }
        return new BucketMatch(count, bytes);
    }

    private ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary reportIndexDominantUnreferencedAgeBucket(
            List<ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary> buckets) {
        ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary dominant = null;
        for (ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary bucket : buckets) {
            if (dominant == null
                    || bucket.count() > dominant.count()
                    || (bucket.count() == dominant.count() && bucket.bytes() > dominant.bytes())
                    || (bucket.count() == dominant.count()
                            && bucket.bytes() == dominant.bytes()
                            && bucket.minAgeSeconds() > dominant.minAgeSeconds())) {
                dominant = bucket;
            }
        }
        return dominant;
    }

    private String reportIndexUnreferencedCleanupBuckets(
            ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary bucket) {
        if (bucket == null) {
            return "fresh,recent,stale,old,ancient";
        }
        long bucketMinAgeSeconds = bucket.minAgeSeconds();
        if (bucketMinAgeSeconds >= 2_592_000L) {
            return "ancient";
        }
        if (bucketMinAgeSeconds >= 604_800L) {
            return "old,ancient";
        }
        if (bucketMinAgeSeconds >= 86_400L) {
            return "stale,old,ancient";
        }
        if (bucketMinAgeSeconds >= 3_600L) {
            return "recent,stale,old,ancient";
        }
        return "fresh,recent,stale,old,ancient";
    }

    private int failedRunCount(List<ReportIndexEntry> entries) {
        int count = 0;
        for (ReportIndexEntry entry : entries) {
            if (entry.failed() > 0) {
                count++;
            }
        }
        return count;
    }

    private String hrefPath(Path path) {
        return path.toString().replace('\\', '/');
    }

    private record ReportIndexEntry(
            String runId,
            String startedAt,
            String finishedAt,
            int total,
            int passed,
            int failed,
            int skipped,
            Long durationMs,
            String htmlPath,
            String jsonPath,
            long sizeBytes,
            Path directory) {
        private String status() {
            return failed > 0 ? "FAILED" : "OK";
        }
    }

    private String htmlReport(Map<String, Object> report) {
        Map<?, ?> summary = map(report.get("summary"));
        List<?> steps = list(report.get("steps"));
        StringBuilder html = new StringBuilder();
        html.append("""
                <!doctype html>
                <html lang="en">
                  <head>
                    <meta charset="utf-8">
                    <title>Run Report</title>
                    <style>
                      body { font-family: Arial, sans-serif; margin: 24px; color: #1f2933; background: #f7f9fb; }
                      h1 { margin: 0 0 8px; font-size: 28px; }
                      h2 { margin-top: 28px; font-size: 20px; }
                      .meta { color: #52616b; margin-bottom: 20px; }
                      .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
                      .metric { background: #ffffff; border: 1px solid #d9e2ec; border-radius: 8px; padding: 12px; }
                      .metric strong { display: block; font-size: 22px; margin-top: 4px; }
                      .metric.failed { border-color: #d92d20; background: #fff4f2; }
                      .alert { margin: 18px 0 0; padding: 12px; border: 1px solid #d92d20; border-radius: 8px; background: #fff4f2; color: #912018; font-weight: 700; }
                      .alert a { color: #912018; }
                      .keyboard-help { margin: 18px 0 0; padding: 12px; border: 1px solid #d9e2ec; border-radius: 8px; background: #ffffff; color: #52616b; }
                      .keyboard-help strong { color: #1f2933; }
                      .maintenance-note { margin: 18px 0 0; padding: 12px; border: 1px solid #d9e2ec; border-radius: 8px; background: #ffffff; color: #52616b; }
                      .maintenance-note strong { color: #1f2933; }
                      .maintenance-note code { display: block; margin-top: 6px; padding: 8px; background: #edf2f7; border-radius: 8px; color: #1f2933; overflow-wrap: anywhere; }
                      .slow-summary { margin: 18px 0 0; padding: 12px; border: 1px solid #d9e2ec; border-radius: 8px; background: #ffffff; }
                      .slow-summary h2 { margin: 0 0 8px; font-size: 16px; }
                      .slow-summary ol { margin: 0; padding-left: 22px; }
                      .slow-summary li { margin: 4px 0; }
                      .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
                      .toolbar button { border: 1px solid #9fb3c8; border-radius: 8px; background: #ffffff; color: #1f2933; padding: 8px 12px; cursor: pointer; }
                      .toolbar button.active { border-color: #1769aa; background: #e6f0f8; font-weight: 700; }
                      table { width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #d9e2ec; }
                      th, td { text-align: left; border-bottom: 1px solid #d9e2ec; padding: 10px; vertical-align: top; }
                      th { background: #edf2f7; }
                      tr.failed { background: #fff8f7; }
                      tr.slow { box-shadow: inset 4px 0 0 #c2410c; }
                      tr:target { outline: 3px solid #1769aa; outline-offset: -3px; }
                      tr.hidden { display: none; }
                      .status-SUCCESS { color: #0f7b3f; font-weight: 700; }
                      .status-FAILED { color: #b42318; font-weight: 700; }
                      .status-SKIPPED { color: #7c5e10; font-weight: 700; }
                      a { color: #1769aa; }
                      .step-details summary { cursor: pointer; font-weight: 700; }
                      .detail-meta { color: #52616b; font-size: 12px; margin: 8px 0; overflow-wrap: anywhere; }
                      .artifact { margin-bottom: 10px; }
                      .artifact-pruned { display: inline-block; color: #6b4f0b; font-weight: 700; }
                      .artifact-meta { color: #52616b; font-size: 12px; margin-top: 4px; overflow-wrap: anywhere; }
                      .artifact img { display: block; width: min(360px, 100%); max-height: 240px; object-fit: contain; margin-top: 6px; border: 1px solid #d9e2ec; border-radius: 8px; background: #ffffff; }
                      .artifact-preview { display: block; width: min(560px, 100%); height: 220px; margin-top: 6px; border: 1px solid #d9e2ec; border-radius: 8px; background: #ffffff; }
                      .artifact-text-preview { width: min(680px, 100%); max-height: 240px; overflow: auto; margin: 6px 0 0; padding: 10px; border: 1px solid #d9e2ec; border-radius: 8px; background: #ffffff; white-space: pre-wrap; overflow-wrap: anywhere; font-family: Consolas, monospace; font-size: 12px; }
                      .message { white-space: pre-wrap; overflow-wrap: anywhere; max-width: 520px; margin: 0; font-family: Consolas, monospace; font-size: 12px; }
                    </style>
                  </head>
                  <body>
                """);
        html.append("<h1>Run Report</h1>\n");
        html.append("<div class=\"meta\">Run ID: ").append(escape(report.get("runId"))).append("<br>");
        html.append("Started: ").append(escape(report.get("startedAt"))).append("<br>");
        html.append("Finished: ").append(escape(report.get("finishedAt"))).append("</div>\n");
        html.append("<section class=\"summary\">\n");
        metric(html, "Total", summary.get("total"));
        metric(html, "Passed", summary.get("passed"));
        metric(html, "Failed", summary.get("failed"), "failed");
        metric(html, "Skipped", summary.get("skipped"));
        metric(html, "Duration ms", summary.get("durationMs"));
        html.append("</section>\n");
        int failed = intValue(summary.get("failed"));
        if (failed > 0) {
            html.append("<div class=\"alert\">")
                    .append(failed)
                    .append(failed == 1 ? " failed step needs attention." : " failed steps need attention.")
                    .append(" ")
                    .append(failedStepLinks(steps))
                    .append("</div>\n");
        }
        html.append(slowStepSummary(steps, 3));
        html.append(keyboardHelp());
        html.append(reportMaintenanceNote());
        html.append("<h2>Steps</h2>\n");
        html.append(stepToolbar(steps));
        Long slowestDurationMs = slowestDurationMs(steps);
        html.append("<table><thead><tr><th>Step</th><th>Action</th><th>Status</th><th>Duration</th><th>Details</th></tr></thead><tbody>\n");
        for (int index = 0; index < steps.size(); index++) {
            Object value = steps.get(index);
            Map<?, ?> step = map(value);
            String status = text(step.get("status"));
            Long durationMs = longValue(step.get("durationMs"));
            html.append("<tr id=\"step-").append(index + 1).append("\" data-index=\"").append(index)
                    .append("\" data-duration=\"").append(durationMs == null ? "" : durationMs)
                    .append("\" data-status=\"").append(escape(status)).append("\"");
            String rowClass = rowClass(status, durationMs, slowestDurationMs);
            if (!rowClass.isBlank()) {
                html.append(" class=\"").append(rowClass).append("\"");
            }
            html.append(">");
            html.append("<td>").append(escape(step.get("stepId"))).append("</td>");
            html.append("<td>").append(escape(step.get("action"))).append("</td>");
            html.append("<td class=\"status-").append(escape(status)).append("\">").append(escape(status)).append("</td>");
            html.append("<td>").append(escape(step.get("durationMs"))).append("</td>");
            html.append("<td>").append(stepDetails(step, "FAILED".equals(status))).append("</td>");
            html.append("</tr>\n");
        }
        html.append("</tbody></table>\n");
        html.append("""
                <script>
                  const tbody = document.querySelector('tbody');
                  const rows = Array.from(document.querySelectorAll('tbody tr[data-status]'));
                  const failedRows = rows.filter((row) => row.dataset.status === 'FAILED');
                  const slowRows = rows.filter((row) => row.classList.contains('slow'));
                  let activeFilter = 'ALL';
                  let failedCursor = -1;
                  function applyFilter() {
                    rows.forEach((row) => {
                      row.classList.toggle('hidden', activeFilter !== 'ALL' && row.getAttribute('data-status') !== activeFilter);
                    });
                  }
                  function openAndFocus(row) {
                    if (!row) {
                      return;
                    }
                    const details = row.querySelector('details');
                    if (details) {
                      details.open = true;
                    }
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    history.replaceState(null, '', '#' + row.id);
                  }
                  function focusFailed(offset) {
                    if (failedRows.length === 0) {
                      return;
                    }
                    failedCursor = (failedCursor + offset + failedRows.length) % failedRows.length;
                    openAndFocus(failedRows[failedCursor]);
                  }
                  document.querySelectorAll('[data-filter]').forEach((button) => {
                    button.addEventListener('click', () => {
                      activeFilter = button.getAttribute('data-filter');
                      document.querySelectorAll('[data-filter]').forEach((item) => item.classList.remove('active'));
                      button.classList.add('active');
                      applyFilter();
                    });
                  });
                  document.querySelectorAll('[data-sort]').forEach((button) => {
                    button.addEventListener('click', () => {
                      const sortedRows = [...rows];
                      if (button.getAttribute('data-sort') === 'DURATION_DESC') {
                        sortedRows.sort((left, right) => Number(right.dataset.duration || -1) - Number(left.dataset.duration || -1));
                      } else {
                        sortedRows.sort((left, right) => Number(left.dataset.index) - Number(right.dataset.index));
                      }
                      sortedRows.forEach((row) => tbody.appendChild(row));
                      document.querySelectorAll('[data-sort]').forEach((item) => item.classList.remove('active'));
                      button.classList.add('active');
                      applyFilter();
                    });
                  });
                  document.addEventListener('keydown', (event) => {
                    const tag = event.target.tagName;
                    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.ctrlKey || event.metaKey || event.altKey) {
                      return;
                    }
                    if (event.key === 'f') {
                      failedCursor = -1;
                      focusFailed(1);
                    } else if (event.key === 'n') {
                      focusFailed(1);
                    } else if (event.key === 'p') {
                      focusFailed(-1);
                    } else if (event.key === 's') {
                      openAndFocus(slowRows[0]);
                    }
                  });
                </script>
                """);
        html.append("</body></html>\n");
        return html.toString();
    }

    private String keyboardHelp() {
        return """
                <div class="keyboard-help">
                  <strong>Keyboard:</strong> f first failed, n next failed, p previous failed, s slowest step.
                </div>
                """;
    }

    private String reportMaintenanceNote() {
        return """
                <div class="maintenance-note">
                  <strong>Artifacts:</strong> use the report index commands to prune old artifacts or mark missing artifact links as removed.
                  <code>report-cleanup runs --dry-run --prune-artifacts-only</code>
                  <code>report-maintenance runs --mark-missing-artifacts --dry-run</code>
                </div>
                """;
    }

    private String stepToolbar(List<?> steps) {
        return """
                <div class="toolbar" aria-label="Step tools">
                  <button type="button" class="active" data-filter="ALL">All (%d)</button>
                  <button type="button" data-filter="SUCCESS">Success (%d)</button>
                  <button type="button" data-filter="FAILED">Failed (%d)</button>
                  <button type="button" data-filter="SKIPPED">Skipped (%d)</button>
                  <button type="button" data-sort="ORIGINAL">Original order</button>
                  <button type="button" data-sort="DURATION_DESC">Slowest first</button>
                </div>
                """.formatted(
                steps.size(),
                statusCount(steps, "SUCCESS"),
                statusCount(steps, "FAILED"),
                statusCount(steps, "SKIPPED"));
    }

    private int statusCount(List<?> steps, String status) {
        int count = 0;
        for (Object value : steps) {
            if (status.equals(text(map(value).get("status")))) {
                count++;
            }
        }
        return count;
    }

    private String slowStepSummary(List<?> steps, int limit) {
        List<SlowStep> sortedSteps = new ArrayList<>();
        for (int index = 0; index < steps.size(); index++) {
            Map<?, ?> step = map(steps.get(index));
            Long durationMs = longValue(step.get("durationMs"));
            if (durationMs != null && durationMs > 0) {
                sortedSteps.add(new SlowStep(index + 1, step, durationMs));
            }
        }
        if (sortedSteps.isEmpty()) {
            return "";
        }
        sortedSteps.sort((left, right) -> Long.compare(right.durationMs(), left.durationMs()));
        StringBuilder summary = new StringBuilder("<section class=\"slow-summary\"><h2>Slowest steps</h2><ol>");
        int count = Math.min(limit, sortedSteps.size());
        for (int index = 0; index < count; index++) {
            SlowStep slowStep = sortedSteps.get(index);
            summary.append("<li><a href=\"#step-").append(slowStep.index()).append("\">")
                    .append(escape(slowStep.step().get("stepId")))
                    .append("</a> ")
                    .append(slowStep.durationMs())
                    .append(" ms</li>");
        }
        summary.append("</ol></section>\n");
        return summary.toString();
    }

    private record SlowStep(int index, Map<?, ?> step, long durationMs) {
    }

    private record CleanupOutcome(
            List<Path> deletedRunDirectories,
            List<Path> deletedArtifactPaths,
            List<Path> deletedUnreferencedFilePaths,
            List<ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary> deletedUnreferencedFileTypes,
            ReportStorageDiagnosticsResult.UnreferencedFileAgeSummary deletedUnreferencedFileAgeSummary,
            List<ReportCleanupResult.UnreferencedFileRetentionHint> deletedUnreferencedFileRetentionHints,
            ReportCleanupResult.UnreferencedCleanupPlan unreferencedCleanupPlan) {
    }

    private record ArtifactDiagnostic(
            String type,
            Path path,
            long bytes,
            boolean missing,
            boolean pruned) {
    }

    private record UnreferencedFileDiagnostic(int count, long bytes, List<UnreferencedFileInfo> files) {
    }

    private record UnreferencedFileInfo(Path path, String type, long bytes, Instant lastModifiedAt) {
    }

    private record UnreferencedFileSelection(
            List<UnreferencedFileInfo> selected,
            List<UnreferencedFileInfo> retainedByMinAge,
            List<UnreferencedFileInfo> retainedByBucket) {
    }

    private record BucketMatch(int count, long bytes) {
    }

    private static final class ArtifactTypeTotals {
        private int count;
        private int missingCount;
        private int prunedCount;
        private long bytes;

        private void add(ArtifactDiagnostic artifact) {
            count++;
            if (artifact.missing()) {
                missingCount++;
            }
            if (artifact.pruned()) {
                prunedCount++;
            }
            bytes = saturatedAddStatic(bytes, artifact.bytes());
        }

        private ReportStorageDiagnosticsResult.ArtifactTypeSummary summary(String type) {
            return new ReportStorageDiagnosticsResult.ArtifactTypeSummary(
                    type,
                    count,
                    missingCount,
                    prunedCount,
                    bytes);
        }
    }

    private static final class FileTypeTotals {
        private int count;
        private long bytes;

        private void add(UnreferencedFileInfo file) {
            count++;
            bytes = saturatedAddStatic(bytes, file.bytes());
        }

        private ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary summary(String type) {
            return new ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary(type, count, bytes);
        }
    }

    private static final class UnreferencedCleanupPlanTotals {
        private int selectedRuns;
        private int retainedRuns;
        private int scannedUnreferencedFiles;
        private long scannedUnreferencedBytes;
        private int selectedUnreferencedFiles;
        private long selectedUnreferencedBytes;
        private int retainedUnreferencedFiles;
        private long retainedUnreferencedBytes;
        private final Map<String, FileTypeTotals> retentionReasons = new LinkedHashMap<>();
        private final List<UnreferencedCleanupRunPlanTotals> runs = new ArrayList<>();

        private UnreferencedCleanupRunPlanTotals addRun(
                ReportIndexEntry entry,
                boolean selectedRun,
                List<UnreferencedFileInfo> files,
                boolean includeFileDetails,
                ReportCleanupResult.UnreferencedCleanupRunSelectorPlan selectorPlan,
                ReportCleanupOptions options,
                Instant measuredAt) {
            if (selectedRun) {
                selectedRuns++;
            } else {
                retainedRuns++;
            }
            scannedUnreferencedFiles += files.size();
            long fileBytes = bytes(files);
            scannedUnreferencedBytes = saturatedAddStatic(scannedUnreferencedBytes, fileBytes);
            UnreferencedCleanupRunPlanTotals run = new UnreferencedCleanupRunPlanTotals(
                    entry.runId(),
                    entry.directory(),
                    selectedRun,
                    files.size(),
                    fileBytes,
                    includeFileDetails,
                    selectorPlan,
                    options,
                    measuredAt);
            runs.add(run);
            return run;
        }

        private void addSelected(UnreferencedCleanupRunPlanTotals run, List<UnreferencedFileInfo> files) {
            selectedUnreferencedFiles += files.size();
            long fileBytes = bytes(files);
            selectedUnreferencedBytes = saturatedAddStatic(selectedUnreferencedBytes, fileBytes);
            run.addSelected(files);
        }

        private void addRetained(
                UnreferencedCleanupRunPlanTotals run,
                String reason,
                List<UnreferencedFileInfo> files) {
            if (files.isEmpty()) {
                return;
            }
            retainedUnreferencedFiles += files.size();
            long fileBytes = bytes(files);
            retainedUnreferencedBytes = saturatedAddStatic(retainedUnreferencedBytes, fileBytes);
            addRetentionReason(retentionReasons, reason, files);
            run.addRetained(reason, files.size(), fileBytes, files);
        }

        private static void addRetentionReason(
                Map<String, FileTypeTotals> reasons,
                String reason,
                List<UnreferencedFileInfo> files) {
            FileTypeTotals totals = reasons.computeIfAbsent(reason, ignored -> new FileTypeTotals());
            for (UnreferencedFileInfo file : files) {
                totals.add(file);
            }
        }

        private ReportCleanupResult.UnreferencedCleanupPlan summary() {
            List<ReportCleanupResult.UnreferencedCleanupRetentionReason> reasons = retentionReasons.entrySet()
                    .stream()
                    .map(entry -> new ReportCleanupResult.UnreferencedCleanupRetentionReason(
                            entry.getKey(),
                            entry.getValue().count,
                            entry.getValue().bytes))
                    .toList();
            List<ReportCleanupResult.UnreferencedCleanupRunPlan> runSummaries = runs.stream()
                    .map(UnreferencedCleanupRunPlanTotals::summary)
                    .toList();
            return new ReportCleanupResult.UnreferencedCleanupPlan(
                    selectedRuns,
                    retainedRuns,
                    scannedUnreferencedFiles,
                    scannedUnreferencedBytes,
                    selectedUnreferencedFiles,
                    selectedUnreferencedBytes,
                    retainedUnreferencedFiles,
                    retainedUnreferencedBytes,
                    List.copyOf(reasons),
                    List.copyOf(runSummaries));
        }

        private static long bytes(List<UnreferencedFileInfo> files) {
            long total = 0L;
            for (UnreferencedFileInfo file : files) {
                total = saturatedAddStatic(total, file.bytes());
            }
            return total;
        }
    }

    private static final class UnreferencedCleanupRunPlanTotals {
        private final String runId;
        private final Path directory;
        private final boolean selectedByCleanupSelectors;
        private final int scannedUnreferencedFiles;
        private final long scannedUnreferencedBytes;
        private final boolean includeFileDetails;
        private final ReportCleanupResult.UnreferencedCleanupRunSelectorPlan selectorPlan;
        private final Long configuredMinAgeSeconds;
        private final List<String> selectedAgeBuckets;
        private final Instant measuredAt;
        private int selectedUnreferencedFiles;
        private long selectedUnreferencedBytes;
        private int retainedUnreferencedFiles;
        private long retainedUnreferencedBytes;
        private final Map<String, FileTypeTotals> retentionReasons = new LinkedHashMap<>();
        private final List<ReportCleanupResult.UnreferencedCleanupFilePlan> files = new ArrayList<>();

        private UnreferencedCleanupRunPlanTotals(
                String runId,
                Path directory,
                boolean selectedByCleanupSelectors,
                int scannedUnreferencedFiles,
                long scannedUnreferencedBytes,
                boolean includeFileDetails,
                ReportCleanupResult.UnreferencedCleanupRunSelectorPlan selectorPlan,
                ReportCleanupOptions options,
                Instant measuredAt) {
            this.runId = runId;
            this.directory = directory;
            this.selectedByCleanupSelectors = selectedByCleanupSelectors;
            this.scannedUnreferencedFiles = scannedUnreferencedFiles;
            this.scannedUnreferencedBytes = scannedUnreferencedBytes;
            this.includeFileDetails = includeFileDetails;
            this.selectorPlan = selectorPlan;
            this.configuredMinAgeSeconds = options.getUnreferencedFileMinAgeSeconds();
            this.selectedAgeBuckets = List.copyOf(options.getUnreferencedFileAgeBuckets());
            this.measuredAt = measuredAt;
        }

        private void addSelected(List<UnreferencedFileInfo> selectedFiles) {
            selectedUnreferencedFiles += selectedFiles.size();
            selectedUnreferencedBytes = saturatedAddStatic(
                    selectedUnreferencedBytes,
                    UnreferencedCleanupPlanTotals.bytes(selectedFiles));
            addFileDetails("selected", "matched-cleanup-selectors", selectedFiles);
        }

        private void addRetained(String reason, int count, long bytes, List<UnreferencedFileInfo> files) {
            retainedUnreferencedFiles += count;
            retainedUnreferencedBytes = saturatedAddStatic(retainedUnreferencedBytes, bytes);
            UnreferencedCleanupPlanTotals.addRetentionReason(retentionReasons, reason, files);
            addFileDetails("retained", reason, files);
        }

        private void addFileDetails(String decision, String reason, List<UnreferencedFileInfo> details) {
            if (!includeFileDetails) {
                return;
            }
            for (UnreferencedFileInfo file : details) {
                long fileAgeSeconds = ageSecondsStatic(file.lastModifiedAt(), measuredAt);
                RetentionBucketDefinition bucket = retentionBucketStatic(fileAgeSeconds);
                files.add(new ReportCleanupResult.UnreferencedCleanupFilePlan(
                        file.path(),
                        decision,
                        reason,
                        cleanupFileExplanation(reason),
                        fileAgeSeconds,
                        bucket.key(),
                        configuredMinAgeSeconds,
                        selectedAgeBuckets,
                        file.type(),
                        file.bytes(),
                        file.lastModifiedAt().toString()));
            }
        }

        private String cleanupFileExplanation(String reason) {
            return switch (reason) {
                case "matched-cleanup-selectors" ->
                        "Run matched cleanup selectors; file passed min-age and age-bucket predicates.";
                case "run-retained-by-cleanup-selectors" ->
                        "Run did not match cleanup selectors, so file predicates were not applied.";
                case "younger-than-min-age" ->
                        "Run matched cleanup selectors, but file age is below the configured minimum.";
                case "outside-selected-age-buckets" ->
                        "Run matched cleanup selectors, but file age bucket is outside the selected buckets.";
                default -> "Cleanup decision came from predicate: " + reason + ".";
            };
        }

        private ReportCleanupResult.UnreferencedCleanupRunPlan summary() {
            List<ReportCleanupResult.UnreferencedCleanupRetentionReason> reasons = retentionReasons.entrySet()
                    .stream()
                    .map(entry -> new ReportCleanupResult.UnreferencedCleanupRetentionReason(
                            entry.getKey(),
                            entry.getValue().count,
                            entry.getValue().bytes))
                    .toList();
            return new ReportCleanupResult.UnreferencedCleanupRunPlan(
                    runId,
                    directory,
                    selectedByCleanupSelectors,
                    scannedUnreferencedFiles,
                    scannedUnreferencedBytes,
                    selectedUnreferencedFiles,
                    selectedUnreferencedBytes,
                    retainedUnreferencedFiles,
                    retainedUnreferencedBytes,
                    selectorPlan,
                    List.copyOf(reasons),
                    List.copyOf(files));
        }
    }

    private record RetentionBucketDefinition(
            String key,
            String label,
            long minAgeSeconds,
            long maxAgeSeconds) {
        private boolean accepts(long ageSeconds) {
            return ageSeconds >= minAgeSeconds && ageSeconds <= maxAgeSeconds;
        }
    }

    private static final class RetentionBucketTotals {
        private final RetentionBucketDefinition definition;
        private int count;
        private long bytes;

        private RetentionBucketTotals(RetentionBucketDefinition definition) {
            this.definition = definition;
        }

        private boolean accepts(long ageSeconds) {
            return definition.accepts(ageSeconds);
        }

        private void add(UnreferencedFileInfo file) {
            count++;
            bytes = saturatedAddStatic(bytes, file.bytes());
        }

        private boolean hasFiles() {
            return count > 0;
        }

        private ReportCleanupResult.UnreferencedFileRetentionHint summary() {
            return new ReportCleanupResult.UnreferencedFileRetentionHint(
                    definition.label(),
                    definition.minAgeSeconds(),
                    definition.maxAgeSeconds(),
                    count,
                    bytes);
        }

        private ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary diagnosticsSummary() {
            return new ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary(
                    definition.key(),
                    definition.label(),
                    definition.minAgeSeconds(),
                    definition.maxAgeSeconds(),
                    count,
                    bytes);
        }
    }

    private String rowClass(String status, Long durationMs, Long slowestDurationMs) {
        StringBuilder className = new StringBuilder();
        if ("FAILED".equals(status)) {
            className.append("failed");
        }
        if (durationMs != null && durationMs > 0 && durationMs.equals(slowestDurationMs)) {
            if (!className.isEmpty()) {
                className.append(" ");
            }
            className.append("slow");
        }
        return className.toString();
    }

    private String stepDetails(Map<?, ?> step, boolean open) {
        StringBuilder details = new StringBuilder("<details class=\"step-details\"");
        if (open) {
            details.append(" open");
        }
        details.append("><summary>Open details</summary>");
        details.append("<div class=\"detail-meta\">");
        appendDetailMeta(details, "name", step.get("stepName"));
        appendDetailMeta(details, "startedAt", step.get("startedAt"));
        appendDetailMeta(details, "finishedAt", step.get("finishedAt"));
        details.append("</div>");
        details.append(artifactLinks(step));
        details.append("<pre class=\"message\">").append(escape(step.get("message"))).append("</pre>");
        details.append("</details>");
        return details.toString();
    }

    private void appendDetailMeta(StringBuilder meta, String label, Object value) {
        if (value == null || text(value).isBlank()) {
            return;
        }
        if (!meta.toString().endsWith(">")) {
            meta.append(" | ");
        }
        meta.append(escape(label)).append(": ").append(escape(value));
    }

    private Long slowestDurationMs(List<?> steps) {
        Long slowest = null;
        for (Object value : steps) {
            Long durationMs = longValue(map(value).get("durationMs"));
            if (durationMs != null && durationMs > 0 && (slowest == null || durationMs > slowest)) {
                slowest = durationMs;
            }
        }
        return slowest;
    }

    private String failedStepLinks(List<?> steps) {
        StringBuilder links = new StringBuilder("Failed steps:");
        for (int index = 0; index < steps.size(); index++) {
            Map<?, ?> step = map(steps.get(index));
            if (!"FAILED".equals(text(step.get("status")))) {
                continue;
            }
            links.append(" <a href=\"#step-").append(index + 1).append("\">")
                    .append(escape(step.get("stepId")))
                    .append("</a>");
        }
        return links.toString();
    }

    private void metric(StringBuilder html, String label, Object value) {
        metric(html, label, value, "");
    }

    private void metric(StringBuilder html, String label, Object value, String className) {
        html.append("<div class=\"metric");
        if (!className.isBlank()) {
            html.append(" ").append(escape(className));
        }
        html.append("\">").append(escape(label)).append("<strong>")
                .append(escape(value)).append("</strong></div>\n");
    }

    private String artifactLinks(Map<?, ?> step) {
        List<?> artifacts = list(step.get("artifacts"));
        if (artifacts.isEmpty()) {
            Object artifactPath = step.get("artifactPath");
            if (artifactPath == null) {
                return "";
            }
            return booleanValue(step.get("artifactPruned"))
                    ? prunedArtifactLabel(artifactPath, step.get("artifactPrunedAt"))
                    : link(artifactPath);
        }
        StringBuilder links = new StringBuilder();
        for (Object value : artifacts) {
            Map<?, ?> artifact = map(value);
            Object path = artifact.get("path");
            if (path != null) {
                links.append("<div class=\"artifact\">")
                        .append(booleanValue(artifact.get("pruned"))
                                ? prunedArtifactLabel(path, artifact.get("prunedAt"))
                                : link(path))
                        .append(artifactMeta(artifact))
                        .append(booleanValue(artifact.get("pruned"))
                                ? ""
                                : artifactPreview(path, artifact.get("contentType"), artifact.get("preview")))
                        .append("</div>");
            }
        }
        return links.toString();
    }

    private String artifactMeta(Map<?, ?> artifact) {
        StringBuilder meta = new StringBuilder();
        appendArtifactMeta(meta, "type", artifact.get("type"));
        appendArtifactMeta(meta, "contentType", artifact.get("contentType"));
        appendArtifactMeta(meta, "createdAt", artifact.get("createdAt"));
        if (booleanValue(artifact.get("pruned"))) {
            appendArtifactMeta(meta, "status", "pruned");
            appendArtifactMeta(meta, "prunedAt", artifact.get("prunedAt"));
        }
        if (meta.isEmpty()) {
            return "";
        }
        return "<div class=\"artifact-meta\">" + meta + "</div>";
    }

    private void appendArtifactMeta(StringBuilder meta, String label, Object value) {
        if (value == null || text(value).isBlank()) {
            return;
        }
        if (!meta.isEmpty()) {
            meta.append(" | ");
        }
        meta.append(escape(label)).append(": ").append(escape(value));
    }

    private String link(Object path) {
        return "<a href=\"" + escape(path) + "\">" + escape(path) + "</a>";
    }

    private String prunedArtifactLabel(Object path, Object prunedAt) {
        String suffix = text(prunedAt).isBlank()
                ? "removed by cleanup"
                : "removed by cleanup at " + text(prunedAt);
        return "<span class=\"artifact-pruned\">" + escape(path) + " (" + escape(suffix) + ")</span>";
    }

    private String artifactPreview(Object path, Object contentType, Object preview) {
        String imagePreview = imagePreview(path, contentType);
        if (!imagePreview.isBlank()) {
            return imagePreview;
        }
        if (isHtmlArtifact(path, contentType)) {
            return "<iframe class=\"artifact-preview\" src=\"" + escape(path) + "\" sandbox></iframe>";
        }
        if (preview != null && isTextArtifact(Path.of(text(path)), text(contentType))) {
            return "<pre class=\"artifact-text-preview\">" + escape(preview) + "</pre>";
        }
        return "";
    }

    private String imagePreview(Object path, Object contentType) {
        String contentTypeText = text(contentType);
        String pathText = text(path).toLowerCase();
        if (!contentTypeText.startsWith("image/")
                && !pathText.endsWith(".png")
                && !pathText.endsWith(".jpg")
                && !pathText.endsWith(".jpeg")
                && !pathText.endsWith(".gif")
                && !pathText.endsWith(".webp")) {
            return "";
        }
        return "<a href=\"" + escape(path) + "\"><img src=\"" + escape(path) + "\" alt=\"Artifact preview\"></a>";
    }

    private boolean isHtmlArtifact(Object path, Object contentType) {
        String contentTypeText = text(contentType).toLowerCase();
        String pathText = text(path).toLowerCase();
        return contentTypeText.startsWith("text/html") || pathText.endsWith(".html") || pathText.endsWith(".htm");
    }

    private boolean isTextArtifact(Path path, String contentType) {
        String contentTypeText = text(contentType).toLowerCase();
        String pathText = path == null ? "" : path.toString().toLowerCase();
        return contentTypeText.startsWith("text/")
                || contentTypeText.contains("json")
                || pathText.endsWith(".txt")
                || pathText.endsWith(".log")
                || pathText.endsWith(".json");
    }

    private int intValue(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(text(value));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private Long longValue(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(text(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private boolean booleanValue(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        return Boolean.parseBoolean(text(value));
    }

    private String text(Object value) {
        return value == null ? "" : value.toString();
    }

    private String escape(Object value) {
        String text = text(value);
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private Map<?, ?> map(Object value) {
        return value instanceof Map<?, ?> map ? map : Map.of();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> mutableMap(Object value) {
        return value instanceof Map<?, ?> ? (Map<String, Object>) value : null;
    }

    private List<?> list(Object value) {
        return value instanceof List<?> list ? list : List.of();
    }
}
