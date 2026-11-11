"""Each day's measurement in the statistics of its sensor."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from freezegun.api import FrozenDateTimeFactory
from homeassistant.components.recorder import get_instance
from homeassistant.components.recorder.models import StatisticData, StatisticMeanType, StatisticMetaData
from homeassistant.components.recorder.statistics import async_import_statistics, statistics_during_period
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.components.recorder.common import async_wait_recording_done

from .conftest import TODAY, station_entry

LEVEL = "sensor.esimerkkijarvi_laituri_water_level"
ICE = "sensor.esimerkkijarvi_laituri_ice_thickness"


async def at_noon(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    await hass.config.async_set_time_zone("Europe/Helsinki")
    freezer.move_to(midnight(TODAY) + timedelta(hours=12))


def midnight(day: date) -> datetime:
    return datetime.combine(day, datetime.min.time(), tzinfo=dt_util.get_time_zone("Europe/Helsinki"))


async def stored(hass: HomeAssistant, statistic_id: str) -> list[tuple[datetime, float]]:
    """The start and mean of each row of a sensor's statistics, once the past has been written in the background."""
    await hass.async_block_till_done(wait_background_tasks=True)
    # The recorder's own wait returns while it still runs the task it took off its queue.
    await async_wait_recording_done(hass)
    found = await get_instance(hass).async_add_executor_job(
        statistics_during_period, hass, datetime(2000, 1, 1, tzinfo=UTC), None, {statistic_id}, "hour", None, {"mean"}
    )
    return [(dt_util.utc_from_timestamp(row["start"]), row["mean"]) for row in found.get(statistic_id, [])]


async def set_up(hass: HomeAssistant) -> None:
    entry = station_entry(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()


async def test_a_new_sensor_gets_each_day_it_would_have_shown(
    recorder_mock, enable_custom_integrations, hass: HomeAssistant, syke, freezer: FrozenDateTimeFactory
) -> None:
    await at_noon(hass, freezer)
    await set_up(hass)
    assert await stored(hass, LEVEL) == [
        (midnight(date(2027, 2, 8)), 78.1),
        (midnight(date(2027, 2, 9)), 78.12),
        # Today shows yesterday's level until today's is published.
        (midnight(TODAY), 78.12),
    ]
    ice = await stored(hass, ICE)
    assert ice[0] == (midnight(date(2027, 1, 20)), 24.0)
    assert ice[11] == (midnight(date(2027, 1, 31)), 24.0), "shown until the next measurement"
    assert ice[12] == (midnight(date(2027, 2, 1)), 29.0)
    assert len(ice) == 22, "every day from the first measurement to today"


async def test_hours_kept_while_the_day_before_was_shown_are_given_the_days_own_value(
    recorder_mock, enable_custom_integrations, hass: HomeAssistant, syke, freezer: FrozenDateTimeFactory
) -> None:
    await at_noon(hass, freezer)
    # The recorder kept the 8th's level through the 9th, as the 9th's was published only today.
    hours = [midnight(date(2027, 2, 9)) + timedelta(hours=hour) for hour in range(24)]
    metadata = StatisticMetaData(
        source="recorder",
        statistic_id=LEVEL,
        name=None,
        unit_of_measurement="m",
        unit_class="distance",
        mean_type=StatisticMeanType.ARITHMETIC,
        has_sum=False,
    )
    async_import_statistics(hass, metadata, [StatisticData(start=hour, mean=78.1, min=78.1, max=78.1) for hour in hours])
    await async_wait_recording_done(hass)

    await set_up(hass)
    rows = await stored(hass, LEVEL)
    assert [mean for start, mean in rows if start.astimezone(hours[0].tzinfo).date() == date(2027, 2, 9)] == [78.12] * 24
    assert rows[0] == (midnight(date(2027, 2, 8)), 78.1), "an empty day still gets one row"


async def test_a_sensor_renamed_onto_older_statistics_corrects_them_after_a_reload(
    recorder_mock, enable_custom_integrations, hass: HomeAssistant, syke, freezer: FrozenDateTimeFactory
) -> None:
    await at_noon(hass, freezer)
    # The statistics of the sensor the integration replaces, which kept the measurement before through the 1st.
    old = "sensor.vanha_jaa"
    hours = [midnight(date(2027, 2, 1)) + timedelta(hours=hour) for hour in range(24)]
    metadata = StatisticMetaData(
        source="recorder",
        statistic_id=old,
        name=None,
        unit_of_measurement="cm",
        unit_class="distance",
        mean_type=StatisticMeanType.ARITHMETIC,
        has_sum=False,
    )
    async_import_statistics(hass, metadata, [StatisticData(start=hour, mean=24.0, min=24.0, max=24.0) for hour in hours])
    await async_wait_recording_done(hass)

    entry = station_entry(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    await stored(hass, ICE)
    # The recorder doesn't rename statistics onto ones in use, so the old ones are left for the integration to correct.
    er.async_get(hass).async_update_entity(ICE, new_entity_id=old)
    await hass.async_block_till_done()
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    rows = await stored(hass, old)
    assert [mean for start, mean in rows if start in hours] == [29.0] * 24
    assert rows[0] == (midnight(date(2027, 1, 20)), 24.0), "the days before get a row each"


async def test_nothing_is_written_into_hours_the_recorder_has_not_compiled(
    recorder_mock, enable_custom_integrations, hass: HomeAssistant, syke, freezer: FrozenDateTimeFactory
) -> None:
    await hass.config.async_set_time_zone("Europe/Helsinki")
    # An hour into the day: a row at its midnight would collide with the recorder compiling that hour.
    freezer.move_to(midnight(TODAY) + timedelta(hours=1))
    await set_up(hass)
    assert await stored(hass, LEVEL) == [(midnight(date(2027, 2, 8)), 78.1), (midnight(date(2027, 2, 9)), 78.12)]
