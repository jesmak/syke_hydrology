"""Config flow: what to follow, then the station measuring it, nearest first. Each measurement is added on its own.

The options of a station are the measurements kept at it and, where it measures ice, the ice bearing limits.
"""

from __future__ import annotations

from collections import Counter
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlowWithReload
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.selector import (
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)
from homeassistant.util.location import distance

from .api import Place, Quantity, SykeClient, SykeError
from .const import (
    CONF_CAR,
    CONF_MAX_AGE,
    CONF_MEASUREMENTS,
    CONF_PLACES,
    CONF_QUANTITY,
    CONF_SNOWMOBILE,
    CONF_STATION,
    CONF_WALKING,
    DEFAULT_CAR,
    DEFAULT_MAX_AGE,
    DEFAULT_SNOWMOBILE,
    DEFAULT_WALKING,
    DOMAIN,
)


def distance_km(hass: HomeAssistant, place: Place) -> float | None:
    """How far the place is from Home Assistant's home, or None when Syke's coordinates couldn't be read."""
    if place.latitude is None or place.longitude is None:
        return None
    return distance(hass.config.latitude, hass.config.longitude, place.latitude, place.longitude) / 1000


def label(place: Place, shared: bool, km: float | None) -> str:
    """The place's name and municipality, and its distance, as the list shows it."""
    name = f"{place.name}, {place.municipality}" if place.municipality else place.name
    if shared:
        # Syke's own id tells apart the places of one quantity that share a name, such as two gauges at a dam.
        name = f"{name} ({place.id})"
    return name if km is None else f"{name} · {round(km)} km"


class SykeHydrologyConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    def __init__(self) -> None:
        self._places: list[Place] = []
        self._quantity: Quantity | None = None

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        try:
            self._places = await SykeClient(async_get_clientsession(self.hass)).async_places()
        except SykeError:
            return self.async_abort(reason="cannot_connect")
        # A menu, as its choices can have a description each, which the options of a list can't.
        return self.async_show_menu(step_id="user", menu_options=[quantity.name.lower() for quantity in Quantity])

    async def async_step_place(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        places = [place for place in self._places if place.quantity == self._quantity]
        distances = {place.id: distance_km(self.hass, place) for place in places}
        named = Counter((place.name, place.municipality) for place in places)
        labels = {place.id: label(place, named[place.name, place.municipality] > 1, distances[place.id]) for place in places}
        errors: dict[str, str] = {}
        if user_input is not None:
            # The list takes typed text too, so a place is only one of its own.
            place = next((place for place in places if labels[place.id] == user_input[CONF_STATION]), None)
            if place is None:
                errors[CONF_STATION] = "unknown_station"
            else:
                return await self._async_add(place)

        # Nearest first, the places whose distance isn't known last.
        places.sort(key=lambda place: (distances[place.id] is None, distances[place.id] or 0.0, place.name))
        # A custom value makes the frontend show a list that can be searched, which a thousand water levels need. With
        # it the field shows the chosen value and not its label, so the value is the label.
        options = [labels[place.id] for place in places]
        return self.async_show_form(
            step_id="place",
            data_schema=vol.Schema(
                {vol.Required(CONF_STATION): SelectSelector(SelectSelectorConfig(options=options, custom_value=True, sort=False))}
            ),
            errors=errors,
        )

    async def _async_add(self, place: Place) -> ConfigFlowResult:
        """Adds the place to its station's entry, or makes the entry when the station isn't followed yet."""
        added = {"id": place.id, "quantity": int(place.quantity), "name": place.name, "municipality": place.municipality}
        station: ConfigEntry | None = None
        for entry in self._async_current_entries():
            places = entry.data[CONF_PLACES]
            if any(other["id"] == place.id for other in places):
                return self.async_abort(reason="already_configured")
            # A station has each quantity once. A second place of one, such as another gauge at a dam, gets an entry of its own.
            if (places[0]["name"], places[0]["municipality"]) == (place.name, place.municipality) and not any(
                other["quantity"] == place.quantity for other in places
            ):
                station = entry
        if station is not None:
            self.hass.config_entries.async_update_entry(station, data={**station.data, CONF_PLACES: [*station.data[CONF_PLACES], added]})
            self.hass.config_entries.async_schedule_reload(station.entry_id)
            return self.async_abort(reason="measurement_added", description_placeholders={"station": station.title})
        await self.async_set_unique_id(str(place.id))
        self._abort_if_unique_id_configured()
        twin = any(
            (entry.data[CONF_PLACES][0]["name"], entry.data[CONF_PLACES][0]["municipality"]) == (place.name, place.municipality)
            for entry in self._async_current_entries()
        )
        return self.async_create_entry(title=f"{place.name} ({place.id})" if twin else place.name, data={CONF_PLACES: [added]})

    @staticmethod
    def _quantity_step(quantity: Quantity) -> Any:
        async def step(self: SykeHydrologyConfigFlow, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
            self._quantity = quantity
            return await self.async_step_place()

        return step

    @classmethod
    @callback
    def async_supports_options_flow(cls, config_entry: ConfigEntry) -> bool:
        places = config_entry.data[CONF_PLACES]
        return len(places) > 1 or places[0]["quantity"] == Quantity.ICE

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> StationOptionsFlow:
        return StationOptionsFlow()


# The menu's choice is the name of the step it goes to, so each quantity has a step that goes on to its stations.
for _quantity in Quantity:
    setattr(SykeHydrologyConfigFlow, f"async_step_{_quantity.name.lower()}", SykeHydrologyConfigFlow._quantity_step(_quantity))


def centimetres() -> NumberSelector:
    return NumberSelector(NumberSelectorConfig(min=1, max=100, step=1, unit_of_measurement="cm", mode=NumberSelectorMode.BOX))


class StationOptionsFlow(OptionsFlowWithReload):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        places = self.config_entry.data[CONF_PLACES]
        if not any(place["quantity"] == Quantity.ICE for place in places):
            return await self.async_step_measurements()
        if len(places) == 1:
            return await self.async_step_limits()
        return self.async_show_menu(step_id="init", menu_options=["limits", "measurements"])

    async def async_step_measurements(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """The measurements kept at the station. One left out is removed with its sensors."""
        entry = self.config_entry
        names = {Quantity(place["quantity"]).name.lower(): place for place in entry.data[CONF_PLACES]}
        errors: dict[str, str] = {}
        if user_input is not None:
            kept = [place for name, place in names.items() if name in user_input[CONF_MEASUREMENTS]]
            if not kept:
                errors["base"] = "keep_one"
            else:
                if len(kept) < len(names):
                    self.hass.config_entries.async_update_entry(entry, data={**entry.data, CONF_PLACES: kept})
                    self.hass.config_entries.async_schedule_reload(entry.entry_id)
                return self.async_create_entry(data=dict(entry.options))
        schema = vol.Schema(
            {
                vol.Required(CONF_MEASUREMENTS, default=list(names)): SelectSelector(
                    SelectSelectorConfig(options=list(names), multiple=True, translation_key=CONF_QUANTITY, mode=SelectSelectorMode.LIST)
                )
            }
        )
        return self.async_show_form(step_id="measurements", data_schema=schema, errors=errors)

    async def async_step_limits(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            if not user_input[CONF_WALKING] <= user_input[CONF_SNOWMOBILE] <= user_input[CONF_CAR]:
                errors["base"] = "limits_order"
            else:
                return self.async_create_entry(data={key: int(value) for key, value in user_input.items()})
        options = self.config_entry.options
        schema = vol.Schema(
            {
                vol.Required(CONF_WALKING, default=options.get(CONF_WALKING, DEFAULT_WALKING)): centimetres(),
                vol.Required(CONF_SNOWMOBILE, default=options.get(CONF_SNOWMOBILE, DEFAULT_SNOWMOBILE)): centimetres(),
                vol.Required(CONF_CAR, default=options.get(CONF_CAR, DEFAULT_CAR)): centimetres(),
                vol.Required(CONF_MAX_AGE, default=options.get(CONF_MAX_AGE, DEFAULT_MAX_AGE)): NumberSelector(
                    NumberSelectorConfig(min=1, max=60, step=1, unit_of_measurement="d", mode=NumberSelectorMode.BOX)
                ),
            }
        )
        return self.async_show_form(step_id="limits", data_schema=self.add_suggested_values_to_schema(schema, user_input), errors=errors)
