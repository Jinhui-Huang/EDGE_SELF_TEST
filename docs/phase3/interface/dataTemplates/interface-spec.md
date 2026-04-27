# DataTemplates Interface Specification

## 1. Scope and Design Basis

- Screen: `dataTemplates`
- UI implementation:
  - `ui/admin-console/src/screens/DataTemplatesScreen.tsx`
  - `ui/admin-console/src/screens/ExecutionScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Current backend/local API implementation:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- Main design references reviewed for this document:
  - `docs/phase3/main/platform_and_edge_low_fidelity_wireframes.md`
  - `docs/phase3/main/platform_ui_prototype_and_interaction_design_phase3_5.md`
  - `docs/phase3/main/react_page_skeleton_prompt_guide.md`
- Supplemental design references used because Phase 3 main docs only point to them:
  - `docs/phase4/db_test_data_template_snapshot_restore_diff_design.md`
  - `docs/phase5/db_test_data_template_snapshot_restore_diff_design.md`

This document distinguishes:

- current local template-catalog source
- current shared consumption by `dataTemplates` and `execution`
- current absence of template-registry backend interfaces
- future interfaces required by visible controls on the page

## 2. Interface Summary

Current `dataTemplates` screen conclusion:

- current direct read source:
  - `GET /api/phase3/data-templates` (authoritative template registry)
  - `GET /api/phase3/data-templates/{templateId}` (implemented backend capability; not called by current UI edit flow)
- current indirect read context:
  - `GET /api/phase3/admin-console` for project-name lookup through `snapshot.projects`
- current direct write sources:
  - `POST /api/phase3/data-templates` (create)
  - `PUT /api/phase3/data-templates/{templateId}` (update)
  - `DELETE /api/phase3/data-templates/{templateId}` (delete)
  - `POST /api/phase3/data-templates/import/preview` (import preview)
  - `POST /api/phase3/data-templates/import/commit` (import commit)
  - `POST /api/phase3/data-templates/{templateId}/dry-run` (dry-run validation)
- current template catalog source:
  - backend file-backed registry at `config/phase3/data-templates.json`
  - local `defaultDataTemplates` as fallback when API is unavailable
- current shared consumer screens:
  - `dataTemplates` (full CRUD)
  - `execution` (read-only for compare-template selection)

## 3. Current Backend Template Registry

### 3.1 Current Source

The page fetches from `GET /api/phase3/data-templates` on mount. It receives `apiBaseUrl` and a fallback `dataTemplates` prop from `App.tsx`. The fallback list is used only when the backend API is unreachable.

The backend registry is persisted to `config/phase3/data-templates.json` by `DataTemplatePersistenceService`.

### 3.2 Current Template Shape

Current template objects follow `DataTemplateItem`:

```json
{
  "id": "order-seed-v2",
  "name": "order.seed.v2",
  "type": "composite",
  "envAllowed": "dev, staging",
  "risk": "medium",
  "uses": 128,
  "rollback": "sql",
  "projectKey": "checkout-web",
  "steps": [
    "INSERT orders",
    "INSERT order_items",
    "UPDATE products.stock"
  ],
  "guards": [
    "prod environment blocked",
    "snapshot taken before run",
    "row count limit: 50"
  ],
  "params": [
    {
      "key": "user_id",
      "type": "uuid",
      "required": true
    }
  ],
  "compareSummary": "Compare order, order_items, and stock deltas before and after execution."
}
```

### 3.3 Interface Meaning

This shape is now persisted and served by the backend file-backed template registry. The local constant is only a fallback.

## 4. Current Indirect Snapshot Context

### 4.1 Current Snapshot Use

The page uses:

- `snapshot.projects[]`

from the shared shell snapshot in order to resolve `projectKey` into project display name.

That snapshot originates from:

- `GET /api/phase3/admin-console`

### 4.2 Current Limitation

The shared snapshot does not provide template data. Template catalog, detail, and mutations are served by the dedicated `GET/POST/PUT/DELETE /api/phase3/data-templates` endpoints, not by the admin-console snapshot.

Remaining limits:

- template versioning is not yet implemented
- snapshot only provides project-name lookup for the template display

## 5. Current Cross-Screen Interface Relationship with Execution

### 5.1 Shared Catalog Source

`execution` now reads from the same backend registry via `GET /api/phase3/data-templates` to populate:

- available compare templates for selected project
- selected compare-template chips

Both `dataTemplates` and `execution` share the same backend source of truth.

### 5.2 Interface Boundary

- `dataTemplates` manages the template registry (full CRUD, import, dry-run)
- `execution` reads the same registry through `GET /api/phase3/data-templates` (read-only)

## 6. UI Control to Interface Mapping

### 6.1 Catalog Controls

#### Template row

- user action: click
- request: none
- owner: local selected-template state
- current state: implemented

### 6.2 Header Actions

#### `Import`

- user action: click
- request: `POST /api/phase3/data-templates/import/preview` then `POST /api/phase3/data-templates/import/commit`
- owner: `DataTemplatesScreen.tsx`
- current state: implemented — two-step preview/commit import flow

#### `New template`

- user action: click
- request: `POST /api/phase3/data-templates`
- owner: `DataTemplatesScreen.tsx`
- current state: implemented — opens create form, posts to backend

### 6.3 Detail Actions

#### `Edit`

- user action: click
- request: `PUT /api/phase3/data-templates/{templateId}`
- owner: `DataTemplatesScreen.tsx`
- current state: implemented — opens edit form, saves via PUT

#### `Delete`

- user action: click
- request: `DELETE /api/phase3/data-templates/{templateId}`
- owner: `DataTemplatesScreen.tsx`
- current state: implemented — removes template from registry

#### `Dry-run`

- user action: click
- request: `POST /api/phase3/data-templates/{templateId}/dry-run`
- owner: `DataTemplatesScreen.tsx`
- current state: implemented — posts dry-run and shows result inline

## 7. Implemented Template Registry Interfaces

The following interfaces are implemented and backed by `DataTemplatePersistenceService`.

### 7.1 Template List Interface

#### `GET /api/phase3/data-templates`

Purpose:

- list reusable data templates for one project or for the whole catalog

Query parameters:

- `projectKey` optional
- `type` optional
- `risk` optional

Response body:

```json
{
  "items": [
    {
      "id": "order-seed-v2",
      "name": "order.seed.v2",
      "type": "composite",
      "projectKey": "checkout-web",
      "allowedEnvs": ["dev", "staging"],
      "risk": "medium",
      "rollbackStrategy": "sql",
      "uses": 128,
      "compareSummary": "Compare order, order_items, and stock deltas before and after execution."
    }
  ]
}
```

### 7.2 Template Detail Interface

#### `GET /api/phase3/data-templates/{templateId}`

Purpose:

- return the full definition of one template for detail view or edit view
- note: this endpoint is an implemented backend capability; the current UI edit flow uses the locally selected object copy rather than calling this endpoint

Response body:

```json
{
  "id": "order-seed-v2",
  "name": "order.seed.v2",
  "type": "composite",
  "projectKey": "checkout-web",
  "datasource": "checkout_main_db",
  "allowedEnvs": ["dev", "staging"],
  "risk": "medium",
  "rollbackStrategy": "sql",
  "steps": [
    {
      "type": "template",
      "action": "INSERT orders"
    }
  ],
  "guards": [
    "prod environment blocked",
    "snapshot taken before run"
  ],
  "params": [
    {
      "key": "user_id",
      "type": "uuid",
      "required": true
    }
  ],
  "compareSummary": "Compare order, order_items, and stock deltas before and after execution.",
  "version": 3
}
```

### 7.3 Create Template Interface

#### `POST /api/phase3/data-templates`

Purpose:

- create a new reusable template definition

Request body:

```json
{
  "name": "order.seed.v3",
  "type": "composite",
  "projectKey": "checkout-web",
  "datasource": "checkout_main_db",
  "allowedEnvs": ["dev", "staging"],
  "risk": "medium",
  "rollbackStrategy": "snapshot",
  "steps": [
    {
      "type": "sqlTemplate",
      "ref": "insert_order"
    }
  ],
  "guards": [
    "prod environment blocked",
    "snapshot taken before run"
  ],
  "params": [
    {
      "key": "user_id",
      "type": "uuid",
      "required": true
    }
  ],
  "compareSummary": "Compare order and inventory state before and after execution."
}
```

Response body:

```json
{
  "status": "ACCEPTED",
  "templateId": "order-seed-v3"
}
```

### 7.4 Update Template Interface

#### `PUT /api/phase3/data-templates/{templateId}`

Purpose:

- update selected template metadata and recipe definition

Request body:

```json
{
  "name": "order.seed.v2",
  "allowedEnvs": ["dev", "staging"],
  "risk": "medium",
  "rollbackStrategy": "sql",
  "steps": [
    {
      "type": "template",
      "action": "INSERT orders"
    }
  ],
  "guards": [
    "prod environment blocked",
    "snapshot taken before run",
    "row count limit: 50"
  ],
  "params": [
    {
      "key": "user_id",
      "type": "uuid",
      "required": true
    }
  ],
  "compareSummary": "Compare order, order_items, and stock deltas before and after execution.",
  "version": 3
}
```

Response body:

```json
{
  "status": "ACCEPTED",
  "templateId": "order-seed-v2",
  "version": 4
}
```

### 7.5 Template Import Preview Interface

#### `POST /api/phase3/data-templates/import/preview`

Purpose:

- validate imported template-definition files before persistence

Request body:

```json
{
  "sourceType": "json",
  "payload": {
    "items": [
      {
        "name": "coupon.single_use",
        "type": "sql",
        "projectKey": "checkout-web"
      }
    ]
  }
}
```

Response body:

```json
{
  "status": "PREVIEW_READY",
  "items": [
    {
      "name": "coupon.single_use",
      "result": "VALID",
      "warnings": []
    }
  ]
}
```

### 7.6 Template Import Commit Interface

#### `POST /api/phase3/data-templates/import/commit`

Purpose:

- persist the imported template set after preview approval

Request body:

```json
{
  "previewId": "tmpl-import-20260420-001",
  "operator": "qa-platform"
}
```

Response body:

```json
{
  "status": "ACCEPTED",
  "created": 2,
  "updated": 1
}
```

### 7.7 Template Dry-Run Interface

#### `POST /api/phase3/data-templates/{templateId}/dry-run`

Purpose:

- execute a safe validation run of one template against chosen environment and parameters

Request body:

```json
{
  "environment": "staging",
  "datasource": "checkout_main_db",
  "params": {
    "user_id": "3f5b5d1f-5131-4f47-953d-df104bd6a7d5",
    "total_cents": 8910
  }
}
```

Response body:

```json
{
  "status": "PASSED",
  "templateId": "order-seed-v2",
  "checks": [
    {
      "name": "environment-whitelist",
      "status": "OK"
    },
    {
      "name": "rollback-strategy",
      "status": "OK"
    },
    {
      "name": "parameter-schema",
      "status": "OK"
    }
  ],
  "auditRef": "data-template-dryrun-20260420-001"
}
```

## 8. Implemented Control Wiring

### 8.1 `Import`

Implementation type:

- two-step preview plus commit import flow

Implementation:

1. button opens local import drawer
2. uploaded definition posts to:
   - `POST /api/phase3/data-templates/import/preview`
3. reviewer approves preview result
4. commit posts to:
   - `POST /api/phase3/data-templates/import/commit`
5. success behavior:
   - reload catalog via `GET /api/phase3/data-templates`

### 8.2 `New template`

Implementation type:

- local create form plus backend create mutation

Implementation:

1. button opens local create drawer/form
2. submit posts to:
   - `POST /api/phase3/data-templates`
3. success behavior:
   - reload list
   - select the created template

### 8.3 `Edit`

Implementation type:

- local edit drawer plus backend update mutation

Implementation:

1. button opens edit drawer for current template
2. current detail sourced from locally selected object copy (not a separate detail GET)
3. save posts to:
   - `PUT /api/phase3/data-templates/{templateId}`
4. success behavior:
   - reload detail
   - refresh execution-side available template list on next template read

### 8.4 `Delete`

Implementation type:

- confirmation prompt plus backend delete mutation

Implementation:

1. button shows confirmation prompt
2. confirmed delete posts to:
   - `DELETE /api/phase3/data-templates/{templateId}`
3. success behavior:
   - reload catalog
   - reset selection to first available template

### 8.5 `Dry-run`

Implementation type:

- safe validation mutation, not real execution launch

Implementation:

1. button opens parameter/environment confirmation drawer
2. submit posts to:
   - `POST /api/phase3/data-templates/{templateId}/dry-run`
3. success behavior:
   - show dry-run result in local status area
   - preserve current template selection
4. failure behavior:
   - show guard or parameter validation failure without leaving the page

### 8.6 Template Row Selection

Implementation type:

- local selection behavior
- detail panel bound to selected template record

Implementation:

- list payload contains full detail; no extra request is needed on row click

## 9. Relationship to Execution Interfaces

### 9.1 Current Execution Read Contract

`execution` reads from the same backend registry:

- `GET /api/phase3/data-templates?projectKey={projectKey}`

Both screens share one template-registry source of truth. The local `defaultDataTemplates` constant is used only as a fallback when the API is unavailable.

### 9.2 Compare-Selection Boundary

`execution` only consumes:

- template id
- name
- type
- risk
- compare summary
- allowed environments

It should not own template-definition editing logic.

## 10. Error Handling Boundary

Current implementation:

- mutation states (pending/success/error) are implemented for create, edit, delete, import, and dry-run
- error feedback is shown inline after failed mutations

Implemented error handling:

- import validation failure
  - preview step returns field-level and template-level errors
- create/update failure
  - form draft is preserved for retry
- dry-run failure
  - guard, env-block, and parameter validation failures are shown inline

## 11. Remaining Limits

- The backend template registry uses file-backed persistence (`config/phase3/data-templates.json`), not a real database.
- Dry-run is deterministic validation only and does not execute real SQL or service calls.
- Import preview/commit is deterministic and does not validate against real datasources.
- Template versioning is not yet implemented; updates overwrite in place.
- `Dry-run` remains a template-safety validation interface, not merged with scheduler execution.
- Phase 3 main docs only point toward template design indirectly; the detailed registry/dry-run model was grounded with the Phase 4/5 template design documents.
