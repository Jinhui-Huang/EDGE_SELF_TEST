import { sharedCopy, translate } from "../i18n";
import { screenIcons } from "../tokens/shell";
import { Locale, ScreenId } from "../types";

type SidebarProps = {
  navigation: Array<{
    id: string;
    label: string;
    summary: string;
  }>;
  activeScreen: ScreenId;
  locale: Locale;
  onScreenChange: (screen: ScreenId) => void;
};

const navGroups: Array<{ label: keyof typeof sharedCopy; items: ScreenId[] }> = [
  { label: "sidebarMain", items: ["dashboard", "projects", "cases"] },
  { label: "sidebarDoc", items: ["docParse", "aiGenerate"] },
  { label: "sidebarRuntime", items: ["execution", "monitor", "reports", "reportDetail", "dataDiff"] },
  { label: "sidebarConfig", items: ["models", "environments", "dataTemplates"] },
  { label: "sidebarExtension", items: ["plugin"] }
];

export function Sidebar({ navigation, activeScreen, locale, onScreenChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      {navGroups.map((group, groupIndex) => {
        const groupLabel = translate(locale, sharedCopy[group.label]);
        return (
          <div key={group.label} className="sidebarGroup">
            <div className="sidebarGroupLabel">{groupLabel}</div>
            <nav className="sideNav" aria-label={groupLabel}>
              {group.items.map((screenId) => {
                const item = navigation.find((entry) => entry.id === screenId);
                if (!item) {
                  return null;
                }

                const isActive = activeScreen === screenId;

                return (
                  <button
                    key={screenId}
                    type="button"
                    className={`navButton${isActive ? " active" : ""}`}
                    onClick={() => onScreenChange(screenId)}
                    data-first-group={groupIndex === 0 ? "true" : "false"}
                  >
                    <span className="navIndex">{screenIcons[screenId]}</span>
                    <span className="navText">
                      {item.label}
                    </span>
                    {isActive ? <span className="navActiveDot" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </nav>
          </div>
        );
      })}

      <div className="sidebarFooter">{translate(locale, sharedCopy.sidebarFooter)}</div>
    </aside>
  );
}
