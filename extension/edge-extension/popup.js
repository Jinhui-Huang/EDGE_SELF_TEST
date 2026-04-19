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

export function seedFormValues(snapshot, tab) {
  const pageHost = snapshot?.page?.host || (tab?.url ? new URL(tab.url).host : "");
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

export async function postSchedulerMutation(type, payload) {
  return await requestNativeBridge(type, payload);
}

export async function submitLaunch(event) {
  event.preventDefault();
  const form = readForm("launch");
  if (!form.runId) {
    setMutationState("launchStatus", "error", "Run ID is required.");
    return;
  }
  setButtonPending("launchSubmitButton", true, "Queueing...", "Queue Run");
  setMutationState("launchStatus", "pending", "Submitting scheduler request through native host...");
  try {
    await postSchedulerMutation("SCHEDULER_REQUEST_CREATE", {
      ...form,
      title: buildRequestTitle(form),
      detail: buildContextDetail(form.detail, latestTab)
    });
    const refreshed = await refreshCurrentPage();
    const queueState = refreshed?.runtime?.queueState || "scheduler updated";
    setMutationState("launchStatus", "success", `Queued ${form.runId}. ${queueState}`);
    const reviewRunId = document.getElementById("reviewRunId");
    if (reviewRunId instanceof HTMLInputElement && !reviewRunId.dataset.touched) {
      reviewRunId.value = form.runId;
    }
  } catch (error) {
    setMutationState("launchStatus", "error", error instanceof Error ? error.message : String(error));
  } finally {
    setButtonPending("launchSubmitButton", false, "Queueing...", "Queue Run");
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
  document.getElementById("refreshButton")?.addEventListener("click", () => {
    void refreshCurrentPage();
  });
  document.getElementById("launchForm")?.addEventListener("submit", submitLaunch);
  document.getElementById("reviewForm")?.addEventListener("submit", submitReview);
  trackTouchedFields();
  void refreshCurrentPage();
}

if (typeof document !== "undefined" && document.getElementById("refreshButton")) {
  initPopup();
}
