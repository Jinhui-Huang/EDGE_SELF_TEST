import { MutationState } from "../types";

type MutationStatusProps = {
  state: MutationState;
};

export function MutationStatus({ state }: MutationStatusProps) {
  if (state.kind === "idle" || !state.message) {
    return null;
  }

  return <p className={`actionStatus ${state.kind}`}>{state.message}</p>;
}
