# Edge 插件端 TypeScript 协议与代码骨架文档
**版本**: v1.0  
**定位**: 面向 Edge 插件前端研发的 TypeScript 协议、目录结构、代码骨架与首批实现文档  
**适用范围**: Microsoft Edge + Manifest V3 + Native Messaging + 本地 Java Host / Core Platform  
**前置文档**:  
- `enterprise_web_test_platform_tech_design.md`  
- `edge_extension_native_messaging_protocol_detailed_design.md`

---

# 目录

1. 文档目标  
2. 技术路线与官方约束  
3. 插件端总体架构  
4. 目录结构建议  
5. TypeScript 协议类型设计  
6. Background / Service Worker 设计  
7. Native Bridge 设计  
8. Content Script 设计  
9. Popup / Side Panel 设计  
10. 扩展内消息总线设计  
11. 页面摘要与定位候选类型设计  
12. 运行状态与事件类型设计  
13. 错误处理设计  
14. 配置与常量设计  
15. 代码骨架示例  
16. manifest.json 建议  
17. 首批开发顺序  
18. 调试与排查建议  
19. 后续扩展方向  

---

# 1. 文档目标

这份文档解决的是：

- Edge 插件端 TypeScript 代码怎么组织
- 应用层协议在 TS 里怎么定义类型
- Background、Content Script、Popup 各自负责什么
- Native Messaging 在插件端怎么封装
- 首批最小可运行版本要先写哪些文件

目标是让你可以直接按这份文档开一个 `edge-extension/` 工程。

---

# 2. 技术路线与官方约束

Microsoft Edge 官方文档说明：

- 扩展要使用 Native Messaging，需在 `manifest.json` 中声明 `nativeMessaging` 权限。 citeturn851389view0
- Native Host 通过 `runtime.connectNative` 或 `runtime.sendNativeMessage` 与扩展通信。通过 `connectNative` 建立的 port 会让 Host 进程保持运行，直到 port 被销毁；而 `sendNativeMessage` 会为每条消息单独启动一个 host 进程。 citeturn851389view0
- Native Messaging Host 与 Edge 通过 `stdin/stdout` 通信，消息为 UTF-8 JSON，前面有 32 位长度头。 citeturn851389view0
- Edge 扩展推荐基于 Manifest V3 架构来设计。 citeturn851389view1turn851389view0

基于这些约束，本平台插件端建议：

- **Manifest V3**
- **Background / Service Worker 作为唯一 Native Port 管理点**
- **Content Script 只负责页面感知**
- **Popup / Side Panel 只负责 UI**
- **所有 Native 请求统一经过 Background**

---

# 3. 插件端总体架构

```text
edge-extension/
 ├─ background/
 │   ├─ nativeBridge.ts
 │   ├─ requestRouter.ts
 │   ├─ eventBus.ts
 │   ├─ hostState.ts
 │   └─ index.ts
 ├─ content/
 │   ├─ pageSummary.ts
 │   ├─ visibleText.ts
 │   ├─ locatorCandidates.ts
 │   ├─ highlighter.ts
 │   └─ index.ts
 ├─ popup/
 │   ├─ popup.tsx
 │   ├─ popupApi.ts
 │   └─ popupState.ts
 ├─ sidepanel/
 │   └─ ...
 ├─ shared/
 │   ├─ protocol.ts
 │   ├─ messageTypes.ts
 │   ├─ nativeTypes.ts
 │   ├─ pageTypes.ts
 │   ├─ runTypes.ts
 │   ├─ errorCodes.ts
 │   ├─ constants.ts
 │   └─ ids.ts
 ├─ manifest.json
 └─ package.json
```

---

# 4. 目录结构建议

## 4.1 `shared/`
放纯类型与协议定义，禁止依赖浏览器环境。  
可同时被：
- background
- content
- popup  
复用。

## 4.2 `background/`
放：
- Native Bridge
- 请求/响应关联
- 扩展内消息路由
- Host 状态管理
- 事件转发

## 4.3 `content/`
放：
- 页面摘要提取
- 可见文本提取
- 元素高亮
- 定位候选生成

## 4.4 `popup/`
放：
- UI 组件
- popup 对 background 的调用封装

---

# 5. TypeScript 协议类型设计

## 5.1 顶层协议类型

