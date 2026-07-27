# Substack notes sync

Substack is the publishing source. The portfolio reads the public feed during each
static build and generates:

- `/notes/`
- `/notes/[slug]/`
- `/notes/search.json`
- `/rss.xml`

Substack posts remain canonical. The portfolio copy exists for on-site reading
and search.

Eight posts recovered from the former `alextraykov/traykov.cc` repository are
stored in `src/content/notes/legacy/`. Legacy posts use local canonicals. If a
Substack post has the same slug or normalized title, the Substack version wins.

## Automatic refresh

The scheduled workflow in `.github/workflows/refresh-substack-notes.yml` asks
Vercel to rebuild every six hours.

One external setup step is required:

1. In the Vercel project, create a Deploy Hook for the production branch.
2. In the GitHub repository, add its URL as the Actions secret
   `VERCEL_DEPLOY_HOOK_URL`.
3. Run `Refresh Substack notes` manually once to verify the hook.

New Substack posts then appear on the portfolio after the next scheduled rebuild.

## Local preview

`src/content/notes/prompting-is-not-taste.json` is a temporary preview for the
unpublished note. Feed entries win by slug, so publishing a Substack post at:

`/p/prompting-is-not-taste`

automatically replaces the preview during the next build.
