import { FormEvent, useEffect, useState } from "react";
import { CasesScreen } from "./screens/CasesScreen";
import { ConfigScreen } from "./screens/ConfigScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { DataDiffScreen } from "./screens/DataDiffScreen";
import { DataTemplatesScreen } from "./screens/DataTemplatesScreen";
import { DocParseScreen } from "./screens/DocParseScreen";
import { ExecutionScreen } from "./screens/ExecutionScreen";
import { AiGenerateScreen } from "./screens/AiGenerateScreen";
import { formatCopy, sharedCopy } from "./i18n";
import { MonitorScreen } from "./screens/MonitorScreen";
import { PluginPopupScreen } from "./screens/PluginPopupScreen";
import { ProjectsScreen } from "./screens/ProjectsScreen";
import { ReportDetailScreen } from "./screens/ReportDetailScreen";
import { ReportsScreen } from "./screens/ReportsScreen";
import { screenOrder } from "./tokens/shell";
import {
  AdminConsoleSnapshot,
  CaseItem,
  ConfigItem,
  CopyValue,
  Locale,
  MutationState,
  ProjectItem,
  SchedulerMutationForm,
  ScreenId,
  ThemeMode
} from "./types";
import { Sidebar } from "./ui-kit/Sidebar";
import { TopBar } from "./ui-kit/TopBar";

const fallbackSnapshot: AdminConsoleSnapshot = {
  generatedAt: "local-fallback",
  apiBasePath: "/api/phase3",
  summary: {
    eyebrow: "Phase 3 Shell",
    title: "Enterprise Web Test Platform",
    description:
      "The platform shell is ready before runtime AI and native wiring. If the local API is offline, the console falls back to this embedded snapshot.",
    runtimeStrategy: "Rule-first runtime AI with audited recommendations"
  },
  navigation: [
    { id: "dashboard", label: "Dashboard", summary: "Platform load, risk, and queue visibility" },
    { id: "projects", label: "Projects", summary: "Project list and detail entry" },
    { id: "cases", label: "Cases", summary: "Case catalog, tags, and maintenance status" },
    { id: "docParse", label: "Doc Parse", summary: "Upload documents and review extracted intents" },
    { id: "aiGenerate", label: "AI Generate", summary: "Assemble prompts, policy, and output plans" },
    { id: "execution", label: "Execution", summary: "Start runs, inspect queue, and preflight" },
    { id: "monitor", label: "Exec Monitor", summary: "Observe live queue pressure and runtime events" },
    { id: "reports", label: "Reports", summary: "Recent runs, failures, and maintenance" },
    { id: "reportDetail", label: "Report Detail", summary: "Inspect a focused run narrative and artifacts" },
    { id: "models", label: "Model Config", summary: "Model access and audit toggles" },
    { id: "environments", label: "Environment Config", summary: "Target environments and browser pools" },
    { id: "dataDiff", label: "Data Diff", summary: "Track DB change previews and restore checkpoints" },
    { id: "dataTemplates", label: "Data Templates", summary: "Manage reusable seed and teardown recipes" },
    { id: "plugin", label: "Plugin Popup", summary: "Keep popup scope aligned with the platform" }
  ],
  stats: [
    { label: "Active projects", value: "12", note: "3 projects need failure triage this week" },
    { label: "Queued runs", value: "8", note: "2 are high-priority smoke checks" },
    { label: "24h success rate", value: "94.2%", note: "Down 1.8% from the prior day" },
    { label: "AI recommendation acceptance", value: "71%", note: "Suggestions remain audit-only in Phase 3" }
  ],
  projects: [
    {
      key: "checkout-web",
      name: "checkout-web",
      scope: "Payment journey",
      suites: 18,
      environments: 7,
      note: "2 failed cases still need locator repair review"
    },
    {
      key: "member-center",
      name: "member-center",
      scope: "Account and profile flows",
      suites: 11,
      environments: 3,
      note: "1 new environment variance detected this week"
    },
    {
      key: "ops-console",
      name: "ops-console",
      scope: "Operations back office",
      suites: 9,
      environments: 2,
      note: "Last two scheduled runs were stable"
    }
  ],
  cases: [
    {
      id: "checkout-smoke",
      projectKey: "checkout-web",
      name: "Checkout smoke",
      tags: ["smoke", "payment"],
      status: "ACTIVE",
      updatedAt: "2026-04-18 18:05",
      archived: false
    },
    {
      id: "checkout-regression-card",
      projectKey: "checkout-web",
      name: "Checkout card regression",
      tags: ["regression", "locator-repair-needed"],
      status: "ACTIVE",
      updatedAt: "2026-04-18 17:42",
      archived: false
    },
    {
      id: "member-profile-save",
      projectKey: "member-center",
      name: "Profile save",
      tags: ["profile", "regression"],
      status: "ACTIVE",
      updatedAt: "2026-04-18 16:55",
      archived: false
    }
  ],
  workQueue: [
    {
      title: "payment-smoke / prod-like",
      owner: "qa-platform",
      state: "Waiting",
      detail: "Run starts after the locked environment is released"
    },
    {
      title: "account-regression / staging",
      owner: "team-growth",
      state: "Needs review",
      detail: "Recent locator repair suggestion was rejected by policy"
    },
    {
      title: "report-retention-audit",
      owner: "ops",
      state: "In progress",
      detail: "Cleanup dry-run is ready for operator review"
    }
  ],
  reports: [
    { runName: "dsl-smoke-run", status: "SUCCESS", finishedAt: "2026-04-18 18:22", entry: "HTML / artifacts / cleanup" },
    { runName: "checkout-web-nightly", status: "FAILED", finishedAt: "2026-04-18 09:10", entry: "Failure analysis pending" },
    { runName: "quota-cleanup-dry-run", status: "INFO", finishedAt: "2026-04-18 18:46", entry: "Maintenance diagnostics only" }
  ],
  modelConfig: [
    { label: "Provider", value: "OpenAI-compatible placeholder" },
    { label: "Mode", value: "Audit-first / recommendation-only" },
    { label: "Output guard", value: "JSON schema plus rule validation" }
  ],
  environmentConfig: [
    { label: "Browser pool", value: "Edge stable / staging" },
    { label: "Account slots", value: "smoke_bot_01, ops_audit_02" },
    { label: "Data policy", value: "Read-only mock scope for Phase 3 shell" }
  ],
  timeline: [
    { time: "09:10", title: "checkout-web run finished", detail: "72 steps, 1 failure, payment button locator mismatch" },
    { time: "10:35", title: "report retention dry-run completed", detail: "Cleanup preview generated without deleting files" },
    { time: "11:20", title: "staging-edge environment locked", detail: "Waiting for smoke suite to release browser capacity" }
  ],
  constraints: [
    "Runtime AI can recommend but cannot directly drive browser actions.",
    "Phase 3 pages stay within platform management scope and exclude Phase 5 document flows.",
    "The Edge extension remains a lightweight assistive entry point."
  ],
  caseTags: ["smoke", "regression", "locator-repair-needed", "depends-on-test-data"]
};

