package com.example.webtest.report.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.webtest.artifact.model.ArtifactRef;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.report.model.ReportStepRecord;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class DefaultReportEngineTest {
    @TempDir
    Path tempDir;

    @Test
    void generateRunReportWritesSummaryAndRelativeStepArtifacts() throws Exception {
        ArtifactRef artifact = new ArtifactRef();
        artifact.setType("screenshot");
        artifact.setPath(tempDir.resolve("shot.png"));
        artifact.setContentType("image/png");
        artifact.setCreatedAt(Instant.parse("2026-04-17T00:00:00Z"));

        ReportStepRecord step = new ReportStepRecord();
        step.setStepId("capture-page");
        step.setStepName("Capture final page");
        step.setAction("SCREENSHOT");
        step.setStatus("SUCCESS");
        step.setMessage("screenshot captured");
        step.setStartedAt(Instant.parse("2026-04-17T00:00:00Z"));
        step.setFinishedAt(Instant.parse("2026-04-17T00:00:01Z"));
        step.setArtifactPath(artifact.getPath());
        step.setArtifacts(List.of(artifact));

        ReportStepRecord failedStep = new ReportStepRecord();
        failedStep.setStepId("assert-title");
        failedStep.setStepName("Assert title changed");
        failedStep.setAction("ASSERT_TITLE");
        failedStep.setStatus("FAILED");
        failedStep.setMessage("expected title\nactual title");
        failedStep.setStartedAt(Instant.parse("2026-04-17T00:00:02Z"));
        failedStep.setFinishedAt(Instant.parse("2026-04-17T00:00:04Z"));

        Path reportPath = new DefaultReportEngine()
                .generateRunReport(
                        new ExecutionContext("run-1"),
                        tempDir,
                        Instant.parse("2026-04-17T00:00:00Z"),
                        Instant.parse("2026-04-17T00:00:05Z"),
                        List.of(step, failedStep));

        assertEquals(tempDir.resolve("report.json"), reportPath);
        assertTrue(Files.isRegularFile(reportPath));

        JsonNode report = new ObjectMapper().readTree(Files.readString(reportPath));
        assertEquals("run-1", report.get("runId").asText());
        assertEquals("2026-04-17T00:00:00Z", report.get("startedAt").asText());
        assertEquals("2026-04-17T00:00:05Z", report.get("finishedAt").asText());
        assertEquals(2, report.get("summary").get("total").asInt());
        assertEquals(1, report.get("summary").get("passed").asInt());
        assertEquals(1, report.get("summary").get("failed").asInt());
        assertEquals(0, report.get("summary").get("skipped").asInt());
        assertEquals(5000L, report.get("summary").get("durationMs").asLong());
        assertEquals("capture-page", report.get("steps").get(0).get("stepId").asText());
        assertEquals("SUCCESS", report.get("steps").get(0).get("status").asText());
        assertEquals(1000L, report.get("steps").get(0).get("durationMs").asLong());
        assertEquals("shot.png", report.get("steps").get(0).get("artifactPath").asText());
        assertEquals("screenshot", report.get("steps").get(0).get("artifacts").get(0).get("type").asText());
        assertEquals("shot.png", report.get("steps").get(0).get("artifacts").get(0).get("path").asText());

        Path htmlReportPath = tempDir.resolve("report.html");
        assertTrue(Files.isRegularFile(htmlReportPath));
        String html = Files.readString(htmlReportPath);
        assertTrue(html.contains("Run ID: run-1"));
        assertTrue(html.contains("<strong>2</strong>"));
        assertTrue(html.contains("capture-page"));
        assertTrue(html.contains("ASSERT_TITLE"));
        assertTrue(html.contains("<div class=\"metric failed\">Failed<strong>1</strong></div>"));
        assertTrue(html.contains("1 failed step needs attention."));
        assertTrue(html.contains("Failed steps: <a href=\"#step-2\">assert-title</a>"));
        assertTrue(html.contains("<button type=\"button\" class=\"active\" data-filter=\"ALL\">All (2)</button>"));
        assertTrue(html.contains("<button type=\"button\" data-filter=\"SUCCESS\">Success (1)</button>"));
        assertTrue(html.contains("<button type=\"button\" data-filter=\"FAILED\">Failed (1)</button>"));
        assertTrue(html.contains("<button type=\"button\" data-filter=\"SKIPPED\">Skipped (0)</button>"));
        assertTrue(html.contains("<button type=\"button\" data-sort=\"DURATION_DESC\">Slowest first</button>"));
        assertTrue(html.contains("<strong>Keyboard:</strong> f first failed, n next failed, p previous failed, s slowest step."));
        assertTrue(html.contains("<section class=\"slow-summary\"><h2>Slowest steps</h2><ol><li><a href=\"#step-2\">assert-title</a> 2000 ms</li><li><a href=\"#step-1\">capture-page</a> 1000 ms</li></ol></section>"));
        assertTrue(html.contains("<tr id=\"step-2\" data-index=\"1\" data-duration=\"2000\" data-status=\"FAILED\" class=\"failed slow\"><td>assert-title</td>"));
        assertTrue(html.contains("<details class=\"step-details\" open><summary>Open details</summary>"));
        assertTrue(html.contains("name: Assert title changed | startedAt: 2026-04-17T00:00:02Z | finishedAt: 2026-04-17T00:00:04Z"));
        assertTrue(html.contains("<pre class=\"message\">"));
        assertTrue(html.contains("expected title\nactual title"));
        assertTrue(html.contains("href=\"shot.png\""));
        assertTrue(html.contains("<div class=\"artifact-meta\">type: screenshot | contentType: image/png | createdAt: 2026-04-17T00:00:00Z</div>"));
        assertTrue(html.contains("<img src=\"shot.png\" alt=\"Artifact preview\">"));
        assertTrue(html.contains("row.classList.toggle('hidden', activeFilter !== 'ALL'"));
        assertTrue(html.contains("sortedRows.sort((left, right) => Number(right.dataset.duration || -1)"));
        assertTrue(html.contains("const failedRows = rows.filter((row) => row.dataset.status === 'FAILED');"));
        assertTrue(html.contains("function focusFailed(offset)"));
        assertTrue(html.contains("event.key === 'n'"));
        assertTrue(html.contains("openAndFocus(slowRows[0]);"));
    }
}
