# Relay · commit-tracker

A hackathon commit tracker with GitHub diffs, assigned code reviews, WebSocket presence, editable team groups, and Markdown recaps.

Built with **Next.js + TypeScript, MongoDB, and Ably WebSockets**. The interface uses locally hosted Manrope, open spacing, violet accents, and no borders or shadows.

## Run locally

Requires Node.js 22+ and MongoDB Community Server (`mongod`).

```bash
npm ci
cp .env.example .env.local
# Fill in SESSION_SECRET and TEAM_ACCESS_CODE; add your Ably key.
npm run db:start
npm run dev
```

Open [localhost:3000](http://localhost:3000). Create a team group with a name, repository, your profile, and an access code. Open **Team → Manage members** to add teammates by name, GitHub username, and role. Copy the invite link and share the access code separately. Teammates open the link, enter the code, and select their profile. Each group has an independent MongoDB roster, commit feed, and Ably channel. The existing local group has ID `workspace` and uses `TEAM_ACCESS_CODE`.

On the development machine prepared in this chat, MongoDB and `.env.local` are already configured. The initial local workspace code is **relay-hackathon**. Change it before sharing a deployment. Local database files live in the ignored `.local/mongodb` directory, and MongoDB listens only on `127.0.0.1:27017`.

To monitor GitHub while running locally, open a second terminal:

```bash
npm run watch:repo
```

This syncs the latest 20 commits every two minutes and publishes updates over WebSockets. **Sync commits** also works on demand. For immediate push updates, configure a GitHub webhook against a deployed HTTPS URL or a development tunnel. GitHub cannot deliver to localhost directly. The watcher is a local development process, not a Vercel background job.

For UI exploration without credentials, visit [/?demo=1](http://localhost:3000/?demo=1). Demo commits and actions are clearly labeled, stay in browser storage, and never touch MongoDB or GitHub. With missing core server configuration, the app also defaults to demo mode.

## The workflow

1. A GitHub push webhook (or a sync) fetches commits and file patches into MongoDB.
2. Each commit is assigned deterministically to one of the other three teammates, excluding the author by GitHub username. Assignment is stable across retries and spreads commits by SHA. External contributors are eligible for any teammate to review.
3. Teammates inspect changed files, approve a commit, or request changes with a note. Only its assigned reviewer can submit a judgment. Reviews are internal to Relay; they do not modify GitHub pull requests or block merges.
4. Ably WebSockets broadcast workspace refreshes and track presence by authenticated member identity. Reconnecting clients recover presence automatically; duplicate tabs count as one teammate. Workspace state is also refreshed every 30 seconds when realtime is configured.
5. Teammates update their focus. The Presentation view collects commit descriptions and approved review notes, with Markdown copy and export for your pitch.

A team supports 1–20 members. The creator controls membership and repository settings. Each group shares an access code; anyone with it can select a listed profile. Codes for newly created groups are salted and hashed with scrypt in MongoDB. This is shared team access for a trusted hackathon group, not individual GitHub OAuth. A solo creator’s own commits remain unassigned until another member is added. Removing a member revokes API access and reassigns pending reviews. Existing completed review history is retained.

## Environment variables

| Variable                | Purpose                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `MONGODB_URI`           | Local connection or MongoDB Atlas connection string                                                                                        |
| `MONGODB_DB`            | Database name, defaults to `relay`                                                                                                         |
| `SESSION_SECRET`        | At least 32 random characters; signs seven-day HTTP-only sessions                                                                          |
| `TEAM_ACCESS_CODE`      | Your team's shared workspace code                                                                                                          |
| `ABLY_API_KEY`          | Server-only key with publish, subscribe, and presence access on `relay:*`                                                                  |
| `GITHUB_REPO`           | Initial `owner/repository`; change it later in settings                                                                                    |
| `GITHUB_TOKEN`          | Optional for public repos; required for private repos. Use a fine-grained token with read-only Contents access to the monitored repository |
| `GITHUB_WEBHOOK_SECRET` | Random secret shared with GitHub for HMAC-SHA256 verification                                                                              |

Generate independent secrets with `openssl rand -hex 32`. Never prefix these with `NEXT_PUBLIC_`, commit `.env.local`, or paste keys into client code. Browsers receive short-lived, identity-bound Ably tokens with only subscribe and presence capabilities. A subscribe-only Ably key cannot support presence. A root key works server-side; a dedicated key scoped to `relay:*` is preferable. Rotate any key pasted into a conversation.

## Deploy to Vercel

1. Import [HarshitKumar9030/commit-tracker](https://github.com/HarshitKumar9030/commit-tracker) into Vercel. It detects Next.js. Use the repository root, `npm ci`, and `npm run build`; no custom server is required.
2. Create a MongoDB Atlas database and set `MONGODB_URI` to its connection string. **A Vercel deployment cannot reach your laptop's localhost MongoDB.** Allow network access from your deployment environment and use a dedicated database user.
3. Add the environment variables above in Vercel. Set a new access code and strong secrets for the deployed workspace. Use separate databases, Ably apps, and webhook secrets for preview and production if both are active.
4. Deploy, create a team group, then add the members, repository, and branch in **Team settings**. Click **Sync commits** once to import recent history.
5. In the monitored GitHub repository, open **Settings → Webhooks → Add webhook**:
   - Payload URL: copy the group-specific URL from **Team settings**, e.g. `https://your-domain/api/webhooks/github?team=your-team-id`
   - Content type: `application/json`
   - Secret: the same `GITHUB_WEBHOOK_SECRET` configured in Vercel
   - Events: **Just the push event**
   - Keep SSL verification enabled.
6. Push a commit. In GitHub's webhook deliveries, confirm a `200` response. Open two separate browser profiles as different teammates and verify live presence and the new assigned review.

The webhook endpoint must be publicly reachable by GitHub; a Vercel Authentication-protected preview will need the appropriate protection configuration. Standard production deployments are simplest. Ably hosts the WebSocket connections; the UI and all application APIs run on Vercel. Keys stay on the server. No sticky sessions, in-memory application database, or separate Socket.IO server is used.

MongoDB uses its unique `_id` for idempotent insertion, scoped to team, repository, branch, and SHA. Manual sync imports the most recent 20 commits. Webhooks import up to 100 commits from a push plus recent history. The UI shows the latest 100 stored commits for the configured branch. This is a hackathon activity feed, not a complete repository-history archive. GitHub may omit binary or very large patches; the diff dialog links to GitHub for those changes.

## Validation

```bash
npm test           # Assignment invariants and webhook signature tampering
npm run typecheck
npm run build
npm run test:live  # Local app + MongoDB + Ably must be running/configured
npm run test:teams # Creates and removes an isolated local test team
```

The live check exercises two actual WebSocket clients, presence, MongoDB updates, GitHub sync, duplicate ingestion, authorization, review persistence, and signed/invalid webhooks. It temporarily writes a review, restores the previous review, and uses the configured local workspace. Do not run it against a production deployment.

To start the production build locally, run `npm run build` followed by `npm start`. To restart local MongoDB, run `npm run db:start`; it checks for an existing server first. MongoDB's local log is `.local/mongodb.log`.

## Demo onboarding and interaction help

Open `/?demo=1` to see the demo introduction. The six-step tour covers counts, commit diffs, assigned reviews, presence, membership, and recap export. Finish or skip it to remember your preference in this browser; replay it with **Demo tour**. Demo changes never touch GitHub or MongoDB.

Tooltips appear on hover and keyboard focus for sync, filters, search, diff rows, membership, profile switching, review actions, and exports. Press Escape to dismiss a tooltip or tour. Dialogs and the tour keep keyboard focus within their controls.

GSAP animates the SVG connection paths and nodes. Framer Motion handles navigation, counts, cards, dialogs, roster changes, and tour transitions. Both respect the operating system's reduced-motion preference. No sparkle icons or emoji are used.

For the local watcher to monitor a newly created group, set `WATCH_TEAM_ID`, `WATCH_MEMBER_ID`, and `WATCH_TEAM_CODE` in `.env.local`. Without these, it uses the existing local `workspace` group. Use the creator's member ID from the authenticated `/api/state` response. Group-specific webhook URLs provide immediate push delivery after deployment.


### Review routing and AI

In Team settings, turn off **Receives code reviews** for teammates working on slides, product, or documentation. Set a default reviewer to route code to one person, or choose manual assignment. Pending commits can be assigned from their diff dialog. Authors are excluded unless **Allow authors to review their own commits** is enabled. Completed reviews keep their recorded reviewer. Available text diffs can be copied or downloaded; GitHub may omit binary or large patches.

**AI analytics & chat** uses Gemini `gemini-3.8-flash`. Add `GEMINI_API_KEY` locally and to Vercel for direct Google access, or use Vercel AI Gateway (`google/gemini-3.8-flash`) with an active billing account. Keys stay on the server. Gateway uses Vercel OIDC on deployments; refresh local OIDC through `vercel env pull` without overwriting your local database configuration.

AI runs only after a button click. Context includes at most 20 commit summaries (14,000 characters total) and six previous messages (6,000 characters total). Optional diff context is capped at four files and 1,800 characters per file. Responses stream as Markdown, with 1,200 output tokens and low thinking effort. Each member gets 20 requests per hour; failed provider attempts also count. Analytics with identical context is reused for 15 minutes. Usage token counts are saved in `ai_usage` for 30 days; MongoDB TTL indexes expire caches and request counters. No complete repository is sent. Demo mode uses labeled local previews without model calls. Review AI output against the original diff.

Run `npm run test:ai` with local MongoDB and a configured AI provider to check authenticated streaming, analytics cache reuse, and recorded token usage. It makes two small model calls and removes only the temporary QA team's data afterward.
