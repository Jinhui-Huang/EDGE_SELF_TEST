import { useEffect, useMemo, useState } from "react";
import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";

type AiGenerateFocus = {
  projectKey: string;
  projectName: string;
  documentId: string;
  documentName: string;
  caseId: string;
  caseName: string;
  generatedCases: Array<{
    id: string;
    name: string;
    category: string;
    confidence: string;
  }>;
  reasoning: Array<{
    label: string;
    body: string;
  }>;
};

type AiGenerateScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
  focus?: AiGenerateFocus | null;
};

type LocalizedCopy = {
  en: string;
  zh: string;
  ja: string;
};

type FlowNode = {
  glyph: string;
  indent?: number;
  tone?: "accent" | "muted" | "success" | "warning";
  label: string;
};

const copy = (en: string, zh = en, ja = en): LocalizedCopy => ({ en, zh, ja });

function toneClass(tone: FlowNode["tone"]) {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "muted":
      return "muted";
    default:
      return "accent";
  }
}

function buildDslLines(projectName: string, documentName: string, caseName: string) {
  return [
    `case "${caseName}" {`,
    `  meta {`,
    `    project: "${projectName}"`,
    `    sourceDocument: "${documentName}"`,
    `    environment: "staging"`,
    `    owner: "ai.generate"`,
    `    restorePlanRef: "plan.orders.sql.snap"`,
    `    comparisonPlanRef: "plan.inv.delta"`,
    `  }`,
    ``,
    `  step open "/cart"`,
    `  step click "#proceed-btn"`,
    `    // locator.candidates[0].score = 0.94`,
    `  step fill "[name=card]" = "4242 4242 4242 4242"`,
    `  step type "[name=coupon]" = "SAVE10"`,
    `  step click "button:has-text('Pay')"`,
    ``,
    `  assert url = /order/confirm/*`,
    `  assert text "Thanks for your order"`,
    `  assert db orders.status = "paid"`,
    `  assert delta stock = -2`,
    `}`
  ];
}

