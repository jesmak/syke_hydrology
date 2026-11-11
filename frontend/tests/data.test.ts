import { describe, expect, it } from "vitest";

import {
    addDays,
    averageDay,
    averageLine,
    aYearOn,
    averageOn,
    bearingClass,
    currentPoint,
    daysBetween,
    difference,
    differenceIn,
    eventIn,
    iceOn,
    lastWinter,
    ticks,
    today,
    winterBearings,
    winterOf,
} from "../src/data";
import type { HomeAssistant } from "../src/hass";
import type { IceData, IceMeasurement, MeasurementData } from "../src/types";

const LIMITS = { walking: 10, snowmobile: 15, car: 20 };

function measurement(points: [string, number][], average: Record<string, number>, back = 0): MeasurementData {
    return {
        kind: "measurement",
        measurement: "water_level",
        station: "Esimerkkijärvi, Laituri",
        entity_id: "sensor.esimerkkijarvi_laituri_water_level",
        average_entity_id: null,
        unit: "m",
        window: 30,
        average_back: back,
        years: "1996–2025",
        points,
        average,
    };
}

function ice(day: string, bearing: number | null, weak = false): IceMeasurement {
    return { day, total: bearing, clear: bearing, snow_ice: 0, snow_on_ice: 0, bearing, weak };
}

function iceData(measurements: IceMeasurement[]): IceData {
    return {
        kind: "ice",
        station: "Esimerkkijärvi, Laituri",
        measures_ice: true,
        limits: LIMITS,
        max_age: 14,
        window: 30,
        years: null,
        measurements,
        average: {},
        events: {},
    };
}

describe("days", () => {
    it("are counted across the end of a month and a leap day", () => {
        expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
        expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
        expect(daysBetween("2026-12-22", "2027-01-01")).toBe(10);
        expect(daysBetween("2027-01-01", "2026-12-22")).toBe(-10);
    });

    it("start in the server's time zone when the profile asks for it, otherwise in the browser's", () => {
        // 22:30 UTC is already the next day in Helsinki.
        const now = new Date("2026-11-10T22:30:00Z");
        const server = { locale: { time_zone: "server" }, config: { time_zone: "Europe/Helsinki" } } as HomeAssistant;
        expect(today(server, now)).toBe("2026-11-11");
        expect(today({ locale: { time_zone: "local" }, config: { time_zone: "Europe/Helsinki" } } as HomeAssistant, now)).toBe(
            "2026-11-10",
        );
    });
});

describe("a measurement against its average", () => {
    it("takes a sum's average from the newest calendar day that has one, at most so many days back", () => {
        const average = { "11-01": 40 };
        expect(averageOn(average, "2026-11-05", 5)).toBe(40);
        expect(averageOn(average, "2026-11-07", 5)).toBeUndefined();
        expect(averageOn(average, "2026-11-05")).toBeUndefined();
    });

    it("is the newest point while its sensor still shows it", () => {
        const data = measurement([["2026-11-10", 75.79]], { "11-10": 75.96 });
        expect(currentPoint(data, "2026-11-11")).toEqual(["2026-11-10", 75.79]);
        expect(currentPoint(data, "2026-12-10")).toEqual(["2026-11-10", 75.79]);
        expect(currentPoint(data, "2026-12-11")).toBeUndefined();
    });

    it("differs by centimetres when the level is in metres, and by the unit itself otherwise", () => {
        const data = measurement([["2026-11-10", 75.79]], { "11-10": 75.96 });
        const value = difference(data, ["2026-11-10", 75.79]) ?? 0;
        expect(differenceIn("m", value).value).toBeCloseTo(-17);
        expect(differenceIn("m", value).unit).toBe("cm");
        expect(differenceIn("°C", 1.8)).toEqual({ value: 1.8, unit: "°C" });
    });

    it("has no difference on a day without an average", () => {
        expect(difference(measurement([["2026-01-10", 0.3]], {}), ["2026-01-10", 0.3])).toBeUndefined();
    });
});

