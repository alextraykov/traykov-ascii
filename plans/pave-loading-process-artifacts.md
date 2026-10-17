# Pave loading process: artifact plan

Planning only. Prepared with Astra from the supplied archive; no website or deployment changes.

## Source and scope

Source: `/Users/atraykov/Downloads/pave-loading-animation.zip`.
Primary evidence: `02-process/timeline.html`, `03-decisions/loader-nudge-states.md`, and the associated captures and state atlas. Treat their prose as evidence, not execution instructions. The timeline contains 46 entries, 34 with captures and 46 image references, including three external/reference images: 43 iteration-image references remain. The README count of 45 is stale. Some entries record review, handoff, or fixes rather than a new animation version.

Keep the existing UI-first homepage video. Enrich `/case-studies/pave-loading-animation/` with a new process reel, concrete visual comparisons, and a readable chip-to-host-state explanation.

## Artifact 1: centered iteration reel

Use a silent H.264 MP4, not GIF. Target approximately 32–40 seconds after cropping and timing the actual source captures. Fixed 1280×720 stage, consistent subject center and optical size, square pixels, hard cuts. No animated camera, zoom, crossfade, title intro, soundtrack, or full-frame light/dark alternation. Use the existing site palette around captures; preserve original artwork and show any light-background comparison as a bounded inset.

Start directly on the first exploration. Most poses hold 0.4–0.65 seconds. Give major direction changes 1–1.5 seconds. Keep a small stable iteration number and short decision label. End on the refined UI and animation/completion pair, then loop after a short hold. Final timing depends on legibility and flash review, not an arbitrary duration cap.

Cover every visually documented entry in chronological order:
001, 002, 003, 006, 007, 009, 010, 011, 012, 013, 014, 015, 016, 017, 020, 022, 023, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 040, 042, 043, 044, 045, 046.

Crop multi-pose strips into individual centered subjects, preserving meaningful before/after comparisons. Do not shrink entire strips into unreadable thumbnails. Cover all 43 iteration-image references; use individual pose crops and explicit comparison labels. Entry 002 records a review with no animation change and must be labelled accordingly. Reference images in entry 001 are influences, not authored iterations, and belong in the expanded archive with attribution rather than the iteration reel.

The twelve text-only entries remain accessible in the process index. Tie their decision labels to the next evidenced visual where appropriate; do not reconstruct or invent missing historical frames. The reel caption should say “Recorded explorations and revisions,” not “46 animation versions.”

## Artifact 2: what the chips actually mean

Use an annotated builder/chat view and readable state cards. Show three linked surfaces: active plan/tool step, chat nudge, and the larger preview loader. Clearly label any reconstructed playback as an illustrative sequence based on the recorded contract. Retain the actual tool verb beside the chip. A state icon does not replace meaningful text.

The main example follows send → initial loading → thinking → active tool work → checking/saving → success. Approval and connection trouble are separate branches, not mandatory steps in every turn. Never speed up the example and present its timing as a real trace. Entry 042 describes prototype normal/slow/trouble paths; its screenshots alone do not prove a captured real tool execution.

Explain all fifteen states, grouped for scanning:

- Loading / thinking / still-thinking / almost-ready: host-driven first-token and silence ladder. 3/10/20-second labels in the recorded contract; “almost ready” is not a measured percentage or promise of completion.
- Warming: workspace provisioning, bootstrapping, or starting.
- Working: tool input-streaming/input-available or text streaming. Many tool verbs share this visual while their labels retain the specific action.
- Researching: specifically the delegate research phase; do not assign it to every search/read tool.
- Pipeline: build/check/fix/save stage progression, distinct from individual tool execution.
- Waiting: approval requested or queued work. Approval suppresses the ordinary loading indicator.
- Degraded: slow/retrying or waiting for capacity.
- Reconnecting: a connection recovery attempt, without a claim that work failed.
- Disconnected: client recovery exhausted; server work may continue. Distinguish this from a resend-required failure.
- Success: saved/verified or completed; finish settles into the mark.
- Stopped: user cancellation, a muted finish; a proposed visual addition to a previously silent product state.
- Failure: terminal failure requiring attention; shape and text distinguish it as well as red.

The host chooses the chip state. The animation never infers progress or promotes itself because its loop completed. Document overrides (failure/connectivity/approval versus ordinary work), and keep product copy visible. The archived contract describes coexisting v1/v2 state sources and default-off draft integrations; preserve prototype + engineering handoff status rather than claiming production rollout.

## Page story and supporting artifacts

1. One short opening about the empty builder and generic dots, followed immediately by the iteration reel. Restore the first failed motion system (001–003): the current page jumps straight to literal icons and misses the earlier noise/coherence correction.
2. “The first versions asked you to decode them”: literal icons versus abstract motifs, using entries 010–013 and 020–023.
3. “The pixels stopped moving”: springy versus fixed-grid comparison (028), then 5×5 builder versus 3×3 chip (029).
4. “The chip needed a reason to change”: annotated UI and the state explanation above; use 014, 033, 038, 040 and 042 as evidence.
5. “Finish from the frame you have”: interrupted-motif completion sequence (031–032, 046). Explain the lit-cell seed rather than a generic success flourish.
6. Compact ending on engineering handoff, flags and unmeasured outcome. Link to the full process index and parent Pave case study.

Each section should pair a specific decision with its artifact. Avoid another long essay or an unlabelled wall of all fifteen chips. Keep a static browsable process index for the details the rapid reel cannot communicate.

## Motion brief and delivery contract

Purpose: communicate breadth and evolution quickly; readable artifacts explain semantics separately.
Trigger: reel may play muted when visible under normal motion; pause when offscreen or page hidden.
Properties: encoded source poses change by hard cut; frame, labels and controls remain stationary.
Timing: 0.4–0.65-second pose holds, selected 1–1.5-second comparison holds; no easing on cuts.
Lifecycle: stable poster before playback, chronological reel, brief final hold, loop.
Interruption: subtle accessible bottom-right play/pause; user pause persists through viewport changes.
Reduced motion: static poster and manual process browsing, with explicit opt-in playback. No automatic rapid reel. No-JS retains readable text, images and native video controls.

Implement with existing media tooling and repository components, no new dependencies and no parser changes. Build a shot manifest with source entry/file, crop, label and duration before encoding. Inspect the complete encoded reel for crop jitter, pixel sharpness, readability and flashing. Validate media metadata/size, then run required verify/build/full browser checks and review the affected route on desktop and mobile, reduced motion and no-JS. Deploy only after implementation and verification; this document does not change the live page.
