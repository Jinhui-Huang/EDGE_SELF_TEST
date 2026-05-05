import { FormEvent, useEffect, useState } from "react";
import { sharedCopy, translate } from "../i18n";
import { Locale, ModelProvider, ModelRoutingRule, MutationState } from "../types";
import { MutationStatus } from "../ui-kit/MutationStatus";

type Copy = {
  en: string;
  zh: string;
  ja: string;
};

const copy = (en: string, zh = en, ja = en): Copy => ({ en, zh, ja });

const emptyProvider = (): ModelProvider => ({
  id: "",
  name: "",
  displayName: "",
  model: "",
  endpoint: "",
  apiKey: "",
  modality: "browser automation",
  contextWindow: "",
  maxOutputTokens: "",
  temperature: "0.2",
  timeoutMs: "60000",
  status: "active",
  role: "secondary",
  region: "",
  notes: "",
  usage: "0%",
  latency: "--",
  cost: "--",
  accent: "accent"
});

type ModelConfigScreenProps = {
  navigationLabel?: string;
  title: string;
  hint: string;
  locale: Locale;
  providers: ModelProvider[];
  routingRules: ModelRoutingRule[];
  state: MutationState;
  testState: MutationState;
  submitLabel: string;
  onProvidersChange: (providers: ModelProvider[]) => void;
  onRoutingRulesChange: (rules: ModelRoutingRule[]) => void;
  onTestConnection: (item: ModelProvider) => void;
  onSave: () => void;
};

