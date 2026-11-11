"""A station's sensors and what they show."""

from __future__ import annotations

from datetime import date, datetime, timedelta

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from custom_components.syke_hydrology.api import Place, Quantity, Row
from custom_components.syke_hydrology.const import CONF_CAR, CONF_MAX_AGE, CONF_SNOWMOBILE, CONF_WALKING

from .conftest import TODAY, station_entry

PREFIX = "sensor.esimerkkijarvi_laituri"


@pytest.fixture(autouse=True)
async def helsinki(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    await hass.config.async_set_time_zone("Europe/Helsinki")
    freezer.move_to(datetime.combine(TODAY, datetime.min.time(), tzinfo=dt_util.get_default_time_zone()) + timedelta(hours=12))


async def set_up(hass: HomeAssistant, **kwargs) -> None:
    entry = station_entry(hass, **kwargs)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()


async def test_the_station_shows_its_newest_measurements(hass: HomeAssistant, enable_custom_integrations, syke) -> None:
    await set_up(hass)
    level = hass.states.get(f"{PREFIX}_water_level")
    assert level.state == "78.12"
    assert level.attributes["unit_of_measurement"] == "m"
    assert level.attributes["measured"] == "2027-02-09"
    assert level.attributes["height_system"] == "N2000"
    assert hass.states.get(f"{PREFIX}_surface_water_temperature").state == "0.3"
    assert hass.states.get(f"{PREFIX}_ice_thickness").state == "29.0"
    assert hass.states.get(f"{PREFIX}_clear_ice_thickness").state == "22.0"
    assert hass.states.get(f"{PREFIX}_snow_ice_thickness").state == "7.0"
    assert hass.states.get(f"{PREFIX}_snow_on_ice").state == "12.0"
    assert hass.states.get(f"{PREFIX}_ice_bearing_thickness").state == "26.0", "22 + 3.5 rounds up"
    assert hass.states.get(f"{PREFIX}_ice_bears").state == "car"
    assert hass.states.get(f"{PREFIX}_ice_measured").state == "2027-02-01"
    assert hass.states.get(f"{PREFIX}_freeze_up").state == "2026-12-15"
    assert hass.states.get(f"{PREFIX}_permanent_ice_cover").state == "2026-12-28"
    assert hass.states.get(f"{PREFIX}_break_up").state == "2026-04-20"
    assert hass.states.get(f"{PREFIX}_ice_gone_from_open_water").state == "unknown"
    assert hass.states.get("binary_sensor.esimerkkijarvi_laituri_ice_measurement_old").state == "off"


async def test_the_limits_and_the_maximum_age_are_the_stations_own(hass: HomeAssistant, enable_custom_integrations, syke) -> None:
    await set_up(hass, options={CONF_WALKING: 10, CONF_SNOWMOBILE: 26, CONF_CAR: 40, CONF_MAX_AGE: 7})
    assert hass.states.get(f"{PREFIX}_ice_bears").state == "snowmobile"
    assert hass.states.get("binary_sensor.esimerkkijarvi_laituri_ice_measurement_old").state == "on", "nine days old"


async def test_a_measurement_older_than_its_window_is_unavailable(hass: HomeAssistant, enable_custom_integrations, syke) -> None:
    syke.rows[9102] = [Row(date(2027, 1, 5), 20.0, 113), Row(date(2027, 1, 5), 20.0, 41)]
    await set_up(hass)
    assert hass.states.get(f"{PREFIX}_ice_thickness").state == STATE_UNAVAILABLE
    assert hass.states.get(f"{PREFIX}_ice_bears").state == STATE_UNAVAILABLE
    assert hass.states.get(f"{PREFIX}_ice_measured").state == "2027-01-05", "the date stays, so the summer shows the last one"
    assert hass.states.get("binary_sensor.esimerkkijarvi_laituri_ice_measurement_old").state == "on"


async def test_weak_ice_bears_nothing(hass: HomeAssistant, enable_custom_integrations, syke) -> None:
    syke.rows[9102] = [*syke.rows[9102], Row(date(2027, 2, 9), 0.0, 43)]
    await set_up(hass)
    assert hass.states.get(f"{PREFIX}_ice_thickness").state == "unknown"
    assert hass.states.get(f"{PREFIX}_ice_bearing_thickness").state == "0.0"
    assert hass.states.get(f"{PREFIX}_ice_bears").state == "does_not_bear"


async def test_a_water_level_without_a_height_system_is_in_centimetres(hass: HomeAssistant, enable_custom_integrations, syke) -> None:
    syke.level = None
    await set_up(hass)
    level = hass.states.get(f"{PREFIX}_water_level")
    assert level.state == "312.0"
    assert level.attributes["unit_of_measurement"] == "cm"
    assert level.attributes["height_system"] is None


async def test_a_station_has_only_the_sensors_of_its_quantities(hass: HomeAssistant, enable_custom_integrations, syke) -> None:
    await set_up(hass, places=[Place(9101, Quantity.WATER_LEVEL, "Esimerkkijärvi, Laituri", "Kuopio")])
    assert hass.states.async_entity_ids("sensor") == [f"{PREFIX}_water_level"]
    assert hass.states.async_entity_ids("binary_sensor") == []
