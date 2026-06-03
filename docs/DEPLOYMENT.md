# Deployment

This template is two independent apps. They build independently and can
deploy to different CDNs, regions, or release cadences — but federation
URLs must resolve at runtime, so a coordinated deploy is the safer default.

## URLs and env vars

Both apps read the same two `PUBLIC_*` vars at build time:

| Var                          | What it points at   | Used by                                            |
| ---------------------------- | ------------------- | -------------------------------------------------- |
| `PUBLIC_HOST_TEMPLATE_URL`   | Host app's origin   | Host self-federation, remote's federation consumer |
| `PUBLIC_REMOTE_TEMPLATE_URL` | Remote app's origin | Host's federation consumer                         |

Fallbacks live in `src/shared/config/app.constants.ts` (`ENV.DEFAULT_*_URL`) —
useful for local dev, dangerous for prod. Set the real vars at build time.

## Runtime config (preferred for prod)

Baking URLs at build time means a per-environment build. To **swap remote
URLs without rebuilding**, this template supports a runtime config endpoint
the host fetches before mounting React. See
`src/shared/lib/runtimeConfig.ts` — drop a `/config.json` next to the host
bundle:

```json
{
  "remoteTemplateUrl": "https://remote.cdn.example.com",
  "apiBaseUrl": "https://api.example.com"
}
```

The host's bootstrap fetches it, validates it (zod schema in
`shared/config/env.ts`), and overrides the federation registry before
`import('./App')`. Same JSON also serves as a deploy-time feature switch
without touching the bundle.

## Order of operations on deploy

The federation runtime fetches `remoteEntry.js` lazily — so as long as the
URL is reachable when the user navigates, the order in which artifacts go
live doesn't matter for cold loads. For **warm sessions** (user already
has a tab open):

1. Deploy remote first.
2. Deploy host second.
3. Old host pointing at old remote → both still cached, works.
4. Old host pointing at new remote → may fail if you renamed an exposed
   module. Use additive changes (deprecate, don't remove).

**Breaking federation changes** (renamed exposes, removed exposes, changed
shared singleton versions) require a coordinated cut. Bump
`STORAGE.STORE_VERSION` if the persisted shape changed; users with stale
host bundles will get a clean reload.

## Hosting targets

The host emits a static SPA bundle (`dist/`) plus `hostRemoteEntry.js`. The
remote emits `dist/` plus `remoteEntry.js`. Anywhere that serves static
files works:

- **Cloudflare Pages / Netlify / Vercel** — Set the build command to
  `pnpm build`, publish directory to `dist/`. Set
  `PUBLIC_HOST_TEMPLATE_URL` and `PUBLIC_REMOTE_TEMPLATE_URL` to the deploy
  domains.
- **S3 + CloudFront** — Sync `dist/` to a bucket, set the bucket origin in
  CloudFront, send `index.html` for 404 (SPA routing).
- **GitHub Pages** — Works but cross-origin federation needs CORS headers
  GitHub Pages doesn't set. Use a workflow that adds a `_headers` file or
  switch to Pages with Cloudflare in front.

## CORS

The remote's `remoteEntry.js` must be served with `Access-Control-Allow-Origin`
permitting the host's origin. Rsbuild dev server defaults to `*`. Production
defaults depend on the host (S3 doesn't, CloudFront can). Test by curling
the remote entry from the host's origin and inspecting the response headers.

## Versioning federated contracts

Treat federated module IDs as a public API. Adding new exposes is
backwards-compatible. Removing or renaming is a breaking change — schedule
it with the host's deploy.

`STORAGE.STORE_KEY` and `STORAGE.STORE_VERSION` are cross-template
invariants. Drift in either drops sessions in confusing ways. `pnpm check:sync`
catches this in CI.

## CI / CD checklist

A safe pipeline runs:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm check:sync` (host only; needs the remote checkout present)
6. `pnpm build`
7. Deploy `dist/` to the target.

Optional but recommended:

- Bundle-size budget (`size-limit` or rsbuild's analyzer + a threshold).
- Playwright smoke test against the deployed URL.
- Health check: GET `/index.html` and `/remoteEntry.js` (remote) /
  `/hostRemoteEntry.js` (host).

## Rollback

Because federation entries are versioned by content hash, **the safest
rollback is a redeploy of the previous artifact**, not a manual
intervention. Keep the prior `dist/` archived for at least one release.
