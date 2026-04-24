import { useCallback, useEffect, useMemo, useState } from "react";
import { translate } from "../i18n";
import {
  AdminConsoleSnapshot,
  DataTemplateItem,
  DataTemplateDryRunResponse,
  DataTemplateImportPreviewResponse,
  DataTemplateListResponse,
  Locale
} from "../types";

type DataTemplatesScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
  dataTemplates: DataTemplateItem[];
  apiBaseUrl: string;
  onTemplatesChanged?: () => void;
};

type Copy = {
  en: string;
  zh: string;
  ja: string;
};

const copy = (en: string, zh = en, ja = en): Copy => ({ en, zh, ja });

export function DataTemplatesScreen({ snapshot, title, locale, dataTemplates: fallbackTemplates, apiBaseUrl, onTemplatesChanged }: DataTemplatesScreenProps) {
  const t = (value: Copy) => translate(locale, value);
  const [templates, setTemplates] = useState<DataTemplateItem[]>(fallbackTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(fallbackTemplates[1]?.id ?? fallbackTemplates[0]?.id ?? "");
  const [dryRunResult, setDryRunResult] = useState<DataTemplateDryRunResponse | null>(null);
  const [importPreview, setImportPreview] = useState<DataTemplateImportPreviewResponse | null>(null);
  const [mutationMessage, setMutationMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState<DataTemplateItem | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/phase3/data-templates`);
      if (!response.ok) return;
      const data: unknown = await response.json();
      if (data && typeof data === "object" && "items" in data && Array.isArray((data as DataTemplateListResponse).items)) {
        const items = (data as DataTemplateListResponse).items;
        setTemplates(items);
        return;
      }
    } catch {
      // fallback to prop data
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!templates.find((item) => item.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0]?.id ?? "");
    }
  }, [templates, selectedTemplateId]);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) ?? templates[0] ?? null,
    [templates, selectedTemplateId]
  );

  function beginCreate() {
    const projectKey = snapshot.projects[0]?.key ?? "";
    setEditorMode("create");
    setDraft({
      id: "",
      name: "",
      type: "sql",
      envAllowed: "dev",
      risk: "low",
      uses: 0,
      rollback: "snapshot",
      projectKey,
      steps: [],
      guards: [],
      params: [],
      compareSummary: ""
    });
    setMutationMessage("");
    setDryRunResult(null);
  }

  function beginEdit() {
    if (!selectedTemplate) return;
    setEditorMode("edit");
    setDraft({
      ...selectedTemplate,
      steps: [...selectedTemplate.steps],
      guards: [...selectedTemplate.guards],
      params: selectedTemplate.params.map((item) => ({ ...item }))
    });
    setMutationMessage("");
  }

  async function handleSaveTemplate() {
    if (!draft || pending) return;
    setPending(true);
    setMutationMessage("");
    try {
      const payload = {
        ...draft,
        steps: draft.steps.filter(Boolean),
        guards: draft.guards.filter(Boolean),
        params: draft.params.filter((item) => item.key.trim() && item.type.trim()),
        name: draft.name.trim(),
        projectKey: draft.projectKey.trim(),
        compareSummary: draft.compareSummary.trim(),
        envAllowed: draft.envAllowed.trim()
      };
      const url = editorMode === "edit" && draft.id
        ? `${apiBaseUrl}/api/phase3/data-templates/${encodeURIComponent(draft.id)}`
        : `${apiBaseUrl}/api/phase3/data-templates`;
      const method = editorMode === "edit" && draft.id ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error("template save failed");
      }
      const nextTemplateId = draft.id || draft.name.replace(/\./g, "-").replace(/\s+/g, "-").toLowerCase();
      await loadTemplates();
      setSelectedTemplateId(nextTemplateId);
      setEditorMode(null);
      setDraft(null);
      setMutationMessage(t(copy("Template saved", "模板已保存", "テンプレート保存済み")));
      onTemplatesChanged?.();
    } catch {
      setMutationMessage(t(copy("Template save failed", "模板保存失败", "テンプレート保存失敗")));
    } finally {
      setPending(false);
    }
  }

  function updateDraft(key: keyof DataTemplateItem, value: DataTemplateItem[keyof DataTemplateItem]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleDryRun() {
    if (!selectedTemplate || pending) return;
    setPending(true);
    setDryRunResult(null);
    setMutationMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/phase3/data-templates/${encodeURIComponent(selectedTemplate.id)}/dry-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment: selectedTemplate.envAllowed.split(",")[0]?.trim() ?? "dev" })
      });
      const data: DataTemplateDryRunResponse = await response.json();
      setDryRunResult(data);
    } catch {
      setMutationMessage(t(copy("Dry-run failed", "试运行失败", "ドライラン失敗")));
    } finally {
      setPending(false);
    }
  }

  async function handleImportPreview() {
    if (pending) return;
    setPending(true);
    setImportPreview(null);
    setMutationMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/phase3/data-templates/import/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "json",
          payload: { items: [{ name: "imported.template", type: "sql", projectKey: snapshot.projects[0]?.key ?? "" }] }
        })
      });
      const data: DataTemplateImportPreviewResponse = await response.json();
      setImportPreview(data);
    } catch {
      setMutationMessage(t(copy("Import preview failed", "导入预览失败", "インポートプレビュー失敗")));
    } finally {
      setPending(false);
    }
  }

  async function handleImportCommit() {
    if (!importPreview || pending) return;
    setPending(true);
    setMutationMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/phase3/data-templates/import/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: importPreview.items
            .filter((item) => item.result === "VALID")
            .map((item) => ({ name: item.name, type: "sql", projectKey: snapshot.projects[0]?.key ?? "" }))
        })
      });
      if (response.ok) {
        setImportPreview(null);
        setMutationMessage(t(copy("Import committed", "导入已提交", "インポート完了")));
        await loadTemplates();
        onTemplatesChanged?.();
      }
    } catch {
      setMutationMessage(t(copy("Import commit failed", "导入提交失败", "インポートコミット失敗")));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!selectedTemplate || pending) return;
    setPending(true);
    setMutationMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/phase3/data-templates/${encodeURIComponent(selectedTemplate.id)}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setMutationMessage(t(copy("Deleted", "已删除", "削除済み")));
        await loadTemplates();
        onTemplatesChanged?.();
      }
    } catch {
      setMutationMessage(t(copy("Delete failed", "删除失败", "削除失敗")));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="dataTemplatesDemoScreen">
      <div className="dataTemplatesPath">{t(copy("Config / Data templates", "配置中心 / 数据模板", "設定 / データテンプレート"))}</div>

      <div className="dataTemplatesHead">
        <div>
          <h2>{title}</h2>
          <p>{t(copy("Reusable DB seed / teardown recipes. Guarded by env whitelist and rollback strategy.", "可复用数据库预置 / 清理配方，受环境白名单与回滚策略保护。", "再利用できる DB 投入 / クリーンアップ定義。環境ホワイトリストとロールバック戦略で保護されます。"))}</p>
        </div>
        <div className="dataTemplatesHeadActions">
          <button type="button" className="projectsActionButton" onClick={handleImportPreview} disabled={pending}>
            {t(copy("Import", "导入", "インポート"))}
          </button>
          <button type="button" className="projectsActionButton primary" onClick={beginCreate} disabled={pending}>
            {t(copy("New template", "新建模板", "新規テンプレート"))}
          </button>
        </div>
      </div>

      {mutationMessage && <div className="dataTemplateMutationMsg">{mutationMessage}</div>}

      {importPreview && (
        <div className="dataTemplateImportPreview">
          <strong>{t(copy("Import preview", "导入预览", "インポートプレビュー"))}</strong>
          {importPreview.items.map((item, index) => (
            <div key={index} className="dataTemplateImportRow">
              <span>{item.name}</span>
              <em className={`dataTemplateBadge ${item.result === "VALID" ? "sql" : "risk high"}`}>{item.result}</em>
              {item.warnings.length > 0 && <small>{item.warnings.join(", ")}</small>}
            </div>
          ))}
          <button type="button" className="projectsActionButton primary" onClick={handleImportCommit} disabled={pending}>
            {t(copy("Commit import", "确认导入", "インポート確定"))}
          </button>
        </div>
      )}

      <div className="dataTemplatesWorkbench">
        <section className="dataTemplatesTableCard">
          <div className="dataTemplatesTableHead">
            <span>{t(copy("Name", "名称", "名前"))}</span>
            <span>{t(copy("Type", "类型", "タイプ"))}</span>
            <span>{t(copy("Env allowed", "允许环境", "許可環境"))}</span>
            <span>{t(copy("Risk", "风险", "リスク"))}</span>
            <span>{t(copy("Rollback", "回滚", "ロールバック"))}</span>
            <span>{t(copy("Uses", "调用", "使用回数"))}</span>
          </div>
          <div className="dataTemplatesTableBody">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`dataTemplatesTableRow ${selectedTemplate?.id === template.id ? "isActive" : ""}`}
                onClick={() => { setSelectedTemplateId(template.id); setDryRunResult(null); }}
              >
                <span className="dataTemplatesMono">{template.name}</span>
                <span>
                  <em className={`dataTemplateBadge ${template.type}`}>{template.type}</em>
                </span>
                <span className="dataTemplatesMuted">{template.envAllowed}</span>
                <span>
                  <em className={`dataTemplateBadge risk ${template.risk}`}>{template.risk}</em>
                </span>
                <span className="dataTemplatesMonoSmall">{template.rollback}</span>
                <span className="dataTemplatesUses">{template.uses}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="dataTemplateDetailCard">
          {selectedTemplate ? (
            <>
              <div className="dataTemplateDetailHead">
                <strong>{selectedTemplate.name}</strong>
                <p>
                  {selectedTemplate.type} · {selectedTemplate.steps.length} {t(copy("steps", "步骤", "ステップ"))} ·{" "}
                  {t(copy("rolls back via", "回滚方式", "ロールバック"))} {selectedTemplate.rollback}
                </p>
              </div>

              {draft && editorMode ? (
                <div className="dataTemplateDetailSection">
                  <span>{t(copy("Template editor", "模板编辑", "テンプレート編集"))}</span>
                  <div className="executionConsoleForm">
                    <label>
                      {t(copy("Name", "名称", "名前"))}
                      <input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} />
                    </label>
                    <label>
                      {t(copy("Type", "类型", "タイプ"))}
                      <select value={draft.type} onChange={(event) => updateDraft("type", event.target.value as DataTemplateItem["type"])}>
                        <option value="sql">sql</option>
                        <option value="service">service</option>
                        <option value="composite">composite</option>
                      </select>
                    </label>
                    <label>
                      {t(copy("Project", "项目", "プロジェクト"))}
                      <select value={draft.projectKey} onChange={(event) => updateDraft("projectKey", event.target.value)}>
                        {snapshot.projects.map((project) => (
                          <option key={project.key} value={project.key}>{project.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t(copy("Allowed envs", "允许环境", "許可環境"))}
                      <input value={draft.envAllowed} onChange={(event) => updateDraft("envAllowed", event.target.value)} />
                    </label>
                    <label>
                      {t(copy("Risk", "风险", "リスク"))}
                      <select value={draft.risk} onChange={(event) => updateDraft("risk", event.target.value as DataTemplateItem["risk"])}>
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </label>
                    <label>
                      {t(copy("Rollback", "回滚", "ロールバック"))}
                      <select value={draft.rollback} onChange={(event) => updateDraft("rollback", event.target.value as DataTemplateItem["rollback"])}>
                        <option value="snapshot">snapshot</option>
                        <option value="sql">sql</option>
                        <option value="api">api</option>
                        <option value="manual">manual</option>
                      </select>
                    </label>
                    <label className="fullWidth">
                      {t(copy("Steps", "步骤", "ステップ"))}
                      <textarea rows={3} value={draft.steps.join("\n")} onChange={(event) => updateDraft("steps", event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))} />
                    </label>
                    <label className="fullWidth">
                      {t(copy("Guards", "守护", "ガード"))}
                      <textarea rows={3} value={draft.guards.join("\n")} onChange={(event) => updateDraft("guards", event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))} />
                    </label>
                    <label className="fullWidth">
                      {t(copy("Compare summary", "对比摘要", "比較サマリー"))}
                      <textarea rows={2} value={draft.compareSummary} onChange={(event) => updateDraft("compareSummary", event.target.value)} />
                    </label>
                    <div className="executionConsoleActions fullWidth">
                      <button type="button" className="projectsActionButton primary" onClick={handleSaveTemplate} disabled={pending}>
                        {pending ? t(copy("Saving...", "保存中...", "保存中...")) : t(copy("Save template", "保存模板", "テンプレート保存"))}
                      </button>
                      <button type="button" className="projectsActionButton" onClick={() => { setEditorMode(null); setDraft(null); }}>
                        {t(copy("Cancel", "取消", "キャンセル"))}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="dataTemplateDetailBody">
                <div className="dataTemplateDetailSection">
                  <span>{t(copy("Parameters", "参数", "パラメータ"))}</span>
                  <div className="dataTemplateParamList">
                    {selectedTemplate.params.map((param) => (
                      <div key={param.key} className="dataTemplateParamRow">
                        <div className="dataTemplatesMono">{param.key}</div>
                        <div className="dataTemplatesMonoSmall">{param.type}</div>
                        <div className="dataTemplatesMuted">{param.required ? "required" : param.value ?? "--"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="dataTemplateDetailSection">
                  <span>{t(copy("Steps", "步骤", "ステップ"))}</span>
                  <div className="dataTemplateStepList">
                    {selectedTemplate.steps.map((step, index) => (
                      <div key={step} className="dataTemplateStepRow">
                        <i>{index + 1}</i>
                        <div>
                          <strong>{step}</strong>
                          <p className="dataTemplatesMonoSmall">{step} (...)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="dataTemplateDetailSection">
                  <span>{t(copy("Guards", "守护", "ガード"))}</span>
                  <div className="dataTemplateGuardList">
                    {selectedTemplate.guards.map((guard) => (
                      <div key={guard} className="dataTemplateGuardRow">
                        <i>✓</i>
                        <span>{guard}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="dataTemplateDetailSection">
                  <span>{t(copy("Project scope", "项目范围", "プロジェクト範囲"))}</span>
                  <div className="dataTemplateScopeBox">
                    <strong>{snapshot.projects.find((item) => item.key === selectedTemplate.projectKey)?.name ?? selectedTemplate.projectKey}</strong>
                    <p>{selectedTemplate.compareSummary}</p>
                  </div>
                </div>

                {dryRunResult && (
                  <div className="dataTemplateDetailSection">
                    <span>{t(copy("Dry-run result", "试运行结果", "ドライラン結果"))}</span>
                    <div className={`dataTemplateDryRunStatus ${dryRunResult.status === "PASSED" ? "passed" : "failed"}`}>
                      {dryRunResult.status}
                    </div>
                    <div className="dataTemplateGuardList">
                      {dryRunResult.checks.map((check) => (
                        <div key={check.name} className="dataTemplateGuardRow">
                          <i>{check.status === "OK" ? "✓" : "✗"}</i>
                          <span>{check.name}: {check.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="dataTemplateDetailFoot">
                <button type="button" className="projectsActionButton" onClick={handleDelete} disabled={pending}>
                  {t(copy("Delete", "删除", "削除"))}
                </button>
                <button type="button" className="projectsActionButton" onClick={beginEdit} disabled={pending}>
                  {t(copy("Edit", "编辑", "編集"))}
                </button>
                <button type="button" className="projectsActionButton" onClick={handleDryRun} disabled={pending}>
                  {pending ? t(copy("Running...", "运行中...", "実行中...")) : t(copy("Dry-run", "试运行", "ドライラン"))}
                </button>
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
