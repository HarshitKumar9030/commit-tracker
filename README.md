# Relay · commit-tracker

A shared pulse for a four-person hackathon crew. Track GitHub commits, delegate code reviews, see who is online, and turn the work into a presentation recap.

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

Open [localhost:3000](http://localhost:3000). Choose your identity and enter the shared code from `TEAM_ACCESS_CODE`. Configure all four real names and GitHub usernames in **Repository settings**. The defaults are examples; member IDs stay fixed when you rename people.

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

Four identities share a workspace access code, suitable for a small trusted hackathon team. Anyone with that code can select a team identity. It is not individual GitHub OAuth authentication. Keep the code within the team.

## Environment variables

| Variable                | Purpose                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `MONGODB_URI`           | Local connection or MongoDB Atlas connection string                                                                                        |
| `MONGODB_DB`            | Database name, defaults to `relay`                                                                                                         |
| `SESSION_SECRET`        | At least 32 random characters; signs seven-day HTTP-only sessions                                                                          |
| `TEAM_ACCESS_CODE`      | Your team's shared workspace code                                                                                                          |
| `ABLY_API_KEY`          | Server-only key with publish, subscribe, and presence access on `relay:workspace`                                                          |
| `GITHUB_REPO`           | Initial `owner/repository`; change it later in settings                                                                                    |
| `GITHUB_TOKEN`          | Optional for public repos; required for private repos. Use a fine-grained token with read-only Contents access to the monitored repository |
| `GITHUB_WEBHOOK_SECRET` | Random secret shared with GitHub for HMAC-SHA256 verification                                                                              |

Generate independent secrets with `openssl rand -hex 32`. Never prefix these with `NEXT_PUBLIC_`, commit `.env.local`, or paste keys into client code. Browsers receive short-lived, identity-bound Ably tokens with only subscribe and presence capabilities. A subscribe-only Ably key cannot support presence. A root key works server-side; a dedicated key scoped to `relay:workspace` is preferable. Rotate any key pasted into a conversation.

## Deploy to Vercel

1. Import [HarshitKumar9030/commit-tracker](https://github.com/HarshitKumar9030/commit-tracker) into Vercel. It detects Next.js. Use the repository root, `npm ci`, and `npm run build`; no custom server is required.
2. Create a MongoDB Atlas database and set `MONGODB_URI` to its connection string. **A Vercel deployment cannot reach your laptop's localhost MongoDB.** Allow network access from your deployment environment and use a dedicated database user.
3. Add the environment variables above in Vercel. Set a new access code and strong secrets for the deployed workspace. Use separate databases, Ably apps, and webhook secrets for preview and production if both are active.
4. Deploy, join the workspace, and configure the four names/usernames, repository, and branch in settings. Click **Sync commits** once to import recent history.
5. In the monitored GitHub repository, open **Settings → Webhooks → Add webhook**:
   - Payload URL: `https://your-domain/api/webhooks/github`
   - Content type: `application/json`
   - Secret: the same `GITHUB_WEBHOOK_SECRET` configured in Vercel
   - Events: **Just the push event**
   - Keep SSL verification enabled.
6. Push a commit. In GitHub's webhook deliveries, confirm a `200` response. Open two separate browser profiles as different teammates and verify live presence and the new assigned review.

The webhook endpoint must be publicly reachable by GitHub; a Vercel Authentication-protected preview will need the appropriate protection configuration. Standard production deployments are simplest. Ably hosts the WebSocket connections; the UI and all application APIs run on Vercel. Keys stay on the server. No sticky sessions, in-memory application database, or separate Socket.IO server is used.

MongoDB uses its unique `_id` for idempotent insertion, scoped to repository, branch, and SHA. Manual sync imports the most recent 20 commits. Webhooks import up to 100 commits from a push plus recent history. The UI shows the latest 100 stored commits for the configured branch. This is a hackathon activity feed, not a complete repository-history archive. GitHub may omit binary or very large patches; the diff dialog links to GitHub for those changes.

## Validation

```bash
npm test           # Assignment invariants and webhook signature tampering
npm run typecheck
npm run build
npm run test:live  # Local app + MongoDB + Ably must be running/configured
```

The live check exercises two actual WebSocket clients, presence, MongoDB updates, GitHub sync, duplicate ingestion, authorization, review persistence, and signed/invalid webhooks. It temporarily writes a review, restores the previous review, and uses the configured local workspace. Do not run it against a production deployment.

To start the production build locally, run `npm run build` followed by `npm start`. To restart local MongoDB, run `npm run db:start`; it checks for an existing server first. MongoDB's local log is `.local/mongodb.log`.
