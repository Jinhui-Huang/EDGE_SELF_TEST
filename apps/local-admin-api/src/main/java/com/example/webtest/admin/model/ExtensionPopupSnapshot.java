package com.example.webtest.admin.model;

import java.util.List;

public record ExtensionPopupSnapshot(
        String generatedAt,
        String status,
        String summary,
        PageSummary page,
        RuntimeStatus runtime,
        List<String> hints) {

    public record PageSummary(String title, String url, String domain, String lastUpdatedAt) {
    }

    public record RuntimeStatus(String mode, String queueState, String auditState, String nextAction) {
    }
}
