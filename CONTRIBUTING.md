# Contributing to LumenMarc

Thanks for taking the time. LumenMarc is a small, opinionated project and the rules below keep it that way.

## Ground rules

1. **Real data only.** No mocked responses, sample fixtures rendered as if live, placeholder numbers or hardcoded counts. When a source is unavailable the product says so; it never substitutes a default.
2. **Informational tone.** Copy is factual and neutral. Nothing in the UI or the API text may read as a recommendation, a promise of returns or a call to trade.
3. **Coinbase issues, Base settles.** Keep the issuer and the network distinct in copy and in code comments.
4. **Identity is the address.** Never derive "Coinbase-issued" from `isB20()`, the `0xB200` prefix, a name or a symbol. Only the pinned list in `artifacts/api-server/src/lib/b20/addresses.ts` counts.
5. **Unpriced stays unpriced.** A pool that is not USD-comparable gets `null` prices and no premium, in the API and in every view.
6. **Product behavior changes need an issue first.** Bug fixes and documentation improvements can go straight to a pull request.
7. **The visual direction is settled.** Restyles and redesigns are out of scope; visual bug fixes are welcome. The system is described in `docs/design/instrument-style.md`.

## Development setup

```bash
pnpm install
cp .env.example .env
pnpm --filter @workspace/api-server run dev   # API on $PORT (default 8080)
pnpm --filter @workspace/lumenmarc run dev    # UI on $PORT (default 5173), /api proxied to the API
```

Node.js 20 or newer and pnpm 10 are required. Postgres is optional and only backs the premium-history series.

## Making a change

- **API contract first.** Endpoints and response shapes live in `lib/api-spec/openapi.yaml`. After editing it run `pnpm --filter @workspace/api-spec run codegen` and commit the regenerated `lib/api-zod` and `lib/api-client-react` output. The server validates every response against these schemas, so an undeclared field is a runtime error.
- **Typecheck everything** with `pnpm run typecheck` before opening a pull request.
- **Reproduce the production build** with `pnpm run build:netlify` when you touch the API server, its entries or the build scripts.
- **Check the live integrity rules** described in the README (nullable prices for unpriced venues, feed states, thresholds) whenever you change the label engine or the snapshot worker.
- **Copy style.** Sentence case, concise, no exclamation marks, no emojis. Avoid em and en dashes in visible copy; use a colon, a comma or a full stop instead.

## Commit messages

Use a short imperative subject line, for example `Return 400 for missing required query parameters`. Explain the why in the body when it is not obvious from the diff.

## Reporting bugs

Open a GitHub issue with the URL you were on, what you expected, what you saw and the block number shown on the readings page if the report is about a value. Security problems should not go through public issues; see `SECURITY.md`.
