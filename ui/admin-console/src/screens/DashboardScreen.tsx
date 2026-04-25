import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";

type Copy = { en: string; zh: string; ja: string };

const copy = (en: string, zh = en, ja = en): Copy => ({ en, zh, ja });

export type DashboardAttentionTarget =
  | { kind: "reportDetail"; runId: string }
  | { kind: "monitor"; runId?: string | null }
  | { kind: "dataDiff"; runId?: string | null }
  | { kind: "models" };

type DashboardScreenProps = {
  snapshot: AdminConsoleSnapshot;
  runtimePolicyLabel: string;
  generatedAtLabel: string;
  statsStripLabel: string;
  reviewBoardLabel: string;
  queueBoardLabel: string;
  dashboardTitle: string;
  locale: Locale;
  onRefresh?: () => void;
  onNewRun?: () => void;
  onOpenRunDetail?: (runId: string) => void;
  onOpenAttention?: (target: DashboardAttentionTarget) => void;
  onOpenModels?: (providerId?: string | null) => void;
};

type DashboardProviderChip = {
  id: string;
  label: string;
};

function normalizeStatusTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "OK" || normalized === "SUCCESS" || normalized === "PASSED") return "pass";
  if (normalized === "RUNNING" || normalized === "IN_PROGRESS" || normalized === "WAITING" || normalized === "QUEUED") return "running";
  if (normalized === "FAILED" || normalized === "ERROR") return "fail";
  return "neutral";
}

function extractRunIdFromQueueTitle(title: string) {
  const [candidate] = title.split(" / ");
  return candidate?.trim() || null;
}

function parseProviderChips(snapshot: AdminConsoleSnapshot): DashboardProviderChip[] {
  const structuredProviders = snapshot.modelConfig
    .filter((item) => item.label.startsWith("provider:"))
    .map((item) => {
      try {
        const parsed = JSON.parse(item.value) as {
          id?: string;
          name?: string;
          displayName?: string;
          model?: string;
        };
        const providerId = parsed.id || item.label.slice("provider:".length);
        const label = parsed.displayName || parsed.name || parsed.model || providerId;
        return providerId && label ? { id: providerId, label } : null;
      } catch {
        return null;
      }
    })
    .filter((item): item is DashboardProviderChip => Boolean(item));

  if (structuredProviders.length) {
    return structuredProviders.slice(0, 6);
  }

  const providerSummary = snapshot.modelConfig.find((item) => item.label.toLowerCase() === "provider");
  if (!providerSummary) {
    return [];
  }

  return providerSummary.value
    .split(",")
    .map((item, index) => {
      const label = item.trim();
      return label ? { id: `provider-summary-${index}`, label } : null;
    })
    .filter((item): item is DashboardProviderChip => Boolean(item))
    .slice(0, 6);
}

function buildAttentionItems(snapshot: AdminConsoleSnapshot, t: (value: Copy) => string) {
  const items: Array<{ title: string; detail: string; tone: "danger" | "warning" | "info"; target: DashboardAttentionTarget }> = [];
  const failedReport = snapshot.reports.find((item) => normalizeStatusTone(item.status) === "fail");
  const queuePressure = snapshot.workQueue.find((item) => {
    const normalized = item.state.toUpperCase();
    return normalized.includes("WAIT") || normalized.includes("PROGRESS") || normalized.includes("RUN");
  });
  const providerChips = parseProviderChips(snapshot);

  if (failedReport) {
    const runId = failedReport.runId || failedReport.runName;
    items.push({
      title: t(copy("Recent failed run requires triage", "最近失败运行需要排查", "直近の失敗実行を確認")),
      detail: `${failedReport.runName} - ${failedReport.entry}`,
      tone: "danger",
      target: { kind: "reportDetail", runId }
    });
    items.push({
      title: t(copy("Data diff review recommended", "建议复核数据差异", "データ差分の確認を推奨")),
      detail: `${failedReport.runName} - ${t(copy("Open diff and restore evidence for the failed run.", "打开失败运行的数据差异和恢复证据。", "失敗実行の差分と復元証跡を開きます。"))}`,
      tone: "warning",
      target: { kind: "dataDiff", runId }
    });
  }

  if (queuePressure) {
    items.push({
      title: t(copy("Execution pressure needs monitoring", "执行压力需要关注", "実行負荷の監視が必要")),
      detail: `${queuePressure.title} - ${queuePressure.detail}`,
      tone: "warning",
      target: { kind: "monitor", runId: extractRunIdFromQueueTitle(queuePressure.title) }
    });
  }

  if (providerChips.length) {
    items.push({
      title: t(copy("AI provider posture should be reviewed", "建议检查 AI 提供方状态", "AI プロバイダー状態の確認を推奨")),
      detail: t(copy("Open model configuration to review provider distribution and fallback posture.", "打开模型配置页复核提供方分布与回退策略。", "モデル設定を開いてプロバイダー分布とフォールバック方針を確認します。")),
      tone: "info",
      target: { kind: "models" }
    });
  }

  return items.slice(0, 4);
}

