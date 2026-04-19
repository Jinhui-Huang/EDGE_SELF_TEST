import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { sharedCopy, translate } from "../i18n";
import {
  AdminConsoleSnapshot,
  DatabaseConfig,
  DataTemplateItem,
  Locale,
  ModelProvider,
  MutationState,
  PreparedCaseItem,
  SchedulerMutationForm
} from "../types";
import { MutationStatus } from "../ui-kit/MutationStatus";

type ExecutionScreenProps = {
  snapshot: AdminConsoleSnapshot;
  launchForm: SchedulerMutationForm;
  reviewForm: SchedulerMutationForm;
  preparedCases: PreparedCaseItem[];
  dataTemplates: DataTemplateItem[];
  databaseConfigs: DatabaseConfig[];
  selectedTemplateIds: string[];
  selectedDatabaseId: string;
  launchState: MutationState;
  executeState: MutationState;
  reviewState: MutationState;
  title: string;
  executionSaveHint: string;
  queueBoardLabel: string;
  reviewBoardLabel: string;
  fieldRunIdLabel: string;
  fieldProjectLabel: string;
  fieldOwnerLabel: string;
  fieldEnvironmentLabel: string;
  fieldTargetUrlLabel: string;
  fieldExecutionModelLabel: string;
  fieldDetailLabel: string;
  fieldAuditDetailLabel: string;
  runLabel: string;
  executionLabel: string;
  openAuditLabel: string;
  reviewSaveHint: string;
  openMonitorLabel: string;
  monitorLinkHint: string;
  locale: Locale;
  modelProviders: ModelProvider[];
  onLaunchFormChange: (updater: (current: SchedulerMutationForm) => SchedulerMutationForm) => void;
  onReviewFormChange: (updater: (current: SchedulerMutationForm) => SchedulerMutationForm) => void;
  onSelectedTemplateIdsChange: (ids: string[]) => void;
  onSelectedDatabaseIdChange: (id: string) => void;
  onLaunchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onExecuteSubmit: () => void;
  onReviewSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenMonitor: () => void;
};

type Copy = {
  en: string;
  zh: string;
  ja: string;
};

const copy = (en: string, zh = en, ja = en): Copy => ({ en, zh, ja });

