"""A station's long-term averages as sensors: read once, kept over restarts and read again when the year changes."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from unittest.mock import patch

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from custom_components.syke_hydrology.api import Row, SykeError
from custom_components.syke_hydrology.const import CONF_PLACES

from .conftest import ROWS, TODAY, station_entry
from .test_history import midnight, stored

PREFIX = "sensor.esimerkkijarvi_laituri"


def noon(day: date) -> datetime:
    return datetime.combine(day, datetime.min.time(), tzinfo=dt_util.get_time_zone("Europe/Helsinki")) + timedelta(hours=12)


@pytest.fixture
async def history(hass: HomeAssistant, freezer: FrozenDateTimeFactory, syke) -> None:
    """Thirty years of the station: a water level rising a centimetre a year, an ice measurement a winter and a freeze-up."""
    await hass.config.async_set_time_zone("Europe/Helsinki")
    freezer.move_to(noon(TODAY))
    level, ice, events = [], [], []
    for year in range(1997, 2027):
        level += [Row(date(year, 2, day), 300.0 + year - 2000, None) for day in (9, 10)]
        # The measurement falls on a different day of the week around the 10th of February each year.
        ice += [Row(date(year, 2, 7 + year % 7), 30.0 + year % 3, 41)]
        events += [Row(date(year, 12, 10 + year % 5), None, 29)]
    syke.rows = {**ROWS, 9101: level + ROWS[9101], 9102: ice + ROWS[9102], 9104: events + ROWS[9104]}


async def set_up(hass: HomeAssistant):
    entry = station_entry(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def reads(syke) -> int:
    """How many times the thirty years were read."""
    return sum(1 for call in syke.async_rows.call_args_list if call.args[1] == date(1997, 1, 1))


async def test_a_sensor_has_the_average_of_its_calendar_day(hass: HomeAssistant, enable_custom_integrations, syke, history) -> None:
    await set_up(hass)
    level = hass.states.get(f"{PREFIX}_water_level_long_term_average")
    # 311.5 cm on average over 1997–2026, at 75.00 m.
    assert level.state == "78.115"
    assert level.attributes["unit_of_measurement"] == "m"
    assert level.attributes["years"] == "1997–2026"
    assert hass.states.get(f"{PREFIX}_ice_thickness_long_term_average").state == "31.0", "from the days around the 10th"
    assert hass.states.get(f"{PREFIX}_freeze_up_long_term_average").state == "2026-12-12"


async def test_what_has_too_few_years_has_no_average_sensor(hass: HomeAssistant, enable_custom_integrations, syke, history) -> None:
    await set_up(hass)
    registry = er.async_get(hass)
    assert registry.async_get(f"{PREFIX}_surface_water_temperature_long_term_average") is None
    assert registry.async_get(f"{PREFIX}_break_up_long_term_average") is None


async def test_the_averages_are_kept_over_a_restart(hass: HomeAssistant, enable_custom_integrations, syke, history) -> None:
    entry = await set_up(hass)
    assert reads(syke) == 4, "each of the four places once"
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert reads(syke) == 4
    assert hass.states.get(f"{PREFIX}_water_level_long_term_average").state == "78.115"


async def test_the_averages_are_read_again_when_the_year_changes(
    hass: HomeAssistant, enable_custom_integrations, syke, history, freezer: FrozenDateTimeFactory
) -> None:
    entry = await set_up(hass)
    freezer.move_to(noon(date(2028, 2, 10)))
    syke.rows[9101] = [*syke.rows[9101], Row(date(2028, 2, 9), 400.0, None)]
    await entry.runtime_data.async_refresh()
    await hass.async_block_till_done()
    level = hass.states.get(f"{PREFIX}_water_level_long_term_average")
    assert level.attributes["years"] == "1998–2027"
    # 1997's 297 cm is left out, and 2027 has no measurement on the 10th: 312 cm on average over 1998–2026.
    assert level.state == "78.12"


async def test_averages_that_cannot_be_read_again_stay_until_they_can(
    hass: HomeAssistant, enable_custom_integrations, syke, history, freezer: FrozenDateTimeFactory
) -> None:
    entry = await set_up(hass)
    freezer.move_to(noon(date(2028, 2, 10)))
    answer = syke.async_rows.side_effect

    async def down(place, since):
        if since == date(1998, 1, 1):
            raise SykeError("down")
        return await answer(place, since)

    syke.async_rows.side_effect = down
    await entry.runtime_data.async_refresh()
    await hass.async_block_till_done()
    assert hass.states.get(f"{PREFIX}_water_level_long_term_average").attributes["years"] == "1997–2026"

    syke.async_rows.side_effect = answer
    await entry.runtime_data.async_refresh()
    await hass.async_block_till_done()
    assert hass.states.get(f"{PREFIX}_water_level_long_term_average").attributes["years"] == "1998–2027"


async def test_the_average_gets_its_past_year_too(recorder_mock, enable_custom_integrations, hass: HomeAssistant, syke, history) -> None:
    await set_up(hass)
    rows = await stored(hass, f"{PREFIX}_water_level_long_term_average")
    # Only the 9th and the 10th of February have an average, and today is the 10th.
    days = [date(2026, 2, 9), date(2026, 2, 10), date(2027, 2, 9), TODAY]
    assert rows == [(midnight(day), 78.115) for day in days]


async def test_the_averages_are_read_again_when_the_measurements_change(
    hass: HomeAssistant, enable_custom_integrations, syke, history
) -> None:
    entry = await set_up(hass)
    assert reads(syke) == 4
    hass.config_entries.async_update_entry(entry, data={**entry.data, CONF_PLACES: entry.data[CONF_PLACES][:2]})
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert reads(syke) == 6, "the two places left"


async def test_the_averages_go_with_the_station(hass: HomeAssistant, enable_custom_integrations, syke, history, hass_storage) -> None:
    entry = await set_up(hass)
    key = f"syke_hydrology.averages.{entry.entry_id}"
    await hass.async_block_till_done()
    assert await Store(hass, 1, key).async_load() is not None
    assert await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert await Store(hass, 1, key).async_load() is None


async def test_averages_computed_another_way_are_read_again(hass: HomeAssistant, enable_custom_integrations, syke, history) -> None:
    entry = await set_up(hass)
    with patch("custom_components.syke_hydrology.long_term.RULES", 99):
        assert await hass.config_entries.async_reload(entry.entry_id)
        await hass.async_block_till_done()
    assert reads(syke) == 8
