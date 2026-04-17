package com.example.webtest.browser.observer;

public final class EventCheckpoint {
    private final int position;

    private EventCheckpoint(int position) {
        this.position = Math.max(0, position);
    }

    public static EventCheckpoint at(int position) {
        return new EventCheckpoint(position);
    }

    public int getPosition() {
        return position;
    }
}
