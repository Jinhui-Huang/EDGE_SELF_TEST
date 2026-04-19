import { FormEvent } from "react";
import { sharedCopy, translate } from "../i18n";
import { AdminConsoleSnapshot, Locale, MutationState, SchedulerMutationForm } from "../types";
import { MutationStatus } from "../ui-kit/MutationStatus";

type ExecutionScreenProps = {
  snapshot: AdminConsoleSnapshot;
  launchForm: SchedulerMutationForm;
  reviewForm: SchedulerMutationForm;
  launchState: MutationState;
  reviewState: MutationState;
  title: string;
  executionSaveHint: string;
  queueBoardLabel: string;
  reviewBoardLabel: string;
  fieldRunIdLabel: string;
  fieldProjectLabel: string;
  fieldOwnerLabel: string;
  fieldEnvironmentLabel: string;
  fieldDetailLabel: string;
  fieldAuditDetailLabel: string;
  startExecutionLabel: string;
  openAuditLabel: string;
  reviewSaveHint: string;
  locale: Locale;
  onLaunchFormChange: (updater: (current: SchedulerMutationForm) => SchedulerMutationForm) => void;
  onReviewFormChange: (updater: (current: SchedulerMutationForm) => SchedulerMutationForm) => void;
  onLaunchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReviewSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ExecutionScreen({
  snapshot,
  launchForm,
  reviewForm,
  launchState,
  reviewState,
  title,
  executionSaveHint,
  queueBoardLabel,
  reviewBoardLabel,
  fieldRunIdLabel,
  fieldProjectLabel,
  fieldOwnerLabel,
  fieldEnvironmentLabel,
  fieldDetailLabel,
  fieldAuditDetailLabel,
  startExecutionLabel,
  openAuditLabel,
  reviewSaveHint,
  locale,
  onLaunchFormChange,
  onReviewFormChange,
  onLaunchSubmit,
  onReviewSubmit
}: ExecutionScreenProps) {
  return (
    <div className="screenGrid">
      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{snapshot.navigation.find((item) => item.id === "execution")?.label}</p>
            <h3>{title}</h3>
          </div>
          <span className="actionHint">{executionSaveHint}</span>
        </div>
        <form className="actionForm" onSubmit={onLaunchSubmit}>
          <label>
            {fieldRunIdLabel}
            <input value={launchForm.runId} onChange={(event) => onLaunchFormChange((current) => ({ ...current, runId: event.target.value }))} />
          </label>
          <label>
            {fieldProjectLabel}
            <input value={launchForm.projectKey} onChange={(event) => onLaunchFormChange((current) => ({ ...current, projectKey: event.target.value }))} />
          </label>
          <label>
            {fieldOwnerLabel}
            <input value={launchForm.owner} onChange={(event) => onLaunchFormChange((current) => ({ ...current, owner: event.target.value }))} />
          </label>
          <label>
            {fieldEnvironmentLabel}
            <input value={launchForm.environment} onChange={(event) => onLaunchFormChange((current) => ({ ...current, environment: event.target.value }))} />
          </label>
          <label className="fullWidth">
            {fieldDetailLabel}
            <textarea rows={3} value={launchForm.detail} onChange={(event) => onLaunchFormChange((current) => ({ ...current, detail: event.target.value }))} />
          </label>
          <button type="submit" disabled={launchState.kind === "pending"}>
            {launchState.kind === "pending" ? translate(locale, sharedCopy.queueing) : startExecutionLabel}
          </button>
        </form>
        <MutationStatus state={launchState} />
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{queueBoardLabel}</p>
            <h3>{queueBoardLabel}</h3>
          </div>
        </div>
        <div className="signalGrid">
          {snapshot.workQueue.map((item) => (
            <article key={item.title} className="signalCard">
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <div className="signalMeta">
                <span>{item.owner}</span>
                <small>{item.state}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sectionCard sectionWide">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{reviewBoardLabel}</p>
            <h3>{reviewBoardLabel}</h3>
          </div>
          <span className="actionHint">{reviewSaveHint}</span>
        </div>
        <form className="actionForm compactForm" onSubmit={onReviewSubmit}>
          <label>
            {fieldRunIdLabel}
            <input value={reviewForm.runId} onChange={(event) => onReviewFormChange((current) => ({ ...current, runId: event.target.value }))} />
          </label>
          <label>
            {fieldProjectLabel}
            <input value={reviewForm.projectKey} onChange={(event) => onReviewFormChange((current) => ({ ...current, projectKey: event.target.value }))} />
          </label>
          <label>
            {fieldOwnerLabel}
            <input value={reviewForm.owner} onChange={(event) => onReviewFormChange((current) => ({ ...current, owner: event.target.value }))} />
          </label>
          <label>
            {fieldEnvironmentLabel}
            <input value={reviewForm.environment} onChange={(event) => onReviewFormChange((current) => ({ ...current, environment: event.target.value }))} />
          </label>
          <label className="fullWidth">
            {fieldAuditDetailLabel}
            <textarea rows={2} value={reviewForm.detail} onChange={(event) => onReviewFormChange((current) => ({ ...current, detail: event.target.value }))} />
          </label>
          <button type="submit" disabled={reviewState.kind === "pending"}>
            {reviewState.kind === "pending" ? translate(locale, sharedCopy.recording) : openAuditLabel}
          </button>
        </form>
        <MutationStatus state={reviewState} />
        <div className="timeline">
          {snapshot.timeline.map((item) => (
            <div key={`${item.time}-${item.title}`} className="timelineItem">
              <span>{item.time}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
