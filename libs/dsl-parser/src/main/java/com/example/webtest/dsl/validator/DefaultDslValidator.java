package com.example.webtest.dsl.validator;

import com.example.webtest.common.exception.BaseException;
import com.example.webtest.common.exception.ErrorCodes;
import com.example.webtest.dsl.model.ActionType;
import com.example.webtest.dsl.model.ReportPolicy;
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
        validateReportPolicy(definition.getReportPolicy());

        for (StepDefinition step : definition.getSteps()) {
            validateStep(step);
        }
    }

    private void validateReportPolicy(ReportPolicy reportPolicy) {
        if (reportPolicy == null) {
            return;
        }
        Integer keepLatest = reportPolicy.getRetentionKeepLatest();
        if (keepLatest != null && keepLatest < 1) {
            throw new BaseException(
                    ErrorCodes.DSL_VALIDATION_FAILED,
                    "reportPolicy.retentionKeepLatest must be greater than or equal to 1");
        }
        Integer olderThanDays = reportPolicy.getRetentionOlderThanDays();
        if (olderThanDays != null && olderThanDays < 0) {
            throw new BaseException(
                    ErrorCodes.DSL_VALIDATION_FAILED,
                    "reportPolicy.retentionOlderThanDays must be greater than or equal to 0");
        }
        Long maxTotalMb = reportPolicy.getRetentionMaxTotalMb();
        if (maxTotalMb != null && maxTotalMb < 0) {
            throw new BaseException(
                    ErrorCodes.DSL_VALIDATION_FAILED,
                    "reportPolicy.retentionMaxTotalMb must be greater than or equal to 0");
        }
        Long networkBodySpoolCleanupGraceSeconds = reportPolicy.getNetworkBodySpoolCleanupGraceSeconds();
        if (networkBodySpoolCleanupGraceSeconds != null && networkBodySpoolCleanupGraceSeconds < 0) {
            throw new BaseException(
                    ErrorCodes.DSL_VALIDATION_FAILED,
                    "reportPolicy.networkBodySpoolCleanupGraceSeconds must be greater than or equal to 0");
        }
        for (String status : reportPolicy.getRetentionDeleteStatuses()) {
            String normalizedStatus = status == null ? "" : status.trim().toUpperCase();
            if (!"OK".equals(normalizedStatus) && !"FAILED".equals(normalizedStatus)) {
                throw new BaseException(
                        ErrorCodes.DSL_VALIDATION_FAILED,
                        "reportPolicy.retentionDeleteStatuses supports only OK or FAILED");
            }
        }
        if (reportPolicy.isRetentionCleanupOnRun()
                && keepLatest == null
                && olderThanDays == null
                && maxTotalMb == null
                && reportPolicy.getRetentionDeleteStatuses().isEmpty()) {
            throw new BaseException(
                    ErrorCodes.DSL_VALIDATION_FAILED,
                    "reportPolicy retention cleanup requires retentionKeepLatest, retentionOlderThanDays, retentionMaxTotalMb, or retentionDeleteStatuses");
        }
        if (reportPolicy.isRetentionPruneArtifactsOnly() && !reportPolicy.isRetentionCleanupOnRun()) {
            throw new BaseException(
                    ErrorCodes.DSL_VALIDATION_FAILED,
                    "reportPolicy.retentionPruneArtifactsOnly requires retentionCleanupOnRun");
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
        if (step.getAction() == ActionType.ASSERT_TEXT && step.getTarget() == null) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Target is required for text assertion");
        }
        if (step.getAction() == ActionType.ASSERT_TEXT && isBlank(step.getExpected())) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Text assertion requires expected");
        }
        if (step.getAction() == ActionType.ASSERT_VALUE && step.getTarget() == null) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Target is required for value assertion");
        }
        if (step.getAction() == ActionType.ASSERT_VALUE && isBlank(step.getExpected())) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Value assertion requires expected");
        }
        if (step.getAction() == ActionType.ASSERT_ATTR && step.getTarget() == null) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Target is required for attribute assertion");
        }
        if (step.getAction() == ActionType.ASSERT_ATTR && step.getValue() == null) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Attribute assertion requires value");
        }
        if (step.getAction() == ActionType.ASSERT_ATTR && isBlank(step.getExpected())) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Attribute assertion requires expected");
        }
        if ((step.getAction() == ActionType.ASSERT_VISIBLE || step.getAction() == ActionType.ASSERT_NOT_VISIBLE)
                && step.getTarget() == null) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Target is required for visibility assertion");
        }
        if ((step.getAction() == ActionType.ASSERT_ENABLED || step.getAction() == ActionType.ASSERT_DISABLED)
                && step.getTarget() == null) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Target is required for enabled assertion");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
