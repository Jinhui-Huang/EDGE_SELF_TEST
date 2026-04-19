import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";

type MonitorScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
};

type MonitorBadgeTone = "info" | "success" | "warning" | "neutral" | "mint" | "coral";

export function MonitorScreen({ snapshot, title, locale }: MonitorScreenProps) {
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);

  const runId = "run_8f2a1c3e";
  const activeProject = snapshot.projects[0];
  const activeReport = snapshot.reports[0];
  const queueLead = snapshot.workQueue[0];
  const currentStep = {
    index: 5,
    total: 8,
    label: t({ en: 'click "Pay"', zh: '点击“Pay”', ja: '「Pay」をクリック' })
  };

  const stepTimeline = [
    { index: 1, label: "open /cart", duration: "0.8s", state: "done" as const },
    { index: 2, label: "click #proceed", duration: "1.4s", state: "done" as const, note: "heal" },
    { index: 3, label: "fill card", duration: "0.6s", state: "done" as const },
    { index: 4, label: "type coupon", duration: "0.4s", state: "done" as const },
    { index: 5, label: "click 'Pay'", duration: "live", state: "run" as const },
    { index: 6, label: "assert url", duration: "", state: "todo" as const },
    { index: 7, label: "assert db", duration: "", state: "todo" as const },
    { index: 8, label: "assert delta", duration: "", state: "todo" as const }
  ];

  const runtimeLog = [
    {
      time: "+01:48",
      type: "decision",
      model: "claude-4.5",
      tone: "info" as MonitorBadgeTone,
      content: t({
        en: "Confirmed Pay button visible at candidate[0] (score 0.94). Proceeding.",
        zh: "确认 Pay 按钮命中 candidate[0]，得分 0.94，继续执行。",
        ja: "Pay ボタンを candidate[0] で確認、score 0.94。続行します。"
      })
    },
    {
      time: "+01:46",
      type: "heal",
      model: "claude-4.5",
      tone: "warning" as MonitorBadgeTone,
      content: t({
        en: "Locator #proceed-btn failed. Candidate[1] matched one element and was healed.",
        zh: "定位器 #proceed-btn 失败，candidate[1] 命中 1 个元素，已完成自愈。",
        ja: "Locator #proceed-btn が失敗。candidate[1] が 1 要素に一致し、自己修復しました。"
      })
    },
    {
      time: "+01:12",
      type: "state",
      model: "",
      tone: "mint" as MonitorBadgeTone,
      content: t({
        en: "Page recognized as checkout.form with confidence 0.97.",
        zh: "页面识别为 checkout.form，置信度 0.97。",
        ja: "ページを checkout.form と認識、confidence は 0.97。"
      })
    },
    {
      time: "+00:48",
      type: "decision",
      model: "claude-4.5",
      tone: "info" as MonitorBadgeTone,
      content: t({
        en: 'Field [name=coupon] detected. Typing "SAVE10".',
        zh: "识别到字段 [name=coupon]，准备输入 SAVE10。",
        ja: "[name=coupon] を検出し、SAVE10 を入力します。"
      })
    },
    {
      time: "+00:03",
      type: "seed",
      model: "",
      tone: "coral" as MonitorBadgeTone,
      content: t({
        en: "Data plan plan.checkout.seed.v2 completed. Three rows inserted.",
        zh: "数据计划 plan.checkout.seed.v2 已完成，插入 3 行数据。",
        ja: "データプラン plan.checkout.seed.v2 が完了し、3 行を投入しました。"
      })
    }
  ];

  return (
    <div className="monitorScreen">
      <section className="monitorHero">
        <div className="monitorHeroMain">
          <p className="monitorPath">
            {t({ en: "Executions", zh: "执行", ja: "実行" })} / {runId}
          </p>
          <div className="monitorTitleRow">
            <h2>{activeProject?.scope ?? title}</h2>
            <span className="monitorBadge info dot">{t({ en: "running", zh: "执行中", ja: "実行中" })}</span>
            <span className="monitorPill">
              <span className="monitorPillIcon mint">▸</span>
              {queueLead?.title.split(" / ")[1] ?? "staging"}
            </span>
            <span className="monitorPill">
              <span className="monitorPillIcon info">●</span>
              claude-4.5
            </span>
          </div>
        </div>
        <div className="monitorHeroActions">
          <button className="ghostButton" type="button">
            {t({ en: "Pause", zh: "暂停", ja: "一時停止" })}
          </button>
          <button className="secondaryButton dangerButton" type="button">
            {t({ en: "Abort", zh: "终止", ja: "中止" })}
          </button>
        </div>
      </section>

      <section className="monitorProgressCard">
        <div className="monitorProgressRing" aria-hidden="true">
          <svg viewBox="0 0 52 52">
            <circle className="monitorRingTrack" cx="26" cy="26" r="22" />
            <circle className="monitorRingValue" cx="26" cy="26" r="22" pathLength="100" />
          </svg>
          <span>62%</span>
        </div>
        <div className="monitorProgressBody">
          <div className="monitorProgressMeta">
            <div>
              <span className="monitorProgressLabel">
                {t({ en: "Step", zh: "当前步骤", ja: "現在のステップ" })} {currentStep.index} / {currentStep.total}
              </span>
              <strong>{currentStep.label}</strong>
            </div>
            <span className="monitorMono">01:48 / ~02:50</span>
          </div>
          <div className="monitorStepBar" aria-hidden="true">
            {stepTimeline.map((step) => (
              <span key={step.index} className={`monitorStepBarItem ${step.state}`} />
            ))}
          </div>
        </div>
        <div className="monitorMiniStats">
          <MiniStat label={t({ en: "Assertions", zh: "断言", ja: "アサーション" })} value="3/5" tone="success" />
          <MiniStat label={t({ en: "AI calls", zh: "AI 调用", ja: "AI 呼び出し" })} value="12" tone="info" />
          <MiniStat label={t({ en: "Heals", zh: "自愈", ja: "自己修復" })} value="1" tone="warning" />
        </div>
      </section>

      <div className="monitorGrid">
        <section className="monitorPanel">
          <div className="monitorPanelHeader">
            <h3>{t({ en: "Steps timeline", zh: "步骤时间线", ja: "ステップタイムライン" })}</h3>
          </div>
          <div className="monitorStepList">
            {stepTimeline.map((step) => (
              <article key={step.index} className={`monitorStepItem ${step.state}`}>
                <span className={`monitorStepDot ${step.state}`}>
                  {step.state === "done" ? "✓" : step.state === "run" ? "…" : step.index}
                </span>
                <div className="monitorStepCopy">
                  <strong>{step.label}</strong>
                  <div className="monitorStepMeta">
                    {step.duration ? <span>{step.duration}</span> : null}
                    {step.note ? <span className="monitorBadge warning">◈ {step.note}</span> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="monitorPanel">
          <div className="monitorPanelHeader">
            <h3>{t({ en: "Live page", zh: "实时页面", ja: "ライブページ" })}</h3>
            <span className="monitorPill mono">
              <span className="monitorPillIcon info">▣</span>
              app.acme.example/checkout
            </span>
          </div>
          <div className="monitorViewport">
            <div className="monitorCheckoutMock">
              <div className="monitorCheckoutTitle">Checkout</div>
              <div className="monitorCheckoutGrid">
                {["Card number", "Expiry", "CVC", "Coupon"].map((item) => (
                  <div key={item} className="monitorField">
                    <span>{item}</span>
                    <div />
                  </div>
                ))}
              </div>
              <div className="monitorCheckoutSummary">
                {t({ en: "Total", zh: "合计", ja: "合計" })} <b>$89.10</b>
              </div>
              <div className="monitorCheckoutFooter">
                <div className="monitorPayButton">Pay $89.10</div>
              </div>
            </div>
            <div className="monitorHighlight">
              <span>step 5 · click</span>
            </div>
          </div>
        </section>

        <section className="monitorPanel">
          <div className="monitorPanelHeader">
            <h3>{t({ en: "AI runtime log", zh: "AI 运行时日志", ja: "AI ランタイムログ" })}</h3>
            <span className="monitorBadge info dot">live</span>
          </div>
          <div className="monitorLogList">
            {runtimeLog.map((entry, index) => (
              <article key={`${entry.time}-${entry.type}`} className={`monitorLogItem ${index === 0 ? "isActive" : ""}`}>
                <div className="monitorLogMeta">
                  <span className="monitorMono">{entry.time}</span>
                  <span className={`monitorBadge ${entry.tone}`}>{entry.type}</span>
                  {entry.model ? <span className="monitorMono muted">{entry.model}</span> : null}
                </div>
                <p>{entry.content}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="monitorFooter">
        <div className="monitorFooterItem">
          <span>{t({ en: "Queue pressure", zh: "队列压力", ja: "キュー負荷" })}</span>
          <strong>{queueLead?.detail ?? activeReport?.entry ?? ""}</strong>
        </div>
        <div className="monitorFooterItem">
          <span>{t({ en: "Last event", zh: "最近事件", ja: "直近イベント" })}</span>
          <strong>{snapshot.timeline[0]?.title ?? ""}</strong>
        </div>
        <div className="monitorFooterItem">
          <span>{t({ en: "Owner", zh: "责任人", ja: "担当者" })}</span>
          <strong>{queueLead?.owner ?? "qa-platform"}</strong>
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
