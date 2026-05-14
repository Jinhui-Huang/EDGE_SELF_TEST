import { useCallback, useEffect, useState } from "react";
import { translate } from "../i18n";
import {
  AdminConsoleSnapshot,
  LivePage,
  Locale,
  MutationState,
  RunControlResponse,
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
  onPauseRun?: (runId: string) => Promise<RunControlResponse>;
  onAbortRun?: (runId: string) => Promise<RunControlResponse>;
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
  const [statusSourceLayer, setStatusSourceLayer] = useState<RunStatus["sourceLayer"] | null>(null);
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [stepsAvailability, setStepsAvailability] = useState<"AVAILABLE" | "UNAVAILABLE">("UNAVAILABLE");
  const [stepsSourceLayer, setStepsSourceLayer] = useState<RunStepsResponse["sourceLayer"] | null>(null);
  const [runtimeLog, setRuntimeLog] = useState<RuntimeLogEntry[]>([]);
  const [runtimeLogAvailability, setRuntimeLogAvailability] = useState<"AVAILABLE" | "UNAVAILABLE">("UNAVAILABLE");
  const [runtimeLogSourceLayer, setRuntimeLogSourceLayer] = useState<RuntimeLogResponse["sourceLayer"] | null>(null);
  const [livePage, setLivePage] = useState<LivePage | null>(null);
  const [livePageSourceLayer, setLivePageSourceLayer] = useState<LivePage["sourceLayer"] | null>(null);
  const [selectedStep, setSelectedStep] = useState<RunStep | null>(null);
  const [selectedLog, setSelectedLog] = useState<RuntimeLogEntry | null>(null);
  const [pauseState, setPauseState] = useState<MutationState>({ kind: "idle", message: "" });
  const [abortState, setAbortState] = useState<MutationState>({ kind: "idle", message: "" });
  const [controlFeedbackState, setControlFeedbackState] = useState<MutationState>({ kind: "idle", message: "" });
  const [optimisticControlResponse, setOptimisticControlResponse] = useState<RunControlResponse | null>(null);

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
      const stepsData = stepsRes.ok
        ? ((await stepsRes.json()) as RunStepsResponse)
        : { items: [], availability: "UNAVAILABLE" as const };
      const logData = logRes.ok
        ? ((await logRes.json()) as RuntimeLogResponse)
        : { items: [], availability: "UNAVAILABLE" as const, nextCursor: null };
      const liveData = liveRes.ok ? ((await liveRes.json()) as LivePage) : null;

      setRunStatus(statusData);
      setStatusSourceLayer(resolveStatusSourceLayer(statusData));
      setSteps(stepsData.items ?? []);
      setStepsAvailability(resolveStepsAvailability(stepsData));
      setStepsSourceLayer(resolveStepsSourceLayer(stepsData));
      setRuntimeLog(logData.items ?? []);
      setRuntimeLogAvailability(resolveRuntimeLogAvailability(logData));
      setRuntimeLogSourceLayer(resolveRuntimeLogSourceLayer(logData));
      setLivePage(liveData);
      setLivePageSourceLayer(liveData ? resolveLivePageSourceLayer(liveData) : null);
      setOptimisticControlResponse((current) =>
        shouldClearOptimisticControlResponse(current, statusData.status) ? null : current
      );
      setLoadState("loaded");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setRunStatus(null);
      setStatusSourceLayer(null);
      setSteps([]);
      setStepsAvailability("UNAVAILABLE");
      setStepsSourceLayer(null);
      setRuntimeLog([]);
      setRuntimeLogAvailability("UNAVAILABLE");
      setRuntimeLogSourceLayer(null);
      setLivePage(null);
      setLivePageSourceLayer(null);
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
      setStatusSourceLayer(null);
      setSteps([]);
      setStepsAvailability("UNAVAILABLE");
      setStepsSourceLayer(null);
      setRuntimeLog([]);
      setRuntimeLogAvailability("UNAVAILABLE");
      setRuntimeLogSourceLayer(null);
      setLivePage(null);
      setLivePageSourceLayer(null);
      setControlFeedbackState({ kind: "idle", message: "" });
      setOptimisticControlResponse(null);
      return;
    }
    void fetchMonitorData(runId);
  }, [runId, fetchMonitorData]);

  async function handlePause() {
    if (!runId || !onPauseRun) {
      return;
    }
    setControlFeedbackState({ kind: "idle", message: "" });
    setAbortState({ kind: "idle", message: "" });
    setPauseState({ kind: "pending", message: t(copy("Pausing...", "暂停中...", "一時停止中...")) });
    try {
      const result = await onPauseRun(runId);
      if (result.status !== "ACCEPTED") {
        const resultState = describeControlResultState("pause", result, t);
        setOptimisticControlResponse(null);
        setPauseState({ kind: "idle", message: "" });
        setControlFeedbackState(resultState);
        await fetchMonitorData(runId);
        return;
      }
      setControlFeedbackState({ kind: "idle", message: "" });
      setOptimisticControlResponse(result);
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
    setControlFeedbackState({ kind: "idle", message: "" });
    setPauseState({ kind: "idle", message: "" });
    setAbortState({ kind: "pending", message: t(copy("Aborting...", "中止中...", "中止中...")) });
    try {
      const result = await onAbortRun(runId);
      if (result.status !== "ACCEPTED") {
        const resultState = describeControlResultState("abort", result, t);
        setOptimisticControlResponse(null);
        setAbortState({ kind: "idle", message: "" });
        setControlFeedbackState(resultState);
        await fetchMonitorData(runId);
        return;
      }
      setControlFeedbackState({ kind: "idle", message: "" });
      setOptimisticControlResponse(result);
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

  const status = optimisticControlResponse?.requestedState ?? runStatus?.status ?? "";
  const progress = runStatus?.progress;
  const counters = runStatus?.counters;
  const control = mergeOptimisticControl(runStatus?.control, optimisticControlResponse);
  const elapsedFormatted = progress ? formatMs(progress.elapsedMs) : "--";
  const estimatedFormatted = progress ? formatMs(progress.estimatedTotalMs) : "--";
  const percentText = progress ? `${progress.percent}%` : "0%";
  const queueLead = snapshot.workQueue[0];
  const runningStep = steps.find((step) => step.state === "RUNNING");
  const showUnavailableSteps = stepsAvailability === "UNAVAILABLE";
  const showUnavailableRuntimeLog = runtimeLogAvailability === "UNAVAILABLE";
  const stepsSourceText = stepsSourceLayer ? describeStepSourceLayer(stepsSourceLayer, t) : null;
  const runtimeLogSourceText = runtimeLogSourceLayer ? describeRuntimeLogSourceLayer(runtimeLogSourceLayer, t) : null;
  const livePageSourceText = livePageSourceLayer ? describeLivePageSourceLayer(livePageSourceLayer, t) : null;
  const statusSourceText = statusSourceLayer ? describeStatusSourceLayer(statusSourceLayer, t) : null;
  const controlRequestSummary = describeControlRequestSummary(control, status, t);
  const controlPhaseBanner = describeControlPhaseBanner(status, t);
  const activeDetailKind = selectedStep ? "step" : selectedLog ? "log" : null;
  const livePageStatus = livePage?.status ?? "UNAVAILABLE";
  const liveScreenshotUrl = runId && livePage?.screenshotPath
    ? `${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(runId)}/artifacts/content?path=${encodeURIComponent(livePage.screenshotPath)}`
    : null;

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
            {statusSourceText ? <span className="monitorPill mono">{statusSourceText}</span> : null}
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
          {controlFeedbackState.kind !== "idle" ? (
            <span className={`monitorControlFeedback ${controlFeedbackState.kind}`}>{controlFeedbackState.message}</span>
          ) : null}
          {controlRequestSummary ? (
            <span className="monitorControlFeedback neutral">{controlRequestSummary}</span>
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
          {controlPhaseBanner ? (
            <p className="monitorControlFeedback warning">{controlPhaseBanner}</p>
          ) : null}
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
          {showUnavailableSteps && isControlPhaseStatus(status) ? (
            <p className="monitorEmptyHint">{describeStepsProgressEmptyHint(status, t)}</p>
          ) : null}
          {showUnavailableSteps && !isControlPhaseStatus(status) ? (
            <p className="monitorEmptyHint">
              {t(copy(
                "No scheduler-backed step timeline is available yet.",
                "当前还没有可用的调度步骤时间线。",
                "利用可能なスケジューラ由来のステップタイムラインはまだありません。"
              ))}
            </p>
          ) : null}
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
            {stepsSourceText ? <span className="monitorPill mono">{stepsSourceText}</span> : null}
            <h3>{t(copy("Steps timeline", "步骤时间线", "ステップタイムライン"))}</h3>
          </div>
          <div className="monitorStepList">
            {!showUnavailableSteps ? steps.map((step) => {
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
            }) : isControlPhaseStatus(status) ? (
              <p className="monitorEmptyHint">{describeStepsPanelEmptyHint(status, t)}</p>
            ) : (
              <p className="monitorEmptyHint">
                {t(copy(
                  "No report step artifact or scheduler step timeline is available yet.",
                  "当前没有 report step artifact，也没有可用的调度步骤时间线。",
                  "report step artifact もスケジューラのステップタイムラインもまだ利用できません。"
                ))}
              </p>
            )}
          </div>
        </section>

        <section className="monitorPanel">
          <div className="monitorPanelHeader">
            <h3>{t(copy("Live page", "实时页面", "ライブページ"))}</h3>
            {livePageSourceText ? <span className="monitorPill mono">{livePageSourceText}</span> : null}
            <span className="monitorPill mono">
              <span className="monitorPillIcon info">▣</span>
              {livePageStatus === "AVAILABLE" ? safeHostname(livePage?.url) || "--" : "--"}
            </span>
          </div>
          <div className="monitorViewport">
            {livePageStatus === "UNAVAILABLE" ? (
              <>
                {isControlPhaseStatus(status) ? (
                  <p className="monitorEmptyHint">{describeLivePageEmptyHint(status, t)}</p>
                ) : null}
                <p className="monitorEmptyHint">
                {t(copy(
                  "No live page artifact available.",
                  "当前没有可读的 live page 产物。",
                  "利用可能な live page artifact はまだありません。"
                ))}
                </p>
                <div className="monitorCheckoutMock">
                  <div className="monitorCheckoutTitle">{livePage?.title || runId}</div>
                  <div className="monitorCheckoutGrid">
                    <div className="monitorField">
                      <span>URL</span>
                      <div>{livePage?.url ?? runStatus?.currentPage?.url ?? "--"}</div>
                    </div>
                    <div className="monitorField">
                      <span>Page state</span>
                      <div>{livePage?.pageState ?? runStatus?.currentPage?.state ?? "--"}</div>
                    </div>
                    {livePage?.summary ? (
                      <div className="monitorField">
                        <span>{t(copy("Summary", "摘要", "要約"))}</span>
                        <div>{livePage.summary}</div>
                      </div>
                    ) : null}
                    <div className="monitorField">
                      <span>Context</span>
                      <div>{livePage?.highlight?.action || "--"}</div>
                    </div>
                    <div className="monitorField">
                      <span>Locator</span>
                      <div>{livePage?.highlight?.target || "--"}</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {liveScreenshotUrl ? (
                  <img
                    className="monitorScreenshotPreview"
                    src={liveScreenshotUrl}
                    alt={livePage?.title || runId}
                  />
                ) : null}
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
                {livePage?.summary ? (
                  <div className="monitorField">
                    <span>{t(copy("Summary", "摘要", "要約"))}</span>
                    <div>{livePage.summary}</div>
                  </div>
                ) : null}
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
              </>
            )}
          </div>
        </section>

        <section className="monitorPanel">
          <div className="monitorPanelHeader">
            <h3>{t(copy("AI runtime log", "AI 运行时日志", "AI ランタイムログ"))}</h3>
            {status === "RUNNING" ? <span className="monitorBadge info dot">live</span> : null}
            {runtimeLogSourceText ? <span className="monitorPill mono">{runtimeLogSourceText}</span> : null}
          </div>
          <div className="monitorLogList">
            {showUnavailableRuntimeLog && isControlPhaseStatus(status) ? (
              <p className="monitorEmptyHint">{describeRuntimeLogEmptyHint(status, t)}</p>
            ) : !showUnavailableRuntimeLog ? runtimeLog.map((entry, index) => (
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

function normalizeStepState(state: string): "done" | "run" | "todo" | "fail" | "skip" {
  switch (state.toUpperCase()) {
    case "DONE":
    case "PASSED":
    case "SUCCESS":
      return "done";
    case "RUNNING":
    case "STARTED":
    case "IN_PROGRESS":
      return "run";
    case "FAILED":
    case "ERROR":
      return "fail";
    case "SKIPPED":
    case "CANCELLED":
    case "ABORTED":
      return "skip";
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
      return "coral";
    case "SKIPPED":
    case "CANCELLED":
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

function resolveStatusSourceLayer(statusData: RunStatus): RunStatus["sourceLayer"] | null {
  if (statusData.sourceLayer === "RUN_ARTIFACTS" || statusData.sourceLayer === "SCHEDULER_FALLBACK") {
    return statusData.sourceLayer;
  }
  if ((statusData.currentPage?.state ?? "") === "artifact-captured") {
    return "RUN_ARTIFACTS";
  }
  return "SCHEDULER_FALLBACK";
}

function describeStatusSourceLayer(
  sourceLayer: NonNullable<RunStatus["sourceLayer"]>,
  t: (copySet: Copy) => string
): string {
  const prefix = t(copy("Source", "来源", "ソース"));
  switch (sourceLayer) {
    case "RUN_ARTIFACTS":
      return `${prefix}: ${t(copy("run artifacts", "run artifacts", "run artifacts"))}`;
    case "SCHEDULER_FALLBACK":
      return `${prefix}: ${t(copy("scheduler fallback", "scheduler fallback", "scheduler fallback"))}`;
    default:
      return prefix;
  }
}

function describeControlRequestSummary(
  control: RunStatus["control"] | null | undefined,
  status: string,
  t: (copySet: Copy) => string
): string | null {
  if (!control || (status !== "PAUSING" && status !== "ABORTING")) {
    return null;
  }
  const requestedBy = control.requestedBy?.trim() ?? "";
  const requestReason = control.requestReason?.trim() ?? "";
  const requestedAt = control.requestedAt?.trim() ?? "";
  if (!requestedBy && !requestReason && !requestedAt) {
    return null;
  }

  const action = status === "PAUSING"
    ? t(copy("Pause requested", "已请求暂停", "一時停止を要求済み"))
    : t(copy("Abort requested", "已请求终止", "中止を要求済み"));
  const byPart = requestedBy ? ` ${t(copy("by", "由", "by"))} ${requestedBy}` : "";
  const atPart = requestedAt ? ` ${t(copy("at", "于", "at"))} ${formatTimestamp(requestedAt)}` : "";
  const reasonPart = requestReason ? ` - ${requestReason}` : "";
  return `${action}${byPart}${atPart}${reasonPart}`;
}

function describeControlPhaseBanner(status: string, t: (copySet: Copy) => string): string | null {
  if (status !== "PAUSING" && status !== "ABORTING") {
    return null;
  }
  const phaseLead = status === "PAUSING"
    ? t(copy("Pause request is in progress.", "暂停请求进行中。", "一時停止リクエストを処理中です。"))
    : t(copy("Abort request is in progress.", "终止请求进行中。", "中止リクエストを処理中です。"));
  const snapshotNote = t(copy(
    "Runtime log, steps, and live page may remain on the last snapshot until the control phase settles.",
    "在控制阶段完成前，运行日志、步骤和实时页面可能暂时停留在旧快照上。",
    "制御フェーズが落ち着くまで、ランタイムログ・ステップ・ライブページは直前のスナップショットのまま残ることがあります。"
  ));
  return `${phaseLead} ${snapshotNote}`;
}

function describeControlResultState(
  action: "pause" | "abort",
  result: RunControlResponse,
  t: (copySet: Copy) => string
): MutationState {
  const fallbackMessage = result.message || `Control returned ${result.status}.`;
  switch (result.status) {
    case "ALREADY_PAUSED":
      return {
        kind: "warning",
        message: t(copy(
          `Pause skipped: ${fallbackMessage}`,
          `暂停已跳过：${fallbackMessage}`,
          `一時停止はスキップされました: ${fallbackMessage}`
        ))
      };
    case "ALREADY_ABORTED":
      return {
        kind: "warning",
        message: t(copy(
          `Abort skipped: ${fallbackMessage}`,
          `终止已跳过：${fallbackMessage}`,
          `中止はスキップされました: ${fallbackMessage}`
        ))
      };
    case "REJECTED":
      return {
        kind: "warning",
        message: t(copy(
          `${action === "pause" ? "Pause" : "Abort"} not accepted: ${fallbackMessage}`,
          `${action === "pause" ? "暂停" : "终止"}未被接受：${fallbackMessage}`,
          `${action === "pause" ? "一時停止" : "中止"}は受理されませんでした: ${fallbackMessage}`
        ))
      };
    default:
      return {
        kind: "error",
        message: fallbackMessage
      };
  }
}

function mergeOptimisticControl(
  control: RunStatus["control"] | null | undefined,
  optimisticControlResponse: RunControlResponse | null
): RunStatus["control"] | undefined {
  if (!optimisticControlResponse) {
    return control ?? undefined;
  }
  const requestedState = optimisticControlResponse.requestedState;
  return {
    canPause: false,
    canAbort: requestedState === "ABORTING" ? false : true,
    requestedBy: optimisticControlResponse.requestedBy ?? control?.requestedBy,
    requestReason: optimisticControlResponse.requestReason ?? control?.requestReason,
    requestedAt: optimisticControlResponse.requestedAt ?? control?.requestedAt
  };
}

function shouldClearOptimisticControlResponse(
  optimisticControlResponse: RunControlResponse | null,
  nextStatus: string
): boolean {
  if (!optimisticControlResponse || !nextStatus) {
    return false;
  }
  if (nextStatus === optimisticControlResponse.requestedState) {
    return true;
  }
  if (optimisticControlResponse.requestedState === "PAUSING" && nextStatus === "PAUSED") {
    return true;
  }
  if (optimisticControlResponse.requestedState === "ABORTING" && nextStatus === "ABORTED") {
    return true;
  }
  return false;
}

function isControlPhaseStatus(status: string): boolean {
  return status === "PAUSING" || status === "ABORTING";
}

function describeStepsProgressEmptyHint(status: string, t: (copySet: Copy) => string): string {
  if (status === "PAUSING") {
    return t(copy(
      "No newer scheduler-backed step timeline is available while the pause request is still in progress.",
      "暂停请求仍在进行中，暂时还没有更新的 scheduler 步骤时间线。",
      "一時停止リクエストの処理中は、新しい scheduler ベースのステップタイムラインがまだ出ないことがあります。"
    ));
  }
  if (status === "ABORTING") {
    return t(copy(
      "No newer scheduler-backed step timeline is available while the abort request is still in progress.",
      "终止请求仍在进行中，暂时还没有更新的 scheduler 步骤时间线。",
      "中止リクエストの処理中は、新しい scheduler ベースのステップタイムラインがまだ出ないことがあります。"
    ));
  }
  return t(copy(
    "No scheduler-backed step timeline is available yet.",
    "暂无可用的 scheduler 步骤时间线。",
    "利用可能な scheduler ベースのステップタイムラインはまだありません。"
  ));
}

function describeStepsPanelEmptyHint(status: string, t: (copySet: Copy) => string): string {
  if (status === "PAUSING") {
    return t(copy(
      "No newer report step artifact or scheduler step timeline is available while the pause request is still in progress.",
      "暂停请求仍在进行中，暂时还没有更新的 report step artifact 或 scheduler 步骤时间线。",
      "一時停止リクエストの処理中は、新しい report step artifact や scheduler ステップタイムラインがまだ出ないことがあります。"
    ));
  }
  if (status === "ABORTING") {
    return t(copy(
      "No newer report step artifact or scheduler step timeline is available while the abort request is still in progress.",
      "终止请求仍在进行中，暂时还没有更新的 report step artifact 或 scheduler 步骤时间线。",
      "中止リクエストの処理中は、新しい report step artifact や scheduler ステップタイムラインがまだ出ないことがあります。"
    ));
  }
  return t(copy(
    "No report step artifact or scheduler step timeline is available yet.",
    "暂无 report step artifact 或 scheduler 步骤时间线。",
    "report step artifact も scheduler ステップタイムラインもまだ利用できません。"
  ));
}

function describeRuntimeLogEmptyHint(status: string, t: (copySet: Copy) => string): string {
  if (status === "PAUSING") {
    return t(copy(
      "No newer runtime log entries are available while the pause request is still in progress.",
      "暂停请求仍在进行中，暂时还没有新的运行时日志条目。",
      "一時停止リクエストの処理中は、新しいランタイムログ項目がまだ出ないことがあります。"
    ));
  }
  if (status === "ABORTING") {
    return t(copy(
      "No newer runtime log entries are available while the abort request is still in progress.",
      "终止请求仍在进行中，暂时还没有新的运行时日志条目。",
      "中止リクエストの処理中は、新しいランタイムログ項目がまだ出ないことがあります。"
    ));
  }
  return t(copy("No runtime log entries.", "暂无运行时日志。", "ランタイムログがありません。"));
}

function describeLivePageEmptyHint(status: string, t: (copySet: Copy) => string): string {
  if (status === "PAUSING") {
    return t(copy(
      "No newer live page artifact is available while the pause request is still in progress.",
      "暂停请求仍在进行中，暂时还没有更新的 live page artifact。",
      "一時停止リクエストの処理中は、新しい live page artifact がまだ出ないことがあります。"
    ));
  }
  if (status === "ABORTING") {
    return t(copy(
      "No newer live page artifact is available while the abort request is still in progress.",
      "终止请求仍在进行中，暂时还没有更新的 live page artifact。",
      "中止リクエストの処理中は、新しい live page artifact がまだ出ないことがあります。"
    ));
  }
  return t(copy(
    "No live page artifact available.",
    "暂无可用的 live page artifact。",
    "利用可能な live page artifact はありません。"
  ));
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

function resolveStepsAvailability(stepsData: RunStepsResponse): "AVAILABLE" | "UNAVAILABLE" {
  if (stepsData.availability === "AVAILABLE" || stepsData.availability === "UNAVAILABLE") {
    return stepsData.availability;
  }
  return (stepsData.items?.length ?? 0) > 0 ? "AVAILABLE" : "UNAVAILABLE";
}

function resolveStepsSourceLayer(stepsData: RunStepsResponse): RunStepsResponse["sourceLayer"] | null {
  if (stepsData.sourceLayer === "REPORT_ARTIFACT"
    || stepsData.sourceLayer === "SCHEDULER_EVENTS"
    || stepsData.sourceLayer === "NONE") {
    return stepsData.sourceLayer;
  }
  if ((stepsData.items?.length ?? 0) === 0) {
    return "NONE";
  }
  return resolveStepsAvailability(stepsData) === "AVAILABLE"
    ? "SCHEDULER_EVENTS"
    : "NONE";
}

function describeStepSourceLayer(
  sourceLayer: NonNullable<RunStepsResponse["sourceLayer"]>,
  t: (copySet: Copy) => string
): string {
  const prefix = t(copy("Source", "来源", "ソース"));
  switch (sourceLayer) {
    case "REPORT_ARTIFACT":
      return `${prefix}: ${t(copy("report artifact", "report artifact", "report artifact"))}`;
    case "SCHEDULER_EVENTS":
      return `${prefix}: ${t(copy("scheduler events", "scheduler events", "scheduler events"))}`;
    case "NONE":
      return `${prefix}: ${t(copy("none", "none", "none"))}`;
    default:
      return prefix;
  }
}

function resolveRuntimeLogAvailability(logData: RuntimeLogResponse): "AVAILABLE" | "UNAVAILABLE" {
  if (logData.availability === "AVAILABLE" || logData.availability === "UNAVAILABLE") {
    return logData.availability;
  }
  return (logData.items?.length ?? 0) > 0 ? "AVAILABLE" : "UNAVAILABLE";
}

function resolveRuntimeLogSourceLayer(logData: RuntimeLogResponse): RuntimeLogResponse["sourceLayer"] | null {
  if (logData.sourceLayer === "RUNTIME_ARTIFACT"
    || logData.sourceLayer === "SCHEDULER_EVENTS"
    || logData.sourceLayer === "REQUEST_CONTEXT"
    || logData.sourceLayer === "NONE") {
    return logData.sourceLayer;
  }

  const firstSource = logData.items.find((entry) => typeof entry.source === "string" && entry.source.length > 0)?.source;
  if (firstSource === "runtime.log") {
    return "RUNTIME_ARTIFACT";
  }
  if (firstSource === "scheduler-events") {
    return "SCHEDULER_EVENTS";
  }
  if (firstSource === "scheduler-request-context") {
    return "REQUEST_CONTEXT";
  }
  if ((logData.items?.length ?? 0) === 0) {
    return "NONE";
  }
  return null;
}

function describeRuntimeLogSourceLayer(
  sourceLayer: NonNullable<RuntimeLogResponse["sourceLayer"]>,
  t: (copySet: Copy) => string
): string {
  const prefix = t(copy("Source", "来源", "ソース"));
  switch (sourceLayer) {
    case "RUNTIME_ARTIFACT":
      return `${prefix}: ${t(copy("runtime artifact", "runtime artifact", "runtime artifact"))}`;
    case "SCHEDULER_EVENTS":
      return `${prefix}: ${t(copy("scheduler events", "scheduler events", "scheduler events"))}`;
    case "REQUEST_CONTEXT":
      return `${prefix}: ${t(copy("request-context fallback", "request-context fallback", "request-context fallback"))}`;
    case "NONE":
      return `${prefix}: ${t(copy("none", "none", "none"))}`;
    default:
      return prefix;
  }
}

function resolveLivePageSourceLayer(liveData: LivePage): LivePage["sourceLayer"] | null {
  if (liveData.sourceLayer === "LIVE_ARTIFACT"
    || liveData.sourceLayer === "REQUEST_CONTEXT"
    || liveData.sourceLayer === "NONE") {
    return liveData.sourceLayer;
  }
  if (liveData.status === "AVAILABLE") {
    return "LIVE_ARTIFACT";
  }
  const hasRequestContext = Boolean(
    liveData.url
    || liveData.title
    || liveData.highlight?.action
    || liveData.highlight?.target
  );
  return hasRequestContext ? "REQUEST_CONTEXT" : "NONE";
}

function describeLivePageSourceLayer(
  sourceLayer: NonNullable<LivePage["sourceLayer"]>,
  t: (copySet: Copy) => string
): string {
  const prefix = t(copy("Source", "来源", "ソース"));
  switch (sourceLayer) {
    case "LIVE_ARTIFACT":
      return `${prefix}: ${t(copy("live artifact", "live artifact", "live artifact"))}`;
    case "REQUEST_CONTEXT":
      return `${prefix}: ${t(copy("request-context fallback", "request-context fallback", "request-context fallback"))}`;
    case "NONE":
      return `${prefix}: ${t(copy("none", "none", "none"))}`;
    default:
      return prefix;
  }
}
