import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MonitorScreen } from "./MonitorScreen";
import { AdminConsoleSnapshot, LivePage, RunStatus, RunStepsResponse, RuntimeLogResponse } from "../types";

const snapshot: AdminConsoleSnapshot = {
  generatedAt: "2026-05-05T10:00:00Z",
  apiBasePath: "/api/phase3",
  summary: {
    eyebrow: "Phase 3",
    title: "Admin Console",
    description: "Monitor shell",
    runtimeStrategy: "Audit-first"
  },
  navigation: [],
  stats: [],
  projects: [],
  cases: [],
  workQueue: [
    {
      title: "checkout-web-smoke / prod-like",
      owner: "qa-platform",
      state: "Running",
      detail: "1 active / 1 waiting"
    }
  ],
  reports: [],
  modelConfig: [],
  environmentConfig: [],
  timeline: [
    {
      time: "10:05",
      title: "Parent snapshot event",
      detail: "Parent snapshot fallback detail"
    }
  ],
  constraints: [],
  caseTags: []
};

const runStatusResponse: RunStatus = {
  runId: "checkout-web-smoke",
  sourceLayer: "RUN_ARTIFACTS",
  projectKey: "checkout-web",
  status: "RUNNING",
  environment: "prod-like",
  model: "gpt-4.1-mini",
  owner: "qa-platform",
  progress: {
    currentStep: 2,
    totalSteps: 5,
    percent: 40,
    elapsedMs: 120000,
    estimatedTotalMs: 300000
  },
  currentPage: {
    url: "https://example.test/checkout",
    state: "ready"
  },
  counters: {
    assertionsPassed: 8,
    assertionsTotal: 10,
    aiCalls: 2,
    heals: 1
  },
  control: {
    canPause: true,
    canAbort: true
  },
  lastUpdatedAt: "2026-05-05T10:04:00Z"
};

const stepsResponse: RunStepsResponse = {
  runId: "checkout-web-smoke",
  availability: "AVAILABLE",
  sourceLayer: "SCHEDULER_EVENTS",
  items: [
    { index: 1, label: "Open home", state: "DONE", durationMs: 2000 },
    {
      index: 2,
      label: "Fill cart",
      state: "RUNNING",
      durationMs: 1500,
      startedAt: "2026-05-05T10:03:30Z",
      note: "waiting for payment iframe"
    }
  ]
};

const runtimeLogResponse: RuntimeLogResponse = {
  runId: "checkout-web-smoke",
  availability: "AVAILABLE",
  items: [
    {
      at: "2026-05-05T10:03:45Z",
      type: "DECISION",
      model: "gpt-4.1-mini",
      source: "runtime-ai",
      message: "Selected candidate[0] after iframe visibility check.",
      summary: "Inspecting payment button locator.",
      detail: {
        candidateCount: 3,
        selectedIndex: 0
      }
    }
  ],
  nextCursor: null
};

const livePageResponse: LivePage = {
  runId: "checkout-web-smoke",
  status: "AVAILABLE",
  sourceLayer: "LIVE_ARTIFACT",
  capturedAt: "2026-05-05T10:03:46Z",
  url: "https://example.test/checkout",
  title: "Checkout",
  summary: "Checkout form is stable and ready for payment review.",
  pageState: "ready",
  highlight: {
    stepIndex: 2,
    action: "Inspect payment button",
    target: "#pay-now"
  },
  screenshotPath: null
};

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json"
      }
    })
  );
}

