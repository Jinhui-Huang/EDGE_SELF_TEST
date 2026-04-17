package com.example.webtest.artifact.collector;

import com.example.webtest.artifact.model.ArtifactRef;
import com.example.webtest.browser.observer.ConsoleEvent;
import com.example.webtest.browser.observer.NetworkEvent;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.json.Jsons;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class DefaultArtifactCollector implements ArtifactCollector {
    private final PageController pageController;

    public DefaultArtifactCollector(PageController pageController) {
        this.pageController = Objects.requireNonNull(pageController, "pageController must not be null");
    }

    @Override
    public ArtifactRef captureScreenshot(Path outputDir, String artifactName, ExecutionContext context) {
        Objects.requireNonNull(outputDir, "outputDir must not be null");
        String safeArtifactName = artifactName == null || artifactName.isBlank() ? "screenshot" : artifactName;
        Path screenshotPath = outputDir.resolve(safeArtifactName + ".png");
        try {
            Files.createDirectories(screenshotPath.getParent());
            Files.write(screenshotPath, pageController.screenshot(context, new ScreenshotOptions()));
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Failed to write screenshot", e);
        }

        ArtifactRef ref = new ArtifactRef();
        ref.setType("screenshot");
        ref.setPath(screenshotPath);
        ref.setContentType("image/png");
        ref.setCreatedAt(Instant.now());
        return ref;
    }

    @Override
    public ArtifactRef captureDomDump(Path outputDir, String artifactName, ExecutionContext context) {
        Objects.requireNonNull(outputDir, "outputDir must not be null");
        String safeArtifactName = artifactName == null || artifactName.isBlank() ? "dom" : artifactName;
        Path domPath = outputDir.resolve(safeArtifactName + ".html");
        try {
            Files.createDirectories(domPath.getParent());
            Files.writeString(domPath, pageController.getHtml(context));
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Failed to write DOM dump", e);
        }

        ArtifactRef ref = new ArtifactRef();
        ref.setType("dom");
        ref.setPath(domPath);
        ref.setContentType("text/html");
        ref.setCreatedAt(Instant.now());
        return ref;
    }

    @Override
    public ArtifactRef captureConsoleDump(Path outputDir, String artifactName, ExecutionContext context) {
        return captureConsoleDump(outputDir, artifactName, pageController.consoleEvents(context));
    }

    @Override
    public ArtifactRef captureConsoleDump(Path outputDir, String artifactName, List<ConsoleEvent> events) {
        Objects.requireNonNull(outputDir, "outputDir must not be null");
        String safeArtifactName = artifactName == null || artifactName.isBlank() ? "console" : artifactName;
        Path consolePath = outputDir.resolve(safeArtifactName + ".json");
        try {
            Files.createDirectories(consolePath.getParent());
            Files.writeString(consolePath, Jsons.writeValueAsString(consoleDump(events)));
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Failed to write console dump", e);
        }

        ArtifactRef ref = new ArtifactRef();
        ref.setType("console");
        ref.setPath(consolePath);
        ref.setContentType("application/json");
        ref.setCreatedAt(Instant.now());
        return ref;
    }

    @Override
    public ArtifactRef captureNetworkDump(Path outputDir, String artifactName, ExecutionContext context) {
        return captureNetworkDump(outputDir, artifactName, pageController.networkEvents(context));
    }

    @Override
    public ArtifactRef captureNetworkDump(Path outputDir, String artifactName, List<NetworkEvent> events) {
        Objects.requireNonNull(outputDir, "outputDir must not be null");
        String safeArtifactName = artifactName == null || artifactName.isBlank() ? "network" : artifactName;
        Path networkPath = outputDir.resolve(safeArtifactName + ".json");
        NetworkDump dump;
        try {
            Files.createDirectories(networkPath.getParent());
            dump = networkDump(outputDir, safeArtifactName, events);
            Files.writeString(networkPath, Jsons.writeValueAsString(dump.events()));
        } catch (IOException e) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Failed to write network dump", e);
        }

        ArtifactRef ref = new ArtifactRef();
        ref.setType("network");
        ref.setPath(networkPath);
        ref.setContentType("application/json");
        ref.setCreatedAt(Instant.now());
        ref.setRelatedArtifacts(dump.relatedArtifacts());
        return ref;
    }

    private List<Map<String, Object>> consoleDump(List<ConsoleEvent> events) {
        List<Map<String, Object>> values = new ArrayList<>();
        if (events == null) {
            return values;
        }
        for (ConsoleEvent event : events) {
            Map<String, Object> value = new LinkedHashMap<>();
            value.put("time", event.getTime() == null ? null : event.getTime().toString());
            value.put("level", event.getLevel());
            value.put("message", event.getMessage());
            values.add(value);
        }
        return values;
    }

    private NetworkDump networkDump(Path outputDir, String artifactName, List<NetworkEvent> events)
            throws IOException {
        List<Map<String, Object>> values = new ArrayList<>();
        List<ArtifactRef> relatedArtifacts = new ArrayList<>();
        if (events == null) {
            return new NetworkDump(values, relatedArtifacts);
        }
        for (int index = 0; index < events.size(); index++) {
            NetworkEvent event = events.get(index);
            relatedArtifacts.addAll(writeLargeNetworkBodies(outputDir, artifactName, index, event));
            Map<String, Object> value = new LinkedHashMap<>();
            value.put("time", event.getTime() == null ? null : event.getTime().toString());
            value.put("event", event.getEvent());
            value.put("requestId", event.getRequestId());
            value.put("url", event.getUrl());
            value.put("method", event.getMethod());
            value.put("requestHeaders", event.getRequestHeaders());
            value.put("requestBody", event.getRequestBody());
            value.put("requestBodyTruncated", event.getRequestBodyTruncated());
            value.put("requestBodyArtifactPath", event.getRequestBodyArtifactPath());
            value.put("status", event.getStatus());
            value.put("responseHeaders", event.getResponseHeaders());
            value.put("mimeType", event.getMimeType());
            value.put("encodedDataLength", event.getEncodedDataLength());
            value.put("responseBody", event.getResponseBody());
            value.put("responseBodyBase64Encoded", event.getResponseBodyBase64Encoded());
            value.put("responseBodyTruncated", event.getResponseBodyTruncated());
            value.put("responseBodyArtifactPath", event.getResponseBodyArtifactPath());
            value.put("bodyError", event.getBodyError());
            value.put("errorText", event.getErrorText());
            values.add(value);
        }
        return new NetworkDump(values, relatedArtifacts);
    }

    private List<ArtifactRef> writeLargeNetworkBodies(Path outputDir, String artifactName, int index, NetworkEvent event)
            throws IOException {
        List<ArtifactRef> refs = new ArrayList<>();
        if (Boolean.TRUE.equals(event.getRequestBodyTruncated())
                && (event.getRequestBodySpoolPath() != null || event.getRequestBodyFull() != null)) {
            Path bodyPath = networkBodyPath(outputDir, artifactName, index, event, "request", "txt");
            Files.createDirectories(bodyPath.getParent());
            writeTextBody(bodyPath, event.getRequestBodySpoolPath(), event.getRequestBodyFull());
            event.setRequestBodyArtifactPath(relativePath(outputDir, bodyPath));
            refs.add(artifactRef("network-request-body", bodyPath, "text/plain"));
        }
        if (Boolean.TRUE.equals(event.getResponseBodyTruncated())
                && (event.getResponseBodySpoolPath() != null || event.getResponseBodyFull() != null)) {
            boolean base64Encoded = Boolean.TRUE.equals(event.getResponseBodyBase64Encoded());
            Path bodyPath = networkBodyPath(outputDir, artifactName, index, event, "response", base64Encoded ? "bin" : "txt");
            Files.createDirectories(bodyPath.getParent());
            if (base64Encoded) {
                writeBase64Body(bodyPath, event.getResponseBodySpoolPath(), event.getResponseBodyFull());
            } else {
                writeTextBody(bodyPath, event.getResponseBodySpoolPath(), event.getResponseBodyFull());
            }
            event.setResponseBodyArtifactPath(relativePath(outputDir, bodyPath));
            refs.add(artifactRef(
                    "network-response-body",
                    bodyPath,
                    base64Encoded ? "application/octet-stream" : "text/plain"));
        }
        return refs;
    }

    private void writeTextBody(Path bodyPath, Path spoolPath, String fullBody) throws IOException {
        if (spoolPath != null) {
            Files.copy(spoolPath, bodyPath, StandardCopyOption.REPLACE_EXISTING);
            Files.deleteIfExists(spoolPath);
            return;
        }
        Files.writeString(bodyPath, fullBody, StandardCharsets.UTF_8);
    }

    private void writeBase64Body(Path bodyPath, Path spoolPath, String fullBody) throws IOException {
        if (spoolPath != null) {
            try (InputStream encoded = Files.newInputStream(spoolPath);
                    InputStream decoded = Base64.getDecoder().wrap(encoded)) {
                Files.copy(decoded, bodyPath, StandardCopyOption.REPLACE_EXISTING);
            }
            Files.deleteIfExists(spoolPath);
            return;
        }
        Files.write(bodyPath, Base64.getDecoder().decode(fullBody));
    }

    private ArtifactRef artifactRef(String type, Path path, String contentType) {
        ArtifactRef ref = new ArtifactRef();
        ref.setType(type);
        ref.setPath(path);
        ref.setContentType(contentType);
        ref.setCreatedAt(Instant.now());
        return ref;
    }

    private Path networkBodyPath(Path outputDir, String artifactName, int index, NetworkEvent event, String phase, String suffix) {
        String requestId = event.getRequestId() == null || event.getRequestId().isBlank()
                ? "event"
                : event.getRequestId();
        String fileName = "%03d-%s-%s-body.%s".formatted(index + 1, safeFilePart(requestId), phase, suffix);
        return outputDir.resolve(artifactName + "-bodies").resolve(fileName);
    }

    private String safeFilePart(String value) {
        String safe = value.replaceAll("[^A-Za-z0-9._-]", "-");
        return safe.isBlank() ? "event" : safe;
    }

    private String relativePath(Path outputDir, Path value) {
        try {
            return outputDir.toAbsolutePath().normalize().relativize(value.toAbsolutePath().normalize()).toString();
        } catch (IllegalArgumentException e) {
            return value.toString();
        }
    }

    private record NetworkDump(List<Map<String, Object>> events, List<ArtifactRef> relatedArtifacts) {
    }
}
