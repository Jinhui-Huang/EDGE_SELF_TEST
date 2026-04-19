import { ScreenId } from "../types";

export const screenOrder: ScreenId[] = [
  "dashboard",
  "projects",
  "cases",
  "docParse",
  "aiGenerate",
  "execution",
  "monitor",
  "reports",
  "reportDetail",
  "models",
  "environments",
  "dataDiff",
  "dataTemplates",
  "plugin"
];

export const screenIcons: Record<ScreenId, string> = {
  dashboard: "◐",
  projects: "◫",
  cases: "◌",
  docParse: "◇",
  aiGenerate: "✦",
  execution: "▣",
  monitor: "◎",
  reports: "◪",
  reportDetail: "◈",
  models: "⚙",
  environments: "◍",
  dataDiff: "◨",
  dataTemplates: "◉",
  plugin: "◻"
};