```ts
export type ProtocolVersion = "1.0";
export type MessageKind = "request" | "response" | "event";

export interface MessageSource {
  side: "extension" | "host" | "core";
  module: string;
  extensionId?: string;
  tabId?: number;
  frameId?: number;
}

export interface NativeError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

export interface EnvelopeBase {
  version: ProtocolVersion;
  type: string;
  requestId: string;
  traceId?: string;
  timestamp: number;
  source: MessageSource;
}

export interface RequestEnvelope<T = unknown> extends EnvelopeBase {
  kind: "request";
  payload: T;
}

export interface ResponseEnvelope<T = unknown> extends EnvelopeBase {
  kind: "response";
  success: boolean;
  payload?: T;
  error?: NativeError;
}

export interface EventEnvelope<T = unknown> extends EnvelopeBase {
  kind: "event";
  payload: T;
}

export type NativeEnvelope<T = unknown> =
  | RequestEnvelope<T>
  | ResponseEnvelope<T>
  | EventEnvelope<T>;
```

---

## 5.2 消息类型常量

```ts
export const MessageTypes = {
  PING: "PING",
  GET_HOST_INFO: "GET_HOST_INFO",

  PAGE_SUMMARY_GET: "PAGE_SUMMARY_GET",
  PAGE_VISIBLE_TEXT_GET: "PAGE_VISIBLE_TEXT_GET",
  PAGE_LOCATOR_CANDIDATES_GET: "PAGE_LOCATOR_CANDIDATES_GET",
  PAGE_HIGHLIGHT: "PAGE_HIGHLIGHT",

  EXECUTION_START: "EXECUTION_START",
  EXECUTION_STOP: "EXECUTION_STOP",
  EXECUTION_STATUS_GET: "EXECUTION_STATUS_GET",

  RUN_STATUS_EVENT: "RUN_STATUS_EVENT",
  RUN_FINISHED_EVENT: "RUN_FINISHED_EVENT",

  REPORT_PATH_GET: "REPORT_PATH_GET",
  RUN_ARTIFACTS_GET: "RUN_ARTIFACTS_GET",

  ENVIRONMENTS_GET: "ENVIRONMENTS_GET",
  DATASOURCES_GET: "DATASOURCES_GET",

  AGENT_CASE_GENERATE: "AGENT_CASE_GENERATE",
  AGENT_FAILURE_ANALYZE: "AGENT_FAILURE_ANALYZE",
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];
```

---

## 5.3 请求与响应 payload 类型

```ts
export interface PingRequest {}
export interface PingResponse {
  hostVersion: string;
  protocolVersion: string;
  platformReady: boolean;
}

export interface GetHostInfoResponse {
  hostVersion: string;
  coreVersion: string;
  os: string;
  javaVersion: string;
  extensionOriginVerified: boolean;
}
```

---

# 6. Background / Service Worker 设计

## 6.1 职责

Background 是插件端真正的“控制中心”。

负责：
- 建立和维护 Native Port
- 统一收发 Native 消息
- 维护 pending request
- 向 Popup / Content Script 转发事件
- 启动心跳与重连
- 处理 tab 级上下文

## 6.2 为什么统一由 Background 管理

因为在 Manifest V3 下：
- Service Worker 负责后台逻辑
- Popup 生命周期短
- Content Script 只存在于特定页面上下文
- Native Port 不能四处分散管理

## 6.3 推荐状态结构

```ts
export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  timeoutId: number;
  type: string;
  createdAt: number;
}

export interface HostState {
  connected: boolean;
  connecting: boolean;
  lastHeartbeatAt?: number;
  lastError?: string;
}
```

---

# 7. Native Bridge 设计

## 7.1 目标

对上层隐藏：
- `chrome.runtime.connectNative`
- `port.onMessage`
- `port.onDisconnect`
- requestId 对应逻辑
- timeout
- reconnect

对外暴露一个简单 API：

```ts
sendRequest<TReq, TRes>(type: string, payload: TReq): Promise<TRes>
subscribe(eventType: string, handler: (payload: unknown) => void): () => void
connect(): Promise<void>
disconnect(): void
```

## 7.2 `connectNative` 还是 `sendNativeMessage`

