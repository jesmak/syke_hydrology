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

# The card draws a measurement 90 days back. The integration keeps a year of them.
PAST = 366

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


def iso(day: date) -> str:
    return day.isoformat()


def calendar(average) -> dict[str, float]:
    """The average of every calendar day, as the integration keeps them. 29 February, which the made-up winter lacks, is the 28th's."""
    leap = days(date(2028, 1, 1), date(2028, 12, 31))
    same = [day - timedelta(days=1) if (day.month, day.day) == (2, 29) else day for day in leap]
    return {day.strftime("%m-%d"): value for day, other in zip(leap, same, strict=True) if (value := average(other)) is not None}


def sensor(state, name: str, **attributes) -> dict:
    return {"state": str(state), "attributes": {"friendly_name": name, "attribution": ATTRIBUTION, **attributes}}


past = days(TODAY - timedelta(days=PAST), TODAY - timedelta(days=1))
level_drift = drift(len(past), 0.004)
levels = [[iso(day), round(level_average(day) - 0.07 + offset, 2)] for day, offset in zip(past, level_drift, strict=True)]
temperatures = [[iso(day), round(max(0.0, 0.2 + random.gauss(0, 0.06)), 1)] for day in past]
# Snow on the ice, in cm, at each ice measurement.
SNOW_ON_ICE = [8, 12, 10, 14, 15, 9, 6]
measurements = [
    {
        "day": iso(day),
        "total": clear + snow_ice,
        "clear": clear,
        "snow_ice": snow_ice,
        "snow_on_ice": snow_on,
        "bearing": math.floor(clear + snow_ice / 2 + 0.5),
        "weak": False,
    }
    for (day, clear, snow_ice), snow_on in zip(ICE, SNOW_ON_ICE, strict=True)
]
yesterday = iso(past[-1])


def measurement(key: str, entity: str, unit: str, points: list, average, window: int = 30) -> dict:
    return {
        "kind": "measurement",
        "measurement": key,
        "station": "Honkavaara" if entity.startswith(SNOW_COURSE) else "Koivujärvi",
        "entity_id": entity,
        "average_entity_id": f"{entity}_long_term_average",
        "unit": unit,
        "window": window,
        "average_back": 0,
        "years": YEARS,
        "points": points,
        "average": calendar(average),
    }


LEVEL = f"{STATION}_water_level"
TEMPERATURE = f"{STATION}_surface_water_temperature"
BEARS = f"{STATION}_ice_bears"
SNOW_WATER = f"{SNOW_COURSE}_snow_water_equivalent"

ice = {
    "kind": "ice",
    "station": "Koivujärvi",
    "measures_ice": True,
    "limits": {"walking": 10, "snowmobile": 15, "car": 20},
    "max_age": 14,
    "window": 30,
    "years": YEARS,
    "measurements": measurements,
    "average": calendar(bearing_average),
    # Each event's average day counts from its season's start: July for a freeze-up, January for a break-up.
    "events": {
        "freeze_up": {"day": iso(FREEZE_UP), "average": (FREEZE_UP_AVERAGE - date(2026, 7, 1)).days, "season_start": 7},
        "permanent_ice": {"day": None, "average": None, "season_start": 7},
        "open_water_clear": {"day": None, "average": None, "season_start": 1},
        "break_up": {"day": iso(BREAK_UP), "average": (BREAK_UP_AVERAGE - date(2027, 1, 1)).days, "season_start": 1},
    },
}

answers = {
    LEVEL: measurement("water_level", LEVEL, "m", levels, level_average),
    TEMPERATURE: measurement("surface_temperature", TEMPERATURE, "°C", temperatures, temperature_average),
    SNOW_WATER: measurement("snow_water_equivalent", SNOW_WATER, "mm", [[iso(day), value] for day, value in SNOW], snow_average, 60),
    BEARS: ice,
}

states = {
    LEVEL: sensor(levels[-1][1], "Koivujärvi Water level", unit_of_measurement="m", measured=yesterday, height_system="N2000"),
    TEMPERATURE: sensor(temperatures[-1][1], "Koivujärvi Surface water temperature", unit_of_measurement="°C", measured=yesterday),
    BEARS: sensor("car", "Koivujärvi Ice bears", device_class="enum", options=["does_not_bear", "walking", "snowmobile", "car"]),
    SNOW_WATER: sensor(SNOW[-1][1], "Honkavaara Snow water equivalent", unit_of_measurement="mm", measured=iso(SNOW[-1][0])),
}


# The registry gives each sensor its name, without the station's, and the decimals it is shown with.
# The integration isn't installed in the screenshots' Home Assistant, so the registry entries carry what it would give:
# the entity's own name from its translations, which the card shows, and its icon from icons.json.
NAMES = {
    key: value["name"]
    for key, value in json.loads(
        (Path(__file__).parent.parent / "custom_components/syke_hydrology/translations/en.json").read_text(encoding="utf-8")
    )["entity"]["sensor"].items()
}


def entry(key: str, device: str, icon: str, precision: int | None = None) -> dict:
    found = {"platform": "syke_hydrology", "translation_key": key, "device_id": device, "name": NAMES[key], "icon": icon}
    return found if precision is None else {**found, "display_precision": precision}


entities = {
    LEVEL: entry("water_level", "koivujarvi", "mdi:waves-arrow-up", 2),
    TEMPERATURE: entry("surface_temperature", "koivujarvi", "mdi:thermometer-water", 1),
    BEARS: entry("ice_bearing_class", "koivujarvi", "mdi:snowflake"),
    SNOW_WATER: entry("snow_water_equivalent", "honkavaara", "mdi:snowflake-melt", 0),
}
devices = {"koivujarvi": {"name": "Koivujärvi"}, "honkavaara": {"name": "Honkavaara"}}


def card(entity: str, **options) -> dict:
    return {"type": "custom:syke-hydrology-card", "entity": entity, **options}


dashboard = {
    "type": "sections",
    "max_columns": 2,
    "sections": [
        {"type": "grid", "cards": [card(BEARS), card(SNOW_WATER)]},
        {"type": "grid", "cards": [card(LEVEL), card(TEMPERATURE)]},
    ],
}

# The forms a card takes when held low: one row, two rows and three.
rows = {
    "type": "sections",
    "max_columns": 1,
    "sections": [
        {
            "type": "grid",
            "cards": [
                card(TEMPERATURE, grid_options={"rows": 1}),
                card(LEVEL, grid_options={"rows": 2}),
                card(BEARS, grid_options={"rows": 3}),
            ],
        }
    ],
}

plan = {
    "resources": ["custom_components/syke_hydrology/www/syke-hydrology-card.js"],
    "clock": CLOCK.isoformat(),
    "translations": {"syke_hydrology": "custom_components/syke_hydrology/translations"},
    "entities": entities,
    "devices": devices,
    "states": states,
    "commands": {"syke_hydrology/card": [{"with": {"entity_id": entity}, "result": result} for entity, result in answers.items()]},
    "shots": [
        {"name": "dashboard", "width": 1000, "view": dashboard},
        {"name": "hydrology-measurement", "width": 420, "card": card(LEVEL)},
        {"name": "hydrology-ice", "width": 420, "card": card(BEARS)},
        {"name": "hydrology-difference", "width": 420, "card": card(LEVEL, chart="difference")},
        {"name": "hydrology-rows", "width": 500, "view": rows},
    ],
}

Path(__file__).with_name("screenshots.json").write_text(json.dumps(plan, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
