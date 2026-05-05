async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

const formDefaults = {
  launch: {
    runId: "popup-checkout-smoke",
    projectKey: "checkout-web",
    owner: "edge-popup",
    environment: "staging-edge",
    detail: "Queued from the Edge popup after reviewing the current page context."
  },
  review: {
    runId: "popup-checkout-smoke",
    projectKey: "checkout-web",
    owner: "edge-popup-audit",
    environment: "staging-edge",
    detail: "Operator requested follow-up review from the Edge popup."
  }
};

let latestTab = null;
let currentPickResult = null;

export function createFallbackPopupSnapshot(error) {
  return {
    status: "FALLBACK",
    summary: error instanceof Error ? error.message : String(error),
    runtime: {
      mode: "Audit-first",
      queueState: "Unavailable",
      auditState: "Native host unavailable",
      nextAction: "Register the native host and start local-admin-api to enable popup actions"
    }
  };
}

export async function requestNativeBridge(type, payload = {}) {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    throw new Error("Extension background bridge is unavailable.");
  }
  const response = await chrome.runtime.sendMessage({
    channel: "native-host",
    type,
    payload
  });
  if (!response?.ok) {
    throw new Error(response?.error || "Native host request failed.");
  }
  return response.data;
}

export async function requestPlatformOpen(url) {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    throw new Error("Extension background bridge is unavailable.");
  }
  const response = await chrome.runtime.sendMessage({
    channel: "platform-open",
    url
  });
  if (!response?.ok) {
    throw new Error(response?.error || "Platform open request failed.");
  }
  return response.data;
}

export async function loadPopupSnapshot() {
  try {
    return await requestNativeBridge("POPUP_SNAPSHOT_GET");
  } catch (error) {
    return createFallbackPopupSnapshot(error);
  }
}

export function readForm(prefix) {
  return {
    runId: document.getElementById(`${prefix}RunId`)?.value.trim() ?? "",
    projectKey: document.getElementById(`${prefix}ProjectKey`)?.value.trim() ?? "",
    owner: document.getElementById(`${prefix}Owner`)?.value.trim() ?? "",
    environment: document.getElementById(`${prefix}Environment`)?.value.trim() ?? "",
    detail: document.getElementById(`${prefix}Detail`)?.value.trim() ?? ""
  };
}

export function buildContextDetail(detail, tab) {
  const parts = [];
  if (detail) {
    parts.push(detail);
  }
  if (tab?.title) {
    parts.push(`Page: ${tab.title}`);
  }
  if (tab?.url) {
    parts.push(`URL: ${tab.url}`);
  }
  return parts.join(" | ");
}

export function buildRequestTitle(form) {
  if (form.runId && form.environment) {
    return `${form.runId} / ${form.environment}`;
  }
  return form.runId || form.projectKey || "edge-popup-request";
}

export function buildSchedulerRequestPayload(form, tab) {
  return {
    ...form,
    status: "PRE_EXECUTION",
    title: buildRequestTitle(form),
    detail: buildContextDetail(form.detail, tab)
  };
}

export function setMutationState(targetId, kind, message) {
  const node = document.getElementById(targetId);
  if (!node) {
    return;
  }
  node.textContent = message;
  node.className = message ? `actionStatus ${kind}` : "actionStatus hidden";
}

export function setButtonPending(buttonId, pending, pendingLabel, defaultLabel) {
  const button = document.getElementById(buttonId);
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  button.disabled = pending;
  button.textContent = pending ? pendingLabel : defaultLabel;
}

export function renderPageSummaryResult(summary) {
  const summaryNode = document.getElementById("pageSummaryResult");
  const recommendationNode = document.getElementById("pageSummaryRecommendation");
  if (summaryNode) {
    summaryNode.textContent = summary?.summary || "No page summary available.";
  }
  if (recommendationNode) {
    recommendationNode.textContent = summary?.recommendedAction || "Refresh current page context or open the platform.";
  }
}

