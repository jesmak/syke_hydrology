"""Writes docs/screenshots.json, the plan for the README's screenshots (see hass-screenshots).

A made-up lake in late March, with made-up data shaped like Syke's: daily water level and surface temperature, an
ice measurement every ten days or so, and the long-term averages of each. Run it after changing the data, then
shoot the images: python3 docs/screenshots.py && npm run shoot -- <this repo> in hass-screenshots.
"""

import json
import math
import random
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

random.seed(20270320)
LOCAL = timezone(timedelta(hours=2))
TODAY = date(2027, 3, 20)
CLOCK = datetime(2027, 3, 20, 12, 0, tzinfo=LOCAL)
STATION = "sensor.koivujarvi"
SNOW_COURSE = "sensor.honkavaara"
ATTRIBUTION = "Hydrologiarajapinta / Source: Finnish Environment Institute (Syke), CC BY 4.0"
YEARS = "1997–2026"

# The charts show 90 days back and 60 ahead, and the line ahead is the average of a year ago.
PAST = 90
AHEAD = 60

FREEZE_UP = date(2027, 1, 5)
FREEZE_UP_AVERAGE = date(2026, 12, 30)
BREAK_UP = date(2026, 5, 2)
BREAK_UP_AVERAGE = date(2027, 4, 27)

# Each ice measurement: the day, the clear ice and the snow ice on it, in cm.
ICE = [
    (date(2027, 1, 15), 6, 2),
    (date(2027, 1, 25), 10, 4),
    (date(2027, 2, 4), 15, 6),
    (date(2027, 2, 14), 20, 7),
    (date(2027, 2, 24), 24, 9),
    (date(2027, 3, 6), 28, 11),
    (date(2027, 3, 16), 32, 14),
]

# The average ice bearing thickness by the day of a winter, in cm, with open water as zero.
BEARING_AVERAGE = [
    (date(2026, 12, 8), 0.0),
    (date(2026, 12, 28), 4.0),
    (date(2027, 1, 20), 12.0),
    (date(2027, 2, 15), 21.0),
    (date(2027, 3, 15), 27.0),
    (date(2027, 4, 1), 24.0),
    (date(2027, 4, 20), 10.0),
    (date(2027, 5, 10), 0.0),
]

# A snow course is measured a few times a winter: the day and the snow's water equivalent, in mm.
SNOW = [
    (date(2026, 12, 16), 24.0),
    (date(2027, 1, 2), 41.0),
    (date(2027, 1, 16), 58.0),
    (date(2027, 2, 1), 79.0),
    (date(2027, 2, 16), 96.0),
    (date(2027, 3, 1), 113.0),
    (date(2027, 3, 16), 124.0),
]

# Its average has a value only on the days measured in enough of the years, from December to early May.
SNOW_AVERAGE = [
    (date(2026, 12, 1), 12.0),
    (date(2027, 1, 1), 35.0),
    (date(2027, 2, 1), 62.0),
    (date(2027, 3, 1), 88.0),
    (date(2027, 3, 25), 102.0),
    (date(2027, 4, 15), 70.0),
    (date(2027, 5, 5), 8.0),
]


def days(first: date, last: date) -> list[date]:
    return [first + timedelta(days=n) for n in range((last - first).days + 1)]


def midnight(day: date) -> str:
    return datetime(day.year, day.month, day.day, tzinfo=LOCAL).isoformat()


def in_winter(day: date) -> date:
    """The same calendar day in the winter the averages above are written for."""
    return date(2026 if day.month >= 7 else 2027, day.month, day.day)


def level_average(day: date) -> float:
    """Lowest at the start of February and highest at the start of August, in metres."""
    return round(81.9 - 0.12 * math.cos(2 * math.pi * (day.timetuple().tm_yday - 32) / 365), 2)


def temperature_average(day: date) -> float:
    """Under the ice until the middle of April, then warming."""
    since_thaw = (in_winter(day) - date(2027, 4, 15)).days
    if day.month >= 7 or since_thaw <= 0:
        return 0.3
    return round(0.3 + 12 * (since_thaw / 40) ** 1.3, 1)


