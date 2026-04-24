# Environments Interface Specification

## 1. Scope and Design Basis

- Screen: `environments`
- UI implementation:
  - `ui/admin-console/src/screens/DatabaseConfigScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Current backend/local API implementation:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ConfigPersistenceService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- Main design references reviewed for this document:
  - `docs/phase3/main/enterprise_web_test_platform_tech_design.md`
  - `docs/phase3/main/enterprise_web_test_platform_implementation_design.md`
  - `docs/phase3/main/platform_and_edge_low_fidelity_wireframes.md`
  - `docs/phase3/main/platform_ui_prototype_and_interaction_design_phase3_5.md`

This document distinguishes:

- current snapshot read context
- current generic environment-config persistence path
- current backend datasource connection-test interface
- future typed datasource/environment interfaces implied by the design docs

## 2. Interface Summary

Current `environments` screen conclusion:

- current direct read source:
  - `GET /api/phase3/admin-console`
- current direct write source:
  - `POST /api/phase3/config/environment`
- current backend validation action:
  - `POST /api/phase3/datasources/test-connection`
- current UI scope:
  - datasource/database configs only
- current non-UI environment config still present in file contract:
  - browser pool
  - account slots
  - network zone
  - data policy

## 3. Current Read Context: GET /api/phase3/admin-console

### 3.1 Purpose for Environments Screen

The screen reads `snapshot.environmentConfig` from the shared admin-console snapshot.

Relevant snapshot field:

- `environmentConfig[]`

### 3.2 Current Parsing Behavior

`App.tsx` derives screen datasource state through:

- `parseDatabaseConfigs(snapshot.environmentConfig)`

Expected config-item encoding:

- `label = database:{databaseId}`
  - `value = JSON.stringify(DatabaseConfig)`

### 3.3 Current Limitation

The current screen ignores environment-config items that do not start with `database:`. That means the file contract may contain broader environment data, but the current UI only consumes datasource records.

## 4. Current Write Context: POST /api/phase3/config/environment

### 4.1 Current Save Entry Point

Dialog `Save database` and `Delete` both call:

- `handleDatabaseConfigSave(items)` in `App.tsx`

That function:

1. filters items with non-empty `name`
2. serializes them through `buildDatabaseConfigItems(...)`
3. iterates payload items
4. posts each one to:
   - `POST /api/phase3/config/environment`
5. reloads:
   - `GET /api/phase3/admin-console`

### 4.2 Current Request Shape

Each request body is one config item:

```json
{
  "label": "database:checkout-main",
  "value": "{\"id\":\"checkout-main\",\"name\":\"checkout-main\",\"type\":\"PostgreSQL\", ... }"
}
```

### 4.3 Current Persistence Behavior

`ConfigPersistenceService.upsertEnvironmentConfigItem(...)`:

- requires:
  - `label`
  - `value`
- writes into:
  - `config/phase3/environment-config.json`
- upserts by label
- returns:
  - `status`
  - `kind`
  - `path`
  - `updated`
  - `totalItems`
  - `entry`

### 4.4 Current File-Backed Shape

Persisted file shape can contain both:

- generic environment items
- datasource items

Example:

```json
{
  "items": [
    {
      "label": "Browser pool",
      "value": "edge-stable-win11 / edge-beta-win11"
    },
    {
      "label": "database:checkout-main",
      "value": "{\"id\":\"checkout-main\",\"name\":\"checkout-main\",\"type\":\"PostgreSQL\", ... }"
    }
  ]
}
```

## 5. Current Datasource Test Interface

### 5.1 Current Behavior

Card `Test connection` and dialog `Test connection` both call the backend.

`handleDatabaseConnectionTest(item)`:

- sets pending state
- posts the current datasource draft to:
  - `POST /api/phase3/datasources/test-connection`
- validates the response shape before accepting it in UI state
- renders structured `status`, `checks`, `warnings`, and `resolvedDriver`
- if the API is unavailable or malformed:
  - shows warning-state fallback
  - shows local-only completeness checks for operator reference
  - does not report fake success

### 5.2 Interface Meaning

This is a real backend validation interface, but not a real JDBC connectivity check.
The current Phase 3 implementation is deterministic and mock-realistic:

- validates request completeness and field shape
- checks JDBC URL / driver / schema / MyBatis env consistency
- detects placeholder credentials
- does not open a real database connection

## 6. Immediate Persist vs Draft-Only Boundary

### 6.1 Immediate Persist Actions

These actions persist immediately through `onSave(nextDrafts)`:

- dialog `Save database`
- dialog `Delete`

### 6.2 Local-Only Actions

These actions do not persist anything:

- dialog field edits before clicking save
- card `Test connection`
- dialog `Test connection`

This differs from `models`, where edits remain draft-only until footer save.

## 7. UI Control to Interface Mapping

### 7.1 Create and Edit Controls

#### `New database`

- user action: click
- request: none
- owner: local dialog state
- current state: implemented

#### Database card

- user action: click
- request: none
- owner: local dialog state
- current state: implemented

### 7.2 Test Controls

#### Card `Test connection`

- user action: click
- request:
  - `POST /api/phase3/datasources/test-connection`
- owner: backend validation state
- current state: implemented

#### Dialog `Test connection`

- user action: click
- request:
  - `POST /api/phase3/datasources/test-connection`
- owner: backend validation state
- current state: implemented

### 7.3 Persistence Controls

#### Dialog `Save database`

- user action: click
- request:
  - repeated `POST /api/phase3/config/environment`
- owner:
  - `App.tsx` config persistence flow
- current state: implemented

#### Dialog `Delete`

- user action: click
- request:
  - repeated `POST /api/phase3/config/environment` with the remaining list
- owner:
  - `App.tsx` config persistence flow
- current state: implemented

## 8. Current And Future Datasource / Environment Interfaces

The design docs distinguish environment and datasource domains more explicitly than the current screen does.

### 8.1 Datasource List Interface

#### `GET /api/phase3/datasources`

Purpose:

- return typed datasource configs for datasource-management screens and execution forms

Response body:

```json
{
  "items": [
    {
      "id": "checkout-main",
      "name": "checkout-main",
      "type": "PostgreSQL",
      "url": "jdbc:postgresql://db/checkout",
      "schema": "checkout_app",
      "username": "qa_reader",
      "driver": "org.postgresql.Driver",
      "mybatisEnv": "qa-postgres",
      "note": "Checkout staging primary database"
    }
  ]
}
```

### 8.2 Datasource Save Interface

#### `PUT /api/phase3/datasources`

Purpose:

- persist the datasource registry as one typed document rather than many generic config items

Request body:

```json
{
  "items": [
    {
      "id": "checkout-main",
      "name": "checkout-main",
      "type": "PostgreSQL",
      "url": "jdbc:postgresql://db/checkout",
      "schema": "checkout_app",
      "username": "qa_reader",
      "password": "******",
      "driver": "org.postgresql.Driver",
      "mybatisEnv": "qa-postgres",
      "note": "Checkout staging primary database"
    }
  ]
}
```

Response body:

```json
{
  "status": "ACCEPTED",
  "saved": 1
}
```

### 8.3 Datasource Connection Test Interface

#### `POST /api/phase3/datasources/test-connection`

Purpose:

- validate one datasource draft through deterministic backend checks before save

Request body:

```json
{
  "type": "PostgreSQL",
  "url": "jdbc:postgresql://db/checkout",
  "username": "qa_reader",
  "password": "******",
  "driver": "org.postgresql.Driver",
  "schema": "checkout_app"
}
```

Response body:

```json
{
  "status": "PASSED",
  "checks": [
    {
      "name": "jdbc-url-shape",
      "status": "PASSED",
      "message": "JDBC URL shape matches the datasource type."
    }
  ],
  "resolvedDriver": "org.postgresql.Driver",
  "message": "Datasource validation passed.",
  "warnings": []
}
```

Current Phase 3 behavior:

- implemented in local-admin-api
- consumed by `DatabaseConfigScreen`
- deterministic only; no real JDBC connection

### 8.4 Environment Metadata Interface

#### `GET /api/phase3/environments`

Purpose:

- expose broader environment metadata that is currently out of scope for the UI but present in the design docs

Response body:

```json
{
  "browserPools": [
    "edge-stable-win11",
    "edge-beta-win11"
  ],
  "accountSlots": [
    "smoke_bot_01",
    "ops_audit_02"
  ],
  "networkZones": [
    "staging",
    "prod-like"
  ]
}
```

## 9. Detailed Implementation Design for Currently Unwired Controls

### 9.1 Card `Test connection` / Dialog `Test connection`

Recommended implementation type:

- backend datasource connection-test mutation

Concrete implementation design:

1. button posts:
   - `POST /api/phase3/datasources/test-connection`
2. request uses current datasource draft values
3. success behavior:
   - show backend-returned structured pass result
4. failure behavior:
   - show backend checks/warnings instead of local field-presence message

### 9.2 `Save database`

Recommended implementation type:

- current generic config-item save is valid for Phase 3
- future typed datasource save can replace it later

Concrete implementation design:

- current implementation remains:
  - repeated `POST /api/phase3/config/environment`
- future replacement can become:
  - `PUT /api/phase3/datasources`

### 9.3 `Delete`

Recommended implementation type:

- keep immediate-persist delete semantics

Concrete implementation design:

- deletion updates local list
- immediately resubmits the remaining datasource registry
- reloads snapshot after success

Reasoning:

- current page behavior already treats save/delete as immediate persistence rather than staged draft operations

## 10. Error Handling Boundary

Current implementation:

- save/delete return backend mutation status from `/api/phase3/config/environment`
- connection test returns structured backend validation status

Current persistence error cases:

- missing `label` or `value`
  - `400 BAD_REQUEST`
- write failure
  - environment-config mutation error state

Recommended future test errors:

- JDBC URL shape mismatch
- driver/type mismatch
- missing or placeholder password
- invalid schema identifier
- invalid MyBatis environment id

## 11. Relationship to Other Interfaces

### 11.1 Relationship to Execution

- `execution` should consume datasource selections, not own datasource persistence

### 11.2 Relationship to DataTemplates

- template dry-run and execution-preparation should rely on datasource definitions created here

### 11.3 Relationship to DataDiff

- restore and comparison flows rely on datasource context defined here

## 12. Review Items

Review-only findings:

- The page is a true config screen with real persistence, not a demo shell.
- The current page name overstates scope: it manages datasources, not the full environment domain.
- Connection testing is now backend-driven, but it is still deterministic validation rather than real JDBC connectivity.
- The generic config-item contract works but hides the conceptual distinction between environment metadata and datasource registry entries.

These are documentation findings only. No implementation change is made in this stage.