export function AiGenerateScreen({ snapshot, title, locale, focus }: AiGenerateScreenProps) {
  const t = (value: LocalizedCopy) => translate(locale, value);

  const fallbackCases = useMemo(
    () =>
      snapshot.cases.map((item, index) => ({
        id: item.id,
        name: item.name,
        category: index % 3 === 0 ? "happy" : index % 3 === 1 ? "exception" : "boundary",
        confidence: index % 3 === 0 ? "0.94" : index % 3 === 1 ? "0.82" : "0.76"
      })),
    [snapshot.cases]
  );

  const activeFocus = focus ?? {
    projectKey: snapshot.projects[0]?.key ?? "checkout-web",
    projectName: snapshot.projects[0]?.name ?? "checkout-web",
    documentId: "fallback-doc",
    documentName: "checkout-requirements-v2.md",
    caseId: fallbackCases[0]?.id ?? "checkout-happy-path",
    caseName: fallbackCases[0]?.name ?? "Checkout happy path",
    generatedCases:
      fallbackCases.length > 0
        ? fallbackCases
        : [
            {
              id: "checkout-happy-path",
              name: "Checkout happy path",
              category: "happy",
              confidence: "0.94"
            }
          ],
    reasoning: [
      {
        label: t(copy("Context", "上下文", "コンテキスト")),
        body: t(copy("Built from the selected parsed document, linked cases, and current platform guardrails.", "基于当前解析文档、关联用例和平台约束生成。", "選択された解析文書、関連ケース、現行ガードレールから構建。"))
      },
      {
        label: t(copy("Review focus", "审查重点", "レビュー重点")),
        body: t(copy("Keep locator stability, database deltas, and rollback checkpoints visible before saving.", "保存前重点确认定位器稳定性、数据库增量和回滚检查点。", "保存前にロケータ安定性、DB差分、ロールバック確認点を可視化。"))
      }
    ]
  };

  const [selectedCaseId, setSelectedCaseId] = useState(activeFocus.caseId);

  useEffect(() => {
    setSelectedCaseId(activeFocus.caseId);
  }, [activeFocus.caseId]);

  const selectedGeneratedCase =
    activeFocus.generatedCases.find((item) => item.id === selectedCaseId) ?? activeFocus.generatedCases[0] ?? null;

  const resolvedCaseName = selectedGeneratedCase?.name ?? activeFocus.caseName;
  const dslLines = useMemo(
    () => buildDslLines(activeFocus.projectName, activeFocus.documentName, resolvedCaseName),
    [activeFocus.documentName, activeFocus.projectName, resolvedCaseName]
  );

  const flowNodes: FlowNode[] = [
    { glyph: "▣", tone: "accent", label: "cart.loaded" },
    { glyph: "└", tone: "muted", indent: 1, label: 'click "#proceed-btn"' },
    { glyph: "▣", tone: "accent", label: "checkout.form" },
    { glyph: "└", tone: "muted", indent: 1, label: "fill card fields" },
    { glyph: "└", tone: "muted", indent: 1, label: "apply coupon" },
    { glyph: "└", tone: "muted", indent: 1, label: 'click "Pay"' },
    { glyph: "◉", tone: "warning", label: "payment.processing" },
    { glyph: "└", tone: "muted", indent: 1, label: "wait: spinner gone" },
    { glyph: "▣", tone: "success", label: "order.confirmed" },
    { glyph: "└", tone: "muted", indent: 1, label: "assert url" },
    { glyph: "└", tone: "muted", indent: 1, label: "assert text" },
    { glyph: "└", tone: "muted", indent: 1, label: "assert db.orders" },
    { glyph: "└", tone: "muted", indent: 1, label: "assert stock delta" }
  ];

  return (
    <div className="aiGenerateDemoScreen">
      <section className="aiGenerateDemoHeader">
        <div className="aiGenerateDemoHeaderCopy">
          <p className="aiGenerateDemoPath">{title}</p>
          <h2>{t(copy("AI generated test - Checkout happy path", "AI 生成测试 - Checkout 正常流程", "AI 生成テスト - Checkout 正常フロー"))}</h2>
          <p className="aiGenerateDemoSubtitle">
            {t(
              copy(
                "Review before saving. Edit DSL directly or ask AI to refine the generated structure.",
                "保存前请先复核。可以直接编辑 DSL，或者让 AI 继续精修生成结构。",
                "保存前にレビュー。DSL を直接編集するか、AI に構造の再調整を依頼できます。"
              )
            )}
          </p>
        </div>
        <div className="aiGenerateDemoActions">
          <button type="button" className="aiGenerateGhostButton">
            {t(copy("Regenerate", "重新生成", "再生成"))}
          </button>
          <button type="button" className="aiGenerateSecondaryButton">
            Dry-run
          </button>
          <button type="button" className="aiGeneratePrimaryButton">
            {t(copy("Save as case", "保存为用例", "ケースとして保存"))}
          </button>
        </div>
      </section>

      <div className="aiGenerateDemoGrid">
        <section className="aiGeneratePanel">
          <div className="aiGeneratePanelHeader">
            <h3>{t(copy("Flow / state tree", "流程 / 状态树", "フロー / 状態ツリー"))}</h3>
          </div>
          <div className="aiGenerateFlowBody">
            <div className="aiGenerateFocusMeta">
              <div className="aiGenerateFocusRow">
                <span>{t(copy("Project", "项目", "プロジェクト"))}</span>
                <strong>{activeFocus.projectName}</strong>
              </div>
              <div className="aiGenerateFocusRow">
                <span>{t(copy("Document", "文档", "ドキュメント"))}</span>
                <strong>{activeFocus.documentName}</strong>
              </div>
              <div className="aiGenerateFocusRow">
                <span>{t(copy("Case", "用例", "ケース"))}</span>
                <strong>{resolvedCaseName}</strong>
              </div>
            </div>
            <div className="aiGenerateCaseTabs">
              {activeFocus.generatedCases.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`aiGenerateCaseTab${item.id === selectedGeneratedCase?.id ? " isSelected" : ""}`}
                  onClick={() => setSelectedCaseId(item.id)}
                >
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
            <div className="aiGenerateTree">
              {flowNodes.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className={`aiGenerateTreeNode ${toneClass(item.tone)}`}
                  style={{ paddingLeft: `${(item.indent ?? 0) * 18}px` }}
                >
                  <span className="aiGenerateTreeGlyph">{item.glyph}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="aiGeneratePanel">
          <div className="aiGeneratePanelHeader">
            <h3>{t(copy("State machine", "状态机", "状態機械"))}</h3>
            <span className="aiGeneratePill">4 states · 5 edges</span>
          </div>
          <div className="aiGenerateMachineBody">
            <svg className="aiGenerateMachineSvg" viewBox="0 0 420 520" aria-hidden="true">
              <defs>
                <marker id="aigen-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="var(--text-soft)" />
                </marker>
              </defs>
              <path d="M210 96 L210 154" className="aiGenerateMachineEdge" markerEnd="url(#aigen-arrow)" />
              <path d="M210 238 L210 296" className="aiGenerateMachineEdge" markerEnd="url(#aigen-arrow)" />
              <path d="M210 380 L210 438" className="aiGenerateMachineEdge" markerEnd="url(#aigen-arrow)" />
              <path d="M258 334 C330 334 346 250 286 206" className="aiGenerateMachineEdge isAccent" markerEnd="url(#aigen-arrow)" />
              <path d="M162 334 C90 334 74 250 134 206" className="aiGenerateMachineEdge" markerEnd="url(#aigen-arrow)" />

              <g transform="translate(138 34)">
                <rect width="144" height="62" rx="18" className="aiGenerateMachineNode accent" />
                <text x="72" y="27" textAnchor="middle" className="aiGenerateMachineTitle">
                  cart.loaded
                </text>
                <text x="72" y="45" textAnchor="middle" className="aiGenerateMachineNote">
                  open /cart
                </text>
              </g>
              <g transform="translate(128 176)">
                <rect width="164" height="62" rx="18" className="aiGenerateMachineNode accent" />
                <text x="82" y="27" textAnchor="middle" className="aiGenerateMachineTitle">
                  checkout.form
                </text>
                <text x="82" y="45" textAnchor="middle" className="aiGenerateMachineNote">
                  fill + coupon + pay
                </text>
              </g>
              <g transform="translate(106 318)">
                <rect width="208" height="62" rx="18" className="aiGenerateMachineNode warning" />
                <text x="104" y="27" textAnchor="middle" className="aiGenerateMachineTitle">
                  payment.processing
                </text>
                <text x="104" y="45" textAnchor="middle" className="aiGenerateMachineNote">
                  spinner / async confirmation
                </text>
              </g>
              <g transform="translate(122 460)">
                <rect width="176" height="62" rx="18" className="aiGenerateMachineNode success" />
                <text x="88" y="27" textAnchor="middle" className="aiGenerateMachineTitle">
                  order.confirmed
                </text>
                <text x="88" y="45" textAnchor="middle" className="aiGenerateMachineNote">
                  URL + text + DB checks
                </text>
              </g>
            </svg>
          </div>
        </section>

        <section className="aiGeneratePanel">
          <div className="aiGeneratePanelHeader">
            <h3>DSL</h3>
            <span className="aiGeneratePill success">
              {t(copy("schema ok", "结构校验通过", "スキーマ OK"))}
            </span>
          </div>
          <div className="aiGenerateCodeBody">
            <pre className="aiGenerateCodeBlock">
              {dslLines.map((line, index) => (
                <div key={`${line}-${index}`} className="aiGenerateCodeLine">
                  {line}
                </div>
              ))}
            </pre>
            <div className="aiGenerateReasoningPanel">
              <div className="aiGenerateReasoningHeader">
                <strong>{t(copy("Review notes", "审查备注", "レビューノート"))}</strong>
              </div>
              <div className="aiGenerateReasoningList">
                {activeFocus.reasoning.map((item) => (
                  <article key={item.label} className="aiGenerateReasoningItem">
                    <strong>{item.label}</strong>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
