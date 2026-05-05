import { beforeEach, describe, expect, it, vi } from "vitest";

function createFormDom() {
  document.body.innerHTML = `
    <input id="launchRunId" value=" popup-run " />
    <input id="launchProjectKey" value=" checkout-web " />
    <input id="launchOwner" value=" edge-popup " />
    <input id="launchEnvironment" value=" staging-edge " />
    <textarea id="launchDetail"> review current page </textarea>
    <input id="reviewRunId" value="" />
    <input id="reviewProjectKey" value="" />
    <input id="reviewEnvironment" value="" />
    <textarea id="reviewDetail"></textarea>
    <button id="pickElementButton" type="button">Pick element</button>
    <button id="quickSmokeButton" type="button">Quick smoke test</button>
    <button id="pageSummaryButton" type="button">Page summary</button>
    <button id="openPlatformButton" type="button">Open in platform</button>
    <button id="copyLocatorButton" type="button">Copy locator</button>
    <button id="useDslButton" type="button">Use in DSL</button>
    <p id="quickActionStatus" class="actionStatus hidden"></p>
    <dd id="quickSmokeState">Not started.</dd>
    <dd id="quickSmokeRunId">-</dd>
    <dd id="quickSmokeQueue">-</dd>
    <dd id="quickSmokeNextStep">Use Quick smoke test to queue the current page context.</dd>
    <dd id="pickedTag">Not picked yet.</dd>
    <dd id="pickedText">Pick an element from the page to inspect it here.</dd>
    <dd id="pickedId">-</dd>
    <dd id="pickedName">-</dd>
    <dd id="selectedLocator">-</dd>
    <dd id="locatorReason">Pick mode returns a recommended locator after the page element is selected.</dd>
    <ul id="locatorCandidatesList"><li class="locatorCandidate empty">No picked element yet.</li></ul>
    <dd id="pageSummaryResult">Not requested yet.</dd>
    <dd id="pageSummaryRecommendation">Not requested yet.</dd>
    <dd id="pageTitle">Not loaded</dd>
    <dd id="pageUrl">Not loaded</dd>
    <span id="connectionBadge">Mock</span>
    <strong id="connectionState">Waiting</strong>
    <p id="connectionSummary">Waiting</p>
    <span id="runtimeMode">Mode</span>
    <span id="runtimeQueue">Queue</span>
    <span id="runtimeAudit">Audit</span>
    <span id="runtimeState">State</span>
    <span id="runtimeAction">Action</span>
  `;
}

