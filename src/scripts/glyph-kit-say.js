import { read, apply, screenSpec, SAY_MAX_LENGTH } from "../../skills/glyph-kit/scripts/say.mjs";
import { PRIMITIVES, screen as drawScreen } from "../../skills/glyph-kit/scripts/areas/wireframes.mjs";
import { createCells, setLevel } from "./motion/cells.js";
import { onTick } from "./motion/tick.js";

const root = document.querySelector("[data-gk-say]");
if (!(root instanceof HTMLElement)) throw new Error("The typed screen builder is missing.");

const form = root.querySelector("[data-gk-say-form]");
const field = form?.querySelector("textarea[name='say']");
const addButton = form?.querySelector("[data-gk-say-add]");
const listenButton = form?.querySelector("[data-gk-say-listen]");
const undoButton = form?.querySelector("[data-gk-say-undo]");
const resetButton = form?.querySelector("[data-gk-say-reset]");
const status = form?.querySelector("[data-gk-say-status]");
const figure = root.querySelector("[data-gk-say-figure]");
const titleOut = root.querySelector("[data-gk-say-title]");
const stateOut = root.querySelector("[data-gk-say-state]");
const specOut = root.querySelector("[data-gk-say-spec]");
const loader = form?.querySelector("[data-gk-say-loader]");

if (!(form instanceof HTMLFormElement) || !(field instanceof HTMLTextAreaElement) || !(figure instanceof HTMLElement) || !(status instanceof HTMLOutputElement)) {
  throw new Error("The typed screen builder could not start. Reload the page to try again.");
}

const blank = () => ({ kind: "screen", data: { title: "", rows: [] } });
let committed = blank();
let activeRecognition = null;
let sessionNumber = 0;
let loaderTick = 0;
let loaderStop = null;
const spans = new Map();
const cells = loader ? createCells(loader, 4, { level: 1 }) : [];

function setStatus(message, state = "idle") {
  status.textContent = message;
  status.dataset.state = state;
}

function setListening(isListening) {
  if (!(listenButton instanceof HTMLButtonElement)) return;
  listenButton.textContent = isListening ? "Stop listening" : "Listen";
  listenButton.setAttribute("aria-pressed", String(isListening));
  listenButton.dataset.listening = String(isListening);
  if (loader) loader.hidden = !isListening;
  if (isListening && loaderStop === null && loader) {
    loaderStop = onTick(loader, (tick) => {
      loaderTick = tick;
      cells.forEach((cell, index) => setLevel(cell, index === tick % cells.length ? 8 : 2));
    });
  } else if (!isListening) {
    loaderStop?.();
    loaderStop = null;
    cells.forEach((cell, index) => setLevel(cell, index === 0 ? 5 : 1));
  }
}

function draftInfo(text) {
  const value = text.trim();
  if (!value) return { spec: screenSpec(committed), ids: new Set(), unread: false };
  const changes = read(value, committed);
  const preview = apply(committed, changes);
  const before = new Map([...committed.data.rows, ...(committed.data.overlay?.rows ?? [])].map((row) => [row.id, JSON.stringify(rowWithoutId(row))]));
  const ids = new Set();
  for (const row of [...preview.data.rows, ...(preview.data.overlay?.rows ?? [])]) {
    if (!before.has(row.id) || before.get(row.id) !== JSON.stringify(rowWithoutId(row))) ids.add(row.id);
  }
  return { spec: screenSpec(preview), ids, unread: [...preview.data.rows, ...(preview.data.overlay?.rows ?? [])].some((row) => ids.has(row.id) && row.unread) };
}

function rowWithoutId(row) {
  const { id, ...content } = row;
  return content;
}

function rowLineKeys(spec, lines) {
  if (spec.data.overlay) return lines.map((_, index) => ({ key: `overlay:${index}`, row: null }));
  const keys = [{ key: "frame:top", row: null }];
  const width = spec.data.width ?? 46;
  const inner = width - 4;
  for (const row of spec.data.rows) {
    const count = PRIMITIVES[row.type](row, inner).length;
    for (let line = 0; line < count; line += 1) keys.push({ key: `${row.id}:${line}`, row });
  }
  keys.push({ key: "frame:bottom", row: null });
  while (keys.length < lines.length) keys.push({ key: `footer:${keys.length}`, row: null });
  return lines.map((_, index) => keys[index] ?? { key: `line:${index}`, row: null });
}

function withDraftEdge(line) {
  const first = line.indexOf("║");
  const last = line.lastIndexOf("║");
  if (first >= 0 && last > first) {
    const start = first + 2;
    const end = last - 1;
    const body = line.slice(start, end);
    const contentEnd = body.trimEnd().length;
    if (body.length - contentEnd >= 2) return `${line.slice(0, start + contentEnd)}··${line.slice(start + contentEnd + 2)}`;
  }
  return `${line} ··`;
}

