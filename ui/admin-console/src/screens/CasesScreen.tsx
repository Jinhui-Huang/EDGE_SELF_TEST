import { useCallback, useEffect, useMemo, useState } from "react";
import { formatCopy, sharedCopy, translate } from "../i18n";
import {
  AdminConsoleSnapshot,
  CaseDslResponse,
  CaseDslSaveResponse,
  CaseDslValidateResponse,
  CaseHistoryResponse,
  CaseItem,
  CasePlansResponse,
  CaseStateMachineResponse,
  Locale,
  MutationState
} from "../types";
import { MutationStatus } from "../ui-kit/MutationStatus";

type CaseDetailTab = "overview" | "dsl" | "stateMachine" | "plans" | "history";

type CasesScreenProps = {
  snapshot: AdminConsoleSnapshot;
  caseDraft: CaseItem[];
  caseState: MutationState;
  initialProjectKey?: string | null;
  apiBaseUrl: string;
  title: string;
  saveHint: string;
  caseTagsLabel: string;
  fieldCaseIdLabel: string;
  fieldProjectKeyLabel: string;
  fieldNameLabel: string;
  fieldStatusLabel: string;
  fieldTagsLabel: string;
  fieldArchivedLabel: string;
  newCatalogRowLabel: string;
  addCaseRowLabel: string;
  saveCaseCatalogLabel: string;
  locale: Locale;
  onPrepareCase: (caseId: string) => void;
  onCaseChange: (index: number, key: keyof CaseItem, value: string | boolean) => void;
  onAddCaseRow: () => void;
  onRemoveCaseRow: (index: number) => void;
  onSubmit: CasesScreenSubmitHandler;
};

type CasesScreenSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void;

type LocalizedCopy = {
  en: string;
  zh: string;
  ja: string;
};

type DetailStep = {
  index: number;
  action: string;
  selector: string;
  value?: string;
  note?: string;
  healed?: boolean;
};

const copy = (en: string, zh = en, ja = en): LocalizedCopy => ({ en, zh, ja });
const accentClasses = ["accent", "accent2", "accent3", "accent4"] as const;

const detailTabs = [
  copy("Overview", "概览", "概要"),
  copy("DSL", "DSL", "DSL"),
  copy("State machine", "状态机", "状態機械"),
  copy("Plans", "计划", "計画"),
  copy("History", "历史", "履历")
];

function buildDetailSteps(testCase: CaseItem, locale: Locale): DetailStep[] {
  const t = (value: LocalizedCopy) => translate(locale, value);
  const normalizedProject = testCase.projectKey || "project";
  const normalizedCase = testCase.id || "case";
  const successPath = `/${normalizedProject.replace(/-web|-center|-console/g, "").replace(/-/g, "/") || "flow"}`;

  return [
    { index: 1, action: "open", selector: successPath, note: t(copy("Navigate to entry", "进入入口页", "入口ページへ移動")) },
    { index: 2, action: "click", selector: "#primary-entry", note: t(copy("Locator healed once", "定位已修复 1 次", "ロケーターを 1 回修復")), healed: true },
    { index: 3, action: "fill", selector: "[name=account]", value: `${normalizedCase}@demo.local` },
    { index: 4, action: "type", selector: "[name=token]", value: "AUTO-E2E-2026" },
    { index: 5, action: "click", selector: "button.primary", note: t(copy("Submit the happy path", "提交主路径流程", "ハッピーパスを送信")) },
    { index: 6, action: "assert", selector: "url", value: `${successPath}/success/*`, note: t(copy("URL assertion", "URL 断言", "URL アサーション")) },
    { index: 7, action: "assert", selector: "db", value: `${normalizedProject}.status = "done"`, note: t(copy("Database assertion", "数据库断言", "DB アサーション")) },
    { index: 8, action: "assert", selector: "delta", value: "snapshot diff = expected", note: t(copy("Snapshot diff", "快照比对", "スナップショット差分")) }
  ];
}

