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
  - none screen-specific
- current indirect read context:
  - `GET /api/phase3/admin-console` only for project-name lookup through `snapshot.projects`
- current direct write source:
  - none
- current template catalog source:
  - `defaultDataTemplates` local constant in `App.tsx`
- current shared consumer screens:
  - `dataTemplates`
  - `execution`

## 3. Current Local Template Registry

### 3.1 Current Source

The page currently receives:

- `dataTemplates={defaultDataTemplates}`

from `App.tsx`.

This is not loaded from backend storage.

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

This local object currently stands in for a future backend-owned data-template registry.

## 4. Current Indirect Snapshot Context

### 4.1 Current Snapshot Use

The page uses:

- `snapshot.projects[]`

from the shared shell snapshot in order to resolve `projectKey` into project display name.

That snapshot originates from:

- `GET /api/phase3/admin-console`

### 4.2 Current Limitation

The shared snapshot does not currently provide:

- template catalog list
- template detail
- template versioning
- template dry-run result
- template mutation status

## 5. Current Cross-Screen Interface Relationship with Execution

### 5.1 Shared Catalog Source

`execution` currently uses the same local `defaultDataTemplates` list to populate:

- available compare templates for selected project
- selected compare-template chips

### 5.2 Current Coupling Risk

This means:

- `dataTemplates` is not the source of truth
- `execution` does not fetch a backend registry either
- both pages are coupled to one local constant rather than a shared backend interface

### 5.3 Intended Interface Boundary

The correct future boundary is:

- `dataTemplates` manages the template registry
- `execution` reads the same registry through template-read interfaces

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
- request: none today
- owner: not implemented
- intended future interface:
  - template import preview and commit
- current state: visible only

#### `New template`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - template-create mutation
- current state: visible only

### 6.3 Detail Actions

#### `Edit`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - template-update mutation
- current state: visible only

#### `Dry-run`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - template dry-run mutation
- current state: visible only

## 7. Recommended Future Template Registry Interfaces

The visible controls require explicit template-registry interfaces.

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

## 8. Detailed Implementation Design for Currently Unwired Controls

### 8.1 `Import`

Recommended implementation type:

- two-step preview plus commit import flow

Concrete implementation design:

1. button opens local import drawer
2. uploaded definition posts to:
   - `POST /api/phase3/data-templates/import/preview`
3. reviewer approves preview result
4. commit posts to:
   - `POST /api/phase3/data-templates/import/commit`
5. success behavior:
   - reload catalog:
     - `GET /api/phase3/data-templates`

### 8.2 `New template`

Recommended implementation type:

- local create form plus backend create mutation

Concrete implementation design:

1. button opens local create drawer/form
2. submit posts to:
   - `POST /api/phase3/data-templates`
3. success behavior:
   - reload list
   - select the created template

### 8.3 `Edit`

Recommended implementation type:

- local edit drawer plus backend update mutation

Concrete implementation design:

1. button opens edit drawer for current template
2. current detail loaded from:
   - `GET /api/phase3/data-templates/{templateId}`
3. save posts to:
   - `PUT /api/phase3/data-templates/{templateId}`
4. success behavior:
   - reload detail
   - refresh execution-side available template list on next template read

### 8.4 `Dry-run`

Recommended implementation type:

- safe validation mutation, not real execution launch

Concrete implementation design:

1. button opens parameter/environment confirmation drawer
2. submit posts to:
   - `POST /api/phase3/data-templates/{templateId}/dry-run`
3. success behavior:
   - show dry-run result in local status area
   - preserve current template selection
4. failure behavior:
   - show guard or parameter validation failure without leaving the page

### 8.5 Template Row Selection

Recommended implementation type:

- keep local selection behavior
- bind detail panel to selected template record

Concrete implementation design:

- if list payload already contains full detail, no extra request is needed
- if list payload is summary-only, row click should call:
  - `GET /api/phase3/data-templates/{templateId}`

## 9. Relationship to Execution Interfaces

### 9.1 Recommended Execution Read Contract

`execution` should stop consuming local `defaultDataTemplates` and instead read from:

- `GET /api/phase3/data-templates?projectKey={projectKey}`

This preserves one template-registry source of truth.

### 9.2 Compare-Selection Boundary

`execution` should only consume:

- template id
- name
- type
- risk
- compare summary
- allowed environments

It should not own template-definition editing logic.

## 10. Error Handling Boundary

Current implementation:

- page has no backend requests
- no mutation status or failure state exists

Recommended future errors:

- import validation failure
  - return field-level and template-level errors
- create/update failure
  - preserve form draft for retry
- dry-run failure
  - distinguish guard failure, env-block failure, datasource failure, and rollback-policy failure

## 11. Review Items

Review-only findings:

- This screen currently shows the right template-governance concepts but has no backend registry behind it.
- `execution` is directly coupled to the same local template constant, which should be replaced by shared read interfaces.
- `Dry-run` should remain a template-safety validation interface, not be merged with scheduler execution.
- Phase 3 main docs only point toward template design indirectly; the detailed registry/dry-run model had to be grounded with the Phase 4/5 template design documents.

These are documentation findings only. No implementation change is made in this stage.
