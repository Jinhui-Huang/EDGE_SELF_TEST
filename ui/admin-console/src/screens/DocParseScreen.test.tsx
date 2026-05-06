import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocParseScreen } from "./DocParseScreen";
import { AdminConsoleSnapshot } from "../types";

const snapshot: AdminConsoleSnapshot = {
  generatedAt: "2026-05-06T08:00:00Z",
  apiBasePath: "/api/phase3",
  summary: {
    eyebrow: "Phase 3",
    title: "Admin Console",
    description: "Doc parse shell",
    runtimeStrategy: "Audit-first"
  },
  navigation: [],
  stats: [],
  projects: [
    {
      key: "checkout-web",
      name: "checkout-web",
      scope: "Payment journey",
      suites: 10,
      environments: 2,
      note: "review"
    }
  ],
  cases: [
    {
      id: "checkout-smoke",
      projectKey: "checkout-web",
      name: "Checkout smoke",
      tags: ["smoke"],
      status: "ACTIVE",
      updatedAt: "2026-05-06 08:00",
      archived: false
    }
  ],
  workQueue: [],
  reports: [],
  modelConfig: [],
  environmentConfig: [],
  timeline: [],
  constraints: [],
  caseTags: []
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

describe("DocParseScreen", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads parse result, raw document, and version history from backend on document open", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/documents/checkout-web-checkout-regression-v3/parse-result")) {
        return jsonResponse({
          documentId: "checkout-web-checkout-regression-v3",
          projectKey: "checkout-web",
          detectedCases: [
            { id: "checkout-api", name: "Checkout API-backed case", category: "happy", confidence: "high" }
          ],
          reasoning: [{ label: "Structure", body: "Loaded from backend parse result." }],
          missing: ["DB seed baseline"]
        });
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-checkout-regression-v3/raw")) {
        return jsonResponse({
          documentId: "checkout-web-checkout-regression-v3",
          name: "checkout-regression-v3.md",
          projectKey: "checkout-web",
          content: "# Backend raw document",
          uploadedAt: "2026-05-06T08:00:00Z"
        });
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-checkout-regression-v3/versions")) {
        return jsonResponse({
          documentId: "checkout-web-checkout-regression-v3",
          items: [
            { id: "v2", label: "v2", time: "2026-05-06T08:10:00Z", summary: "Re-parsed document and refreshed detected cases." }
          ]
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DocParseScreen
        snapshot={snapshot}
        apiBaseUrl="http://127.0.0.1:8787"
        title="Doc Parse"
        locale="en"
        onOpenAiGenerate={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Detail" }));

    expect(await screen.findByText("Checkout API-backed case")).toBeInTheDocument();
    expect(await screen.findByText("Loaded from backend parse result.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Raw document" }));
    expect(await screen.findByText("# Backend raw document")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Version history" }));
    expect(await screen.findByText("Re-parsed document and refreshed detected cases.")).toBeInTheDocument();
  });

  it("re-parses and refreshes backend-backed detail", async () => {
    const parseResultResponse = {
      documentId: "checkout-web-checkout-regression-v3",
      projectKey: "checkout-web",
      detectedCases: [
        { id: "checkout-reparsed", name: "Checkout reparsed case", category: "happy", confidence: "high" }
      ],
      reasoning: [{ label: "Structure", body: "Re-parsed from updated source." }],
      missing: []
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/documents/checkout-web-checkout-regression-v3/reparse")) {
        return jsonResponse({ status: "ACCEPTED", kind: "document-reparse", documentId: "checkout-web-checkout-regression-v3" }, 202);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-checkout-regression-v3/parse-result")) {
        return jsonResponse(parseResultResponse);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-checkout-regression-v3/raw")) {
        return jsonResponse({
          documentId: "checkout-web-checkout-regression-v3",
          name: "checkout-regression-v3.md",
          projectKey: "checkout-web",
          content: "# Raw source",
          uploadedAt: "2026-05-06T08:00:00Z"
        });
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-checkout-regression-v3/versions")) {
        return jsonResponse({
          documentId: "checkout-web-checkout-regression-v3",
          items: [{ id: "v2", label: "v2", time: "2026-05-06T08:10:00Z", summary: "Re-parsed document and refreshed detected cases." }]
        });
      }
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DocParseScreen
        snapshot={snapshot}
        apiBaseUrl="http://127.0.0.1:8787"
        title="Doc Parse"
        locale="en"
        onOpenAiGenerate={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(await screen.findByRole("button", { name: "Re-parse" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/documents/checkout-web-checkout-regression-v3/reparse",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(await screen.findByText("Re-parse complete")).toBeInTheDocument();
    expect(await screen.findByText("Checkout reparsed case")).toBeInTheDocument();
  });

  it("saves manual edit and refreshes the backend-backed parse result", async () => {
    let currentParseResult = {
      documentId: "checkout-web-checkout-regression-v3",
      projectKey: "checkout-web",
      detectedCases: [
        { id: "checkout-smoke", name: "Checkout smoke", category: "happy", confidence: "high" }
      ],
      reasoning: [{ label: "Structure", body: "Initial parse result." }],
      missing: []
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/documents/checkout-web-checkout-regression-v3/parse-result") && !init?.method) {
        return jsonResponse(currentParseResult);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-checkout-regression-v3/parse-result") && init?.method === "PUT") {
        currentParseResult = {
          documentId: "checkout-web-checkout-regression-v3",
          projectKey: "checkout-web",
          detectedCases: [
            { id: "custom-1", name: "Custom edited case", category: "boundary", confidence: "low" }
          ],
          reasoning: [{ label: "Manual edit", body: "Parse result was manually updated." }],
          missing: []
        };
        return jsonResponse({ status: "ACCEPTED", kind: "document-parse-edit", documentId: "checkout-web-checkout-regression-v3" }, 202);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-checkout-regression-v3/raw")) {
        return jsonResponse({
          documentId: "checkout-web-checkout-regression-v3",
          name: "checkout-regression-v3.md",
          projectKey: "checkout-web",
          content: "# Raw source",
          uploadedAt: "2026-05-06T08:00:00Z"
        });
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-checkout-regression-v3/versions")) {
        return jsonResponse({
          documentId: "checkout-web-checkout-regression-v3",
          items: [{ id: "v2", label: "v2", time: "2026-05-06T08:10:00Z", summary: "Manually edited detected cases by operator." }]
        });
      }
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DocParseScreen
        snapshot={snapshot}
        apiBaseUrl="http://127.0.0.1:8787"
        title="Doc Parse"
        locale="en"
        onOpenAiGenerate={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Detail" }));
    await userEvent.click(await screen.findByRole("button", { name: "Manual edit" }));

    const textarea = document.querySelector("textarea.casesDslEditor") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: {
        value: JSON.stringify([{ id: "custom-1", name: "Custom edited case", category: "boundary", confidence: "low" }], null, 2)
      }
    });

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8787/api/phase3/documents/checkout-web-checkout-regression-v3/parse-result",
        expect.objectContaining({ method: "PUT" })
      );
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(await screen.findByText("Custom edited case")).toBeInTheDocument();
  });

  it("adds an uploaded document into the current catalog with the backend id and opens backend detail", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/phase3/documents/upload")) {
        return jsonResponse({
          status: "ACCEPTED",
          uploaded: [{ id: "checkout-web-test-doc", name: "test-doc.md" }]
        }, 202);
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-test-doc/parse-result")) {
        return jsonResponse({
          documentId: "checkout-web-test-doc",
          projectKey: "checkout-web",
          detectedCases: [{ id: "uploaded-case", name: "Uploaded backend case", category: "happy", confidence: "high" }],
          reasoning: [{ label: "Structure", body: "Hydrated after upload." }],
          missing: []
        });
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-test-doc/raw")) {
        return jsonResponse({
          documentId: "checkout-web-test-doc",
          name: "test-doc.md",
          projectKey: "checkout-web",
          content: "# Uploaded test document",
          uploadedAt: "2026-05-06T08:00:00Z"
        });
      }
      if (url.endsWith("/api/phase3/documents/checkout-web-test-doc/versions")) {
        return jsonResponse({
          documentId: "checkout-web-test-doc",
          items: [{ id: "v1", label: "v1", time: "2026-05-06T08:00:00Z", summary: "Uploaded document and generated initial parse result." }]
        });
      }
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const mockFileReader = {
      result: "# Uploaded test document",
      readAsText: vi.fn(),
      onload: null as (() => void) | null
    };
    mockFileReader.readAsText.mockImplementation(function (this: typeof mockFileReader) {
      setTimeout(() => this.onload?.(), 0);
    }.bind(mockFileReader));
    vi.stubGlobal("FileReader", vi.fn(() => mockFileReader));

    render(
      <DocParseScreen
        snapshot={snapshot}
        apiBaseUrl="http://127.0.0.1:8787"
        title="Doc Parse"
        locale="en"
        onOpenAiGenerate={vi.fn()}
      />
    );

    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    await userEvent.upload(fileInput, new File(["# Uploaded test document"], "test-doc.md", { type: "text/markdown" }));

    expect(await screen.findByText("Upload complete")).toBeInTheDocument();
    expect(await screen.findByText("test-doc.md")).toBeInTheDocument();
    expect(await screen.findByText("Uploaded backend case")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Raw document" }));
    expect(await screen.findByText("# Uploaded test document")).toBeInTheDocument();
  });
});
