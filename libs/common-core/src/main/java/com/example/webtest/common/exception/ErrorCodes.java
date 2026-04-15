package com.example.webtest.common.exception;

public final class ErrorCodes {
    private ErrorCodes() {
    }

    public static final String CDP_CONNECT_TIMEOUT = "CDP_CONNECT_TIMEOUT";
    public static final String CDP_REQUEST_FAILED = "CDP_REQUEST_FAILED";
    public static final String ELEMENT_NOT_FOUND = "ELEMENT_NOT_FOUND";
    public static final String ELEMENT_NOT_VISIBLE = "ELEMENT_NOT_VISIBLE";
    public static final String ACTION_EXECUTION_FAILED = "ACTION_EXECUTION_FAILED";
    public static final String ASSERTION_FAILED = "ASSERTION_FAILED";
    public static final String DB_ASSERTION_FAILED = "DB_ASSERTION_FAILED";
    public static final String REPORT_GENERATION_FAILED = "REPORT_GENERATION_FAILED";
    public static final String DSL_VALIDATION_FAILED = "DSL_VALIDATION_FAILED";
    public static final String JSON_NOT_CONFIGURED = "JSON_NOT_CONFIGURED";
}
