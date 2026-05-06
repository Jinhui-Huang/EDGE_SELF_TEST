package com.example.webtest.admin.service;

import com.example.webtest.json.Jsons;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * File-backed document persistence for upload, re-parse, and manual parse-result editing.
 * Each document stores its artifacts under {@code <documentRoot>/<documentId>/}.
 */
public final class DocumentPersistenceService {
    private final Path documentRoot;
    private final Clock clock;

    public DocumentPersistenceService(Path documentRoot) {
        this(documentRoot, Clock.systemUTC());
    }

    public DocumentPersistenceService(Path documentRoot, Clock clock) {
        this.documentRoot = documentRoot;
        this.clock = clock == null ? Clock.systemUTC() : clock;
    }

    // ---- POST /api/phase3/documents/upload ----

    @SuppressWarnings("unchecked")
    public Object upload(String requestBody) throws IOException {
        Map<String, Object> payload = Jsons.readValue(requestBody, Map.class);
        String projectKey = stringValue(payload.get("projectKey"));
        if (projectKey.isEmpty()) {
            throw new IllegalArgumentException("Missing required field: projectKey");
        }

        String fileName = stringValue(payload.get("fileName"));
        if (fileName.isEmpty()) {
            throw new IllegalArgumentException("Missing required field: fileName");
        }

        String content = stringValue(payload.get("content"));
        String documentId = toDocumentId(projectKey, fileName);

        Path docDir = resolveDocDir(documentId);
        Files.createDirectories(docDir);
        Instant now = Instant.now(clock);

        // Save raw content
        Map<String, Object> rawDoc = new LinkedHashMap<>();
        rawDoc.put("documentId", documentId);
        rawDoc.put("name", fileName);
        rawDoc.put("projectKey", projectKey);
        rawDoc.put("content", content);
        rawDoc.put("uploadedAt", now.toString());
        Files.writeString(docDir.resolve("raw.json"), Jsons.writeValueAsString(rawDoc), StandardCharsets.UTF_8);

        // Generate initial parse result
        Map<String, Object> parseResult = buildDefaultParseResult(documentId, projectKey, fileName);
        Files.writeString(docDir.resolve("parse-result.json"), Jsons.writeValueAsString(parseResult), StandardCharsets.UTF_8);

        // Save metadata
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("documentId", documentId);
        meta.put("name", fileName);
        meta.put("projectKey", projectKey);
        meta.put("status", "PARSED");
        meta.put("updatedAt", now.toString());
        meta.put("model", "claude-4.5");
        Files.writeString(docDir.resolve("meta.json"), Jsons.writeValueAsString(meta), StandardCharsets.UTF_8);

        writeVersions(docDir, List.of(buildVersionEntry("v1", now.toString(), "Uploaded document and generated initial parse result.")));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ACCEPTED");
        response.put("uploaded", List.of(Map.of("id", documentId, "name", fileName)));
        return response;
    }

    // ---- POST /api/phase3/documents/{documentId}/reparse ----

    @SuppressWarnings("unchecked")
    public Object reparse(String documentId, String requestBody) throws IOException {
        Path docDir = resolveDocDir(documentId);
        Path metaFile = docDir.resolve("meta.json");
        if (!Files.isRegularFile(metaFile)) {
            return Map.of("status", "NOT_FOUND", "documentId", documentId);
        }
        Instant now = Instant.now(clock);

        Map<String, Object> meta = Jsons.readValue(Files.readString(metaFile, StandardCharsets.UTF_8), Map.class);
        String fileName = stringValue(meta.get("name"));
        String projectKey = stringValue(meta.get("projectKey"));

        // Regenerate parse result (simulates re-parse)
        Map<String, Object> parseResult = buildDefaultParseResult(documentId, projectKey, fileName);
        Map<String, Object> payload = Jsons.readValue(requestBody, Map.class);
        String operator = stringValue(payload.get("operator"));
        if (!operator.isEmpty()) {
            parseResult.put("reparsedBy", operator);
        }
        parseResult.put("reparsedAt", now.toString());
        Files.writeString(docDir.resolve("parse-result.json"), Jsons.writeValueAsString(parseResult), StandardCharsets.UTF_8);

        // Update metadata
        meta.put("status", "PARSED");
        meta.put("updatedAt", now.toString());
        Files.writeString(metaFile, Jsons.writeValueAsString(meta), StandardCharsets.UTF_8);

        appendVersion(docDir, now.toString(), operator.isEmpty()
                ? "Re-parsed document and refreshed detected cases."
                : "Re-parsed document by " + operator + " and refreshed detected cases.");

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ACCEPTED");
        response.put("kind", "document-reparse");
        response.put("documentId", documentId);
        return response;
    }

