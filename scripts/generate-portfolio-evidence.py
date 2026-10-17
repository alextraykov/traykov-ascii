"""Generate the two fixed-paper SVG evidence charts used in public case studies."""

from pathlib import Path
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
PAVE_OUTPUT = ROOT / "public/case-studies/pave-evidence/pave-nav-share-publish-rate-weekly.svg"
PIPELINES_OUTPUT = ROOT / "public/case-studies/quickbase/pipelines-ai-monthly-accounts.svg"

# Mirrors the public :root palette in src/styles/global.css.
PALETTE = {
    "paper": "#fbfbf8",
    "ink": "#080808",
    "muted": "#666660",
    "accent": "#353535",
    "grid": "#d8d8d2",
}


def text(value: object) -> str:
    return escape(str(value))


def point_list(values: list[float], x_at, y_at) -> str:
    return " ".join(f"{x_at(index):.1f},{y_at(value):.1f}" for index, value in enumerate(values))


def svg_document(title: str, description: str, body: list[str]) -> str:
    return "\n".join(
        [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560" width="960" height="560" role="img" aria-labelledby="chart-title chart-description">',
            f"<title id=\"chart-title\">{text(title)}</title>",
            f"<desc id=\"chart-description\">{text(description)}</desc>",
            f'<rect width="960" height="560" fill="{PALETTE["paper"]}"/>',
            '<g font-family="Geist Sans, ui-sans-serif, system-ui, sans-serif">',
            *body,
            "</g>",
            "</svg>",
            "",
        ]
    )


def draw_axis(
    *,
    maximum: float,
    step: float,
    left: int,
    top: int,
    width: int,
    height: int,
    label,
) -> list[str]:
    lines: list[str] = []
    for value in range(0, int(maximum) + 1, int(step)):
        y = top + height * (1 - value / maximum)
        lines.append(
            f'<line x1="{left}" y1="{y:.1f}" x2="{left + width}" y2="{y:.1f}" stroke="{PALETTE["grid"]}" stroke-width="1"/>'
        )
        lines.append(
            f'<text x="{left - 12}" y="{y + 4:.1f}" fill="{PALETTE["muted"]}" font-size="12" text-anchor="end">{text(label(value))}</text>'
        )
    return lines


def draw_pave_chart() -> str:
    share = [0.1, 0.1, 0.2, 1.2, 1.9, 3.3, 7.8, 10.4, 10.3, 11.0, 11.3, 11.8, 10.6, 10.3]
    publish = [22.8, 25.5, 23.8, 23.5, 19.7, 25.2, 27.1, 24.8, 23.4, 23.0, 23.8, 19.4, 18.9, 19.7]
    labels = ["Jun 8", "", "Jun 22", "", "Jul 6", "Jul 13", "Jul 20", "Jul 27", "Aug 3", "Aug 10", "Aug 17", "Aug 24", "Aug 31", "Sep 7*"]
    left, top, width, height, maximum = 74, 136, 794, 294, 30
    x_at = lambda index: left + width * index / (len(share) - 1)
    y_at = lambda value: top + height * (1 - value / maximum)
    title = "Pave weekly Share and Publish rates"
    description = (
        "Share click rate among weekly active users was 0.1, 0.1, and 0.2 percent in the first three recorded buckets; "
        "1.2 and 1.9 percent before July 16; 3.3 percent in the release week; 7.8 percent the following week; "
        "and about 10 to 12 percent from July 27 to September 11. Publish remained within about 19 to 27 percent."
    )
    body = [
        f'<text x="{left}" y="42" fill="{PALETTE["ink"]}" font-size="22" font-weight="700">Share clicks increased; Publish did not show a sustained change.</text>',
        f'<text x="{left}" y="68" fill="{PALETTE["muted"]}" font-size="14">Weekly action rates as a share of weekly active users · June 8–September 11, 2026</text>',
        *draw_axis(maximum=maximum, step=5, left=left, top=top, width=width, height=height, label=lambda value: f"{value}%"),
    ]
    for index, label in enumerate(labels):
        if label:
            body.append(
                f'<text x="{x_at(index):.1f}" y="{top + height + 26}" fill="{PALETTE["muted"]}" font-size="11" text-anchor="middle">{text(label)}</text>'
            )
    annotations = [
        (5, ["Jul 16", "Header release"], "end"),
        (6, ["Jul 23–24", "Builder changes"], "start"),
        (9, ["Aug 13", "Share dialog"], "start"),
    ]
    for index, lines, anchor in annotations:
        x = x_at(index)
        body.append(
            f'<line x1="{x:.1f}" y1="{top - 10}" x2="{x:.1f}" y2="{top + height}" stroke="{PALETTE["accent"]}" stroke-width="1" stroke-dasharray="4 4"/>'
        )
        dx = -7 if anchor == "end" else 7
        for line_index, line in enumerate(lines):
            body.append(
                f'<text x="{x + dx:.1f}" y="{96 + line_index * 15}" fill="{PALETTE["accent"]}" font-size="11" text-anchor="{anchor}">{text(line)}</text>'
            )
    body.extend(
        [
            f'<polyline points="{point_list(publish, x_at, y_at)}" fill="none" stroke="{PALETTE["muted"]}" stroke-width="3" stroke-dasharray="8 6" stroke-linejoin="round" stroke-linecap="round"/>',
            f'<polyline points="{point_list(share, x_at, y_at)}" fill="none" stroke="{PALETTE["ink"]}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>',
        ]
    )
    for index, value in enumerate(publish):
        body.append(
            f'<circle cx="{x_at(index):.1f}" cy="{y_at(value):.1f}" r="3.5" fill="{PALETTE["paper"]}" stroke="{PALETTE["muted"]}" stroke-width="2"/>'
        )
    for index, value in enumerate(share):
        body.append(
            f'<circle cx="{x_at(index):.1f}" cy="{y_at(value):.1f}" r="3.5" fill="{PALETTE["ink"]}" stroke="{PALETTE["paper"]}" stroke-width="1.5"/>'
        )
    body.extend(
        [
            f'<line x1="{left}" y1="482" x2="{left + 22}" y2="482" stroke="{PALETTE["ink"]}" stroke-width="3"/>',
            f'<text x="{left + 30}" y="487" fill="{PALETTE["ink"]}" font-size="13">Clicked Share</text>',
            f'<line x1="{left + 180}" y1="482" x2="{left + 202}" y2="482" stroke="{PALETTE["muted"]}" stroke-width="3" stroke-dasharray="8 6"/>',
            f'<text x="{left + 210}" y="487" fill="{PALETTE["ink"]}" font-size="13">Published an app</text>',
            f'<text x="{left}" y="520" fill="{PALETTE["muted"]}" font-size="12">Source: Pave product telemetry. No holdout; multiple releases changed this period.</text>',
            f'<text x="{left}" y="540" fill="{PALETTE["muted"]}" font-size="12">* Sep 7 week is partial, through Sep 11. Aug 10 and Aug 17 were repaired after a timestamp issue.</text>',
        ]
    )
    return svg_document(title, description, body)


