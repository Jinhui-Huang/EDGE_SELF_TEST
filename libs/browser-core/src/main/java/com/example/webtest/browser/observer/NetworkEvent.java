package com.example.webtest.browser.observer;

import java.nio.file.Path;
import java.time.Instant;
import java.util.Map;

public class NetworkEvent {
    private Instant time;
    private String event;
    private String requestId;
    private String url;
    private String method;
    private Map<String, Object> requestHeaders;
    private String requestBody;
    private String requestBodyFull;
    private Path requestBodySpoolPath;
    private Boolean requestBodyTruncated;
    private String requestBodyArtifactPath;
    private Integer status;
    private Map<String, Object> responseHeaders;
    private String mimeType;
    private Double encodedDataLength;
    private String responseBody;
    private String responseBodyFull;
    private Path responseBodySpoolPath;
    private Boolean responseBodyBase64Encoded;
    private Boolean responseBodyTruncated;
    private String responseBodyArtifactPath;
    private String bodyError;
    private String errorText;

    public Instant getTime() {
        return time;
    }

    public void setTime(Instant time) {
        this.time = time;
    }

    public String getEvent() {
        return event;
    }

    public void setEvent(String event) {
        this.event = event;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public Map<String, Object> getRequestHeaders() {
        return requestHeaders;
    }

    public void setRequestHeaders(Map<String, Object> requestHeaders) {
        this.requestHeaders = requestHeaders;
    }

    public String getRequestBody() {
        return requestBody;
    }

    public void setRequestBody(String requestBody) {
        this.requestBody = requestBody;
    }

    public String getRequestBodyFull() {
        return requestBodyFull;
    }

    public void setRequestBodyFull(String requestBodyFull) {
        this.requestBodyFull = requestBodyFull;
    }

    public Path getRequestBodySpoolPath() {
        return requestBodySpoolPath;
    }

    public void setRequestBodySpoolPath(Path requestBodySpoolPath) {
        this.requestBodySpoolPath = requestBodySpoolPath;
    }

    public Boolean getRequestBodyTruncated() {
        return requestBodyTruncated;
    }

    public void setRequestBodyTruncated(Boolean requestBodyTruncated) {
        this.requestBodyTruncated = requestBodyTruncated;
    }

    public String getRequestBodyArtifactPath() {
        return requestBodyArtifactPath;
    }

    public void setRequestBodyArtifactPath(String requestBodyArtifactPath) {
        this.requestBodyArtifactPath = requestBodyArtifactPath;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public Map<String, Object> getResponseHeaders() {
        return responseHeaders;
    }

    public void setResponseHeaders(Map<String, Object> responseHeaders) {
        this.responseHeaders = responseHeaders;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public Double getEncodedDataLength() {
        return encodedDataLength;
    }

    public void setEncodedDataLength(Double encodedDataLength) {
        this.encodedDataLength = encodedDataLength;
    }

    public String getResponseBody() {
        return responseBody;
    }

    public void setResponseBody(String responseBody) {
        this.responseBody = responseBody;
    }

    public String getResponseBodyFull() {
        return responseBodyFull;
    }

    public void setResponseBodyFull(String responseBodyFull) {
        this.responseBodyFull = responseBodyFull;
    }

    public Path getResponseBodySpoolPath() {
        return responseBodySpoolPath;
    }

    public void setResponseBodySpoolPath(Path responseBodySpoolPath) {
        this.responseBodySpoolPath = responseBodySpoolPath;
    }

    public Boolean getResponseBodyBase64Encoded() {
        return responseBodyBase64Encoded;
    }

    public void setResponseBodyBase64Encoded(Boolean responseBodyBase64Encoded) {
        this.responseBodyBase64Encoded = responseBodyBase64Encoded;
    }

    public Boolean getResponseBodyTruncated() {
        return responseBodyTruncated;
    }

    public void setResponseBodyTruncated(Boolean responseBodyTruncated) {
        this.responseBodyTruncated = responseBodyTruncated;
    }

    public String getResponseBodyArtifactPath() {
        return responseBodyArtifactPath;
    }

    public void setResponseBodyArtifactPath(String responseBodyArtifactPath) {
        this.responseBodyArtifactPath = responseBodyArtifactPath;
    }

    public String getBodyError() {
        return bodyError;
    }

    public void setBodyError(String bodyError) {
        this.bodyError = bodyError;
    }

    public String getErrorText() {
        return errorText;
    }

    public void setErrorText(String errorText) {
        this.errorText = errorText;
    }
}