def between(points: list[tuple[date, float]], day: date) -> float | None:
    """The value on the day, on the straight lines from each point to the next."""
    winter_day = in_winter(day)
    for (before, low), (after, high) in zip(points, points[1:], strict=False):
        if before <= winter_day <= after:
            return round(low + (high - low) * (winter_day - before).days / (after - before).days, 1)
    return None


def bearing_average(day: date) -> float:
    return between(BEARING_AVERAGE, day) or 0.0


def snow_average(day: date) -> float | None:
    return between(SNOW_AVERAGE, day)


def drift(count: int, step: float) -> list[float]:
    """Red noise: each value leans on the one before it."""
    value, out = 0.0, []
    for _ in range(count):
        value = value * 0.95 + random.gauss(0, step)
        out.append(value)
    return out


def held(measurements: list[tuple[date, float]], last: date) -> list[list]:
    """Each measurement from its own day until the next one, as the sensor shows it."""
    rows = []
    for index, (day, value) in enumerate(measurements):
        until = measurements[index + 1][0] - timedelta(days=1) if index + 1 < len(measurements) else last
        rows += [[midnight(each), value] for each in days(day, until)]
    return rows


def average_rows(average) -> list[list]:
    """A year more than the chart's past, as the line ahead reads the average of a year ago."""
    return [[midnight(day), average(day)] for day in days(TODAY - timedelta(days=PAST + 366), TODAY) if average(day) is not None]


def sensor(state, name: str, **attributes) -> dict:
    return {"state": str(state), "attributes": {"friendly_name": f"Koivujärvi {name}", "attribution": ATTRIBUTION, **attributes}}


def chart(title: str, series: list[dict], yaxis: dict, annotations: dict) -> dict:
    return {
        "type": "custom:apexcharts-card",
        "graph_span": f"{PAST + AHEAD}d",
        "span": {"offset": f"+{AHEAD}d"},
        "header": {"show": True, "title": title, "show_states": True, "colorize_states": True},
        "all_series_config": {"curve": "straight", "statistics": {"type": "mean", "period": "day", "align": "middle"}},
        "apex_config": {
            "chart": {"height": "170px"},
            "legend": {"show": False},
            "xaxis": {"tickAmount": 7},
            "annotations": annotations,
        },
        "series": series,
        "yaxis": [yaxis],
    }


def measured(entity: str, name: str, color: str, precision: int, width: int = 1) -> dict:
    return {"entity": entity, "name": name, "color": color, "stroke_width": width, "float_precision": precision, "extend_to": "now"}


def average(entity: str, name: str, color: str, precision: int, width: int = 1) -> list[dict]:
    """The average until today, and the same sensor a year back as the line ahead."""
    line = {"entity": entity, "color": color, "stroke_width": width, "stroke_dash": 5, "float_precision": precision}
    return [
        {**line, "name": name, "extend_to": "now"},
        {**line, "name": f"{name}, ahead", "offset": "-365d", "extend_to": False, "show": {"in_header": False, "offset_in_name": False}},
    ]


def event_line(entity: str, text: str, color: str, dashed: bool) -> dict:
    return {
        "x": f"EVAL:Date.parse((document.querySelector('home-assistant').hass.states['{entity}'] || {{}}).state + 'T00:00:00') || 0",
        "borderColor": color,
        "strokeDashArray": 4 if dashed else 0,
        "label": {"text": text, "orientation": "vertical", "style": {"color": "white", "background": f"{color}{'80' if dashed else 'cc'}"}},
    }


TODAY_LINE = {"x": "EVAL:Date.now()", "borderColor": "#9e9e9e", "strokeDashArray": 2}


def axis(low: float, high: float | str, ticks: int, decimals: int, unit: str) -> dict:
    formatter = f"EVAL:function(value) {{ return value.toFixed({decimals}) + ' {unit}'; }}"
    return {"min": low, "max": high, "apex_config": {"tickAmount": ticks, "labels": {"formatter": formatter}}}


def tile(entity: str, name: str, icon: str, color: str) -> dict:
    return {"type": "tile", "entity": entity, "name": name, "icon": icon, "color": color}


