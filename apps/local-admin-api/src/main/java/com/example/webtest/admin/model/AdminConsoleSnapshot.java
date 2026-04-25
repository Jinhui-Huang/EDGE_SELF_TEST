package com.example.webtest.admin.model;

import java.util.List;

public record AdminConsoleSnapshot(
        String generatedAt,
        String apiBasePath,
        PlatformSummary summary,
        List<NavItem> navigation,
        List<StatCard> stats,
        List<ProjectRow> projects,
        List<CaseRow> cases,
        List<WorkQueueItem> workQueue,
        List<ReportRow> reports,
        List<ConfigItem> modelConfig,
        List<ConfigItem> environmentConfig,
        List<TimelineItem> timeline,
        List<String> constraints,
        List<String> caseTags) {

    public record PlatformSummary(String eyebrow, String title, String description, String runtimeStrategy) {
    }

    public record NavItem(String id, String label, String summary) {
    }

    public record StatCard(String label, String value, String note) {
    }

    public record ProjectRow(String key, String name, String scope, int suites, int environments, String note) {
    }

    public record CaseRow(
            String id,
            String projectKey,
            String name,
            List<String> tags,
            String status,
            String updatedAt,
            boolean archived) {
    }

    public record WorkQueueItem(String title, String owner, String state, String detail) {
    }

    public record ReportRow(String runId, String runName, String status, String finishedAt, String entry) {
    }

    public record ConfigItem(String label, String value) {
    }

    public record TimelineItem(String time, String title, String detail) {
    }
}
