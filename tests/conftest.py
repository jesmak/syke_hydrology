"""Shared fixtures: a made-up lake station that measures everything an ice station does, and Syke's client patched."""

from __future__ import annotations

from collections.abc import Generator
from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.syke_hydrology.api import Level, Place, Quantity, Row
from custom_components.syke_hydrology.const import CONF_PLACES, DOMAIN

NAME = "Esimerkkijärvi, Laituri"
MUNICIPALITY = "Kuopio"

PLACES = [
    Place(9101, Quantity.WATER_LEVEL, NAME, MUNICIPALITY),
    Place(9102, Quantity.ICE, NAME, MUNICIPALITY),
    Place(9103, Quantity.SURFACE_TEMPERATURE, NAME, MUNICIPALITY),
    Place(9104, Quantity.ICE_EVENTS, NAME, MUNICIPALITY),
]

LEVEL = Level("N2000", 7500)

# The day the tests run on, in Helsinki: the water level and temperature are a day behind.
TODAY = date(2027, 2, 10)


def ice_rows(day: date, clear: int, snow: int, total: int, snow_on: int) -> list[Row]:
    return [Row(day, float(clear), 113), Row(day, float(snow), 112), Row(day, float(total), 41), Row(day, float(snow_on), 37)]


ROWS: dict[int, list[Row]] = {
    9101: [Row(date(2027, 2, 8), 310.0, None), Row(date(2027, 2, 9), 312.0, None)],
    9102: ice_rows(date(2027, 1, 20), 18, 6, 24, 10) + ice_rows(date(2027, 2, 1), 22, 7, 29, 12),
    9103: [Row(date(2027, 2, 8), 0.4, None), Row(date(2027, 2, 9), 0.3, None)],
    9104: [Row(date(2026, 4, 20), None, 28), Row(date(2026, 12, 15), None, 29), Row(date(2026, 12, 28), None, 30)],
}


def station_entry(hass: HomeAssistant, places: list[Place] = PLACES, options: dict | None = None) -> MockConfigEntry:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title=places[0].name,
        unique_id=str(places[0].id),
        data={CONF_PLACES: [{"id": p.id, "quantity": int(p.quantity), "name": p.name, "municipality": p.municipality} for p in places]},
        options=options or {},
    )
    entry.add_to_hass(hass)
    return entry


@pytest.fixture
def syke() -> Generator[AsyncMock]:
    """Syke's client, answering with ROWS and LEVEL. Change `rows` or `level` on it to answer otherwise."""
    with patch("custom_components.syke_hydrology.coordinator.SykeClient", autospec=True) as client_class:
        client = client_class.return_value
        client.rows = dict(ROWS)
        client.level = LEVEL

        async def rows(place: Place, since: date) -> list[Row]:
            return [row for row in client.rows.get(place.id, []) if row.day >= since]

        async def level(place_id: int) -> Level | None:
            return client.level

        client.async_rows.side_effect = rows
        client.async_level.side_effect = level
        yield client
