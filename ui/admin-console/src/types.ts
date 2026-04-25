import { FormEvent, ReactNode } from "react";

export type AdminConsoleSnapshot = {
  generatedAt: string;
  apiBasePath: string;
  summary: {
    eyebrow: string;
    title: string;
    description: string;
    runtimeStrategy: string;
  };
  navigation: Array<{
    id: string;
    label: string;
    summary: string;
  }>;
  stats: Array<{
    label: string;
    value: string;
    note: string;
  }>;
  projects: Array<{
    key: string;
    name: string;
    scope: string;
    suites: number;
    environments: number;
    note: string;
  }>;
  cases: Array<{
    id: string;
    projectKey: string;
    name: string;
    tags: string[];
    status: string;
    updatedAt: string;
    archived: boolean;
  }>;
  workQueue: Array<{
    title: string;
    owner: string;
    state: string;
    detail: string;
  }>;
  reports: Array<{
    runId?: string;
    runName: string;
    status: string;
    finishedAt: string;
    entry: string;
  }>;
  modelConfig: Array<{
    label: string;
    value: string;
  }>;
  environmentConfig: Array<{
    label: string;
    value: string;
  }>;
  timeline: Array<{
    time: string;
    title: string;
    detail: string;
  }>;
  constraints: string[];
  caseTags: string[];
};

export type SchedulerMutationForm = {
  runId: string;
  projectKey: string;
  owner: string;
  environment: string;
  targetUrl: string;
  executionModel: string;
  databaseId: string;
  detail: string;
};

export type DatabaseType = "Oracle" | "MySQL" | "PostgreSQL" | "SQL Server" | "MariaDB" | "DB2";

export type DatabaseConfig = {
  id: string;
  name: string;
  type: DatabaseType;
  driver: string;
  url: string;
  schema: string;
  username: string;
  password: string;
  mybatisEnv: string;
  note: string;
};

export type ModelProvider = {
  id: string;
  name: string;
  displayName: string;
  model: string;
  endpoint: string;
  apiKey: string;
  modality: string;
  contextWindow: string;
  maxOutputTokens: string;
  temperature: string;
  timeoutMs: string;
  status: "active" | "fallback" | "disabled";
  role: "primary" | "secondary" | "fallback";
  region: string;
  notes: string;
  usage: string;
  latency: string;
  cost: string;
  accent: "accent" | "accent2" | "accent3" | "accent4";
};

export type ModelRoutingRule = {
  id: string;
  task: string;
  primary: string;
  fallback: string[];
  reason: string;
};

export type PreparedCaseItem = {
  id: string;
  projectKey: string;
  name: string;
  status: string;
  tags: string[];
  updatedAt: string;
};

export type DataTemplateItem = {
  id: string;
  name: string;
  type: "sql" | "service" | "composite";
  envAllowed: string;
  risk: "low" | "medium" | "high";
  uses: number;
  rollback: "snapshot" | "sql" | "api" | "manual";
  projectKey: string;
  steps: string[];
  guards: string[];
  params: Array<{
    key: string;
    type: string;
    required?: boolean;
    value?: string;
  }>;
  compareSummary: string;
};

export type ConnectionValidationCheck = {
  name: string;
  status: string;
  message: string;
};

export type ConnectionValidationResult = {
  status: string;
  checks: ConnectionValidationCheck[];
  latencyMs?: number;
  resolvedModel?: string;
  resolvedDriver?: string;
  message: string;
  warnings: string[];
};

export type MutationState = {
  kind: "idle" | "pending" | "success" | "warning" | "error";
  message: string;
  validationResult?: ConnectionValidationResult;
};

export type ConfigItem = {
  label: string;
  value: string;
};

export type ProjectItem = {
  key: string;
  name: string;
  scope: string;
  environments: string;
  note: string;
};

export type ProjectImportPreviewRow = {
  key: string;
  name: string;
  scope: string;
  environments: string[];
  note: string;
  action: "create" | "update";
  warnings: string[];
};

export type ProjectImportConflict = {
  key: string;
  reason: string;
};

export type ProjectImportPreviewResponse = {
  status: string;
  kind: string;
  summary: {
    totalRows: number;
    createCount: number;
    updateCount: number;
    conflictCount: number;
  };
  rows: ProjectImportPreviewRow[];
  conflicts: ProjectImportConflict[];
};

export type ProjectImportCommitResponse = {
  status: string;
  kind: string;
  created: number;
  updated: number;
  totalProjects: number;
  path: string;
};

export type CaseItem = {
  id: string;
  projectKey: string;
  name: string;
  tags: string;
  status: string;
  archived: boolean;
};

export type Locale = "en" | "zh" | "ja";
export type ThemeMode = "light" | "dark";
export type ScreenId =
  | "dashboard"
  | "projects"
  | "cases"
  | "docParse"
  | "aiGenerate"
  | "execution"
  | "monitor"
  | "reports"
  | "reportDetail"
  | "models"
  | "environments"
  | "dataDiff"
  | "dataTemplates"
  | "plugin";

export type CopyValue = string | Record<Locale, string>;

export type TranslateFn = (value: CopyValue) => string;

export type MutationStateRenderer = (state: MutationState) => ReactNode;

export type ConfigSubmitHandler = (
  event: FormEvent<HTMLFormElement>,
  path: string,
  items: ConfigItem[],
  setState: (state: MutationState) => void,
  successMessage: string
) => void;

// ---- Monitor runtime types (P0-2) ----

