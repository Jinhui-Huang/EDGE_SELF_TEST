import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";

type DataTemplatesScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
};

export function DataTemplatesScreen({ snapshot, title, locale }: DataTemplatesScreenProps) {
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);

  return (
    <div className="screenGrid">
      <section className="heroCard heroLead sectionWide">
        <div className="heroEyebrow">{t({ en: "Data template center", zh: "数据模板中心", ja: "データテンプレートセンター" })}</div>
        <h2>{title}</h2>
        <p>{t({ en: "Manage reusable seed, restore, and teardown recipes for test execution while staying inside the same platform frame as projects and environments.", zh: "在与项目和环境一致的平台框架中，统一管理可复用的造数、恢复和清理配方。", ja: "プロジェクトや環境と同じプラットフォーム枠内で、再利用可能な投入、復元、後始末レシピを一元管理します。" })}</p>
      </section>

      <section className="sectionCard sectionWide">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Reusable packs", zh: "可复用模板包", ja: "再利用パック" })}</p>
            <h3>{t({ en: "Project-scoped recipes", zh: "项目级模板", ja: "プロジェクト単位テンプレート" })}</h3>
          </div>
        </div>
        <div className="stepList columns3">
          {snapshot.projects.map((item) => (
            <article key={item.key} className="stepCard">
              <strong>{item.name}</strong>
              <p>{item.scope}</p>
              <small>
                {item.environments} {t({ en: "target environments", zh: "目标环境", ja: "対象環境" })}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Execution guards", zh: "执行约束", ja: "実行ガード" })}</p>
            <h3>{t({ en: "Template policies", zh: "模板策略", ja: "テンプレート方針" })}</h3>
          </div>
        </div>
        <div className="detailStack">
          {snapshot.environmentConfig.map((item) => (
            <div key={item.label} className="detailRow">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Suggested recipes", zh: "推荐方案", ja: "推奨レシピ" })}</p>
            <h3>{t({ en: "Restore and cleanup", zh: "恢复与清理", ja: "復元とクリーンアップ" })}</h3>
          </div>
        </div>
        <div className="stepList">
          <div className="stepCard">
            <strong>{t({ en: "Checkout seed account", zh: "结算账号预置", ja: "決済アカウント投入" })}</strong>
            <p>{t({ en: "Prepare reusable payment data before the run and clear temporary records after completion.", zh: "执行前准备可复用支付数据，执行后清理临时记录。", ja: "実行前に再利用可能な決済データを投入し、完了後に一時レコードを整理します." })}</p>
          </div>
          <div className="stepCard">
            <strong>{t({ en: "Member profile snapshot", zh: "会员资料快照", ja: "会員プロフィールスナップショット" })}</strong>
            <p>{t({ en: "Capture state before write actions, then verify the rollback result after the run.", zh: "在写操作前保存状态，执行后验证回滚结果。", ja: "書込み前に状態を保存し、実行後にロールバック結果を検証します。" })}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
