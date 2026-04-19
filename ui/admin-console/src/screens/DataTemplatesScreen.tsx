import { useMemo, useState } from "react";
import { translate } from "../i18n";
import { AdminConsoleSnapshot, DataTemplateItem, Locale } from "../types";

type DataTemplatesScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
  dataTemplates: DataTemplateItem[];
};

type Copy = {
  en: string;
  zh: string;
  ja: string;
};

const copy = (en: string, zh = en, ja = en): Copy => ({ en, zh, ja });

export function DataTemplatesScreen({ snapshot, title, locale, dataTemplates }: DataTemplatesScreenProps) {
  const t = (value: Copy) => translate(locale, value);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(dataTemplates[1]?.id ?? dataTemplates[0]?.id ?? "");

  const selectedTemplate = useMemo(
    () => dataTemplates.find((item) => item.id === selectedTemplateId) ?? dataTemplates[0] ?? null,
    [dataTemplates, selectedTemplateId]
  );

  return (
    <div className="dataTemplatesDemoScreen">
      <div className="dataTemplatesPath">{t(copy("Config / Data templates", "配置中心 / 数据模板", "設定 / データテンプレート"))}</div>

      <div className="dataTemplatesHead">
        <div>
          <h2>{title}</h2>
          <p>{t(copy("Reusable DB seed / teardown recipes. Guarded by env whitelist and rollback strategy.", "可复用数据库预置 / 清理配方，受环境白名单与回滚策略保护。", "再利用できる DB 投入 / クリーンアップ定義。環境ホワイトリストとロールバック戦略で保護されます。"))}</p>
        </div>
        <div className="dataTemplatesHeadActions">
          <button type="button" className="projectsActionButton">
            {t(copy("Import", "导入", "インポート"))}
          </button>
          <button type="button" className="projectsActionButton primary">
            {t(copy("New template", "新建模板", "新規テンプレート"))}
          </button>
        </div>
      </div>

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
            {dataTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`dataTemplatesTableRow ${selectedTemplate?.id === template.id ? "isActive" : ""}`}
                onClick={() => setSelectedTemplateId(template.id)}
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
              </div>

              <div className="dataTemplateDetailFoot">
                <button type="button" className="projectsActionButton">
                  {t(copy("Edit", "编辑", "編集"))}
                </button>
                <button type="button" className="projectsActionButton">
                  {t(copy("Dry-run", "试运行", "ドライラン"))}
                </button>
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
