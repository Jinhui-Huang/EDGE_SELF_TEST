package com.example.webtest.dsl.validator;

import com.example.webtest.dsl.model.TestCaseDefinition;

public interface DslValidator {
    void validate(TestCaseDefinition definition);
}
