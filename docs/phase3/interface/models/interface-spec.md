# Models Interface Specification

## 1. Scope and Design Basis

- Screen: `models`
- UI implementation:
  - `ui/admin-console/src/screens/ModelConfigScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Current backend/local API implementation:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ConfigPersistenceService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- Main design references reviewed for this document:
  - `docs/phase3/main/platform_and_edge_low_fidelity_wireframes.md`
  - `docs/phase3/main/platform_ui_prototype_and_interaction_design_phase3_5.md`
  - `docs/phase3/main/enterprise_web_test_platform_tech_design.md`
  - `docs/phase3/main/enterprise_web_test_platform_implementation_design.md`

This document distinguishes:

- current snapshot read context
- current generic model-config persistence path
- current local-only provider connection test
- future interfaces required by visible but unwired routing controls

## 2. Interface Summary

Current `models` screen conclusion:

- current direct read source:
  - `GET /api/phase3/admin-console`
- current direct write source:
  - `POST /api/phase3/config/model`
- current local-only action:
  - provider connection test
- current provider/routing objects are serialized into generic config-item records rather than sent as typed provider API payloads

## 3. Current Read Context: GET /api/phase3/admin-console

### 3.1 Purpose for Models Screen

The screen reads `snapshot.modelConfig` from the shared admin-console snapshot.

Relevant snapshot field:

- `modelConfig[]`

### 3.2 Current Parsing Behavior

`App.tsx` derives screen state through:

- `parseModelProviders(snapshot.modelConfig)`
- `parseModelRoutingRules(snapshot.modelConfig)`

Expected config-item encoding:

- `label = provider:{providerId}`
  - `value = JSON.stringify(ModelProvider)`
- `label = route:{routeId}`
  - `value = JSON.stringify(ModelRoutingRule)`

Fallback generic summary rows also exist:

- `Provider`
- `Mode`
- `Approval policy`
- `Output guard`

### 3.3 Current Limitation

This means the screen depends on:

- a generic config-item transport layer
- JSON-in-string payloads embedded inside the `value` field

There is no typed `GET /api/phase3/models` API today.

## 4. Current Write Context: POST /api/phase3/config/model

### 4.1 Current Save Entry Point

Footer `Save model config` calls:

- `handleModelConfigSave()` in `App.tsx`

That function:

1. builds config items with `buildModelConfigItems(modelProviders, modelRoutingRules)`
2. iterates those items
3. posts each one to:
   - `POST /api/phase3/config/model`
4. reloads:
   - `GET /api/phase3/admin-console`

### 4.2 Current Request Shape

Each request body is a single config item:

```json
{
  "label": "provider:openai-responses",
  "value": "{\"id\":\"openai-responses\",\"name\":\"OpenAI\",\"model\":\"gpt-4.1\"}"
}
```

### 4.3 Current Persistence Behavior

`ConfigPersistenceService.upsertModelConfigItem(...)`:

- requires:
  - `label`
  - `value`
- writes into:
  - `config/phase3/model-config.json`
- upserts by label
- returns:
  - `status`
  - `kind`
  - `path`
  - `updated`
  - `totalItems`
  - `entry`

### 4.4 Current File-Backed Shape

Persisted file shape:

```json
{
  "items": [
    {
      "label": "Provider",
      "value": "OpenAI Responses API"
    },
    {
      "label": "provider:openai-responses",
      "value": "{\"id\":\"openai-responses\",\"name\":\"OpenAI\", ... }"
    },
    {
      "label": "route:dsl-generation",
      "value": "{\"id\":\"dsl-generation\",\"task\":\"DSL generation\", ... }"
    }
  ]
}
```

## 5. Current Local-Only Provider Test Interface

### 5.1 Current Behavior

Provider `Test` and modal `Test connection` do not call the backend.

`handleModelConnectionTest(item)`:

- sets pending state
- waits 500ms via `window.setTimeout`
- passes only if:
  - endpoint is non-empty
  - API key is non-empty
  - model id is non-empty

### 5.2 Interface Meaning

This is not a real network reachability check. It is only a client-side completeness check.

## 6. Local Draft vs Persisted State Boundary

### 6.1 Local Draft Actions

These actions only change front-end state until `Save` is clicked:

- `Add provider`
- edit provider
- delete provider

### 6.2 Persisted Actions

Only footer `Save model config` persists the current provider/routing state to local-admin-api.

This boundary must be explicit in review because the UI presents local edits and persisted state closely together.

## 7. UI Control to Interface Mapping

### 7.1 Provider Grid Controls

#### `Add provider`

- user action: click
- request: none
- owner: local modal/draft state
- current state: implemented

#### Provider card

- user action: click
- request: none
- owner: local modal/draft state
- current state: implemented

#### Provider `Test`

- user action: click
- request: none today
- owner: local test state
- intended future interface:
  - provider connection-test mutation
- current state: implemented as local-only check

#### Provider edit icon

- user action: click
- request: none
- owner: local modal/draft state
- current state: implemented

### 7.2 Routing Controls

#### Routing-rule edit icon

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - local routing edit drawer plus model-config save
- current state: visible only

### 7.3 Modal Controls

#### `Test connection`

- user action: click
- request: none today
- owner: local test state
- intended future interface:
  - provider connection-test mutation
- current state: local-only check

#### `Delete`

- user action: click
- request: none
- owner: local provider draft state
- current state: implemented

#### `Add provider` / `Update`

- user action: submit modal
- request: none
- owner: local provider draft state
- current state: implemented

### 7.4 Save Control

#### `Save model config`

- user action: click
- request:
  - repeated `POST /api/phase3/config/model`
- owner:
  - `App.tsx` batch config persistence flow
- current state: implemented

## 8. Recommended Future Model Interfaces

The visible controls suggest a more explicit typed model-management layer, even though current persistence works through config items.

### 8.1 Provider Connection Test Interface

#### `POST /api/phase3/config/model/test-connection`

Purpose:

- verify endpoint reachability and credential validity for one provider draft

Request body:

```json
{
  "id": "openai-responses",
  "name": "OpenAI",
  "model": "gpt-4.1",
  "endpoint": "https://api.openai.com/v1",
  "apiKey": "sk-***",
  "timeoutMs": "60000"
}
```

Response body:

```json
{
  "status": "PASSED",
  "providerId": "openai-responses",
  "latencyMs": 420,
  "message": "Provider connection validated."
}
```

### 8.2 Typed Model Read Interface

#### `GET /api/phase3/models`

Purpose:

- return typed provider and routing-rule payloads without forcing JSON-in-string parsing on the client

Response body:

```json
{
  "providers": [
    {
      "id": "openai-responses",
      "name": "OpenAI",
      "model": "gpt-4.1",
      "status": "active",
      "role": "primary"
    }
  ],
  "routingRules": [
    {
      "id": "dsl-generation",
      "task": "DSL generation",
      "primary": "gpt-4.1",
      "fallback": ["claude-4.5"]
    }
  ]
}
```

### 8.3 Typed Model Save Interface

#### `PUT /api/phase3/models`

Purpose:

- persist the entire provider/routing configuration as one typed document

Request body:

```json
{
  "providers": [
    {
      "id": "openai-responses",
      "name": "OpenAI",
      "model": "gpt-4.1",
      "endpoint": "https://api.openai.com/v1",
      "status": "active",
      "role": "primary"
    }
  ],
  "routingRules": [
    {
      "id": "dsl-generation",
      "task": "DSL generation",
      "primary": "gpt-4.1",
      "fallback": ["claude-4.5"],
      "reason": "strict schema adherence"
    }
  ]
}
```

Response body:

```json
{
  "status": "ACCEPTED",
  "providersSaved": 1,
  "routesSaved": 1
}
```

## 9. Detailed Implementation Design for Currently Unwired Controls

### 9.1 Provider `Test` / `Test connection`

Recommended implementation type:

- backend connection-test mutation

Concrete implementation design:

1. button posts:
   - `POST /api/phase3/config/model/test-connection`
2. request uses current provider draft values
3. success behavior:
   - show real latency and pass status
4. failure behavior:
   - show backend error instead of local field-presence message

### 9.2 Routing-Rule Edit Icon

Recommended implementation type:

- local routing edit drawer plus existing save pipeline

Concrete implementation design:

1. icon opens routing-rule edit drawer
2. drawer edits:
   - task
   - primary
   - fallback list
   - reason
3. drawer submit updates local `modelRoutingRules`
4. footer save persists through existing:
   - `POST /api/phase3/config/model`

Reasoning:

- the current config-item persistence path already supports `route:{id}` entries, so routing editing does not require a brand-new save contract

### 9.3 Provider Delete

Recommended implementation type:

- keep local draft deletion
- clarify persistence happens only on footer save

Concrete implementation design:

- delete removes provider from local provider list
- footer save serializes the new list
- if typed save interface is introduced later, delete should still remain draft-first and save-confirmed

## 10. Error Handling Boundary

Current implementation:

- save returns backend mutation status from `/api/phase3/config/model`
- connection test only returns local synthetic status

Current persistence error cases:

- missing `label` or `value`
  - `400 BAD_REQUEST`
- other write failures
  - save error state in UI

Recommended future test errors:

- endpoint unreachable
- authentication failure
- timeout
- invalid model id

## 11. Relationship to Other Interfaces

### 11.1 Relationship to Dashboard

- `dashboard` summary can surface provider/routing health but should not own provider editing

### 11.2 Relationship to AiGenerate and Execution

- these pages consume the policy effects of model configuration
- they should not own provider persistence

### 11.3 Relationship to Environment Config

- environment settings remain separate under `/api/phase3/config/environment`
- model policy and environment policy should stay distinct even if both use generic config-item persistence

## 12. Review Items

Review-only findings:

- The page already has a real save path and should be documented as a true config screen, not a demo shell.
- Provider connection testing is currently misleading if interpreted as real connectivity verification.
- Routing rules are structurally persistable today, but the page lacks any editing UI for them.
- The config-item contract works but is weaker and less explicit than a typed provider/routing API.

These are documentation findings only. No implementation change is made in this stage.
