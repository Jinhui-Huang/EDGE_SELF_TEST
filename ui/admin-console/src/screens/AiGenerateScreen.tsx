import { useCallback, useEffect, useMemo, useState } from "react";
import { translate } from "../i18n";
import {
  AdminConsoleSnapshot,
  DryRunResponse,
  DslValidateResponse,
  GenerateCaseResponse,
  Locale,
} from "../types";

export type AiGenerateFocus = {
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
  apiBaseUrl: string;
  onSaveSuccess?: () => void;
};

type LocalizedCopy = {
  en: string;
  zh: string;
  ja: string;
};

type MutationState = {
  kind: "idle" | "pending" | "success" | "error";
  message: string;
};

type FlowNode = {
  label: string;
  tone: string;
  indent: number;
};

const copy = (en: string, zh = en, ja = en): LocalizedCopy => ({ en, zh, ja });

function toneClass(tone: string) {
  switch (tone) {
    case "success": return "success";
    case "warning": return "warning";
    case "muted": return "muted";
    default: return "accent";
  }
}

export function AiGenerateScreen({ snapshot, title, locale, focus, apiBaseUrl, onSaveSuccess }: AiGenerateScreenProps) {
  const t = (value: LocalizedCopy) => translate(locale, value);

  // Fallback focus from snapshot when no docParse handoff exists
  const fallbackCases = useMemo(
    () =>
      snapshot.cases.map((item, index) => ({
        id: item.id,
        name: item.name,
        category: index % 3 === 0 ? "happy" : index % 3 === 1 ? "exception" : "boundary",
        confidence: index % 3 === 0 ? "0.94" : index % 3 === 1 ? "0.82" : "0.76",
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
        : [{ id: "checkout-happy-path", name: "Checkout happy path", category: "happy", confidence: "0.94" }],
    reasoning: [
      { label: t(copy("Context", "上下文", "コンテキスト")), body: t(copy("Built from the selected parsed document, linked cases, and current platform guardrails.", "基于当前解析文档、关联用例和平台约束生成。", "選択された解析文書、関連ケース、現行ガードレールから構建。")) },
      { label: t(copy("Review focus", "审查重点", "レビュー重点")), body: t(copy("Keep locator stability, database deltas, and rollback checkpoints visible before saving.", "保存前重点确认定位器稳定性、数据库增量和回滚检查点。", "保存前にロケータ安定性、DB差分、ロールバック確認点を可視化。")) },
    ],
  };

  // Generation result state — populated by generate/regenerate API
  const [genResult, setGenResult] = useState<GenerateCaseResponse | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState(activeFocus.caseId);
  const [generateState, setGenerateState] = useState<MutationState>({ kind: "idle", message: "" });
  const [validateState, setValidateState] = useState<MutationState>({ kind: "idle", message: "" });
  const [dryRunState, setDryRunState] = useState<MutationState>({ kind: "idle", message: "" });
  const [saveState, setSaveState] = useState<MutationState>({ kind: "idle", message: "" });
  const [dryRunResult, setDryRunResult] = useState<DryRunResponse | null>(null);

  // Reset selectedCaseId when focus changes
  useEffect(() => {
    setSelectedCaseId(activeFocus.caseId);
    setGenResult(null);
  }, [activeFocus.caseId]);

  // Candidates from gen result or focus
  const candidates = genResult?.generatedCases ?? activeFocus.generatedCases.map((c) => ({ ...c, summary: "" }));
  const selectedCandidate = candidates.find((c) => c.id === selectedCaseId) ?? candidates[0] ?? null;
  const resolvedCaseName = selectedCandidate?.name ?? activeFocus.caseName;

  // DSL from gen result or local template
  const dslContent = genResult?.selectedDsl?.content ?? buildLocalDsl(activeFocus.projectName, activeFocus.documentName, resolvedCaseName);
  const dslLines = dslContent.split("\n");

  // Flow tree from gen result or local fallback
  const flowNodes: FlowNode[] = genResult?.flowTree ?? defaultFlowNodes;

  // Reasoning from gen result or focus
  const reasoning = genResult?.reasoning ?? activeFocus.reasoning;

  // State machine from gen result
  const stateMachine = genResult?.stateMachine ?? null;

  // Validation pill
  const validationPill = validateState.kind === "success" ? "success"
    : validateState.kind === "error" ? "danger"
      : generateState.kind === "success" ? "success"
        : "";

  // --- API calls ---
  const doGenerate = useCallback(async (mode: "GENERATE" | "REGENERATE") => {
    setGenerateState({ kind: "pending", message: "" });
    try {
      const res = await fetch(`${apiBaseUrl}/api/phase3/agent/generate-case`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectKey: activeFocus.projectKey,
          documentId: activeFocus.documentId,
          caseId: activeFocus.caseId,
          promptMode: mode,
          operator: "qa-platform",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as GenerateCaseResponse;
      setGenResult(data);
      setSelectedCaseId(data.generatedCases[0]?.id ?? activeFocus.caseId);
      setGenerateState({ kind: "success", message: t(copy("Generated", "已生成", "生成完了")) });
      setValidateState({ kind: "idle", message: "" });
      setDryRunState({ kind: "idle", message: "" });
      setDryRunResult(null);
      setSaveState({ kind: "idle", message: "" });
    } catch (err) {
      setGenerateState({ kind: "error", message: String((err as Error).message) });
    }
  }, [apiBaseUrl, activeFocus.projectKey, activeFocus.documentId, activeFocus.caseId, t]);

  // Auto-generate on first mount when focus exists
  useEffect(() => {
    if (focus && !genResult) {
      doGenerate("GENERATE");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.caseId]);

  const doValidate = useCallback(async (): Promise<DslValidateResponse | null> => {
    setValidateState({ kind: "pending", message: "" });
    try {
      const res = await fetch(`${apiBaseUrl}/api/phase3/cases/dsl/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectKey: activeFocus.projectKey,
          documentId: activeFocus.documentId,
          candidateId: selectedCandidate?.id ?? "",
          dsl: dslContent,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DslValidateResponse;
      if (data.status === "VALID") {
        setValidateState({ kind: "success", message: t(copy("DSL valid", "DSL 有效", "DSL 有効")) });
      } else {
        setValidateState({ kind: "error", message: data.errors.map((e) => e.message).join("; ") || "Invalid DSL" });
      }
      return data;
    } catch (err) {
      setValidateState({ kind: "error", message: String((err as Error).message) });
      return null;
    }
  }, [apiBaseUrl, activeFocus.projectKey, activeFocus.documentId, selectedCandidate?.id, dslContent, t]);

  const doDryRun = useCallback(async () => {
    const validation = await doValidate();
    if (!validation || validation.status !== "VALID") return;

    setDryRunState({ kind: "pending", message: "" });
    try {
      const res = await fetch(`${apiBaseUrl}/api/phase3/agent/generate-case/dry-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectKey: activeFocus.projectKey,
          documentId: activeFocus.documentId,
          candidateId: selectedCandidate?.id ?? "",
          dsl: dslContent,
          environment: "staging",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DryRunResponse;
      setDryRunResult(data);
      if (data.status === "PASSED") {
        setDryRunState({ kind: "success", message: t(copy("Dry-run passed", "试运行通过", "ドライラン合格")) });
      } else {
        setDryRunState({ kind: "error", message: t(copy("Dry-run failed", "试运行失败", "ドライラン失敗")) });
      }
    } catch (err) {
      setDryRunState({ kind: "error", message: String((err as Error).message) });
    }
  }, [doValidate, apiBaseUrl, activeFocus.projectKey, activeFocus.documentId, selectedCandidate?.id, dslContent, t]);

  const doSave = useCallback(async () => {
    const validation = await doValidate();
    if (!validation || validation.status !== "VALID") return;

    setSaveState({ kind: "pending", message: "" });
    try {
      const res = await fetch(`${apiBaseUrl}/api/phase3/catalog/case`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeFocus.caseId,
          projectKey: activeFocus.projectKey,
          name: resolvedCaseName,
          tags: "generated,doc-parse",
          status: "draft",
          archived: false,
          dsl: dslContent,
          sourceDocumentId: activeFocus.documentId,
          generationMeta: {
            candidateId: selectedCandidate?.id ?? "",
            confidence: selectedCandidate?.confidence ?? "",
            generator: "agent.generate-case",
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveState({ kind: "success", message: t(copy("Saved to catalog", "已保存到目录", "カタログに保存完了")) });
      onSaveSuccess?.();
    } catch (err) {
      setSaveState({ kind: "error", message: String((err as Error).message) });
    }
  }, [doValidate, apiBaseUrl, activeFocus.caseId, activeFocus.projectKey, resolvedCaseName, onSaveSuccess, t]);

  const anyPending = generateState.kind === "pending" || validateState.kind === "pending"
    || dryRunState.kind === "pending" || saveState.kind === "pending";

  return (
    <div className="aiGenerateDemoScreen">
      <section className="aiGenerateDemoHeader">
        <div className="aiGenerateDemoHeaderCopy">
          <p className="aiGenerateDemoPath">{title}</p>
          <h2>
            {t(copy("AI generated test", "AI 生成测试", "AI 生成テスト"))} - {resolvedCaseName}
          </h2>
          <p className="aiGenerateDemoSubtitle">
            {t(copy(
              "Review before saving. Edit DSL directly or ask AI to refine the generated structure.",
              "保存前请先复核。可以直接编辑 DSL，或者让 AI 继续精修生成结构。",
              "保存前にレビュー。DSL を直接編集するか、AI に構造の再調整を依頼できます。",
            ))}
          </p>
          {/* Mutation feedback */}
          {generateState.kind === "error" && <p className="aiGenerateMutationError">{generateState.message}</p>}
          {saveState.kind === "success" && <p className="aiGenerateMutationSuccess">{saveState.message}</p>}
          {saveState.kind === "error" && <p className="aiGenerateMutationError">{saveState.message}</p>}
          {dryRunState.kind === "success" && <p className="aiGenerateMutationSuccess">{dryRunState.message}</p>}
          {dryRunState.kind === "error" && <p className="aiGenerateMutationError">{dryRunState.message}</p>}
        </div>
        <div className="aiGenerateDemoActions">
          <button
            type="button"
            className="aiGenerateGhostButton"
            disabled={anyPending}
            onClick={() => doGenerate("REGENERATE")}
          >
            {generateState.kind === "pending"
              ? t(copy("Generating…", "生成中…", "生成中…"))
              : t(copy("Regenerate", "重新生成", "再生成"))}
          </button>
          <button
            type="button"
            className="aiGenerateSecondaryButton"
            disabled={anyPending}
            onClick={doDryRun}
          >
            {dryRunState.kind === "pending"
              ? t(copy("Running…", "运行中…", "実行中…"))
              : "Dry-run"}
          </button>
          <button
            type="button"
            className="aiGeneratePrimaryButton"
            disabled={anyPending}
            onClick={doSave}
          >
            {saveState.kind === "pending"
              ? t(copy("Saving…", "保存中…", "保存中…"))
              : t(copy("Save as case", "保存为用例", "ケースとして保存"))}
          </button>
        </div>
      </section>

      <div className="aiGenerateDemoGrid">
        {/* Flow / state tree panel */}
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
              {candidates.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`aiGenerateCaseTab${item.id === selectedCandidate?.id ? " isSelected" : ""}`}
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
                  <span className="aiGenerateTreeGlyph">
                    {item.indent > 0 ? "└" : item.tone === "warning" ? "◉" : item.tone === "success" ? "▣" : "▣"}
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* State machine panel */}
        <section className="aiGeneratePanel">
          <div className="aiGeneratePanelHeader">
            <h3>{t(copy("State machine", "状态机", "状態機械"))}</h3>
            <span className="aiGeneratePill">
              {stateMachine
                ? `${stateMachine.states.length} states · ${stateMachine.edges.length} edges`
                : "4 states · 5 edges"}
            </span>
          </div>
          <div className="aiGenerateMachineBody">
            {stateMachine ? (
              <div className="aiGenerateMachineList">
                {stateMachine.states.map((s) => (
                  <div key={s.id} className="aiGenerateMachineStateRow">
                    <span className="aiGenerateMachineStateDot" />
                    <strong>{s.label}</strong>
                  </div>
                ))}
                <div className="aiGenerateMachineDivider" />
                {stateMachine.edges.map((e, i) => (
                  <div key={`${e.from}-${e.to}-${i}`} className="aiGenerateMachineEdgeRow">
                    <span>{e.from}</span>
                    <span className="aiGenerateMachineArrow">→</span>
                    <span>{e.to}</span>
                    <span className="aiGenerateMachineEdgeTrigger">{e.trigger}</span>
                  </div>
                ))}
              </div>
            ) : (
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
                <g transform="translate(138 34)"><rect width="144" height="62" rx="18" className="aiGenerateMachineNode accent" /><text x="72" y="27" textAnchor="middle" className="aiGenerateMachineTitle">cart.loaded</text><text x="72" y="45" textAnchor="middle" className="aiGenerateMachineNote">open /cart</text></g>
                <g transform="translate(128 176)"><rect width="164" height="62" rx="18" className="aiGenerateMachineNode accent" /><text x="82" y="27" textAnchor="middle" className="aiGenerateMachineTitle">checkout.form</text><text x="82" y="45" textAnchor="middle" className="aiGenerateMachineNote">fill + coupon + pay</text></g>
                <g transform="translate(106 318)"><rect width="208" height="62" rx="18" className="aiGenerateMachineNode warning" /><text x="104" y="27" textAnchor="middle" className="aiGenerateMachineTitle">payment.processing</text><text x="104" y="45" textAnchor="middle" className="aiGenerateMachineNote">spinner / async</text></g>
                <g transform="translate(122 460)"><rect width="176" height="62" rx="18" className="aiGenerateMachineNode success" /><text x="88" y="27" textAnchor="middle" className="aiGenerateMachineTitle">order.confirmed</text><text x="88" y="45" textAnchor="middle" className="aiGenerateMachineNote">URL + text + DB</text></g>
              </svg>
            )}
          </div>
        </section>

        {/* DSL + reasoning panel */}
        <section className="aiGeneratePanel">
          <div className="aiGeneratePanelHeader">
            <h3>DSL</h3>
            <span className={`aiGeneratePill${validationPill ? ` ${validationPill}` : ""}`}>
              {validateState.kind === "success"
                ? t(copy("schema ok", "结构校验通过", "スキーマ OK"))
                : validateState.kind === "error"
                  ? t(copy("schema error", "结构校验失败", "スキーマエラー"))
                  : generateState.kind === "success"
                    ? t(copy("schema ok", "结构校验通过", "スキーマ OK"))
                    : t(copy("pending", "待校验", "検証待ち"))}
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

            {/* Dry-run result */}
            {dryRunResult && (
              <div className="aiGenerateDryRunResult">
                <strong>Dry-run: {dryRunResult.status}</strong>
                <div className="aiGenerateDryRunChecks">
                  <div>Parser: {dryRunResult.parser.status}</div>
                  {dryRunResult.runtimeChecks.map((check) => (
                    <div key={check.name}>{check.name}: {check.status}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="aiGenerateReasoningPanel">
              <div className="aiGenerateReasoningHeader">
                <strong>{t(copy("Review notes", "审查备注", "レビューノート"))}</strong>
              </div>
              <div className="aiGenerateReasoningList">
                {reasoning.map((item) => (
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

// --- fallback data when no generation result exists ---

const defaultFlowNodes: FlowNode[] = [
  { label: "cart.loaded", tone: "accent", indent: 0 },
  { label: 'click "#proceed-btn"', tone: "muted", indent: 1 },
  { label: "checkout.form", tone: "accent", indent: 0 },
  { label: "fill card fields", tone: "muted", indent: 1 },
  { label: "apply coupon", tone: "muted", indent: 1 },
  { label: 'click "Pay"', tone: "muted", indent: 1 },
  { label: "payment.processing", tone: "warning", indent: 0 },
  { label: "wait: spinner gone", tone: "muted", indent: 1 },
  { label: "order.confirmed", tone: "success", indent: 0 },
  { label: "assert url", tone: "muted", indent: 1 },
  { label: "assert text", tone: "muted", indent: 1 },
  { label: "assert db.orders", tone: "muted", indent: 1 },
  { label: "assert stock delta", tone: "muted", indent: 1 },
];

function buildLocalDsl(projectName: string, documentName: string, caseName: string) {
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
    `  step fill "[name=card]" = "4242 4242 4242 4242"`,
    `  step type "[name=coupon]" = "SAVE10"`,
    `  step click "button:has-text('Pay')"`,
    ``,
    `  assert url = /order/confirm/*`,
    `  assert text "Thanks for your order"`,
    `  assert db orders.status = "paid"`,
    `  assert delta stock = -2`,
    `}`,
  ].join("\n");
}
