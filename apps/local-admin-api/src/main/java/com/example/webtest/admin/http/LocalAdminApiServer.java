package com.example.webtest.admin.http;

import com.example.webtest.admin.service.AgentGenerateService;
import com.example.webtest.admin.service.CaseDetailService;
import com.example.webtest.admin.service.CatalogPersistenceService;
import com.example.webtest.admin.service.ConnectionValidationService;
import com.example.webtest.admin.service.ConfigPersistenceService;
import com.example.webtest.admin.service.DataTemplatePersistenceService;
import com.example.webtest.admin.service.ReportArtifactService;
import com.example.webtest.admin.service.RunStatusService;
import com.example.webtest.admin.service.SchedulerPersistenceService;
import com.example.webtest.admin.service.Phase3MockDataService;
import com.example.webtest.json.Jsons;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.Executors;

public final class LocalAdminApiServer implements AutoCloseable {
    private final HttpServer server;

    public LocalAdminApiServer(
            InetSocketAddress address,
            Phase3MockDataService mockDataService,
            SchedulerPersistenceService schedulerPersistenceService,
            ConfigPersistenceService configPersistenceService,
            CatalogPersistenceService catalogPersistenceService,
            RunStatusService runStatusService,
            AgentGenerateService agentGenerateService,
            ReportArtifactService reportArtifactService,
            DataTemplatePersistenceService dataTemplatePersistenceService)
            throws IOException {
        this(
                address,
                mockDataService,
                schedulerPersistenceService,
                configPersistenceService,
                catalogPersistenceService,
                runStatusService,
                agentGenerateService,
                reportArtifactService,
                dataTemplatePersistenceService,
                new ConnectionValidationService(),
                new CaseDetailService(java.nio.file.Path.of("config", "phase3", "case-details")));
    }

    public LocalAdminApiServer(
            InetSocketAddress address,
            Phase3MockDataService mockDataService,
            SchedulerPersistenceService schedulerPersistenceService,
            ConfigPersistenceService configPersistenceService,
            CatalogPersistenceService catalogPersistenceService,
            RunStatusService runStatusService,
            AgentGenerateService agentGenerateService,
            ReportArtifactService reportArtifactService,
            DataTemplatePersistenceService dataTemplatePersistenceService,
            ConnectionValidationService connectionValidationService)
            throws IOException {
        this(
                address,
                mockDataService,
                schedulerPersistenceService,
                configPersistenceService,
                catalogPersistenceService,
                runStatusService,
                agentGenerateService,
                reportArtifactService,
                dataTemplatePersistenceService,
                connectionValidationService,
                new CaseDetailService(java.nio.file.Path.of("config", "phase3", "case-details")));
    }

