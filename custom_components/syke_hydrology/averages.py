"""Long-term averages: what each sensor has measured on each calendar day over the last thirty full years."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

from .measurements import Point

YEARS = 30
# Raised when the way the averages are computed changes, so those kept from before are read again.
RULES = 2
# A calendar day's average is given when at least this many of the years have a measurement for it.
MIN_YEARS = 5
# Ice and snow are measured about every ten days, so a calendar day has a measurement in few of the years. Their
# average for a day is taken from the measurements this many days to each side of it.
SMOOTHING = 5

# A winter of ice measurements starts in July.
WINTER_STARTS = 7
# The measurements are about ten days apart, so the visit before a winter's first one found no ice to measure.
BEFORE_FIRST = timedelta(days=10)
# The last measurement of a winter is often of thick ice, which is there for weeks after. A month is also how long
# the measurement's own sensor shows it.
AFTER_LAST = timedelta(days=30)

# The calendar days are those of a leap year, so the 29th of February has an average of its own.
_LEAP_YEAR = 2000
_DAYS = 366


@dataclass
class Averages:
    # The last year the averages are from. 0 when there are none yet.
    year: int = 0
    # Each measurement sensor's average by calendar day, as "MM-DD", by the sensor's key.
    series: dict[str, dict[str, float]] = field(default_factory=dict)
    # Each event's average day, as days from the start of its season, by the date sensor's key.
    events: dict[str, int] = field(default_factory=dict)


def years(today: date) -> tuple[int, int]:
    """The first and the last of the years the averages are from: the thirty full years before this one."""
    return today.year - YEARS, today.year - 1


def _ordinal(day: date) -> int:
    return date(_LEAP_YEAR, day.month, day.day).timetuple().tm_yday - 1


def _calendar_day(ordinal: int) -> str:
    return (date(_LEAP_YEAR, 1, 1) + timedelta(days=ordinal)).strftime("%m-%d")


def calendar_days(points: list[Point], first: int, last: int, smoothing: int = 0) -> dict[str, float]:
    """The average of the points' values on each calendar day, over the years from the first to the last.

    With smoothing, a year's value for a day is the average of its values within that many days of it. Each year
    weighs the same, however many values it has.
    """
    by_day: list[dict[int, list[float]]] = [{} for _ in range(_DAYS)]
    for point in points:
        if point.value is not None and first <= point.day.year <= last:
            by_day[_ordinal(point.day)].setdefault(point.day.year, []).append(point.value)
    averages: dict[str, float] = {}
    for ordinal in range(_DAYS):
        years_near: dict[int, list[float]] = {}
        for offset in range(-smoothing, smoothing + 1):
            for year, values in by_day[(ordinal + offset) % _DAYS].items():
                years_near.setdefault(year, []).extend(values)
        if len(years_near) >= MIN_YEARS:
            averages[_calendar_day(ordinal)] = round(sum(sum(values) / len(values) for values in years_near.values()) / len(years_near), 3)
    return averages


def with_open_water(points: list[Point], first: int, last: int) -> list[Point]:
    """The points of an ice measurement, with a zero for each day of open water around each winter's measurements.

    Ice is measured only once it bears the one measuring, so the years with open water on a day would be missing
    from that day's average, which would then be that of the icy years alone. A winter, from July to June, counts
    as open water until BEFORE_FIRST days before its first measurement and from AFTER_LAST days after its last. A
    measurement of zero is open water as it stands. A winter with no measurement is left out, as nothing is known of it.
    """
    winters: dict[int, list[Point]] = {}
    for point in sorted(points, key=lambda point: point.day):
        if point.value is not None and first <= point.day.year <= last:
            winters.setdefault(_season(point.day, WINTER_STARTS), []).append(point)
    zeros: list[Point] = []
    for winter, measured in winters.items():
        # The winter going on when the years start or end is only known from the part within them.
        if winter >= first:
            until = measured[0].day - (BEFORE_FIRST if measured[0].value else timedelta())
            zeros += _zeros(date(winter, WINTER_STARTS, 1), until)
        if winter < last:
            since = measured[-1].day + (AFTER_LAST if measured[-1].value else timedelta(days=1))
            zeros += _zeros(since, date(winter + 1, WINTER_STARTS, 1))
    return [*points, *zeros]


def _zeros(since: date, until: date) -> list[Point]:
    """A zero for each day from one day until the day before the other."""
    return [Point(since + timedelta(days=days), 0.0) for days in range((until - since).days)]


def average_on(averages: dict[str, float], day: date, back: int = 0) -> float | None:
    """The average of the day, or of the newest calendar day before it that has one, at most so many days back.

    A sum over a period is given on the period's first day, so its average is looked for that far back.
    """
    for offset in range(back + 1):
        value = averages.get((day - timedelta(days=offset)).strftime("%m-%d"))
        if value is not None:
            return value
    return None


def _season(day: date, start_month: int) -> int:
    """The year the season of the day started in, a season starting on the first of the month."""
    return day.year if day.month >= start_month else day.year - 1


def average_event(days: list[date], first: int, last: int, start_month: int) -> int | None:
    """The average day of an event that happens once a season, as days from the season's start.

    A freeze-up may fall on either side of the new year, so its seasons start in July. Of a season with the event
    twice, the later one counts.
    """
    seasons: dict[int, int] = {}
    for day in sorted(days):
        if first <= day.year <= last:
            season = _season(day, start_month)
            seasons[season] = (day - date(season, start_month, 1)).days
    if len(seasons) < MIN_YEARS:
        return None
    return round(sum(seasons.values()) / len(seasons))


def event_day(offset: int, today: date, start_month: int) -> date:
    """The average day of an event in the season going on today."""
    return date(_season(today, start_month), start_month, 1) + timedelta(days=offset)
