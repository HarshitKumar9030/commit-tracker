# Architecture

Relay is one Next.js App Router application. The browser renders the workspace, route handlers authenticate requests and validate inputs, MongoDB stores team data, and Ably broadcasts refreshes and drawing previews.

```text
app/                 Routes, API handlers, global styles, metadata
components/          Workspace views and client hooks
lib/                 Domain types, assignment rules, validation, server helpers
public/fonts/        Manrope files and their original font license
scripts/             Local MongoDB, repository watcher, integration checks
tests/               Unit tests for domain rules and rendering
docs/                Deployment, workflow, and architecture guides
.github/             CI and issue/pull-request templates
```

## Data and realtime

`settings` stores team rosters, hashed access codes, routing policies, and repository selection. `commits` stores imported diffs and review decisions. `code_index` stores maintainer records by team/repository/branch/SHA. `canvas_boards` and `canvas_strokes` store shared drawing history. `team_files` stores Drive link metadata. Optional AI collections store usage, rate limits, and cached analytics.

The state endpoint filters data by the authenticated team. GitHub imports are idempotent by commit SHA. Assignment excludes ineligible profiles and authors according to team policy. Live clients subscribe to team-specific refresh events and fetch fresh state. Canvas previews use a separate transient channel; durable notifications come from the server after persistence.

## Demo data

`lib/demo.ts` provides illustrative diffs and curated index records. Demo state stays in localStorage. Versioned upgrades should preserve custom profiles, notes, and feedback. Canvas device storage is independent. Never migrate or rename live team records merely to update bundled examples.

## Boundaries

`lib/server.ts` is server-only. Do not import secrets or database clients into client components. Route handlers validate inputs and permissions; UI visibility is not authorization. Markdown rendering skips raw HTML. Drive URLs are normalized and restricted to Google Drive/Docs hosts; the server does not fetch arbitrary supplied URLs.