export function ModelConfigScreen({
  navigationLabel,
  title,
  hint,
  locale,
  providers,
  routingRules,
  state,
  testState,
  submitLabel,
  onProvidersChange,
  onRoutingRulesChange,
  onTestConnection,
  onSave
}: ModelConfigScreenProps) {
  const t = (value: Copy) => translate(locale, value);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ModelProvider>(emptyProvider());
  const [routingModalOpen, setRoutingModalOpen] = useState(false);
  const [editingRoutingId, setEditingRoutingId] = useState<string | null>(null);
  const [routingDraft, setRoutingDraft] = useState<ModelRoutingRule | null>(null);
  const [routingFallbackDraft, setRoutingFallbackDraft] = useState("");

  const isEditing = editingId !== null;

  useEffect(() => {
    if (!modalOpen) {
      setEditingId(null);
      setDraft(emptyProvider());
    }
  }, [modalOpen]);

  useEffect(() => {
    if (!routingModalOpen) {
      setEditingRoutingId(null);
      setRoutingDraft(null);
      setRoutingFallbackDraft("");
    }
  }, [routingModalOpen]);

  function openCreateModal() {
    setEditingId(null);
    setDraft(emptyProvider());
    setModalOpen(true);
  }

  function openEditModal(provider: ModelProvider) {
    setEditingId(provider.id);
    setDraft({ ...provider });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function openRoutingModal(rule: ModelRoutingRule) {
    setEditingRoutingId(rule.id);
    setRoutingDraft({ ...rule, fallback: [...rule.fallback] });
    setRoutingFallbackDraft(rule.fallback.join(", "));
    setRoutingModalOpen(true);
  }

  function closeRoutingModal() {
    setRoutingModalOpen(false);
  }

  function handleProviderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    const model = draft.model.trim();
    if (!name || !model) return;

    const accentOrder: ModelProvider["accent"][] = ["accent", "accent2", "accent3", "accent4"];

    if (isEditing) {
      onProvidersChange(
        providers.map((item) =>
          item.id === editingId
            ? { ...draft, name, model, displayName: draft.displayName.trim() || name }
            : item
        )
      );
    } else {
      onProvidersChange([
        ...providers,
        {
          ...draft,
          id:
            draft.id.trim() ||
            `${name.toLowerCase().replace(/\s+/g, "-")}-${model
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`,
          name,
          displayName: draft.displayName.trim() || name,
          model,
          accent: accentOrder[providers.length % accentOrder.length]
        }
      ]);
    }
    closeModal();
  }

  function handleDelete() {
    if (!editingId) return;
    onProvidersChange(providers.filter((item) => item.id !== editingId));
    closeModal();
  }

  function handleRoutingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!routingDraft || !editingRoutingId) return;

    const task = routingDraft.task.trim();
    const primary = routingDraft.primary.trim();
    if (!task || !primary) return;

    const fallback = routingFallbackDraft
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    onRoutingRulesChange(
      routingRules.map((rule) =>
        rule.id === editingRoutingId
          ? {
              ...routingDraft,
              task,
              primary,
              fallback,
              reason: routingDraft.reason.trim()
            }
          : rule
      )
    );
    closeRoutingModal();
  }

  return (
    <section className="modelConfigScreen">
      <div className="modelConfigEyebrow">{navigationLabel}</div>
      <div className="modelConfigHeader">
        <div>
          <h2>{title}</h2>
          <p>
            {t(
              copy(
                "Route AI tasks to the best model. Fallback triggers on timeout or schema error.",
                "为 AI 任务选择合适模型，超时或 schema 错误时切换 fallback。",
                "AI タスクを最適なモデルへルーティングし、タイムアウトや schema error 時は fallback に切り替えます。"
              )
            )}
          </p>
        </div>
        <div className="modelConfigHeaderActions">
          <span className="actionHint">{hint}</span>
          <button className="projectsActionButton primary" type="button" onClick={openCreateModal}>
            + {t(copy("Add provider", "新增 provider", "プロバイダーを追加"))}
          </button>
        </div>
      </div>

      <div className="modelProviderGrid">
        {providers.map((provider) => (
          <article
            key={provider.id}
            className={`modelProviderCard ${provider.accent}`}
            onClick={() => openEditModal(provider)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => event.key === "Enter" && openEditModal(provider)}
          >
            <div className="modelProviderTop">
              <div className="modelProviderIdentity">
                <div className="modelProviderTitleRow">
                  <strong>{provider.name}</strong>
                  {provider.role === "primary" ? (
                    <span className="modelBadge info">{t(copy("primary", "主用", "primary"))}</span>
                  ) : null}
                  <span className={`modelBadge ${provider.status === "active" ? "success" : "neutral"}`}>
                    {provider.status}
                  </span>
                </div>
                <div className="modelProviderModel">{provider.model}</div>
              </div>
              <div className="modelProviderActions">
                <button
                  className="modelGhostButton"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onTestConnection(provider);
                  }}
                >
                  {t(copy("Test", "测试", "テスト"))}
                </button>
                <button
                  className="modelGhostButton iconOnly"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditModal(provider);
                  }}
                  aria-label={t(copy("Edit", "编辑", "編集"))}
                >
                  ✎
                </button>
              </div>
            </div>

            <div className="modelProviderMiniGrid">
              <div className="modelMiniKV">
                <span>{t(copy("Usage", "使用率", "Usage"))}</span>
                <strong>{provider.usage}</strong>
              </div>
              <div className="modelMiniKV">
                <span>{t(copy("Latency", "延迟", "Latency"))}</span>
                <strong>{provider.latency}</strong>
              </div>
              <div className="modelMiniKV">
                <span>{t(copy("Cost", "成本", "Cost"))}</span>
                <strong>{provider.cost}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      <MutationStatus state={testState} />

      <section className="modelRoutingCard">
        <div className="modelRoutingHead">
          <div className="modelRoutingTitle">
            {t(copy("Task -> model routing", "任务 -> 模型路由", "タスク -> モデル ルーティング"))}
          </div>
          <span className="modelRulePill">
            {routingRules.length} {t(copy("rules", "条规则", "rules"))}
          </span>
        </div>
        <div className="modelRoutingBody">
          {routingRules.map((rule) => (
            <div key={rule.id} className="modelRoutingRow">
              <div className="modelRoutingTask">{rule.task}</div>
              <div>
                <span className="modelPrimaryPill">{rule.primary}</span>
              </div>
              <div className="modelFallbackList">
                {rule.fallback.map((item) => (
                  <span key={item} className="modelBadge neutral">
                    {"-> "} {item}
                  </span>
                ))}
              </div>
              <div className="modelRoutingReason">{rule.reason}</div>
              <div className="modelRoutingAction">
                <button
                  className="modelGhostButton iconOnly"
                  type="button"
                  aria-label={`Edit routing rule for ${rule.task}`}
                  onClick={() => openRoutingModal(rule)}
                >
                  ✎
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="modelConfigFooter">
        <button
          className="projectsActionButton primary"
          type="button"
          disabled={state.kind === "pending"}
          onClick={onSave}
        >
          {state.kind === "pending" ? translate(locale, sharedCopy.saving) : submitLabel}
        </button>
      </div>
      <MutationStatus state={state} />

      {modalOpen ? (
        <div className="modelModalScrim" role="presentation" onClick={closeModal}>
          <div className="modelModalCard" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modelModalHead">
              <div>
                <p className="eyebrow">
                  {isEditing
                    ? t(copy("Edit provider", "编辑 provider", "プロバイダーを編集"))
                    : t(copy("Add provider", "新增 provider", "プロバイダーを追加"))}
                </p>
                <h3>{draft.name || t(copy("New provider", "新 provider", "新しいプロバイダー"))}</h3>
                <p>
                  {t(
                    copy(
                      "Enter the full model connection and runtime metadata.",
                      "填写完整的模型连接与运行元数据。",
                      "モデル接続情報とランタイム metadata を入力します。"
                    )
                  )}
                </p>
              </div>
              <button className="modelGhostButton iconOnly" type="button" onClick={closeModal} aria-label="Close provider editor">
                ×
              </button>
            </div>
            <form className="modelModalForm" onSubmit={handleProviderSubmit}>
              <label>
                {t(copy("Provider name", "Provider 名称", "Provider name"))}
                <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                {t(copy("Display name", "展示名称", "Display name"))}
                <input
                  value={draft.displayName}
                  onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                />
              </label>
              <label>
                {t(copy("Model id", "模型 ID", "Model id"))}
                <input value={draft.model} onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))} />
              </label>
              <label>
                {t(copy("Endpoint / Base URL", "Endpoint / Base URL", "Endpoint / Base URL"))}
                <input
                  value={draft.endpoint}
                  onChange={(event) => setDraft((current) => ({ ...current, endpoint: event.target.value }))}
                />
              </label>
              <label>
                {t(copy("API key", "API key", "API key"))}
                <input value={draft.apiKey} onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))} />
              </label>
              <label>
                {t(copy("Capability", "能力", "Capability"))}
                <input
                  value={draft.modality}
                  onChange={(event) => setDraft((current) => ({ ...current, modality: event.target.value }))}
                />
              </label>
              <label>
                {t(copy("Context window", "上下文窗口", "Context window"))}
                <input
                  value={draft.contextWindow}
                  onChange={(event) => setDraft((current) => ({ ...current, contextWindow: event.target.value }))}
                />
              </label>
              <label>
                {t(copy("Max output tokens", "最大输出 tokens", "Max output tokens"))}
                <input
                  value={draft.maxOutputTokens}
                  onChange={(event) => setDraft((current) => ({ ...current, maxOutputTokens: event.target.value }))}
                />
              </label>
              <label>
                {t(copy("Temperature", "Temperature", "Temperature"))}
                <input
                  value={draft.temperature}
                  onChange={(event) => setDraft((current) => ({ ...current, temperature: event.target.value }))}
                />
              </label>
              <label>
                {t(copy("Timeout ms", "超时 ms", "Timeout ms"))}
                <input value={draft.timeoutMs} onChange={(event) => setDraft((current) => ({ ...current, timeoutMs: event.target.value }))} />
              </label>
              <label>
                {t(copy("Status", "状态", "Status"))}
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, status: event.target.value as ModelProvider["status"] }))
                  }
                >
                  <option value="active">active</option>
                  <option value="fallback">fallback</option>
                  <option value="disabled">disabled</option>
                </select>
              </label>
              <label>
                {t(copy("Role", "角色", "Role"))}
                <select
                  value={draft.role}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, role: event.target.value as ModelProvider["role"] }))
                  }
                >
                  <option value="primary">primary</option>
                  <option value="secondary">secondary</option>
                  <option value="fallback">fallback</option>
                </select>
              </label>
              <label>
                {t(copy("Region", "区域", "Region"))}
                <input value={draft.region} onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value }))} />
              </label>
              <label>
                {t(copy("Usage", "使用率", "Usage"))}
                <input value={draft.usage} onChange={(event) => setDraft((current) => ({ ...current, usage: event.target.value }))} />
              </label>
              <label>
                {t(copy("Latency", "延迟", "Latency"))}
                <input value={draft.latency} onChange={(event) => setDraft((current) => ({ ...current, latency: event.target.value }))} />
              </label>
              <label>
                {t(copy("Cost", "成本", "Cost"))}
                <input value={draft.cost} onChange={(event) => setDraft((current) => ({ ...current, cost: event.target.value }))} />
              </label>
              <label className="fullWidth">
                {t(copy("Notes", "备注", "Notes"))}
                <textarea rows={3} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
              </label>
              <div className="modelModalActions fullWidth">
                <button
                  className="projectsActionButton"
                  type="button"
                  onClick={() => onTestConnection(draft)}
                  disabled={testState.kind === "pending"}
                >
                  {testState.kind === "pending"
                    ? t(copy("Testing...", "测试中...", "Testing..."))
                    : t(copy("Test connection", "测试连接", "接続テスト"))}
                </button>
                {isEditing ? (
                  <button className="projectsActionButton danger" type="button" onClick={handleDelete}>
                    {t(copy("Delete", "删除", "削除"))}
                  </button>
                ) : null}
                <button className="projectsActionButton" type="button" onClick={closeModal}>
                  {t(copy("Cancel", "取消", "キャンセル"))}
                </button>
                <button className="projectsActionButton primary" type="submit">
                  {isEditing ? t(copy("Update", "更新", "更新")) : t(copy("Add provider", "新增 provider", "追加"))}
                </button>
              </div>
            </form>
            <MutationStatus state={testState} />
          </div>
        </div>
      ) : null}

      {routingModalOpen && routingDraft ? (
        <div className="modelModalScrim" role="presentation" onClick={closeRoutingModal}>
          <div
            className="modelModalCard modelRoutingEditorCard"
            role="dialog"
            aria-modal="true"
            aria-label="Routing rule editor"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modelModalHead">
              <div>
                <p className="eyebrow">{t(copy("Routing rule", "路由规则", "Routing rule"))}</p>
                <h3>{t(copy("Edit routing rule", "编辑路由规则", "Edit routing rule"))}</h3>
                <p>
                  {t(
                    copy(
                      "This editor updates the local draft only. Use Save model config to persist the rule.",
                      "这里只更新本地 draft。点击 Save model config 后才会持久化。",
                      "このエディタはローカル draft のみ更新します。永続化は Save model config で行います。"
                    )
                  )}
                </p>
              </div>
              <button
                className="modelGhostButton iconOnly"
                type="button"
                aria-label="Close routing rule editor"
                onClick={closeRoutingModal}
              >
                ×
              </button>
            </div>
            <form className="modelModalForm modelRoutingEditorForm" onSubmit={handleRoutingSubmit}>
              <label>
                {t(copy("Task", "任务", "Task"))}
                <input
                  value={routingDraft.task}
                  onChange={(event) =>
                    setRoutingDraft((current) => (current ? { ...current, task: event.target.value } : current))
                  }
                />
              </label>
              <label>
                {t(copy("Primary model", "主模型", "Primary model"))}
                <input
                  value={routingDraft.primary}
                  onChange={(event) =>
                    setRoutingDraft((current) => (current ? { ...current, primary: event.target.value } : current))
                  }
                />
              </label>
              <label className="fullWidth">
                {t(copy("Fallback models", "Fallback 模型列表", "Fallback models"))}
                <input value={routingFallbackDraft} onChange={(event) => setRoutingFallbackDraft(event.target.value)} />
              </label>
              <label className="fullWidth">
                {t(copy("Reason", "原因", "Reason"))}
                <textarea
                  rows={4}
                  value={routingDraft.reason}
                  onChange={(event) =>
                    setRoutingDraft((current) => (current ? { ...current, reason: event.target.value } : current))
                  }
                />
              </label>
              <div className="modelModalActions fullWidth">
                <button className="projectsActionButton" type="button" onClick={closeRoutingModal}>
                  {t(copy("Cancel", "取消", "キャンセル"))}
                </button>
                <button className="projectsActionButton primary" type="submit">
                  {t(copy("Apply", "应用", "Apply"))}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
