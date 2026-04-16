package com.example.webtest.action.handler;

import com.example.webtest.action.result.StepResult;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.locator.model.ResolveResult;
import com.example.webtest.locator.resolver.ElementResolver;
import com.example.webtest.wait.engine.WaitEngine;
import java.util.Objects;

public class ClickActionHandler implements StepActionHandler {
    private final ElementResolver elementResolver;
    private final BrowserInteractionService browserInteractionService;
    private final WaitEngine waitEngine;

    public ClickActionHandler(ElementResolver elementResolver, BrowserInteractionService browserInteractionService) {
        this(elementResolver, browserInteractionService, null);
    }

    public ClickActionHandler(
            ElementResolver elementResolver,
            BrowserInteractionService browserInteractionService,
            WaitEngine waitEngine) {
        this.elementResolver = Objects.requireNonNull(elementResolver, "elementResolver must not be null");
        this.browserInteractionService = Objects.requireNonNull(
                browserInteractionService,
                "browserInteractionService must not be null");
        this.waitEngine = waitEngine;
    }

    @Override
    public boolean supports(ActionType actionType) {
        return actionType == ActionType.CLICK;
    }

    @Override
    public StepResult handle(StepDefinition step, ExecutionContext context) {
        if (waitEngine != null) {
            waitEngine.waitForVisible(step.getTarget(), timeout(step), context);
        }
        ResolveResult result = elementResolver.resolve(step.getTarget(), context);
        browserInteractionService.click(result, context);
        return StepResult.success(step.getId(), "click success");
    }

    private long timeout(StepDefinition step) {
        return step.getTimeoutMs() == null ? 10_000L : step.getTimeoutMs();
    }
}
