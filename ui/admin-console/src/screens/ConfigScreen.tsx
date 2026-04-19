import { sharedCopy, translate } from "../i18n";
import { ConfigItem, ConfigSubmitHandler, Locale, MutationState } from "../types";
import { MutationStatus } from "../ui-kit/MutationStatus";

type ConfigScreenProps = {
  navigationLabel: string | undefined;
  title: string;
  hint: string;
  items: ConfigItem[];
  state: MutationState;
  path: string;
  successMessage: string;
  submitLabel: string;
  fieldLabelText: string;
  fieldValueText: string;
  locale: Locale;
  onConfigChange: (
    setDraft: (updater: (current: ConfigItem[]) => ConfigItem[]) => void,
    index: number,
    key: keyof ConfigItem,
    value: string
  ) => void;
  setDraft: (updater: (current: ConfigItem[]) => ConfigItem[]) => void;
  setState: (state: MutationState) => void;
  onSubmit: ConfigSubmitHandler;
};

export function ConfigScreen({
  navigationLabel,
  title,
  hint,
  items,
  state,
  path,
  successMessage,
  submitLabel,
  fieldLabelText,
  fieldValueText,
  locale,
  onConfigChange,
  setDraft,
  setState,
  onSubmit
}: ConfigScreenProps) {
  return (
    <section className="sectionCard">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">{navigationLabel}</p>
          <h3>{title}</h3>
        </div>
        <span className="actionHint">{hint}</span>
      </div>
      <form className="editorForm" onSubmit={(event) => onSubmit(event, path, items, setState, successMessage)}>
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="editorRow singleColumn">
            <label>
              {fieldLabelText}
              <input value={item.label} onChange={(event) => onConfigChange(setDraft, index, "label", event.target.value)} />
            </label>
            <label>
              {fieldValueText}
              <textarea rows={3} value={item.value} onChange={(event) => onConfigChange(setDraft, index, "value", event.target.value)} />
            </label>
          </div>
        ))}
        <div className="editorActions">
          <button type="submit" disabled={state.kind === "pending"}>
            {state.kind === "pending" ? translate(locale, sharedCopy.saving) : submitLabel}
          </button>
        </div>
      </form>
      <MutationStatus state={state} />
    </section>
  );
}