export function renderQuickSmokeResult(result) {
  const stateNode = document.getElementById("quickSmokeState");
  const runIdNode = document.getElementById("quickSmokeRunId");
  const queueNode = document.getElementById("quickSmokeQueue");
  const nextStepNode = document.getElementById("quickSmokeNextStep");

  if (stateNode) {
    stateNode.textContent = result?.state || "Not started.";
  }
  if (runIdNode) {
    runIdNode.textContent = result?.runId || "-";
  }
  if (queueNode) {
    queueNode.textContent = result?.queueStatus || "-";
  }
  if (nextStepNode) {
    nextStepNode.textContent = result?.nextStep || "Use Quick smoke test to queue the current page context.";
  }
}

export function seedFormValues(snapshot, tab) {
  const pageHost = snapshot?.page?.domain || snapshot?.page?.host || (tab?.url ? new URL(tab.url).host : "");
  const runtimeHint = snapshot?.runtime?.nextAction || "";
  const launchRunId = document.getElementById("launchRunId");
  const reviewRunId = document.getElementById("reviewRunId");
  const launchProjectKey = document.getElementById("launchProjectKey");
  const reviewProjectKey = document.getElementById("reviewProjectKey");
  const launchEnvironment = document.getElementById("launchEnvironment");
  const reviewEnvironment = document.getElementById("reviewEnvironment");
  const launchDetail = document.getElementById("launchDetail");
  const reviewDetail = document.getElementById("reviewDetail");

  if (launchRunId instanceof HTMLInputElement && !launchRunId.dataset.touched && tab?.title) {
    launchRunId.value = launchRunId.value || formDefaults.launch.runId;
  }
  if (reviewRunId instanceof HTMLInputElement && !reviewRunId.dataset.touched) {
    reviewRunId.value = reviewRunId.value || (launchRunId instanceof HTMLInputElement ? launchRunId.value : formDefaults.review.runId);
  }
  if (launchProjectKey instanceof HTMLInputElement && !launchProjectKey.dataset.touched && pageHost.includes("checkout")) {
    launchProjectKey.value = "checkout-web";
  }
  if (reviewProjectKey instanceof HTMLInputElement && !reviewProjectKey.dataset.touched) {
    reviewProjectKey.value = reviewProjectKey.value || (launchProjectKey instanceof HTMLInputElement ? launchProjectKey.value : formDefaults.review.projectKey);
  }
  if (launchEnvironment instanceof HTMLInputElement && !launchEnvironment.dataset.touched && snapshot?.page?.host) {
    launchEnvironment.value = launchEnvironment.value || formDefaults.launch.environment;
  }
  if (reviewEnvironment instanceof HTMLInputElement && !reviewEnvironment.dataset.touched) {
    reviewEnvironment.value = reviewEnvironment.value || (launchEnvironment instanceof HTMLInputElement ? launchEnvironment.value : formDefaults.review.environment);
  }
  if (launchDetail instanceof HTMLTextAreaElement && !launchDetail.dataset.touched && runtimeHint) {
    launchDetail.value = `Queued from popup. Suggested action: ${runtimeHint}`;
  }
  if (reviewDetail instanceof HTMLTextAreaElement && !reviewDetail.dataset.touched && runtimeHint) {
    reviewDetail.value = `Review requested from popup. Suggested action: ${runtimeHint}`;
  }
}

export function getSelectedLocator() {
  return currentPickResult?.recommendedLocator || "";
}

export async function requestPageSummary(tab = latestTab) {
  return await requestNativeBridge("PAGE_SUMMARY_GET", {
    pageTitle: tab?.title || "",
    pageUrl: tab?.url || "",
    locator: getSelectedLocator()
  });
}

export async function requestContentScriptPick(type, payload = {}) {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    throw new Error("Extension background bridge is unavailable.");
  }
  const response = await chrome.runtime.sendMessage({
    channel: "content-script",
    type,
    payload
  });
  if (!response?.ok) {
    throw new Error(response?.error || "Content script request failed.");
  }
  return response.data;
}

export async function requestPickState() {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    throw new Error("Extension background bridge is unavailable.");
  }
  const response = await chrome.runtime.sendMessage({
    channel: "pick-state",
    type: "PICK_STATE_GET"
  });
  if (!response?.ok) {
    throw new Error(response?.error || "Pick state request failed.");
  }
  return response.data;
}