官方文档说明：
- `connectNative` 建立长连接，host 进程会保持运行，直到 port 被销毁。 citeturn851389view0
- `sendNativeMessage` 每条消息都会启动新进程，只把第一条返回当响应。 citeturn851389view0

本平台建议：
**统一使用 `connectNative`**。  
因为你需要：
- 持续事件推送
- 运行状态更新
- Host 持续存活
- 避免反复起进程

---

## 7.3 NativeBridge 骨架

```ts
import { MessageTypes } from "../shared/messageTypes";
import {
  EventEnvelope,
  NativeEnvelope,
  RequestEnvelope,
  ResponseEnvelope,
} from "../shared/protocol";
import { createRequestId, createTraceId } from "../shared/ids";

const HOST_NAME = "com.your_company.web_test_host";
const REQUEST_TIMEOUT_MS = 15000;

export class NativeBridge {
  private port: chrome.runtime.Port | null = null;
  private pending = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
    timeoutId: number;
    type: string;
  }>();
  private eventHandlers = new Map<string, Set<(payload: unknown) => void>>();
  private connected = false;

  async connect(): Promise<void> {
    if (this.port) return;

    this.port = chrome.runtime.connectNative(HOST_NAME);
    this.connected = true;

    this.port.onMessage.addListener((message: NativeEnvelope) => {
      this.handleNativeMessage(message);
    });

    this.port.onDisconnect.addListener(() => {
      this.connected = false;
      this.port = null;
      for (const [, pending] of this.pending) {
        clearTimeout(pending.timeoutId);
        pending.reject(new Error("Native port disconnected"));
      }
      this.pending.clear();
    });
  }

  disconnect(): void {
    this.port?.disconnect();
    this.port = null;
    this.connected = false;
  }

  async sendRequest<TReq, TRes>(type: string, payload: TReq): Promise<TRes> {
    await this.connect();

    const requestId = createRequestId();
    const traceId = createTraceId();

    const envelope: RequestEnvelope<TReq> = {
      version: "1.0",
      kind: "request",
      type,
      requestId,
      traceId,
      timestamp: Date.now(),
      source: {
        side: "extension",
        module: "background",
        extensionId: chrome.runtime.id,
      },
      payload,
    };

    return new Promise<TRes>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Native request timeout: ${type}`));
      }, REQUEST_TIMEOUT_MS) as unknown as number;

      this.pending.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeoutId,
        type,
      });

      this.port!.postMessage(envelope);
    });
  }

  subscribe(eventType: string, handler: (payload: unknown) => void): () => void {
    const handlers = this.eventHandlers.get(eventType) ?? new Set();
    handlers.add(handler);
    this.eventHandlers.set(eventType, handlers);

    return () => {
      const set = this.eventHandlers.get(eventType);
      set?.delete(handler);
    };
  }

  private handleNativeMessage(message: NativeEnvelope): void {
    if (message.kind === "response") {
      this.handleResponse(message);
      return;
    }
    if (message.kind === "event") {
      this.handleEvent(message);
    }
  }

  private handleResponse(message: ResponseEnvelope): void {
    const pending = this.pending.get(message.requestId);
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    this.pending.delete(message.requestId);

    if (message.success) {
      pending.resolve(message.payload);
    } else {
      pending.reject(message.error ?? new Error("Unknown native error"));
    }
  }

  private handleEvent(message: EventEnvelope): void {
    const handlers = this.eventHandlers.get(message.type);
    if (!handlers) return;

    for (const handler of handlers) {
      handler(message.payload);
    }
  }
}
```

---

# 8. Content Script 设计

## 8.1 职责

Content Script 不直接连 Native Host。  
它只做页面内逻辑：

- 获取页面可见文本
- 获取表单结构
- 生成定位候选
- 高亮元素
- 返回当前页面摘要

## 8.2 建议的接口消息

由 Background 通过 `chrome.tabs.sendMessage` 发给 Content Script：

- `CS_PAGE_SUMMARY_GET`
- `CS_VISIBLE_TEXT_GET`
- `CS_LOCATOR_CANDIDATES_GET`
- `CS_HIGHLIGHT`

---

## 8.3 页面摘要类型

```ts
export interface PageFieldSummary {
  label?: string;
  name?: string;
  id?: string;
  type?: string;
  placeholder?: string;
}

