import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";

type DataDiffScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
};

export function DataDiffScreen({ snapshot, title, locale }: DataDiffScreenProps) {
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);
  const rows = snapshot.environmentConfig.map((item, index) => ({
    scope: item.label,
    before: index === 0 ? t({ en: "baseline snapshot", zh: "基线快照", ja: "ベースラインスナップショット" }) : t({ en: "template seed", zh: "模板种子", ja: "テンプレートシード" }),
    after: item.value
  }));

  return (
    <div className="screenGrid">
      <section className="sectionCard sectionWide">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Data comparison", zh: "数据对比", ja: "データ比較" })}</p>
            <h3>{title}</h3>
          </div>
          <span className="actionHint">{t({ en: "Snapshot-oriented view", zh: "基于快照的视图", ja: "スナップショット中心ビュー" })}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t({ en: "Scope", zh: "范围", ja: "スコープ" })}</th>
              <th>{t({ en: "Before", zh: "变更前", ja: "変更前" })}</th>
              <th>{t({ en: "After", zh: "变更后", ja: "変更後" })}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.scope}>
                <td>{row.scope}</td>
                <td>{row.before}</td>
                <td>{row.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Rollback policy", zh: "回滚策略", ja: "ロールバック方針" })}</p>
            <h3>{t({ en: "Safety guardrails", zh: "安全护栏", ja: "安全ガードレール" })}</h3>
          </div>
        </div>
        <div className="stepList">
          {snapshot.constraints.map((item) => (
            <div key={item} className="stepCard">
              <strong>{t({ en: "Policy", zh: "策略", ja: "方針" })}</strong>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Checkpoint history", zh: "检查点历史", ja: "チェックポイント履歴" })}</p>
            <h3>{t({ en: "Recent restore events", zh: "最近恢复事件", ja: "最近の復元イベント" })}</h3>
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
