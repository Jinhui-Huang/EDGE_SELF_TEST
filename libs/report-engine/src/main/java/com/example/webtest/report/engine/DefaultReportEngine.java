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
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

public class DefaultReportEngine implements ReportEngine {
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
                        ? reportIndexEntries(normalizedReportRoot, null, null)
                        : remainingEntries(entries, cleanup.deletedRunDirectories());
                Files.writeString(normalizedReportRoot.resolve("index.html"), reportIndex(remaining),
                        StandardCharsets.UTF_8);
            }
            return new ReportCleanupResult(
                    normalizedReportRoot,
                    entries.size(),
                    entries.size() - cleanup.deletedRunDirectories().size(),
                    List.copyOf(cleanup.deletedRunDirectories()),
                    List.copyOf(cleanup.deletedArtifactPaths()),
                    safeOptions.isDryRun());
        } catch (IOException e) {
            throw new BaseException(
                    ErrorCodes.REPORT_GENERATION_FAILED,
                    "Failed to clean report runs under: " + normalizedReportRoot,
                    e);
        }
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
            List<ReportStorageDiagnosticsResult.RunStorageSummary> runs = new ArrayList<>();
            Map<String, ArtifactTypeTotals> artifactTypeTotals = new LinkedHashMap<>();
            long totalRunBytes = 0L;
            long referencedArtifactBytes = 0L;
            int referencedArtifactCount = 0;
            int missingArtifactCount = 0;
            int prunedArtifactCount = 0;
            for (ReportIndexEntry entry : entries) {
                Map<String, Object> report = readReportJson(entry.directory().resolve("report.json"));
                List<ArtifactDiagnostic> artifacts = report == null
                        ? List.of()
                        : artifactDiagnostics(entry.directory(), report);
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
                referencedArtifactCount += artifacts.size();
                missingArtifactCount += runMissingArtifacts;
                prunedArtifactCount += runPrunedArtifacts;
                runs.add(new ReportStorageDiagnosticsResult.RunStorageSummary(
                        entry.runId(),
                        entry.directory(),
                        entry.status(),
                        entry.finishedAt(),
                        entry.sizeBytes(),
                        runArtifactBytes,
                        artifacts.size(),
                        runMissingArtifacts,
                        runPrunedArtifacts));
            }
            List<ReportStorageDiagnosticsResult.ArtifactTypeSummary> artifactTypes = artifactTypeTotals.entrySet()
                    .stream()
                    .map(entry -> entry.getValue().summary(entry.getKey()))
                    .toList();
            return new ReportStorageDiagnosticsResult(
                    normalizedReportRoot,
                    entries.size(),
                    totalRunBytes,
                    referencedArtifactBytes,
                    referencedArtifactCount,
                    missingArtifactCount,
                    prunedArtifactCount,
                    List.copyOf(artifactTypes),
                    List.copyOf(runs));
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
        Files.writeString(reportRoot.resolve("index.html"), reportIndex(entries), StandardCharsets.UTF_8);
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
        Set<Path> quotaDeleted = quotaDeletedDirectories(entries, options);
        List<Path> deletedRunDirectories = new ArrayList<>();
        List<Path> deletedArtifactPaths = new ArrayList<>();
        for (int index = 0; index < entries.size(); index++) {
            ReportIndexEntry entry = entries.get(index);
            if (!shouldDelete(entry, index, options, quotaDeleted)) {
                continue;
            }
            if (options.isPruneArtifactsOnly()) {
                deletedArtifactPaths.addAll(pruneArtifacts(entry.directory(), options.isDryRun()));
            } else {
                deletedRunDirectories.add(entry.directory());
            }
            if (!options.isDryRun() && !options.isPruneArtifactsOnly()) {
                deleteDirectory(entry.directory());
            }
        }
        return new CleanupOutcome(deletedRunDirectories, deletedArtifactPaths);
    }

    private Set<Path> quotaDeletedDirectories(List<ReportIndexEntry> entries, ReportCleanupOptions options) {
        Long maxTotalBytes = options.getMaxTotalBytes();
        if (maxTotalBytes == null) {
            return Set.of();
        }
        Set<Path> deleted = new HashSet<>();
        long retainedBytes = 0L;
        for (int index = 0; index < entries.size(); index++) {
            ReportIndexEntry entry = entries.get(index);
            if (!shouldDeleteWithoutQuota(entry, index, options)) {
                retainedBytes = saturatedAdd(retainedBytes, entry.sizeBytes());
            }
        }
        if (retainedBytes <= maxTotalBytes) {
            return Set.of();
        }
        for (int index = entries.size() - 1; index >= 0 && retainedBytes > maxTotalBytes; index--) {
            ReportIndexEntry entry = entries.get(index);
            if (isProtectedByLatest(index, options) || shouldDeleteWithoutQuota(entry, index, options)) {
                continue;
            }
            deleted.add(entry.directory());
            retainedBytes = Math.max(0L, retainedBytes - entry.sizeBytes());
        }
        return deleted;
    }

    private boolean shouldDelete(
            ReportIndexEntry entry,
            int sortedIndex,
            ReportCleanupOptions options,
            Set<Path> quotaDeleted) {
        return shouldDeleteWithoutQuota(entry, sortedIndex, options) || quotaDeleted.contains(entry.directory());
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

    private boolean isProtectedByLatest(int sortedIndex, ReportCleanupOptions options) {
        Integer keepLatest = options.getKeepLatest();
        return keepLatest != null && sortedIndex < keepLatest;
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

    private String reportIndex(List<ReportIndexEntry> entries) {
        StringBuilder html = new StringBuilder();
        int failedRuns = failedRunCount(entries);
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
        html.append(reportIndexToolbar(entries, failedRuns));
        html.append("<table><thead><tr><th>Run</th><th>Status</th><th>Summary</th><th>Started</th><th>Finished</th><th>Links</th></tr></thead><tbody>\n");
        for (int index = 0; index < entries.size(); index++) {
            ReportIndexEntry entry = entries.get(index);
            boolean failed = entry.failed() > 0;
            String status = failed ? "FAILED" : "OK";
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

    private String reportIndexToolbar(List<ReportIndexEntry> entries, int failedRuns) {
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
                <div class="maintenance-note">
                  <strong>Report maintenance:</strong> run these commands from the core platform app, starting with dry-run.
                  <code>report-cleanup runs --dry-run --keep-latest 20</code>
                  <code>report-cleanup runs --dry-run --keep-latest 20 --prune-artifacts-only</code>
                  <code>report-maintenance runs --mark-missing-artifacts --dry-run</code>
                  <code>report-diagnostics runs</code>
                </div>
                <div class="meta">Keyboard: / search, f first failed, n next failed, p previous failed.</div>
                """.formatted(entries.size(), failedRuns, okRuns);
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

    private record CleanupOutcome(List<Path> deletedRunDirectories, List<Path> deletedArtifactPaths) {
    }

    private record ArtifactDiagnostic(
            String type,
            Path path,
            long bytes,
            boolean missing,
            boolean pruned) {
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
