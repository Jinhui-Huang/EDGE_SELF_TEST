import { CSSProperties, useCallback, useEffect, useState } from "react";
import { translate } from "../i18n";
import {
  AdminConsoleSnapshot,
  AiDecisionsResponse,
  Locale,
  RecoveryResponse,
  RunArtifactsResponse,
  RunAssertionsResponse,
  RunReport,
  RunStepsResponse
} from "../types";
import { selectReportViewModel } from "./reportViewModel";

type ReportDetailTab = "overview" | "steps" | "assertions" | "dataDiff" | "recovery" | "aiDecisions";

type ReportDetailScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
  selectedRunId: string | null;
  onBackToReports: () => void;
  onOpenDataDiff: (runId: string) => void;
  onRerun: (context: { runId: string; projectKey: string; environment: string; model: string }) => void;
  apiBaseUrl: string;
};

type LocalizedCopy = { en: string; zh: string; ja: string };

function copy(en: string, zh: string, ja: string): LocalizedCopy {
  return { en, zh, ja };
}

/* ── Localized copy constants ── */
const C = {
  noRunSelected: copy("No run selected", "未选择运行", "実行未選択"),
  noReportAvailable: copy("No report available", "无可用报告", "レポートなし"),
  loadingReport: copy("Loading report...", "正在加载报告...", "レポートを読み込み中..."),
  reports: copy("Reports", "报告", "レポート"),
  downloadArtifacts: copy("Download artifacts", "下载产物", "アーティファクト取得"),
  reRun: copy("Re-run", "重新执行", "再実行"),
  artifacts: copy("Artifacts", "产物", "アーティファクト"),
  noArtifactsAvailable: copy("No artifacts available", "无可用产物", "アーティファクトなし"),
  overview: copy("Overview", "概览", "概要"),
  steps: copy("Steps", "步骤", "ステップ"),
  assertions: copy("Assertions", "断言", "アサーション"),
  dataDiffTab: copy("Data diff", "数据差异", "データ差分"),
  recovery: copy("Recovery", "恢复", "リカバリ"),
  aiDecisions: copy("AI decisions", "AI 决策", "AI 判断"),
  summary: copy("Summary", "摘要", "サマリ"),
  stepsPassed: copy("Steps passed", "步骤通过", "ステップ通過"),
  duration: copy("Duration", "耗时", "所要時間"),
  assertionsLbl: copy("Assertions", "断言", "アサーション"),
  aiCalls: copy("AI calls", "AI 调用", "AI 呼出"),
  aiCost: copy("AI cost", "AI 费用", "AI コスト"),
  heals: copy("Heals", "修复", "ヒール"),
  recoveryLbl: copy("Recovery", "恢复", "リカバリ"),
  pageScreenshots: copy("Page screenshots", "页面截图", "ページスクリーンショット"),
  assertionsPanel: copy("Assertions", "断言", "アサーション"),
  stepTimeline: copy("Step timeline", "步骤时间线", "ステップタイムライン"),
  noStepData: copy("No step data available", "无步骤数据", "ステップデータなし"),
  assertionDetails: copy("Assertion details", "断言详情", "アサーション詳細"),
  noAssertionData: copy("No assertion data available", "无断言数据", "アサーションデータなし"),
  recoveryDetails: copy("Recovery details", "恢复详情", "リカバリ詳細"),
  noRecoveryData: copy("No recovery data available", "无恢复数据", "リカバリデータなし"),
  aiDecisionLog: copy("AI decision log", "AI 决策日志", "AI 判断ログ"),
  noAiDecisionData: copy("No AI decision data available", "无 AI 决策数据", "AI 判断データなし"),
};