const screenCopy: Record<ScreenId, { title: CopyValue; description: CopyValue }> = {
  dashboard: {
    title: {
      en: "Operations overview",
      zh: "平台总览",
      ja: "運用ダッシュボード"
    },
    description: {
      en: "Track platform state, execution readiness, and audit pressure from one control surface.",
      zh: "在统一控制面上查看平台状态、执行准备度和审计压力。",
      ja: "単一の管理画面でプラットフォーム状態、実行準備、監査負荷を確認します。"
    }
  },
  projects: {
    title: {
      en: "Project catalog",
      zh: "项目目录",
      ja: "プロジェクトカタログ"
    },
    description: {
      en: "Maintain project metadata without changing the existing file-backed contract.",
      zh: "在不改变现有文件持久化合同的前提下维护项目元数据。",
      ja: "既存のファイル永続化契約を変えずにプロジェクト情報を維持します。"
    }
  },
  cases: {
    title: {
      en: "Case management",
      zh: "用例管理",
      ja: "ケース管理"
    },
    description: {
      en: "Keep case rows editable while preserving Phase 3 shell depth and lightweight validation.",
      zh: "保持用例可编辑，同时维持 Phase 3 shell 深度与轻量校验边界。",
      ja: "Phase 3 の軽量境界を保ったままケース行を編集可能にします。"
    }
  },
  docParse: {
    title: {
      en: "Document parse",
      zh: "文档解析",
      ja: "ドキュメント解析"
    },
    description: {
      en: "Review source documents, extracted intents, and case candidates before generation.",
      zh: "在生成前审阅源文档、抽取意图和候选用例。",
      ja: "生成前にソース文書、抽出された意図、候補ケースを確認します。"
    }
  },
  aiGenerate: {
    title: {
      en: "AI generate",
      zh: "AI 生成",
      ja: "AI 生成"
    },
    description: {
      en: "Assemble prompt context, policy constraints, and planned output artifacts in one workspace.",
      zh: "在同一工作区组装提示上下文、策略约束和产出物规划。",
      ja: "同じワークスペースでプロンプト文脈、ポリシー制約、出力計画を組み立てます。"
    }
  },
  execution: {
    title: {
      en: "Execution center",
      zh: "执行中心",
      ja: "実行センター"
    },
    description: {
      en: "Queue runs, review scheduler pressure, and record audit intervention from the same screen.",
      zh: "在同一屏内发起运行、查看调度压力并记录审计介入。",
      ja: "同一画面で実行投入、スケジューラ状況確認、監査介入記録を行います。"
    }
  },
  reports: {
    title: {
      en: "Report stream",
      zh: "报告流",
      ja: "レポート一覧"
    },
    description: {
      en: "Review recent runs, terminal statuses, and timeline events that drive operator follow-up.",
      zh: "查看最近运行、最终状态以及驱动后续处理的时间线事件。",
      ja: "最近の実行、最終状態、後続対応につながるイベントを確認します。"
    }
  },
  monitor: {
    title: {
      en: "Execution monitor",
      zh: "执行监控",
      ja: "実行モニター"
    },
    description: {
      en: "Watch queue pressure, active lanes, and recent scheduler events in a live-style board.",
      zh: "在类实时看板中查看队列压力、活动通道和调度事件。",
      ja: "ライブ風ボードでキュー圧力、実行レーン、直近イベントを確認します。"
    }
  },
  reportDetail: {
    title: {
      en: "Report detail",
      zh: "报告详情",
      ja: "レポート詳細"
    },
    description: {
      en: "Focus on one run, its outcome, audit constraints, and the event narrative behind it.",
      zh: "聚焦单次运行、结果、审计约束以及背后的事件叙事。",
      ja: "単一実行の結果、監査制約、その背後にあるイベントの流れを確認します。"
    }
  },
  models: {
    title: {
      en: "Model policy",
      zh: "模型策略",
      ja: "モデル方針"
    },
    description: {
      en: "Keep runtime AI audit-first, with simple writable settings that remain easy to reason about.",
      zh: "保持运行时 AI 审计优先，并提供可理解的可写配置。",
      ja: "監査優先のランタイム AI 方針を、理解しやすい設定として維持します。"
    }
  },
  environments: {
    title: {
      en: "Environment policy",
      zh: "环境策略",
      ja: "環境ポリシー"
    },
    description: {
      en: "Maintain browser pools and environment rules in the same platform frame as the other operators.",
      zh: "在同一平台框架内维护浏览器池与环境规则。",
      ja: "同じプラットフォーム枠組みの中でブラウザプールと環境ルールを管理します。"
    }
  },
  dataDiff: {
    title: {
      en: "Data diff",
      zh: "数据差分",
      ja: "データ差分"
    },
    description: {
      en: "Compare before/after snapshots and keep restore checkpoints visible to operators.",
      zh: "对比前后快照，并让还原检查点对操作员可见。",
      ja: "前後スナップショットを比較し、復元チェックポイントを見える化します。"
    }
  },
  dataTemplates: {
    title: {
      en: "Data templates",
      zh: "数据模板",
      ja: "データテンプレート"
    },
    description: {
      en: "Manage reusable seed, teardown, and rollback recipes without changing the current backend contract.",
      zh: "在不变更当前后端协议的前提下管理可复用的预置、清理和回滚方案。",
      ja: "現行バックエンド契約を変えずに再利用可能な投入・後始末・ロールバック手順を管理します。"
    }
  },
  plugin: {
    title: {
      en: "Plugin popup",
      zh: "插件面板",
      ja: "プラグインポップアップ"
    },
    description: {
      en: "Keep the Edge popup lightweight while sharing language, status, and transport boundaries with the platform.",
      zh: "让 Edge popup 保持轻量，同时与平台共享语言、状态和传输边界。",
      ja: "Edge popup を軽量に保ちながら、プラットフォームと文脈、状態、通信境界を揃えます。"
    }
  }
};

