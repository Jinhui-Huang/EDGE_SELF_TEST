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
import java.nio.file.attribute.FileTime;
import java.time.Duration;
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
        assertTrue(html.contains("<strong>Artifacts:</strong> use the report index commands to prune old artifacts or mark missing artifact links as removed."));
        assertTrue(html.contains("<code>report-cleanup runs --dry-run --prune-artifacts-only</code>"));
        assertTrue(html.contains("<code>report-maintenance runs --mark-missing-artifacts --dry-run</code>"));
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
        assertTrue(index.contains("<strong>Report maintenance:</strong> commands are based on current storage diagnostics; start with dry-run."));
        assertTrue(index.contains("<div class=\"meta\">Cleanup selector summary: keep-latest 20 protects 1 run and selects 0 older runs.</div>"));
        assertFalse(index.contains("Latest cleanup dry-run:"));
        assertTrue(index.contains("<code>report-cleanup runs --dry-run --keep-latest 20</code>"));
        assertTrue(index.contains("<code>report-cleanup runs --dry-run --keep-latest 20 --prune-artifacts-only</code>"));
        assertFalse(index.contains("--prune-unreferenced-files-only"));
        assertFalse(index.contains("--verbose-unreferenced-cleanup"));
        assertTrue(index.contains("<code>report-maintenance runs --mark-missing-artifacts --dry-run</code>"));
        assertTrue(index.contains("<code>report-diagnostics runs</code>"));
        assertTrue(index.contains("<div class=\"meta\">Keyboard: / search, f first failed, n next failed, p previous failed.</div>"));
        assertTrue(index.contains("<section class=\"storage-diagnostics\"><h2>Storage diagnostics</h2>"));
        assertTrue(index.contains("<div class=\"storage-metric\">Run storage<strong>"));
        assertTrue(index.contains("<div class=\"storage-metric\">Referenced artifacts<strong>"));
        assertTrue(index.contains("<div class=\"storage-metric\">Unreferenced files<strong>0 B</strong></div>"));
        assertTrue(index.contains("<div class=\"storage-metric\">Artifact files<strong>4</strong></div>"));
        assertTrue(index.contains("<div class=\"storage-metric\">Unreferenced count<strong>0</strong></div>"));
        assertTrue(index.contains("<div class=\"storage-metric\">Oldest unreferenced<strong>(none)</strong></div>"));
        assertTrue(index.contains("<div class=\"storage-metric\">Newest unreferenced<strong>(none)</strong></div>"));
        assertTrue(index.contains("<div class=\"storage-metric\">Missing links<strong>2</strong></div>"));
        assertTrue(index.contains("<div class=\"storage-metric\">Pruned links<strong>0</strong></div>"));
        assertTrue(index.contains("<table class=\"storage-table\"><thead><tr><th>Artifact type</th><th>Count</th><th>Bytes</th><th>Missing</th><th>Pruned</th></tr></thead><tbody>"));
        assertTrue(index.contains("<tr><td>screenshot</td><td>1</td><td>0 B</td><td>1</td><td>0</td></tr>"));
        assertTrue(index.contains("<tr><td>network-response-body</td><td>1</td>"));
        assertTrue(index.contains("<div class=\"meta\">No unreferenced files found in scanned reports.</div>"));
        assertTrue(index.contains("<th>Run</th><th>Status</th><th>Summary</th><th>Storage</th><th>Started</th><th>Finished</th><th>Links</th>"));
        assertTrue(index.contains("<tr id=\"run-1\" data-index=\"0\" data-status=\"FAILED\""));
        assertTrue(index.contains("data-started=\"2026-04-17T00:00:00Z\" data-finished=\"2026-04-17T00:00:05Z\""));
        assertTrue(index.contains("data-search=\"run-1 FAILED 2026-04-17T00:00:00Z 2026-04-17T00:00:05Z run-1/report.html run-1/report.json\" class=\"failed\"><td>run-1</td>"));
        assertTrue(index.contains("<td class=\"status-failed\">FAILED</td>"));
        assertTrue(index.contains("Total 2, Passed 1, Failed 1, Skipped 0, Duration 5000 ms"));
        assertTrue(index.contains("<br>Artifacts "));
        assertTrue(index.contains("(4)<br>Unreferenced 0 B (0)"));
        assertTrue(index.contains("<br>Unreferenced 0 B (0)<br>Missing 2, Pruned 0"));
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
    void generatedReportIndexAdaptsMaintenanceHintsToUnreferencedFiles() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        Path orphan = tempDir.resolve("old-run").resolve("orphan.log");
        Files.writeString(orphan, "orphaned log");
        Files.setLastModifiedTime(orphan, FileTime.from(Instant.now().minus(Duration.ofDays(2))));
        Path secondStaleOrphan = tempDir.resolve("old-run").resolve("orphan-2.log");
        Files.writeString(secondStaleOrphan, "second orphaned log");
        Files.setLastModifiedTime(secondStaleOrphan, FileTime.from(Instant.now().minus(Duration.ofDays(3))));
        Path ancientOrphan = tempDir.resolve("old-run").resolve("ancient.log");
        Files.writeString(ancientOrphan, "ancient orphaned log");
        Files.setLastModifiedTime(ancientOrphan, FileTime.from(Instant.now().minus(Duration.ofDays(31))));

        writeRun(engine, "refresh-run", "2026-04-17T00:01:00Z", "2026-04-17T00:01:01Z", "SUCCESS");

        String index = Files.readString(tempDir.resolve("index.html"));
        assertTrue(index.contains("<div class=\"storage-metric\">Unreferenced count<strong>3</strong></div>"));
        assertTrue(index.contains("<tr><td>log</td><td>3</td>"));
        assertTrue(index.contains("<td>stale 1d-7d</td><td>2</td>"));
        assertTrue(index.contains("<td>ancient &gt;=30d</td><td>1</td>"));
        assertTrue(index.contains("Cleanup selector summary: keep-latest 20 protects 2 runs and selects 0 older runs."
                + " Unreferenced selector keep-latest 0 selects 2 runs; buckets stale,old,ancient match 3 files, "));
        assertTrue(index.contains("<div class=\"meta\">Dominant unreferenced bucket: stale 1d-7d, 2 files, "));
        assertTrue(index.contains("<code>report-cleanup runs --dry-run --keep-latest 0 --prune-unreferenced-files-only --unreferenced-age-bucket stale,old,ancient</code>"));
        assertTrue(index.contains("<code>report-cleanup runs --dry-run --keep-latest 0 --prune-unreferenced-files-only --unreferenced-age-bucket stale,old,ancient --verbose-unreferenced-cleanup</code>"));
        assertFalse(index.contains("--unreferenced-age-bucket ancient</code>"));
        assertFalse(index.contains("<code>report-maintenance runs --mark-missing-artifacts --dry-run</code>"));
    }

    @Test
    void generatedReportIndexLinksExistingCleanupDryRunArtifact() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setDryRun(true);
        options.setKeepLatest(0);
        ReportCleanupResult cleanup = engine.cleanupReportRuns(tempDir, options);
        assertEquals(tempDir.resolve("cleanup-dry-run.html").toAbsolutePath().normalize(), cleanup.dryRunHtmlPath());
        assertTrue(Files.isRegularFile(cleanup.dryRunHtmlPath()));

        String immediateIndex = Files.readString(tempDir.resolve("index.html"));
        assertTrue(immediateIndex.contains(
                "<div class=\"meta\">Latest cleanup dry-run: <a href=\"cleanup-dry-run.html\">cleanup-dry-run.html</a></div>"));

        writeRun(engine, "refresh-run", "2026-04-17T00:01:00Z", "2026-04-17T00:01:01Z", "SUCCESS");

        String index = Files.readString(tempDir.resolve("index.html"));
        assertTrue(index.contains(
                "<div class=\"meta\">Latest cleanup dry-run: <a href=\"cleanup-dry-run.html\">cleanup-dry-run.html</a></div>"));
    }

    @Test
    void cleanupReportRunsSupportsCustomDryRunHtmlArtifactPath() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setDryRun(true);
        options.setKeepLatest(0);
        options.setDryRunHtmlPath(Path.of("maintenance", "cleanup-review.html"));

        ReportCleanupResult cleanup = engine.cleanupReportRuns(tempDir, options);

        Path expectedPath = tempDir.resolve(Path.of("maintenance", "cleanup-review.html"))
                .toAbsolutePath()
                .normalize();
        assertEquals(expectedPath, cleanup.dryRunHtmlPath());
        assertTrue(Files.isRegularFile(expectedPath));
        assertFalse(Files.exists(tempDir.resolve("cleanup-dry-run.html")));
        String immediateIndex = Files.readString(tempDir.resolve("index.html"));
        assertTrue(immediateIndex.contains(
                "<div class=\"meta\">Latest cleanup dry-run: <a href=\"maintenance/cleanup-review.html\">maintenance/cleanup-review.html</a></div>"));
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

    @Test
    void cleanupReportRunsPrunesUnreferencedFilesOnlyForMatchingRuns() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        writeRunWithArtifact(engine, "new-run", "2026-04-17T00:02:00Z", "2026-04-17T00:02:01Z");
        Path oldOrphan = tempDir.resolve("old-run").resolve("scratch").resolve("orphan.log");
        Path newOrphan = tempDir.resolve("new-run").resolve("scratch").resolve("orphan.log");
        Files.createDirectories(oldOrphan.getParent());
        Files.createDirectories(newOrphan.getParent());
        Files.writeString(oldOrphan, "old orphan");
        Files.writeString(newOrphan, "new orphan");
        Files.setLastModifiedTime(oldOrphan, FileTime.from(Instant.parse("2026-04-17T00:00:10Z")));
        Files.setLastModifiedTime(newOrphan, FileTime.from(Instant.parse("2026-04-17T00:02:10Z")));
        long oldOrphanBytes = Files.size(oldOrphan);
        assertTrue(Files.isRegularFile(tempDir.resolve("old-run").resolve("artifact.txt")), "referenced text artifact exists before cleanup");

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setKeepLatest(1);
        options.setPruneUnreferencedFilesOnly(true);

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        assertEquals(2, result.scannedRuns());
        assertEquals(2, result.keptRuns());
        assertEquals(List.of(), result.deletedRunDirectories());
        assertEquals(List.of(), result.deletedArtifactPaths());
        assertEquals(List.of(oldOrphan.toAbsolutePath().normalize()), result.deletedUnreferencedFilePaths());
        assertEquals(1, result.deletedUnreferencedFileTypes().size());
        assertEquals("log", result.deletedUnreferencedFileTypes().get(0).type());
        assertEquals(1, result.deletedUnreferencedFileTypes().get(0).count());
        assertEquals(oldOrphanBytes, result.deletedUnreferencedFileTypes().get(0).bytes());
        assertEquals("2026-04-17T00:00:10Z", result.deletedUnreferencedFileAgeSummary().oldestLastModifiedAt());
        assertEquals("2026-04-17T00:00:10Z", result.deletedUnreferencedFileAgeSummary().newestLastModifiedAt());
        assertFalse(Files.exists(oldOrphan));
        assertFalse(Files.exists(oldOrphan.getParent()));
        assertTrue(Files.isRegularFile(tempDir.resolve("old-run").resolve("artifact.txt")), "referenced text artifact remains");
        assertTrue(Files.isRegularFile(tempDir.resolve("old-run").resolve("network").resolve("body.txt")), "referenced nested artifact remains");
        assertTrue(Files.isRegularFile(newOrphan), "protected run orphan remains");

        ReportStorageDiagnosticsResult diagnostics = engine.diagnoseReportStorage(tempDir);
        assertEquals(1, diagnostics.unreferencedFileCount());

        String index = Files.readString(tempDir.resolve("index.html"));
        assertTrue(index.contains("<td>old-run</td>"));
        assertTrue(index.contains("<td>new-run</td>"));
    }

    @Test
    void cleanupReportRunsPrunesUnreferencedFilesOnlyDryRunWithoutDeletingFiles() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        Path orphan = tempDir.resolve("old-run").resolve("orphan.log");
        Files.writeString(orphan, "orphan");
        Files.setLastModifiedTime(orphan, FileTime.from(Instant.parse("2026-04-17T00:00:10Z")));

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setKeepLatest(0);
        options.setPruneUnreferencedFilesOnly(true);
        options.setDryRun(true);

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        assertEquals(List.of(orphan.toAbsolutePath().normalize()), result.deletedUnreferencedFilePaths());
        assertEquals("log", result.deletedUnreferencedFileTypes().get(0).type());
        assertEquals(1, result.deletedUnreferencedFileTypes().get(0).count());
        assertEquals(Files.size(orphan), result.deletedUnreferencedFileTypes().get(0).bytes());
        assertEquals("2026-04-17T00:00:10Z", result.deletedUnreferencedFileAgeSummary().oldestLastModifiedAt());
        assertTrue(result.dryRun());
        assertTrue(Files.isRegularFile(orphan));
        assertTrue(Files.isRegularFile(tempDir.resolve("old-run").resolve("artifact.txt")));
    }

    @Test
    void cleanupReportRunsGroupsUnreferencedFilesByRetentionAgeBucket() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        Path recentOrphan = tempDir.resolve("old-run").resolve("recent.tmp");
        Path staleOrphan = tempDir.resolve("old-run").resolve("stale.log");
        Files.writeString(recentOrphan, "recent");
        Files.writeString(staleOrphan, "stale");
        Instant measuredNear = Instant.now();
        Files.setLastModifiedTime(recentOrphan, FileTime.from(measuredNear.minus(Duration.ofHours(2))));
        Files.setLastModifiedTime(staleOrphan, FileTime.from(measuredNear.minus(Duration.ofDays(2))));
        long recentBytes = Files.size(recentOrphan);
        long staleBytes = Files.size(staleOrphan);

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setKeepLatest(0);
        options.setPruneUnreferencedFilesOnly(true);
        options.setDryRun(true);

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        assertEquals(2, result.deletedUnreferencedFileRetentionHints().size());
        ReportCleanupResult.UnreferencedFileRetentionHint recent = result.deletedUnreferencedFileRetentionHints()
                .stream()
                .filter(hint -> "recent 1h-24h".equals(hint.bucket()))
                .findFirst()
                .orElseThrow();
        assertEquals(3_600L, recent.minAgeSeconds());
        assertEquals(86_399L, recent.maxAgeSeconds());
        assertEquals(1, recent.count());
        assertEquals(recentBytes, recent.bytes());
        ReportCleanupResult.UnreferencedFileRetentionHint stale = result.deletedUnreferencedFileRetentionHints()
                .stream()
                .filter(hint -> "stale 1d-7d".equals(hint.bucket()))
                .findFirst()
                .orElseThrow();
        assertEquals(86_400L, stale.minAgeSeconds());
        assertEquals(604_799L, stale.maxAgeSeconds());
        assertEquals(1, stale.count());
        assertEquals(staleBytes, stale.bytes());
        assertTrue(Files.isRegularFile(recentOrphan));
        assertTrue(Files.isRegularFile(staleOrphan));
    }

    @Test
    void cleanupReportRunsPrunesOnlyUnreferencedFilesOlderThanThreshold() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        Path youngOrphan = tempDir.resolve("old-run").resolve("young.tmp");
        Path oldOrphan = tempDir.resolve("old-run").resolve("old.log");
        Files.writeString(youngOrphan, "young");
        Files.writeString(oldOrphan, "old");
        Instant measuredNear = Instant.now();
        Files.setLastModifiedTime(youngOrphan, FileTime.from(measuredNear.minus(Duration.ofHours(2))));
        Files.setLastModifiedTime(oldOrphan, FileTime.from(measuredNear.minus(Duration.ofDays(2))));
        long oldBytes = Files.size(oldOrphan);

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setKeepLatest(0);
        options.setPruneUnreferencedFilesOnly(true);
        options.setUnreferencedFileMinAgeSeconds(Duration.ofDays(1).toSeconds());

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        assertEquals(List.of(oldOrphan.toAbsolutePath().normalize()), result.deletedUnreferencedFilePaths());
        assertEquals(1, result.deletedUnreferencedFileTypes().size());
        assertEquals("log", result.deletedUnreferencedFileTypes().get(0).type());
        assertEquals(oldBytes, result.deletedUnreferencedFileTypes().get(0).bytes());
        assertEquals(1, result.deletedUnreferencedFileRetentionHints().size());
        assertEquals("stale 1d-7d", result.deletedUnreferencedFileRetentionHints().get(0).bucket());
        assertTrue(Files.isRegularFile(youngOrphan));
        assertFalse(Files.exists(oldOrphan));
    }

    @Test
    void cleanupReportRunsPrunesOnlySelectedUnreferencedFileAgeBuckets() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        Path recentOrphan = tempDir.resolve("old-run").resolve("recent.tmp");
        Path staleOrphan = tempDir.resolve("old-run").resolve("stale.log");
        Path ancientOrphan = tempDir.resolve("old-run").resolve("ancient.txt");
        Files.writeString(recentOrphan, "recent");
        Files.writeString(staleOrphan, "stale");
        Files.writeString(ancientOrphan, "ancient");
        Instant measuredNear = Instant.now();
        Files.setLastModifiedTime(recentOrphan, FileTime.from(measuredNear.minus(Duration.ofHours(2))));
        Files.setLastModifiedTime(staleOrphan, FileTime.from(measuredNear.minus(Duration.ofDays(2))));
        Files.setLastModifiedTime(ancientOrphan, FileTime.from(measuredNear.minus(Duration.ofDays(31))));

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setKeepLatest(0);
        options.setPruneUnreferencedFilesOnly(true);
        options.addUnreferencedFileAgeBucket("stale");
        options.addUnreferencedFileAgeBucket("ancient");

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        assertEquals(2, result.deletedUnreferencedFilePaths().size());
        assertTrue(result.deletedUnreferencedFilePaths().contains(staleOrphan.toAbsolutePath().normalize()));
        assertTrue(result.deletedUnreferencedFilePaths().contains(ancientOrphan.toAbsolutePath().normalize()));
        assertEquals(2, result.deletedUnreferencedFileRetentionHints().size());
        assertTrue(result.deletedUnreferencedFileRetentionHints().stream()
                .anyMatch(hint -> "stale 1d-7d".equals(hint.bucket())));
        assertTrue(result.deletedUnreferencedFileRetentionHints().stream()
                .anyMatch(hint -> "ancient >=30d".equals(hint.bucket())));
        assertTrue(Files.isRegularFile(recentOrphan));
        assertFalse(Files.exists(staleOrphan));
        assertFalse(Files.exists(ancientOrphan));
    }

    @Test
    void cleanupReportRunsSummarizesUnreferencedCleanupPlan() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        writeRunWithArtifact(engine, "new-run", "2026-04-17T00:02:00Z", "2026-04-17T00:02:01Z");
        Path selectedOrphan = tempDir.resolve("old-run").resolve("stale.log");
        Path tooYoungOrphan = tempDir.resolve("old-run").resolve("recent.tmp");
        Path bucketRetainedOrphan = tempDir.resolve("old-run").resolve("ancient.txt");
        Path runRetainedOrphan = tempDir.resolve("new-run").resolve("stale.log");
        Files.writeString(selectedOrphan, "selected");
        Files.writeString(tooYoungOrphan, "young");
        Files.writeString(bucketRetainedOrphan, "bucket retained");
        Files.writeString(runRetainedOrphan, "run retained");
        Instant measuredNear = Instant.now();
        Files.setLastModifiedTime(selectedOrphan, FileTime.from(measuredNear.minus(Duration.ofDays(2))));
        Files.setLastModifiedTime(tooYoungOrphan, FileTime.from(measuredNear.minus(Duration.ofHours(2))));
        Files.setLastModifiedTime(bucketRetainedOrphan, FileTime.from(measuredNear.minus(Duration.ofDays(31))));
        Files.setLastModifiedTime(runRetainedOrphan, FileTime.from(measuredNear.minus(Duration.ofDays(2))));

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setKeepLatest(1);
        options.setPruneUnreferencedFilesOnly(true);
        options.setDryRun(true);
        options.setUnreferencedFileMinAgeSeconds(Duration.ofDays(1).toSeconds());
        options.addUnreferencedFileAgeBucket("stale");

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        ReportCleanupResult.UnreferencedCleanupPlan plan = result.unreferencedCleanupPlan();
        assertEquals(1, plan.selectedRuns());
        assertEquals(1, plan.retainedRuns());
        assertEquals(4, plan.scannedUnreferencedFiles());
        assertEquals(1, plan.selectedUnreferencedFiles());
        assertEquals(Files.size(selectedOrphan), plan.selectedUnreferencedBytes());
        assertEquals(3, plan.retainedUnreferencedFiles());
        assertTrue(plan.retainedUnreferencedBytes() > plan.selectedUnreferencedBytes());
        assertCleanupPlanReason(plan, "run-retained-by-cleanup-selectors", 1, Files.size(runRetainedOrphan));
        assertCleanupPlanReason(plan, "younger-than-min-age", 1, Files.size(tooYoungOrphan));
        assertCleanupPlanReason(plan, "outside-selected-age-buckets", 1, Files.size(bucketRetainedOrphan));
        assertEquals(2, plan.runs().size());
        ReportCleanupResult.UnreferencedCleanupRunPlan oldRunPlan = cleanupRunPlan(plan, "old-run");
        assertTrue(oldRunPlan.selectedByCleanupSelectors());
        assertEquals(1, oldRunPlan.selectorPlan().sortedIndex());
        assertEquals(1, oldRunPlan.selectorPlan().configuredKeepLatest());
        assertFalse(oldRunPlan.selectorPlan().protectedByKeepLatest());
        assertTrue(oldRunPlan.selectorPlan().selectedByKeepLatest());
        assertFalse(oldRunPlan.selectorPlan().selectedByCutoff());
        assertFalse(oldRunPlan.selectorPlan().selectedByStatus());
        assertFalse(oldRunPlan.selectorPlan().selectedByQuota());
        assertEquals(
                "Run matched cleanup selector(s): keep-latest.",
                oldRunPlan.selectorPlan().explanation());
        assertEquals(3, oldRunPlan.scannedUnreferencedFiles());
        assertEquals(1, oldRunPlan.selectedUnreferencedFiles());
        assertEquals(2, oldRunPlan.retainedUnreferencedFiles());
        assertCleanupRunPlanReason(oldRunPlan, "younger-than-min-age", 1, Files.size(tooYoungOrphan));
        assertCleanupRunPlanReason(oldRunPlan, "outside-selected-age-buckets", 1, Files.size(bucketRetainedOrphan));
        ReportCleanupResult.UnreferencedCleanupRunPlan newRunPlan = cleanupRunPlan(plan, "new-run");
        assertFalse(newRunPlan.selectedByCleanupSelectors());
        assertEquals(0, newRunPlan.selectorPlan().sortedIndex());
        assertEquals(1, newRunPlan.selectorPlan().configuredKeepLatest());
        assertTrue(newRunPlan.selectorPlan().protectedByKeepLatest());
        assertFalse(newRunPlan.selectorPlan().selectedByKeepLatest());
        assertEquals("Run is protected by the keep-latest selector.", newRunPlan.selectorPlan().explanation());
        assertEquals(1, newRunPlan.scannedUnreferencedFiles());
        assertEquals(0, newRunPlan.selectedUnreferencedFiles());
        assertEquals(1, newRunPlan.retainedUnreferencedFiles());
        assertCleanupRunPlanReason(newRunPlan, "run-retained-by-cleanup-selectors", 1, Files.size(runRetainedOrphan));
        assertTrue(oldRunPlan.files().isEmpty());
        assertTrue(newRunPlan.files().isEmpty());
        assertEquals(List.of(selectedOrphan.toAbsolutePath().normalize()), result.deletedUnreferencedFilePaths());
        assertTrue(Files.isRegularFile(selectedOrphan));
        assertTrue(Files.isRegularFile(tooYoungOrphan));
        assertTrue(Files.isRegularFile(bucketRetainedOrphan));
        assertTrue(Files.isRegularFile(runRetainedOrphan));
    }

    @Test
    void cleanupReportRunsIncludesRunSelectorDetailsForCutoffStatusAndQuota() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "cutoff-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        writeRunWithArtifact(engine, "status-run", "2026-04-17T00:02:00Z", "2026-04-17T00:02:01Z", "FAILED");
        writeRunWithArtifact(engine, "quota-run", "2026-04-17T00:04:00Z", "2026-04-17T00:04:01Z");
        Path cutoffOrphan = tempDir.resolve("cutoff-run").resolve("cutoff.log");
        Path statusOrphan = tempDir.resolve("status-run").resolve("status.log");
        Path quotaOrphan = tempDir.resolve("quota-run").resolve("quota.log");
        Files.writeString(cutoffOrphan, "cutoff");
        Files.writeString(statusOrphan, "status");
        Files.writeString(quotaOrphan, "quota");

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setPruneUnreferencedFilesOnly(true);
        options.setDryRun(true);
        options.setDeleteFinishedBefore(Instant.parse("2026-04-17T00:01:00Z"));
        options.addDeleteStatus("FAILED");
        options.setMaxTotalBytes(Math.max(0L, directorySize(tempDir.resolve("quota-run")) - 1L));

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        ReportCleanupResult.UnreferencedCleanupPlan plan = result.unreferencedCleanupPlan();
        assertEquals(3, plan.selectedRuns());
        ReportCleanupResult.UnreferencedCleanupRunPlan quotaRun = cleanupRunPlan(plan, "quota-run");
        assertTrue(quotaRun.selectedByCleanupSelectors());
        assertFalse(quotaRun.selectorPlan().selectedByKeepLatest());
        assertFalse(quotaRun.selectorPlan().selectedByCutoff());
        assertFalse(quotaRun.selectorPlan().selectedByStatus());
        assertTrue(quotaRun.selectorPlan().selectedByQuota());
        assertEquals("OK", quotaRun.selectorPlan().status());
        assertEquals("2026-04-17T00:04:01Z", quotaRun.selectorPlan().finishedAt());
        assertEquals(options.getMaxTotalBytes(), quotaRun.selectorPlan().configuredMaxTotalBytes());
        assertEquals(true, quotaRun.selectorPlan().quotaEligible());
        assertEquals(quotaRun.selectorPlan().runBytes(), quotaRun.selectorPlan().quotaRetainedBytesBefore());
        assertEquals(0L, quotaRun.selectorPlan().quotaRetainedBytesAfter());
        assertEquals(quotaRun.selectorPlan().runBytes(), quotaRun.selectorPlan().quotaFreedBytes());
        assertEquals("Run matched cleanup selector(s): quota.", quotaRun.selectorPlan().explanation());

        ReportCleanupResult.UnreferencedCleanupRunPlan statusRun = cleanupRunPlan(plan, "status-run");
        assertTrue(statusRun.selectorPlan().selectedByStatus());
        assertEquals(List.of("FAILED"), statusRun.selectorPlan().configuredDeleteStatuses());
        assertEquals(false, statusRun.selectorPlan().quotaEligible());
        assertEquals(quotaRun.selectorPlan().runBytes(), statusRun.selectorPlan().quotaRetainedBytesBefore());
        assertEquals(quotaRun.selectorPlan().runBytes(), statusRun.selectorPlan().quotaRetainedBytesAfter());
        assertEquals(0L, statusRun.selectorPlan().quotaFreedBytes());
        assertEquals("Run matched cleanup selector(s): status.", statusRun.selectorPlan().explanation());

        ReportCleanupResult.UnreferencedCleanupRunPlan cutoffRun = cleanupRunPlan(plan, "cutoff-run");
        assertTrue(cutoffRun.selectorPlan().selectedByCutoff());
        assertEquals("2026-04-17T00:01:00Z", cutoffRun.selectorPlan().configuredDeleteFinishedBefore());
        assertEquals(false, cutoffRun.selectorPlan().quotaEligible());
        assertEquals(quotaRun.selectorPlan().runBytes(), cutoffRun.selectorPlan().quotaRetainedBytesBefore());
        assertEquals(quotaRun.selectorPlan().runBytes(), cutoffRun.selectorPlan().quotaRetainedBytesAfter());
        assertEquals(0L, cutoffRun.selectorPlan().quotaFreedBytes());
        assertEquals("Run matched cleanup selector(s): cutoff.", cutoffRun.selectorPlan().explanation());
    }

    @Test
    void cleanupReportRunsIncludesVerboseUnreferencedFilePlanDetailsWhenRequested() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        writeRunWithArtifact(engine, "new-run", "2026-04-17T00:02:00Z", "2026-04-17T00:02:01Z");
        Path selectedOrphan = tempDir.resolve("old-run").resolve("stale.log");
        Path tooYoungOrphan = tempDir.resolve("old-run").resolve("recent.tmp");
        Path bucketRetainedOrphan = tempDir.resolve("old-run").resolve("ancient.txt");
        Path runRetainedOrphan = tempDir.resolve("new-run").resolve("stale.log");
        Files.writeString(selectedOrphan, "selected");
        Files.writeString(tooYoungOrphan, "young");
        Files.writeString(bucketRetainedOrphan, "bucket retained");
        Files.writeString(runRetainedOrphan, "run retained");
        Instant measuredNear = Instant.now();
        Files.setLastModifiedTime(selectedOrphan, FileTime.from(measuredNear.minus(Duration.ofDays(2))));
        Files.setLastModifiedTime(tooYoungOrphan, FileTime.from(measuredNear.minus(Duration.ofHours(2))));
        Files.setLastModifiedTime(bucketRetainedOrphan, FileTime.from(measuredNear.minus(Duration.ofDays(31))));
        Files.setLastModifiedTime(runRetainedOrphan, FileTime.from(measuredNear.minus(Duration.ofDays(2))));

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setKeepLatest(1);
        options.setPruneUnreferencedFilesOnly(true);
        options.setDryRun(true);
        options.setVerboseUnreferencedCleanupPlan(true);
        options.setUnreferencedFileMinAgeSeconds(Duration.ofDays(1).toSeconds());
        options.addUnreferencedFileAgeBucket("stale");

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        ReportCleanupResult.UnreferencedCleanupPlan plan = result.unreferencedCleanupPlan();
        ReportCleanupResult.UnreferencedCleanupRunPlan oldRunPlan = cleanupRunPlan(plan, "old-run");
        assertEquals(3, oldRunPlan.files().size());
        assertCleanupFilePlan(
                oldRunPlan,
                selectedOrphan,
                "selected",
                "matched-cleanup-selectors",
                "Run matched cleanup selectors; file passed min-age and age-bucket predicates.",
                "stale",
                Duration.ofDays(1).toSeconds(),
                List.of("stale"),
                "log",
                Files.size(selectedOrphan));
        assertCleanupFilePlan(
                oldRunPlan,
                tooYoungOrphan,
                "retained",
                "younger-than-min-age",
                "Run matched cleanup selectors, but file age is below the configured minimum.",
                "recent",
                Duration.ofDays(1).toSeconds(),
                List.of("stale"),
                "temp",
                Files.size(tooYoungOrphan));
        assertCleanupFilePlan(
                oldRunPlan,
                bucketRetainedOrphan,
                "retained",
                "outside-selected-age-buckets",
                "Run matched cleanup selectors, but file age bucket is outside the selected buckets.",
                "ancient",
                Duration.ofDays(1).toSeconds(),
                List.of("stale"),
                "text",
                Files.size(bucketRetainedOrphan));
        ReportCleanupResult.UnreferencedCleanupRunPlan newRunPlan = cleanupRunPlan(plan, "new-run");
        assertEquals(1, newRunPlan.files().size());
        assertCleanupFilePlan(
                newRunPlan,
                runRetainedOrphan,
                "retained",
                "run-retained-by-cleanup-selectors",
                "Run did not match cleanup selectors, so file predicates were not applied.",
                "stale",
                Duration.ofDays(1).toSeconds(),
                List.of("stale"),
                "log",
                Files.size(runRetainedOrphan));
    }

    @Test
    void cleanupReportRunsWritesDryRunHtmlArtifactWithVerboseUnreferencedPlan() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        writeRunWithArtifact(engine, "new-run", "2026-04-17T00:02:00Z", "2026-04-17T00:02:01Z");
        Path selectedOrphan = tempDir.resolve("old-run").resolve("stale.log");
        Path retainedOrphan = tempDir.resolve("new-run").resolve("stale.log");
        Files.writeString(selectedOrphan, "selected");
        Files.writeString(retainedOrphan, "retained");
        Instant measuredNear = Instant.now();
        Files.setLastModifiedTime(selectedOrphan, FileTime.from(measuredNear.minus(Duration.ofDays(2))));
        Files.setLastModifiedTime(retainedOrphan, FileTime.from(measuredNear.minus(Duration.ofDays(2))));

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setKeepLatest(1);
        options.setPruneUnreferencedFilesOnly(true);
        options.setDryRun(true);
        options.setVerboseUnreferencedCleanupPlan(true);
        options.addUnreferencedFileAgeBucket("stale");

        ReportCleanupResult result = engine.cleanupReportRuns(tempDir, options);

        Path dryRunHtml = tempDir.resolve("cleanup-dry-run.html").toAbsolutePath().normalize();
        assertEquals(dryRunHtml, result.dryRunHtmlPath());
        assertTrue(Files.isRegularFile(dryRunHtml));
        String html = Files.readString(dryRunHtml);
        assertTrue(html.contains("<h1>Cleanup Dry Run</h1>"));
        assertTrue(html.contains("<div class=\"metric\">Selected runs<strong>1</strong></div>"));
        assertTrue(html.contains("<div class=\"metric\">Retained runs<strong>1</strong></div>"));
        assertTrue(html.contains("Run matched cleanup selector(s): keep-latest."));
        assertTrue(html.contains("Run is protected by the keep-latest selector."));
        assertTrue(html.contains("ageSeconds "));
        assertTrue(html.contains("bucket stale"));
        assertTrue(html.contains("selectedBuckets [stale]"));
        assertTrue(html.contains(escapeForHtml(selectedOrphan.toAbsolutePath().normalize().toString())));
        assertFalse(html.contains("Run with <code>--verbose-unreferenced-cleanup</code>"));
        String index = Files.readString(tempDir.resolve("index.html"));
        assertTrue(index.contains(
                "<div class=\"meta\">Latest cleanup dry-run: <a href=\"cleanup-dry-run.html\">cleanup-dry-run.html</a></div>"));
    }

    @Test
    void markMissingArtifactsPrunedUpdatesLegacyReportsWithBrokenArtifactLinks() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "legacy-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        Files.delete(tempDir.resolve("legacy-run").resolve("artifact.txt"));
        Files.delete(tempDir.resolve("legacy-run").resolve("network").resolve("body.txt"));
        Files.delete(tempDir.resolve("legacy-run").resolve("network"));

        ReportMaintenanceResult result = engine.markMissingArtifactsPruned(tempDir, false);

        Path artifact = tempDir.resolve("legacy-run").resolve("artifact.txt").toAbsolutePath().normalize();
        Path nestedArtifact = tempDir.resolve("legacy-run").resolve("network").resolve("body.txt").toAbsolutePath().normalize();
        assertEquals(1, result.scannedRuns());
        assertEquals(1, result.updatedRuns());
        assertEquals(List.of(artifact, nestedArtifact), result.markedArtifactPaths());
        assertFalse(result.dryRun());

        JsonNode report = new ObjectMapper().readTree(tempDir.resolve("legacy-run").resolve("report.json").toFile());
        JsonNode step = report.get("steps").get(0);
        assertTrue(step.get("artifactPruned").asBoolean());
        assertTrue(step.hasNonNull("artifactPrunedAt"));
        assertTrue(step.get("artifacts").get(0).get("pruned").asBoolean());
        assertTrue(step.get("artifacts").get(1).get("pruned").asBoolean());

        String html = Files.readString(tempDir.resolve("legacy-run").resolve("report.html"));
        assertTrue(html.contains("artifact.txt (removed by cleanup at "));
        assertTrue(html.contains("status: pruned"));
        assertFalse(html.contains("<a href=\"artifact.txt\">artifact.txt</a>"));
    }

    @Test
    void markMissingArtifactsPrunedDryRunDoesNotMutateReports() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "legacy-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        Files.delete(tempDir.resolve("legacy-run").resolve("artifact.txt"));
        String originalReport = Files.readString(tempDir.resolve("legacy-run").resolve("report.json"));

        ReportMaintenanceResult result = engine.markMissingArtifactsPruned(tempDir, true);

        assertEquals(1, result.scannedRuns());
        assertEquals(1, result.updatedRuns());
        assertEquals(1, result.markedArtifactPaths().size());
        assertTrue(result.dryRun());
        assertEquals(originalReport, Files.readString(tempDir.resolve("legacy-run").resolve("report.json")));
    }

    @Test
    void diagnoseReportStorageSummarizesArtifactsByRunAndType() throws Exception {
        DefaultReportEngine engine = new DefaultReportEngine();
        writeRunWithArtifact(engine, "old-run", "2026-04-17T00:00:00Z", "2026-04-17T00:00:01Z");
        writeRunWithArtifact(engine, "missing-run", "2026-04-17T00:01:00Z", "2026-04-17T00:01:01Z");
        writeRunWithArtifact(engine, "new-run", "2026-04-17T00:02:00Z", "2026-04-17T00:02:01Z");
        Files.writeString(tempDir.resolve("missing-run").resolve("orphan.log"), "orphaned log");
        Files.createDirectories(tempDir.resolve("new-run").resolve("scratch"));
        Files.writeString(tempDir.resolve("new-run").resolve("scratch").resolve("unreferenced.tmp"), "scratch");
        Files.setLastModifiedTime(
                tempDir.resolve("missing-run").resolve("orphan.log"),
                FileTime.from(Instant.parse("2026-04-17T00:01:10Z")));
        Files.setLastModifiedTime(
                tempDir.resolve("new-run").resolve("scratch").resolve("unreferenced.tmp"),
                FileTime.from(Instant.parse("2026-04-17T00:02:10Z")));

        ReportCleanupOptions options = new ReportCleanupOptions();
        options.setDeleteFinishedBefore(Instant.parse("2026-04-17T00:00:30Z"));
        options.setPruneArtifactsOnly(true);
        engine.cleanupReportRuns(tempDir, options);
        Files.delete(tempDir.resolve("missing-run").resolve("artifact.txt"));

        ReportStorageDiagnosticsResult result = engine.diagnoseReportStorage(tempDir);

        long newTextBytes = Files.size(tempDir.resolve("new-run").resolve("artifact.txt"));
        long newNetworkBytes = Files.size(tempDir.resolve("new-run").resolve("network").resolve("body.txt"));
        long missingNetworkBytes = Files.size(tempDir.resolve("missing-run").resolve("network").resolve("body.txt"));
        long missingOrphanBytes = Files.size(tempDir.resolve("missing-run").resolve("orphan.log"));
        long newOrphanBytes = Files.size(tempDir.resolve("new-run").resolve("scratch").resolve("unreferenced.tmp"));

        assertEquals(tempDir.toAbsolutePath().normalize(), result.reportRoot());
        assertEquals(3, result.scannedRuns());
        assertEquals(6, result.referencedArtifactCount());
        assertEquals(2, result.unreferencedFileCount());
        assertEquals(1, result.missingArtifactCount());
        assertEquals(2, result.prunedArtifactCount());
        assertEquals(newTextBytes + newNetworkBytes + missingNetworkBytes, result.referencedArtifactBytes());
        assertEquals(missingOrphanBytes + newOrphanBytes, result.unreferencedFileBytes());
        assertTrue(result.totalRunBytes() > result.referencedArtifactBytes());
        assertEquals(2, result.unreferencedFileTypes().size());
        ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary logType = result.unreferencedFileTypes().stream()
                .filter(type -> "log".equals(type.type()))
                .findFirst()
                .orElseThrow();
        assertEquals(1, logType.count());
        assertEquals(missingOrphanBytes, logType.bytes());
        ReportStorageDiagnosticsResult.UnreferencedFileTypeSummary tempType = result.unreferencedFileTypes().stream()
                .filter(type -> "temp".equals(type.type()))
                .findFirst()
                .orElseThrow();
        assertEquals(1, tempType.count());
        assertEquals(newOrphanBytes, tempType.bytes());
        assertEquals("2026-04-17T00:01:10Z", result.unreferencedFileAgeSummary().oldestLastModifiedAt());
        assertEquals("2026-04-17T00:02:10Z", result.unreferencedFileAgeSummary().newestLastModifiedAt());
        assertTrue(result.unreferencedFileAgeSummary().oldestAgeSeconds()
                >= result.unreferencedFileAgeSummary().newestAgeSeconds());
        assertEquals(1, result.unreferencedFileAgeBuckets().size());
        ReportStorageDiagnosticsResult.UnreferencedFileAgeBucketSummary staleBucket =
                result.unreferencedFileAgeBuckets().get(0);
        assertEquals("stale", staleBucket.key());
        assertEquals("stale 1d-7d", staleBucket.label());
        assertEquals(2, staleBucket.count());
        assertEquals(missingOrphanBytes + newOrphanBytes, staleBucket.bytes());

        ReportStorageDiagnosticsResult.ArtifactTypeSummary textType = result.artifactTypes().stream()
                .filter(type -> "text".equals(type.type()))
                .findFirst()
                .orElseThrow();
        assertEquals(3, textType.count());
        assertEquals(1, textType.missingCount());
        assertEquals(1, textType.prunedCount());
        assertEquals(newTextBytes, textType.bytes());

        ReportStorageDiagnosticsResult.ArtifactTypeSummary networkType = result.artifactTypes().stream()
                .filter(type -> "network-response-body".equals(type.type()))
                .findFirst()
                .orElseThrow();
        assertEquals(3, networkType.count());
        assertEquals(0, networkType.missingCount());
        assertEquals(1, networkType.prunedCount());
        assertEquals(newNetworkBytes + missingNetworkBytes, networkType.bytes());

        ReportStorageDiagnosticsResult.RunStorageSummary missingRun = result.runs().stream()
                .filter(run -> "missing-run".equals(run.runId()))
                .findFirst()
                .orElseThrow();
        assertEquals("OK", missingRun.status());
        assertEquals(2, missingRun.referencedArtifactCount());
        assertEquals(1, missingRun.unreferencedFileCount());
        assertEquals(1, missingRun.missingArtifactCount());
        assertEquals(0, missingRun.prunedArtifactCount());
        assertEquals(missingNetworkBytes, missingRun.referencedArtifactBytes());
        assertEquals(missingOrphanBytes, missingRun.unreferencedFileBytes());
        assertEquals(1, missingRun.unreferencedFileTypes().size());
        assertEquals("log", missingRun.unreferencedFileTypes().get(0).type());
        assertEquals(1, missingRun.unreferencedFileTypes().get(0).count());
        assertEquals(missingOrphanBytes, missingRun.unreferencedFileTypes().get(0).bytes());
        assertEquals("2026-04-17T00:01:10Z", missingRun.unreferencedFileAgeSummary().oldestLastModifiedAt());
        assertEquals(1, missingRun.unreferencedFileAgeBuckets().size());
        assertEquals("stale", missingRun.unreferencedFileAgeBuckets().get(0).key());
        assertEquals(1, missingRun.unreferencedFileAgeBuckets().get(0).count());
        assertEquals(missingOrphanBytes, missingRun.unreferencedFileAgeBuckets().get(0).bytes());

        ReportStorageDiagnosticsResult.RunStorageSummary newRun = result.runs().stream()
                .filter(run -> "new-run".equals(run.runId()))
                .findFirst()
                .orElseThrow();
        assertEquals(1, newRun.unreferencedFileTypes().size());
        assertEquals("temp", newRun.unreferencedFileTypes().get(0).type());
        assertEquals(1, newRun.unreferencedFileTypes().get(0).count());
        assertEquals(newOrphanBytes, newRun.unreferencedFileTypes().get(0).bytes());
        assertEquals(1, newRun.unreferencedFileAgeBuckets().size());
        assertEquals("stale", newRun.unreferencedFileAgeBuckets().get(0).key());
        assertEquals(1, newRun.unreferencedFileAgeBuckets().get(0).count());
        assertEquals(newOrphanBytes, newRun.unreferencedFileAgeBuckets().get(0).bytes());

        String index = Files.readString(tempDir.resolve("index.html"));
        assertTrue(index.contains("<br>Types log 1 ("));
        assertTrue(index.contains("<br>Types temp 1 ("));
        assertTrue(index.contains("<div class=\"storage-metric\">Oldest unreferenced<strong>2026-04-17T00:01:10Z ("));
        assertTrue(index.contains("<div class=\"storage-metric\">Newest unreferenced<strong>2026-04-17T00:02:10Z ("));
        assertTrue(index.contains("<th>Unreferenced age bucket</th>"));
        assertTrue(index.contains("<td>stale 1d-7d</td><td>2</td><td>"));
        assertTrue(index.contains("<br>Buckets stale 1d-7d 1 ("));
        assertTrue(index.contains("<br>Oldest 2026-04-17T00:01:10Z ("));
    }

    private void writeRun(DefaultReportEngine engine, String runId, String startedAt, String finishedAt) {
        writeRun(engine, runId, startedAt, finishedAt, "SUCCESS");
    }

    private void assertCleanupPlanReason(
            ReportCleanupResult.UnreferencedCleanupPlan plan,
            String reason,
            int count,
            long bytes) {
        ReportCleanupResult.UnreferencedCleanupRetentionReason match = plan.retentionReasons()
                .stream()
                .filter(value -> reason.equals(value.reason()))
                .findFirst()
                .orElseThrow();
        assertEquals(count, match.count());
        assertEquals(bytes, match.bytes());
    }

    private ReportCleanupResult.UnreferencedCleanupRunPlan cleanupRunPlan(
            ReportCleanupResult.UnreferencedCleanupPlan plan,
            String runId) {
        return plan.runs()
                .stream()
                .filter(value -> runId.equals(value.runId()))
                .findFirst()
                .orElseThrow();
    }

    private void assertCleanupRunPlanReason(
            ReportCleanupResult.UnreferencedCleanupRunPlan plan,
            String reason,
            int count,
            long bytes) {
        ReportCleanupResult.UnreferencedCleanupRetentionReason match = plan.retentionReasons()
                .stream()
                .filter(value -> reason.equals(value.reason()))
                .findFirst()
                .orElseThrow();
        assertEquals(count, match.count());
        assertEquals(bytes, match.bytes());
    }

    private void assertCleanupFilePlan(
            ReportCleanupResult.UnreferencedCleanupRunPlan plan,
            Path path,
            String decision,
            String reason,
            String explanation,
            String ageBucket,
            long configuredMinAgeSeconds,
            List<String> selectedAgeBuckets,
            String type,
            long bytes) {
        ReportCleanupResult.UnreferencedCleanupFilePlan match = plan.files()
                .stream()
                .filter(value -> path.toAbsolutePath().normalize().equals(value.path()))
                .findFirst()
                .orElseThrow();
        assertEquals(decision, match.decision());
        assertEquals(reason, match.reason());
        assertEquals(explanation, match.explanation());
        assertTrue(match.ageSeconds() >= 0L);
        assertEquals(ageBucket, match.ageBucket());
        assertEquals(configuredMinAgeSeconds, match.configuredMinAgeSeconds());
        assertEquals(selectedAgeBuckets, match.selectedAgeBuckets());
        assertEquals(type, match.type());
        assertEquals(bytes, match.bytes());
        assertFalse(match.lastModifiedAt().isBlank());
    }

    private String escapeForHtml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
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
        writeRunWithArtifact(engine, runId, startedAt, finishedAt, "SUCCESS");
    }

    private void writeRunWithArtifact(
            DefaultReportEngine engine,
            String runId,
            String startedAt,
            String finishedAt,
            String status) throws Exception {
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
        step.setStatus(status);
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
