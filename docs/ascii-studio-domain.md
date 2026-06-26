# ASCII Studio Domain Plan

Target: `ascii.traykov.cc`

Current check on 2026-06-15:

- `traykov.cc` resolves to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`.
- `ascii.traykov.cc` has no visible DNS answer yet.

## Preferred Setup

Run ASCII Studio as a standalone static app at the subdomain.

1. Build from `apps/svg-ascii-studio`.
2. Deploy its `dist/` output to a separate static site/project.
3. Add `ascii.traykov.cc` as the custom domain in the hosting provider.
4. Add a DNS record:
   - If the host gives a CNAME target, set `ascii CNAME <provider-target>`.
   - If the host gives A/AAAA records, set those on `ascii`.
5. Keep the portfolio route `/svg-ascii-studio/` as an entry point or redirect to `https://ascii.traykov.cc/`.

This keeps the builder isolated from the portfolio deploy, lets the tool have root-path URLs, and makes share/export links cleaner.

## Portfolio-Hosted Alternative

Keep the current route at `https://traykov.cc/svg-ascii-studio/` and add a provider-level redirect from `https://ascii.traykov.cc/` to that path.

This is simplest if the current host supports domain redirects. It is less flexible for future share URLs because the canonical builder still lives under the portfolio path.

## App Changes When Moving

- Set the standalone Astro app `site` to `https://ascii.traykov.cc`.
- Keep export/share URLs using the current origin so localhost, preview, and production all work.
- Add a canonical link for whichever URL becomes primary.
- Add security headers at the host:
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

The CSP still allows local SVG preview/export through `data:` and `blob:` image URLs while blocking plugins, object embeds, remote scripts, and framing.
