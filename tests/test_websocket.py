"""What the card is handed for a sensor of a station."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from unittest.mock import patch

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util

from custom_components.syke_hydrology.api import Row
from custom_components.syke_hydrology.averages import Averages
from custom_components.syke_hydrology.const import CONF_CAR, CONF_WALKING

from .conftest import TODAY, station_entry

PREFIX = "sensor.esimerkkijarvi_laituri"


@pytest.fixture(autouse=True)
async def helsinki(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    await hass.config.async_set_time_zone("Europe/Helsinki")
    freezer.move_to(datetime.combine(TODAY, datetime.min.time(), tzinfo=dt_util.get_default_time_zone()) + timedelta(hours=12))


AVERAGES = Averages(
    year=2026,
    series={"water_level": {"02-09": 78.05, "02-10": 78.06}, "ice_bearing": {"02-01": 21.5}},
    events={"freeze_up": 160, "break_up": 110},
)


async def set_up(hass: HomeAssistant, **kwargs) -> None:
    """A station whose averages are AVERAGES, as the made-up rows have too few years for any."""

    async def load(hass: HomeAssistant, coordinator) -> None:
        coordinator.averages = AVERAGES

    entry = station_entry(hass, **kwargs)
    with patch("custom_components.syke_hydrology.long_term.async_load", load):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()


async def ask(hass: HomeAssistant, client, entity_id: str) -> dict:
    await client.send_json_auto_id({"type": "syke_hydrology/card", "entity_id": entity_id})
    return await client.receive_json()


async def test_a_measurement_comes_with_its_days_and_averages(hass: HomeAssistant, hass_ws_client, enable_custom_integrations, syke):
    await set_up(hass)
    client = await hass_ws_client(hass)
    for entity_id in (f"{PREFIX}_water_level", f"{PREFIX}_water_level_long_term_average"):
        response = await ask(hass, client, entity_id)
        assert response["success"], entity_id
        assert response["result"] == {
            "kind": "measurement",
            "measurement": "water_level",
            "station": "Esimerkkijärvi, Laituri",
            "entity_id": f"{PREFIX}_water_level",
            "average_entity_id": f"{PREFIX}_water_level_long_term_average",
            "unit": "m",
            "window": 30,
            "average_back": 0,
            "years": "1997–2026",
            "points": [["2027-02-08", 78.1], ["2027-02-09", 78.12]],
            "average": {"02-09": 78.05, "02-10": 78.06},
        }


async def test_a_measurement_is_in_the_unit_its_sensor_is_shown_in(hass: HomeAssistant, hass_ws_client, enable_custom_integrations, syke):
    await set_up(hass)
    er.async_get(hass).async_update_entity_options(f"{PREFIX}_water_level", "sensor", {"unit_of_measurement": "cm"})
    await hass.async_block_till_done()
    result = (await ask(hass, await hass_ws_client(hass), f"{PREFIX}_water_level"))["result"]
    assert result["unit"] == "cm"
    assert result["points"][-1] == ["2027-02-09", pytest.approx(7812.0)]
    assert result["average"]["02-09"] == pytest.approx(7805.0)


async def test_any_ice_sensor_comes_with_the_stations_ice(hass: HomeAssistant, hass_ws_client, enable_custom_integrations, syke):
    syke.rows[9102] = [*syke.rows[9102], Row(date(2027, 2, 9), 0.0, 43)]
    await set_up(hass, options={CONF_WALKING: 8, CONF_CAR: 25})
    client = await hass_ws_client(hass)
    answers = [
        (await ask(hass, client, entity_id))["result"]
        for entity_id in (
            f"{PREFIX}_ice_bears",
            f"{PREFIX}_ice_bearing_thickness",
            f"{PREFIX}_ice_bearing_thickness_long_term_average",
            f"{PREFIX}_freeze_up",
            "binary_sensor.esimerkkijarvi_laituri_ice_measurement_old",
        )
    ]
    assert all(answer == answers[0] for answer in answers)
    result = answers[0]
    assert result["kind"] == "ice"
    assert result["measures_ice"] is True
    assert result["limits"] == {"walking": 8, "snowmobile": 15, "car": 25}
    assert result["max_age"] == 14
    assert result["measurements"] == [
        {"day": "2027-01-20", "total": 24.0, "clear": 18.0, "snow_ice": 6.0, "snow_on_ice": 10.0, "bearing": 21.0, "weak": False},
        {"day": "2027-02-01", "total": 29.0, "clear": 22.0, "snow_ice": 7.0, "snow_on_ice": 12.0, "bearing": 26.0, "weak": False},
        {"day": "2027-02-09", "total": None, "clear": None, "snow_ice": None, "snow_on_ice": None, "bearing": 0.0, "weak": True},
    ]
    assert result["average"] == {"02-01": 21.5}
    assert result["events"]["freeze_up"] == {"day": "2026-12-15", "average": 160, "season_start": 7}
    assert result["events"]["break_up"] == {"day": "2026-04-20", "average": 110, "season_start": 1}
    assert result["events"]["open_water_clear"] == {"day": None, "average": None, "season_start": 1}


@pytest.mark.parametrize("entity_id", ["sensor.not_ours", "binary_sensor.esimerkkijarvi_laituri_nothing"])
async def test_a_sensor_not_of_a_station_is_refused(hass: HomeAssistant, hass_ws_client, enable_custom_integrations, syke, entity_id):
    await set_up(hass)
    response = await ask(hass, await hass_ws_client(hass), entity_id)
    assert not response["success"]
    assert response["error"]["code"] == "not_found"


async def test_a_station_not_loaded_is_tried_again(hass: HomeAssistant, hass_ws_client, enable_custom_integrations, syke):
    await set_up(hass)
    entry = hass.config_entries.async_entries("syke_hydrology")[0]
    await hass.config_entries.async_unload(entry.entry_id)
    response = await ask(hass, await hass_ws_client(hass), f"{PREFIX}_water_level")
    assert response["error"]["code"] == "not_loaded"
