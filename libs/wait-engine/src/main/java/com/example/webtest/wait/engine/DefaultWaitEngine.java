package com.example.webtest.wait.engine;

import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.dsl.model.TargetDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.locator.model.ResolveResult;
import com.example.webtest.locator.resolver.ElementResolver;
import java.time.Clock;
import java.util.Objects;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class DefaultWaitEngine implements WaitEngine {
    public static final long DEFAULT_TIMEOUT_MS = 10_000L;
    static final long DEFAULT_POLL_INTERVAL_MS = 100L;

    private final ElementResolver elementResolver;
    private final PageController pageController;
    private final Clock clock;
    private final Sleeper sleeper;
    private final long pollIntervalMs;

    public DefaultWaitEngine(ElementResolver elementResolver) {
        this(elementResolver, null);
    }

    public DefaultWaitEngine(ElementResolver elementResolver, PageController pageController) {
        this(elementResolver, pageController, Clock.systemUTC(), Thread::sleep, DEFAULT_POLL_INTERVAL_MS);
    }

    DefaultWaitEngine(
            ElementResolver elementResolver,
            PageController pageController,
            Clock clock,
            Sleeper sleeper,
            long pollIntervalMs) {
        this.elementResolver = Objects.requireNonNull(elementResolver, "elementResolver must not be null");
        this.pageController = pageController;
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
        this.sleeper = Objects.requireNonNull(sleeper, "sleeper must not be null");
        this.pollIntervalMs = Math.max(1L, pollIntervalMs);
    }

    @Override
    public void waitForElement(TargetDefinition target, long timeoutMs, ExecutionContext context) {
        waitUntil(target, timeoutMs, context, ResolveResult::isFound, "element to exist");
    }

    @Override
    public void waitForVisible(TargetDefinition target, long timeoutMs, ExecutionContext context) {
        waitUntil(target, timeoutMs, context, result -> result.isFound() && result.isVisible(), "element to be visible");
    }

    @Override
    public void waitForHidden(TargetDefinition target, long timeoutMs, ExecutionContext context) {
        waitUntil(target, timeoutMs, context, result -> !result.isFound() || !result.isVisible(), "element to be hidden");
    }

    @Override
    public void waitForUrl(String expectedUrl, long timeoutMs, ExecutionContext context) {
        if (expectedUrl == null || expectedUrl.isBlank()) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "WAIT_FOR_URL requires expected url");
        }
        if (pageController == null) {
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "WAIT_FOR_URL requires PageController");
        }
        waitUntilValue(
                timeoutMs,
                () -> pageController.currentUrl(context),
                currentUrl -> Objects.equals(expectedUrl, currentUrl),
                "url to be " + expectedUrl);
    }

    private void waitUntil(
            TargetDefinition target,
            long timeoutMs,
            ExecutionContext context,
            Predicate<ResolveResult> condition,
            String description) {
        long safeTimeout = timeoutMs <= 0 ? DEFAULT_TIMEOUT_MS : timeoutMs;
        long deadline = clock.millis() + safeTimeout;
        ResolveResult lastResult = null;

        while (true) {
            lastResult = elementResolver.resolve(target, context);
            if (lastResult != null && condition.test(lastResult)) {
                return;
            }
            long now = clock.millis();
            if (now >= deadline) {
                throw timeout(description, safeTimeout, lastResult);
            }
            sleep(Math.min(pollIntervalMs, Math.max(1L, deadline - now)));
        }
    }

    private BaseException timeout(String description, long timeoutMs, ResolveResult lastResult) {
        String target = lastResult == null || lastResult.getValue() == null
                ? "unknown target"
                : lastResult.getBy() + ":" + lastResult.getValue();
        String state = lastResult == null
                ? "no locator result"
                : "found=" + lastResult.isFound()
                        + ", visible=" + lastResult.isVisible()
                        + ", actionable=" + lastResult.isActionable();
        return new BaseException(
                ErrorCodes.ACTION_EXECUTION_FAILED,
                "Timed out after " + timeoutMs + "ms waiting for " + description + " [" + target + "] (" + state + ")");
    }

    private void waitUntilValue(
            long timeoutMs,
            Supplier<String> valueSupplier,
            Predicate<String> condition,
            String description) {
        long safeTimeout = timeoutMs <= 0 ? DEFAULT_TIMEOUT_MS : timeoutMs;
        long deadline = clock.millis() + safeTimeout;
        String lastValue = null;

        while (true) {
            lastValue = valueSupplier.get();
            if (condition.test(lastValue)) {
                return;
            }
            long now = clock.millis();
            if (now >= deadline) {
                throw new BaseException(
                        ErrorCodes.ACTION_EXECUTION_FAILED,
                        "Timed out after " + safeTimeout + "ms waiting for " + description
                                + " (last value=" + lastValue + ")");
            }
            sleep(Math.min(pollIntervalMs, Math.max(1L, deadline - now)));
        }
    }

    private void sleep(long millis) {
        try {
            sleeper.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BaseException(ErrorCodes.ACTION_EXECUTION_FAILED, "Interrupted while waiting", e);
        }
    }

    @FunctionalInterface
    interface Sleeper {
        void sleep(long millis) throws InterruptedException;
    }
}
