# Security

Do not post credentials, access codes, database connection strings, or private diffs in public issues.

Report vulnerabilities using the repository's **Security → Report a vulnerability** option when available. If private reporting is unavailable, open a minimal issue requesting a private reporting channel without exploit details or sensitive data. There is no guaranteed response time or supported-version policy yet; use the latest main branch when evaluating a fix.

Relay is designed for trusted groups using a shared team code. It does not provide separate personal credentials or verify the person selecting a profile. Treat the code and invite process accordingly. See [the access model](docs/team-workflow.md).

If a secret is exposed, revoke or rotate it at the provider and update your environment. Removing it from a file does not invalidate the exposed credential.
