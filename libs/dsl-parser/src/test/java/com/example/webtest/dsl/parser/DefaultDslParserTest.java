package com.example.webtest.dsl.parser;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.webtest.common.exception.BaseException;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.TestCaseDefinition;
import com.example.webtest.dsl.validator.DefaultDslValidator;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class DefaultDslParserTest {
    private final DefaultDslParser parser = new DefaultDslParser(new DefaultDslValidator());

    @TempDir
    Path tempDir;

    @Test
    void parseJsonReadsCaseInsensitiveActionsAndUnknownFields() {
        String json = """
                {
                  "id": "case-json",
                  "name": "JSON parser smoke",
                  "unknownField": true,
                  "steps": [
                    {
                      "id": "open",
                      "action": "goto",
                      "url": "https://example.test"
                    },
                    {
                      "id": "submit",
                      "action": "click",
                      "target": {
                        "by": "css",
                        "value": "#submit"
                      }
                    }
                  ]
                }
                """;

        TestCaseDefinition definition = parser.parseJson(json);

        assertEquals("case-json", definition.getId());
        assertEquals(2, definition.getSteps().size());
        assertEquals(ActionType.GOTO, definition.getSteps().get(0).getAction());
        assertEquals("https://example.test", definition.getSteps().get(0).getUrl());
        assertEquals(ActionType.CLICK, definition.getSteps().get(1).getAction());
        assertEquals("#submit", definition.getSteps().get(1).getTarget().getValue());
    }

    @Test
    void parseYamlReadsYamlInput() {
        String yaml = """
                id: case-yaml
                name: YAML parser smoke
                reportPolicy:
                  retentionCleanupOnRun: true
                  retentionKeepLatest: 20
                  retentionOlderThanDays: 30
                  retentionMaxTotalMb: 512
                  retentionPruneArtifactsOnly: true
                  retentionDeleteStatuses:
                    - FAILED
                steps:
                  - id: open
                    action: goto
                    url: https://example.test
                  - id: search
                    action: fill
                    target:
                      by: css
                      value: "#query"
                    value: codex
                """;

        TestCaseDefinition definition = parser.parseYaml(yaml);

        assertEquals("case-yaml", definition.getId());
        assertEquals(2, definition.getSteps().size());
        assertEquals(ActionType.FILL, definition.getSteps().get(1).getAction());
        assertEquals("codex", definition.getSteps().get(1).getValue());
        assertEquals(true, definition.getReportPolicy().isRetentionCleanupOnRun());
        assertEquals(20, definition.getReportPolicy().getRetentionKeepLatest());
        assertEquals(30, definition.getReportPolicy().getRetentionOlderThanDays());
        assertEquals(512L, definition.getReportPolicy().getRetentionMaxTotalMb());
        assertEquals(true, definition.getReportPolicy().isRetentionPruneArtifactsOnly());
        assertEquals(List.of("FAILED"), definition.getReportPolicy().getRetentionDeleteStatuses());
    }

    @Test
    void parsePathSelectsYamlByExtension() throws IOException {
        Path file = tempDir.resolve("case.yml");
        Files.writeString(file, """
                id: case-file
                steps:
                  - action: goto
                    url: https://example.test
                """);

        TestCaseDefinition definition = parser.parse(file);

        assertEquals("case-file", definition.getId());
        assertEquals(ActionType.GOTO, definition.getSteps().get(0).getAction());
    }

    @Test
    void parseJsonRejectsInvalidGotoStep() {
        String json = """
                {
                  "id": "invalid-case",
                  "steps": [
                    {
                      "action": "goto"
                    }
                  ]
                }
                """;

        assertThrows(BaseException.class, () -> parser.parseJson(json));
    }

    @Test
    void parseJsonRejectsAssertionWithoutExpectedValue() {
        String json = """
                {
                  "id": "invalid-assertion",
                  "steps": [
                    {
                      "action": "assert_title"
                    }
                  ]
                }
                """;

        assertThrows(BaseException.class, () -> parser.parseJson(json));
    }

    @Test
    void parseJsonRejectsElementAssertionWithoutRequiredFields() {
        String json = """
                {
                  "id": "invalid-element-assertion",
                  "steps": [
                    {
                      "action": "assert_text",
                      "target": {
                        "by": "css",
                        "value": "#headline"
                      }
                    }
                  ]
                }
                """;

        assertThrows(BaseException.class, () -> parser.parseJson(json));
    }

    @Test
    void parseJsonRejectsAttributeAssertionWithoutAttributeName() {
        String json = """
                {
                  "id": "invalid-attribute-assertion",
                  "steps": [
                    {
                      "action": "assert_attr",
                      "target": {
                        "by": "css",
                        "value": "#search"
                      },
                      "expected": "Search"
                    }
                  ]
                }
                """;

        assertThrows(BaseException.class, () -> parser.parseJson(json));
    }

    @Test
    void parseJsonRejectsEnabledAssertionWithoutTarget() {
        String json = """
                {
                  "id": "invalid-enabled-assertion",
                  "steps": [
                    {
                      "action": "assert_enabled"
                    }
                  ]
                }
                """;

        assertThrows(BaseException.class, () -> parser.parseJson(json));
    }

    @Test
    void parseJsonRejectsInvalidReportRetentionPolicy() {
        String json = """
                {
                  "id": "invalid-retention",
                  "reportPolicy": {
                    "retentionCleanupOnRun": true,
                    "retentionKeepLatest": 0
                  },
                  "steps": [
                    {
                      "action": "goto",
                      "url": "https://example.test"
                    }
                  ]
                }
                """;

        assertThrows(BaseException.class, () -> parser.parseJson(json));
    }

    @Test
    void parseJsonRejectsInvalidReportRetentionStatus() {
        String json = """
                {
                  "id": "invalid-retention-status",
                  "reportPolicy": {
                    "retentionCleanupOnRun": true,
                    "retentionDeleteStatuses": ["BROKEN"]
                  },
                  "steps": [
                    {
                      "action": "goto",
                      "url": "https://example.test"
                    }
                  ]
                }
                """;

        assertThrows(BaseException.class, () -> parser.parseJson(json));
    }

    @Test
    void parseJsonRejectsInvalidReportRetentionSizeQuota() {
        String json = """
                {
                  "id": "invalid-retention-size",
                  "reportPolicy": {
                    "retentionCleanupOnRun": true,
                    "retentionMaxTotalMb": -1
                  },
                  "steps": [
                    {
                      "action": "goto",
                      "url": "https://example.test"
                    }
                  ]
                }
                """;

        assertThrows(BaseException.class, () -> parser.parseJson(json));
    }

    @Test
    void parseJsonRejectsArtifactPruneWithoutRetentionCleanup() {
        String json = """
                {
                  "id": "invalid-artifact-prune",
                  "reportPolicy": {
                    "retentionPruneArtifactsOnly": true,
                    "retentionKeepLatest": 1
                  },
                  "steps": [
                    {
                      "action": "goto",
                      "url": "https://example.test"
                    }
                  ]
                }
                """;

        assertThrows(BaseException.class, () -> parser.parseJson(json));
    }
}
