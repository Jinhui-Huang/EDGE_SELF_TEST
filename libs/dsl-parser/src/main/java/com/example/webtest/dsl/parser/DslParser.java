package com.example.webtest.dsl.parser;

import com.example.webtest.dsl.model.TestCaseDefinition;
import java.nio.file.Path;

public interface DslParser {
    TestCaseDefinition parse(Path path);

    TestCaseDefinition parseJson(String json);
}
