import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";

type DocParseScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
  onOpenAiGenerate: (focus: {
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
  }) => void;
};

type LocalizedCopy = {
  en: string;
  zh: string;
  ja: string;
};

type CaseCandidate = {
  id: string;
  name: string;
  category: "happy" | "exception" | "boundary";
  confidence: "high" | "medium" | "low";
};

type ParsedDocument = {
  id: string;
  name: string;
  projectKey: string;
  projectName: string;
  status: "Parsed" | "Changed";
  updatedAt: string;
  model: string;
  detectedCases: number;
  subtitle: string;
  cases: CaseCandidate[];
  rawDocument: string;
  versions: Array<{
    id: string;
    label: string;
    time: string;
    summary: string;
  }>;
  reasoning: Array<{
    label: LocalizedCopy;
    body: LocalizedCopy;
  }>;
};

type TabKey = "parse" | "raw" | "hist";

const copy = (en: string, zh = en, ja = en): LocalizedCopy => ({ en, zh, ja });

function buildDocuments(snapshot: AdminConsoleSnapshot): ParsedDocument[] {
  return snapshot.projects.flatMap((project, projectIndex) => {
    const projectCases = snapshot.cases.filter((item) => item.projectKey === project.key);
    const baseCases = (projectCases.length ? projectCases : snapshot.cases.slice(0, 3)).map((item, index) => ({
      id: item.id,
      name: item.name,
      category: (index % 3 === 0 ? "happy" : index % 3 === 1 ? "exception" : "boundary") as CaseCandidate["category"],
      confidence: (index % 3 === 0 ? "high" : "medium") as CaseCandidate["confidence"]
    }));

    const primaryName = projectIndex === 0 ? "checkout-regression-v3.md" : `${project.key}-requirements-v${projectIndex + 2}.md`;
    const changeCases = baseCases.slice(0, Math.max(1, Math.min(3, baseCases.length))).map((item, index) => ({
      ...item,
      id: `${item.id}-change-${index + 1}`,
      name: `${item.name} / change review`,
      confidence: (index === 0 ? "high" : "medium") as CaseCandidate["confidence"]
    }));

    const primary: ParsedDocument = {
      id: `${project.key}-primary`,
      name: primaryName,
      projectKey: project.key,
      projectName: project.name,
      status: "Parsed",
      updatedAt: baseCases[0] ? snapshot.cases.find((item) => item.id === baseCases[0].id)?.updatedAt ?? snapshot.generatedAt : snapshot.generatedAt,
      model: "claude-4.5",
      detectedCases: Math.max(baseCases.length, 3),
      subtitle: `Parsed recently / claude-4.5 / ${Math.max(baseCases.length, 3)} cases detected`,
      cases: baseCases,
      rawDocument: `# ${project.name} requirement packet

## Scope
- ${project.scope}
- environments: ${project.environments}

## Scenario
${baseCases.map((item) => `- ${item.name}`).join("\n")}`,
      versions: [
        { id: `${project.key}-v3`, label: "v3", time: snapshot.generatedAt, summary: "Added payment assertions and restore notes." },
        { id: `${project.key}-v2`, label: "v2", time: "2026-04-16 10:15", summary: "Aligned steps with latest UI text." }
      ],
      reasoning: [
        {
          label: copy("Structure", "Structure", "Structure"),
          body: copy(
            `Grouped the source text into ${Math.max(baseCases.length, 3)} executable scenarios.`,
            `已整理为 ${Math.max(baseCases.length, 3)} 个可执行场景。`,
            `${Math.max(baseCases.length, 3)} 件の実行シナリオへ整理済み。`
          )
        },
        {
          label: copy("Coverage", "Coverage", "Coverage"),
          body: copy(
            "UI flow, assertions, and data-plan placeholders were extracted together.",
            "已抽取 UI 流程、断言与数据计划占位。",
            "UI フロー、アサーション、データ計画を抽出済み。"
          )
        }
      ]
    };

    const change: ParsedDocument = {
      id: `${project.key}-change`,
      name: `${project.key}-change-note-${projectIndex + 1}.md`,
      projectKey: project.key,
      projectName: project.name,
      status: "Changed",
      updatedAt: "2026-04-18 20:40",
      model: projectIndex % 2 === 0 ? "gpt-5.4" : "claude-4.5",
      detectedCases: changeCases.length,
      subtitle: `Change note / ${changeCases.length} cases impacted / model ${projectIndex % 2 === 0 ? "gpt-5.4" : "claude-4.5"}`,
      cases: changeCases,
      rawDocument: `# ${project.name} change note

## Summary
- UI copy updated
- extra validation on submit button
- response message changed`,
      versions: [
        { id: `${project.key}-c2`, label: "v2", time: "2026-04-18 20:40", summary: "Added impact summary and latest screenshots." },
        { id: `${project.key}-c1`, label: "v1", time: "2026-04-18 19:20", summary: "Initial change packet import." }
      ],
      reasoning: [
        {
          label: copy("Structure", "Structure", "Structure"),
          body: copy(
            "Change notes were ranked before generation so impacted scenarios stay focused.",
            "变更说明已按影响优先级排序。",
            "変更ノートを影響順に整理しました。"
          )
        },
        {
          label: copy("Risk", "Risk", "Risk"),
          body: copy(
            "Submit validation changed and can affect both happy-path and negative checks.",
            "提交校验发生变化，可能同时影响正向与异常断言。",
            "送信バリデーション変更が正常系と異常系の両方へ影響します。"
          )
        }
      ]
    };

    return [primary, change];
  });
}

