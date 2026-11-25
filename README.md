# Relay

A shared workspace for hackathon teams to follow code changes, review commits, document architecture, and prepare their demo.

Built with Next.js, React, TypeScript, MongoDB, and Ably. Self-host on Vercel or run locally.

## What it does

- **Commit feed:** import GitHub commits, inspect diffs, copy changes, and assign reviews.
- **Review routing:** rotate between developers, choose a fixed reviewer, or assign manually.
- **Code index:** detect functions and components from diffs, then add Markdown explanations.
- **Presentation:** turn saved explanations and review notes into an exportable project recap.
- **Shared canvas:** draw with a stylus, stream sketches to teammates, and save boards in MongoDB.
- **Files:** share Google Drive file and folder links, with categories, notes, previews, and archive/restore.
- **Presence:** see connected teammates and their current tasks over WebSockets.
- **Optional AI:** stream Markdown chat responses and generate activity analytics using Gemini.

Teams support 1–20 profiles. The optional starter setup has two developers, a code maintainer, a presenter, and a shared tablet profile. Names, responsibilities, and review eligibility are editable.

## Quick start

Use Node.js 24 LTS and npm. MongoDB is required for live teams; Ably enables presence and canvas previews.

```bash
git clone https://github.com/HarshitKumar9030/commit-tracker.git
cd commit-tracker
npm ci
cp .env.example .env.local
```

For a live workspace, fill in `MONGODB_URI` and generate a session secret:

```bash
openssl rand -hex 32
```

Put the result in `SESSION_SECRET`. Add your Ably key for realtime features. If using a local MongoDB Community installation:

```bash
npm run db:start
```

Then start Relay:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). Create a team using your repository and profile, then invite teammates from **Team settings**. Share the team access code separately from the invite link.

### Try without credentials

Open [localhost:3000/?demo=1](http://localhost:3000/?demo=1) for illustrative commits, index records, and a presentation walkthrough. Demo changes stay in your browser and make no GitHub or AI requests. Missing core server configuration also starts demo mode.

## Configuration and deployment

- [Environment variables and Vercel deployment](docs/deployment.md)
- [Team workflow and access model](docs/team-workflow.md)
- [Architecture and repository map](docs/architecture.md)
- [Contributing](CONTRIBUTING.md)
- [Security reporting](SECURITY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)

### GitHub sync

Use **Sync commits** to import repository activity. For automatic updates, configure a push webhook with `application/json`, your team's webhook URL from **Team settings → Repository & invites**, and `GITHUB_WEBHOOK_SECRET`. A read-only GitHub token is required for private repositories and recommended for public API limits. Relay reviews are internal; they do not create GitHub reviews or block merges.

## Development

```bash
npm test
npm run typecheck
npm run build
```

Integration checks require a running local app and configured services. See [CONTRIBUTING.md](CONTRIBUTING.md) for service requirements and scripts. CI runs unit tests, type checking, and a production build without live credentials.

## Limits to know

Relay uses a **shared team code**, not individual OAuth accounts. Anyone with that code can select a team profile; use it with trusted groups. The code index reads available diff declarations rather than parsing the entire repository. Drive links retain Google's access rules, and uploading happens in Drive. AI is optional and receives bounded commit context only after a user action.

## License

[MIT](LICENSE). The bundled Manrope font is licensed separately under the [SIL Open Font License](public/fonts/OFL.txt). Third-party dependencies retain their own licenses.
