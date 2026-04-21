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

const candidateLocators = [
  { value: "button:has-text('Pay')", score: "0.94", type: "text", recommended: true },
  { value: "#pay-submit", score: "0.88", type: "id" },
  { value: "[data-testid='checkout-pay']", score: "0.86", type: "testid" },
  { value: "form > div:nth-child(3) > button", score: "0.42", type: "css", fragile: true },
  { value: "role=button[name='Pay $89.10']", score: "0.81", type: "role" }
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
  const queueState = runtime?.queueState ?? "Idle";
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
                <strong>edge.test</strong>
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
                  <span className="pluginBadge mint">recognized</span>
                  <span className="pluginBadge info">3 forms / 8 buttons</span>
                </div>
              </section>

              <div className="pluginDivider" />

              <section>
                <h4>{t({ en: "Active run", zh: "当前运行", ja: "実行中" })}</h4>
                <div className="pluginRunCard">
                  <div className="pluginRunMeta">
                    <span className={`pluginBadge info dot`}>
                      {isRunning ? "running" : "idle"}
                    </span>
                    <span className="pluginRunId">
                      {runtime?.mode ?? "Audit-first"}
                    </span>
                  </div>
                  <strong>{runtime?.nextAction ?? t({ en: "No active run", zh: "无活跃运行", ja: "実行なし" })}</strong>
                  <p>{runtime?.auditState ?? ""}</p>
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
                      <p>{t(action.sub)}</p>
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
            <p>{t({ en: "Hover to highlight / click to select", zh: "悬停高亮 / 单击选中", ja: "ホバーでハイライト / クリックで選択" })}</p>
          </div>
          <span className="pluginBadge active dot">active</span>
        </div>

        <div className="pluginPickerBody">
          <section>
            <h4>{t({ en: "Selected element", zh: "已选中元素", ja: "選択済み要素" })}</h4>
            <div className="pluginCodeCard">
              <div className="pluginCodeTag">&lt;button&gt;</div>
              <div className="pluginCodeText">Pay $89.10</div>
              <p>role=button / 140x38px / visible</p>
            </div>
          </section>

          <section>
            <h4>{t({ en: "Candidate locators", zh: "候选定位器", ja: "候補ロケーター" })}</h4>
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