describe("popup helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
    vi.restoreAllMocks();
    globalThis.chrome = {
      runtime: {
        sendMessage: vi.fn()
      },
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 42, title: "Checkout", url: "https://checkout.example.test/pay" }
        ])
      }
    };
    Object.defineProperty(globalThis, "navigator", {
      value: {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      },
      configurable: true
    });
  });

  it("builds request titles and context details from the current tab", async () => {
    const popup = await import("../../../extension/edge-extension/popup.js");

    expect(
      popup.buildRequestTitle({
        runId: "checkout-web-smoke",
        environment: "prod-like"
      })
    ).toBe("checkout-web-smoke / prod-like");
    expect(
      popup.buildContextDetail("Queued from popup", {
        title: "Checkout",
        url: "https://checkout.example.test/pay"
      })
    ).toBe("Queued from popup | Page: Checkout | URL: https://checkout.example.test/pay");
  });

  it("reads trimmed form values and seeds untouched review fields", async () => {
    createFormDom();
    const popup = await import("../../../extension/edge-extension/popup.js");

    expect(popup.readForm("launch")).toEqual({
      runId: "popup-run",
      projectKey: "checkout-web",
      owner: "edge-popup",
      environment: "staging-edge",
      detail: "review current page"
    });

    popup.seedFormValues(
      {
        runtime: {
          nextAction: "Open audit review"
        },
        page: {
          host: "checkout.example.test"
        }
      },
      {
        title: "Checkout Page",
        url: "https://checkout.example.test/pay"
      }
    );

    expect(document.getElementById("reviewProjectKey").value).toBe("checkout-web");
    expect(document.getElementById("reviewEnvironment").value.trim()).toBe("staging-edge");
    expect(document.getElementById("reviewDetail").value).toContain("Open audit review");
  });

  it("sends popup reads through the extension native-host bridge", async () => {
    const sendMessage = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        status: "READY",
        summary: "Bridge online",
        runtime: {
          queueState: "Synced"
        }
      }
    });
    globalThis.chrome.runtime.sendMessage = sendMessage;
    const popup = await import("../../../extension/edge-extension/popup.js");

    await expect(popup.loadPopupSnapshot()).resolves.toMatchObject({
      status: "READY",
      summary: "Bridge online"
    });
    expect(sendMessage).toHaveBeenCalledWith({
      channel: "native-host",
      type: "POPUP_SNAPSHOT_GET",
      payload: {}
    });
  });

  it("returns fallback popup payloads when the native host bridge is unavailable", async () => {
    globalThis.chrome.runtime.sendMessage = vi.fn().mockRejectedValue(new Error("Native host offline"));
    const popup = await import("../../../extension/edge-extension/popup.js");

    await expect(popup.loadPopupSnapshot()).resolves.toMatchObject({
      status: "FALLBACK",
      summary: "Native host offline",
      runtime: {
        queueState: "Unavailable"
      }
    });
  });

  it("requests page summary through native host and renders the result", async () => {
    createFormDom();
    globalThis.chrome.runtime.sendMessage = vi.fn().mockResolvedValueOnce({
      ok: true,
      data: {
        status: "READY",
        summary: "Checkout page is active.",
        recommendedAction: "Open the platform."
      }
    });
    const popup = await import("../../../extension/edge-extension/popup.js");

    await expect(popup.runPageSummaryAction()).resolves.toMatchObject({
      status: "READY"
    });
    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenCalledWith({
      channel: "native-host",
      type: "PAGE_SUMMARY_GET",
      payload: {
        pageTitle: "Checkout",
        pageUrl: "https://checkout.example.test/pay",
        locator: ""
      }
    });
    expect(document.getElementById("pageSummaryResult").textContent).toContain("Checkout page is active.");
    expect(document.getElementById("pageSummaryRecommendation").textContent).toContain("Open the platform.");
  });

  it("submits quick smoke through the scheduler request bridge and renders the accepted result", async () => {
    createFormDom();
    globalThis.chrome.runtime.sendMessage = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: {
          status: "ACCEPTED",
          schedulerId: "local-phase3-scheduler",
          entry: {
            runId: "popup-run",
            status: "PRE_EXECUTION"
          }
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          status: "READY",
          summary: "Bridge online",
          runtime: {
            mode: "Audit-first",
            queueState: "2 queued / 0 active / 2 waiting",
            auditState: "Idle",
            nextAction: "Open execution monitor"
          }
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          status: "idle",
          result: null
        }
      });
    const popup = await import("../../../extension/edge-extension/popup.js");

    await expect(popup.runQuickSmokeAction()).resolves.toEqual({
      state: "ACCEPTED",
      runId: "popup-run",
      queueStatus: "PRE_EXECUTION",
      nextStep: "Open Platform Execution or Monitor for detailed progress."
    });

    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenNthCalledWith(1, {
      channel: "native-host",
      type: "SCHEDULER_REQUEST_CREATE",
      payload: {
        runId: "popup-run",
        projectKey: "checkout-web",
        owner: "edge-popup",
        environment: "staging-edge",
        detail: "review current page | Page: Checkout | URL: https://checkout.example.test/pay",
        status: "PRE_EXECUTION",
        title: "popup-run / staging-edge"
      }
    });
    expect(document.getElementById("quickSmokeState").textContent).toBe("ACCEPTED");
    expect(document.getElementById("quickSmokeRunId").textContent).toBe("popup-run");
    expect(document.getElementById("quickSmokeQueue").textContent).toBe("PRE_EXECUTION");
    expect(document.getElementById("quickSmokeNextStep").textContent).toContain("Open Platform Execution");
  });

  it("shows a pending quick smoke state before the scheduler request resolves", async () => {
    createFormDom();
    let resolveScheduler;
    const schedulerPromise = new Promise((resolve) => {
      resolveScheduler = resolve;
    });
    globalThis.chrome.runtime.sendMessage = vi
      .fn()
      .mockReturnValueOnce(schedulerPromise)
      .mockResolvedValueOnce({
        ok: true,
        data: {
          status: "READY",
          summary: "Bridge online",
          runtime: {
            mode: "Audit-first",
            queueState: "Queued",
            auditState: "Idle",
            nextAction: "Open execution monitor"
          }
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          status: "idle",
          result: null
        }
      });
    const popup = await import("../../../extension/edge-extension/popup.js");

    const runPromise = popup.runQuickSmokeAction();

    expect(document.getElementById("quickSmokeState").textContent).toBe("PENDING");
    expect(document.getElementById("quickSmokeRunId").textContent).toBe("popup-run");
    expect(document.getElementById("quickSmokeQueue").textContent).toBe("Submitting request");
    expect(document.getElementById("quickActionStatus").textContent).toContain("Submitting quick smoke request");

    resolveScheduler({
      ok: true,
      data: {
        status: "ACCEPTED",
        entry: {
          runId: "popup-run",
          status: "PRE_EXECUTION"
        }
      }
    });

    await expect(runPromise).resolves.toEqual({
      state: "ACCEPTED",
      runId: "popup-run",
      queueStatus: "PRE_EXECUTION",
      nextStep: "Open Platform Execution or Monitor for detailed progress."
    });
  });

  it("renders an error state when quick smoke submission fails", async () => {
    createFormDom();
    globalThis.chrome.runtime.sendMessage = vi.fn().mockResolvedValue({
      ok: false,
      error: "scheduler offline"
    });
    const popup = await import("../../../extension/edge-extension/popup.js");

    await expect(popup.runQuickSmokeAction()).rejects.toThrow("scheduler offline");

    expect(document.getElementById("quickSmokeState").textContent).toBe("ERROR");
    expect(document.getElementById("quickSmokeRunId").textContent).toBe("popup-run");
    expect(document.getElementById("quickSmokeQueue").textContent).toBe("Not accepted");
    expect(document.getElementById("quickSmokeNextStep").textContent).toBe("scheduler offline");
  });

  it("triggers pick mode through background and renders the real pick result", async () => {
    createFormDom();
    globalThis.chrome.runtime.sendMessage = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        started: true
      }
    });
    const popup = await import("../../../extension/edge-extension/popup.js");

    await expect(popup.runPickElementAction()).resolves.toMatchObject({
      started: true
    });
    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenCalledWith({
      channel: "content-script",
      type: "CS_PICK_ELEMENT_START",
      payload: {}
    });
    expect(document.getElementById("quickActionStatus").textContent).toContain("Pick mode started");
  });

  it("loads stored pick results when the popup refreshes again", async () => {
    createFormDom();
    globalThis.chrome.runtime.sendMessage = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: {
          status: "READY",
          summary: "Bridge online",
          runtime: {
            mode: "Audit-first",
            queueState: "Synced",
            auditState: "Idle",
            nextAction: "Proceed"
          }
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          status: "picked",
          sourceTabId: 42,
          sourcePageUrl: "https://checkout.example.test/pay",
          sourcePageTitle: "Checkout",
          result: {
            tag: "button",
            text: "Pay now",
            id: "pay-submit",
            name: "payment-submit",
            recommendedLocator: "#pay-submit",
            recommendedReason: "Stable explicit id.",
            locatorCandidates: [
              { type: "id", value: "#pay-submit", score: 0.98, reason: "Stable explicit id.", recommended: true },
              { type: "name", value: "[name=\"payment-submit\"]", score: 0.9, reason: "Stable field name.", recommended: false }
            ]
          }
        }
      });
    const popup = await import("../../../extension/edge-extension/popup.js");

    await popup.refreshCurrentPage();

    expect(document.getElementById("pickedTag").textContent).toBe("button");
    expect(document.getElementById("pickedText").textContent).toBe("Pay now");
    expect(document.getElementById("pickedId").textContent).toBe("pay-submit");
    expect(document.getElementById("pickedName").textContent).toBe("payment-submit");
    expect(document.getElementById("selectedLocator").textContent).toBe("#pay-submit");
    expect(document.getElementById("locatorCandidatesList").textContent).toContain("[name=\"payment-submit\"]");
  });

  it("does not rehydrate a pick result from a different tab or page", async () => {
    createFormDom();
    globalThis.chrome.runtime.sendMessage = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: {
          status: "READY",
          summary: "Bridge online",
          runtime: {
            mode: "Audit-first",
            queueState: "Synced",
            auditState: "Idle",
            nextAction: "Proceed"
          }
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          status: "picked",
          sourceTabId: 99,
          sourcePageUrl: "https://other.example.test/pay",
          sourcePageTitle: "Other page",
          result: {
            tag: "button",
            text: "Should not render",
            id: "other-submit",
            name: "other-submit",
            recommendedLocator: "#other-submit",
            recommendedReason: "Other tab result.",
            locatorCandidates: [
              { type: "id", value: "#other-submit", score: 0.98, reason: "Other tab result.", recommended: true }
            ]
          }
        }
      });
    const popup = await import("../../../extension/edge-extension/popup.js");

    await popup.refreshCurrentPage();

    expect(document.getElementById("pickedTag").textContent).toBe("Not picked yet.");
    expect(document.getElementById("selectedLocator").textContent).toBe("-");
    expect(document.getElementById("locatorCandidatesList").textContent).toContain("No picked element yet.");
  });

  it("renders locator candidates without injecting HTML from page-controlled strings", async () => {
    createFormDom();
    const popup = await import("../../../extension/edge-extension/popup.js");

    popup.renderLocatorCandidates([
      {
        type: "text",
        value: "<img src=x onerror=alert(1)>",
        score: 0.5,
        reason: "<script>alert(1)</script>",
        recommended: true
      }
    ]);

    expect(document.getElementById("locatorCandidatesList").querySelector("img")).toBeNull();
    expect(document.getElementById("locatorCandidatesList").textContent).toContain("<img src=x onerror=alert(1)>");
    expect(document.getElementById("locatorCandidatesList").textContent).toContain("<script>alert(1)</script>");
  });

  it("opens platform execution handoff through background and native host", async () => {
    createFormDom();
    globalThis.chrome.runtime.sendMessage = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: {
          status: "READY",
          screen: "execution",
          url: "http://127.0.0.1:5173/?source=plugin&screen=execution&runId=popup-run"
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          opened: true
        }
      });
    const popup = await import("../../../extension/edge-extension/popup.js");

    await expect(popup.runOpenInPlatformAction()).resolves.toMatchObject({
      screen: "execution"
    });
    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenNthCalledWith(1, {
      channel: "native-host",
      type: "PLATFORM_HANDOFF_PREPARE",
      payload: {
        target: "execution",
        runId: "popup-run",
        projectKey: "checkout-web",
        owner: "edge-popup",
        environment: "staging-edge",
        targetUrl: "https://checkout.example.test/pay",
        detail: "review current page | Page: Checkout | URL: https://checkout.example.test/pay"
      }
    });
    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenNthCalledWith(2, {
      channel: "platform-open",
      url: "http://127.0.0.1:5173/?source=plugin&screen=execution&runId=popup-run"
    });
  });

  it("copies locator locally and opens DSL handoff through native host", async () => {
    createFormDom();
    globalThis.chrome.runtime.sendMessage = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: {
          status: "READY",
          screen: "aiGenerate",
          url: "http://127.0.0.1:5173/?source=plugin&screen=aiGenerate&locator=%23pay-submit"
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          opened: true
        }
      });
    const popup = await import("../../../extension/edge-extension/popup.js");

    popup.renderPickResult({
      tag: "button",
      text: "Pay now",
      id: "pay-submit",
      name: "",
      recommendedLocator: "#pay-submit",
      recommendedReason: "Stable explicit id.",
      locatorCandidates: [
        { type: "id", value: "#pay-submit", score: 0.98, reason: "Stable explicit id.", recommended: true }
      ]
    });

    await expect(popup.copySelectedLocator()).resolves.toBe("#pay-submit");
    expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith("#pay-submit");

    await expect(popup.runUseInDslAction()).resolves.toMatchObject({
      screen: "aiGenerate"
    });
    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenNthCalledWith(1, {
      channel: "native-host",
      type: "PLATFORM_HANDOFF_PREPARE",
      payload: {
        target: "aiGenerate",
        projectKey: "checkout-web",
        projectName: "checkout-web",
        pageTitle: "Checkout",
        pageUrl: "https://checkout.example.test/pay",
        locator: "#pay-submit"
      }
    });
    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenNthCalledWith(2, {
      channel: "platform-open",
      url: "http://127.0.0.1:5173/?source=plugin&screen=aiGenerate&locator=%23pay-submit"
    });
  });
});
