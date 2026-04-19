import { useEffect, useMemo, useState } from "react";
import { formatCopy, sharedCopy, translate } from "../i18n";
import { AdminConsoleSnapshot, CaseItem, Locale, MutationState } from "../types";
import { MutationStatus } from "../ui-kit/MutationStatus";

type CasesScreenProps = {
  snapshot: AdminConsoleSnapshot;
  caseDraft: CaseItem[];
  caseState: MutationState;
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
  title,
  saveHint,
  caseTagsLabel,
  fieldProjectKeyLabel,
  locale,
  onPrepareCase
}: CasesScreenProps) {
  const t = (value: LocalizedCopy) => translate(locale, value);
  const [selectedProjectKey, setSelectedProjectKey] = useState(snapshot.projects[0]?.key ?? caseDraft[0]?.projectKey ?? "all");
  const [openedCaseId, setOpenedCaseId] = useState<string | null>(null);
  const [overviewCollapsed, setOverviewCollapsed] = useState(true);

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
            <button type="button" className="casesActionButton ghost" disabled={!openedCase}>
              {t(copy("Edit DSL", "编辑 DSL", "DSL 編集"))}
            </button>
            <button type="button" className="casesActionButton secondary" disabled={!openedCase}>
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
            <button key={tab.en} type="button" className={`casesTab ${index === 0 ? "isActive" : ""}`} disabled={!openedCase}>
              {t(tab)}
            </button>
          ))}
        </div>

        {openedCase ? (
          <div className="casesDetailGrid">
            <div className="casesDetailMain">
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
