# Presentations in code

Working reference material for Presentations in code: a 13-slide, 45-state tutorial and ten unchanged skills. The portfolio website uses these same live components in a continuous, responsive teaching page.

## Open the deck

On macOS, double-click `Open deck.command` (right-click → Open if macOS asks). It starts a server on an available local port and opens its own copy. Keep its Terminal window open while using the deck; press Control-C to stop it.

On any computer with Python 3, run `python3 -m http.server 8765 --bind 127.0.0.1` in this folder, then open `http://127.0.0.1:8765/deck/#making-of?slide=1`.

The deck uses modules and needs a local HTTP server. Opening index.html with file:// will not run it.

## Present

Arrow keys, space and Page Up / Page Down move one step at a time. Nothing changes by itself after the opening. Tab reaches the slide controls; Enter or space presses them. Slides 8, 9 and 12 use up/down to move through their lists.

Each technique has four steps: see it, why it helps, the skill, and what goes wrong. Each technique's third step has a Copy skill button; slide 12 has all ten.

Jump directly with `#making-of?slide=7&step=4` (slide numbers start at 1; steps start at 0). Add `&motion=reduce` to see every state without motion. The deck also follows the system's reduced-motion setting.

The original presentation uses a 1920 × 1080 canvas that scales to the window. Use a wide window for presenting. The portfolio website has native chapter navigation, live component demonstrations and readable skill disclosures. Click the actual Input, Panel or Cards to frame them, attach a measured note, or switch the whole design state. Normal-size in-screen controls return to the overview, change state and start/stop the original frame checker. The website adapts camera framing to each complete component; the original deck retains its authored close-ups and timing.

## Files

- `deck/`: the working compiled tutorial, its original CSS and blueprint image, local fonts, and a small host adapter.
- `web/`: the documented website primitive adapter and five captured fallback views.
- `skills/`: ten original SKILL.md files and their installation guide, unchanged.
- `posts.md`: the original three short technique posts, unchanged.
- `provenance.json`: source hashes and the integration changes.
- `NOTICE.txt`: provenance and licensing scope.

Start with `presentation-planner`. See `skills/README.md` for installation.

## License

Alexander Traykov’s authored tutorial, skills, posts and host adapter are MIT licensed. Third-party runtime and font licenses are retained separately; see `NOTICE.txt` and `LICENSE.txt`.
