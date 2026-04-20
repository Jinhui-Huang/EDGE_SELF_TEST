# Dashboard Functional Specification

## 1. Document Position

- Screen name: `dashboard`
- Front-end implementation: `ui/admin-console/src/screens/DashboardScreen.tsx`
- Parent orchestration: `ui/admin-console/src/App.tsx`
- Documentation stage rule:
  - This document defines screen behavior and dependencies for review.
  - It must not trigger backend changes or UI changes in the current stage.
  - Any discovered gap can only be recorded as a review item.

## 2. Screen Purpose

The `dashboard` screen is the operator overview entry of the Phase 3 admin console. Its job is to give a single-screen summary of current platform health, execution pressure, recent run activity, operational risks, and AI decision posture.

This screen is not a deep editing workspace. It is a read-mostly operational cockpit used to answer these questions quickly:

- Is the platform generally healthy right now?
- Are recent runs passing, failing, or blocked?
- Which issues require operator attention first?
- Is AI recommendation behavior still within audit expectations?
- Which downstream module should the operator open next?

## 3. Operator Role

Primary users:

- QA platform operator
- Test operations owner
- Runtime audit reviewer
- Technical lead reviewing daily platform status

Typical usage moments:

- Start of day status review
- Pre-release execution readiness check
- Failure triage entry
- Audit pressure check before opening reports or execution monitoring

## 4. Screen Placement in Product Flow

The screen lives inside the common Phase 3 admin-console frame:

- Top bar: product identity, data source, language switch, theme switch, search entry
- Left sidebar: screen navigation
- Main panel: `dashboard`

The `dashboard` is the default overview screen in the shell-oriented navigation model and acts as the top-level summary before the operator goes deeper into:

- `execution`
- `monitor`
- `reports`
- `reportDetail`
- `models`
- `environments`
- `dataDiff`

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `DashboardScreen.tsx`.
- The page currently behaves as a read-only screen.
- The current visible content is mostly screen-local demo/static presentation data.
- The screen receives `snapshot` props from `App.tsx`, but the current implementation does not materially consume snapshot fields for the displayed cards and lists.
- The visible buttons `Refresh` and `New run` are present in the UI, but they are not currently bound to a real action in `DashboardScreen.tsx`.

This distinction matters for documentation:

- The screen responsibility is broad and operational.
- The current implementation depth is intentionally lighter than the long-term role.

## 6. Functional Areas

### 6.1 Hero Summary Area

Visible elements:

- Screen title: operations overview / operations cockpit
- Short summary text describing the page as a unified control surface
- Action buttons:
  - `Refresh`
  - `New run`

Functional intent:

- Explain the role of the page to the operator.
- Reserve quick access to refresh overall state and begin a new execution flow.

Current behavior:

- Buttons are visual only in the current implementation.

Expected relationship to other screens:

- `Refresh` should conceptually reload the same admin-console state source used by the shell.
- `New run` should conceptually lead the operator into `execution`.

### 6.2 Metric Cards Area

Visible modules:

- Active projects
- Runs today
- Pass rate
- Recovery ok
- AI spend (month)

Each metric card contains:

- metric label
- main numeric or percentage value
- short delta or operational note
- visual tone/icon

Functional role:

- Compress platform state into a first-look summary.
- Help the operator decide whether to continue monitoring or open a deeper module.

Operational interpretation:

- Active projects indicates current platform breadth and follow-up load.
- Runs today indicates platform activity volume and queue pressure.
- Pass rate indicates test reliability trend.
- Recovery ok indicates restoration and checkpoint reliability.
- AI spend indicates model usage pressure and budget awareness.

### 6.3 Recent Runs Panel

Visible structure:

- Panel title: `Recent runs`
- Time range hint: `last 24h`
- Tabular list of recent executions

Displayed columns:

- run marker
- run name
- environment
- status
- model
- duration
- relative time

Functional role:

