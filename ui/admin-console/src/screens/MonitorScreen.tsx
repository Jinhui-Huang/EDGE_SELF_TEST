import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";

type MonitorScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
};

export function MonitorScreen({ snapshot, title, locale }: MonitorScreenProps) {
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);

  return (
    <div className="screenGrid">
      <section className="sectionCard sectionWide">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Execution watch", zh: "执行监看", ja: "実行ウォッチ" })}</p>
            <h3>{title}</h3>
          </div>
          <span className="actionHint">{t({ en: "Queue + events + pressure", zh: "队列 + 事件 + 压力", ja: "キュー + イベント + 負荷" })}</span>
        </div>
        <div className="statsGrid">
          {snapshot.stats.slice(0, 4).map((item) => (
            <article key={item.label} className="statCard">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.note}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Running lanes", zh: "运行通道", ja: "実行レーン" })}</p>
            <h3>{t({ en: "Scheduler pressure", zh: "调度压力", ja: "スケジューラ負荷" })}</h3>
          </div>
        </div>
        <div className="signalGrid">
          {snapshot.workQueue.map((item) => (
            <article key={item.title} className="signalCard">
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <div className="signalMeta">
                <span>{item.owner}</span>
                <small>{item.state}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Runtime feed", zh: "运行时事件流", ja: "ランタイムイベント" })}</p>
            <h3>{t({ en: "Recent platform events", zh: "最近平台事件", ja: "最近のプラットフォームイベント" })}</h3>
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
