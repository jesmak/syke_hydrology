"""A station's measurements as sensors."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorEntityDescription, SensorStateClass
from homeassistant.const import UnitOfLength, UnitOfPrecipitationDepth, UnitOfTemperature, UnitOfVolumeFlowRate
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from .api import Quantity
from .averages import SMOOTHING, YEARS, Averages, average_event, average_on, calendar_days, event_day, with_open_water
from .const import (
    CONF_CAR,
    CONF_SNOWMOBILE,
    CONF_WALKING,
    DEFAULT_CAR,
    DEFAULT_SNOWMOBILE,
    DEFAULT_WALKING,
    DOMAIN,
)
from .coordinator import HISTORY, SykeConfigEntry, SykeCoordinator
from .entity import SykeEntity
from .history import converted
from .measurements import (
    CLEAR_ICE,
    FIVE_DAYS,
    MONTH,
    OPEN_WATER_CLEAR,
    PERMANENTLY_FROZEN,
    SNOW_ICE,
    SNOW_ON_ICE,
    TOTAL,
    WHOLE_VIEW_CLEAR,
    WHOLE_VIEW_FROZEN,
    Bearing,
    Point,
    StationData,
    bearing_class,
    bearings,
    current,
    daily,
    ice,
    latest_day,
    shown_days,
    water_level,
)

# How many days a measurement is shown for. The daily quantities are a day or two behind, the areal ones come every
# five days or twice a month, the ice is measured about every ten days and the snow courses twice a month in their
# season. Older than this, the sensor is unavailable, so a season that ended doesn't draw a flat line through summer.
WINDOW = 30
SNOW_COURSE_WINDOW = 60
# A month's precipitation is given at its first day.
MONTH_WINDOW = 62


@dataclass(frozen=True, kw_only=True)
class SykeSensorDescription(SensorEntityDescription):
    quantity: Quantity
    points: Callable[[StationData], list[Point]]
    window: int = WINDOW
    # For the long-term average: how many days to each side a calendar day's average is taken from, and how many days
    # back the average of a sum over a period is looked for.
    smoothing: int = 0
    average_back: int = 0
    # Whether the days of open water around each winter's measurements count as zero in the average.
    open_water: bool = False


def native_unit(description: SykeSensorDescription, data: StationData) -> str | None:
    if description.key == "water_level":
        return UnitOfLength.METERS if data.level else UnitOfLength.CENTIMETERS
    return description.native_unit_of_measurement


MEASUREMENTS: tuple[SykeSensorDescription, ...] = (
    SykeSensorDescription(
        key="water_level",
        translation_key="water_level",
        quantity=Quantity.WATER_LEVEL,
        points=lambda data: water_level(data.rows.get(Quantity.WATER_LEVEL, []), data.level),
        device_class=SensorDeviceClass.DISTANCE,
        state_class=SensorStateClass.MEASUREMENT,
    ),
    SykeSensorDescription(
        key="discharge",
        translation_key="discharge",
        quantity=Quantity.DISCHARGE,
        points=lambda data: daily(data.rows.get(Quantity.DISCHARGE, [])),
        device_class=SensorDeviceClass.VOLUME_FLOW_RATE,
        native_unit_of_measurement=UnitOfVolumeFlowRate.CUBIC_METERS_PER_SECOND,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
    ),
    SykeSensorDescription(
        key="surface_temperature",
        translation_key="surface_temperature",
        quantity=Quantity.SURFACE_TEMPERATURE,
        points=lambda data: daily(data.rows.get(Quantity.SURFACE_TEMPERATURE, [])),
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
    ),
    SykeSensorDescription(
        key="precipitation_5_days",
        translation_key="precipitation_5_days",
        quantity=Quantity.AREAL_PRECIPITATION,
        points=lambda data: daily(data.rows.get(Quantity.AREAL_PRECIPITATION, []), FIVE_DAYS),
        device_class=SensorDeviceClass.PRECIPITATION,
        native_unit_of_measurement=UnitOfPrecipitationDepth.MILLIMETERS,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        average_back=5,
    ),
    SykeSensorDescription(
        key="precipitation_month",
        translation_key="precipitation_month",
        quantity=Quantity.AREAL_PRECIPITATION,
        points=lambda data: daily(data.rows.get(Quantity.AREAL_PRECIPITATION, []), MONTH),
        device_class=SensorDeviceClass.PRECIPITATION,
        native_unit_of_measurement=UnitOfPrecipitationDepth.MILLIMETERS,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        window=MONTH_WINDOW,
        average_back=30,
    ),
    SykeSensorDescription(
        key="areal_snow_water_equivalent",
        translation_key="areal_snow_water_equivalent",
        quantity=Quantity.AREAL_SNOW,
        points=lambda data: daily(data.rows.get(Quantity.AREAL_SNOW, [])),
        native_unit_of_measurement=UnitOfLength.MILLIMETERS,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
    ),
    SykeSensorDescription(
        key="snow_water_equivalent",
        translation_key="snow_water_equivalent",
        quantity=Quantity.SNOW_COURSE,
        points=lambda data: daily(data.rows.get(Quantity.SNOW_COURSE, [])),
        native_unit_of_measurement=UnitOfLength.MILLIMETERS,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        window=SNOW_COURSE_WINDOW,
        smoothing=SMOOTHING,
    ),
    SykeSensorDescription(
        key="ice_thickness",
        translation_key="ice_thickness",
        quantity=Quantity.ICE,
        points=lambda data: ice(data.rows.get(Quantity.ICE, []), TOTAL),
        device_class=SensorDeviceClass.DISTANCE,
        native_unit_of_measurement=UnitOfLength.CENTIMETERS,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        open_water=True,
        smoothing=SMOOTHING,
    ),
    SykeSensorDescription(
        key="clear_ice_thickness",
        translation_key="clear_ice_thickness",
        quantity=Quantity.ICE,
        points=lambda data: ice(data.rows.get(Quantity.ICE, []), CLEAR_ICE),
        device_class=SensorDeviceClass.DISTANCE,
        native_unit_of_measurement=UnitOfLength.CENTIMETERS,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        open_water=True,
        smoothing=SMOOTHING,
    ),
    SykeSensorDescription(
        key="snow_ice_thickness",
        translation_key="snow_ice_thickness",
        quantity=Quantity.ICE,
        points=lambda data: ice(data.rows.get(Quantity.ICE, []), SNOW_ICE),
        device_class=SensorDeviceClass.DISTANCE,
        native_unit_of_measurement=UnitOfLength.CENTIMETERS,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        open_water=True,
        smoothing=SMOOTHING,
    ),
    SykeSensorDescription(
        key="snow_on_ice",
        translation_key="snow_on_ice",
        quantity=Quantity.ICE,
        points=lambda data: ice(data.rows.get(Quantity.ICE, []), SNOW_ON_ICE),
        device_class=SensorDeviceClass.DISTANCE,
        native_unit_of_measurement=UnitOfLength.CENTIMETERS,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        open_water=True,
        smoothing=SMOOTHING,
    ),
    SykeSensorDescription(
        key="ice_bearing",
        translation_key="ice_bearing",
        quantity=Quantity.ICE,
        points=lambda data: bearings(data.rows.get(Quantity.ICE, [])),
        device_class=SensorDeviceClass.DISTANCE,
        native_unit_of_measurement=UnitOfLength.CENTIMETERS,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        open_water=True,
        smoothing=SMOOTHING,
    ),
)


@dataclass(frozen=True, kw_only=True)
class SykeDateDescription(SensorEntityDescription):
    quantity: Quantity
    # The flag (Lippu) of the rows the date is the newest of. None for every row.
    flag: int | None = None
    # The month the season of an event starts in, for its long-term average. None for a date that has no average.
    season_start: int | None = None

    def day(self, data: StationData) -> date | None:
        return latest_day(data.rows.get(self.quantity, []), self.flag)


# A freeze-up falls on either side of the new year, so its seasons start in July. A break-up's start in January.
FREEZE_SEASON = 7
BREAK_UP_SEASON = 1

DATES: tuple[SykeDateDescription, ...] = (
    SykeDateDescription(key="ice_measured", translation_key="ice_measured", quantity=Quantity.ICE),
    SykeDateDescription(
        key="freeze_up", translation_key="freeze_up", quantity=Quantity.ICE_EVENTS, flag=WHOLE_VIEW_FROZEN, season_start=FREEZE_SEASON
    ),
    SykeDateDescription(
        key="permanent_ice",
        translation_key="permanent_ice",
        quantity=Quantity.ICE_EVENTS,
        flag=PERMANENTLY_FROZEN,
        season_start=FREEZE_SEASON,
    ),
    SykeDateDescription(
        key="open_water_clear",
        translation_key="open_water_clear",
        quantity=Quantity.ICE_EVENTS,
        flag=OPEN_WATER_CLEAR,
        season_start=BREAK_UP_SEASON,
    ),
    SykeDateDescription(
        key="break_up", translation_key="break_up", quantity=Quantity.ICE_EVENTS, flag=WHOLE_VIEW_CLEAR, season_start=BREAK_UP_SEASON
    ),
)

BEARING_CLASS = SensorEntityDescription(
    key="ice_bearing_class",
    translation_key="ice_bearing_class",
    device_class=SensorDeviceClass.ENUM,
    options=[bearing.value for bearing in Bearing],
)


def average_key(description: SensorEntityDescription) -> str:
    return f"{description.key}_average"


def averages_of(data: StationData, quantities: set[Quantity], first: int, last: int) -> Averages:
    """The long-term averages of a station's sensors, from its rows of the years from the first to the last."""
    averages = Averages(year=last)
    for description in MEASUREMENTS:
        if description.quantity not in quantities:
            continue
        points = description.points(data)
        if description.open_water:
            points = with_open_water(points, first, last)
        if days := calendar_days(points, first, last, description.smoothing):
            averages.series[description.key] = days
    for event in DATES:
        if event.quantity not in quantities or event.season_start is None:
            continue
        days_of = [row.day for row in data.rows.get(event.quantity, []) if row.kind == event.flag]
        if (offset := average_event(days_of, first, last, event.season_start)) is not None:
            averages.events[event.key] = offset
    return averages


