package com.example.webtest.browser.observer;

import java.time.Instant;

public class ConsoleEvent {
    private Instant time;
    private String level;
    private String message;

    public Instant getTime() {
        return time;
    }

    public void setTime(Instant time) {
        this.time = time;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
