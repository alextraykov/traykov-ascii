# Site vs specimen: gaps after the first round 3 pass

17 October 2026. Each line compares the live component with `motion-specimen.html` and `component-specimen.html`. The specimens are the source of truth. A line is checked only when the site matches the specimen in a side-by-side capture.

## Home
- [x] Entry rail: one 6px cell per entry. The current entry is solid, earlier entries are light, and later entries are empty.
- [x] Entry tabs (Blocks / Pixel dither / How it's built): a dither handoff. The new tab dithers in from the left while the old one dithers out, and the panel arrives with a band sweep.
- [ ] "Open case →" is a quiet action at the right of the tab row.
- [x] Entry media: a band sweep on entry and a point refresh on hover (R5).

## Navigation
- [x] The current page is a cell rule (a row of small cells) under the link. Hover fills the rule in reading order, and choosing a link hands the rule over.
- [x] The theme icon's interior dithers when flipped.
- [x] Phone: **decided 17 Oct 2026, keep the five visible links.** The recruiter-facing links stay on screen, and the browser contract is unchanged. The specimen's Menu is not used.

## Buttons and links
- [x] Inline links in prose use the dither rule, which turns solid on hover.
- [x] Quiet actions: the arrow nudges in three steps.

## Case opening
- [x] A status chip with a density cell (■ Launched, ▓ Closed beta, ░ Prototype, · Archived), then "· 15 min read".
- [x] The back link is a quiet action with a dither rule.
- [x] Facts sit on dither rules (a dotted top rule), with no hairline boxes.

## Case evidence
- [x] Figure captions: a Departure label ("Fig. 2"), a bold lead and a soft note. One hairline between media and caption.
- [ ] Compare: the divider is a dither rule. (N/A today: the site's compare is a switch, not a slider.)
- [x] Quote: a dither rule at the left; the source in Departure 11.
- [x] Stat: pixel numerals that count once.
- [x] Video: a play cell button, a cell scrubber (played = solid, buffered = light dither) and Departure time.

## Case index
- [x] Desktop rail: cell, Departure number and title per row; the reading cell fills as you read; "% read".
- [x] Phone: a strip with the number at 22px, the title resolving through ░ ▓, a Contents button and a 30-cell progress row. The sheet switches on.

## Moving on
- [x] Sibling cases: "Previous case ← Title" on the left and "Next case Title →" on the right, titles in Departure 22, between hairlines.
- [x] Contact prompt: a Departure line, primary "Write to me" and secondary "Book a call".

## Lists
- [x] Notes rows: one line, with the Departure title on the left and the date in Departure 11 on the right. One rule beneath. Hover is the marker plus the step aside.
- [x] Labs: rows, not cards. The screen thumbnail is on the left, the Departure title and description in the middle and "Open →" on the right. Screens band-sweep in.

## Forms
- [x] A label and a line. Focus draws the line solid in reading order.
- [ ] The select has a cell chevron. The checkbox is a cell. A character count appears in Departure.

## Tools
- [x] Sliders on cell tracks (as in the SVG studio) in every Labs tool.

## Feedback
- [ ] Toast: switches on from a dot, holds, then afterglows out.
- [x] Empty state: a cell icon, "Nothing here yet" and a plain sentence.
- [ ] Loading text drawn as dithered bars.

## Footer and 404
- [x] "Back to top · 99% down".
- [x] 404: a large "404" built from block cells, "This page isn't here." and links to the work and the notes.

## Motion
- [x] Media band sweep on entry (R1); dither dissolve for featured images (R4); afterglow for rows that leave (R7).
- [ ] Loaders: a dither bar for known progress, a sweep for unknown, a quarter turn while sending, and a mosaic poster for video.

## Status after the second pass (17 October 2026)

Still open:
- "Open case →" beside the entry tabs. Home keeps its existing quiet actions there.
- The select's cell chevron (tool selects use a drawn chevron).
- The contact character count.
- Toast.
- Loading text.
- Mosaic video poster.
