import { useEffect, useMemo, useState } from "react";
import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";
import { buildReportViewModels, ReportViewModel } from "./reportViewModel";

type ReportsScreenProps = {
  snapshot: AdminConsoleSnapshot;
  reviewBoardLabel: string;
  reportListLabel: string;
  locale: Locale;
  selectedRunName: string | null;
  onOpenDetail: (runName: string) => void;
};

type LocalizedCopy = {
  en: string;
  zh: string;
  ja: string;
};

type ReportProjectNode = {
  projectKey: string;
  projectName: string;
  reports: ReportViewModel[];
  totalCases: number;
};

function copy(en: string, zh: string, ja: string): LocalizedCopy {
  return { en, zh, ja };
}

function statusClass(status: string) {
  if (/fail/i.test(status)) {
    return "status-failed";
  }
  if (/success|ok|pass/i.test(status)) {
    return "status-success";
  }
  return "status-info";
}

function buildReportProjects(snapshot: AdminConsoleSnapshot): ReportProjectNode[] {
  const reports = buildReportViewModels(snapshot);
  const grouped = new Map<string, ReportProjectNode>();

  reports.forEach((report) => {
    const existing = grouped.get(report.projectKey);
    if (existing) {
      existing.reports.push(report);
      return;
    }

    grouped.set(report.projectKey, {
      projectKey: report.projectKey,
      projectName: report.projectName,
      reports: [report],
      totalCases: 0
    });
  });

  return Array.from(grouped.values()).map((project) => ({
    ...project,
    totalCases: new Set(project.reports.map((report) => report.caseId)).size
  }));
}

