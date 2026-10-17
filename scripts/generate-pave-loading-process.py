#!/usr/bin/env python3
"""Build the recorded Pave loading-process reel and its static evidence assets.

The supplied archive is evidence, not a runtime dependency. This script copies the
curated source captures into ``public/case-studies/pave-loading-process`` and
turns individual recorded poses into a labelled, silent H.264 reel.

Usage:
  python3 scripts/generate-pave-loading-process.py \
    --source /tmp/pave-iteration-plan-source/pave-loading-animation
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from collections import OrderedDict
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable


SITE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path("/tmp/pave-iteration-plan-source/pave-loading-animation")
PUBLIC_ROOT = SITE_ROOT / "public" / "case-studies" / "pave-loading-process"
MEDIA_ROOT = SITE_ROOT / "public" / "case-studies" / "media"
STAGE_WIDTH = 1280
STAGE_HEIGHT = 720
REEL_SPEED = 2


LABELS = {
    "001": "FIRST DIRECTIONS",
    "002": "REVIEW / NO CHANGE",
    "003": "NOISE REJECTED",
    "006": "GREEN + TRAILS",
    "007": "THE SQUARE IS THE STAGE",
    "009": "DRAW THE MARK",
    "010": "FEATURE ICONS",
    "011": "FIXED GRID",
    "012": "INVISIBLE MATRIX",
    "013": "SOURCE ICONS",
    "014": "THE CHIP SPEAKS",
    "015": "IN THE BUILDER",
    "016": "POINTER RESPONSE",
    "017": "FINISH FROM ANYWHERE",
    "020": "HEAT + TRAILS",
    "022": "SEEDED SHUFFLE",
    "023": "MORE MOTIFS",
    "028": "NO MORPHING",
    "029": "FIVE BY FIVE",
    "030": "WHITE LEADS GREEN",
    "031": "COMPLETE FROM ANY STAGE",
    "032": "SEED THE FINISH",
    "033": "CHIP IN CHAT",
    "034": "FAILURE SIGNAL",
    "035": "A FRONT DOOR",
    "036": "THE MINIMUM WAIT",
    "037": "SHOW IT LIVE",
    "038": "IN THE TRANSCRIPT",
    "040": "FIFTEEN STATES",
    "042": "RECORDED CONTRACT",
    "043": "DEMO FRAME",
    "044": "ONE CONTINUOUS DARK",
    "045": "MOTIF GRID",
    "046": "MOTIF / FINISH PAIRS",
}

# Major shifts get a longer, still frame. Everything else stays within the
# approved 0.4–0.65 second pose range.
DECISION_HOLDS = {"002", "003", "009", "011", "014", "028", "029", "032", "040", "042", "046"}
HOLD_SOURCES = {
    "entry-002-review.png",
    "entry-003-transitions.png",
    "entry-009-drawgrid-h.png",
    "entry-011-reveal-wave.png",
    "entry-014-mini-states.png",
    "entry-028-b-vs-b2.png",
    "entry-029-b3-reel.png",
    "entry-032-completion-fill.png",
    "entry-040-fifteen-states.png",
    "entry-042-realistic-turn.png",
    "entry-046-pairs.png",
}

SPECIAL_CROP_LABELS = {
    "entry-003-transitions.png": ["SHARED CELLS", "CELLS TRAVEL", "GAPS RAIN IN"],
    "entry-009-drawgrid-v.png": ["VERTICALS DRAW"],
    "entry-009-drawgrid-h.png": ["HORIZONTALS DRAW"],
    "entry-013-icon-sources.png": ["SOURCE ICONS"],
    "entry-016-particles.png": ["REST", "SCATTER", "SETTLE", "CLICK"],
    "entry-028-b-vs-b2.png": ["SPRING PHYSICS", "FIXED CELLS"],
    "entry-029-ignite.png": ["AT REST", "POINTER IGNITE"],
    "entry-032-completion-fill.png": ["LIT SEED", "FLOOD", "RETRACT", "MARK"],
    "entry-046-pairs.png": ["MOTIF / COMPLETE PAIRS"],
}

# Full page captures stay intact in the browsable archive. The reel uses the
# recorded subject within those pages, so the dot work is readable at the
# fixed 1280×720 stage instead of shrinking into an interface thumbnail.
SCREENSHOT_CROPS: dict[str, list[tuple[int, int, int, int, str]]] = {
    "entry-001-lab.png": [
        (28, 260, 430, 405, "MOSAIC"),
        (482, 260, 430, 405, "COUNTER"),
        (936, 260, 430, 405, "SEED"),
    ],
    "entry-002-review.png": [
        (32, 275, 450, 420, "MOSAIC / REVIEW"),
        (495, 275, 450, 420, "COUNTER / REVIEW"),
        (950, 275, 450, 420, "SEED / REVIEW"),
    ],
    # Preserve the side-by-side proof rather than lingering on an empty
    # isolated cell from this two-frame source.
    "entry-028-b-vs-b2.png": [(0, 0, 440, 220, "SPRING / FIXED COMPARISON")],
    "entry-031-per-stage-complete.png": [
        (42, 72, 364, 350, "WARMING / THINKING"),
        (42, 426, 364, 350, "PIPELINE / SUCCESS"),
    ],
    "entry-035-landing.png": [(210, 45, 1010, 560, "THE BUILD WAIT")],
    "entry-037-landing-v2.png": [
        (240, 120, 800, 530, "BUILDER WAIT"),
        (240, 655, 800, 460, "CHIP IN CONTEXT"),
    ],
    "entry-040-fifteen-states.png": [
        (8, 165, 418, 330, "LADDER / WORK"),
        (8, 455, 418, 330, "EXCEPTIONS / FINISH"),
    ],
    "entry-045-motif-grid.png": [
        (165, 30, 340, 235, "MATRIX / ROULETTE"),
        (520, 30, 360, 235, "SPIRAL / RADAR"),
    ],
    "entry-046-pairs.png": [
        (46, 255, 380, 225, "FULL LOOP / FINISH"),
        (450, 255, 380, 225, "MATRIX RAIN / FINISH"),
        (854, 255, 380, 225, "ROULETTE / FINISH"),
    ],
}

# Entry 040 is the recorded state atlas. These crops isolate the 3×3 chip so
# the case-study card does not accidentally show clipped host copy as artwork.
STATE_CHIP_CROPS: dict[str, tuple[int, int, int, int]] = {
    "loading": (8, 221, 26, 26),
    "warming": (8, 257, 26, 26),
    "thinking": (8, 293, 26, 26),
    "still-thinking": (8, 331, 26, 26),
    "almost-ready": (8, 369, 26, 26),
    "working": (8, 407, 26, 26),
    "researching": (8, 450, 26, 26),
    "pipeline": (8, 494, 26, 26),
    "waiting": (8, 532, 26, 26),
    "degraded": (8, 570, 26, 26),
    "reconnecting": (8, 608, 26, 26),
    "disconnected": (8, 650, 19, 26),
    "stopped": (8, 692, 26, 26),
    "success": (8, 730, 26, 26),
    "failure": (8, 768, 26, 26),
}

# The full UI frame remains available in the index. These three evidence crops
# let a reader locate the correlated product surfaces without guessing from a
# tiny, unannotated full-page capture.
TURN_042_CROPS: dict[str, tuple[int, int, int, int]] = {
    "plan": (84, 96, 460, 570),
    "nudge": (84, 674, 500, 192),
    "preview": (812, 270, 410, 430),
}


@dataclass
class Capture:
    entry: str
    title: str
    source: str
    caption: str
    reference: bool


@dataclass
class Shot:
    order: int
    entry: str
    source: str
    archive: str
    source_caption: str
    crop: dict[str, int]
    frame: str
    label: str
    pose_label: str
    duration: float


class TimelineParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.entries: OrderedDict[str, dict[str, object]] = OrderedDict()
        self.current_entry: str | None = None
        self.in_title = False
        self.title_chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "article" and values.get("class") == "entry":
            identifier = values.get("id", "")
            if identifier.startswith("entry-"):
                self.current_entry = identifier.removeprefix("entry-")
                self.entries[self.current_entry] = {"title": "", "images": []}
        elif tag == "h2" and values.get("class") == "entry-title" and self.current_entry:
            self.in_title = True
            self.title_chunks = []
        elif tag == "img" and self.current_entry:
            source = values.get("src")
            if source:
                images = self.entries[self.current_entry]["images"]
                assert isinstance(images, list)
                images.append((source, values.get("alt", "")))

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_chunks.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "h2" and self.in_title and self.current_entry:
            self.entries[self.current_entry]["title"] = "".join(self.title_chunks).strip()
            self.in_title = False
        elif tag == "article":
            self.current_entry = None


def run(command: list[str], *, env: dict[str, str] | None = None) -> None:
    subprocess.run(command, check=True, env=env)


def media_duration_seconds(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def image_dimensions(path: Path) -> tuple[int, int]:
    result = subprocess.run(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    values: dict[str, int] = {}
    for line in result.stdout.splitlines():
        line = line.strip()
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        if key in {"pixelWidth", "pixelHeight"}:
            values[key] = int(value.strip())
    return values["pixelWidth"], values["pixelHeight"]


def read_captures(source_root: Path) -> list[Capture]:
    timeline = source_root / "02-process" / "timeline.html"
    parser = TimelineParser()
    parser.feed(timeline.read_text(encoding="utf-8"))
    captures: list[Capture] = []
    for entry, data in parser.entries.items():
        title = str(data["title"])
        images = data["images"]
        assert isinstance(images, list)
        for image_source, caption in images:
            source_name = Path(image_source).name
            captures.append(
                Capture(
                    entry=entry,
                    title=title,
                    source=image_source,
                    caption=caption,
                    reference=entry == "001" and source_name.startswith("ref-"),
                )
            )
    return captures


def crop_slots(width: int, height: int) -> list[int | None]:
    """Return individual centre-subject poses without making the reel a strip wall."""
    if height <= 0 or width / height < 1.95:
        return [None]
    cells = round(width / height)
    if cells < 2 or abs(width - (cells * height)) > 3:
        return [None]
    if cells == 2:
        return [0, 1]
    if cells == 3:
        return [0, 1, 2]
    return sorted({0, cells // 2, cells - 1})


def crop_rect(width: int, height: int, slot: int | None) -> dict[str, int]:
    if slot is None:
        return {"x": 0, "y": 0, "width": width, "height": height}
    return {"x": slot * height, "y": 0, "width": height, "height": height}


def short_pose_label(capture: Capture, slot: int | None, selected: list[int | None]) -> str:
    source_name = Path(capture.source).name
    labels = SPECIAL_CROP_LABELS.get(source_name)
    ordinal = selected.index(slot) if slot in selected else 0
    if labels and slot is not None:
        return labels[min(ordinal, len(labels) - 1)]
    if slot is not None:
        return f"RECORDED POSE {ordinal + 1:02d} / {len(selected):02d}"
    return "RECORDED CAPTURE"


def duration_for(capture: Capture, index: int, count: int) -> float:
    if (
        capture.entry in DECISION_HOLDS
        and Path(capture.source).name in HOLD_SOURCES
        and index == count // 2
    ):
        return 1.0 if capture.entry != "046" else 1.2
    return 0.4


def planned_crops(capture: Capture, width: int, height: int) -> list[tuple[dict[str, int], str]]:
    custom = SCREENSHOT_CROPS.get(Path(capture.source).name)
    if custom:
        return [
            ({"x": x, "y": y, "width": crop_width, "height": crop_height}, label)
            for x, y, crop_width, crop_height, label in custom
        ]
    slots = crop_slots(width, height)
    return [
        (crop_rect(width, height, slot), short_pose_label(capture, slot, slots))
        for slot in slots
    ]


SWIFT_RENDERER = r'''
import AppKit
import Foundation

struct Job: Codable {
  let input: String
  let output: String
  let entry: String
  let label: String
  let poseLabel: String
  let caption: String
}

let stage = NSSize(width: 1280, height: 720)
let manifestURL = URL(fileURLWithPath: CommandLine.arguments[1])
let jobs = try JSONDecoder().decode([Job].self, from: Data(contentsOf: manifestURL))
let mono = NSFont(name: "Menlo", size: 16) ?? NSFont.monospacedSystemFont(ofSize: 16, weight: .medium)
let headline = NSFont(name: "Menlo-Bold", size: 22) ?? NSFont.monospacedSystemFont(ofSize: 22, weight: .bold)

func drawText(_ text: String, in rect: NSRect, font: NSFont, color: NSColor, alignment: NSTextAlignment = .left) {
  let style = NSMutableParagraphStyle()
  style.alignment = alignment
  style.lineBreakMode = .byTruncatingTail
  (text as NSString).draw(in: rect, withAttributes: [
    .font: font,
    .foregroundColor: color,
    .paragraphStyle: style
  ])
}

for job in jobs {
  guard let image = NSImage(contentsOf: URL(fileURLWithPath: job.input)) else {
    throw NSError(domain: "pave", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing image \(job.input)"])
  }
  guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(stage.width),
    pixelsHigh: Int(stage.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  ) else { throw NSError(domain: "pave", code: 2) }
  guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else { throw NSError(domain: "pave", code: 3) }

  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = context
  NSColor(calibratedRed: 0.045, green: 0.075, blue: 0.061, alpha: 1).setFill()
  NSBezierPath.fill(NSRect(origin: .zero, size: stage))
  let imageSize = image.size
  let maxWidth: CGFloat = 1020
  let maxHeight: CGFloat = 532
  let scale = min(maxWidth / imageSize.width, maxHeight / imageSize.height)
  let shown = NSSize(width: imageSize.width * scale, height: imageSize.height * scale)
  let shownRect = NSRect(x: (stage.width - shown.width) / 2, y: (stage.height - shown.height) / 2 - 5, width: shown.width, height: shown.height)
  NSColor(calibratedWhite: 0, alpha: 0.24).setFill()
  NSBezierPath.fill(NSRect(x: shownRect.minX - 2, y: shownRect.minY - 2, width: shownRect.width + 4, height: shownRect.height + 4))
  let interpolation: NSImageInterpolation = min(imageSize.width, imageSize.height) <= 260 ? .none : .high
  image.draw(in: shownRect, from: NSRect(origin: .zero, size: imageSize), operation: .sourceOver, fraction: 1, respectFlipped: true, hints: [.interpolation: interpolation])

  drawText("ITERATION \(job.entry)", in: NSRect(x: 44, y: stage.height - 76, width: 190, height: 22), font: mono, color: NSColor(calibratedWhite: 0.78, alpha: 1))
  drawText(job.label, in: NSRect(x: 44, y: 38, width: 820, height: 30), font: headline, color: .white)
  drawText(job.poseLabel, in: NSRect(x: 876, y: 43, width: 360, height: 22), font: mono, color: NSColor(calibratedWhite: 0.78, alpha: 1), alignment: .right)

  NSGraphicsContext.restoreGraphicsState()
  let outputURL = URL(fileURLWithPath: job.output)
  try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
  guard let encoded = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.93]) else { throw NSError(domain: "pave", code: 4) }
  try encoded.write(to: outputURL)
}
'''


def write_renderer(temp_dir: Path) -> Path:
    renderer = temp_dir / "render-pave-stage.swift"
    renderer.write_text(SWIFT_RENDERER, encoding="utf-8")
    return renderer


def copy_capture(source_root: Path, capture: Capture, archive_root: Path) -> Path:
    source_path = source_root / "02-process" / capture.source
    destination = archive_root / f"{capture.entry}-{source_path.name}"
    shutil.copy2(source_path, destination)
    return destination


def write_evidence_crop(source: Path, destination: Path, crop: tuple[int, int, int, int]) -> None:
    x, y, width, height = crop
    destination.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-vf",
            f"crop={width}:{height}:{x}:{y},scale={width * 4}:{height * 4}:flags=neighbor",
            "-frames:v",
            "1",
            str(destination),
        ]
    )


def generate_state_chips(output_root: Path) -> dict[str, str]:
    """Create the entry-040 source chip crops without touching the reel."""
    archive_root = output_root / "archive"
    state_source = archive_root / "040-entry-040-fifteen-states.png"
    if not state_source.is_file():
        raise RuntimeError("Expected entry 040 in the copied archive.")

    states: dict[str, str] = {}
    for state, crop in STATE_CHIP_CROPS.items():
        destination = output_root / "states" / f"{state}.png"
        write_evidence_crop(state_source, destination, crop)
        states[state] = str(destination.relative_to(output_root))
    return states


def generate_context_evidence(output_root: Path) -> dict[str, str]:
    """Create the labelled entry-042 source crops without touching the reel."""
    turn_source = output_root / "archive" / "042-entry-042-realistic-turn.png"
    if not turn_source.is_file():
        raise RuntimeError("Expected entry 042 in the copied archive.")

    turn: dict[str, str] = {}
    for surface, crop in TURN_042_CROPS.items():
        destination = output_root / "turn-042" / f"{surface}.png"
        write_evidence_crop(turn_source, destination, crop)
        turn[surface] = str(destination.relative_to(output_root))
    return turn


def state_crop_metadata() -> dict[str, dict[str, int]]:
    return {
        state: {"x": x, "y": y, "width": width, "height": height}
        for state, (x, y, width, height) in STATE_CHIP_CROPS.items()
    }


def generate_supporting_assets(output_root: Path) -> dict[str, object]:
    """Create source crops used beside the state and prototype explanations."""
    return {
        "states": generate_state_chips(output_root),
        "entry_042": generate_context_evidence(output_root),
        "state_chip_crops": state_crop_metadata(),
    }


def generate_stages(source_root: Path, captures: Iterable[Capture], output_root: Path, temp_dir: Path) -> tuple[list[Shot], list[dict[str, str]]]:
    archive_root = output_root / "archive"
    reels_root = output_root / "reel"
    archive_root.mkdir(parents=True, exist_ok=True)
    reels_root.mkdir(parents=True, exist_ok=True)
    crop_root = temp_dir / "crops"
    crop_root.mkdir(parents=True, exist_ok=True)
    shots: list[Shot] = []
    renderer_jobs: list[dict[str, str]] = []
    source_images: list[dict[str, str]] = []

    shot_order = 0
    for capture in captures:
        source_path = source_root / "02-process" / capture.source
        archive_path = copy_capture(source_root, capture, archive_root)
        source_images.append(
            {
                "entry": capture.entry,
                "title": capture.title,
                "source": capture.source,
                "archive": str(archive_path.relative_to(output_root)),
                "caption": capture.caption,
                "kind": "reference" if capture.reference else "recorded-iteration",
            }
        )
        if capture.reference:
            continue
        width, height = image_dimensions(source_path)
        crops = planned_crops(capture, width, height)
        for index, (crop, pose_label) in enumerate(crops):
            shot_order += 1
            crop_path = crop_root / f"{shot_order:03d}.png"
            run(
                [
                    "ffmpeg",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-y",
                    "-i",
                    str(source_path),
                    "-vf",
                    f"crop={crop['width']}:{crop['height']}:{crop['x']}:{crop['y']}",
                    "-frames:v",
                    "1",
                    str(crop_path),
                ]
            )
            frame_path = reels_root / f"{shot_order:03d}-entry-{capture.entry}.jpg"
            label = LABELS.get(capture.entry, capture.title.upper())
            renderer_jobs.append(
                {
                    "input": str(crop_path),
                    "output": str(frame_path),
                    "entry": capture.entry,
                    "label": label,
                    "poseLabel": pose_label,
                    "caption": capture.caption,
                }
            )
            shots.append(
                Shot(
                    order=shot_order,
                    entry=capture.entry,
                    source=capture.source,
                    archive=str(archive_path.relative_to(output_root)),
                    source_caption=capture.caption,
                    crop=crop,
                    frame=str(frame_path.relative_to(output_root)),
                    label=label,
                    pose_label=pose_label,
                    duration=duration_for(capture, index, len(crops)),
                )
            )

    renderer = write_renderer(temp_dir)
    jobs_path = temp_dir / "stage-jobs.json"
    jobs_path.write_text(json.dumps(renderer_jobs, indent=2), encoding="utf-8")
    swift_environment = os.environ.copy()
    swift_environment["CLANG_MODULE_CACHE_PATH"] = str(temp_dir / "swift-module-cache")
    run(["swift", str(renderer), str(jobs_path)], env=swift_environment)
    return shots, source_images


def encode_reel(shots: list[Shot], output_root: Path, temp_dir: Path) -> Path:
    concat = temp_dir / "reel-concat.txt"
    lines: list[str] = []
    for shot in shots:
        frame = output_root / shot.frame
        lines.append(f"file '{frame.as_posix()}'")
        lines.append(f"duration {shot.duration:.2f}")
    # Repeat the last frame because ffmpeg concat applies the final duration to
    # the following file entry.
    lines.append(f"file '{(output_root / shots[-1].frame).as_posix()}'")
    concat.write_text("\n".join(lines) + "\n", encoding="utf-8")
    unscaled_reel = temp_dir / "pave-loading-process-unscaled.mp4"
    output = MEDIA_ROOT / "pave-loading-process.mp4"
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat),
            "-an",
            "-r",
            "30",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-profile:v",
            "high",
            "-movflags",
            "+faststart",
            "-crf",
            "20",
            str(unscaled_reel),
        ]
    )
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-itsscale",
            str(1 / REEL_SPEED),
            "-i",
            str(unscaled_reel),
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )
    poster = MEDIA_ROOT / "pave-loading-process-poster.jpg"
    # The closing paired-motif evidence is the calmest reduced-motion still.
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(unscaled_reel),
            "-ss",
            f"{max(sum(shot.duration for shot in shots) - 1.0, 0):.2f}",
            "-frames:v",
            "1",
            str(poster),
        ]
    )
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE, help="Unpacked pave-loading-animation archive")
    args = parser.parse_args()
    source_root = args.source.resolve()
    if not (source_root / "02-process" / "timeline.html").is_file():
        parser.error(f"Could not find 02-process/timeline.html under {source_root}")
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None or shutil.which("swift") is None:
        parser.error("This generator requires the system ffmpeg, ffprobe, and swift executables.")

    captures = read_captures(source_root)
    recorded = [capture for capture in captures if not capture.reference]
    references = [capture for capture in captures if capture.reference]
    if len(recorded) != 43 or len(references) != 3:
        raise RuntimeError(f"Expected 43 recorded captures and 3 references; got {len(recorded)} and {len(references)}.")

    if PUBLIC_ROOT.exists():
        shutil.rmtree(PUBLIC_ROOT)
    PUBLIC_ROOT.mkdir(parents=True, exist_ok=True)
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="pave-loading-process-") as directory:
        shots, source_images = generate_stages(source_root, captures, PUBLIC_ROOT, Path(directory))
        supporting_assets = generate_supporting_assets(PUBLIC_ROOT)
        reel = encode_reel(shots, PUBLIC_ROOT, Path(directory))

    manifest = {
        "source": "02-process/timeline.html from the supplied Pave loading archive",
        "recorded_capture_count": len(recorded),
        "reference_image_count": len(references),
        "reel_shot_count": len(shots),
        "duration_seconds": round(media_duration_seconds(reel), 2),
        "playback_speed": REEL_SPEED,
        "reel": str(reel.relative_to(SITE_ROOT)),
        "poster": "public/case-studies/media/pave-loading-process-poster.jpg",
        "source_images": source_images,
        "supporting_assets": supporting_assets,
        "shots": [{**asdict(shot), "duration": round(shot.duration / REEL_SPEED, 2)} for shot in shots],
    }
    (PUBLIC_ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: manifest[key] for key in ("recorded_capture_count", "reference_image_count", "reel_shot_count", "duration_seconds", "reel")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
