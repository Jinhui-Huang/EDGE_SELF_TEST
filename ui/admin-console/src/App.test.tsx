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
  status: "FAILED",
  startedAt: "2026-04-18T09:00:00Z",
  finishedAt: "2026-04-18T09:10:00Z",
  durationMs: 600000,
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
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
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

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([input]) => String(input).endsWith("/api/phase3/admin-console"))
      ).toHaveLength(2);
    });

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
    expect(await screen.findByRole("heading", { name: "checkout-web-nightly" })).toBeInTheDocument();
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
        return jsonResponse({ items: [] });
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
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/documents/upload")) {
        return jsonResponse(uploadResponse, 202);
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
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) {
        return jsonResponse(snapshot);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-primary/parse-result") && init?.method === "PUT") {
        return jsonResponse(saveResponse, 202);
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

  it("calls re-restore endpoint and shows status feedback in dataDiff", async () => {
    const restoreRetryResponse = {
      status: "ACCEPTED",
      kind: "restore-retry",
      runId: "checkout-web-nightly",
      requestedState: "RESTORE_RETRY_QUEUED",
      message: "Restore retry queued by qa-platform"
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/admin-console")) return jsonResponse(snapshot);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/report")) return jsonResponse(reportResponse);
      if (url.endsWith("/api/phase3/runs/checkout-web-nightly/data-diff") && (!init || init.method !== "POST")) return jsonResponse(dataDiffResponse);
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

    // Diff data should have been refreshed
    const dataDiffCalls = fetchMock.mock.calls.filter(
      (call: unknown[]) => String(call[0]).endsWith("/api/phase3/runs/checkout-web-nightly/data-diff")
    );
    expect(dataDiffCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("shows rejected status when re-restore is rejected in dataDiff", async () => {
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

  it("switches the Reports overview when clicking another project", async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(snapshot));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Reports/ }));
    expect(await screen.findByText("checkout-web-nightly")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /member-center/i }));

    expect(await screen.findByText("member-center-daily")).toBeInTheDocument();
    expect(screen.queryByText("checkout-web-nightly")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "member-center" })).toBeInTheDocument();
  });
});
