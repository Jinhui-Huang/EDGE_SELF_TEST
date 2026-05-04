const PICK_HIGHLIGHT_ID = "__phase3_pick_highlight__";

const pickState = {
  active: false,
  cleanup: null
};

function collapseText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function shortText(value, maxLength = 80) {
  const text = collapseText(value);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

function cssEscapeSimple(value) {
  return String(value || "").replace(/["\\]/g, "\\$&");
}

function buildCssPath(element) {
  if (!(element instanceof Element)) {
    return "";
  }
  if (element.id) {
    return `#${cssEscapeSimple(element.id)}`;
  }
  const segments = [];
  let current = element;
  while (current && current.nodeType === Node.ELEMENT_NODE && segments.length < 4) {
    let segment = current.tagName.toLowerCase();
    if (current.id) {
      segment += `#${cssEscapeSimple(current.id)}`;
      segments.unshift(segment);
      break;
    }
    if (current.classList.length > 0) {
      segment += `.${Array.from(current.classList).slice(0, 2).map(cssEscapeSimple).join(".")}`;
    } else if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter((child) => child.tagName === current.tagName);
      if (siblings.length > 1) {
        segment += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
    }
    segments.unshift(segment);
    current = current.parentElement;
  }
  return segments.join(" > ");
}

function findElementText(element) {
  if (!(element instanceof HTMLElement)) {
    return "";
  }
  return shortText(element.innerText || element.textContent || "");
}

function buildLocatorCandidates(element) {
  const candidates = [];
  const text = findElementText(element);
  const tag = element.tagName.toLowerCase();
  const id = element.getAttribute("id") || "";
  const name = element.getAttribute("name") || "";

  if (id) {
    candidates.push({
      type: "id",
      value: `#${id}`,
      score: 0.98,
      reason: "Stable explicit id."
    });
  }
  if (name) {
    candidates.push({
      type: "name",
      value: `[name=\"${cssEscapeSimple(name)}\"]`,
      score: 0.9,
      reason: "Stable field name."
    });
  }
  if (text) {
    candidates.push({
      type: "text",
      value: `${tag}:has-text('${text.replace(/'/g, "\\'")}')`,
      score: 0.82,
      reason: "Readable visible text."
    });
  }

  candidates.push({
    type: "css",
    value: buildCssPath(element),
    score: candidates.length === 0 ? 0.86 : 0.64,
    reason: candidates.length === 0 ? "Fallback CSS locator." : "Structural fallback when semantic attributes change."
  });

  return candidates
    .filter((candidate) => candidate.value)
    .map((candidate, index) => ({
      ...candidate,
      recommended: index === 0
    }));
}

export function buildPickResult(element) {
  const candidates = buildLocatorCandidates(element);
  const recommended = candidates.find((candidate) => candidate.recommended) || candidates[0] || null;
  return {
    tag: element.tagName.toLowerCase(),
    text: findElementText(element),
    id: element.getAttribute("id") || "",
    name: element.getAttribute("name") || "",
    recommendedLocator: recommended?.value || "",
    recommendedReason: recommended?.reason || "",
    locatorCandidates: candidates
  };
}

function ensureHighlight() {
  let overlay = document.getElementById(PICK_HIGHLIGHT_ID);
  if (overlay instanceof HTMLDivElement) {
    return overlay;
  }
  overlay = document.createElement("div");
  overlay.id = PICK_HIGHLIGHT_ID;
  overlay.style.position = "fixed";
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "2147483647";
  overlay.style.borderRadius = "6px";
  document.documentElement.appendChild(overlay);
  return overlay;
}

export function applyHighlight(element, mode = "hover") {
  if (!(element instanceof Element)) {
    clearHighlight();
    return;
  }
  const rect = element.getBoundingClientRect();
  const overlay = ensureHighlight();
  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.border = mode === "selected" ? "2px solid #c2410c" : "2px solid #1d4ed8";
  overlay.style.background = mode === "selected" ? "rgba(251, 146, 60, 0.16)" : "rgba(96, 165, 250, 0.16)";
}

export function clearHighlight() {
  document.getElementById(PICK_HIGHLIGHT_ID)?.remove();
}

function notifyPickResult(result) {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return Promise.resolve();
  }
  return chrome.runtime.sendMessage({
    channel: "pick-result",
    type: "CS_PICK_ELEMENT_RESULT",
    payload: result
  });
}

function finishPick(callback) {
  pickState.cleanup?.();
  pickState.cleanup = null;
  pickState.active = false;
  callback?.();
  clearHighlight();
}

export function stopPickMode() {
  if (!pickState.active) {
    clearHighlight();
    return { stopped: false };
  }
  finishPick();
  return { stopped: true };
}

export function startPickMode() {
  if (pickState.active) {
    stopPickMode();
  }

  const onMouseMove = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.id === PICK_HIGHLIGHT_ID) {
      return;
    }
    applyHighlight(target, "hover");
  };

  const onClick = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.id === PICK_HIGHLIGHT_ID) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
    applyHighlight(target, "selected");
    const result = buildPickResult(target);
    void notifyPickResult(result).finally(() => {
      finishPick();
    });
  };

  const onKeyDown = (event) => {
    if (event.key !== "Escape") {
      return;
    }
    event.preventDefault();
    finishPick();
  };

  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);

  pickState.active = true;
  pickState.cleanup = () => {
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
  };

  return { started: true };
}

export async function handlePickMessage(message) {
  switch (message?.type) {
    case "CS_PICK_ELEMENT_START":
      return startPickMode();
    case "CS_PICK_ELEMENT_STOP":
      stopPickMode();
      return { stopped: true };
    default:
      throw new Error("Unsupported content message.");
  }
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message?.type?.startsWith("CS_PICK_ELEMENT_")) {
      return undefined;
    }
    void handlePickMessage(message)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }));
    return true;
  });
}