export interface PageButtonSummary {
  text?: string;
  role?: string;
  id?: string;
}

export interface PageSummary {
  url: string;
  title: string;
  visibleText?: string;
  forms: Array<{
    name?: string;
    fields: PageFieldSummary[];
  }>;
  buttons: PageButtonSummary[];
}
```

---

## 8.4 可见文本提取骨架

```ts
export function collectVisibleText(root: ParentNode = document): string {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.textContent?.trim();
      if (!text) return NodeFilter.FILTER_REJECT;

      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;

      const style = window.getComputedStyle(parent);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0"
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const chunks: string[] = [];
  let current: Node | null = walker.nextNode();
  while (current) {
    const text = current.textContent?.trim();
    if (text) chunks.push(text);
    current = walker.nextNode();
  }

  return chunks.join(" ");
}
```

---

## 8.5 页面摘要采集骨架

```ts
import { PageSummary } from "../shared/pageTypes";
import { collectVisibleText } from "./visibleText";

export function collectPageSummary(): PageSummary {
  const forms = Array.from(document.forms).map((form) => ({
    name: form.getAttribute("name") ?? undefined,
    fields: Array.from(form.elements)
      .filter((el): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
        el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement
      )
      .map((field) => ({
        label: findAssociatedLabel(field),
        name: field.getAttribute("name") ?? undefined,
        id: field.id || undefined,
        type: "type" in field ? field.type : undefined,
        placeholder: field.getAttribute("placeholder") ?? undefined,
      })),
  }));

  const buttons = Array.from(document.querySelectorAll("button,input[type=button],input[type=submit]"))
    .map((btn) => ({
      text: (btn as HTMLButtonElement).innerText || (btn as HTMLInputElement).value || undefined,
      role: btn.getAttribute("role") ?? "button",
      id: (btn as HTMLElement).id || undefined,
    }));

  return {
    url: location.href,
    title: document.title,
    visibleText: collectVisibleText(),
    forms,
    buttons,
  };
}

function findAssociatedLabel(
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
): string | undefined {
  if (field.id) {
    const label = document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
    if (label?.textContent?.trim()) return label.textContent.trim();
  }
  const wrapped = field.closest("label");
  return wrapped?.textContent?.trim() || undefined;
}
```

---

## 8.6 高亮骨架

```ts
let currentOverlay: HTMLDivElement | null = null;

export function highlightElement(el: Element): void {
  removeHighlight();

  const rect = el.getBoundingClientRect();
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.border = "2px solid #ff4d4f";
  overlay.style.background = "rgba(255,77,79,0.12)";
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "2147483647";

  document.body.appendChild(overlay);
  currentOverlay = overlay;
}

export function removeHighlight(): void {
  currentOverlay?.remove();
  currentOverlay = null;
}
```

---

# 9. Popup / Side Panel 设计

## 9.1 职责

Popup 不处理底层协议，只调用 Background 暴露的 API。

可做的操作：
- 检查 Host 是否在线
- 获取当前页面摘要
- 获取定位候选
- 启动执行
- 订阅运行状态

## 9.2 Popup API 封装

```ts
export async function pingHost() {
  return chrome.runtime.sendMessage({ type: "EXT_HOST_PING" });
}

export async function getPageSummary() {
  return chrome.runtime.sendMessage({ type: "EXT_PAGE_SUMMARY_GET" });
}

export async function startExecution(caseId: string, env: string) {
  return chrome.runtime.sendMessage({
    type: "EXT_EXECUTION_START",
    payload: { caseId, env },
  });
}
```

## 9.3 运行状态监听
建议 Background 把 Native event 再广播成扩展内事件，Popup 只监听扩展内消息。

---

# 10. 扩展内消息总线设计

## 10.1 原则
扩展内部也做一层轻协议，隔离 UI 与 NativeBridge。

## 10.2 建议类型

```ts
export const ExtensionMessageTypes = {
  EXT_HOST_PING: "EXT_HOST_PING",
  EXT_PAGE_SUMMARY_GET: "EXT_PAGE_SUMMARY_GET",
  EXT_PAGE_HIGHLIGHT: "EXT_PAGE_HIGHLIGHT",
  EXT_EXECUTION_START: "EXT_EXECUTION_START",
  EXT_EXECUTION_STATUS_EVENT: "EXT_EXECUTION_STATUS_EVENT",
  EXT_RUN_FINISHED_EVENT: "EXT_RUN_FINISHED_EVENT",
} as const;
```

## 10.3 Background 路由骨架

```ts
import { NativeBridge } from "./nativeBridge";
import { MessageTypes } from "../shared/messageTypes";
import { collectPageSummaryFromTab } from "./requestRouter";