def entity_keys(quantities: set[Quantity]) -> set[str]:
    """The keys of the entities a station measuring the quantities has, in every platform."""
    keys = {description.key for description in (*MEASUREMENTS, *DATES) if description.quantity in quantities}
    keys |= {average_key(description) for description in MEASUREMENTS if description.quantity in quantities}
    keys |= {average_key(description) for description in DATES if description.quantity in quantities and description.season_start}
    if Quantity.ICE in quantities:
        keys |= {BEARING_CLASS.key, "ice_measurement_old"}
    return keys


async def async_setup_entry(hass: HomeAssistant, entry: SykeConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback) -> None:
    coordinator = entry.runtime_data
    quantities = coordinator.quantities
    entities: list[SensorEntity] = [MeasurementSensor(coordinator, d) for d in MEASUREMENTS if d.quantity in quantities]
    entities += [DateSensor(coordinator, d) for d in DATES if d.quantity in quantities]
    if Quantity.ICE in quantities:
        entities.append(BearingClassSensor(coordinator, BEARING_CLASS))
    # An average only for what has been measured for years enough to have one.
    entities += [AverageSensor(coordinator, d) for d in MEASUREMENTS if d.key in coordinator.averages.series]
    entities += [AverageDateSensor(coordinator, d) for d in DATES if d.key in coordinator.averages.events]
    async_add_entities(entities)


