import { Dispatch, FormEvent, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  initialCaseId?: string | null;
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

type CasesScreenSubmitHandler = (event: FormEvent<HTMLFormElement>) => void;

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

type RemoteState<T> = {
  status: "idle" | "loading" | "success" | "empty" | "error";
  data: T | null;
  message: string;
  caseId: string | null;
};

type MutationRequestKey = "dslValidate" | "dslSave" | "stateMachineSave";

const copy = (en: string, zh = en, ja = en): LocalizedCopy => ({ en, zh, ja });
const accentClasses = ["accent", "accent2", "accent3", "accent4"] as const;

const detailTabs: Array<{ key: CaseDetailTab; label: LocalizedCopy }> = [
  { key: "overview", label: copy("Overview") },
  { key: "dsl", label: copy("DSL") },
  { key: "stateMachine", label: copy("State machine") },
  { key: "plans", label: copy("Plans") },
  { key: "history", label: copy("History") }
];

function buildDetailSteps(testCase: CaseItem): DetailStep[] {
  const normalizedProject = testCase.projectKey || "project";
  const normalizedCase = testCase.id || "case";
  const successPath = `/${normalizedProject.replace(/-web|-center|-console/g, "").replace(/-/g, "/") || "flow"}`;

  return [
    { index: 1, action: "open", selector: successPath, note: "Navigate to entry." },
    { index: 2, action: "click", selector: "#primary-entry", note: "Locator healed once.", healed: true },
    { index: 3, action: "fill", selector: "[name=account]", value: `${normalizedCase}@demo.local` },
    { index: 4, action: "type", selector: "[name=token]", value: "AUTO-E2E-2026" },
    { index: 5, action: "click", selector: "button.primary", note: "Submit the happy path." },
    { index: 6, action: "assert", selector: "url", value: `${successPath}/success/*`, note: "URL assertion." },
    { index: 7, action: "assert", selector: "db", value: `${normalizedProject}.status = "done"`, note: "Database assertion." },
    { index: 8, action: "assert", selector: "delta", value: "snapshot diff = expected", note: "Snapshot diff." }
  ];
}

function createRemoteState<T>(): RemoteState<T> {
  return {
    status: "idle",
    data: null,
    message: "",
    caseId: null
  };
}

function renderRemoteState(
  locale: Locale,
  state: RemoteState<unknown>,
  loading: LocalizedCopy,
  fallbackEmpty: LocalizedCopy
) {
  const t = (value: LocalizedCopy) => translate(locale, value);
  if (state.status === "loading") {
    return (
      <section className="casesPanelCard">
        <p className="casesPanelText">{t(loading)}</p>
      </section>
    );
  }
  if (state.status === "empty" || state.status === "error") {
    return (
      <section className="casesPanelCard">
        <p className="casesPanelText">{state.message || t(fallbackEmpty)}</p>
      </section>
    );
  }
  return null;
}

function hasAnyItems(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const data = value as Record<string, unknown>;
  if (Array.isArray(data.plans)) {
    return data.plans.length > 0 || (Array.isArray(data.preconditions) && data.preconditions.length > 0);
  }
  if (Array.isArray(data.runs)) {
    return data.runs.length > 0 || (Array.isArray(data.maintenanceEvents) && data.maintenanceEvents.length > 0);
  }
  if (Array.isArray(data.nodes)) {
    return data.nodes.length > 0 || Array.isArray(data.edges) || Array.isArray(data.guards);
  }
  return true;
}

export function CasesScreen({
  snapshot,
  caseDraft,
  caseState,
  initialProjectKey,
  initialCaseId,
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

  const [dslState, setDslState] = useState<RemoteState<CaseDslResponse>>(() => createRemoteState());
  const [dslDraft, setDslDraft] = useState("");
  const [dslValidation, setDslValidation] = useState<CaseDslValidateResponse | null>(null);
  const [dslActionState, setDslActionState] = useState<MutationState>({ kind: "idle", message: "" });

  const [stateMachineState, setStateMachineState] = useState<RemoteState<CaseStateMachineResponse>>(() => createRemoteState());
  const [stateMachineActionState, setStateMachineActionState] = useState<MutationState>({ kind: "idle", message: "" });

  const [plansState, setPlansState] = useState<RemoteState<CasePlansResponse>>(() => createRemoteState());
  const [historyState, setHistoryState] = useState<RemoteState<CaseHistoryResponse>>(() => createRemoteState());
  const openedCaseIdRef = useRef<string | null>(null);
  const consumedHandoffRef = useRef<string | null>(null);
  const requestVersionRef = useRef<Record<CaseDetailTab, number>>({
    overview: 0,
    dsl: 0,
    stateMachine: 0,
    plans: 0,
    history: 0
  });
  const requestAbortRef = useRef<Partial<Record<CaseDetailTab, AbortController>>>({});
  const mutationVersionRef = useRef<Record<MutationRequestKey, number>>({
    dslValidate: 0,
    dslSave: 0,
    stateMachineSave: 0
  });

  const isCurrentCaseMutation = useCallback((caseId: string, key: MutationRequestKey, version: number) => {
    return openedCaseIdRef.current === caseId && mutationVersionRef.current[key] === version;
  }, []);

  const fetchTabData = useCallback(
    async <T,>(
      tab: CaseDetailTab,
      url: string,
      caseId: string,
      setState: Dispatch<SetStateAction<RemoteState<T>>>,
      emptyMessage: LocalizedCopy
    ) => {
      requestAbortRef.current[tab]?.abort();
      const controller = new AbortController();
      requestAbortRef.current[tab] = controller;
      const requestVersion = (requestVersionRef.current[tab] ?? 0) + 1;
      requestVersionRef.current[tab] = requestVersion;
      setState({ status: "loading", data: null, message: "", caseId });
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (requestVersionRef.current[tab] !== requestVersion) {
          return null;
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = (await response.json()) as T;
        if (requestVersionRef.current[tab] !== requestVersion) {
          return null;
        }
        if (!hasAnyItems(data)) {
          setState({ status: "empty", data: null, message: t(emptyMessage), caseId });
          return null;
        }
        setState({ status: "success", data, message: "", caseId });
        return data;
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
          return null;
        }
        if (requestVersionRef.current[tab] !== requestVersion) {
          return null;
        }
        setState({
          status: "error",
          data: null,
          message: t(copy("Failed to load case detail.")),
          caseId
        });
        return null;
      } finally {
        if (requestAbortRef.current[tab] === controller) {
          delete requestAbortRef.current[tab];
        }
      }
    },
    [t]
  );

  const loadDsl = useCallback(
    async (caseId: string) => {
      const data = await fetchTabData<CaseDslResponse>(
        "dsl",
        `${apiBaseUrl}/api/phase3/cases/${encodeURIComponent(caseId)}/dsl`,
        caseId,
        setDslState,
        copy("No DSL document yet.")
      );
      if (data) {
        setDslDraft(JSON.stringify(data.definition, null, 2));
        setDslValidation(null);
        setDslActionState({ kind: "idle", message: "" });
      }
    },
    [apiBaseUrl, fetchTabData]
  );

  const loadStateMachine = useCallback(
    async (caseId: string) => {
      await fetchTabData<CaseStateMachineResponse>(
        "stateMachine",
        `${apiBaseUrl}/api/phase3/cases/${encodeURIComponent(caseId)}/state-machine`,
        caseId,
        setStateMachineState,
        copy("No state-machine data yet.")
      );
    },
    [apiBaseUrl, fetchTabData]
  );

  const loadPlans = useCallback(
    async (caseId: string) => {
      await fetchTabData<CasePlansResponse>(
        "plans",
        `${apiBaseUrl}/api/phase3/cases/${encodeURIComponent(caseId)}/plans`,
        caseId,
        setPlansState,
        copy("No plans yet.")
      );
    },
    [apiBaseUrl, fetchTabData]
  );

  const loadHistory = useCallback(
    async (caseId: string) => {
      await fetchTabData<CaseHistoryResponse>(
        "history",
        `${apiBaseUrl}/api/phase3/cases/${encodeURIComponent(caseId)}/history`,
        caseId,
        setHistoryState,
        copy("No history yet.")
      );
    },
    [apiBaseUrl, fetchTabData]
  );

  const handleValidateDsl = useCallback(
    async (caseId: string) => {
      const requestVersion = mutationVersionRef.current.dslValidate + 1;
      mutationVersionRef.current.dslValidate = requestVersion;
      setDslActionState({ kind: "pending", message: t(copy("Validating DSL...")) });
      let definition: unknown;
      try {
        definition = JSON.parse(dslDraft);
      } catch {
        if (!isCurrentCaseMutation(caseId, "dslValidate", requestVersion)) {
          return;
        }
        setDslValidation({ status: "INVALID", errors: ["Invalid JSON"], warnings: [] });
        setDslActionState({ kind: "error", message: t(copy("Invalid JSON.")) });
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/phase3/cases/${encodeURIComponent(caseId)}/dsl/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ definition })
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result: CaseDslValidateResponse = await response.json();
        if (!isCurrentCaseMutation(caseId, "dslValidate", requestVersion)) {
          return;
        }
        setDslValidation(result);
        setDslActionState({
          kind: result.status === "VALID" ? "success" : "warning",
          message: result.status === "VALID" ? t(copy("DSL validation passed.")) : t(copy("DSL validation returned issues."))
        });
      } catch (error) {
        if (!isCurrentCaseMutation(caseId, "dslValidate", requestVersion)) {
          return;
        }
        setDslValidation(null);
        setDslActionState({
          kind: "error",
          message: error instanceof Error ? error.message : t(copy("Failed to validate DSL."))
        });
      }
    },
    [apiBaseUrl, dslDraft, isCurrentCaseMutation, t]
  );

  const handleSaveDsl = useCallback(
    async (caseId: string, projectKey: string) => {
      const requestVersion = mutationVersionRef.current.dslSave + 1;
      mutationVersionRef.current.dslSave = requestVersion;
      setDslActionState({ kind: "pending", message: t(copy("Saving DSL...")) });
      try {
        const definition = JSON.parse(dslDraft);
        const response = await fetch(`${apiBaseUrl}/api/phase3/cases/${encodeURIComponent(caseId)}/dsl`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ definition, projectKey, updatedBy: "operator" })
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const saved: CaseDslSaveResponse = await response.json();
        if (!isCurrentCaseMutation(caseId, "dslSave", requestVersion)) {
          return;
        }
        setDslState((current) =>
          current.data && current.caseId === caseId
            ? {
                ...current,
                status: "success",
                data: {
                  ...current.data,
                  dslVersion: saved.dslVersion,
                  updatedAt: saved.updatedAt,
                  updatedBy: "operator",
                  definition
                }
              }
            : current
        );
        setDslValidation(null);
        setDslActionState({ kind: "success", message: t(copy("DSL saved.")) });
      } catch {
        if (!isCurrentCaseMutation(caseId, "dslSave", requestVersion)) {
          return;
        }
        setDslActionState({ kind: "error", message: t(copy("Failed to save DSL.")) });
      }
    },
    [apiBaseUrl, dslDraft, isCurrentCaseMutation, t]
  );

  const handleSaveStateMachine = useCallback(
    async (caseId: string) => {
      const current = stateMachineState.data;
      if (!current) {
        return;
      }
      const requestVersion = mutationVersionRef.current.stateMachineSave + 1;
      mutationVersionRef.current.stateMachineSave = requestVersion;
      setStateMachineActionState({ kind: "pending", message: t(copy("Saving state machine...")) });
      try {
        const response = await fetch(`${apiBaseUrl}/api/phase3/cases/${encodeURIComponent(caseId)}/state-machine`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectKey: current.projectKey,
            nodes: current.nodes,
            edges: current.edges,
            guards: current.guards
          })
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const saved = (await response.json()) as { updatedAt: string };
        if (!isCurrentCaseMutation(caseId, "stateMachineSave", requestVersion)) {
          return;
        }
        setStateMachineState((previous) =>
          previous.data && previous.caseId === caseId
            ? {
                ...previous,
                status: "success",
                data: {
                  ...previous.data,
                  updatedAt: saved.updatedAt
                }
              }
            : previous
        );
        setStateMachineActionState({ kind: "success", message: t(copy("State machine saved.")) });
      } catch {
        if (!isCurrentCaseMutation(caseId, "stateMachineSave", requestVersion)) {
          return;
        }
        setStateMachineActionState({ kind: "error", message: t(copy("Failed to save state machine.")) });
      }
    },
    [apiBaseUrl, isCurrentCaseMutation, stateMachineState.data, t]
  );

  useEffect(() => {
    const normalizedProjectKey = initialProjectKey?.trim();
    const normalizedCaseId = initialCaseId?.trim();
    if (!normalizedProjectKey && !normalizedCaseId) {
      return;
    }
    const handoffKey = `${normalizedProjectKey ?? ""}::${normalizedCaseId ?? ""}`;
    if (consumedHandoffRef.current === handoffKey) {
      return;
    }

    let nextProjectKey = normalizedProjectKey ?? null;
    let nextOpenedCaseId: string | null = null;
    const matchedCase = normalizedCaseId ? caseDraft.find((item) => item.id === normalizedCaseId) ?? null : null;

    if (matchedCase) {
      if (!nextProjectKey || matchedCase.projectKey === nextProjectKey) {
        nextProjectKey = matchedCase.projectKey;
        nextOpenedCaseId = matchedCase.id;
      }
    }

    if (nextProjectKey && snapshot.projects.some((project) => project.key === nextProjectKey) && nextProjectKey !== selectedProjectKey) {
      setSelectedProjectKey(nextProjectKey);
    }
    if (nextOpenedCaseId !== openedCaseId) {
      setOpenedCaseId(nextOpenedCaseId);
    }
    if (nextOpenedCaseId) {
      setOverviewCollapsed(true);
    }
    consumedHandoffRef.current = handoffKey;
  }, [caseDraft, initialCaseId, initialProjectKey, openedCaseId, selectedProjectKey, snapshot.projects]);

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

  useEffect(() => {
    openedCaseIdRef.current = openedCaseId;
  }, [openedCaseId]);

  useEffect(() => {
    setActiveTab("overview");
    for (const controller of Object.values(requestAbortRef.current)) {
      controller?.abort();
    }
    requestAbortRef.current = {};
    setDslState(createRemoteState());
    setDslDraft("");
    setDslValidation(null);
    setDslActionState({ kind: "idle", message: "" });
    setStateMachineState(createRemoteState());
    setStateMachineActionState({ kind: "idle", message: "" });
    setPlansState(createRemoteState());
    setHistoryState(createRemoteState());
  }, [openedCaseId]);

  useEffect(() => () => {
    for (const controller of Object.values(requestAbortRef.current)) {
      controller?.abort();
    }
  }, []);

  useEffect(() => {
    if (!openedCaseId || activeTab === "overview") {
      return;
    }
    if (activeTab === "dsl") {
      void loadDsl(openedCaseId);
      return;
    }
    if (activeTab === "stateMachine") {
      void loadStateMachine(openedCaseId);
      return;
    }
    if (activeTab === "plans") {
      void loadPlans(openedCaseId);
      return;
    }
    void loadHistory(openedCaseId);
  }, [activeTab, loadDsl, loadHistory, loadPlans, loadStateMachine, openedCaseId]);

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
  const detailSteps = openedCase ? buildDetailSteps(openedCase) : [];
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
              {t(copy("Switch projects first, then open one case in detail view. Pre-execution is available only inside the lower detail canvas."))}
            </p>
          </div>
          <div className="casesOverviewActions">
            <span className="actionHint">{saveHint}</span>
            <button
              type="button"
              className="casesCollapseButton"
              aria-expanded={!overviewCollapsed}
              aria-label={overviewCollapsed ? t(copy("Expand case overview")) : t(copy("Collapse case overview"))}
              onClick={() => setOverviewCollapsed((current) => !current)}
            >
              <span className={`casesCollapseIcon ${overviewCollapsed ? "isCollapsed" : ""}`}>^</span>
            </button>
          </div>
        </div>

        {overviewCollapsed ? (
          <div className="casesCollapsedSummary">
            <span className="casesCollapsedLabel">{t(copy("Overview collapsed"))}</span>
            <strong>{openedCase?.name ?? selectedProject?.name ?? t(copy("Expand above to choose a case"))}</strong>
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
                      <span>{t(copy("Cases"))}</span>
                      <span>{t(copy("Env"))}: {project.environments}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="casesCatalogSummary">
            <div className="casesMetric">
              <span>{t(copy("Visible cases"))}</span>
              <strong>{totalCases}</strong>
            </div>
            <div className="casesMetric">
              <span>{t(copy("Active"))}</span>
              <strong>{activeCases}</strong>
            </div>
            <div className="casesMetric">
              <span>{t(copy("Archived"))}</span>
              <strong>{archivedCases}</strong>
            </div>
            <div className="casesMetric">
              <span>{t(copy("Happy path"))}</span>
              <strong>{happyCases}</strong>
            </div>
          </div>

          <div className="casesListPanel">
            <div className="casesListPanelHead">
              <div>
                <p className="eyebrow">{t(copy("Case catalog"))}</p>
                <h3>{selectedProject?.name ?? t(copy("All projects"))}</h3>
              </div>
              <span className="casesListHint">{t(copy("Open detail to unlock actions"))}</span>
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
                      <span>{snapshotCase?.updatedAt ?? t(copy("New row"))}</span>
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
                      {isOpened ? t(copy("Opened")) : t(copy("Detail"))}
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
          {openedCase ? `${t(copy("Cases"))} / ${openedCase.name || openedCase.id}` : t(copy("Cases / Select one row above"))}
        </div>

        <div className="casesDetailHero">
          <div>
            <div className="casesDetailTitleRow">
              <h3>{openedCase?.name ?? t(copy("Case detail locked"))}</h3>
              <span className="casesHappyBadge">{openedCase?.status ?? t(copy("Locked"))}</span>
            </div>
            <p className="casesDetailSubtitle">
              {openedCase
                ? t(
                    copy(
                      `From project ${openedCase.projectKey} | updated ${snapshot.cases.find((item) => item.id === openedCase.id)?.updatedAt ?? "recently"} | 14 runs this week | 100% pass`
                    )
                  )
                : t(copy("Choose one case from the overview list to load the detail canvas."))}
            </p>
          </div>

          <div className="casesHeroActions">
            <button type="button" className="casesActionButton ghost" disabled={!openedCase} onClick={() => setActiveTab("dsl")}>
              {t(copy("Edit DSL"))}
            </button>
            <button
              type="button"
              className="casesActionButton secondary"
              disabled={!openedCase}
              onClick={() => setActiveTab("stateMachine")}
            >
              {t(copy("State machine"))}
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
              {t(copy("Pre-execution"))}
            </button>
          </div>
        </div>

        <div className="casesTabs">
          {detailTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`casesTab ${activeTab === tab.key ? "isActive" : ""}`}
              disabled={!openedCase}
              onClick={() => setActiveTab(tab.key)}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>

        {openedCase ? (
          <div className="casesDetailGrid">
            <div className="casesDetailMain">
              {activeTab === "overview" ? (
                <section className="casesPanelCard casesStepsCard">
                  <div className="casesPanelHead">
                    <div className="casesPanelTitle">{t(copy("Steps"))}</div>
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
              ) : null}

              {activeTab === "dsl"
                ? dslState.status !== "success" || !dslState.data
                  ? renderRemoteState(locale, dslState, copy("Loading DSL..."), copy("No DSL document yet."))
                  : (
                    <section className="casesPanelCard">
                      <div className="casesPanelHead">
                        <div className="casesPanelTitle">
                          {t(copy("DSL Editor"))} (v{dslState.data.dslVersion})
                        </div>
                        <div className="casesPanelActions">
                          <button type="button" className="casesActionButton ghost" onClick={() => handleValidateDsl(openedCase.id)}>
                            {t(copy("Validate"))}
                          </button>
                          <button
                            type="button"
                            className="casesActionButton primary"
                            disabled={dslActionState.kind === "pending"}
                            onClick={() => handleSaveDsl(openedCase.id, openedCase.projectKey)}
                          >
                            {dslActionState.kind === "pending" ? t(copy("Saving...")) : t(copy("Save DSL"))}
                          </button>
                        </div>
                      </div>
                      <MutationStatus state={dslActionState} />
                      {dslValidation ? (
                        <div className={`casesDslValidation ${dslValidation.status === "VALID" ? "isValid" : "isInvalid"}`}>
                          <strong>{dslValidation.status}</strong>
                          {dslValidation.errors.map((error) => (
                            <p key={error} className="errorText">{error}</p>
                          ))}
                          {dslValidation.warnings.map((warning) => (
                            <p key={warning} className="warningText">{warning}</p>
                          ))}
                        </div>
                      ) : null}
                      <textarea className="casesDslEditor" rows={16} value={dslDraft} onChange={(event) => setDslDraft(event.target.value)} />
                      <div className="casesDslMeta">
                        <span>{t(copy("Updated by"))}: {dslState.data.updatedBy}</span>
                        <span>{t(copy("Updated at"))}: {dslState.data.updatedAt}</span>
                      </div>
                    </section>
                    )
                : null}

              {activeTab === "stateMachine"
                ? stateMachineState.status !== "success" || !stateMachineState.data
                  ? renderRemoteState(locale, stateMachineState, copy("Loading state machine..."), copy("No state-machine data yet."))
                  : (
                    <section className="casesPanelCard">
                      <div className="casesPanelHead">
                        <div className="casesPanelTitle">{t(copy("State machine"))}</div>
                        <button type="button" className="casesActionButton primary" onClick={() => handleSaveStateMachine(openedCase.id)}>
                          {t(copy("Save"))}
                        </button>
                      </div>
                      <MutationStatus state={stateMachineActionState} />
                      <div className="casesSmNodes">
                        <strong>{t(copy("Nodes"))}</strong>
                        <div className="casesSmNodeList">
                          {stateMachineState.data.nodes.map((node) => (
                            <span key={node.id} className="casesSmNode">{node.label} ({node.id})</span>
                          ))}
                        </div>
                      </div>
                      <div className="casesSmEdges">
                        <strong>{t(copy("Edges"))}</strong>
                        {stateMachineState.data.edges.length ? (
                          stateMachineState.data.edges.map((edge, index) => (
                            <div key={`${edge.from}-${edge.to}-${index}`} className="casesSmEdge">
                              {edge.from} to {edge.to} <span className="casesPanelPill">{edge.action}</span>
                            </div>
                          ))
                        ) : (
                          <p className="casesPanelText">{t(copy("No edges."))}</p>
                        )}
                      </div>
                      <div className="casesSmGuards">
                        <strong>{t(copy("Guards"))}</strong>
                        {stateMachineState.data.guards.length ? (
                          stateMachineState.data.guards.map((guard) => (
                            <div key={guard.id} className="casesSmGuard">{guard.id}: {guard.description}</div>
                          ))
                        ) : (
                          <p className="casesPanelText">{t(copy("No guards."))}</p>
                        )}
                      </div>
                    </section>
                    )
                : null}

              {activeTab === "plans"
                ? plansState.status !== "success" || !plansState.data
                  ? renderRemoteState(locale, plansState, copy("Loading plans..."), copy("No plans yet."))
                  : (
                    <section className="casesPanelCard">
                      <div className="casesPanelTitle">{t(copy("Plans"))}</div>
                      {plansState.data.plans.map((plan) => (
                        <div key={plan.id} className="casesPlanRow">
                          <span className="casesPlanDot accent2">*</span>
                          <div>
                            <strong>{plan.name}</strong>
                            <p>{plan.summary}</p>
                            <small>{plan.type}</small>
                          </div>
                        </div>
                      ))}
                      {plansState.data.preconditions.length ? (
                        <div className="casesPlanPreconditions">
                          <strong>{t(copy("Preconditions"))}</strong>
                          <ul>
                            {plansState.data.preconditions.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </section>
                    )
                : null}

              {activeTab === "history"
                ? historyState.status !== "success" || !historyState.data
                  ? renderRemoteState(locale, historyState, copy("Loading history..."), copy("No history yet."))
                  : (
                    <section className="casesPanelCard">
                      <div className="casesPanelTitle">{t(copy("History"))}</div>
                      <div className="casesHistoryRuns">
                        <strong>{t(copy("Runs"))}</strong>
                        {historyState.data.runs.length ? (
                          historyState.data.runs.map((run) => (
                            <div key={`${run.runName}-${run.finishedAt}`} className="casesHistoryRun">
                              <span className={`casesStatusBadge ${run.status === "SUCCESS" ? "isActive" : ""}`}>{run.status}</span>
                              <strong>{run.runName}</strong>
                              <span>{run.finishedAt}</span>
                              <span>{run.reportEntry}</span>
                            </div>
                          ))
                        ) : (
                          <p className="casesPanelText">{t(copy("No runs yet."))}</p>
                        )}
                      </div>
                      <div className="casesHistoryMaintenance">
                        <strong>{t(copy("Maintenance events"))}</strong>
                        {historyState.data.maintenanceEvents.length ? (
                          historyState.data.maintenanceEvents.map((event) => (
                            <div key={`${event.type}-${event.at}`} className="casesHistoryEvent">
                              <span>{event.type}</span>
                              <span>{event.operator}</span>
                              <span>{event.summary}</span>
                              <small>{event.at}</small>
                            </div>
                          ))
                        ) : (
                          <p className="casesPanelText">{t(copy("No maintenance events yet."))}</p>
                        )}
                      </div>
                    </section>
                    )
                : null}
            </div>

            <aside className="casesDetailSide">
              <section className="casesPanelCard">
                <div className="casesPanelTitle">{t(copy("Info"))}</div>
                <div className="casesMetaRow">
                  <span>{t(copy("Source"))}</span>
                  <strong>{`${openedCase.projectKey}.md`}</strong>
                </div>
                <div className="casesMetaRow">
                  <span>{t(copy("Tags"))}</span>
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
                  <span>{t(copy("Owner"))}</span>
                  <strong>Lin Chen</strong>
                </div>
                <div className="casesMetaRow">
                  <span>{t(copy("Last run"))}</span>
                  <strong className="successText">pass | 2m ago</strong>
                </div>
                <div className="casesMetaRow">
                  <span>{t(copy("Updated"))}</span>
                  <strong>{snapshot.cases.find((item) => item.id === openedCase.id)?.updatedAt ?? "--"}</strong>
                </div>
              </section>

              <section className="casesPanelCard">
                <div className="casesPanelTitle">{t(copy("Plans"))}</div>
                <div className="casesPlanRow">
                  <span className="casesPlanDot accent2">*</span>
                  <div>
                    <strong>{`plan.${openedCase.projectKey}.seed.v2`}</strong>
                    <p>{t(copy("Data plan seeds account and fixtures."))}</p>
                  </div>
                </div>
                <div className="casesPlanRow">
                  <span className="casesPlanDot accent3">*</span>
                  <div>
                    <strong>plan.restore.snapshot</strong>
                    <p>{t(copy("Restore from SQL snapshot after run."))}</p>
                  </div>
                </div>
                <div className="casesPlanRow">
                  <span className="casesPlanDot accent">*</span>
                  <div>
                    <strong>plan.diff.expected</strong>
                    <p>{t(copy("Compare the expected delta before sign-off."))}</p>
                  </div>
                </div>
              </section>

              <section className="casesPanelCard">
                <div className="casesPanelTitle">{t(copy("Recent runs"))}</div>
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
                <div className="casesPanelTitle">{t(copy("Catalog status"))}</div>
                <p className="casesPanelText">
                  {formatCopy(t(copy("Current project: {name}")), {
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
              <strong>{t(copy("Detail area is waiting"))}</strong>
              <p>{t(copy("Pick one case above and click Detail. The lower canvas will switch to the exact case-detail layout and enable Pre-execution."))}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