past = days(TODAY - timedelta(days=PAST), TODAY - timedelta(days=1))
level_drift = drift(len(past), 0.004)
levels = [[midnight(day), round(level_average(day) - 0.07 + offset, 2)] for day, offset in zip(past, level_drift, strict=True)]
temperatures = [[midnight(day), round(max(0.0, 0.2 + random.gauss(0, 0.06)), 1)] for day in past]
thickness = held([(day, clear + snow_ice) for day, clear, snow_ice in ICE], TODAY)
bearing = held([(day, math.floor(clear + snow_ice / 2 + 0.5)) for day, clear, snow_ice in ICE], TODAY)
snow = held(SNOW, TODAY)
measured_day = ICE[-1][0].isoformat()
yesterday = past[-1].isoformat()

states = {
    f"{STATION}_water_level": sensor(
        levels[-1][1],
        "Water level",
        unit_of_measurement="m",
        device_class="distance",
        state_class="measurement",
        measured=yesterday,
        height_system="N2000",
    ),
    f"{STATION}_water_level_long_term_average": sensor(
        level_average(TODAY), "Water level, long-term average", unit_of_measurement="m", device_class="distance", years=YEARS
    ),
    f"{STATION}_surface_water_temperature": sensor(
        temperatures[-1][1],
        "Surface water temperature",
        unit_of_measurement="°C",
        device_class="temperature",
        state_class="measurement",
        measured=yesterday,
    ),
    f"{STATION}_surface_water_temperature_long_term_average": sensor(
        temperature_average(TODAY),
        "Surface water temperature, long-term average",
        unit_of_measurement="°C",
        device_class="temperature",
        years=YEARS,
    ),
    f"{STATION}_ice_thickness": sensor(
        thickness[-1][1],
        "Ice thickness",
        unit_of_measurement="cm",
        device_class="distance",
        state_class="measurement",
        measured=measured_day,
    ),
    f"{STATION}_ice_bearing_thickness": sensor(
        bearing[-1][1],
        "Ice bearing thickness",
        unit_of_measurement="cm",
        device_class="distance",
        state_class="measurement",
        measured=measured_day,
    ),
    f"{STATION}_ice_bearing_thickness_long_term_average": sensor(
        bearing_average(TODAY), "Ice bearing thickness, long-term average", unit_of_measurement="cm", device_class="distance", years=YEARS
    ),
    f"{STATION}_ice_bears": sensor("car", "Ice bears", device_class="enum", options=["does_not_bear", "walking", "snowmobile", "car"]),
    f"{STATION}_ice_measured": sensor(measured_day, "Ice measured", device_class="date"),
    f"{STATION}_freeze_up": sensor(FREEZE_UP.isoformat(), "Freeze-up", device_class="date"),
    f"{STATION}_freeze_up_long_term_average": sensor(
        FREEZE_UP_AVERAGE.isoformat(), "Freeze-up, long-term average", device_class="date", years=YEARS
    ),
    f"{STATION}_break_up": sensor(BREAK_UP.isoformat(), "Break-up", device_class="date"),
    f"{STATION}_break_up_long_term_average": sensor(
        BREAK_UP_AVERAGE.isoformat(), "Break-up, long-term average", device_class="date", years=YEARS
    ),
    f"{SNOW_COURSE}_snow_water_equivalent": sensor(
        snow[-1][1],
        "",
        friendly_name="Honkavaara Snow water equivalent",
        unit_of_measurement="mm",
        state_class="measurement",
        measured=SNOW[-1][0].isoformat(),
    ),
    f"{SNOW_COURSE}_snow_water_equivalent_long_term_average": sensor(
        snow_average(TODAY), "", friendly_name="Honkavaara Snow water equivalent, long-term average", unit_of_measurement="mm", years=YEARS
    ),
}

