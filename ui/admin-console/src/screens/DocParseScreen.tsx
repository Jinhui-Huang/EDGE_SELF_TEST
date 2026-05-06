import { ChangeEvent, Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { translate } from "../i18n";
import {
  AdminConsoleSnapshot,
  DocumentParseResult,
  DocumentParseResultSaveResponse,
  DocumentRawResponse,
  DocumentReparseResponse,
  DocumentUploadResponse,
  DocumentVersionsResponse,
  Locale
} from "../types";

type DocParseScreenProps = {
  snapshot: AdminConsoleSnapshot;
  apiBaseUrl: string;
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

type VersionEntry = {
  id: string;
  label: string;
  time: string;
  summary: string;
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
  versions: VersionEntry[];
  reasoning: Array<{
    label: LocalizedCopy;
    body: LocalizedCopy;
  }>;
  missing: string[];
};

type TabKey = "parse" | "raw" | "hist";

type RemoteSectionState<T> = {
  status: "idle" | "loading" | "success" | "empty" | "error";
  data: T | null;
  message: string;
  documentId: string | null;
};

const copy = (en: string, zh = en, ja = en): LocalizedCopy => ({ en, zh, ja });

function toLocalizedCopy(value: string): LocalizedCopy {
  return copy(value);
}

function isNotFoundPayload(value: unknown): value is { status: string } {
  return value !== null && typeof value === "object" && "status" in value && (value as { status?: unknown }).status === "NOT_FOUND";
}

function toDocumentId(projectKey: string, fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  return `${projectKey}-${base}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildCaseCandidates(snapshot: AdminConsoleSnapshot, projectKey: string): CaseCandidate[] {
  const projectCases = snapshot.cases.filter((item) => item.projectKey === projectKey);
  const sourceCases = (projectCases.length ? projectCases : snapshot.cases.slice(0, 2)).map((item, index) => ({
    id: item.id,
    name: item.name,
    category: (index % 3 === 0 ? "happy" : index % 3 === 1 ? "exception" : "boundary") as CaseCandidate["category"],
    confidence: (index % 2 === 0 ? "high" : "medium") as CaseCandidate["confidence"]
  }));
  return sourceCases.length
    ? sourceCases
    : [{ id: `${projectKey}-smoke`, name: `${projectKey} smoke`, category: "happy", confidence: "high" }];
}

function createDocument(
  snapshot: AdminConsoleSnapshot,
  project: AdminConsoleSnapshot["projects"][number],
  fileName: string,
  status: ParsedDocument["status"],
  updatedAt: string,
  model: string,
  subtitle: string,
  rawDocument: string,
  reasoning: Array<{ label: LocalizedCopy; body: LocalizedCopy }>,
  missing: string[]
): ParsedDocument {
  const cases = buildCaseCandidates(snapshot, project.key);
  const documentId = toDocumentId(project.key, fileName);
  return {
    id: documentId,
    name: fileName,
    projectKey: project.key,
    projectName: project.name,
    status,
    updatedAt,
    model,
    detectedCases: cases.length,
    subtitle,
    cases,
    rawDocument,
    versions: [
      { id: `${documentId}-v2`, label: "v2", time: updatedAt, summary: "Latest synthetic review snapshot." },
      { id: `${documentId}-v1`, label: "v1", time: snapshot.generatedAt, summary: "Initial synthetic document seed." }
    ],
    reasoning,
    missing
  };
}

function buildDocuments(snapshot: AdminConsoleSnapshot): ParsedDocument[] {
  return snapshot.projects.flatMap((project, projectIndex) => {
    const cases = buildCaseCandidates(snapshot, project.key);
    const updatedAt = snapshot.cases.find((item) => item.projectKey === project.key)?.updatedAt ?? snapshot.generatedAt;
    const primaryName = projectIndex === 0 ? "checkout-regression-v3.md" : `${project.key}-requirements-v${projectIndex + 2}.md`;
    const changeName = `${project.key}-change-note-${projectIndex + 1}.md`;

    const primary = createDocument(
      snapshot,
      project,
      primaryName,
      "Parsed",
      updatedAt,
      "claude-4.5",
      `Parsed recently / claude-4.5 / ${cases.length} cases detected`,
      `# ${project.name}\n\nScope: ${project.scope}\n\nScenarios:\n${cases.map((item) => `- ${item.name}`).join("\n")}`,
      [
        {
          label: copy("Structure"),
          body: copy(`Grouped the source text into ${cases.length} executable scenarios.`)
        },
        {
          label: copy("Coverage"),
          body: copy("UI flow, assertions, and data-plan placeholders were extracted together.")
        }
      ],
      ["Expected stock decrement delta", "DB seed baseline"]
    );

    const change = createDocument(
      snapshot,
      project,
      changeName,
      "Changed",
      snapshot.generatedAt,
      projectIndex % 2 === 0 ? "gpt-5.4" : "claude-4.5",
      `Change note / ${Math.max(1, cases.length - 1)} cases impacted / model ${projectIndex % 2 === 0 ? "gpt-5.4" : "claude-4.5"}`,
      `# ${project.name} change note\n\n- UI copy updated\n- Validation changed\n- Review impacted flows`,
      [
        {
          label: copy("Impact"),
          body: copy("Change notes were ranked before generation so impacted scenarios stay focused.")
        }
      ],
      ["Updated assertion wording"]
    );

    return [primary, change];
  });
}