- Provide immediate operational evidence behind the summary metrics.
- Give the operator a compact run stream without opening the reports module first.

What the operator can infer from this area:

- which runs are failing now
- whether a failure is isolated or widespread
- which execution model handled the run
- whether long duration suggests congestion or runtime instability

Downstream relation:

- Failing or interesting runs should lead the operator toward `reports` and then `reportDetail`.
- Queue or running-state pressure should lead the operator toward `monitor`.

### 6.4 Needs Attention Panel

Visible structure:

- Panel title: `Needs attention`
- warning count badge
- list of risk items with colored severity bars

Each attention item contains:

- issue title
- issue detail
- severity tone

Functional role:

- Surface prioritized review items.
- Make the operator aware of unstable locators, worker pressure, rollback locks, and audit backlog.

Operational value:

- This panel is the explicit triage entry point of the screen.
- It complements metrics by showing actionable risk narratives instead of only counts.

Expected downstream mapping:

- locator drift -> `reports` / `reportDetail`
- worker saturation -> `monitor`
- rollback lock -> `dataDiff` or execution-related review
- audit backlog -> `models`, `reports`, or later audit-oriented pages

### 6.5 AI Decisions Panel

Visible structure:

- panel title: `AI decisions`
- time range hint
- adopted count summary
- fallback-trigger count summary
- fallback reason hint
- model distribution chips

Functional role:

- Show whether AI recommendations remain inside expected audit boundaries.
- Expose model adoption and fallback behavior at an overview level.

Operational interpretation:

- adopted ratio indicates operator confidence and system stability
- fallback count indicates reliability issues or schema/output drift
- model chips indicate provider distribution and cost/risk concentration

Downstream relation:

- unusual fallback behavior should drive the operator to `models`
- AI-related failures observed here should later be correlated with `reports` and `reportDetail`

## 7. Data Semantics by Area

### 7.1 Summary Metrics

- Values are overview indicators, not authoritative transactional records.
- These values are suitable for directional judgement, not audit-grade evidence by themselves.

### 7.2 Recent Runs

- Each row represents an execution summary item.
- The row must be understandable without opening detail, but not replace detail analysis.

### 7.3 Attention Items

- These are prioritized operational signals.
- Each item should be concise enough to scan and specific enough to route the operator to the correct downstream page.

### 7.4 AI Decision Metrics

- These values summarize recommendation and fallback posture.
- They are management-level indicators, not full model audit records.

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The `dashboard` screen is expected to consume these upstream inputs from the shell:

- current locale
- current theme mode
- current navigation state
- admin-console snapshot
  - summary
  - stats
  - work queue
  - reports
  - model/environment summaries
  - timeline
  - constraints

Current implementation note:

- the props contract already exposes this input model
- the current rendered UI still uses mostly screen-local static values instead of deeply consuming the snapshot

### 8.2 Screen Outputs

The `dashboard` screen does not currently submit business data.

Its output is operational guidance only:

- tell the operator whether the platform is healthy
- tell the operator what to open next
- tell the operator whether queue, risk, restore, or AI posture needs attention

Future interaction outputs should be limited to:

- refresh current overview state
- navigate to downstream screens

## 9. User Actions

Currently visible actions:

- `Refresh`
- `New run`

Current implementation status:

- No click handler is attached in the current screen implementation.

Functional definition for documentation:

- `Refresh`
  - intent: refresh the current overall platform snapshot
  - expected result: dashboard content updates to latest available shell data
- `New run`
  - intent: start a new execution flow
  - expected result: operator enters `execution`

No inline editing, delete, approve, or submit action currently exists on this screen.

## 10. Functional Control Responsibility Matrix

### 10.1 Hero Controls

- `Refresh`
  - function: refresh dashboard overview state
  - output type: reload current screen data
  - downstream relation: remains on `dashboard`
  - current implementation: visual only
- `New run`
  - function: enter execution initiation flow
  - output type: route to `execution`
  - downstream relation: `execution`
  - current implementation: visual only

