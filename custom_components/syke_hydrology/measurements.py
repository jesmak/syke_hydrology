"""What a station's rows mean: each sensor's measurements by day, the ice bearing and when a value is shown."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, timedelta
from enum import StrEnum

from .api import Level, Quantity, Row

# The Lippu_Id of each row of an ice measurement.
TOTAL = 41
SNOW_ICE = 112  # kohva
CLEAR_ICE = 113  # teräsjää
SNOW_ON_ICE = 37
# Ice in sight but too weak to measure: the only row of its day, with 0.
WEAK_ICE = 43

# The Lippu_id of the freeze-up and break-up dates.
WHOLE_VIEW_FROZEN = 29
PERMANENTLY_FROZEN = 30
OPEN_WATER_CLEAR = 27
WHOLE_VIEW_CLEAR = 28

# The Jakso_Id of an areal precipitation sum.
FIVE_DAYS = 2
MONTH = 3


@dataclass(frozen=True)
class Point:
    """A sensor's value from one day's measurement. None when that day's measurement has no value for the sensor."""

    day: date
    value: float | None


@dataclass
class StationData:
    rows: dict[Quantity, list[Row]] = field(default_factory=dict)
    level: Level | None = None


def daily(rows: list[Row], kind: int | None = None) -> list[Point]:
    """One point a day from the rows of one series, oldest first."""
    return [Point(row.day, row.value) for row in rows if kind is None or row.kind == kind]


def water_level(rows: list[Row], level: Level | None) -> list[Point]:
    """Metres in the station's height system, or centimetres above its own zero when it has none."""
    if level is None:
        return daily(rows)
    return [Point(point.day, None if point.value is None else (point.value + level.correction) / 100) for point in daily(rows)]


def ice_days(rows: list[Row]) -> dict[date, dict[int, float | None]]:
    """Each ice measurement's rows by their flag, by day, oldest first."""
    days: dict[date, dict[int, float | None]] = {}
    for row in rows:
        if row.kind is not None:
            days.setdefault(row.day, {})[row.kind] = row.value
    return dict(sorted(days.items()))


def ice(rows: list[Row], flag: int) -> list[Point]:
    """One part of each ice measurement. A measurement without it, such as weak ice, makes it unknown from that day on."""
    return [Point(day, flags.get(flag)) for day, flags in ice_days(rows).items()]


def bearing(flags: dict[int, float | None]) -> float | None:
    """The bearing thickness of a measurement, in whole centimetres: the clear ice and half of the snow ice.

    Snow ice bears about half as much as clear ice, so the total alone would overestimate and the clear ice alone
    underestimate. Ice too weak to measure bears nothing. A half rounds up.
    """
    clear = flags.get(CLEAR_ICE)
    if clear is not None:
        return float(math.floor(clear + (flags.get(SNOW_ICE) or 0) / 2 + 0.5))
    if WEAK_ICE in flags:
        return 0.0
    return None


def bearings(rows: list[Row]) -> list[Point]:
    return [Point(day, bearing(flags)) for day, flags in ice_days(rows).items()]


class Bearing(StrEnum):
    DOES_NOT_BEAR = "does_not_bear"
    WALKING = "walking"
    SNOWMOBILE = "snowmobile"
    CAR = "car"


def bearing_class(thickness: float, walking: float, snowmobile: float, car: float) -> Bearing:
    if thickness >= car:
        return Bearing.CAR
    if thickness >= snowmobile:
        return Bearing.SNOWMOBILE
    if thickness >= walking:
        return Bearing.WALKING
    return Bearing.DOES_NOT_BEAR


def latest_day(rows: list[Row], kind: int | None = None) -> date | None:
    days = [row.day for row in rows if kind is None or row.kind == kind]
    return max(days) if days else None


def current(points: list[Point], window: int, today: date) -> Point | None:
    """The newest point, while it is at most the window's days old."""
    if not points or (today - points[-1].day).days > window:
        return None
    return points[-1]


def shown_days(points: list[Point], window: int, today: date) -> list[tuple[date, float]]:
    """The days each value is the sensor's state on, as it would be shown with every measurement known on its own day.

    A value is shown from its day until the next measurement's day, or until it is older than the window, and never
    after today. A point with no value shows nothing.
    """
    days: list[tuple[date, float]] = []
    for index, point in enumerate(points):
        if point.value is None:
            continue
        end = point.day + timedelta(days=window + 1)
        if index + 1 < len(points):
            end = min(end, points[index + 1].day)
        end = min(end, today + timedelta(days=1))
        day = point.day
        while day < end:
            days.append((day, point.value))
            day += timedelta(days=1)
    return days
