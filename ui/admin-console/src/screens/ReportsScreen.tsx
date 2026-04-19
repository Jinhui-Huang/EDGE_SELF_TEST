import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";

type ReportsScreenProps = {
  snapshot: AdminConsoleSnapshot;
  reviewBoardLabel: string;
  reportListLabel: string;
  statusLabel: string;
  runColumnLabel: string;
  finishedAtColumnLabel: string;
  entryColumnLabel: string;
  locale: Locale;
};

export function ReportsScreen({
  snapshot,
  reviewBoardLabel,
  reportListLabel,
  statusLabel,
  runColumnLabel,
  finishedAtColumnLabel,
  entryColumnLabel,
  locale
}: ReportsScreenProps) {
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);

  return (
    <div className="screenGrid">
      <section className="sectionCard sectionWide">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{snapshot.navigation.find((item) => item.id === "reports")?.label}</p>
            <h3>{reportListLabel}</h3>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>{runColumnLabel}</th>
              <th>{statusLabel}</th>
              <th>{finishedAtColumnLabel}</th>
              <th>{entryColumnLabel}</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.reports.map((row) => (
              <tr key={row.runName}>
                <td>{row.runName}</td>
                <td>{row.status}</td>
                <td>{row.finishedAt}</td>
                <td>{row.entry}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{reviewBoardLabel}</p>
            <h3>{t({ en: "Operator timeline", zh: "操作员时间线", ja: "オペレータタイムライン" })}</h3>
          </div>
        </div>
        <div className="timeline">
          {snapshot.timeline.map((item) => (
            <div key={`${item.time}-${item.title}`} className="timelineItem">
              <span>{item.time}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
