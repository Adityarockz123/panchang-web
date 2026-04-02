#!/usr/bin/env python3
"""
Panchang calculator (Drik ganita) using Swiss Ephemeris (pyswisseph).

This script is called by the Next.js API route and prints JSON to stdout.
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable, Dict, List, Tuple

import pytz
import swisseph as swe


TITHI_NAMES = [
    "Pratipada",
    "Dvitiya",
    "Tritiya",
    "Chaturthi",
    "Panchami",
    "Shashthi",
    "Saptami",
    "Ashtami",
    "Navami",
    "Dashami",
    "Ekadashi",
    "Dvadashi",
    "Trayodashi",
    "Chaturdashi",
    "Purnima",
    "Pratipada (Krishna)",
    "Dvitiya (Krishna)",
    "Tritiya (Krishna)",
    "Chaturthi (Krishna)",
    "Panchami (Krishna)",
    "Shashthi (Krishna)",
    "Saptami (Krishna)",
    "Ashtami (Krishna)",
    "Navami (Krishna)",
    "Dashami (Krishna)",
    "Ekadashi (Krishna)",
    "Dvadashi (Krishna)",
    "Trayodashi (Krishna)",
    "Chaturdashi (Krishna)",
    "Amavasya",
]

NAKSHATRA_NAMES = [
    "Ashwini",
    "Bharani",
    "Krittika",
    "Rohini",
    "Mrigashirsha",
    "Ardra",
    "Punarvasu",
    "Pushya",
    "Ashlesha",
    "Magha",
    "Purva Phalguni",
    "Uttara Phalguni",
    "Hasta",
    "Chitra",
    "Swati",
    "Vishakha",
    "Anuradha",
    "Jyeshtha",
    "Mula",
    "Purva Ashadha",
    "Uttara Ashadha",
    "Shravana",
    "Dhanishta",
    "Shatabhisha",
    "Purva Bhadrapada",
    "Uttara Bhadrapada",
    "Revati",
]

YOGA_NAMES = [
    "Vishkambha",
    "Priti",
    "Ayushman",
    "Saubhagya",
    "Shobhana",
    "Atiganda",
    "Sukarman",
    "Dhriti",
    "Shula",
    "Ganda",
    "Vriddhi",
    "Dhruva",
    "Vyaghata",
    "Harshana",
    "Vajra",
    "Siddhi",
    "Vyatipata",
    "Variyana",
    "Parigha",
    "Shiva",
    "Siddha",
    "Sadhya",
    "Shubha",
    "Shukla",
    "Brahma",
    "Indra",
    "Vaidhriti",
]

KARANA_NAMES = [
    # The sequence for Karanas is special; see karana_name() below.
]

AYANAMSA_TO_SID_MODE = {
    "lahiri": swe.SIDM_LAHIRI,
    "raman": swe.SIDM_RAMAN,
    "kp": swe.SIDM_KRISHNAMURTI,
    "yukteshwar": swe.SIDM_YUKTESHWAR,
}

CHOGHADIYA_NATURE: Dict[str, str] = {
    "Amrit": "best",
    "Shubh": "good",
    "Labh": "good",
    "Char": "good",
    "Rog": "bad",
    "Kaal": "bad",
    "Udveg": "bad",
}

# Day and night sequences (8 periods each), starting from sunrise / sunset.
# Source reference: https://www.grahaguru.in/muhurta/choghadiya
CHOGHADIYA_DAY: Dict[str, List[str]] = {
    "Sunday": ["Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg"],
    "Monday": ["Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit"],
    "Tuesday": ["Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog"],
    "Wednesday": ["Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh"],
    "Thursday": ["Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh"],
    "Friday": ["Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char"],
    "Saturday": ["Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal"],
}

CHOGHADIYA_NIGHT: Dict[str, List[str]] = {
    "Sunday": ["Shubh", "Amrit", "Char", "Rog", "Kaal", "Labh", "Udveg", "Shubh"],
    "Monday": ["Char", "Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrit", "Char"],
    "Tuesday": ["Kaal", "Labh", "Udveg", "Shubh", "Amrit", "Char", "Rog", "Kaal"],
    "Wednesday": ["Udveg", "Shubh", "Amrit", "Char", "Rog", "Kaal", "Labh", "Udveg"],
    "Thursday": ["Amrit", "Char", "Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrit"],
    "Friday": ["Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrit", "Char", "Rog"],
    "Saturday": ["Labh", "Udveg", "Shubh", "Amrit", "Char", "Rog", "Kaal", "Labh"],
}

# Durmuhurta offsets in "muhurta slots" (1/15 of dinamana / ratrimana).
# Derived from common Panchang practice (e.g., mypanchang.com daily outputs).
DURMUHURTA_DAY_OFFSETS: Dict[str, List[int]] = {
    "Sunday": [13],
    "Monday": [8, 11],
    "Tuesday": [3],
    "Wednesday": [7],
    "Thursday": [5, 11],
    "Friday": [3, 8],
    "Saturday": [0, 1],
}

DURMUHURTA_NIGHT_OFFSETS: Dict[str, List[int]] = {
    "Tuesday": [6],
}

# Vish/Amrit/Ushna ghati ranges in Nadis (1 Nakshatra = 60 Nadis).
# Source: https://www.wisdomlib.org/hinduism/essay/significance-of-the-moon-in-ancient-civilizations/d/doc1187665.html
NAKSHATRA_GHATI_TABLE: List[Dict] = [
    # index aligned so that entry 1 is Ashwini, ... 27 is Revati
    {},
    {"amrit_m": (54, 58), "amrit_p": (42, 46), "visha": (50, 54), "ushna": (7.5, 15), "mrityu": 8},
    {"amrit_m": (52, 56), "amrit_p": (48, 52), "visha": (24, 28), "ushna": (55, 60), "mrityu": 4},
    {"amrit_m": (38, 42), "amrit_p": (54, 58), "visha": (30, 34), "ushna": (21, 30), "mrityu": 12},
    {"amrit_m": (35, 39), "amrit_p": (52, 56), "visha": (40, 44), "ushna": (7.5, 15), "mrityu": 2},
    {"amrit_m": (54, 58), "amrit_p": (38, 42), "visha": (14, 18), "ushna": (55, 60), "mrityu": 6},
    {"amrit_m": (44, 48), "amrit_p": (35, 39), "visha": (11, 15), "ushna": (21, 30), "mrityu": 14},
    {"amrit_m": (56, 60), "amrit_p": (54, 58), "visha": (30, 34), "ushna": (7.5, 15), "mrityu": 10},
    {"amrit_m": (54, 58), "amrit_p": (44, 48), "visha": (20, 24), "ushna": (55, 60), "mrityu": 16},
    {"amrit_m": (44, 48), "amrit_p": (56, 60), "visha": (32, 36), "ushna": (21, 30), "mrityu": 24},
    {"amrit_m": (40, 44), "amrit_p": (54, 58), "visha": (30, 34), "ushna": (7.5, 15), "mrityu": 20},
    {"amrit_m": (45, 49), "amrit_p": (44, 48), "visha": (20, 24), "ushna": (55, 60), "mrityu": 22},
    {"amrit_m": (44, 48), "amrit_p": (42, 46), "visha": (18, 22), "ushna": (21, 30), "mrityu": 2},
    {"amrit_m": (38, 42), "amrit_p": (45, 49), "visha": (22, 26), "ushna": (7.5, 15), "mrityu": 26},
    {"amrit_m": (38, 44), "amrit_p": (44, 48), "visha": (20, 24), "ushna": (55, 60), "mrityu": 30},
    {"amrit_m": (34, 38), "amrit_p": (38, 42), "visha": (14, 18), "ushna": (21, 30), "mrityu": 38},
    {"amrit_m": (38, 42), "amrit_p": (38, 42), "visha": (14, 18), "ushna": (1, 8), "mrityu": 38},
    {"amrit_m": (44, 48), "amrit_p": (28, 32), "visha": (10, 14), "ushna": (52, 60), "mrityu": 36},
    {"amrit_m": (48, 52), "amrit_p": (38, 42), "visha": (14, 18), "ushna": (20, 30), "mrityu": 34},
    {"amrit_m": (44, 48), "amrit_p": (44, 48), "visha": (20, 24), "ushna": (1, 8), "mrityu": 32},
    {"amrit_m": (54, 58), "amrit_p": (48, 52), "visha": (24, 28), "ushna": (52, 60), "mrityu": 42},
    {"amrit_m": (34, 38), "amrit_p": (44, 48), "visha": (20, 24), "ushna": (20, 30), "mrityu": 44},
    {"amrit_m": (32, 36), "amrit_p": (34, 38), "visha": (10, 14), "ushna": (1, 8), "mrityu": 46},
    {"amrit_m": (40, 44), "amrit_p": (34, 38), "visha": (10, 14), "ushna": (52, 60), "mrityu": 48},
    {"amrit_m": (48, 52), "amrit_p": (42, 46), "visha": (18, 22), "ushna": (20, 30), "mrityu": 50},
    {"amrit_m": (54, 58), "amrit_p": (40, 44), "visha": (16, 20), "ushna": (1, 8), "mrityu": 52},
    {"amrit_m": (42, 46), "amrit_p": (48, 52), "visha": (24, 28), "ushna": (52, 60), "mrityu": 52},
    {"amrit_m": (48, 54), "amrit_p": (54, 58), "visha": (30, 34), "ushna": (20, 30), "mrityu": 54},
]


def _norm360(deg: float) -> float:
    x = deg % 360.0
    if x < 0:
        x += 360.0
    return x


def jd_from_datetime_utc(dt_utc: datetime) -> float:
    dt_utc = dt_utc.astimezone(timezone.utc)
    hour = dt_utc.hour + dt_utc.minute / 60.0 + (dt_utc.second + dt_utc.microsecond / 1e6) / 3600.0
    return swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, hour, swe.GREG_CAL)


def datetime_utc_from_jd(jd_ut: float) -> datetime:
    y, m, d, hour = swe.revjul(jd_ut, swe.GREG_CAL)
    h = int(hour)
    minute_f = (hour - h) * 60.0
    mi = int(minute_f)
    sec_f = (minute_f - mi) * 60.0
    s = int(sec_f)
    us = int(round((sec_f - s) * 1e6))
    # normalize microseconds
    if us >= 1_000_000:
        s += 1
        us -= 1_000_000
    return datetime(y, m, d, h, mi, s, us, tzinfo=timezone.utc)


def set_ayanamsa(ayanamsa: str) -> None:
    mode = AYANAMSA_TO_SID_MODE.get(ayanamsa.lower())
    if mode is None:
        raise ValueError(f"Unsupported ayanamsa: {ayanamsa}")
    swe.set_sid_mode(mode, 0, 0)


def sidereal_lon(body: int, jd_ut: float) -> float:
    flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL
    xx, _ = swe.calc_ut(jd_ut, body, flags)
    return _norm360(xx[0])


def tithi_index(moon_lon: float, sun_lon: float) -> int:
    diff = _norm360(moon_lon - sun_lon)
    return int(math.floor(diff / 12.0)) + 1  # 1..30


def nakshatra_index(moon_lon: float) -> int:
    return int(math.floor(_norm360(moon_lon) / (360.0 / 27.0))) + 1  # 1..27


def yoga_index(moon_lon: float, sun_lon: float) -> int:
    s = _norm360(moon_lon + sun_lon)
    return int(math.floor(s / (360.0 / 27.0))) + 1  # 1..27


def karana_index(moon_lon: float, sun_lon: float) -> int:
    diff = _norm360(moon_lon - sun_lon)
    return int(math.floor(diff / 6.0)) + 1  # 1..60 (half-tithis)


def karana_name(k_index_1to60: int) -> str:
    """
    Karana naming rules (Drik):
    - 1st half (index 1): Kimstughna
    - 2..56: repeating sequence of 7 "chara" karanas, repeated 8 times
    - 57..60: Shakuni, Chatushpada, Naga, (and the 60th is typically "Kimstughna" for next cycle,
      but in half-tithi indexing within a lunar month, 60 is "Naga" and then next day starts again)
    For practical Panchang display within a day, this mapping works well.
    """
    if k_index_1to60 <= 0:
        k_index_1to60 = 1
    if k_index_1to60 == 1:
        return "Kimstughna"
    if 2 <= k_index_1to60 <= 56:
        seq = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"]
        return seq[(k_index_1to60 - 2) % 7]
    fixed = {57: "Shakuni", 58: "Chatushpada", 59: "Naga", 60: "Kimstughna"}
    return fixed.get(k_index_1to60, "Unknown")


@dataclass
class Segment:
    idx: int
    name: str
    start_utc: datetime
    end_utc: datetime

    def to_json(self, tz: pytz.BaseTzInfo) -> Dict:
        return {
            "index": self.idx,
            "name": self.name,
            "start": self.start_utc.astimezone(tz).isoformat(),
            "end": self.end_utc.astimezone(tz).isoformat(),
        }


@dataclass
class TimeBlock:
    name: str
    start_utc: datetime
    end_utc: datetime
    category: str  # "auspicious" | "inauspicious" | "neutral"
    meta: Dict | None = None

    def to_json(self, tz: pytz.BaseTzInfo) -> Dict:
        return {
            "name": self.name,
            "category": self.category,
            "start": self.start_utc.astimezone(tz).isoformat(),
            "end": self.end_utc.astimezone(tz).isoformat(),
            "meta": self.meta or {},
        }


def refine_boundary(
    get_value: Callable[[datetime], int],
    left: datetime,
    right: datetime,
    left_value: int,
) -> datetime:
    """
    Binary-search boundary time where value changes from left_value.
    Returns the earliest datetime within (left, right] where value != left_value.
    """
    # Ensure right is different (best-effort)
    if get_value(right) == left_value:
        return right

    while (right - left).total_seconds() > 1:
        mid = left + (right - left) / 2
        if get_value(mid) == left_value:
            left = mid
        else:
            right = mid
    return right


def scan_segments(
    get_value: Callable[[datetime], Tuple[int, str]],
    window_start_utc: datetime,
    window_end_utc: datetime,
    step_minutes: int = 5,
) -> List[Segment]:
    step = timedelta(minutes=step_minutes)
    t = window_start_utc
    idx0, name0 = get_value(t)
    seg_start = t
    segments: List[Segment] = []

    # helper returning only idx for refinement
    def _get_idx(dt: datetime) -> int:
        return get_value(dt)[0]

    while t < window_end_utc:
        t_next = min(t + step, window_end_utc)
        idx1, name1 = get_value(t_next)
        if idx1 != idx0:
            boundary = refine_boundary(_get_idx, t, t_next, idx0)
            segments.append(Segment(idx=idx0, name=name0, start_utc=seg_start, end_utc=boundary))
            seg_start = boundary
            idx0, name0 = get_value(seg_start)
            t = boundary
        else:
            t = t_next

    # finalize last segment
    segments.append(Segment(idx=idx0, name=name0, start_utc=seg_start, end_utc=window_end_utc))
    return segments


def segments_overlapping_window(
    all_segments: List[Segment], window_start_utc: datetime, window_end_utc: datetime
) -> List[Segment]:
    return [
        s
        for s in all_segments
        if s.end_utc > window_start_utc and s.start_utc < window_end_utc
    ]


def scan_segments_covering_window(
    get_value: Callable[[datetime], Tuple[int, str]],
    window_start_utc: datetime,
    window_end_utc: datetime,
    *,
    step_minutes: int = 5,
    padding_hours: int = 36,
) -> List[Segment]:
    """
    Scan a padded range so the returned segments include the true start/end
    times of elements that began before midnight or end after midnight.
    """
    padded_start = window_start_utc - timedelta(hours=padding_hours)
    padded_end = window_end_utc + timedelta(hours=padding_hours)
    all_segments = scan_segments(get_value, padded_start, padded_end, step_minutes=step_minutes)
    return segments_overlapping_window(all_segments, window_start_utc, window_end_utc)


def calc_rise_set(
    body: int,
    window_start_utc: datetime,
    geopos: Tuple[float, float, float],
    rsmi: int,
) -> datetime | None:
    jd_start = jd_from_datetime_utc(window_start_utc)
    try:
        res, tret = swe.rise_trans(jd_start, body, rsmi, geopos, 0.0, 0.0, swe.FLG_SWIEPH)
    except swe.Error:
        return None
    if res == -2:
        return None
    return datetime_utc_from_jd(tret[0])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True, help="Local civil date: YYYY-MM-DD")
    parser.add_argument("--lat", required=True, type=float)
    parser.add_argument("--lon", required=True, type=float)
    parser.add_argument("--tz", required=True, help="IANA timezone, e.g. Asia/Kolkata")
    parser.add_argument("--ayanamsa", default="lahiri", help="lahiri|raman|kp|yukteshwar")
    args = parser.parse_args()

    tz = pytz.timezone(args.tz)
    set_ayanamsa(args.ayanamsa)

    # Local window: midnight to midnight (next day)
    y, m, d = (int(x) for x in args.date.split("-"))
    window_start_local = tz.localize(datetime(y, m, d, 0, 0, 0))
    window_end_local = window_start_local + timedelta(days=1)
    window_start_utc = window_start_local.astimezone(timezone.utc)
    window_end_utc = window_end_local.astimezone(timezone.utc)

    geopos = (args.lon, args.lat, 0.0)

    # Rise/set events (next occurrence after local midnight)
    sunrise_utc = calc_rise_set(swe.SUN, window_start_utc, geopos, swe.CALC_RISE)
    sunset_utc = calc_rise_set(swe.SUN, window_start_utc, geopos, swe.CALC_SET)
    moonrise_utc = calc_rise_set(swe.MOON, window_start_utc, geopos, swe.CALC_RISE)
    moonset_utc = calc_rise_set(swe.MOON, window_start_utc, geopos, swe.CALC_SET)
    sunrise_next_utc = (
        calc_rise_set(
            swe.SUN,
            (sunset_utc + timedelta(minutes=1)) if sunset_utc else window_end_utc,
            geopos,
            swe.CALC_RISE,
        )
        if (sunset_utc or window_end_utc)
        else None
    )

    def get_lons(dt_utc: datetime) -> Tuple[float, float]:
        jd = jd_from_datetime_utc(dt_utc)
        sun = sidereal_lon(swe.SUN, jd)
        moon = sidereal_lon(swe.MOON, jd)
        return sun, moon

    def tithi_value(dt_utc: datetime) -> Tuple[int, str]:
        sun, moon = get_lons(dt_utc)
        idx = tithi_index(moon, sun)
        return idx, TITHI_NAMES[idx - 1]

    def nak_value(dt_utc: datetime) -> Tuple[int, str]:
        _, moon = get_lons(dt_utc)
        idx = nakshatra_index(moon)
        return idx, NAKSHATRA_NAMES[idx - 1]

    def yoga_value(dt_utc: datetime) -> Tuple[int, str]:
        sun, moon = get_lons(dt_utc)
        idx = yoga_index(moon, sun)
        return idx, YOGA_NAMES[idx - 1]

    def kar_value(dt_utc: datetime) -> Tuple[int, str]:
        sun, moon = get_lons(dt_utc)
        idx = karana_index(moon, sun)
        return idx, karana_name(idx)

    # Scan segments overlapping the 24h window, with padding so start/end are accurate.
    tithi_segments = scan_segments_covering_window(
        tithi_value, window_start_utc, window_end_utc, step_minutes=5, padding_hours=36
    )
    nak_segments = scan_segments_covering_window(
        nak_value, window_start_utc, window_end_utc, step_minutes=5, padding_hours=36
    )
    yoga_segments = scan_segments_covering_window(
        yoga_value, window_start_utc, window_end_utc, step_minutes=5, padding_hours=36
    )
    kar_segments = scan_segments_covering_window(
        kar_value, window_start_utc, window_end_utc, step_minutes=3, padding_hours=36
    )

    vara = window_start_local.strftime("%A")

    timings: List[TimeBlock] = []

    def add_block(name: str, start: datetime, end: datetime, category: str, meta: Dict | None = None) -> None:
        timings.append(TimeBlock(name=name, start_utc=start, end_utc=end, category=category, meta=meta))

    # Kaala timings & Muhurtas (need sunrise/sunset)
    if sunrise_utc and sunset_utc and sunrise_next_utc:
        day_len = sunset_utc - sunrise_utc
        night_len = sunrise_next_utc - sunset_utc

        # Rahu Kalam / Yamagandam / Gulika (day divided into 8 parts)
        rahu_part = {
            "Sunday": 8,
            "Monday": 2,
            "Tuesday": 7,
            "Wednesday": 5,
            "Thursday": 6,
            "Friday": 4,
            "Saturday": 3,
        }[vara]
        yama_part = {
            "Sunday": 5,
            "Monday": 4,
            "Tuesday": 3,
            "Wednesday": 2,
            "Thursday": 1,
            "Friday": 7,
            "Saturday": 6,
        }[vara]
        gulika_part = {
            "Sunday": 7,
            "Monday": 6,
            "Tuesday": 5,
            "Wednesday": 4,
            "Thursday": 3,
            "Friday": 2,
            "Saturday": 1,
        }[vara]

        part_len = day_len / 8
        for name, part in [
            ("Rahu Kalam", rahu_part),
            ("Yamagandam", yama_part),
            ("Gulika Kalam", gulika_part),
        ]:
            s = sunrise_utc + part_len * (part - 1)
            e = s + part_len
            add_block(name, s, e, "inauspicious")

        # Abhijit Muhurta (day divided into 15 muhurtas), absent on Wednesday in many Panchangs
        if vara != "Wednesday":
            mu_len = day_len / 15
            s = sunrise_utc + mu_len * 7
            e = sunrise_utc + mu_len * 8
            add_block("Abhijit Muhurta", s, e, "auspicious")

        # Brahma Muhurta: 96 to 48 minutes before sunrise
        add_block(
            "Brahma Muhurta",
            sunrise_utc - timedelta(minutes=96),
            sunrise_utc - timedelta(minutes=48),
            "auspicious",
        )

        # Durmuhurta: based on 1/15 of daytime (and Tuesday also has one in night)
        dm_len_day = day_len / 15
        for off in DURMUHURTA_DAY_OFFSETS.get(vara, []):
            s = sunrise_utc + dm_len_day * off
            e = s + dm_len_day
            add_block("Durmuhurta", s, e, "inauspicious", {"phase": "day"})

        dm_len_night = night_len / 15
        for off in DURMUHURTA_NIGHT_OFFSETS.get(vara, []):
            s = sunset_utc + dm_len_night * off
            e = s + dm_len_night
            add_block("Durmuhurta", s, e, "inauspicious", {"phase": "night"})

        # Hora (planetary hours): 12 day horas + 12 night horas
        chaldean = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"]
        weekday_lord = {
            "Sunday": "Sun",
            "Monday": "Moon",
            "Tuesday": "Mars",
            "Wednesday": "Mercury",
            "Thursday": "Jupiter",
            "Friday": "Venus",
            "Saturday": "Saturn",
        }[vara]
        start_idx = chaldean.index(weekday_lord)
        day_hora_len = day_len / 12
        night_hora_len = night_len / 12
        hora_blocks: List[TimeBlock] = []
        t0 = sunrise_utc
        for i in range(24):
            planet = chaldean[(start_idx + i) % 7]
            if i < 12:
                t1 = t0 + day_hora_len
            else:
                t1 = t0 + night_hora_len
            hora_blocks.append(
                TimeBlock(
                    name=f"Hora: {planet}",
                    start_utc=t0,
                    end_utc=t1,
                    category="neutral",
                    meta={"planet": planet, "index": i + 1},
                )
            )
            t0 = t1

        # Choghadiya (8 day + 8 night)
        choghadiya_blocks: List[TimeBlock] = []
        day_seq = CHOGHADIYA_DAY[vara]
        night_seq = CHOGHADIYA_NIGHT[vara]
        day_seg_len = day_len / 8
        night_seg_len = night_len / 8

        t0 = sunrise_utc
        for i, label in enumerate(day_seq):
            t1 = sunrise_utc + day_seg_len * (i + 1)
            nature = CHOGHADIYA_NATURE.get(label, "neutral")
            category = "auspicious" if nature in ("best", "good") else "inauspicious"
            choghadiya_blocks.append(
                TimeBlock(
                    name=f"Choghadiya: {label}",
                    start_utc=t0,
                    end_utc=t1,
                    category=category,
                    meta={"label": label, "nature": nature, "phase": "day", "index": i + 1},
                )
            )
            t0 = t1

        t0 = sunset_utc
        for i, label in enumerate(night_seq):
            t1 = sunset_utc + night_seg_len * (i + 1)
            nature = CHOGHADIYA_NATURE.get(label, "neutral")
            category = "auspicious" if nature in ("best", "good") else "inauspicious"
            choghadiya_blocks.append(
                TimeBlock(
                    name=f"Choghadiya: {label}",
                    start_utc=t0,
                    end_utc=t1,
                    category=category,
                    meta={"label": label, "nature": nature, "phase": "night", "index": i + 1},
                )
            )
            t0 = t1

        # Varjyam / Amrit Kaal / Ushna / Mrityu Bhaga based on Nakshatra segments
        for s in nak_segments:
            tbl = NAKSHATRA_GHATI_TABLE[s.idx] if s.idx < len(NAKSHATRA_GHATI_TABLE) else None
            if not tbl:
                continue
            dur = s.end_utc - s.start_utc

            def span(from_n: float, to_n: float) -> Tuple[datetime, datetime]:
                return (
                    s.start_utc + dur * (from_n / 60.0),
                    s.start_utc + dur * (to_n / 60.0),
                )

            v_s, v_e = span(tbl["visha"][0], tbl["visha"][1])
            add_block("Varjyam (Visha Ghatika)", v_s, v_e, "inauspicious", {"nakshatra": s.name})

            a1_s, a1_e = span(tbl["amrit_p"][0], tbl["amrit_p"][1])
            add_block("Amrit Kaal", a1_s, a1_e, "auspicious", {"nakshatra": s.name})

            a2_s, a2_e = span(tbl["amrit_m"][0], tbl["amrit_m"][1])
            add_block(
                "Amrit Kaal (Alt)",
                a2_s,
                a2_e,
                "auspicious",
                {"nakshatra": s.name, "note": "alternate traditional table"},
            )

            u_s, u_e = span(tbl["ushna"][0], tbl["ushna"][1])
            add_block("Ushna Ghatika", u_s, u_e, "inauspicious", {"nakshatra": s.name})

            # Mrityu Bhaga is a point; show as a small 2-minute window
            mb_t = s.start_utc + dur * (tbl["mrityu"] / 60.0)
            add_block(
                "Mrityu Bhaga",
                mb_t - timedelta(minutes=1),
                mb_t + timedelta(minutes=1),
                "inauspicious",
                {"nakshatra": s.name},
            )
    else:
        hora_blocks = []
        choghadiya_blocks = []

    out = {
        "date": args.date,
        "timezone": args.tz,
        "location": {"lat": args.lat, "lon": args.lon},
        "ayanamsa": args.ayanamsa.lower(),
        "window": {
            "start": window_start_local.isoformat(),
            "end": window_end_local.isoformat(),
        },
        "events": {
            "sunrise": sunrise_utc.astimezone(tz).isoformat() if sunrise_utc else None,
            "sunset": sunset_utc.astimezone(tz).isoformat() if sunset_utc else None,
            "moonrise": moonrise_utc.astimezone(tz).isoformat() if moonrise_utc else None,
            "moonset": moonset_utc.astimezone(tz).isoformat() if moonset_utc else None,
            "sunriseNext": sunrise_next_utc.astimezone(tz).isoformat() if sunrise_next_utc else None,
        },
        "panchang": {
            "vara": vara,
            "tithi": [s.to_json(tz) for s in tithi_segments],
            "nakshatra": [s.to_json(tz) for s in nak_segments],
            "yoga": [s.to_json(tz) for s in yoga_segments],
            "karana": [s.to_json(tz) for s in kar_segments],
        },
        "timings": {
            "all": [b.to_json(tz) for b in timings],
            "auspicious": [b.to_json(tz) for b in timings if b.category == "auspicious"],
            "inauspicious": [b.to_json(tz) for b in timings if b.category == "inauspicious"],
            "hora": [b.to_json(tz) for b in hora_blocks],
            "choghadiya": [b.to_json(tz) for b in choghadiya_blocks],
        },
    }

    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