export type RunStatus = {
  runId: string;
  projectKey: string;
  status: string;
  environment: string;
  model: string;
  owner: string;
  progress: {
    currentStep: number;
    totalSteps: number;
    percent: number;
    elapsedMs: number;
    estimatedTotalMs: number;
  };
  currentPage: {
    url: string;
    state: string;
  };
  counters: {
    assertionsPassed: number;
    assertionsTotal: number;
    aiCalls: number;
    heals: number;
  };
  control: {
    canPause: boolean;
    canAbort: boolean;
  };
  lastUpdatedAt: string;
};

export type RunStep = {
  index: number;
  label: string;
  state: "DONE" | "RUNNING" | "TODO";
  durationMs: number;
  startedAt?: string;
  note?: string;
};

export type RunStepsResponse = {
  runId: string;
  items: RunStep[];
};

export type RuntimeLogEntry = {
  at: string;
  type: string;
  model: string;
  summary: string;
};

export type RuntimeLogResponse = {
  runId: string;
  items: RuntimeLogEntry[];
  nextCursor: string | null;
};

export type LivePage = {
  runId: string;
  capturedAt: string;
  url: string;
  title: string;
  pageState: string;
  highlight: {
    stepIndex: number;
    action: string;
    target: string;
  };
  screenshotPath: string | null;
};

export type RunControlResponse = {
  status: string;
  kind: string;
  runId: string;
  requestedState: string;
  message: string;
};

// ---- AI generation flow types (P1-1) ----

export type GenerateCaseRequest = {
  projectKey: string;
  documentId: string;
  caseId: string;
  promptMode: "GENERATE" | "REGENERATE";
  operator: string;
};

export type GeneratedCaseCandidate = {
  id: string;
  name: string;
  category: string;
  confidence: string;
  summary: string;
};

export type GenerateCaseResponse = {
  documentId: string;
  selectedCaseId: string;
  generatedCases: GeneratedCaseCandidate[];
  reasoning: Array<{ label: string; body: string }>;
  selectedDsl: { format: string; content: string };
  stateMachine: {
    states: Array<{ id: string; label: string }>;
    edges: Array<{ from: string; to: string; trigger: string }>;
  };
  flowTree: Array<{ label: string; tone: string; indent: number }>;
};

export type DslValidateRequest = {
  projectKey: string;
  documentId: string;
  candidateId: string;
  dsl: string;
};

export type DslValidateResponse = {
  status: "VALID" | "INVALID";
  errors: Array<{ code: string; message: string }>;
  warnings: Array<{ code: string; message: string }>;
  normalizedDsl?: string;
};

export type DryRunRequest = {
  projectKey: string;
  documentId: string;
  candidateId: string;
  dsl: string;
  environment: string;
};

export type DryRunResponse = {
  status: "PASSED" | "FAILED";
  parser: { status: string; errors: Array<{ code: string; message: string }> };
  runtimeChecks: Array<{ name: string; status: string }>;
  suggestedLaunchForm?: { projectKey: string; environment: string };
};

// ---- Report artifact types (P1-2) ----

export type RunSummaryItem = {
  runId: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  stepsTotal: number;
  stepsPassed: number;
  assertionsTotal: number;
  assertionsPassed: number;
  artifactCount: number;
  outputDir: string;
};

export type RunListResponse = {
  items: RunSummaryItem[];
};

export type RunReportStep = {
  stepId: string;
  stepName: string;
  action: string;
  status: string;
  message: string | null;
  durationMs: number;
  artifactPath: string | null;
};

export type RunReportAssertion = {
  name: string;
  action: string;
  status: string;
  message: string;
  pass: boolean;
};

export type RunReportArtifact = {
  kind: string;
  label: string;
  path: string;
};

export type RunReport = RunSummaryItem & {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  steps: RunReportStep[];
  assertions: RunReportAssertion[];
  artifacts: RunReportArtifact[];
};

export type DataDiffRow = {
  table: string;
  pk: string;
  field: string;
  before: string;
  after: string;
  afterRestore: string;
  expected: boolean;
  restored: boolean;
};

export type DataDiffResponse = {
  runId: string;
  summary: {
    expectedChanges: number;
    unexpectedChanges: number;
    restoredCount: number;
    totalRows: number;
    affectedTables: number;
  };
  rows: DataDiffRow[];
};

// ---- Data template registry (P1-3) ----

export type DataTemplateListResponse = {
  items: DataTemplateItem[];
};

export type DataTemplateCreateResponse = {
  status: string;
  kind: string;
  templateId: string;
  updated: boolean;
};

export type DataTemplateUpdateResponse = {
  status: string;
  kind: string;
  templateId: string;
  updated: boolean;
};

export type DataTemplateDeleteResponse = {
  status: string;
  kind: string;
  templateId: string;
  remaining: number;
};

export type DataTemplateImportPreviewItem = {
  name: string;
  result: string;
  warnings: string[];
};

export type DataTemplateImportPreviewResponse = {
  status: string;
  previewId: string;
  items: DataTemplateImportPreviewItem[];
};

export type DataTemplateImportCommitResponse = {
  status: string;
  created: number;
  updated: number;
};

export type DataTemplateDryRunCheck = {
  name: string;
  status: string;
};

export type DataTemplateDryRunResponse = {
  status: string;
  templateId: string;
  checks: DataTemplateDryRunCheck[];
  auditRef: string;
};

// ---- Extension popup snapshot (P0-3) ----

export type ExtensionPopupSnapshot = {
  generatedAt: string;
  status: string;
  summary: string;
  page: {
    title: string;
    url: string;
    domain: string;
    lastUpdatedAt: string;
  };
  runtime: {
    mode: string;
    queueState: string;
    auditState: string;
    nextAction: string;
  };
  hints: string[];
};
