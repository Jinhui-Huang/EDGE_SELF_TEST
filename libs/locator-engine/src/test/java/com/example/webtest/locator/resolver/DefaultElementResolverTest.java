package com.example.webtest.locator.resolver;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.webtest.browser.page.ElementState;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.browser.page.ScreenshotOptions;
import com.example.webtest.dsl.model.TargetDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.locator.model.ResolveResult;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class DefaultElementResolverTest {
    @Test
    void resolveUsesPageControllerAndMapsElementState() {
        FakePageController pageController = new FakePageController();
        TargetDefinition target = new TargetDefinition();
        target.setBy("css");
        target.setValue("#submit");

        ResolveResult result = new DefaultElementResolver(pageController).resolve(target, new ExecutionContext("run-1"));

        assertTrue(result.isFound());
        assertTrue(result.isUnique());
        assertTrue(result.isEnabled());
        assertTrue(result.isActionable());
        assertEquals("css:#submit:0", pageController.calls.get(0));
    }

    private static final class FakePageController implements PageController {
        private final List<String> calls = new ArrayList<>();

        @Override
        public void navigate(String url, ExecutionContext context) {
        }

        @Override
        public void reload(ExecutionContext context) {
        }

        @Override
        public String currentUrl(ExecutionContext context) {
            return null;
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
            calls.add(by + ":" + value + ":" + index);
            ElementState state = new ElementState();
            state.setFound(true);
            state.setCount(1);
            state.setVisible(true);
            state.setEnabled(true);
            state.setActionable(true);
            return state;
        }

        @Override
        public String elementText(String by, String value, Integer index, ExecutionContext context) {
            return null;
        }

        @Override
        public String elementValue(String by, String value, Integer index, ExecutionContext context) {
            return null;
        }

        @Override
        public String elementAttribute(
                String by, String value, Integer index, String attributeName, ExecutionContext context) {
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
