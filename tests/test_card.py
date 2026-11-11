"""The hydrology card that comes with the integration: served, and kept in the dashboards' resources."""

from __future__ import annotations

import logging

import pytest
from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.syke_hydrology.api import Place, Quantity
from custom_components.syke_hydrology.const import DOMAIN

from .conftest import station_entry

CARD = "/syke_hydrology/syke-hydrology-card.js"
OLD = f"{CARD}?v=1.0.0"
OLDER = f"{CARD}?v=0.9.0"
OTHER = "/hacsfiles/some-card/some-card.js"
# Stands for the card's resource at the integration's current version.
CURRENT = "current"

OTHER_STATION = [Place(9201, Quantity.WATER_LEVEL, "Toinenjärvi, Satama", "Kuopio")]


async def _url(hass: HomeAssistant, url: str) -> str:
    return f"{CARD}?v={(await async_get_integration(hass, DOMAIN)).version}" if url == CURRENT else url


async def _setup(hass: HomeAssistant, hass_storage, resources: list[str], yaml: bool = False) -> MockConfigEntry:
    """A station set up with the given resources, which are not yet loaded when the integration starts."""
    urls = [await _url(hass, url) for url in resources]
    if yaml:
        config = {"resource_mode": "yaml", "resources": [{"url": url, "type": "module"} for url in urls]}
        assert await async_setup_component(hass, "lovelace", {"lovelace": config})
    else:
        items = [{"id": f"resource{index}", "type": "module", "url": url} for index, url in enumerate(urls)]
        hass_storage["lovelace_resources"] = {"version": 1, "minor_version": 1, "key": "lovelace_resources", "data": {"items": items}}
        assert await async_setup_component(hass, "lovelace", {})
    entry = station_entry(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _urls(hass: HomeAssistant) -> list[str]:
    resources = hass.data[LOVELACE_DATA].resources
    await resources.async_get_info()
    return [item["url"] for item in resources.async_items()]


def _warnings(caplog) -> list[str]:
    return [record.getMessage() for record in caplog.records if record.name.endswith(".card") and record.levelno == logging.WARNING]


@pytest.mark.parametrize(
    ("before", "after"),
    [
        # One resource of the card's own, at the current version, is kept in place of any others of its own.
        ([], [CURRENT]),
        ([OTHER], [OTHER, CURRENT]),
        ([CURRENT], [CURRENT]),
        ([OLD], [CURRENT]),
        ([CARD], [CURRENT]),
        ([OLD, CURRENT], [CURRENT]),
        ([CURRENT, OLD], [CURRENT]),
        ([OLDER, OLD], [CURRENT]),
        ([OTHER, OLD, OTHER], [OTHER, CURRENT, OTHER]),
        ([OLD, OTHER, CURRENT], [OTHER, CURRENT]),
    ],
)
async def test_storage_mode_keeps_one_resource_at_the_current_version(
    hass: HomeAssistant, hass_storage, enable_custom_integrations, syke, caplog, before, after
):
    await _setup(hass, hass_storage, before)
    assert await _urls(hass) == [await _url(hass, url) for url in after]
    if CURRENT in before:
        ids = [item["id"] for item in hass.data[LOVELACE_DATA].resources.async_items() if item["url"] == await _url(hass, CURRENT)]
        assert ids == [f"resource{before.index(CURRENT)}"], "a resource already current is kept as it is"
    assert _warnings(caplog) == []


@pytest.mark.parametrize(
    ("resources", "asked"),
    [([], "add"), ([OTHER], "add"), ([OLD], "change"), ([CURRENT], None), ([OLD, CURRENT], None), ([OLDER, OLD], "change")],
)
async def test_yaml_mode_is_left_alone_and_asks_for_the_current_line(
    hass: HomeAssistant, hass_storage, enable_custom_integrations, syke, caplog, resources, asked
):
    await _setup(hass, hass_storage, resources, yaml=True)
    current = await _url(hass, CURRENT)
    assert await _urls(hass) == [await _url(hass, url) for url in resources]
    warnings = _warnings(caplog)
    if asked is None:
        assert warnings == []
    elif asked == "add":
        assert warnings == [
            f"Dashboard resources are set in YAML, so the hydrology card can't add itself. Add url: {current}, type: module to them"
        ]
    else:
        assert len(warnings) == 1
        assert f"Change {resources[0]} in them to {current}" in warnings[0]


async def test_the_card_goes_with_the_last_station(hass: HomeAssistant, hass_storage, enable_custom_integrations, syke):
    first = await _setup(hass, hass_storage, [OTHER])
    second = station_entry(hass, places=OTHER_STATION)
    assert await hass.config_entries.async_setup(second.entry_id)
    await hass.async_block_till_done()

    await hass.config_entries.async_remove(first.entry_id)
    await hass.async_block_till_done()
    assert await _urls(hass) == [OTHER, await _url(hass, CURRENT)], "another station still uses it"

    await hass.config_entries.async_remove(second.entry_id)
    await hass.async_block_till_done()
    assert await _urls(hass) == [OTHER]


async def test_yaml_mode_warns_once_however_many_stations(hass: HomeAssistant, hass_storage, enable_custom_integrations, syke, caplog):
    await _setup(hass, hass_storage, [], yaml=True)
    second = station_entry(hass, places=OTHER_STATION)
    assert await hass.config_entries.async_setup(second.entry_id)
    await hass.async_block_till_done()
    assert len(_warnings(caplog)) == 1


async def test_a_station_added_again_after_the_last_was_removed_brings_the_card_back(
    hass: HomeAssistant, hass_storage, enable_custom_integrations, syke
):
    first = await _setup(hass, hass_storage, [OTHER])
    await hass.config_entries.async_remove(first.entry_id)
    await hass.async_block_till_done()
    assert await _urls(hass) == [OTHER]

    again = station_entry(hass, places=OTHER_STATION)
    assert await hass.config_entries.async_setup(again.entry_id)
    await hass.async_block_till_done()
    assert await _urls(hass) == [OTHER, await _url(hass, CURRENT)]


async def test_removing_the_last_station_in_yaml_mode_asks_to_remove_the_line(
    hass: HomeAssistant, hass_storage, enable_custom_integrations, syke, caplog
):
    entry = await _setup(hass, hass_storage, [OTHER, CURRENT], yaml=True)
    caplog.clear()
    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    current = await _url(hass, CURRENT)
    assert await _urls(hass) == [OTHER, current]
    assert _warnings(caplog) == [
        f"Dashboard resources are set in YAML, so the hydrology card can't remove itself. Remove {current} from them"
    ]


async def test_the_card_is_served(hass: HomeAssistant, hass_storage, enable_custom_integrations, syke, hass_client):
    await _setup(hass, hass_storage, [])
    response = await (await hass_client()).get(await _url(hass, CURRENT))
    assert response.status == 200
    assert "syke-hydrology-card" in await response.text()
