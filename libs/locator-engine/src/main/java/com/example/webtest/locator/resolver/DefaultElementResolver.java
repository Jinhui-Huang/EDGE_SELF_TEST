package com.example.webtest.locator.resolver;

import com.example.webtest.browser.page.ElementState;
import com.example.webtest.browser.page.PageController;
import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.dsl.model.TargetAlternative;
import com.example.webtest.dsl.model.TargetDefinition;
import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.locator.model.ResolveResult;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

public class DefaultElementResolver implements ElementResolver {
    private final PageController pageController;

    public DefaultElementResolver(PageController pageController) {
        this.pageController = Objects.requireNonNull(pageController, "pageController must not be null");
    }

    @Override
    public ResolveResult resolve(TargetDefinition target, ExecutionContext context) {
        if (target == null) {
            throw new BaseException(ErrorCodes.ELEMENT_NOT_FOUND, "Target is required");
        }

        List<Candidate> candidates = candidates(target);
        for (Candidate candidate : candidates) {
            ElementState state = pageController.findElement(candidate.by(), candidate.value(), candidate.index(), context);
            ResolveResult result = toResolveResult(candidate, state);
            if (result.isFound()) {
                return result;
            }
        }

        ResolveResult result = new ResolveResult();
        result.setFound(false);
        result.setMatchedStrategies(candidates.stream().map(candidate -> candidate.by() + ":" + candidate.value()).toList());
        return result;
    }

    private ResolveResult toResolveResult(Candidate candidate, ElementState state) {
        ElementState safeState = state == null ? new ElementState() : state;
        ResolveResult result = new ResolveResult();
        result.setFound(safeState.isFound());
        result.setUnique(safeState.getCount() == 1);
        result.setVisible(safeState.isVisible());
        result.setEnabled(safeState.isEnabled());
        result.setActionable(safeState.isActionable());
        result.setBy(candidate.by());
        result.setValue(candidate.value());
        result.setIndex(candidate.index());
        result.setScore(score(safeState));
        result.setMatchedStrategies(List.of(candidate.by() + ":" + candidate.value()));
        return result;
    }

    private double score(ElementState state) {
        if (state == null || !state.isFound()) {
            return 0.0;
        }
        double score = 0.5;
        if (state.getCount() == 1) {
            score += 0.2;
        }
        if (state.isVisible()) {
            score += 0.2;
        }
        if (state.isActionable()) {
            score += 0.1;
        }
        return score;
    }

    private List<Candidate> candidates(TargetDefinition target) {
        List<Candidate> candidates = new ArrayList<>();
        addCandidate(candidates, target.getBy(), target.getValue(), target.getIndex());
        if (target.getAlternatives() != null) {
            for (TargetAlternative alternative : target.getAlternatives()) {
                addCandidate(candidates, alternative.getBy(), alternative.getValue(), target.getIndex());
            }
        }
        return candidates;
    }

    private void addCandidate(List<Candidate> candidates, String by, String value, Integer index) {
        if (value == null || value.isBlank()) {
            return;
        }
        String normalizedBy = by == null || by.isBlank()
                ? "css"
                : by.toLowerCase(Locale.ROOT).replace("_", "-");
        candidates.add(new Candidate(normalizedBy, value, index == null ? 0 : index));
    }

    private record Candidate(String by, String value, Integer index) {
    }
}
