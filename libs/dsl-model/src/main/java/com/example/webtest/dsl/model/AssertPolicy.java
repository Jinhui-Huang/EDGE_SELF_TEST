package com.example.webtest.dsl.model;

public class AssertPolicy {
    private boolean stopOnFailure = true;

    public boolean isStopOnFailure() {
        return stopOnFailure;
    }

    public void setStopOnFailure(boolean stopOnFailure) {
        this.stopOnFailure = stopOnFailure;
    }
}
