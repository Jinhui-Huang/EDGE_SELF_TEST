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
  detail: string;
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
