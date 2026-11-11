"""The station's device, shared by the entities of the measurements added at it."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity import EntityDescription
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import ATTRIBUTION, DOMAIN
from .coordinator import SykeCoordinator


class SykeEntity(CoordinatorEntity[SykeCoordinator]):
    _attr_has_entity_name = True
    _attr_attribution = ATTRIBUTION

    def __init__(self, coordinator: SykeCoordinator, description: EntityDescription) -> None:
        super().__init__(coordinator)
        self.entity_description = description
        entry = coordinator.config_entry
        self._attr_unique_id = f"{entry.unique_id}_{description.key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, str(entry.unique_id))},
            name=entry.title,
            manufacturer="Syke",
            model=coordinator.places[0].municipality or None,
            entry_type=DeviceEntryType.SERVICE,
        )
