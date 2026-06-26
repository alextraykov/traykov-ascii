import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type Matter = Record<string, string | number | string[]>;

export type CaseStudy = {
  id: string;
  href: string;
  title: string;
  summary: string;
  role?: string;
  year?: number;
  group: string;
  category?: string;
  status?: string;
  tags: string[];
  image?: string;
  readTime?: string;
  order: number;
  body: string;
};

export type Writing = {
  id: string;
  title: string;
  date: string;
  emoji: string;
  body: string;
};

const slugOverrides: Record<string, string> = {
  "pages/designing-pave": "designing-pave",
  "pages/synapse-sys": "synapse-sys",
  "pages/pointlearn": "pointlearn",
  "pages/building-pave-environment": "building-pave-environment",
  "pages/01-home": "pave-home",
  "pages/02-builder": "pave-builder",
  "pages/landing": "pave-landing",
  "pages/email-templates": "pave-email-templates",
  "pages/notifications": "pave-notifications",
  "pages/billing": "pave-billing",
  "pages/projects": "pave-projects",
  "composites/chat-window": "pave-chat-window",
  "composites/inspector-canvas": "pave-inspector-canvas",
  "composites/billing-plg": "pave-billing-plg",
  "quickbase/connection-central": "connection-central",
  "old-work/bolt-fun": "bolt-fun",
  "old-work/alby-browser": "alby-browser",
  "old-work/brewculator": "brewculator",
  "old-work/the-improved-mind": "the-improved-mind",
  "old-work/we-are-design": "we-are-design",
};

function walkFiles(dir: string, ext: string): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) return walkFiles(path, ext);
      return path.endsWith(ext) ? [path] : [];
    })
    .sort();
}

