# Private work access

The public entry points (the "Private work" block on Home and on Designing Pave) render only when the build sets `PUBLIC_PRIVATE_WORK_ENABLED=true`. Leave it unset until the host has `PRIVATE_WORK_PASSWORD_HASH`, a session secret of at least 32 bytes, `PRIVATE_WORK_WAF_CONFIGURED=1` and a prebuilt bundle (below). Otherwise `/private/` fails closed with a 503, and the links would lead nowhere. `/private-access/` itself stays routable either way.

`/private-access/` is a generic public password form. `/private/`, its two allowlisted study paths, and every private media response are served by `api/private-work.js`; Astro never builds their HTML or media into `dist/`.

## Private input schema

Put curated input in the ignored `private-work-source/` directory. It must contain this shape:

```json
{
  "version": 1,
  "collection": {
    "intro": "A short private collection introduction."
  },
  "pages": [
    {
      "slug": "pave-unified-building",
      "title": "Fixture study one",
      "summary": "A factual, private summary.",
      "status": "Private review",
      "readTime": "8 min read",
      "htmlFile": "pages/pave-unified-building.html"
    },
    {
      "slug": "pave-redesign",
      "title": "Fixture study two",
      "summary": "A factual, private summary.",
      "status": "Private review",
      "readTime": "8 min read",
      "htmlFile": "pages/pave-redesign.html"
    }
  ],
  "media": [
    {
      "id": "study-one-hero",
      "file": "media/study-one-hero.jpg",
      "contentType": "image/jpeg"
    },
    {
      "id": "study-one-film",
      "file": "media/study-one-film.mp4",
      "contentType": "video/mp4"
    }
  ]
}
```

Pages are already rendered HTML, so this path does not introduce another Markdown parser. A page must contain at least 500 characters of readable narrative. Reference an asset only with `{{private-media:study-one-hero}}`; the builder replaces it with the authenticated media route. It rejects raw `src` or `poster` paths, scripts, iframes, event handlers, unknown placeholders, source/archive/transcript names, ZIPs, unsupported file types, and individual media files larger than 4.5 MB.

The schema deliberately requires exactly two pages for this release: `pave-unified-building` and `pave-redesign`. Keep private titles, narrative, source filenames, and asset records inside the ignored input rather than this tracked document.

## Build and local review

`npm run build` runs Astro first, then `scripts/build-private-work.mjs`. With curated local input it emits `.private-work/`, a Git-ignored server-only bundle. With no source it emits an unavailable bundle, so a normal public checkout cannot expose fixture or confidential content.

The handler accepts an original `/private/...` pathname both bare and with `action=route`, as well as Vercel's rewritten `/api/private-work?action=route&privatePath=...` form. It derives an original private pathname first when present. Login and logout remain available only on the exact `/api/private-work` endpoint and reject any private-route marker, so an auth action cannot be smuggled through a rewritten private path.

For a deterministic local access check without any private input:

```sh
npm run check:private-work
```

That command builds the public site, creates a temporary dummy bundle, and drives `scripts/private-work-dev.mjs`. The bridge serves `dist/` for public routes while passing `/private/` and `/api/private-work` to the same handler used by Vercel. It runs login, logout, both themes, no-JavaScript deep links, and authenticated media in Chromium and WebKit.

The local bridge explicitly enables a separate `private-work-preview` cookie for direct HTTP loopback connections. This avoids Safari rejecting a Secure cookie on a local HTTP preview. The preview cookie keeps `HttpOnly`, `SameSite=Lax`, `/` scope, signing, expiry and password rotation. It is allowed only when both ends of the socket and the Host header are loopback, there are no forwarding headers, and no hosted Vercel environment is active. All hosted production/preview traffic keeps `__Host-private-work; Secure`; the handler never reads the local preview cookie there. `PRIVATE_WORK_LOCAL_PREVIEW` is set by the local bridge, not a hosted configuration option.

For a local manual check after a source build:

```sh
npm run build
node scripts/private-work-dev.mjs --port 4321
```

Do not add `private-work-source/` to `public/`, the Astro content tree, Git, or source maps. `.vercelignore` excludes raw input. `.private-work/` remains intentionally outside `.vercelignore`; `vercel.json` uses `includeFiles` to package it only with `api/private-work.js`.

For an explicit prebuilt deployment, create the public output and bundle in the upload context, then set `PRIVATE_WORK_PREBUILT_BUNDLE=1` for the Vercel build/deploy step. That mode validates the existing bundle and updates only its current public CSS references; it never substitutes dummy content. A Git-only remote build with no supplied bundle remains unavailable. A typical local prebuilt flow is:

```sh
PRIVATE_WORK_PREBUILT_BUNDLE=1 vercel build
vercel deploy --prebuilt
```

Run the deployed access proof separately before release. It must cover the canonical domain and every deployment alias.

## Hosted configuration

Set these server-only environment variables in Vercel. Do not use a plaintext password variable.

