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
  `;
}

describe("popup helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    globalThis.chrome = {
      runtime: {
        sendMessage: vi.fn()
      }
    };
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
});
