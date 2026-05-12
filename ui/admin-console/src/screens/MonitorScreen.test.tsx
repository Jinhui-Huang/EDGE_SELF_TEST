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
  timeline: [],
  constraints: [],
  caseTags: []
};

const runStatusResponse: RunStatus = {
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
};

const stepsResponse: RunStepsResponse = {
  runId: "checkout-web-smoke",
  availability: "AVAILABLE",
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
  capturedAt: "2026-05-05T10:03:46Z",
  url: "https://example.test/checkout",
  title: "Checkout",
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

    expect(await screen.findByText("No scheduler-backed step timeline is available yet.")).toBeInTheDocument();
    expect(screen.getByText("No report step artifact or scheduler step timeline is available yet.")).toBeInTheDocument();
    expect(screen.getByText("No runtime log entries.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Step detail" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Runtime log detail" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open step detail/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open runtime log detail/i })).not.toBeInTheDocument();
  });

  it("keeps the no-step empty state when legacy step payloads omit availability", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      steps: { runId: "checkout-web-smoke", items: [] },
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

    expect(await screen.findByText("No scheduler-backed step timeline is available yet.")).toBeInTheDocument();
    expect(screen.getByText("No report step artifact or scheduler step timeline is available yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open step detail/i })).not.toBeInTheDocument();
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

  it("shows an explicit unavailable shell when no live-page artifact exists", async () => {
    vi.stubGlobal("fetch", createFetchMock({
      livePage: {
        ...livePageResponse,
        status: "UNAVAILABLE",
        title: "Payment review",
        url: "https://example.test/checkout/payment",
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
    expect(screen.queryByRole("img", { name: "Checkout" })).not.toBeInTheDocument();
    expect(screen.getByText("Payment review")).toBeInTheDocument();
    expect(screen.getByText("https://example.test/checkout/payment")).toBeInTheDocument();
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
  });
});
