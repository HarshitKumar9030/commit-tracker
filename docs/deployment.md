# Configuration and deployment

## Environment variables

Copy `.env.example` to `.env.local`. Never commit populated environment files.

| Variable                | Purpose                                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| `MONGODB_URI`           | MongoDB connection string; local MongoDB or Atlas                          |
| `MONGODB_DB`            | Database name; defaults to `relay`                                         |
| `SESSION_SECRET`        | At least 32 random characters for signed seven-day sessions                |
| `ABLY_API_KEY`          | Server-side realtime key                                                   |
| `GITHUB_TOKEN`          | Optional for public repos; read-only Contents access for private repos     |
| `GITHUB_WEBHOOK_SECRET` | Independent secret matching the GitHub push webhook                        |
| `GITHUB_REPO`           | Optional legacy workspace fallback, `owner/repository`                     |
| `TEAM_ACCESS_CODE`      | Optional legacy `workspace` code; new teams store a hashed code in MongoDB |
| `GEMINI_API_KEY`        | Optional direct Google Gemini API key                                      |
| `AI_GATEWAY_API_KEY`    | Optional alternative AI Gateway key; provider billing may apply            |

Generate independent secrets with `openssl rand -hex 32`. Keep them server-side. Configure the Ably key for publish/subscribe on `relay:*`, `relay-canvas:*`, and `relay-canvas-live:*`, plus presence on `relay:*`. Clients receive scoped temporary tokens: workspace subscription/presence, durable canvas subscription, and live drawing publish/subscribe.

Use a dedicated database user with access only to this application's database. Keep MongoDB connection credentials in environment variables. Local MongoDB started by `npm run db:start` stores data under ignored `.local/mongodb` and listens on `127.0.0.1`.

## Vercel

1. Fork the repository and import your fork into Vercel.
2. Use the repository root, Node.js 24, `npm ci`, and `npm run build`.
3. Configure MongoDB Atlas (Vercel cannot reach your computer's localhost database).
4. Add the environment variables above to the intended deployment environments.
5. Deploy, create a team, add profiles, and configure its GitHub push webhook.
6. Verify sync, review routing, presence, and canvas persistence with your own team.

No custom WebSocket server runs on Vercel: Ably carries realtime events, while Next.js route handlers persist data in MongoDB. Google Drive link sharing requires no OAuth or Google API keys.

## Local repository watcher

When GitHub cannot reach localhost, configure `WATCH_TEAM_ID`, `WATCH_MEMBER_ID`, and `WATCH_TEAM_CODE` in `.env.local`, then run `npm run watch:repo`. Use your real team/profile IDs; no profile name is assumed. The watcher syncs using your existing server-side GitHub token.

## Optional AI

Set `GEMINI_API_KEY` for direct Gemini access, or configure AI Gateway. Check the model configuration in `app/api/ai/route.ts` before enabling a provider. AI runs on explicit requests, uses bounded summaries/history and optional limited diff excerpts, and streams Markdown. Identical analytics are cached for 15 minutes; per-member requests are limited to 20 per hour. Usage records expire after 30 days. Provider availability, pricing, and quotas depend on your account.