    public LocalAdminApiServer(
            InetSocketAddress address,
            Phase3MockDataService mockDataService,
            SchedulerPersistenceService schedulerPersistenceService,
            ConfigPersistenceService configPersistenceService,
            CatalogPersistenceService catalogPersistenceService,
            RunStatusService runStatusService,
            AgentGenerateService agentGenerateService,
            ReportArtifactService reportArtifactService,
            DataTemplatePersistenceService dataTemplatePersistenceService,
            ConnectionValidationService connectionValidationService,
            CaseDetailService caseDetailService)
            throws IOException {
        server = HttpServer.create(address, 0);
        server.createContext("/health", jsonHandler(Map.of("status", "UP")));
        server.createContext("/api/phase3/admin-console", jsonHandler(mockDataService::buildAdminConsoleSnapshot));
        server.createContext("/api/phase3/extension-popup", jsonHandler(mockDataService::buildExtensionPopupSnapshot));
        server.createContext(
                "/api/phase3/scheduler/requests",
                exchange -> handleMutation(exchange, schedulerPersistenceService::appendRequest));
        server.createContext(
                "/api/phase3/scheduler/events",
                exchange -> handleMutation(exchange, schedulerPersistenceService::appendEvent));
        server.createContext(
                "/api/phase3/config/model/test-connection",
                exchange -> handleValidation(exchange, connectionValidationService::testModelConnection));
        server.createContext(
                "/api/phase3/config/model",
                exchange -> handleMutation(exchange, configPersistenceService::upsertModelConfigItem));
        server.createContext(
                "/api/phase3/config/environment",
                exchange -> handleMutation(exchange, configPersistenceService::upsertEnvironmentConfigItem));
        server.createContext(
                "/api/phase3/datasources/test-connection",
                exchange -> handleValidation(exchange, connectionValidationService::testDatasourceConnection));
        server.createContext(
                "/api/phase3/catalog/project/import/preview",
                exchange -> handleMutation(exchange, catalogPersistenceService::importPreview));
        server.createContext(
                "/api/phase3/catalog/project/import/commit",
                exchange -> handleMutation(exchange, catalogPersistenceService::importCommit));
        server.createContext(
                "/api/phase3/catalog/project",
                exchange -> handleMutation(exchange, catalogPersistenceService::upsertProject));
        server.createContext(
                "/api/phase3/catalog/project/",
                exchange -> handleMutation(exchange, catalogPersistenceService::upsertProject));
        server.createContext(
                "/api/phase3/catalog/case",
                exchange -> handleMutation(exchange, catalogPersistenceService::upsertCase));
        server.createContext(
                "/api/phase3/agent/generate-case/dry-run",
                exchange -> handleMutation(exchange, agentGenerateService::dryRun));
        server.createContext(
                "/api/phase3/agent/generate-case",
                exchange -> handleMutation(exchange, agentGenerateService::generateCase));
        server.createContext(
                "/api/phase3/cases/dsl/validate",
                exchange -> handleMutation(exchange, agentGenerateService::validateDsl));
        server.createContext("/api/phase3/cases/",
                exchange -> handleCaseDetailEndpoint(exchange, caseDetailService));
        server.createContext(
                "/api/phase3/data-templates/import/preview",
                exchange -> handleMutation(exchange, dataTemplatePersistenceService::importPreview));
        server.createContext(
                "/api/phase3/data-templates/import/commit",
                exchange -> handleMutation(exchange, dataTemplatePersistenceService::importCommit));
        server.createContext("/api/phase3/data-templates/",
                exchange -> handleDataTemplateEndpoint(exchange, dataTemplatePersistenceService));
        server.createContext("/api/phase3/data-templates",
                exchange -> handleDataTemplateEndpoint(exchange, dataTemplatePersistenceService));
        server.createContext("/api/phase3/runs/", exchange -> handleRunEndpoint(exchange, runStatusService, reportArtifactService));
        server.createContext("/", exchange -> writeJson(exchange, 404, Map.of(
                "error", "NOT_FOUND",
                "path", exchange.getRequestURI().getPath())));
        server.setExecutor(Executors.newCachedThreadPool());
    }

    public void start() {
        server.start();
    }

    public int port() {
        return server.getAddress().getPort();
    }

    @Override
    public void close() {
        server.stop(0);
    }

