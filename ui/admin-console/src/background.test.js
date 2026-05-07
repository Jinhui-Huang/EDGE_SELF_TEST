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

  it("enriches quick smoke scheduler requests with content-script DOM context before forwarding to native host", async () => {
    globalThis.chrome.tabs.query = vi.fn().mockResolvedValue([{ id: 42, title: "Checkout", url: "https://checkout.example.test/pay" }]);
    globalThis.chrome.tabs.sendMessage = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        headings: ["Checkout", "Payment details"],
        formHints: ["Card number"],
        actionHints: ["Pay now"],
        bodySummary: "Review your order total before confirming payment."
      }
    });
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
        status: "PRE_EXECUTION",
        pageTitle: "Checkout",
        pageDomain: "checkout.example.test"
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
        payload: expect.objectContaining({
          runId: "popup-run",
          projectKey: "checkout-web",
          status: "PRE_EXECUTION",
          pageTitle: "Checkout",
          pageDomain: "checkout.example.test",
          headings: ["Checkout", "Payment details"],
          formHints: ["Card number"],
          actionHints: ["Pay now"],
          bodySummary: "Review your order total before confirming payment."
        })
      })
    );
  });

  it("falls back to the original quick smoke payload when content-script DOM context is unavailable", async () => {
    globalThis.chrome.tabs.sendMessage = vi.fn().mockRejectedValue(new Error("No receiving end"));
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
    })).resolves.toMatchObject({
      ok: true,
      data: {
        status: "ACCEPTED"
      }
    });

    expect(globalThis.chrome.runtime.sendNativeMessage).toHaveBeenCalledWith(
      "com.example.webtest.phase3.nativehost",
      expect.objectContaining({
        type: "SCHEDULER_REQUEST_CREATE",
        payload: {
          runId: "popup-run",
          projectKey: "checkout-web",
          status: "PRE_EXECUTION"
        }
      })
    );
  });

  it("enriches page summary requests with content-script DOM context before forwarding to native host", async () => {
    globalThis.chrome.tabs.query = vi.fn().mockResolvedValue([{ id: 42, title: "Checkout", url: "https://checkout.example.test/pay" }]);
    globalThis.chrome.tabs.sendMessage = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        headings: ["Checkout", "Payment"],
        formHints: ["Card number", "Expiry date"],
        actionHints: ["Pay now"],
        bodySummary: "Complete payment to place the order."
      }
    });
    globalThis.chrome.runtime.sendNativeMessage = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        status: "READY",
        summary: "Viewing Checkout."
      }
    });
    const background = await import("./../../../extension/edge-extension/background.js");

    await expect(background.handleBridgeMessage({
      channel: "native-host",
      type: "PAGE_SUMMARY_GET",
      payload: {
        pageTitle: "Checkout",
        pageUrl: "https://checkout.example.test/pay",
        pageDomain: "checkout.example.test",
        pagePath: "/pay"
      }
    })).resolves.toEqual({
      ok: true,
      data: {
        status: "READY",
        summary: "Viewing Checkout."
      }
    });

    expect(globalThis.chrome.tabs.sendMessage).toHaveBeenCalledWith(42, {
      channel: "content-script",
      type: "CS_PAGE_SUMMARY_CONTEXT_GET",
      payload: {}
    });
    expect(globalThis.chrome.runtime.sendNativeMessage).toHaveBeenCalledWith(
      "com.example.webtest.phase3.nativehost",
      expect.objectContaining({
        type: "PAGE_SUMMARY_GET",
        payload: expect.objectContaining({
          pageTitle: "Checkout",
          pageDomain: "checkout.example.test",
          headings: ["Checkout", "Payment"],
          formHints: ["Card number", "Expiry date"],
          actionHints: ["Pay now"],
          bodySummary: "Complete payment to place the order."
        })
      })
    );
  });

  it("falls back to the original page summary payload when content-script DOM context is unavailable", async () => {
    globalThis.chrome.tabs.sendMessage = vi.fn().mockRejectedValue(new Error("No receiving end"));
    globalThis.chrome.runtime.sendNativeMessage = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        status: "READY",
        summary: "Viewing Checkout."
      }
    });
    const background = await import("./../../../extension/edge-extension/background.js");

    await expect(background.handleBridgeMessage({
      channel: "native-host",
      type: "PAGE_SUMMARY_GET",
      payload: {
        pageTitle: "Checkout",
        pageUrl: "https://checkout.example.test/pay",
        pageDomain: "checkout.example.test",
        pagePath: "/pay"
      }
    })).resolves.toMatchObject({
      ok: true,
      data: {
        status: "READY"
      }
    });

    expect(globalThis.chrome.runtime.sendNativeMessage).toHaveBeenCalledWith(
      "com.example.webtest.phase3.nativehost",
      expect.objectContaining({
        type: "PAGE_SUMMARY_GET",
        payload: {
          pageTitle: "Checkout",
          pageUrl: "https://checkout.example.test/pay",
          pageDomain: "checkout.example.test",
          pagePath: "/pay"
        }
      })
    );
  });

  it("enriches platform handoff requests with content-script DOM context before forwarding to native host", async () => {
    globalThis.chrome.tabs.query = vi.fn().mockResolvedValue([{ id: 42, title: "Checkout", url: "https://checkout.example.test/pay" }]);
    globalThis.chrome.tabs.sendMessage = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        headings: ["Checkout", "Payment details"],
        formHints: ["Card number"],
        actionHints: ["Pay now"],
        bodySummary: "Review your order total before confirming payment."
      }
    });
    globalThis.chrome.runtime.sendNativeMessage = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        status: "READY",
        screen: "execution",
        url: "http://127.0.0.1:5173/?source=plugin&screen=execution"
      }
    });
    const background = await import("./../../../extension/edge-extension/background.js");

    await expect(background.handleBridgeMessage({
      channel: "native-host",
      type: "PLATFORM_HANDOFF_PREPARE",
      payload: {
        target: "execution",
        runId: "popup-run",
        pageTitle: "Checkout",
        pageUrl: "https://checkout.example.test/pay",
        pageDomain: "checkout.example.test",
        pagePath: "/pay"
      }
    })).resolves.toMatchObject({
      ok: true,
      data: {
        screen: "execution"
      }
    });

    expect(globalThis.chrome.runtime.sendNativeMessage).toHaveBeenCalledWith(
      "com.example.webtest.phase3.nativehost",
      expect.objectContaining({
        type: "PLATFORM_HANDOFF_PREPARE",
        payload: expect.objectContaining({
          target: "execution",
          pageTitle: "Checkout",
          pageDomain: "checkout.example.test",
          headings: ["Checkout", "Payment details"],
          formHints: ["Card number"],
          actionHints: ["Pay now"],
          bodySummary: "Review your order total before confirming payment."
        })
      })
    );
  });
});
