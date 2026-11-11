"""Keeping each day's measurement in the statistics of its sensor, so its graphs show it on the day it was measured.

Syke publishes a day's water level the next day, and an ice or snow measurement days after it was made, so the
recorder keeps whatever the sensor showed meanwhile: the measurement before. Each day the sensor's value covers is
given that value: a day with no statistics gets one row at its start, and in a day the recorder kept, every hourly
row is given it. The hours missing from a day stay missing. This also fills in the year before the integration was
set up.
"""

from __future__ import annotations

import logging
import math
from datetime import date, datetime, time, timedelta

from homeassistant.components.recorder import get_instance
from homeassistant.components.recorder.models import StatisticData, StatisticMeanType, StatisticMetaData
from homeassistant.components.recorder.statistics import (
    STATISTIC_UNIT_TO_UNIT_CONVERTER,
    async_import_statistics,
    statistics_during_period,
)
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)

# Statistics imported by an integration for one of its own entities say they come from the recorder.
SOURCE = "recorder"
# The recorder compiles an hour's statistics a little after it ends. A row imported into an hour it hasn't compiled
# yet makes that compile hit a duplicate and roll back the hour for every entity, so no row is added to the newest
# hours. A row the recorder has already compiled can be given the value.
COMPILE_MARGIN = timedelta(hours=2)
# The hour being recorded when a value changes is compiled later from both the old value and the new one, so the days
# are written once more after it has been.
WRITE_AGAIN_AFTER = timedelta(hours=1) + COMPILE_MARGIN


def midnight(day: date) -> datetime:
    return dt_util.as_utc(datetime.combine(day, time(), tzinfo=dt_util.get_default_time_zone()))


def recording(hass: HomeAssistant) -> bool:
    """Whether there is a recorder to keep statistics in. One whose database failed is not set up."""
    return "recorder" in hass.config.components


def unit_class(unit: str | None) -> str | None:
    """The unit class the recorder gives a sensor of the unit, so an import doesn't change it back and forth."""
    converter = STATISTIC_UNIT_TO_UNIT_CONVERTER.get(unit)
    return converter.UNIT_CLASS if converter else None


def converted(value: float, native: str | None, shown: str | None) -> float:
    """The value in the unit the sensor is shown in, which the recorder keeps its statistics in."""
    if native == shown:
        return value
    converter = STATISTIC_UNIT_TO_UNIT_CONVERTER.get(native)
    if converter is None or shown not in converter.VALID_UNITS:
        return value
    return converter.convert(value, native, shown)


def same(stored: float | None, value: float) -> bool:
    # A mean of equal values may come back a rounding error away from them.
    return stored is not None and math.isclose(stored, value, rel_tol=1e-9, abs_tol=1e-12)


async def async_write_history(hass: HomeAssistant, sensors: list[tuple[str, str | None, list[tuple[date, float]]]]) -> None:
    """Gives each day in the statistics of each sensor its value: its entity id, the unit its statistics are in and its days.

    All the sensors are asked about in one query, and the hours of the days to correct in another.
    """
    if not recording(hass):
        return
    now = dt_util.utcnow()
    known: dict[str, tuple[str | None, list[tuple[datetime, datetime, float]]]] = {}
    for entity_id, unit, days in sensors:
        found = [(midnight(day), midnight(day + timedelta(days=1)), value) for day, value in days]
        if found := [slot for slot in found if slot[0] <= now]:
            known[entity_id] = (unit, found)
    if not known:
        return
    instance = get_instance(hass)
    # The recorder's days start at midnight in Home Assistant's time zone, as a day here does.
    since = min(start for _, found in known.values() for start, _, _ in found)
    stored = await instance.async_add_executor_job(statistics_during_period, hass, since, None, set(known), "day", None, {"min", "max"})

    rows: dict[str, list[StatisticData]] = {}
    # The days whose rows hold something else than the value, by sensor: their start, end and value.
    wrong: dict[str, list[tuple[datetime, datetime, float]]] = {}
    for entity_id, (_, found) in known.items():
        taken = {row["start"]: row for row in stored.get(entity_id, [])}
        for start, end, value in found:
            row = taken.get(start.timestamp())
            if row is None:
                if start <= now - COMPILE_MARGIN:
                    rows.setdefault(entity_id, []).append(StatisticData(start=start, mean=value, min=value, max=value))
            elif not (same(row.get("min"), value) and same(row.get("max"), value)):
                wrong.setdefault(entity_id, []).append((start, end, value))

    if wrong:
        since = min(start for slots in wrong.values() for start, _, _ in slots)
        recorded = await instance.async_add_executor_job(statistics_during_period, hass, since, None, set(wrong), "hour", None, {"mean"})
        for entity_id, slots in wrong.items():
            by_start = {start: (end, value) for start, end, value in slots}
            for row in recorded.get(entity_id, []):
                hour = dt_util.utc_from_timestamp(row["start"])
                day_start = midnight(dt_util.as_local(hour).date())
                if (slot := by_start.get(day_start)) is not None and hour < slot[0]:
                    value = slot[1]
                    rows.setdefault(entity_id, []).append(StatisticData(start=hour, mean=value, min=value, max=value))

    for entity_id, written in rows.items():
        unit = known[entity_id][0]
        metadata = StatisticMetaData(
            source=SOURCE,
            statistic_id=entity_id,
            name=None,
            unit_of_measurement=unit,
            unit_class=unit_class(unit),
            mean_type=StatisticMeanType.ARITHMETIC,
            has_sum=False,
        )
        async_import_statistics(hass, metadata, written)
        _LOGGER.debug("Wrote %s rows into the statistics of %s", len(written), entity_id)
