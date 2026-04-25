import { Fragment, FormEvent, useMemo, useState } from "react";
import { sharedCopy, translate } from "../i18n";
import { AdminConsoleSnapshot, Locale, MutationState, ProjectImportPreviewResponse, ProjectItem } from "../types";
import { MutationStatus } from "../ui-kit/MutationStatus";

type ProjectsScreenProps = {
  snapshot: AdminConsoleSnapshot;
  projectDraft: ProjectItem[];
  projectState: MutationState;
  projectImportState: MutationState;
  projectImportPreview: ProjectImportPreviewResponse | null;
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
  onImportPreview: (raw: string) => void;
  onImportCommit: (raw: string) => void;
  onImportReset: () => void;
  onNewProject: () => void;
  onEnterProject: (projectKey: string) => void;
  onOpenProjectReports: (projectKey: string) => void;
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
    const needsAttention = /need|failed|variance|repair|review/i.test(project.note);
    const passRate = Math.min(100, needsAttention ? passBase - 3 : passBase);
    const updatedAgo = locale === "zh" ? `${index + 2} hours ago` : locale === "ja" ? `${index + 2} hours ago` : `${index + 2}h ago`;
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
      latestCaseName: latestCase?.name ?? translate(locale, copy("No linked cases yet")),
      latestCaseUpdatedAt: latestCase?.updatedAt ?? translate(locale, copy("Waiting for first sync")),
      latestReportName: latestReport?.runName ?? translate(locale, copy("No recent report")),
      latestReportStatus: latestReport?.status ?? translate(locale, copy("Pending")),
      latestReportFinishedAt: latestReport?.finishedAt ?? translate(locale, copy("No finish time")),
      queueState: queueItem?.state ?? translate(locale, copy("Idle")),
      queueDetail: queueItem?.detail ?? translate(locale, copy("No queued execution context")),
      configSummary: configSummary || translate(locale, copy("No config summary")),
      tags
    };
  });
}

