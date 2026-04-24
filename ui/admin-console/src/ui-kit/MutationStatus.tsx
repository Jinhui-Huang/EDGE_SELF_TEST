import { MutationState } from "../types";

type MutationStatusProps = {
  state: MutationState;
};

export function MutationStatus({ state }: MutationStatusProps) {
  if (state.kind === "idle" || !state.message) {
    return null;
  }

  const result = state.validationResult;

  return (
    <div className={`actionStatus ${state.kind}`}>
      <p>{state.message}</p>
      {result ? (
        <div className="actionStatusDetails">
          <div className="actionStatusMeta">
            <span>{result.status}</span>
            {typeof result.latencyMs === "number" ? <span>{result.latencyMs} ms</span> : null}
            {result.resolvedModel ? <span>{result.resolvedModel}</span> : null}
            {result.resolvedDriver ? <span>{result.resolvedDriver}</span> : null}
          </div>
          <ul className="actionStatusChecks">
            {result.checks.map((check) => (
              <li key={`${check.name}-${check.status}`}>
                <strong>{check.name}</strong>
                <span>{check.status}</span>
                <span>{check.message}</span>
              </li>
            ))}
          </ul>
          {result.warnings.length ? (
            <ul className="actionStatusWarnings">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
