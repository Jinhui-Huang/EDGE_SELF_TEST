# Environments Functional Specification

## 1. Document Position

- Screen name: `environments`
- Front-end implementation: `ui/admin-console/src/screens/DatabaseConfigScreen.tsx`
- Parent orchestration: `ui/admin-console/src/App.tsx`
- Documentation stage rule:
  - This document defines current and intended screen behavior for review.
  - It must not trigger UI or backend implementation changes in the current stage.
  - Any discovered gap can only be recorded as a review item.

## 2. Screen Purpose

The `environments` screen is the current datasource/database configuration page of the Phase 3 admin console. Despite the navigation label, the page does not manage the full environment domain today. It specifically manages database connection definitions that are later consumed by execution-time data preparation, DB assertion, restore, and comparison workflows.

Its job is to:

- list configured database connections
- let the operator create, edit, or delete a database config
- expose the connection fields needed by runtime DB access
- persist datasource definitions into the local file-backed environment config contract
- provide a connection-test action for operator validation

This screen answers these operator questions:

- Which datasources are configured for local execution?
- Which JDBC URL, driver, schema, and MyBatis environment belong to each datasource?
- Can a database config be saved into the current local config store?
- Is the entered connection definition minimally complete?

## 3. Operator Role

Primary users:

- QA platform operator
- local deployment maintainer
- data-preparation maintainer responsible for DB connectivity

Typical usage moments:

- before `execution`
- before `dataTemplates` dry-run or data-prepare work
- before DB assertion or restore/diff workflows

## 4. Screen Placement in Product Flow

The screen lives inside the common admin-console frame:

- top bar
- sidebar
- main panel: `environments`

The screen influences:

- `execution`
- `dataTemplates`
- `dataDiff`

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `DatabaseConfigScreen.tsx`.
- The page receives datasource draft state from `App.tsx`.
- database create and edit dialog is implemented.
- dialog `Save database` immediately persists through local-admin-api.
- dialog `Delete` immediately persists through local-admin-api.
- card `Test connection` is implemented, but only as local front-end validation.
- dialog `Test connection` is implemented, but only as local front-end validation.
- there is no broader environment editor for browser pool, account slots, or network zone on this page.

This matters for review:

- this page has a real persistence path
- save/delete are immediate, not draft-until-footer-save
- the page name suggests a wider environment scope than the actual UI currently covers

## 6. Functional Areas

### 6.1 Header and Create Action

Visible elements:

- navigation eyebrow
- page title
- save hint
- `New database`

Functional role:

- position the page as a config-management surface
- open create-database dialog

Current behavior:

- `New database` opens create dialog

### 6.2 Database Card Grid

Visible elements per card:

- database name
- database type
- URL
- schema
- user
- driver
- MyBatis env
- `Test connection`

Functional role:

- give quick visibility into configured datasource definitions
- provide row-level test action

Current behavior:

- card click opens edit dialog
- card `Test connection` triggers local-only validation

### 6.3 Database Dialog

Visible elements:

- name
- type
- JDBC URL
- username
- password
- driver
- schema
- MyBatis env
- note
- actions:
  - `Test connection`
  - `Delete` when editing
  - `Save database`

Functional role:

- create or update a database config
- remove an existing config
- validate minimum connection completeness

Current behavior:

- `Save database` persists immediately
- `Delete` persists immediately
- `Test connection` is local-only validation

## 7. Data Semantics by Area

### 7.1 Database Config Data

Current database definitions contain:

- identity:
  - id
  - name
  - type
- connectivity:
  - JDBC URL
  - username
  - password
  - driver
- runtime integration:
  - schema
  - MyBatis env
- note

### 7.2 Persistence Semantics

The page does not save typed datasource records directly. It serializes each datasource into one generic config item:

- `label = database:{id}`
- `value = JSON.stringify(DatabaseConfig)`

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The screen consumes:

- current locale
- page title
- navigation label
- save hint
- `databases`
- save mutation state
- test mutation state
- callbacks for save and test

### 8.2 Screen Outputs

The screen currently produces:

- immediate persistence output
  - create database
  - update database
  - delete database
- local-only validation output
  - connection-test result

## 9. User Actions

Visible actions on this screen:

- click `New database`
- click database card
- click card `Test connection`
- edit database fields in dialog
- click dialog `Test connection`
- click dialog `Delete`
- click dialog `Save database`

Current implementation summary:

- implemented:
  - create dialog
  - edit dialog
  - immediate save mutation
  - immediate delete mutation
  - local test action
- visible but not implemented:
  - real backend connection test
  - broader non-database environment editing

## 10. Functional Control Responsibility Matrix

### 10.1 Create and Edit Controls

- `New database`
  - function: open create dialog
  - output type: local dialog state
  - current implementation: implemented
- database card
  - function: open edit dialog
  - output type: local dialog state
  - current implementation: implemented

### 10.2 Test Controls

- card `Test connection`
  - function: validate connection completeness
  - output type: local test state
  - current implementation: implemented as local-only check
- dialog `Test connection`
  - function: validate current form values
  - output type: local test state
  - current implementation: implemented as local-only check

### 10.3 Persistence Controls

- dialog `Save database`
  - function: persist create/update
  - output type: backend mutation
  - current implementation: implemented
- dialog `Delete`
  - function: persist deletion
  - output type: backend mutation through resubmitted remaining list
  - current implementation: implemented

## 11. State Model

The screen should support:

- datasource list loaded
- create dialog open
- edit dialog open
- form changed
- connection test pending
- connection test passed
- connection test failed
- save pending
- save success
- save failure

Current implementation status:

- dialog state is implemented
- immediate save/delete mutation state is implemented
- local test state is implemented
- full environment-scope state is not implemented

## 12. Validation and Rules

Current implemented rules:

- created ids fall back to `db-{timestamp}` when id is blank
- save normalizes name, driver, url, schema, username, mybatis env, and note
- persisted list filters out entries with blank name
- local test passes only when URL, username, password, and driver are all non-empty

Current missing validation:

- no backend reachability test
- no duplicate datasource-id conflict handling
- no validation for schema or MyBatis env consistency

## 13. Cross-Screen Relationships

### 13.1 Upstream Dependencies

The screen depends on:

- shared snapshot loading of `environmentConfig`
- `App.tsx` parsing datasource configs from config items

### 13.2 Downstream Screens

The screen influences:

- `execution`
  - selected database connection
- `dataTemplates`
  - template dry-run and datasource targeting
- `dataDiff`
  - restore/result comparison context

### 13.3 Shared Data Context

The screen shares these domains with other screens:

- datasource config
- environment governance
- data-prepare and DB assertion workflows

## 14. Screen Boundary

The `environments` screen is responsible for:

- datasource/database connection management
- file-backed environment-config persistence for datasource records

The `environments` screen is not currently responsible for:

- full browser-pool management
- account-slot management
- network-zone management
- execution launch

## 15. Known Gaps and Review Items

Review items discovered while documenting:

- The page name suggests full environment management, but the implemented UI only manages datasource/database connections.
- Connection testing is only a local field-presence check, not a backend reachability test.
- The persistence layer is generic label/value config storage rather than a typed datasource API.
- Generic environment config items such as browser pool and account slots exist in the file contract but are not editable on this page.

These are documentation review items only. No implementation change is made in this stage.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
