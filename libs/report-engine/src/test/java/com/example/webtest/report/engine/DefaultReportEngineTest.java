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
        step.setAction("SCREENSHOT");
        step.setStatus("SUCCESS");
        step.setStartedAt(Instant.parse("2026-04-17T00:00:00Z"));
        step.setFinishedAt(Instant.parse("2026-04-17T00:00:01Z"));
        step.setArtifactPath(artifact.getPath());
        step.setArtifacts(List.of(artifact));

        ReportStepRecord failedStep = new ReportStepRecord();
        failedStep.setStepId("assert-title");
        failedStep.setAction("ASSERT_TITLE");
        failedStep.setStatus("FAILED");
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
        assertTrue(html.contains("href=\"shot.png\""));
    }
}