const copy = {
  product: {
    en: "Edge Self Test",
    zh: "Edge 自测平台",
    ja: "Edge 自動テスト"
  },
  shellLabel: {
    en: "Phase 3 control plane",
    zh: "Phase 3 控制台",
    ja: "Phase 3 コントロールプレーン"
  },
  dataSource: {
    en: "Data source",
    zh: "数据来源",
    ja: "データソース"
  },
  currentConstraints: {
    en: "Current constraints",
    zh: "当前约束",
    ja: "現在の制約"
  },
  runtimePolicy: {
    en: "Runtime policy",
    zh: "运行策略",
    ja: "実行方針"
  },
  generatedAt: {
    en: "Generated at",
    zh: "生成时间",
    ja: "生成時刻"
  },
  language: {
    en: "Language",
    zh: "语言",
    ja: "言語"
  },
  theme: {
    en: "Theme",
    zh: "主题",
    ja: "テーマ"
  },
  light: {
    en: "Light",
    zh: "浅色",
    ja: "ライト"
  },
  dark: {
    en: "Dark",
    zh: "深色",
    ja: "ダーク"
  },
  statsStrip: {
    en: "Platform signals",
    zh: "平台信号",
    ja: "プラットフォーム指標"
  },
  projectSaveHint: {
    en: "POST /catalog/project",
    zh: "POST /catalog/project",
    ja: "POST /catalog/project"
  },
  caseSaveHint: {
    en: "POST /catalog/case",
    zh: "POST /catalog/case",
    ja: "POST /catalog/case"
  },
  modelSaveHint: {
    en: "POST /config/model",
    zh: "POST /config/model",
    ja: "POST /config/model"
  },
  environmentSaveHint: {
    en: "POST /config/environment",
    zh: "POST /config/environment",
    ja: "POST /config/environment"
  },
  executionSaveHint: {
    en: "POST /scheduler/requests",
    zh: "POST /scheduler/requests",
    ja: "POST /scheduler/requests"
  },
  reviewSaveHint: {
    en: "POST /scheduler/events",
    zh: "POST /scheduler/events",
    ja: "POST /scheduler/events"
  },
  addProjectRow: {
    en: "Add project row",
    zh: "新增项目行",
    ja: "プロジェクト行を追加"
  },
  saveProjectCatalog: {
    en: "Save project catalog",
    zh: "保存项目目录",
    ja: "プロジェクトカタログを保存"
  },
  addCaseRow: {
    en: "Add case row",
    zh: "新增用例行",
    ja: "ケース行を追加"
  },
  saveCaseCatalog: {
    en: "Save case catalog",
    zh: "保存用例目录",
    ja: "ケースカタログを保存"
  },
  saveModelConfig: {
    en: "Save model config",
    zh: "保存模型配置",
    ja: "モデル設定を保存"
  },
  saveEnvironmentConfig: {
    en: "Save environment config",
    zh: "保存环境配置",
    ja: "環境設定を保存"
  },
  startExecution: {
    en: "Start execution",
    zh: "开始执行",
    ja: "実行開始"
  },
  openAudit: {
    en: "Open audit",
    zh: "发起审计",
    ja: "監査を開始"
  },
  queueBoard: {
    en: "Queue board",
    zh: "队列看板",
    ja: "キューボード"
  },
  reviewBoard: {
    en: "Audit timeline",
    zh: "审计时间线",
    ja: "監査タイムライン"
  },
  reportList: {
    en: "Recent reports",
    zh: "最近报告",
    ja: "最近のレポート"
  },
  caseTags: {
    en: "Case tags",
    zh: "用例标签",
    ja: "ケースタグ"
  },
  fieldKey: {
    en: "Key",
    zh: "键",
    ja: "キー"
  },
  fieldName: {
    en: "Name",
    zh: "名称",
    ja: "名称"
  },
  fieldScope: {
    en: "Scope",
    zh: "范围",
    ja: "スコープ"
  },
  fieldEnvironments: {
    en: "Environments",
    zh: "环境",
    ja: "環境"
  },
  fieldNote: {
    en: "Note",
    zh: "备注",
    ja: "メモ"
  },
  fieldCaseId: {
    en: "Case ID",
    zh: "用例 ID",
    ja: "ケース ID"
  },
  fieldProjectKey: {
    en: "Project Key",
    zh: "项目键",
    ja: "プロジェクトキー"
  },
  fieldStatus: {
    en: "Status",
    zh: "状态",
    ja: "状態"
  },
  fieldTags: {
    en: "Tags",
    zh: "标签",
    ja: "タグ"
  },
  fieldArchived: {
    en: "Archived",
    zh: "已归档",
    ja: "アーカイブ済み"
  },
  fieldLabel: {
    en: "Label",
    zh: "标签名",
    ja: "ラベル"
  },
  fieldValue: {
    en: "Value",
    zh: "值",
    ja: "値"
  },
  fieldRunId: {
    en: "Run ID",
    zh: "运行 ID",
    ja: "実行 ID"
  },
  fieldProject: {
    en: "Project",
    zh: "项目",
    ja: "プロジェクト"
  },
  fieldOwner: {
    en: "Owner",
    zh: "负责人",
    ja: "担当"
  },
  fieldEnvironment: {
    en: "Environment",
    zh: "环境",
    ja: "環境"
  },
  fieldDetail: {
    en: "Detail",
    zh: "详情",
    ja: "詳細"
  },
  fieldAuditDetail: {
    en: "Audit detail",
    zh: "审计详情",
    ja: "監査詳細"
  },
  runColumn: {
    en: "Run",
    zh: "运行",
    ja: "実行"
  },
  finishedAtColumn: {
    en: "Finished At",
    zh: "完成时间",
    ja: "完了時刻"
  },
  entryColumn: {
    en: "Entry",
    zh: "入口",
    ja: "入口"
  },
  newCatalogRow: {
    en: "New catalog row",
    zh: "新目录行",
    ja: "新規カタログ行"
  }
} as const;

