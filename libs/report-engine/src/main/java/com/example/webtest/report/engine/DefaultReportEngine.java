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
                      .metric.failed { border-color: #d92d20; background: #fff4f2; }
                      .alert { margin: 18px 0 0; padding: 12px; border: 1px solid #d92d20; border-radius: 8px; background: #fff4f2; color: #912018; font-weight: 700; }
                      .alert a { color: #912018; }
                      .keyboard-help { margin: 18px 0 0; padding: 12px; border: 1px solid #d9e2ec; border-radius: 8px; background: #ffffff; color: #52616b; }
                      .keyboard-help strong { color: #1f2933; }
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
                      .artifact-meta { color: #52616b; font-size: 12px; margin-top: 4px; overflow-wrap: anywhere; }
                      .artifact img { display: block; width: min(360px, 100%); max-height: 240px; object-fit: contain; margin-top: 6px; border: 1px solid #d9e2ec; border-radius: 8px; background: #ffffff; }
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
            return artifactPath == null ? "" : link(artifactPath);
        }
        StringBuilder links = new StringBuilder();
        for (Object value : artifacts) {
            Map<?, ?> artifact = map(value);
            Object path = artifact.get("path");
            if (path != null) {
                links.append("<div class=\"artifact\">")
                        .append(link(path))
                        .append(artifactMeta(artifact))
                        .append(imagePreview(path, artifact.get("contentType")))
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
