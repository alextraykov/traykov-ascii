# Skills for building presentations in code

Ten skills for Claude Code. Each one plans a technique into your own presentation, waits for your approval, then builds it on your own screen component.

| Skill | Use it for |
|---|---|
| presentation-planner | Turning a design argument and a real screen into a slide plan that uses the skills below |
| coded-presentation-setup | The deck itself: the real screen, steps in the URL, motion tokens, reduced motion |
| camera-zoom | Flying a camera between parts of a live screen |
| live-anchors | Rings and leader lines tied to live elements |
| layer-tagging | Tagging every surface with the level it sits on |
| orthographic-breakdown | Exploding the screen into its levels with CSS 3D |
| level-pointing | Letting people point at a level: lift, dim, leader and zoom |
| blueprint-mode | Fading the paint to show the structure |
| one-screen-before-after | Before and after on one live screen with a switch |
| frame-check | Checking every frame before anyone sees it |

## Install

Copy the folders into one of these places:

- `~/.claude/skills/` to use them in every project;
- `.claude/skills/` in a project to use them there only (and share them with the project).

Each folder holds one `SKILL.md`. Its `name` and `description` tell Claude Code when to use it.

From the folder that holds `skills/`:

```bash
# every project
mkdir -p ~/.claude/skills && for d in skills/*/; do cp -R "${d%/}" ~/.claude/skills/; done
# one project (run it from the project's root, with the path to skills/ adjusted)
mkdir -p .claude/skills && for d in skills/*/; do cp -R "${d%/}" .claude/skills/; done
```

The loop copies the skill folders only, not this README.

## Use

Start with presentation-planner: give it your argument in one sentence and point it at your screen component. It proposes a slide plan and waits. Once you approve, it builds the deck with the other skills, and each of them proposes its own details and waits again before it builds.
