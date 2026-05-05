import { FormEvent, useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExecutionScreen } from "./ExecutionScreen";
import {
  AdminConsoleSnapshot,
  DataTemplateItem,
  DatabaseConfig,
  ModelProvider,
  MutationState,
  PreparedCaseItem,
  SchedulerMutationForm
} from "../types";

const snapshot: AdminConsoleSnapshot = {
  generatedAt: "2026-05-05T10:00:00Z",
  apiBasePath: "/api/phase3",
  summary: {
    eyebrow: "Phase 3 Shell",
    title: "Execution",
    description: "Execution screen test snapshot",
    runtimeStrategy: "Audit-first runtime"
  },
  navigation: [],
  stats: [],
  projects: [
    {
      key: "checkout-web",
      name: "checkout-web",
      scope: "Payment journey",
      suites: 18,
      environments: 2,
      note: "locator review"
    }
  ],
  cases: [],
  workQueue: [
    {
      title: "checkout-web-smoke / prod-like",
      owner: "qa-platform",
      state: "Waiting",
      detail: "Queued for execution"
    }
  ],
  reports: [],
  modelConfig: [
    { label: "Provider", value: "OpenAI Responses API" },
    { label: "Mode", value: "Audit-first / recommendation-only" }
  ],
  environmentConfig: [
    { label: "database:oracle-checkout-main", value: "{\"id\":\"oracle-checkout-main\"}" }
  ],
  timeline: [],
  constraints: ["Audit only"],
  caseTags: []
};

const templates: DataTemplateItem[] = [
  {
    id: "order-seed-v2",
    name: "order.seed.v2",
    type: "composite",
    envAllowed: "dev, staging",
    risk: "medium",
    uses: 128,
    rollback: "sql",
    projectKey: "checkout-web",
    steps: ["INSERT orders"],
    guards: ["prod blocked"],
    params: [{ key: "user_id", type: "uuid", required: true }],
    compareSummary: "Compare order deltas before and after execution."
  }
];

const databases: DatabaseConfig[] = [
  {
    id: "oracle-checkout-main",
    name: "checkout-oracle-main-prodlike",
    type: "Oracle",
    driver: "oracle.jdbc.OracleDriver",
    url: "jdbc:oracle:thin:@//10.18.8.21:1521/CHKPDB1",
    schema: "CHECKOUT_APP",
    username: "qa_checkout",
    password: "******",
    mybatisEnv: "qa-oracle",
    note: "Checkout core order database"
  }
];

const modelProviders: ModelProvider[] = [
  {
    id: "openai-gpt-4.1-mini",
    name: "OpenAI",
    displayName: "OpenAI",
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
  }
];

const idleState: MutationState = { kind: "idle", message: "" };

const baseLaunchForm: SchedulerMutationForm = {
  runId: "checkout-web-smoke",
  projectKey: "checkout-web",
  owner: "qa-platform",
  environment: "prod-like",
  targetUrl: "https://example.test/checkout",
  executionModel: "gpt-4.1-mini",
  databaseId: "oracle-checkout-main",
  detail: "Accepted from operator launch panel."
};

const baseReviewForm: SchedulerMutationForm = {
  runId: "checkout-web-smoke",
  projectKey: "checkout-web",
  owner: "audit-operator",
  environment: "prod-like",
  targetUrl: "",
  executionModel: "gpt-4.1-mini",
  databaseId: "oracle-checkout-main",
  detail: "Operator review opened from the admin console."
};

const preparedCases: PreparedCaseItem[] = [
  {
    id: "checkout-smoke",
    projectKey: "checkout-web",
    name: "Checkout smoke",
    status: "READY",
    tags: ["smoke"],
    updatedAt: "2026-05-05 10:05"
  }
];

