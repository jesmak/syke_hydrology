"""Long-term averages by calendar day, and the average day of a yearly event."""

from __future__ import annotations

from datetime import date

from custom_components.syke_hydrology.averages import average_event, average_on, calendar_days, event_day, with_open_water, years
from custom_components.syke_hydrology.measurements import Point


def test_the_years_are_the_thirty_full_ones_before_this() -> None:
    assert years(date(2027, 2, 10)) == (1997, 2026)


def test_a_calendar_day_is_averaged_over_its_years() -> None:
    points = [Point(date(year, 3, 1), float(year - 2000)) for year in range(2001, 2006)]
    assert calendar_days(points, 1997, 2026) == {"03-01": 3.0}


def test_years_outside_and_days_without_a_value_are_left_out() -> None:
    points = [Point(date(year, 3, 1), 10.0) for year in range(2001, 2006)]
    points += [Point(date(1990, 3, 1), 1000.0), Point(date(2027, 3, 1), 1000.0), Point(date(2010, 3, 1), None)]
    assert calendar_days(points, 1997, 2026) == {"03-01": 10.0}


def test_a_day_measured_in_too_few_years_has_no_average() -> None:
    points = [Point(date(year, 3, 1), 10.0) for year in range(2001, 2005)]
    assert calendar_days(points, 1997, 2026) == {}


def test_the_leap_day_has_an_average_of_its_own() -> None:
    points = [Point(date(year, 2, 29), 2.0) for year in range(2000, 2024, 4)]
    points += [Point(date(year, 2, 28), 8.0) for year in range(2000, 2024)]
    assert calendar_days(points, 1997, 2026) == {"02-28": 8.0, "02-29": 2.0}


def test_sparse_measurements_are_averaged_from_the_days_around() -> None:
    # One measurement a year, each on a different day of the same week of January.
    points = [Point(date(2001 + index, 1, 10 + index), 20.0 + index) for index in range(5)]
    assert calendar_days(points, 1997, 2026) == {}
    smoothed = calendar_days(points, 1997, 2026, smoothing=5)
    assert smoothed["01-12"] == 22.0
    assert "01-08" not in smoothed, "four of the years are within five days of the 8th"
    assert list(smoothed) == ["01-09", "01-10", "01-11", "01-12", "01-13", "01-14", "01-15"]


def test_smoothing_goes_over_the_new_year() -> None:
    points = [Point(date(2001 + index, 12, 30), 10.0) for index in range(5)]
    assert calendar_days(points, 1997, 2026, smoothing=5)["01-03"] == 10.0


def test_the_average_of_a_sum_is_that_of_its_periods_first_day() -> None:
    averages = {"02-01": 40.0, "02-06": 12.0}
    assert average_on(averages, date(2027, 2, 6)) == 12.0
    assert average_on(averages, date(2027, 2, 10)) is None
    assert average_on(averages, date(2027, 2, 10), back=5) == 12.0
    assert average_on(averages, date(2027, 2, 12), back=5) is None
    assert average_on(averages, date(2027, 2, 12), back=30) == 12.0


def test_a_freeze_up_is_averaged_over_the_new_year() -> None:
    # 20 December, 30 December, 9 January, 30 December and 20 December: on average the 28th.
    days = [date(2001, 12, 20), date(2002, 12, 30), date(2004, 1, 9), date(2004, 12, 30), date(2005, 12, 20)]
    offset = average_event(days, 1997, 2026, start_month=7)
    assert offset is not None
    assert event_day(offset, date(2027, 2, 10), start_month=7) == date(2026, 12, 28)
    assert event_day(offset, date(2027, 8, 1), start_month=7) == date(2027, 12, 28)


def test_a_seasons_later_event_counts_and_few_seasons_have_no_average() -> None:
    days = [date(year, 4, 20) for year in range(2001, 2006)]
    assert average_event(days[:4], 1997, 2026, start_month=1) is None
    again = [*days, date(2005, 4, 30)]
    offset = average_event(again, 1997, 2026, start_month=1)
    assert offset is not None
    assert event_day(offset, date(2027, 2, 10), start_month=1) == date(2027, 4, 22)


def test_each_year_weighs_the_same_in_a_smoothed_average() -> None:
    points = [Point(date(2001 + index, 1, 10), 10.0) for index in range(4)]
    # The fifth year was measured three times around the day.
    points += [Point(date(2005, 1, day), 20.0) for day in (8, 10, 12)]
    assert calendar_days(points, 1997, 2026, smoothing=5)["01-10"] == 12.0


def test_a_winter_is_open_water_before_its_first_measurement_and_after_its_last() -> None:
    points = [Point(date(2001, 12, 20), 12.0), Point(date(2002, 3, 30), 40.0)]
    zeros = [point.day for point in with_open_water(points, 1997, 2026) if point.value == 0]
    assert zeros[0] == date(2001, 7, 1)
    assert date(2001, 12, 10) not in zeros, "ten days before the first measurement"
    assert date(2001, 12, 9) in zeros
    assert date(2002, 4, 28) not in zeros, "thirty days after the last"
    assert date(2002, 4, 29) in zeros
    assert zeros[-1] == date(2002, 6, 30)


def test_a_measured_zero_is_open_water_from_that_day() -> None:
    points = [Point(date(2001, 12, 20), 0.0), Point(date(2002, 1, 10), 15.0), Point(date(2002, 4, 20), 0.0)]
    zeros = [point.day for point in with_open_water(points, 1997, 2026) if point.value == 0]
    assert date(2001, 12, 19) in zeros
    assert date(2002, 4, 21) in zeros


def test_the_winters_cut_by_the_years_are_open_water_only_where_known() -> None:
    # The winter of 1996 is known from January 1997 on, and that of 2026 until December.
    points = [Point(date(1997, 2, 10), 30.0), Point(date(2026, 12, 20), 12.0), Point(date(1990, 1, 10), 20.0)]
    zeros = [point.day for point in with_open_water(points, 1997, 2026) if point.value == 0]
    assert min(zeros) == date(1997, 3, 12), "nothing before the first of the years"
    assert max(zeros) == date(2026, 12, 9), "nothing after the last measurement of a winter still going on"
    assert date(1997, 7, 1) not in zeros, "a winter with no measurement is not known"


def test_an_average_rises_from_open_water() -> None:
    # Ice from the 20th of December in one winter of five, and from the 10th of January in the others.
    points = [Point(date(2001, 12, 20), 10.0), Point(date(2002, 1, 10), 20.0)]
    for winter in range(2002, 2006):
        points += [Point(date(winter + 1, 1, 10), 20.0)]
    averages = calendar_days(with_open_water(points, 1997, 2026), 1997, 2026, smoothing=5)
    assert averages["11-01"] == 0.0
    assert averages["12-20"] == 2.0, "ten centimetres in one winter and open water in four"
    assert averages["01-10"] == 20.0
