package com.example.webtest.wait.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.webtest.browser.page.ElementState;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.dsl.model.TargetDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.locator.model.ResolveResult;
import com.example.webtest.locator.resolver.ElementResolver;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.List;
import java.util.Queue;
import org.junit.jupiter.api.Test;

class DefaultWaitEngineTest {
    @Test
    void waitForElementPollsUntilFound() {
        MutableClock clock = new MutableClock();
        FakeElementResolver resolver = new FakeElementResolver(List.of(result(false, false), result(true, false)));
        DefaultWaitEngine waitEngine = new DefaultWaitEngine(resolver, null, clock, clock::advance, 50L);

        waitEngine.waitForElement(target(), 500L, new ExecutionContext("run-1"));

        assertEquals(2, resolver.calls);
    }

    @Test
    void waitForVisibleRequiresFoundAndVisible() {
        MutableClock clock = new MutableClock();
        FakeElementResolver resolver = new FakeElementResolver(List.of(
                result(true, false),
                result(true, true)));
        DefaultWaitEngine waitEngine = new DefaultWaitEngine(resolver, null, clock, clock::advance, 50L);

        waitEngine.waitForVisible(target(), 500L, new ExecutionContext("run-1"));

        assertEquals(2, resolver.calls);
    }

    @Test
    void waitForVisibleTimesOutWithClearMessage() {
        MutableClock clock = new MutableClock();
        FakeElementResolver resolver = new FakeElementResolver(List.of(result(true, false)));
        DefaultWaitEngine waitEngine = new DefaultWaitEngine(resolver, null, clock, clock::advance, 50L);

        BaseException error = assertThrows(
                BaseException.class,
                () -> waitEngine.waitForVisible(target(), 100L, new ExecutionContext("run-1")));

        assertEquals("ACTION_EXECUTION_FAILED", error.getCode());
        assertEquals(true, error.getMessage().contains("Timed out after 100ms waiting for element to be visible"));
    }

    @Test
    void waitForHiddenReturnsWhenElementDisappearsOrIsNotVisible() {
        MutableClock clock = new MutableClock();
        FakeElementResolver resolver = new FakeElementResolver(List.of(
                result(true, true),
                result(true, false)));
        DefaultWaitEngine waitEngine = new DefaultWaitEngine(resolver, null, clock, clock::advance, 50L);

        waitEngine.waitForHidden(target(), 500L, new ExecutionContext("run-1"));

        assertEquals(2, resolver.calls);
    }

    @Test
    void waitForUrlPollsUntilCurrentUrlMatchesExpected() {
        MutableClock clock = new MutableClock();
        FakePageController pageController = new FakePageController(List.of(
                "https://example.test/loading",
                "https://example.test/done"));
        DefaultWaitEngine waitEngine = new DefaultWaitEngine(
                new FakeElementResolver(List.of(result(true, true))),
                pageController,
                clock,
                clock::advance,
                50L);

        waitEngine.waitForUrl("https://example.test/done", 500L, new ExecutionContext("run-1"));

        assertEquals(2, pageController.calls);
    }

    private TargetDefinition target() {
        TargetDefinition target = new TargetDefinition();
        target.setBy("css");
        target.setValue("#submit");
        return target;
    }

    private static ResolveResult result(boolean found, boolean visible) {
        ResolveResult result = new ResolveResult();
        result.setFound(found);
        result.setVisible(visible);
        result.setActionable(found && visible);
        result.setBy("css");
        result.setValue("#submit");
        result.setIndex(0);
        return result;
    }

    private static final class FakeElementResolver implements ElementResolver {
        private final Queue<ResolveResult> results;
        private ResolveResult last;
        private int calls;

        private FakeElementResolver(List<ResolveResult> results) {
            this.results = new ArrayDeque<>(results);
        }

        @Override
        public ResolveResult resolve(TargetDefinition target, ExecutionContext context) {
            calls++;
            if (!results.isEmpty()) {
                last = results.remove();
            }
            return last;
        }
    }

    private static final class FakePageController implements PageController {
        private final Queue<String> urls;
        private String last;
        private int calls;

        private FakePageController(List<String> urls) {
            this.urls = new ArrayDeque<>(urls);
        }

        @Override
        public void navigate(String url, ExecutionContext context) {
        }

        @Override
        public void reload(ExecutionContext context) {
        }

        @Override
        public String currentUrl(ExecutionContext context) {
            calls++;
            if (!urls.isEmpty()) {
                last = urls.remove();
            }
            return last;
        }

        @Override
        public String title(ExecutionContext context) {
            return null;
        }

        @Override
        public byte[] screenshot(ExecutionContext context, ScreenshotOptions options) {
            return new byte[0];
        }

        @Override
        public String getHtml(ExecutionContext context) {
            return null;
        }

        @Override
        public ElementState findElement(String by, String value, Integer index, ExecutionContext context) {
            return null;
        }

        @Override
        public void clickElement(String by, String value, Integer index, ExecutionContext context) {
        }

        @Override
        public void fillElement(String by, String value, Integer index, String text, ExecutionContext context) {
        }
    }

    private static final class MutableClock extends Clock {
        private long millis;

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(millis);
        }

        void advance(long amount) {
            millis += amount;
        }
    }
}
