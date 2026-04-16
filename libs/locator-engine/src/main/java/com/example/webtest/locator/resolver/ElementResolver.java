package com.example.webtest.locator.resolver;

import com.example.webtest.dsl.model.TargetDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.locator.model.ResolveResult;

public interface ElementResolver {
    ResolveResult resolve(TargetDefinition target, ExecutionContext context);
}
