package com.example.webtest.admin;

import com.example.webtest.admin.service.AgentGenerateService;
import com.example.webtest.admin.service.CatalogPersistenceService;
import com.example.webtest.admin.service.DataTemplatePersistenceService;
import com.example.webtest.admin.http.LocalAdminApiServer;
import com.example.webtest.admin.service.ConfigPersistenceService;
import com.example.webtest.admin.service.Phase3MockDataService;
import com.example.webtest.admin.service.ReportArtifactService;
import com.example.webtest.admin.service.RunStatusService;
import com.example.webtest.admin.service.SchedulerPersistenceService;
import java.net.InetSocketAddress;
import java.nio.file.Path;
import java.time.Clock;
import java.util.concurrent.CountDownLatch;

public final class LocalAdminApiApp {
    private LocalAdminApiApp() {
    }

    public static void main(String[] args) throws Exception {
        int port = 8787;
        Path reportRoot = Path.of("runs");
        Path schedulerRequestsFile = Path.of("config", "phase3", "scheduler-requests.json");
        Path schedulerEventsFile = Path.of("config", "phase3", "scheduler-events.json");
        Path schedulerStateFile = Path.of("config", "phase3", "scheduler-state.json");
        Path queueFile = Path.of("config", "phase3", "execution-queue.json");
        Path catalogFile = Path.of("config", "phase3", "project-catalog.json");
        Path executionHistoryFile = Path.of("config", "phase3", "execution-history.json");
        Path modelConfigFile = Path.of("config", "phase3", "model-config.json");
        Path environmentConfigFile = Path.of("config", "phase3", "environment-config.json");
        Path dataTemplateFile = Path.of("config", "phase3", "data-templates.json");
        for (int index = 0; index < args.length; index++) {
            String arg = args[index];
            if ("--port".equals(arg)) {
                port = Integer.parseInt(args[++index]);
            } else if (arg.startsWith("--port=")) {
                port = Integer.parseInt(arg.substring("--port=".length()));
            } else if ("--scheduler-requests-file".equals(arg)) {
                schedulerRequestsFile = Path.of(args[++index]);
            } else if (arg.startsWith("--scheduler-requests-file=")) {
                schedulerRequestsFile = Path.of(arg.substring("--scheduler-requests-file=".length()));
            } else if ("--scheduler-events-file".equals(arg)) {
                schedulerEventsFile = Path.of(args[++index]);
            } else if (arg.startsWith("--scheduler-events-file=")) {
                schedulerEventsFile = Path.of(arg.substring("--scheduler-events-file=".length()));
            } else if ("--scheduler-state-file".equals(arg)) {
                schedulerStateFile = Path.of(args[++index]);
            } else if (arg.startsWith("--scheduler-state-file=")) {
                schedulerStateFile = Path.of(arg.substring("--scheduler-state-file=".length()));
            } else if ("--report-root".equals(arg)) {
                reportRoot = Path.of(args[++index]);
            } else if (arg.startsWith("--report-root=")) {
                reportRoot = Path.of(arg.substring("--report-root=".length()));
            } else if ("--queue-file".equals(arg)) {
                queueFile = Path.of(args[++index]);
            } else if (arg.startsWith("--queue-file=")) {
                queueFile = Path.of(arg.substring("--queue-file=".length()));
            } else if ("--catalog-file".equals(arg)) {
                catalogFile = Path.of(args[++index]);
            } else if (arg.startsWith("--catalog-file=")) {
                catalogFile = Path.of(arg.substring("--catalog-file=".length()));
            } else if ("--execution-history-file".equals(arg)) {
                executionHistoryFile = Path.of(args[++index]);
            } else if (arg.startsWith("--execution-history-file=")) {
                executionHistoryFile = Path.of(arg.substring("--execution-history-file=".length()));
            } else if ("--model-config-file".equals(arg)) {
                modelConfigFile = Path.of(args[++index]);
            } else if (arg.startsWith("--model-config-file=")) {
                modelConfigFile = Path.of(arg.substring("--model-config-file=".length()));
            } else if ("--environment-config-file".equals(arg)) {
                environmentConfigFile = Path.of(args[++index]);
            } else if (arg.startsWith("--environment-config-file=")) {
                environmentConfigFile = Path.of(arg.substring("--environment-config-file=".length()));
            } else if ("--data-template-file".equals(arg)) {
                dataTemplateFile = Path.of(args[++index]);
            } else if (arg.startsWith("--data-template-file=")) {
                dataTemplateFile = Path.of(arg.substring("--data-template-file=".length()));
            } else if ("--help".equals(arg) || "-h".equals(arg)) {
                System.out.println(
                        "Usage: local-admin-api [--port 8787] [--scheduler-requests-file config/phase3/scheduler-requests.json] [--scheduler-events-file config/phase3/scheduler-events.json] [--scheduler-state-file config/phase3/scheduler-state.json] [--report-root runs] [--queue-file config/phase3/execution-queue.json] [--catalog-file config/phase3/project-catalog.json] [--execution-history-file config/phase3/execution-history.json] [--model-config-file config/phase3/model-config.json] [--environment-config-file config/phase3/environment-config.json] [--data-template-file config/phase3/data-templates.json]");
                return;
            } else {
                throw new IllegalArgumentException("Unknown option: " + arg);
            }
        }

        Clock clock = Clock.systemUTC();
        SchedulerPersistenceService schedulerPersistence = new SchedulerPersistenceService(
                schedulerRequestsFile,
                schedulerEventsFile,
                clock);
        try (LocalAdminApiServer server = new LocalAdminApiServer(
                new InetSocketAddress("127.0.0.1", port),
                new Phase3MockDataService(
                        reportRoot,
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        schedulerStateFile,
                        queueFile,
                        catalogFile,
                        executionHistoryFile,
                        modelConfigFile,
                        environmentConfigFile,
                        clock),
                schedulerPersistence,
                new ConfigPersistenceService(
                        modelConfigFile,
                        environmentConfigFile),
                new CatalogPersistenceService(catalogFile, clock),
                new RunStatusService(
                        schedulerRequestsFile,
                        schedulerEventsFile,
                        schedulerPersistence,
                        clock),
                new AgentGenerateService(),
                new ReportArtifactService(reportRoot),
                new DataTemplatePersistenceService(dataTemplateFile, clock))) {
            server.start();
            System.out.println("Local admin API listening on http://127.0.0.1:" + server.port());
            new CountDownLatch(1).await();
        }
    }
}
