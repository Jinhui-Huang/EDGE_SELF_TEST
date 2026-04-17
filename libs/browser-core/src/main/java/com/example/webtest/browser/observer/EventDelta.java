package com.example.webtest.browser.observer;

import java.util.List;

public final class EventDelta<T> {
    private final List<T> events;
    private final EventCheckpoint checkpoint;

    public EventDelta(List<T> events, EventCheckpoint checkpoint) {
        this.events = events == null ? List.of() : List.copyOf(events);
        this.checkpoint = checkpoint == null ? EventCheckpoint.at(0) : checkpoint;
    }

    public List<T> getEvents() {
        return events;
    }

    public EventCheckpoint getCheckpoint() {
        return checkpoint;
    }
}
