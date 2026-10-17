function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Replace each explicit template marker once per occurrence, in one pass, so
// user-authored text cannot accidentally become a second template substitution.
function fillTemplate(template, values) {
  return template.replace(/__PRIVATE_[A-Z_]+__/g, (token) => {
    if (!Object.hasOwn(values, token)) throw new Error(`Missing private template value: ${token}`);
    return values[token];
  });
}

function privateDocument(template, { title, summary, status, path, slug, body, toc = "", firstHeading = "", headingCount = 0 }) {
  const values = {
    __PRIVATE_TITLE__: escapeHtml(title),
    __PRIVATE_SUMMARY__: escapeHtml(summary),
    __PRIVATE_META__: escapeHtml(status),
    __PRIVATE_PATH__: escapeHtml(path.replace(/^\/+|\/+$/g, "")),
    __PRIVATE_CASE_ID__: escapeHtml(slug),
    __PRIVATE_BODY__: body,
    __PRIVATE_TOC_ITEMS__: toc,
    __PRIVATE_HEADING_TEXT__: escapeHtml(firstHeading),
    __PRIVATE_HEADING_COUNT__: String(headingCount).padStart(2, "0")
  };
  return fillTemplate(template, values)
    .replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">');
}

function plainHeading(html) {
  return html.replace(/<[^>]*>/g, "").replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ({
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'"
  })[entity]);
}

export function collectionHtml(bundle) {
  const cards = bundle.pages.map((page, index) => fillTemplate(bundle.shell.card, {
    __PRIVATE_CARD_ID__: escapeHtml(page.slug),
    __PRIVATE_CARD_TITLE__: escapeHtml(page.title),
    __PRIVATE_CARD_SUMMARY__: escapeHtml(page.summary),
    __PRIVATE_CARD_STATUS__: escapeHtml(page.status),
    __PRIVATE_CARD_READ_TIME__: escapeHtml(page.readTime),
    __PRIVATE_CARD_PATH__: `private/${encodeURIComponent(page.slug)}`
  }).replace(/(<span class="project-index"[^>]*>)01(\s*\/)/, `$1${String(index + 1).padStart(2, "0")}$2`)).join("");
  return privateDocument(bundle.shell.collectionPage, {
    title: "Selected work", summary: bundle.collection.intro, status: "Private collection",
    path: "/private/", slug: "private-collection", body: cards
  });
}

export function pageHtml(page, body, shell) {
  const headings = [...body.matchAll(/<h([23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)]
    .map((match) => ({ id: match[2], text: plainHeading(match[3]), depth: match[1] }));
  const toc = headings.map((heading) => fillTemplate(shell.tocItem, {
    __PRIVATE_HEADING_ID__: escapeHtml(heading.id),
    __PRIVATE_HEADING_TEXT__: escapeHtml(heading.text)
  }).replace('case-toc__item--depth-2', `case-toc__item--depth-${heading.depth}`)).join("");
  // Reviewed HTML stays intact apart from adopting the same figure classes as
  // the public renderer and placing its existing headings in the shared TOC.
  const narrative = body
    .replace(/<details>\s*<summary>Contents<\/summary>[\s\S]*?<\/details>/, "")
    .replace(/<video\b[^>]*>/g, (video) => video.replace(/\s(?:width|height)="\d+"/g, ""))
    .replace(/<figure>([\s\S]*?)<\/figure>/g, (_, content) =>
      `<figure class="${/<video\b/.test(content) ? "case-video-copy" : "case-image"}">${content}</figure>`);
  return privateDocument(shell.casePage, {
    title: page.title, summary: page.summary, status: `${page.status} / ${page.readTime}`,
    path: `/private/${encodeURIComponent(page.slug)}/`, slug: page.slug,
    body: narrative, toc, headingCount: headings.length, firstHeading: headings[0]?.text || "On this case"
  });
}

export function unavailableHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow, noarchive, nosnippet"><title>Private work unavailable</title></head><body><p>Private work is unavailable.</p></body></html>`;
}

export function loginFailureHtml(styles, returnTo, shell) {
  return shell.accessPage
    .replace(/<p data-private-access-message[^>]*>[\s\S]*?<\/p>/, '<p data-private-access-message role="alert">That password did not work. Try again.</p>')
    .replace(/(<input\b[^>]*name="returnTo"[^>]*value=")[^"]*(")/, `$1${escapeHtml(returnTo)}$2`)
    .replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">');
}

// Only reviewed, allowlisted modules can enhance these authenticated slots.
export function demoHtml(demo) {
  const e = escapeHtml;
  const scenarios = demo.scenarios.length > 1 ? `<div class="private-demo__scenarios" role="group" aria-label="${e(demo.title)} examples">${demo.scenarios.map((item,index) => `<button type="button" data-demo-scenario="${e(item.query)}" aria-pressed="${index === 0}">${e(item.label)}</button>`).join("")}</div>` : '';
  const replay = demo.module === 'native-activity';
  return `<section class="private-demo" data-private-demo data-demo-url="/private/demos/${e(demo.id)}" data-demo-module="${e(demo.module || '')}" data-demo-query="${e(demo.scenarios[0].query)}" aria-label="${e(demo.title)}">
<header class="private-demo__header"><strong>${e(demo.title)}</strong><div data-demo-controls hidden><button type="button" data-demo-theme aria-pressed="false">Dark</button><button type="button" data-demo-motion aria-pressed="false">Pause motion</button><button type="button" data-demo-expand aria-haspopup="dialog">Preview full screen</button></div></header>
<div class="private-demo__controls" data-demo-controls hidden>${scenarios}${replay ? '<button type="button" data-demo-replay>Replay</button><button type="button" data-demo-pause>Pause</button>' : ''}</div>
<div class="private-demo__viewport" data-demo-viewport><img data-demo-poster src="/private/media/${e(demo.poster)}" alt="${e(demo.title)}" loading="lazy"><div class="private-demo__product" data-demo-product hidden></div></div>
<p class="private-demo__caption">${e(demo.caption)}</p>
<noscript><p class="private-demo__caption">The still above shows the design. Enable JavaScript to explore the working example.</p></noscript>
</section>`;
}