def draw_pipelines_chart() -> str:
    accounts = [57, 61, 64, 219, 414, 456, 533, 639, 748, 690, 707, 710, 706, 745, 737, 586, 638, 683, 727, 759, 858, 836, 942, 843, 862]
    labels = ["Aug 24", "", "", "Nov", "", "Jan 25", "", "", "Apr", "", "", "Jul", "", "", "Oct", "", "", "Jan 26", "", "", "Apr", "", "", "Jul", "Aug"]
    left, top, width, height, maximum = 74, 126, 794, 304, 1000
    x_at = lambda index: left + width * index / (len(accounts) - 1)
    y_at = lambda value: top + height * (1 - value / maximum)
    title = "Monthly Pipelines AI account reach"
    description = (
        "Monthly customer accounts using any Pipelines AI feature rose from 57 in August 2024 to 862 in August 2026, "
        "with a 942-account peak in June 2026. The umbrella feature set changed across the period, so the chart shows observed reach rather than causal design impact."
    )
    body = [
        f'<text x="{left}" y="42" fill="{PALETTE["ink"]}" font-size="22" font-weight="700">Pipelines AI reached more accounts as the feature set evolved.</text>',
        f'<text x="{left}" y="68" fill="{PALETTE["muted"]}" font-size="14">Customer accounts using any Pipelines AI feature · August 2024–August 2026</text>',
        *draw_axis(maximum=maximum, step=250, left=left, top=top, width=width, height=height, label=lambda value: f"{value:,}"),
    ]
    for index, label in enumerate(labels):
        if label:
            body.append(
                f'<text x="{x_at(index):.1f}" y="{top + height + 26}" fill="{PALETTE["muted"]}" font-size="11" text-anchor="middle">{text(label)}</text>'
            )
    body.extend(
        [
            f'<polyline points="{point_list(accounts, x_at, y_at)}" fill="none" stroke="{PALETTE["ink"]}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>',
        ]
    )
    for index, value in enumerate(accounts):
        body.append(
            f'<circle cx="{x_at(index):.1f}" cy="{y_at(value):.1f}" r="3.5" fill="{PALETTE["ink"]}" stroke="{PALETTE["paper"]}" stroke-width="1.5"/>'
        )
    june_peak = 22
    august_end = 24
    body.extend(
        [
            f'<text x="{x_at(june_peak):.1f}" y="{y_at(accounts[june_peak]) - 12:.1f}" fill="{PALETTE["ink"]}" font-size="12" font-weight="700" text-anchor="middle">942 peak</text>',
            f'<text x="{x_at(august_end) - 8:.1f}" y="{y_at(accounts[august_end]) - 12:.1f}" fill="{PALETTE["ink"]}" font-size="12" font-weight="700" text-anchor="end">862</text>',
            f'<text x="{left}" y="492" fill="{PALETTE["muted"]}" font-size="12">Source: Pendo monthly account reach. The series measures an evolving umbrella feature, not one design’s attributable growth.</text>',
        ]
    )
    return svg_document(title, description, body)


def write_svg(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(path.relative_to(ROOT))


def main() -> None:
    write_svg(PAVE_OUTPUT, draw_pave_chart())
    write_svg(PIPELINES_OUTPUT, draw_pipelines_chart())


if __name__ == "__main__":
    main()
