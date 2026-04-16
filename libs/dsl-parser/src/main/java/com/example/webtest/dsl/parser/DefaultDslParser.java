package com.example.webtest.dsl.parser;

import com.example.webtest.dsl.model.TestCaseDefinition;
import com.example.webtest.dsl.validator.DslValidator;
import com.example.webtest.json.Jsons;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class DefaultDslParser implements DslParser {
    private final DslValidator validator;

    public DefaultDslParser(DslValidator validator) {
        this.validator = validator;
    }

    @Override
    public TestCaseDefinition parse(Path path) {
        try {
            String content = Files.readString(path);
            if (isYaml(path)) {
                return parseYaml(content);
            }
            return parseJson(content);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read DSL file: " + path, e);
        }
    }

    @Override
    public TestCaseDefinition parseJson(String json) {
        TestCaseDefinition definition = Jsons.readValue(json, TestCaseDefinition.class);
        validator.validate(definition);
        return definition;
    }

    @Override
    public TestCaseDefinition parseYaml(String yaml) {
        TestCaseDefinition definition = Jsons.readYamlValue(yaml, TestCaseDefinition.class);
        validator.validate(definition);
        return definition;
    }

    private boolean isYaml(Path path) {
        String fileName = path.getFileName().toString().toLowerCase();
        return fileName.endsWith(".yaml") || fileName.endsWith(".yml");
    }
}