export function isPickStateForTab(pickState, tab) {
  if (!pickState || pickState.status !== "picked" || !pickState.result) {
    return false;
  }
  const sourceTabId = pickState.sourceTabId ?? null;
  const sourcePageUrl = pickState.sourcePageUrl || "";
  const tabId = tab?.id ?? null;
  const pageUrl = tab?.url || "";
  return sourceTabId === tabId && sourcePageUrl === pageUrl;
}

export async function preparePlatformHandoff(target, payload = {}) {
  return await requestNativeBridge("PLATFORM_HANDOFF_PREPARE", {
    target,
    ...payload
  });
}

export function trackTouchedFields() {
  ["launch", "review"].forEach((prefix) => {
    ["RunId", "ProjectKey", "Owner", "Environment", "Detail"].forEach((suffix) => {
      const node = document.getElementById(`${prefix}${suffix}`);
      node?.addEventListener("input", () => {
        node.dataset.touched = "true";
      });
    });
  });
}

export function renderLocatorCandidates(candidates) {
  const listNode = document.getElementById("locatorCandidatesList");
  if (!(listNode instanceof HTMLElement)) {
    return;
  }
  listNode.textContent = "";
  const safeCandidates = Array.isArray(candidates) ? candidates : [];
  if (safeCandidates.length === 0) {
    const emptyNode = document.createElement("li");
    emptyNode.className = "locatorCandidate empty";
    emptyNode.textContent = "No picked element yet.";
    listNode.appendChild(emptyNode);
    return;
  }
  safeCandidates.forEach((candidate) => {
    const itemNode = document.createElement("li");
    itemNode.className = `locatorCandidate${candidate.recommended ? " recommended" : ""}`;

    const valueNode = document.createElement("strong");
    valueNode.textContent = String(candidate.value || "");
    itemNode.appendChild(valueNode);

    const metaNode = document.createElement("div");
    metaNode.className = "locatorCandidateMeta";
    const typeNode = document.createElement("span");
    typeNode.textContent = String(candidate.type || "");
    const scoreNode = document.createElement("span");
    scoreNode.textContent = `score ${candidate.score ?? ""}`;
    metaNode.appendChild(typeNode);
    metaNode.appendChild(scoreNode);
    itemNode.appendChild(metaNode);

    const reasonNode = document.createElement("div");
    reasonNode.className = "locatorCandidateReason";
    reasonNode.textContent = String(candidate.reason || "");
    itemNode.appendChild(reasonNode);

    listNode.appendChild(itemNode);
  });
}

export function renderPickResult(result) {
  currentPickResult = result || null;
  const tagNode = document.getElementById("pickedTag");
  const textNode = document.getElementById("pickedText");
  const idNode = document.getElementById("pickedId");
  const nameNode = document.getElementById("pickedName");
  const locatorNode = document.getElementById("selectedLocator");
  const reasonNode = document.getElementById("locatorReason");

  if (tagNode) {
    tagNode.textContent = result?.tag || "Not picked yet.";
  }
  if (textNode) {
    textNode.textContent = result?.text || "Pick an element from the page to inspect it here.";
  }
  if (idNode) {
    idNode.textContent = result?.id || "-";
  }
  if (nameNode) {
    nameNode.textContent = result?.name || "-";
  }
  if (locatorNode) {
    locatorNode.textContent = result?.recommendedLocator || "-";
  }
  if (reasonNode) {
    reasonNode.textContent = result?.recommendedReason || "Pick mode returns a recommended locator after the page element is selected.";
  }
  renderLocatorCandidates(result?.locatorCandidates || []);
}

export async function postSchedulerMutation(type, payload) {
  return await requestNativeBridge(type, payload);
}

export function buildQuickSmokeResult(response, form, snapshot) {
  const entry = response?.entry && typeof response.entry === "object" ? response.entry : {};
  const acceptedStatus = typeof response?.status === "string" && response.status
    ? response.status
    : "ACCEPTED";
  const queueStatus = typeof entry.status === "string" && entry.status
    ? entry.status
    : (snapshot?.runtime?.queueState || "Accepted by local scheduler");
  return {
    state: acceptedStatus,
    runId: typeof entry.runId === "string" && entry.runId ? entry.runId : form.runId,
    queueStatus,
    nextStep: "Open Platform Execution or Monitor for detailed progress."
  };
}

