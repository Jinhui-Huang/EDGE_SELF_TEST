package com.example.webtest.cdp.client;

import com.example.webtest.cdp.event.CdpEventListener;
import com.example.webtest.cdp.model.CdpError;
import com.example.webtest.cdp.model.CdpRequest;
import com.example.webtest.cdp.model.CdpResponse;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.json.Jsons;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicLong;

public class DefaultCdpClient implements CdpClient {
    private static final Duration DEFAULT_REQUEST_TIMEOUT = Duration.ofSeconds(30);

    private final Map<String, List<CdpEventListener>> listeners = new ConcurrentHashMap<>();
    private final Map<Long, CompletableFuture<CdpResponse<JsonNode>>> pendingResponses = new ConcurrentHashMap<>();
    private final AtomicLong requestIds = new AtomicLong(1);
    private final HttpClient httpClient;
    private final Duration requestTimeout;
    private volatile boolean connected;
    private volatile WebSocket webSocket;
    private String wsUrl;

    public DefaultCdpClient() {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(), DEFAULT_REQUEST_TIMEOUT);
    }

    public DefaultCdpClient(HttpClient httpClient, Duration requestTimeout) {
        this.httpClient = httpClient;
        this.requestTimeout = requestTimeout;
    }

    @Override
    public void connect(String wsUrl) {
        this.wsUrl = wsUrl;
        try {
            this.webSocket = httpClient.newWebSocketBuilder()
                    .buildAsync(URI.create(wsUrl), new Listener())
                    .join();
            this.connected = true;
        } catch (RuntimeException e) {
            this.connected = false;
            throw new BaseException(ErrorCodes.CDP_CONNECT_TIMEOUT, "Failed to connect CDP websocket: " + wsUrl, e);
        }
    }

    @Override
    public void close() {
        this.connected = false;
        WebSocket socket = this.webSocket;
        this.webSocket = null;
        if (socket != null) {
            socket.sendClose(WebSocket.NORMAL_CLOSURE, "closed").join();
        }
        pendingResponses.forEach((id, future) ->
                future.completeExceptionally(new BaseException(ErrorCodes.CDP_REQUEST_FAILED, "CDP client closed")));
        pendingResponses.clear();
    }

    @Override
    public <T> T send(String method, Object params, Class<T> responseType) {
        if (!connected) {
            throw new BaseException(ErrorCodes.CDP_REQUEST_FAILED, "CDP client is not connected");
        }
        long id = requestIds.getAndIncrement();
        CdpRequest request = new CdpRequest();
        request.setId(id);
        request.setMethod(method);
        request.setParams(params);

        CompletableFuture<CdpResponse<JsonNode>> responseFuture = new CompletableFuture<>();
        pendingResponses.put(id, responseFuture);

        try {
            webSocket.sendText(Jsons.writeValueAsString(request), true).join();
            CdpResponse<JsonNode> response = responseFuture.get(requestTimeout.toMillis(), TimeUnit.MILLISECONDS);
            if (response.getError() != null) {
                CdpError error = response.getError();
                throw new BaseException(
                        ErrorCodes.CDP_REQUEST_FAILED,
                        "CDP request failed: " + method + " - " + error.getMessage());
            }
            if (responseType == Void.class || responseType == Void.TYPE) {
                return null;
            }
            return Jsons.JSON.convertValue(response.getResult(), responseType);
        } catch (TimeoutException e) {
            throw new BaseException(ErrorCodes.CDP_REQUEST_FAILED, "CDP request timed out: " + method, e);
        } catch (BaseException e) {
            throw e;
        } catch (Exception e) {
            throw new BaseException(ErrorCodes.CDP_REQUEST_FAILED, "CDP request failed: " + method, e);
        } finally {
            pendingResponses.remove(id);
        }
    }

    @Override
    public void addEventListener(String eventName, CdpEventListener listener) {
        listeners.computeIfAbsent(eventName, ignored -> new CopyOnWriteArrayList<>()).add(listener);
    }

    @Override
    public void removeEventListener(String eventName, CdpEventListener listener) {
        List<CdpEventListener> eventListeners = listeners.get(eventName);
        if (eventListeners != null) {
            eventListeners.remove(listener);
        }
    }

    public boolean isConnected() {
        return connected;
    }

    public String getWsUrl() {
        return wsUrl;
    }

    protected void dispatchEvent(String eventName, Object params) {
        List<CdpEventListener> eventListeners = listeners.get(eventName);
        if (eventListeners == null) {
            return;
        }
        for (CdpEventListener listener : eventListeners) {
            listener.onEvent(eventName, params);
        }
    }

    private void handleMessage(String message) {
        try {
            JsonNode node = Jsons.JSON.readTree(message);
            if (node.has("id")) {
                handleResponse(node);
                return;
            }
            if (node.has("method")) {
                String eventName = node.get("method").asText();
                JsonNode params = node.get("params");
                dispatchEvent(eventName, params);
            }
        } catch (Exception e) {
            throw new BaseException(ErrorCodes.CDP_REQUEST_FAILED, "Failed to handle CDP message", e);
        }
    }

    private void handleResponse(JsonNode node) {
        long id = node.get("id").asLong();
        CompletableFuture<CdpResponse<JsonNode>> future = pendingResponses.get(id);
        if (future == null) {
            return;
        }

        CdpResponse<JsonNode> response = new CdpResponse<>();
        response.setId(id);
        response.setResult(node.get("result"));
        if (node.has("error")) {
            response.setError(Jsons.JSON.convertValue(node.get("error"), CdpError.class));
        }
        future.complete(response);
    }

    private final class Listener implements WebSocket.Listener {
        private final StringBuilder partialMessage = new StringBuilder();

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            partialMessage.append(data);
            if (last) {
                String message = partialMessage.toString();
                partialMessage.setLength(0);
                handleMessage(message);
            }
            webSocket.request(1);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
            connected = false;
            pendingResponses.forEach((id, future) -> future.completeExceptionally(
                    new BaseException(ErrorCodes.CDP_REQUEST_FAILED, "CDP websocket closed: " + reason)));
            pendingResponses.clear();
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public void onError(WebSocket webSocket, Throwable error) {
            connected = false;
            pendingResponses.forEach((id, future) -> future.completeExceptionally(error));
            pendingResponses.clear();
        }
    }
}
