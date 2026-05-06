import { ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CasesScreen } from "./CasesScreen";
import { AdminConsoleSnapshot, CaseItem, MutationState } from "../types";

const snapshot: AdminConsoleSnapshot = {
  generatedAt: "2026-05-06T10:00:00Z",
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
    { id: "cases", label: "Cases", summary: "Cases" }
  ],
  stats: [],
  projects: [
    { key: "checkout-web", name: "checkout-web", scope: "Payment", suites: 12, environments: 2, note: "review" },
    { key: "member-center", name: "member-center", scope: "Profile", suites: 5, environments: 1, note: "stable" }
  ],
  cases: [
    {
      id: "checkout-smoke",
      projectKey: "checkout-web",
      name: "Checkout smoke",
      tags: ["smoke", "payment"],
      status: "ACTIVE",
      updatedAt: "2026-05-06 09:10",
      archived: false
    },
    {
      id: "member-profile-save",
      projectKey: "member-center",
      name: "Profile save",
      tags: ["profile"],
      status: "ACTIVE",
      updatedAt: "2026-05-06 09:00",
      archived: false
    }
  ],
  workQueue: [],
  reports: [],
  modelConfig: [],
  environmentConfig: [],
  timeline: [],
  constraints: [],
  caseTags: ["smoke", "payment", "profile"]
};

const caseDraft: CaseItem[] = [
  {
    id: "checkout-smoke",
    projectKey: "checkout-web",
    name: "Checkout smoke",
    tags: "smoke, payment",
    status: "ACTIVE",
    archived: false
  },
  {
    id: "member-profile-save",
    projectKey: "member-center",
    name: "Profile save",
    tags: "profile",
    status: "ACTIVE",
    archived: false
  }
];

const idleState: MutationState = { kind: "idle", message: "" };

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  );
}

function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

function renderScreen(overrides?: Partial<ComponentProps<typeof CasesScreen>>) {
  return render(
    <CasesScreen
      snapshot={snapshot}
      caseDraft={caseDraft}
      caseState={idleState}
      initialProjectKey="checkout-web"
      initialCaseId={null}
      apiBaseUrl="http://127.0.0.1:8787"
      title="Cases control center"
      saveHint="Catalog save remains app-level."
      caseTagsLabel="Case tags"
      fieldCaseIdLabel="Case ID"
      fieldProjectKeyLabel="Project"
      fieldNameLabel="Name"
      fieldStatusLabel="Status"
      fieldTagsLabel="Tags"
      fieldArchivedLabel="Archived"
      newCatalogRowLabel="New row"
      addCaseRowLabel="Add row"
      saveCaseCatalogLabel="Save catalog"
      locale="en"
      onPrepareCase={vi.fn()}
      onOpenHistoryRun={vi.fn()}
      onCaseChange={vi.fn()}
      onAddCaseRow={vi.fn()}
      onRemoveCaseRow={vi.fn()}
      onSubmit={vi.fn()}
      {...overrides}
    />
  );
}