function parseValue(value: string): string | number | string[] {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

export function parseMdx(path: string): { matter: Matter; body: string } {
  const raw = readFileSync(path, "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { matter: {}, body: raw };

  const matter: Matter = {};
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) continue;
    matter[pair[1]] = parseValue(pair[2]);
  }

  return { matter, body: match[2] };
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineMarkdown(value: string): string {
  return esc(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
  group?: string;
};

type DiagramNode = {
  label: string;
  group?: string;
};

type StructuredDiagram = {
  type: "flow" | "sequence" | "state";
  direction: "horizontal" | "vertical";
  edges: DiagramEdge[];
  nodes: DiagramNode[];
};

const dotShadow = "░";

function stripMermaidMarkup(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/["']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(value: string, maxWidth = 30): string[] {
  const chunks = stripMermaidMarkup(value)
    .split(/\n| · /)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const lines: string[] = [];

  for (const chunk of chunks.length ? chunks : [value]) {
    let current = "";
    for (const word of chunk.split(/\s+/)) {
      if (!current) {
        current = word;
      } else if (`${current} ${word}`.length <= maxWidth) {
        current = `${current} ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines.length ? lines : [""];
}

function displayLabel(value: string): string {
  return stripMermaidMarkup(value)
    .replace(/[™®]/g, "")
    .toUpperCase();
}

function padRight(value: string, width: number): string {
  return value + " ".repeat(Math.max(0, width - value.length));
}

function centerLine(value: string, width: number): string {
  const gap = Math.max(0, width - value.length);
  const left = Math.floor(gap / 2);
  return `${" ".repeat(left)}${value}${" ".repeat(gap - left)}`;
}

function blockWidth(lines: string[]): number {
  return Math.max(...lines.map((line) => line.length), 0);
}

function centerBlock(lines: string[], height: number, width = blockWidth(lines)): string[] {
  const top = Math.floor(Math.max(0, height - lines.length) / 2);
  const bottom = Math.max(0, height - lines.length - top);
  return [
    ...Array.from({ length: top }, () => " ".repeat(width)),
    ...lines.map((line) => centerLine(line, width)),
    ...Array.from({ length: bottom }, () => " ".repeat(width))
  ];
}

function combineBlocks(blocks: string[][], gap = "   "): string[] {
  const height = Math.max(...blocks.map((block) => block.length));
  const widths = blocks.map(blockWidth);
  const normalized = blocks.map((block, index) =>
    centerBlock(block, height, widths[index]).map((line) => padRight(line, widths[index]))
  );

  return Array.from({ length: height }, (_, row) => normalized.map((block) => block[row]).join(gap));
}

function asciiBox(label: string): string[] {
  const lines = wrapText(displayLabel(label), 24);
  const contentWidth = Math.max(8, ...lines.map((line) => line.length));
  const topBorder = `+${"-".repeat(contentWidth + 2)}+    `;
  const bottomBorder = `+${"-".repeat(contentWidth + 2)}+  ${dotShadow.repeat(2)}`;
  const body = lines.map((line) => `| ${centerLine(line, contentWidth)} |  ${dotShadow.repeat(2)}`);
  const shadow = `   ${dotShadow.repeat(contentWidth + 2)}`;

  return [topBorder, ...body, bottomBorder, shadow];
}

function parseNode(expression: string, labels: Map<string, string>): string {
  const cleaned = expression.trim().replace(/;$/, "");
  if (cleaned === "[*]") return "Start / end";

  const node = cleaned.match(/^([A-Za-z0-9_.:-]+)?\s*(?:\[(.*)\]|\{(.*)\}|\((.*)\))$/);
  if (node) {
    const id = node[1];
    const label = stripMermaidMarkup(node[2] ?? node[3] ?? node[4] ?? id ?? cleaned);
    if (id) labels.set(id, label);
    return label;
  }

  return labels.get(cleaned) ?? stripMermaidMarkup(cleaned.replace(/_/g, " "));
}

function renderHorizontalEdge(edge: DiagramEdge): string[] {
  const arrow = edge.label ? `${displayLabel(edge.label)} ----▶` : "----▶";
  const left = asciiBox(edge.from);
  const right = asciiBox(edge.to);
  const arrowBlock = [arrow];
  return combineBlocks([left, arrowBlock, right]);
}

function renderVerticalEdge(edge: DiagramEdge, includeFrom = true): string[] {
  const from = asciiBox(edge.from);
  const to = asciiBox(edge.to);
  const labelLines = edge.label ? wrapText(displayLabel(edge.label), 28) : [];
  const width = Math.max(
    blockWidth(from),
    blockWidth(to),
    ...labelLines.map((line) => line.length + 4),
    8
  );
  const center = (line: string) => centerLine(line, width);
  const connector = [
    center("|"),
    ...labelLines.map((line) => center(line)),
    center("▼")
  ];

  return [
    ...(includeFrom ? from.map((line) => center(line)) : []),
    ...connector,
    ...to.map((line) => center(line))
  ];
}

function renderEdge(edge: DiagramEdge, direction: "horizontal" | "vertical" = "horizontal"): string[] {
  return direction === "vertical" ? renderVerticalEdge(edge) : renderHorizontalEdge(edge);
}

function renderEdges(edges: DiagramEdge[], direction: "horizontal" | "vertical"): string[] {
  if (direction === "horizontal") {
    return edges.flatMap((edge, index) => {
      const group = edge.group ? [`[${edge.group}]`] : [];
      return [...(index ? [""] : []), ...group, ...renderHorizontalEdge(edge)];
    });
  }

  const lines: string[] = [];
  let previousTo = "";
  let previousGroup = "";

  edges.forEach((edge, index) => {
    if (index) lines.push("");
    if (edge.group && edge.group !== previousGroup) lines.push(`[${edge.group}]`);
    lines.push(...renderVerticalEdge(edge, edge.from !== previousTo));
    previousTo = edge.to;
    previousGroup = edge.group ?? "";
  });

  return lines;
}

function renderDiagramHeader(label: string, edges: DiagramEdge[], direction: "horizontal" | "vertical" = "horizontal"): string[] {
  const body = renderEdges(edges, direction);
  return body;
}

function renderNodeSections(nodes: DiagramNode[]): string[] {
  const sections = new Map<string, string[]>();

  for (const node of nodes) {
    const key = node.group ?? "Structure";
    const entries = sections.get(key) ?? [];
    entries.push(node.label);
    sections.set(key, entries);
  }

  return Array.from(sections).flatMap(([section, labels], sectionIndex) => [
    ...(sectionIndex ? [""] : []),
    `[${section}]`,
    ...labels.flatMap((label, index) => [...(index ? [""] : []), ...asciiBox(label)])
  ]);
}

function renderDiagram(
  label: string,
  edges: DiagramEdge[],
  nodes: DiagramNode[] = [],
  direction: "horizontal" | "vertical" = "horizontal"
): string {
  const body = [
    ...renderNodeSections(nodes),
    ...(nodes.length && edges.length ? [""] : []),
    ...renderEdges(edges, direction)
  ];

  return body.length ? body.join("\n") : "";
}

function extractFlowEdges(
  line: string,
  labels: Map<string, string>,
  group?: string,
  options: { stateLabels?: boolean } = {}
): DiagramEdge[] {
  const stateEdge = line.match(/^(.+?)\s+-->\s+(.+?):\s+(.+)$/);
  if (options.stateLabels && stateEdge) {
    return [
      {
        from: parseNode(stateEdge[1], labels),
        to: parseNode(stateEdge[2], labels),
        label: stateEdge[3],
        group
      }
    ];
  }

  const labeledEdge = line.match(/^(.+?)\s+(?:-->|-.->|==>)\|(.+?)\|\s+(.+)$/);
  if (labeledEdge) {
    return [
      {
        from: parseNode(labeledEdge[1], labels),
        to: parseNode(labeledEdge[3], labels),
        label: labeledEdge[2],
        group
      }
    ];
  }

  const parts = line.split(/\s+(?:-->|-.->|==>)\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts.slice(0, -1).map((part, index) => ({
      from: parseNode(part, labels),
      to: parseNode(parts[index + 1], labels),
      group
    }));
  }

  return [];
}

function extractStandaloneNode(line: string, labels: Map<string, string>, group?: string): DiagramNode | null {
  if (!/^[A-Za-z0-9_.:-]+\s*(?:\[.*\]|\{.*\}|\(.*\))$/.test(line)) return null;
  return {
    label: parseNode(line, labels),
    group
  };
}

function parseFlowDiagram(lines: string[]): StructuredDiagram | null {
  const labels = new Map<string, string>();
  const groups: string[] = [];
  const edges: DiagramEdge[] = [];
  const nodes: DiagramNode[] = [];
  let direction: "horizontal" | "vertical" = "horizontal";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%")) continue;

    const header = line.match(/^(?:flowchart|graph)\s+([A-Z]+)/i);
    if (header) {
      direction = /^(TD|TB)$/i.test(header[1]) ? "vertical" : "horizontal";
      continue;
    }

    const subgraph = line.match(/^subgraph\s+(?:(?:[A-Za-z0-9_-]+)\s*)?(?:\[(.+)\]|"(.+)"|(.+))$/);
    if (subgraph) {
      groups.push(stripMermaidMarkup(subgraph[1] ?? subgraph[2] ?? subgraph[3] ?? "Group"));
      continue;
    }

    if (line === "end") {
      groups.pop();
      continue;
    }

    const extractedEdges = extractFlowEdges(line, labels, groups.at(-1));
    if (extractedEdges.length) {
      edges.push(...extractedEdges);
      continue;
    }

    const node = extractStandaloneNode(line, labels, groups.at(-1));
    if (node) nodes.push(node);
  }

  return edges.length || nodes.length ? { type: "flow", direction, edges, nodes } : null;
}

function parseSequenceDiagram(lines: string[]): StructuredDiagram | null {
  const labels = new Map<string, string>();
  const edges: DiagramEdge[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === "sequenceDiagram") continue;

    const participant = line.match(/^participant\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?/);
    if (participant) {
      labels.set(participant[1], stripMermaidMarkup(participant[2] ?? participant[1]));
      continue;
    }

    const message = line.match(/^([A-Za-z0-9_]+)\s*[-=]+>>\s*([A-Za-z0-9_]+):\s*(.+)$/);
    if (message) {
      edges.push({
        from: parseNode(message[1], labels),
        to: parseNode(message[2], labels),
        label: message[3]
      });
    }
  }

  return edges.length ? { type: "sequence", direction: "horizontal", edges, nodes: [] } : null;
}

function parseStateDiagram(lines: string[]): StructuredDiagram | null {
  const labels = new Map<string, string>();
  const edges: DiagramEdge[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === "stateDiagram-v2") continue;

    const note = line.match(/^note\s+\w+\s+of\s+(.+?):\s+(.+)$/);
    if (note) {
      edges.push({
        from: parseNode(note[1], labels),
        to: stripMermaidMarkup(note[2]),
        label: "note"
      });
      continue;
    }

    edges.push(...extractFlowEdges(line, labels, undefined, { stateLabels: true }));
  }

  return edges.length ? { type: "state", direction: "vertical", edges, nodes: [] } : null;
}

function parseDiagram(code: string): StructuredDiagram | null {
  const lines = code.split("\n");
  const first = lines.find((line) => line.trim())?.trim() ?? "";

  if (first === "sequenceDiagram") return parseSequenceDiagram(lines);
  if (first === "stateDiagram-v2") return parseStateDiagram(lines);
  return parseFlowDiagram(lines);
}

function renderNodeHtml(label: string): string {
  return `<div class="rfc-node">${wrapText(displayLabel(label), 24)
    .map((line) => `<span>${esc(line)}</span>`)
    .join("")}</div>`;
}

function renderConnectorHtml(edge: DiagramEdge, direction: "horizontal" | "vertical"): string {
  const label = edge.label ? `<span class="rfc-connector__label">${esc(displayLabel(edge.label))}</span>` : "";
  return `<div class="rfc-connector rfc-connector--${direction}" aria-hidden="true">${label}<span class="rfc-connector__line"></span></div>`;
}

function renderSectionHtml(group: string, labels: string[]): string {
  return `<section class="rfc-section"><p class="rfc-section__label">[${esc(displayLabel(group))}]</p><div class="rfc-section__stack">${labels
    .map((label) => renderNodeHtml(label))
    .join("")}</div></section>`;
}

function renderNodeSectionsHtml(nodes: DiagramNode[]): string {
  const sections = new Map<string, string[]>();

  for (const node of nodes) {
    const key = node.group ?? "Structure";
    const entries = sections.get(key) ?? [];
    entries.push(node.label);
    sections.set(key, entries);
  }

  return Array.from(sections)
    .map(([group, labels]) => renderSectionHtml(group, labels))
    .join("");
}

function renderVerticalDiagramHtml(edges: DiagramEdge[]): string {
  const items: string[] = [];
  let previousTo = "";

  edges.forEach((edge) => {
    if (edge.from !== previousTo) items.push(renderNodeHtml(edge.from));
    items.push(renderConnectorHtml(edge, "vertical"));
    items.push(renderNodeHtml(edge.to));
    previousTo = edge.to;
  });

  return `<div class="rfc-chain">${items.join("")}</div>`;
}

function renderHorizontalDiagramHtml(edges: DiagramEdge[]): string {
  return `<div class="rfc-rows">${edges
    .map(
      (edge) =>
        `<div class="rfc-row">${renderNodeHtml(edge.from)}${renderConnectorHtml(edge, "horizontal")}${renderNodeHtml(edge.to)}</div>`
    )
    .join("")}</div>`;
}

function renderStructuredDiagram(diagram: StructuredDiagram): string {
  const sections = diagram.nodes.length ? renderNodeSectionsHtml(diagram.nodes) : "";
  const edges =
    diagram.direction === "vertical"
      ? renderVerticalDiagramHtml(diagram.edges)
      : renderHorizontalDiagramHtml(diagram.edges);
  return `<div class="ascii-diagram rfc-diagram rfc-diagram--${diagram.direction}" data-diagram-type="${esc(diagram.type)}"><div class="rfc-diagram__paper">${sections}${sections && diagram.edges.length ? '<div class="rfc-spacer"></div>' : ""}${edges}</div></div>`;
}

function renderDiagramFence(code: string, language: string): string {
  const diagram = parseDiagram(code);
  if (!diagram) {
    return `<pre class="code-block"><code>${esc(code)}</code></pre>`;
  }

  return renderStructuredDiagram(diagram).replace(
    "<div class=\"ascii-diagram",
    `<div data-diagram-source="${esc(language)}" class="ascii-diagram`
  );
}

type SynapseStep = {
  key: string;
  label: string;
};

function renderSynapseControls(steps: SynapseStep[]): string {
  return `<div class="synapse-mini__controls" role="tablist">${steps
    .map(
      (step) =>
        `<button type="button" role="tab" data-mini-step="${esc(step.key)}">${esc(step.label)}</button>`
    )
    .join("")}</div>`;
}

function renderSynapseNode(label: string, className: string): string {
  return `<div class="synapse-node ${esc(className)}"><span>${esc(label)}</span></div>`;
}

function renderSynapseEdgeLabel(label: string, className: string): string {
  return `<div class="synapse-edge-label ${esc(className)}">${esc(label)}</div>`;
}

function renderSynapseFigure(
  kind: string,
  title: string,
  steps: SynapseStep[],
  body: string,
  caption: string,
  initialStep = steps[0]?.key ?? "default"
): string {
  const markerId = `synapse-arrow-${kind}`;
  const markerDef = `<defs><marker id="${esc(markerId)}" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 Z" /></marker></defs>`;
  const diagramBody = body
    .replaceAll('aria-hidden="true">', `aria-hidden="true">${markerDef}`)
    .replaceAll('<path class="synapse-line', `<path marker-end="url(#${esc(markerId)})" class="synapse-line`);

  return `<figure class="synapse-mini synapse-mini--${esc(kind)}" data-synapse-mini data-step="${esc(initialStep)}">
  <div class="synapse-mini__header">
    <p>${esc(title)}</p>
    ${renderSynapseControls(steps)}
  </div>
  <div class="synapse-mini__viewport">${diagramBody}</div>
  <figcaption>${esc(caption)}</figcaption>
</figure>`;
}

function renderRecordingPlaceholder(code: string): string {
  const fields = new Map<string, string>();
  const notes: string[] = [];

  for (const rawLine of code.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.+)$/);
    if (match) {
      fields.set(match[1].toLowerCase(), match[2]);
    } else {
      notes.push(line.replace(/^[-*]\s+/, ""));
    }
  }

  const title = fields.get("title") ?? "Record MP4 example";
  const file = fields.get("file") ?? "case-studies/media/synapse-sys-example.mp4";
  const capture = fields.get("capture") ?? fields.get("show") ?? notes.join(" ");
  const why = fields.get("why");
  const publicRelativePath = file.replace(/^public\//, "");
  const publicFilePath = join(process.cwd(), "public", publicRelativePath);
  const videoSrc = `/${publicRelativePath}`;

  if (existsSync(publicFilePath)) {
    return `<figure class="recording-media">
  <video class="recording-media__video" src="${esc(videoSrc)}" autoplay muted loop playsinline preload="metadata"></video>
  <figcaption>
    <span>MP4</span>
    <strong>${inlineMarkdown(title)}</strong>
    ${capture ? `<em>${inlineMarkdown(capture)}</em>` : ""}
  </figcaption>
</figure>`;
  }

  return `<aside class="recording-placeholder">
  <p class="recording-placeholder__kicker">MP4 placeholder</p>
  <h3>${inlineMarkdown(title)}</h3>
  <dl>
    <div><dt>File</dt><dd><code>${esc(file)}</code></dd></div>
    ${capture ? `<div><dt>Capture</dt><dd>${inlineMarkdown(capture)}</dd></div>` : ""}
    ${why ? `<div><dt>Why</dt><dd>${inlineMarkdown(why)}</dd></div>` : ""}
  </dl>
</aside>`;
}

function renderSynapseMiniCanvas(language: string): string | null {
  switch (language) {
    case "synapse-loop":
      return renderSynapseFigure(
        "loop",
        "Core loop",
        [
          { key: "connect", label: "Connect" },
          { key: "operate", label: "Operate" },
          { key: "branch", label: "Branch" }
        ],
        `<svg class="synapse-lines" viewBox="0 0 1000 430" aria-hidden="true">
          <path class="synapse-line synapse-line--base synapse-step synapse-step--connect synapse-step--operate synapse-step--branch" d="M235 175 H410 V215 H530" />
          <path class="synapse-line synapse-line--base synapse-step synapse-step--connect synapse-step--operate synapse-step--branch" d="M235 255 H410 V215 H530" />
          <path class="synapse-line synapse-line--active synapse-step synapse-step--operate synapse-step--branch" d="M560 215 H790" />
          <path class="synapse-line synapse-line--ghost synapse-step synapse-step--branch" d="M790 215 H870 V105 H930" />
          <path class="synapse-line synapse-line--ghost synapse-step synapse-step--branch" d="M790 215 H870 V330 H930" />
        </svg>
        ${renderSynapseNode("Source idea", "synapse-node--idea-a")}
        ${renderSynapseNode("Target idea", "synapse-node--idea-b")}
        ${renderSynapseNode("Edge action", "synapse-node--edge-menu synapse-step synapse-step--connect synapse-step--operate synapse-step--branch")}
        ${renderSynapseNode("AI result node", "synapse-node--result synapse-step synapse-step--branch")}
        ${renderSynapseNode("Branch", "synapse-node--branch-a synapse-node--small synapse-step synapse-step--branch")}
        ${renderSynapseNode("Next edge", "synapse-node--branch-b synapse-node--small synapse-step synapse-step--branch")}
        ${renderSynapseEdgeLabel("draw connection", "synapse-edge-label--loop-connect synapse-step synapse-step--connect synapse-step--operate synapse-step--branch")}
        ${renderSynapseEdgeLabel("choose synthesize", "synapse-edge-label--loop-operate synapse-step synapse-step--operate synapse-step--branch")}
        ${renderSynapseEdgeLabel("result is reusable", "synapse-edge-label--loop-branch synapse-step synapse-step--branch")}`,
        "The diagram is the product thesis: two user-authored ideas, an executable relationship, and an AI result that becomes reusable graph material."
      );
    case "synapse-edge-operation":
      return renderSynapseFigure(
        "edge-operation",
        "Edge operation contract",
        [
          { key: "before", label: "Before" },
          { key: "pending", label: "Pending" },
          { key: "committed", label: "Committed" },
          { key: "failed", label: "Failed" }
        ],
        `<svg class="synapse-lines" viewBox="0 0 1000 430" aria-hidden="true">
          <path class="synapse-line synapse-step synapse-step--before synapse-step--failed" d="M245 215 H760" />
          <path class="synapse-line synapse-line--ghost synapse-step synapse-step--pending" d="M245 215 H390 V165 H500" />
          <path class="synapse-line synapse-line--ghost synapse-step synapse-step--pending" d="M500 165 H620 V215 H760" />
          <path class="synapse-line synapse-line--active synapse-step synapse-step--committed" d="M245 215 H390 V165 H500" />
          <path class="synapse-line synapse-line--active synapse-step synapse-step--committed" d="M500 165 H620 V215 H760" />
        </svg>
        ${renderSynapseNode("Source idea", "synapse-node--source")}
        ${renderSynapseNode("Target idea", "synapse-node--target")}
        ${renderSynapseNode("Local pending result", "synapse-node--pending synapse-step synapse-step--pending")}
        ${renderSynapseNode("Result node", "synapse-node--result-center synapse-step synapse-step--committed")}
        <div class="synapse-operation-menu synapse-step synapse-step--pending">
          <span>AI operation</span>
          <strong>synthesize</strong>
          <em>working locally</em>
        </div>
        <div class="synapse-db-ledger">
          <span>Durable graph</span>
          <strong class="synapse-step synapse-step--before">A -> B</strong>
          <strong class="synapse-step synapse-step--pending">A -> B unchanged</strong>
          <strong class="synapse-step synapse-step--committed">A -> Result -> B</strong>
          <strong class="synapse-step synapse-step--failed">A -> B restored</strong>
        </div>
        <div class="synapse-status synapse-step synapse-step--pending">Local only. No persisted graph mutation yet.</div>
        <div class="synapse-status synapse-step synapse-step--committed">Single transaction: insert result, replace original edge.</div>
        <div class="synapse-status synapse-step synapse-step--failed">Rollback leaves the original edge intact.</div>`,
        "This is the correctness contract: the UI may speculate, but the database only moves from A -> B to A -> Result -> B in one committed operation."
      );
    case "synapse-rendering":
      return renderSynapseFigure(
        "rendering",
        "Hybrid rendering model",
        [
          { key: "viewport", label: "Viewport" },
          { key: "konva", label: "Konva" },
          { key: "html", label: "HTML" }
        ],
        `<div class="synapse-layer synapse-layer--viewport">Shared viewport: x, y, scale</div>
        <div class="synapse-layer synapse-layer--konva synapse-step synapse-step--konva">Konva layer: grid, ports, edge hit regions, drag preview</div>
        <div class="synapse-layer synapse-layer--html synapse-step synapse-step--html">HTML layer: editable cards, menus, resize handles, tooltips</div>
        <svg class="synapse-lines" viewBox="0 0 1000 430" aria-hidden="true">
          <path class="synapse-line synapse-line--ghost" d="M205 240 H795" />
          <path class="synapse-line synapse-line--active synapse-step synapse-step--konva" d="M260 315 H430 V350 H740" />
        </svg>
        ${renderSynapseNode("Editable node", "synapse-node--render-a synapse-step synapse-step--html")}
        ${renderSynapseNode("Graph node", "synapse-node--render-b synapse-step synapse-step--html")}`,
        "Canvas geometry and editable interface elements share one transform without becoming one brittle rendering layer."
      );
    case "synapse-edge-routing":
      return renderSynapseFigure(
        "edge-routing",
        "Edge routing taste decision",
        [
          { key: "bus", label: "Rejected bus" },
          { key: "offset", label: "Chosen offsets" }
        ],
        `<svg class="synapse-lines" viewBox="0 0 1000 430" aria-hidden="true">
          <g class="synapse-step synapse-step--bus">
            <path class="synapse-line synapse-line--heavy" d="M245 215 H410 V95 H760" />
            <path class="synapse-line synapse-line--heavy" d="M245 215 H430 V175 H760" />
            <path class="synapse-line synapse-line--heavy" d="M245 215 H450 V255 H760" />
            <path class="synapse-line synapse-line--heavy" d="M245 215 H470 V335 H760" />
          </g>
          <g class="synapse-step synapse-step--offset">
            <path class="synapse-line synapse-line--active" d="M245 145 H395 V95 H760" />
            <path class="synapse-line" d="M245 190 H435 V175 H760" />
            <path class="synapse-line" d="M245 235 H475 V255 H760" />
            <path class="synapse-line" d="M245 280 H515 V335 H760" />
          </g>
        </svg>
        ${renderSynapseNode("Shared source", "synapse-node--route-source")}
        ${renderSynapseNode("A", "synapse-node--route-a synapse-node--small")}
        ${renderSynapseNode("B", "synapse-node--route-b synapse-node--small")}
        ${renderSynapseNode("C", "synapse-node--route-c synapse-node--small")}
        ${renderSynapseNode("D", "synapse-node--route-d synapse-node--small")}
        ${renderSynapseEdgeLabel("shared port collapses meaning", "synapse-edge-label--route-bus synapse-step synapse-step--bus")}
        ${renderSynapseEdgeLabel("separate lanes preserve scanability", "synapse-edge-label--route-offset synapse-step synapse-step--offset")}
        <div class="synapse-status synapse-step synapse-step--bus">Technically clever. Visually reads as one thick bundle.</div>
        <div class="synapse-status synapse-step synapse-step--offset">Less clever. Easier to scan and select.</div>`,
        "The rejected implementation matters because it shows the taste bar: route quality is measured by readability, not algorithmic cleverness.",
        "offset"
      );
    case "synapse-ghosts":
      return renderSynapseFigure(
        "ghosts",
        "Ghost node authorship model",
        [
          { key: "suggested", label: "Suggested" },
          { key: "accepted", label: "Accepted" },
          { key: "dismissed", label: "Dismissed" }
        ],
        `<svg class="synapse-lines" viewBox="0 0 1000 430" aria-hidden="true">
          <path class="synapse-line synapse-line--active" d="M260 215 H560" />
          <path class="synapse-line synapse-line--ghost synapse-step synapse-step--suggested synapse-step--dismissed" d="M560 215 H700 V215 H820" />
          <path class="synapse-line synapse-line--active synapse-step synapse-step--accepted" d="M560 215 H700 V215 H820" />
        </svg>
        ${renderSynapseNode("Selected idea", "synapse-node--source")}
        ${renderSynapseNode("Real neighbor", "synapse-node--result-center")}
        ${renderSynapseNode("Ghost suggestion", "synapse-node--ghost synapse-step synapse-step--suggested synapse-step--dismissed")}
        ${renderSynapseNode("Accepted node", "synapse-node--ghost-accepted synapse-step synapse-step--accepted")}
        <div class="synapse-status synapse-step synapse-step--suggested">Visible, cached, and placed nearby, but not committed.</div>
        <div class="synapse-status synapse-step synapse-step--accepted">User accepts. The suggestion becomes graph material.</div>
        <div class="synapse-status synapse-step synapse-step--dismissed">User ignores it. The canvas stays authored.</div>`,
        "The AI can widen peripheral vision, but the user decides what becomes part of the map."
      );
    case "synapse-ai-layer":
      return renderSynapseFigure(
        "ai-layer",
        "AI operation routing",
        [
          { key: "ghost", label: "Ghost" },
          { key: "extract", label: "Extract" },
          { key: "synthesis", label: "Synthesis" }
        ],
        `<div class="synapse-pipeline">
          <div class="synapse-pipe-block synapse-pipe-block--input">Canvas operation</div>
          <div class="synapse-pipe-block synapse-pipe-block--guard">Guardrails</div>
          <div class="synapse-pipe-block synapse-pipe-block--budget">Budget</div>
          <div class="synapse-pipe-block synapse-pipe-block--cache">Cache</div>
          <div class="synapse-pipe-block synapse-pipe-block--router">Router</div>
          <div class="synapse-pipe-block synapse-pipe-block--provider">Provider</div>
          <div class="synapse-pipe-block synapse-pipe-block--schema">Schema</div>
          <div class="synapse-pipe-block synapse-pipe-block--result">Canvas result</div>
        </div>
        <div class="synapse-route-note synapse-route-note--ghost synapse-step synapse-step--ghost">Fast, cheap route. Cached suggestions. Lower stakes.</div>
        <div class="synapse-route-note synapse-route-note--extract synapse-step synapse-step--extract">Strict URL and content guards before model work.</div>
        <div class="synapse-route-note synapse-route-note--synthesis synapse-step synapse-step--synthesis">Higher quality route with fallback and structured output.</div>`,
        "The AI layer became a product economics layer: each operation gets the safety, cost, quality, and latency profile it deserves.",
        "synthesis"
      );
    case "synapse-prompt-boundary":
      return renderSynapseFigure(
        "prompt-boundary",
        "Prompt ownership boundary",
        [
          { key: "input", label: "User text" },
          { key: "server", label: "Server spec" },
          { key: "validated", label: "Validated" }
        ],
        `<svg class="synapse-lines" viewBox="0 0 1000 430" aria-hidden="true">
          <path class="synapse-line synapse-line--ghost synapse-step synapse-step--input synapse-step--server synapse-step--validated" d="M230 160 H500" />
          <path class="synapse-line synapse-line--active synapse-step synapse-step--server synapse-step--validated" d="M230 270 H500" />
          <path class="synapse-line synapse-line--active synapse-step synapse-step--validated" d="M500 215 H790" />
        </svg>
        ${renderSynapseNode("Untrusted node content", "synapse-node--prompt-user")}
        ${renderSynapseNode("Server operation spec", "synapse-node--prompt-server")}
        ${renderSynapseNode("Prompt builder", "synapse-node--prompt-builder")}
        ${renderSynapseNode("Validated result", "synapse-node--prompt-result synapse-step synapse-step--validated")}`,
        "The client supplies content and intent, but system prompts, boundaries, and output validation stay server-owned."
      );
    case "synapse-taste":
      return renderSynapseFigure(
        "taste",
        "Taste as restraint",
        [
          { key: "loud", label: "Loud identity" },
          { key: "restrained", label: "Readable tool" }
        ],
        `<div class="synapse-taste-scene">
          <div class="synapse-taste-node synapse-taste-node--primary">Market signals<br/><span>12 linked notes</span></div>
          <div class="synapse-taste-node synapse-taste-node--secondary">Research themes<br/><span>4 contradictions</span></div>
          <div class="synapse-taste-panel">Edge action<br/><strong>synthesize</strong></div>
        </div>
        <div class="synapse-status synapse-step synapse-step--loud">Memorable, but every surface competes at the same volume.</div>
        <div class="synapse-status synapse-step synapse-step--restrained">Same terminal DNA, lower glow, clearer hierarchy, content first.</div>`,
        "The design lesson was not to abandon the terminal identity. It was to make the identity serve the work.",
        "restrained"
      );
    case "synapse-trust":
      return renderSynapseFigure(
        "trust",
        "SaaS trust wrapper",
        [
          { key: "ownership", label: "Ownership" },
          { key: "budget", label: "Budget" },
          { key: "sharing", label: "Sharing" }
        ],
        `${renderSynapseNode("Canvas work", "synapse-node--trust-canvas")}
        ${renderSynapseNode("Auth and access", "synapse-node--trust-auth synapse-step synapse-step--ownership")}
        ${renderSynapseNode("Usage events", "synapse-node--trust-budget synapse-step synapse-step--budget")}
        ${renderSynapseNode("Expiring share token", "synapse-node--trust-share synapse-step synapse-step--sharing")}
        <svg class="synapse-lines" viewBox="0 0 1000 430" aria-hidden="true">
          <path class="synapse-line synapse-line--active synapse-step synapse-step--ownership" d="M500 185 C400 120 320 110 230 140" />
          <path class="synapse-line synapse-line--active synapse-step synapse-step--budget" d="M500 185 C500 300 500 320 500 350" />
          <path class="synapse-line synapse-line--active synapse-step synapse-step--sharing" d="M500 185 C610 120 690 110 780 140" />
        </svg>`,
        "The canvas is only shippable when ownership, usage, recovery, export, and sharing rules surround it."
      );
    case "synapse-system":
      return renderSynapseFigure(
        "system",
        "System boundary",
        [
          { key: "client", label: "Client" },
          { key: "server", label: "Server" },
          { key: "providers", label: "Providers" }
        ],
        `<div class="synapse-system-grid">
          <div class="synapse-system-block synapse-step synapse-step--client">Canvas UI<br/><span>pending state</span></div>
          <div class="synapse-system-block synapse-step synapse-step--server">Server actions<br/><span>mutation, auth, budget</span></div>
          <div class="synapse-system-block synapse-step synapse-step--providers">AI, billing, analytics<br/><span>behind interfaces</span></div>
        </div>`,
        "The trust boundary is the system: the client can preview, but durable mutation and provider work stay server-side.",
        "server"
      );
    case "synapse-billing":
      return renderSynapseFigure(
        "billing",
        "Billing provider boundary",
        [
          { key: "product", label: "Product" },
          { key: "interface", label: "Interface" },
          { key: "provider", label: "Provider" }
        ],
        `<div class="synapse-pipeline synapse-pipeline--billing">
          <div class="synapse-pipe-block">Product action</div>
          <div class="synapse-pipe-block">BillingProvider</div>
          <div class="synapse-pipe-block">Active provider</div>
          <div class="synapse-pipe-block">Webhook verify</div>
          <div class="synapse-pipe-block">Plan and budget</div>
        </div>`,
        "When payment providers changed, the product kept calling the same boring contract."
      );
    case "synapse-performance":
      return renderSynapseFigure(
        "performance",
        "Performance preserves place",
        [
          { key: "gesture", label: "Gesture" },
          { key: "freeze", label: "Freeze" },
          { key: "trust", label: "Trust" }
        ],
        `<svg class="synapse-lines" viewBox="0 0 1000 430" aria-hidden="true">
          <path class="synapse-line synapse-line--ghost" d="M150 240 C320 120 610 120 850 240" />
          <path class="synapse-line synapse-line--active synapse-step synapse-step--trust" d="M150 240 C320 350 610 350 850 240" />
        </svg>
        ${renderSynapseNode("World point", "synapse-node--perf-a")}
        ${renderSynapseNode("Cursor target", "synapse-node--perf-b")}
        <div class="synapse-status synapse-step synapse-step--gesture">Pan, zoom, pinch, drag.</div>
        <div class="synapse-status synapse-step synapse-step--freeze">Quantize recomputation and freeze render sets during active gestures.</div>
        <div class="synapse-status synapse-step synapse-step--trust">Selected and focused nodes stay visible, so the canvas keeps its sense of place.</div>`,
        "Frame rate matters, but the higher product goal is spatial trust."
      );
    default:
      return null;
  }
}

function renderCodeFence(language: string, codeLines: string[]): string {
  const code = codeLines.join("\n");
  const normalized = language.toLowerCase();
  if (normalized === "recording-placeholder") return renderRecordingPlaceholder(code);

  const synapseFigure = renderSynapseMiniCanvas(normalized);
  if (synapseFigure) return synapseFigure;

  if (normalized === "mermaid" || normalized === "diagram") {
    return renderDiagramFence(code, normalized);
  }

  return `<pre class="code-block"><code>${esc(code)}</code></pre>`;
}

type BlufSection = {
  title: string;
  body: string;
};

const blufTitleMap: Record<string, string> = {
  summary: "Summary",
  "project frame": "Project frame",
  "what a hiring manager should take from this": "Reviewer takeaway",
  "reviewer takeaway": "Reviewer takeaway",
};

function normalizeHeading(value: string): string {
  return value
    .replace(/[*_`]/g, "")
    .trim()
    .toLowerCase();
}

function extractOpeningBlufSections(lines: string[]): { sections: BlufSection[]; rest: string[] } {
  const firstContentIndex = lines.findIndex((line) => line.trim());
  if (firstContentIndex === -1) return { sections: [], rest: lines };

  const firstHeading = lines[firstContentIndex].match(/^##\s+(.+)$/);
  if (!firstHeading || normalizeHeading(firstHeading[1]) !== "summary") {
    return { sections: [], rest: lines };
  }

  const sections: BlufSection[] = [];
  let index = firstContentIndex;

  while (index < lines.length && sections.length < 3) {
    const heading = lines[index].match(/^##\s+(.+)$/);
    if (!heading) break;

    const title = blufTitleMap[normalizeHeading(heading[1])];
    if (!title) break;

    const bodyLines: string[] = [];
    index += 1;

    while (index < lines.length && !/^##\s+/.test(lines[index])) {
      bodyLines.push(lines[index]);
      index += 1;
    }

    sections.push({ title, body: bodyLines.join("\n").trim() });
  }

  if (!sections.length) return { sections: [], rest: lines };

  return {
    sections,
    rest: [...lines.slice(0, firstContentIndex), ...lines.slice(index)],
  };
}

function renderBlufPointList(body: string, maxPoints = 3): string {
  const points: { text: string; quote: boolean }[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    points.push({ text: paragraph.join(" "), quote: false });
    paragraph = [];
  };

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      points.push({ text: bullet[1], quote: false });
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      flushParagraph();
      points.push({ text: quote[1], quote: true });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();

  return `<ul class="case-bluf-note__points">${points
    .slice(0, maxPoints)
    .map(
      (point) =>
        `<li${point.quote ? ' class="case-bluf-note__point--quote"' : ""}>${inlineMarkdown(point.text)}</li>`
    )
    .join("")}</ul>`;
}

function renderBlufSections(sections: BlufSection[]): string {
  const notes = sections
    .map(
      (section, index) => `<section class="case-bluf-note case-bluf-note--${index + 1}">
<p class="case-bluf-note__eyebrow">BLUF ${index + 1}</p>
<h2>${esc(section.title)}</h2>
<div class="case-bluf-note__body">${renderBlufPointList(section.body)}</div>
</section>`
    )
    .join("");

  return `<div class="case-bluf" aria-label="Project BLUF">${notes}</div>`;
}

export function renderMarkdown(body: string, enableBluf = true): string {
  let lines = body
    .split("\n")
    .filter((line) => !line.startsWith("import "));

  const html: string[] = [];
  let list: string[] = [];
  let code: { language: string; lines: string[] } | null = null;
  let mdxComponent = false;

  if (enableBluf) {
    const opening = extractOpeningBlufSections(lines);
    if (opening.sections.length) {
      html.push(renderBlufSections(opening.sections));
      lines = opening.rest;
    }
  }

  const flushList = () => {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (mdxComponent) {
      if (trimmed.endsWith("/>") || trimmed.startsWith("</") || trimmed.includes("</")) {
        mdxComponent = false;
      }
      continue;
    }

    const codeFence = line.match(/^```([\w-]+)?/);
    if (codeFence) {
      if (code) {
        html.push(renderCodeFence(code.language, code.lines));
        code = null;
      } else {
        flushList();
        code = { language: codeFence[1] ?? "", lines: [] };
      }
      continue;
    }

    if (code) {
      code.lines.push(line);
      continue;
    }

    if (!trimmed) {
      flushList();
      continue;
    }

    if (/^<\/?[A-Z][\w.:/-]*/.test(trimmed)) {
      flushList();
      if (!trimmed.endsWith("/>") && !trimmed.includes("</")) {
        mdxComponent = true;
      }
      continue;
    }

    if (/^<[^>]+>/.test(trimmed)) {
      flushList();
      continue;
    }

    const image = line.match(/^!\[(.*?)\]\((.*?)\)/);
    if (image) {
      flushList();
      html.push(`<figure><img src="${esc(image[2])}" alt="${esc(image[1])}" loading="lazy" /><figcaption>${esc(image[1])}</figcaption></figure>`);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushList();
      const level = Math.min(heading[1].length + 1, 5);
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      flushList();
      html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    flushList();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  flushList();
  if (code) html.push(renderCodeFence(code.language, code.lines));
  return html.join("\n");
}

export function getCaseStudies(): CaseStudy[] {
  return walkFiles("./case-studies", ".mdx")
    .filter((file) => /\/(pages|composites|quickbase|old-work)\//.test(file))
    .map((file): CaseStudy => {
      const { matter, body } = parseMdx(file);
      const base = relative("./case-studies", file).replace(/\.mdx$/, "");
      const id = slugOverrides[base] ?? base.replace(/\//g, "-");
      const image =
        (matter.heroImage as string | undefined) ??
        (matter.coverAfter as string | undefined) ??
        (matter.coverBefore as string | undefined);

      return {
        id,
        href: `/case-studies/${id}/`,
        title: String(matter.title ?? id),
        summary: String(matter.summary ?? ""),
        role: matter.role as string | undefined,
        year: matter.year as number | undefined,
        group: String(matter.group ?? "Work"),
        category: matter.category as string | undefined,
        status: matter.status as string | undefined,
        tags: Array.isArray(matter.tags) ? matter.tags : [],
        image,
        readTime: matter.readTime as string | undefined,
        order: Number(matter.order ?? 999),
        body,
      };
    })
    .sort((a, b) => a.order - b.order);
}

export function getWriting(): Writing[] {
  return walkFiles("./src/content/writing", ".mdx")
    .map((file): Writing => {
      const { matter, body } = parseMdx(file);
      return {
        id: file.split("/").pop()?.replace(/\.mdx$/, "") ?? String(matter.title),
        title: String(matter.title ?? "Untitled"),
        date: String(matter.date ?? ""),
        emoji: String(matter.emoji ?? "*"),
        body,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function splitTitle(title: string): { name: string; detail: string } {
  const [name, detail = ""] = title.split(" — ");
  return { name, detail };
}