export function CasesScreen({
  snapshot,
  caseDraft,
  caseState,
  initialProjectKey,
  apiBaseUrl,
  title,
  saveHint,
  caseTagsLabel,
  fieldProjectKeyLabel,
  locale,
  onPrepareCase
}: CasesScreenProps) {
  const t = (value: LocalizedCopy) => translate(locale, value);
  const initialSelection = initialProjectKey?.trim() || snapshot.projects[0]?.key || caseDraft[0]?.projectKey || "all";
  const [selectedProjectKey, setSelectedProjectKey] = useState(initialSelection);
  const [openedCaseId, setOpenedCaseId] = useState<string | null>(null);
  const [overviewCollapsed, setOverviewCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<CaseDetailTab>("overview");

  // ---- API-backed tab data ----
  const [dslData, setDslData] = useState<CaseDslResponse | null>(null);
  const [dslDraft, setDslDraft] = useState<string>("");
  const [dslValidation, setDslValidation] = useState<CaseDslValidateResponse | null>(null);
  const [dslSaving, setDslSaving] = useState(false);
  const [smData, setSmData] = useState<CaseStateMachineResponse | null>(null);
  const [plansData, setPlansData] = useState<CasePlansResponse | null>(null);
  const [historyData, setHistoryData] = useState<CaseHistoryResponse | null>(null);
  const [tabLoading, setTabLoading] = useState(false);

  const tabKeys: CaseDetailTab[] = ["overview", "dsl", "stateMachine", "plans", "history"];

  const fetchTabData = useCallback(
    async (tab: CaseDetailTab, caseId: string) => {
      setTabLoading(true);
      try {
        if (tab === "dsl") {
          const res = await fetch(`${apiBaseUrl}/api/phase3/cases/${caseId}/dsl`);
          if (res.ok) {
            const data: CaseDslResponse = await res.json();
            setDslData(data);
            setDslDraft(JSON.stringify(data.definition, null, 2));
            setDslValidation(null);
          }
        } else if (tab === "stateMachine") {
          const res = await fetch(`${apiBaseUrl}/api/phase3/cases/${caseId}/state-machine`);
          if (res.ok) setSmData(await res.json());
        } else if (tab === "plans") {
          const res = await fetch(`${apiBaseUrl}/api/phase3/cases/${caseId}/plans`);
          if (res.ok) setPlansData(await res.json());
        } else if (tab === "history") {
          const res = await fetch(`${apiBaseUrl}/api/phase3/cases/${caseId}/history`);
          if (res.ok) setHistoryData(await res.json());
        }
      } catch {
        /* network error – keep previous data */
      } finally {
        setTabLoading(false);
      }
    },
    [apiBaseUrl]
  );

  const handleValidateDsl = useCallback(
    async (caseId: string) => {
      try {
        const definition = JSON.parse(dslDraft);
        const res = await fetch(`${apiBaseUrl}/api/phase3/cases/${caseId}/dsl/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ definition })
        });
        if (res.ok) setDslValidation(await res.json());
      } catch {
        setDslValidation({ status: "INVALID", errors: ["Invalid JSON"], warnings: [] });
      }
    },
    [apiBaseUrl, dslDraft]
  );

  const handleSaveDsl = useCallback(
    async (caseId: string, projectKey: string) => {
      setDslSaving(true);
      try {
        const definition = JSON.parse(dslDraft);
        const res = await fetch(`${apiBaseUrl}/api/phase3/cases/${caseId}/dsl`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ definition, projectKey, updatedBy: "operator" })
        });
        if (res.ok) {
          const saved: CaseDslSaveResponse = await res.json();
          setDslData((prev) => (prev ? { ...prev, dslVersion: saved.dslVersion, updatedAt: saved.updatedAt } : prev));
        }
      } catch {
        /* save failed */
      } finally {
        setDslSaving(false);
      }
    },
    [apiBaseUrl, dslDraft]
  );

  const handleSaveStateMachine = useCallback(
    async (caseId: string) => {
      if (!smData) return;
      try {
        const res = await fetch(`${apiBaseUrl}/api/phase3/cases/${caseId}/state-machine`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectKey: smData.projectKey, nodes: smData.nodes, edges: smData.edges, guards: smData.guards })
        });
        if (res.ok) {
          const saved = await res.json();
          setSmData((prev) => (prev ? { ...prev, updatedAt: saved.updatedAt } : prev));
        }
      } catch {
        /* save failed */
      }
    },
    [apiBaseUrl, smData]
  );

  useEffect(() => {
    const normalizedProjectKey = initialProjectKey?.trim();
    if (!normalizedProjectKey) {
      return;
    }
    if (snapshot.projects.some((project) => project.key === normalizedProjectKey) && normalizedProjectKey !== selectedProjectKey) {
      setSelectedProjectKey(normalizedProjectKey);
      setOpenedCaseId(null);
    }
  }, [initialProjectKey, selectedProjectKey, snapshot.projects]);

  useEffect(() => {
    if (selectedProjectKey === "all") {
      return;
    }
    const hasProject = snapshot.projects.some((project) => project.key === selectedProjectKey);
    if (!hasProject) {
      setSelectedProjectKey(snapshot.projects[0]?.key ?? "all");
    }
  }, [selectedProjectKey, snapshot.projects]);

  const visibleCases = useMemo(() => {
    if (selectedProjectKey === "all") {
      return caseDraft;
    }
    return caseDraft.filter((item) => item.projectKey === selectedProjectKey);
  }, [caseDraft, selectedProjectKey]);

  useEffect(() => {
    if (!openedCaseId) {
      return;
    }
    const stillVisible = visibleCases.some((item) => item.id === openedCaseId);
    if (!stillVisible) {
      setOpenedCaseId(null);
    }
  }, [openedCaseId, visibleCases]);

  // Reset tab data when case changes
  useEffect(() => {
    setActiveTab("overview");
    setDslData(null);
    setDslDraft("");
    setDslValidation(null);
    setSmData(null);
    setPlansData(null);
    setHistoryData(null);
  }, [openedCaseId]);

  // Fetch data when tab changes
  useEffect(() => {
    if (openedCaseId && activeTab !== "overview") {
      fetchTabData(activeTab, openedCaseId);
    }
  }, [activeTab, openedCaseId, fetchTabData]);

  const openedCase = visibleCases.find((item) => item.id === openedCaseId) ?? null;
  const selectedProject =
    snapshot.projects.find((project) => project.key === (selectedProjectKey === "all" ? openedCase?.projectKey : selectedProjectKey)) ??
    snapshot.projects.find((project) => project.key === openedCase?.projectKey) ??
    snapshot.projects[0] ??
    null;

  const totalCases = visibleCases.length;
  const activeCases = visibleCases.filter((item) => !item.archived).length;
  const archivedCases = visibleCases.filter((item) => item.archived).length;
  const happyCases = visibleCases.filter((item) => /active|happy|pass/i.test(item.status)).length;
  const detailSteps = openedCase ? buildDetailSteps(openedCase, locale) : [];
  const passBlocks = Array.from({ length: 20 }, (_, index) => {
    if (index === 7 || index === 13) {
      return "fail";
    }
    if (index === 15) {
      return "warn";
    }
    return "pass";
  });

  return (
    <div className="casesScreen">
      <section className="casesOverviewCard">
        <div className="casesOverviewHead">
          <div>
            <p className="eyebrow">{snapshot.navigation.find((item) => item.id === "cases")?.label}</p>
            <h2>{title}</h2>
            <p className="casesOverviewLead">
              {t(
                copy(
                  "Switch projects first, then open one case in detail view. Pre-execution is available only inside the lower detail canvas.",
                  "先切项目，再打开某个用例明细。预执行只在下方详情画布内可用。",
                  "先にプロジェクトを切り替え、ケース詳細を開きます。事前実行は下の詳細キャンバスでのみ使えます。"
                )
              )}
            </p>
          </div>
          <div className="casesOverviewActions">
            <span className="actionHint">{saveHint}</span>
            <button
              type="button"
              className="casesCollapseButton"
              aria-expanded={!overviewCollapsed}
              aria-label={overviewCollapsed ? t(copy("Expand case overview", "展开用例概览", "ケース概要を展開")) : t(copy("Collapse case overview", "收起用例概览", "ケース概要を折りたたむ"))}
              onClick={() => setOverviewCollapsed((current) => !current)}
            >
              <span className={`casesCollapseIcon ${overviewCollapsed ? "isCollapsed" : ""}`}>^</span>
            </button>
          </div>
        </div>

        {overviewCollapsed ? (
          <div className="casesCollapsedSummary">
            <span className="casesCollapsedLabel">{t(copy("Overview collapsed", "概览已收起", "概要を折りたたみ"))}</span>
            <strong>{openedCase?.name ?? selectedProject?.name ?? t(copy("Expand above to choose a case", "展开后选择用例", "展開してケースを選択"))}</strong>
          </div>
        ) : null}

        <div className={`casesOverviewBody ${overviewCollapsed ? "isCollapsed" : ""}`}>
          <div className="casesProjectRail">
            <span className="casesRailLabel">{fieldProjectKeyLabel}</span>
            <div className="casesProjectSwitches">
              {snapshot.projects.map((project, index) => {
                const projectCases = caseDraft.filter((item) => item.projectKey === project.key);
                const selected = selectedProjectKey === project.key;
                return (
                  <button
                    key={project.key}
                    type="button"
                    className={`casesProjectCard ${accentClasses[index % accentClasses.length]} ${selected ? "isSelected" : ""}`}
                    onClick={() => {
                      setSelectedProjectKey(project.key);
                      setOpenedCaseId(null);
                    }}
                  >
                    <div className="casesProjectCardTop">
                      <div>
                        <strong>{project.name}</strong>
                        <small>{project.scope}</small>
                      </div>
                      <span>{projectCases.length}</span>
                    </div>
                    <div className="casesProjectCardMeta">
                      <span>{t(copy("Cases", "用例", "ケース"))}</span>
                      <span>{t(copy("Env", "环境", "環境"))}: {project.environments}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="casesCatalogSummary">
            <div className="casesMetric">
              <span>{t(copy("Visible cases", "当前用例", "表示ケース"))}</span>
              <strong>{totalCases}</strong>
            </div>
            <div className="casesMetric">
              <span>{t(copy("Active", "活跃", "アクティブ"))}</span>
              <strong>{activeCases}</strong>
            </div>
            <div className="casesMetric">
              <span>{t(copy("Archived", "归档", "アーカイブ"))}</span>
              <strong>{archivedCases}</strong>
            </div>
            <div className="casesMetric">
              <span>{t(copy("Happy path", "主路径", "ハッピーパス"))}</span>
              <strong>{happyCases}</strong>
            </div>
          </div>

          <div className="casesListPanel">
            <div className="casesListPanelHead">
              <div>
                <p className="eyebrow">{t(copy("Case catalog", "用例目录", "ケースカタログ"))}</p>
                <h3>{selectedProject?.name ?? t(copy("All projects", "全部项目", "すべてのプロジェクト"))}</h3>
              </div>
              <span className="casesListHint">{t(copy("Open detail to unlock actions", "打开明细后才解锁动作", "詳細を開くと操作が有効になります"))}</span>
            </div>

            <div className="casesListTable">
              {visibleCases.map((testCase, index) => {
                const snapshotCase = snapshot.cases.find((item) => item.id === testCase.id);
                const isOpened = openedCaseId === testCase.id;
                return (
                  <article key={`${testCase.id}-${index}`} className={`casesListRow ${isOpened ? "isOpened" : ""}`}>
                    <div className="casesListIdentity">
                      <strong>{testCase.name || testCase.id}</strong>
                      <p>{testCase.id}</p>
                    </div>
                    <div className="casesListMeta">
                      <span className={`casesStatusBadge ${/active/i.test(testCase.status) ? "isActive" : ""}`}>{testCase.status}</span>
                      <span>{snapshotCase?.updatedAt ?? t(copy("New row", "新行", "新規行"))}</span>
                    </div>
                    <div className="casesListTags">
                      {(testCase.tags || "")
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                        .slice(0, 3)
                        .map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                    </div>
                    <button
                      type="button"
                      className="casesInlineAction"
                      onClick={() => {
                        setOpenedCaseId(testCase.id);
                        setOverviewCollapsed(true);
                      }}
                    >
                      {isOpened ? t(copy("Opened", "已打开", "表示中")) : t(copy("Detail", "详情", "詳細"))}
                    </button>
                  </article>
                );
              })}
              {!visibleCases.length ? <p className="emptyState">{translate(locale, sharedCopy.noCasesMatch)}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="casesDetailScreen">
        <div className="casesDetailPath">
          {openedCase ? `${t(copy("Cases", "用例", "ケース"))} / ${openedCase.name || openedCase.id}` : t(copy("Cases / Select one row above", "用例 / 先从上方选择一条", "ケース / 上で 1 件選択"))}
        </div>

        <div className="casesDetailHero">
          <div>
            <div className="casesDetailTitleRow">
              <h3>{openedCase?.name ?? t(copy("Case detail locked", "用例详情未激活", "ケース詳細は未選択"))}</h3>
              <span className="casesHappyBadge">{openedCase?.status ?? t(copy("Locked", "未激活", "未選択"))}</span>
            </div>
            <p className="casesDetailSubtitle">
              {openedCase
                ? t(
                    copy(
                      `From project ${openedCase.projectKey} | updated ${snapshot.cases.find((item) => item.id === openedCase.id)?.updatedAt ?? "recently"} | 14 runs this week | 100% pass`,
                      `来自项目 ${openedCase.projectKey} | 更新于 ${snapshot.cases.find((item) => item.id === openedCase.id)?.updatedAt ?? "最近"} | 本周 14 次运行 | 100% 通过`,
                      `プロジェクト ${openedCase.projectKey} | 更新 ${snapshot.cases.find((item) => item.id === openedCase.id)?.updatedAt ?? "recently"} | 今週 14 実行 | 成功率 100%`
                    )
                  )
                : t(copy("Choose one case from the overview list to load the detail canvas.", "先从上面的列表选择用例，再加载详情画布。", "上の一覧からケースを選ぶと詳細キャンバスを表示します。"))}
            </p>
          </div>

          <div className="casesHeroActions">
            <button
              type="button"
              className="casesActionButton ghost"
              disabled={!openedCase}
              onClick={() => setActiveTab("dsl")}
            >
              {t(copy("Edit DSL", "编辑 DSL", "DSL 編集"))}
            </button>
            <button
              type="button"
              className="casesActionButton secondary"
              disabled={!openedCase}
              onClick={() => setActiveTab("stateMachine")}
            >
              {t(copy("State machine", "状态机", "状態機械"))}
            </button>
            <button
              type="button"
              className="casesActionButton primary"
              disabled={!openedCase}
              onClick={() => {
                if (openedCase) {
                  onPrepareCase(openedCase.id);
                }
              }}
            >
              {t(copy("Pre-execution", "预执行", "事前実行"))}
            </button>
          </div>
        </div>

        <div className="casesTabs">
          {detailTabs.map((tab, index) => (
            <button
              key={tab.en}
              type="button"
              className={`casesTab ${activeTab === tabKeys[index] ? "isActive" : ""}`}
              disabled={!openedCase}
              onClick={() => setActiveTab(tabKeys[index])}
            >
              {t(tab)}
            </button>
          ))}
        </div>

        {openedCase ? (
          <div className="casesDetailGrid">
            <div className="casesDetailMain">
              {tabLoading ? (
                <section className="casesPanelCard">
                  <p className="casesPanelText">{t(copy("Loading…", "加载中…", "読み込み中…"))}</p>
                </section>
              ) : activeTab === "overview" ? (
                <section className="casesPanelCard casesStepsCard">
                  <div className="casesPanelHead">
                    <div className="casesPanelTitle">{t(copy("Steps", "步骤", "ステップ"))}</div>
                    <span className="casesPanelPill">{detailSteps.length} steps | 5 assertions</span>
                  </div>
                  <div className="casesStepsList">
                    {detailSteps.map((step) => (
                      <div key={step.index} className="casesStepRow">
                        <div className="casesStepIndex">{String(step.index).padStart(2, "0")}</div>
                        <span className={`casesStepBadge ${step.action === "assert" ? "info" : "neutral"}`}>{step.action}</span>
                        <div className="casesStepSelector">{step.selector}</div>
                        <div className="casesStepValue">{step.value ?? ""}</div>
                        {step.healed ? <span className="casesStepFlag warning">healed</span> : <div className="casesStepNote">{step.note ?? ""}</div>}
                      </div>
                    ))}
                  </div>
                </section>
              ) : activeTab === "dsl" ? (
                <section className="casesPanelCard">
                  <div className="casesPanelHead">
                    <div className="casesPanelTitle">
                      {t(copy("DSL Editor", "DSL 编辑器", "DSL エディタ"))}
                      {dslData ? ` (v${dslData.dslVersion})` : ""}
                    </div>
                    <div className="casesPanelActions">
                      <button type="button" className="casesActionButton ghost" onClick={() => handleValidateDsl(openedCase.id)}>
                        {t(copy("Validate", "校验", "検証"))}
                      </button>
                      <button
                        type="button"
                        className="casesActionButton primary"
                        disabled={dslSaving}
                        onClick={() => handleSaveDsl(openedCase.id, openedCase.projectKey)}
                      >
                        {dslSaving ? t(copy("Saving…", "保存中…", "保存中…")) : t(copy("Save DSL", "保存 DSL", "DSL 保存"))}
                      </button>
                    </div>
                  </div>
                  {dslValidation ? (
                    <div className={`casesDslValidation ${dslValidation.status === "VALID" ? "isValid" : "isInvalid"}`}>
                      <strong>{dslValidation.status}</strong>
                      {dslValidation.errors.map((e, i) => (
                        <p key={i} className="errorText">{e}</p>
                      ))}
                      {dslValidation.warnings.map((w, i) => (
                        <p key={i} className="warningText">{w}</p>
                      ))}
                    </div>
                  ) : null}
                  <textarea
                    className="casesDslEditor"
                    rows={16}
                    value={dslDraft}
                    onChange={(e) => setDslDraft(e.target.value)}
                  />
                  {dslData ? (
                    <div className="casesDslMeta">
                      <span>{t(copy("Updated by", "更新者", "更新者"))}: {dslData.updatedBy}</span>
                      <span>{t(copy("Updated at", "更新于", "更新日時"))}: {dslData.updatedAt}</span>
                    </div>
                  ) : null}
                </section>
              ) : activeTab === "stateMachine" ? (
                <section className="casesPanelCard">
                  <div className="casesPanelHead">
                    <div className="casesPanelTitle">{t(copy("State Machine", "状态机", "状態機械"))}</div>
                    <button type="button" className="casesActionButton primary" onClick={() => handleSaveStateMachine(openedCase.id)}>
                      {t(copy("Save", "保存", "保存"))}
                    </button>
                  </div>
                  {smData ? (
                    <>
                      <div className="casesSmNodes">
                        <strong>{t(copy("Nodes", "节点", "ノード"))}</strong>
                        <div className="casesSmNodeList">
                          {smData.nodes.map((node) => (
                            <span key={node.id} className="casesSmNode">{node.label} ({node.id})</span>
                          ))}
                        </div>
                      </div>
                      <div className="casesSmEdges">
                        <strong>{t(copy("Edges", "边", "エッジ"))}</strong>
                        {smData.edges.map((edge, i) => (
                          <div key={i} className="casesSmEdge">
                            {edge.from} → {edge.to} <span className="casesPanelPill">{edge.action}</span>
                          </div>
                        ))}
                      </div>
                      {smData.guards.length > 0 ? (
                        <div className="casesSmGuards">
                          <strong>{t(copy("Guards", "守卫条件", "ガード"))}</strong>
                          {smData.guards.map((g) => (
                            <div key={g.id} className="casesSmGuard">{g.id}: {g.description}</div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="casesPanelText">{t(copy("No data", "无数据", "データなし"))}</p>
                  )}
                </section>
              ) : activeTab === "plans" ? (
                <section className="casesPanelCard">
                  <div className="casesPanelTitle">{t(copy("Plans", "计划", "計画"))}</div>
                  {plansData ? (
                    <>
                      {plansData.plans.map((plan) => (
                        <div key={plan.id} className="casesPlanRow">
                          <span className="casesPlanDot accent2">•</span>
                          <div>
                            <strong>{plan.name}</strong>
                            <p>{plan.summary}</p>
                            <small>{plan.type}</small>
                          </div>
                        </div>
                      ))}
                      {plansData.preconditions.length > 0 ? (
                        <div className="casesPlanPreconditions">
                          <strong>{t(copy("Preconditions", "前置条件", "前提条件"))}</strong>
                          <ul>
                            {plansData.preconditions.map((pc, i) => (
                              <li key={i}>{pc}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="casesPanelText">{t(copy("No data", "无数据", "データなし"))}</p>
                  )}
                </section>
              ) : activeTab === "history" ? (
                <section className="casesPanelCard">
                  <div className="casesPanelTitle">{t(copy("History", "历史", "履历"))}</div>
                  {historyData ? (
                    <>
                      <div className="casesHistoryRuns">
                        <strong>{t(copy("Runs", "运行记录", "実行履歴"))}</strong>
                        {historyData.runs.map((run, i) => (
                          <div key={i} className="casesHistoryRun">
                            <span className={`casesStatusBadge ${run.status === "SUCCESS" ? "isActive" : ""}`}>{run.status}</span>
                            <strong>{run.runName}</strong>
                            <span>{run.finishedAt}</span>
                            <span>{run.reportEntry}</span>
                          </div>
                        ))}
                      </div>
                      {historyData.maintenanceEvents.length > 0 ? (
                        <div className="casesHistoryMaintenance">
                          <strong>{t(copy("Maintenance events", "维护事件", "保守イベント"))}</strong>
                          {historyData.maintenanceEvents.map((evt, i) => (
                            <div key={i} className="casesHistoryEvent">
                              <span>{evt.type}</span>
                              <span>{evt.operator}</span>
                              <span>{evt.summary}</span>
                              <small>{evt.at}</small>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="casesPanelText">{t(copy("No data", "无数据", "データなし"))}</p>
                  )}
                </section>
              ) : null}
            </div>

            <aside className="casesDetailSide">
              <section className="casesPanelCard">
                <div className="casesPanelTitle">{t(copy("Info", "信息", "情報"))}</div>
                <div className="casesMetaRow">
                  <span>{t(copy("Source", "来源", "ソース"))}</span>
                  <strong>{`${openedCase.projectKey}.md`}</strong>
                </div>
                <div className="casesMetaRow">
                  <span>{t(copy("Tags", "标签", "タグ"))}</span>
                  <div className="casesInlineTags">
                    {(openedCase.tags || "")
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                  </div>
                </div>
                <div className="casesMetaRow">
                  <span>{t(copy("Owner", "负责人", "担当"))}</span>
                  <strong>Lin Chen</strong>
                </div>
                <div className="casesMetaRow">
                  <span>{t(copy("Last run", "最近运行", "前回実行"))}</span>
                  <strong className="successText">pass | 2m ago</strong>
                </div>
                <div className="casesMetaRow">
                  <span>{t(copy("Updated", "更新时间", "更新"))}</span>
                  <strong>{snapshot.cases.find((item) => item.id === openedCase.id)?.updatedAt ?? "--"}</strong>
                </div>
              </section>

              <section className="casesPanelCard">
                <div className="casesPanelTitle">{t(copy("Plans", "计划", "計画"))}</div>
                <div className="casesPlanRow">
                  <span className="casesPlanDot accent2">•</span>
                  <div>
                    <strong>{`plan.${openedCase.projectKey}.seed.v2`}</strong>
                    <p>{t(copy("Data plan seeds account and fixtures.", "数据计划会预置账号和夹具。", "データ計画でアカウントとフィクスチャを準備します。"))}</p>
                  </div>
                </div>
                <div className="casesPlanRow">
                  <span className="casesPlanDot accent3">•</span>
                  <div>
                    <strong>plan.restore.snapshot</strong>
                    <p>{t(copy("Restore from SQL snapshot after run.", "运行后按 SQL 快照恢复。", "実行後に SQL スナップショットから復元します。"))}</p>
                  </div>
                </div>
                <div className="casesPlanRow">
                  <span className="casesPlanDot accent">•</span>
                  <div>
                    <strong>plan.diff.expected</strong>
                    <p>{t(copy("Compare the expected delta before sign-off.", "签收前比对预期差异。", "サインオフ前に期待差分を比較します。"))}</p>
                  </div>
                </div>
              </section>

              <section className="casesPanelCard">
                <div className="casesPanelTitle">{t(copy("Recent runs", "最近运行", "最近の実行"))}</div>
                <div className="casesRunBars">
                  {passBlocks.map((block, index) => (
                    <span key={index} className={`casesRunBar ${block}`} />
                  ))}
                </div>
                <p className="casesRunsSummary">20 runs | 17 pass | 2 fail | 1 flaky</p>
              </section>

              <section className="casesPanelCard">
                <div className="casesPanelTitle">{caseTagsLabel}</div>
                <div className="pillRow">
                  {snapshot.caseTags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </section>

              <section className="casesPanelCard">
                <div className="casesPanelTitle">{t(copy("Catalog status", "目录状态", "カタログ状態"))}</div>
                <p className="casesPanelText">
                  {formatCopy(t(copy("Current project: {name}", "当前项目：{name}", "現在のプロジェクト: {name}")), {
                    name: selectedProject?.name ?? "--"
                  })}
                </p>
                <MutationStatus state={caseState} />
              </section>
            </aside>
          </div>
        ) : (
          <div className="casesLockedState">
            <div className="casesLockedCard">
              <strong>{t(copy("Detail area is waiting", "详情区域等待中", "詳細エリアは待機中"))}</strong>
              <p>{t(copy("Pick one case above and click Detail. The lower canvas will switch to the exact case-detail layout and enable Pre-execution.", "先在上方选择一条用例并点击详情，下方画布就会切到该用例的详情布局，并启用预执行。", "上でケースを選び Detail を押すと、下のキャンバスがそのケース詳細に切り替わり、事前実行が有効になります。"))}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