export function ProjectsScreen({
  snapshot,
  projectDraft,
  projectState,
  projectImportState,
  projectImportPreview,
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
  onImportPreview,
  onImportCommit,
  onImportReset,
  onNewProject,
  onEnterProject,
  onOpenProjectReports,
  onProjectChange,
  onAddProjectRow,
  onRemoveProjectRow,
  onSubmit
}: ProjectsScreenProps) {
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);
  const [query, setQuery] = useState("");
  const [selectedProjectKey, setSelectedProjectKey] = useState(snapshot.projects[0]?.key ?? snapshot.cases[0]?.projectKey ?? "");
  const [openedProjectKey, setOpenedProjectKey] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importDraft, setImportDraft] = useState(`[
  {
    "key": "ops-console",
    "name": "ops-console",
    "scope": "Operations back office",
    "environments": ["staging"],
    "note": "Imported from project catalog batch"
  }
]`);

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
          <p>{`${visibleProjects.length} projects / ${totalCases} cases / weekly pass rate ${averagePassRate}%`}</p>
        </div>
        <div className="projectsScreenActions">
          <label className="projectsSearch">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              aria-label={t(copy("Project search"))}
              value={query}
              placeholder={t(copy("Search projects"))}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="projectsActionButton ghost"
            onClick={() => {
              setImportOpen((current) => !current);
              if (importOpen) {
                onImportReset();
              }
            }}
          >
            {t(copy("Import"))}
          </button>
          <button type="button" className="projectsActionButton primary" onClick={onNewProject}>
            + {t(copy("New project"))}
          </button>
        </div>
      </div>

      {importOpen ? (
        <section className="projectsImportPanel sectionCard">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{t(copy("Project import"))}</p>
              <h3>{t(copy("Preview before commit"))}</h3>
            </div>
            <button
              type="button"
              className="projectsActionButton ghost"
              onClick={() => {
                setImportOpen(false);
                onImportReset();
              }}
            >
              {t(copy("Close"))}
            </button>
          </div>
          <label className="fullWidth">
            {t(copy("Import JSON"))}
            <textarea
              rows={8}
              value={importDraft}
              onChange={(event) => {
                setImportDraft(event.target.value);
                onImportReset();
              }}
            />
          </label>
          <div className="editorActions">
            <button type="button" className="dashboardButton secondary" onClick={() => onImportPreview(importDraft)}>
              {t(copy("Preview import"))}
            </button>
            <button
              type="button"
              className="dashboardButton primary"
              disabled={!projectImportPreview || projectImportState.kind === "pending"}
              onClick={() => onImportCommit(importDraft)}
            >
              {t(copy("Commit import"))}
            </button>
          </div>
          <MutationStatus state={projectImportState} />
          {projectImportPreview ? (
            <div className="projectsImportPreview">
              <p className="projectsImportSummary">
                {`${projectImportPreview.summary.totalRows} rows / ${projectImportPreview.summary.createCount} create / ${projectImportPreview.summary.updateCount} update / ${projectImportPreview.summary.conflictCount} conflict`}
              </p>
              <div className="projectsImportReviewList">
                {projectImportPreview.rows.map((row) => (
                  <div key={`${row.key}-${row.action}`} className="projectsImportReviewRow">
                    <strong>{row.key}</strong>
                    <span>{row.action}</span>
                    <span>{row.scope}</span>
                  </div>
                ))}
                {projectImportPreview.conflicts.map((conflict) => (
                  <div key={`${conflict.key}-${conflict.reason}`} className="projectsImportConflictRow">
                    <strong>{conflict.key || "unknown"}</strong>
                    <span>{conflict.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="projectsCardGrid">
        {(() => {
          const rows: ProjectCardModel[][] = [];
          for (let index = 0; index < visibleProjects.length; index += 3) {
            rows.push(visibleProjects.slice(index, index + 3));
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
                          <span>{t(copy("Docs"))}</span>
                          <strong>{project.docs}</strong>
                        </div>
                        <div className="projectsDemoMiniCard">
                          <span>{t(copy("Cases"))}</span>
                          <strong>{project.cases}</strong>
                        </div>
                        <div className="projectsDemoMiniCard">
                          <span>{t(copy("Pass"))}</span>
                          <strong className={project.passRate > 90 ? "isPassGood" : "isPassWarn"}>{project.passRate}%</strong>
                        </div>
                        <div className="projectsDemoMiniCard">
                          <span>{t(copy("Envs"))}</span>
                          <strong>{project.environments}</strong>
                        </div>
                        <div className="projectsDemoMiniCard">
                          <span>{t(copy("Queue"))}</span>
                          <strong className="projectsDemoMiniTrunc" title={project.queueState}>{project.queueState}</strong>
                        </div>
                        <div className="projectsDemoMiniCard">
                          <span>{t(copy("Last run"))}</span>
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
                          {isOpened ? t(copy("Close")) : t(copy("Open"))}
                        </button>
                        <button
                          type="button"
                          className="projectsDemoButton ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedProjectKey(project.key);
                            setOpenedProjectKey(project.key);
                            onOpenProjectReports(project.key);
                          }}
                        >
                          {t(copy("Reports"))}
                        </button>
                        <span className="projectsDemoTimestamp">{project.updatedAgo}</span>
                      </div>
                    </div>
                  </article>
                );
              })}

              {row.some((project) => project.key === openedProjectKey) && openedProject ? (
                <section className={`projectFullDetail ${openedProject.accentClass}`} aria-label={`${openedProject.name} detail`}>
                  <div className="projectFullDetailHero">
                    <div className="projectFullDetailHeroCopy">
                      <span className="projectInlineEyebrow">{t(copy("Project detail"))}</span>
                      <h3 className="projectFullDetailTitle">{openedProject.name}</h3>
                      <p className="projectFullDetailNote">{openedProject.note}</p>
                    </div>
                    <div className="projectInlineHeroActions">
                      <button type="button" className="projectsDemoButton secondary" onClick={() => onEnterProject(openedProject.key)}>
                        {t(copy("Enter project"))}
                      </button>
                      <button type="button" className="projectsDemoButton ghost" onClick={() => onOpenProjectReports(openedProject.key)}>
                        {t(copy("View reports"))}
                      </button>
                    </div>
                  </div>

                  <div className="projectFullDetailSummary">
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Project info"))}</span>
                      <strong>{openedProject.description}</strong>
                      <small>{`Key: ${openedProject.key} | Environments: ${openedProject.environments}`}</small>
                    </div>
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Docs entry"))}</span>
                      <strong>{openedProject.docs}</strong>
                      <small>{t(copy("Uploaded docs and parse workbench"))}</small>
                    </div>
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Cases entry"))}</span>
                      <strong className="projectFullDetailTrunc" title={openedProject.latestCaseName}>{openedProject.latestCaseName}</strong>
                      <small>{openedProject.latestCaseUpdatedAt}</small>
                    </div>
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Execution entry"))}</span>
                      <strong className="projectFullDetailTrunc" title={openedProject.queueState}>{openedProject.queueState}</strong>
                      <small className="projectFullDetailTrunc" title={openedProject.queueDetail}>{openedProject.queueDetail}</small>
                    </div>
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Reports entry"))}</span>
                      <strong className="projectFullDetailTrunc" title={openedProject.latestReportName}>{openedProject.latestReportName}</strong>
                      <small>{`${openedProject.latestReportStatus} | ${openedProject.latestReportFinishedAt}`}</small>
                    </div>
                    <div className="projectInlineSummaryCard">
                      <span>{t(copy("Pass rate"))}</span>
                      <strong className={openedProject.passRate > 90 ? "isPassGood" : "isPassWarn"}>{openedProject.passRate}%</strong>
                      <small>{openedProject.tags.length ? openedProject.tags.join(" | ") : t(copy("No tags"))}</small>
                    </div>
                  </div>
                </section>
              ) : null}
            </Fragment>
          ));
        })()}
      </div>

      {!visibleProjects.length ? <p className="emptyState projectsGridEmpty">{translate(locale, sharedCopy.noProjectsMatch)}</p> : null}

      <section className="projectsSupportRegion" aria-label="Project catalog support region">
        <form className="editorForm projectsEditorForm" onSubmit={onSubmit}>
          {projectDraft.map((project, index) => (
            <div key={`project-draft-${index}`} className="editorRow projectsEditorRow">
              <div className="editorMeta editorMetaSplit">
                <div>
                  <strong>{project.name || project.key || `${t(copy("Project"))} ${index + 1}`}</strong>
                  <small>
                    {snapshot.projects[index]
                      ? `${snapshot.projects[index].suites} ${t(copy("cases"))} / ${snapshot.projects[index].environments} ${t(copy("envs"))}`
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
