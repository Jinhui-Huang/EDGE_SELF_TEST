package com.example.webtest.admin.http;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.webtest.admin.service.AgentGenerateService;
import com.example.webtest.admin.service.CaseDetailService;
import com.example.webtest.admin.service.CatalogPersistenceService;
import com.example.webtest.admin.service.ConfigPersistenceService;
import com.example.webtest.admin.service.ConnectionValidationService;
import com.example.webtest.admin.service.DataTemplatePersistenceService;
import com.example.webtest.admin.service.DocumentPersistenceService;
import com.example.webtest.admin.service.Phase3MockDataService;
import com.example.webtest.admin.service.ReportArtifactService;
import com.example.webtest.admin.service.RunStatusService;
import com.example.webtest.admin.service.SchedulerPersistenceService;
import com.example.webtest.json.Jsons;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalAdminApiServerTest {
    @Test
    void servesPhase3AdminAndExtensionSnapshots(@TempDir Path tempDir) throws Exception {
        Path runsDir = tempDir.resolve("runs");
        Path runDir = runsDir.resolve("checkout-web-nightly");
        Files.createDirectories(runDir);
        Map<String, Object> reportPayload = Map.of(
                "runId", "checkout-web-nightly",
                "startedAt", "2026-04-18T09:00:00Z",
                "finishedAt", "2026-04-18T09:10:00Z",
                "summary", Map.of(
                        "total", 72,
                        "passed", 71,
                        "failed", 1,
                        "skipped", 0,
                        "durationMs", 600_000),
                "steps", List.of(
                        Map.of("artifacts", List.of(Map.of("path", "failure.png"))),
                        Map.of("artifacts", List.of())));
        Files.writeString(runDir.resolve("report.json"), Jsons.writeValueAsString(reportPayload), StandardCharsets.UTF_8);
        Files.writeString(runDir.resolve("report.html"), "<html></html>", StandardCharsets.UTF_8);

        Path queueFile = tempDir.resolve("execution-queue.json");
        Map<String, Object> queuePayload = Map.of(
                "items", List.of(
                        Map.of(
                                "title", "payment-smoke / prod-like",
                                "owner", "qa-platform",
                                "state", "Waiting",
                                "detail", "Run starts after environment release.",
                                "updatedAt", "2026-04-18T10:20:00Z"),
                        Map.of(
                                "title", "report-retention-audit",
                                "owner", "ops",
                                "state", "In progress",
                                "detail", "Cleanup dry-run is ready for operator review.",
                                "updatedAt", "2026-04-18T10:46:00Z")));
        Files.writeString(queueFile, Jsons.writeValueAsString(queuePayload), StandardCharsets.UTF_8);

        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Map<String, Object> schedulerPayload = Map.of(
                "schedulerId", "local-phase3-scheduler",
                "queue", List.of(
                        Map.of(
                                "title", "scheduler-checkout-smoke / prod-like",
                                "owner", "scheduler-daemon",
                                "state", "In progress",
                                "detail", "Worker slot 2 is executing payment assertions.",
                                "updatedAt", "2026-04-18T10:56:00Z"),
                        Map.of(
                                "title", "scheduler-member-regression / staging",
                                "owner", "scheduler-daemon",
                                "state", "Waiting",
                                "detail", "Waiting for browser capacity to free up.",
                                "updatedAt", "2026-04-18T10:54:00Z")),
                "executions", List.of(
                        Map.ofEntries(
                                Map.entry("runId", "scheduler-checkout-smoke"),
                                Map.entry("projectKey", "checkout-web"),
                                Map.entry("status", "RUNNING"),
                                Map.entry("owner", "scheduler-daemon"),
                                Map.entry("environment", "prod-like"),
                                Map.entry("detail", "Scheduler promoted the run from queue to active worker."),
                                Map.entry("schedulerId", "local-phase3-scheduler"),
                                Map.entry("position", 1),
                                Map.entry("total", 38),
                                Map.entry("failed", 0),
                                Map.entry("artifacts", 4),
                                Map.entry("startedAt", "2026-04-18T10:55:00Z")),
                        Map.ofEntries(
                                Map.entry("runId", "scheduler-ops-audit"),
                                Map.entry("projectKey", "ops-console"),
                                Map.entry("status", "QUEUED"),
                                Map.entry("owner", "scheduler-daemon"),
                                Map.entry("environment", "ops-dr"),
                                Map.entry("detail", "Awaiting approval before maintenance execution."),
                                Map.entry("schedulerId", "local-phase3-scheduler"),
                                Map.entry("position", 2),
                                Map.entry("total", 0),
                                Map.entry("failed", 0),
                                Map.entry("artifacts", 0),
                                Map.entry("startedAt", "2026-04-18T10:52:00Z"))));
        Files.writeString(schedulerStateFile, Jsons.writeValueAsString(schedulerPayload), StandardCharsets.UTF_8);

        Path catalogFile = tempDir.resolve("project-catalog.json");
        Map<String, Object> catalogPayload = Map.of(
                "projects", List.of(
                        Map.of(
                                "key", "checkout-web",
                                "name", "checkout-web",
                                "scope", "Payment journey",
                                "environments", List.of("staging-edge", "prod-like"),
                                "note", "Checkout stability review remains active."),
                        Map.of(
                                "key", "member-center",
                                "name", "member-center",
                                "scope", "Account and profile flows",
                                "environments", List.of("staging-edge"),
                                "note", "No local runs recorded yet.")),
                "cases", List.of(
                        Map.of(
                                "id", "checkout-smoke",
                                "projectKey", "checkout-web",
                                "name", "Checkout smoke",
                                "tags", List.of("smoke", "locator-repair-needed"),
                                "status", "ACTIVE",
                                "updatedAt", "2026-04-18T10:00:00Z",
                                "archived", false),
                        Map.of(
                                "id", "checkout-regression",
                                "projectKey", "checkout-web",
                                "name", "Checkout regression",
                                "tags", List.of("regression"),
                                "status", "ACTIVE",
                                "updatedAt", "2026-04-18T10:10:00Z",
                                "archived", false),
                        Map.of(
                                "id", "member-profile",
                                "projectKey", "member-center",
                                "name", "Profile save",
                                "tags", List.of("profile"),
                                "status", "ACTIVE",
                                "updatedAt", "2026-04-18T10:30:00Z",
                                "archived", false)));
        Files.writeString(catalogFile, Jsons.writeValueAsString(catalogPayload), StandardCharsets.UTF_8);

        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Map<String, Object> historyPayload = Map.of(
                "items", List.of(
                        Map.of(
                                "runId", "member-center-daily",
                                "projectKey", "member-center",
                                "status", "RUNNING",
                                "owner", "team-growth",
                                "environment", "staging-edge",
                                "detail", "Browser session is active and waiting for profile-save assertions.",
                                "total", 24,
                                "failed", 0,
                                "artifacts", 2,
                                "startedAt", "2026-04-18T10:50:00Z"),
                        Map.ofEntries(
                                Map.entry("runId", "ops-console-maintenance"),
                                Map.entry("projectKey", "ops-console"),
                                Map.entry("status", "CANCELLED"),
                                Map.entry("owner", "ops"),
                                Map.entry("environment", "ops-dr"),
                                Map.entry("detail", "Run was cancelled after a maintenance window change."),
                                Map.entry("total", 0),
                                Map.entry("failed", 0),
                                Map.entry("artifacts", 0),
                                Map.entry("startedAt", "2026-04-18T08:00:00Z"),
                                Map.entry("finishedAt", "2026-04-18T08:05:00Z"))));
        Files.writeString(executionHistoryFile, Jsons.writeValueAsString(historyPayload), StandardCharsets.UTF_8);

        Path modelConfigFile = tempDir.resolve("model-config.json");
        Map<String, Object> modelConfigPayload = Map.of(
                "items", List.of(
                        Map.of("label", "Provider", "value", "OpenAI Responses API"),
                        Map.of("label", "Mode", "value", "Audit-first / staged approval"),
                        Map.of("label", "Fallback", "value", "Rules-only plan when model is offline")));
        Files.writeString(modelConfigFile, Jsons.writeValueAsString(modelConfigPayload), StandardCharsets.UTF_8);

        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Map<String, Object> environmentConfigPayload = Map.of(
                "items", List.of(
                        Map.of("label", "Browser pool", "value", "edge-stable-win11 / edge-beta-win11"),
                        Map.of("label", "Account slots", "value", "smoke_bot_01, member_ops_02"),
                        Map.of("label", "Network zone", "value", "staging / prod-like split routing")));
        Files.writeString(environmentConfigFile, Jsons.writeValueAsString(environmentConfigPayload), StandardCharsets.UTF_8);

        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(
                        runsDir,
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        schedulerStateFile,
                        queueFile,
                        catalogFile,
                        executionHistoryFile,
                        modelConfigFile,
                        environmentConfigFile,
                        Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC)),
                new SchedulerPersistenceService(
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC)),
                new ConfigPersistenceService(
                        modelConfigFile,
                        environmentConfigFile),
                new CatalogPersistenceService(catalogFile, Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC)),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile, new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC)), Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC)),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(tempDir.resolve("data-templates.json")))) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            HttpResponse<String> health = client.send(request(server, "/health"), HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> admin = client.send(
                    request(server, "/api/phase3/admin-console"),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> extension = client.send(
                    request(server, "/api/phase3/extension-popup"),
                    HttpResponse.BodyHandlers.ofString());

            assertEquals(200, health.statusCode());
            assertTrue(health.body().contains("\"UP\""));
            assertEquals(200, admin.statusCode());
            assertTrue(admin.body().contains("\"navigation\""));
            assertTrue(admin.body().contains("\"checkout-web-nightly\""));
            assertTrue(admin.body().contains("\"scheduler-checkout-smoke / prod-like\""));
            assertTrue(admin.body().contains("\"Active projects\""));
            assertTrue(admin.body().contains("\"checkout-web\""));
            assertTrue(admin.body().contains("\"Payment journey\""));
            assertTrue(admin.body().contains("\"locator-repair-needed\""));
            assertTrue(admin.body().contains("\"cases\""));
            assertTrue(admin.body().contains("\"Checkout smoke\""));
            assertTrue(admin.body().contains("\"scheduler-checkout-smoke\""));
            assertTrue(admin.body().contains("\"RUNNING\""));
            assertTrue(admin.body().contains("\"scheduler-state.json / local-phase3-scheduler / prod-like / scheduler-daemon\""));
            assertTrue(admin.body().contains("\"OpenAI Responses API\""));
            assertTrue(admin.body().contains("\"edge-stable-win11 / edge-beta-win11\""));
            assertEquals(200, extension.statusCode());
            assertTrue(extension.body().contains("\"runtime\""));
            assertTrue(extension.body().contains("\"2 queued / 1 active / 1 waiting / 0 review\""));
            assertTrue(extension.body().contains("\"Latest local run is still active; keep audit review open until it settles\""));
        }
    }

    @Test
    void prefersDerivedSchedulerServiceFilesOverSnapshot(@TempDir Path tempDir) throws Exception {
        Path runsDir = tempDir.resolve("runs");
        Files.createDirectories(runsDir);

        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Map<String, Object> requestsPayload = Map.of(
                "schedulerId", "derived-phase3-scheduler",
                "requests", List.of(
                        Map.of(
                                "runId", "derived-checkout-smoke",
                                "projectKey", "checkout-web",
                                "owner", "qa-platform",
                                "environment", "prod-like",
                                "title", "derived-checkout-smoke / prod-like",
                                "detail", "Accepted into the local scheduler request queue.",
                                "status", "QUEUED",
                                "position", 1,
                                "requestedAt", "2026-04-18T10:58:00Z"),
                        Map.of(
                                "runId", "derived-member-regression",
                                "projectKey", "member-center",
                                "owner", "team-growth",
                                "environment", "staging-edge",
                                "title", "derived-member-regression / staging-edge",
                                "detail", "Waiting for browser capacity.",
                                "status", "WAITING",
                                "position", 2,
                                "requestedAt", "2026-04-18T10:57:00Z")));
        Files.writeString(schedulerRequestsFile, Jsons.writeValueAsString(requestsPayload), StandardCharsets.UTF_8);

        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Map<String, Object> eventsPayload = Map.of(
                "schedulerId", "derived-phase3-scheduler",
                "events", List.of(
                        Map.ofEntries(
                                Map.entry("runId", "derived-checkout-smoke"),
                                Map.entry("projectKey", "checkout-web"),
                                Map.entry("owner", "scheduler-daemon"),
                                Map.entry("environment", "prod-like"),
                                Map.entry("type", "STARTED"),
                                Map.entry("detail", "Worker slot 3 is executing payment assertions."),
                                Map.entry("position", 1),
                                Map.entry("total", 41),
                                Map.entry("failed", 0),
                                Map.entry("artifacts", 5),
                                Map.entry("at", "2026-04-18T10:59:00Z")),
                        Map.ofEntries(
                                Map.entry("runId", "derived-member-regression"),
                                Map.entry("projectKey", "member-center"),
                                Map.entry("owner", "scheduler-daemon"),
                                Map.entry("environment", "staging-edge"),
                                Map.entry("type", "NEEDS_REVIEW"),
                                Map.entry("detail", "Locator repair recommendation requires operator approval."),
                                Map.entry("position", 2),
                                Map.entry("total", 0),
                                Map.entry("failed", 0),
                                Map.entry("artifacts", 0),
                                Map.entry("at", "2026-04-18T10:58:30Z"))));
        Files.writeString(schedulerEventsFile, Jsons.writeValueAsString(eventsPayload), StandardCharsets.UTF_8);

        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Map<String, Object> schedulerSnapshotPayload = Map.of(
                "schedulerId", "snapshot-fallback-should-not-win",
                "queue", List.of(Map.of(
                        "title", "snapshot-run / ignored",
                        "owner", "snapshot",
                        "state", "Waiting",
                        "detail", "This entry should be ignored when derived service files exist.",
                        "updatedAt", "2026-04-18T10:20:00Z")),
                "executions", List.of(Map.ofEntries(
                        Map.entry("runId", "snapshot-run"),
                        Map.entry("projectKey", "snapshot-project"),
                        Map.entry("status", "RUNNING"),
                        Map.entry("owner", "snapshot"),
                        Map.entry("environment", "ignored"),
                        Map.entry("detail", "Snapshot should not win."),
                        Map.entry("schedulerId", "snapshot-fallback-should-not-win"),
                        Map.entry("position", 7),
                        Map.entry("total", 1),
                        Map.entry("failed", 0),
                        Map.entry("artifacts", 0),
                        Map.entry("startedAt", "2026-04-18T10:00:00Z"))));
        Files.writeString(schedulerStateFile, Jsons.writeValueAsString(schedulerSnapshotPayload), StandardCharsets.UTF_8);

        Path queueFile = tempDir.resolve("execution-queue.json");
        Files.writeString(queueFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Path catalogFile = tempDir.resolve("project-catalog.json");
        Files.writeString(catalogFile, Jsons.writeValueAsString(Map.of("projects", List.of(), "cases", List.of())), StandardCharsets.UTF_8);
        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Files.writeString(executionHistoryFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Path modelConfigFile = tempDir.resolve("model-config.json");
        Files.writeString(modelConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Files.writeString(environmentConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);

        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(
                        runsDir,
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        schedulerStateFile,
                        queueFile,
                        catalogFile,
                        executionHistoryFile,
                        modelConfigFile,
                        environmentConfigFile,
                        Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC)),
                new SchedulerPersistenceService(
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC)),
                new ConfigPersistenceService(
                        modelConfigFile,
                        environmentConfigFile),
                new CatalogPersistenceService(catalogFile, Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC)),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile, new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC)), Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC)),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(tempDir.resolve("data-templates.json")))) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            HttpResponse<String> admin = client.send(
                    request(server, "/api/phase3/admin-console"),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> extension = client.send(
                    request(server, "/api/phase3/extension-popup"),
                    HttpResponse.BodyHandlers.ofString());

            assertEquals(200, admin.statusCode());
            assertTrue(admin.body().contains("\"derived-checkout-smoke / prod-like\""));
            assertTrue(admin.body().contains("\"derived-member-regression / staging-edge\""));
            assertTrue(admin.body().contains("\"scheduler-service / derived-phase3-scheduler / prod-like / scheduler-daemon\""));
            assertTrue(admin.body().contains("\"Scheduler status RUNNING. Worker slot 3 is executing payment assertions."));
            assertTrue(!admin.body().contains("\"snapshot-run\""));

            assertEquals(200, extension.statusCode());
            assertTrue(extension.body().contains("\"2 queued / 1 active / 0 waiting / 1 review\""));
        }
    }

    @Test
    void persistsSchedulerMutationsAndReflectsThemInSnapshots(@TempDir Path tempDir) throws Exception {
        Path runsDir = tempDir.resolve("runs");
        Files.createDirectories(runsDir);
        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Path queueFile = tempDir.resolve("execution-queue.json");
        Path catalogFile = tempDir.resolve("project-catalog.json");
        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Path modelConfigFile = tempDir.resolve("model-config.json");
        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Files.writeString(catalogFile, Jsons.writeValueAsString(Map.of(
                "projects", List.of(Map.of(
                        "key", "checkout-web",
                        "name", "checkout-web",
                        "scope", "Payment journey",
                        "environments", List.of("prod-like"),
                        "note", "Scheduler-persisted requests should surface here.")),
                "cases", List.of())), StandardCharsets.UTF_8);
        Files.writeString(queueFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(executionHistoryFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(modelConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(environmentConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);

        Clock clock = Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC);
        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(
                        runsDir,
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        schedulerStateFile,
                        queueFile,
                        catalogFile,
                        executionHistoryFile,
                        modelConfigFile,
                        environmentConfigFile,
                        clock),
                new SchedulerPersistenceService(
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        clock),
                new ConfigPersistenceService(
                        modelConfigFile,
                        environmentConfigFile),
                new CatalogPersistenceService(catalogFile, clock),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile, new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock), clock),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(tempDir.resolve("data-templates.json"), clock))) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            HttpResponse<String> requestMutation = client.send(
                    request(server, "/api/phase3/scheduler/requests", "POST", Jsons.writeValueAsString(Map.of(
                            "runId", "checkout-web-smoke",
                            "projectKey", "checkout-web",
                            "owner", "qa-platform",
                            "environment", "prod-like",
                            "detail", "Accepted from operator launch panel."))),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> eventMutation = client.send(
                    request(server, "/api/phase3/scheduler/events", "POST", Jsons.writeValueAsString(Map.of(
                            "runId", "checkout-web-smoke",
                            "projectKey", "checkout-web",
                            "owner", "scheduler-daemon",
                            "environment", "prod-like",
                            "type", "STARTED",
                            "detail", "Worker slot 4 is executing checkout smoke.",
                            "total", 12,
                            "failed", 0,
                            "artifacts", 1,
                            "position", 1))),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> admin = client.send(
                    request(server, "/api/phase3/admin-console"),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> extension = client.send(
                    request(server, "/api/phase3/extension-popup"),
                    HttpResponse.BodyHandlers.ofString());

            assertEquals(202, requestMutation.statusCode());
            assertTrue(requestMutation.body().contains("\"ACCEPTED\""));
            assertTrue(requestMutation.body().contains("\"scheduler-request\""));
            assertTrue(requestMutation.body().contains("\"checkout-web-smoke / prod-like\""));

            assertEquals(202, eventMutation.statusCode());
            assertTrue(eventMutation.body().contains("\"scheduler-event\""));
            assertTrue(eventMutation.body().contains("\"STARTED\""));

            String persistedRequests = Files.readString(schedulerRequestsFile, StandardCharsets.UTF_8);
            String persistedEvents = Files.readString(schedulerEventsFile, StandardCharsets.UTF_8);
            assertTrue(persistedRequests.contains("\"checkout-web-smoke\""));
            assertTrue(persistedRequests.contains("\"PRE_EXECUTION\""));
            assertTrue(persistedRequests.contains("\"local-phase3-scheduler\""));
            assertTrue(persistedEvents.contains("\"STARTED\""));
            assertTrue(persistedEvents.contains("\"2026-04-18T11:00:00Z\""));

            assertEquals(200, admin.statusCode());
            assertTrue(admin.body().contains("\"checkout-web-smoke / prod-like\""));
            assertTrue(admin.body().contains("\"scheduler-service / local-phase3-scheduler / prod-like / scheduler-daemon\""));
            assertTrue(admin.body().contains("\"RUNNING\""));

            assertEquals(200, extension.statusCode());
            assertTrue(extension.body().contains("\"1 queued / 1 active / 0 waiting / 0 review\""));
        }
    }

    @Test
    void persistsEditableConfigItemsAndReflectsThemInSnapshots(@TempDir Path tempDir) throws Exception {
        Path runsDir = tempDir.resolve("runs");
        Files.createDirectories(runsDir);
        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Path queueFile = tempDir.resolve("execution-queue.json");
        Path catalogFile = tempDir.resolve("project-catalog.json");
        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Path modelConfigFile = tempDir.resolve("model-config.json");
        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Files.writeString(queueFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(catalogFile, Jsons.writeValueAsString(Map.of("projects", List.of(), "cases", List.of())), StandardCharsets.UTF_8);
        Files.writeString(executionHistoryFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(modelConfigFile, Jsons.writeValueAsString(Map.of(
                "items", List.of(Map.of("label", "Provider", "value", "OpenAI Responses API")))), StandardCharsets.UTF_8);
        Files.writeString(environmentConfigFile, Jsons.writeValueAsString(Map.of(
                "items", List.of(Map.of("label", "Browser pool", "value", "edge-stable-win11")))), StandardCharsets.UTF_8);

        Clock clock = Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC);
        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(
                        runsDir,
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        schedulerStateFile,
                        queueFile,
                        catalogFile,
                        executionHistoryFile,
                        modelConfigFile,
                        environmentConfigFile,
                        clock),
                new SchedulerPersistenceService(
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        clock),
                new ConfigPersistenceService(
                        modelConfigFile,
                        environmentConfigFile),
                new CatalogPersistenceService(catalogFile, clock),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile, new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock), clock),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(tempDir.resolve("data-templates.json"), clock))) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            HttpResponse<String> modelMutation = client.send(
                    request(server, "/api/phase3/config/model", "POST", Jsons.writeValueAsString(Map.of(
                            "label", "Provider",
                            "value", "OpenAI Responses API / audited"))),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> environmentMutation = client.send(
                    request(server, "/api/phase3/config/environment", "POST", Jsons.writeValueAsString(Map.of(
                            "label", "Browser pool",
                            "value", "edge-stable-win11 / edge-beta-win11"))),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> appendedModelMutation = client.send(
                    request(server, "/api/phase3/config/model", "POST", Jsons.writeValueAsString(Map.of(
                            "label", "Mode",
                            "value", "Audit-first / staged approval"))),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> admin = client.send(
                    request(server, "/api/phase3/admin-console"),
                    HttpResponse.BodyHandlers.ofString());

            assertEquals(202, modelMutation.statusCode());
            assertTrue(modelMutation.body().contains("\"model-config-item\""));
            assertTrue(modelMutation.body().contains("\"updated\":true"));

            assertEquals(202, environmentMutation.statusCode());
            assertTrue(environmentMutation.body().contains("\"environment-config-item\""));
            assertTrue(environmentMutation.body().contains("\"updated\":true"));

            assertEquals(202, appendedModelMutation.statusCode());
            assertTrue(appendedModelMutation.body().contains("\"updated\":false"));
            assertTrue(appendedModelMutation.body().contains("\"Mode\""));

            String persistedModelConfig = Files.readString(modelConfigFile, StandardCharsets.UTF_8);
            String persistedEnvironmentConfig = Files.readString(environmentConfigFile, StandardCharsets.UTF_8);
            assertTrue(persistedModelConfig.contains("\"OpenAI Responses API / audited\""));
            assertTrue(persistedModelConfig.contains("\"Audit-first / staged approval\""));
            assertTrue(persistedEnvironmentConfig.contains("\"edge-stable-win11 / edge-beta-win11\""));

            assertEquals(200, admin.statusCode());
            assertTrue(admin.body().contains("\"OpenAI Responses API / audited\""));
            assertTrue(admin.body().contains("\"Audit-first / staged approval\""));
            assertTrue(admin.body().contains("\"edge-stable-win11 / edge-beta-win11\""));
        }
    }

    @Test
    void persistsEditableCatalogProjectsAndReflectsThemInSnapshots(@TempDir Path tempDir) throws Exception {
        Path runsDir = tempDir.resolve("runs");
        Files.createDirectories(runsDir);
        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Path queueFile = tempDir.resolve("execution-queue.json");
        Path catalogFile = tempDir.resolve("project-catalog.json");
        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Path modelConfigFile = tempDir.resolve("model-config.json");
        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Files.writeString(queueFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(executionHistoryFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(modelConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(environmentConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(catalogFile, Jsons.writeValueAsString(Map.of(
                "projects", List.of(Map.of(
                        "key", "checkout-web",
                        "name", "checkout-web",
                        "scope", "Payment journey",
                        "environments", List.of("prod-like"),
                        "note", "Initial catalog note.")),
                "cases", List.of(Map.of(
                        "id", "checkout-smoke",
                        "projectKey", "checkout-web",
                        "name", "Checkout smoke",
                        "tags", List.of("smoke"),
                        "status", "ACTIVE",
                        "updatedAt", "2026-04-18T10:00:00Z",
                        "archived", false)))), StandardCharsets.UTF_8);

        Clock clock = Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC);
        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(
                        runsDir,
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        schedulerStateFile,
                        queueFile,
                        catalogFile,
                        executionHistoryFile,
                        modelConfigFile,
                        environmentConfigFile,
                        clock),
                new SchedulerPersistenceService(
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        clock),
                new ConfigPersistenceService(
                        modelConfigFile,
                        environmentConfigFile),
                new CatalogPersistenceService(catalogFile, clock),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile, new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock), clock),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(tempDir.resolve("data-templates.json"), clock))) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            HttpResponse<String> updateMutation = client.send(
                    request(server, "/api/phase3/catalog/project", "POST", Jsons.writeValueAsString(Map.of(
                            "key", "checkout-web",
                            "name", "checkout-web",
                            "scope", "Payment journey / audited",
                            "environments", List.of("prod-like", "staging-edge"),
                            "note", "Operator updated the Phase 3 catalog row."))),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> appendMutation = client.send(
                    request(server, "/api/phase3/catalog/project", "POST", Jsons.writeValueAsString(Map.of(
                            "key", "member-center",
                            "name", "member-center",
                            "scope", "Account and profile flows",
                            "environments", List.of("staging-edge", "uat"),
                            "note", "Added from the admin console shell."))),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> admin = client.send(
                    request(server, "/api/phase3/admin-console"),
                    HttpResponse.BodyHandlers.ofString());

            assertEquals(202, updateMutation.statusCode());
            assertTrue(updateMutation.body().contains("\"catalog-project\""));
            assertTrue(updateMutation.body().contains("\"updated\":true"));

            assertEquals(202, appendMutation.statusCode());
            assertTrue(appendMutation.body().contains("\"updated\":false"));
            assertTrue(appendMutation.body().contains("\"member-center\""));

            String persistedCatalog = Files.readString(catalogFile, StandardCharsets.UTF_8);
            assertTrue(persistedCatalog.contains("\"Payment journey / audited\""));
            assertTrue(persistedCatalog.contains("\"member-center\""));
            assertTrue(persistedCatalog.contains("\"Checkout smoke\""));

            assertEquals(200, admin.statusCode());
            assertTrue(admin.body().contains("\"Payment journey / audited\""));
            assertTrue(admin.body().contains("\"member-center\""));
            assertTrue(admin.body().contains("\"1 active cases are mapped"));
        }
    }

    @Test
    void persistsEditableCatalogCasesAndReflectsThemInSnapshots(@TempDir Path tempDir) throws Exception {
        Path runsDir = tempDir.resolve("runs");
        Files.createDirectories(runsDir);
        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Path queueFile = tempDir.resolve("execution-queue.json");
        Path catalogFile = tempDir.resolve("project-catalog.json");
        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Path modelConfigFile = tempDir.resolve("model-config.json");
        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Files.writeString(queueFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(executionHistoryFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(modelConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(environmentConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(catalogFile, Jsons.writeValueAsString(Map.of(
                "projects", List.of(Map.of(
                        "key", "checkout-web",
                        "name", "checkout-web",
                        "scope", "Payment journey",
                        "environments", List.of("prod-like"),
                        "note", "Initial catalog note.")),
                "cases", List.of(Map.of(
                        "id", "checkout-smoke",
                        "projectKey", "checkout-web",
                        "name", "Checkout smoke",
                        "tags", List.of("smoke"),
                        "status", "ACTIVE",
                        "updatedAt", "2026-04-18T10:00:00Z",
                        "archived", false)))), StandardCharsets.UTF_8);

        Clock clock = Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC);
        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(
                        runsDir,
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        schedulerStateFile,
                        queueFile,
                        catalogFile,
                        executionHistoryFile,
                        modelConfigFile,
                        environmentConfigFile,
                        clock),
                new SchedulerPersistenceService(
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        clock),
                new ConfigPersistenceService(
                        modelConfigFile,
                        environmentConfigFile),
                new CatalogPersistenceService(catalogFile, clock),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile, new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock), clock),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(tempDir.resolve("data-templates.json"), clock))) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            HttpResponse<String> updateMutation = client.send(
                    request(server, "/api/phase3/catalog/case", "POST", Jsons.writeValueAsString(Map.of(
                            "id", "checkout-smoke",
                            "projectKey", "checkout-web",
                            "name", "Checkout smoke / audited",
                            "tags", List.of("smoke", "audit-ready"),
                            "status", "NEEDS_REVIEW",
                            "archived", false))),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> appendMutation = client.send(
                    request(server, "/api/phase3/catalog/case", "POST", Jsons.writeValueAsString(Map.of(
                            "id", "checkout-regression-card",
                            "projectKey", "checkout-web",
                            "name", "Checkout card regression",
                            "tags", "regression, locator-repair-needed",
                            "status", "ACTIVE",
                            "archived", false,
                            "dsl", "case \"Checkout card regression\" {}",
                            "sourceDocumentId", "checkout-doc-v3",
                            "generationMeta", Map.of(
                                    "candidateId", "gen-checkout-regression-card-a",
                                    "confidence", "0.94",
                                    "generator", "agent.generate-case")))),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> admin = client.send(
                    request(server, "/api/phase3/admin-console"),
                    HttpResponse.BodyHandlers.ofString());

            assertEquals(202, updateMutation.statusCode());
            assertTrue(updateMutation.body().contains("\"catalog-case\""));
            assertTrue(updateMutation.body().contains("\"updated\":true"));

            assertEquals(202, appendMutation.statusCode());
            assertTrue(appendMutation.body().contains("\"updated\":false"));
            assertTrue(appendMutation.body().contains("\"checkout-regression-card\""));

            String persistedCatalog = Files.readString(catalogFile, StandardCharsets.UTF_8);
            assertTrue(persistedCatalog.contains("\"Checkout smoke / audited\""));
            assertTrue(persistedCatalog.contains("\"audit-ready\""));
            assertTrue(persistedCatalog.contains("\"checkout-regression-card\""));
            assertTrue(persistedCatalog.contains("\"2026-04-18T11:00:00Z\""));
            assertTrue(persistedCatalog.contains("\"dsl\""));
            assertTrue(persistedCatalog.contains("\"sourceDocumentId\""));
            assertTrue(persistedCatalog.contains("\"generationMeta\""));
            assertTrue(persistedCatalog.contains("\"agent.generate-case\""));

            assertEquals(200, admin.statusCode());
            assertTrue(admin.body().contains("\"Checkout smoke / audited\""));
            assertTrue(admin.body().contains("\"checkout-regression-card\""));
            assertTrue(admin.body().contains("\"audit-ready\""));
        }
    }

    @Test
    void rejectsAbortOnTerminalRunAndPauseOnPausedRun(@TempDir Path tempDir) throws Exception {
        Path runsDir = tempDir.resolve("runs");
        Files.createDirectories(runsDir);
        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Path queueFile = tempDir.resolve("execution-queue.json");
        Path catalogFile = tempDir.resolve("project-catalog.json");
        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Path modelConfigFile = tempDir.resolve("model-config.json");
        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Files.writeString(queueFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(catalogFile, Jsons.writeValueAsString(Map.of("projects", List.of(), "cases", List.of())), StandardCharsets.UTF_8);
        Files.writeString(executionHistoryFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(modelConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(environmentConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);

        // Create a run that has already succeeded
        Files.writeString(schedulerRequestsFile, Jsons.writeValueAsString(Map.of(
                "requests", List.of(Map.of(
                        "runId", "finished-run",
                        "projectKey", "test-project",
                        "owner", "qa",
                        "environment", "staging",
                        "status", "QUEUED")))), StandardCharsets.UTF_8);
        Files.writeString(schedulerEventsFile, Jsons.writeValueAsString(Map.of(
                "events", List.of(
                        Map.of("runId", "finished-run", "type", "STARTED", "status", "RUNNING",
                                "at", "2026-04-18T10:00:00Z", "detail", "Started"),
                        Map.of("runId", "finished-run", "type", "COMPLETED", "status", "OK",
                                "at", "2026-04-18T10:05:00Z", "detail", "All passed")))), StandardCharsets.UTF_8);

        Clock clock = Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC);
        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(runsDir, schedulerRequestsFile, schedulerEventsFile, schedulerStateFile,
                        queueFile, catalogFile, executionHistoryFile, modelConfigFile, environmentConfigFile, clock),
                new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock),
                new ConfigPersistenceService(modelConfigFile, environmentConfigFile),
                new CatalogPersistenceService(catalogFile, clock),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile,
                        new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock), clock),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(tempDir.resolve("data-templates.json"), clock))) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            for (String terminalStatus : List.of("OK", "SUCCESS", "FAILED", "ERROR")) {
                Files.writeString(schedulerEventsFile, Jsons.writeValueAsString(Map.of(
                        "events", List.of(
                                Map.of("runId", "finished-run", "type", "STARTED", "status", "RUNNING",
                                        "at", "2026-04-18T10:00:00Z", "detail", "Started"),
                                Map.of("runId", "finished-run", "type", "COMPLETED", "status", terminalStatus,
                                        "at", "2026-04-18T10:05:00Z", "detail", "Terminal")))), StandardCharsets.UTF_8);

                HttpResponse<String> abortOnTerminal = client.send(
                        request(server, "/api/phase3/runs/finished-run/abort", "POST", "{}"),
                        HttpResponse.BodyHandlers.ofString());
                assertEquals(409, abortOnTerminal.statusCode());
                assertTrue(abortOnTerminal.body().contains("\"REJECTED\""));
                assertTrue(abortOnTerminal.body().contains("terminal state"));

                String terminalEventsAfterAbort = Files.readString(schedulerEventsFile, StandardCharsets.UTF_8);
                assertTrue(!terminalEventsAfterAbort.contains("\"ABORTED\""));
            }

            // Pause on terminal run (OK) should also be rejected with 409
            Files.writeString(schedulerEventsFile, Jsons.writeValueAsString(Map.of(
                    "events", List.of(
                            Map.of("runId", "finished-run", "type", "STARTED", "status", "RUNNING",
                                    "at", "2026-04-18T10:00:00Z", "detail", "Started"),
                            Map.of("runId", "finished-run", "type", "COMPLETED", "status", "OK",
                                    "at", "2026-04-18T10:05:00Z", "detail", "All passed")))), StandardCharsets.UTF_8);
            HttpResponse<String> pauseOnOk = client.send(
                    request(server, "/api/phase3/runs/finished-run/pause", "POST", "{}"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(409, pauseOnOk.statusCode());
            assertTrue(pauseOnOk.body().contains("\"REJECTED\""));

            // Verify no ABORTED event was written
            String eventsAfter = Files.readString(schedulerEventsFile, StandardCharsets.UTF_8);
            assertTrue(!eventsAfter.contains("\"ABORTED\""));

            // Now test pause on a running run — should succeed with 202
            Files.writeString(schedulerRequestsFile, Jsons.writeValueAsString(Map.of(
                    "requests", List.of(Map.of(
                            "runId", "running-run",
                            "projectKey", "test-project",
                            "owner", "qa",
                            "environment", "staging",
                            "status", "QUEUED")))), StandardCharsets.UTF_8);
            Files.writeString(schedulerEventsFile, Jsons.writeValueAsString(Map.of(
                    "events", List.of(
                            Map.of("runId", "running-run", "type", "STARTED", "status", "RUNNING",
                                    "at", "2026-04-18T10:00:00Z", "detail", "Started")))), StandardCharsets.UTF_8);

            // Pause on running run should succeed
            HttpResponse<String> pauseOnRunning = client.send(
                    request(server, "/api/phase3/runs/running-run/pause", "POST", "{}"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, pauseOnRunning.statusCode());
            assertTrue(pauseOnRunning.body().contains("\"ACCEPTED\""));

            // Pause again on now-paused run should be rejected with 409
            HttpResponse<String> pauseAgain = client.send(
                    request(server, "/api/phase3/runs/running-run/pause", "POST", "{}"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(409, pauseAgain.statusCode());
            assertTrue(pauseAgain.body().contains("\"ALREADY_PAUSED\""));
        }
    }

    @Test
    void reportArtifactEndpointsReadRealRunFiles(@TempDir Path tempDir) throws Exception {
        Path runsDir = tempDir.resolve("runs");
        Path runDir = runsDir.resolve("order-smoke-20260425");
        Files.createDirectories(runDir);
        Map<String, Object> reportPayload = new java.util.HashMap<>();
        reportPayload.put("runId", "order-smoke-20260425");
        reportPayload.put("runName", "order-smoke-20260425");
        reportPayload.put("startedAt", "2026-04-25T08:00:00Z");
        reportPayload.put("finishedAt", "2026-04-25T08:05:00Z");
        reportPayload.put("projectKey", "checkout-web");
        reportPayload.put("projectName", "Checkout Web");
        reportPayload.put("caseId", "checkout-smoke");
        reportPayload.put("caseName", "Checkout smoke");
        reportPayload.put("environment", "staging-edge");
        reportPayload.put("model", "claude-4.5-sonnet");
        reportPayload.put("operator", "qa-platform");
        reportPayload.put("outputDir", "/output/order-smoke-20260425");
        reportPayload.put("summary", Map.of(
                "total", 5,
                "passed", 4,
                "failed", 1,
                "skipped", 0,
                "durationMs", 300_000));
        reportPayload.put("steps", List.of(
                Map.of("stepName", "Navigate to cart", "action", "GOTO", "status", "SUCCESS"),
                Map.of("stepName", "Assert title matches", "action", "ASSERT_TEXT", "status", "SUCCESS", "message", "OK"),
                Map.of("stepName", "Assert price visible", "action", "ASSERT_VISIBLE", "status", "FAILURE", "message", "Element not found"),
                Map.of("stepName", "Click checkout", "action", "CLICK", "status", "SUCCESS", "artifactPath", "checkout.png")));
        Files.writeString(runDir.resolve("report.json"), Jsons.writeValueAsString(reportPayload), StandardCharsets.UTF_8);
        Files.writeString(runDir.resolve("report.html"), "<html>report</html>", StandardCharsets.UTF_8);
        Files.writeString(runDir.resolve("screenshot.png"), "fake-png", StandardCharsets.UTF_8);

        // minimal scaffolding for server construction
        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Path queueFile = tempDir.resolve("execution-queue.json");
        Path catalogFile = tempDir.resolve("project-catalog.json");
        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Path modelConfigFile = tempDir.resolve("model-config.json");
        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Files.writeString(queueFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(catalogFile, Jsons.writeValueAsString(Map.of("projects", List.of(), "cases", List.of())), StandardCharsets.UTF_8);
        Files.writeString(executionHistoryFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(modelConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(environmentConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);

        Clock clock = Clock.fixed(Instant.parse("2026-04-25T09:00:00Z"), ZoneOffset.UTC);
        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(runsDir, schedulerRequestsFile, schedulerEventsFile, schedulerStateFile,
                        queueFile, catalogFile, executionHistoryFile, modelConfigFile, environmentConfigFile, clock),
                new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock),
                new ConfigPersistenceService(modelConfigFile, environmentConfigFile),
                new CatalogPersistenceService(catalogFile, clock),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile,
                        new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock), clock),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(tempDir.resolve("data-templates.json"), clock))) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            // GET /api/phase3/runs/ — list runs
            HttpResponse<String> listRuns = client.send(
                    request(server, "/api/phase3/runs/"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, listRuns.statusCode());
            assertTrue(listRuns.body().contains("\"order-smoke-20260425\""));
            assertTrue(listRuns.body().contains("\"items\""));
            assertTrue(listRuns.body().contains("\"FAILED\""));
            assertTrue(listRuns.body().contains("\"projectKey\":\"checkout-web\""));

            // GET /api/phase3/runs/order-smoke-20260425/report-summary — canonical summary
            HttpResponse<String> reportSummary = client.send(
                    request(server, "/api/phase3/runs/order-smoke-20260425/report-summary"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, reportSummary.statusCode());
            assertTrue(reportSummary.body().contains("\"runId\":\"order-smoke-20260425\""));
            assertTrue(reportSummary.body().contains("\"caseId\":\"checkout-smoke\""));
            assertTrue(reportSummary.body().contains("\"environment\":\"staging-edge\""));

            // GET /api/phase3/runs/order-smoke-20260425/report — full report
            HttpResponse<String> report = client.send(
                    request(server, "/api/phase3/runs/order-smoke-20260425/report"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, report.statusCode());
            assertTrue(report.body().contains("\"order-smoke-20260425\""));
            assertTrue(report.body().contains("\"steps\""));
            assertTrue(report.body().contains("\"assertions\""));
            assertTrue(report.body().contains("\"artifacts\""));
            assertTrue(report.body().contains("\"ASSERT_TEXT\""));
            assertTrue(report.body().contains("\"stepsTotal\""));

            // GET /api/phase3/runs/order-smoke-20260425/data-diff — data diff (mock fallback)
            HttpResponse<String> dataDiff = client.send(
                    request(server, "/api/phase3/runs/order-smoke-20260425/data-diff"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, dataDiff.statusCode());
            assertTrue(dataDiff.body().contains("\"order-smoke-20260425\""));
            assertTrue(dataDiff.body().contains("\"rows\""));
            assertTrue(dataDiff.body().contains("\"summary\""));
            assertTrue(dataDiff.body().contains("\"database\""));
            assertTrue(dataDiff.body().contains("\"caseName\":\"Checkout smoke\""));

            // GET /api/phase3/runs/order-smoke-20260425/assertions — assertions
            HttpResponse<String> assertions = client.send(
                    request(server, "/api/phase3/runs/order-smoke-20260425/assertions"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, assertions.statusCode());
            assertTrue(assertions.body().contains("\"order-smoke-20260425\""));
            assertTrue(assertions.body().contains("\"ASSERT_TEXT\""));
            assertTrue(assertions.body().contains("\"ASSERT_VISIBLE\""));
            assertTrue(assertions.body().contains("\"items\""));

            // GET /api/phase3/runs/order-smoke-20260425/artifacts — artifacts
            HttpResponse<String> artifacts = client.send(
                    request(server, "/api/phase3/runs/order-smoke-20260425/artifacts"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, artifacts.statusCode());
            assertTrue(artifacts.body().contains("\"order-smoke-20260425\""));
            assertTrue(artifacts.body().contains("\"report-json\""));
            assertTrue(artifacts.body().contains("\"report-html\""));
            assertTrue(artifacts.body().contains("\"screenshot\""));

            // GET /api/phase3/runs/order-smoke-20260425/recovery — recovery (mock fallback)
            HttpResponse<String> recovery = client.send(
                    request(server, "/api/phase3/runs/order-smoke-20260425/recovery"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, recovery.statusCode());
            assertTrue(recovery.body().contains("\"order-smoke-20260425\""));
            assertTrue(recovery.body().contains("\"PARTIAL\""));
            assertTrue(recovery.body().contains("\"restore snapshot\""));
            assertTrue(recovery.body().contains("\"items\""));

            // GET /api/phase3/runs/order-smoke-20260425/ai-decisions — ai decisions (mock fallback)
            HttpResponse<String> aiDecisions = client.send(
                    request(server, "/api/phase3/runs/order-smoke-20260425/ai-decisions"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, aiDecisions.statusCode());
            assertTrue(aiDecisions.body().contains("\"order-smoke-20260425\""));
            assertTrue(aiDecisions.body().contains("\"LOCATOR_HEAL\""));
            assertTrue(aiDecisions.body().contains("\"items\""));
            assertTrue(aiDecisions.body().contains("\"claude-4.5-sonnet\""));

            // GET /api/phase3/runs/order-smoke-20260425/data-diff/raw — raw diff
            HttpResponse<String> rawDiff = client.send(
                    request(server, "/api/phase3/runs/order-smoke-20260425/data-diff/raw"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, rawDiff.statusCode());
            assertTrue(rawDiff.body().contains("\"order-smoke-20260425\""));
            assertTrue(rawDiff.body().contains("\"before\""));
            assertTrue(rawDiff.body().contains("\"after\""));
            assertTrue(rawDiff.body().contains("\"afterRestore\""));

            // GET /api/phase3/runs/order-smoke-20260425/restore-result — restore result
            HttpResponse<String> restoreResult = client.send(
                    request(server, "/api/phase3/runs/order-smoke-20260425/restore-result"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, restoreResult.statusCode());
            assertTrue(restoreResult.body().contains("\"order-smoke-20260425\""));
            assertTrue(restoreResult.body().contains("\"PARTIAL\""));
            assertTrue(restoreResult.body().contains("\"restore snapshot\""));

            // POST /api/phase3/runs/order-smoke-20260425/restore/retry — restore retry accepted
            HttpResponse<String> restoreRetry = client.send(
                    request(server, "/api/phase3/runs/order-smoke-20260425/restore/retry", "POST",
                            "{\"operator\":\"qa-test\",\"reason\":\"unit test retry\"}"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, restoreRetry.statusCode());
            assertTrue(restoreRetry.body().contains("\"ACCEPTED\""));
            assertTrue(restoreRetry.body().contains("\"restore-retry\""));
            assertTrue(restoreRetry.body().contains("qa-test"));

            // GET /api/phase3/runs/nonexistent-run/report — fallback report
            HttpResponse<String> fallback = client.send(
                    request(server, "/api/phase3/runs/nonexistent-run/report"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, fallback.statusCode());
            assertTrue(fallback.body().contains("\"UNKNOWN\""));
            assertTrue(fallback.body().contains("\"nonexistent-run\""));
        }
    }

    @Test
    void connectionValidationEndpointsReturnStructuredResults(@TempDir Path tempDir) throws Exception {
        Path runsDir = tempDir.resolve("runs");
        Files.createDirectories(runsDir);
        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Path queueFile = tempDir.resolve("execution-queue.json");
        Path catalogFile = tempDir.resolve("project-catalog.json");
        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Path modelConfigFile = tempDir.resolve("model-config.json");
        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Files.writeString(queueFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(catalogFile, Jsons.writeValueAsString(Map.of("projects", List.of(), "cases", List.of())), StandardCharsets.UTF_8);
        Files.writeString(executionHistoryFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(modelConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(environmentConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);

        Clock clock = Clock.fixed(Instant.parse("2026-04-25T09:00:00Z"), ZoneOffset.UTC);
        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(runsDir, schedulerRequestsFile, schedulerEventsFile, schedulerStateFile,
                        queueFile, catalogFile, executionHistoryFile, modelConfigFile, environmentConfigFile, clock),
                new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock),
                new ConfigPersistenceService(modelConfigFile, environmentConfigFile),
                new CatalogPersistenceService(catalogFile, clock),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile,
                        new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock), clock),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(tempDir.resolve("data-templates.json"), clock))) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            HttpResponse<String> modelPassed = client.send(
                    request(server, "/api/phase3/config/model/test-connection", "POST", Jsons.writeValueAsString(Map.of(
                            "name", "OpenAI",
                            "model", "gpt-4.1-mini",
                            "endpoint", "https://api.openai.com/v1",
                            "apiKey", "sk-live-demo-key",
                            "timeoutMs", "45000",
                            "role", "primary",
                            "status", "active"))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, modelPassed.statusCode());
            assertTrue(modelPassed.body().contains("\"status\":\"PASSED\""));
            assertTrue(modelPassed.body().contains("\"resolvedModel\":\"gpt-4.1-mini\""));
            assertTrue(modelPassed.body().contains("\"checks\""));
            assertTrue(modelPassed.body().contains("\"latencyMs\""));

            HttpResponse<String> modelFailed = client.send(
                    request(server, "/api/phase3/config/model/test-connection", "POST", Jsons.writeValueAsString(Map.of(
                            "name", "OpenAI",
                            "model", "bad model",
                            "endpoint", "not-a-url",
                            "apiKey", "******",
                            "timeoutMs", "10",
                            "role", "primary",
                            "status", "disabled"))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, modelFailed.statusCode());
            assertTrue(modelFailed.body().contains("\"status\":\"FAILED\""));
            assertTrue(modelFailed.body().contains("\"api-key\""));
            assertTrue(modelFailed.body().contains("API key looks like a placeholder value."));
            assertTrue(modelFailed.body().contains("\"provider-lifecycle\""));

            HttpResponse<String> datasourcePassed = client.send(
                    request(server, "/api/phase3/datasources/test-connection", "POST", Jsons.writeValueAsString(Map.of(
                            "type", "PostgreSQL",
                            "driver", "org.postgresql.Driver",
                            "url", "jdbc:postgresql://db.internal:5432/checkout",
                            "schema", "checkout_app",
                            "username", "qa_reader",
                            "password", "real-pass-123",
                            "mybatisEnv", "qa-postgres"))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, datasourcePassed.statusCode());
            assertTrue(datasourcePassed.body().contains("\"status\":\"PASSED\""));
            assertTrue(datasourcePassed.body().contains("\"resolvedDriver\":\"org.postgresql.Driver\""));
            assertTrue(datasourcePassed.body().contains("\"jdbc-url-shape\""));

            HttpResponse<String> datasourceFailed = client.send(
                    request(server, "/api/phase3/datasources/test-connection", "POST", Jsons.writeValueAsString(Map.of(
                            "type", "PostgreSQL",
                            "driver", "com.mysql.cj.jdbc.Driver",
                            "url", "jdbc:mysql://db.internal:3306/member_center",
                            "schema", "bad schema",
                            "username", "qa_reader",
                            "password", "******",
                            "mybatisEnv", "qa-mysql"))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, datasourceFailed.statusCode());
            assertTrue(datasourceFailed.body().contains("\"status\":\"FAILED\""));
            assertTrue(datasourceFailed.body().contains("\"driver-type-match\""));
            assertTrue(datasourceFailed.body().contains("\"jdbc-url-shape\""));
            assertTrue(datasourceFailed.body().contains("\"mybatis-type-hint\""));
        }
    }

    @Test
    void projectImportPreviewAndCommitEndpoints(@TempDir Path tempDir) throws Exception {
        Path runsDir = tempDir.resolve("runs");
        Files.createDirectories(runsDir);
        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Path queueFile = tempDir.resolve("execution-queue.json");
        Path catalogFile = tempDir.resolve("project-catalog.json");
        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Path modelConfigFile = tempDir.resolve("model-config.json");
        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Files.writeString(queueFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(catalogFile, Jsons.writeValueAsString(Map.of(
                "projects", List.of(Map.of(
                        "key", "checkout-web",
                        "name", "checkout-web",
                        "scope", "Payment journey",
                        "environments", List.of("prod-like"),
                        "note", "baseline")),
                "cases", List.of())), StandardCharsets.UTF_8);
        Files.writeString(executionHistoryFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(modelConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(environmentConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);

        Clock clock = Clock.fixed(Instant.parse("2026-04-25T09:00:00Z"), ZoneOffset.UTC);
        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(runsDir, schedulerRequestsFile, schedulerEventsFile, schedulerStateFile,
                        queueFile, catalogFile, executionHistoryFile, modelConfigFile, environmentConfigFile, clock),
                new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock),
                new ConfigPersistenceService(modelConfigFile, environmentConfigFile),
                new CatalogPersistenceService(catalogFile, clock),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile,
                        new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock), clock),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(tempDir.resolve("data-templates.json"), clock))) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            HttpResponse<String> preview = client.send(
                    request(
                            server,
                            "/api/phase3/catalog/project/import/preview",
                            "POST",
                            Jsons.writeValueAsString(Map.of(
                                    "mode", "merge",
                                    "rows", List.of(
                                            Map.of(
                                                    "key", "checkout-web",
                                                    "name", "checkout-web",
                                                    "scope", "Payment journey / imported",
                                                    "environments", List.of("prod-like", "staging-edge"),
                                                    "note", "updated"),
                                            Map.of(
                                                    "key", "ops-console",
                                                    "name", "ops-console",
                                                    "scope", "Operations",
                                                    "environments", List.of("staging"),
                                                    "note", "created"),
                                            Map.of(
                                                    "key", "ops-console",
                                                    "name", "ops-console duplicate",
                                                    "scope", "Duplicate",
                                                    "environments", List.of("staging")))))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, preview.statusCode());
            assertTrue(preview.body().contains("\"PREVIEW_READY\""));
            assertTrue(preview.body().contains("\"createCount\":1"));
            assertTrue(preview.body().contains("\"updateCount\":1"));
            assertTrue(preview.body().contains("\"conflictCount\":1"));
            assertTrue(preview.body().contains("\"Duplicate key in import payload\""));

            HttpResponse<String> commit = client.send(
                    request(
                            server,
                            "/api/phase3/catalog/project/import/commit",
                            "POST",
                            Jsons.writeValueAsString(Map.of(
                                    "mode", "merge",
                                    "rows", List.of(
                                            Map.of(
                                                    "key", "checkout-web",
                                                    "name", "checkout-web",
                                                    "scope", "Payment journey / imported",
                                                    "environments", List.of("prod-like", "staging-edge"),
                                                    "note", "updated"),
                                            Map.of(
                                                    "key", "ops-console",
                                                    "name", "ops-console",
                                                    "scope", "Operations",
                                                    "environments", List.of("staging"),
                                                    "note", "created"))))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, commit.statusCode());
            assertTrue(commit.body().contains("\"ACCEPTED\""));
            assertTrue(commit.body().contains("\"created\":1"));
            assertTrue(commit.body().contains("\"updated\":1"));

            String catalog = Files.readString(catalogFile, StandardCharsets.UTF_8);
            assertTrue(catalog.contains("\"checkout-web\""));
            assertTrue(catalog.contains("\"Payment journey / imported\""));
            assertTrue(catalog.contains("\"ops-console\""));
        }
    }

    @Test
    void dataTemplateCrudAndDryRunEndpoints(@TempDir Path tempDir) throws Exception {
        Path runsDir = tempDir.resolve("runs");
        Files.createDirectories(runsDir);
        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Path queueFile = tempDir.resolve("execution-queue.json");
        Path catalogFile = tempDir.resolve("project-catalog.json");
        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Path modelConfigFile = tempDir.resolve("model-config.json");
        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Path dataTemplateFile = tempDir.resolve("data-templates.json");
        Files.writeString(queueFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(catalogFile, Jsons.writeValueAsString(Map.of("projects", List.of(), "cases", List.of())), StandardCharsets.UTF_8);
        Files.writeString(executionHistoryFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(modelConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(environmentConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);

        Clock clock = Clock.fixed(Instant.parse("2026-04-25T09:00:00Z"), ZoneOffset.UTC);
        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(runsDir, schedulerRequestsFile, schedulerEventsFile, schedulerStateFile,
                        queueFile, catalogFile, executionHistoryFile, modelConfigFile, environmentConfigFile, clock),
                new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock),
                new ConfigPersistenceService(modelConfigFile, environmentConfigFile),
                new CatalogPersistenceService(catalogFile, clock),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile,
                        new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock), clock),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(dataTemplateFile, clock))) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            // 1. List — empty initially
            HttpResponse<String> emptyList = client.send(
                    request(server, "/api/phase3/data-templates"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, emptyList.statusCode());
            assertTrue(emptyList.body().contains("\"items\""));

            // 2. Create a template via POST
            HttpResponse<String> create = client.send(
                    request(server, "/api/phase3/data-templates", "POST", Jsons.writeValueAsString(Map.of(
                            "name", "order.seed.v2",
                            "type", "composite",
                            "envAllowed", "dev, staging",
                            "risk", "medium",
                            "rollback", "sql",
                            "projectKey", "checkout-web",
                            "steps", List.of("INSERT orders", "INSERT order_items"),
                            "guards", List.of("prod environment blocked"),
                            "params", List.of(Map.of("key", "user_id", "type", "uuid", "required", true)),
                            "compareSummary", "Compare order deltas."))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, create.statusCode());
            assertTrue(create.body().contains("\"ACCEPTED\""));
            assertTrue(create.body().contains("\"order-seed-v2\""));

            // 3. List — now has one item
            HttpResponse<String> oneItemList = client.send(
                    request(server, "/api/phase3/data-templates"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, oneItemList.statusCode());
            assertTrue(oneItemList.body().contains("\"order.seed.v2\""));
            assertTrue(oneItemList.body().contains("\"composite\""));

            // 4. Get single template
            HttpResponse<String> getOne = client.send(
                    request(server, "/api/phase3/data-templates/order-seed-v2"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, getOne.statusCode());
            assertTrue(getOne.body().contains("\"order-seed-v2\""));
            assertTrue(getOne.body().contains("\"INSERT orders\""));

            // 5. Update via PUT
            HttpResponse<String> update = client.send(
                    request(server, "/api/phase3/data-templates/order-seed-v2", "PUT", Jsons.writeValueAsString(Map.of(
                            "name", "order.seed.v2",
                            "type", "composite",
                            "envAllowed", "dev, staging, uat",
                            "risk", "high",
                            "rollback", "sql",
                            "projectKey", "checkout-web",
                            "steps", List.of("INSERT orders", "INSERT order_items", "UPDATE stock"),
                            "guards", List.of("prod environment blocked", "snapshot required"),
                            "params", List.of(Map.of("key", "user_id", "type", "uuid", "required", true)),
                            "compareSummary", "Compare order and stock deltas."))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, update.statusCode());
            assertTrue(update.body().contains("\"updated\":true"));

            // 6. Verify update persisted
            HttpResponse<String> afterUpdate = client.send(
                    request(server, "/api/phase3/data-templates/order-seed-v2"),
                    HttpResponse.BodyHandlers.ofString());
            assertTrue(afterUpdate.body().contains("\"high\""));
            assertTrue(afterUpdate.body().contains("\"UPDATE stock\""));

            // 7. Dry-run
            HttpResponse<String> dryRun = client.send(
                    request(server, "/api/phase3/data-templates/order-seed-v2/dry-run", "POST", Jsons.writeValueAsString(Map.of(
                            "environment", "staging",
                            "params", Map.of("user_id", "test-uuid")))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, dryRun.statusCode());
            assertTrue(dryRun.body().contains("\"PASSED\""));
            assertTrue(dryRun.body().contains("\"environment-whitelist\""));
            assertTrue(dryRun.body().contains("\"rollback-strategy\""));

            // 8. Import preview
            HttpResponse<String> importPreview = client.send(
                    request(server, "/api/phase3/data-templates/import/preview", "POST", Jsons.writeValueAsString(Map.of(
                            "sourceType", "json",
                            "payload", Map.of("items", List.of(
                                    Map.of("name", "coupon.single_use", "type", "sql", "projectKey", "checkout-web"),
                                    Map.of("name", "audit.clear", "type", "sql")))))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, importPreview.statusCode());
            assertTrue(importPreview.body().contains("\"PREVIEW_READY\""));
            assertTrue(importPreview.body().contains("\"coupon.single_use\""));

            // 9. Import commit
            HttpResponse<String> importCommit = client.send(
                    request(server, "/api/phase3/data-templates/import/commit", "POST", Jsons.writeValueAsString(Map.of(
                            "items", List.of(
                                    Map.of("name", "coupon.single_use", "type", "sql", "projectKey", "checkout-web",
                                            "envAllowed", "dev", "risk", "low", "rollback", "snapshot"),
                                    Map.of("name", "audit.clear", "type", "sql", "projectKey", "ops-console",
                                            "envAllowed", "dev", "risk", "high", "rollback", "snapshot"))))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, importCommit.statusCode());
            assertTrue(importCommit.body().contains("\"ACCEPTED\""));
            assertTrue(importCommit.body().contains("\"created\":2"));

            // 10. List now has 3 items
            HttpResponse<String> threeItemList = client.send(
                    request(server, "/api/phase3/data-templates"),
                    HttpResponse.BodyHandlers.ofString());
            assertTrue(threeItemList.body().contains("\"order.seed.v2\""));
            assertTrue(threeItemList.body().contains("\"coupon.single_use\""));
            assertTrue(threeItemList.body().contains("\"audit.clear\""));

            // 11. Delete
            HttpResponse<String> delete = client.send(
                    request(server, "/api/phase3/data-templates/coupon-single_use", "DELETE", null),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, delete.statusCode());
            assertTrue(delete.body().contains("\"ACCEPTED\""));
            assertTrue(delete.body().contains("\"remaining\":2"));

            // 12. Verify deleted
            HttpResponse<String> afterDelete = client.send(
                    request(server, "/api/phase3/data-templates"),
                    HttpResponse.BodyHandlers.ofString());
            assertTrue(!afterDelete.body().contains("\"coupon.single_use\""));
            assertTrue(afterDelete.body().contains("\"order.seed.v2\""));
            assertTrue(afterDelete.body().contains("\"audit.clear\""));

            // 13. Get nonexistent template
            HttpResponse<String> notFound = client.send(
                    request(server, "/api/phase3/data-templates/nonexistent"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, notFound.statusCode());
            assertTrue(notFound.body().contains("\"NOT_FOUND\""));
        }
    }

    @Test
    void caseDetailEndpoints(@TempDir Path tempDir) throws Exception {
        Clock clock = Clock.fixed(Instant.parse("2026-04-25T08:00:00Z"), ZoneOffset.UTC);
        Path runsDir = tempDir.resolve("runs");
        Files.createDirectories(runsDir);
        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Path queueFile = tempDir.resolve("execution-queue.json");
        Path catalogFile = tempDir.resolve("project-catalog.json");
        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Path modelConfigFile = tempDir.resolve("model-config.json");
        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Path dataTemplateFile = tempDir.resolve("data-templates.json");
        Path caseDetailRoot = tempDir.resolve("case-details");

        Files.writeString(schedulerStateFile, "{}", StandardCharsets.UTF_8);
        Files.writeString(queueFile, "{\"items\":[]}", StandardCharsets.UTF_8);
        Files.writeString(catalogFile, "{\"projects\":[],\"cases\":[]}", StandardCharsets.UTF_8);

        CaseDetailService caseDetailService = new CaseDetailService(caseDetailRoot, clock);

        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(
                        runsDir, schedulerRequestsFile, schedulerEventsFile,
                        schedulerStateFile, queueFile, catalogFile,
                        executionHistoryFile, modelConfigFile, environmentConfigFile, clock),
                new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock),
                new ConfigPersistenceService(modelConfigFile, environmentConfigFile),
                new CatalogPersistenceService(catalogFile, clock),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile,
                        new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock), clock),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(dataTemplateFile, clock),
                new ConnectionValidationService(),
                caseDetailService)) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            // 1. GET DSL — returns default
            HttpResponse<String> dslGet = client.send(
                    request(server, "/api/phase3/cases/checkout-smoke/dsl"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, dslGet.statusCode());
            assertTrue(dslGet.body().contains("\"caseId\":\"checkout-smoke\""));
            assertTrue(dslGet.body().contains("\"dslVersion\":1"));
            assertTrue(dslGet.body().contains("\"definition\""));

            // 2. Validate DSL — valid
            HttpResponse<String> validateOk = client.send(
                    request(server, "/api/phase3/cases/checkout-smoke/dsl/validate", "POST",
                            Jsons.writeValueAsString(Map.of("definition",
                                    Map.of("id", "checkout-smoke", "steps", List.of(Map.of("action", "goto")))))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, validateOk.statusCode());
            assertTrue(validateOk.body().contains("\"VALID\""));

            // 3. Validate DSL — invalid (missing definition)
            HttpResponse<String> validateBad = client.send(
                    request(server, "/api/phase3/cases/checkout-smoke/dsl/validate", "POST",
                            Jsons.writeValueAsString(Map.of("other", "value"))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, validateBad.statusCode());
            assertTrue(validateBad.body().contains("\"INVALID\""));
            assertTrue(validateBad.body().contains("definition is required"));

            // 4. PUT DSL — save
            HttpResponse<String> dslSave = client.send(
                    request(server, "/api/phase3/cases/checkout-smoke/dsl", "PUT",
                            Jsons.writeValueAsString(Map.of(
                                    "definition", Map.of("id", "checkout-smoke", "steps", List.of(Map.of("action", "click"))),
                                    "projectKey", "checkout-web",
                                    "updatedBy", "tester"))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, dslSave.statusCode());
            assertTrue(dslSave.body().contains("\"ACCEPTED\""));
            assertTrue(dslSave.body().contains("\"dslVersion\":1"));

            // 5. PUT DSL again — version increments
            HttpResponse<String> dslSave2 = client.send(
                    request(server, "/api/phase3/cases/checkout-smoke/dsl", "PUT",
                            Jsons.writeValueAsString(Map.of(
                                    "definition", Map.of("id", "checkout-smoke", "steps", List.of(Map.of("action", "fill"))),
                                    "projectKey", "checkout-web"))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, dslSave2.statusCode());
            assertTrue(dslSave2.body().contains("\"dslVersion\":2"));

            // 6. GET DSL — reflects saved version
            HttpResponse<String> dslAfterSave = client.send(
                    request(server, "/api/phase3/cases/checkout-smoke/dsl"),
                    HttpResponse.BodyHandlers.ofString());
            assertTrue(dslAfterSave.body().contains("\"dslVersion\":2"));
            assertTrue(dslAfterSave.body().contains("\"fill\""));

            // 7. GET state-machine — returns default
            HttpResponse<String> smGet = client.send(
                    request(server, "/api/phase3/cases/checkout-smoke/state-machine"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, smGet.statusCode());
            assertTrue(smGet.body().contains("\"nodes\""));
            assertTrue(smGet.body().contains("\"edges\""));

            // 8. PUT state-machine — save
            HttpResponse<String> smSave = client.send(
                    request(server, "/api/phase3/cases/checkout-smoke/state-machine", "PUT",
                            Jsons.writeValueAsString(Map.of(
                                    "projectKey", "checkout-web",
                                    "nodes", List.of(Map.of("id", "start", "label", "Start")),
                                    "edges", List.of(),
                                    "guards", List.of()))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, smSave.statusCode());
            assertTrue(smSave.body().contains("\"ACCEPTED\""));

            // 9. GET plans — returns default
            HttpResponse<String> plans = client.send(
                    request(server, "/api/phase3/cases/checkout-smoke/plans"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, plans.statusCode());
            assertTrue(plans.body().contains("\"plans\""));
            assertTrue(plans.body().contains("\"preconditions\""));

            // 10. GET history — returns default
            HttpResponse<String> history = client.send(
                    request(server, "/api/phase3/cases/checkout-smoke/history"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, history.statusCode());
            assertTrue(history.body().contains("\"runs\""));
            assertTrue(history.body().contains("\"maintenanceEvents\""));
        }
    }

    @Test
    void documentServiceEndpoints(@TempDir Path tempDir) throws Exception {
        Clock clock = Clock.fixed(Instant.parse("2026-04-25T10:00:00Z"), ZoneOffset.UTC);
        Path runsDir = tempDir.resolve("runs");
        Files.createDirectories(runsDir);
        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Path queueFile = tempDir.resolve("execution-queue.json");
        Path catalogFile = tempDir.resolve("project-catalog.json");
        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Path modelConfigFile = tempDir.resolve("model-config.json");
        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Path dataTemplateFile = tempDir.resolve("data-templates.json");
        Path documentRoot = tempDir.resolve("documents");

        Files.writeString(schedulerStateFile, "{}", StandardCharsets.UTF_8);
        Files.writeString(queueFile, "{\"items\":[]}", StandardCharsets.UTF_8);
        Files.writeString(catalogFile, "{\"projects\":[],\"cases\":[]}", StandardCharsets.UTF_8);

        DocumentPersistenceService documentService = new DocumentPersistenceService(documentRoot, clock);

        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(
                        runsDir, schedulerRequestsFile, schedulerEventsFile,
                        schedulerStateFile, queueFile, catalogFile,
                        executionHistoryFile, modelConfigFile, environmentConfigFile, clock),
                new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock),
                new ConfigPersistenceService(modelConfigFile, environmentConfigFile),
                new CatalogPersistenceService(catalogFile, clock),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile,
                        new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock), clock),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(dataTemplateFile, clock),
                new ConnectionValidationService(),
                new CaseDetailService(tempDir.resolve("case-details"), clock),
                documentService)) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            // 1. Upload a document
            HttpResponse<String> upload = client.send(
                    request(server, "/api/phase3/documents/upload", "POST",
                            Jsons.writeValueAsString(Map.of(
                                    "projectKey", "checkout-web",
                                    "fileName", "checkout-regression-v3.md",
                                    "content", "# Checkout regression\n\n## Scope\nPayment journey"))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, upload.statusCode());
            assertTrue(upload.body().contains("\"ACCEPTED\""));
            assertTrue(upload.body().contains("checkout-regression-v3"));

            // 2. Get parse result for uploaded document
            String documentId = "checkout-web-checkout-regression-v3";
            HttpResponse<String> parseResult = client.send(
                    request(server, "/api/phase3/documents/" + documentId + "/parse-result"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, parseResult.statusCode());
            assertTrue(parseResult.body().contains("\"detectedCases\""));
            assertTrue(parseResult.body().contains("\"reasoning\""));

            // 3. Re-parse document
            HttpResponse<String> reparse = client.send(
                    request(server, "/api/phase3/documents/" + documentId + "/reparse", "POST",
                            Jsons.writeValueAsString(Map.of("operator", "tester", "reason", "requirements changed"))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, reparse.statusCode());
            assertTrue(reparse.body().contains("\"ACCEPTED\""));
            assertTrue(reparse.body().contains("\"document-reparse\""));

            // 4. Save parse result (manual edit)
            HttpResponse<String> saveParseResult = client.send(
                    request(server, "/api/phase3/documents/" + documentId + "/parse-result", "PUT",
                            Jsons.writeValueAsString(Map.of(
                                    "updatedBy", "tester",
                                    "changes", Map.of("detectedCases", List.of(
                                            Map.of("id", "checkout-custom", "name", "Custom case",
                                                    "category", "happy", "confidence", "high")))))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, saveParseResult.statusCode());
            assertTrue(saveParseResult.body().contains("\"ACCEPTED\""));
            assertTrue(saveParseResult.body().contains("\"document-parse-edit\""));

            // 5. Get parse result after manual edit
            HttpResponse<String> parseResultAfterEdit = client.send(
                    request(server, "/api/phase3/documents/" + documentId + "/parse-result"),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, parseResultAfterEdit.statusCode());
            assertTrue(parseResultAfterEdit.body().contains("\"checkout-custom\""));
            assertTrue(parseResultAfterEdit.body().contains("\"Custom case\""));

            // 6. Re-parse nonexistent document
            HttpResponse<String> reparseNotFound = client.send(
                    request(server, "/api/phase3/documents/nonexistent/reparse", "POST",
                            Jsons.writeValueAsString(Map.of("operator", "tester"))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(202, reparseNotFound.statusCode());
            assertTrue(reparseNotFound.body().contains("\"NOT_FOUND\""));

            // 7. Upload missing projectKey
            HttpResponse<String> uploadBad = client.send(
                    request(server, "/api/phase3/documents/upload", "POST",
                            Jsons.writeValueAsString(Map.of("fileName", "test.md"))),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(400, uploadBad.statusCode());
            assertTrue(uploadBad.body().contains("projectKey"));
        }
    }

    @Test
    void extensionQuickActionEndpoints(@TempDir Path tempDir) throws Exception {
        Path runsDir = tempDir.resolve("runs");
        Files.createDirectories(runsDir);
        Path schedulerRequestsFile = tempDir.resolve("scheduler-requests.json");
        Path schedulerEventsFile = tempDir.resolve("scheduler-events.json");
        Path schedulerStateFile = tempDir.resolve("scheduler-state.json");
        Path queueFile = tempDir.resolve("execution-queue.json");
        Path catalogFile = tempDir.resolve("project-catalog.json");
        Path executionHistoryFile = tempDir.resolve("execution-history.json");
        Path modelConfigFile = tempDir.resolve("model-config.json");
        Path environmentConfigFile = tempDir.resolve("environment-config.json");
        Files.writeString(queueFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(catalogFile, Jsons.writeValueAsString(Map.of("projects", List.of(), "cases", List.of())), StandardCharsets.UTF_8);
        Files.writeString(executionHistoryFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(modelConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);
        Files.writeString(environmentConfigFile, Jsons.writeValueAsString(Map.of("items", List.of())), StandardCharsets.UTF_8);

        Clock clock = Clock.fixed(Instant.parse("2026-04-18T11:00:00Z"), ZoneOffset.UTC);
        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", 0),
                new Phase3MockDataService(
                        runsDir,
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        schedulerStateFile,
                        queueFile,
                        catalogFile,
                        executionHistoryFile,
                        modelConfigFile,
                        environmentConfigFile,
                        clock),
                new SchedulerPersistenceService(
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        clock),
                new ConfigPersistenceService(
                        modelConfigFile,
                        environmentConfigFile),
                new CatalogPersistenceService(catalogFile, clock),
                new RunStatusService(schedulerRequestsFile, schedulerEventsFile, new SchedulerPersistenceService(schedulerRequestsFile, schedulerEventsFile, clock), clock),
                new AgentGenerateService(),
                new ReportArtifactService(runsDir),
                new DataTemplatePersistenceService(tempDir.resolve("data-templates.json"), clock))) {
            server.start();
            HttpClient client = HttpClient.newHttpClient();

            HttpResponse<String> pageSummary = client.send(
                    request(server, "/api/phase3/extension/page-summary", "POST", Jsons.writeValueAsString(Map.of(
                            "pageTitle", "Checkout - Payment",
                            "pageUrl", "https://checkout.example.test/pay",
                            "locator", "#pay-submit"))),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> executionHandoff = client.send(
                    request(server, "/api/phase3/extension/platform-handoff", "POST", Jsons.writeValueAsString(Map.of(
                            "target", "execution",
                            "runId", "popup-checkout-smoke",
                            "projectKey", "checkout-web",
                            "owner", "edge-popup",
                            "environment", "staging-edge",
                            "targetUrl", "https://checkout.example.test/pay"))),
                    HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> dslHandoff = client.send(
                    request(server, "/api/phase3/extension/platform-handoff", "POST", Jsons.writeValueAsString(Map.of(
                            "target", "aiGenerate",
                            "projectKey", "checkout-web",
                            "projectName", "checkout-web",
                            "pageTitle", "Checkout - Payment",
                            "pageUrl", "https://checkout.example.test/pay",
                            "locator", "#pay-submit"))),
                    HttpResponse.BodyHandlers.ofString());

            assertEquals(200, pageSummary.statusCode());
            assertTrue(pageSummary.body().contains("\"recommendedAction\""));
            assertTrue(pageSummary.body().contains("pay-submit"));

            assertEquals(200, executionHandoff.statusCode());
            assertTrue(executionHandoff.body().contains("\"screen\":\"execution\""));
            assertTrue(executionHandoff.body().contains("screen=execution"));
            assertTrue(executionHandoff.body().contains("runId=popup-checkout-smoke"));

            assertEquals(200, dslHandoff.statusCode());
            assertTrue(dslHandoff.body().contains("\"screen\":\"aiGenerate\""));
            assertTrue(dslHandoff.body().contains("screen=aiGenerate"));
            assertTrue(dslHandoff.body().contains("locator=%23pay-submit"));
        }
    }

    private static HttpRequest request(LocalAdminApiServer server, String path) {
        return request(server, path, "GET", null);
    }

    private static HttpRequest request(LocalAdminApiServer server, String path, String method, String body) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + server.port() + path));
        if (body == null) {
            builder.method(method, HttpRequest.BodyPublishers.noBody());
        } else {
            builder.header("Content-Type", "application/json");
            builder.method(method, HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        }
        return builder.build();
    }
}