const localizedScreenCopy: Record<ScreenId, { title: CopyValue; description: CopyValue }> = {
  dashboard: {
    title: { en: "Operations overview", zh: "运营总览", ja: "運営概要" },
    description: {
      en: "Track platform state, execution readiness, and audit pressure from one control surface.",
      zh: "在一个控制面中跟踪平台状态、执行准备度和审计压力。",
      ja: "単一のコントロール画面から、プラットフォーム状態、実行準備、監査負荷を確認します。"
    }
  },
  projects: {
    title: { en: "Project catalog", zh: "项目目录", ja: "プロジェクトカタログ" },
    description: {
      en: "Maintain project metadata without changing the existing file-backed contract.",
      zh: "在不改变现有文件落盘协议的前提下维护项目元数据。",
      ja: "既存のファイル永続化契約を変えずにプロジェクトのメタデータを保守します。"
    }
  },
  cases: {
    title: { en: "Case management", zh: "用例管理", ja: "ケース管理" },
    description: {
      en: "Keep case rows editable while preserving Phase 3 shell depth and lightweight validation.",
      zh: "保持用例行可编辑，同时维持 Phase 3 外壳深度和轻量校验。",
      ja: "Phase 3 シェルの奥行きと軽量バリデーションを保ちながらケース行を編集可能にします。"
    }
  },
  docParse: {
    title: { en: "Document parse", zh: "文档解析", ja: "ドキュメント解析" },
    description: {
      en: "Review source documents, extracted intents, and case candidates before generation.",
      zh: "在生成前审阅源文档、提取意图和候选用例。",
      ja: "生成前にソース文書、抽出された意図、候補ケースを確認します。"
    }
  },
  aiGenerate: {
    title: { en: "AI generate", zh: "AI 生成", ja: "AI 生成" },
    description: {
      en: "Assemble prompt context, policy constraints, and planned output artifacts in one workspace.",
      zh: "在同一工作区组装提示词上下文、策略约束和计划输出产物。",
      ja: "同じワークスペースでプロンプト文脈、ポリシー制約、出力成果物の計画を組み立てます。"
    }
  },
  execution: {
    title: { en: "Execution center", zh: "执行中心", ja: "実行センター" },
    description: {
      en: "Queue runs, review scheduler pressure, and record audit intervention from the same screen.",
      zh: "在同一页面发起运行、审阅调度压力并记录审计介入。",
      ja: "同じ画面で実行投入、スケジューラ負荷確認、監査介入の記録を行います。"
    }
  },
  monitor: {
    title: { en: "Execution monitor", zh: "执行监控", ja: "実行モニタ" },
    description: {
      en: "Watch queue pressure, active lanes, and recent scheduler events in a live-style board.",
      zh: "在类实时看板中查看队列压力、活跃通道和最近调度事件。",
      ja: "ライブ風ボードでキュー負荷、アクティブレーン、直近のスケジューライベントを監視します。"
    }
  },
  reports: {
    title: { en: "Report stream", zh: "报告流", ja: "レポート一覧" },
    description: {
      en: "Review recent runs, terminal statuses, and timeline events that drive operator follow-up.",
      zh: "审阅最近运行、最终状态和驱动后续处理的时间线事件。",
      ja: "最近の実行、最終状態、オペレータ対応につながるタイムラインイベントを確認します。"
    }
  },
  reportDetail: {
    title: { en: "Report detail", zh: "报告详情", ja: "レポート詳細" },
    description: {
      en: "Focus on one run, its outcome, audit constraints, and the event narrative behind it.",
      zh: "聚焦单次运行、结果、审计约束及其背后的事件叙事。",
      ja: "単一実行の結果、監査制約、その背後のイベント経緯に焦点を当てます。"
    }
  },
  models: {
    title: { en: "Model policy", zh: "模型策略", ja: "モデル方針" },
    description: {
      en: "Keep runtime AI audit-first, with simple writable settings that remain easy to reason about.",
      zh: "保持运行时 AI 以审计优先，并提供易于理解的可写配置。",
      ja: "ランタイム AI を監査優先に保ち、理解しやすい書き込み可能な設定を維持します。"
    }
  },
  environments: {
    title: { en: "Environment policy", zh: "环境策略", ja: "環境方針" },
    description: {
      en: "Maintain browser pools and environment rules in the same platform frame as the other operators.",
      zh: "在与其他操作员相同的平台框架中维护浏览器池和环境规则。",
      ja: "他の運用者と同じプラットフォーム枠内でブラウザプールと環境ルールを管理します。"
    }
  },
  dataDiff: {
    title: { en: "Data diff", zh: "数据差异", ja: "データ差分" },
    description: {
      en: "Compare before and after snapshots and keep restore checkpoints visible to operators.",
      zh: "对比前后快照，并让恢复检查点对操作员可见。",
      ja: "前後スナップショットを比較し、復元チェックポイントをオペレータに見える形で保持します。"
    }
  },
  dataTemplates: {
    title: { en: "Data templates", zh: "数据模板", ja: "データテンプレート" },
    description: {
      en: "Manage reusable seed, teardown, and rollback recipes without changing the current backend contract.",
      zh: "在不改变当前后端协议的前提下管理可复用的预置、清理和回滚方案。",
      ja: "現在のバックエンド契約を変えずに、再利用可能な投入・後始末・ロールバック手順を管理します。"
    }
  },
  plugin: {
    title: { en: "Plugin popup", zh: "插件弹窗", ja: "プラグインポップアップ" },
    description: {
      en: "Keep the Edge popup lightweight while sharing language, status, and transport boundaries with the platform.",
      zh: "让 Edge 弹窗保持轻量，同时与平台共享语言、状态和传输边界。",
      ja: "Edge ポップアップを軽量に保ちつつ、プラットフォームと文言、状態、通信境界を揃えます。"
    }
  }
};

