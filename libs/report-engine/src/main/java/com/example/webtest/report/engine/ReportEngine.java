package com.example.webtest.report.engine;

import com.example.webtest.execution.context.ExecutionContext;
import com.example.webtest.report.model.ReportStepRecord;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;

public interface ReportEngine {
    default Path generateRunReport(ExecutionContext context, Path outputDir, List<ReportStepRecord> stepRecords) {
        return generateRunReport(context, outputDir, null, null, stepRecords);
    }

    Path generateRunReport(
            ExecutionContext context,
            Path outputDir,
            Instant runStartedAt,
            Instant runFinishedAt,
            List<ReportStepRecord> stepRecords);
}
