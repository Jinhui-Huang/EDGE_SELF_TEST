import { CopyValue, Locale } from "./types";

export function translate(locale: Locale, value: CopyValue): string {
  return typeof value === "string" ? value : value[locale] ?? value.en ?? value.zh ?? value.ja ?? "";
}

export const sharedCopy = {
  interactiveConsole: {
    en: "Interactive console",
    zh: "交互式控制台",
    ja: "対話型コンソール"
  },
  screen: {
    en: "Screen",
    zh: "页面",
    ja: "画面"
  },
  searchPlaceholder: {
    en: "Search projects, cases, runs...",
    zh: "搜索项目、用例、运行...",
    ja: "プロジェクト、ケース、実行を検索..."
  },
  sourceLocalApi: {
    en: "local admin API",
    zh: "本地管理 API",
    ja: "ローカル管理 API"
  },
  sourceFallback: {
    en: "fallback snapshot",
    zh: "回退快照",
    ja: "フォールバックスナップショット"
  },
  sourceFallbackWithError: {
    en: "Fallback snapshot ({error})",
    zh: "回退快照（{error}）",
    ja: "フォールバックスナップショット（{error}）"
  },
  pendingSubmitting: {
    en: "Submitting to local scheduler...",
    zh: "正在提交到本地调度器...",
    ja: "ローカルスケジューラへ送信しています..."
  },
  pendingConfig: {
    en: "Saving local config snapshot...",
    zh: "正在保存本地配置快照...",
    ja: "ローカル設定スナップショットを保存しています..."
  },
  pendingProjectCatalog: {
    en: "Saving local project catalog...",
    zh: "正在保存本地项目目录...",
    ja: "ローカルプロジェクトカタログを保存しています..."
  },
  pendingCaseCatalog: {
    en: "Saving local case catalog...",
    zh: "正在保存本地用例目录...",
    ja: "ローカルケースカタログを保存しています..."
  },
  launchQueued: {
    en: "Queued {runId} for {environment}.",
    zh: "已将 {runId} 加入 {environment} 队列。",
    ja: "{runId} を {environment} 向けキューに追加しました。"
  },
  reviewRecorded: {
    en: "Recorded review event for {runId}.",
    zh: "已记录 {runId} 的复核事件。",
    ja: "{runId} のレビューイベントを記録しました。"
  },
  errorKeepProject: {
    en: "Keep at least one project row with key, name, and scope before saving.",
    zh: "保存前至少保留一行包含键、名称和范围的项目。",
    ja: "保存前に、キー・名称・スコープを含むプロジェクト行を最低 1 行残してください。"
  },
  errorDuplicateProject: {
    en: "Duplicate project key: {key}",
    zh: "项目键重复：{key}",
    ja: "プロジェクトキーが重複しています: {key}"
  },
  savedProjectCatalog: {
    en: "Saved project catalog.",
    zh: "项目目录已保存。",
    ja: "プロジェクトカタログを保存しました。"
  },
  errorKeepCase: {
    en: "Keep at least one case row with id, project, and name before saving.",
    zh: "保存前至少保留一行包含 ID、项目和名称的用例。",
    ja: "保存前に、ID・プロジェクト・名称を含むケース行を最低 1 行残してください。"
  },
  errorDuplicateCase: {
    en: "Duplicate case id: {id}",
    zh: "用例 ID 重复：{id}",
    ja: "ケース ID が重複しています: {id}"
  },
  errorUnknownProject: {
    en: "Unknown project key for case {id}: {projectKey}",
    zh: "用例 {id} 的项目键不存在：{projectKey}",
    ja: "ケース {id} のプロジェクトキーが不明です: {projectKey}"
  },
  savedCaseCatalog: {
    en: "Saved case catalog.",
    zh: "用例目录已保存。",
    ja: "ケースカタログを保存しました。"
  },
  savedModelConfig: {
    en: "Saved model configuration.",
    zh: "模型配置已保存。",
    ja: "モデル設定を保存しました。"
  },
  savedEnvironmentConfig: {
    en: "Saved environment configuration.",
    zh: "环境配置已保存。",
    ja: "環境設定を保存しました。"
  },
  saving: {
    en: "Saving...",
    zh: "保存中...",
    ja: "保存中..."
  },
  queueing: {
    en: "Queueing...",
    zh: "排队中...",
    ja: "キュー投入中..."
  },
  recording: {
    en: "Recording...",
    zh: "记录中...",
    ja: "記録中..."
  },
  allProjects: {
    en: "All projects",
    zh: "全部项目",
    ja: "すべてのプロジェクト"
  },
  showArchivedRows: {
    en: "Show archived rows",
    zh: "显示归档行",
    ja: "アーカイブ行を表示"
  },
  updatedAt: {
    en: "Updated {time}",
    zh: "更新于 {time}",
    ja: "{time} に更新"
  },
  removeRow: {
    en: "Remove row",
    zh: "删除行",
    ja: "行を削除"
  },
  noCasesMatch: {
    en: "No cases match the current filter.",
    zh: "当前筛选下没有匹配的用例。",
    ja: "現在のフィルターに一致するケースはありません。"
  },
  noProjectsMatch: {
    en: "No projects match the current filter.",
    zh: "当前筛选下没有匹配的项目。",
    ja: "現在のフィルターに一致するプロジェクトはありません。"
  },
  noLinkedCases: {
    en: "No linked cases in the current snapshot.",
    zh: "当前快照中没有关联用例。",
    ja: "現在のスナップショットに関連ケースはありません。"
  },
  sidebarMain: {
    en: "Main platform",
    zh: "主平台",
    ja: "メインプラットフォーム"
  },
  sidebarDoc: {
    en: "AI authoring",
    zh: "文档 / AI",
    ja: "ドキュメント / AI"
  },
  sidebarRuntime: {
    en: "Runtime",
    zh: "运行态",
    ja: "ランタイム"
  },
  sidebarConfig: {
    en: "Configuration",
    zh: "配置",
    ja: "設定"
  },
  sidebarExtension: {
    en: "Extension",
    zh: "扩展",
    ja: "拡張"
  },
  sidebarFooter: {
    en: "v2 demo layout · grouped navigation · scaled artboard",
    zh: "v2 演示布局 · 分组导航 · 缩放画板",
    ja: "v2 デモレイアウト · グループ化ナビゲーション · スケールアートボード"
  }
} as const;

export function formatCopy(template: string, replacements: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(replacements[key] ?? ""));
}
