import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";

type ReportDetailScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
};

export function ReportDetailScreen({ snapshot, title, locale }: ReportDetailScreenProps) {
  const report = snapshot.reports[0];
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);

  return (
    <div className="screenGrid">
      <section className="heroCard heroLead sectionWide">
        <div className="heroEyebrow">{t({ en: "Execution report", zh: "执行报告", ja: "実行レポート" })}</div>
        <h2>{report?.runName ?? title}</h2>
        <p>{report?.entry ?? t({ en: "No report entry available.", zh: "当前没有可用报告。", ja: "利用可能なレポートはありません。" })}</p>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Summary", zh: "结果摘要", ja: "結果サマリー" })}</p>
            <h3>{title}</h3>
          </div>
        </div>
        <div className="detailStack">
          <div className="detailRow">
            <span>{t({ en: "Final status", zh: "最终状态", ja: "最終状態" })}</span>
            <strong>{report?.status ?? t({ en: "UNKNOWN", zh: "未知", ja: "不明" })}</strong>
          </div>
          <div className="detailRow">
            <span>{t({ en: "Finished at", zh: "完成时间", ja: "完了時刻" })}</span>
            <strong>{report?.finishedAt ?? t({ en: "Pending", zh: "待定", ja: "保留中" })}</strong>
          </div>
          <div className="detailRow">
            <span>{t({ en: "Artifact entry", zh: "产物入口", ja: "成果物入口" })}</span>
            <strong>{report?.entry ?? t({ en: "Artifacts pending", zh: "产物待生成", ja: "成果物生成待ち" })}</strong>
          </div>
        </div>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Review focus", zh: "复核重点", ja: "レビュー重点" })}</p>
            <h3>{t({ en: "Follow-up items", zh: "后续处理项", ja: "後続対応項目" })}</h3>
          </div>
        </div>
        <div className="stepList">
          {snapshot.constraints.slice(0, 3).map((item) => (
            <div key={item} className="stepCard">
              <strong>{t({ en: "Constraint", zh: "约束", ja: "制約" })}</strong>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sectionCard sectionWide">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Run timeline", zh: "执行时间线", ja: "実行タイムライン" })}</p>
            <h3>{t({ en: "Operator narrative", zh: "操作叙事", ja: "運用ナラティブ" })}</h3>
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
