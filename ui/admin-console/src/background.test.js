import { beforeEach, describe, expect, it, vi } from "vitest";

describe("background bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    const storage = {};
    globalThis.chrome = {
      runtime: {
        sendNativeMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn()
        }
      },
      storage: {
        local: {
          get: vi.fn().mockImplementation(async (key) => ({ [key]: storage[key] })),
          set: vi.fn().mockImplementation(async (value) => {
            Object.assign(storage, value);
          })
        }
      },
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42, title: "Checkout" }]),
        sendMessage: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            recommendedLocator: "#pay-submit"
          }
        }),
        create: vi.fn().mockResolvedValue(undefined)
      }
    };
  });

  it("forwards popup pick requests to the active tab content script", async () => {
    const background = await import("./../../../extension/edge-extension/background.js");

    await expect(background.handleBridgeMessage({
      channel: "content-script",
      type: "CS_PICK_ELEMENT_START",
      payload: {}
    })).resolves.toEqual({
      ok: true,
      data: {
        recommendedLocator: "#pay-submit"
      }
    });

    expect(globalThis.chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(globalThis.chrome.tabs.sendMessage).toHaveBeenCalledWith(42, {
      channel: "content-script",
      type: "CS_PICK_ELEMENT_START",
      payload: {}
    });
  });

  it("stores async pick results and returns them to the popup later", async () => {
    const background = await import("./../../../extension/edge-extension/background.js");

    await background.handleBridgeMessage({
      channel: "pick-result",
      type: "CS_PICK_ELEMENT_RESULT",
      payload: {
        tag: "button",
        recommendedLocator: "#pay-submit"
      }
    }, {
      tab: {
        id: 42,
        title: "Checkout",
        url: "https://checkout.example.test/pay"
      }
    });

    await expect(background.handleBridgeMessage({
      channel: "pick-state",
      type: "PICK_STATE_GET"
    })).resolves.toMatchObject({
      ok: true,
      data: {
        status: "picked",
        result: {
          tag: "button",
          recommendedLocator: "#pay-submit"
        },
        sourceTabId: 42,
        sourcePageUrl: "https://checkout.example.test/pay"
      }
    });
  });

  it("forwards native-host quick smoke requests without changing the scheduler payload", async () => {
    globalThis.chrome.runtime.sendNativeMessage = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        status: "ACCEPTED",
        entry: {
          runId: "popup-run"
        }
      }
    });
    const background = await import("./../../../extension/edge-extension/background.js");

    await expect(background.handleBridgeMessage({
      channel: "native-host",
      type: "SCHEDULER_REQUEST_CREATE",
      payload: {
        runId: "popup-run",
        projectKey: "checkout-web",
        status: "PRE_EXECUTION"
      }
    })).resolves.toEqual({
      ok: true,
      data: {
        status: "ACCEPTED",
        entry: {
          runId: "popup-run"
        }
      }
    });

    expect(globalThis.chrome.runtime.sendNativeMessage).toHaveBeenCalledWith(
      "com.example.webtest.phase3.nativehost",
      expect.objectContaining({
        version: "1.0",
        type: "SCHEDULER_REQUEST_CREATE",
        payload: {
          runId: "popup-run",
          projectKey: "checkout-web",
          status: "PRE_EXECUTION"
        }
      })
    );
  });
});