export async function submitLaunch(event) {
  event.preventDefault();
  const form = readForm("launch");
  if (!form.runId) {
    setMutationState("launchStatus", "error", "Run ID is required.");
    return;
  }
  setButtonPending("launchSubmitButton", true, "Running...", "Run");
  setMutationState("launchStatus", "pending", "Submitting pre-execution request through native host...");
  try {
    await postSchedulerMutation("SCHEDULER_REQUEST_CREATE", buildSchedulerRequestPayload(form, latestTab));
    const refreshed = await refreshCurrentPage();
    const queueState = refreshed?.runtime?.queueState || "scheduler updated";
    setMutationState("launchStatus", "success", `Prepared ${form.runId} for pre-execution. ${queueState}`);
    const reviewRunId = document.getElementById("reviewRunId");
    if (reviewRunId instanceof HTMLInputElement && !reviewRunId.dataset.touched) {
      reviewRunId.value = form.runId;
    }
  } catch (error) {
    setMutationState("launchStatus", "error", error instanceof Error ? error.message : String(error));
  } finally {
    setButtonPending("launchSubmitButton", false, "Running...", "Run");
  }
}

export async function runQuickSmokeAction() {
  const form = readForm("launch");
  if (!form.runId) {
    const error = new Error("Run ID is required.");
    renderQuickSmokeResult({
      state: "ERROR",
      runId: "-",
      queueStatus: "Missing run id",
      nextStep: error.message
    });
    setMutationState("quickActionStatus", "error", error.message);
    throw error;
  }
  setButtonPending("quickSmokeButton", true, "Starting...", "Quick smoke test");
  renderQuickSmokeResult({
    state: "PENDING",
    runId: form.runId,
    queueStatus: "Submitting request",
    nextStep: "Waiting for local scheduler acceptance."
  });
  setMutationState("quickActionStatus", "pending", "Submitting quick smoke request through native host...");
  try {
    const tab = latestTab || await getCurrentTab();
    const response = await postSchedulerMutation(
      "SCHEDULER_REQUEST_CREATE",
      buildSchedulerRequestPayload(form, tab)
    );
    const refreshed = await refreshCurrentPage();
    const result = buildQuickSmokeResult(response, form, refreshed);
    renderQuickSmokeResult(result);
    setMutationState(
      "quickActionStatus",
      "success",
      `Quick smoke accepted for ${result.runId}. ${result.queueStatus}`
    );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    renderQuickSmokeResult({
      state: "ERROR",
      runId: form.runId,
      queueStatus: "Not accepted",
      nextStep: message
    });
    setMutationState("quickActionStatus", "error", message);
    throw error;
  } finally {
    setButtonPending("quickSmokeButton", false, "Starting...", "Quick smoke test");
  }
}

export async function submitExecution() {
  const form = readForm("launch");
  if (!form.runId) {
    setMutationState("launchStatus", "error", "Run ID is required.");
    return;
  }
  setButtonPending("launchExecuteButton", true, "Executing...", "Execution");
  setMutationState("launchStatus", "pending", "Submitting formal execution event through native host...");
  try {
    await postSchedulerMutation("SCHEDULER_EVENT_CREATE", {
      ...form,
      title: buildRequestTitle(form),
      type: "STARTED",
      state: "RUNNING",
      status: "RUNNING",
      detail: buildContextDetail(form.detail, latestTab)
    });
    const refreshed = await refreshCurrentPage();
    const queueState = refreshed?.runtime?.queueState || "execution started";
    setMutationState("launchStatus", "success", `Execution started for ${form.runId}. ${queueState}`);
  } catch (error) {
    setMutationState("launchStatus", "error", error instanceof Error ? error.message : String(error));
  } finally {
    setButtonPending("launchExecuteButton", false, "Executing...", "Execution");
  }
}

