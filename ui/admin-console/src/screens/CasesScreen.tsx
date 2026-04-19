import { FormEvent, useMemo, useState } from "react";
import { formatCopy, sharedCopy, translate } from "../i18n";
import { AdminConsoleSnapshot, CaseItem, Locale, MutationState } from "../types";
import { MutationStatus } from "../ui-kit/MutationStatus";

type CasesScreenProps = {
  snapshot: AdminConsoleSnapshot;
  caseDraft: CaseItem[];
  caseState: MutationState;
  title: string;
  saveHint: string;
  caseTagsLabel: string;
  fieldCaseIdLabel: string;
  fieldProjectKeyLabel: string;
  fieldNameLabel: string;
  fieldStatusLabel: string;
  fieldTagsLabel: string;
  fieldArchivedLabel: string;
  newCatalogRowLabel: string;
  addCaseRowLabel: string;
  saveCaseCatalogLabel: string;
  locale: Locale;
  onCaseChange: (index: number, key: keyof CaseItem, value: string | boolean) => void;
  onAddCaseRow: () => void;
  onRemoveCaseRow: (index: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CasesScreen({
  snapshot,
  caseDraft,
  caseState,
  title,
  saveHint,
  caseTagsLabel,
  fieldCaseIdLabel,
  fieldProjectKeyLabel,
  fieldNameLabel,
  fieldStatusLabel,
  fieldTagsLabel,
  fieldArchivedLabel,
  newCatalogRowLabel,
  addCaseRowLabel,
  saveCaseCatalogLabel,
  locale,
  onCaseChange,
  onAddCaseRow,
  onRemoveCaseRow,
  onSubmit
}: CasesScreenProps) {
  const [selectedProjectKey, setSelectedProjectKey] = useState("all");
  const [showArchived, setShowArchived] = useState(true);

  const visibleCases = useMemo(() => {
    return caseDraft.filter((testCase) => {
      if (selectedProjectKey !== "all" && testCase.projectKey !== selectedProjectKey) {
        return false;
      }
      if (!showArchived && testCase.archived) {
        return false;
      }
      return true;
    });
  }, [caseDraft, selectedProjectKey, showArchived]);

  const statusSummary = useMemo(() => {
    return visibleCases.reduce<Record<string, number>>((summary, testCase) => {
      summary[testCase.status] = (summary[testCase.status] ?? 0) + 1;
      return summary;
    }, {});
  }, [visibleCases]);

  return (
    <div className="screenGrid">
      <section className="sectionCard sectionWide">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{snapshot.navigation.find((item) => item.id === "cases")?.label}</p>
            <h3>{title}</h3>
          </div>
          <span className="actionHint">{saveHint}</span>
        </div>
        <div className="catalogFilterBar">
          <label>
            <span>{fieldProjectKeyLabel}</span>
            <select
              aria-label={fieldProjectKeyLabel}
              value={selectedProjectKey}
              onChange={(event) => setSelectedProjectKey(event.target.value)}
            >
              <option value="all">{translate(locale, sharedCopy.allProjects)}</option>
              {snapshot.projects.map((project) => (
                <option key={project.key} value={project.key}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="toggleLabel">
            <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
            {translate(locale, sharedCopy.showArchivedRows)}
          </label>
          <div className="summaryPills">
            {Object.entries(statusSummary).map(([status, count]) => (
              <span key={status}>
                {status}: {count}
              </span>
            ))}
          </div>
        </div>
        <form className="editorForm" onSubmit={onSubmit}>
          {visibleCases.map((testCase) => {
            const index = caseDraft.indexOf(testCase);
            return (
              <div key={`${testCase.id || "new-case"}-${index}`} className="editorRow">
                <div className="editorMeta editorMetaSplit">
                  <div>
                    <strong>
                      {testCase.name ||
                        testCase.id ||
                        `${translate(locale, { en: "Case", zh: "用例", ja: "ケース" })} ${index + 1}`}
                    </strong>
                    <small>
                      {snapshot.cases[index]?.updatedAt
                        ? formatCopy(translate(locale, sharedCopy.updatedAt), { time: snapshot.cases[index].updatedAt })
                        : newCatalogRowLabel}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="dangerButton"
                    onClick={() => onRemoveCaseRow(index)}
                    disabled={caseDraft.length === 1}
                  >
                    {translate(locale, sharedCopy.removeRow)}
                  </button>
                </div>
                <label>
                  {fieldCaseIdLabel}
                  <input value={testCase.id} onChange={(event) => onCaseChange(index, "id", event.target.value)} />
                </label>
                <label>
                  {fieldProjectKeyLabel}
                  <select value={testCase.projectKey} onChange={(event) => onCaseChange(index, "projectKey", event.target.value)}>
                    {snapshot.projects.map((project) => (
                      <option key={project.key} value={project.key}>
                        {project.key}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {fieldNameLabel}
                  <input value={testCase.name} onChange={(event) => onCaseChange(index, "name", event.target.value)} />
                </label>
                <label>
                  {fieldStatusLabel}
                  <input value={testCase.status} onChange={(event) => onCaseChange(index, "status", event.target.value)} />
                </label>
                <label className="fullWidth">
                  {fieldTagsLabel}
                  <input value={testCase.tags} onChange={(event) => onCaseChange(index, "tags", event.target.value)} />
                </label>
                <label className="toggleLabel">
                  <input
                    type="checkbox"
                    checked={testCase.archived}
                    onChange={(event) => onCaseChange(index, "archived", event.target.checked)}
                  />
                  {fieldArchivedLabel}
                </label>
              </div>
            );
          })}
          {!visibleCases.length ? <p className="emptyState">{translate(locale, sharedCopy.noCasesMatch)}</p> : null}
          <div className="editorActions">
            <button type="button" className="secondaryButton" onClick={onAddCaseRow}>
              {addCaseRowLabel}
            </button>
            <button type="submit" disabled={caseState.kind === "pending"}>
              {caseState.kind === "pending" ? translate(locale, sharedCopy.saving) : saveCaseCatalogLabel}
            </button>
          </div>
        </form>
        <MutationStatus state={caseState} />
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{caseTagsLabel}</p>
            <h3>{caseTagsLabel}</h3>
          </div>
        </div>
        <div className="pillRow">
          {snapshot.caseTags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
