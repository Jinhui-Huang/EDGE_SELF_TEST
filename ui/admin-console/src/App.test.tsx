import { render, screen, waitFor } from "@testing-library/react";
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
      runName: "checkout-web-nightly",
      status: "FAILED",
      finishedAt: "2026-04-18 09:10",
      entry: "Failure analysis pending"
    },
    {
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

  it("posts scheduler mutations and refreshes the snapshot", async () => {
    const fetchMock = vi
      .fn()
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
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(snapshot));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Cases/ }));
    await userEvent.click((await screen.findAllByRole("button", { name: "Detail" }))[0]);
    await userEvent.click(await screen.findByRole("button", { name: "Pre-execution" }));

    await userEvent.click((await screen.findAllByRole("button", { name: /Execution/ }))[0]);

    expect((await screen.findAllByText("Prepared cases")).length).toBeGreaterThan(0);
    expect(await screen.findByText("1 prepared case will start when you click Execution.")).toBeInTheDocument();
    expect(await screen.findByText("Checkout smoke")).toBeInTheDocument();
  });

  it("posts editable config updates and refreshes the snapshot", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse(snapshot))
      .mockImplementationOnce(() => jsonResponse({ status: "ACCEPTED" }, 202))
      .mockImplementationOnce(() =>
        jsonResponse({
          ...snapshot,
          modelConfig: [{ label: "Provider", value: "OpenAI Responses API / audited" }]
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Model Config/ }));
    const providerTextareas = await screen.findAllByDisplayValue("OpenAI Responses API");
    await userEvent.clear(providerTextareas[0]);
    await userEvent.type(providerTextareas[0], "OpenAI Responses API / audited");

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
    expect(await screen.findByDisplayValue("OpenAI Responses API / audited")).toBeInTheDocument();
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