function render(spec, { draftIds = new Set(), hasDraft = false } = {}) {
  const lines = drawScreen(spec.data).split("\n");
  const keys = rowLineKeys(spec, lines);
  const fragment = document.createDocumentFragment();
  lines.forEach((line, index) => {
    const { key, row } = keys[index];
    let span = spans.get(key);
    if (!span) {
      span = document.createElement("span");
      span.dataset.rowId = key;
      spans.set(key, span);
    }
    const isDraft = Boolean(row && (draftIds.has(row.id) || row.unread));
    const draftTitle = key === "frame:top" && hasDraft && spec.data.title !== committed.data.title;
    const text = isDraft ? withDraftEdge(line) : draftTitle ? line.replace("╔═", "╔·") : line || " ";
    if (span.textContent !== text) span.textContent = text;
    span.classList.toggle("gl-mute", isDraft || draftTitle);
    if (isDraft || draftTitle) span.dataset.draft = "true";
    else span.removeAttribute("data-draft");
    fragment.append(span);
    if (index < lines.length - 1) fragment.append(document.createTextNode("\n"));
  });
  for (const key of spans.keys()) {
    if (!keys.some((entry) => entry.key === key)) spans.delete(key);
  }
  figure.replaceChildren(fragment);
  const title = spec.data.title || "Untitled screen";
  titleOut.textContent = title;
  stateOut.textContent = hasDraft ? "Draft" : spec.data.rows.some((row) => row.unread) ? "Kept as text" : "Screen";
  const unread = spec.data.rows.some((row) => row.unread) || (spec.data.overlay?.rows ?? []).some((row) => row.unread);
  figure.setAttribute("aria-label", `${title}. ${hasDraft ? "Draft preview." : "Screen preview."}${unread ? " Unrecognized words are kept as text." : ""}`);
  specOut.textContent = JSON.stringify(spec, null, 2);
}

function refreshDraft() {
  try {
    const info = draftInfo(field.value);
    render(info.spec, { draftIds: info.ids, hasDraft: Boolean(field.value.trim()) });
    addButton.disabled = !field.value.trim();
    if (field.value.trim()) {
      setStatus(info.unread ? "Unfamiliar words are kept as text. Add to keep this phrase." : "Draft preview. Add it or finish with punctuation to keep it.");
    } else if (!activeRecognition) {
      setStatus("Type a screen. Add or punctuation keeps each phrase.");
    }
    return info;
  } catch (error) {
    addButton.disabled = !field.value.trim();
    field.dataset.invalid = "";
    setStatus(error instanceof Error ? error.message : "That phrase could not be read. Edit it and try again.", "error");
    return null;
  }
}

function commit(text, { source = "typing" } = {}) {
  const value = text.trim();
  if (!value) return false;
  try {
    const candidate = apply(committed, read(value, committed));
    const visible = screenSpec(candidate);
    drawScreen(visible.data);
    committed = candidate;
    field.removeAttribute("data-invalid");
    field.value = "";
    render(visible);
    addButton.disabled = true;
    undoButton.disabled = !committed._say?.history?.length;
    const addedUnread = [...committed.data.rows, ...(committed.data.overlay?.rows ?? [])].some((row) => row.unread);
    setStatus(addedUnread ? "Unfamiliar words kept as text." : "Phrase added.");
    return true;
  } catch (error) {
    field.dataset.invalid = "";
    setStatus(error instanceof Error ? error.message : "That phrase could not be added. Edit it and try again.", "error");
    return false;
  }
}

function stopRecognition({ keepDraft = true, message = "Listening stopped." } = {}) {
  const session = activeRecognition;
  if (!session) {
    setListening(false);
    if (!keepDraft && field.value) field.value = "";
    if (field.value.trim()) refreshDraft();
    else setStatus(message);
    return;
  }
  activeRecognition = null;
  sessionNumber += 1;
  if (session?.recognition) {
    session.recognition.onresult = null;
    session.recognition.onerror = null;
    session.recognition.onend = null;
    try { session.recognition.stop(); } catch { /* Some engines throw after an automatic end. */ }
  }
  setListening(false);
  if (!keepDraft && field.value) field.value = "";
  if (field.value.trim()) refreshDraft();
  else setStatus(message);
}