describe("CasesScreen", () => {
  it("loads DSL detail, validates JSON, and saves through backend endpoints", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/cases/checkout-smoke/dsl") && (!init || init.method === undefined || init.method === "GET")) {
        return jsonResponse({
          caseId: "checkout-smoke",
          projectKey: "checkout-web",
          dslVersion: 3,
          updatedAt: "2026-05-06T09:12:00Z",
          updatedBy: "qa-platform",
          definition: {
            id: "checkout-smoke",
            name: "Checkout smoke",
            steps: [{ action: "goto", url: "/checkout" }]
          }
        });
      }
      if (url.endsWith("/api/phase3/cases/checkout-smoke/dsl/validate")) {
        return jsonResponse({ status: "VALID", errors: [], warnings: [] });
      }
      if (url.endsWith("/api/phase3/cases/checkout-smoke/dsl") && init?.method === "PUT") {
        return jsonResponse({
          status: "ACCEPTED",
          kind: "case-dsl",
          caseId: "checkout-smoke",
          dslVersion: 4,
          updatedAt: "2026-05-06T09:15:00Z"
        }, 202);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit DSL" }));

    expect(await screen.findByText("DSL Editor (v3)")).toBeInTheDocument();
    const editor = screen.getByRole("textbox");
    await userEvent.clear(editor);
    await userEvent.type(editor, "{\"id\":\"checkout-smoke\",\"name\":\"Checkout smoke\",\"steps\":[{\"action\":\"goto\",\"url\":\"/checkout\"}]}");

    await userEvent.click(screen.getByRole("button", { name: "Validate" }));
    expect(await screen.findByText("DSL validation passed.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save DSL" }));
    expect(await screen.findByText("DSL saved.")).toBeInTheDocument();
    expect(await screen.findByText("DSL Editor (v4)")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/cases/checkout-smoke/dsl/validate",
        expect.objectContaining({ method: "POST" })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/cases/checkout-smoke/dsl",
        expect.objectContaining({ method: "PUT" })
      );
    });
  });

  it("shows invalid JSON feedback without sending validate request", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/cases/checkout-smoke/dsl")) {
        return jsonResponse({
          caseId: "checkout-smoke",
          projectKey: "checkout-web",
          dslVersion: 1,
          updatedAt: "2026-05-06T09:12:00Z",
          updatedBy: "qa-platform",
          definition: { id: "checkout-smoke", name: "Checkout smoke", steps: [] }
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit DSL" }));

    const editor = await screen.findByRole("textbox");
    await userEvent.clear(editor);
    await userEvent.type(editor, "{bad json");
    await userEvent.click(screen.getByRole("button", { name: "Validate" }));

    expect(await screen.findByText("Invalid JSON.")).toBeInTheDocument();
    expect(await screen.findByText("Invalid JSON")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps backend validation failures as real error state without synthesizing invalid JSON", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/cases/checkout-smoke/dsl") && (!init || init.method === undefined || init.method === "GET")) {
        return jsonResponse({
          caseId: "checkout-smoke",
          projectKey: "checkout-web",
          dslVersion: 1,
          updatedAt: "2026-05-06T09:12:00Z",
          updatedBy: "qa-platform",
          definition: { id: "checkout-smoke", name: "Checkout smoke", steps: [] }
        });
      }
      if (url.endsWith("/api/phase3/cases/checkout-smoke/dsl/validate")) {
        return jsonResponse({ message: "validator unavailable" }, 503);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit DSL" }));
    await screen.findByText("DSL Editor (v1)");

    await userEvent.click(screen.getByRole("button", { name: "Validate" }));

    expect(await screen.findByText("HTTP 503")).toBeInTheDocument();
    expect(screen.queryByText("Invalid JSON")).not.toBeInTheDocument();
    expect(screen.queryByText("VALID")).not.toBeInTheDocument();
    expect(screen.queryByText("INVALID")).not.toBeInTheDocument();
  });

  it("loads plans and history with explicit empty and success states", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/cases/checkout-smoke/plans")) {
        return jsonResponse({
          caseId: "checkout-smoke",
          projectKey: "checkout-web",
          plans: [],
          preconditions: []
        });
      }
      if (url.endsWith("/api/phase3/cases/checkout-smoke/history")) {
        return jsonResponse({
          caseId: "checkout-smoke",
          runs: [
            {
              runName: "checkout-web-smoke-001",
              status: "SUCCESS",
              finishedAt: "2026-05-06T09:20:00Z",
              reportEntry: "HTML / artifacts / cleanup"
            }
          ],
          maintenanceEvents: []
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(screen.getByRole("button", { name: "Plans" }));
    expect(await screen.findByText("No plans yet.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "History" }));
    expect(await screen.findByText("checkout-web-smoke-001")).toBeInTheDocument();
    expect(await screen.findByText("No maintenance events yet.")).toBeInTheDocument();
  });

  it("hands off history run rows through the existing app-level callback", async () => {
    const onOpenHistoryRun = vi.fn();
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/cases/checkout-smoke/history")) {
        return jsonResponse({
          caseId: "checkout-smoke",
          runs: [
            {
              runName: "checkout-web-smoke-001",
              status: "SUCCESS",
              finishedAt: "2026-05-06T09:20:00Z",
              reportEntry: "HTML / artifacts / cleanup"
            }
          ],
          maintenanceEvents: []
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderScreen({ onOpenHistoryRun });

    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(screen.getByRole("button", { name: "History" }));
    await userEvent.click(await screen.findByRole("button", { name: "Open history run checkout-web-smoke-001 in report detail" }));

    expect(onOpenHistoryRun).toHaveBeenCalledWith("checkout-web-smoke-001");
  });

  it("saves state machine and resets tab state when switching cases", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/cases/checkout-smoke/state-machine") && (!init || init.method === undefined || init.method === "GET")) {
        return jsonResponse({
          caseId: "checkout-smoke",
          projectKey: "checkout-web",
          updatedAt: "2026-05-06T09:30:00Z",
          nodes: [{ id: "start", label: "Start" }],
          edges: [{ from: "start", to: "submit", action: "clickPrimary" }],
          guards: []
        });
      }
      if (url.endsWith("/api/phase3/cases/checkout-smoke/state-machine") && init?.method === "PUT") {
        return jsonResponse({
          status: "ACCEPTED",
          kind: "case-state-machine",
          caseId: "checkout-smoke",
          updatedAt: "2026-05-06T09:35:00Z"
        }, 202);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(screen.getByRole("button", { name: "State machine" }));

    expect(await screen.findByText(/Start/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("State machine saved.")).toBeInTheDocument();

    rerender(
      <CasesScreen
        snapshot={snapshot}
        caseDraft={caseDraft}
        caseState={idleState}
        initialProjectKey="member-center"
        initialCaseId="member-profile-save"
        apiBaseUrl="http://127.0.0.1:8787"
        title="Cases control center"
        saveHint="Catalog save remains app-level."
        caseTagsLabel="Case tags"
        fieldCaseIdLabel="Case ID"
        fieldProjectKeyLabel="Project"
        fieldNameLabel="Name"
        fieldStatusLabel="Status"
        fieldTagsLabel="Tags"
        fieldArchivedLabel="Archived"
        newCatalogRowLabel="New row"
        addCaseRowLabel="Add row"
        saveCaseCatalogLabel="Save catalog"
        locale="en"
        onPrepareCase={vi.fn()}
        onOpenHistoryRun={vi.fn()}
        onCaseChange={vi.fn()}
        onAddCaseRow={vi.fn()}
        onRemoveCaseRow={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(await screen.findByText("Profile save")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overview" })).toHaveClass("isActive");
    expect(screen.queryByText("State machine saved.")).not.toBeInTheDocument();
  });

  it("ignores stale DSL responses that finish after switching to another case", async () => {
    const firstDsl = deferredResponse();
    const secondDsl = deferredResponse();
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/cases/checkout-smoke/dsl")) {
        return firstDsl.promise;
      }
      if (url.endsWith("/api/phase3/cases/member-profile-save/dsl")) {
        return secondDsl.promise;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit DSL" }));
    expect(await screen.findByText("Loading DSL...")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /member-center/i }));
    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit DSL" }));

    secondDsl.resolve(
      new Response(
        JSON.stringify({
          caseId: "member-profile-save",
          projectKey: "member-center",
          dslVersion: 2,
          updatedAt: "2026-05-06T09:40:00Z",
          updatedBy: "qa-platform",
          definition: {
            id: "member-profile-save",
            name: "Profile save",
            steps: [{ action: "goto", url: "/profile" }]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    expect(await screen.findByText("DSL Editor (v2)")).toBeInTheDocument();

    firstDsl.resolve(
      new Response(
        JSON.stringify({
          caseId: "checkout-smoke",
          projectKey: "checkout-web",
          dslVersion: 9,
          updatedAt: "2026-05-06T09:39:00Z",
          updatedBy: "late-response",
          definition: {
            id: "checkout-smoke",
            name: "Checkout smoke",
            steps: [{ action: "goto", url: "/checkout-late" }]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await waitFor(() => {
      expect(screen.getByText("DSL Editor (v2)")).toBeInTheDocument();
      expect(screen.queryByText("DSL Editor (v9)")).not.toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue(
        JSON.stringify(
          {
            id: "member-profile-save",
            name: "Profile save",
            steps: [{ action: "goto", url: "/profile" }]
          },
          null,
          2
        )
      );
    });
  });

  it("ignores stale DSL validate responses after switching to another case", async () => {
    const validateRequest = deferredResponse();
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/cases/checkout-smoke/dsl") && (!init || init.method === undefined || init.method === "GET")) {
        return jsonResponse({
          caseId: "checkout-smoke",
          projectKey: "checkout-web",
          dslVersion: 3,
          updatedAt: "2026-05-06T09:12:00Z",
          updatedBy: "qa-platform",
          definition: {
            id: "checkout-smoke",
            name: "Checkout smoke",
            steps: [{ action: "goto", url: "/checkout" }]
          }
        });
      }
      if (url.endsWith("/api/phase3/cases/member-profile-save/dsl") && (!init || init.method === undefined || init.method === "GET")) {
        return jsonResponse({
          caseId: "member-profile-save",
          projectKey: "member-center",
          dslVersion: 2,
          updatedAt: "2026-05-06T09:40:00Z",
          updatedBy: "qa-platform",
          definition: {
            id: "member-profile-save",
            name: "Profile save",
            steps: [{ action: "goto", url: "/profile" }]
          }
        });
      }
      if (url.endsWith("/api/phase3/cases/checkout-smoke/dsl/validate")) {
        return validateRequest.promise;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit DSL" }));
    expect(await screen.findByText("DSL Editor (v3)")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Validate" }));
    expect(await screen.findByText("Validating DSL...")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /member-center/i }));
    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit DSL" }));
    expect(await screen.findByText("DSL Editor (v2)")).toBeInTheDocument();

    validateRequest.resolve(
      new Response(JSON.stringify({ status: "VALID", errors: [], warnings: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await waitFor(() => {
      expect(screen.getByText("DSL Editor (v2)")).toBeInTheDocument();
      expect(screen.queryByText("DSL validation passed.")).not.toBeInTheDocument();
      expect(screen.queryByText("VALID")).not.toBeInTheDocument();
    });
  });

  it("ignores stale DSL save responses after switching to another case", async () => {
    const saveRequest = deferredResponse();
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/cases/checkout-smoke/dsl") && (!init || init.method === undefined || init.method === "GET")) {
        return jsonResponse({
          caseId: "checkout-smoke",
          projectKey: "checkout-web",
          dslVersion: 3,
          updatedAt: "2026-05-06T09:12:00Z",
          updatedBy: "qa-platform",
          definition: {
            id: "checkout-smoke",
            name: "Checkout smoke",
            steps: [{ action: "goto", url: "/checkout" }]
          }
        });
      }
      if (url.endsWith("/api/phase3/cases/member-profile-save/dsl") && (!init || init.method === undefined || init.method === "GET")) {
        return jsonResponse({
          caseId: "member-profile-save",
          projectKey: "member-center",
          dslVersion: 2,
          updatedAt: "2026-05-06T09:40:00Z",
          updatedBy: "qa-platform",
          definition: {
            id: "member-profile-save",
            name: "Profile save",
            steps: [{ action: "goto", url: "/profile" }]
          }
        });
      }
      if (url.endsWith("/api/phase3/cases/checkout-smoke/dsl") && init?.method === "PUT") {
        return saveRequest.promise;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit DSL" }));
    expect(await screen.findByText("DSL Editor (v3)")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save DSL" }));
    expect(await screen.findByText("Saving DSL...")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /member-center/i }));
    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit DSL" }));
    expect(await screen.findByText("DSL Editor (v2)")).toBeInTheDocument();

    saveRequest.resolve(
      new Response(
        JSON.stringify({
          status: "ACCEPTED",
          kind: "case-dsl",
          caseId: "checkout-smoke",
          dslVersion: 9,
          updatedAt: "2026-05-06T09:15:00Z"
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" }
        }
      )
    );

    await waitFor(() => {
      expect(screen.getByText("DSL Editor (v2)")).toBeInTheDocument();
      expect(screen.queryByText("DSL saved.")).not.toBeInTheDocument();
      expect(screen.queryByText("DSL Editor (v9)")).not.toBeInTheDocument();
    });
  });

  it("encodes caseId in case-detail fetch URLs", async () => {
    const encodedCaseDraft: CaseItem[] = [
      {
        id: "checkout smoke/edge?1",
        projectKey: "checkout-web",
        name: "Checkout encoded",
        tags: "smoke",
        status: "ACTIVE",
        archived: false
      }
    ];
    const encodedSnapshot: AdminConsoleSnapshot = {
      ...snapshot,
      cases: [
        {
          id: "checkout smoke/edge?1",
          projectKey: "checkout-web",
          name: "Checkout encoded",
          tags: ["smoke"],
          status: "ACTIVE",
          updatedAt: "2026-05-06 09:10",
          archived: false
        }
      ]
    };

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/cases/checkout%20smoke%2Fedge%3F1/dsl")) {
        return jsonResponse({
          caseId: "checkout smoke/edge?1",
          projectKey: "checkout-web",
          dslVersion: 1,
          updatedAt: "2026-05-06T09:12:00Z",
          updatedBy: "qa-platform",
          definition: {
            id: "checkout smoke/edge?1",
            name: "Checkout encoded",
            steps: [{ action: "goto", url: "/checkout" }]
          }
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderScreen({
      snapshot: encodedSnapshot,
      caseDraft: encodedCaseDraft,
      initialCaseId: "checkout smoke/edge?1"
    });

    await userEvent.click(screen.getByRole("button", { name: "Edit DSL" }));
    expect(await screen.findByText("DSL Editor (v1)")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/api/phase3/cases/checkout%20smoke%2Fedge%3F1/dsl",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });
});
