export const nativeHostName = "com.example.webtest.phase3.nativehost";

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

export async function handleBridgeMessage(message) {
  if (message?.channel !== "native-host") {
    return null;
  }
  try {
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
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.channel !== "native-host") {
      return undefined;
    }
    void handleBridgeMessage(message).then(sendResponse);
    return true;
  });
}