statistics = {
    f"{STATION}_water_level": {"unit": "m", "mean": levels},
    f"{STATION}_water_level_long_term_average": {"unit": "m", "mean": average_rows(level_average)},
    f"{STATION}_surface_water_temperature": {"unit": "°C", "mean": temperatures},
    f"{STATION}_surface_water_temperature_long_term_average": {"unit": "°C", "mean": average_rows(temperature_average)},
    f"{STATION}_ice_thickness": {"unit": "cm", "mean": thickness},
    f"{STATION}_ice_bearing_thickness": {"unit": "cm", "mean": bearing},
    f"{STATION}_ice_bearing_thickness_long_term_average": {"unit": "cm", "mean": average_rows(bearing_average)},
    f"{SNOW_COURSE}_snow_water_equivalent": {"unit": "mm", "mean": snow},
    f"{SNOW_COURSE}_snow_water_equivalent_long_term_average": {"unit": "mm", "mean": average_rows(snow_average)},
}

ICE_CHART = chart(
    "Ice thickness",
    [
        measured(f"{STATION}_ice_thickness", "Total", "orange", 0),
        measured(f"{STATION}_ice_bearing_thickness", "Bearing", "#039be5", 0, 2),
        *average(f"{STATION}_ice_bearing_thickness_long_term_average", "Bearing, average", "#9e3e3e", 0, 2),
    ],
    axis(0, "~30", 2, 0, "cm"),
    {
        "yaxis": [
            {
                "y": 10,
                "borderColor": "#039be5",
                "strokeDashArray": 4,
                "label": {
                    "text": "Walking 10 cm",
                    "position": "right",
                    "offsetX": -85,
                    "style": {"color": "white", "background": "#039be5cc"},
                },
            }
        ],
        "xaxis": [
            event_line(f"{STATION}_freeze_up", "Freeze-up", "#00acc1", dashed=False),
            event_line(f"{STATION}_freeze_up_long_term_average", "Freeze-up, average", "#00acc1", dashed=True),
            event_line(f"{STATION}_break_up", "Break-up", "#43a047", dashed=False),
            event_line(f"{STATION}_break_up_long_term_average", "Break-up, average", "#43a047", dashed=True),
            TODAY_LINE,
        ],
    },
)


def plain_chart(title: str, entity: str, low: float, high: float, decimals: int, unit: str) -> dict:
    """A measurement and its long-term average."""
    series = [
        measured(entity, "Latest", "orange", decimals),
        *average(f"{entity}_long_term_average", "Long-term average", "#3498db", decimals),
    ]
    return chart(title, series, axis(low, high, 3, min(decimals, 1), unit), {"xaxis": [TODAY_LINE]})


view = {
    "type": "sections",
    "max_columns": 2,
    "sections": [
        {
            "type": "grid",
            "cards": [
                ICE_CHART,
                tile(f"{STATION}_ice_bears", "Ice bears", "mdi:car", "green"),
                tile(f"{STATION}_ice_measured", "Ice measured", "mdi:calendar-check", "blue"),
                plain_chart("Snow water equivalent", f"{SNOW_COURSE}_snow_water_equivalent", 0, 150, 0, "mm"),
            ],
        },
        {
            "type": "grid",
            "cards": [
                plain_chart("Water level", f"{STATION}_water_level", 81.5, 82.1, 2, "m"),
                tile(f"{STATION}_freeze_up", "Freeze-up", "mdi:snowflake-thermometer", "cyan"),
                tile(f"{STATION}_break_up_long_term_average", "Break-up, average", "mdi:calendar-clock", "green"),
                plain_chart("Surface water temperature", f"{STATION}_surface_water_temperature", 0, 15, 1, "°C"),
            ],
        },
    ],
}

plan = {
    "resources": ["https://github.com/RomRider/apexcharts-card/releases/download/v2.2.3/apexcharts-card.js"],
    "clock": CLOCK.isoformat(),
    "translations": {"syke_hydrology": "custom_components/syke_hydrology/translations"},
    "entities": {f"{STATION}_ice_bears": {"platform": "syke_hydrology", "translation_key": "ice_bearing_class"}},
    "states": states,
    "statistics": statistics,
    "shots": [{"name": "dashboard", "width": 1000, "view": view}],
}

Path(__file__).with_name("screenshots.json").write_text(json.dumps(plan, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