const uiCopy = {
  product: { en: "Edge Self Test", zh: "Edge 自测平台", ja: "Edge 自動テスト" },
  shellLabel: { en: "Phase 3 control plane", zh: "Phase 3 控制台", ja: "Phase 3 コントロールプレーン" },
  dataSource: { en: "Data source", zh: "数据来源", ja: "データソース" },
  currentConstraints: { en: "Current constraints", zh: "当前约束", ja: "現在の制約" },
  runtimePolicy: { en: "Runtime policy", zh: "运行策略", ja: "実行方針" },
  generatedAt: { en: "Generated at", zh: "生成时间", ja: "生成時刻" },
  language: { en: "Language", zh: "语言", ja: "言語" },
  theme: { en: "Theme", zh: "主题", ja: "テーマ" },
  light: { en: "Light", zh: "浅色", ja: "ライト" },
  dark: { en: "Dark", zh: "深色", ja: "ダーク" },
  statsStrip: { en: "Platform signals", zh: "平台信号", ja: "プラットフォーム指標" },
  projectSaveHint: { en: "POST /catalog/project", zh: "POST /catalog/project", ja: "POST /catalog/project" },
  caseSaveHint: { en: "POST /catalog/case", zh: "POST /catalog/case", ja: "POST /catalog/case" },
  modelSaveHint: { en: "POST /config/model", zh: "POST /config/model", ja: "POST /config/model" },
  environmentSaveHint: { en: "POST /config/environment", zh: "POST /config/environment", ja: "POST /config/environment" },
  executionSaveHint: { en: "POST /scheduler/requests", zh: "POST /scheduler/requests", ja: "POST /scheduler/requests" },
  reviewSaveHint: { en: "POST /scheduler/events", zh: "POST /scheduler/events", ja: "POST /scheduler/events" },
  addProjectRow: { en: "Add project row", zh: "新增项目行", ja: "プロジェクト行を追加" },
  saveProjectCatalog: { en: "Save project catalog", zh: "保存项目目录", ja: "プロジェクトカタログを保存" },
  addCaseRow: { en: "Add case row", zh: "新增用例行", ja: "ケース行を追加" },
  saveCaseCatalog: { en: "Save case catalog", zh: "保存用例目录", ja: "ケースカタログを保存" },
  saveModelConfig: { en: "Save model config", zh: "保存模型配置", ja: "モデル設定を保存" },
  saveEnvironmentConfig: { en: "Save environment config", zh: "保存环境配置", ja: "環境設定を保存" },
  startExecution: { en: "Start execution", zh: "开始执行", ja: "実行開始" },
  openAudit: { en: "Open audit", zh: "发起审计", ja: "監査を開始" },
  queueBoard: { en: "Queue board", zh: "队列看板", ja: "キューボード" },
  reviewBoard: { en: "Audit timeline", zh: "审计时间线", ja: "監査タイムライン" },
  reportList: { en: "Recent reports", zh: "最近报告", ja: "最近のレポート" },
  caseTags: { en: "Case tags", zh: "用例标签", ja: "ケースタグ" },
  fieldKey: { en: "Key", zh: "键", ja: "キー" },
  fieldName: { en: "Name", zh: "名称", ja: "名称" },
  fieldScope: { en: "Scope", zh: "范围", ja: "スコープ" },
  fieldEnvironments: { en: "Environments", zh: "环境", ja: "環境" },
  fieldNote: { en: "Note", zh: "备注", ja: "メモ" },
  fieldCaseId: { en: "Case ID", zh: "用例 ID", ja: "ケース ID" },
  fieldProjectKey: { en: "Project Key", zh: "项目键", ja: "プロジェクトキー" },
  fieldStatus: { en: "Status", zh: "状态", ja: "状態" },
  fieldTags: { en: "Tags", zh: "标签", ja: "タグ" },
  fieldArchived: { en: "Archived", zh: "已归档", ja: "アーカイブ済み" },
  fieldLabel: { en: "Label", zh: "标签名", ja: "ラベル" },
  fieldValue: { en: "Value", zh: "值", ja: "値" },
  fieldRunId: { en: "Run ID", zh: "运行 ID", ja: "実行 ID" },
  fieldProject: { en: "Project", zh: "项目", ja: "プロジェクト" },
  fieldOwner: { en: "Owner", zh: "负责人", ja: "担当者" },
  fieldEnvironment: { en: "Environment", zh: "环境", ja: "環境" },
  fieldDetail: { en: "Detail", zh: "详情", ja: "詳細" },
  fieldAuditDetail: { en: "Audit detail", zh: "审计详情", ja: "監査詳細" },
  runColumn: { en: "Run", zh: "运行", ja: "実行" },
  finishedAtColumn: { en: "Finished At", zh: "完成时间", ja: "完了時刻" },
  entryColumn: { en: "Entry", zh: "入口", ja: "入口" },
  newCatalogRow: { en: "New catalog row", zh: "新目录行", ja: "新規カタログ行" }
} as const;