const bridge = new NativeBridge();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "EXT_HOST_PING": {
        const data = await bridge.sendRequest(MessageTypes.PING, {});
        sendResponse({ success: true, data });
        return;
      }
      case "EXT_PAGE_SUMMARY_GET": {
        const data = await collectPageSummaryFromTab(sender.tab?.id);
        sendResponse({ success: true, data });
        return;
      }
      case "EXT_EXECUTION_START": {
        const data = await bridge.sendRequest(MessageTypes.EXECUTION_START, message.payload);
        sendResponse({ success: true, data });
        return;
      }
      default:
        sendResponse({ success: false, error: "Unsupported extension message" });
    }
  })().catch((err) => {
    sendResponse({ success: false, error: String(err?.message ?? err) });
  });

  return true;
});
```

---

# 11. 页面摘要与定位候选类型设计

## 11.1 定位候选类型

```ts
export interface LocatorCandidate {
  by: "id" | "name" | "label" | "text" | "css" | "xpath" | "placeholder" | "role";
  value: string;
  score: number;
}

export interface LocatorCandidatesResponse {
  candidates: LocatorCandidate[];
}
```

## 11.2 元素选择时的本地参考结构

```ts
export interface LocalElementRef {
  cssPath?: string;
  id?: string;
  name?: string;
  text?: string;
}
```

---

# 12. 运行状态与事件类型设计

## 12.1 运行状态类型

```ts
export type RunStatus = "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "STOPPED";

export interface RunStatusEventPayload {
  runId: string;
  status: RunStatus;
  currentStep?: string;
  message?: string;
  progress?: number;
}

export interface RunFinishedEventPayload {
  runId: string;
  status: Exclude<RunStatus, "QUEUED" | "RUNNING">;
  reportPath?: string;
}
```

## 12.2 Background 中的事件转发

```ts
bridge.subscribe(MessageTypes.RUN_STATUS_EVENT, (payload) => {
  chrome.runtime.sendMessage({
    type: "EXT_EXECUTION_STATUS_EVENT",
    payload,
  });
});

bridge.subscribe(MessageTypes.RUN_FINISHED_EVENT, (payload) => {
  chrome.runtime.sendMessage({
    type: "EXT_RUN_FINISHED_EVENT",
    payload,
  });
});
```

---

# 13. 错误处理设计

## 13.1 错误码常量

```ts
export const ExtensionErrorCodes = {
  NATIVE_PORT_DISCONNECTED: "NATIVE_PORT_DISCONNECTED",
  NATIVE_REQUEST_TIMEOUT: "NATIVE_REQUEST_TIMEOUT",
  TAB_NOT_FOUND: "TAB_NOT_FOUND",
  CONTENT_SCRIPT_NOT_READY: "CONTENT_SCRIPT_NOT_READY",
  PAGE_CONTEXT_UNAVAILABLE: "PAGE_CONTEXT_UNAVAILABLE",
  UNSUPPORTED_EXTENSION_MESSAGE: "UNSUPPORTED_EXTENSION_MESSAGE",
} as const;
```

## 13.2 错误对象建议

```ts
export interface ExtensionErrorShape {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}
```

## 13.3 处理原则
- UI 层不直接显示原始异常栈
- Background 负责将 Host 错误映射为稳定前端错误对象
- Content Script 错误不能直接冒泡到 UI，需包装后返回

---

# 14. 配置与常量设计

## 14.1 constants.ts

```ts
export const HOST_NAME = "com.your_company.web_test_host";
export const REQUEST_TIMEOUT_MS = 15000;
export const PAGE_SUMMARY_TIMEOUT_MS = 5000;
```

## 14.2 ids.ts

```ts
export function createRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
```

---

# 15. 代码骨架示例

## 15.1 `shared/protocol.ts`

```ts
export type ProtocolVersion = "1.0";
export type MessageKind = "request" | "response" | "event";

