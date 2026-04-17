package com.example.webtest.report.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
        Path runDir = tempDir.resolve("run-1");
        ArtifactRef artifact = new ArtifactRef();
        artifact.setType("screenshot");
        artifact.setPath(runDir.resolve("shot.png"));
        artifact.setContentType("image/png");
        artifact.setCreatedAt(Instant.parse("2026-04-17T00:00:00Z"));

        ArtifactRef domArtifact = new ArtifactRef();
        domArtifact.setType("dom");
        domArtifact.setPath(runDir.resolve("assert-title-failure-dom.html"));
        domArtifact.setContentType("text/html");
        domArtifact.setCreatedAt(Instant.parse("2026-04-17T00:00:04Z"));

        ArtifactRef consoleArtifact = new ArtifactRef();
        consoleArtifact.setType("console");
        consoleArtifact.setPath(runDir.resolve("assert-title-failure-console.json"));
        consoleArtifact.setContentType("application/json");
        consoleArtifact.setCreatedAt(Instant.parse("2026-04-17T00:00:04Z"));
        Files.createDirectories(runDir);
        Files.writeString(consoleArtifact.getPath(), """
                [{"time":"2026-04-17T00:00:03Z","level":"error","message":"boom"}]
                """);

        ArtifactRef networkBodyArtifact = new ArtifactRef();
        networkBodyArtifact.setType("network-response-body");
        networkBodyArtifact.setPath(runDir.resolve("assert-title-failure-network-bodies").resolve("001-response-body.txt"));
        networkBodyArtifact.setContentType("text/plain");
        networkBodyArtifact.setCreatedAt(Instant.parse("2026-04-17T00:00:04Z"));
        Files.createDirectories(networkBodyArtifact.getPath().getParent());
        Files.writeString(networkBodyArtifact.getPath(), "large response body");

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
        failedStep.setArtifacts(List.of(domArtifact, consoleArtifact, networkBodyArtifact));

        Path reportPath = new DefaultReportEngine()
                .generateRunReport(
                        new ExecutionContext("run-1"),
                        runDir,
                        Instant.parse("2026-04-17T00:00:00Z"),
                        Instant.parse("2026-04-17T00:00:05Z"),
                        List.of(step, failedStep));

        assertEquals(runDir.resolve("report.json"), reportPath);
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

        Path htmlReportPath = runDir.resolve("report.html");
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
        assertTrue(html.contains("<div class=\"artifact-meta\">type: dom | contentType: text/html | createdAt: 2026-04-17T00:00:04Z</div>"));
        assertTrue(html.contains("<iframe class=\"artifact-preview\" src=\"assert-title-failure-dom.html\" sandbox></iframe>"));
        assertTrue(html.contains("<div class=\"artifact-meta\">type: console | contentType: application/json | createdAt: 2026-04-17T00:00:04Z</div>"));
        assertTrue(html.contains("<pre class=\"artifact-text-preview\">"));
        assertTrue(html.contains("&quot;level&quot;:&quot;error&quot;"));
        assertTrue(html.contains("href=\"assert-title-failure-network-bodies"));
        assertTrue(html.contains("001-response-body.txt"));
        assertTrue(html.contains("<div class=\"artifact-meta\">type: network-response-body | contentType: text/plain | createdAt: 2026-04-17T00:00:04Z</div>"));
        assertTrue(html.contains("large response body"));
        assertTrue(html.contains("row.classList.toggle('hidden', activeFilter !== 'ALL'"));
        assertTrue(html.contains("sortedRows.sort((left, right) => Number(right.dataset.duration || -1)"));
        assertTrue(html.contains("const failedRows = rows.filter((row) => row.dataset.status === 'FAILED');"));
        assertTrue(html.contains("function focusFailed(offset)"));
        assertTrue(html.contains("event.key === 'n'"));
        assertTrue(html.contains("openAndFocus(slowRows[0]);"));

        Path indexPath = tempDir.resolve("index.html");
        assertTrue(Files.isRegularFile(indexPath));
        String index = Files.readString(indexPath);
        assertTrue(index.contains("<h1>Report Index</h1>"));
        assertTrue(index.contains("<div class=\"meta\">Runs: 1</div>"));
        assertTrue(index.contains("<div class=\"quick-links failed\">Failed runs: <a href=\"#run-1\">run-1</a></div>"));
        assertTrue(index.contains("<input type=\"search\" data-search-input placeholder=\"Search runs, status, time, or report path\" aria-label=\"Search runs\">"));
        assertTrue(index.contains("<input type=\"date\" data-date-from aria-label=\"Started from date\">"));
        assertTrue(index.contains("<input type=\"date\" data-date-to aria-label=\"Started to date\">"));
        assertTrue(index.contains("<label>Page size <select data-page-size aria-label=\"Page size\">"));
        assertTrue(index.contains("<option value=\"25\" selected>25</option>"));
        assertTrue(index.contains("<button type=\"button\" class=\"active\" data-filter=\"ALL\">All (1)</button>"));
        assertTrue(index.contains("<button type=\"button\" data-filter=\"FAILED\">Failed (1)</button>"));
        assertTrue(index.contains("<button type=\"button\" data-filter=\"OK\">OK (0)</button>"));
        assertTrue(index.contains("<button type=\"button\" data-page-prev>Previous page</button>"));
        assertTrue(index.contains("<button type=\"button\" data-page-next>Next page</button>"));
        assertTrue(index.contains("<div class=\"index-status\" data-index-status></div>"));
        assertTrue(index.contains("Cleanup: delete a run directory from this folder and the next generated report index will omit it."));
        assertTrue(index.contains("<div class=\"meta\">Keyboard: / search, f first failed, n next failed, p previous failed.</div>"));
        assertTrue(index.contains("<tr id=\"run-1\" data-index=\"0\" data-status=\"FAILED\""));
        assertTrue(index.contains("data-started=\"2026-04-17T00:00:00Z\" data-finished=\"2026-04-17T00:00:05Z\""));
        assertTrue(index.contains("data-search=\"run-1 FAILED 2026-04-17T00:00:00Z 2026-04-17T00:00:05Z run-1/report.html run-1/report.json\" class=\"failed\"><td>run-1</td>"));
        assertTrue(index.contains("<td class=\"status-failed\">FAILED</td>"));
        assertTrue(index.contains("Total 2, Passed 1, Failed 1, Skipped 0, Duration 5000 ms"));
        assertTrue(index.contains("href=\"run-1/report.html\""));
        assertTrue(index.contains("href=\"run-1/report.json\""));
        assertTrue(index.contains("const searchInput = document.querySelector('[data-search-input]');"));
        assertTrue(index.contains("const dateFromInput = document.querySelector('[data-date-from]');"));
        assertTrue(index.contains("const pageSizeSelect = document.querySelector('[data-page-size]');"));
        assertTrue(index.contains("function matchesDateRange(row)"));
        assertTrue(index.contains("function filteredRows()"));
        assertTrue(index.contains("function applyIndexFilter()"));
        assertTrue(index.contains("const pageSize = Number(pageSizeSelect?.value || 25);"));
        assertTrue(index.contains("row.classList.toggle('hidden', filteredIndex < firstVisible || filteredIndex >= lastVisible);"));
        assertTrue(index.contains("indexStatus.textContent = `Showing ${firstMatch}-${lastMatch} of ${matches.length} matching runs. Page ${currentPage} of ${totalPages}.`;"));
        assertTrue(index.contains("dateFromInput?.addEventListener('input'"));
        assertTrue(index.contains("nextPageButton?.addEventListener('click'"));
        assertTrue(index.contains("applyIndexFilter();"));
        assertTrue(index.contains("event.key === '/'"));
        assertTrue(index.contains("function focusFailed(offset)"));
    }

    @Test
    void generateRunReportMaintainsParentReportIndexForMultipleRuns() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();

        ReportStepRecord olderStep = new ReportStepRecord();
        olderStep.setStepId("older-step");
        olderStep.setAction("ASSERT_TITLE");
        olderStep.setStatus("SUCCESS");
        olderStep.setStartedAt(Instant.parse("2026-04-17T00:00:00Z"));
        olderStep.setFinishedAt(Instant.parse("2026-04-17T00:00:01Z"));
        engine.generateRunReport(
                new ExecutionContext("older-run"),
                tempDir.resolve("older-run"),
                Instant.parse("2026-04-17T00:00:00Z"),
                Instant.parse("2026-04-17T00:00:01Z"),
                List.of(olderStep));

        ReportStepRecord newerStep = new ReportStepRecord();
        newerStep.setStepId("newer-step");
        newerStep.setAction("ASSERT_URL");
        newerStep.setStatus("SUCCESS");
        newerStep.setStartedAt(Instant.parse("2026-04-17T00:01:00Z"));
        newerStep.setFinishedAt(Instant.parse("2026-04-17T00:01:02Z"));
        engine.generateRunReport(
                new ExecutionContext("newer-run"),
                tempDir.resolve("newer-run"),
                Instant.parse("2026-04-17T00:01:00Z"),
                Instant.parse("2026-04-17T00:01:02Z"),
                List.of(newerStep));

        String index = Files.readString(tempDir.resolve("index.html"));
        assertTrue(index.contains("<div class=\"meta\">Runs: 2</div>"));
        assertTrue(index.contains("<div class=\"quick-links\">No failed runs.</div>"));
        assertTrue(index.contains("<button type=\"button\" data-filter=\"FAILED\">Failed (0)</button>"));
        assertTrue(index.contains("<button type=\"button\" data-filter=\"OK\">OK (2)</button>"));
        assertTrue(index.indexOf("<td>newer-run</td>") < index.indexOf("<td>older-run</td>"));
        assertTrue(index.contains("href=\"newer-run/report.html\""));
        assertTrue(index.contains("href=\"older-run/report.html\""));
    }

    @Test
    void cleanupReportRunsKeepsLatestRunsAndRefreshesIndex() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRun(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        writeRun(engine, "middle-run", "2026-04-17T00:01:00Z", "2026-04-17T00:01:01Z");
        writeRun(engine, "new-run", "2026-04-17T00:02:00Z", "2026-04-17T00:02:01Z");

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setKeepLatest(2);

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        assertEquals(tempDir.toAbsolutePath().normalize(), result.reportRoot());
        assertEquals(3, result.scannedRuns());
        assertEquals(2, result.keptRuns());
        assertEquals(List.of(tempDir.resolve("old-run").toAbsolutePath().normalize()), result.deletedRunDirectories());
        assertFalse(result.dryRun());
        assertFalse(Files.exists(tempDir.resolve("old-run")));
        assertTrue(Files.isDirectory(tempDir.resolve("middle-run")));
        assertTrue(Files.isDirectory(tempDir.resolve("new-run")));

        String index = Files.readString(tempDir.resolve("index.html"));
        assertTrue(index.contains("<div class=\"meta\">Runs: 2</div>"));
        assertTrue(index.contains("<td>new-run</td>"));
        assertTrue(index.contains("<td>middle-run</td>"));
        assertFalse(index.contains("<td>old-run</td>"));
    }

    @Test
    void cleanupReportRunsSupportsCutoffAndDryRun() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRun(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        writeRun(engine, "new-run", "2026-04-17T00:02:00Z", "2026-04-17T00:02:01Z");

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setDeleteFinishedBefore(Instant.parse("2026-04-17T00:01:00Z"));
        options.setDryRun(true);

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        assertEquals(2, result.scannedRuns());
        assertEquals(1, result.keptRuns());
        assertEquals(List.of(tempDir.resolve("old-run").toAbsolutePath().normalize()), result.deletedRunDirectories());
        assertTrue(result.dryRun());
        assertTrue(Files.isDirectory(tempDir.resolve("old-run")));
        assertTrue(Files.isDirectory(tempDir.resolve("new-run")));

        String index = Files.readString(tempDir.resolve("index.html"));
        assertTrue(index.contains("<td>new-run</td>"));
        assertTrue(index.contains("<td>old-run</td>"));
    }

    @Test
    void cleanupReportRunsDeletesMatchingStatus() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRun(engine, "old-failed-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z", "FAILED");
        writeRun(engine, "old-ok-run", "2026-04-17T00:01:00Z", "2026-04-17T00:01:01Z", "SUCCESS");
        writeRun(engine, "new-ok-run", "2026-04-17T00:02:00Z", "2026-04-17T00:02:01Z", "SUCCESS");

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.addDeleteStatus("failed");

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        assertEquals(3, result.scannedRuns());
        assertEquals(2, result.keptRuns());
        assertEquals(List.of(tempDir.resolve("old-failed-run").toAbsolutePath().normalize()),
                result.deletedRunDirectories());
        assertFalse(Files.exists(tempDir.resolve("old-failed-run")));
        assertTrue(Files.isDirectory(tempDir.resolve("old-ok-run")));
        assertTrue(Files.isDirectory(tempDir.resolve("new-ok-run")));

        String index = Files.readString(tempDir.resolve("index.html"));
        assertFalse(index.contains("<td>old-failed-run</td>"));
        assertTrue(index.contains("<td>old-ok-run</td>"));
        assertTrue(index.contains("<td>new-ok-run</td>"));
    }

    @Test
    void cleanupReportRunsDeletesOldestRunsUntilUnderSizeQuota() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRun(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        writeRun(engine, "middle-run", "2026-04-17T00:01:00Z", "2026-04-17T00:01:01Z");
        writeRun(engine, "new-run", "2026-04-17T00:02:00Z", "2026-04-17T00:02:01Z");
        Files.writeString(tempDir.resolve("old-run").resolve("payload.txt"), "old payload");
        Files.writeString(tempDir.resolve("middle-run").resolve("payload.txt"), "middle payload");
        Files.writeString(tempDir.resolve("new-run").resolve("payload.txt"), "new payload");

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setMaxTotalBytes(directorySize(tempDir.resolve("middle-run")) + directorySize(tempDir.resolve("new-run")));

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        assertEquals(3, result.scannedRuns());
        assertEquals(2, result.keptRuns());
        assertEquals(List.of(tempDir.resolve("old-run").toAbsolutePath().normalize()),
                result.deletedRunDirectories());
        assertFalse(Files.exists(tempDir.resolve("old-run")));
        assertTrue(Files.isDirectory(tempDir.resolve("middle-run")));
        assertTrue(Files.isDirectory(tempDir.resolve("new-run")));
    }

    @Test
    void cleanupReportRunsProtectsLatestRunsFromSizeQuota() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRun(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        writeRun(engine, "new-run", "2026-04-17T00:02:00Z", "2026-04-17T00:02:01Z");

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setKeepLatest(1);
        options.setMaxTotalBytes(0L);

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        assertEquals(List.of(tempDir.resolve("old-run").toAbsolutePath().normalize()),
                result.deletedRunDirectories());
        assertFalse(Files.exists(tempDir.resolve("old-run")));
        assertTrue(Files.isDirectory(tempDir.resolve("new-run")));
    }

    @Test
    void cleanupReportRunsPrunesArtifactsOnlyForMatchingRuns() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        writeRunWithArtifact(engine, "new-run", "2026-04-17T00:02:00Z", "2026-04-17T00:02:01Z");

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setKeepLatest(1);
        options.setPruneArtifactsOnly(true);

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        Path oldArtifact = tempDir.resolve("old-run").resolve("artifact.txt").toAbsolutePath().normalize();
        Path oldNestedArtifact = tempDir.resolve("old-run").resolve("network").resolve("body.txt").toAbsolutePath().normalize();
        assertEquals(2, result.scannedRuns());
        assertEquals(2, result.keptRuns());
        assertEquals(List.of(), result.deletedRunDirectories());
        assertEquals(List.of(oldArtifact, oldNestedArtifact), result.deletedArtifactPaths());
        assertTrue(Files.isDirectory(tempDir.resolve("old-run")));
        assertTrue(Files.isRegularFile(tempDir.resolve("old-run").resolve("report.json")));
        assertTrue(Files.isRegularFile(tempDir.resolve("old-run").resolve("report.html")));
        assertFalse(Files.exists(tempDir.resolve("old-run").resolve("artifact.txt")));
        assertFalse(Files.exists(tempDir.resolve("old-run").resolve("network")));
        assertTrue(Files.isRegularFile(tempDir.resolve("new-run").resolve("artifact.txt")));

        JsonNode report = new ObjectMapper().readTree(tempDir.resolve("old-run").resolve("report.json").toFile());
        JsonNode oldStep = report.get("steps").get(0);
        assertTrue(oldStep.get("artifactPruned").asBoolean());
        assertTrue(oldStep.hasNonNull("artifactPrunedAt"));
        assertTrue(oldStep.get("artifacts").get(0).get("pruned").asBoolean());
        assertTrue(oldStep.get("artifacts").get(0).hasNonNull("prunedAt"));
        assertTrue(oldStep.get("artifacts").get(1).get("pruned").asBoolean());

        String html = Files.readString(tempDir.resolve("old-run").resolve("report.html"));
        assertTrue(html.contains("artifact.txt (removed by cleanup at "));
        assertTrue(html.contains("status: pruned"));
        assertFalse(html.contains("<a href=\"artifact.txt\">artifact.txt</a>"));

        String index = Files.readString(tempDir.resolve("index.html"));
        assertTrue(index.contains("<td>old-run</td>"));
        assertTrue(index.contains("<td>new-run</td>"));
    }

    @Test
    void cleanupReportRunsPrunesArtifactsOnlyDryRunWithoutDeletingFiles() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setKeepLatest(0);
        options.setPruneArtifactsOnly(true);
        options.setDryRun(true);

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        assertEquals(2, result.deletedArtifactPaths().size());
        assertTrue(result.dryRun());
        assertTrue(Files.isRegularFile(tempDir.resolve("old-run").resolve("artifact.txt")));
        assertTrue(Files.isRegularFile(tempDir.resolve("old-run").resolve("report.json")));
    }

    private void writeRun(DefaultReportEngine engine, String runId, String startedAt, String finishedAt) {
        writeRun(engine, runId, startedAt, finishedAt, "SUCCESS");
    }

    private void writeRun(DefaultReportEngine engine, String runId, String startedAt, String finishedAt, String status) {
        ReportStepRecord step = new ReportStepRecord();
        step.setStepId(runId + "-step");
        step.setAction("ASSERT_TITLE");
        step.setStatus(status);
        step.setStartedAt(Instant.parse(startedAt));
        step.setFinishedAt(Instant.parse(finishedAt));

        engine.generateRunReport(
                new ExecutionContext(runId),
                tempDir.resolve(runId),
                Instant.parse(startedAt),
                Instant.parse(finishedAt),
                List.of(step));
    }

    private void writeRunWithArtifact(DefaultReportEngine engine, String runId, String startedAt, String finishedAt)
            throws Exception {
        Path runDir = tempDir.resolve(runId);
        Path artifactPath = runDir.resolve("artifact.txt");
        Path nestedArtifactPath = runDir.resolve("network").resolve("body.txt");
        Files.createDirectories(nestedArtifactPath.getParent());
        Files.writeString(artifactPath, "artifact");
        Files.writeString(nestedArtifactPath, "body");

        ArtifactRef artifact = new ArtifactRef();
        artifact.setType("text");
        artifact.setPath(artifactPath);
        artifact.setContentType("text/plain");
        artifact.setCreatedAt(Instant.parse(finishedAt));

        ArtifactRef nestedArtifact = new ArtifactRef();
        nestedArtifact.setType("network-response-body");
        nestedArtifact.setPath(nestedArtifactPath);
        nestedArtifact.setContentType("text/plain");
        nestedArtifact.setCreatedAt(Instant.parse(finishedAt));

        ReportStepRecord step = new ReportStepRecord();
        step.setStepId(runId + "-step");
        step.setAction("ASSERT_TITLE");
        step.setStatus("SUCCESS");
        step.setStartedAt(Instant.parse(startedAt));
        step.setFinishedAt(Instant.parse(finishedAt));
        step.setArtifactPath(artifactPath);
        step.setArtifacts(List.of(artifact, nestedArtifact));

        engine.generateRunReport(
                new ExecutionContext(runId),
                runDir,
                Instant.parse(startedAt),
                Instant.parse(finishedAt),
                List.of(step));
    }

    private long directorySize(Path directory) throws Exception {
        long size = 0L;
        try (var paths = Files.walk(directory)) {
            for (Path path : paths.filter(Files::isRegularFile).toList()) {
                size += Files.size(path);
            }
        }
        return size;
    }
}
