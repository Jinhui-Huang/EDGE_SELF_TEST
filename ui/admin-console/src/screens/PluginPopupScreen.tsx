import { useEffect, useState } from "react";
import { translate } from "../i18n";
import { ExtensionPopupSnapshot, Locale } from "../types";

type PluginPopupScreenProps = {
  apiBaseUrl: string;
  title: string;
  locale: Locale;
};

type LocalizedCopy = {
  en: string;
  zh: string;
  ja: string;
};

const fallbackCandidateLocators = [
  { value: "button:has-text('Pay')", score: "0.94", type: "text", recommended: true, reason: "Preferred text locator for quick review." },
  { value: "#pay-submit", score: "0.88", type: "id", reason: "Stable explicit id from the mirrored checkout action." },
  { value: "[data-testid='checkout-pay']", score: "0.86", type: "testid", reason: "Useful test id fallback when text changes." },
  { value: "form > div:nth-child(3) > button", score: "0.42", type: "css", fragile: true, reason: "Fragile structural fallback kept for manual review." },
  { value: "role=button[name='Pay $89.10']", score: "0.81", type: "role", reason: "Accessible-name locator remains available as a secondary cue." }
];

const quickActions: Array<{ icon: string; tone: string; title: LocalizedCopy; sub: LocalizedCopy }> = [
  {
    icon: "O",
    tone: "accent",
    title: { en: "Pick element", zh: "拾取元素", ja: "要素を選択" },
    sub: { en: "Hover to capture locator", zh: "悬停捕获定位器", ja: "ホバーしてロケーターを取得" }
  },
  {
    icon: "[]",
    tone: "mint",
    title: { en: "Page summary", zh: "页面摘要", ja: "ページ概要" },
    sub: { en: "Structured view", zh: "结构化视图", ja: "構造化ビュー" }
  },
  {
    icon: ">",
    tone: "coral",
    title: { en: "Quick smoke test", zh: "快速冒烟测试", ja: "クイックスモークテスト" },
    sub: { en: "Run on current URL", zh: "在当前页执行", ja: "現在の URL で実行" }
  },
  {
    icon: "->",
    tone: "violet",
    title: { en: "Open in platform", zh: "在平台中打开", ja: "プラットフォームで開く" },
    sub: { en: "Full report and logs", zh: "完整报告与日志", ja: "レポートとログ全体を表示" }
  }
];

