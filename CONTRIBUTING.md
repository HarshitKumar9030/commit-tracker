# Contributing to Relay

Bug fixes, documentation improvements, and focused features are welcome. For a substantial change, open an issue describing the problem and proposed behavior first.

## Setup

Follow [README.md](README.md) and [deployment configuration](docs/deployment.md). Use Node.js 24 and `npm ci`. Demo mode needs no live service credentials. Keep `.env.local`, database files, screenshots containing private data, and API keys out of commits.

## Changes

- Keep the existing Next.js App Router structure and domain logic in `lib/`.
- Read `AGENTS.md` and the installed Next.js guides before framework changes.
- Use generic example identities. Preserve names entered by real users.
- Keep UI copy direct and maintain the existing flat visual style.
- Validate permissions and input on the server, including team isolation.
- Add meaningful regression coverage for changed behavior.

Before opening a pull request:

```bash
npm test
npm run typecheck
npm run build
npx prettier --check app components lib scripts tests '*.ts' '*.json' '*.md' docs .github
```

For rendered changes, check desktop and narrow layouts, keyboard controls, and browser errors. Include what changed and how you verified it in your pull request.

## Integration checks

Start the local app and MongoDB first. These checks create disposable QA teams and clean up their own records:

| Script                | Services needed                                                  |
| --------------------- | ---------------------------------------------------------------- |
| `npm run test:teams`  | MongoDB and Ably token configuration                             |
| `npm run test:files`  | MongoDB; Ably refresh is optional                                |
| `npm run test:canvas` | MongoDB and a working Ably key; uses actual clients              |
| `npm run test:ai`     | MongoDB and an AI provider key; makes small billable model calls |

`npm run test:live` is a legacy local-workspace smoke check: it syncs GitHub and temporarily writes a review before restoring it. Supply `TEAM_ACCESS_CODE`, `TEST_MEMBER_ID`, `TEST_SECOND_MEMBER_ID`, and working GitHub/Ably credentials. Do not run it against a production workspace.

## License

By contributing, you agree that your contributions are provided under the repository's MIT license. Preserve third-party notices, including the bundled font's OFL license.
