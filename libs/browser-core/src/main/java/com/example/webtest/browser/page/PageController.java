package com.example.webtest.browser.page;

import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.browser.observer.ConsoleEvent;
import com.example.webtest.browser.observer.EventCheckpoint;
import com.example.webtest.browser.observer.EventDelta;
import com.example.webtest.browser.observer.NetworkEvent;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

public interface PageController {
    default void startConsoleCapture(ExecutionContext context) {
    }

    default List<ConsoleEvent> consoleEvents(ExecutionContext context) {
        return List.of();
    }

    default EventCheckpoint consoleCheckpoint(ExecutionContext context) {
        return EventCheckpoint.at(consoleEvents(context).size());
    }

    default EventDelta<ConsoleEvent> consoleEventsSince(ExecutionContext context, EventCheckpoint checkpoint) {
        return eventDelta(consoleEvents(context), checkpoint);
    }

    default void startNetworkCapture(ExecutionContext context) {
    }

    default List<NetworkEvent> networkEvents(ExecutionContext context) {
        return List.of();
    }

    default EventCheckpoint networkCheckpoint(ExecutionContext context) {
        return EventCheckpoint.at(networkEvents(context).size());
    }

    default EventDelta<NetworkEvent> networkEventsSince(ExecutionContext context, EventCheckpoint checkpoint) {
        return eventDelta(networkEvents(context), checkpoint);
    }

    default void cleanupNetworkBodySpools(ExecutionContext context) {
    }

    default void configureNetworkBodySpoolCleanupGrace(ExecutionContext context, Duration gracePeriod) {
    }

    void navigate(String url, ExecutionContext context);

    void reload(ExecutionContext context);

    String currentUrl(ExecutionContext context);

    String title(ExecutionContext context);

    byte[] screenshot(ExecutionContext context, ScreenshotOptions options);

    String getHtml(ExecutionContext context);

    ElementState findElement(String by, String value, Integer index, ExecutionContext context);

    String elementText(String by, String value, Integer index, ExecutionContext context);

    String elementValue(String by, String value, Integer index, ExecutionContext context);

    String elementAttribute(String by, String value, Integer index, String attributeName, ExecutionContext context);

    void clickElement(String by, String value, Integer index, ExecutionContext context);

    void fillElement(String by, String value, Integer index, String text, ExecutionContext context);

    private static <T> EventDelta<T> eventDelta(List<T> events, EventCheckpoint checkpoint) {
        if (events == null || events.isEmpty()) {
            return new EventDelta<>(List.of(), EventCheckpoint.at(0));
        }
        int startIndex = checkpoint == null ? 0 : checkpoint.getPosition();
        int safeStartIndex = Math.max(0, Math.min(startIndex, events.size()));
        return new EventDelta<>(
                new ArrayList<>(events.subList(safeStartIndex, events.size())),
                EventCheckpoint.at(events.size()));
    }
}
