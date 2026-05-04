import { useEffect, useMemo, useState } from "react";
import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale, RunListResponse, RunSummaryItem } from "../types";
import { buildReportViewModels } from "./reportViewModel";

type ReportsScreenProps = {
  snapshot: AdminConsoleSnapshot;
  reviewBoardLabel: string;
  reportListLabel: string;
  locale: Locale;
  initialProjectKey?: string | null;
  selectedRunId: string | null;
  onOpenDetail: (runId: string) => void;
  apiBaseUrl: string;
};

type LocalizedCopy = {
  en: string;
  zh: string;
  ja: string;
};

type ReportListRow = {
  runId: string;
  runName: string;
  status: string;
  finishedAt: string;
  projectKey: string;
  projectName: string;
  caseId: string;
  caseName: string;
  caseTags: string[];
  duration: string;
  environment: string;
  stepsPassed: number;
  stepsTotal: number;
  assertionsPassed: number;
  assertionsTotal: number;
};

type ReportProjectNode = {
  projectKey: string;
  projectName: string;
  reports: ReportListRow[];
  totalCases: number;
};

function copy(en: string, zh: string, ja: string): LocalizedCopy {
  return { en, zh, ja };
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "-";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function mapApiToRows(items: RunSummaryItem[], snapshot: AdminConsoleSnapshot): ReportListRow[] {
  return items.map((item) => {
    const matchedCase = snapshot.cases.find((testCase) => testCase.id === item.caseId) ?? null;
    return {
      runId: item.runId,
      runName: item.runName || item.runId,
      status: item.status,
      finishedAt: item.finishedAt,
      projectKey: item.projectKey || matchedCase?.projectKey || "unknown-project",
      projectName: item.projectName || item.projectKey || "Unknown project",
      caseId: item.caseId || matchedCase?.id || "",
      caseName: item.caseName || matchedCase?.name || item.runName || item.runId,
      caseTags: matchedCase?.tags ?? [],
      duration: formatDuration(item.durationMs),
      environment: item.environment || "-",
      stepsPassed: item.stepsPassed,
      stepsTotal: item.stepsTotal,
      assertionsPassed: item.assertionsPassed,
      assertionsTotal: item.assertionsTotal
    };
  });
}

function mapFallbackToRows(snapshot: AdminConsoleSnapshot): ReportListRow[] {
  return buildReportViewModels(snapshot).map((report) => ({
    runId: report.runId,
    runName: report.runName,
    status: report.status,
    finishedAt: report.finishedAt,
    projectKey: report.projectKey,
    projectName: report.projectName,
    caseId: report.caseId,
    caseName: report.caseName,
    caseTags: report.caseTags,
    duration: report.duration,
    environment: report.environment || "-",
    stepsPassed: report.stepsPassed,
    stepsTotal: report.stepsTotal,
    assertionsPassed: report.assertionsPassed,
    assertionsTotal: report.assertionsTotal
  }));
}

function groupReportProjects(reports: ReportListRow[]): ReportProjectNode[] {
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
    totalCases: new Set(project.reports.map((report) => report.caseId).filter(Boolean)).size
  }));
}