export function DashboardScreen({
  snapshot,
  locale,
  onRefresh,
  onNewRun,
  onOpenRunDetail,
  onOpenAttention,
  onOpenModels
}: DashboardScreenProps) {
  const t = (value: Copy) => translate(locale, value);

  const metricCards = snapshot.stats.slice(0, 5).map((item, index) => ({
    label: item.label,
    value: item.value,
    delta: item.note,
    tone: ["accent", "mint", "success", "coral", "violet"][index % 5],
    icon: ["PRJ", "RUN", "OK", "DB", "AI"][index % 5]
  }));

  const recentRuns = snapshot.reports.slice(0, 6).map((item) => ({
    runId: item.runId || item.runName,
    runName: item.runName,
    status: item.status,
    tone: normalizeStatusTone(item.status),
    finishedAt: item.finishedAt,
    entry: item.entry
  }));

  const attentionItems = buildAttentionItems(snapshot, t);
  const providerChips = parseProviderChips(snapshot);

  return (
    <div className="dashboardDemo">
      <div className="dashboardHero">
        <div className="dashboardHeroCopy">
          <h2>{t(copy("Operations cockpit", "运行总览", "運用コックピット"))}</h2>
          <p>
            {t(copy(
              "Keep projects, execution, audit, and restore checkpoints on one control surface.",
              "把项目、执行、审计和恢复检查点放在同一个控制面板中查看。",
              "プロジェクト、実行、監査、復元チェックポイントを 1 つの画面で確認します。"
            ))}
          </p>
        </div>

        <div className="dashboardActions">
          <button type="button" className="dashboardButton secondary" onClick={onRefresh}>
            {t(copy("Refresh", "刷新", "更新"))}
          </button>
          <button type="button" className="dashboardButton primary" onClick={onNewRun}>
            + {t(copy("New run", "新建运行", "新規実行"))}
          </button>
        </div>
      </div>

      <div className="dashboardMetricGrid">
        {metricCards.map((item) => (
          <article key={`${item.label}-${item.icon}`} className={`dashboardMetricCard ${item.tone}`}>
            <div className="dashboardMetricHead">
              <span>{item.label}</span>
              <div className="dashboardMetricIcon">{item.icon}</div>
            </div>
            <strong>{item.value}</strong>
            <small>{item.delta}</small>
          </article>
        ))}
      </div>

      <div className="dashboardMainGrid">
        <section className="dashboardPanel dashboardRunsPanel">
          <div className="dashboardPanelHeader">
            <div className="dashboardPanelTitle">{t(copy("Recent runs", "最近运行", "最近の実行"))}</div>
            <div className="dashboardPanelMeta">{t(copy("from admin snapshot", "来自当前快照", "現在のスナップショット"))}</div>
          </div>

          <div className="dashboardRunList">
            {recentRuns.map((run) => (
              <button
                key={run.runId}
                type="button"
                className="dashboardRunRow dashboardRunRowButton"
                onClick={() => onOpenRunDetail?.(run.runId)}
                aria-label={`Open run ${run.runId}`}
              >
                <div className={`dashboardRunDot ${run.tone}`} />
                <div className="dashboardRunName">
                  <strong>{run.runName}</strong>
                  <span className="dashboardRunTime">{run.runId}</span>
                </div>
                <div>
                  <span className={`dashboardBadge ${run.tone}`}>{run.status}</span>
                </div>
                <div className="dashboardRunDuration">{run.finishedAt}</div>
                <div className="dashboardMono">{run.entry}</div>
              </button>
            ))}
          </div>
        </section>

        <div className="dashboardSideStack">
          <section className="dashboardPanel">
            <div className="dashboardPanelHeader">
              <div className="dashboardPanelTitle">{t(copy("Needs attention", "待处理", "要確認"))}</div>
              <span className="dashboardBadge warning">{attentionItems.length}</span>
            </div>

            <div className="dashboardAttentionList">
              {attentionItems.map((item) => (
                <button
                  key={`${item.title}-${item.detail}`}
                  type="button"
                  className="dashboardAttentionItem dashboardAttentionButton"
                  onClick={() => onOpenAttention?.(item.target)}
                >
                  <div className={`dashboardAttentionBar ${item.tone}`} />
                  <div className="dashboardAttentionBody">
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="dashboardPanel dashboardDecisionPanel">
            <div className="dashboardPanelTitle dashboardPanelTitleSpaced">
              {t(copy("AI decisions", "AI 决策", "AI 判断"))}
            </div>
            <div className="dashboardPanelMeta dashboardPanelMetaInline">
              {t(copy("provider distribution", "提供方分布", "プロバイダー分布"))}
            </div>

            <div className="dashboardAiGrid">
              <div>
                <span className="dashboardAiLabel">{t(copy("Constraints", "约束", "制約"))}</span>
                <div className="dashboardAiValue">{snapshot.constraints.length}</div>
                <p className="dashboardAiHint">{snapshot.constraints[0] ?? t(copy("No active constraints.", "当前无约束。", "有効な制約はありません。"))}</p>
              </div>

              <div>
                <span className="dashboardAiLabel">{t(copy("Model config items", "模型配置项", "モデル設定項目"))}</span>
                <div className="dashboardAiValue">{snapshot.modelConfig.length}</div>
                <p className="dashboardAiHint">
                  {t(copy("Open model configuration for provider and routing review.", "打开模型配置页查看提供方与路由。", "モデル設定を開いてプロバイダーとルーティングを確認します。"))}
                </p>
              </div>
            </div>

            <div className="dashboardDivider" />

            <div className="dashboardChipRow dashboardChipRowSpaced">
              {providerChips.map((provider, index) => (
                <button
                  key={provider.id}
                  type="button"
                  className={`dashboardChip dashboardChipButton ${["accent", "mint", "coral", "violet"][index % 4]}`}
                  onClick={() => onOpenModels?.(provider.id)}
                >
                  {provider.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
