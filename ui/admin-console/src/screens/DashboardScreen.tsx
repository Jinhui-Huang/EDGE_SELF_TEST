import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";

type DashboardScreenProps = {
  snapshot: AdminConsoleSnapshot;
  runtimePolicyLabel: string;
  generatedAtLabel: string;
  statsStripLabel: string;
  reviewBoardLabel: string;
  queueBoardLabel: string;
  dashboardTitle: string;
  locale: Locale;
};

export function DashboardScreen({ locale }: DashboardScreenProps) {
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);

  const recentRuns = [
    { name: "Core smoke / login to dashboard", env: "staging", status: "pass", duration: "2m 46s", model: "audit-runtime", time: "3m ago" },
    { name: "Member center / profile save", env: "pre-prod", status: "running", duration: "58s", model: "rule-first", time: "now" },
    { name: "Checkout / card payment retry", env: "staging", status: "fail", duration: "4m 12s", model: "audit-runtime", time: "17m ago" },
    { name: "Ops console / role permission edit", env: "dev", status: "pass", duration: "3m 37s", model: "local-review", time: "31m ago" },
    { name: "Campaign page / lead form submit", env: "uat", status: "pass", duration: "5m 05s", model: "rule-first", time: "52m ago" },
    { name: "Settlement center / export billing", env: "prod-mirror", status: "pass", duration: "6m 21s", model: "audit-runtime", time: "1h ago" }
  ];

  const attentionItems = [
    { title: "Payment confirmation locator drift", detail: "The checkout confirm button changed twice today and needs manual review.", tone: "danger" },
    { title: "Staging browser pool nearing saturation", detail: "6 of 8 Edge workers are occupied by regression traffic.", tone: "warning" },
    { title: "Rollback checkpoint pending release", detail: "Member profile baseline is still locked by the last restore session.", tone: "warning" },
    { title: "Audit queue waiting for operator decision", detail: "Two AI-generated action plans remain in review-only state.", tone: "info" }
  ];

  const metricCards = [
    {
      label: t({ en: "Active projects", zh: "活跃项目", ja: "稼働中プロジェクト" }),
      value: "12",
      delta: t({ en: "3 need follow-up", zh: "3 个待跟进", ja: "3 件要確認" }),
      tone: "accent",
      icon: "PRJ"
    },
    {
      label: t({ en: "Runs today", zh: "今日运行", ja: "本日の実行" }),
      value: "147",
      delta: t({ en: "18 queued now", zh: "当前排队 18", ja: "現在 18 件待機" }),
      tone: "mint",
      icon: "RUN"
    },
    {
      label: t({ en: "Pass rate", zh: "通过率", ja: "成功率" }),
      value: "94.2%",
      delta: t({ en: "stable vs yesterday", zh: "较昨日稳定", ja: "前日比で安定" }),
      tone: "success",
      icon: "OK"
    },
    {
      label: t({ en: "Recovery ok", zh: "恢复成功", ja: "復旧成功" }),
      value: "96%",
      delta: t({ en: "2 locked items", zh: "2 个被锁定", ja: "2 件ロック中" }),
      tone: "coral",
      icon: "DB"
    },
    {
      label: t({ en: "AI spend (mo)", zh: "AI 月度花费", ja: "AI 月間費用" }),
      value: "$1,248",
      delta: t({ en: "73% budget", zh: "预算 73%", ja: "予算の 73%" }),
      tone: "violet",
      icon: "AI"
    }
  ];

  const runColumns = [
    "",
    t({ en: "Run", zh: "执行项", ja: "実行" }),
    t({ en: "Env", zh: "环境", ja: "環境" }),
    t({ en: "Status", zh: "状态", ja: "状態" }),
    t({ en: "Model", zh: "模型", ja: "モデル" }),
    t({ en: "Dur", zh: "耗时", ja: "時間" }),
    t({ en: "At", zh: "时间", ja: "時刻" })
  ];

  return (
    <div className="dashboardDemo">
      <div className="dashboardHero">
        <div className="dashboardHeroCopy">
          <h2>{t({ en: "Operations cockpit", zh: "运行总览", ja: "運用コックピット" })}</h2>
          <p>
            {t({
              en: "Keep projects, execution, audit, and restore checkpoints on one control surface.",
              zh: "把项目、执行、审计和恢复检查点放在同一控制面板中查看。",
              ja: "プロジェクト、実行、監査、復旧チェックポイントを 1 つの面で管理します。"
            })}
          </p>
        </div>

        <div className="dashboardActions">
          <button type="button" className="dashboardButton secondary">
            {t({ en: "Refresh", zh: "刷新", ja: "更新" })}
          </button>
          <button type="button" className="dashboardButton primary">
            + {t({ en: "New run", zh: "新建运行", ja: "新規実行" })}
          </button>
        </div>
      </div>

      <div className="dashboardMetricGrid">
        {metricCards.map((item) => (
          <article key={item.label} className={`dashboardMetricCard ${item.tone}`}>
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
            <div className="dashboardPanelTitle">{t({ en: "Recent runs", zh: "最近运行", ja: "最近の実行" })}</div>
            <div className="dashboardPanelMeta">{t({ en: "last 24h", zh: "过去 24 小时", ja: "過去 24 時間" })}</div>
          </div>

          <div className="dashboardRunList">
            <div className="dashboardRunHeader" aria-hidden="true">
              {runColumns.map((label, index) => (
                <div key={`${label}-${index}`} className="dashboardRunCellLabel">
                  {label}
                </div>
              ))}
            </div>

            {recentRuns.map((run) => (
              <div key={`${run.name}-${run.time}`} className="dashboardRunRow">
                <div className={`dashboardRunDot ${run.status}`} />
                <div className="dashboardRunName">{run.name}</div>
                <div>
                  <span className="dashboardBadge neutral">{run.env}</span>
                </div>
                <div>
                  <span className={`dashboardBadge ${run.status}`}>{run.status}</span>
                </div>
                <div className="dashboardMono">{run.model}</div>
                <div className="dashboardRunDuration">{run.duration}</div>
                <div className="dashboardRunTime">{run.time}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="dashboardSideStack">
          <section className="dashboardPanel">
            <div className="dashboardPanelHeader">
              <div className="dashboardPanelTitle">{t({ en: "Needs attention", zh: "待处理", ja: "要確認" })}</div>
              <span className="dashboardBadge warning">4</span>
            </div>

            <div className="dashboardAttentionList">
              {attentionItems.map((item) => (
                <div key={item.title} className="dashboardAttentionItem">
                  <div className={`dashboardAttentionBar ${item.tone}`} />
                  <div className="dashboardAttentionBody">
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboardPanel dashboardDecisionPanel">
            <div className="dashboardPanelTitle dashboardPanelTitleSpaced">
              {t({ en: "AI decisions", zh: "AI 决策", ja: "AI 判断" })}
            </div>
            <div className="dashboardPanelMeta dashboardPanelMetaInline">
              {t({ en: "last hour", zh: "近 1 小时", ja: "直近 1 時間" })}
            </div>

            <div className="dashboardAiGrid">
              <div>
                <span className="dashboardAiLabel">{t({ en: "Adopted", zh: "已采纳", ja: "採用済み" })}</span>
                <div className="dashboardAiValue">
                  87<span>/ 92</span>
                </div>
                <div className="dashboardAiBarTrack">
                  <div className="dashboardAiBarFill" style={{ width: "94.5%" }} />
                </div>
              </div>

              <div>
                <span className="dashboardAiLabel">{t({ en: "Fallback triggered", zh: "触发回退", ja: "フォールバック" })}</span>
                <div className="dashboardAiValue">5</div>
                <p className="dashboardAiHint">
                  {t({ en: "3x timeout, 2x schema mismatch", zh: "3 次超时，2 次结构不匹配", ja: "3 回タイムアウト、2 回スキーマ不一致" })}
                </p>
              </div>
            </div>

            <div className="dashboardDivider" />

            <div className="dashboardChipRow dashboardChipRowSpaced">
              <span className="dashboardChip accent">claude-4.5 · 61</span>
              <span className="dashboardChip mint">gpt-4o · 24</span>
              <span className="dashboardChip coral">local-qwen · 7</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
