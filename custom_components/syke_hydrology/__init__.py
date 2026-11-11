"""SYKE hydrology: water levels, discharge, water temperature, ice and snow from the Finnish Environment Institute.

Each config entry is one station with the measurements added at it, read by one coordinator. A station is the places
Syke measures under one name in one municipality, each place one quantity.
"""

from __future__ import annotations

import logging

from homeassistant.const import Platform
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_call_later

from . import long_term
from .api import SykeError
from .coordinator import SykeConfigEntry, SykeCoordinator
from .history import WRITE_AGAIN_AFTER, async_write_history
from .sensor import entity_keys, history_of

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.BINARY_SENSOR, Platform.SENSOR]


async def async_setup_entry(hass: HomeAssistant, entry: SykeConfigEntry) -> bool:
    coordinator = SykeCoordinator(hass, entry)
    await coordinator.async_config_entry_first_refresh()
    try:
        await long_term.async_load(hass, coordinator)
    except SykeError as err:
        raise ConfigEntryNotReady(f"Could not read the long-term averages: {err}") from err
    entry.runtime_data = coordinator

    # The sensors of a measurement that was removed from the station go with it.
    registry = er.async_get(hass)
    kept = {f"{entry.unique_id}_{key}" for key in entity_keys(coordinator.quantities)}
    for entity in er.async_entries_for_config_entry(registry, entry.entry_id):
        if entity.unique_id not in kept:
            registry.async_remove(entity.entity_id)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    again: CALLBACK_TYPE | None = None

    async def write(*_: object) -> None:
        await async_write_history(hass, history_of(hass, coordinator))

    reading = False

    async def new_year() -> None:
        nonlocal reading
        try:
            await long_term.async_read(hass, coordinator)
        except SykeError as err:
            _LOGGER.warning("Could not read the long-term averages of %s, trying again in an hour: %s", entry.title, err)
            return
        finally:
            reading = False
        coordinator.async_update_listeners()
        await write()

    @callback
    def changed() -> None:
        nonlocal again, reading
        if coordinator.last_update_success and not reading and not long_term.current(coordinator):
            # The year changed, so the averages are of the thirty years before the last one.
            reading = True
            entry.async_create_task(hass, new_year())
        if not coordinator.changed or not coordinator.last_update_success:
            return
        coordinator.changed = False
        entry.async_create_task(hass, write())
        if again is not None:
            again()
        again = async_call_later(hass, WRITE_AGAIN_AFTER, write)

    entry.async_on_unload(coordinator.async_add_listener(changed))
    entry.async_on_unload(lambda: again() if again else None)
    # The sensors have their states once the platforms are set up, and the first refresh changed everything.
    changed()
    return True


async def async_remove_entry(hass: HomeAssistant, entry: SykeConfigEntry) -> None:
    await long_term.async_remove(hass, entry)


async def async_unload_entry(hass: HomeAssistant, entry: SykeConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
