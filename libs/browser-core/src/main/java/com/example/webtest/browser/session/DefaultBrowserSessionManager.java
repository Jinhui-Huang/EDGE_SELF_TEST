package com.example.webtest.browser.session;

import com.example.webtest.cdp.client.CdpClient;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.common.ids.Ids;
import com.example.webtest.json.Jsons;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class DefaultBrowserSessionManager implements BrowserSessionManager {
    private static final String DEFAULT_EDGE_EXECUTABLE = "msedge";
    private static final Path WINDOWS_EDGE_X86 =
            Path.of("C:", "Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe");
    private static final Path WINDOWS_EDGE =
            Path.of("C:", "Program Files", "Microsoft", "Edge", "Application", "msedge.exe");

    private final Map<String, ExecutionSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, Process> processes = new ConcurrentHashMap<>();
    private final CdpClient cdpClient;
    private final HttpClient httpClient;

    public DefaultBrowserSessionManager(CdpClient cdpClient) {
        this(cdpClient, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
    }

    public DefaultBrowserSessionManager(CdpClient cdpClient, HttpClient httpClient) {
        this.cdpClient = cdpClient;
        this.httpClient = httpClient;
    }

    @Override
    public ExecutionSession create(SessionOptions options) {
        SessionOptions safeOptions = options == null ? new SessionOptions() : options;
        int debugPort = safeOptions.getDebugPort() == null ? findFreePort() : safeOptions.getDebugPort();

        ExecutionSession session = new ExecutionSession();
        session.setSessionId(Ids.uuid());
        session.setDebugPort(debugPort);
        session.setStatus(SessionStatus.CREATED);

        try {
            Process process = startEdge(safeOptions, debugPort);
            session.setBrowserProcessId(String.valueOf(process.pid()));
            String endpoint = waitForWebSocketEndpoint(debugPort);
            session.setWsEndpoint(endpoint);
            cdpClient.connect(endpoint);
            session.setStatus(SessionStatus.CONNECTED);
            sessions.put(session.getSessionId(), session);
            processes.put(session.getSessionId(), process);
            return session;
        } catch (RuntimeException e) {
            session.setStatus(SessionStatus.FAILED);
            throw e;
        }
    }

    @Override
    public Optional<ExecutionSession> findById(String sessionId) {
        return Optional.ofNullable(sessions.get(sessionId));
    }

    @Override
    public void close(String sessionId) {
        ExecutionSession session = sessions.remove(sessionId);
        if (session != null) {
            session.setStatus(SessionStatus.CLOSED);
        }
        cdpClient.close();
        Process process = processes.remove(sessionId);
        if (process != null) {
            process.destroy();
        }
    }

    private Process startEdge(SessionOptions options, int debugPort) {
        List<String> command = new ArrayList<>();
        command.add(options.getEdgeExecutable() == null || options.getEdgeExecutable().isBlank()
                ? defaultEdgeExecutable()
                : options.getEdgeExecutable());
        command.add("--remote-debugging-port=" + debugPort);
        command.add("--remote-allow-origins=*");
        command.add("--no-first-run");
        command.add("--no-default-browser-check");
        command.add("--user-data-dir=" + userDataDir(options));
        if (options.isHeadless()) {
            command.add("--headless=new");
        }
        if (options.getInitialUrl() != null && !options.getInitialUrl().isBlank()) {
            command.add(options.getInitialUrl());
        } else {
            command.add("about:blank");
        }

        try {
            return new ProcessBuilder(command).start();
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.CDP_CONNECT_TIMEOUT, "Failed to start Edge process", e);
        }
    }

    private String userDataDir(SessionOptions options) {
        if (options.getUserDataDir() != null && !options.getUserDataDir().isBlank()) {
            return options.getUserDataDir();
        }
        try {
            return Files.createTempDirectory("webtest-edge-").toString();
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.CDP_CONNECT_TIMEOUT, "Failed to create Edge user data dir", e);
        }
    }

    private String defaultEdgeExecutable() {
        if (Files.isRegularFile(WINDOWS_EDGE_X86)) {
            return WINDOWS_EDGE_X86.toString();
        }
        if (Files.isRegularFile(WINDOWS_EDGE)) {
            return WINDOWS_EDGE.toString();
        }
        return DEFAULT_EDGE_EXECUTABLE;
    }

    private String waitForWebSocketEndpoint(int debugPort) {
        URI uri = URI.create("http://127.0.0.1:" + debugPort + "/json/version");
        HttpRequest request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(2)).GET().build();
        RuntimeException lastError = null;
        for (int attempt = 0; attempt < 30; attempt++) {
            try {
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    JsonNode root = Jsons.JSON.readTree(response.body());
                    JsonNode endpoint = root.get("webSocketDebuggerUrl");
                    if (endpoint != null && !endpoint.asText().isBlank()) {
                        return endpoint.asText();
                    }
                }
            } catch (IOException e) {
                lastError = new BaseException(ErrorCodes.CDP_CONNECT_TIMEOUT, "Failed to query DevTools endpoint", e);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new BaseException(ErrorCodes.CDP_CONNECT_TIMEOUT, "Interrupted while querying DevTools endpoint", e);
            }
            sleepBriefly();
        }
        throw new BaseException(
                ErrorCodes.CDP_CONNECT_TIMEOUT,
                "Timed out waiting for Edge DevTools endpoint on port " + debugPort,
                lastError);
    }

    private int findFreePort() {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.CDP_CONNECT_TIMEOUT, "Failed to allocate debug port", e);
        }
    }

    private void sleepBriefly() {
        try {
            Thread.sleep(200);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BaseException(ErrorCodes.CDP_CONNECT_TIMEOUT, "Interrupted while waiting for Edge", e);
        }
    }
}
