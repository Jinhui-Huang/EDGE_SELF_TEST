package com.example.webtest.dsl.validator;

import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.StepDefinition;
import com.example.webtest.dsl.model.TestCaseDefinition;

public class DefaultDslValidator implements DslValidator {
    @Override
    public void validate(TestCaseDefinition definition) {
        if (definition == null) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Definition is null");
        }
        if (definition.getSteps() == null || definition.getSteps().isEmpty()) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Steps must not be empty");
        }

        for (StepDefinition step : definition.getSteps()) {
            validateStep(step);
        }
    }

    private void validateStep(StepDefinition step) {
        if (step == null) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Step must not be null");
        }
        if (step.getAction() == null) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Step action is required");
        }
        if (step.getAction() == ActionType.GOTO && isBlank(step.getUrl())) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Goto step requires url");
        }
        if ((step.getAction() == ActionType.CLICK || step.getAction() == ActionType.FILL)
                && step.getTarget() == null) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Target is required for click/fill");
        }
        if ((step.getAction() == ActionType.WAIT_FOR_ELEMENT
                || step.getAction() == ActionType.WAIT_FOR_VISIBLE
                || step.getAction() == ActionType.WAIT_FOR_HIDDEN)
                && step.getTarget() == null) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Target is required for element wait");
        }
        if (step.getAction() == ActionType.WAIT_FOR_URL && isBlank(step.getExpected()) && isBlank(step.getUrl())) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "WAIT_FOR_URL requires expected or url");
        }
        if ((step.getAction() == ActionType.ASSERT_TITLE || step.getAction() == ActionType.ASSERT_URL)
                && isBlank(step.getExpected())) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Assertion step requires expected");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