export function ReportsScreen({
  snapshot,
  reviewBoardLabel,
  reportListLabel,
  locale,
  selectedRunName,
  onOpenDetail
}: ReportsScreenProps) {
  const t = (value: LocalizedCopy) => translate(locale, value);
  const reportProjects = useMemo(() => buildReportProjects(snapshot), [snapshot]);
  const selectedReport = useMemo(
    () =>
      reportProjects
        .flatMap((project) => project.reports)
        .find((report) => report.runName === selectedRunName) ?? null,
    [reportProjects, selectedRunName]
  );
  const [selectedProjectKey, setSelectedProjectKey] = useState(
    selectedReport?.projectKey ?? reportProjects[0]?.projectKey ?? ""
  );
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);

  useEffect(() => {
    if (!reportProjects.some((project) => project.projectKey === selectedProjectKey)) {
      setSelectedProjectKey(selectedReport?.projectKey ?? reportProjects[0]?.projectKey ?? "");
    }
  }, [reportProjects, selectedProjectKey, selectedReport]);

  useEffect(() => {
    if (selectedRunName && selectedReport?.projectKey && selectedReport.projectKey !== selectedProjectKey) {
      setSelectedProjectKey(selectedReport.projectKey);
    }
  }, [selectedRunName, selectedReport?.projectKey]);

  const selectedProject =
    reportProjects.find((project) => project.projectKey === selectedProjectKey) ?? reportProjects[0] ?? null;
  const visibleReports = selectedProject?.reports ?? [];

  return (
    <div className="reportsShell">
      <section className="sectionCard reportsListCard reportsOverviewCard">
        <div className="docParseOverviewHead">
          <div>
            <p className="eyebrow">{snapshot.navigation.find((item) => item.id === "reports")?.label}</p>
            <h3>{reportListLabel}</h3>
            <p className="docParseOverviewLead">
              {t(
                copy(
                  "Reports overview follows the same project-first catalog pattern as Doc Parse, then opens one concrete run.",
                  "Reports 一览与 Doc Parse 保持同样的先项目后列表结构，再进入具体 run。",
                  "Reports overview uses the same project-first catalog pattern as Doc Parse before opening a specific run."
                )
              )}
            </p>
          </div>
          <div className="docParseOverviewActions">
            <button
              type="button"
              className="casesCollapseButton"
              aria-expanded={!overviewCollapsed}
              onClick={() => setOverviewCollapsed((current) => !current)}
            >
              <span className={`casesCollapseIcon ${overviewCollapsed ? "isCollapsed" : ""}`}>^</span>
            </button>
          </div>
        </div>

        <div className={`docParseOverviewBody ${overviewCollapsed ? "isCollapsed" : ""}`}>
          <div className="docParseProjectRail">
            <span className="casesRailLabel">{t(copy("Project switch", "项目切换", "プロジェクト切替"))}</span>
            <div className="casesProjectSwitches">
              {reportProjects.map((project, index) => (
                <button
                  key={project.projectKey}
                  type="button"
                  className={`casesProjectCard accent${index === 0 ? "" : index + 1} ${
                    selectedProjectKey === project.projectKey ? "isSelected" : ""
                  }`.trim()}
                  onClick={() => setSelectedProjectKey(project.projectKey)}
                >
                  <div className="casesProjectCardTop">
                    <div>
                      <strong>{project.projectName}</strong>
                      <small>{project.projectKey}</small>
                    </div>
                    <span>{project.reports.length}</span>
                  </div>
                  <div className="casesProjectCardMeta">
                    <span>{t(copy("Runs", "运行", "Runs"))}</span>
                    <span>
                      {t(copy("Cases", "用例", "Cases"))}: {project.totalCases}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="docParseDocumentPanel">
            <div className="casesListPanelHead">
              <div>
                <p className="eyebrow">{t(copy("Run catalog", "运行一览", "Run catalog"))}</p>
                <h3>{selectedProject?.projectName ?? t(copy("No project", "未选择项目", "No project"))}</h3>
              </div>
            </div>

            <div className="docParseDocumentTable">
              {visibleReports.length ? (
                visibleReports.map((report) => (
                  <article
                    key={report.runName}
                    className={`docParseDocumentRow reportOverviewRow ${selectedRunName === report.runName ? "isOpened" : ""}`}
                  >
                    <div className="docParseDocumentIdentity reportOverviewIdentity">
                      <strong>{report.runName}</strong>
                      <p>{`${report.caseName} / ${report.environment} / ${report.finishedAt}`}</p>
                    </div>
                    <div className="docParseDocumentMeta reportOverviewMeta">
                      <span className={`docParseDocumentBadge ${/fail/i.test(report.status) ? "warning" : "info"}`}>
                        {report.status}
                      </span>
                      <span>{report.duration}</span>
                    </div>
                    <div className="docParseDocumentStats reportOverviewStats">
                      <span>{`${report.stepsPassed}/${report.stepsTotal} ${t(copy("steps", "步骤", "steps"))}`}</span>
                      <span>{`${report.assertionsPassed}/${report.assertionsTotal} ${t(copy("assertions", "断言", "assertions"))}`}</span>
                    </div>
                    <div className="reportOverviewCaseLine">
                      <span className="reportOverviewCaseId">{report.caseId}</span>
                      <div className="reportCatalogTags">
                        {report.caseTags.length ? (
                          report.caseTags.map((tag) => <span key={`${report.runName}-${tag}`}>{tag}</span>)
                        ) : (
                          <span>{t(copy("untagged", "未打标签", "untagged"))}</span>
                        )}
                      </div>
                    </div>
                    <button type="button" className="casesInlineAction" onClick={() => onOpenDetail(report.runName)}>
                      {selectedRunName === report.runName ? t(copy("Opened", "已打开", "Opened")) : t(copy("Detail", "详情", "Detail"))}
                    </button>
                  </article>
                ))
              ) : (
                <article className="docParseDocumentRow">
                  <div className="docParseDocumentIdentity">
                    <strong>{t(copy("No runs yet", "暂无运行记录", "No runs yet"))}</strong>
                    <p>{t(copy("This project does not have report entries in the current snapshot.", "当前快照里这个项目还没有报告记录。", "This project has no report entries in the current snapshot."))}</p>
                  </div>
                </article>
              )}
            </div>
          </div>
        </div>
      </section>

      <aside className="sectionCard reportsTimelineCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{reviewBoardLabel}</p>
            <h3>{t(copy("Operator timeline", "操作时间线", "Operator timeline"))}</h3>
          </div>
        </div>
        <div className="timeline">
          {snapshot.timeline.map((item) => (
            <div key={`${item.time}-${item.title}`} className="timelineItem">
              <span>{item.time}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
