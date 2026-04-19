import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";

type DocParseScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
};

export function DocParseScreen({ snapshot, title, locale }: DocParseScreenProps) {
  const project = snapshot.projects[0];
  const cases = snapshot.cases.slice(0, 3);
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);

  return (
    <div className="screenGrid">
      <section className="heroCard heroLead sectionWide">
        <div className="heroEyebrow">{t({ en: "Requirement intake", zh: "测试文档接入", ja: "要件ドキュメント取込" })}</div>
        <h2>{title}</h2>
        <p>
          {t({
            en: "Use the main platform to receive business requirements, change notes, and smoke-check instructions before they become test cases.",
            zh: "把业务需求、变更说明和冒烟检查说明先接入主平台，再进入用例生成与执行流程。",
            ja: "業務要件、変更説明、スモーク確認指示をまず主平台に取り込み、その後でケース生成と実行に進みます。"
          })}
        </p>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Current packet", zh: "当前文档包", ja: "現在の入力パケット" })}</p>
            <h3>{project?.name ?? t({ en: "No active project", zh: "当前无项目", ja: "対象プロジェクトなし" })}</h3>
          </div>
          <span className="actionHint">{t({ en: "Ready for parser", zh: "等待解析接入", ja: "解析接続待ち" })}</span>
        </div>
        <div className="detailStack">
          <div className="detailRow">
            <span>{t({ en: "Business scope", zh: "业务范围", ja: "業務スコープ" })}</span>
            <strong>{project?.scope ?? t({ en: "Pending project selection", zh: "等待选择项目", ja: "プロジェクト選択待ち" })}</strong>
          </div>
          <div className="detailRow">
            <span>{t({ en: "Detected tags", zh: "识别标签", ja: "検出タグ" })}</span>
            <strong>{snapshot.caseTags.slice(0, 4).join(", ") || t({ en: "No tags detected", zh: "尚未识别标签", ja: "タグ未検出" })}</strong>
          </div>
          <div className="detailRow">
            <span>{t({ en: "Candidate cases", zh: "候选用例", ja: "候補ケース" })}</span>
            <strong>{cases.length}</strong>
          </div>
        </div>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Review stages", zh: "处理阶段", ja: "処理ステージ" })}</p>
            <h3>{t({ en: "Operator checkpoints", zh: "操作员检查点", ja: "運用者チェックポイント" })}</h3>
          </div>
        </div>
        <div className="stepList">
          <div className="stepCard">
            <strong>{t({ en: "01 Register source", zh: "01 登记文档来源", ja: "01 ソース登録" })}</strong>
            <p>{t({ en: "Record project, environment, owner, and document type so later actions remain auditable.", zh: "先记录项目、环境、责任人和文档类型，确保后续动作可审计。", ja: "後続処理を監査できるよう、プロジェクト、環境、担当者、文書種別を先に記録します。" })}</p>
          </div>
          <div className="stepCard">
            <strong>{t({ en: "02 Extract intent blocks", zh: "02 提取意图块", ja: "02 意図ブロック抽出" })}</strong>
            <p>{t({ en: "Split requirements into operation steps, assertions, and test-data anchors.", zh: "把需求拆成操作步骤、断言目标和测试数据锚点。", ja: "要件を操作手順、アサーション対象、テストデータアンカーに分解します。" })}</p>
          </div>
          <div className="stepCard">
            <strong>{t({ en: "03 Confirm ambiguity", zh: "03 复核歧义项", ja: "03 曖昧項目確認" })}</strong>
            <p>{t({ en: "Send uncertain fields to operator review before AI generation or runtime planning begins.", zh: "在 AI 生成或运行规划前，把不确定字段交给操作员复核。", ja: "AI 生成や実行計画に入る前に、不確定な項目を運用者レビューへ回します。" })}</p>
          </div>
        </div>
      </section>

      <section className="sectionCard sectionWide">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Extracted draft", zh: "抽取结果草稿", ja: "抽出ドラフト" })}</p>
            <h3>{t({ en: "Case candidates", zh: "候选测试切片", ja: "ケース候補スライス" })}</h3>
          </div>
        </div>
        <div className="stepList columns3">
          {cases.map((item) => (
            <article key={item.id} className="stepCard">
              <strong>{item.name}</strong>
              <p>{item.projectKey}</p>
              <small>{item.tags.join(" / ")}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