function ExecutionHarness({
  launchForm = baseLaunchForm,
  reviewForm = baseReviewForm,
  prepared = preparedCases,
  workQueue = snapshot.workQueue,
  onOpenMonitor = () => undefined,
  onOpenQueueItem = () => undefined,
  onOpenPreparedCase = () => undefined
}: {
  launchForm?: SchedulerMutationForm;
  reviewForm?: SchedulerMutationForm;
  prepared?: PreparedCaseItem[];
  workQueue?: AdminConsoleSnapshot["workQueue"];
  onOpenMonitor?: () => void;
  onOpenQueueItem?: (itemTitle: string) => void;
  onOpenPreparedCase?: (caseId: string, projectKey: string) => void;
}) {
  const [launch, setLaunch] = useState(launchForm);
  const [review, setReview] = useState(reviewForm);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(["order-seed-v2"]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState("oracle-checkout-main");

  return (
    <ExecutionScreen
      snapshot={{ ...snapshot, workQueue }}
      launchForm={launch}
      reviewForm={review}
      preparedCases={prepared}
      dataTemplates={templates}
      databaseConfigs={databases}
      selectedTemplateIds={selectedTemplateIds}
      selectedDatabaseId={selectedDatabaseId}
      launchState={idleState}
      executeState={idleState}
      reviewState={idleState}
      title="Execution center"
      executionSaveHint="POST /scheduler/requests + /scheduler/events"
      queueBoardLabel="Queue board"
      reviewBoardLabel="Review board"
      fieldRunIdLabel="Run ID"
      fieldProjectLabel="Project"
      fieldOwnerLabel="Owner"
      fieldEnvironmentLabel="Environment"
      fieldTargetUrlLabel="Target URL"
      fieldExecutionModelLabel="Execution model"
      fieldDetailLabel="Detail"
      fieldAuditDetailLabel="Audit detail"
      runLabel="Run"
      executionLabel="Execution"
      openAuditLabel="Open Audit"
      reviewSaveHint="POST /scheduler/events"
      openMonitorLabel="Open Exec Monitor"
      monitorLinkHint="Runtime handoff"
      locale="en"
      modelProviders={modelProviders}
      apiBaseUrl="http://127.0.0.1:8787"
      onLaunchFormChange={setLaunch}
      onReviewFormChange={setReview}
      onSelectedTemplateIdsChange={setSelectedTemplateIds}
      onSelectedDatabaseIdChange={setSelectedDatabaseId}
      onLaunchSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
      onExecuteSubmit={() => undefined}
      onReviewSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
      onOpenMonitor={onOpenMonitor}
      onOpenQueueItem={onOpenQueueItem}
      onOpenPreparedCase={onOpenPreparedCase}
    />
  );
}

describe("ExecutionScreen interactions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the local execution contract panel from the hint button", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: templates }))));

    render(<ExecutionHarness />);

    await userEvent.click(screen.getByRole("button", { name: "Open execution contract help" }));

    const panel = screen.getByTestId("execution-contract-panel");
    expect(panel).toBeInTheDocument();
    expect(within(panel).getByText("Execution contract help")).toBeInTheDocument();
    expect(within(panel).getByText("Run ID")).toBeInTheDocument();
    expect(within(panel).getByText("Project")).toBeInTheDocument();
    expect(within(panel).getByText("Owner")).toBeInTheDocument();
    expect(within(panel).getByText("Environment")).toBeInTheDocument();
    expect(within(panel).getByText("Target URL")).toBeInTheDocument();
    expect(within(panel).getByText("Execution model")).toBeInTheDocument();
    expect(within(panel).getAllByText("Compare data templates").length).toBeGreaterThan(0);
    expect(within(panel).getAllByText("Database connection").length).toBeGreaterThan(0);
    expect(within(panel).getByText(/POST \/api\/phase3\/scheduler\/requests/)).toBeInTheDocument();
    expect(within(panel).getAllByText(/POST \/api\/phase3\/scheduler\/events/).length).toBeGreaterThan(0);
    expect(within(panel).getByText(/Prepared cases come from the cases screen through app state only/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Open Exec Monitor is an app-level runId handoff only/i)).toBeInTheDocument();
  });

  it("closes the local execution contract panel", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: templates }))));

    render(<ExecutionHarness />);

    await userEvent.click(screen.getByRole("button", { name: "Open execution contract help" }));
    expect(screen.getByTestId("execution-contract-panel")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close execution contract help" }));

    expect(screen.queryByTestId("execution-contract-panel")).not.toBeInTheDocument();
  });

  it("keeps Run, Execution, Open Exec Monitor, and the help panel usable together", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: templates }))));
    const onOpenMonitor = vi.fn();

    render(<ExecutionHarness onOpenMonitor={onOpenMonitor} />);

    await userEvent.click(screen.getByRole("button", { name: "Open execution contract help" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Open Exec Monitor" })[0]);

    const ownerInputs = screen.getAllByDisplayValue("qa-platform");
    await userEvent.clear(ownerInputs[0]);
    await userEvent.type(ownerInputs[0], "ops-owner");

    expect(onOpenMonitor).toHaveBeenCalledTimes(1);
    expect(screen.getByDisplayValue("ops-owner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Execution" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Open Audit" })).toBeEnabled();
  });

  it("clicks a queue row and emits the existing queue-item handoff", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: templates }))));
    const onOpenQueueItem = vi.fn();

    render(<ExecutionHarness onOpenQueueItem={onOpenQueueItem} />);

    await userEvent.click(screen.getByRole("button", { name: "Open queue item checkout-web-smoke / prod-like in monitor" }));

    expect(onOpenQueueItem).toHaveBeenCalledWith("checkout-web-smoke / prod-like");
  });

  it("clicks a prepared-case card and emits the cases handoff", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: templates }))));
    const onOpenPreparedCase = vi.fn();

    render(<ExecutionHarness onOpenPreparedCase={onOpenPreparedCase} />);

    await userEvent.click(screen.getByRole("button", { name: "Open prepared case Checkout smoke in cases" }));

    expect(onOpenPreparedCase).toHaveBeenCalledWith("checkout-smoke", "checkout-web");
  });

  it("does not expose queue-row drill-down when no queue item exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: templates }))));

    render(
      <ExecutionHarness
        workQueue={[]}
      />
    );

    expect(screen.queryByRole("button", { name: /Open queue item/i })).not.toBeInTheDocument();
  });

  it("does not expose prepared-case drill-down when no prepared case exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: templates }))));

    render(<ExecutionHarness prepared={[]} />);

    expect(screen.queryByRole("button", { name: /Open prepared case/i })).not.toBeInTheDocument();
  });

  it("opens contract help regardless of empty runId and queue/prepared-case variations", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: templates }))));

    render(
      <ExecutionHarness
        launchForm={{ ...baseLaunchForm, runId: "" }}
        reviewForm={{ ...baseReviewForm, runId: "" }}
        prepared={[]}
        workQueue={[]}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Open execution contract help" }));

    expect(screen.getByTestId("execution-contract-panel")).toBeInTheDocument();
    expect(screen.getByText("No queued item in current snapshot.")).toBeInTheDocument();
    expect(screen.getAllByText("--").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Execution" })).toBeDisabled();
  });
});
