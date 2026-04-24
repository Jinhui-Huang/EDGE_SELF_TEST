import { CSSProperties, useEffect, useState } from "react";
import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale, RunReport } from "../types";
import { selectReportViewModel } from "./reportViewModel";

type ReportDetailScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
  selectedRunName: string | null;
  onBackToReports: () => void;
  onOpenDataDiff: () => void;
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
  apiBaseUrl
}: ReportDetailScreenProps) {
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);
  const [apiReport, setApiReport] = useState<RunReport | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    if (!selectedRunName) return;
    setApiReport(null);
    setFetchFailed(false);
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

  // Fallback to synthetic view model when API is unavailable
  const fallbackReport = fetchFailed ? selectReportViewModel(snapshot, selectedRunName) : null;

  // Determine what to render
  const runName = selectedRunName ?? "";
  const hasApiData = apiReport !== null;
  const hasFallback = fallbackReport !== null;

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

  // Loading state
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

  // Build subtitle parts, skipping empty values
  const subtitleParts = [finishedAt, duration, environment, model, operator].filter(Boolean);

  // Assertions: prefer API real assertions, fallback to synthetic
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

  const tabs = [
    t(copy("Overview", "概览", "概要")),
    t(copy("Steps", "步骤", "ステップ")),
    t(copy("Assertions", "断言", "アサーション")),
    t(copy("Data diff", "数据差异", "データ差分")),
    t(copy("Recovery", "恢复", "復旧")),
    t(copy("AI decisions", "AI 决策", "AI 判断"))
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
          <button type="button" className="reportsActionButton ghost">
            {t(copy("Download artifacts", "下载产物", "成果物を取得"))}
          </button>
          <button type="button" className="reportsActionButton">
            {t(copy("Re-run", "重新执行", "再実行"))}
          </button>
        </div>
      </section>

      <div className="reportTabs">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            className={`reportTab ${index === 0 ? "isActive" : ""}`}
            onClick={index === 3 ? onOpenDataDiff : undefined}
          >
            {tab}
          </button>
        ))}
      </div>

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
    </div>
  );
}
