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
  const [selectedStep, setSelectedStep] = useState<RunStep | null>(null);
  const [selectedLog, setSelectedLog] = useState<RuntimeLogEntry | null>(null);
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setRunStatus(null);
      setSteps([]);
      setRuntimeLog([]);
      setLivePage(null);
      setLoadState("error");
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    setSelectedStep(null);
    setSelectedLog(null);
    if (!runId) {
      setLoadState("idle");
      setErrorMessage("");
      setRunStatus(null);
      setSteps([]);
      setRuntimeLog([]);
      setLivePage(null);
      return;
    }
    void fetchMonitorData(runId);
  }, [runId, fetchMonitorData]);

  async function handlePause() {
    if (!runId || !onPauseRun) {
      return;
    }
    setPauseState({ kind: "pending", message: t(copy("Pausing...", "暂停中...", "一時停止中...")) });
    try {
      await onPauseRun(runId);
      setPauseState({ kind: "success", message: t(copy("Pause requested", "已请求暂停", "一時停止を要求しました")) });
      await fetchMonitorData(runId);
    } catch (error) {
      setPauseState({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  async function handleAbort() {
    if (!runId || !onAbortRun) {
      return;
    }
    setAbortState({ kind: "pending", message: t(copy("Aborting...", "中止中...", "中止中...")) });
    try {
      await onAbortRun(runId);
      setAbortState({ kind: "success", message: t(copy("Abort requested", "已请求中止", "中止を要求しました")) });
      await fetchMonitorData(runId);
    } catch (error) {
      setAbortState({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  if (!runId) {
    return (
      <div className="monitorScreen">
        <section className="monitorHero">
          <div className="monitorHeroMain">
            <p className="monitorPath">
              {t(copy("Executions", "执行", "実行"))} / {t(copy("(no run selected)", "（未选择 run）", "（run 未選択）"))}
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
            <p className="monitorEmptyHint">
              {t(copy(
                "Open a run from the Execution page to start monitoring.",
                "请从 Execution 页面打开一个 run 开始监控。",
                "Execution ページから run を開いて監視を開始してください。"
              ))}
            </p>
          </div>
        </section>
      </div>
    );
  }

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

  const status = runStatus?.status ?? "";
  const progress = runStatus?.progress;
  const counters = runStatus?.counters;
  const control = runStatus?.control;
  const elapsedFormatted = progress ? formatMs(progress.elapsedMs) : "--";
  const estimatedFormatted = progress ? formatMs(progress.estimatedTotalMs) : "--";
  const percentText = progress ? `${progress.percent}%` : "0%";
  const queueLead = snapshot.workQueue[0];
  const runningStep = steps.find((step) => step.state === "RUNNING");
  const activeDetailKind = selectedStep ? "step" : selectedLog ? "log" : null;

  return (
    <div className="monitorScreen">
      <section className="monitorHero">
        <div className="monitorHeroMain">
          <p className="monitorPath">{t(copy("Executions", "执行", "実行"))} / {runId}</p>
          <div className="monitorTitleRow">
            <h2>{runStatus?.projectKey || title}</h2>
            <span className={`monitorBadge ${statusToTone(status)} dot`}>{status.toLowerCase()}</span>
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
            onClick={() => void handlePause()}
          >
            {pauseState.kind === "pending"
              ? t(copy("Pausing...", "暂停中...", "一時停止中..."))
              : t(copy("Pause", "暂停", "一時停止"))}
          </button>
          <button
            className="secondaryButton dangerButton"
            type="button"
            disabled={!control?.canAbort || abortState.kind === "pending"}
            onClick={() => void handleAbort()}
          >
            {abortState.kind === "pending"
              ? t(copy("Aborting...", "中止中...", "中止中..."))
              : t(copy("Abort", "中止", "中止"))}
          </button>
          {pauseState.kind !== "idle" ? (
            <span className={`monitorControlFeedback ${pauseState.kind}`}>{pauseState.message}</span>
          ) : null}
          {abortState.kind !== "idle" ? (
            <span className={`monitorControlFeedback ${abortState.kind}`}>{abortState.message}</span>
          ) : null}
        </div>
      </section>

      <section className="monitorProgressCard">
        <div className="monitorProgressRing" aria-hidden="true">
          <svg viewBox="0 0 52 52">
            <circle className="monitorRingTrack" cx="26" cy="26" r="22" />
            <circle
              className="monitorRingValue"
              cx="26"
              cy="26"
              r="22"
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
                {t(copy("Step", "步骤", "ステップ"))} {progress?.currentStep ?? 0} / {progress?.totalSteps ?? 0}
              </span>
              <strong>{runningStep?.label ?? status}</strong>
            </div>
            <span className="monitorMono">{elapsedFormatted} / ~{estimatedFormatted}</span>
          </div>
          <div className="monitorStepBar" aria-hidden="true">
            {steps.map((step) => (
              <span key={step.index} className={`monitorStepBarItem ${normalizeStepState(step.state)}`} />
            ))}
          </div>
        </div>
        <div className="monitorMiniStats">
          <MiniStat
            label={t(copy("Assertions", "断言", "アサーション"))}
            value={`${counters?.assertionsPassed ?? 0}/${counters?.assertionsTotal ?? 0}`}
            tone="success"
          />
          <MiniStat
            label={t(copy("AI calls", "AI 调用", "AI 呼び出し"))}
            value={String(counters?.aiCalls ?? 0)}
            tone="info"
          />
          <MiniStat
            label={t(copy("Heals", "修复", "修復"))}
            value={String(counters?.heals ?? 0)}
            tone="warning"
          />
        </div>
      </section>

      <div className="monitorGrid">
        <section className="monitorPanel">
          <div className="monitorPanelHeader">
            <h3>{t(copy("Steps timeline", "步骤时间线", "ステップタイムライン"))}</h3>
          </div>
          <div className="monitorStepList">
            {steps.length > 0 ? steps.map((step) => {
              const displayState = normalizeStepState(step.state);
              return (
                <button
                  key={step.index}
                  type="button"
                  className={`monitorStepItem monitorInteractiveRow ${displayState}`}
                  aria-label={`${t(copy("Open step detail", "打开步骤详情", "ステップ詳細を開く"))}: ${step.label}`}
                  onClick={() => {
                    setSelectedStep(step);
                    setSelectedLog(null);
                  }}
                >
                  <span className={`monitorStepDot ${displayState}`}>
                    {displayState === "done" ? "✓" : displayState === "run" ? "…" : step.index}
                  </span>
                  <div className="monitorStepCopy">
                    <strong>{step.label}</strong>
                    <div className="monitorStepMeta">
                      {step.durationMs > 0 ? <span>{(step.durationMs / 1000).toFixed(1)}s</span> : null}
                      {step.startedAt ? <span>{formatTimestamp(step.startedAt)}</span> : null}
                      {displayState === "run" && step.durationMs <= 0 ? <span>live</span> : null}
                      {step.note ? <span className="monitorBadge warning">◈ {step.note}</span> : null}
                    </div>
                  </div>
                </button>
              );
            }) : (
              <p className="monitorEmptyHint">
                {t(copy("No step data available.", "暂无步骤数据。", "ステップデータがありません。"))}
              </p>
            )}
          </div>
        </section>

        <section className="monitorPanel">
          <div className="monitorPanelHeader">
            <h3>{t(copy("Live page", "实时页面", "ライブページ"))}</h3>
            <span className="monitorPill mono">
              <span className="monitorPillIcon info">▣</span>
              {livePage?.url ? safeHostname(livePage.url) : safeHostname(runStatus?.currentPage?.url) || "--"}
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
                  <span>{t(copy("Active step", "当前步骤", "現在のステップ"))}</span>
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
              <button
                key={`${entry.at}-${entry.type}-${index}`}
                type="button"
                className={`monitorLogItem monitorInteractiveRow ${index === 0 ? "isActive" : ""}`}
                aria-label={`${t(copy("Open runtime log detail", "打开运行日志详情", "ランタイムログ詳細を開く"))}: ${entry.type} ${entry.summary}`}
                onClick={() => {
                  setSelectedLog(entry);
                  setSelectedStep(null);
                }}
              >
                <div className="monitorLogMeta">
                  <span className="monitorMono">{formatTimestamp(entry.at)}</span>
                  <span className={`monitorBadge ${logTypeTone(entry.type)}`}>{entry.type.toLowerCase()}</span>
                  {entry.model ? <span className="monitorMono muted">{entry.model}</span> : null}
                </div>
                <p>{entry.summary}</p>
              </button>
            )) : (
              <p className="monitorEmptyHint">
                {t(copy("No runtime log entries.", "暂无运行时日志。", "ランタイムログがありません。"))}
              </p>
            )}
          </div>
        </section>
      </div>

      {activeDetailKind ? (
        <section
          className="monitorPanel monitorDetailPanel"
          aria-label={activeDetailKind === "step" ? "Step detail panel" : "Runtime log detail panel"}
        >
          <div className="monitorPanelHeader monitorDetailHeader">
            <h3>
              {selectedStep
                ? t(copy("Step detail", "步骤详情", "ステップ詳細"))
                : t(copy("Runtime log detail", "运行日志详情", "ランタイムログ詳細"))}
            </h3>
            <span className={`monitorBadge ${selectedStep ? statusToTone(selectedStep.state) : logTypeTone(selectedLog?.type || "")}`}>
              {selectedStep ? selectedStep.state.toLowerCase() : (selectedLog?.type || "log").toLowerCase()}
            </span>
            <button
              className="ghostButton"
              type="button"
              onClick={() => {
                setSelectedStep(null);
                setSelectedLog(null);
              }}
            >
              {t(copy("Close", "关闭", "閉じる"))}
            </button>
          </div>
          <div className="monitorDetailBody">
            {selectedStep ? (
              <div className="monitorDetailGrid">
                <DetailField label={t(copy("Step", "步骤", "ステップ"))} value={`#${selectedStep.index} ${selectedStep.label}`} mono />
                <DetailField label={t(copy("Status", "状态", "状態"))} value={selectedStep.state} mono />
                <DetailField
                  label={t(copy("Duration", "耗时", "所要時間"))}
                  value={selectedStep.durationMs > 0 ? `${(selectedStep.durationMs / 1000).toFixed(1)}s` : "--"}
                  mono
                />
                <DetailField
                  label={t(copy("Started at", "开始时间", "開始時刻"))}
                  value={selectedStep.startedAt ? formatDateTime(selectedStep.startedAt) : t(copy("Not recorded", "未记录", "未記録"))}
                  mono
                />
                <DetailField label={t(copy("Summary", "摘要", "要約"))} value={selectedStep.note || selectedStep.label} />
                <DetailField
                  label={t(copy("Error / note", "错误 / 备注", "エラー / 注記"))}
                  value={selectedStep.note || t(copy(
                    "No error or warning was included in the runtime payload.",
                    "当前运行态 payload 未包含错误或警告信息。",
                    "現在のランタイム payload にエラーや警告は含まれていません。"
                  ))}
                />
              </div>
            ) : selectedLog ? (
              <div className="monitorDetailStack">
                <div className="monitorDetailGrid">
                  <DetailField label={t(copy("Time", "时间", "時刻"))} value={formatDateTime(selectedLog.at)} mono />
                  <DetailField label={t(copy("Level", "级别", "レベル"))} value={selectedLog.type} mono />
                  <DetailField
                    label={t(copy("Source", "来源", "ソース"))}
                    value={selectedLog.source || selectedLog.model || t(copy("Runtime", "运行态", "ランタイム"))}
                    mono
                  />
                  <DetailField label={t(copy("Model", "模型", "モデル"))} value={selectedLog.model || "--"} mono />
                  <DetailField label={t(copy("Message", "消息", "メッセージ"))} value={selectedLog.message || selectedLog.summary} />
                </div>
                <div className="monitorDetailExtras">
                  <h4>{t(copy("Extended fields", "扩展字段", "拡張フィールド"))}</h4>
                  {getRuntimeLogExtraFields(selectedLog).length > 0 ? (
                    <div className="monitorDetailGrid">
                      {getRuntimeLogExtraFields(selectedLog).map(([key, value]) => (
                        <DetailField
                          key={key}
                          label={key}
                          value={value}
                          mono={typeof value === "string" && value.length < 80}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="monitorEmptyHint">
                      {t(copy(
                        "No extended fields were included in the runtime payload.",
                        "当前运行态 payload 未包含扩展字段。",
                        "現在のランタイム payload に拡張フィールドは含まれていません。"
                      ))}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="monitorFooter">
        <div className="monitorFooterItem">
          <span>{t(copy("Queue pressure", "队列压力", "キュー圧力"))}</span>
          <strong>{queueLead?.detail ?? "--"}</strong>
        </div>
        <div className="monitorFooterItem">
          <span>{t(copy("Last event", "最后事件", "最新イベント"))}</span>
          <strong>{runStatus?.lastUpdatedAt ? formatTimestamp(runStatus.lastUpdatedAt) : "--"}</strong>
        </div>
        <div className="monitorFooterItem">
          <span>{t(copy("Owner", "负责人", "担当者"))}</span>
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

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="monitorDetailField">
      <span>{label}</span>
      <strong className={mono ? "monitorMono" : undefined}>{value}</strong>
    </div>
  );
}

function normalizeStepState(state: string): "done" | "run" | "todo" {
  switch (state.toUpperCase()) {
    case "DONE":
    case "PASSED":
    case "SUCCESS":
      return "done";
    case "RUNNING":
    case "STARTED":
    case "IN_PROGRESS":
      return "run";
    default:
      return "todo";
  }
}

function safeHostname(url?: string | null): string {
  if (!url) {
    return "";
  }
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatMs(ms: number): string {
  if (ms <= 0) {
    return "--";
  }
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

function formatDateTime(iso: string): string {
  try {
    const date = new Date(iso);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${formatTimestamp(iso)}`;
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
    case "DECISION":
      return "info";
    case "HEAL":
    case "WARNING":
      return "warning";
    case "PAUSED":
    case "ABORTED":
    case "ERROR":
      return "coral";
    default:
      return "neutral";
  }
}

function getRuntimeLogExtraFields(entry: RuntimeLogEntry): Array<[string, string]> {
  const fields: Array<[string, string]> = [];
  if (entry.detail != null) {
    fields.push(["detail", formatStructuredValue(entry.detail)]);
  }
  if (entry.error) {
    fields.push(["error", entry.error]);
  }

  const knownKeys = new Set(["at", "type", "model", "summary", "source", "message", "detail", "error"]);
  Object.entries(entry as Record<string, unknown>).forEach(([key, value]) => {
    if (knownKeys.has(key) || value == null) {
      return;
    }
    fields.push([key, formatStructuredValue(value)]);
  });
  return fields;
}

function formatStructuredValue(value: unknown): string {
  if (value == null) {
    return "--";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
