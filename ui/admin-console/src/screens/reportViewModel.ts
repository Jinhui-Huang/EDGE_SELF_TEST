import { AdminConsoleSnapshot } from "../types";

export type ReportViewModel = {
  runName: string;
  status: string;
  finishedAt: string;
  entry: string;
  projectKey: string;
  projectName: string;
  caseId: string;
  caseName: string;
  caseTags: string[];
  duration: string;
  environment: string;
  operator: string;
  model: string;
  stepsPassed: number;
  stepsTotal: number;
  assertionsPassed: number;
  assertionsTotal: number;
  aiCalls: number;
  aiCost: string;
  heals: number;
  recovery: string;
  artifacts: number;
  screenshots: Array<{
    label: string;
    path: string;
    tone: "accent" | "accent2" | "warning" | "success";
  }>;
  assertions: Array<{
    name: string;
    actual: string;
    pass: boolean;
  }>;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseArtifacts(entry: string, fallback: number) {
  const match = entry.match(/(\d+)\s+artifacts?/i);
  return match ? Number(match[1]) : fallback;
}

function deriveEnvironment(index: number, status: string) {
  if (/fail/i.test(status)) {
    return "staging";
  }
  return index % 2 === 0 ? "prod-like" : "staging";
}

function deriveOperator(index: number) {
  return ["Lin Chen", "Aiko Sato", "Morgan Lee"][index % 3];
}

function deriveModel(index: number) {
  return ["claude-4.5", "gpt-5.2", "qwen2.5:14b"][index % 3];
}

function findBestCase(snapshot: AdminConsoleSnapshot, runName: string, index: number) {
  const normalizedRun = normalize(runName);
  const scored = snapshot.cases.map((testCase, caseIndex) => {
    const normalizedId = normalize(testCase.id);
    const normalizedName = normalize(testCase.name);
    const normalizedProject = normalize(testCase.projectKey);
    let score = 0;
    if (normalizedRun.includes(normalizedId)) {
      score += 6;
    }
    if (normalizedRun.includes(normalizedName)) {
      score += 5;
    }
    if (normalizedRun.includes(normalizedProject)) {
      score += 3;
    }
    if (caseIndex === index) {
      score += 1;
    }
    return { testCase, score };
  });
  const matched = scored.sort((left, right) => right.score - left.score)[0]?.testCase;
  return matched ?? snapshot.cases[index] ?? snapshot.cases[0] ?? null;
}

export function buildReportViewModels(snapshot: AdminConsoleSnapshot): ReportViewModel[] {
  return snapshot.reports.map((report, index) => {
    const matchedCase = findBestCase(snapshot, report.runName, index);
    const matchedProject = snapshot.projects.find((project) => project.key === matchedCase?.projectKey) ?? snapshot.projects[0];
    const status = report.status || "INFO";
    const stepsTotal = Math.max(6, 6 + (matchedCase?.tags.length ?? 0) + (index % 3));
    const failed = /fail/i.test(status);
    const infoOnly = /info/i.test(status);
    const stepsPassed = infoOnly ? Math.max(2, stepsTotal - 2) : failed ? stepsTotal - 1 : stepsTotal;
    const assertionsTotal = Math.max(4, 3 + (matchedCase?.tags.length ?? 0));
    const assertionsPassed = infoOnly ? Math.max(2, assertionsTotal - 1) : failed ? assertionsTotal - 1 : assertionsTotal;
    const heals = failed ? 1 : index % 2;
    const artifacts = parseArtifacts(report.entry, 4 + index);
    const environment = deriveEnvironment(index, status);
    const operator = deriveOperator(index);
    const model = deriveModel(index);

    return {
      runName: report.runName,
      status,
      finishedAt: report.finishedAt,
      entry: report.entry,
      projectKey: matchedProject?.key ?? matchedCase?.projectKey ?? "unknown-project",
      projectName: matchedProject?.name ?? matchedCase?.projectKey ?? "Unknown project",
      caseId: matchedCase?.id ?? `case-${index + 1}`,
      caseName: matchedCase?.name ?? report.runName,
      caseTags: matchedCase?.tags ?? [],
      duration: failed ? "4m 06s" : infoOnly ? "1m 48s" : "3m 14s",
      environment,
      operator,
      model,
      stepsPassed,
      stepsTotal,
      assertionsPassed,
      assertionsTotal,
      aiCalls: 18 + index * 5,
      aiCost: `$${(0.048 + index * 0.017).toFixed(3)}`,
      heals,
      recovery: failed ? "needs review" : "ok",
      artifacts,
      screenshots: [
        { label: "01", path: "/cart", tone: "accent" },
        { label: "02", path: "/checkout", tone: "accent2" },
        { label: "03", path: failed ? "/pay/error" : "/pay/spin", tone: "warning" },
        { label: "04", path: failed ? "/pay/retry" : "/order/confirm", tone: failed ? "accent" : "success" }
      ],
      assertions: [
        {
          name: `url matches ${failed ? "/checkout/payment" : "/order/confirm/*"}`,
          actual: failed ? "/checkout/payment" : "/order/confirm/ord_8821",
          pass: true
        },
        {
          name: failed ? 'text "Submit payment"' : 'text "Thanks for your order"',
          actual: failed ? "button remained disabled" : "exact match",
          pass: !failed
        },
        {
          name: `db ${matchedProject?.key ?? "project"}.status check`,
          actual: failed ? '"pending"' : '"paid"',
          pass: !failed
        },
        {
          name: "inventory delta recorded",
          actual: failed ? "skipped after payment halt" : 'sku_A -1 / sku_B -1',
          pass: !failed
        },
        {
          name: "notification sent",
          actual: failed ? "not emitted" : "1 queued / order_confirmation_v2",
          pass: !failed
        }
      ]
    };
  });
}

export function selectReportViewModel(snapshot: AdminConsoleSnapshot, runName: string | null): ReportViewModel | null {
  const reports = buildReportViewModels(snapshot);
  return reports.find((item) => item.runName === runName) ?? reports[0] ?? null;
}
