package com.example.webtest.assertion.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.webtest.assertion.handler.AssertTitleHandler;
import com.example.webtest.assertion.handler.AssertUrlHandler;
import com.example.webtest.assertion.model.AssertionResult;
import com.example.webtest.browser.page.ElementState;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class DefaultAssertionEngineTest {
    @Test
    void assertStepDispatchesTitleAndUrlHandlers() {
        FakePageController pageController = new FakePageController();
        DefaultAssertionEngine engine = new DefaultAssertionEngine(List.of(
                new AssertTitleHandler(pageController),
                new AssertUrlHandler(pageController)));

        AssertionResult title = engine.assertStep(step("title", ActionType.ASSERT_TITLE, "Dashboard"), context());
        AssertionResult url = engine.assertStep(step("url", ActionType.ASSERT_URL, "https://example.test/app"), context());

        assertTrue(title.isSuccess());
        assertTrue(url.isSuccess());
        assertEquals(List.of("title", "currentUrl"), pageController.calls);
    }

    @Test
    void assertStepReturnsFailureWhenActualValueDiffers() {
        FakePageController pageController = new FakePageController();
        pageController.title = "Actual";
        DefaultAssertionEngine engine = new DefaultAssertionEngine(List.of(new AssertTitleHandler(pageController)));

        AssertionResult result = engine.assertStep(step("title", ActionType.ASSERT_TITLE, "Expected"), context());

        assertEquals(false, result.isSuccess());
        assertEquals("Expected title [Expected] but was [Actual]", result.getMessage());
    }

    private StepDefinition step(String id, ActionType action, String expected) {
        StepDefinition step = new StepDefinition();
        step.setId(id);
        step.setAction(action);
        step.setExpected(expected);
        return step;
    }

    private ExecutionContext context() {
        return new ExecutionContext("run-1");
    }

    private static final class FakePageController implements PageController {
        private final List<String> calls = new ArrayList<>();
        private String title = "Dashboard";

        @Override
        public void navigate(String url, ExecutionContext context) {
        }

        @Override
        public void reload(ExecutionContext context) {
        }

        @Override
        public String currentUrl(ExecutionContext context) {
            calls.add("currentUrl");
            return "https://example.test/app";
        }

        @Override
        public String title(ExecutionContext context) {
            calls.add("title");
            return title;
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
}
