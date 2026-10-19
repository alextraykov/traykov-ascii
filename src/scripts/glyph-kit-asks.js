// The plain-language ask behind each figure on the Glyph kit page. Each one is run through
// Claude Code with the skill installed, and the spec it writes matches the example shown (checked 19 Oct 2026).
// Keys match LIVE_SPECS (moving) and AREAS (each area's first example).
export const ASKS = {
  loop: "Draw where our week goes as a moving diagram: Design, Build, QA, Ship. 30 percent of pieces come back from QA to Build; caption the way back \"about 1 in 3 comes back from QA\". Sample numbers are fine.",
  funnel: "Show signup to paid for the last 30 days as people, not percentages, moving: 12,400 visited, 6,100 signed up, 2,300 activated, 610 paid. These are sample numbers.",
  states: "Draw the states of saving a draft and play one path through it. States: editing, saving, saved, failed. Save goes from editing to saving, ok from saving to saved, no network from saving to failed, retry from failed to saving, and type from saved back to editing. Play it failing once, then saving, then back to editing.",
  queue: "Show why work waits, moving: Ready, Design (limit 4, a card stays 14), Review (limit 2, a card stays 30), Build (limit 4, a card stays 16), Done. Review is the bottleneck. Sample numbers.",
  rollout: "Draw the rollout of the new editor as a moving diagram: 1, 5, 25, 50 then 100 percent, guarded by error rate at 2 percent, and show it tripping at 25.",
  loading: "Show what someone sees in the first two seconds of opening a report, moving: the tap, a skeleton at 100 ms, the text at 700 ms, the image at 1,100 ms, done by 1.8 seconds. Illustrative timings.",
  research: "Chart how 20 people rated the export flow, strongly disagree to strongly agree. Easy to find export: 2, 3, 2, 8, 5. Trust the numbers: 6, 5, 4, 3, 2. Would use it weekly: 1, 2, 5, 7, 5. It's sample data. I want to see where opinion splits before we pick what to fix.",
  metrics: "Draw our signup funnel for the last 30 days: 12,400 visited, 6,100 signed up, 2,300 activated, 610 paid. Sample data. A still figure for a doc.",
  flows: "Map the export flow with its failure paths: open export, check there's data (if not, an empty state that sends you to import data), choose a format, check the file is ready (if not, show an error and go back to choosing a format), then download.",
  planning: "Make a now, next, later roadmap. Now: export to CSV, fix date parsing on import. Next: saved views, keyboard shortcuts for tables. Later: scheduled reports.",
  wireframes: "Wireframe the notification settings screen: tabs for profile, notifications and billing with notifications selected; a toggle \"Email me when a report is ready\" that's on, noted as off by default for new teams; a weekly summary toggle that's off; a digest day select set to Monday; a send-to field with team@example.com; then cancel and save, right aligned, noted that save is disabled until something changes.",
  systems: "Show our spacing tokens as a scale: space-1 is 4, space-2 is 8, space-3 is 16, space-4 is 24, space-5 is 40.",
  handoff: "Redline the content width on mobile: 16 padding, 320 content, 16 padding.",
  motion: "Write the motion for a toast that confirms a save without taking focus: it comes up from below the edge and fades in, 200 ms, with a reveal ease (0.33, 1, 0.68, 1). With reduced motion it appears in place and stays for the same time."
};
