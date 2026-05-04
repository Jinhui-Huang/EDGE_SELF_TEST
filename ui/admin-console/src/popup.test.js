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
    <button id="pageSummaryButton" type="button">Page summary</button>
    <button id="openPlatformButton" type="button">Open in platform</button>
    <button id="copyLocatorButton" type="button">Copy locator</button>
    <button id="useDslButton" type="button">Use in DSL</button>
    <p id="quickActionStatus" class="actionStatus hidden"></p>
    <dd id="pageSummaryResult">Not requested yet.</dd>
    <dd id="pageSummaryRecommendation">Not requested yet.</dd>
  `;
}

describe("popup helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    globalThis.chrome = {
      runtime: {
        sendMessage: vi.fn()
      },
      tabs: {
        query: vi.fn().mockResolvedValue([
          { title: "Checkout", url: "https://checkout.example.test/pay" }
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
        locator: "button:has-text('Pay')"
      }
    });
    expect(document.getElementById("pageSummaryResult").textContent).toContain("Checkout page is active.");
    expect(document.getElementById("pageSummaryRecommendation").textContent).toContain("Open the platform.");
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
          url: "http://127.0.0.1:5173/?source=plugin&screen=aiGenerate&locator=button%3Ahas-text%28%27Pay%27%29"
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          opened: true
        }
      });
    const popup = await import("../../../extension/edge-extension/popup.js");

    await expect(popup.copySelectedLocator()).resolves.toBe("button:has-text('Pay')");
    expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith("button:has-text('Pay')");

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
        locator: "button:has-text('Pay')"
      }
    });
    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenNthCalledWith(2, {
      channel: "platform-open",
      url: "http://127.0.0.1:5173/?source=plugin&screen=aiGenerate&locator=button%3Ahas-text%28%27Pay%27%29"
    });
  });
});
