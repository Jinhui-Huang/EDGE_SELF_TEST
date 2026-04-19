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
  latency: "—",
  cost: "—",
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
  onTestConnection,
  onSave
}: ModelConfigScreenProps) {
  const t = (value: Copy) => translate(locale, value);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ModelProvider>(emptyProvider());

  const isEditing = editingId !== null;

  useEffect(() => {
    if (!modalOpen) {
      setEditingId(null);
      setDraft(emptyProvider());
    }
  }, [modalOpen]);

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
          id: draft.id.trim() || `${name.toLowerCase().replace(/\s+/g, "-")}-${model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
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
                "将 AI 任务路由到合适的模型。超时或结构错误时触发回退。",
                "AI タスクを最適なモデルへルーティングし、タイムアウトや構造エラー時はフォールバックします。"
              )
            )}
          </p>
        </div>
        <div className="modelConfigHeaderActions">
          <span className="actionHint">{hint}</span>
          <button className="projectsActionButton primary" type="button" onClick={openCreateModal}>
            + {t(copy("Add provider", "添加提供方", "プロバイダーを追加"))}
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
            onKeyDown={(e) => e.key === "Enter" && openEditModal(provider)}
          >
            <div className="modelProviderTop">
              <div className="modelProviderIdentity">
                <div className="modelProviderTitleRow">
                  <strong>{provider.name}</strong>
                  {provider.role === "primary" ? <span className="modelBadge info">{t(copy("primary", "主模型", "プライマリ"))}</span> : null}
                  <span className={`modelBadge ${provider.status === "active" ? "success" : "neutral"}`}>{provider.status}</span>
                </div>
                <div className="modelProviderModel">{provider.model}</div>
              </div>
              <div className="modelProviderActions">
                <button
                  className="modelGhostButton"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onTestConnection(provider); }}
                >
                  {t(copy("Test", "测试", "テスト"))}
                </button>
                <button
                  className="modelGhostButton iconOnly"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openEditModal(provider); }}
                  aria-label={t(copy("Edit", "编辑", "編集"))}
                >
                  ✎
                </button>
              </div>
            </div>

            <div className="modelProviderMiniGrid">
              <div className="modelMiniKV">
                <span>{t(copy("Usage", "使用率", "使用率"))}</span>
                <strong>{provider.usage}</strong>
              </div>
              <div className="modelMiniKV">
                <span>{t(copy("Latency", "延迟", "レイテンシ"))}</span>
                <strong>{provider.latency}</strong>
              </div>
              <div className="modelMiniKV">
                <span>{t(copy("Cost", "成本", "コスト"))}</span>
                <strong>{provider.cost}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      <MutationStatus state={testState} />

      <section className="modelRoutingCard">
        <div className="modelRoutingHead">
          <div className="modelRoutingTitle">{t(copy("Task → model routing", "任务 → 模型 路由", "タスク → モデル ルーティング"))}</div>
          <span className="modelRulePill">{routingRules.length} {t(copy("rules", "条规则", "ルール"))}</span>
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
                    ↺ {item}
                  </span>
                ))}
              </div>
              <div className="modelRoutingReason">{rule.reason}</div>
              <div className="modelRoutingAction">
                <button className="modelGhostButton iconOnly" type="button">
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
          <div className="modelModalCard" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modelModalHead">
              <div>
                <p className="eyebrow">
                  {isEditing
                    ? t(copy("Edit provider", "编辑提供方", "プロバイダーを編集"))
                    : t(copy("Add provider", "新增提供方", "プロバイダー追加"))}
                </p>
                <h3>{draft.name || t(copy("New provider", "新提供方", "新しいプロバイダー"))}</h3>
                <p>{t(copy("Enter the full model connection and runtime metadata.", "填写完整模型连接和运行元信息。", "接続情報とランタイム情報を入力します。"))}</p>
              </div>
              <button className="modelGhostButton iconOnly" type="button" onClick={closeModal}>
                ×
              </button>
            </div>
            <form className="modelModalForm" onSubmit={handleProviderSubmit}>
              <label>
                {t(copy("Provider name", "提供方名称", "プロバイダー名"))}
                <input value={draft.name} onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))} />
              </label>
              <label>
                {t(copy("Display name", "展示名称", "表示名"))}
                <input value={draft.displayName} onChange={(e) => setDraft((c) => ({ ...c, displayName: e.target.value }))} />
              </label>
              <label>
                {t(copy("Model id", "模型 ID", "モデル ID"))}
                <input value={draft.model} onChange={(e) => setDraft((c) => ({ ...c, model: e.target.value }))} />
              </label>
              <label>
                {t(copy("Endpoint / Base URL", "接口 / Base URL", "エンドポイント / Base URL"))}
                <input value={draft.endpoint} onChange={(e) => setDraft((c) => ({ ...c, endpoint: e.target.value }))} />
              </label>
              <label>
                {t(copy("API key", "API Key", "API キー"))}
                <input value={draft.apiKey} onChange={(e) => setDraft((c) => ({ ...c, apiKey: e.target.value }))} />
              </label>
              <label>
                {t(copy("Capability", "能力类型", "機能"))}
                <input value={draft.modality} onChange={(e) => setDraft((c) => ({ ...c, modality: e.target.value }))} />
              </label>
              <label>
                {t(copy("Context window", "上下文窗口", "コンテキスト長"))}
                <input value={draft.contextWindow} onChange={(e) => setDraft((c) => ({ ...c, contextWindow: e.target.value }))} />
              </label>
              <label>
                {t(copy("Max output tokens", "最大输出 Token", "最大出力トークン"))}
                <input value={draft.maxOutputTokens} onChange={(e) => setDraft((c) => ({ ...c, maxOutputTokens: e.target.value }))} />
              </label>
              <label>
                {t(copy("Temperature", "Temperature", "Temperature"))}
                <input value={draft.temperature} onChange={(e) => setDraft((c) => ({ ...c, temperature: e.target.value }))} />
              </label>
              <label>
                {t(copy("Timeout ms", "超时 ms", "タイムアウト ms"))}
                <input value={draft.timeoutMs} onChange={(e) => setDraft((c) => ({ ...c, timeoutMs: e.target.value }))} />
              </label>
              <label>
                {t(copy("Status", "状态", "状態"))}
                <select
                  value={draft.status}
                  onChange={(e) => setDraft((c) => ({ ...c, status: e.target.value as ModelProvider["status"] }))}
                >
                  <option value="active">active</option>
                  <option value="fallback">fallback</option>
                  <option value="disabled">disabled</option>
                </select>
              </label>
              <label>
                {t(copy("Role", "角色", "ロール"))}
                <select
                  value={draft.role}
                  onChange={(e) => setDraft((c) => ({ ...c, role: e.target.value as ModelProvider["role"] }))}
                >
                  <option value="primary">primary</option>
                  <option value="secondary">secondary</option>
                  <option value="fallback">fallback</option>
                </select>
              </label>
              <label>
                {t(copy("Region", "区域", "リージョン"))}
                <input value={draft.region} onChange={(e) => setDraft((c) => ({ ...c, region: e.target.value }))} />
              </label>
              <label>
                {t(copy("Usage", "使用率", "使用率"))}
                <input value={draft.usage} onChange={(e) => setDraft((c) => ({ ...c, usage: e.target.value }))} />
              </label>
              <label>
                {t(copy("Latency", "延迟", "レイテンシ"))}
                <input value={draft.latency} onChange={(e) => setDraft((c) => ({ ...c, latency: e.target.value }))} />
              </label>
              <label>
                {t(copy("Cost", "成本", "コスト"))}
                <input value={draft.cost} onChange={(e) => setDraft((c) => ({ ...c, cost: e.target.value }))} />
              </label>
              <label className="fullWidth">
                {t(copy("Notes", "备注", "メモ"))}
                <textarea rows={3} value={draft.notes} onChange={(e) => setDraft((c) => ({ ...c, notes: e.target.value }))} />
              </label>
              <div className="modelModalActions fullWidth">
                <button
                  className="projectsActionButton"
                  type="button"
                  onClick={() => onTestConnection(draft)}
                  disabled={testState.kind === "pending"}
                >
                  {testState.kind === "pending"
                    ? t(copy("Testing…", "测试中…", "テスト中…"))
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
                  {isEditing ? t(copy("Update", "保存修改", "更新")) : t(copy("Add provider", "添加提供方", "追加"))}
                </button>
              </div>
            </form>
            <MutationStatus state={testState} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
