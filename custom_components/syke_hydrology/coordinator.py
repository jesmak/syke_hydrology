"""Reading a station's places from Syke once an hour."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import replace
from datetime import date, timedelta

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from .api import Place, Quantity, Row, SykeClient, SykeError
from .averages import Averages
from .const import CONF_PLACES, DOMAIN, UPDATE_INTERVAL
from .measurements import StationData

_LOGGER = logging.getLogger(__name__)

# The rows kept: a year back, which is also how far the statistics are filled in.
HISTORY = timedelta(days=366)
# How far back each refresh reads again after the first. Syke adds an ice or snow measurement days after it was made,
# and may correct a day's value later.
REREAD = timedelta(days=60)

type SykeConfigEntry = ConfigEntry[SykeCoordinator]


def places_of(entry: ConfigEntry) -> list[Place]:
    return [
        Place(id=place["id"], quantity=Quantity(place["quantity"]), name=place["name"], municipality=place["municipality"])
        for place in entry.data[CONF_PLACES]
    ]


class SykeCoordinator(DataUpdateCoordinator[StationData]):
    config_entry: SykeConfigEntry

    def __init__(self, hass: HomeAssistant, entry: SykeConfigEntry) -> None:
        super().__init__(hass, _LOGGER, config_entry=entry, name=f"{DOMAIN} {entry.title}", update_interval=UPDATE_INTERVAL)
        self.client = SykeClient(async_get_clientsession(hass))
        self.places = places_of(entry)
        self.averages = Averages()
        # Set when the rows changed, so the statistics are filled in again.
        self.changed = False

    @property
    def quantities(self) -> set[Quantity]:
        return {place.quantity for place in self.places}

    async def _async_update_data(self) -> StationData:
        today = dt_util.now().date()
        old = self.data or StationData()
        since = today - (REREAD if self.data else HISTORY)
        try:
            fetched = await asyncio.gather(*(self.client.async_rows(place, since) for place in self.places))
            level = old.level
            water = next((place for place in self.places if place.quantity == Quantity.WATER_LEVEL), None)
            if water is not None and self.data is None:
                level = await self.client.async_level(water.id)
        except SykeError as err:
            raise UpdateFailed(str(err)) from err

        rows: dict[Quantity, list[Row]] = {}
        for place, new in zip(self.places, fetched, strict=True):
            rows[place.quantity] = merge(old.rows.get(place.quantity, []), new, since, today - HISTORY)
        data = replace(old, rows=rows, level=level)
        self.changed = self.data is None or rows != old.rows
        return data


def merge(old: list[Row], new: list[Row], since: date, oldest: date) -> list[Row]:
    """The rows read before the day the new ones start from, then the new ones, without those older than a year."""
    return [row for row in old if oldest <= row.day < since] + [row for row in new if row.day >= oldest]