export interface MessageSource {
  side: "extension" | "host" | "core";
  module: string;
  extensionId?: string;
  tabId?: number;
  frameId?: number;
}

export interface NativeError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

export interface EnvelopeBase {
  version: ProtocolVersion;
  type: string;
  requestId: string;
  traceId?: string;
  timestamp: number;
  source: MessageSource;
}

export interface RequestEnvelope<T = unknown> extends EnvelopeBase {
  kind: "request";
  payload: T;
}

export interface ResponseEnvelope<T = unknown> extends EnvelopeBase {
  kind: "response";
  success: boolean;
  payload?: T;
  error?: NativeError;
}

export interface EventEnvelope<T = unknown> extends EnvelopeBase {
  kind: "event";
  payload: T;
}
```

---

## 15.2 `background/requestRouter.ts`

```ts
export async function collectPageSummaryFromTab(tabId?: number) {
  if (!tabId) {
    throw new Error("TAB_NOT_FOUND");
  }

  const response = await chrome.tabs.sendMessage(tabId, {
    type: "CS_PAGE_SUMMARY_GET",
  });

  return response;
}
```

---

## 15.3 `content/index.ts`

```ts
import { collectPageSummary } from "./pageSummary";
import { highlightElement, removeHighlight } from "./highlighter";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  try {
    switch (message.type) {
      case "CS_PAGE_SUMMARY_GET":
        sendResponse({ success: true, data: collectPageSummary() });
        return;

      case "CS_HIGHLIGHT":
        // 这里只是示例，实际应先定位元素
        if (message.payload?.selector) {
          const el = document.querySelector(message.payload.selector);
          if (el) highlightElement(el);
        }
        sendResponse({ success: true });
        return;

      case "CS_HIGHLIGHT_CLEAR":
        removeHighlight();
        sendResponse({ success: true });
        return;

      default:
        sendResponse({ success: false, error: "Unsupported content message" });
    }
  } catch (e) {
    sendResponse({ success: false, error: String((e as Error).message) });
  }
});
```

---

# 16. manifest.json 建议

官方要求 Native Messaging 扩展声明 `nativeMessaging` 权限。 citeturn851389view0

建议最小 manifest：

```json
{
  "manifest_version": 3,
  "name": "Enterprise Web Test Platform",
  "version": "1.0.0",
  "description": "Edge extension for enterprise web test platform",
  "permissions": [
    "nativeMessaging",
    "tabs",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "dist/background/index.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["dist/content/index.js"],
      "run_at": "document_idle"
    }
  ]
}
```

---

# 17. 首批开发顺序

## 第 1 步
先写 `shared/`：
- `protocol.ts`
- `messageTypes.ts`
- `errorCodes.ts`
- `ids.ts`

## 第 2 步
写 `background/nativeBridge.ts`：
- `connect()`
- `sendRequest()`
- `subscribe()`

## 第 3 步
写 `content/visibleText.ts` 和 `content/pageSummary.ts`

## 第 4 步
写 `background/requestRouter.ts`
- 调 content script
- 调 native host

## 第 5 步
写 `popup/popupApi.ts`
- ping host
- get page summary
- start execution

## 第 6 步
接运行状态事件
- `RUN_STATUS_EVENT`
- `RUN_FINISHED_EVENT`

---

# 18. 调试与排查建议

## 18.1 优先看这些地方
- `edge://extensions`
- service worker console
- popup console
- content script console
- native host stderr / file log

## 18.2 常见问题
### 问题：`connectNative` 失败
重点检查：
- host manifest 是否注册
- host name 是否一致
- `allowed_origins` 是否包含当前扩展 ID

### 问题：content script 没响应
重点检查：
- 当前页面是否已注入
- `matches` 是否覆盖
- `tabs.sendMessage` 是否传了正确 tabId

### 问题：事件收不到
重点检查：
- 是否使用 `connectNative`
- port 是否断开
- service worker 是否被重建

---

# 19. 后续扩展方向

下一阶段可以继续补：

1. **Edge 插件端完整源码模板文档**
2. **Popup / Side Panel React UI 文档**
3. **Content Script 元素拾取与定位候选生成详细文档**
4. **Background 与 Java Host 联调清单**
5. **Native Messaging Host 端 Java 代码骨架对接文档**

---

**文档结束**