const apiBaseUrl =
  (import.meta.env.VITE_LOCAL_ADMIN_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://127.0.0.1:8787";

function translate(locale: Locale, value: CopyValue): string {
  return typeof value === "string" ? value : value[locale] ?? value.en ?? value.zh ?? value.ja;
}

export function App() {
  const [snapshot, setSnapshot] = useState<AdminConsoleSnapshot>(fallbackSnapshot);
  const [sourceLabel, setSourceLabel] = useState(translate("en", sharedCopy.sourceFallback));
  const [activeScreen, setActiveScreen] = useState<ScreenId>("dashboard");
  const [locale, setLocale] = useState<Locale>("en");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [launchForm, setLaunchForm] = useState<SchedulerMutationForm>({
    runId: "checkout-web-smoke",
    projectKey: "checkout-web",
    owner: "qa-platform",
    environment: "prod-like",
    detail: "Accepted from operator launch panel."
  });
  const [reviewForm, setReviewForm] = useState<SchedulerMutationForm>({
    runId: "checkout-web-smoke",
    projectKey: "checkout-web",
    owner: "audit-operator",
    environment: "prod-like",
    detail: "Operator review opened from the admin console."
  });
  const [launchState, setLaunchState] = useState<MutationState>({ kind: "idle", message: "" });
  const [reviewState, setReviewState] = useState<MutationState>({ kind: "idle", message: "" });
  const [modelConfigDraft, setModelConfigDraft] = useState<ConfigItem[]>(fallbackSnapshot.modelConfig);
  const [environmentConfigDraft, setEnvironmentConfigDraft] = useState<ConfigItem[]>(fallbackSnapshot.environmentConfig);
  const [projectDraft, setProjectDraft] = useState<ProjectItem[]>(
    fallbackSnapshot.projects.map((project) => ({
      key: project.key,
      name: project.name,
      scope: project.scope,
      environments: String(project.environments),
      note: project.note
    }))
  );
  const [modelConfigState, setModelConfigState] = useState<MutationState>({ kind: "idle", message: "" });
  const [environmentConfigState, setEnvironmentConfigState] = useState<MutationState>({ kind: "idle", message: "" });
  const [projectState, setProjectState] = useState<MutationState>({ kind: "idle", message: "" });
  const [caseDraft, setCaseDraft] = useState<CaseItem[]>(
    fallbackSnapshot.cases.map((testCase) => ({
      id: testCase.id,
      projectKey: testCase.projectKey,
      name: testCase.name,
      tags: testCase.tags.join(", "),
      status: testCase.status,
      archived: testCase.archived
    }))
  );
  const [caseState, setCaseState] = useState<MutationState>({ kind: "idle", message: "" });

  function t(value: CopyValue) {
    return translate(locale, value);
  }

  const navigationItems = screenOrder.map((screenId) => {
    const existing = snapshot.navigation.find((item) => item.id === screenId);
    if (existing) {
      return existing;
    }
    return {
      id: screenId,
      label: t(localizedScreenCopy[screenId].title),
      summary: t(localizedScreenCopy[screenId].description)
    };
  });

  async function fetchSnapshot() {
    const response = await fetch(`${apiBaseUrl}/api/phase3/admin-console`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as AdminConsoleSnapshot;
  }

  async function loadSnapshot() {
    const payload = await fetchSnapshot();
    setSnapshot(payload);
    setSourceLabel(t(sharedCopy.sourceLocalApi));
    return payload;
  }

  async function postSchedulerMutation(
    path: string,
    payload: Record<string, string>,
    setState: (state: MutationState) => void,
    successMessage: string
  ) {
    setState({ kind: "pending", message: t(sharedCopy.pendingSubmitting) });
    try {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      await loadSnapshot();
      setState({ kind: "success", message: successMessage });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async function postConfigItems(
    path: string,
    items: ConfigItem[],
    setState: (state: MutationState) => void,
    successMessage: string
  ) {
    setState({ kind: "pending", message: t(sharedCopy.pendingConfig) });
    try {
      for (const item of items) {
        await postConfigItem(path, item);
      }
      await loadSnapshot();
      setState({ kind: "success", message: successMessage });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async function postConfigItem(path: string, item: ConfigItem) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(item)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }
  }

  async function postProjectItems(
    items: ProjectItem[],
    setState: (state: MutationState) => void,
    successMessage: string
  ) {
    setState({ kind: "pending", message: t(sharedCopy.pendingProjectCatalog) });
    try {
      for (const item of items) {
        await postProjectItem(item);
      }
      await loadSnapshot();
      setState({ kind: "success", message: successMessage });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async function postProjectItem(item: ProjectItem) {
    const response = await fetch(`${apiBaseUrl}/api/phase3/catalog/project`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        key: item.key,
        name: item.name,
        scope: item.scope,
        environments: item.environments
          .split(",")
          .map((environment) => environment.trim())
          .filter(Boolean),
        note: item.note
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }
  }

  async function postCaseItems(
    items: CaseItem[],
    setState: (state: MutationState) => void,
    successMessage: string
  ) {
    setState({ kind: "pending", message: t(sharedCopy.pendingCaseCatalog) });
    try {
      for (const item of items) {
        await postCaseItem(item);
      }
      await loadSnapshot();
      setState({ kind: "success", message: successMessage });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async function postCaseItem(item: CaseItem) {
    const response = await fetch(`${apiBaseUrl}/api/phase3/catalog/case`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: item.id,
        projectKey: item.projectKey,
        name: item.name,
        tags: item.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        status: item.status,
        archived: item.archived
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetchSnapshot();
        if (!cancelled) {
          setSnapshot(payload);
          setSourceLabel(t(sharedCopy.sourceLocalApi));
        }
      } catch (error) {
        if (!cancelled) {
          setSnapshot(fallbackSnapshot);
          setSourceLabel(
            formatCopy(t(sharedCopy.sourceFallbackWithError), {
              error: error instanceof Error ? error.message : String(error)
            })
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (snapshot.projects.length === 0) {
      return;
    }
    const primaryProject = snapshot.projects[0];
    setLaunchForm((current) => ({
      ...current,
      projectKey: current.projectKey || primaryProject.key
    }));
    setReviewForm((current) => ({
      ...current,
      projectKey: current.projectKey || primaryProject.key
    }));
  }, [snapshot.projects]);

  useEffect(() => {
    setModelConfigDraft(snapshot.modelConfig);
  }, [snapshot.modelConfig]);

  useEffect(() => {
    setEnvironmentConfigDraft(snapshot.environmentConfig);
  }, [snapshot.environmentConfig]);

  useEffect(() => {
    setProjectDraft(
      snapshot.projects.map((project) => ({
        key: project.key,
        name: project.name,
        scope: project.scope,
        environments: String(project.environments),
        note: project.note
      }))
    );
  }, [snapshot.projects]);

  useEffect(() => {
    setCaseDraft(
      snapshot.cases.map((testCase) => ({
        id: testCase.id,
        projectKey: testCase.projectKey,
        name: testCase.name,
        tags: testCase.tags.join(", "),
        status: testCase.status,
        archived: testCase.archived
      }))
    );
  }, [snapshot.cases]);

  function handleLaunchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void postSchedulerMutation(
      "/api/phase3/scheduler/requests",
      launchForm,
      setLaunchState,
      formatCopy(t(sharedCopy.launchQueued), { runId: launchForm.runId, environment: launchForm.environment })
    );
  }

  function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void postSchedulerMutation(
      "/api/phase3/scheduler/events",
      {
        ...reviewForm,
        type: "NEEDS_REVIEW",
        status: "NEEDS_REVIEW"
      },
      setReviewState,
      formatCopy(t(sharedCopy.reviewRecorded), { runId: reviewForm.runId })
    );
  }

  function updateConfigDraft(
    setDraft: (updater: (current: ConfigItem[]) => ConfigItem[]) => void,
    index: number,
    key: keyof ConfigItem,
    value: string
  ) {
    setDraft((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    );
  }

  function handleConfigSubmit(
    event: FormEvent<HTMLFormElement>,
    path: string,
    items: ConfigItem[],
    setState: (state: MutationState) => void,
    successMessage: string
  ) {
    event.preventDefault();
    const normalizedItems = items
      .map((item) => ({
        label: item.label.trim(),
        value: item.value.trim()
      }))
      .filter((item) => item.label && item.value);
    void postConfigItems(path, normalizedItems, setState, successMessage);
  }

  function updateProjectDraft(index: number, key: keyof ProjectItem, value: string) {
    setProjectDraft((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    );
  }

  function removeProjectDraftRow(index: number) {
    setProjectDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addProjectDraftRow() {
    setProjectDraft((current) => [
      ...current,
      {
        key: "",
        name: "",
        scope: "",
        environments: "",
        note: ""
      }
    ]);
  }

  function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedProjectRows = projectDraft.map((project) => ({
      key: project.key.trim(),
      name: project.name.trim(),
      scope: project.scope.trim(),
      environments: project.environments.trim(),
      note: project.note.trim()
    }));
    const filteredProjects = normalizedProjectRows.filter((project) => project.key && project.name && project.scope);
    const duplicateProject = filteredProjects.find(
      (project, index) => filteredProjects.findIndex((candidate) => candidate.key === project.key) !== index
    );
    if (filteredProjects.length === 0) {
      setProjectState({ kind: "error", message: t(sharedCopy.errorKeepProject) });
      return;
    }
    if (duplicateProject) {
      setProjectState({ kind: "error", message: formatCopy(t(sharedCopy.errorDuplicateProject), { key: duplicateProject.key }) });
      return;
    }
    void postProjectItems(filteredProjects, setProjectState, t(sharedCopy.savedProjectCatalog));
  }

  function updateCaseDraft(index: number, key: keyof CaseItem, value: string | boolean) {
    setCaseDraft((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    );
  }

  function removeCaseDraftRow(index: number) {
    setCaseDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addCaseDraftRow() {
    setCaseDraft((current) => [
      ...current,
      {
        id: "",
        projectKey: snapshot.projects[0]?.key ?? "",
        name: "",
        tags: "",
        status: "ACTIVE",
        archived: false
      }
    ]);
  }

  function handleCaseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCaseRows = caseDraft.map((testCase) => ({
      id: testCase.id.trim(),
      projectKey: testCase.projectKey.trim(),
      name: testCase.name.trim(),
      tags: testCase.tags.trim(),
      status: testCase.status.trim() || "ACTIVE",
      archived: testCase.archived
    }));
    const filteredCases = normalizedCaseRows.filter((testCase) => testCase.id && testCase.projectKey && testCase.name);
    const duplicateCase = filteredCases.find(
      (testCase, index) => filteredCases.findIndex((candidate) => candidate.id === testCase.id) !== index
    );
    const validProjectKeys = new Set(projectDraft.map((project) => project.key.trim()).filter(Boolean));
    const missingProject = filteredCases.find((testCase) => !validProjectKeys.has(testCase.projectKey));
    if (filteredCases.length === 0) {
      setCaseState({ kind: "error", message: t(sharedCopy.errorKeepCase) });
      return;
    }
    if (duplicateCase) {
      setCaseState({ kind: "error", message: formatCopy(t(sharedCopy.errorDuplicateCase), { id: duplicateCase.id }) });
      return;
    }
    if (missingProject) {
      setCaseState({
        kind: "error",
        message: formatCopy(t(sharedCopy.errorUnknownProject), {
          id: missingProject.id,
          projectKey: missingProject.projectKey
        })
      });
      return;
    }
    void postCaseItems(filteredCases, setCaseState, t(sharedCopy.savedCaseCatalog));
  }

  function renderActiveScreen() {
    switch (activeScreen) {
      case "dashboard":
        return (
          <DashboardScreen
            snapshot={snapshot}
            runtimePolicyLabel={t(uiCopy.runtimePolicy)}
            generatedAtLabel={t(uiCopy.generatedAt)}
            statsStripLabel={t(uiCopy.statsStrip)}
            reviewBoardLabel={t(uiCopy.reviewBoard)}
            queueBoardLabel={t(uiCopy.queueBoard)}
            dashboardTitle={t(localizedScreenCopy.dashboard.title)}
            locale={locale}
          />
        );
      case "projects":
        return (
          <ProjectsScreen
            snapshot={snapshot}
            projectDraft={projectDraft}
            projectState={projectState}
            title={t(localizedScreenCopy.projects.title)}
            saveHint={t(uiCopy.projectSaveHint)}
            fieldKeyLabel={t(uiCopy.fieldKey)}
            fieldNameLabel={t(uiCopy.fieldName)}
            fieldScopeLabel={t(uiCopy.fieldScope)}
            fieldEnvironmentsLabel={t(uiCopy.fieldEnvironments)}
            fieldNoteLabel={t(uiCopy.fieldNote)}
            newCatalogRowLabel={t(uiCopy.newCatalogRow)}
            addProjectRowLabel={t(uiCopy.addProjectRow)}
            saveProjectCatalogLabel={t(uiCopy.saveProjectCatalog)}
            locale={locale}
            onProjectChange={updateProjectDraft}
            onAddProjectRow={addProjectDraftRow}
            onRemoveProjectRow={removeProjectDraftRow}
            onSubmit={handleProjectSubmit}
          />
        );
      case "cases":
        return (
          <CasesScreen
            snapshot={snapshot}
            caseDraft={caseDraft}
            caseState={caseState}
            title={t(localizedScreenCopy.cases.title)}
            saveHint={t(uiCopy.caseSaveHint)}
            caseTagsLabel={t(uiCopy.caseTags)}
            fieldCaseIdLabel={t(uiCopy.fieldCaseId)}
            fieldProjectKeyLabel={t(uiCopy.fieldProjectKey)}
            fieldNameLabel={t(uiCopy.fieldName)}
            fieldStatusLabel={t(uiCopy.fieldStatus)}
            fieldTagsLabel={t(uiCopy.fieldTags)}
            fieldArchivedLabel={t(uiCopy.fieldArchived)}
            newCatalogRowLabel={t(uiCopy.newCatalogRow)}
            addCaseRowLabel={t(uiCopy.addCaseRow)}
            saveCaseCatalogLabel={t(uiCopy.saveCaseCatalog)}
            locale={locale}
            onCaseChange={updateCaseDraft}
            onAddCaseRow={addCaseDraftRow}
            onRemoveCaseRow={removeCaseDraftRow}
            onSubmit={handleCaseSubmit}
          />
        );
      case "docParse":
        return <DocParseScreen snapshot={snapshot} title={t(localizedScreenCopy.docParse.title)} locale={locale} />;
      case "aiGenerate":
        return <AiGenerateScreen snapshot={snapshot} title={t(localizedScreenCopy.aiGenerate.title)} locale={locale} />;
      case "execution":
        return (
          <ExecutionScreen
            snapshot={snapshot}
            launchForm={launchForm}
            reviewForm={reviewForm}
            launchState={launchState}
            reviewState={reviewState}
            title={t(localizedScreenCopy.execution.title)}
            executionSaveHint={t(uiCopy.executionSaveHint)}
            queueBoardLabel={t(uiCopy.queueBoard)}
            reviewBoardLabel={t(uiCopy.reviewBoard)}
            fieldRunIdLabel={t(uiCopy.fieldRunId)}
            fieldProjectLabel={t(uiCopy.fieldProject)}
            fieldOwnerLabel={t(uiCopy.fieldOwner)}
            fieldEnvironmentLabel={t(uiCopy.fieldEnvironment)}
            fieldDetailLabel={t(uiCopy.fieldDetail)}
            fieldAuditDetailLabel={t(uiCopy.fieldAuditDetail)}
            startExecutionLabel={t(uiCopy.startExecution)}
            openAuditLabel={t(uiCopy.openAudit)}
            reviewSaveHint={t(uiCopy.reviewSaveHint)}
            locale={locale}
            onLaunchFormChange={setLaunchForm}
            onReviewFormChange={setReviewForm}
            onLaunchSubmit={handleLaunchSubmit}
            onReviewSubmit={handleReviewSubmit}
          />
        );
      case "monitor":
        return <MonitorScreen snapshot={snapshot} title={t(localizedScreenCopy.monitor.title)} locale={locale} />;
      case "reports":
        return (
          <ReportsScreen
            snapshot={snapshot}
            reviewBoardLabel={t(uiCopy.reviewBoard)}
            reportListLabel={t(uiCopy.reportList)}
            statusLabel={t(uiCopy.fieldStatus)}
            runColumnLabel={t(uiCopy.runColumn)}
            finishedAtColumnLabel={t(uiCopy.finishedAtColumn)}
            entryColumnLabel={t(uiCopy.entryColumn)}
            locale={locale}
          />
        );
      case "reportDetail":
        return <ReportDetailScreen snapshot={snapshot} title={t(localizedScreenCopy.reportDetail.title)} locale={locale} />;
      case "models":
        return (
          <ConfigScreen
            navigationLabel={navigationItems.find((item) => item.id === "models")?.label}
            title={t(localizedScreenCopy.models.title)}
            hint={t(uiCopy.modelSaveHint)}
            items={modelConfigDraft}
            state={modelConfigState}
            setDraft={setModelConfigDraft}
            setState={setModelConfigState}
            path="/api/phase3/config/model"
            successMessage={t(sharedCopy.savedModelConfig)}
            submitLabel={t(uiCopy.saveModelConfig)}
            fieldLabelText={t(uiCopy.fieldLabel)}
            fieldValueText={t(uiCopy.fieldValue)}
            locale={locale}
            onConfigChange={updateConfigDraft}
            onSubmit={handleConfigSubmit}
          />
        );
      case "environments":
        return (
          <ConfigScreen
            navigationLabel={navigationItems.find((item) => item.id === "environments")?.label}
            title={t(localizedScreenCopy.environments.title)}
            hint={t(uiCopy.environmentSaveHint)}
            items={environmentConfigDraft}
            state={environmentConfigState}
            setDraft={setEnvironmentConfigDraft}
            setState={setEnvironmentConfigState}
            path="/api/phase3/config/environment"
            successMessage={t(sharedCopy.savedEnvironmentConfig)}
            submitLabel={t(uiCopy.saveEnvironmentConfig)}
            fieldLabelText={t(uiCopy.fieldLabel)}
            fieldValueText={t(uiCopy.fieldValue)}
            locale={locale}
            onConfigChange={updateConfigDraft}
            onSubmit={handleConfigSubmit}
          />
        );
      case "dataDiff":
        return <DataDiffScreen snapshot={snapshot} title={t(localizedScreenCopy.dataDiff.title)} locale={locale} />;
      case "dataTemplates":
        return <DataTemplatesScreen snapshot={snapshot} title={t(localizedScreenCopy.dataTemplates.title)} locale={locale} />;
      case "plugin":
        return <PluginPopupScreen snapshot={snapshot} title={t(localizedScreenCopy.plugin.title)} locale={locale} />;
      default:
        return null;
    }
  }

  return (
    <div className="consoleRoot" data-theme={themeMode}>
      <div className="appViewport">
        <div className="appShell">
          <TopBar
            productLabel={t(uiCopy.product)}
            shellLabel={t(uiCopy.shellLabel)}
            dataSourceLabel={t(uiCopy.dataSource)}
            sourceLabel={sourceLabel}
            languageLabel={t(uiCopy.language)}
            themeLabel={t(uiCopy.theme)}
            lightLabel={t(uiCopy.light)}
            darkLabel={t(uiCopy.dark)}
            searchPlaceholder={t(sharedCopy.searchPlaceholder)}
            locale={locale}
            themeMode={themeMode}
            onLocaleChange={setLocale}
            onThemeModeChange={setThemeMode}
          />
          <div className="workspace">
            <Sidebar
              navigation={navigationItems}
              activeScreen={activeScreen}
              locale={locale}
              onScreenChange={setActiveScreen}
            />

            <main className="mainPanel">
              {renderActiveScreen()}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
