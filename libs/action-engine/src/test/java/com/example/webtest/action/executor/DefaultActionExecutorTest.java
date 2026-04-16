package com.example.webtest.action.executor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.webtest.action.handler.BrowserInteractionService;
import com.example.webtest.action.handler.ClickActionHandler;
import com.example.webtest.action.handler.FillActionHandler;
import com.example.webtest.action.handler.WaitActionHandler;
import com.example.webtest.action.result.StepResult;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.dsl.model.TargetDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.locator.model.ResolveResult;
import com.example.webtest.locator.resolver.ElementResolver;
import com.example.webtest.wait.engine.WaitEngine;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class DefaultActionExecutorTest {
    @Test
    void executeDispatchesClickAndFillHandlers() {
        FakeElementResolver resolver = new FakeElementResolver();
        FakeBrowserInteractionService interactions = new FakeBrowserInteractionService();
        DefaultActionExecutor executor = new DefaultActionExecutor(List.of(
                new ClickActionHandler(resolver, interactions),
                new FillActionHandler(resolver, interactions)));

        StepResult click = executor.execute(step(ActionType.CLICK, null), new ExecutionContext("run-1"));
        StepResult fill = executor.execute(step(ActionType.FILL, "codex"), new ExecutionContext("run-1"));

        assertTrue(click.isSuccess());
        assertTrue(fill.isSuccess());
        assertEquals(List.of("click:#submit", "fill:#submit=codex"), interactions.calls);
    }

    @Test
    void clickAndFillWaitForVisibleBeforeInteractingWhenWaitEngineIsProvided() {
        FakeElementResolver resolver = new FakeElementResolver();
        FakeBrowserInteractionService interactions = new FakeBrowserInteractionService();
        FakeWaitEngine waits = new FakeWaitEngine();
        DefaultActionExecutor executor = new DefaultActionExecutor(List.of(
                new ClickActionHandler(resolver, interactions, waits),
                new FillActionHandler(resolver, interactions, waits)));

        StepDefinition click = step(ActionType.CLICK, null);
        click.setTimeoutMs(250L);
        StepDefinition fill = step(ActionType.FILL, "codex");
        fill.setTimeoutMs(300L);

        executor.execute(click, new ExecutionContext("run-1"));
        executor.execute(fill, new ExecutionContext("run-1"));

        assertEquals(List.of("visible:#submit:250", "visible:#submit:300"), waits.calls);
        assertEquals(List.of("click:#submit", "fill:#submit=codex"), interactions.calls);
    }

    @Test
    void executeDispatchesWaitHandlers() {
        FakeWaitEngine waits = new FakeWaitEngine();
        DefaultActionExecutor executor = new DefaultActionExecutor(List.of(new WaitActionHandler(waits)));

        StepDefinition waitElement = step(ActionType.WAIT_FOR_ELEMENT, null);
        waitElement.setTimeoutMs(200L);
        StepDefinition waitVisible = step(ActionType.WAIT_FOR_VISIBLE, null);
        StepDefinition waitHidden = step(ActionType.WAIT_FOR_HIDDEN, null);
        StepDefinition waitUrl = step(ActionType.WAIT_FOR_URL, null);
        waitUrl.setExpected("https://example.test/done");

        StepResult element = executor.execute(waitElement, new ExecutionContext("run-1"));
        StepResult visible = executor.execute(waitVisible, new ExecutionContext("run-1"));
        StepResult hidden = executor.execute(waitHidden, new ExecutionContext("run-1"));
        StepResult url = executor.execute(waitUrl, new ExecutionContext("run-1"));

        assertTrue(element.isSuccess());
        assertTrue(visible.isSuccess());
        assertTrue(hidden.isSuccess());
        assertTrue(url.isSuccess());
        assertEquals(List.of(
                "element:#submit:200",
                "visible:#submit:10000",
                "hidden:#submit:10000",
                "url:https://example.test/done:10000"), waits.calls);
    }

    private StepDefinition step(ActionType action, Object value) {
        TargetDefinition target = new TargetDefinition();
        target.setBy("css");
        target.setValue("#submit");
        StepDefinition step = new StepDefinition();
        step.setId(action.name().toLowerCase());
        step.setAction(action);
        step.setTarget(target);
        step.setValue(value);
        return step;
    }

    private static final class FakeElementResolver implements ElementResolver {
        @Override
        public ResolveResult resolve(TargetDefinition target, ExecutionContext context) {
            ResolveResult result = new ResolveResult();
            result.setFound(true);
            result.setVisible(true);
            result.setActionable(true);
            result.setBy(target.getBy());
            result.setValue(target.getValue());
            result.setIndex(0);
            return result;
        }
    }

    private static final class FakeBrowserInteractionService implements BrowserInteractionService {
        private final List<String> calls = new ArrayList<>();

        @Override
        public void click(ResolveResult resolveResult, ExecutionContext context) {
            calls.add("click:" + resolveResult.getValue());
        }

        @Override
        public void fill(ResolveResult resolveResult, String value, ExecutionContext context) {
            calls.add("fill:" + resolveResult.getValue() + "=" + value);
        }
    }

    private static final class FakeWaitEngine implements WaitEngine {
        private final List<String> calls = new ArrayList<>();

        @Override
        public void waitForElement(TargetDefinition target, long timeoutMs, ExecutionContext context) {
            calls.add("element:" + target.getValue() + ":" + timeoutMs);
        }

        @Override
        public void waitForVisible(TargetDefinition target, long timeoutMs, ExecutionContext context) {
            calls.add("visible:" + target.getValue() + ":" + timeoutMs);
        }

        @Override
        public void waitForHidden(TargetDefinition target, long timeoutMs, ExecutionContext context) {
            calls.add("hidden:" + target.getValue() + ":" + timeoutMs);
        }

        @Override
        public void waitForUrl(String expectedUrl, long timeoutMs, ExecutionContext context) {
            calls.add("url:" + expectedUrl + ":" + timeoutMs);
        }
    }
}