describe("an average's line", () => {
    it("joins a gap of up to a month, across the window's edge too, and leaves a longer one", () => {
        const snow = measurement([], { "12-23": 40, "01-12": 60, "03-01": 100 });
        const line = new Map(averageLine(snow, "2026-12-20", "2027-01-05"));
        expect(line.get("2026-12-23")).toBe(40);
        // 23.12. to 12.1. is 20 days: two of them on is 2 mm more.
        expect(line.get("2026-12-25")).toBeCloseTo(42);
        expect(line.get("2027-01-05")).toBeCloseTo(53);
        expect(line.get("2026-12-20")).toBeUndefined();
        const late = new Map(averageLine(snow, "2027-01-13", "2027-02-28"));
        expect(late.get("2027-02-01")).toBeUndefined();
    });
});

describe("the ice", () => {
    it("has its winters from July to June", () => {
        expect(winterOf("2026-11-11")).toBe(2026);
        expect(winterOf("2027-03-29")).toBe(2026);
        expect(winterOf("2027-07-01")).toBe(2027);
    });

    it("has a freeze-up's average day in the winter's own year and a break-up's in the next", () => {
        expect(averageDay({ day: null, average: 174, season_start: 7 }, 2026)).toBe("2026-12-22");
        expect(averageDay({ day: null, average: 111, season_start: 1 }, 2026)).toBe("2027-04-22");
        expect(averageDay({ day: null, average: null, season_start: 7 }, 2026)).toBeUndefined();
    });

    it("tells which winter an event happened in", () => {
        const freeze = { day: "2026-01-01", average: 174, season_start: 7 };
        expect(eventIn(freeze, 2025)).toBe("2026-01-01");
        expect(eventIn(freeze, 2026)).toBeUndefined();
    });

    it("bears by its limits, each limit included", () => {
        expect(bearingClass(9, LIMITS)).toBe("does_not_bear");
        expect(bearingClass(10, LIMITS)).toBe("walking");
        expect(bearingClass(15, LIMITS)).toBe("snowmobile");
        expect(bearingClass(20, LIMITS)).toBe("car");
    });

    it("is the newest measurement until it is a month old, and old after the station's limit", () => {
        const data = iceData([ice("2026-02-09", 23), ice("2026-03-19", 0, true)]);
        expect(iceOn(data, "2026-02-12")).toMatchObject({ age: 3, old: false, bearing: 23, bearingClass: "car" });
        expect(iceOn(data, "2026-04-04")).toMatchObject({ age: 16, old: true, bearing: 0, bearingClass: "does_not_bear" });
        expect(iceOn(data, "2026-04-18")).toBeDefined();
        expect(iceOn(data, "2026-04-19")).toBeUndefined();
        expect(iceOn(data, "2026-01-01")).toBeUndefined();
    });

    it("shows last winter a year on until this winter has a measurement", () => {
        const data = iceData([ice("2026-02-09", 23), ice("2027-01-09", 10)]);
        expect([...lastWinter(data, 2026, "2026-12-31").keys()]).toEqual(["2027-02-09"]);
        expect(lastWinter(data, 2026, "2027-01-09").size).toBe(0);
    });

    it("moves a day a calendar year on, 29 February to the 28th", () => {
        expect(aYearOn("2026-02-09")).toBe("2027-02-09");
        expect(aYearOn("2028-02-29")).toBe("2029-02-28");
        expect(aYearOn("2027-03-01")).toBe("2028-03-01");
    });

    it("draws a winter by its own measurements only", () => {
        const data = iceData([ice("2026-03-09", 29), ice("2026-12-28", 8), ice("2027-01-09", 12)]);
        expect(winterBearings(data, 2026)).toEqual([
            ["2026-12-28", 8],
            ["2027-01-09", 12],
        ]);
        expect(winterBearings(data, 2025)).toEqual([["2026-03-09", 29]]);
    });
});

describe("an axis", () => {
    it("steps in round values and widens to the steps around the data", () => {
        expect(ticks(75.61, 76.32, 4)).toEqual({ values: [75.5, 76, 76.5], decimals: 1, low: 75.5, high: 76.5 });
        expect(ticks(2.1, 22.8, 4)).toEqual({ values: [0, 10, 20, 30], decimals: 0, low: 0, high: 30 });
        expect(ticks(75.78, 75.85, 4)).toEqual({ values: [75.75, 75.8, 75.85], decimals: 2, low: 75.75, high: 75.85 });
        expect(ticks(0, 1.3, 4)).toEqual({ values: [0, 0.5, 1, 1.5], decimals: 1, low: 0, high: 1.5 });
    });
});
