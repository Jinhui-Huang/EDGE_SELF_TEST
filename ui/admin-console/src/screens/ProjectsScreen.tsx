import { FormEvent, useMemo, useState } from "react";
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
  const [openedProjectKey, setOpenedProjectKey] = useState(snapshot.projects[0]?.key ?? "");

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
        {visibleProjects.map((project) => {
          const isOpened = openedProjectKey === project.key;

          return (
            <article key={project.key} className={`projectsCardStack ${isOpened ? "isOpened" : ""}`}>
              <div
                className={`projectsDemoCard ${project.accentClass} ${selectedProjectKey === project.key ? "isSelected" : ""}`}
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
                    <span>{t(copy("Docs", "文档", "Docs"))}</span>
                    <strong>{project.docs}</strong>
                  </div>
                  <div className="projectsDemoMiniCard">
                    <span>{t(copy("Cases", "用例", "Cases"))}</span>
                    <strong>{project.cases}</strong>
                  </div>
                  <div className="projectsDemoMiniCard">
                    <span>{t(copy("Pass", "通过", "Pass"))}</span>
                    <strong className={project.passRate > 90 ? "isPassGood" : "isPassWarn"}>{project.passRate}%</strong>
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

              {isOpened ? (
                <section className={`projectInlineDetail ${project.accentClass}`} aria-label={`${project.name} detail`}>
                  <div className="projectInlineDetailHero">
                    <div>
                      <span className="projectInlineEyebrow">{t(copy("Project detail", "项目详情", "Project detail"))}</span>
                      <h3>{project.name}</h3>
                      <p>{project.note}</p>
                    </div>
                    <div className="projectInlineHeroActions">
                      <button type="button" className="projectsDemoButton secondary">
                        {t(copy("Enter project", "进入项目", "Enter project"))}
                      </button>
                      <button type="button" className="projectsDemoButton ghost">
                        {t(copy("View reports", "查看报告", "View reports"))}
                      </button>
                    </div>
                  </div>

                  <div className="projectInlineSummary">
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Project info", "项目基本信息", "Project info"))}</span>
                      <strong>{project.description}</strong>
                      <small>
                        {t(copy("Key", "项目 Key", "Key"))}: {project.key} · {t(copy("Environments", "环境数", "Environments"))}:{" "}
                        {project.environments}
                      </small>
                    </div>
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Docs entry", "文档入口", "Docs entry"))}</span>
                      <strong>{project.docs}</strong>
                      <small>{t(copy("Uploaded docs and parse workbench", "已上传文档与解析入口", "Uploaded docs and parse workbench"))}</small>
                    </div>
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Cases entry", "用例入口", "Cases entry"))}</span>
                      <strong>{project.latestCaseName}</strong>
                      <small>{project.latestCaseUpdatedAt}</small>
                    </div>
                  </div>

                  <div className="projectInlineModuleGrid">
                    <article className="projectInlineModule">
                      <span>{t(copy("Execution entry", "执行入口", "Execution entry"))}</span>
                      <strong>{project.queueState}</strong>
                      <p>{project.queueDetail}</p>
                    </article>
                    <article className="projectInlineModule">
                      <span>{t(copy("Reports entry", "报告入口", "Reports entry"))}</span>
                      <strong>{project.latestReportName}</strong>
                      <p>
                        {project.latestReportStatus} · {project.latestReportFinishedAt}
                      </p>
                    </article>
                    <article className="projectInlineModule">
                      <span>{t(copy("Config entry", "配置入口", "Config entry"))}</span>
                      <strong>{project.configSummary}</strong>
                      <p>{t(copy("Model and environment policies stay in the same platform frame.", "模型与环境策略保持在同一平台框架内。", "モデルと環境ポリシーは同じプラットフォーム枠に維持されます。"))}</p>
                    </article>
                  </div>

                  <div className="projectInlineFooter">
                    <div className="projectInlineTags">
                      {project.tags.length ? (
                        project.tags.map((tag) => <span key={tag}>{tag}</span>)
                      ) : (
                        <span>{t(copy("No tags", "暂无标签", "No tags"))}</span>
                      )}
                    </div>
                    <span className="projectInlinePassRate">
                      {t(copy("Weekly pass rate", "本周通过率", "Weekly pass rate"))}: {project.passRate}%
                    </span>
                  </div>
                </section>
              ) : null}
            </article>
          );
        })}
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