| Variable | Requirement |
| --- | --- |
| `PRIVATE_WORK_PASSWORD_HASH` | `scrypt$16384$8$1$<salt-base64url>$<digest-base64url>` generated offline with `createPasswordHash()` from `server/private-work/session.js`. |
| `PRIVATE_WORK_SESSION_SECRET` | A random secret at least 32 UTF-8 bytes long. |
| `PRIVATE_WORK_SESSION_TTL_SECONDS` | Optional bounded TTL: 300–86,400 seconds; defaults to 28,800. |
| `PRIVATE_WORK_ALLOWED_ORIGINS` | Optional comma-separated exact additional origins. |
| `PRIVATE_WORK_WAF_CONFIGURED` | Set to `1` only after the Vercel WAF rule below is active and tested. |

Changing either the password hash or session secret invalidates existing sessions. Cookies are `HttpOnly`, `Secure`, `SameSite=Lax`, path-scoped to `/`, signed with HMAC-SHA-256, and include a fingerprint of the password hash.

Before setting `PRIVATE_WORK_WAF_CONFIGURED=1`, create and test a Vercel WAF rate-limit rule for every route that can reach the function: `POST /api/private-work`, `POST /private`, and `POST /private/*` (including trailing-slash and deployment-alias variants). Start with 10 requests per 10 minutes and a block action, then tune from legitimate traffic. Vercel's documented rate limiter is the durable cross-instance control; the handler does not claim an in-memory counter is distributed. Hosted production and preview requests fail closed at login whenever this explicit WAF activation assertion is absent. See [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).

## Release proof still required

Local checks prove handler behavior only. Before release, test a fresh browser, incorrect and correct password, deep-link return, explicit lock, password and signing-key rotation, direct function access, direct page/image/poster/video URLs, `HEAD`, single and suffix ranges, traversal attempts, and no-store headers on both custom domains and every deployment alias. Confirm the WAF covers the rewritten `/private` paths and direct API endpoint on each alias, and confirm that old aliases and deployments are removed or updated when access is revoked.

## Reviewed native demonstrations

Private narrative input can contain `{{private-demo:id}}`. The builder resolves this against the explicit `demos` manifest list, validates the poster against the media allowlist, and requires any `module` identifier to name an allowlisted JavaScript asset. It emits native mount slots, visible example buttons, a product-only full-screen preview, and a readable still for no-JavaScript or failed loading. Raw scripts, styles, frames, objects, and event handlers in narrative input remain rejected.

The reviewed source, native modules, React components and bundled dependencies remain under ignored `private-work-source/`. Only the explicitly listed assets are copied into `.private-work/demo-assets/`; none enter `public` or `dist`. Source modules are regular authenticated ES modules, not evaluated HTML. The neutral public loader knows no confidential source, scenario inventory or product text. Each product mounts in an isolated shadow root. Source styles and ids cannot affect the portfolio or other demos.

`/private/demo-assets/:id` authenticates before serving GET or HEAD, including direct function requests. It uses private no-store responses, exact content types, no sniffing, and identifier/path allowlists. The private page prohibits frames and external network resources. The older allowlisted HTML documents remain authenticated, unlinked archival material under a restrictive sandbox policy; they are not embedded. The public-output check also scans for private module filenames and complete source bytes.

Full-screen preview moves the existing native product into a modal dialog, preserving input and state. It has an unobtrusive close control, Escape, focus restoration and no editorial wrapper. Product source forms never submit real account, build or deployment operations. Source buttons that had no implementation remain illustrative; the portfolio does not invent production behavior for them.

The site and OS motion preferences reach every module. Blueprint uses the original static drawing path; activity settles immediately to its complete state. Enabling motion restores future motion, and Replay starts a new scripted turn. Normal activity playback pauses offscreen and resumes only if it was playing before suspension. Explicit Pause is one-way; Replay is always available. No automatic replay is forced on a reader returning to settled content.

The current tool-call demonstration combines the supplied full-build event stream with the later Combined thinking renderer. Both Today and Proposed appear together. Focused controls seek to repeated work, folded kinds returning, failures, and inline approval. The homepage comparison uses the original earlier HomeScreen component and the first-build Blueprint source. The surface comparison uses the supplied PaveScreen component tree and token assignments, with small recovered adapters and responsive containment. It is a source adaptation, not a claim of pixel-identical production rendering.

Detailed source hashes, recovered module provenance, scope, and adaptations live in the ignored `review/native-adaptation-20261012.json`. Regenerate the plain-JavaScript adapters with `python3 private-work-source/demos/build-native.py`. The private surface build helper uses the original source workspace's installed React/lucide dependencies and the existing portfolio esbuild; it adds no portfolio dependency. Its generated asset is supplied to the normal private builder.

Run `node scripts/private-demos-browser.mjs` after a normal build. It uses an ephemeral local session, does not rebuild public output, and checks native mounting, coded before/after, paired renderers, five-chip limit, keyboard expansion, full-screen/input preservation, rapid example changes, offscreen replay progression, themes, reduced motion, mobile, no-JavaScript, and no external requests. A controlled-clock pass also checks terminal history without scheduled replay, progressive thought text, the absence of a live tail after completion, and bounded resize/approval observers across scene changes and destruction. `PRIVATE_DEMO_BUNDLE_DIR` can select an isolated copy of the built private bundle without modifying ongoing build output. Evidence defaults to `/private/tmp/private-demo-evidence`. `npm run check` remains the full handoff gate.
