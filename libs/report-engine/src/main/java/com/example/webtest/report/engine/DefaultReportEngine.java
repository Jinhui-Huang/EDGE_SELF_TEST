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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
        try {
            Files.createDirectories(safeOutputDir);
            Files.writeString(reportPath, Jsons.writeValueAsString(report(
                            context,
                            safeOutputDir,
                            runStartedAt,
                            runFinishedAt,
                            stepRecords)),
                    StandardCharsets.UTF_8);
            return reportPath;
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Failed to write run report: " + reportPath, e);
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
            values.add(value);
        }
        return values;
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
}
