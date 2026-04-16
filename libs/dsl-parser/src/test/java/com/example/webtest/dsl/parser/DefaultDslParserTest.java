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
}
