# Hypothetical Effort Example

This is a made-up worked example for explaining the arithmetic in the master
prompt. The numbers are not measured Codex or Claude performance, a quote, or a
promise. Both provider rows use the same uncalibrated baseline because no
project-specific provider evidence exists.

## Scenario

A project has three leaf work items after review planning. `W-101` and `W-102`
can run in independent lanes; `W-103` depends on both:

- `W-101` — add a contract guard;
- `W-102` — improve a UI recovery state; and
- `W-103` — add migration telemetry, dependent on `W-101` and `W-102`.

The finding records that motivated these items are evidence inputs, not build
units. A parent “reliability improvements” rollup is a navigation label and
has no extra effort. Only the three leaf items are summed.

## Leaf-item ranges

| Leaf item | Codex low / likely / high (agent-hours) | Claude low / likely / high (agent-hours) | Dependency |
| --- | ---: | ---: | --- |
| W-101 | 5 / 7 / 10 | 5 / 7 / 10 | Review gate |
| W-102 | 8 / 11 / 16 | 8 / 11 / 16 | Review gate |
| W-103 | 9 / 12 / 20 | 9 / 12 / 20 | W-101 and W-102 |
| Leaf subtotal | 22 / 30 / 46 | 22 / 30 / 46 | Findings excluded |

Each leaf range includes its own discovery/spike, build, integration, review,
verification, and item-local uncertainty. The scenario separately reserves
`2 / 3 / 5` hours for orchestration and `1 / 2 / 4` hours for rework. Those
reserves are included once at the run level, so the aggregate active effort is:

| Provider scenario | Leaf items | Orchestration | Rework allowance | Aggregate agent-hours |
| --- | ---: | ---: | ---: | ---: |
| Codex (uncalibrated) | 22 / 30 / 46 | 2 / 3 / 5 | 1 / 2 / 4 | **25 / 35 / 55** |
| Claude (uncalibrated) | 22 / 30 / 46 | 2 / 3 / 5 | 1 / 2 / 4 | **25 / 35 / 55** |

The two provider scenarios are alternatives. Never add the Codex and Claude
rows together. If a later run measures real work, record the date, scope,
runtime, provider, configured model, role, retry count, and actual active hours
before recalibrating; this example contains no such measurement.

## Elapsed time and lanes

Assume the worker cap permits the two lanes to run after a serial pre-gate.
Orchestration is allocated entirely to a `1 / 1 / 2` hour pre-gate plus a
`1 / 2 / 3` hour post-gate, totaling `2 / 3 / 5` hours. A separate serial
rework allowance of `1 / 2 / 4` hours follows the post-gate. There are no extra
gate hours outside these stated reserves. Each leaf's agent-hours equal its lane
time because one agent is active at a time within that lane; tool and idle waits
are excluded.

```text
active elapsed = pre-gate + max(W-101, W-102) + W-103 + post-gate + rework
likely         = 1h + max(7h, 11h) + 12h + 2h + 2h = 28h
```

The same calculation gives an active elapsed range of `20 / 28 / 45` hours:

| Component | Low | Likely | High | Inclusion rule |
| --- | ---: | ---: | ---: | --- |
| Pre-gate | 1h | 1h | 2h | Orchestration reserve |
| Independent lanes | 8h | 11h | 16h | `max(W-101, W-102)` |
| Dependent W-103 | 9h | 12h | 20h | Starts after both lanes |
| Post-gate | 1h | 2h | 3h | Remaining orchestration reserve |
| Serial rework | 1h | 2h | 4h | Separate allowance after post-gate |
| Active elapsed | **20h** | **28h** | **45h** | No idle wait |

External access or stakeholder waits are tracked separately as `0 / 4 / 12`
hours. Therefore the end-to-end elapsed range is `20 / 32 / 57` hours before
human review time. Human review and decision time is a separate `2 / 3 / 6`
hours range; it is not added to aggregate agent-hours or hidden in the worker
lanes.

The arithmetic demonstrates why `35` likely aggregate agent-hours does not
become `35 / 2`: parallel lanes shorten elapsed time while retaining their
summed active effort, and serial dependencies remain on the critical path.

## Calibration and resume

These ranges are explicitly `uncalibrated`. After an actual run, replace a
range only with measured evidence from the same kind of scope and record what
changed. Do not turn a configured reasoning setting into an hours multiplier,
and do not claim one provider is faster from this hypothetical.

If the run pauses after `W-102`, resume from its stable IDs, checkpoints, and
evidence fingerprint. Reuse completed evidence only if it is still fresh;
re-estimate unfinished `W-103` if files, dependencies, tools, or scope changed.
Already completed work is excluded from the remaining estimate, while any new
review or rework is listed once in the resumed run. A blocked estimate names
the missing decision or evidence instead of inventing a precise number.