class MeasurementSensor(SykeEntity, SensorEntity):
    entity_description: SykeSensorDescription

    def _current(self) -> Point | None:
        return current(self.entity_description.points(self.coordinator.data), self.entity_description.window, dt_util.now().date())

    @property
    def available(self) -> bool:
        return super().available and self._current() is not None

    @property
    def native_value(self) -> float | None:
        point = self._current()
        return point.value if point else None

    @property
    def native_unit_of_measurement(self) -> str | None:
        return native_unit(self.entity_description, self.coordinator.data)

    @property
    def suggested_display_precision(self) -> int | None:
        if self.entity_description.key == "water_level":
            return 2 if self.coordinator.data.level else 0
        return self.entity_description.suggested_display_precision

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        point = self._current()
        attributes: dict[str, Any] = {"measured": point.day.isoformat() if point else None}
        if self.entity_description.key == "water_level":
            level = self.coordinator.data.level
            attributes["height_system"] = level.system if level else None
        return attributes


class AverageSensor(SykeEntity, SensorEntity):
    """What the sensor has measured on this calendar day on average."""

    def __init__(self, coordinator: SykeCoordinator, source: SykeSensorDescription) -> None:
        self.source = source
        super().__init__(
            coordinator,
            SensorEntityDescription(
                key=average_key(source),
                translation_key=average_key(source),
                device_class=source.device_class,
                state_class=SensorStateClass.MEASUREMENT,
            ),
        )

    def value_on(self, day: date) -> float | None:
        return average_on(self.coordinator.averages.series.get(self.source.key, {}), day, self.source.average_back)

    @property
    def available(self) -> bool:
        return super().available and self.native_value is not None

    @property
    def native_value(self) -> float | None:
        return self.value_on(dt_util.now().date())

    @property
    def native_unit_of_measurement(self) -> str | None:
        return native_unit(self.source, self.coordinator.data)

    @property
    def suggested_display_precision(self) -> int | None:
        if self.source.key == "water_level":
            return 2 if self.coordinator.data.level else 0
        return 1

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        year = self.coordinator.averages.year
        return {"years": f"{year - YEARS + 1}–{year}"}