export function PluginPopupScreen({ apiBaseUrl, title, locale }: PluginPopupScreenProps) {
  const t = (value: LocalizedCopy) => translate(locale, value);

  const [popupSnapshot, setPopupSnapshot] = useState<ExtensionPopupSnapshot | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    fetch(`${apiBaseUrl}/api/phase3/extension-popup`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ExtensionPopupSnapshot>;
      })
      .then((data) => {
        if (!cancelled) {
          setPopupSnapshot(data);
          setLoadState("loaded");
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => { cancelled = true; };
  }, [apiBaseUrl]);

  const page = popupSnapshot?.page;
  const runtime = popupSnapshot?.runtime;

  const pageTitle = page?.title ?? "Checkout - Payment";
  const pagePath = page?.url ? new URL(page.url).pathname : "/checkout/payment";
  const pageDomain = page?.domain ?? "staging.example.test";
  const popupHostLabel = page?.domain?.trim() || "edge.test";
  const pageStatus = popupSnapshot?.status?.trim().toLowerCase() || "recognized";
  const pageAssistiveSummary = popupSnapshot?.summary?.trim() || "3 forms / 8 buttons";
  const queueState = runtime?.queueState ?? "Idle";
  const runtimeQueueBadge = runtime?.queueState?.trim().toLowerCase() || "idle";
  const activeRunHeadline = runtime?.nextAction?.trim() || runtime?.auditState?.trim()
    || t({ en: "No active run", zh: "无活跃运行", ja: "実行なし" });
  const activeRunDetail = runtime?.nextAction?.trim() ? (runtime?.auditState ?? "") : (runtime?.queueState?.trim() || "");
  const selectedElementLabel = page?.actionHints?.find((hint) => hint.trim().length > 0)?.trim() || "Pay $89.10";
  const selectedElementMeta = page?.locator?.trim()
    ? `locator: ${page.locator.trim()}`
    : "role=button / 140x38px / visible";
  const pickModeBadge = popupSnapshot?.status?.trim().toLowerCase() || "active";
  const pickModeSummary = page?.locator?.trim()
    ? `Locator ready for review: ${page.locator.trim()}`
    : t({ en: "Hover to highlight / click to select", zh: "悬停高亮 / 单击选中", ja: "ホバーでハイライト / クリックで選択" });
  const normalizedLocatorCandidates = page?.locatorCandidates
    ?.filter((candidate) => candidate.value.trim().length > 0)
    .map((candidate) => ({
      value: candidate.value.trim(),
      score: formatLocatorScore(candidate.score),
      type: candidate.type?.trim() || "locator",
      recommended: candidate.recommended ?? false,
      fragile: false,
      reason: candidate.reason?.trim() || ""
    }));
  const candidateLocators = normalizedLocatorCandidates?.length
    ? normalizedLocatorCandidates
    : fallbackCandidateLocators;
  const recommendedCandidate = normalizedLocatorCandidates?.find((candidate) => candidate.recommended);
  const candidatePanelSummary = recommendedCandidate
    ? `Top candidate: ${recommendedCandidate.value}`
    : "Review candidate strength before copying to DSL.";
  const selectedElementReason = normalizedLocatorCandidates?.find((candidate) => candidate.recommended && candidate.reason)?.reason
    || normalizedLocatorCandidates?.find((candidate) => candidate.reason)?.reason
    || "Review the best locator before copying it into DSL.";
  const openInPlatformSub = popupSnapshot?.hints?.find((hint) => hint.trim().length > 0)?.trim()
    || quickActions[3].sub.en;
  const isRunning = queueState.toLowerCase().includes("active") || queueState.toLowerCase().includes("running");

  return (
    <div className="pluginDemoScreen" aria-label={title}>
      <div className="pluginBrowserFrame">
        <div className="pluginBrowserBar">
          <div className="pluginBrowserDots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="pluginBrowserUrl">{pageDomain}{pagePath}</div>
          <div className="pluginBrowserExt">E</div>
        </div>

        <div className="pluginBrowserCanvas">
          <div className="pluginCheckoutMock">
            <h2>{pageTitle.split(" - ")[0] || "Checkout"}</h2>
            <div className="pluginCheckoutGrid">
              {["Card number", "Expiry", "CVC", "Coupon"].map((label) => (
                <div key={label}>
                  <span>{label}</span>
                  <div className="pluginCheckoutField" />
                </div>
              ))}
            </div>
            <div className="pluginCheckoutTotal">
              Total <strong>$89.10</strong>
            </div>
            <div className="pluginCheckoutAction">
              <button type="button">Pay $89.10</button>
            </div>
          </div>

          <aside className="pluginFloatingPanel">
            <div className="pluginFloatingHeader">
              <div className="pluginFloatingBrand">E</div>
              <div>
                <strong>{popupHostLabel}</strong>
                <p>
                  <span>
                    {loadState === "loading"
                      ? t({ en: "connecting…", zh: "连接中…", ja: "接続中…" })
                      : loadState === "error"
                        ? t({ en: "host unreachable", zh: "主机不可达", ja: "ホスト接続不可" })
                        : t({ en: "host connected", zh: "主机已连接", ja: "ホスト接続済み" })}
                  </span>{" "}
                  / {pageDomain.split(".")[0] || "staging"}
                </p>
              </div>
            </div>

            <div className="pluginFloatingBody">
              <section>
                <h4>{t({ en: "Current page", zh: "当前页面", ja: "現在のページ" })}</h4>
                <strong>{pageTitle}</strong>
                <p>{pagePath}</p>
                <div className="pluginBadgeRow">
                  <span className="pluginBadge mint">{pageStatus}</span>
                </div>
                <p>{pageAssistiveSummary}</p>
              </section>

              <div className="pluginDivider" />

              <section>
                <h4>{t({ en: "Active run", zh: "当前运行", ja: "実行中" })}</h4>
                <div className="pluginRunCard">
                  <div className="pluginRunMeta">
                    <span className={`pluginBadge info dot`}>
                      {runtimeQueueBadge}
                    </span>
                    <span className="pluginRunId">
                      {runtime?.mode ?? "Audit-first"}
                    </span>
                  </div>
                  <strong>{activeRunHeadline}</strong>
                  <p>{activeRunDetail}</p>
                  {isRunning && (
                    <div className="pluginProgress">
                      <div />
                    </div>
                  )}
                </div>
              </section>

              <div className="pluginDivider" />

              <section>
                <h4>{t({ en: "Quick actions", zh: "快捷操作", ja: "クイックアクション" })}</h4>
                {quickActions.map((action) => (
                  <div key={action.title.en} className="pluginQuickAction">
                    <div className={`pluginQuickIcon ${action.tone}`}>{action.icon}</div>
                    <div className="pluginQuickText">
                      <strong>{t(action.title)}</strong>
                      <p>{action.title.en === "Open in platform" ? openInPlatformSub : t(action.sub)}</p>
                    </div>
                    <span className="pluginQuickArrow">{">"}</span>
                  </div>
                ))}
              </section>
            </div>
          </aside>
        </div>
      </div>

      <aside className="pluginPickerPanel">
        <div className="pluginPickerHeader">
          <div>
            <strong>{t({ en: "Pick mode", zh: "拾取模式", ja: "ピックモード" })}</strong>
            <p>{pickModeSummary}</p>
          </div>
          <span className="pluginBadge active dot">{pickModeBadge}</span>
        </div>

        <div className="pluginPickerBody">
          <section>
            <h4>{t({ en: "Selected element", zh: "已选中元素", ja: "選択済み要素" })}</h4>
            <div className="pluginCodeCard">
              <div className="pluginCodeTag">&lt;button&gt;</div>
              <div className="pluginCodeText">{selectedElementLabel}</div>
              <p>{selectedElementMeta}</p>
              <p>{`Recommended locator rationale: ${selectedElementReason}`}</p>
            </div>
          </section>

          <section>
            <h4>{t({ en: "Candidate locators", zh: "候选定位器", ja: "候補ロケーター" })}</h4>
            <p>{candidatePanelSummary}</p>
            <div className="pluginLocatorList">
              {candidateLocators.map((locator) => (
                <div key={locator.value} className={`pluginLocatorRow${locator.recommended ? " recommended" : ""}`}>
                  <div className="pluginLocatorText">
                    <strong>{locator.value}</strong>
                    <div className="pluginBadgeRow">
                      <span className="pluginBadge neutral">{locator.type}</span>
                      {locator.recommended ? <span className="pluginBadge info dot">recommended</span> : null}
                      {locator.fragile ? <span className="pluginBadge warning">fragile</span> : null}
                    </div>
                    {locator.reason ? <p>{locator.reason}</p> : null}
                  </div>
                  <div
                    className={`pluginLocatorScore${
                      Number(locator.score) > 0.8 ? " success" : Number(locator.score) > 0.5 ? " warning" : " danger"
                    }`}
                  >
                    {locator.score}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="pluginPickerActions">
            <button type="button" className="secondaryButton">
              {t({ en: "Copy", zh: "复制", ja: "コピー" })}
            </button>
            <button type="button">{t({ en: "Use in DSL", zh: "插入 DSL", ja: "DSL に挿入" })}</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function formatLocatorScore(score: number | string | null | undefined) {
  if (typeof score === "number" && Number.isFinite(score)) {
    return score.toFixed(2);
  }
  if (typeof score === "string" && score.trim().length > 0) {
    return score.trim();
  }
  return "--";
}
