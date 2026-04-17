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
                      table { width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #d9e2ec; }
                      th, td { text-align: left; border-bottom: 1px solid #d9e2ec; padding: 10px; vertical-align: top; }
                      th { background: #edf2f7; }
                      .status-SUCCESS { color: #0f7b3f; font-weight: 700; }
                      .status-FAILED { color: #b42318; font-weight: 700; }
                      .status-SKIPPED { color: #7c5e10; font-weight: 700; }
                      a { color: #1769aa; }
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
        metric(html, "Failed", summary.get("failed"));
        metric(html, "Skipped", summary.get("skipped"));
        metric(html, "Duration ms", summary.get("durationMs"));
        html.append("</section>\n");
        html.append("<h2>Steps</h2>\n");
        html.append("<table><thead><tr><th>Step</th><th>Action</th><th>Status</th><th>Duration</th><th>Artifacts</th><th>Message</th></tr></thead><tbody>\n");
        for (Object value : steps) {
            Map<?, ?> step = map(value);
            String status = text(step.get("status"));
            html.append("<tr>");
            html.append("<td>").append(escape(step.get("stepId"))).append("</td>");
            html.append("<td>").append(escape(step.get("action"))).append("</td>");
            html.append("<td class=\"status-").append(escape(status)).append("\">").append(escape(status)).append("</td>");
            html.append("<td>").append(escape(step.get("durationMs"))).append("</td>");
            html.append("<td>").append(artifactLinks(step)).append("</td>");
            html.append("<td>").append(escape(step.get("message"))).append("</td>");
            html.append("</tr>\n");
        }
        html.append("</tbody></table>\n");
        html.append("</body></html>\n");
        return html.toString();
    }

    private void metric(StringBuilder html, String label, Object value) {
        html.append("<div class=\"metric\">").append(escape(label)).append("<strong>")
                .append(escape(value)).append("</strong></div>\n");
    }

    private String artifactLinks(Map<?, ?> step) {
        List<?> artifacts = list(step.get("artifacts"));
        if (artifacts.isEmpty()) {
            Object artifactPath = step.get("artifactPath");
            return artifactPath == null ? "" : link(artifactPath);
        }
        StringBuilder links = new StringBuilder();
        for (Object value : artifacts) {
            Map<?, ?> artifact = map(value);
            Object path = artifact.get("path");
            if (path != null) {
                if (!links.isEmpty()) {
                    links.append("<br>");
                }
                links.append(link(path));
            }
        }
        return links.toString();
    }

    private String link(Object path) {
        return "<a href=\"" + escape(path) + "\">" + escape(path) + "</a>";
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

    private List<?> list(Object value) {
        return value instanceof List<?> list ? list : List.of();
    }
}
