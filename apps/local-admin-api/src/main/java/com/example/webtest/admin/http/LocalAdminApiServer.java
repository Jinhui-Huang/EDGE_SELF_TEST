package com.example.webtest.admin.http;

import com.example.webtest.admin.service.CatalogPersistenceService;
import com.example.webtest.admin.service.ConfigPersistenceService;
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
            CatalogPersistenceService catalogPersistenceService)
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
                "/api/phase3/config/model",
                exchange -> handleMutation(exchange, configPersistenceService::upsertModelConfigItem));
        server.createContext(
                "/api/phase3/config/environment",
                exchange -> handleMutation(exchange, configPersistenceService::upsertEnvironmentConfigItem));
        server.createContext(
                "/api/phase3/catalog/project",
                exchange -> handleMutation(exchange, catalogPersistenceService::upsertProject));
        server.createContext(
                "/api/phase3/catalog/case",
                exchange -> handleMutation(exchange, catalogPersistenceService::upsertCase));
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
        headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type");
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