### 10.2 Summary Cards

- Active projects card
  - function: show current managed project breadth
  - downstream relation: may later point to `projects`
  - current implementation: display only
- Runs today card
  - function: show daily platform activity and queue pressure
  - downstream relation: may later point to `monitor` or `reports`
  - current implementation: display only
- Pass rate card
  - function: show overall execution reliability
  - downstream relation: may later point to `reports`
  - current implementation: display only
- Recovery ok card
  - function: show restore/checkpoint health
  - downstream relation: may later point to `dataDiff`
  - current implementation: display only
- AI spend card
  - function: show AI usage and budget pressure
  - downstream relation: may later point to `models`
  - current implementation: display only

### 10.3 Recent Runs Controls

- Recent run row
  - function: expose a single execution summary
  - downstream relation: should lead to `reports` or `reportDetail`
  - current implementation: display only

### 10.4 Attention Controls

- Attention item
  - function: expose one risk narrative and suggest next triage destination
  - downstream relation:
    - locator risk -> `reports` / `reportDetail`
    - queue pressure -> `monitor`
    - restore lock -> `dataDiff`
    - audit backlog -> `models` or later audit page
  - current implementation: display only

### 10.5 AI Decision Controls

- Adoption/fallback summary
  - function: summarize AI operational posture
  - downstream relation: `models`, later audit-oriented views
  - current implementation: display only
- Model distribution chips
  - function: show provider distribution at overview level
  - downstream relation: `models`
  - current implementation: display only

## 11. State Model

The screen is primarily read-only and should support the following conceptual states:

- loading
- loaded
- refresh failed
- empty/no operational data

Current implementation status:

- The surrounding shell handles snapshot loading.
- `DashboardScreen.tsx` itself does not currently render dedicated loading/empty/error sub-states.

## 12. Validation and Rules

There are no direct form validations on this screen in the current implementation because the screen does not submit editable content.

Implicit business rules:

- dashboard values are summary-level only
- dashboard must not mutate backend state directly
- dashboard should route operators to deeper pages for action-taking

## 13. Cross-Screen Relationships

### 13.1 Upstream Dependencies

The screen depends on shell-level context provided by the app:

- active locale
- theme mode
- sidebar navigation state
- app-level snapshot loading result

### 13.2 Downstream Screens

The dashboard should be documented as an upstream overview page for:

- `execution`
  - when the operator wants to start or review launch readiness
- `monitor`
  - when the operator needs real-time execution pressure and runtime status
- `reports`
  - when the operator needs recent historical outcomes
- `reportDetail`
  - when a specific failing run needs investigation
- `models`
  - when AI adoption/fallback behavior needs provider or routing review
- `environments`
  - when environment reliability or data source readiness is relevant
- `dataDiff`
  - when rollback, restore, or data drift signals require deeper inspection

### 13.3 Shared Data Context

The dashboard shares the same shell snapshot domain as other read-heavy screens. It belongs to the same operational context as:

- navigation metadata
- summary stats
- work queue
- reports summary
- timeline
- constraints

## 14. Screen Boundary

The `dashboard` screen is responsible for:

- overview presentation
- triage guidance
- summary-level operational awareness

The `dashboard` screen is not responsible for:

- editing project or case data
- editing model or database configuration
- launching execution forms directly inside the page
- viewing full report artifacts
- performing audit approvals
- changing backend state directly

## 15. Known Gaps and Review Items

Review items discovered while documenting:

- `Refresh` is visible but not wired.
- `New run` is visible but not wired to `execution`.
- The screen receives `snapshot`, but most displayed content is still screen-local static content rather than mapped shell data.
- The screen does not yet expose a direct row-level navigation from recent runs into `reports` or `reportDetail`.
- The screen currently lacks explicit loading, empty, and error rendering states in its own view layer.

These are documentation review items only. No implementation change is made in this stage.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
