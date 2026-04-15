package com.example.webtest.cdp.model;

public class CdpResponse<T> {
    private long id;
    private T result;
    private CdpError error;

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public T getResult() {
        return result;
    }

    public void setResult(T result) {
        this.result = result;
    }

    public CdpError getError() {
        return error;
    }

    public void setError(CdpError error) {
        this.error = error;
    }
}
