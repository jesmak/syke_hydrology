"""What the hydrology card draws, for one of a station's sensors.

A measurement's days for the past year and its long-term average for every calendar day, or the station's ice: the
year's measurements with their layers, the bearing limits and the freeze-up and break-up dates with their averages.
The averages come from the integration's own store, so the card doesn't depend on what the recorder has kept.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er

from .api import Quantity
from .averages import YEARS
from .const import (
    CONF_CAR,
    CONF_MAX_AGE,
    CONF_SNOWMOBILE,
    CONF_WALKING,
    DEFAULT_CAR,
    DEFAULT_MAX_AGE,
    DEFAULT_SNOWMOBILE,
    DEFAULT_WALKING,
    DOMAIN,
)
from .coordinator import SykeCoordinator
from .history import converted
from .measurements import CLEAR_ICE, SNOW_ICE, SNOW_ON_ICE, TOTAL, WEAK_ICE, bearing, ice_days, latest_day
from .sensor import BEARING_CLASS, DATES, MEASUREMENTS, WINDOW, SykeSensorDescription, average_key, native_unit

ICE_QUANTITIES = (Quantity.ICE, Quantity.ICE_EVENTS)
ICE_KEYS = {BEARING_CLASS.key, "ice_measurement_old"}


@callback
def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, websocket_card)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/card", vol.Required("entity_id"): cv.entity_id})
@callback
def websocket_card(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    registry = er.async_get(hass)
    entity = registry.async_get(msg["entity_id"])
    if entity is None or entity.platform != DOMAIN or entity.config_entry_id is None:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, f"{msg['entity_id']} is not a sensor of {DOMAIN}")
        return
    entry = hass.config_entries.async_get_entry(entity.config_entry_id)
    if entry is None or entry.state is not ConfigEntryState.LOADED:
        # Not refused for good: a station is loaded again after a failed setup or a reload, so the card tries again.
        connection.send_error(msg["id"], "not_loaded", f"The station of {msg['entity_id']} is not loaded")
        return
    coordinator: SykeCoordinator = entry.runtime_data
    key = entity.unique_id.removeprefix(f"{entry.unique_id}_").removesuffix("_average")
    if key in ICE_KEYS or any(d.key == key and d.quantity in ICE_QUANTITIES for d in (*MEASUREMENTS, *DATES)):
        connection.send_result(msg["id"], ice_data(coordinator))
        return
    description = next((d for d in MEASUREMENTS if d.key == key), None)
    if description is None:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_SUPPORTED, f"The card doesn't draw {msg['entity_id']}")
        return
    connection.send_result(msg["id"], measurement_data(hass, registry, coordinator, description))


def _years(coordinator: SykeCoordinator) -> str | None:
    year = coordinator.averages.year
    return f"{year - YEARS + 1}–{year}" if year else None


def measurement_data(
    hass: HomeAssistant, registry: er.EntityRegistry, coordinator: SykeCoordinator, description: SykeSensorDescription
) -> dict[str, Any]:
    """A measurement's days and its averages, in the unit its sensor is shown in."""
    key = description.key
    entry = coordinator.config_entry
    entity_id = registry.async_get_entity_id("sensor", DOMAIN, f"{entry.unique_id}_{key}")
    state = hass.states.get(entity_id) if entity_id else None
    native = native_unit(description, coordinator.data)
    shown = state.attributes.get("unit_of_measurement") if state else native
    return {
        "kind": "measurement",
        "measurement": key,
        "station": entry.title,
        "entity_id": entity_id,
        "average_entity_id": registry.async_get_entity_id("sensor", DOMAIN, f"{entry.unique_id}_{average_key(description)}"),
        "unit": shown,
        "window": description.window,
        "average_back": description.average_back,
        "years": _years(coordinator),
        "points": [
            [point.day.isoformat(), converted(point.value, native, shown)]
            for point in description.points(coordinator.data)
            if point.value is not None
        ],
        "average": {day: converted(value, native, shown) for day, value in coordinator.averages.series.get(key, {}).items()},
    }


def ice_data(coordinator: SykeCoordinator) -> dict[str, Any]:
    """The station's ice in centimetres, as its bearing limits are."""
    entry = coordinator.config_entry
    options = entry.options
    measurements = [
        {
            "day": day.isoformat(),
            "total": flags.get(TOTAL),
            "clear": flags.get(CLEAR_ICE),
            "snow_ice": flags.get(SNOW_ICE),
            "snow_on_ice": flags.get(SNOW_ON_ICE),
            "bearing": bearing(flags),
            "weak": WEAK_ICE in flags and flags.get(CLEAR_ICE) is None,
        }
        for day, flags in ice_days(coordinator.data.rows.get(Quantity.ICE, [])).items()
    ]
    events = coordinator.data.rows.get(Quantity.ICE_EVENTS, [])
    return {
        "kind": "ice",
        "station": entry.title,
        "measures_ice": Quantity.ICE in coordinator.quantities,
        "limits": {
            "walking": options.get(CONF_WALKING, DEFAULT_WALKING),
            "snowmobile": options.get(CONF_SNOWMOBILE, DEFAULT_SNOWMOBILE),
            "car": options.get(CONF_CAR, DEFAULT_CAR),
        },
        "max_age": options.get(CONF_MAX_AGE, DEFAULT_MAX_AGE),
        "window": WINDOW,
        "years": _years(coordinator),
        "measurements": measurements,
        "average": coordinator.averages.series.get("ice_bearing", {}),
        # The newest day of each event in the year kept, and its average day as days from its season's start.
        "events": {
            description.key: {
                "day": (day.isoformat() if (day := latest_day(events, description.flag)) else None),
                "average": coordinator.averages.events.get(description.key),
                "season_start": description.season_start,
            }
            for description in DATES
            if description.season_start is not None and Quantity.ICE_EVENTS in coordinator.quantities
        },
    }
