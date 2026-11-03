#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import shutil
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / "themes.json").read_text(encoding="utf-8"))
COLOR_PARAMS = re.compile(
    r"((?<![A-Za-z_])(?:color|title_color|icon_color|area_color|ring|fire|currStreakNum|line|point)=)"
    r"[0-9A-Fa-f]{6}(?![0-9A-Fa-f])"
)
THEME_LINE = re.compile(r"Current theme: \*\*.*?\*\* · [^<\n]*")


def easter(year: int) -> date:
    a, b, c = year % 19, year // 100, year % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def in_range(day: date, start: str, end: str) -> bool:
    md = day.strftime("%m-%d")
    return start <= md <= end if start <= end else (md >= start or md <= end)


def month_day(year: int, md: str) -> date:
    m, d = map(int, md.split("-"))
    return date(year, m, d)


def distance(day: date, lo: date, hi: date) -> int:
    if day < lo:
        return (lo - day).days
    if day > hi:
        return (day - hi).days
    return 0


def nearest(day: date, items) -> str | None:
    window = CONFIG.get("window_days", 7)
    best = None
    for theme, start, end in items:
        for year in (day.year - 1, day.year, day.year + 1):
            d = distance(day, start(year), end(year))
            if d <= window and (best is None or d < best[0]):
                best = (d, theme)
    return best[1] if best else None


def theme_for(day: date) -> str:
    events = []
    for event in CONFIG["events"]:
        if "easter" in event:
            when = lambda y, offset=event["easter"]: easter(y) + timedelta(days=offset)
        else:
            when = lambda y, md=event["date"]: month_day(y, md)
        events.append((event["theme"], when, when))
    theme = nearest(day, events)
    if theme:
        return theme

    campaigns = [
        (
            c["theme"],
            lambda y, md=c["from"]: month_day(y, md),
            lambda y, md=c["to"]: month_day(y, md),
        )
        for c in CONFIG["campaigns"]
    ]
    theme = nearest(day, campaigns)
    if theme:
        return theme

    for season in CONFIG["seasons"]:
        if in_range(day, season["from"], season["to"]):
            return season["theme"]
    return CONFIG["default"]


def apply(theme: str) -> None:
    info = CONFIG["themes"][theme]
    shutil.copyfile(ROOT / f"assets/banners/banner-{theme}.svg", ROOT / "assets/banner.svg")
    shutil.copyfile(ROOT / f"assets/logos/logo-{theme}.svg", ROOT / "assets/logo.svg")

    readme = ROOT / "README.md"
    text = readme.read_text(encoding="utf-8")
    text = COLOR_PARAMS.sub(lambda m: m.group(1) + info["color"], text)
    text = THEME_LINE.sub(f"Current theme: **{info['label']}** · {info['event']}", text)
    readme.write_text(text, encoding="utf-8")
    print(f"Applied theme: {theme} ({info['event']})")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["--theme"]:
        apply(args[1])
    else:
        today = date.fromisoformat(args[0]) if args else datetime.now(ZoneInfo("Europe/Paris")).date()
        apply(theme_for(today))
