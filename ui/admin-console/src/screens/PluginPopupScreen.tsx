import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";

type PluginPopupScreenProps = {
  snapshot: AdminConsoleSnapshot;
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
    title: { en: "Pick element", zh: "Pick element", ja: "Pick element" },
    sub: { en: "Hover to capture locator", zh: "Hover to capture locator", ja: "Hover to capture locator" }
  },
  {
    icon: "[]",
    tone: "mint",
    title: { en: "Page summary", zh: "Page summary", ja: "Page summary" },
    sub: { en: "Structured view", zh: "Structured view", ja: "Structured view" }
  },
  {
    icon: ">",
    tone: "coral",
    title: { en: "Quick smoke test", zh: "Quick smoke test", ja: "Quick smoke test" },
    sub: { en: "Run on current URL", zh: "Run on current URL", ja: "Run on current URL" }
  },
  {
    icon: "->",
    tone: "violet",
    title: { en: "Open in platform", zh: "Open in platform", ja: "Open in platform" },
    sub: { en: "Full report and logs", zh: "Full report and logs", ja: "Full report and logs" }
  }
];

export function PluginPopupScreen({ snapshot, title, locale }: PluginPopupScreenProps) {
  const latestRun = snapshot.workQueue[0];
  const t = (value: LocalizedCopy) => translate(locale, value);

  return (
    <div className="pluginDemoScreen" aria-label={title}>
      <div className="pluginBrowserFrame">
        <div className="pluginBrowserBar">
          <div className="pluginBrowserDots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="pluginBrowserUrl">app.acme.example/checkout</div>
          <div className="pluginBrowserExt">E</div>
        </div>

        <div className="pluginBrowserCanvas">
          <div className="pluginCheckoutMock">
            <h2>Checkout</h2>
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
                  <span>{t({ en: "host connected", zh: "host connected", ja: "host connected" })}</span> / staging
                </p>
              </div>
            </div>

            <div className="pluginFloatingBody">
              <section>
                <h4>{t({ en: "Current page", zh: "Current page", ja: "Current page" })}</h4>
                <strong>Checkout</strong>
                <p>/checkout</p>
                <div className="pluginBadgeRow">
                  <span className="pluginBadge mint">recognized</span>
                  <span className="pluginBadge info">3 forms / 8 buttons</span>
                </div>
              </section>

              <div className="pluginDivider" />

              <section>
                <h4>{t({ en: "Active run", zh: "Active run", ja: "Active run" })}</h4>
                <div className="pluginRunCard">
                  <div className="pluginRunMeta">
                    <span className="pluginBadge info dot">running</span>
                    <span className="pluginRunId">run_8f2a</span>
                  </div>
                  <strong>{latestRun?.title ?? "Checkout happy path"}</strong>
                  <p>{t({ en: "step 5/8 / click 'Pay'", zh: "step 5/8 / click 'Pay'", ja: "step 5/8 / click 'Pay'" })}</p>
                  <div className="pluginProgress">
                    <div />
                  </div>
                </div>
              </section>

              <div className="pluginDivider" />

              <section>
                <h4>{t({ en: "Quick actions", zh: "Quick actions", ja: "Quick actions" })}</h4>
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
            <strong>{t({ en: "Pick mode", zh: "Pick mode", ja: "Pick mode" })}</strong>
            <p>{t({ en: "Hover to highlight / click to select", zh: "Hover to highlight / click to select", ja: "Hover to highlight / click to select" })}</p>
          </div>
          <span className="pluginBadge active dot">active</span>
        </div>

        <div className="pluginPickerBody">
          <section>
            <h4>{t({ en: "Selected element", zh: "Selected element", ja: "Selected element" })}</h4>
            <div className="pluginCodeCard">
              <div className="pluginCodeTag">&lt;button&gt;</div>
              <div className="pluginCodeText">Pay $89.10</div>
              <p>role=button / 140x38px / visible</p>
            </div>
          </section>

          <section>
            <h4>{t({ en: "Candidate locators", zh: "Candidate locators", ja: "Candidate locators" })}</h4>
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
              Copy
            </button>
            <button type="button">Use in DSL</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