    // ---- PUT /api/phase3/documents/{documentId}/parse-result ----

    @SuppressWarnings("unchecked")
    public Object saveParseResult(String documentId, String requestBody) throws IOException {
        Path docDir = resolveDocDir(documentId);
        Path metaFile = docDir.resolve("meta.json");
        if (!Files.isRegularFile(metaFile)) {
            return Map.of("status", "NOT_FOUND", "documentId", documentId);
        }
        Instant now = Instant.now(clock);

        Map<String, Object> payload = Jsons.readValue(requestBody, Map.class);
        Map<String, Object> meta = Jsons.readValue(Files.readString(metaFile, StandardCharsets.UTF_8), Map.class);
        String projectKey = stringValue(meta.get("projectKey"));

        // Build updated parse result
        Map<String, Object> parseResult = new LinkedHashMap<>();
        parseResult.put("documentId", documentId);
        parseResult.put("projectKey", projectKey);

        Object changes = payload.get("changes");
        if (changes instanceof Map<?, ?> changesMap) {
            Object detectedCases = changesMap.get("detectedCases");
            if (detectedCases != null) {
                parseResult.put("detectedCases", detectedCases);
            } else {
                parseResult.put("detectedCases", List.of());
            }
        } else {
            parseResult.put("detectedCases", List.of());
        }

        String updatedBy = stringValue(payload.get("updatedBy"));
        if (!updatedBy.isEmpty()) {
            parseResult.put("updatedBy", updatedBy);
        }
        parseResult.put("updatedAt", now.toString());
        parseResult.put("reasoning", List.of(
                Map.of("label", "Manual edit", "body", "Parse result was manually updated.")));
        parseResult.put("missing", List.of());

        Files.writeString(docDir.resolve("parse-result.json"), Jsons.writeValueAsString(parseResult), StandardCharsets.UTF_8);

        // Update metadata
        meta.put("status", "PARSED");
        meta.put("updatedAt", now.toString());
        Files.writeString(metaFile, Jsons.writeValueAsString(meta), StandardCharsets.UTF_8);

        appendVersion(docDir, now.toString(), updatedBy.isEmpty()
                ? "Manually edited detected cases."
                : "Manually edited detected cases by " + updatedBy + ".");

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ACCEPTED");
        response.put("kind", "document-parse-edit");
        response.put("documentId", documentId);
        return response;
    }

    // ---- GET /api/phase3/documents/{documentId}/parse-result ----

    @SuppressWarnings("unchecked")
    public Object getParseResult(String documentId) throws IOException {
        Path docDir = resolveDocDir(documentId);
        Path parseFile = docDir.resolve("parse-result.json");
        if (Files.isRegularFile(parseFile)) {
            return Jsons.readValue(Files.readString(parseFile, StandardCharsets.UTF_8), Map.class);
        }
        return Map.of("status", "NOT_FOUND", "documentId", documentId);
    }

    // ---- GET /api/phase3/documents/{documentId}/raw ----