function createFetchMock(overrides?: {
  status?: RunStatus | Response;
  steps?: RunStepsResponse;
  runtimeLog?: RuntimeLogResponse;
  livePage?: LivePage;
}) {
  return vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/status")) {
      if (overrides?.status instanceof Response) {
        return Promise.resolve(overrides.status);
      }
      return jsonResponse(overrides?.status ?? runStatusResponse);
    }
    if (url.endsWith("/steps")) {
      return jsonResponse(overrides?.steps ?? stepsResponse);
    }
    if (url.endsWith("/runtime-log")) {
      return jsonResponse(overrides?.runtimeLog ?? runtimeLogResponse);
    }
    if (url.endsWith("/live-page")) {
      return jsonResponse(overrides?.livePage ?? livePageResponse);
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("MonitorScreen", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens step detail when clicking a step row", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: /Open step detail: Fill cart/i }));

    expect(await screen.findByRole("heading", { name: "Step detail" })).toBeInTheDocument();
    const detailPanel = screen.getByLabelText("Step detail panel");
    expect(within(detailPanel).getByText("#2 Fill cart")).toBeInTheDocument();
    expect(within(detailPanel).getAllByText("waiting for payment iframe").length).toBeGreaterThan(0);
  });

  it("shows the backend-owned step source-layer hint", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      steps: {
        runId: "checkout-web-smoke",
        availability: "AVAILABLE",
        sourceLayer: "REPORT_ARTIFACT",
        items: [
          { index: 1, label: "Open home", state: "DONE", durationMs: 2000 }
        ]
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("Source: report artifact")).toBeInTheDocument();
  });

  it("shows the backend-owned status source-layer hint", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        sourceLayer: "SCHEDULER_FALLBACK"
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("Source: scheduler fallback")).toBeInTheDocument();
  });

  it("prefers run-local queue state over the parent snapshot footer detail", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        queueState: "2 queued / 1 active / 1 waiting",
        queueStateSource: "REQUEST_CONTEXT"
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("2 queued / 1 active / 1 waiting")).toBeInTheDocument();
    expect(screen.getByText("Queue source: request context")).toBeInTheDocument();
    expect(screen.queryByText("1 active / 1 waiting")).not.toBeInTheDocument();
  });

  it("keeps the queue source hint when legacy status payloads omit the marker", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        queueState: "legacy queue state without marker",
        queueStateSource: undefined
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("legacy queue state without marker")).toBeInTheDocument();
    expect(screen.getByText("Queue source: request context")).toBeInTheDocument();
  });

  it("falls back to the parent snapshot footer detail when queue state is absent", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("1 active / 1 waiting")).toBeInTheDocument();
    expect(screen.getByText("Queue source: snapshot fallback")).toBeInTheDocument();
  });

  it("stops using the parent snapshot queue fallback when queueStateSource is explicitly NONE", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        queueState: undefined,
        queueStateSource: "NONE"
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("No run-local queue context is available yet.")).toBeInTheDocument();
    expect(screen.getByText("Queue source: none")).toBeInTheDocument();
    expect(screen.queryByText("1 active / 1 waiting")).not.toBeInTheDocument();
  });

  it("never lets legacyMonitorFallback backfill queue text once a modern queue marker is present", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        queueState: undefined,
        queueStateSource: "REQUEST_CONTEXT"
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect((await screen.findAllByText("--")).length).toBeGreaterThan(0);
    expect(screen.getByText("Queue source: request context")).toBeInTheDocument();
    expect(screen.queryByText("1 active / 1 waiting")).not.toBeInTheDocument();
  });

  it("prefers run-local last event summary and time over the parent snapshot timeline detail", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        lastEventSummary: "Run-local scheduler event won",
        lastEventAt: "2026-05-05T10:03:45Z"
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("Run-local scheduler event won")).toBeInTheDocument();
    expect(screen.getAllByText("19:03:45").length).toBeGreaterThan(0);
    expect(screen.getByText("Event source: artifact")).toBeInTheDocument();
    expect(screen.queryByText("Parent snapshot fallback detail")).not.toBeInTheDocument();
  });

  it("still shows run-local last event summary when last event time is absent", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        sourceLayer: "SCHEDULER_FALLBACK",
        lastEventSummary: "Run-local summary without time"
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("Run-local summary without time")).toBeInTheDocument();
    expect(screen.getByText("Event source: scheduler")).toBeInTheDocument();
  });

  it("keeps the last-event source hint conservative when legacy status payloads omit the marker", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        sourceLayer: undefined,
        lastEventSource: undefined,
        lastEventSummary: "Legacy summary without artifact proof",
        currentPage: {
          url: "https://example.test/checkout",
          state: "ready"
        }
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:4173"
        onPauseRun={vi.fn()}
        onAbortRun={vi.fn()}
      />
    );

    expect(await screen.findByText("Legacy summary without artifact proof")).toBeInTheDocument();
    expect(screen.getByText("Event source: scheduler")).toBeInTheDocument();
    expect(screen.queryByText("Event source: artifact")).not.toBeInTheDocument();
  });

  it("falls back to the parent snapshot timeline detail when last event summary is absent", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("Parent snapshot fallback detail")).toBeInTheDocument();
    expect(screen.getByText("Event source: none")).toBeInTheDocument();
  });

  it("stops using the parent snapshot timeline fallback when lastEventSource is explicitly NONE", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        lastEventSummary: undefined,
        lastEventAt: undefined,
        lastEventSource: "NONE"
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("No run-local event context is available yet.")).toBeInTheDocument();
    expect(screen.getByText("Event source: none")).toBeInTheDocument();
    expect(screen.queryByText("Parent snapshot fallback detail")).not.toBeInTheDocument();
  });

  it("never lets legacyMonitorFallback backfill last-event text once a modern lastEventSource marker is present", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        lastEventSummary: undefined,
        lastEventAt: undefined,
        lastEventSource: "SCHEDULER"
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect((await screen.findAllByText("--")).length).toBeGreaterThan(0);
    expect(screen.getByText("Event source: scheduler")).toBeInTheDocument();
    expect(screen.queryByText("Parent snapshot fallback detail")).not.toBeInTheDocument();
  });

  it("keeps legacyMonitorFallback available for legacy payloads but never overrides explicit none markers", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        queueState: undefined,
        queueStateSource: "NONE",
        lastEventSummary: undefined,
        lastEventAt: undefined,
        lastEventSource: "NONE"
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("No run-local queue context is available yet.")).toBeInTheDocument();
    expect(screen.getByText("No run-local event context is available yet.")).toBeInTheDocument();
    expect(screen.queryByText("1 active / 1 waiting")).not.toBeInTheDocument();
    expect(screen.queryByText("Parent snapshot fallback detail")).not.toBeInTheDocument();
  });

  it("keeps footer fallback ordering explicit when neither run-local nor snapshot footer context exists", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        queueState: undefined,
        queueStateSource: undefined,
        lastEventSummary: undefined,
        lastEventAt: undefined,
        lastEventSource: undefined
      }
    }));

    render(
      <MonitorScreen
        snapshot={{
          ...snapshot,
          workQueue: [],
          timeline: []
        }}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect((await screen.findAllByText("--")).length).toBeGreaterThan(0);
    expect(screen.getByText("Queue source: none")).toBeInTheDocument();
    expect(screen.getByText("Event source: none")).toBeInTheDocument();
  });

  it("shows a pausing control-phase banner and keeps pause disabled", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        status: "PAUSING",
        control: {
          canPause: false,
          canAbort: true,
          requestedBy: "qa-platform",
          requestReason: "Need manual verification before payment submit",
          requestedAt: "2026-05-05T10:04:30Z"
        }
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("pausing")).toBeInTheDocument();
    expect(screen.getByText(/Pause request is in progress/)).toBeInTheDocument();
    expect(screen.getByText(/may remain on the last snapshot until the control phase settles/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abort" })).not.toBeDisabled();
    expect(screen.getAllByText(/Pause requested by qa-platform/)).toHaveLength(1);
    expect(screen.getAllByText(/Need manual verification before payment submit/)).toHaveLength(1);
  });

  it("shows an aborting control-phase banner and keeps both controls disabled", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        status: "ABORTING",
        control: {
          canPause: false,
          canAbort: false,
          requestedBy: "ops-oncall",
          requestReason: "Unsafe DOM mismatch after payment redirect",
          requestedAt: "2026-05-05T10:05:00Z"
        }
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("aborting")).toBeInTheDocument();
    expect(screen.getByText(/Abort request is in progress/)).toBeInTheDocument();
    expect(screen.getByText(/may remain on the last snapshot until the control phase settles/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abort" })).toBeDisabled();
    expect(screen.getAllByText(/Abort requested by ops-oncall/)).toHaveLength(1);
    expect(screen.getAllByText(/Unsafe DOM mismatch after payment redirect/)).toHaveLength(1);
  });

  it("shows immediate local pause feedback from the control POST response before status readback catches up", async () => {
    vi.stubGlobal("fetch", createFetchMock());
    const onPauseRun = vi.fn().mockResolvedValue({
      status: "ACCEPTED",
      kind: "run-control-pause",
      runId: "checkout-web-smoke",
      requestedState: "PAUSING",
      message: "Pause request recorded.",
      requestedBy: "monitor-ui",
      requestReason: "Waiting for manual checkout verification",
      requestedAt: "2026-05-05T10:06:00Z"
    });

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
        onPauseRun={onPauseRun}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Pause" }));

    expect(onPauseRun).toHaveBeenCalledWith("checkout-web-smoke");
    expect(await screen.findByText("pausing")).toBeInTheDocument();
    expect(screen.getByText(/Pause request is in progress/)).toBeInTheDocument();
    expect(screen.getByText(/Pause requested by monitor-ui/)).toBeInTheDocument();
    expect(screen.getByText(/Waiting for manual checkout verification/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abort" })).not.toBeDisabled();
  });

  it("shows immediate local abort feedback from the control POST response before status readback catches up", async () => {
    vi.stubGlobal("fetch", createFetchMock());
    const onAbortRun = vi.fn().mockResolvedValue({
      status: "ACCEPTED",
      kind: "run-control-abort",
      runId: "checkout-web-smoke",
      requestedState: "ABORTING",
      message: "Abort request recorded.",
      requestedBy: "ops-oncall",
      requestReason: "Unsafe DOM mismatch after payment redirect",
      requestedAt: "2026-05-05T10:07:00Z"
    });

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
        onAbortRun={onAbortRun}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Abort" }));

    expect(onAbortRun).toHaveBeenCalledWith("checkout-web-smoke");
    expect(await screen.findByText("aborting")).toBeInTheDocument();
    expect(screen.getByText(/Abort request is in progress/)).toBeInTheDocument();
    expect(screen.getByText(/Abort requested by ops-oncall/)).toBeInTheDocument();
    expect(screen.getByText(/Unsafe DOM mismatch after payment redirect/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abort" })).toBeDisabled();
  });

  it("clears a pausing optimistic overlay when the next status readback lands directly on paused", async () => {
    let statusCallCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/status")) {
        statusCallCount += 1;
        return jsonResponse(statusCallCount === 1
          ? runStatusResponse
          : {
              ...runStatusResponse,
              status: "PAUSED",
              control: {
                canPause: false,
                canAbort: true
              }
            });
      }
      if (url.endsWith("/steps")) return jsonResponse(stepsResponse);
      if (url.endsWith("/runtime-log")) return jsonResponse(runtimeLogResponse);
      if (url.endsWith("/live-page")) return jsonResponse(livePageResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    }));
    const onPauseRun = vi.fn().mockResolvedValue({
      status: "ACCEPTED",
      kind: "run-control-pause",
      runId: "checkout-web-smoke",
      requestedState: "PAUSING",
      message: "Pause request recorded.",
      requestedBy: "monitor-ui",
      requestReason: "Waiting for manual checkout verification",
      requestedAt: "2026-05-05T10:06:00Z"
    });

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
        onPauseRun={onPauseRun}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Pause" }));

    expect(await screen.findByText("paused")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("pausing")).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/Pause request is in progress/)).not.toBeInTheDocument();
  });

  it("clears an aborting optimistic overlay when the next status readback lands directly on aborted", async () => {
    let statusCallCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/status")) {
        statusCallCount += 1;
        return jsonResponse(statusCallCount === 1
          ? runStatusResponse
          : {
              ...runStatusResponse,
              status: "ABORTED",
              control: {
                canPause: false,
                canAbort: false
              }
            });
      }
      if (url.endsWith("/steps")) return jsonResponse(stepsResponse);
      if (url.endsWith("/runtime-log")) return jsonResponse(runtimeLogResponse);
      if (url.endsWith("/live-page")) return jsonResponse(livePageResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    }));
    const onAbortRun = vi.fn().mockResolvedValue({
      status: "ACCEPTED",
      kind: "run-control-abort",
      runId: "checkout-web-smoke",
      requestedState: "ABORTING",
      message: "Abort request recorded.",
      requestedBy: "ops-oncall",
      requestReason: "Unsafe DOM mismatch after payment redirect",
      requestedAt: "2026-05-05T10:07:00Z"
    });

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
        onAbortRun={onAbortRun}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Abort" }));

    expect(await screen.findByText("aborted")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("aborting")).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/Abort request is in progress/)).not.toBeInTheDocument();
  });

  it("shows immediate warning feedback and refreshes into paused after ALREADY_PAUSED", async () => {
    let statusCallCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/status")) {
        statusCallCount += 1;
        return jsonResponse(statusCallCount === 1
          ? runStatusResponse
          : {
              ...runStatusResponse,
              status: "PAUSED",
              control: {
                canPause: false,
                canAbort: true
              }
            });
      }
      if (url.endsWith("/steps")) return jsonResponse(stepsResponse);
      if (url.endsWith("/runtime-log")) return jsonResponse(runtimeLogResponse);
      if (url.endsWith("/live-page")) return jsonResponse(livePageResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    }));
    const onPauseRun = vi.fn().mockResolvedValue({
      status: "ALREADY_PAUSED",
      kind: "run-control-pause",
      runId: "checkout-web-smoke",
      requestedState: "PAUSING",
      message: "Run is already paused or pausing."
    });

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
        onPauseRun={onPauseRun}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Pause" }));

    expect(await screen.findByText("Pause skipped: Run is already paused or pausing.")).toBeInTheDocument();
    expect(await screen.findByText("paused")).toBeInTheDocument();
    expect(screen.queryByText("pausing")).not.toBeInTheDocument();
    expect(screen.queryByText(/Pause request is in progress/)).not.toBeInTheDocument();
  });

  it("shows immediate warning feedback and refreshes into aborted after ALREADY_ABORTED", async () => {
    let statusCallCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/status")) {
        statusCallCount += 1;
        return jsonResponse(statusCallCount === 1
          ? runStatusResponse
          : {
              ...runStatusResponse,
              status: "ABORTED",
              control: {
                canPause: false,
                canAbort: false
              }
            });
      }
      if (url.endsWith("/steps")) return jsonResponse(stepsResponse);
      if (url.endsWith("/runtime-log")) return jsonResponse(runtimeLogResponse);
      if (url.endsWith("/live-page")) return jsonResponse(livePageResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    }));
    const onAbortRun = vi.fn().mockResolvedValue({
      status: "ALREADY_ABORTED",
      kind: "run-control-abort",
      runId: "checkout-web-smoke",
      requestedState: "ABORTING",
      message: "Run is already aborted."
    });

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
        onAbortRun={onAbortRun}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Abort" }));

    expect(await screen.findByText("Abort skipped: Run is already aborted.")).toBeInTheDocument();
    expect(await screen.findByText("aborted")).toBeInTheDocument();
    expect(screen.queryByText("aborting")).not.toBeInTheDocument();
    expect(screen.queryByText(/Abort request is in progress/)).not.toBeInTheDocument();
  });

  it("shows immediate warning feedback and refreshes after a rejected control result", async () => {
    let statusCallCount = 0;
    let releaseStatusRefresh: (() => void) | null = null;
    const statusRefreshBlocked = new Promise<void>((resolve) => {
      releaseStatusRefresh = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/status")) {
        statusCallCount += 1;
        if (statusCallCount === 1) {
          return jsonResponse({
            ...runStatusResponse,
            status: "RUNNING",
            control: {
              canPause: true,
              canAbort: true
            }
          });
        }
        return statusRefreshBlocked.then(() =>
          jsonResponse({
            ...runStatusResponse,
            status: "ABORTING",
            control: {
              canPause: false,
              canAbort: false
            }
          })
        );
      }
      if (url.endsWith("/steps")) return jsonResponse(stepsResponse);
      if (url.endsWith("/runtime-log")) return jsonResponse(runtimeLogResponse);
      if (url.endsWith("/live-page")) return jsonResponse(livePageResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    }));
    const onAbortRun = vi.fn().mockResolvedValue({
      status: "REJECTED",
      kind: "run-control-abort",
      runId: "checkout-web-smoke",
      requestedState: "RUNNING",
      message: "Run is already aborting."
    });

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
        onAbortRun={onAbortRun}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Abort" }));

    expect(onAbortRun).toHaveBeenCalledWith("checkout-web-smoke");
    expect(await screen.findByText("Abort not accepted: Run is already aborting.")).toBeInTheDocument();
    expect(screen.queryByText("aborting")).not.toBeInTheDocument();
    releaseStatusRefresh?.();
    expect(await screen.findByText("aborting")).toBeInTheDocument();
    expect(screen.queryByText(/Abort requested by ops-oncall/)).not.toBeInTheDocument();
  });

  it("opens runtime log detail when clicking a runtime log row", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: /Open runtime log detail: DECISION Inspecting payment button locator/i }));

    expect(await screen.findByRole("heading", { name: "Runtime log detail" })).toBeInTheDocument();
    expect(screen.getByText("runtime-ai")).toBeInTheDocument();
    expect(screen.getByText("Selected candidate[0] after iframe visibility check.")).toBeInTheDocument();
    expect(screen.getByText(/candidateCount/)).toBeInTheDocument();
  });

  it("shows the backend-owned runtime log source-layer hint", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      runtimeLog: {
        runId: "checkout-web-smoke",
        availability: "AVAILABLE",
        sourceLayer: "REQUEST_CONTEXT",
        items: [
          {
            at: "2026-05-05T10:03:45Z",
            type: "INFO",
            model: "",
            source: "scheduler-request-context",
            summary: "Persisted startup guidance is active.",
            message: "Open checkout and verify the pay CTA."
          }
        ],
        nextCursor: null
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("Source: request-context fallback")).toBeInTheDocument();
  });

  it("resets the selected detail when runId changes", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/runs/checkout-web-smoke/status")) return jsonResponse(runStatusResponse);
      if (url.includes("/runs/checkout-web-smoke/steps")) return jsonResponse(stepsResponse);
      if (url.includes("/runs/checkout-web-smoke/runtime-log")) return jsonResponse(runtimeLogResponse);
      if (url.includes("/runs/checkout-web-smoke/live-page")) return jsonResponse(livePageResponse);
      if (url.includes("/runs/member-center-run/status")) {
        return jsonResponse({
          ...runStatusResponse,
          runId: "member-center-run",
          projectKey: "member-center"
        });
      }
      if (url.includes("/runs/member-center-run/steps")) {
        return jsonResponse({
          runId: "member-center-run",
          availability: "AVAILABLE",
          items: [{ index: 1, label: "Open profile", state: "RUNNING", durationMs: 500 }]
        });
      }
      if (url.includes("/runs/member-center-run/runtime-log")) {
        return jsonResponse({
          runId: "member-center-run",
          availability: "AVAILABLE",
          items: [{ at: "2026-05-05T10:05:00Z", type: "INFO", model: "gpt-4.1-mini", summary: "Profile page opened." }],
          nextCursor: null
        });
      }
      if (url.includes("/runs/member-center-run/live-page")) {
        return jsonResponse({
          ...livePageResponse,
          runId: "member-center-run",
          title: "Profile"
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: /Open step detail: Fill cart/i }));
    expect(await screen.findByRole("heading", { name: "Step detail" })).toBeInTheDocument();

    rerender(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="member-center-run"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Step detail" })).not.toBeInTheDocument();
    });
    expect(await screen.findByText("member-center")).toBeInTheDocument();
  });

  it("preserves failed and skipped step semantics instead of showing todo", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      steps: {
        runId: "checkout-web-smoke",
        availability: "AVAILABLE",
        items: [
          { index: 1, label: "Submit payment", state: "FAILED", durationMs: 950, note: "payment button not found" },
          { index: 2, label: "Archive receipt", state: "SKIPPED", durationMs: 0 }
        ]
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    const failedStep = await screen.findByRole("button", { name: /Open step detail: Submit payment/i });
    const skippedStep = await screen.findByRole("button", { name: /Open step detail: Archive receipt/i });
    expect(failedStep.className).toContain("fail");
    expect(failedStep.className).not.toContain("todo");
    expect(skippedStep.className).toContain("skip");
    expect(skippedStep.className).not.toContain("todo");

    await userEvent.click(failedStep);
    const detailPanel = await screen.findByLabelText("Step detail panel");
    expect(within(detailPanel).getByText("failed")).toBeInTheDocument();
    expect(within(detailPanel).getAllByText("payment button not found").length).toBeGreaterThan(0);
  });

  it("does not expose drill-down when steps and runtime logs are empty", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      steps: { runId: "checkout-web-smoke", availability: "UNAVAILABLE", items: [] },
      runtimeLog: {
        runId: "checkout-web-smoke",
        availability: "UNAVAILABLE",
        sourceLayer: "NONE",
        items: [],
        nextCursor: null
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("No scheduler-backed step timeline is available yet.")).toBeInTheDocument();
    expect(screen.getByText("No report step artifact or scheduler step timeline is available yet.")).toBeInTheDocument();
    expect(screen.getAllByText("Source: none").length).toBeGreaterThan(0);
    expect(screen.getByText("No runtime log entries.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Step detail" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Runtime log detail" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open step detail/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open runtime log detail/i })).not.toBeInTheDocument();
  });

  it("shows control-phase step empty-state copy while pausing", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        status: "PAUSING",
        control: {
          canPause: false,
          canAbort: true,
          requestedBy: "qa-platform",
          requestReason: "Need manual verification before payment submit",
          requestedAt: "2026-05-05T10:04:30Z"
        }
      },
      steps: { runId: "checkout-web-smoke", availability: "UNAVAILABLE", sourceLayer: "NONE", items: [] }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("No newer scheduler-backed step timeline is available while the pause request is still in progress.")).toBeInTheDocument();
    expect(screen.getByText("No newer report step artifact or scheduler step timeline is available while the pause request is still in progress.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abort" })).not.toBeDisabled();
  });

  it("shows control-phase runtime-log and live-page empty-state copy while aborting", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        status: "ABORTING",
        control: {
          canPause: false,
          canAbort: false,
          requestedBy: "ops-oncall",
          requestReason: "Unsafe DOM mismatch after payment redirect",
          requestedAt: "2026-05-05T10:05:00Z"
        }
      },
      runtimeLog: {
        runId: "checkout-web-smoke",
        availability: "UNAVAILABLE",
        sourceLayer: "NONE",
        items: [],
        nextCursor: null
      },
      livePage: {
        runId: "checkout-web-smoke",
        status: "UNAVAILABLE",
        sourceLayer: "REQUEST_CONTEXT",
        url: "https://example.test/checkout",
        title: "Checkout",
        pageState: "stale-snapshot",
        highlight: {
          action: "Waiting for abort to settle",
          target: "#pay-now"
        },
        screenshotPath: null
      } as LivePage
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("No newer runtime log entries are available while the abort request is still in progress.")).toBeInTheDocument();
    expect(screen.getByText("No newer live page artifact is available while the abort request is still in progress.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abort" })).toBeDisabled();
  });

  it("keeps the no-step empty state when legacy step payloads omit availability", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      steps: { runId: "checkout-web-smoke", items: [] },
      runtimeLog: { runId: "checkout-web-smoke", availability: "UNAVAILABLE", items: [], nextCursor: null }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("No scheduler-backed step timeline is available yet.")).toBeInTheDocument();
    expect(screen.getByText("No report step artifact or scheduler step timeline is available yet.")).toBeInTheDocument();
    expect(screen.getAllByText("Source: none").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Open step detail/i })).not.toBeInTheDocument();
  });

  it("keeps the no-runtime-log empty state when legacy log payloads omit availability", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      runtimeLog: { runId: "checkout-web-smoke", items: [], nextCursor: null }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("Source: none")).toBeInTheDocument();
    expect(await screen.findByText("No runtime log entries.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open runtime log detail/i })).not.toBeInTheDocument();
  });

  it("stays in error state without opening detail when the status API fails", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: new Response("boom", { status: 500 })
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("Status API: HTTP 500")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Step detail" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Runtime log detail" })).not.toBeInTheDocument();
  });

  it("keeps the status source hint conservative when legacy status payloads omit the marker", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        runId: "checkout-web-smoke",
        projectKey: "checkout-web",
        status: "RUNNING",
        environment: "prod-like",
        model: "gpt-4.1-mini",
        owner: "qa-platform",
        progress: {
          currentStep: 2,
          totalSteps: 5,
          percent: 40,
          elapsedMs: 120000,
          estimatedTotalMs: 300000
        },
        currentPage: {
          url: "https://example.test/checkout",
          state: "ready"
        },
        counters: {
          assertionsPassed: 8,
          assertionsTotal: 10,
          aiCalls: 2,
          heals: 1
        },
        control: {
          canPause: true,
          canAbort: true
        },
        lastUpdatedAt: "2026-05-05T10:04:00Z"
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("Source: scheduler fallback")).toBeInTheDocument();
  });

  it("still infers run-artifact status provenance from legacy artifact-like page state", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      status: {
        ...runStatusResponse,
        currentPage: {
          url: "https://example.test/checkout",
          state: "artifact-captured"
        }
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("Source: run artifacts")).toBeInTheDocument();
  });

  it("shows an explicit unavailable shell when no live-page artifact exists", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      livePage: {
        ...livePageResponse,
        status: "UNAVAILABLE",
        sourceLayer: "REQUEST_CONTEXT",
        title: "Payment review",
        url: "https://example.test/checkout/payment",
        summary: "Payment form is visible and the CTA stays above the fold.",
        pageState: "audit-first / queued / watching payment iframe",
        highlight: {
          stepIndex: 0,
          action: "Verify the payment CTA before unblocking release.",
          target: "#pay-now"
        },
        screenshotPath: null
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("No live page artifact available.")).toBeInTheDocument();
    expect(screen.getByText("Source: request-context fallback")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Checkout" })).not.toBeInTheDocument();
    expect(screen.getByText("Payment review")).toBeInTheDocument();
    expect(screen.getByText("https://example.test/checkout/payment")).toBeInTheDocument();
    expect(screen.getByText("Payment form is visible and the CTA stays above the fold.")).toBeInTheDocument();
    expect(screen.getByText("audit-first / queued / watching payment iframe")).toBeInTheDocument();
    expect(screen.getByText("Verify the payment CTA before unblocking release.")).toBeInTheDocument();
    expect(screen.getByText("#pay-now")).toBeInTheDocument();
  });

  it("renders an inline screenshot preview when the live-page payload provides one", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      livePage: {
        ...livePageResponse,
        screenshotPath: "live/step-5.png"
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    const image = await screen.findByRole("img", { name: "Checkout" });
    expect(image).toHaveAttribute(
      "src",
      "http://127.0.0.1:8787/api/phase3/runs/checkout-web-smoke/artifacts/content?path=live%2Fstep-5.png"
    );
    expect(screen.getByText("Checkout form is stable and ready for payment review.")).toBeInTheDocument();
    expect(screen.getByText("Source: live artifact")).toBeInTheDocument();
  });

  it("keeps the live-page source hint when legacy payloads omit the marker", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      livePage: {
        runId: "checkout-web-smoke",
        status: "UNAVAILABLE",
        capturedAt: "2026-05-05T10:03:46Z",
        url: "https://example.test/checkout/payment",
        title: "Payment review",
        summary: "Payment form is visible and the CTA stays above the fold.",
        pageState: "audit-first / queued / watching payment iframe",
        highlight: {
          stepIndex: 0,
          action: "Verify the payment CTA before unblocking release.",
          target: "#pay-now"
        },
        screenshotPath: null
      }
    }));

    render(
      <MonitorScreen
        snapshot={snapshot}
        title="Execution monitor"
        locale="en"
        selectedRunId="checkout-web-smoke"
        apiBaseUrl="http://127.0.0.1:8787"
      />
    );

    expect(await screen.findByText("Source: request-context fallback")).toBeInTheDocument();
    expect(screen.getByText("Payment form is visible and the CTA stays above the fold.")).toBeInTheDocument();
  });
});
