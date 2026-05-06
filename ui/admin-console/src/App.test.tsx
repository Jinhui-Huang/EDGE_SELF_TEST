import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const snapshot = {
  generatedAt: "2026-04-18T11:00:00Z",
  apiBasePath: "/api/phase3",
  summary: {
    eyebrow: "Phase 3 Shell",
    title: "Enterprise Web Test Platform",
    description: "Phase 3 control plane snapshot",
    runtimeStrategy: "Audit-first runtime"
  },
  navigation: [
    { id: "dashboard", label: "Dashboard", summary: "Overview" },
    { id: "projects", label: "Projects", summary: "Projects" },
    { id: "cases", label: "Cases", summary: "Cases" },
    { id: "execution", label: "Execution", summary: "Execution" },
    { id: "reports", label: "Reports", summary: "Reports" },
    { id: "models", label: "Model Config", summary: "Model Config" },
    { id: "environments", label: "Environment Config", summary: "Environment Config" }
  ],
  stats: [
    { label: "Active projects", value: "2", note: "One needs review" }
  ],
  projects: [
    {
      key: "checkout-web",
      name: "checkout-web",
      scope: "Payment journey",
      suites: 18,
      environments: 2,
      note: "locator review"
    },
    {
      key: "member-center",
      name: "member-center",
      scope: "Profile flows",
      suites: 9,
      environments: 1,
      note: "stable"
    }
  ],
  cases: [
    {
      id: "checkout-smoke",
      projectKey: "checkout-web",
      name: "Checkout smoke",
      tags: ["smoke", "locator-repair-needed"],
      status: "ACTIVE",
      updatedAt: "2026-04-18 10:00",
      archived: false
    },
    {
      id: "member-profile-save",
      projectKey: "member-center",
      name: "Profile save",
      tags: ["profile"],
      status: "ACTIVE",
      updatedAt: "2026-04-18 09:00",
      archived: false
    }
  ],
  workQueue: [
    {
      title: "checkout-web-smoke / prod-like",
      owner: "qa-platform",
      state: "Waiting",
      detail: "Queued for execution"
    }
  ],
  reports: [
    {
      runId: "checkout-web-nightly",
      runName: "checkout-web-nightly",
      status: "FAILED",
      finishedAt: "2026-04-18 09:10",
      entry: "Failure analysis pending"
    },
    {
      runId: "member-center-daily",
      runName: "member-center-daily",
      status: "SUCCESS",
      finishedAt: "2026-04-18 08:30",
      entry: "5 artifacts exported"
    }
  ],
  modelConfig: [{ label: "Provider", value: "OpenAI Responses API" }],
  environmentConfig: [{ label: "Browser pool", value: "edge-stable-win11" }],
  timeline: [{ time: "10:55", title: "Run started", detail: "Worker slot active" }],
  constraints: ["Audit only"],
  caseTags: ["smoke", "locator-repair-needed"]
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

function resolveDeferredResponse(
  resolver: ((value: Response | PromiseLike<Response>) => void) | null,
  response: Response
) {
  if (!resolver) {
    throw new Error("Expected deferred response resolver to be set.");
  }
  resolver(response);
}

const dataTemplatesResponse = {
  items: [
    {
      id: "order-seed-v2",
      name: "order.seed.v2",
      type: "composite",
      envAllowed: "dev, staging",
      risk: "medium",
      uses: 128,
      rollback: "sql",
      projectKey: "checkout-web",
      steps: ["INSERT orders", "INSERT order_items"],
      guards: ["prod environment blocked"],
      params: [{ key: "user_id", type: "uuid", required: true }],
      compareSummary: "Compare order deltas before and after execution."
    }
  ]
};

const reportResponse = {
  runId: "checkout-web-nightly",
  runName: "checkout-web-nightly",
  status: "FAILED",
  startedAt: "2026-04-18T09:00:00Z",
  finishedAt: "2026-04-18T09:10:00Z",
  durationMs: 600000,
  projectKey: "checkout-web",
  projectName: "checkout-web",
  caseId: "checkout-smoke",
  caseName: "Checkout smoke",
  environment: "staging-edge",
  model: "claude-4.5-sonnet",
  operator: "qa-platform",
  entry: "Failure analysis pending",
  stepsTotal: 8,
  stepsPassed: 7,
  assertionsTotal: 11,
  assertionsPassed: 10,
  artifactCount: 3,
  outputDir: "runs/checkout-web-nightly",
  summary: {
    total: 8,
    passed: 7,
    failed: 1,
    skipped: 0
  },
  steps: [
    {
      stepId: "step-1",
      stepName: "Open checkout page",
      action: "open",
      status: "PASSED",
      message: null,
      durationMs: 1200,
      artifactPath: "artifacts/step-1.png"
    }
  ],
  assertions: [
    {
      name: "payment button visible",
      action: "assertVisible",
      status: "FAILED",
      message: "button selector mismatch",
      pass: false
    }
  ],
  artifacts: [
    {
      kind: "screenshot",
      label: "artifacts/step-1.png",
      path: "runs/checkout-web-nightly/artifacts/step-1.png"
    }
  ]
};

const dataDiffResponse = {
  runId: "checkout-web-nightly",
  projectKey: "checkout-web",
  caseId: "checkout-smoke",
  caseName: "Checkout smoke",
  database: {
    id: "oracle-checkout-main",
    name: "checkout-oracle-main-prodlike"
  },
  summary: {
    expectedChanges: 6,
    unexpectedChanges: 1,
    restoredCount: 6,
    totalRows: 7,
    affectedTables: 4
  },
  rows: [
    {
      table: "orders",
      pk: "ord_8821",
      field: "status",
      before: "\"pending\"",
      after: "\"paid\"",
      afterRestore: "\"pending\"",
      expected: true,
      restored: true
    }
  ]
};

const monitorStatusResponse = {
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
  lastUpdatedAt: "2026-04-18T09:04:00Z"
};

const monitorStepsResponse = {
  runId: "checkout-web-smoke",
  items: [
    { index: 1, label: "Open home", state: "DONE", durationMs: 2000 },
    { index: 2, label: "Fill cart", state: "RUNNING", durationMs: 1500, note: "waiting for payment iframe" }
  ]
};

const monitorRuntimeLogResponse = {
  runId: "checkout-web-smoke",
  items: [
    {
      at: "2026-04-18T09:03:30Z",
      type: "RUNNING",
      model: "gpt-4.1-mini",
      summary: "Inspecting payment button locator."
    }
  ],
  nextCursor: null
};

const monitorLivePageResponse = {
  runId: "checkout-web-smoke",
  capturedAt: "2026-04-18T09:03:31Z",
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

const projectImportPreviewResponse = {
  status: "PREVIEW_READY",
  kind: "catalog-project-import-preview",
  summary: {
    totalRows: 1,
    createCount: 1,
    updateCount: 0,
    conflictCount: 0
  },
  rows: [
    {
      key: "ops-console",
      name: "ops-console",
      scope: "Operations back office",
      environments: ["staging"],
      note: "Imported from project catalog batch",
      action: "create",
      warnings: []
    }
  ],
  conflicts: []
};

const projectImportCommitResponse = {
  status: "ACCEPTED",
  kind: "catalog-project-import",
  created: 1,
  updated: 0,
  totalProjects: 3,
  path: "config/phase3/project-catalog.json"
};

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("loads the admin snapshot from the local API", async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(snapshot));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Projects/ }));
    expect((await screen.findAllByText("checkout-web")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Project catalog")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/admin-console");
  });

  it("refreshes the dashboard snapshot and hands off New run to Execution", async () => {
    let adminConsoleCalls = 0;
    const refreshResolver: {
      current: ((value: Response | PromiseLike<Response>) => void) | null;
    } = { current: null };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        adminConsoleCalls += 1;
        if (adminConsoleCalls === 1) {
          return jsonResponse(snapshot);
        }
        return new Promise<Response>((resolve) => {
          refreshResolver.current = resolve;
        });
      }
      if (url.endsWith("/api/phase3/data-templates")) {
        return jsonResponse(dataTemplatesResponse);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByText("Recent runs");
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByRole("button", { name: "Refreshing..." })).toBeDisabled();

    if (refreshResolver.current) {
      refreshResolver.current(new Response(JSON.stringify(snapshot), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }));
    }

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([input]) => String(input).endsWith("/api/phase3/admin-console"))
      ).toHaveLength(2);
    });
    expect(await screen.findByText("Dashboard snapshot refreshed.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /New run/i }));

    expect(await screen.findByText("Execution center")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/data-templates");
  });

  it("opens dashboard recent-run rows with the canonical runId", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) {
        return jsonResponse(reportResponse);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByText("Recent runs");
    await userEvent.click(screen.getByRole("button", { name: "Open run checkout-web-nightly" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/report");
    });
    expect(await screen.findByText("Download artifacts")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Checkout smoke" })).toBeInTheDocument();
  });

  it("routes dashboard attention items and provider chips through existing App handoff state", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) {
        return jsonResponse(reportResponse);
      }
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/data-diff")) {
        return jsonResponse(dataDiffResponse);
      }
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/restore-result")) {
        return jsonResponse({
          runId: "checkout-web-nightly",
          status: "PARTIAL",
          items: [{ step: "restore snapshot", status: "SUCCESS", detail: "Primary schema restored" }]
        });
      }
      if (url.endsWith("/api/phase3/runs/checkout-web-smoke/status")) {
        return jsonResponse(monitorStatusResponse);
      }
      if (url.endsWith("/api/phase3/runs/checkout-web-smoke/steps")) {
        return jsonResponse(monitorStepsResponse);
      }
      if (url.endsWith("/api/phase3/runs/checkout-web-smoke/runtime-log")) {
        return jsonResponse(monitorRuntimeLogResponse);
      }
      if (url.endsWith("/api/phase3/runs/checkout-web-smoke/live-page")) {
        return jsonResponse(monitorLivePageResponse);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByText("Needs attention");

    await userEvent.click(screen.getByRole("button", { name: /Recent failed run requires triage/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/report");
    });
    expect(await screen.findByText("Download artifacts")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Dashboard/ }));
    await screen.findByText("Needs attention");

    await userEvent.click(screen.getByRole("button", { name: /Data diff review recommended/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/data-diff");
    });
    expect(await screen.findByText("Data diff - orders & inventory")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Dashboard/ }));
    await screen.findByText("Needs attention");

    await userEvent.click(screen.getByRole("button", { name: /Execution pressure needs monitoring/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-smoke/status");
    });
    expect(await screen.findByText("checkout-web")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Dashboard/ }));
    await screen.findByText("Needs attention");

    await userEvent.click(screen.getByRole("button", { name: /AI provider posture should be reviewed/i }));
    expect(await screen.findByRole("button", { name: /Add provider/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Dashboard/ }));
    await screen.findByText("provider distribution");

    await userEvent.click(screen.getByRole("button", { name: "OpenAI Responses API" }));
    expect(await screen.findByRole("button", { name: /Add provider/i })).toBeInTheDocument();
  });

  it("posts scheduler mutations and refreshes the snapshot", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse(snapshot))
      .mockImplementationOnce(() => jsonResponse(dataTemplatesResponse))
      .mockImplementationOnce(() => jsonResponse({ status: "ACCEPTED" }, 202))
      .mockImplementationOnce(() =>
        jsonResponse({
          ...snapshot,
          workQueue: [
            {
              title: "checkout-web-smoke / prod-like",
              owner: "qa-platform",
              state: "In progress",
              detail: "Worker slot active"
            }
          ]
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click((await screen.findAllByRole("button", { name: /Execution/ }))[0]);
    const [runButton] = await screen.findAllByRole("button", { name: "Run" });
    await userEvent.click(runButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/scheduler/requests",
        expect.objectContaining({
          method: "POST"
        })
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/api/phase3/scheduler/requests",
      expect.objectContaining({
        body: expect.stringContaining("\"status\":\"PRE_EXECUTION\"")
      })
    );
    expect(await screen.findByText("Prepared checkout-web-smoke for pre-execution in prod-like.")).toBeInTheDocument();
    expect((await screen.findAllByText("In progress")).length).toBeGreaterThan(0);
  });

  it("starts formal execution from the Execution action", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse(snapshot))
      .mockImplementationOnce(() => jsonResponse(dataTemplatesResponse))
      .mockImplementationOnce(() => jsonResponse({ status: "ACCEPTED" }, 202))
      .mockImplementationOnce(() => jsonResponse(snapshot))
      .mockImplementationOnce(() => jsonResponse({ status: "ACCEPTED" }, 202))
      .mockImplementationOnce(() =>
        jsonResponse({
          ...snapshot,
          workQueue: [
            {
              title: "checkout-web-smoke / prod-like",
              owner: "qa-platform",
              state: "In progress",
              detail: "Worker slot active"
            }
          ]
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Cases/ }));
    await userEvent.click((await screen.findAllByRole("button", { name: "Detail" }))[0]);
    await userEvent.click(await screen.findByRole("button", { name: "Pre-execution" }));

    await userEvent.click((await screen.findAllByRole("button", { name: /Execution/ }))[0]);
    const executionButtons = await screen.findAllByRole("button", { name: "Execution" });
    await userEvent.click(executionButtons[executionButtons.length - 1]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/scheduler/events",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"status\":\"RUNNING\"")
        })
      );
    });
    expect(await screen.findByText("Execution started for checkout-web-smoke.")).toBeInTheDocument();
  });

  it("shows prepared case count in Execution after pre-execution from Cases", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse(snapshot))
      .mockImplementationOnce(() => jsonResponse(dataTemplatesResponse));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Cases/ }));
    await userEvent.click((await screen.findAllByRole("button", { name: "Detail" }))[0]);
    await userEvent.click(await screen.findByRole("button", { name: "Pre-execution" }));

    await userEvent.click((await screen.findAllByRole("button", { name: /Execution/ }))[0]);

    expect((await screen.findAllByText("Prepared cases")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/^1$/)).length).toBeGreaterThan(0);
    expect(await screen.findByText("Only prepared cases join this run.")).toBeInTheDocument();
    expect(await screen.findByText("Checkout smoke")).toBeInTheDocument();
  });

  it("posts editable config updates and refreshes the snapshot", async () => {
    const modelProvider = {
      id: "openai-responses",
      name: "OpenAI Responses API",
      displayName: "OpenAI Responses API",
      model: "gpt-4.1-mini",
      endpoint: "https://api.openai.com/v1",
      apiKey: "",
      modality: "browser automation",
      contextWindow: "128k",
      maxOutputTokens: "4096",
      temperature: "0.2",
      timeoutMs: "45000",
      status: "active",
      role: "primary",
      region: "global",
      notes: "Primary provider.",
      usage: "24%",
      latency: "640ms",
      cost: "$0.009/call",
      accent: "accent"
    };
    const snapshotWithProvider = {
      ...snapshot,
      modelConfig: [
        { label: "Provider", value: "OpenAI Responses API" },
        { label: "provider:openai-responses", value: JSON.stringify(modelProvider) }
      ]
    };
    const refreshedSnapshot = {
      ...snapshotWithProvider,
      modelConfig: [
        { label: "Provider", value: "OpenAI Responses API / audited" },
        {
          label: "provider:openai-responses",
          value: JSON.stringify({ ...modelProvider, name: "OpenAI Responses API / audited", displayName: "OpenAI Responses API / audited" })
        }
      ]
    };
    let saveTriggered = false;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(saveTriggered ? refreshedSnapshot : snapshotWithProvider);
      }
      if (url.endsWith("/api/phase3/config/model")) {
        saveTriggered = true;
        return jsonResponse({ status: "ACCEPTED" }, 202);
      }
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Model Config/ }));
    await userEvent.click(await screen.findByText("OpenAI Responses API"));
    const providerNameInput = await screen.findByLabelText("Provider name");
    await userEvent.clear(providerNameInput);
    await userEvent.type(providerNameInput, "OpenAI Responses API / audited");
    await userEvent.click(screen.getByRole("button", { name: "Update" }));

    await userEvent.click(screen.getByRole("button", { name: "Save model config" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/config/model",
        expect.objectContaining({
          method: "POST"
        })
      );
    });
    expect(await screen.findByText("Saved model configuration.")).toBeInTheDocument();
    expect(await screen.findByText("OpenAI Responses API / audited")).toBeInTheDocument();
  });

  it("persists locally edited routing rules through the existing model config save flow", async () => {
    const routingRule = {
      id: "route-case-generation",
      task: "case generation",
      primary: "gpt-4.1-mini",
      fallback: ["claude-4.5-sonnet"],
      reason: "Fast default for structured generation."
    };
    const snapshotWithRoutingRule = {
      ...snapshot,
      modelConfig: [
        { label: "Provider", value: "OpenAI Responses API" },
        { label: "route:route-case-generation", value: JSON.stringify(routingRule) }
      ]
    };
    const savedRequestBodies: string[] = [];
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshotWithRoutingRule);
      }
      if (url.endsWith("/api/phase3/config/model")) {
        savedRequestBodies.push(String(init?.body ?? ""));
        return jsonResponse({ status: "ACCEPTED" }, 202);
      }
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Model Config/ }));
    await userEvent.click(screen.getByRole("button", { name: /Edit routing rule for case generation/i }));

    const taskInput = screen.getByDisplayValue("case generation");
    const primaryInput = screen.getByDisplayValue("gpt-4.1-mini");
    const fallbackInput = screen.getByDisplayValue("claude-4.5-sonnet");
    const reasonInput = screen.getByDisplayValue("Fast default for structured generation.");

    await userEvent.clear(taskInput);
    await userEvent.type(taskInput, "locator repair");
    await userEvent.clear(primaryInput);
    await userEvent.type(primaryInput, "gpt-4.1");
    await userEvent.clear(fallbackInput);
    await userEvent.type(fallbackInput, "claude-4.5-sonnet, gpt-4.1-mini");
    await userEvent.clear(reasonInput);
    await userEvent.type(reasonInput, "Prefer higher quality for repair.");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));

    await userEvent.click(screen.getByRole("button", { name: "Save model config" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/config/model",
        expect.objectContaining({ method: "POST" })
      );
    });
    const savedRouteItem = savedRequestBodies
      .map((body) => JSON.parse(body))
      .find((item) => item.label === "route:route-case-generation");
    expect(savedRouteItem).toEqual({
      label: "route:route-case-generation",
      value: JSON.stringify({
        id: "route-case-generation",
        task: "locator repair",
        primary: "gpt-4.1",
        fallback: ["claude-4.5-sonnet", "gpt-4.1-mini"],
        reason: "Prefer higher quality for repair."
      })
    });
  });

  it("shows pending, success, and error states for model connection validation", async () => {
    let resolveValidation: ((value: Response | PromiseLike<Response>) => void) | null = null;
    let modelValidationCalls = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/config/model/test-connection")) {
        modelValidationCalls += 1;
        if (modelValidationCalls === 1) {
          return new Promise<Response>((resolve) => {
            resolveValidation = resolve;
          });
        }
        return Promise.resolve(new Response("validator offline", { status: 500 }));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Model Config/ }));
    await userEvent.click(screen.getAllByRole("button", { name: "Test" })[1]);

    expect(await screen.findByText(/Testing connection for /)).toBeInTheDocument();

    resolveDeferredResponse(
      resolveValidation,
      new Response(
        JSON.stringify({
          status: "PASSED",
          checks: [{ name: "endpoint-format", status: "PASSED", message: "Endpoint format looks valid." }],
          latencyMs: 120,
          resolvedModel: "gpt-4o",
          message: "Provider validation passed.",
          warnings: []
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );

    expect(await screen.findByText("Provider validation passed.")).toBeInTheDocument();
    expect(await screen.findByText("120 ms")).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Test" })[1]);

    expect(await screen.findByText(/Connection validation failed for .*validator offline/)).toBeInTheDocument();
  });

  it("keeps model save and test connection state isolated", async () => {
    let resolveValidation: ((value: Response | PromiseLike<Response>) => void) | null = null;
    let saveTriggered = false;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/config/model/test-connection")) {
        return new Promise<Response>((resolve) => {
          resolveValidation = resolve;
        });
      }
      if (url.endsWith("/api/phase3/config/model")) {
        saveTriggered = true;
        return jsonResponse({ status: "ACCEPTED" }, 202);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Model Config/ }));
    await userEvent.click(screen.getAllByRole("button", { name: "Test" })[1]);

    expect(await screen.findByText(/Testing connection for /)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save model config" }));

    await waitFor(() => {
      expect(saveTriggered).toBe(true);
    });
    expect(await screen.findByText("Saved model configuration.")).toBeInTheDocument();
    expect(screen.getByText(/Testing connection for /)).toBeInTheDocument();

    resolveDeferredResponse(
      resolveValidation,
      new Response(
        JSON.stringify({
          status: "PASSED",
          checks: [{ name: "provider-name", status: "PASSED", message: "Provider name is present." }],
          latencyMs: 88,
          resolvedModel: "gpt-4o",
          message: "Provider validation passed.",
          warnings: []
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );

    expect(await screen.findByText("Provider validation passed.")).toBeInTheDocument();
  });

  it("shows pending, success, and error states for datasource connection validation", async () => {
    let resolveValidation: ((value: Response | PromiseLike<Response>) => void) | null = null;
    let datasourceValidationCalls = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/datasources/test-connection")) {
        datasourceValidationCalls += 1;
        if (datasourceValidationCalls === 1) {
          return new Promise<Response>((resolve) => {
            resolveValidation = resolve;
          });
        }
        return Promise.resolve(new Response("db validator offline", { status: 500 }));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Environment Config/ }));
    await userEvent.click(screen.getAllByRole("button", { name: "Test connection" })[0]);

    expect(await screen.findByText(/Testing connection for /)).toBeInTheDocument();

    resolveDeferredResponse(
      resolveValidation,
      new Response(
        JSON.stringify({
          status: "PASSED",
          checks: [{ name: "jdbc-url-shape", status: "PASSED", message: "JDBC URL shape matches the datasource type." }],
          resolvedDriver: "oracle.jdbc.OracleDriver",
          message: "Datasource validation passed.",
          warnings: []
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );

    expect(await screen.findByText("Datasource validation passed.")).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Test connection" })[0]);

    expect(await screen.findByText(/Connection validation failed for .*db validator offline/)).toBeInTheDocument();
  });

  it("keeps environment save and test connection state isolated", async () => {
    let resolveValidation: ((value: Response | PromiseLike<Response>) => void) | null = null;
    let environmentSaved = false;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/datasources/test-connection")) {
        return new Promise<Response>((resolve) => {
          resolveValidation = resolve;
        });
      }
      if (url.endsWith("/api/phase3/config/environment")) {
        environmentSaved = true;
        return jsonResponse({ status: "ACCEPTED" }, 202);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Environment Config/ }));
    await userEvent.click(screen.getByText("checkout-oracle-main-prodlike"));
    await userEvent.click(screen.getAllByRole("button", { name: "Test connection" })[1]);

    expect(await screen.findByText(/Testing connection for /)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save database" }));

    await waitFor(() => {
      expect(environmentSaved).toBe(true);
    });
    expect(await screen.findByText("Saved environment configuration.")).toBeInTheDocument();
    expect(screen.getByText(/Testing connection for /)).toBeInTheDocument();

    resolveDeferredResponse(
      resolveValidation,
      new Response(
        JSON.stringify({
          status: "PASSED",
          checks: [{ name: "driver-type-match", status: "PASSED", message: "Driver matches the datasource type." }],
          resolvedDriver: "oracle.jdbc.OracleDriver",
          message: "Datasource validation passed.",
          warnings: []
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );

    expect(await screen.findByText("Datasource validation passed.")).toBeInTheDocument();
  });

  it("posts editable project catalog updates and refreshes the snapshot", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse(snapshot))
      .mockImplementationOnce(() => jsonResponse({ status: "ACCEPTED" }, 202))
      .mockImplementationOnce(() => jsonResponse({ status: "ACCEPTED" }, 202))
      .mockImplementationOnce(() =>
        jsonResponse({
          ...snapshot,
          projects: [
            {
              key: "checkout-web",
              name: "checkout-web",
              scope: "Payment journey / audited",
              suites: 18,
              environments: 3,
              note: "Updated through the local catalog API."
            },
            {
              key: "member-center",
              name: "member-center",
              scope: "Profile flows",
              suites: 9,
              environments: 1,
              note: "stable"
            }
          ]
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Projects/ }));
    const scopeInputs = await screen.findAllByDisplayValue("Payment journey");
    await userEvent.clear(scopeInputs[0]);
    await userEvent.type(scopeInputs[0], "Payment journey / audited");

    await userEvent.click(screen.getByRole("button", { name: "Save project catalog" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/catalog/project",
        expect.objectContaining({
          method: "POST"
        })
      );
    });
    expect(await screen.findByText("Saved project catalog.")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Payment journey / audited")).toBeInTheDocument();
  });

  it("runs project import preview and commit through the new catalog import endpoints", async () => {
    let importCommitted = false;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(
          importCommitted
            ? {
                ...snapshot,
                projects: [
                  ...snapshot.projects,
                  {
                    key: "ops-console",
                    name: "ops-console",
                    scope: "Operations back office",
                    suites: 6,
                    environments: 1,
                    note: "Imported from project catalog batch"
                  }
                ]
              }
            : snapshot
        );
      }
      if (url.endsWith("/api/phase3/catalog/project/import/preview")) {
        return jsonResponse(projectImportPreviewResponse, 202);
      }
      if (url.endsWith("/api/phase3/catalog/project/import/commit")) {
        importCommitted = true;
        return jsonResponse(projectImportCommitResponse, 202);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Projects/ }));
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    await userEvent.click(screen.getByRole("button", { name: "Preview import" }));

    expect(await screen.findByText("Preview ready for 1 project row(s).")).toBeInTheDocument();
    expect(await screen.findByText("ops-console")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Commit import" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/catalog/project/import/commit",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(await screen.findByText("Imported 1 project row(s): 1 created, 0 updated.")).toBeInTheDocument();
    expect((await screen.findAllByText("ops-console")).length).toBeGreaterThan(0);
  });

  it("shows project import error feedback when preview fails", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/catalog/project/import/preview")) {
        return jsonResponse({ error: "BAD_REQUEST", message: "Missing required field: scope" }, 400);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Projects/ }));
    await userEvent.click(screen.getByRole("button", { name: "Import" }));

    const importInput = screen.getByLabelText("Import JSON");
    fireEvent.change(importInput, {
      target: {
        value: JSON.stringify(
          [
            {
              key: "ops-console",
              name: "ops-console"
            }
          ],
          null,
          2
        )
      }
    });

    await userEvent.click(screen.getByRole("button", { name: "Preview import" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/catalog/project/import/preview",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(await screen.findByText("Missing required field: scope")).toBeInTheDocument();
    expect(screen.queryByText("Preview ready for 1 project row(s).")).not.toBeInTheDocument();
  });

  it("adds a new project row and persists it through the existing catalog save flow", async () => {
    let snapshotAfterSave = snapshot;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshotAfterSave);
      }
      if (url.endsWith("/api/phase3/catalog/project")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { key?: string; name?: string; scope?: string; note?: string };
        if (body.key === "ops-console") {
          snapshotAfterSave = {
            ...snapshot,
            projects: [
              ...snapshot.projects,
              {
                key: "ops-console",
                name: "ops-console",
                scope: "Operations back office",
                suites: 6,
                environments: 1,
                note: body.note ?? "Created from draft row."
              }
            ]
          };
        }
        return jsonResponse({ status: "ACCEPTED" }, 202);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Projects/ }));
    await userEvent.click(screen.getByRole("button", { name: /New project/i }));

    await waitFor(() => {
      expect(document.querySelectorAll(".projectsEditorRow")).toHaveLength(3);
    });

    const editorRows = Array.from(document.querySelectorAll(".projectsEditorRow"));
    const newRow = editorRows[editorRows.length - 1];
    const [keyInput] = Array.from(newRow.querySelectorAll("input"));

    expect(keyInput).toBeTruthy();
    await userEvent.type(keyInput as HTMLInputElement, "ops-console");

    const refreshedRows = Array.from(document.querySelectorAll(".projectsEditorRow"));
    const refreshedNewRow = refreshedRows[refreshedRows.length - 1];
    const refreshedInputs = Array.from(refreshedNewRow.querySelectorAll("input"));
    const nameInput = refreshedInputs[1];
    const scopeInput = refreshedInputs[2];
    const noteInput = refreshedNewRow.querySelector("textarea");

    expect(nameInput).toBeTruthy();
    expect(scopeInput).toBeTruthy();
    expect(noteInput).toBeTruthy();

    await userEvent.type(nameInput as HTMLInputElement, "ops-console");
    await userEvent.type(scopeInput as HTMLInputElement, "Operations back office");
    await userEvent.type(noteInput as HTMLTextAreaElement, "Created from draft row.");
    await userEvent.click(screen.getByRole("button", { name: "Save project catalog" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/catalog/project",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) =>
          String(input).endsWith("/api/phase3/catalog/project") &&
          String((init as RequestInit | undefined)?.body ?? "").includes("\"key\":\"ops-console\"")
      )
    ).toBe(true);
    expect(await screen.findByText("Saved project catalog.")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([input]) => String(input).endsWith("/api/phase3/admin-console"))
      ).toHaveLength(2);
    });
  });

  it("hands off Enter project into Cases with the selected project context", async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(snapshot));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Projects/ }));
    const openButtons = await screen.findAllByRole("button", { name: "Open" });
    await userEvent.click(openButtons[1]);
    await userEvent.click(await screen.findByRole("button", { name: "Enter project" }));

    expect(await screen.findByText("Case catalog")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "member-center" })).toBeInTheDocument();
  });

  it("hands off project Reports actions into the Reports screen", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/runs/")) {
        return jsonResponse({
          items: [
            {
              runId: "member-center-daily",
              runName: "member-center-daily",
              status: "SUCCESS",
              startedAt: "2026-04-18T08:00:00Z",
              finishedAt: "2026-04-18T08:30:00Z",
              durationMs: 1800000,
              projectKey: "member-center",
              projectName: "member-center",
              caseId: "member-profile-save",
              caseName: "Profile save",
              environment: "staging-edge",
              model: "gpt-4.1-mini",
              operator: "qa-platform",
              entry: "5 artifacts exported",
              stepsTotal: 8,
              stepsPassed: 8,
              assertionsTotal: 5,
              assertionsPassed: 5,
              artifactCount: 5,
              outputDir: "runs/member-center-daily"
            }
          ]
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Projects/ }));
    const reportsButtons = await screen.findAllByRole("button", { name: "Reports" });
    await userEvent.click(reportsButtons[reportsButtons.length - 1]);

    expect(await screen.findByRole("heading", { name: "member-center" })).toBeInTheDocument();
    expect(await screen.findByText("member-center-daily")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Projects/ }));
    const openButtons = await screen.findAllByRole("button", { name: "Open" });
    await userEvent.click(openButtons[1]);
    await userEvent.click(await screen.findByRole("button", { name: "View reports" }));

    expect(await screen.findByRole("heading", { name: "member-center" })).toBeInTheDocument();
    expect(await screen.findByText("member-center-daily")).toBeInTheDocument();
  }, 20000);

  it("opens reports from projects handoff via existing App state", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/runs/")) {
        return jsonResponse({
          items: [
            {
              runId: "member-center-daily",
              runName: "member-center-daily",
              status: "SUCCESS",
              startedAt: "2026-04-18T08:00:00Z",
              finishedAt: "2026-04-18T08:30:00Z",
              durationMs: 1800000,
              projectKey: "member-center",
              projectName: "member-center",
              caseId: "member-profile-save",
              caseName: "Profile save",
              environment: "staging-edge",
              model: "gpt-4.1-mini",
              operator: "qa-platform",
              entry: "5 artifacts exported",
              stepsTotal: 8,
              stepsPassed: 8,
              assertionsTotal: 5,
              assertionsPassed: 5,
              artifactCount: 5,
              outputDir: "runs/member-center-daily"
            }
          ]
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Projects/ }));
    const openButtons = await screen.findAllByRole("button", { name: "Open" });
    await userEvent.click(openButtons[1]);
    await userEvent.click(await screen.findByRole("button", { name: "View reports" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/");
    });
    expect(await screen.findByRole("heading", { name: "member-center" })).toBeInTheDocument();
    expect(await screen.findByText("member-center-daily")).toBeInTheDocument();
  });

  it("hands off reports -> reportDetail -> dataDiff with canonical runId", async () => {
    const restoreResultResponse = {
      runId: "checkout-web-nightly",
      status: "PARTIAL",
      items: [
        { step: "restore snapshot", status: "SUCCESS", detail: "Primary schema restored" }
      ]
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/")) {
        return jsonResponse({
          items: [
            {
              runId: "checkout-web-nightly",
              runName: "checkout-web-nightly",
              status: "FAILED",
              startedAt: "2026-04-18T09:00:00Z",
              finishedAt: "2026-04-18T09:10:00Z",
              durationMs: 600000,
              projectKey: "checkout-web",
              projectName: "checkout-web",
              caseId: "checkout-smoke",
              caseName: "Checkout smoke",
              environment: "staging-edge",
              model: "claude-4.5-sonnet",
              operator: "qa-platform",
              entry: "Failure analysis pending",
              stepsTotal: 8,
              stepsPassed: 7,
              assertionsTotal: 11,
              assertionsPassed: 10,
              artifactCount: 3,
              outputDir: "runs/checkout-web-nightly"
            }
          ]
        });
      }
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) return jsonResponse(reportResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/data-diff")) return jsonResponse(dataDiffResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/restore-result")) return jsonResponse(restoreResultResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Reports/ }));
    await screen.findByText("checkout-web-nightly");
    await userEvent.click((await screen.findAllByRole("button", { name: /Detail|Opened/ }))[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/report");
    });
    expect(await screen.findByText("Download artifacts")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Data diff" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/data-diff");
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/restore-result");
    });
    expect(await screen.findByText("Data diff - orders & inventory")).toBeInTheDocument();
    expect(await screen.findByText("checkout-oracle-main-prodlike")).toBeInTheDocument();
    expect(await screen.findByText("Restore result")).toBeInTheDocument();
  });

  it("opens case detail inside the Cases screen", async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(snapshot));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Cases/ }));
    await userEvent.click((await screen.findAllByRole("button", { name: "Detail" }))[0]);

    expect(await screen.findByText("Case catalog")).toBeInTheDocument();
    expect(await screen.findByText("Steps")).toBeInTheDocument();
    expect(screen.getAllByText("Checkout smoke").length).toBeGreaterThan(0);
  });

  it("keeps Cases detail inside the Cases screen", async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(snapshot));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Cases/ }));
    await userEvent.click((await screen.findAllByRole("button", { name: "Detail" }))[0]);

    expect(await screen.findByText("Case catalog")).toBeInTheDocument();
    expect(screen.getAllByText("Checkout smoke").length).toBeGreaterThan(0);
    expect(screen.queryByText("Document catalog")).not.toBeInTheDocument();
  });

  it("uploads a file from DocParse and shows action status", async () => {
    const uploadResponse = {
      status: "ACCEPTED",
      uploaded: [{ id: "checkout-web-test-doc-md", name: "test-doc.md" }]
    };
    const rawResponse = {
      documentId: "checkout-web-primary",
      name: "checkout-regression-v3.md",
      projectKey: "checkout-web",
      content: "# Checkout regression\n\nUploaded raw source",
      uploadedAt: "2026-04-25T10:00:00Z"
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/documents/upload")) {
        return jsonResponse(uploadResponse, 202);
      }
       if (url.endsWith("/api/phase3/documents/checkout-web-primary/parse-result")) {
        return jsonResponse({ status: "NOT_FOUND", documentId: "checkout-web-primary" });
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/raw")) {
        return jsonResponse(rawResponse);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/versions")) {
        return jsonResponse({ documentId: "checkout-web-primary", items: [] });
      }
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    // Mock FileReader
    const mockFileReader = {
      result: "# Test document content",
      readAsText: vi.fn(),
      onload: null as (() => void) | null
    };
    mockFileReader.readAsText.mockImplementation(function (this: typeof mockFileReader) {
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }.bind(mockFileReader));
    vi.stubGlobal("FileReader", vi.fn(() => mockFileReader));

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Doc Parse/ }));
    await screen.findByText("Document catalog");

    // Upload a file
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File(["# Test document content"], "test-doc.md", { type: "text/markdown" });
    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/documents/upload",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"fileName\":\"test-doc.md\"")
        })
      );
    });
    expect(await screen.findByText("Upload complete")).toBeInTheDocument();

    // Open a document and switch to raw tab to see uploaded files list
    const detailButtons = await screen.findAllByRole("button", { name: /Detail/ });
    await userEvent.click(detailButtons[0]);
    await userEvent.click(await screen.findByRole("button", { name: "Raw document" }));
    expect(await screen.findByText("test-doc.md")).toBeInTheDocument();
    expect(await screen.findByText("Uploaded raw source")).toBeInTheDocument();
  });

  it("loads raw document and version history from backend when opening DocParse detail", async () => {
    const parseResultResponse = {
      documentId: "checkout-web-primary",
      projectKey: "checkout-web",
      detectedCases: [
        { id: "checkout-api", name: "Checkout API-backed case", category: "happy", confidence: "high" }
      ],
      reasoning: [
        { label: "Structure", body: "Loaded from backend parse result." }
      ],
      missing: ["DB seed baseline"]
    };
    const rawResponse = {
      documentId: "checkout-web-primary",
      name: "checkout-regression-v3.md",
      projectKey: "checkout-web",
      content: "# Backend raw document",
      uploadedAt: "2026-04-25T10:00:00Z"
    };
    const versionsResponse = {
      documentId: "checkout-web-primary",
      items: [
        { id: "v2", label: "v2", time: "2026-04-25T10:10:00Z", summary: "Re-parsed document and refreshed detected cases." },
        { id: "v1", label: "v1", time: "2026-04-25T10:00:00Z", summary: "Uploaded document and generated initial parse result." }
      ]
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/parse-result")) {
        return jsonResponse(parseResultResponse);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/raw")) {
        return jsonResponse(rawResponse);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/versions")) {
        return jsonResponse(versionsResponse);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Doc Parse/ }));
    await userEvent.click((await screen.findAllByRole("button", { name: /Detail/ }))[0]);

    expect(await screen.findByText("Checkout API-backed case")).toBeInTheDocument();
    expect(await screen.findByText("Loaded from backend parse result.")).toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", { name: "Raw document" }));
    expect(await screen.findByText("# Backend raw document")).toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", { name: "Version history" }));
    expect(await screen.findByText("Uploaded document and generated initial parse result.")).toBeInTheDocument();
    expect(await screen.findByText("Re-parsed document and refreshed detected cases.")).toBeInTheDocument();
  });

  it("re-parses a document and refreshes the parse result in UI", async () => {
    const reparseResponse = {
      status: "ACCEPTED",
      kind: "document-reparse",
      documentId: "checkout-web-primary"
    };
    const parseResultResponse = {
      documentId: "checkout-web-primary",
      projectKey: "checkout-web",
      detectedCases: [
        { id: "checkout-reparsed", name: "Checkout reparsed case", category: "happy", confidence: "high" }
      ],
      reasoning: [
        { label: "Structure", body: "Re-parsed from updated source." }
      ],
      missing: []
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/reparse")) {
        return jsonResponse(reparseResponse, 202);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/parse-result")) {
        return jsonResponse(parseResultResponse);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/raw")) {
        return jsonResponse({
          documentId: "checkout-web-primary",
          name: "checkout-regression-v3.md",
          projectKey: "checkout-web",
          content: "# Checkout regression\n\nRaw source",
          uploadedAt: "2026-04-25T10:00:00Z"
        });
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/versions")) {
        return jsonResponse({
          documentId: "checkout-web-primary",
          items: [{ id: "v1", label: "v1", time: "2026-04-25T10:00:00Z", summary: "Uploaded document and generated initial parse result." }]
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Doc Parse/ }));
    await screen.findByText("Document catalog");

    // Open the first document
    const detailButtons = await screen.findAllByRole("button", { name: /Detail/ });
    await userEvent.click(detailButtons[0]);

    // Click Re-parse
    await userEvent.click(await screen.findByRole("button", { name: "Re-parse" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/documents/checkout-web-primary/reparse",
        expect.objectContaining({ method: "POST" })
      );
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/documents/checkout-web-primary/parse-result"
      );
    });
    expect(await screen.findByText("Re-parse complete")).toBeInTheDocument();
    expect((await screen.findAllByText("Checkout reparsed case")).length).toBeGreaterThan(0);
  });

  it("opens manual edit, saves edited cases, and updates UI", async () => {
    const saveResponse = {
      status: "ACCEPTED",
      kind: "document-parse-edit",
      documentId: "checkout-web-primary"
    };
    let currentParseResult = {
      documentId: "checkout-web-primary",
      projectKey: "checkout-web",
      detectedCases: [
        { id: "checkout-smoke", name: "Checkout smoke", category: "happy", confidence: "high" }
      ],
      reasoning: [{ label: "Structure", body: "Initial parse result." }],
      missing: []
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/parse-result") && !init?.method) {
        return jsonResponse(currentParseResult);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/parse-result") && init?.method === "PUT") {
        currentParseResult = {
          documentId: "checkout-web-primary",
          projectKey: "checkout-web",
          detectedCases: [
            { id: "custom-1", name: "Custom edited case", category: "boundary", confidence: "low" }
          ],
          reasoning: [{ label: "Manual edit", body: "Parse result was manually updated." }],
          missing: []
        };
        return jsonResponse(saveResponse, 202);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/raw")) {
        return jsonResponse({
          documentId: "checkout-web-primary",
          name: "checkout-regression-v3.md",
          projectKey: "checkout-web",
          content: "# Checkout regression\n\nRaw source",
          uploadedAt: "2026-04-25T10:00:00Z"
        });
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/versions")) {
        return jsonResponse({
          documentId: "checkout-web-primary",
          items: [{ id: "v2", label: "v2", time: "2026-04-25T10:10:00Z", summary: "Manually edited detected cases by operator." }]
        });
      }
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Doc Parse/ }));
    await screen.findByText("Document catalog");

    // Open the first document
    const detailButtons = await screen.findAllByRole("button", { name: /Detail/ });
    await userEvent.click(detailButtons[0]);

    // Click Manual edit hero button
    const heroActions = document.querySelector(".docParseHeroActions") as HTMLElement;
    const manualEditButton = heroActions.querySelector("button:nth-child(2)") as HTMLButtonElement;
    await userEvent.click(manualEditButton);

    // Verify editor panel opens with Save and Cancel buttons
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    // Modify the textarea with custom cases
    const textarea = document.querySelector("textarea.casesDslEditor") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    const editedJson = JSON.stringify([{ id: "custom-1", name: "Custom edited case", category: "boundary", confidence: "low" }], null, 2);
    fireEvent.change(textarea, { target: { value: editedJson } });

    // Click Save
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/documents/checkout-web-primary/parse-result",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("\"detectedCases\"")
        })
      );
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    // Editor should be closed
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    // Updated case should appear
    expect((await screen.findAllByText("Custom edited case")).length).toBeGreaterThan(0);
  });

  it("switches reportDetail tabs and fetches tab-specific data from real endpoints", async () => {
    const stepsResponse = {
      runId: "checkout-web-nightly",
      items: [
        { index: 1, label: "Open cart page", state: "DONE", durationMs: 1200 },
        { index: 2, label: "Fill payment form", state: "DONE", durationMs: 3400 }
      ]
    };
    const assertionsResponse = {
      runId: "checkout-web-nightly",
      items: [
        { name: "url matches /order/confirm", action: "ASSERT_URL", status: "FAILED", message: "got /checkout/payment", pass: false }
      ]
    };
    const recoveryResponse = {
      runId: "checkout-web-nightly",
      status: "PARTIAL",
      items: [
        { step: "restore snapshot", status: "SUCCESS", detail: "Primary schema restored" }
      ]
    };
    const aiDecisionsResponse = {
      runId: "checkout-web-nightly",
      items: [
        { at: "2026-04-20T05:37:12Z", type: "LOCATOR_HEAL", model: "claude-4.5-sonnet", summary: "Candidate[1] selected" }
      ]
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) return jsonResponse(reportResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/steps")) return jsonResponse(stepsResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/assertions")) return jsonResponse(assertionsResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/recovery")) return jsonResponse(recoveryResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/ai-decisions")) return jsonResponse(aiDecisionsResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    // Navigate to reportDetail
    await screen.findByText("Recent runs");
    await userEvent.click(screen.getByRole("button", { name: "Open run checkout-web-nightly" }));
    expect(await screen.findByText("Download artifacts")).toBeInTheDocument();

    // Steps tab
    await userEvent.click(screen.getByRole("button", { name: "Steps" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/steps");
    });
    expect(await screen.findByText("Open cart page")).toBeInTheDocument();
    expect(await screen.findByText("Fill payment form")).toBeInTheDocument();

    // Assertions tab
    await userEvent.click(screen.getByRole("button", { name: "Assertions" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/assertions");
    });
    expect(await screen.findByText("url matches /order/confirm")).toBeInTheDocument();

    // Recovery tab
    await userEvent.click(screen.getByRole("button", { name: "Recovery" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/recovery");
    });
    expect(await screen.findByText("restore snapshot")).toBeInTheDocument();
    expect(await screen.findByText("PARTIAL")).toBeInTheDocument();

    // AI decisions tab
    await userEvent.click(screen.getByRole("button", { name: "AI decisions" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/ai-decisions");
    });
    expect(await screen.findByText("LOCATOR_HEAL")).toBeInTheDocument();
    expect(await screen.findByText("Candidate[1] selected")).toBeInTheDocument();

    // Overview tab returns to summary
    await userEvent.click(screen.getByRole("button", { name: "Overview" }));
    expect(await screen.findByText("Summary")).toBeInTheDocument();
  });

  it("opens artifact listing on Download artifacts click", async () => {
    const artifactsResponse = {
      runId: "checkout-web-nightly",
      items: [
        { kind: "report-html", label: "report.html", path: "/runs/checkout-web-nightly/report.html" },
        { kind: "report-json", label: "report.json", path: "/runs/checkout-web-nightly/report.json" }
      ]
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) return jsonResponse(reportResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/artifacts")) return jsonResponse(artifactsResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByText("Recent runs");
    await userEvent.click(screen.getByRole("button", { name: "Open run checkout-web-nightly" }));
    expect(await screen.findByText("Download artifacts")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Download artifacts" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/artifacts");
    });
    expect(await screen.findByText("report.html")).toBeInTheDocument();
    expect(await screen.findByText("report.json")).toBeInTheDocument();
    expect(await screen.findByText(/Artifacts/)).toBeInTheDocument();
  });

  it("keeps reportDetail usable when artifact fetch fails", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) return jsonResponse(reportResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/artifacts")) return Promise.resolve(new Response("boom", { status: 500 }));
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByText("Recent runs");
    await userEvent.click(screen.getByRole("button", { name: "Open run checkout-web-nightly" }));
    expect(await screen.findByText("Download artifacts")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Download artifacts" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/artifacts");
    });
    expect(screen.queryByText(/Artifacts/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Re-run" })).toBeInTheDocument();
  });

  it("hands off Re-run from reportDetail into execution with run context", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) return jsonResponse(reportResponse);
      if (url.endsWith("/api/phase3/data-templates")) return jsonResponse(dataTemplatesResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByText("Recent runs");
    await userEvent.click(screen.getByRole("button", { name: "Open run checkout-web-nightly" }));
    expect(await screen.findByText("Download artifacts")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Re-run" }));

    // Should navigate to execution
    expect(await screen.findByText("Execution center")).toBeInTheDocument();
    // The run ID should be pre-filled
    const runIdInput = document.querySelector("input[value='checkout-web-nightly']") as HTMLInputElement;
    expect(runIdInput).toBeTruthy();
  });

  it("opens raw JSON drawer on View raw JSON click in dataDiff", async () => {
    const restoreResultResponse = {
      runId: "checkout-web-nightly",
      status: "PARTIAL",
      items: [
        { step: "restore snapshot", status: "SUCCESS", detail: "Primary schema restored" }
      ]
    };
    const rawDiffResponse = {
      runId: "checkout-web-nightly",
      before: [
        { key: { table: "orders", pk: "ord_8821", field: "status" }, value: "null" }
      ],
      after: [
        { key: { table: "orders", pk: "ord_8821", field: "status" }, value: "\"paid\"" }
      ],
      afterRestore: [
        { key: { table: "orders", pk: "ord_8821", field: "status" }, value: "null" }
      ]
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) return jsonResponse(reportResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/data-diff")) return jsonResponse(dataDiffResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/restore-result")) return jsonResponse(restoreResultResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/data-diff/raw")) return jsonResponse(rawDiffResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    // Navigate: dashboard → reportDetail → dataDiff
    await screen.findByText("Recent runs");
    await userEvent.click(screen.getByRole("button", { name: "Open run checkout-web-nightly" }));
    expect(await screen.findByText("Download artifacts")).toBeInTheDocument();

    // Switch to dataDiff via the Data diff tab
    await userEvent.click(screen.getByRole("button", { name: "Data diff" }));
    expect(await screen.findByText("Data diff - orders & inventory")).toBeInTheDocument();

    // Click View raw JSON
    await userEvent.click(screen.getByRole("button", { name: "View raw JSON" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/data-diff/raw");
    });

    // Drawer should be visible with raw data
    expect(await screen.findByTestId("raw-json-drawer")).toBeInTheDocument();
    expect(await screen.findByText("Raw diff JSON")).toBeInTheDocument();
    expect(await screen.findByText("Before")).toBeInTheDocument();

    // Switch to After tab
    await userEvent.click(screen.getByRole("button", { name: "After" }));
    expect(await screen.findByText(/"paid"/)).toBeInTheDocument();

    // Close drawer
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("raw-json-drawer")).not.toBeInTheDocument();
  });

  it("shows raw JSON error state when raw diff fetch fails", async () => {
    const restoreResultResponse = {
      runId: "checkout-web-nightly",
      status: "PARTIAL",
      items: []
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) return jsonResponse(reportResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/data-diff")) return jsonResponse(dataDiffResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/restore-result")) return jsonResponse(restoreResultResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/data-diff/raw")) return Promise.resolve(new Response("boom", { status: 500 }));
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByText("Recent runs");
    await userEvent.click(screen.getByRole("button", { name: "Open run checkout-web-nightly" }));
    await userEvent.click(screen.getByRole("button", { name: "Data diff" }));
    await screen.findByText("Data diff - orders & inventory");
    await userEvent.click(screen.getByRole("button", { name: "View raw JSON" }));

    expect(await screen.findByTestId("raw-json-drawer")).toBeInTheDocument();
    expect(await screen.findByText(/Failed to load raw diff/)).toBeInTheDocument();
  });

  it("calls re-restore endpoint and shows status feedback in dataDiff", async () => {
    const restoreResultResponse = {
      runId: "checkout-web-nightly",
      status: "PARTIAL",
      items: [
        { step: "restore snapshot", status: "SUCCESS", detail: "Primary schema restored" }
      ]
    };
    const restoreResultAfterRetry = {
      runId: "checkout-web-nightly",
      status: "SUCCESS",
      items: [
        { step: "restore snapshot", status: "SUCCESS", detail: "Primary schema restored" },
        { step: "verify coupon rollback", status: "SUCCESS", detail: "Rollback verified" }
      ]
    };
    const restoreRetryResponse = {
      status: "ACCEPTED",
      kind: "restore-retry",
      runId: "checkout-web-nightly",
      requestedState: "RESTORE_RETRY_QUEUED",
      message: "Restore retry queued by qa-platform"
    };
    let restoreResultCalls = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) return jsonResponse(reportResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/data-diff") && (!init || init.method !== "POST")) return jsonResponse(dataDiffResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/restore-result")) {
        restoreResultCalls += 1;
        return jsonResponse(restoreResultCalls > 1 ? restoreResultAfterRetry : restoreResultResponse);
      }
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/restore/retry")) return jsonResponse(restoreRetryResponse, 202);
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    // Navigate: dashboard → reportDetail → dataDiff
    await screen.findByText("Recent runs");
    await userEvent.click(screen.getByRole("button", { name: "Open run checkout-web-nightly" }));
    expect(await screen.findByText("Download artifacts")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Data diff" }));
    expect(await screen.findByText("Data diff - orders & inventory")).toBeInTheDocument();

    // Click Re-restore
    await userEvent.click(screen.getByRole("button", { name: "Re-restore" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/restore/retry",
        expect.objectContaining({ method: "POST" })
      );
    });

    // Status feedback should be visible
    expect(await screen.findByTestId("restore-status")).toBeInTheDocument();
    expect(await screen.findByText("Restore retry accepted")).toBeInTheDocument();
    expect(await screen.findByText(/Restore retry queued by qa-platform/)).toBeInTheDocument();
    expect(await screen.findByText("Rollback verified")).toBeInTheDocument();

    // Diff data should have been refreshed
    const dataDiffCalls = fetchMock.mock.calls.filter(
      (call: unknown[]) => String(call[0]).endsWith("/api/phase3/runs/checkout-web-nightly/data-diff")
    );
    expect(dataDiffCalls.length).toBeGreaterThanOrEqual(2);
    const restoreResultCallsObserved = fetchMock.mock.calls.filter(
      (call: unknown[]) => String(call[0]).endsWith("/api/phase3/runs/checkout-web-nightly/restore-result")
    );
    expect(restoreResultCallsObserved.length).toBeGreaterThanOrEqual(2);
  });

  it("shows rejected status when re-restore is rejected in dataDiff", async () => {
    const restoreResultResponse = {
      runId: "checkout-web-nightly",
      status: "PARTIAL",
      items: [
        { step: "restore snapshot", status: "SUCCESS", detail: "Primary schema restored" }
      ]
    };
    const restoreRejectedResponse = {
      status: "REJECTED",
      kind: "restore-retry",
      runId: "checkout-web-nightly",
      requestedState: "RESTORE_RETRY_QUEUED",
      message: "Restore retry already in progress for run checkout-web-nightly"
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) return jsonResponse(reportResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/data-diff") && (!init || init.method !== "POST")) return jsonResponse(dataDiffResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/restore-result")) return jsonResponse(restoreResultResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/restore/retry")) return jsonResponse(restoreRejectedResponse, 409);
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByText("Recent runs");
    await userEvent.click(screen.getByRole("button", { name: "Open run checkout-web-nightly" }));
    expect(await screen.findByText("Download artifacts")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Data diff" }));
    expect(await screen.findByText("Data diff - orders & inventory")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Re-restore" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/runs/checkout-web-nightly/restore/retry",
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(await screen.findByTestId("restore-status")).toBeInTheDocument();
    expect(await screen.findByText("Restore retry rejected")).toBeInTheDocument();
    expect(await screen.findByText(/already in progress/)).toBeInTheDocument();
  });

  it("passes runId from execution to monitor via Open Exec Monitor", async () => {
    const fetchMock = vi.fn().mockImplementation((call: unknown) => {
      const url = String(call);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/data-templates")) return jsonResponse(dataTemplatesResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-smoke/status")) return jsonResponse(monitorStatusResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-smoke/steps")) return jsonResponse(monitorStepsResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-smoke/runtime-log")) return jsonResponse(monitorRuntimeLogResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-smoke/live-page")) return jsonResponse(monitorLivePageResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    // Wait for initial render
    await screen.findByText("Needs attention");

    // Wait for app to render
    await screen.findByText("Needs attention");

    // Navigate to execution screen via sidebar
    const executionNavButtons = await screen.findAllByRole("button", { name: /Execution/ });
    await userEvent.click(executionNavButtons[0]);

    // Wait for execution page to render, click the first Open Exec Monitor button
    const monitorButtons = await screen.findAllByText("Open Exec Monitor");
    await userEvent.click(monitorButtons[0]);

    // Verify monitor fetches the correct runId
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-smoke/status");
    });

    // Verify monitor renders run context from API data — use badge class to find the specific status text
    expect(await screen.findByText("40%")).toBeInTheDocument();
    expect(await screen.findByText("Open home")).toBeInTheDocument();
  });

  it("opens monitor from execution queue-row drill-down via the existing App handoff", async () => {
    const fetchMock = vi.fn().mockImplementation((call: unknown) => {
      const url = String(call);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/data-templates")) return jsonResponse(dataTemplatesResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-smoke/status")) return jsonResponse(monitorStatusResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-smoke/steps")) return jsonResponse(monitorStepsResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-smoke/runtime-log")) return jsonResponse(monitorRuntimeLogResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-smoke/live-page")) return jsonResponse(monitorLivePageResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByText("Needs attention");

    const executionNavButtons = await screen.findAllByRole("button", { name: /Execution/ });
    await userEvent.click(executionNavButtons[0]);

    await userEvent.click(screen.getByRole("button", { name: "Open queue item checkout-web-smoke / prod-like in monitor" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/runs/checkout-web-smoke/status");
    });

    expect(await screen.findByText("40%")).toBeInTheDocument();
    expect(await screen.findByText("Open home")).toBeInTheDocument();
  });

  it("opens cases from execution prepared-case drill-down via the existing App handoff", async () => {
    const fetchMock = vi.fn().mockImplementation((call: unknown) => {
      const url = String(call);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/data-templates")) return jsonResponse(dataTemplatesResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByText("Needs attention");

    await userEvent.click((await screen.findAllByRole("button", { name: /Cases/ }))[0]);
    await userEvent.click((await screen.findAllByRole("button", { name: "Detail" }))[0]);
    await userEvent.click(await screen.findByRole("button", { name: "Pre-execution" }));

    await userEvent.click((await screen.findAllByRole("button", { name: /Execution/ }))[0]);
    await userEvent.click(screen.getByRole("button", { name: "Open prepared case Checkout smoke in cases" }));

    expect(await screen.findByText("Cases / Checkout smoke")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Checkout smoke" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Opened" })).toBeInTheDocument();
  });

  it("clears the one-shot prepared-case handoff when cases is reopened from normal navigation", async () => {
    const fetchMock = vi.fn().mockImplementation((call: unknown) => {
      const url = String(call);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/data-templates")) return jsonResponse(dataTemplatesResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByText("Needs attention");

    await userEvent.click((await screen.findAllByRole("button", { name: /Cases/ }))[0]);
    await userEvent.click((await screen.findAllByRole("button", { name: "Detail" }))[0]);
    await userEvent.click(await screen.findByRole("button", { name: "Pre-execution" }));

    await userEvent.click((await screen.findAllByRole("button", { name: /Execution/ }))[0]);
    await userEvent.click(screen.getByRole("button", { name: "Open prepared case Checkout smoke in cases" }));
    expect(await screen.findByRole("heading", { name: "Checkout smoke" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Dashboard/ }));
    await screen.findByText("Needs attention");

    await userEvent.click((await screen.findAllByRole("button", { name: /Cases/ }))[0]);

    expect(await screen.findByText("Detail area is waiting")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Opened" })).not.toBeInTheDocument();
  });

  it("shows monitor idle state when no runId is provided", async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(snapshot));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    // Wait for app to render
    await screen.findByText("Needs attention");

    // Navigate to monitor via sidebar (no runId handoff — handleScreenChange sets selectedMonitorRunId to null)
    const allButtons = screen.getAllByRole("button");
    const monitorNavButton = allButtons.find((btn) => btn.textContent?.includes("Execution monitor"));
    expect(monitorNavButton).toBeTruthy();
    await userEvent.click(monitorNavButton!);

    // Verify idle state is shown
    expect(await screen.findByText(/no run selected|未选择运行|実行未選択/i)).toBeInTheDocument();

    // Verify no run API calls were made
    const runApiCalls = fetchMock.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes("/api/phase3/runs/")
    );
    expect(runApiCalls).toHaveLength(0);
  });

  it("loads plugin popup from dedicated extension-popup endpoint", async () => {
    const popupSnapshot = {
      generatedAt: "2026-04-20T04:00:00Z",
      status: "READY",
      summary: "Phase 3 popup assistive snapshot",
      page: {
        title: "Checkout - Payment",
        url: "https://staging.example.test/checkout/payment",
        domain: "staging.example.test",
        lastUpdatedAt: "2026-04-20T04:00:00Z"
      },
      runtime: {
        mode: "Audit-first",
        queueState: "RUNNING",
        auditState: "ATTENTION",
        nextAction: "Review latest run"
      },
      hints: ["Use the platform UI for configuration and report review."]
    };

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/extension-popup")) return jsonResponse(popupSnapshot);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await screen.findByText("Needs attention");

    // Navigate to plugin screen via sidebar
    const allButtons = screen.getAllByRole("button");
    const pluginNavButton = allButtons.find((btn) => btn.textContent?.includes("Plugin popup"));
    expect(pluginNavButton).toBeTruthy();
    await userEvent.click(pluginNavButton!);

    // Verify it fetched the dedicated extension-popup endpoint
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/phase3/extension-popup");
    });

    // Verify popup snapshot data renders — host connected status and page title
    expect(await screen.findByText(/host connected|主机已连接|ホスト接続済み/)).toBeInTheDocument();
    expect(await screen.findByText("Checkout - Payment")).toBeInTheDocument();

    // Verify active run section shows runtime data from popup snapshot
    expect(await screen.findByText("running")).toBeInTheDocument();
    expect(await screen.findByText("Review latest run")).toBeInTheDocument();
  });

  it("shows plugin popup error state when extension-popup endpoint fails", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/extension-popup")) return jsonResponse({}, 500);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await screen.findByText("Needs attention");

    const allButtons = screen.getAllByRole("button");
    const pluginNavButton = allButtons.find((btn) => btn.textContent?.includes("Plugin popup"));
    expect(pluginNavButton).toBeTruthy();
    await userEvent.click(pluginNavButton!);

    // Verify error state shows host unreachable
    expect(await screen.findByText(/host unreachable|主机不可达|ホスト接続不可/)).toBeInTheDocument();
  });

  it("consumes plugin execution handoff from URL query params", async () => {
    window.history.replaceState({}, "", "/?source=plugin&screen=execution&runId=popup-run&projectKey=checkout-web&owner=edge-popup&environment=staging-edge&targetUrl=https%3A%2F%2Fcheckout.example.test%2Fpay&detail=Queued%20from%20popup");
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/data-templates")) return jsonResponse(dataTemplatesResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("Execution center")).toBeInTheDocument();
    expect((await screen.findAllByLabelText("Run ID")).some((element) => (element as HTMLInputElement).value === "popup-run")).toBe(true);
    expect((await screen.findAllByLabelText("Project")).some((element) => (element as HTMLInputElement).value === "checkout-web")).toBe(true);
    expect((await screen.findAllByLabelText("Owner")).some((element) => (element as HTMLInputElement).value === "edge-popup")).toBe(true);
    expect((await screen.findAllByLabelText("Environment")).some((element) => (element as HTMLInputElement).value === "staging-edge")).toBe(true);
    expect(await screen.findByDisplayValue("https://checkout.example.test/pay")).toBeInTheDocument();
  });

  it("consumes plugin DSL handoff from URL query params", async () => {
    window.history.replaceState({}, "", "/?source=plugin&screen=aiGenerate&projectKey=checkout-web&projectName=checkout-web&pageTitle=Checkout%20Payment&pageUrl=https%3A%2F%2Fcheckout.example.test%2Fpay&locator=%23pay-submit");
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("AI Generate")).toBeInTheDocument();
    expect((await screen.findAllByText("Checkout Payment locator review")).length).toBeGreaterThan(0);
    expect(await screen.findByText(/#pay-submit/)).toBeInTheDocument();
  });

  it("generates cases from docParse handoff via real generate endpoint", async () => {
    const generateResponse = {
      documentId: "checkout-web-primary",
      selectedCaseId: "checkout-smoke",
      generatedCases: [
        { id: "gen-checkout-smoke-a", name: "Checkout smoke", category: "happy", confidence: "0.94", summary: "Main flow." }
      ],
      reasoning: [{ label: "Coverage", body: "Expanded main flow." }],
      selectedDsl: { format: "text/x-phase3-dsl", content: 'case "Checkout smoke" {\n  step open "/api-generated-page"\n  assert url = /confirm/*\n}' },
      stateMachine: {
        states: [{ id: "page.loaded", label: "page.loaded" }, { id: "confirmed", label: "confirmed" }],
        edges: [{ from: "page.loaded", to: "confirmed", trigger: "click submit" }]
      },
      flowTree: [
        { label: "page.loaded", tone: "accent", indent: 0 },
        { label: "click submit", tone: "muted", indent: 1 },
        { label: "confirmed", tone: "success", indent: 0 }
      ]
    };

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/agent/generate-case") && !url.includes("dry-run")) return jsonResponse(generateResponse);
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: /Doc Parse/ }));
    await screen.findByText("Document catalog");

    // Open a document detail and click Generate tests
    const detailButtons = await screen.findAllByRole("button", { name: /Detail/ });
    await userEvent.click(detailButtons[0]);
    const generateButtons = await screen.findAllByText("Generate tests");
    await userEvent.click(generateButtons[0]);

    // Verify generate endpoint was called
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/agent/generate-case",
        expect.objectContaining({ method: "POST" })
      );
    });

    // Verify backend-returned DSL content (unique to API response, not in local fallback)
    expect(await screen.findByText(/api-generated-page/)).toBeInTheDocument();
    // Verify DSL validation pill reflects generation success
    expect(await screen.findByText(/schema ok|结构校验通过|スキーマ OK/)).toBeInTheDocument();
  });

  it("runs dry-run with validate-first then dry-run endpoint", async () => {
    const generateResponse = {
      documentId: "checkout-web-primary",
      selectedCaseId: "checkout-smoke",
      generatedCases: [
        { id: "gen-checkout-smoke-a", name: "Checkout smoke", category: "happy", confidence: "0.94", summary: "Main flow." }
      ],
      reasoning: [{ label: "Coverage", body: "Expanded main flow." }],
      selectedDsl: { format: "text/x-phase3-dsl", content: 'case "Checkout smoke" {\n  step open "/api-generated-page"\n}' },
      stateMachine: { states: [{ id: "s1", label: "s1" }], edges: [] },
      flowTree: [{ label: "s1", tone: "accent", indent: 0 }]
    };
    const validateResponse = { status: "VALID", errors: [], warnings: [], normalizedDsl: 'case "Checkout smoke" { step open "/api-generated-page" }' };
    const dryRunResponse = {
      status: "PASSED",
      parser: { status: "OK", errors: [] },
      runtimeChecks: [{ name: "restorePlanRef", status: "OK" }],
      suggestedLaunchForm: { projectKey: "checkout-web", environment: "staging" }
    };

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/agent/generate-case") && !url.includes("dry-run")) return jsonResponse(generateResponse);
      if (url.endsWith("/api/phase3/cases/dsl/validate")) return jsonResponse(validateResponse);
      if (url.endsWith("/api/phase3/agent/generate-case/dry-run")) return jsonResponse(dryRunResponse);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: /Doc Parse/ }));
    await screen.findByText("Document catalog");
    const detailButtons = await screen.findAllByRole("button", { name: /Detail/ });
    await userEvent.click(detailButtons[0]);
    const generateButtons = await screen.findAllByText("Generate tests");
    await userEvent.click(generateButtons[0]);

    // Wait for auto-generate to complete
    await screen.findByText(/api-generated-page/);

    // Click Dry-run
    await userEvent.click(await screen.findByText("Dry-run"));

    // Verify validate was called first
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/cases/dsl/validate",
        expect.objectContaining({ method: "POST" })
      );
    });

    // Then dry-run endpoint
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/agent/generate-case/dry-run",
        expect.objectContaining({ method: "POST" })
      );
    });

    await waitFor(() => {
      const validateIndex = fetchMock.mock.calls.findIndex(
        ([input]) => String(input) === "http://127.0.0.1:8787/api/phase3/cases/dsl/validate"
      );
      const dryRunIndex = fetchMock.mock.calls.findIndex(
        ([input]) => String(input) === "http://127.0.0.1:8787/api/phase3/agent/generate-case/dry-run"
      );
      expect(validateIndex).toBeGreaterThanOrEqual(0);
      expect(dryRunIndex).toBeGreaterThanOrEqual(0);
      expect(validateIndex).toBeLessThan(dryRunIndex);
    });

    // Verify dry-run result visible
    expect(await screen.findByText(/Dry-run passed|试运行通过|ドライラン合格/)).toBeInTheDocument();
  });

  it("saves generated case with validate-first then catalog persistence", async () => {
    const generateResponse = {
      documentId: "checkout-web-primary",
      selectedCaseId: "checkout-smoke",
      generatedCases: [
        { id: "gen-checkout-smoke-a", name: "Checkout smoke", category: "happy", confidence: "0.94", summary: "Main flow." }
      ],
      reasoning: [{ label: "Coverage", body: "Expanded main flow." }],
      selectedDsl: { format: "text/x-phase3-dsl", content: 'case "Checkout smoke" {\n  step open "/api-generated-page"\n}' },
      stateMachine: { states: [{ id: "s1", label: "s1" }], edges: [] },
      flowTree: [{ label: "s1", tone: "accent", indent: 0 }]
    };
    const validateResponse = { status: "VALID", errors: [], warnings: [] };
    const saveResponse = { status: "ACCEPTED", saved: 1 };

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/agent/generate-case") && !url.includes("dry-run")) return jsonResponse(generateResponse);
      if (url.endsWith("/api/phase3/cases/dsl/validate")) return jsonResponse(validateResponse);
      if (url.endsWith("/api/phase3/catalog/case")) return jsonResponse(saveResponse, 202);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: /Doc Parse/ }));
    await screen.findByText("Document catalog");
    const detailButtons = await screen.findAllByRole("button", { name: /Detail/ });
    await userEvent.click(detailButtons[0]);
    const generateButtons = await screen.findAllByText("Generate tests");
    await userEvent.click(generateButtons[0]);
    await screen.findByText(/api-generated-page/);

    // Click Save as case
    const saveButtons = await screen.findAllByText(/Save as case|保存为用例|ケースとして保存/);
    await userEvent.click(saveButtons[0]);

    // Verify validate called first
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/cases/dsl/validate",
        expect.objectContaining({ method: "POST" })
      );
    });

    // Then catalog/case called
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/catalog/case",
        expect.objectContaining({ method: "POST" })
      );
    });

    await waitFor(() => {
      const validateIndex = fetchMock.mock.calls.findIndex(
        ([input]) => String(input) === "http://127.0.0.1:8787/api/phase3/cases/dsl/validate"
      );
      const saveIndex = fetchMock.mock.calls.findIndex(
        ([input]) => String(input) === "http://127.0.0.1:8787/api/phase3/catalog/case"
      );
      expect(validateIndex).toBeGreaterThanOrEqual(0);
      expect(saveIndex).toBeGreaterThanOrEqual(0);
      expect(validateIndex).toBeLessThan(saveIndex);
    });

    await waitFor(() => {
      const adminConsoleCallIndexes = fetchMock.mock.calls
        .map(([input], index) =>
          String(input) === "http://127.0.0.1:8787/api/phase3/admin-console" ? index : -1
        )
        .filter((index) => index >= 0);
      const saveIndex = fetchMock.mock.calls.findIndex(
        ([input]) => String(input) === "http://127.0.0.1:8787/api/phase3/catalog/case"
      );
      expect(adminConsoleCallIndexes).toHaveLength(2);
      expect(saveIndex).toBeGreaterThanOrEqual(0);
      expect(saveIndex).toBeLessThan(adminConsoleCallIndexes[1]);
    });

    // Verify save success feedback
    expect(await screen.findByText(/Saved to catalog|已保存到目录|カタログに保存完了/)).toBeInTheDocument();
  });

  it("shows generation failure in aiGenerate screen", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/agent/generate-case") && !url.includes("dry-run")) return jsonResponse({}, 500);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: /Doc Parse/ }));
    await screen.findByText("Document catalog");
    const detailButtons = await screen.findAllByRole("button", { name: /Detail/ });
    await userEvent.click(detailButtons[0]);
    const generateButtons = await screen.findAllByText("Generate tests");
    await userEvent.click(generateButtons[0]);

    // Verify error message appears
    expect(await screen.findByText(/HTTP 500/)).toBeInTheDocument();
  });

  it("switches the Reports overview when clicking another project", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/")) {
        return jsonResponse({
          items: [
            {
              runId: "checkout-web-nightly",
              runName: "checkout-web-nightly",
              status: "FAILED",
              startedAt: "2026-04-18T09:00:00Z",
              finishedAt: "2026-04-18T09:10:00Z",
              durationMs: 600000,
              projectKey: "checkout-web",
              projectName: "checkout-web",
              caseId: "checkout-smoke",
              caseName: "Checkout smoke",
              environment: "staging-edge",
              model: "claude-4.5-sonnet",
              operator: "qa-platform",
              entry: "Failure analysis pending",
              stepsTotal: 8,
              stepsPassed: 7,
              assertionsTotal: 11,
              assertionsPassed: 10,
              artifactCount: 3,
              outputDir: "runs/checkout-web-nightly"
            },
            {
              runId: "member-center-daily",
              runName: "member-center-daily",
              status: "SUCCESS",
              startedAt: "2026-04-18T08:00:00Z",
              finishedAt: "2026-04-18T08:30:00Z",
              durationMs: 1800000,
              projectKey: "member-center",
              projectName: "member-center",
              caseId: "member-profile-save",
              caseName: "Profile save",
              environment: "staging-edge",
              model: "gpt-4.1-mini",
              operator: "qa-platform",
              entry: "5 artifacts exported",
              stepsTotal: 8,
              stepsPassed: 8,
              assertionsTotal: 5,
              assertionsPassed: 5,
              artifactCount: 5,
              outputDir: "runs/member-center-daily"
            }
          ]
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Reports/ }));
    expect(await screen.findByText("checkout-web-nightly")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /member-center/i }));

    expect(await screen.findByText("member-center-daily")).toBeInTheDocument();
    expect(screen.queryByText("checkout-web-nightly")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "member-center" })).toBeInTheDocument();
  });

  it("renders Reports screen labels in Chinese when locale is zh", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/")) {
        return jsonResponse({
          items: [
            {
              runId: "checkout-web-nightly",
              runName: "checkout-web-nightly",
              status: "FAILED",
              startedAt: "2026-04-18T09:00:00Z",
              finishedAt: "2026-04-18T09:10:00Z",
              durationMs: 600000,
              projectKey: "checkout-web",
              projectName: "checkout-web",
              caseId: "checkout-smoke",
              caseName: "Checkout smoke",
              environment: "staging-edge",
              model: "claude-4.5-sonnet",
              operator: "qa-platform",
              entry: "",
              stepsTotal: 8,
              stepsPassed: 7,
              assertionsTotal: 11,
              assertionsPassed: 10,
              artifactCount: 3,
              outputDir: "runs/checkout-web-nightly"
            }
          ]
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    // Switch locale to Chinese
    const localeSelect = await screen.findByRole("combobox");
    await userEvent.selectOptions(localeSelect, "zh");

    // Navigate to Reports
    await userEvent.click(await screen.findByRole("button", { name: /报告|Reports/ }));

    // Assert Chinese labels are visible (not English fallback)
    expect(await screen.findByText("项目切换")).toBeInTheDocument();
    expect(await screen.findByText("运行一览")).toBeInTheDocument();
    expect(await screen.findByText(/步骤/)).toBeInTheDocument();
    expect(await screen.findByText("操作时间线")).toBeInTheDocument();
  });

  it("renders reportDetail labels in Chinese when locale is zh", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/")) {
        return jsonResponse({
          items: [
            {
              runId: "checkout-web-nightly",
              runName: "checkout-web-nightly",
              status: "FAILED",
              startedAt: "2026-04-18T09:00:00Z",
              finishedAt: "2026-04-18T09:10:00Z",
              durationMs: 600000,
              projectKey: "checkout-web",
              projectName: "checkout-web",
              caseId: "checkout-smoke",
              caseName: "Checkout smoke",
              environment: "staging-edge",
              model: "claude-4.5-sonnet",
              operator: "qa-platform",
              entry: "",
              stepsTotal: 8,
              stepsPassed: 7,
              assertionsTotal: 11,
              assertionsPassed: 10,
              artifactCount: 3,
              outputDir: "runs/checkout-web-nightly"
            }
          ]
        });
      }
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) return jsonResponse(reportResponse);
      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    // Wait for app to load then switch locale to Chinese
    await screen.findByText("Dashboard");
    const localeSelects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(localeSelects[0], "zh");

    // Navigate to Reports (sidebar button) then open detail
    const reportsButtons = await screen.findAllByRole("button", { name: /Reports/ });
    await userEvent.click(reportsButtons[0]);
    await screen.findByText("checkout-web-nightly");
    await userEvent.click((await screen.findAllByRole("button", { name: /Detail|详情|Opened|已打开/ }))[0]);

    // Assert Chinese labels in reportDetail (not English fallback)
    expect(await screen.findByText("下载产物")).toBeInTheDocument();
    expect(await screen.findByText("重新执行")).toBeInTheDocument();
    expect(await screen.findByText("概览")).toBeInTheDocument();
    expect(await screen.findByText("摘要")).toBeInTheDocument();
    expect(await screen.findByText("耗时")).toBeInTheDocument();
  });

  it("renders dataDiff labels in Chinese when locale is zh", async () => {
    const restoreResultResponse = {
      runId: "checkout-web-nightly",
      status: "PARTIAL",
      items: [
        { step: "restore snapshot", status: "SUCCESS", detail: "Primary schema restored" }
      ]
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/")) {
        return jsonResponse({
          items: [
            {
              runId: "checkout-web-nightly",
              runName: "checkout-web-nightly",
              status: "FAILED",
              startedAt: "2026-04-18T09:00:00Z",
              finishedAt: "2026-04-18T09:10:00Z",
              durationMs: 600000,
              projectKey: "checkout-web",
              projectName: "checkout-web",
              caseId: "checkout-smoke",
              caseName: "Checkout smoke",
              environment: "staging-edge",
              model: "claude-4.5-sonnet",
              operator: "qa-platform",
              entry: "",
              stepsTotal: 8,
              stepsPassed: 7,
              assertionsTotal: 11,
              assertionsPassed: 10,
              artifactCount: 3,
              outputDir: "runs/checkout-web-nightly"
            }
          ]
        });
      }
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) return jsonResponse(reportResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/data-diff")) return jsonResponse(dataDiffResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/restore-result")) return jsonResponse(restoreResultResponse);
      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    // Wait for app to load then switch locale to Chinese
    await screen.findByText("Dashboard");
    const localeSelects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(localeSelects[0], "zh");

    // Navigate to Reports (sidebar button) → reportDetail → dataDiff
    const reportsButtons = await screen.findAllByRole("button", { name: /Reports/ });
    await userEvent.click(reportsButtons[0]);
    await screen.findByText("checkout-web-nightly");
    await userEvent.click((await screen.findAllByRole("button", { name: /Detail|详情|Opened|已打开/ }))[0]);
    await screen.findByText("下载产物");
    const dataDiffButtons = await screen.findAllByRole("button", { name: /数据差异|Data diff/ });
    await userEvent.click(dataDiffButtons[0]);

    // Assert Chinese labels in dataDiff (not English fallback)
    expect(await screen.findByText("查看原始 JSON")).toBeInTheDocument();
    expect(await screen.findByText("重新恢复")).toBeInTheDocument();
    expect(await screen.findByText("预期变更")).toBeInTheDocument();
    expect(await screen.findByText("恢复结果")).toBeInTheDocument();
  });
});