export function DocParseScreen({ snapshot, title, locale, onOpenAiGenerate }: DocParseScreenProps) {
  const t = (value: LocalizedCopy) => translate(locale, value);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<ParsedDocument[]>(() => buildDocuments(snapshot));
  const [selectedProjectKey, setSelectedProjectKey] = useState(snapshot.projects[0]?.key ?? "");
  const [openedDocumentId, setOpenedDocumentId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("parse");
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  useEffect(() => {
    setDocuments(buildDocuments(snapshot));
  }, [snapshot]);

  const visibleDocuments = useMemo(
    () => documents.filter((item) => item.projectKey === selectedProjectKey),
    [documents, selectedProjectKey]
  );

  const openedDocument = visibleDocuments.find((item) => item.id === openedDocumentId) ?? null;
  const selectedCase = openedDocument?.cases.find((item) => item.id === selectedCaseId) ?? openedDocument?.cases[0] ?? null;
  const selectedProject = snapshot.projects.find((item) => item.key === selectedProjectKey) ?? snapshot.projects[0] ?? null;

  useEffect(() => {
    if (!snapshot.projects.some((item) => item.key === selectedProjectKey)) {
      setSelectedProjectKey(snapshot.projects[0]?.key ?? "");
    }
  }, [selectedProjectKey, snapshot.projects]);

  useEffect(() => {
    if (!openedDocument) {
      setSelectedCaseId(null);
      return;
    }
    if (!selectedCaseId || !openedDocument.cases.some((item) => item.id === selectedCaseId)) {
      setSelectedCaseId(openedDocument.cases[0]?.id ?? null);
    }
  }, [openedDocument, selectedCaseId]);

  function handleOpenDocument(document: ParsedDocument) {
    setOpenedDocumentId(document.id);
    setSelectedCaseId(document.cases[0]?.id ?? null);
    setActiveTab("parse");
    setOverviewCollapsed(true);
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).map((item) => item.name);
    if (!files.length) {
      return;
    }
    setUploadedFiles((current) => [...files, ...current].slice(0, 6));
    event.target.value = "";
  }

  function openAiGenerate(caseId: string) {
    if (!openedDocument) {
      return;
    }
    const focusCase = openedDocument.cases.find((item) => item.id === caseId) ?? openedDocument.cases[0];
    if (!focusCase) {
      return;
    }
    onOpenAiGenerate({
      projectKey: openedDocument.projectKey,
      projectName: openedDocument.projectName,
      documentId: openedDocument.id,
      documentName: openedDocument.name,
      caseId: focusCase.id,
      caseName: focusCase.name,
      generatedCases: openedDocument.cases.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        confidence: item.confidence
      })),
      reasoning: openedDocument.reasoning.map((item) => ({
        label: t(item.label),
        body: t(item.body)
      }))
    });
  }

  return (
    <div className="docParseScreen">
      <section className="docParseOverviewCard">
        <div className="docParseOverviewHead">
          <div>
            <p className="eyebrow">{t(copy("Projects / documents", "项目 / 文档", "プロジェクト / 文書"))}</p>
            <h2>{title}</h2>
            <p className="docParseOverviewLead">
              {t(
                copy(
                  "Doc Parse is isolated from Cases. Open a document here to review parse output before generation.",
                  "Doc Parse 与 Cases 已隔离。请在这里打开文档查看解析结果。",
                  "Doc Parse は Cases と分離されています。ここで文書を開いて解析結果を確認します。"
                )
              )}
            </p>
          </div>
          <div className="docParseOverviewActions">
            <button
              type="button"
              className="casesCollapseButton"
              aria-expanded={!overviewCollapsed}
              onClick={() => setOverviewCollapsed((current) => !current)}
            >
              <span className={`casesCollapseIcon ${overviewCollapsed ? "isCollapsed" : ""}`}>^</span>
            </button>
          </div>
        </div>

        <div className={`docParseOverviewBody ${overviewCollapsed ? "isCollapsed" : ""}`}>
          <div className="docParseProjectRail">
            <span className="casesRailLabel">{t(copy("Project switch", "项目切换", "プロジェクト切替"))}</span>
            <div className="casesProjectSwitches">
              {snapshot.projects.map((project, index) => {
                const projectDocuments = documents.filter((item) => item.projectKey === project.key);
                return (
                  <button
                    key={project.key}
                    type="button"
                    className={`casesProjectCard accent${index === 0 ? "" : index + 1} ${selectedProjectKey === project.key ? "isSelected" : ""}`.trim()}
                    onClick={() => {
                      setSelectedProjectKey(project.key);
                      setOpenedDocumentId(null);
                      setSelectedCaseId(null);
                    }}
                  >
                    <div className="casesProjectCardTop">
                      <div>
                        <strong>{project.name}</strong>
                        <small>{project.scope}</small>
                      </div>
                      <span>{projectDocuments.length}</span>
                    </div>
                    <div className="casesProjectCardMeta">
                      <span>{t(copy("Docs", "文档", "文書"))}</span>
                      <span>{t(copy("Cases", "用例", "ケース"))}: {projectDocuments.reduce((sum, item) => sum + item.detectedCases, 0)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="docParseDocumentPanel">
            <div className="casesListPanelHead">
              <div>
                <p className="eyebrow">{t(copy("Document catalog", "文档一览", "文書一覧"))}</p>
                <h3>{selectedProject?.name ?? t(copy("No project", "未选择项目", "未選択"))}</h3>
              </div>
            </div>

            <div className="docParseDocumentTable">
              {visibleDocuments.map((document) => {
                const isOpened = document.id === openedDocumentId;
                return (
                  <article key={document.id} className={`docParseDocumentRow ${isOpened ? "isOpened" : ""}`}>
                    <div className="docParseDocumentIdentity">
                      <strong>{document.name}</strong>
                      <p>{document.subtitle}</p>
                    </div>
                    <div className="docParseDocumentMeta">
                      <span className={`docParseDocumentBadge ${document.status === "Changed" ? "warning" : "info"}`}>{document.status}</span>
                      <span>{document.updatedAt}</span>
                    </div>
                    <div className="docParseDocumentStats">
                      <span>{document.detectedCases} {t(copy("cases", "个用例", "件"))}</span>
                      <span>{document.versions.length} {t(copy("versions", "版本", "版"))}</span>
                    </div>
                    <button type="button" className="casesInlineAction" onClick={() => handleOpenDocument(document)}>
                      {isOpened ? t(copy("Opened", "已打开", "表示中")) : t(copy("Detail", "详细", "詳細"))}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="docParseCanvas">
        <div className="docParsePath">
          {openedDocument
            ? `${t(copy("Projects", "项目", "プロジェクト"))} / ${openedDocument.projectName} / ${t(copy("Documents", "文档", "文書"))}`
            : t(copy("Projects / Pick one document above", "项目 / 请先在上方选择文档", "プロジェクト / 上で文書を選択"))}
        </div>

        <div className="docParseHero">
          <div>
            <div className="docParseHeroTitleRow">
              <h3>{openedDocument?.name ?? t(copy("Document detail locked", "文档详情未激活", "文書詳細は未選択"))}</h3>
              <span className="casesHappyBadge">{openedDocument?.status ?? t(copy("Locked", "未激活", "未選択"))}</span>
            </div>
            <p className="docParseHeroSubtitle">
              {openedDocument?.subtitle ??
                t(copy("Open one document above to load the parse canvas.", "请先在上方打开一个文档。", "上で文書を開いてください。"))}
            </p>
          </div>

          <div className="docParseHeroActions">
            <button type="button" className="casesActionButton ghost" disabled={!openedDocument}>
              {t(copy("Re-parse", "重新解析", "再解析"))}
            </button>
            <button type="button" className="casesActionButton secondary" disabled={!openedDocument}>
              {t(copy("Manual edit", "手动修正", "手動修正"))}
            </button>
            <button
              type="button"
              className="casesActionButton primary"
              disabled={!openedDocument}
              onClick={() => openAiGenerate(selectedCase?.id ?? "")}
            >
              {t(copy("Generate tests", "生成测试", "テスト生成"))}
            </button>
          </div>
        </div>

        <div className="docParseTabs">
          <div className="docParseTabRail">
            {([
              ["parse", copy("Parse result", "解析结果", "解析結果")],
              ["raw", copy("Raw document", "原始文档", "原文書")],
              ["hist", copy("Version history", "版本历史", "履歴")]
            ] as Array<[TabKey, LocalizedCopy]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`docParseTab ${activeTab === key ? "isActive" : ""}`}
                disabled={!openedDocument}
                onClick={() => setActiveTab(key)}
              >
                {t(label)}
              </button>
            ))}
          </div>

          <div className="docParseTabActions">
            <button type="button" className="docParseUploadButton" onClick={() => fileInputRef.current?.click()}>
              {t(copy("Upload file", "上传文件", "ファイルアップロード"))}
            </button>
            <input ref={fileInputRef} type="file" hidden multiple onChange={handleUpload} />
          </div>
        </div>

        {openedDocument ? (
          <>
            {activeTab === "parse" ? (
              <div className="docParseGrid">
                <section className="docParsePanel">
                  <div className="docParsePanelHead">
                    <div className="docParsePanelTitle">{t(copy("Cases detected", "检出用例", "検出ケース"))}</div>
                    <span className="docParseDocumentBadge info">{openedDocument.detectedCases}</span>
                  </div>
                  <div className="docParseCaseList">
                    {openedDocument.cases.map((item) => (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        className={`docParseCaseRow ${item.id === selectedCase?.id ? "isSelected" : ""}`}
                        onClick={() => setSelectedCaseId(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedCaseId(item.id);
                          }
                        }}
                      >
                        <button
                          type="button"
                          className="docParseCaseNameButton"
                          onClick={(event) => {
                            event.stopPropagation();
                            openAiGenerate(item.id);
                          }}
                        >
                          <span className="docParseCaseName">{item.name}</span>
                        </button>
                        <span className={`docParseToneBadge ${item.category}`}>{item.category}</span>
                        <div className={`docParseConfidence ${item.confidence}`}>{item.confidence}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="docParsePanel">
                  <div className="docParsePanelHead column">
                    <div className="docParsePanelTitle">{selectedCase?.name ?? openedDocument.name}</div>
                    <p className="docParsePanelSubtitle">2 pages / 5 assertions / 1 data plan / restore: sql</p>
                  </div>
                  <div className="docParseResultBody">
                    <div className="docParseInsightStrip">
                      <article className="docParseInsightCard accent">
                        <span>{t(copy("Pages", "页面", "ページ"))}</span>
                        <strong>3</strong>
                        <small>/cart /checkout /order/confirm</small>
                      </article>
                      <article className="docParseInsightCard success">
                        <span>{t(copy("Assertions", "断言", "アサーション"))}</span>
                        <strong>5</strong>
                        <small>UI + email + DB</small>
                      </article>
                      <article className="docParseInsightCard warning">
                        <span>{t(copy("Pending fill", "待补充", "補完待ち"))}</span>
                        <strong>2</strong>
                        <small>{t(copy("Data seed and stock delta", "种子数据与库存变化", "データ投入と在庫差分"))}</small>
                      </article>
                    </div>

                    <div className="docParseBlock">
                      <span className="docParseBlockLabel accent2">{t(copy("Test goal", "测试目标", "テスト目的"))}</span>
                      <p>{`${selectedCase?.name ?? openedDocument.name} is translated into one end-to-end flow with UI, email and DB checkpoints.`}</p>
                    </div>

                    <div className="docParseBlock">
                      <span className="docParseBlockLabel accent">{t(copy("Pages involved", "涉及页面", "対象ページ"))}</span>
                      <div className="docParsePillRow">
                        <span className="pill">/cart</span>
                        <span className="pill">/checkout</span>
                        <span className="pill">/order/confirm</span>
                      </div>
                    </div>

                    <div className="docParseBlock">
                      <span className="docParseBlockLabel success">{t(copy("Explicit (from doc)", "明确项", "明示項目"))}</span>
                      <ul className="docParseChecklist success">
                        <li>Coupon code "SAVE10"</li>
                        <li>Card 4242 4242 4242 4242</li>
                        <li>Expected total: $89.10</li>
                      </ul>
                    </div>

                    <div className="docParseBlock">
                      <span className="docParseBlockLabel warning">{t(copy("Inferred by AI", "AI 推断项", "AI 推定項目"))}</span>
                      <ul className="docParseChecklist warning">
                        <li>{t(copy("Shipping address pre-filled from profile", "收货地址来自默认资料", "配送先はプロフィール既定値"))}</li>
                        <li>{t(copy("Email template: order_confirmation_v2", "邮件模板: order_confirmation_v2", "メールテンプレート: order_confirmation_v2"))}</li>
                      </ul>
                    </div>

                    <div className="docParseBlock">
                      <span className="docParseBlockLabel danger">{t(copy("Missing / please fill", "缺失项 / 请补充", "不足項目 / 補完"))}</span>
                      <ul className="docParseChecklist danger">
                        <li>{t(copy("What DB rows need seed data?", "哪些 DB 行需要种子数据?", "どの DB 行に seed が必要か?"))}</li>
                        <li>{t(copy("Expected stock decrement delta?", "预期库存扣减值?", "期待在庫減少量は?"))}</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <aside className="docParsePanel docParseReasoningPanel">
                  <div className="docParsePanelHead">
                    <div className="docParsePanelTitle">{t(copy("AI reasoning", "AI 推理", "AI reasoning"))}</div>
                    <span className="pill">{openedDocument.model}</span>
                  </div>
                  <div className="docParseReasoningBody">
                    {openedDocument.reasoning.map((item) => (
                      <div key={item.label.en} className="docParseReasoningBlock">
                        <strong>{t(item.label)}</strong>
                        <p>{t(item.body)}</p>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            ) : null}

            {activeTab === "raw" ? (
              <div className="docParseSinglePanel">
                <section className="docParsePanel">
                  <div className="docParsePanelHead">
                    <div className="docParsePanelTitle">{t(copy("Raw source", "原始文档", "原文書"))}</div>
                    <span className="docParseDocumentBadge neutral">{openedDocument.name}</span>
                  </div>
                  <div className="docParseRawBody">
                    <pre>{openedDocument.rawDocument}</pre>
                    <aside className="docParseUploadList">
                      <strong>{t(copy("Uploaded in tab bar", "本页已上传", "このタブでアップロード"))}</strong>
                      {uploadedFiles.length ? uploadedFiles.map((item) => <span key={item}>{item}</span>) : <span>{t(copy("No uploaded files yet", "暂无上传文件", "アップロードなし"))}</span>}
                    </aside>
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "hist" ? (
              <div className="docParseSinglePanel">
                <section className="docParsePanel">
                  <div className="docParsePanelHead">
                    <div className="docParsePanelTitle">{t(copy("Version history", "版本历史", "履歴"))}</div>
                    <span className="docParseDocumentBadge warning">{openedDocument.versions.length}</span>
                  </div>
                  <div className="docParseHistoryList">
                    {openedDocument.versions.map((version) => (
                      <article key={version.id} className="docParseHistoryRow">
                        <div className="docParseHistoryTag">{version.label}</div>
                        <div className="docParseHistoryBody">
                          <strong>{version.time}</strong>
                          <p>{version.summary}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </>
        ) : (
          <div className="casesLockedState">
            <div className="casesLockedCard">
              <strong>{t(copy("Document detail area is waiting", "文档详情区域等待中", "文書詳細エリア待機中"))}</strong>
              <p>{t(copy("Pick one document above and click Detail.", "请先在上方选择文档并点击详细。", "上で文書を選択して詳細を押してください。"))}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