function startRecognition() {
  if (field.value.trim()) {
    setStatus("Add or finish typing this phrase before listening.", "error");
    field.focus();
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (typeof SpeechRecognition !== "function") {
    setStatus("This browser can't listen. Type it instead.", "error");
    field.focus();
    return;
  }
  let recognition;
  try {
    recognition = new SpeechRecognition();
  } catch {
    setStatus("Speech could not start. Type it instead.", "error");
    field.focus();
    return;
  }
  const session = { id: ++sessionNumber, recognition, finals: new Set(), draft: "" };
  activeRecognition = session;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  setListening(true);
  setStatus("Listening.");
  recognition.onresult = (event) => {
    if (activeRecognition !== session || session.id !== sessionNumber) return;
    const interim = [];
    for (let index = 0; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = String(result?.[0]?.transcript ?? "").trim();
      if (!transcript) continue;
      if (result.isFinal) {
        if (session.finals.has(index)) continue;
        session.finals.add(index);
        session.draft = "";
        field.value = "";
        if (!commit(transcript, { source: "speech" })) {
          const message = status.textContent || "That phrase could not be added. Edit it and try again.";
          field.value = transcript;
          activeRecognition = null;
          sessionNumber += 1;
          recognition.onresult = null;
          recognition.onerror = null;
          recognition.onend = null;
          try { recognition.abort?.(); } catch { /* Cleanup is best effort after an invalid final result. */ }
          setListening(false);
          field.dataset.invalid = "";
          setStatus(message, "error");
          field.focus();
          return;
        }
      } else {
        interim.push(transcript);
      }
    }
    session.draft = interim.join(" ");
    field.value = session.draft;
    refreshDraft();
  };
  recognition.onerror = (event) => {
    if (activeRecognition !== session || session.id !== sessionNumber) return;
    const messages = {
      "not-allowed": "Microphone access is blocked. Type it instead.",
      "service-not-allowed": "Speech is unavailable here. Type it instead.",
      network: "The speech service is unavailable. Type it instead.",
      "no-speech": "No words came through. Try again or type them."
    };
    const message = messages[event.error] || "Speech stopped unexpectedly. Type it or listen again.";
    activeRecognition = null;
    sessionNumber += 1;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try { recognition.abort?.(); } catch { /* Cleanup is best effort after a recognition error. */ }
    setListening(false);
    setStatus(message, "error");
    field.focus();
  };
  recognition.onend = () => {
    if (activeRecognition !== session || session.id !== sessionNumber) return;
    activeRecognition = null;
    sessionNumber += 1;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    setListening(false);
    if (field.value.trim()) {
      refreshDraft();
      setStatus("Draft kept. Edit it or add it before listening again.");
    } else setStatus("Listening stopped. Type or listen again.");
  };
  try {
    recognition.start();
  } catch {
    activeRecognition = null;
    sessionNumber += 1;
    setListening(false);
    setStatus("Speech could not start. Type it instead.", "error");
    field.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (activeRecognition) stopRecognition({ keepDraft: true, message: "Listening stopped." });
  commit(field.value);
});

function terminalPunctuation(text) {
  const value = text.trimEnd();
  const index = value.length - 1;
  if (index < 0 || !/[.!?]/.test(value[index])) return false;
  if (/\b[\w.+-]+@[\w.-]*\.$/.test(value)) return false;
  let quote = "";
  for (let cursor = 0; cursor <= index; cursor += 1) {
    const char = value[cursor];
    if (!quote) {
      if (char === "“") quote = "”";
      else if (char === "‘") quote = "’";
      else if (char === "\"") quote = char;
      if (cursor === index) return !quote;
    } else if (char === quote) quote = "";
  }
  return false;
}

field.addEventListener("input", () => {
  if (activeRecognition) stopRecognition({ keepDraft: true, message: "Listening stopped." });
  field.removeAttribute("data-invalid");
  if (terminalPunctuation(field.value)) commit(field.value);
  else refreshDraft();
});

listenButton.addEventListener("click", () => {
  if (activeRecognition) stopRecognition({ keepDraft: true });
  else startRecognition();
});

undoButton.addEventListener("click", () => {
  if (activeRecognition) stopRecognition({ keepDraft: true });
  if (!committed._say?.history?.length) {
    setStatus("There is nothing to undo.");
    return;
  }
  committed = apply(committed, [{ op: "undo" }]);
  const draft = draftInfo(field.value);
  render(draft.spec, { draftIds: draft.ids, hasDraft: Boolean(field.value.trim()) });
  undoButton.disabled = !committed._say?.history?.length;
  setStatus("Last phrase undone.");
});

resetButton.addEventListener("click", () => {
  stopRecognition({ keepDraft: false, message: "Screen cleared." });
  committed = blank();
  field.value = "";
  field.removeAttribute("data-invalid");
  undoButton.disabled = true;
  addButton.disabled = true;
  render(screenSpec(committed));
  setStatus("Screen cleared.");
});

window.addEventListener("pagehide", () => stopRecognition({ keepDraft: true, message: "Listening stopped." }), { once: true });

field.disabled = false;
addButton.disabled = true;
listenButton.disabled = false;
undoButton.disabled = true;
resetButton.disabled = false;
render(screenSpec(committed));
setStatus("Type a screen. Add or punctuation keeps each phrase.");
