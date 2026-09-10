# Security policy

LumenMarc is a read-only application. It holds no user funds, asks for no wallet connection, stores no personal data and has no accounts. The attack surface is the public JSON API, the static front end and the data pipeline that reads Base, Chainlink and DexScreener. Reports about any of these are welcome.

## Supported versions

Only the `main` branch and the current production deployment at https://lumenmarc.netlify.app are supported. Fixes ship to `main` and deploy from there.

## Reporting a vulnerability

Please do not open a public issue for security problems.

1. Preferred: use GitHub's private vulnerability reporting on this repository (Security tab, "Report a vulnerability"). The report is visible only to the maintainer.
2. If that is unavailable, send a direct message to [@vaibhav_0xq on X](https://x.com/vaibhav_0xq) with a short description and a way to reach you. The maintainer will move the conversation to a private channel.

Include what you found, where (URL, endpoint or file), how to reproduce it and what impact you believe it has. A proof of concept helps; running it against the production site with real load does not.

You can expect an acknowledgement within 72 hours and a status update within 14 days. Once a fix is deployed you are welcome to publish your findings, with credit if you want it.

## What counts

Examples of reports that matter here:

- A way to make the API return a fabricated, stale or mislabeled value as if it were live (for example a lookalike token reported as Coinbase-issued, an unpriced venue shown with a USD price or a held feed reported as live)
- Injection through the `/api/check` or `/api/portfolio` inputs, including Basename resolution
- Server-side request forgery or unbounded upstream fan-out through any endpoint
- Secrets or infrastructure details exposed by the deployment
- Dependency vulnerabilities that are reachable from the shipped code

Out of scope: rate limiting on the public endpoints beyond what the CDN cache provides, findings that require a compromised upstream (Base RPC, Chainlink, DexScreener) and issues in third-party sites that LumenMarc links to.

## Handling secrets

The application runs without any secret. `DATABASE_URL` and `CRON_SECRET` are optional deployment settings and are read from the host's environment only. Never commit them; `.env` is ignored by git and `.env.example` holds no values.