export function ExecutionScreen({
  snapshot,
  launchForm,
  reviewForm,
  preparedCases,
  dataTemplates,
  databaseConfigs,
  selectedTemplateIds,
  selectedDatabaseId,
  launchState,
  executeState,
  reviewState,
  title,
  executionSaveHint,
  queueBoardLabel,
  reviewBoardLabel,
  fieldRunIdLabel,
  fieldProjectLabel,
  fieldOwnerLabel,
  fieldEnvironmentLabel,
  fieldTargetUrlLabel,
  fieldExecutionModelLabel,
  fieldDetailLabel,
  fieldAuditDetailLabel,
  runLabel,
  executionLabel,
  openAuditLabel,
  reviewSaveHint,
  openMonitorLabel,
  monitorLinkHint,
  locale,
  modelProviders,
  onLaunchFormChange,
  onReviewFormChange,
  onSelectedTemplateIdsChange,
  onSelectedDatabaseIdChange,
  onLaunchSubmit,
  onExecuteSubmit,
  onReviewSubmit,
  onOpenMonitor
}: ExecutionScreenProps) {
  const t = (value: Copy) => translate(locale, value);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const primaryProject = snapshot.projects.find((item) => item.key === launchForm.projectKey) ?? snapshot.projects[0];
  const queueLead = snapshot.workQueue[0];
  const modelPolicy = snapshot.modelConfig[1]?.value ?? snapshot.summary.runtimeStrategy;
  const environmentPolicy = snapshot.environmentConfig[2]?.value ?? snapshot.constraints[0];

  const preparedCasesForProject = useMemo(
    () => preparedCases.filter((item) => item.projectKey === launchForm.projectKey),
    [preparedCases, launchForm.projectKey]
  );

  const availableTemplates = useMemo(
    () => dataTemplates.filter((item) => item.projectKey === launchForm.projectKey),
    [dataTemplates, launchForm.projectKey]
  );

  const selectedTemplates = useMemo(
    () => dataTemplates.filter((item) => selectedTemplateIds.includes(item.id)),
    [dataTemplates, selectedTemplateIds]
  );

  const selectedDatabase = databaseConfigs.find((item) => item.id === selectedDatabaseId) ?? databaseConfigs[0];
  const executionReady = Boolean(
    launchForm.runId.trim() && launchForm.projectKey.trim() && preparedCasesForProject.length > 0
  );

  useEffect(() => {
    if (!availableTemplates.length) {
      if (selectedTemplateIds.length) {
        onSelectedTemplateIdsChange([]);
      }
      return;
    }

    const validIds = selectedTemplateIds.filter((id) => availableTemplates.some((item) => item.id === id));
    if (validIds.length !== selectedTemplateIds.length) {
      onSelectedTemplateIdsChange(validIds.length ? validIds : [availableTemplates[0].id]);
      return;
    }

    if (!validIds.length) {
      onSelectedTemplateIdsChange([availableTemplates[0].id]);
    }
  }, [availableTemplates, onSelectedTemplateIdsChange, selectedTemplateIds]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function toggleTemplate(templateId: string) {
    if (selectedTemplateIds.includes(templateId)) {
      onSelectedTemplateIdsChange(selectedTemplateIds.filter((item) => item !== templateId));
      return;
    }
    onSelectedTemplateIdsChange([...selectedTemplateIds, templateId]);
  }

  return (
    <div className="executionConsoleScreen">
      <div className="dataTemplatesPath">{t(copy("Executions / run_8f2a1c3e"))}</div>

      <div className="executionConsoleHead">
        <div>
          <div className="executionConsoleTitleRow">
            <h2>{title}</h2>
            <span className="executionConsoleStatus">{queueLead?.state ?? "Waiting"}</span>
            <span className="executionConsolePill">{launchForm.environment}</span>
            <span className="executionConsolePill isModel">{launchForm.executionModel}</span>
          </div>
          <p>{t(copy("Bind run id, project, prepared cases, database, and compare templates before starting execution."))}</p>
        </div>
        <div className="executionConsoleHeadActions">
          <button type="button" className="projectsActionButton executionMonitorButton" onClick={onOpenMonitor}>
            {openMonitorLabel}
          </button>
          <button type="button" className="projectsActionButton">
            {executionSaveHint}
          </button>
        </div>
      </div>

      <div className="executionConsoleProgressCard">
        <div className="executionConsoleRing">
          <div>{executionReady ? "62%" : "0%"}</div>
        </div>
        <div className="executionConsoleProgressBody">
          <div className="executionConsoleProgressMeta">
            <span>
              {t(copy("Prepared cases"))} <strong>{preparedCasesForProject.length}</strong>
            </span>
            <span className="dataTemplatesMonoSmall">
              {selectedTemplates.length} {t(copy("template compare targets"))}
            </span>
          </div>
          <div className="executionConsoleProgressBar">
            {Array.from({ length: 8 }, (_, index) => (
              <i
                key={index}
                className={
                  index < Math.max(1, Math.min(8, preparedCasesForProject.length))
                    ? "isDone"
                    : index === 4 && executionReady
                      ? "isRunning"
                      : ""
                }
              />
            ))}
          </div>
        </div>
        <div className="executionConsoleMiniStats">
          <div>
            <span>{t(copy("Project"))}</span>
            <strong>{primaryProject?.name ?? "--"}</strong>
          </div>
          <div>
            <span>{t(copy("Database"))}</span>
            <strong>{selectedDatabase?.type ?? "--"}</strong>
          </div>
          <div>
            <span>{t(copy("Queue"))}</span>
            <strong>{queueLead?.state ?? "--"}</strong>
          </div>
        </div>
      </div>

      <div className="executionConsoleGrid">
        <section className="executionConsolePanel">
          <div className="executionConsolePanelHead">
            <strong>{t(copy("Launch"))}</strong>
            <span>{runLabel}</span>
          </div>
          <form className="executionConsoleForm" onSubmit={onLaunchSubmit}>
            <label>
              {fieldRunIdLabel}
              <input value={launchForm.runId} onChange={(event) => onLaunchFormChange((current) => ({ ...current, runId: event.target.value }))} />
            </label>
            <label>
              {fieldProjectLabel}
              <select
                value={launchForm.projectKey}
                onChange={(event) => onLaunchFormChange((current) => ({ ...current, projectKey: event.target.value }))}
              >
                {snapshot.projects.map((project) => (
                  <option key={project.key} value={project.key}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {fieldOwnerLabel}
              <input value={launchForm.owner} onChange={(event) => onLaunchFormChange((current) => ({ ...current, owner: event.target.value }))} />
            </label>
            <label>
              {fieldEnvironmentLabel}
              <input value={launchForm.environment} onChange={(event) => onLaunchFormChange((current) => ({ ...current, environment: event.target.value }))} />
            </label>
            <label>
              {fieldTargetUrlLabel}
              <input value={launchForm.targetUrl} onChange={(event) => onLaunchFormChange((current) => ({ ...current, targetUrl: event.target.value }))} />
            </label>
            <label>
              {fieldExecutionModelLabel}
              <select
                value={launchForm.executionModel}
                onChange={(event) => onLaunchFormChange((current) => ({ ...current, executionModel: event.target.value }))}
              >
                {modelProviders.map((provider) => (
                  <option key={provider.id} value={provider.model}>
                    {provider.name} / {provider.model}
                  </option>
                ))}
              </select>
            </label>
            <label className="fullWidth">
              {t(copy("Compare data templates"))}
              <div className="executionMultiSelect" ref={dropdownRef}>
                <button
                  type="button"
                  className={`executionMultiSelectButton ${dropdownOpen ? "isOpen" : ""}`}
                  onClick={() => setDropdownOpen((current) => !current)}
                >
                  <span>
                    {selectedTemplates.length
                      ? selectedTemplates.map((item) => item.name).join(", ")
                      : t(copy("Select templates"))}
                  </span>
                  <i>▾</i>
                </button>
                {dropdownOpen ? (
                  <div className="executionMultiSelectMenu">
                    {availableTemplates.length ? (
                      availableTemplates.map((template) => (
                        <label key={template.id} className="executionMultiSelectOption">
                          <input
                            type="checkbox"
                            checked={selectedTemplateIds.includes(template.id)}
                            onChange={() => toggleTemplate(template.id)}
                          />
                          <div>
                            <strong>{template.name}</strong>
                            <small>
                              {template.type} / {template.compareSummary}
                            </small>
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="executionMultiSelectEmpty">{t(copy("No template available for this project."))}</div>
                    )}
                  </div>
                ) : null}
              </div>
            </label>
            <label className="fullWidth">
              {t(copy("Database connection"))}
              <select value={selectedDatabaseId} onChange={(event) => onSelectedDatabaseIdChange(event.target.value)}>
                {databaseConfigs.map((database) => (
                  <option key={database.id} value={database.id}>
                    {database.name} / {database.type}
                  </option>
                ))}
              </select>
            </label>
            <label className="fullWidth">
              {fieldDetailLabel}
              <textarea rows={3} value={launchForm.detail} onChange={(event) => onLaunchFormChange((current) => ({ ...current, detail: event.target.value }))} />
            </label>
            <div className="executionConsoleActions fullWidth">
              <button type="submit" className="projectsActionButton primary" disabled={launchState.kind === "pending"}>
                {launchState.kind === "pending" ? translate(locale, sharedCopy.queueing) : runLabel}
              </button>
              <button
                type="button"
                className="projectsActionButton"
                disabled={!executionReady || executeState.kind === "pending"}
                onClick={onExecuteSubmit}
              >
                {executeState.kind === "pending" ? translate(locale, sharedCopy.executing) : executionLabel}
              </button>
            </div>
          </form>
          <MutationStatus state={launchState} />
          <MutationStatus state={executeState} />
        </section>

        <section className="executionConsolePanel">
          <div className="executionConsolePanelHead">
            <strong>{t(copy("Prepared cases"))}</strong>
            <span>{primaryProject?.name ?? launchForm.projectKey}</span>
          </div>
          <div className="executionPreparedCountHero">{preparedCasesForProject.length}</div>
          <div className="executionPreparedCaseList">
            {preparedCasesForProject.length ? (
              preparedCasesForProject.map((item) => (
                <article key={item.id} className="executionPreparedCaseCard">
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.id}</p>
                  </div>
                  <div>
                    <span>{item.status}</span>
                    <small>{item.updatedAt}</small>
                  </div>
                </article>
              ))
            ) : (
              <div className="executionPreparedEmptyState">{t(copy("Go back to Cases and run Pre-execution first."))}</div>
            )}
          </div>
        </section>

        <section className="executionConsolePanel">
          <div className="executionConsolePanelHead">
            <strong>{t(copy("Execution readiness"))}</strong>
            <span>{monitorLinkHint}</span>
          </div>
          <div className="executionChecklistGrid">
            <article>
              <span>{t(copy("Project"))}</span>
              <strong>{primaryProject?.name ?? "-"}</strong>
              <small>{primaryProject?.note ?? snapshot.summary.description}</small>
            </article>
            <article>
              <span>{t(copy("Prepared cases"))}</span>
              <strong>{preparedCasesForProject.length}</strong>
              <small>{t(copy("Only prepared cases join this run."))}</small>
            </article>
            <article>
              <span>{t(copy("Runtime policy"))}</span>
              <strong>{modelPolicy}</strong>
              <small>{snapshot.constraints[0] ?? snapshot.summary.runtimeStrategy}</small>
            </article>
            <article>
              <span>{t(copy("Data boundary"))}</span>
              <strong>{selectedDatabase?.name ?? environmentPolicy}</strong>
              <small>{selectedDatabase ? `${selectedDatabase.type} / ${selectedDatabase.schema || "-"}` : environmentPolicy}</small>
            </article>
            <article>
              <span>{t(copy("Queue pressure"))}</span>
              <strong>{queueLead?.state ?? "Waiting"}</strong>
              <small>{queueLead?.detail ?? ""}</small>
            </article>
          </div>
          <button type="button" className="projectsActionButton executionReadinessButton" onClick={onOpenMonitor}>
            {openMonitorLabel}
          </button>
        </section>
      </div>

      <div className="executionConsoleBottomGrid">
        <section className="executionConsolePanel">
          <div className="executionConsolePanelHead">
            <strong>{queueBoardLabel}</strong>
            <span>{snapshot.workQueue.length}</span>
          </div>
          <div className="executionQueueList">
            {snapshot.workQueue.map((item) => (
              <article key={item.title} className="executionQueueRow">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <div>
                  <span>{item.owner}</span>
                  <small>{item.state}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="executionConsolePanel">
          <div className="executionConsolePanelHead">
            <strong>{reviewBoardLabel}</strong>
            <span>{reviewSaveHint}</span>
          </div>
          <form className="executionConsoleReviewForm" onSubmit={onReviewSubmit}>
            <label>
              {fieldRunIdLabel}
              <input value={reviewForm.runId} onChange={(event) => onReviewFormChange((current) => ({ ...current, runId: event.target.value }))} />
            </label>
            <label>
              {fieldProjectLabel}
              <input value={reviewForm.projectKey} onChange={(event) => onReviewFormChange((current) => ({ ...current, projectKey: event.target.value }))} />
            </label>
            <label>
              {fieldOwnerLabel}
              <input value={reviewForm.owner} onChange={(event) => onReviewFormChange((current) => ({ ...current, owner: event.target.value }))} />
            </label>
            <label>
              {fieldEnvironmentLabel}
              <input value={reviewForm.environment} onChange={(event) => onReviewFormChange((current) => ({ ...current, environment: event.target.value }))} />
            </label>
            <label className="fullWidth">
              {fieldAuditDetailLabel}
              <textarea rows={2} value={reviewForm.detail} onChange={(event) => onReviewFormChange((current) => ({ ...current, detail: event.target.value }))} />
            </label>
            <button type="submit" className="projectsActionButton primary" disabled={reviewState.kind === "pending"}>
              {reviewState.kind === "pending" ? translate(locale, sharedCopy.recording) : openAuditLabel}
            </button>
          </form>
          <MutationStatus state={reviewState} />
        </section>
      </div>
    </div>
  );
}