    private static void handleCaseDetailEndpoint(HttpExchange exchange,
            CaseDetailService service) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeEmptyResponse(exchange);
            return;
        }
        String path = exchange.getRequestURI().getPath();
        // /api/phase3/cases/{caseId}/{action}
        // /api/phase3/cases/{caseId}/{action}/{subAction}
        String[] segments = path.split("/");
        // segments: ["", "api", "phase3", "cases", "{caseId}", "{action?}", "{subAction?}"]

        if (segments.length < 5 || segments[4].isEmpty()) {
            writeJson(exchange, 400, Map.of("error", "BAD_REQUEST", "message", "caseId required"));
            return;
        }

        String caseId = segments[4];
        String action = segments.length > 5 ? segments[5] : "";
        String subAction = segments.length > 6 ? segments[6] : "";
        String method = exchange.getRequestMethod().toUpperCase();

        try {
            switch (action) {
                case "dsl" -> {
                    if ("validate".equals(subAction)) {
                        if (!"POST".equals(method)) {
                            writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                            return;
                        }
                        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                        writeJson(exchange, 200, service.validateDsl(caseId, body));
                    } else if (subAction.isEmpty()) {
                        if ("GET".equals(method)) {
                            writeJson(exchange, 200, service.getDsl(caseId));
                        } else if ("PUT".equals(method)) {
                            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                            writeJson(exchange, 202, service.saveDsl(caseId, body));
                        } else {
                            writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                        }
                    } else {
                        writeJson(exchange, 404, Map.of("error", "NOT_FOUND", "subAction", subAction));
                    }
                }
                case "state-machine" -> {
                    if ("GET".equals(method)) {
                        writeJson(exchange, 200, service.getStateMachine(caseId));
                    } else if ("PUT".equals(method)) {
                        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                        writeJson(exchange, 202, service.saveStateMachine(caseId, body));
                    } else {
                        writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                    }
                }
                case "plans" -> {
                    if (!"GET".equals(method)) {
                        writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                        return;
                    }
                    writeJson(exchange, 200, service.getPlans(caseId));
                }
                case "history" -> {
                    if (!"GET".equals(method)) {
                        writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                        return;
                    }
                    writeJson(exchange, 200, service.getHistory(caseId));
                }
                default -> writeJson(exchange, 404, Map.of("error", "NOT_FOUND", "action", action));
            }
        } catch (IllegalArgumentException e) {
            writeJson(exchange, 400, Map.of("error", "BAD_REQUEST", "message", e.getMessage()));
        }
    }

    private static void handleDataTemplateEndpoint(HttpExchange exchange,
            DataTemplatePersistenceService service) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeEmptyResponse(exchange);
            return;
        }
        String path = exchange.getRequestURI().getPath();
        // /api/phase3/data-templates            -> list or create
        // /api/phase3/data-templates/            -> list or create
        // /api/phase3/data-templates/{id}        -> get, update, or delete
        // /api/phase3/data-templates/{id}/dry-run -> dry-run
        String[] segments = path.split("/");
        // segments: ["", "api", "phase3", "data-templates", "{id?}", "{action?}"]

        String method = exchange.getRequestMethod().toUpperCase();
        String templateId = segments.length > 4 ? segments[4] : "";
        String action = segments.length > 5 ? segments[5] : "";

        try {
            if (templateId.isEmpty()) {
                if ("GET".equals(method)) {
                    writeJson(exchange, 200, service.listTemplates());
                } else if ("POST".equals(method)) {
                    String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                    writeJson(exchange, 202, service.createTemplate(body));
                } else {
                    writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                }
                return;
            }

            if ("dry-run".equals(action)) {
                if (!"POST".equals(method)) {
                    writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                    return;
                }
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                writeJson(exchange, 200, service.dryRun(templateId, body));
                return;
            }

            if (action.isEmpty()) {
                switch (method) {
                    case "GET" -> writeJson(exchange, 200, service.getTemplate(templateId));
                    case "PUT" -> {
                        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                        Object result = service.updateTemplate(templateId, body);
                        int status = isErrorResult(result) ? 404 : 202;
                        writeJson(exchange, status, result);
                    }
                    case "DELETE" -> {
                        Object result = service.deleteTemplate(templateId);
                        int status = isErrorResult(result) ? 404 : 200;
                        writeJson(exchange, status, result);
                    }
                    default -> writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                }
                return;
            }

            writeJson(exchange, 404, Map.of("error", "NOT_FOUND", "action", action));
        } catch (IllegalArgumentException e) {
            writeJson(exchange, 400, Map.of("error", "BAD_REQUEST", "message", e.getMessage()));
        }
    }

    @SuppressWarnings("unchecked")
    private static boolean isErrorResult(Object result) {
        if (result instanceof Map<?, ?> m) {
            return m.containsKey("error");
        }
        return false;
    }

    private static void handleRunEndpoint(HttpExchange exchange, RunStatusService service,
            ReportArtifactService reportService) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeEmptyResponse(exchange);
            return;
        }
        String path = exchange.getRequestURI().getPath();
        String[] segments = path.split("/");
        // segments: ["", "api", "phase3", "runs", "{runId}", "{action}"]

        // Handle list request: /api/phase3/runs/ with no runId/action
        if (segments.length < 6) {
            if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                String possibleRunId = segments.length > 4 ? segments[4] : "";
                if (possibleRunId.isEmpty()) {
                    writeJson(exchange, 200, reportService.listRuns());
                } else {
                    writeJson(exchange, 200, reportService.getReport(possibleRunId));
                }
                return;
            }
            writeJson(exchange, 400, Map.of("error", "BAD_REQUEST", "message", "Invalid run endpoint path: " + path));
            return;
        }

        String runId = segments[4];
        String action = segments[5];

        try {
            switch (action) {
                case "status" -> {
                    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                        writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                        return;
                    }
                    writeJson(exchange, 200, service.getRunStatus(runId));
                }
                case "steps" -> {
                    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                        writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                        return;
                    }
                    writeJson(exchange, 200, service.getRunSteps(runId));
                }
                case "runtime-log" -> {
                    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                        writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                        return;
                    }
                    writeJson(exchange, 200, service.getRunRuntimeLog(runId));
                }
                case "live-page" -> {
                    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                        writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                        return;
                    }
                    writeJson(exchange, 200, service.getRunLivePage(runId));
                }
                case "report" -> {
                    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                        writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                        return;
                    }
                    writeJson(exchange, 200, reportService.getReport(runId));
                }
                case "data-diff" -> {
                    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                        writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                        return;
                    }
                    writeJson(exchange, 200, reportService.getDataDiff(runId));
                }
                case "assertions" -> {
                    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                        writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                        return;
                    }
                    writeJson(exchange, 200, reportService.getAssertions(runId));
                }
                case "artifacts" -> {
                    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                        writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                        return;
                    }
                    writeJson(exchange, 200, reportService.getArtifacts(runId));
                }
                case "pause" -> {
                    if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                        writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                        return;
                    }
                    String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                    Map<String, Object> pauseResult = service.pauseRun(runId, body);
                    writeJson(exchange, controlHttpStatus(pauseResult), pauseResult);
                }
                case "abort" -> {
                    if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                        writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                        return;
                    }
                    String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                    Map<String, Object> abortResult = service.abortRun(runId, body);
                    writeJson(exchange, controlHttpStatus(abortResult), abortResult);
                }
                default -> writeJson(exchange, 404, Map.of("error", "NOT_FOUND", "action", action));
            }
        } catch (IllegalArgumentException e) {
            writeJson(exchange, 400, Map.of("error", "BAD_REQUEST", "message", e.getMessage()));
        }
    }

    private static HttpHandler jsonHandler(Object body) {
        return exchange -> handle(exchange, body);
    }

    private static HttpHandler jsonHandler(JsonBodySupplier supplier) {
        return exchange -> handle(exchange, supplier.get());
    }

    private static void handle(HttpExchange exchange, Object body) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeEmptyResponse(exchange);
            return;
        }
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
            return;
        }
        writeJson(exchange, 200, body);
    }

    private static void handleMutation(HttpExchange exchange, JsonBodyMutation mutation) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeEmptyResponse(exchange);
            return;
        }
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
            return;
        }
        try {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            writeJson(exchange, 202, mutation.apply(body));
        } catch (IllegalArgumentException e) {
            writeJson(exchange, 400, Map.of(
                    "error", "BAD_REQUEST",
                    "message", e.getMessage()));
        }
    }

    private static void handleValidation(HttpExchange exchange, JsonBodyMutation mutation) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeEmptyResponse(exchange);
            return;
        }
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
            return;
        }
        try {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            writeJson(exchange, 200, mutation.apply(body));
        } catch (IllegalArgumentException e) {
            writeJson(exchange, 400, Map.of(
                    "error", "BAD_REQUEST",
                    "message", e.getMessage()));
        }
    }

    private static void writeEmptyResponse(HttpExchange exchange) throws IOException {
        applyCommonHeaders(exchange.getResponseHeaders());
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
    }

    private static void writeJson(HttpExchange exchange, int status, Object body) throws IOException {
        byte[] payload = Jsons.writeValueAsString(body).getBytes(StandardCharsets.UTF_8);
        applyCommonHeaders(exchange.getResponseHeaders());
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, payload.length);
        try (OutputStream outputStream = exchange.getResponseBody()) {
            outputStream.write(payload);
        }
    }

    private static void applyCommonHeaders(Headers headers) {
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type");
    }

    private static int controlHttpStatus(Map<String, Object> controlResult) {
        Object status = controlResult.get("status");
        if ("ACCEPTED".equals(status)) return 202;
        return 409;
    }

    @FunctionalInterface
    private interface JsonBodySupplier {
        Object get();
    }

    @FunctionalInterface
    private interface JsonBodyMutation {
        Object apply(String body) throws IOException;
    }
}
