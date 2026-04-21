import { useCallback, useEffect, useState } from "react";
import { translate } from "../i18n";
import {
  AdminConsoleSnapshot,
  LivePage,
  Locale,
  MutationState,
  RunStatus,
  RunStep,
  RunStepsResponse,
  RuntimeLogEntry,
  RuntimeLogResponse
} from "../types";

type MonitorScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
  selectedRunId?: string | null;
  apiBaseUrl: string;
  onPauseRun?: (runId: string) => Promise<void>;
  onAbortRun?: (runId: string) => Promise<void>;
};

type LoadState = "idle" | "loading" | "loaded" | "error";

type Copy = { en: string; zh: string; ja: string };
const copy = (en: string, zh = en, ja = en): Copy => ({ en, zh, ja });

export function MonitorScreen({
  snapshot,
  title,
  locale,
  selectedRunId,
  apiBaseUrl,
  onPauseRun,
  onAbortRun
}: MonitorScreenProps) {
  const t = (value: Copy) => translate(locale, value);
  const runId = selectedRunId ?? null;

  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [runtimeLog, setRuntimeLog] = useState<RuntimeLogEntry[]>([]);
  const [livePage, setLivePage] = useState<LivePage | null>(null);
  const [pauseState, setPauseState] = useState<MutationState>({ kind: "idle", message: "" });
  const [abortState, setAbortState] = useState<MutationState>({ kind: "idle", message: "" });

  const fetchMonitorData = useCallback(async (fetchRunId: string) => {
    setLoadState("loading");
    setErrorMessage("");
    try {
      const [statusRes, stepsRes, logRes, liveRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(fetchRunId)}/status`),
        fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(fetchRunId)}/steps`),
        fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(fetchRunId)}/runtime-log`),
        fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(fetchRunId)}/live-page`)
      ]);
      if (!statusRes.ok) {
        throw new Error(`Status API: HTTP ${statusRes.status}`);
      }
      const statusData = (await statusRes.json()) as RunStatus;
      const stepsData = stepsRes.ok ? ((await stepsRes.json()) as RunStepsResponse) : { items: [] };
      const logData = logRes.ok ? ((await logRes.json()) as RuntimeLogResponse) : { items: [] };
      const liveData = liveRes.ok ? ((await liveRes.json()) as LivePage) : null;

      setRunStatus(statusData);
      setSteps(stepsData.items ?? []);
      setRuntimeLog(logData.items ?? []);
      setLivePage(liveData);
      setLoadState("loaded");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setLoadState("error");
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!runId) {
      setLoadState("idle");
      setRunStatus(null);
      setSteps([]);
      setRuntimeLog([]);
      setLivePage(null);
      return;
    }
    fetchMonitorData(runId);
  }, [runId, fetchMonitorData]);

  async function handlePause() {
    if (!runId || !onPauseRun) return;
    setPauseState({ kind: "pending", message: t(copy("Pausing...", "暂停中...", "一時停止中...")) });
    try {
      await onPauseRun(runId);
      setPauseState({ kind: "success", message: t(copy("Pause requested", "已请求暂停", "一時停止をリクエスト")) });
      await fetchMonitorData(runId);
    } catch (err) {
      setPauseState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  async function handleAbort() {
    if (!runId || !onAbortRun) return;
    setAbortState({ kind: "pending", message: t(copy("Aborting...", "终止中...", "中止中...")) });
    try {
      await onAbortRun(runId);
      setAbortState({ kind: "success", message: t(copy("Abort requested", "已请求终止", "中止をリクエスト")) });
      await fetchMonitorData(runId);
    } catch (err) {
      setAbortState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  // ---- Derived display values ----
  const status = runStatus?.status ?? "";
  const progress = runStatus?.progress;
  const counters = runStatus?.counters;
  const control = runStatus?.control;
  const elapsedFormatted = progress ? formatMs(progress.elapsedMs) : "--";
  const estimatedFormatted = progress ? formatMs(progress.estimatedTotalMs) : "--";
  const percentText = progress ? `${progress.percent}%` : "0%";

  // ---- Idle / no run selected ----
  if (!runId) {
    return (
      <div className="monitorScreen">
        <section className="monitorHero">
          <div className="monitorHeroMain">
            <p className="monitorPath">
              {t(copy("Executions", "执行", "実行"))} / {t(copy("(no run selected)", "(未选择运行)", "(実行未選択)"))}
            </p>
            <div className="monitorTitleRow">
              <h2>{title}</h2>
              <span className="monitorBadge neutral dot">{t(copy("idle", "空闲", "待機中"))}</span>
            </div>
          </div>
        </section>
        <section className="monitorProgressCard">
          <div className="monitorProgressRing" aria-hidden="true">
            <svg viewBox="0 0 52 52">
              <circle className="monitorRingTrack" cx="26" cy="26" r="22" />
            </svg>
            <span>--</span>
          </div>
          <div className="monitorProgressBody">
            <p className="monitorEmptyHint">{t(copy(
              "Open a run from the Execution page to start monitoring.",
              "从执行页面打开一个运行以开始监控。",
              "実行ページからランを開いてモニタリングを開始してください。"
            ))}</p>
          </div>
        </section>
      </div>
    );
  }

  // ---- Loading state ----
  if (loadState === "loading" && !runStatus) {
    return (
      <div className="monitorScreen">
        <section className="monitorHero">
          <div className="monitorHeroMain">
            <p className="monitorPath">{t(copy("Executions", "执行", "実行"))} / {runId}</p>
            <div className="monitorTitleRow">
              <h2>{title}</h2>
              <span className="monitorBadge info dot">{t(copy("loading", "加载中", "読み込み中"))}</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ---- Error state ----
  if (loadState === "error" && !runStatus) {
    return (
      <div className="monitorScreen">
        <section className="monitorHero">
          <div className="monitorHeroMain">
            <p className="monitorPath">{t(copy("Executions", "执行", "実行"))} / {runId}</p>
            <div className="monitorTitleRow">
              <h2>{title}</h2>
              <span className="monitorBadge warning dot">{t(copy("error", "错误", "エラー"))}</span>
            </div>
          </div>
        </section>
        <section className="monitorProgressCard">
          <div className="monitorProgressBody">
            <p className="monitorErrorHint">{errorMessage}</p>
          </div>
        </section>
      </div>
    );
  }

  // ---- Loaded state with real data ----
  const statusBadgeTone = statusToTone(status);
  const queueLead = snapshot.workQueue[0];

  return (
    <div className="monitorScreen">
      <section className="monitorHero">
        <div className="monitorHeroMain">
          <p className="monitorPath">
            {t(copy("Executions", "执行", "実行"))} / {runId}
          </p>
          <div className="monitorTitleRow">
            <h2>{runStatus?.projectKey || title}</h2>
            <span className={`monitorBadge ${statusBadgeTone} dot`}>{status.toLowerCase()}</span>
            <span className="monitorPill">
              <span className="monitorPillIcon mint">▸</span>
              {runStatus?.environment || "staging"}
            </span>
            <span className="monitorPill">
              <span className="monitorPillIcon info">●</span>
              {runStatus?.model || "--"}
            </span>
          </div>
        </div>
        <div className="monitorHeroActions">
          <button
            className="ghostButton"
            type="button"
            disabled={!control?.canPause || pauseState.kind === "pending"}
            onClick={handlePause}
          >
            {pauseState.kind === "pending" ? t(copy("Pausing...", "暂停中...", "一時停止中...")) : t(copy("Pause", "暂停", "一時停止"))}
          </button>
          <button
            className="secondaryButton dangerButton"
            type="button"
            disabled={!control?.canAbort || abortState.kind === "pending"}
            onClick={handleAbort}
          >
            {abortState.kind === "pending" ? t(copy("Aborting...", "终止中...", "中止中...")) : t(copy("Abort", "终止", "中止"))}
          </button>
          {pauseState.kind !== "idle" && <span className={`monitorControlFeedback ${pauseState.kind}`}>{pauseState.message}</span>}
          {abortState.kind !== "idle" && <span className={`monitorControlFeedback ${abortState.kind}`}>{abortState.message}</span>}
        </div>
      </section>

      <section className="monitorProgressCard">
        <div className="monitorProgressRing" aria-hidden="true">
          <svg viewBox="0 0 52 52">
            <circle className="monitorRingTrack" cx="26" cy="26" r="22" />
            <circle
              className="monitorRingValue"
              cx="26" cy="26" r="22"
              pathLength="100"
              strokeDasharray={`${progress?.percent ?? 0} ${100 - (progress?.percent ?? 0)}`}
            />
          </svg>
          <span>{percentText}</span>
        </div>
        <div className="monitorProgressBody">
          <div className="monitorProgressMeta">
            <div>
              <span className="monitorProgressLabel">
                {t(copy("Step", "当前步骤", "現在のステップ"))} {progress?.currentStep ?? 0} / {progress?.totalSteps ?? 0}
              </span>
              <strong>{steps.find((s) => s.state === "RUNNING")?.label ?? status}</strong>
            </div>
            <span className="monitorMono">{elapsedFormatted} / ~{estimatedFormatted}</span>
          </div>
          <div className="monitorStepBar" aria-hidden="true">
            {steps.map((step) => (
              <span key={step.index} className={`monitorStepBarItem ${step.state.toLowerCase()}`} />
            ))}
          </div>
        </div>
        <div className="monitorMiniStats">
          <MiniStat
            label={t(copy("Assertions", "断言", "アサーション"))}
            value={`${counters?.assertionsPassed ?? 0}/${counters?.assertionsTotal ?? 0}`}
            tone="success"
          />
          <MiniStat label={t(copy("AI calls", "AI 调用", "AI 呼び出し"))} value={String(counters?.aiCalls ?? 0)} tone="info" />
          <MiniStat label={t(copy("Heals", "自愈", "自己修復"))} value={String(counters?.heals ?? 0)} tone="warning" />
        </div>
      </section>

      <div className="monitorGrid">
        <section className="monitorPanel">
          <div className="monitorPanelHeader">
            <h3>{t(copy("Steps timeline", "步骤时间线", "ステップタイムライン"))}</h3>
          </div>
          <div className="monitorStepList">
            {steps.length > 0 ? steps.map((step) => {
              const state = step.state.toLowerCase() as "done" | "running" | "todo";
              const displayState = state === "running" ? "run" : state;
              return (
                <article key={step.index} className={`monitorStepItem ${displayState}`}>
                  <span className={`monitorStepDot ${displayState}`}>
                    {state === "done" ? "✓" : state === "running" ? "…" : step.index}
                  </span>
                  <div className="monitorStepCopy">
                    <strong>{step.label}</strong>
                    <div className="monitorStepMeta">
                      {step.durationMs > 0 ? <span>{(step.durationMs / 1000).toFixed(1)}s</span> : state === "running" ? <span>live</span> : null}
                      {step.note ? <span className="monitorBadge warning">◈ {step.note}</span> : null}
                    </div>
                  </div>
                </article>
              );
            }) : (
              <p className="monitorEmptyHint">{t(copy("No step data available.", "暂无步骤数据。", "ステップデータがありません。"))}</p>
            )}
          </div>
        </section>

        <section className="monitorPanel">
          <div className="monitorPanelHeader">
            <h3>{t(copy("Live page", "实时页面", "ライブページ"))}</h3>
            <span className="monitorPill mono">
              <span className="monitorPillIcon info">▣</span>
              {livePage?.url ? new URL(livePage.url).hostname : runStatus?.currentPage?.url || "--"}
            </span>
          </div>
          <div className="monitorViewport">
            <div className="monitorCheckoutMock">
              <div className="monitorCheckoutTitle">{livePage?.title ?? runId}</div>
              <div className="monitorCheckoutGrid">
                <div className="monitorField">
                  <span>URL</span>
                  <div>{livePage?.url ?? runStatus?.currentPage?.url ?? "--"}</div>
                </div>
                <div className="monitorField">
                  <span>{t(copy("Page state", "页面状态", "ページ状態"))}</span>
                  <div>{livePage?.pageState ?? "--"}</div>
                </div>
                <div className="monitorField">
                  <span>{t(copy("Active step", "活动步骤", "アクティブステップ"))}</span>
                  <div>{livePage?.highlight?.action || "--"}</div>
                </div>
              </div>
            </div>
            {livePage?.highlight?.stepIndex ? (
              <div className="monitorHighlight">
                <span>step {livePage.highlight.stepIndex} · {livePage.highlight.action || "active"}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="monitorPanel">
          <div className="monitorPanelHeader">
            <h3>{t(copy("AI runtime log", "AI 运行时日志", "AI ランタイムログ"))}</h3>
            {status === "RUNNING" ? <span className="monitorBadge info dot">live</span> : null}
          </div>
          <div className="monitorLogList">
            {runtimeLog.length > 0 ? runtimeLog.map((entry, index) => (
              <article key={`${entry.at}-${entry.type}-${index}`} className={`monitorLogItem ${index === 0 ? "isActive" : ""}`}>
                <div className="monitorLogMeta">
                  <span className="monitorMono">{formatTimestamp(entry.at)}</span>
                  <span className={`monitorBadge ${logTypeTone(entry.type)}`}>{entry.type.toLowerCase()}</span>
                  {entry.model ? <span className="monitorMono muted">{entry.model}</span> : null}
                </div>
                <p>{entry.summary}</p>
              </article>
            )) : (
              <p className="monitorEmptyHint">{t(copy("No runtime log entries.", "暂无运行时日志。", "ランタイムログがありません。"))}</p>
            )}
          </div>
        </section>
      </div>

      <section className="monitorFooter">
        <div className="monitorFooterItem">
          <span>{t(copy("Queue pressure", "队列压力", "キュー負荷"))}</span>
          <strong>{queueLead?.detail ?? "--"}</strong>
        </div>
        <div className="monitorFooterItem">
          <span>{t(copy("Last event", "最近事件", "直近イベント"))}</span>
          <strong>{runStatus?.lastUpdatedAt ? formatTimestamp(runStatus.lastUpdatedAt) : "--"}</strong>
        </div>
        <div className="monitorFooterItem">
          <span>{t(copy("Owner", "责任人", "担当者"))}</span>
          <strong>{runStatus?.owner ?? "--"}</strong>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "success" | "info" | "warning" }) {
  return (
    <div className={`monitorMiniStat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMs(ms: number): string {
  if (ms <= 0) return "--";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

function statusToTone(status: string): string {
  switch (status.toUpperCase()) {
    case "RUNNING":
    case "IN_PROGRESS":
    case "STARTED":
      return "info";
    case "OK":
    case "SUCCESS":
    case "SUCCEEDED":
    case "PASSED":
      return "success";
    case "FAILED":
    case "ERROR":
      return "warning";
    case "PAUSED":
    case "PAUSING":
      return "neutral";
    case "ABORTED":
    case "ABORTING":
      return "coral";
    default:
      return "neutral";
  }
}

function logTypeTone(type: string): string {
  switch (type.toUpperCase()) {
    case "STARTED":
    case "RUNNING":
    case "INFO":
      return "info";
    case "HEAL":
      return "warning";
    case "PAUSED":
    case "ABORTED":
      return "coral";
    default:
      return "neutral";
  }
}