function mergeDocuments(baseDocuments: ParsedDocument[], sessionDocuments: ParsedDocument[]): ParsedDocument[] {
  const merged = new Map<string, ParsedDocument>();
  for (const document of baseDocuments) {
    merged.set(document.id, document);
  }
  for (const document of sessionDocuments) {
    const existing = merged.get(document.id);
    merged.set(document.id, existing ? { ...existing, ...document } : document);
  }
  return Array.from(merged.values());
}

function renderSectionState(
  locale: Locale,
  state: RemoteSectionState<unknown>,
  loading: LocalizedCopy,
  fallbackEmpty: LocalizedCopy
) {
  const t = (value: LocalizedCopy) => translate(locale, value);
  if (state.status === "loading") {
    return (
      <div className="casesLockedState">
        <div className="casesLockedCard">
          <strong>{t(loading)}</strong>
        </div>
      </div>
    );
  }
  if (state.status === "empty" || state.status === "error") {
    return (
      <div className="casesLockedState">
        <div className="casesLockedCard">
          <strong>{state.message || t(fallbackEmpty)}</strong>
        </div>
      </div>
    );
  }
  return null;
}

export function DocParseScreen({ snapshot, apiBaseUrl, title, locale, onOpenAiGenerate }: DocParseScreenProps) {
  const t = (value: LocalizedCopy) => translate(locale, value);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sessionDocuments, setSessionDocuments] = useState<ParsedDocument[]>([]);
  const [documents, setDocuments] = useState<ParsedDocument[]>(() => buildDocuments(snapshot));
  const [selectedProjectKey, setSelectedProjectKey] = useState(snapshot.projects[0]?.key ?? "");
  const [openedDocumentId, setOpenedDocumentId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("parse");
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [manualEditMode, setManualEditMode] = useState(false);
  const [manualEditDraft, setManualEditDraft] = useState("");
  const [parseResultState, setParseResultState] = useState<RemoteSectionState<DocumentParseResult>>({
    status: "idle",
    data: null,
    message: "",
    documentId: null
  });
  const [rawState, setRawState] = useState<RemoteSectionState<DocumentRawResponse>>({
    status: "idle",
    data: null,
    message: "",
    documentId: null
  });
  const [versionsState, setVersionsState] = useState<RemoteSectionState<DocumentVersionsResponse>>({
    status: "idle",
    data: null,
    message: "",
    documentId: null
  });

  const applyDocumentUpdate = useCallback((documentId: string, updater: (document: ParsedDocument) => ParsedDocument) => {
    setDocuments((current) => current.map((document) => (document.id === documentId ? updater(document) : document)));
    setSessionDocuments((current) => current.map((document) => (document.id === documentId ? updater(document) : document)));
  }, []);

  const applyParseResultToDocument = useCallback(
    (documentId: string, parseResult: DocumentParseResult) => {
      applyDocumentUpdate(documentId, (document) => ({
        ...document,
        status: "Parsed",
        cases: parseResult.detectedCases.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category as CaseCandidate["category"],
          confidence: item.confidence as CaseCandidate["confidence"]
        })),
        detectedCases: parseResult.detectedCases.length,
        reasoning: parseResult.reasoning.map((item) => ({
          label: toLocalizedCopy(item.label),
          body: toLocalizedCopy(item.body)
        })),
        missing: parseResult.missing
      }));
    },
    [applyDocumentUpdate]
  );

  const applyRawToDocument = useCallback(
    (documentId: string, raw: DocumentRawResponse) => {
      applyDocumentUpdate(documentId, (document) => ({
        ...document,
        name: raw.name,
        rawDocument: raw.content
      }));
    },
    [applyDocumentUpdate]
  );

  const applyVersionsToDocument = useCallback(
    (documentId: string, versions: DocumentVersionsResponse) => {
      applyDocumentUpdate(documentId, (document) => ({
        ...document,
        versions: versions.items,
        updatedAt: versions.items[0]?.time ?? document.updatedAt
      }));
    },
    [applyDocumentUpdate]
  );

  const upsertSessionDocument = useCallback(
    (projectKey: string, fileName: string, documentId: string) => {
      const project = snapshot.projects.find((item) => item.key === projectKey);
      if (!project) {
        return;
      }
      setSessionDocuments((current) => {
        const existing = current.find((item) => item.id === documentId);
        if (existing) {
          return current.map((item) =>
            item.id === documentId
              ? {
                  ...item,
                  name: fileName,
                  status: "Parsed",
                  subtitle: "Uploaded / waiting for backend hydration"
                }
              : item
          );
        }
        const uploaded = createDocument(
          snapshot,
          project,
          fileName,
          "Parsed",
          snapshot.generatedAt,
          "claude-4.5",
          "Uploaded / waiting for backend hydration",
          `# ${fileName}\n\nUploaded document placeholder`,
          [
            {
              label: copy("Upload"),
              body: copy("Uploaded document is waiting for backend hydration.")
            }
          ],
          []
        );
        return [uploaded, ...current];
      });
      setOpenedDocumentId(documentId);
      setActiveTab("parse");
      setOverviewCollapsed(true);
    },
    [snapshot]
  );

  const fetchDocumentSection = useCallback(
    async <T,>(
      url: string,
      documentId: string,
      setState: Dispatch<SetStateAction<RemoteSectionState<T>>>,
      emptyMessage: LocalizedCopy
    ) => {
      setState({ status: "loading", data: null, message: "", documentId });
      try {
        const response = await fetch(url);
        const payload = (await response.json()) as T | { status: string };
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        if (isNotFoundPayload(payload)) {
          setState({ status: "empty", data: null, message: t(emptyMessage), documentId });
          return null;
        }
        setState({ status: "success", data: payload as T, message: "", documentId });
        return payload as T;
      } catch {
        setState({
          status: "error",
          data: null,
          message: t(copy("Failed to load document detail.")),
          documentId
        });
        return null;
      }
    },
    [t]
  );

  const refreshDocumentDetails = useCallback(
    async (documentId: string) => {
      const [parseResult, rawDocument, versions] = await Promise.all([
        fetchDocumentSection<DocumentParseResult>(
          `${apiBaseUrl}/api/phase3/documents/${documentId}/parse-result`,
          documentId,
          setParseResultState,
          copy("No persisted parse result yet.")
        ),
        fetchDocumentSection<DocumentRawResponse>(
          `${apiBaseUrl}/api/phase3/documents/${documentId}/raw`,
          documentId,
          setRawState,
          copy("No raw document stored yet.")
        ),
        fetchDocumentSection<DocumentVersionsResponse>(
          `${apiBaseUrl}/api/phase3/documents/${documentId}/versions`,
          documentId,
          setVersionsState,
          copy("No version history yet.")
        )
      ]);

      if (parseResult) {
        applyParseResultToDocument(documentId, parseResult);
      }
      if (rawDocument) {
        applyRawToDocument(documentId, rawDocument);
      }
      if (versions) {
        applyVersionsToDocument(documentId, versions);
      }
    },
    [apiBaseUrl, applyParseResultToDocument, applyRawToDocument, applyVersionsToDocument, fetchDocumentSection]
  );

  const handleUploadToBackend = useCallback(
    async (fileName: string, content: string, projectKey: string) => {
      setActionStatus(t(copy("Uploading...")));
      try {
        const response = await fetch(`${apiBaseUrl}/api/phase3/documents/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectKey, fileName, content })
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload: DocumentUploadResponse = await response.json();
        const uploaded = payload.uploaded[0];
        if (uploaded) {
          upsertSessionDocument(projectKey, fileName, uploaded.id);
          await refreshDocumentDetails(uploaded.id);
        }
        setActionStatus(t(copy("Upload complete")));
        return payload;
      } catch {
        setActionStatus(t(copy("Upload failed")));
        return null;
      }
    },
    [apiBaseUrl, refreshDocumentDetails, t, upsertSessionDocument]
  );

  const handleReparse = useCallback(
    async (documentId: string) => {
      setActionStatus(t(copy("Re-parsing...")));
      try {
        const response = await fetch(`${apiBaseUrl}/api/phase3/documents/${documentId}/reparse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operator: "operator" })
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload: DocumentReparseResponse = await response.json();
        setActionStatus(payload.status === "ACCEPTED" ? t(copy("Re-parse complete")) : t(copy("Document not found")));
        if (payload.status === "ACCEPTED") {
          await refreshDocumentDetails(documentId);
        }
      } catch {
        setActionStatus(t(copy("Re-parse failed")));
      }
    },
    [apiBaseUrl, refreshDocumentDetails, t]
  );

  const handleSaveParseResult = useCallback(
    async (documentId: string) => {
      setActionStatus(t(copy("Saving...")));
      try {
        const detectedCases = JSON.parse(manualEditDraft);
        const response = await fetch(`${apiBaseUrl}/api/phase3/documents/${documentId}/parse-result`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updatedBy: "operator", changes: { detectedCases } })
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload: DocumentParseResultSaveResponse = await response.json();
        setActionStatus(payload.status === "ACCEPTED" ? t(copy("Saved")) : t(copy("Document not found")));
        setManualEditMode(false);
        if (payload.status === "ACCEPTED") {
          await refreshDocumentDetails(documentId);
        }
      } catch {
        setActionStatus(t(copy("Invalid JSON or save failed")));
      }
    },
    [apiBaseUrl, manualEditDraft, refreshDocumentDetails, t]
  );

  useEffect(() => {
    setDocuments(mergeDocuments(buildDocuments(snapshot), sessionDocuments));
  }, [sessionDocuments, snapshot]);

  useEffect(() => {
    if (!snapshot.projects.some((item) => item.key === selectedProjectKey)) {
      setSelectedProjectKey(snapshot.projects[0]?.key ?? "");
    }
  }, [selectedProjectKey, snapshot.projects]);

  useEffect(() => {
    if (!openedDocumentId) {
      setParseResultState({ status: "idle", data: null, message: "", documentId: null });
      setRawState({ status: "idle", data: null, message: "", documentId: null });
      setVersionsState({ status: "idle", data: null, message: "", documentId: null });
      return;
    }
    void refreshDocumentDetails(openedDocumentId);
  }, [openedDocumentId, refreshDocumentDetails]);

  const visibleDocuments = useMemo(
    () => documents.filter((item) => item.projectKey === selectedProjectKey),
    [documents, selectedProjectKey]
  );

  const openedDocument = visibleDocuments.find((item) => item.id === openedDocumentId) ?? null;
  const selectedProject = snapshot.projects.find((item) => item.key === selectedProjectKey) ?? snapshot.projects[0] ?? null;
  const selectedCase = openedDocument?.cases.find((item) => item.id === selectedCaseId) ?? openedDocument?.cases[0] ?? null;

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
    const fileList = event.target.files;
    if (!fileList?.length) {
      return;
    }
    const names = Array.from(fileList).map((item) => item.name);
    setUploadedFiles((current) => [...names, ...current].slice(0, 6));

    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = typeof reader.result === "string" ? reader.result : "";
        void handleUploadToBackend(file.name, content, selectedProjectKey);
      };
      reader.readAsText(file);
    });

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
            <p className="eyebrow">{t(copy("Projects / documents"))}</p>
            <h2>{title}</h2>
            <p className="docParseOverviewLead">{t(copy("Review parsed documents here before handing focused cases into AI Generate."))}</p>
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
            <span className="casesRailLabel">{t(copy("Project switch"))}</span>
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
                      <span>{t(copy("Docs"))}</span>
                      <span>{t(copy("Cases"))}: {projectDocuments.reduce((sum, item) => sum + item.detectedCases, 0)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="docParseDocumentPanel">
            <div className="casesListPanelHead">
              <div>
                <p className="eyebrow">{t(copy("Document catalog"))}</p>
                <h3>{selectedProject?.name ?? t(copy("No project"))}</h3>
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
                      <span>{document.detectedCases} {t(copy("cases"))}</span>
                      <span>{document.versions.length} {t(copy("versions"))}</span>
                    </div>
                    <button type="button" className="casesInlineAction" onClick={() => handleOpenDocument(document)}>
                      {isOpened ? t(copy("Opened")) : t(copy("Detail"))}
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
            ? `${t(copy("Projects"))} / ${openedDocument.projectName} / ${t(copy("Documents"))}`
            : t(copy("Projects / Pick one document above"))}
        </div>

        <div className="docParseHero">
          <div>
            <div className="docParseHeroTitleRow">
              <h3>{openedDocument?.name ?? t(copy("Document detail locked"))}</h3>
              <span className="casesHappyBadge">{openedDocument?.status ?? t(copy("Locked"))}</span>
            </div>
            <p className="docParseHeroSubtitle">
              {openedDocument?.subtitle ?? t(copy("Open one document above to load the parse canvas."))}
            </p>
          </div>

          <div className="docParseHeroActions">
            <button type="button" className="casesActionButton ghost" disabled={!openedDocument} onClick={() => openedDocument && handleReparse(openedDocument.id)}>
              {t(copy("Re-parse"))}
            </button>
            <button
              type="button"
              className="casesActionButton secondary"
              disabled={!openedDocument}
              onClick={() => {
                if (openedDocument) {
                  setManualEditMode(true);
                  setManualEditDraft(JSON.stringify(openedDocument.cases, null, 2));
                }
              }}
            >
              {t(copy("Manual edit"))}
            </button>
            <button type="button" className="casesActionButton primary" disabled={!openedDocument || !selectedCase} onClick={() => openAiGenerate(selectedCase?.id ?? "")}>
              {t(copy("Generate tests"))}
            </button>
          </div>
        </div>

        {actionStatus ? (
          <div className="docParseActionStatus">
            <span>{actionStatus}</span>
            <button type="button" className="docParseDismiss" onClick={() => setActionStatus(null)}>
              x
            </button>
          </div>
        ) : null}

        {manualEditMode && openedDocument ? (
          <div className="docParseManualEdit">
            <div className="casesPanelHead">
              <div className="casesPanelTitle">{t(copy("Manual edit - detected cases"))}</div>
              <div className="casesPanelActions">
                <button type="button" className="casesActionButton ghost" onClick={() => setManualEditMode(false)}>
                  {t(copy("Cancel"))}
                </button>
                <button type="button" className="casesActionButton primary" onClick={() => handleSaveParseResult(openedDocument.id)}>
                  {t(copy("Save"))}
                </button>
              </div>
            </div>
            <textarea className="casesDslEditor" rows={12} value={manualEditDraft} onChange={(event) => setManualEditDraft(event.target.value)} />
          </div>
        ) : null}

        <div className="docParseTabs">
          <div className="docParseTabRail">
            {([
              ["parse", copy("Parse result")],
              ["raw", copy("Raw document")],
              ["hist", copy("Version history")]
            ] as Array<[TabKey, LocalizedCopy]>).map(([key, label]) => (
              <button key={key} type="button" className={`docParseTab ${activeTab === key ? "isActive" : ""}`} disabled={!openedDocument} onClick={() => setActiveTab(key)}>
                {t(label)}
              </button>
            ))}
          </div>

          <div className="docParseTabActions">
            <button type="button" className="docParseUploadButton" onClick={() => fileInputRef.current?.click()}>
              {t(copy("Upload file"))}
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
                    <div className="docParsePanelTitle">{t(copy("Cases detected"))}</div>
                    <span className="docParseDocumentBadge info">{openedDocument.detectedCases}</span>
                  </div>
                  {parseResultState.documentId === openedDocument.id && parseResultState.status !== "success" ? (
                    <div className="docParseActionStatus">
                      <span>{parseResultState.status === "loading" ? t(copy("Loading parse result...")) : parseResultState.message}</span>
                    </div>
                  ) : null}
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
                    <p className="docParsePanelSubtitle">
                      {t(copy("Parse detail prefers backend data and falls back only when the selected shell document has not been persisted yet."))}
                    </p>
                  </div>
                  <div className="docParseResultBody">
                    <div className="docParseBlock">
                      <span className="docParseBlockLabel accent2">{t(copy("Test goal"))}</span>
                      <p>{`${selectedCase?.name ?? openedDocument.name} is translated into one end-to-end flow with UI, email, and DB checkpoints.`}</p>
                    </div>
                    <div className="docParseBlock">
                      <span className="docParseBlockLabel success">{t(copy("Reasoning"))}</span>
                      <ul className="docParseChecklist success">
                        {openedDocument.reasoning.map((item) => (
                          <li key={item.label.en}>
                            <strong>{t(item.label)}:</strong> {t(item.body)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="docParseBlock">
                      <span className="docParseBlockLabel danger">{t(copy("Missing / please fill"))}</span>
                      <ul className="docParseChecklist danger">
                        {(openedDocument.missing.length ? openedDocument.missing : [t(copy("No missing items."))]).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                <aside className="docParsePanel docParseReasoningPanel">
                  <div className="docParsePanelHead">
                    <div className="docParsePanelTitle">{t(copy("AI reasoning"))}</div>
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
                    <div className="docParsePanelTitle">{t(copy("Raw source"))}</div>
                    <span className="docParseDocumentBadge neutral">{openedDocument.name}</span>
                  </div>
                  {rawState.documentId === openedDocument.id && rawState.status === "success" && rawState.data ? (
                    <div className="docParseRawBody">
                      <pre>{rawState.data.content}</pre>
                      <aside className="docParseUploadList">
                        <strong>{t(copy("Uploaded in tab bar"))}</strong>
                        {uploadedFiles.length ? uploadedFiles.map((item) => <span key={item}>{item}</span>) : <span>{t(copy("No uploaded files yet"))}</span>}
                      </aside>
                    </div>
                  ) : renderSectionState(locale, rawState, copy("Loading raw document..."), copy("No raw document stored yet."))}
                </section>
              </div>
            ) : null}

            {activeTab === "hist" ? (
              <div className="docParseSinglePanel">
                <section className="docParsePanel">
                  <div className="docParsePanelHead">
                    <div className="docParsePanelTitle">{t(copy("Version history"))}</div>
                    <span className="docParseDocumentBadge warning">{openedDocument.versions.length}</span>
                  </div>
                  {versionsState.documentId === openedDocument.id && versionsState.status === "success" && versionsState.data ? (
                    <div className="docParseHistoryList">
                      {versionsState.data.items.length ? versionsState.data.items.map((version) => (
                        <article key={version.id} className="docParseHistoryRow">
                          <div className="docParseHistoryTag">{version.label}</div>
                          <div className="docParseHistoryBody">
                            <strong>{version.time}</strong>
                            <p>{version.summary}</p>
                          </div>
                        </article>
                      )) : (
                        <div className="casesLockedState">
                          <div className="casesLockedCard">
                            <strong>{t(copy("No version history yet."))}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : renderSectionState(locale, versionsState, copy("Loading version history..."), copy("No version history yet."))}
                </section>
              </div>
            ) : null}
          </>
        ) : (
          <div className="casesLockedState">
            <div className="casesLockedCard">
              <strong>{t(copy("Document detail area is waiting"))}</strong>
              <p>{t(copy("Pick one document above and click Detail."))}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