export function ReportsScreen({
  snapshot,
  reviewBoardLabel,
  reportListLabel,
  locale,
  initialProjectKey,
  selectedRunId,
  onOpenDetail,
  apiBaseUrl
}: ReportsScreenProps) {
  const t = (value: LocalizedCopy) => translate(locale, value);
  const [apiRuns, setApiRuns] = useState<RunSummaryItem[] | null>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    setApiLoaded(false);
    setApiFailed(false);
    fetch(`${apiBaseUrl}/api/phase3/runs/`)
      .then((r) => (r.ok ? (r.json() as Promise<RunListResponse>) : Promise.reject(r.status)))
      .then((data) => {
        setApiRuns(Array.isArray(data.items) ? data.items : []);
        setApiLoaded(true);
      })
      .catch(() => {
        setApiRuns(null);
        setApiLoaded(true);
        setApiFailed(true);
      });
  }, [apiBaseUrl]);

  const reportProjects = useMemo(() => {
    const rows = apiLoaded && !apiFailed ? mapApiToRows(apiRuns ?? [], snapshot) : mapFallbackToRows(snapshot);
    return groupReportProjects(rows);
  }, [apiFailed, apiLoaded, apiRuns, snapshot]);

  const selectedReport = useMemo(
    () => reportProjects.flatMap((project) => project.reports).find((report) => report.runId === selectedRunId) ?? null,
    [reportProjects, selectedRunId]
  );

  const initialSelection = initialProjectKey?.trim() || selectedReport?.projectKey || reportProjects[0]?.projectKey || "";
  const [selectedProjectKey, setSelectedProjectKey] = useState(initialSelection);
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);

  useEffect(() => {
    if (!reportProjects.some((project) => project.projectKey === selectedProjectKey)) {
      setSelectedProjectKey(selectedReport?.projectKey ?? reportProjects[0]?.projectKey ?? "");
    }
  }, [reportProjects, selectedProjectKey, selectedReport]);

  useEffect(() => {
    if (selectedRunId && selectedReport?.projectKey && selectedReport.projectKey !== selectedProjectKey) {
      setSelectedProjectKey(selectedReport.projectKey);
    }
  }, [selectedRunId, selectedReport?.projectKey, selectedProjectKey]);

  useEffect(() => {
    const normalizedProjectKey = initialProjectKey?.trim();
    if (!normalizedProjectKey) return;
    if (reportProjects.some((project) => project.projectKey === normalizedProjectKey) && normalizedProjectKey !== selectedProjectKey) {
      setSelectedProjectKey(normalizedProjectKey);
    }
  }, [initialProjectKey, reportProjects, selectedProjectKey]);

  const selectedProject = reportProjects.find((project) => project.projectKey === selectedProjectKey) ?? reportProjects[0] ?? null;
  const visibleReports = selectedProject?.reports ?? [];

  return (
    <div className="reportsShell">
      <section className="sectionCard reportsListCard reportsOverviewCard">
        <div className="docParseOverviewHead">
          <div>
            <p className="eyebrow">{snapshot.navigation.find((item) => item.id === "reports")?.label}</p>
            <h3>{reportListLabel}</h3>
            <p className="docParseOverviewLead">
              {t(copy(
                "Reports read the canonical backend run list first, then open a concrete run by runId.",
                "Reports 优先读取后端规范运行列表，再通过 runId 打开具体运行。",
                "Reports はバックエンドの正規ランリストを先に読み、runId で具体的なランを開きます。"
              ))}
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
                  className={`casesProjectCard accent${index === 0 ? "" : index + 1} ${selectedProjectKey === project.projectKey ? "isSelected" : ""}`.trim()}
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
                    <span>{`${t(copy("Cases", "用例", "Cases"))}: ${project.totalCases}`}</span>
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
                    key={report.runId}
                    className={`docParseDocumentRow reportOverviewRow ${selectedRunId === report.runId ? "isOpened" : ""}`}
                  >
                    <div className="docParseDocumentIdentity reportOverviewIdentity">
                      <strong>{report.runName}</strong>
                      <p>{`${report.caseName} / ${report.environment} / ${report.finishedAt}`}</p>
                    </div>
                    <div className="docParseDocumentMeta reportOverviewMeta">
                      <span className={`docParseDocumentBadge ${/fail/i.test(report.status) ? "warning" : "info"}`}>{report.status}</span>
                      <span>{report.duration}</span>
                    </div>
                    <div className="docParseDocumentStats reportOverviewStats">
                      <span>{`${report.stepsPassed}/${report.stepsTotal} ${t(copy("steps", "步骤", "steps"))}`}</span>
                      <span>{`${report.assertionsPassed}/${report.assertionsTotal} ${t(copy("assertions", "断言", "assertions"))}`}</span>
                    </div>
                    <div className="reportOverviewCaseLine">
                      <span className="reportOverviewCaseId">{report.caseId || "-"}</span>
                      <div className="reportCatalogTags">
                        {report.caseTags.length ? (
                          report.caseTags.map((tag) => <span key={`${report.runId}-${tag}`}>{tag}</span>)
                        ) : (
                          <span>{t(copy("untagged", "未打标签", "untagged"))}</span>
                        )}
                      </div>
                    </div>
                    <button type="button" className="casesInlineAction" onClick={() => onOpenDetail(report.runId)}>
                      {selectedRunId === report.runId ? t(copy("Opened", "已打开", "Opened")) : t(copy("Detail", "详情", "Detail"))}
                    </button>
                  </article>
                ))
              ) : (
                <article className="docParseDocumentRow">
                  <div className="docParseDocumentIdentity">
                    <strong>{t(copy("No runs yet", "暂无运行记录", "まだランがありません"))}</strong>
                    <p>{t(copy(
                      "This project has no report entries in the current backend run list.",
                      "当前后端运行列表中该项目还没有报告记录。",
                      "現在のバックエンドランリストにこのプロジェクトのレポートはありません。"
                    ))}</p>
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
            <h3>{t(copy("Operator timeline", "操作时间线", "オペレータータイムライン"))}</h3>
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
