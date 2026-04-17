package com.example.webtest.assertion.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.webtest.assertion.handler.AssertTitleHandler;
import com.example.webtest.assertion.handler.AssertUrlHandler;
import com.example.webtest.assertion.handler.AssertTextHandler;
import com.example.webtest.assertion.handler.AssertAttrHandler;
import com.example.webtest.assertion.handler.AssertEnabledHandler;
import com.example.webtest.assertion.handler.AssertValueHandler;
import com.example.webtest.assertion.handler.AssertVisibleHandler;
import com.example.webtest.assertion.model.AssertionResult;
import com.example.webtest.browser.page.ElementState;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.dsl.model.TargetDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.locator.resolver.DefaultElementResolver;
import com.example.webtest.locator.resolver.ElementResolver;
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

    @Test
    void assertStepDispatchesTextAndVisibilityHandlers() {
        FakePageController pageController = new FakePageController();
        ElementResolver elementResolver = new DefaultElementResolver(pageController);
        DefaultAssertionEngine engine = new DefaultAssertionEngine(List.of(
                new AssertTextHandler(elementResolver, pageController),
                new AssertVisibleHandler(elementResolver)));

        AssertionResult text = engine.assertStep(targetStep("text", ActionType.ASSERT_TEXT, "#headline", "Hello"), context());
        AssertionResult visible = engine.assertStep(targetStep("visible", ActionType.ASSERT_VISIBLE, "#headline", null), context());
        AssertionResult notVisible = engine.assertStep(targetStep("hidden", ActionType.ASSERT_NOT_VISIBLE, "#hidden", null), context());

        assertTrue(text.isSuccess());
        assertTrue(visible.isSuccess());
        assertTrue(notVisible.isSuccess());
        assertEquals(List.of(
                "findElement:css:#headline:0",
                "elementText:css:#headline:0",
                "findElement:css:#headline:0",
                "findElement:css:#hidden:0"), pageController.calls);
    }

    @Test
    void assertStepDispatchesEnabledHandlers() {
        FakePageController pageController = new FakePageController();
        ElementResolver elementResolver = new DefaultElementResolver(pageController);
        DefaultAssertionEngine engine = new DefaultAssertionEngine(List.of(new AssertEnabledHandler(elementResolver)));

        AssertionResult enabled = engine.assertStep(targetStep("enabled", ActionType.ASSERT_ENABLED, "#headline", null), context());
        AssertionResult disabled = engine.assertStep(targetStep("disabled", ActionType.ASSERT_DISABLED, "#disabled", null), context());

        assertTrue(enabled.isSuccess());
        assertTrue(disabled.isSuccess());
        assertEquals(List.of(
                "findElement:css:#headline:0",
                "findElement:css:#disabled:0"), pageController.calls);
    }

    @Test
    void assertStepReturnsFailureWhenEnabledStateDiffers() {
        FakePageController pageController = new FakePageController();
        ElementResolver elementResolver = new DefaultElementResolver(pageController);
        DefaultAssertionEngine engine = new DefaultAssertionEngine(List.of(new AssertEnabledHandler(elementResolver)));

        AssertionResult result = engine.assertStep(targetStep("disabled", ActionType.ASSERT_DISABLED, "#headline", null), context());

        assertEquals(false, result.isSuccess());
        assertEquals("Expected element to be disabled", result.getMessage());
    }

    @Test
    void assertStepReturnsFailureWhenTextDiffers() {
        FakePageController pageController = new FakePageController();
        ElementResolver elementResolver = new DefaultElementResolver(pageController);
        DefaultAssertionEngine engine = new DefaultAssertionEngine(List.of(
                new AssertTextHandler(elementResolver, pageController)));

        AssertionResult result = engine.assertStep(targetStep("text", ActionType.ASSERT_TEXT, "#headline", "Expected"), context());

        assertEquals(false, result.isSuccess());
        assertEquals("Expected text [Expected] but was [Hello]", result.getMessage());
    }

    @Test
    void assertStepDispatchesValueAndAttributeHandlers() {
        FakePageController pageController = new FakePageController();
        ElementResolver elementResolver = new DefaultElementResolver(pageController);
        DefaultAssertionEngine engine = new DefaultAssertionEngine(List.of(
                new AssertValueHandler(elementResolver, pageController),
                new AssertAttrHandler(elementResolver, pageController)));

        AssertionResult value = engine.assertStep(targetStep("value", ActionType.ASSERT_VALUE, "#search", "codex"), context());
        StepDefinition attrStep = targetStep("attr", ActionType.ASSERT_ATTR, "#search", "Search");
        attrStep.setValue("aria-label");
        AssertionResult attr = engine.assertStep(attrStep, context());

        assertTrue(value.isSuccess());
        assertTrue(attr.isSuccess());
        assertEquals(List.of(
                "findElement:css:#search:0",
                "elementValue:css:#search:0",
                "findElement:css:#search:0",
                "elementAttribute:css:#search:0:aria-label"), pageController.calls);
    }

    private StepDefinition step(String id, ActionType action, String expected) {
        StepDefinition step = new StepDefinition();
        step.setId(id);
        step.setAction(action);
        step.setExpected(expected);
        return step;
    }

    private StepDefinition targetStep(String id, ActionType action, String selector, String expected) {
        TargetDefinition target = new TargetDefinition();
        target.setBy("css");
        target.setValue(selector);
        StepDefinition step = step(id, action, expected);
        step.setTarget(target);
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
            calls.add("findElement:" + by + ":" + value + ":" + index);
            ElementState state = new ElementState();
            boolean hidden = "#hidden".equals(value);
            state.setFound(!hidden);
            state.setCount(hidden ? 0 : 1);
            state.setVisible(!hidden);
            state.setEnabled(!"#disabled".equals(value));
            state.setActionable(!hidden && state.isEnabled());
            return state;
        }

        @Override
        public String elementText(String by, String value, Integer index, ExecutionContext context) {
            calls.add("elementText:" + by + ":" + value + ":" + index);
            return "Hello";
        }

        @Override
        public String elementValue(String by, String value, Integer index, ExecutionContext context) {
            calls.add("elementValue:" + by + ":" + value + ":" + index);
            return "codex";
        }

        @Override
        public String elementAttribute(
                String by, String value, Integer index, String attributeName, ExecutionContext context) {
            calls.add("elementAttribute:" + by + ":" + value + ":" + index + ":" + attributeName);
            return "Search";
        }

        @Override
        public void clickElement(String by, String value, Integer index, ExecutionContext context) {
        }

        @Override
        public void fillElement(String by, String value, Integer index, String text, ExecutionContext context) {
        }
    }
}
