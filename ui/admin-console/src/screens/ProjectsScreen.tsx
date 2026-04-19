import { Fragment, FormEvent, useMemo, useState } from "react";
import { sharedCopy, translate } from "../i18n";
import { AdminConsoleSnapshot, Locale, MutationState, ProjectItem } from "../types";
import { MutationStatus } from "../ui-kit/MutationStatus";

type ProjectsScreenProps = {
  snapshot: AdminConsoleSnapshot;
  projectDraft: ProjectItem[];
  projectState: MutationState;
  title: string;
  saveHint: string;
  fieldKeyLabel: string;
  fieldNameLabel: string;
  fieldScopeLabel: string;
  fieldEnvironmentsLabel: string;
  fieldNoteLabel: string;
  newCatalogRowLabel: string;
  addProjectRowLabel: string;
  saveProjectCatalogLabel: string;
  locale: Locale;
  onProjectChange: (index: number, key: keyof ProjectItem, value: string) => void;
  onAddProjectRow: () => void;
  onRemoveProjectRow: (index: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const accentClasses = ["accent", "accent2", "accent3", "accent4", "accent", "accent2"] as const;

const copy = (en: string, zh = en, ja = en) => ({ en, zh, ja });

type ProjectCardModel = {
  key: string;
  name: string;
  description: string;
  docs: number;
  cases: number;
  passRate: number;
  updatedAgo: string;
  accentClass: (typeof accentClasses)[number];
  environments: number;
  note: string;
  latestCaseName: string;
  latestCaseUpdatedAt: string;
  latestReportName: string;
  latestReportStatus: string;
  latestReportFinishedAt: string;
  queueState: string;
  queueDetail: string;
  configSummary: string;
  tags: string[];
};

function buildProjectCards(snapshot: AdminConsoleSnapshot, locale: Locale): ProjectCardModel[] {
  const caseCountByProject = new Map<string, number>();
  snapshot.cases.forEach((item) => {
    caseCountByProject.set(item.projectKey, (caseCountByProject.get(item.projectKey) ?? 0) + 1);
  });

  return snapshot.projects.map((project, index) => {
    const linkedCases = snapshot.cases.filter((item) => item.projectKey === project.key);
    const linkedCaseCount = caseCountByProject.get(project.key) ?? 0;
    const docs = Math.max(6, project.environments * 3 + linkedCaseCount);
    const passBase = 86 + ((project.suites + project.environments + linkedCaseCount) % 13);
    const needsAttention = /need|failed|variance|repair/i.test(project.note);
    const passRate = Math.min(100, needsAttention ? passBase - 3 : passBase);
    const updatedAgo = locale === "zh" ? `${index + 2} 小时前` : locale === "ja" ? `${index + 2}時間前` : `${index + 2}h ago`;
    const latestCase = [...linkedCases].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    const latestReport =
      snapshot.reports.find((item) => item.runName.toLowerCase().includes(project.key.toLowerCase())) ?? snapshot.reports[index] ?? snapshot.reports[0];
    const queueItem =
      snapshot.workQueue.find((item) => item.title.toLowerCase().includes(project.key.toLowerCase())) ?? snapshot.workQueue[index] ?? snapshot.workQueue[0];
    const tags = Array.from(new Set(linkedCases.flatMap((item) => item.tags))).slice(0, 4);
    const configSummary = snapshot.environmentConfig
      .slice(0, 2)
      .map((item) => item.value)
      .filter(Boolean)
      .join(" / ");

    return {
      key: project.key,
      name: project.name,
      description: project.scope,
      docs,
      cases: project.suites,
      passRate,
      updatedAgo,
      accentClass: accentClasses[index % accentClasses.length],
      environments: project.environments,
      note: project.note,
      latestCaseName:
        latestCase?.name ?? translate(locale, copy("No linked cases yet", "暂无关联用例", "関連ケースはまだありません")),
      latestCaseUpdatedAt:
        latestCase?.updatedAt ?? translate(locale, copy("Waiting for first sync", "等待首次同步", "最初の同期待ち")),
      latestReportName:
        latestReport?.runName ?? translate(locale, copy("No recent report", "暂无最近报告", "最近のレポートはありません")),
      latestReportStatus: latestReport?.status ?? translate(locale, copy("Pending", "待补充", "保留中")),
      latestReportFinishedAt:
        latestReport?.finishedAt ?? translate(locale, copy("No finish time", "暂无完成时间", "完了時刻なし")),
      queueState: queueItem?.state ?? translate(locale, copy("Idle", "空闲", "待機中")),
      queueDetail:
        queueItem?.detail ?? translate(locale, copy("No queued execution context", "暂无排队执行上下文", "実行キューの文脈はありません")),
      configSummary: configSummary || translate(locale, copy("No config summary", "暂无配置摘要", "設定サマリーなし")),
      tags
    };
  });
}

export function ProjectsScreen({
  snapshot,
  projectDraft,
  projectState,
  title,
  saveHint,
  fieldKeyLabel,
  fieldNameLabel,
  fieldScopeLabel,
  fieldEnvironmentsLabel,
  fieldNoteLabel,
  newCatalogRowLabel,
  addProjectRowLabel,
  saveProjectCatalogLabel,
  locale,
  onProjectChange,
  onAddProjectRow,
  onRemoveProjectRow,
  onSubmit
}: ProjectsScreenProps) {
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);
  const [query, setQuery] = useState("");
  const [selectedProjectKey, setSelectedProjectKey] = useState(snapshot.projects[0]?.key ?? snapshot.cases[0]?.projectKey ?? "");
  const [openedProjectKey, setOpenedProjectKey] = useState("");

  const projectCards = useMemo(() => buildProjectCards(snapshot, locale), [locale, snapshot]);
  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return projectCards;
    }
    return projectCards.filter((project) =>
      [project.key, project.name, project.description].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [projectCards, query]);

  const totalCases = visibleProjects.reduce((sum, project) => sum + project.cases, 0);
  const averagePassRate = visibleProjects.length
    ? (visibleProjects.reduce((sum, project) => sum + project.passRate, 0) / visibleProjects.length).toFixed(1)
    : "0.0";
  const openedProject = visibleProjects.find((project) => project.key === openedProjectKey) ?? null;

  return (
    <div className="projectsScreen">
      <div className="projectsScreenHead">
        <div className="projectsScreenHeadCopy">
          <h2>{title}</h2>
          <p>
            {t(
              copy(
                `${visibleProjects.length} projects / ${totalCases} cases / weekly pass rate ${averagePassRate}%`,
                `${visibleProjects.length} 个项目 / ${totalCases} 条用例 / 本周通过率 ${averagePassRate}%`,
                `${visibleProjects.length} 件のプロジェクト / ${totalCases} 件のケース / 週次合格率 ${averagePassRate}%`
              )
            )}
          </p>
        </div>
        <div className="projectsScreenActions">
          <label className="projectsSearch">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              aria-label={t(copy("Project search", "项目搜索", "プロジェクト検索"))}
              value={query}
              placeholder={t(copy("Search projects", "搜索项目", "プロジェクトを検索"))}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button type="button" className="projectsActionButton ghost">
            {t(copy("Import", "导入", "インポート"))}
          </button>
          <button type="button" className="projectsActionButton primary">
            + {t(copy("New project", "新建项目", "新規プロジェクト"))}
          </button>
        </div>
      </div>

      <div className="projectsCardGrid">
        {(() => {
          const COLS = 3;
          const rows: ProjectCardModel[][] = [];
          for (let i = 0; i < visibleProjects.length; i += COLS) {
            rows.push(visibleProjects.slice(i, i + COLS));
          }

          return rows.map((row, rowIndex) => (
            <Fragment key={rowIndex}>
              {row.map((project) => {
                const isOpened = openedProjectKey === project.key;
                return (
                  <article key={project.key} className="projectsCardStack">
                    <div
                      className={`projectsDemoCard ${project.accentClass} ${isOpened ? "isOpened" : ""} ${selectedProjectKey === project.key ? "isSelected" : ""}`}
                      onClick={() => setSelectedProjectKey(project.key)}
                    >
                      <div className="projectsDemoCardStripe" />
                      <div className="projectsDemoIdentity">
                        <div className="projectsDemoAvatar" aria-hidden="true">
                          {project.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="projectsDemoIdentityCopy">
                          <h3>{project.name}</h3>
                          <p>{project.description}</p>
                        </div>
                      </div>

                      <div className="projectsDemoMiniGrid">
                        <div className="projectsDemoMiniCard">
                          <span>{t(copy("Docs", "文档", "ドキュメント"))}</span>
                          <strong>{project.docs}</strong>
                        </div>
                        <div className="projectsDemoMiniCard">
                          <span>{t(copy("Cases", "用例", "ケース"))}</span>
                          <strong>{project.cases}</strong>
                        </div>
                        <div className="projectsDemoMiniCard">
                          <span>{t(copy("Pass", "通过率", "合格率"))}</span>
                          <strong className={project.passRate > 90 ? "isPassGood" : "isPassWarn"}>{project.passRate}%</strong>
                        </div>
                        <div className="projectsDemoMiniCard">
                          <span>{t(copy("Envs", "环境数", "環境数"))}</span>
                          <strong>{project.environments}</strong>
                        </div>
                        <div className="projectsDemoMiniCard">
                          <span>{t(copy("Queue", "队列", "キュー"))}</span>
                          <strong className="projectsDemoMiniTrunc" title={project.queueState}>{project.queueState}</strong>
                        </div>
                        <div className="projectsDemoMiniCard">
                          <span>{t(copy("Last run", "最近运行", "最近の実行"))}</span>
                          <strong className={`projectsDemoMiniTrunc ${/fail/i.test(project.latestReportStatus) ? "isPassWarn" : "isPassGood"}`} title={project.latestReportStatus}>
                            {project.latestReportStatus}
                          </strong>
                        </div>
                      </div>

                      <div className="projectsDemoActions">
                        <button
                          type="button"
                          className="projectsDemoButton secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedProjectKey(project.key);
                            setOpenedProjectKey((current) => (current === project.key ? "" : project.key));
                          }}
                        >
                          {isOpened ? t(copy("Close", "收起", "Close")) : t(copy("Open", "打开", "Open"))}
                        </button>
                        <button
                          type="button"
                          className="projectsDemoButton ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedProjectKey(project.key);
                            setOpenedProjectKey(project.key);
                          }}
                        >
                          {t(copy("Reports", "报告", "Reports"))}
                        </button>
                        <span className="projectsDemoTimestamp">{project.updatedAgo}</span>
                      </div>
                    </div>
                  </article>
                );
              })}

              {row.some((p) => p.key === openedProjectKey) && openedProject ? (
                <section
                  className={`projectFullDetail ${openedProject.accentClass}`}
                  aria-label={`${openedProject.name} detail`}
                >
                  <div className="projectFullDetailHero">
                    <div className="projectFullDetailHeroCopy">
                      <span className="projectInlineEyebrow">{t(copy("Project detail", "项目详情", "プロジェクト詳細"))}</span>
                      <h3 className="projectFullDetailTitle">{openedProject.name}</h3>
                      <p className="projectFullDetailNote">{openedProject.note}</p>
                    </div>
                    <div className="projectInlineHeroActions">
                      <button type="button" className="projectsDemoButton secondary">
                        {t(copy("Enter project", "进入项目", "プロジェクトへ"))}
                      </button>
                      <button type="button" className="projectsDemoButton ghost">
                        {t(copy("View reports", "查看报告", "レポートを見る"))}
                      </button>
                    </div>
                  </div>

                  <div className="projectFullDetailSummary">
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Project info", "项目基本信息", "プロジェクト情報"))}</span>
                      <strong>{openedProject.description}</strong>
                      <small>
                        {t(copy("Key", "项目 Key", "キー"))}: {openedProject.key} · {t(copy("Environments", "环境数", "環境数"))}:{" "}
                        {openedProject.environments}
                      </small>
                    </div>
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Docs entry", "文档入口", "ドキュメント"))}</span>
                      <strong>{openedProject.docs}</strong>
                      <small>{t(copy("Uploaded docs and parse workbench", "已上传文档与解析入口", "アップロード済みドキュメント"))}</small>
                    </div>
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Cases entry", "用例入口", "ケース"))}</span>
                      <strong className="projectFullDetailTrunc" title={openedProject.latestCaseName}>{openedProject.latestCaseName}</strong>
                      <small>{openedProject.latestCaseUpdatedAt}</small>
                    </div>
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Execution entry", "执行入口", "実行"))}</span>
                      <strong className="projectFullDetailTrunc" title={openedProject.queueState}>{openedProject.queueState}</strong>
                      <small className="projectFullDetailTrunc" title={openedProject.queueDetail}>{openedProject.queueDetail}</small>
                    </div>
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Reports entry", "报告入口", "レポート"))}</span>
                      <strong className="projectFullDetailTrunc" title={openedProject.latestReportName}>{openedProject.latestReportName}</strong>
                      <small>{openedProject.latestReportStatus} · {openedProject.latestReportFinishedAt}</small>
                    </div>
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Pass rate", "通过率", "合格率"))}</span>
                      <strong className={openedProject.passRate > 90 ? "isPassGood" : "isPassWarn"}>{openedProject.passRate}%</strong>
                      <small>
                        {openedProject.tags.length
                          ? openedProject.tags.join(" · ")
                          : t(copy("No tags", "暂无标签", "タグなし"))}
                      </small>
                    </div>
                  </div>
                </section>
              ) : null}
            </Fragment>
          ));
        })()}
      </div>

      {!visibleProjects.length ? (
        <p className="emptyState projectsGridEmpty">{translate(locale, sharedCopy.noProjectsMatch)}</p>
      ) : null}

      <section className="projectsSupportRegion" aria-label="Project catalog support region">
        <form className="editorForm projectsEditorForm" onSubmit={onSubmit}>
          {projectDraft.map((project, index) => (
            <div key={`${project.key || "new-project"}-${index}`} className="editorRow projectsEditorRow">
              <div className="editorMeta editorMetaSplit">
                <div>
                  <strong>{project.name || project.key || `${t(copy("Project", "项目", "Project"))} ${index + 1}`}</strong>
                  <small>
                    {snapshot.projects[index]
                      ? `${snapshot.projects[index].suites} ${t(copy("cases", "用例", "cases"))} / ${snapshot.projects[index].environments} ${t(copy("envs", "环境", "envs"))}`
                      : newCatalogRowLabel}
                  </small>
                </div>
                <button
                  type="button"
                  className="dangerButton"
                  onClick={() => onRemoveProjectRow(index)}
                  disabled={projectDraft.length === 1}
                >
                  {translate(locale, sharedCopy.removeRow)}
                </button>
              </div>
              <label>
                {fieldKeyLabel}
                <input value={project.key} onChange={(event) => onProjectChange(index, "key", event.target.value)} />
              </label>
              <label>
                {fieldNameLabel}
                <input value={project.name} onChange={(event) => onProjectChange(index, "name", event.target.value)} />
              </label>
              <label>
                {fieldScopeLabel}
                <input value={project.scope} onChange={(event) => onProjectChange(index, "scope", event.target.value)} />
              </label>
              <label>
                {fieldEnvironmentsLabel}
                <input value={project.environments} onChange={(event) => onProjectChange(index, "environments", event.target.value)} />
              </label>
              <label className="fullWidth">
                {fieldNoteLabel}
                <textarea rows={2} value={project.note} onChange={(event) => onProjectChange(index, "note", event.target.value)} />
              </label>
            </div>
          ))}
          <div className="editorActions">
            <button type="button" className="dashboardButton secondary" onClick={onAddProjectRow}>
              {addProjectRowLabel}
            </button>
            <button type="submit" className="dashboardButton primary" disabled={projectState.kind === "pending"}>
              {projectState.kind === "pending" ? translate(locale, sharedCopy.saving) : saveProjectCatalogLabel}
            </button>
          </div>
        </form>
        <div className="projectsSupportMeta">
          <span>{saveHint}</span>
          <span>{openedProject?.key ?? selectedProjectKey}</span>
        </div>
        <MutationStatus state={projectState} />
      </section>
    </div>
  );
}
