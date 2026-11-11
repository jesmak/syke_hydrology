"""Reading a station's long-term averages from Syke, and keeping them over restarts.

The averages are from the thirty full years before this one, so they are read when a measurement is added and again
when the year changes: thirty years of a daily measurement is some twenty pages.
"""

from __future__ import annotations

import asyncio
from dataclasses import asdict
from datetime import date

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .averages import RULES, Averages, years
from .const import DOMAIN
from .coordinator import SykeConfigEntry, SykeCoordinator
from .measurements import StationData
from .sensor import averages_of

STORAGE_VERSION = 1


def _store(hass: HomeAssistant, entry: SykeConfigEntry) -> Store[dict]:
    return Store(hass, STORAGE_VERSION, f"{DOMAIN}.averages.{entry.entry_id}")


def _places(coordinator: SykeCoordinator) -> list[int]:
    return sorted(place.id for place in coordinator.places)


def current(coordinator: SykeCoordinator) -> bool:
    """Whether the station's averages are those of the last full year."""
    return coordinator.averages.year == years(dt_util.now().date())[1]


async def async_load(hass: HomeAssistant, coordinator: SykeCoordinator) -> None:
    """Gives the coordinator its averages: the kept ones, or read anew.

    The kept ones are used when they are of the last full year, of the station's places and computed as now.
    Raises SykeError when they have to be read and can't be.
    """
    stored = await _store(hass, coordinator.config_entry).async_load()
    if (
        stored
        and stored.get("rules") == RULES
        and stored["year"] == years(dt_util.now().date())[1]
        and stored["places"] == _places(coordinator)
    ):
        coordinator.averages = Averages(year=stored["year"], series=stored["series"], events=stored["events"])
        return
    await async_read(hass, coordinator)


async def async_read(hass: HomeAssistant, coordinator: SykeCoordinator) -> None:
    """Reads the thirty years from Syke and keeps their averages. Raises SykeError."""
    first, last = years(dt_util.now().date())
    fetched = await asyncio.gather(*(coordinator.client.async_rows(place, date(first, 1, 1)) for place in coordinator.places))
    rows = {place.quantity: found for place, found in zip(coordinator.places, fetched, strict=True)}
    data = StationData(rows=rows, level=coordinator.data.level)
    # Thirty years of days, averaged for every sensor of the station.
    coordinator.averages = await hass.async_add_executor_job(averages_of, data, coordinator.quantities, first, last)
    await _store(hass, coordinator.config_entry).async_save(
        {**asdict(coordinator.averages), "places": _places(coordinator), "rules": RULES}
    )


async def async_remove(hass: HomeAssistant, entry: SykeConfigEntry) -> None:
    await _store(hass, entry).async_remove()
