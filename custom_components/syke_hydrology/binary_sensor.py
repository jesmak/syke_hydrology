"""Whether the station's last ice measurement is too old to go by."""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorEntity, BinarySensorEntityDescription
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from .api import Quantity
from .const import CONF_MAX_AGE, DEFAULT_MAX_AGE
from .coordinator import SykeConfigEntry
from .entity import SykeEntity
from .measurements import latest_day

OLD_ICE = BinarySensorEntityDescription(key="ice_measurement_old", translation_key="ice_measurement_old")


async def async_setup_entry(hass: HomeAssistant, entry: SykeConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback) -> None:
    if Quantity.ICE in entry.runtime_data.quantities:
        async_add_entities([OldIceSensor(entry.runtime_data, OLD_ICE)])


class OldIceSensor(SykeEntity, BinarySensorEntity):
    @property
    def available(self) -> bool:
        return super().available and latest_day(self.coordinator.data.rows.get(Quantity.ICE, [])) is not None

    @property
    def is_on(self) -> bool | None:
        day = latest_day(self.coordinator.data.rows.get(Quantity.ICE, []))
        if day is None:
            return None
        return (dt_util.now().date() - day).days > self.coordinator.config_entry.options.get(CONF_MAX_AGE, DEFAULT_MAX_AGE)