function statusClass(status: string) {
  if (/fail/i.test(status)) return "status-failed";
  if (/success|ok|pass/i.test(status)) return "status-success";
  return "status-info";
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "-";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

export function ReportDetailScreen({
  snapshot,
  title,
  locale,
  selectedRunId,
  onBackToReports,
  onOpenDataDiff,
  onRerun,
  apiBaseUrl
}: ReportDetailScreenProps) {
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);
  const [apiReport, setApiReport] = useState<RunReport | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportDetailTab>("overview");
  const [stepsData, setStepsData] = useState<RunStepsResponse | null>(null);
  const [assertionsData, setAssertionsData] = useState<RunAssertionsResponse | null>(null);
  const [recoveryData, setRecoveryData] = useState<RecoveryResponse | null>(null);
  const [aiDecisionsData, setAiDecisionsData] = useState<AiDecisionsResponse | null>(null);
  const [artifactsData, setArtifactsData] = useState<RunArtifactsResponse | null>(null);
  const [artifactsOpen, setArtifactsOpen] = useState(false);

  useEffect(() => {
    if (!selectedRunId) return;
    setApiReport(null);
    setFetchFailed(false);
    setActiveTab("overview");
    setStepsData(null);
    setAssertionsData(null);
    setRecoveryData(null);
    setAiDecisionsData(null);
    setArtifactsData(null);
    setArtifactsOpen(false);
    fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(selectedRunId)}/report`)
      .then((r) => (r.ok ? (r.json() as Promise<RunReport>) : Promise.reject(r.status)))
      .then((data) => {
        if (data.runId && typeof data.stepsTotal === "number") {
          setApiReport(data);
        } else {
          setFetchFailed(true);
        }
      })
      .catch(() => setFetchFailed(true));
  }, [apiBaseUrl, selectedRunId]);

  const fetchTabData = useCallback(
    (tab: ReportDetailTab) => {
      if (!selectedRunId) return;
      const base = `${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(selectedRunId)}`;
      switch (tab) {
        case "steps":
          if (!stepsData) {
            fetch(`${base}/steps`)
              .then((r) => (r.ok ? (r.json() as Promise<RunStepsResponse>) : Promise.reject(r.status)))
              .then((data) => {
                if (data.runId && Array.isArray(data.items)) setStepsData(data);
              })
              .catch(() => {});
          }
          break;
        case "assertions":
          if (!assertionsData) {
            fetch(`${base}/assertions`)
              .then((r) => (r.ok ? (r.json() as Promise<RunAssertionsResponse>) : Promise.reject(r.status)))
              .then((data) => {
                if (data.runId && Array.isArray(data.items)) setAssertionsData(data);
              })
              .catch(() => {});
          }
          break;
        case "recovery":
          if (!recoveryData) {
            fetch(`${base}/recovery`)
              .then((r) => (r.ok ? (r.json() as Promise<RecoveryResponse>) : Promise.reject(r.status)))
              .then((data) => {
                if (data.runId && Array.isArray(data.items)) setRecoveryData(data);
              })
              .catch(() => {});
          }
          break;
        case "aiDecisions":
          if (!aiDecisionsData) {
            fetch(`${base}/ai-decisions`)
              .then((r) => (r.ok ? (r.json() as Promise<AiDecisionsResponse>) : Promise.reject(r.status)))
              .then((data) => {
                if (data.runId && Array.isArray(data.items)) setAiDecisionsData(data);
              })
              .catch(() => {});
          }
          break;
      }
    },
    [apiBaseUrl, selectedRunId, stepsData, assertionsData, recoveryData, aiDecisionsData]
  );

  function handleTabClick(tab: ReportDetailTab) {
    if (tab === "dataDiff") {
      if (selectedRunId) onOpenDataDiff(selectedRunId);
      return;
    }
    setActiveTab(tab);
    fetchTabData(tab);
  }

  const handleDownloadArtifacts = useCallback(() => {
    if (!selectedRunId) return;
    if (artifactsData) {
      setArtifactsOpen(true);
      return;
    }
    fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(selectedRunId)}/artifacts`)
      .then((r) => (r.ok ? (r.json() as Promise<RunArtifactsResponse>) : Promise.reject(r.status)))
      .then((data) => {
        if (data.runId && Array.isArray(data.items)) {
          setArtifactsData(data);
          setArtifactsOpen(true);
        }
      })
      .catch(() => {});
  }, [apiBaseUrl, selectedRunId, artifactsData]);

  const handleRerun = useCallback(() => {
    if (!selectedRunId) return;
    onRerun({
      runId: selectedRunId,
      projectKey: apiReport?.projectKey ?? "",
      environment: apiReport?.environment ?? "",
      model: apiReport?.model ?? ""
    });
  }, [selectedRunId, apiReport, onRerun]);

  const fallbackReport = fetchFailed ? selectReportViewModel(snapshot, selectedRunId) : null;
  const runName = apiReport?.runName ?? fallbackReport?.runName ?? selectedRunId ?? "";
  const hasApiData = apiReport !== null;
  const hasFallback = fallbackReport !== null;

  if (!selectedRunId) {
    return (
      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{title}</p>
            <h3>{t(C.noRunSelected)}</h3>
          </div>
        </div>
      </section>
    );
  }

  if (!hasApiData && !hasFallback && fetchFailed) {
    return (
      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{title}</p>
            <h3>{t(C.noReportAvailable)}</h3>
          </div>
        </div>
      </section>
    );
  }

  if (!hasApiData && !fetchFailed) {
    return (
      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{title}</p>
            <h3>{t(C.loadingReport)}</h3>
          </div>
        </div>
      </section>
    );
  }

  const status = apiReport?.status ?? fallbackReport?.status ?? "UNKNOWN";
  const caseName = apiReport?.caseName ?? fallbackReport?.caseName ?? apiReport?.runId ?? runName;
  const finishedAt = apiReport?.finishedAt ?? fallbackReport?.finishedAt ?? "";
  const duration = apiReport ? formatDuration(apiReport.durationMs) : fallbackReport?.duration ?? "-";
  const environment = apiReport?.environment ?? fallbackReport?.environment ?? "";
  const model = apiReport?.model ?? fallbackReport?.model ?? "";
  const operator = apiReport?.operator ?? fallbackReport?.operator ?? "";
  const stepsPassed = apiReport?.stepsPassed ?? fallbackReport?.stepsPassed ?? 0;
  const stepsTotal = apiReport?.stepsTotal ?? fallbackReport?.stepsTotal ?? 1;
  const assertionsPassed = apiReport?.assertionsPassed ?? fallbackReport?.assertionsPassed ?? 0;
  const assertionsTotal = apiReport?.assertionsTotal ?? fallbackReport?.assertionsTotal ?? 0;
  const aiCalls = fallbackReport?.aiCalls ?? 0;
  const aiCost = fallbackReport?.aiCost ?? "-";
  const heals = fallbackReport?.heals ?? 0;
  const recovery = recoveryData?.status ?? fallbackReport?.recovery ?? "-";
  const subtitleParts = [finishedAt, duration, environment, model, operator].filter(Boolean);

  const displayAssertions = apiReport?.assertions?.length
    ? apiReport.assertions.map((a) => ({ name: a.name, actual: a.message || a.status, pass: a.pass }))
    : fallbackReport?.assertions ?? [];

  const displayScreenshots =
    apiReport?.artifacts
      ?.filter((a) => a.kind === "screenshot")
      .map((a, index) => ({
        label: String(index + 1).padStart(2, "0"),
        path: a.label,
        tone: "accent" as const
      })) ?? fallbackReport?.screenshots ?? [];

  const tabDefs: Array<{ key: ReportDetailTab; label: LocalizedCopy }> = [
    { key: "overview", label: C.overview },
    { key: "steps", label: C.steps },
    { key: "assertions", label: C.assertions },
    { key: "dataDiff", label: C.dataDiffTab },
    { key: "recovery", label: C.recovery },
    { key: "aiDecisions", label: C.aiDecisions }
  ];

  return (
    <div className="reportDetailScreen">
      <div className="reportDetailBreadcrumb">
        <button type="button" className="reportDetailBacklink" onClick={onBackToReports}>
          {t(C.reports)}
        </button>
        <span>/</span>
        <span>{runName}</span>
      </div>

      <section className="reportHero">
        <div className="reportHeroMain">
          <div className="reportHeroTitleRow">
            <h2>{caseName}</h2>
            <span className={`statusBadge ${statusClass(status)}`}>{status}</span>
          </div>
          <p className="reportHeroSubtitle">{subtitleParts.join(" | ")}</p>
        </div>
        <div className="reportHeroActions">
          <button type="button" className="reportsActionButton ghost" onClick={handleDownloadArtifacts}>
            {t(C.downloadArtifacts)}
          </button>
          <button type="button" className="reportsActionButton" onClick={handleRerun}>
            {t(C.reRun)}
          </button>
        </div>
      </section>

      {artifactsOpen && artifactsData ? (
        <div className="reportArtifactsDrawer">
          <div className="reportPanelHeader">
            <div className="reportPanelTitle">{`${t(C.artifacts)} (${artifactsData.items.length})`}</div>
            <button type="button" className="docParseDismiss" onClick={() => setArtifactsOpen(false)}>
              x
            </button>
          </div>
          <div className="reportArtifactList">
            {artifactsData.items.length === 0 ? (
              <p>{t(C.noArtifactsAvailable)}</p>
            ) : (
              artifactsData.items.map((item) => (
                <div key={item.label} className="reportArtifactRow">
                  <span className={`docParseDocumentBadge ${item.kind === "screenshot" ? "accent" : "neutral"}`}>{item.kind}</span>
                  <span>{item.label}</span>
                  <small>{item.path}</small>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      <div className="reportTabs">
        {tabDefs.map((td) => (
          <button key={td.key} type="button" className={`reportTab ${activeTab === td.key ? "isActive" : ""}`} onClick={() => handleTabClick(td.key)}>
            {t(td.label)}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="reportOverviewGrid">
          <section className="reportPanelCard">
            <div className="reportPanelTitle">{t(C.summary)}</div>
            <div className="reportSummaryHead">
              <div className="reportProgressRing" style={{ "--progress": `${Math.round((stepsPassed / Math.max(1, stepsTotal)) * 360)}deg` } as CSSProperties}>
                <div>{`${stepsPassed}/${stepsTotal}`}</div>
              </div>
              <div className="reportSummaryRate">
                <span>{t(C.stepsPassed)}</span>
                <strong>{`${Math.round((stepsPassed / Math.max(1, stepsTotal)) * 100)}%`}</strong>
              </div>
            </div>
            <div className="reportStatGrid">
              <div className="reportStatCard">
                <span>{t(C.duration)}</span>
                <strong>{duration}</strong>
              </div>
              <div className="reportStatCard success">
                <span>{t(C.assertionsLbl)}</span>
                <strong>{`${assertionsPassed}/${assertionsTotal}`}</strong>
              </div>
              <div className="reportStatCard accent">
                <span>{t(C.aiCalls)}</span>
                <strong>{aiCalls}</strong>
              </div>
              <div className="reportStatCard accent4">
                <span>{t(C.aiCost)}</span>
                <strong>{aiCost}</strong>
              </div>
              <div className="reportStatCard warning">
                <span>{t(C.heals)}</span>
                <strong>{heals}</strong>
              </div>
              <div className="reportStatCard success">
                <span>{t(C.recoveryLbl)}</span>
                <strong>{recovery}</strong>
              </div>
            </div>
          </section>

          <section className="reportPanelCard reportPanelMedia">
            <div className="reportPanelHeader">
              <div className="reportPanelTitle">{t(C.pageScreenshots)}</div>
            </div>
            <div className="reportScreenshotGrid">
              {displayScreenshots.map((item) => (
                <div key={`${runName}-${item.label}`} className={`reportShotCard ${item.tone}`}>
                  <div className="reportShotIndex">{item.label}</div>
                  <div className="reportShotBody">
                    <span />
                    <span />
                    <span />
                    <div />
                  </div>
                  <div className="reportShotPath">{item.path}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="reportPanelCard reportPanelAssertions">
            <div className="reportPanelHeader">
              <div className="reportPanelTitle">{t(C.assertionsPanel)}</div>
            </div>
            <div className="reportAssertionList">
              {displayAssertions.map((item) => (
                <div key={`${runName}-${item.name}`} className="reportAssertionRow">
                  <div className={`reportAssertionDot ${item.pass ? "pass" : "fail"}`}>{item.pass ? "OK" : "!"}</div>
                  <div className="reportAssertionCopy">
                    <div>{item.name}</div>
                    <span>{`-> ${item.actual}`}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "steps" ? (
        <div className="reportTabPanel">
          <section className="reportPanelCard">
            <div className="reportPanelTitle">{t(C.stepTimeline)}</div>
            {stepsData?.items.length ? (
              <div className="reportStepList">
                {stepsData.items.map((step) => (
                  <div key={step.index} className="reportStepRow">
                    <span className="reportStepIndex">{step.index}</span>
                    <span className="reportStepLabel">{step.label}</span>
                    <span className={`statusBadge ${(step.state as string) === "DONE" || (step.state as string) === "PASS" ? "status-success" : (step.state as string) === "FAIL" || (step.state as string) === "FAILED" ? "status-failed" : "status-info"}`}>{step.state}</span>
                    <span className="reportStepDuration">{formatDuration(step.durationMs)}</span>
                    {step.note ? <small className="reportStepNote">{step.note}</small> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p>{t(C.noStepData)}</p>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "assertions" ? (
        <div className="reportTabPanel">
          <section className="reportPanelCard">
            <div className="reportPanelTitle">{t(C.assertionDetails)}</div>
            {assertionsData?.items.length ? (
              <div className="reportAssertionList">
                {assertionsData.items.map((item) => (
                  <div key={item.name} className="reportAssertionRow">
                    <div className={`reportAssertionDot ${item.pass ? "pass" : "fail"}`}>{item.pass ? "OK" : "!"}</div>
                    <div className="reportAssertionCopy">
                      <div>{item.name}</div>
                      <span>{`${item.action} - ${item.message || item.status}`}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>{t(C.noAssertionData)}</p>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "recovery" ? (
        <div className="reportTabPanel">
          <section className="reportPanelCard">
            <div className="reportPanelHeader">
              <div className="reportPanelTitle">{t(C.recoveryDetails)}</div>
              {recoveryData ? <span className={`statusBadge ${recoveryData.status === "SUCCESS" ? "status-success" : recoveryData.status === "PARTIAL" ? "status-info" : "status-failed"}`}>{recoveryData.status}</span> : null}
            </div>
            {recoveryData?.items.length ? (
              <div className="reportRecoveryList">
                {recoveryData.items.map((item) => (
                  <div key={item.step} className="reportRecoveryRow">
                    <span className={`statusBadge ${item.status === "SUCCESS" ? "status-success" : item.status === "SKIPPED" ? "status-info" : "status-failed"}`}>{item.status}</span>
                    <div className="reportRecoveryCopy">
                      <strong>{item.step}</strong>
                      <span>{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>{t(C.noRecoveryData)}</p>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "aiDecisions" ? (
        <div className="reportTabPanel">
          <section className="reportPanelCard">
            <div className="reportPanelTitle">{t(C.aiDecisionLog)}</div>
            {aiDecisionsData?.items.length ? (
              <div className="reportAiDecisionList">
                {aiDecisionsData.items.map((item) => (
                  <div key={`${item.at}-${item.type}`} className="reportAiDecisionRow">
                    <span className="reportAiDecisionTime">{item.at}</span>
                    <span className={`docParseDocumentBadge ${item.type === "LOCATOR_HEAL" ? "warning" : "info"}`}>{item.type}</span>
                    <span className="reportAiDecisionModel">{item.model}</span>
                    <p>{item.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>{t(C.noAiDecisionData)}</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
