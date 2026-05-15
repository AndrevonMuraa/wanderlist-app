"""
WanderMark Trust Center static-site generator.

Reads /app/trust-center/{privacy,terms}.md and emits matching HTML files that
share the existing wandermark-site visual language (gradient header, card
layout, brand palette).  The generated files are intended to replace the
current privacy.html / terms.html in the AndrevonMuraa/wandermark-site repo.

Run:
    python /app/trust-center/build.py
Outputs:
    /app/trust-center/dist/privacy.html
    /app/trust-center/dist/terms.html
"""
from __future__ import annotations

import os
import re
from pathlib import Path

import markdown as md

ROOT = Path(__file__).parent
OUT = ROOT / "dist"
OUT.mkdir(exist_ok=True)

HEAD_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} - WanderMark</title>
<meta name="description" content="{description}">
<link rel="canonical" href="https://wandermark.app/{slug}">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f5f7;color:#1a1a2e;line-height:1.6}}
.header{{background:linear-gradient(135deg,#1a1a2e 0%,#2d5a8e 100%);color:#fff;padding:48px 24px 40px;text-align:center}}
.header h1{{font-size:32px;font-weight:800;margin-bottom:8px}}
.header p{{opacity:.8;font-size:15px}}
.header a{{color:#8bb8e8;text-decoration:none;font-size:14px;display:inline-block;margin-bottom:16px}}
.header a:hover{{color:#fff}}
.container{{max-width:760px;margin:0 auto;padding:24px 16px 60px}}
.card{{background:#fff;border-radius:16px;padding:28px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,.06)}}
.card h2{{font-size:18px;font-weight:700;color:#1a1a2e;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #f0f4ff}}
.card h3{{font-size:15px;font-weight:600;color:#1a1a2e;margin:16px 0 8px}}
.card p{{font-size:14px;color:#555;line-height:22px;margin-bottom:10px}}
.card p strong{{color:#1a1a2e}}
.card ul{{list-style:none;padding:0;margin-bottom:10px}}
.card li{{font-size:14px;color:#555;line-height:20px;padding:4px 0 4px 20px;position:relative}}
.card li::before{{content:"\\2022";color:#2d5a8e;font-weight:700;position:absolute;left:4px}}
.card a{{color:#2d5a8e;text-decoration:underline}}
.card a:hover{{color:#1a1a2e}}
.card code{{background:#f0f4ff;padding:2px 6px;border-radius:4px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#2d5a8e}}
.card hr{{display:none}}
.card table{{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}}
.card th{{background:#f0f4ff;color:#1a1a2e;text-align:left;padding:10px 12px;font-weight:700;border-bottom:2px solid #d4dff0}}
.card td{{padding:10px 12px;color:#555;border-bottom:1px solid #eef2f9;vertical-align:top}}
.card tr:last-child td{{border-bottom:none}}
.intro{{display:flex;align-items:center;gap:16px;margin-bottom:16px}}
.intro-icon{{width:52px;height:52px;border-radius:26px;background:#2d5a8e15;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:24px}}
.intro-text h2{{border:none;padding:0;margin:0 0 4px}}
.intro-text p{{color:#888;font-size:13px;margin:0}}
.contact{{display:flex;align-items:center;gap:10px;background:#2d5a8e10;padding:14px;border-radius:10px;margin-top:12px}}
.contact span{{color:#2d5a8e;font-weight:600;font-size:15px}}
.footer-note{{text-align:center;color:#888;font-size:12px;margin-top:24px;padding:0 16px}}
.footer-note a{{color:#2d5a8e}}
</style>
</head>
<body>
<div class="header">
<a href="https://wandermark.app">&larr; Back to WanderMark</a>
<h1>{h1}</h1>
<p>Last updated: {updated}</p>
</div>
<div class="container">
"""

INTRO_BLOCK = """<div class="card">
<div class="intro">
<div class="intro-icon">{icon}</div>
<div class="intro-text">
<h2>{intro_title}</h2>
<p>Effective {updated}</p>
</div>
</div>
{intro_html}
</div>
"""

CONTACT_BLOCK = """<div class="card">
<h2>Contact</h2>
<p>If you have questions or concerns, reach out:</p>
<div class="contact">
<span>&#9993;</span>
<span>support@wandermark.app</span>
</div>
</div>
"""

FOOT_TEMPLATE = """</div>
<div class="footer-note">
This document is provided in English. Translations are convenience only; the English version controls.
&middot; <a href="https://wandermark.app/privacy">Privacy</a> &middot; <a href="https://wandermark.app/terms">Terms</a>
</div>
</body>
</html>
"""


def parse_md(raw: str) -> tuple[str, str, list[tuple[str, str]]]:
    """Return (title, intro_md, [(section_title, section_md), ...])."""
    lines = raw.splitlines()
    title = ""
    updated = ""
    intro_lines: list[str] = []
    sections: list[tuple[str, list[str]]] = []
    state = "head"

    for line in lines:
        if state == "head":
            if line.startswith("# "):
                title = line[2:].strip()
            elif line.lower().startswith("**last updated"):
                # "**Last updated:** May 5, 2026" → "May 5, 2026"
                updated = re.sub(r"\*+", "", line.split(":", 1)[1]).strip()
            elif line.lower().startswith("**effective"):
                # Skip the "Effective:" line entirely — same info as Last updated
                continue
            elif line.startswith("## "):
                # First H2 — start sections
                state = "section"
                sections.append((line[3:].strip(), []))
            elif line.strip() == "---":
                continue
            else:
                # Intro paragraphs
                if line.strip() or intro_lines:
                    intro_lines.append(line)
        else:  # state == "section"
            if line.startswith("## "):
                sections.append((line[3:].strip(), []))
            else:
                sections[-1][1].append(line)

    intro_md = "\n".join(intro_lines).strip()
    section_pairs = [(t, "\n".join(body).strip()) for t, body in sections]
    return title, updated, intro_md, section_pairs


def render_section(title: str, body_md: str) -> str:
    body_md = _normalize_lists(body_md)
    body_html = md.markdown(body_md, extensions=["tables", "fenced_code", "sane_lists"])
    return f'<div class="card">\n<h2>{title}</h2>\n{body_html}\n</div>\n'


def _normalize_lists(text: str) -> str:
    """Insert blank line before bullet/number lists that follow prose so the
    markdown parser treats them as lists, not paragraph continuations."""
    out: list[str] = []
    prev_blank = True
    prev_is_list = False
    for line in text.splitlines():
        stripped = line.lstrip()
        is_list_item = bool(re.match(r"^[-*+]\s+|^\d+\.\s+", stripped))
        if is_list_item and not prev_blank and not prev_is_list:
            out.append("")
        out.append(line)
        prev_blank = not line.strip()
        prev_is_list = is_list_item
    return "\n".join(out)


def build(slug: str, intro_icon: str, intro_title: str):
    src = ROOT / f"{slug}.md"
    raw = src.read_text(encoding="utf-8")
    title, updated, intro_md, sections = parse_md(raw)

    intro_html = md.markdown(_normalize_lists(intro_md), extensions=["tables", "fenced_code", "sane_lists"])

    description = {
        "privacy": "WanderMark Privacy Policy — how we collect, use, and protect your information.",
        "terms": "WanderMark Terms of Service — the rules for using the WanderMark app.",
    }[slug]

    out = HEAD_TEMPLATE.format(
        title=title,
        description=description,
        slug=slug,
        h1=title,
        updated=updated or "—",
    )
    out += INTRO_BLOCK.format(
        icon=intro_icon,
        intro_title=intro_title,
        updated=updated or "—",
        intro_html=intro_html,
    )

    for sec_title, sec_md in sections:
        # Skip pure contact section — we render our own at the end
        if sec_title.lower() in {"contact", "13. contact", "12. contact"}:
            continue
        out += render_section(sec_title, sec_md)

    out += CONTACT_BLOCK
    out += FOOT_TEMPLATE

    (OUT / f"{slug}.html").write_text(out, encoding="utf-8")
    print(f"Wrote {OUT / f'{slug}.html'} ({len(out)} bytes)")


if __name__ == "__main__":
    build("privacy", "&#x1F6E1;", "Your Privacy Matters")
    build("terms", "&#x1F4DC;", "Welcome to WanderMark")
    print("Done.")
