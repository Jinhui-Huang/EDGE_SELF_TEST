import { beforeEach, describe, expect, it, vi } from "vitest";

describe("content script pick mode", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    document.body.innerHTML = `
      <main>
        <button id="pay-submit" name="payment-submit">Pay now</button>
      </main>
    `;
    globalThis.chrome = {
      runtime: {
        onMessage: {
          addListener: vi.fn()
        }
      }
    };
  });

  it("shapes pick results from the selected element", async () => {
    const content = await import("./../../../extension/edge-extension/content-script.js");
    const button = document.getElementById("pay-submit");

    expect(content.buildPickResult(button)).toMatchObject({
      tag: "button",
      text: "Pay now",
      id: "pay-submit",
      name: "payment-submit",
      recommendedLocator: "#pay-submit"
    });
  });

  it("uses a normal ellipsis fallback when long text is truncated", async () => {
    document.body.innerHTML = `
      <main>
        <button id="long-copy">${"Pay now ".repeat(20)}</button>
      </main>
    `;
    const content = await import("./../../../extension/edge-extension/content-script.js");
    const button = document.getElementById("long-copy");
    const result = content.buildPickResult(button);
    const textCandidate = result.locatorCandidates.find((candidate) => candidate.type === "text");

    expect(result.text.endsWith("...")).toBe(true);
    expect(result.text.includes("窶")).toBe(false);
    expect(textCandidate.value.includes("...")).toBe(true);
    expect(textCandidate.value.includes("窶")).toBe(false);
  });

  it("cleans highlight after a pick completes", async () => {
    const content = await import("./../../../extension/edge-extension/content-script.js");
    const button = document.getElementById("pay-submit");

    const pickStart = content.startPickMode();
    button.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, cancelable: true }));
    expect(document.getElementById("__phase3_pick_highlight__")).not.toBeNull();

    expect(pickStart).toMatchObject({ started: true });
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(globalThis.chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(document.getElementById("__phase3_pick_highlight__")).toBeNull();
    });
  });

  it("sends the picked result back to background asynchronously", async () => {
    globalThis.chrome.runtime.sendMessage = vi.fn().mockResolvedValue({ ok: true });
    const content = await import("./../../../extension/edge-extension/content-script.js");
    const button = document.getElementById("pay-submit");

    content.startPickMode();
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(globalThis.chrome.runtime.sendMessage).toHaveBeenCalledWith({
        channel: "pick-result",
        type: "CS_PICK_ELEMENT_RESULT",
        payload: expect.objectContaining({
          tag: "button",
          recommendedLocator: "#pay-submit"
        })
      });
    });
    expect(document.getElementById("__phase3_pick_highlight__")).toBeNull();
  });
});