    @SuppressWarnings("unchecked")
    public Object getRawDocument(String documentId) throws IOException {
        Path docDir = resolveDocDir(documentId);
        Path rawFile = docDir.resolve("raw.json");
        if (Files.isRegularFile(rawFile)) {
            return Jsons.readValue(Files.readString(rawFile, StandardCharsets.UTF_8), Map.class);
        }
        return Map.of("status", "NOT_FOUND", "documentId", documentId);
    }

    // ---- GET /api/phase3/documents/{documentId}/versions ----

    public Object getVersions(String documentId) throws IOException {
        Path docDir = resolveDocDir(documentId);
        Path metaFile = docDir.resolve("meta.json");
        if (!Files.isRegularFile(metaFile)) {
            return Map.of("status", "NOT_FOUND", "documentId", documentId);
        }

        return Map.of(
                "documentId", documentId,
                "items", readVersions(docDir));
    }

    // ---- internal ----

    private Path resolveDocDir(String documentId) {
        Path root = documentRoot.toAbsolutePath().normalize();
        Path resolved = root.resolve(documentId).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("Invalid documentId: path traversal detected");
        }
        return resolved;
    }

    private Map<String, Object> buildDefaultParseResult(String documentId, String projectKey, String fileName) {
        String baseName = fileName.replace(".md", "").replace(".txt", "");

        List<Map<String, Object>> detectedCases = new ArrayList<>();
        detectedCases.add(Map.of(
                "id", baseName + "-smoke",
                "name", baseName + " smoke",
                "category", "happy",
                "confidence", "high"));
        detectedCases.add(Map.of(
                "id", baseName + "-negative",
                "name", baseName + " negative path",
                "category", "exception",
                "confidence", "medium"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("documentId", documentId);
        result.put("projectKey", projectKey);
        result.put("detectedCases", detectedCases);
        result.put("reasoning", List.of(
                Map.of("label", "Structure", "body",
                        "Grouped the source text into " + detectedCases.size() + " executable scenarios."),
                Map.of("label", "Coverage", "body",
                        "UI flow, assertions, and data-plan placeholders were extracted together.")));
        result.put("missing", List.of("Expected stock decrement delta"));
        result.put("parsedAt", Instant.now(clock).toString());
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> readVersions(Path docDir) throws IOException {
        Path versionsFile = docDir.resolve("versions.json");
        if (!Files.isRegularFile(versionsFile)) {
            return List.of();
        }
        Object raw = Jsons.readValue(Files.readString(versionsFile, StandardCharsets.UTF_8), Object.class);
        if (raw instanceof List<?> items) {
            List<Map<String, Object>> versions = new ArrayList<>();
            for (Object item : items) {
                if (item instanceof Map<?, ?> map) {
                    Map<String, Object> version = new LinkedHashMap<>();
                    for (Map.Entry<?, ?> entry : map.entrySet()) {
                        version.put(String.valueOf(entry.getKey()), entry.getValue());
                    }
                    versions.add(version);
                }
            }
            return versions;
        }
        return List.of();
    }

    private void writeVersions(Path docDir, List<Map<String, Object>> versions) throws IOException {
        Files.writeString(docDir.resolve("versions.json"), Jsons.writeValueAsString(versions), StandardCharsets.UTF_8);
    }

    private void appendVersion(Path docDir, String time, String summary) throws IOException {
        List<Map<String, Object>> versions = new ArrayList<>(readVersions(docDir));
        String label = "v" + (versions.size() + 1);
        versions.add(0, buildVersionEntry(label, time, summary));
        writeVersions(docDir, versions);
    }

    private Map<String, Object> buildVersionEntry(String label, String time, String summary) {
        return Map.of(
                "id", label,
                "label", label,
                "time", time,
                "summary", summary);
    }

    private static String toDocumentId(String projectKey, String fileName) {
        String base = fileName.replaceAll("\\.[^.]+$", "");
        return (projectKey + "-" + base)
                .toLowerCase()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    private static String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }
}