class AverageDateSensor(SykeEntity, SensorEntity):
    """The day an event happens on average, in the season going on."""

    _attr_device_class = SensorDeviceClass.DATE

    def __init__(self, coordinator: SykeCoordinator, source: SykeDateDescription) -> None:
        self.source = source
        super().__init__(coordinator, SensorEntityDescription(key=average_key(source), translation_key=average_key(source)))

    @property
    def native_value(self) -> date | None:
        offset = self.coordinator.averages.events.get(self.source.key)
        if offset is None or self.source.season_start is None:
            return None
        return event_day(offset, dt_util.now().date(), self.source.season_start)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        year = self.coordinator.averages.year
        return {"years": f"{year - YEARS + 1}–{year}"}


class DateSensor(SykeEntity, SensorEntity):
    entity_description: SykeDateDescription
    _attr_device_class = SensorDeviceClass.DATE

    @property
    def native_value(self) -> date | None:
        return self.entity_description.day(self.coordinator.data)


class BearingClassSensor(SykeEntity, SensorEntity):
    @property
    def available(self) -> bool:
        return super().available and self._bearing() is not None

    def _bearing(self) -> float | None:
        point = current(bearings(self.coordinator.data.rows.get(Quantity.ICE, [])), WINDOW, dt_util.now().date())
        return point.value if point else None

    @property
    def native_value(self) -> str | None:
        thickness = self._bearing()
        if thickness is None:
            return None
        options = self.coordinator.config_entry.options
        return bearing_class(
            thickness,
            options.get(CONF_WALKING, DEFAULT_WALKING),
            options.get(CONF_SNOWMOBILE, DEFAULT_SNOWMOBILE),
            options.get(CONF_CAR, DEFAULT_CAR),
        ).value


def history_of(hass: HomeAssistant, coordinator: SykeCoordinator) -> list[tuple[str, str | None, list[tuple[date, float]]]]:
    """The days of each measurement sensor's values, and of its average, in the unit its statistics are kept in."""
    registry = er.async_get(hass)
    today = dt_util.now().date()
    year = [today - timedelta(days=back) for back in range(HISTORY.days, -1, -1)]
    sensors = []
    for description in MEASUREMENTS:
        if description.quantity not in coordinator.quantities:
            continue
        native = native_unit(description, coordinator.data)
        averages = coordinator.averages.series.get(description.key, {})
        for key, days in (
            (description.key, shown_days(description.points(coordinator.data), description.window, today)),
            (
                average_key(description),
                [(day, value) for day in year if (value := average_on(averages, day, description.average_back)) is not None],
            ),
        ):
            entity_id = registry.async_get_entity_id("sensor", DOMAIN, f"{coordinator.config_entry.unique_id}_{key}")
            state = hass.states.get(entity_id) if entity_id else None
            if state is None:
                continue
            shown = state.attributes.get("unit_of_measurement")
            sensors.append((entity_id, shown, [(day, converted(value, native, shown)) for day, value in days]))
    return sensors
