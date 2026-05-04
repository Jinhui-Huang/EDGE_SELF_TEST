export const nativeHostName = "com.example.webtest.phase3.nativehost";
const pickStateStorageKey = "phase3PickState";
let inMemoryPickState = {
  status: "idle",
  result: null,
  sourceTabId: null,
  sourcePageUrl: "",
  sourcePageTitle: "",
  updatedAt: null
};

function buildRequestEnvelope(message) {
  return {
    version: "1.0",
    type: message.type,
    requestId: message.requestId || `popup-${Date.now()}`,
    payload: message.payload || {}
  };
}

export async function sendToNativeHost(message) {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendNativeMessage) {
    throw new Error("Native messaging is unavailable in this extension context.");
  }
  const response = await chrome.runtime.sendNativeMessage(nativeHostName, buildRequestEnvelope(message));
  if (!response?.ok) {
    throw new Error(response?.error?.message || "Native host request failed.");
  }
  return response.data;
}

export async function readPickState() {
  if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
    const stored = await chrome.storage.local.get(pickStateStorageKey);
    if (stored?.[pickStateStorageKey]) {
      inMemoryPickState = stored[pickStateStorageKey];
    }
  }
  return inMemoryPickState;
}

export async function writePickState(nextState) {
  inMemoryPickState = {
    ...inMemoryPickState,
    ...nextState,
    updatedAt: new Date().toISOString()
  };
  if (typeof chrome !== "undefined" && chrome.storage?.local?.set) {
    await chrome.storage.local.set({
      [pickStateStorageKey]: inMemoryPickState
    });
  }
  return inMemoryPickState;
}

export function pickSourceFromTab(tab) {
  return {
    sourceTabId: tab?.id ?? null,
    sourcePageUrl: tab?.url ?? "",
    sourcePageTitle: tab?.title ?? ""
  };
}

export async function getActiveTab() {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) {
    throw new Error("Tab query is unavailable in this extension context.");
  }
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

export async function sendToContentScript(message) {
  if (typeof chrome === "undefined" || !chrome.tabs?.sendMessage) {
    throw new Error("Content-script bridge is unavailable in this extension context.");
  }
  const tab = await getActiveTab();
  if (!tab?.id) {
    throw new Error("Active tab is unavailable.");
  }
  const response = await chrome.tabs.sendMessage(tab.id, message);
  if (!response?.ok) {
    throw new Error(response?.error || "Content script request failed.");
  }
  return response.data;
}

export async function handleBridgeMessage(message, sender = null) {
  try {
    if (message?.channel === "platform-open") {
      if (typeof chrome === "undefined" || !chrome.tabs?.create) {
        throw new Error("Tab opening is unavailable in this extension context.");
      }
      if (!message.url) {
        throw new Error("Platform URL is required.");
      }
      await chrome.tabs.create({ url: message.url });
      return { ok: true, data: { opened: true, url: message.url } };
    }
    if (message?.channel === "content-script") {
      if (message.type === "CS_PICK_ELEMENT_START") {
        const activeTab = await getActiveTab();
        await writePickState({
          status: "picking",
          result: null,
          ...pickSourceFromTab(activeTab)
        });
      }
      if (message.type === "CS_PICK_ELEMENT_STOP") {
        await writePickState({
          status: "idle",
          result: null
        });
      }
      return {
        ok: true,
        data: await sendToContentScript(message)
      };
    }
    if (message?.channel === "pick-state") {
      if (message.type === "PICK_STATE_GET") {
        return {
          ok: true,
          data: await readPickState()
        };
      }
      if (message.type === "PICK_STATE_CLEAR") {
        return {
          ok: true,
          data: await writePickState({ status: "idle", result: null })
        };
      }
      throw new Error("Unsupported pick-state request.");
    }
    if (message?.channel === "pick-result") {
      const sourceTab = sender?.tab || null;
      return {
        ok: true,
        data: await writePickState({
          status: "picked",
          result: message.payload || null,
          ...pickSourceFromTab(sourceTab)
        })
      };
    }
    if (message?.channel !== "native-host") {
      return null;
    }
    return {
      ok: true,
      data: await sendToNativeHost(message)
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.channel !== "native-host"
      && message?.channel !== "platform-open"
      && message?.channel !== "content-script"
      && message?.channel !== "pick-state"
      && message?.channel !== "pick-result") {
      return undefined;
    }
    void handleBridgeMessage(message, sender).then(sendResponse);
    return true;
  });
}
