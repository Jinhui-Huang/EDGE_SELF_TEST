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

export type MutationState = {
  kind: "idle" | "pending" | "success" | "error";
  message: string;
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
