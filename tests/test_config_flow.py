"""Picking what to follow and the station measuring it, and a station's measurements and ice bearing limits."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import entity_registry as er

from custom_components.syke_hydrology.api import Place, Quantity, SykeError
from custom_components.syke_hydrology.config_flow import label
from custom_components.syke_hydrology.const import CONF_CAR, CONF_MAX_AGE, CONF_PLACES, CONF_SNOWMOBILE, CONF_WALKING, DOMAIN

from .conftest import NAME, PLACES, station_entry

PLACES_CALL = "custom_components.syke_hydrology.config_flow.SykeClient.async_places"

# Home at the old observatory in Kuopio, with three made-up water levels around it.
HOME = (62.8925, 27.6783)
NEAR = Place(9501, Quantity.WATER_LEVEL, "Esimerkkijärvi, Laituri", "Kuopio", 62.90, 27.68)
FAR = Place(9502, Quantity.WATER_LEVEL, "Esimerkkijoki", "Joensuu", 62.60, 29.76)
NOWHERE = Place(9503, Quantity.WATER_LEVEL, "Esimerkkilampi", "Kuopio")
ICE = Place(9504, Quantity.ICE, "Esimerkkijärvi, Laituri", "Kuopio", 62.90, 27.68)


@pytest.fixture(autouse=True)
def home(hass: HomeAssistant) -> None:
    hass.config.latitude, hass.config.longitude = HOME


def test_a_place_sharing_its_name_is_told_apart_by_its_id() -> None:
    place = Place(9301, Quantity.WATER_LEVEL, "Esimerkkikoski, ylä", "Kouvola")
    assert label(place, True, 12.4) == "Esimerkkikoski, ylä, Kouvola (9301) · 12 km"
    assert label(place, False, None) == "Esimerkkikoski, ylä, Kouvola"


async def pick(hass: HomeAssistant, quantity: str) -> dict:
    with patch(PLACES_CALL, AsyncMock(return_value=[FAR, NOWHERE, ICE, NEAR])):
        result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.MENU
    assert quantity in result["menu_options"]
    return await hass.config_entries.flow.async_configure(result["flow_id"], {"next_step_id": quantity})


async def test_the_places_of_the_measurement_are_listed_nearest_first(hass: HomeAssistant, enable_custom_integrations) -> None:
    result = await pick(hass, "water_level")
    assert result["step_id"] == "place"
    selector = result["data_schema"].schema["station"].config
    assert selector["custom_value"], "the frontend shows a searchable list only with a custom value"
    # The field shows the chosen value, so the value is the text to show.
    assert selector["options"] == ["Esimerkkijärvi, Laituri, Kuopio · 1 km", "Esimerkkijoki, Joensuu · 111 km", "Esimerkkilampi, Kuopio"]


async def add(hass: HomeAssistant, quantity: str, place: Place) -> dict:
    result = await pick(hass, quantity)
    chosen = next(option for option in result["data_schema"].schema["station"].config["options"] if option.startswith(place.name))
    return await hass.config_entries.flow.async_configure(result["flow_id"], {"station": chosen})


async def test_the_first_measurement_makes_the_station(hass: HomeAssistant, enable_custom_integrations, syke) -> None:
    result = await add(hass, "ice", ICE)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == NAME
    assert result["result"].unique_id == "9504"
    assert result["data"][CONF_PLACES] == [{"id": 9504, "quantity": 9, "name": NAME, "municipality": "Kuopio"}]


async def test_another_measurement_joins_its_station(hass: HomeAssistant, enable_custom_integrations, syke) -> None:
    entry = (await add(hass, "ice", ICE))["result"]
    result = await add(hass, "water_level", NEAR)
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "measurement_added"
    assert result["description_placeholders"] == {"station": NAME}
    assert [place["id"] for place in entry.data[CONF_PLACES]] == [9504, 9501]
    await hass.async_block_till_done()
    assert len(hass.config_entries.async_entries(DOMAIN)) == 1
    assert hass.states.get("sensor.esimerkkijarvi_laituri_water_level") is not None, "the station was reloaded"


async def test_a_measurement_is_added_once(hass: HomeAssistant, enable_custom_integrations, syke) -> None:
    await add(hass, "water_level", NEAR)
    result = await add(hass, "water_level", NEAR)
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


async def test_a_second_place_of_a_quantity_is_a_station_of_its_own(hass: HomeAssistant, enable_custom_integrations, syke) -> None:
    twin = Place(9505, Quantity.WATER_LEVEL, NEAR.name, NEAR.municipality, 62.91, 27.68)
    await add(hass, "water_level", NEAR)
    with patch(PLACES_CALL, AsyncMock(return_value=[NEAR, twin])):
        result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {"next_step_id": "water_level"})
    options = result["data_schema"].schema["station"].config["options"]
    assert options == [f"{NAME}, Kuopio (9501) · 1 km", f"{NAME}, Kuopio (9505) · 2 km"]
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {"station": options[1]})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == f"{NAME} (9505)"


async def test_typed_text_is_not_a_station(hass: HomeAssistant, enable_custom_integrations) -> None:
    result = await pick(hass, "water_level")
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {"station": "Esimerkkijärvi"})
    assert result["step_id"] == "place"
    assert result["errors"] == {"station": "unknown_station"}


async def test_an_unreachable_syke_ends_the_flow(hass: HomeAssistant, enable_custom_integrations) -> None:
    with patch(PLACES_CALL, AsyncMock(side_effect=SykeError("down"))):
        result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "cannot_connect"


async def test_a_station_has_options_when_it_has_several_measurements_or_ice(hass: HomeAssistant) -> None:
    assert station_entry(hass).supports_options
    assert station_entry(hass, [PLACES[1]]).supports_options, "the ice limits"
    assert not station_entry(hass, [PLACES[0]]).supports_options


async def test_a_measurement_left_out_is_removed_with_its_sensors(hass: HomeAssistant, enable_custom_integrations, syke) -> None:
    entry = station_entry(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    registry = er.async_get(hass)
    assert registry.async_get("sensor.esimerkkijarvi_laituri_ice_thickness") is not None

    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["menu_options"] == ["limits", "measurements"]
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"next_step_id": "measurements"})
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"measurements": []})
    assert result["errors"] == {"base": "keep_one"}
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"measurements": ["water_level", "surface_temperature"]})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()

    assert [place["id"] for place in entry.data[CONF_PLACES]] == [9101, 9103]
    assert registry.async_get("sensor.esimerkkijarvi_laituri_ice_thickness") is None
    assert registry.async_get("binary_sensor.esimerkkijarvi_laituri_ice_measurement_old") is None
    assert registry.async_get("sensor.esimerkkijarvi_laituri_freeze_up") is None
    assert hass.states.get("sensor.esimerkkijarvi_laituri_water_level").state == "78.12"
    assert await hass.config_entries.async_unload(entry.entry_id)


async def test_the_limits_must_grow(hass: HomeAssistant, enable_custom_integrations, syke) -> None:
    entry = station_entry(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"next_step_id": "limits"})
    limits = {CONF_WALKING: 10, CONF_SNOWMOBILE: 25, CONF_CAR: 20, CONF_MAX_AGE: 14}
    result = await hass.config_entries.options.async_configure(result["flow_id"], limits)
    assert result["errors"] == {"base": "limits_order"}

    result = await hass.config_entries.options.async_configure(result["flow_id"], {**limits, CONF_SNOWMOBILE: 15.0})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options == {CONF_WALKING: 10, CONF_SNOWMOBILE: 15, CONF_CAR: 20, CONF_MAX_AGE: 14}
    await hass.async_block_till_done()
    assert await hass.config_entries.async_unload(entry.entry_id)
