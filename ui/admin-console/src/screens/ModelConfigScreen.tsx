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
  submitLabel: string;
  onProvidersChange: (providers: ModelProvider[]) => void;
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
  submitLabel,
  onProvidersChange,
  onSave
}: ModelConfigScreenProps) {
  const t = (value: Copy) => translate(locale, value);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<ModelProvider>(emptyProvider);

  useEffect(() => {
    if (!modalOpen) {
      setDraft(emptyProvider());
    }
  }, [modalOpen]);

  function handleProviderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    const model = draft.model.trim();
    if (!name || !model) {
      return;
    }
    const accentOrder: ModelProvider["accent"][] = ["accent", "accent2", "accent3", "accent4"];
    onProvidersChange([
      ...providers,
      {
        ...draft,
        id: draft.id.trim() || `${name.toLowerCase().replace(/\s+/g, "-")}-${model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name,
        displayName: draft.displayName.trim() || name,
        model,
        endpoint: draft.endpoint.trim(),
        apiKey: draft.apiKey.trim(),
        contextWindow: draft.contextWindow.trim(),
        maxOutputTokens: draft.maxOutputTokens.trim(),
        temperature: draft.temperature.trim(),
        timeoutMs: draft.timeoutMs.trim(),
        region: draft.region.trim(),
        notes: draft.notes.trim(),
        usage: draft.usage.trim() || "0%",
        latency: draft.latency.trim() || "—",
        cost: draft.cost.trim() || "—",
        accent: accentOrder[providers.length % accentOrder.length]
      }
    ]);
    setModalOpen(false);
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
          <button className="projectsActionButton primary" type="button" onClick={() => setModalOpen(true)}>
            + {t(copy("Add provider", "Add provider", "Add provider"))}
          </button>
        </div>
      </div>

      <div className="modelProviderGrid">
        {providers.map((provider) => (
          <article key={provider.id} className={`modelProviderCard ${provider.accent}`}>
            <div className="modelProviderTop">
              <div className="modelProviderIdentity">
                <div className="modelProviderTitleRow">
                  <strong>{provider.name}</strong>
                  {provider.role === "primary" ? <span className="modelBadge info">primary</span> : null}
                  <span className={`modelBadge ${provider.status === "active" ? "success" : "neutral"}`}>{provider.status}</span>
                </div>
                <div className="modelProviderModel">{provider.model}</div>
              </div>
              <div className="modelProviderActions">
                <button className="modelGhostButton" type="button">
                  {t(copy("Test", "测试", "テスト"))}
                </button>
                <button className="modelGhostButton iconOnly" type="button">
                  ...
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
        <div className="modelModalScrim" role="presentation" onClick={() => setModalOpen(false)}>
          <div className="modelModalCard" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modelModalHead">
              <div>
                <h3>{t(copy("Add provider", "新增提供方", "プロバイダー追加"))}</h3>
                <p>{t(copy("Enter the full model connection and runtime metadata.", "填写完整模型连接和运行元信息。", "接続情報とランタイム情報を入力します。"))}</p>
              </div>
              <button className="modelGhostButton iconOnly" type="button" onClick={() => setModalOpen(false)}>
                ×
              </button>
            </div>
            <form className="modelModalForm" onSubmit={handleProviderSubmit}>
              <label>
                {t(copy("Provider name", "提供方名称", "プロバイダー名"))}
                <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                {t(copy("Display name", "展示名称", "表示名"))}
                <input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} />
              </label>
              <label>
                {t(copy("Model id", "模型 ID", "モデル ID"))}
                <input value={draft.model} onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))} />
              </label>
              <label>
                {t(copy("Endpoint / Base URL", "接口 / Base URL", "エンドポイント / Base URL"))}
                <input value={draft.endpoint} onChange={(event) => setDraft((current) => ({ ...current, endpoint: event.target.value }))} />
              </label>
              <label>
                {t(copy("API key", "API Key", "API キー"))}
                <input value={draft.apiKey} onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))} />
              </label>
              <label>
                {t(copy("Capability", "能力类型", "機能"))}
                <input value={draft.modality} onChange={(event) => setDraft((current) => ({ ...current, modality: event.target.value }))} />
              </label>
              <label>
                {t(copy("Context window", "上下文窗口", "コンテキスト長"))}
                <input value={draft.contextWindow} onChange={(event) => setDraft((current) => ({ ...current, contextWindow: event.target.value }))} />
              </label>
              <label>
                {t(copy("Max output tokens", "最大输出 Token", "最大出力トークン"))}
                <input value={draft.maxOutputTokens} onChange={(event) => setDraft((current) => ({ ...current, maxOutputTokens: event.target.value }))} />
              </label>
              <label>
                {t(copy("Temperature", "Temperature", "Temperature"))}
                <input value={draft.temperature} onChange={(event) => setDraft((current) => ({ ...current, temperature: event.target.value }))} />
              </label>
              <label>
                {t(copy("Timeout ms", "超时 ms", "タイムアウト ms"))}
                <input value={draft.timeoutMs} onChange={(event) => setDraft((current) => ({ ...current, timeoutMs: event.target.value }))} />
              </label>
              <label>
                {t(copy("Status", "状态", "状態"))}
                <select
                  value={draft.status}
                  onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ModelProvider["status"] }))}
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
                  onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as ModelProvider["role"] }))}
                >
                  <option value="primary">primary</option>
                  <option value="secondary">secondary</option>
                  <option value="fallback">fallback</option>
                </select>
              </label>
              <label>
                {t(copy("Region", "区域", "リージョン"))}
                <input value={draft.region} onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value }))} />
              </label>
              <label>
                {t(copy("Usage", "使用率", "使用率"))}
                <input value={draft.usage} onChange={(event) => setDraft((current) => ({ ...current, usage: event.target.value }))} />
              </label>
              <label>
                {t(copy("Latency", "延迟", "レイテンシ"))}
                <input value={draft.latency} onChange={(event) => setDraft((current) => ({ ...current, latency: event.target.value }))} />
              </label>
              <label>
                {t(copy("Cost", "成本", "コスト"))}
                <input value={draft.cost} onChange={(event) => setDraft((current) => ({ ...current, cost: event.target.value }))} />
              </label>
              <label className="fullWidth">
                {t(copy("Notes", "备注", "メモ"))}
                <textarea rows={3} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
              </label>
              <div className="modelModalActions fullWidth">
                <button className="projectsActionButton" type="button" onClick={() => setModalOpen(false)}>
                  {t(copy("Cancel", "取消", "キャンセル"))}
                </button>
                <button className="projectsActionButton primary" type="submit">
                  {t(copy("Add provider", "添加提供方", "追加"))}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
