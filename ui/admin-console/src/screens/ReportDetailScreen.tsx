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
  selectedRunName: string | null;
  onBackToReports: () => void;
  onOpenDataDiff: () => void;
  onRerun: (context: { runId: string; projectKey: string; environment: string; model: string }) => void;
  apiBaseUrl: string;
};

function copy(en: string, zh: string, ja: string) {
  return { en, zh, ja };
}

function statusClass(status: string) {
  if (/fail/i.test(status)) return "status-failed";
  if (/success|ok|pass/i.test(status)) return "status-success";
  return "status-info";
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
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
  selectedRunName,
  onBackToReports,
  onOpenDataDiff,
  onRerun,
  apiBaseUrl
}: ReportDetailScreenProps) {
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);
  const [apiReport, setApiReport] = useState<RunReport | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportDetailTab>("overview");

  // Tab-specific data
  const [stepsData, setStepsData] = useState<RunStepsResponse | null>(null);
  const [assertionsData, setAssertionsData] = useState<RunAssertionsResponse | null>(null);
  const [recoveryData, setRecoveryData] = useState<RecoveryResponse | null>(null);
  const [aiDecisionsData, setAiDecisionsData] = useState<AiDecisionsResponse | null>(null);
  const [artifactsData, setArtifactsData] = useState<RunArtifactsResponse | null>(null);
  const [artifactsOpen, setArtifactsOpen] = useState(false);

  // Fetch the main report on mount / run change
  useEffect(() => {
    if (!selectedRunName) return;
    setApiReport(null);
    setFetchFailed(false);
    setActiveTab("overview");
    setStepsData(null);
    setAssertionsData(null);
    setRecoveryData(null);
    setAiDecisionsData(null);
    setArtifactsData(null);
    setArtifactsOpen(false);
    fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(selectedRunName)}/report`)
      .then((r) => r.ok ? r.json() as Promise<RunReport> : Promise.reject(r.status))
      .then((data) => {
        if (data.runId && typeof data.stepsTotal === "number") {
          setApiReport(data);
        } else {
          setFetchFailed(true);
        }
      })
      .catch(() => setFetchFailed(true));
  }, [apiBaseUrl, selectedRunName]);

  // Fetch tab-specific data when tab changes
  const fetchTabData = useCallback(
    (tab: ReportDetailTab) => {
      if (!selectedRunName) return;
      const base = `${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(selectedRunName)}`;
      switch (tab) {
        case "steps":
          if (!stepsData) {
            fetch(`${base}/steps`)
              .then((r) => r.ok ? r.json() as Promise<RunStepsResponse> : Promise.reject(r.status))
              .then((data) => { if (data.runId && Array.isArray(data.items)) setStepsData(data); })
              .catch(() => {/* use empty */});
          }
          break;
        case "assertions":
          if (!assertionsData) {
            fetch(`${base}/assertions`)
              .then((r) => r.ok ? r.json() as Promise<RunAssertionsResponse> : Promise.reject(r.status))
              .then((data) => { if (data.runId && Array.isArray(data.items)) setAssertionsData(data); })
              .catch(() => {/* use empty */});
          }
          break;
        case "recovery":
          if (!recoveryData) {
            fetch(`${base}/recovery`)
              .then((r) => r.ok ? r.json() as Promise<RecoveryResponse> : Promise.reject(r.status))
              .then((data) => { if (data.runId && Array.isArray(data.items)) setRecoveryData(data); })
              .catch(() => {/* use empty */});
          }
          break;
        case "aiDecisions":
          if (!aiDecisionsData) {
            fetch(`${base}/ai-decisions`)
              .then((r) => r.ok ? r.json() as Promise<AiDecisionsResponse> : Promise.reject(r.status))
              .then((data) => { if (data.runId && Array.isArray(data.items)) setAiDecisionsData(data); })
              .catch(() => {/* use empty */});
          }
          break;
      }
    },
    [apiBaseUrl, selectedRunName, stepsData, assertionsData, recoveryData, aiDecisionsData]
  );

  function handleTabClick(tab: ReportDetailTab) {
    if (tab === "dataDiff") {
      onOpenDataDiff();
      return;
    }
    setActiveTab(tab);
    fetchTabData(tab);
  }

  const handleDownloadArtifacts = useCallback(() => {
    if (!selectedRunName) return;
    if (artifactsData) {
      setArtifactsOpen(true);
      return;
    }
    fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(selectedRunName)}/artifacts`)
      .then((r) => r.ok ? r.json() as Promise<RunArtifactsResponse> : Promise.reject(r.status))
      .then((data) => {
        if (data.runId && Array.isArray(data.items)) {
          setArtifactsData(data);
          setArtifactsOpen(true);
        }
      })
      .catch(() => {/* silent */});
  }, [apiBaseUrl, selectedRunName, artifactsData]);

  const handleRerun = useCallback(() => {
    if (!selectedRunName) return;
    const projectKey = apiReport?.runId?.split("-").slice(0, -1).join("-") ?? "";
    onRerun({
      runId: selectedRunName,
      projectKey,
      environment: "",
      model: ""
    });
  }, [selectedRunName, apiReport, onRerun]);

  // Fallback to synthetic view model when API is unavailable
  const fallbackReport = fetchFailed ? selectReportViewModel(snapshot, selectedRunName) : null;

  const runName = selectedRunName ?? "";
  const hasApiData = apiReport !== null;
  const hasFallback = fallbackReport !== null;

  if (!selectedRunName) {
    return (
      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{title}</p>
            <h3>{t(copy("No run selected", "未选择运行记录", "実行が選択されていません"))}</h3>
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
            <h3>{t(copy("No report available", "暂无报告", "レポートがありません"))}</h3>
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
            <h3>{t(copy("Loading report...", "加载报告中...", "レポートを読み込み中..."))}</h3>
          </div>
        </div>
      </section>
    );
  }

  // Extract display data from API report or fallback
  const status = apiReport?.status ?? fallbackReport?.status ?? "UNKNOWN";
  const caseName = fallbackReport?.caseName ?? apiReport?.runId ?? runName;
  const finishedAt = apiReport?.finishedAt ?? fallbackReport?.finishedAt ?? "";
  const duration = apiReport ? formatDuration(apiReport.durationMs) : fallbackReport?.duration ?? "—";
  const environment = fallbackReport?.environment ?? "";
  const model = fallbackReport?.model ?? "";
  const operator = fallbackReport?.operator ?? "";
  const stepsPassed = apiReport?.stepsPassed ?? fallbackReport?.stepsPassed ?? 0;
  const stepsTotal = apiReport?.stepsTotal ?? fallbackReport?.stepsTotal ?? 1;
  const assertionsPassed = apiReport?.assertionsPassed ?? fallbackReport?.assertionsPassed ?? 0;
  const assertionsTotal = apiReport?.assertionsTotal ?? fallbackReport?.assertionsTotal ?? 0;
  const aiCalls = fallbackReport?.aiCalls ?? 0;
  const aiCost = fallbackReport?.aiCost ?? "—";
  const heals = fallbackReport?.heals ?? 0;
  const recovery = fallbackReport?.recovery ?? "—";

  const subtitleParts = [finishedAt, duration, environment, model, operator].filter(Boolean);

  // Assertions for overview: prefer API real assertions, fallback to synthetic
  const displayAssertions = apiReport?.assertions?.length
    ? apiReport.assertions.map((a) => ({ name: a.name, actual: a.message || a.status, pass: a.pass }))
    : fallbackReport?.assertions ?? [];

  // Screenshots: prefer API artifacts of screenshot kind, fallback to synthetic
  const displayScreenshots = apiReport?.artifacts
    ?.filter((a) => a.kind === "screenshot")
    .map((a, i) => ({
      label: String(i + 1).padStart(2, "0"),
      path: a.label,
      tone: "accent" as const
    })) ?? fallbackReport?.screenshots ?? [];

  const tabDefs: Array<{ key: ReportDetailTab; label: { en: string; zh: string; ja: string } }> = [
    { key: "overview", label: copy("Overview", "概览", "概要") },
    { key: "steps", label: copy("Steps", "步骤", "ステップ") },
    { key: "assertions", label: copy("Assertions", "断言", "アサーション") },
    { key: "dataDiff", label: copy("Data diff", "数据差异", "データ差分") },
    { key: "recovery", label: copy("Recovery", "恢复", "復旧") },
    { key: "aiDecisions", label: copy("AI decisions", "AI 决策", "AI 判断") }
  ];

  return (
    <div className="reportDetailScreen">
      <div className="reportDetailBreadcrumb">
        <button type="button" className="reportDetailBacklink" onClick={onBackToReports}>
          {t(copy("Reports", "报告", "レポート"))}
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
            {t(copy("Download artifacts", "下载产物", "成果物を取得"))}
          </button>
          <button type="button" className="reportsActionButton" onClick={handleRerun}>
            {t(copy("Re-run", "重新执行", "再実行"))}
          </button>
        </div>
      </section>

      {artifactsOpen && artifactsData ? (
        <div className="reportArtifactsDrawer">
          <div className="reportPanelHeader">
            <div className="reportPanelTitle">{t(copy("Artifacts", "产物", "成果物"))} ({artifactsData.items.length})</div>
            <button type="button" className="docParseDismiss" onClick={() => setArtifactsOpen(false)}>×</button>
          </div>
          <div className="reportArtifactList">
            {artifactsData.items.length === 0 ? (
              <p>{t(copy("No artifacts available", "暂无产物", "成果物なし"))}</p>
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
          <button
            key={td.key}
            type="button"
            className={`reportTab ${activeTab === td.key ? "isActive" : ""}`}
            onClick={() => handleTabClick(td.key)}
          >
            {t(td.label)}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="reportOverviewGrid">
          <section className="reportPanelCard">
            <div className="reportPanelTitle">{t(copy("Summary", "摘要", "サマリー"))}</div>
            <div className="reportSummaryHead">
              <div
                className="reportProgressRing"
                style={{ "--progress": `${Math.round((stepsPassed / Math.max(1, stepsTotal)) * 360)}deg` } as CSSProperties}
              >
                <div>{`${stepsPassed}/${stepsTotal}`}</div>
              </div>
              <div className="reportSummaryRate">
                <span>{t(copy("Steps passed", "步骤通过", "通過ステップ"))}</span>
                <strong>{`${Math.round((stepsPassed / Math.max(1, stepsTotal)) * 100)}%`}</strong>
              </div>
            </div>
            <div className="reportStatGrid">
              <div className="reportStatCard">
                <span>{t(copy("Duration", "时长", "所要時間"))}</span>
                <strong>{duration}</strong>
              </div>
              <div className="reportStatCard success">
                <span>{t(copy("Assertions", "断言", "アサーション"))}</span>
                <strong>{`${assertionsPassed}/${assertionsTotal}`}</strong>
              </div>
              <div className="reportStatCard accent">
                <span>{t(copy("AI calls", "AI 调用", "AI 呼び出し"))}</span>
                <strong>{aiCalls}</strong>
              </div>
              <div className="reportStatCard accent4">
                <span>{t(copy("AI cost", "AI 成本", "AI コスト"))}</span>
                <strong>{aiCost}</strong>
              </div>
              <div className="reportStatCard warning">
                <span>{t(copy("Heals", "自愈", "自己修復"))}</span>
                <strong>{heals}</strong>
              </div>
              <div className="reportStatCard success">
                <span>{t(copy("Recovery", "恢复", "復旧"))}</span>
                <strong>{recovery}</strong>
              </div>
            </div>
          </section>

          <section className="reportPanelCard reportPanelMedia">
            <div className="reportPanelHeader">
              <div className="reportPanelTitle">{t(copy("Page screenshots", "页面截图", "ページスクリーンショット"))}</div>
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
              <div className="reportPanelTitle">{t(copy("Assertions", "断言", "アサーション"))}</div>
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
            <div className="reportPanelTitle">{t(copy("Step timeline", "步骤时间线", "ステップタイムライン"))}</div>
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
              <p>{t(copy("No step data available", "暂无步骤数据", "ステップデータなし"))}</p>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "assertions" ? (
        <div className="reportTabPanel">
          <section className="reportPanelCard">
            <div className="reportPanelTitle">{t(copy("Assertion details", "断言详情", "アサーション詳細"))}</div>
            {assertionsData?.items.length ? (
              <div className="reportAssertionList">
                {assertionsData.items.map((item) => (
                  <div key={item.name} className="reportAssertionRow">
                    <div className={`reportAssertionDot ${item.pass ? "pass" : "fail"}`}>{item.pass ? "OK" : "!"}</div>
                    <div className="reportAssertionCopy">
                      <div>{item.name}</div>
                      <span>{item.action} — {item.message || item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>{t(copy("No assertion data available", "暂无断言数据", "アサーションデータなし"))}</p>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "recovery" ? (
        <div className="reportTabPanel">
          <section className="reportPanelCard">
            <div className="reportPanelHeader">
              <div className="reportPanelTitle">{t(copy("Recovery details", "恢复详情", "復旧詳細"))}</div>
              {recoveryData ? (
                <span className={`statusBadge ${recoveryData.status === "SUCCESS" ? "status-success" : recoveryData.status === "PARTIAL" ? "status-info" : "status-failed"}`}>
                  {recoveryData.status}
                </span>
              ) : null}
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
              <p>{t(copy("No recovery data available", "暂无恢复数据", "復旧データなし"))}</p>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "aiDecisions" ? (
        <div className="reportTabPanel">
          <section className="reportPanelCard">
            <div className="reportPanelTitle">{t(copy("AI decision log", "AI 决策日志", "AI 判断ログ"))}</div>
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
              <p>{t(copy("No AI decision data available", "暂无 AI 决策数据", "AI 判断データなし"))}</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
