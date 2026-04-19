import { Locale, ThemeMode } from "../types";

type TopBarProps = {
  productLabel: string;
  shellLabel: string;
  envLabel: string;
  dataSourceLabel: string;
  sourceLabel: string;
  languageLabel: string;
  themeLabel: string;
  lightLabel: string;
  darkLabel: string;
  searchPlaceholder: string;
  locale: Locale;
  themeMode: ThemeMode;
  onLocaleChange: (locale: Locale) => void;
  onThemeModeChange: (theme: ThemeMode) => void;
};

export function TopBar({
  productLabel,
  shellLabel,
  envLabel,
  dataSourceLabel,
  sourceLabel,
  languageLabel,
  themeLabel,
  lightLabel,
  darkLabel,
  searchPlaceholder,
  locale,
  themeMode,
  onLocaleChange,
  onThemeModeChange
}: TopBarProps) {
  return (
    <header className="topBar">
      <div className="brandMark">
        <div className="brandLogo" aria-hidden="true" />
        <div className="brandText">
          <strong className="brandTitle">edge.test</strong>
          <span className="brandSubtle">{shellLabel}</span>
        </div>
      </div>

      <div className="topDivider" aria-hidden="true" />

      <div className="topPills">
        <span className="pill">
          <span className="pillDot" />
          {productLabel}
        </span>
        <span className="pill secondary">
          <span className="pillDot" />
          {envLabel}: <strong>staging</strong>
        </span>
      </div>

      <div className="topSearch" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span>{searchPlaceholder}</span>
      </div>

      <div className="topBarRight">
        <div className="topBarControls">
          <div className="topBarControl">
            <span>{languageLabel}</span>
            <select value={locale} onChange={(event) => onLocaleChange(event.target.value as Locale)}>
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
            </select>
          </div>
          <div className="topBarControl">
            <span>{dataSourceLabel}</span>
            <button type="button" className="topBarGhostButton" aria-label={sourceLabel}>
              {sourceLabel}
            </button>
          </div>
          <div className="topBarControl">
            <span>{themeLabel}</span>
            <select value={themeMode} onChange={(event) => onThemeModeChange(event.target.value as ThemeMode)}>
              <option value="light">{lightLabel}</option>
              <option value="dark">{darkLabel}</option>
            </select>
          </div>
        </div>

        <div className="topIconBtn" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
            <path d="M10 17a2 2 0 0 0 4 0" />
          </svg>
        </div>

        <div className="topAvatar" aria-hidden="true">
          {locale.toUpperCase()}
        </div>
      </div>
    </header>
  );
}
