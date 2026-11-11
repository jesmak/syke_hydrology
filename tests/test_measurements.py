"""What a station's rows mean."""

from __future__ import annotations

from datetime import date

from custom_components.syke_hydrology.api import Level, Row
from custom_components.syke_hydrology.measurements import (
    CLEAR_ICE,
    SNOW_ICE,
    TOTAL,
    WEAK_ICE,
    Bearing,
    Point,
    bearing,
    bearing_class,
    bearings,
    current,
    ice,
    shown_days,
    water_level,
)


def test_bearing_is_the_clear_ice_and_half_of_the_snow_ice() -> None:
    assert bearing({CLEAR_ICE: 21, SNOW_ICE: 5, TOTAL: 26}) == 24, "a half rounds up"
    assert bearing({CLEAR_ICE: 20, SNOW_ICE: 5}) == 23, "a half rounds up, not to the even number"
    assert bearing({CLEAR_ICE: 15}) == 15, "no snow ice row counts as none"


def test_weak_ice_bears_nothing_and_a_measurement_without_clear_ice_is_unknown() -> None:
    assert bearing({WEAK_ICE: 0}) == 0
    assert bearing({TOTAL: 12}) is None


def test_bearing_classes_start_at_their_limits() -> None:
    limits = (10, 15, 20)
    assert bearing_class(9, *limits) == Bearing.DOES_NOT_BEAR
    assert bearing_class(10, *limits) == Bearing.WALKING
    assert bearing_class(15, *limits) == Bearing.SNOWMOBILE
    assert bearing_class(20, *limits) == Bearing.CAR


def test_water_level_is_metres_in_the_height_system_or_centimetres_without_one() -> None:
    rows = [Row(date(2027, 2, 9), 312.0, None)]
    assert water_level(rows, Level("N2000", 7500)) == [Point(date(2027, 2, 9), 78.12)]
    assert water_level(rows, None) == [Point(date(2027, 2, 9), 312.0)]


def test_weak_ice_makes_the_thicknesses_unknown_from_its_day() -> None:
    rows = [Row(date(2027, 3, 9), 25.0, CLEAR_ICE), Row(date(2027, 3, 9), 34.0, TOTAL), Row(date(2027, 3, 19), 0.0, WEAK_ICE)]
    assert ice(rows, TOTAL) == [Point(date(2027, 3, 9), 34.0), Point(date(2027, 3, 19), None)]
    assert bearings(rows) == [Point(date(2027, 3, 9), 25.0), Point(date(2027, 3, 19), 0.0)]


def test_a_point_is_current_for_its_window() -> None:
    points = [Point(date(2027, 1, 1), 5.0)]
    assert current(points, 30, date(2027, 1, 31)) == points[0]
    assert current(points, 30, date(2027, 2, 1)) is None
    assert current([], 30, date(2027, 1, 1)) is None


def test_each_value_is_shown_until_the_next_one_its_window_or_today() -> None:
    points = [Point(date(2027, 1, 1), 1.0), Point(date(2027, 1, 3), None), Point(date(2027, 1, 4), 4.0), Point(date(2027, 1, 20), 20.0)]
    days = shown_days(points, 2, date(2027, 1, 21))
    assert days == [
        (date(2027, 1, 1), 1.0),
        (date(2027, 1, 2), 1.0),
        # The 3rd has no value, so nothing is shown until the 4th.
        (date(2027, 1, 4), 4.0),
        (date(2027, 1, 5), 4.0),
        (date(2027, 1, 6), 4.0),
        # Older than its window from the 7th until the next measurement.
        (date(2027, 1, 20), 20.0),
        (date(2027, 1, 21), 20.0),
    ]
