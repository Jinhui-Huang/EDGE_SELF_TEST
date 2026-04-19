import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";

type AiGenerateScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
};

export function AiGenerateScreen({ snapshot, title, locale }: AiGenerateScreenProps) {
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);
  const signals = [
    {
      label: t({ en: "Candidate plans", zh: "候选生成计划", ja: "候補生成プラン" }),
      value: `${snapshot.cases.length}`,
      note: t({ en: "Built from the current case catalog and project scope.", zh: "来自当前用例目录和项目范围。", ja: "現在のケースカタログとプロジェクト範囲から組み立てています。" })
    },
    {
      label: t({ en: "Guardrail rules", zh: "护栏规则", ja: "ガードレール規則" }),
      value: `${snapshot.constraints.length}`,
      note: t({ en: "Generation remains subordinate to platform policy.", zh: "生成阶段仍然受平台策略约束。", ja: "生成段階でもプラットフォーム方針を優先します。" })
    },
    {
      label: t({ en: "Audit acceptance", zh: "审计采纳率", ja: "監査採用率" }),
      value: snapshot.stats[3]?.value ?? "71%",
      note: snapshot.stats[3]?.note ?? t({ en: "Tracked from operator review history.", zh: "来自操作员复核历史。", ja: "運用者レビュー履歴から集計しています。" })
    }
  ];

  return (
    <div className="screenGrid">
      <section className="heroCard heroPolicy">
        <span>{t({ en: "Generation workspace", zh: "生成工作台", ja: "生成ワークスペース" })}</span>
        <strong>{title}</strong>
        <small>{t({ en: "This screen is used to assemble prompt context, rule constraints, and expected outputs without changing the existing platform frame.", zh: "这个页面用于组织提示上下文、规则约束和预期产物，同时不改变现有平台框架。", ja: "既存のプラットフォーム枠を変えずに、プロンプト文脈、ルール制約、期待成果物をまとめる画面です。" })}</small>
      </section>

      <section className="sectionCard heroLead">
        <div className="heroEyebrow">{t({ en: "Rule-first generation", zh: "规则优先生成", ja: "ルール優先生成" })}</div>
        <h2>{t({ en: "Use platform context as the source of truth", zh: "以平台上下文作为生成事实源", ja: "プラットフォーム文脈を唯一の事実源にする" })}</h2>
        <p>{t({ en: "Project metadata, case scope, model policy, and environment rules are all reused directly so later backend integration does not require a new UI shape.", zh: "项目元数据、用例范围、模型策略和环境规则都直接复用，后续接入后端时不需要重新设计 UI 形态。", ja: "プロジェクト情報、ケース範囲、モデル方針、環境ルールをそのまま再利用するため、今後バックエンド接続時にも UI 形状を変える必要がありません。" })}</p>
      </section>

      <section className="sectionCard sectionWide">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Generation signals", zh: "生成信号", ja: "生成シグナル" })}</p>
            <h3>{t({ en: "Reusable context blocks", zh: "可复用上下文块", ja: "再利用可能な文脈ブロック" })}</h3>
          </div>
        </div>
        <div className="statsGrid">
          {signals.map((signal) => (
            <article key={signal.label} className="statCard">
              <span>{signal.label}</span>
              <strong>{signal.value}</strong>
              <small>{signal.note}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Input context", zh: "输入上下文", ja: "入力コンテキスト" })}</p>
            <h3>{t({ en: "Payload assembly", zh: "载荷组装", ja: "ペイロード構成" })}</h3>
          </div>
        </div>
        <div className="detailStack">
          <div className="detailRow">
            <span>{t({ en: "Projects", zh: "项目", ja: "プロジェクト" })}</span>
            <strong>{snapshot.projects.map((item) => item.key).join(", ")}</strong>
          </div>
          <div className="detailRow">
            <span>{t({ en: "Environment rules", zh: "环境规则", ja: "環境ルール" })}</span>
            <strong>{snapshot.environmentConfig.map((item) => item.value).join(" | ")}</strong>
          </div>
          <div className="detailRow">
            <span>{t({ en: "Model policy", zh: "模型策略", ja: "モデル方針" })}</span>
            <strong>{snapshot.modelConfig.map((item) => item.value).join(" | ")}</strong>
          </div>
        </div>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{t({ en: "Planned outputs", zh: "计划产物", ja: "計画済み成果物" })}</p>
            <h3>{t({ en: "Delivery package", zh: "输出包", ja: "出力パッケージ" })}</h3>
          </div>
        </div>
        <div className="stepList">
          <div className="stepCard">
            <strong>{t({ en: "Intent summary", zh: "意图摘要", ja: "意図サマリー" })}</strong>
            <p>{t({ en: "Summarize business flow, expected checkpoints, and core assertions.", zh: "概括业务流程、关键检查点和核心断言。", ja: "業務フロー、主要チェックポイント、主要アサーションを要約します。" })}</p>
          </div>
          <div className="stepCard">
            <strong>{t({ en: "Action draft", zh: "动作草稿", ja: "アクション草稿" })}</strong>
            <p>{t({ en: "Produce locator-aware execution steps aligned to the current runtime policy.", zh: "产出与当前运行策略对齐、具备定位器意识的执行步骤。", ja: "現在の実行方針に沿った、ロケータ認識付きの実行手順を生成します。" })}</p>
          </div>
          <div className="stepCard">
            <strong>{t({ en: "Audit packet", zh: "审计包", ja: "監査パケット" })}</strong>
            <p>{t({ en: "Expose rationale, risk points, and review notes for operator confirmation.", zh: "向操作员展示理由、风险点和复核说明。", ja: "運用者確認用に理由、リスク点、レビューノートを提示します。" })}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