export async function submitReview(event) {
  event.preventDefault();
  const form = readForm("review");
  if (!form.runId) {
    setMutationState("reviewStatus", "error", "Run ID is required.");
    return;
  }
  setButtonPending("reviewSubmitButton", true, "Recording...", "Record Review");
  setMutationState("reviewStatus", "pending", "Submitting scheduler review event through native host...");
  try {
    await postSchedulerMutation("SCHEDULER_EVENT_CREATE", {
      ...form,
      title: buildRequestTitle(form),
      type: "NEEDS_REVIEW",
      state: "NEEDS_REVIEW",
      status: "NEEDS_REVIEW",
      detail: buildContextDetail(form.detail, latestTab)
    });
    const refreshed = await refreshCurrentPage();
    const auditState = refreshed?.runtime?.auditState || "review recorded";
    setMutationState("reviewStatus", "success", `Recorded review for ${form.runId}. ${auditState}`);
  } catch (error) {
    setMutationState("reviewStatus", "error", error instanceof Error ? error.message : String(error));
  } finally {
    setButtonPending("reviewSubmitButton", false, "Recording...", "Record Review");
  }
}

export async function runPageSummaryAction() {
  setButtonPending("pageSummaryButton", true, "Loading...", "Page summary");
  setMutationState("quickActionStatus", "pending", "Requesting page summary through native host...");
  try {
    const tab = latestTab || await getCurrentTab();
    const summary = await requestPageSummary(tab);
    renderPageSummaryResult(summary);
    setMutationState("quickActionStatus", "success", summary.recommendedAction || "Page summary loaded.");
    return summary;
  } catch (error) {
    setMutationState("quickActionStatus", "error", error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    setButtonPending("pageSummaryButton", false, "Loading...", "Page summary");
  }
}

export async function runPickElementAction() {
  setButtonPending("pickElementButton", true, "Picking...", "Pick element");
  setMutationState("quickActionStatus", "pending", "Starting pick mode on the current page...");
  try {
    const result = await requestContentScriptPick("CS_PICK_ELEMENT_START");
    setMutationState("quickActionStatus", "success", "Pick mode started. Click an element on the page, then reopen the popup to review the result.");
    return result;
  } catch (error) {
    setMutationState("quickActionStatus", "error", error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    setButtonPending("pickElementButton", false, "Picking...", "Pick element");
  }
}

export async function runOpenInPlatformAction() {
  const form = readForm("launch");
  const tab = latestTab || await getCurrentTab();
  setButtonPending("openPlatformButton", true, "Opening...", "Open in platform");
  setMutationState("quickActionStatus", "pending", "Preparing platform execution handoff through native host...");
  try {
    const handoff = await preparePlatformHandoff("execution", {
      runId: form.runId,
      projectKey: form.projectKey,
      owner: form.owner,
      environment: form.environment,
      targetUrl: tab?.url || "",
      detail: buildContextDetail(form.detail, tab)
    });
    await requestPlatformOpen(handoff.url);
    setMutationState("quickActionStatus", "success", "Opened platform execution workspace.");
    return handoff;
  } catch (error) {
    setMutationState("quickActionStatus", "error", error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    setButtonPending("openPlatformButton", false, "Opening...", "Open in platform");
  }
}

export async function copySelectedLocator() {
  const locator = getSelectedLocator();
  if (!locator) {
    throw new Error("Pick an element first to copy a real locator.");
  }
  if (!globalThis.navigator?.clipboard?.writeText) {
    throw new Error("Clipboard write is unavailable in this popup context.");
  }
  await globalThis.navigator.clipboard.writeText(locator);
  setMutationState("quickActionStatus", "success", `Copied locator: ${locator}`);
  return locator;
}

export async function runUseInDslAction() {
  const tab = latestTab || await getCurrentTab();
  const form = readForm("launch");
  const locator = getSelectedLocator();
  if (!locator) {
    throw new Error("Pick an element first to send a real locator into DSL.");
  }
  setButtonPending("useDslButton", true, "Opening...", "Use in DSL");
  setMutationState("quickActionStatus", "pending", "Preparing DSL handoff through native host...");
  try {
    const handoff = await preparePlatformHandoff("aiGenerate", {
      projectKey: form.projectKey || "checkout-web",
      projectName: form.projectKey || "checkout-web",
      pageTitle: tab?.title || "Current page",
      pageUrl: tab?.url || "",
      locator
    });
    await requestPlatformOpen(handoff.url);
    setMutationState("quickActionStatus", "success", "Opened platform DSL review workspace.");
    return handoff;
  } catch (error) {
    setMutationState("quickActionStatus", "error", error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    setButtonPending("useDslButton", false, "Opening...", "Use in DSL");
  }
}

export async function refreshCurrentPage() {
  const titleNode = document.getElementById("pageTitle");
  const urlNode = document.getElementById("pageUrl");
  const connectionBadgeNode = document.getElementById("connectionBadge");
  const connectionStateNode = document.getElementById("connectionState");
  const connectionSummaryNode = document.getElementById("connectionSummary");
  const runtimeModeNode = document.getElementById("runtimeMode");
  const runtimeQueueNode = document.getElementById("runtimeQueue");
  const runtimeAuditNode = document.getElementById("runtimeAudit");
  const runtimeStateNode = document.getElementById("runtimeState");
  const runtimeActionNode = document.getElementById("runtimeAction");

  try {
    const [tab, snapshot] = await Promise.all([getCurrentTab(), loadPopupSnapshot()]);
    latestTab = tab ?? null;
    titleNode.textContent = tab?.title ?? "Untitled tab";
    urlNode.textContent = tab?.url ?? "No URL";
    connectionBadgeNode.textContent = snapshot.status;
    connectionStateNode.textContent = snapshot.status === "READY"
      ? "Connected through native host"
      : "Using fallback popup data";
    connectionSummaryNode.textContent = snapshot.summary;
    runtimeModeNode.textContent = snapshot.runtime.mode;
    runtimeQueueNode.textContent = snapshot.runtime.queueState;
    runtimeAuditNode.textContent = snapshot.runtime.auditState;
    runtimeStateNode.textContent = `${snapshot.status} / ${snapshot.runtime.queueState}`;
    runtimeActionNode.textContent = snapshot.runtime.nextAction;
    renderPageSummaryResult({
      summary: snapshot.summary,
      recommendedAction: snapshot.runtime.nextAction
    });
    const pickState = await requestPickState();
    if (isPickStateForTab(pickState, tab)) {
      renderPickResult(pickState.result);
    } else {
      renderPickResult(null);
    }
    seedFormValues(snapshot, tab);
    return snapshot;
  } catch (error) {
    latestTab = null;
    titleNode.textContent = "Read failed";
    urlNode.textContent = error instanceof Error ? error.message : String(error);
    connectionBadgeNode.textContent = "ERROR";
    connectionStateNode.textContent = "Popup refresh failed";
    connectionSummaryNode.textContent = "Retry after resolving the extension or local API issue.";
    runtimeModeNode.textContent = "Error";
    runtimeQueueNode.textContent = "Unavailable";
    runtimeAuditNode.textContent = "Unavailable";
    runtimeStateNode.textContent = "Error";
    runtimeActionNode.textContent = "Refresh after resolving the popup error";
    throw error;
  }
}

export function initPopup() {
  document.getElementById("pickElementButton")?.addEventListener("click", () => {
    void runPickElementAction();
  });
  document.getElementById("quickSmokeButton")?.addEventListener("click", () => {
    void runQuickSmokeAction();
  });
  document.getElementById("refreshButton")?.addEventListener("click", () => {
    void refreshCurrentPage();
  });
  document.getElementById("pageSummaryButton")?.addEventListener("click", () => {
    void runPageSummaryAction();
  });
  document.getElementById("openPlatformButton")?.addEventListener("click", () => {
    void runOpenInPlatformAction();
  });
  document.getElementById("copyLocatorButton")?.addEventListener("click", () => {
    void copySelectedLocator().catch((error) => {
      setMutationState("quickActionStatus", "error", error instanceof Error ? error.message : String(error));
    });
  });
  document.getElementById("useDslButton")?.addEventListener("click", () => {
    void runUseInDslAction();
  });
  document.getElementById("launchForm")?.addEventListener("submit", submitLaunch);
  document.getElementById("launchExecuteButton")?.addEventListener("click", () => {
    void submitExecution();
  });
  document.getElementById("reviewForm")?.addEventListener("submit", submitReview);
  trackTouchedFields();
  void refreshCurrentPage();
}

if (typeof document !== "undefined" && document.getElementById("refreshButton")) {
  initPopup();
}
