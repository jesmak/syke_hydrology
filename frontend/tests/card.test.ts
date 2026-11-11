import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { cardEntities } from "../src/editor";
import type { HomeAssistant } from "../src/hass";
import type { SykeHydrologyCard } from "../src/syke-hydrology-card";
import type { IceData, MeasurementData } from "../src/types";

const LEVEL = "sensor.esimerkkijarvi_laituri_water_level";
const BEARS = "sensor.esimerkkijarvi_laituri_ice_bears";
const MEASURED = "sensor.esimerkkijarvi_laituri_ice_measured";

const MEASUREMENT: MeasurementData = {
    kind: "measurement",
    measurement: "water_level",
    station: "Esimerkkijärvi, Laituri",
    entity_id: LEVEL,
    average_entity_id: null,
    unit: "m",
    window: 30,
    average_back: 0,
    years: "1996–2025",
    points: [
        ["2026-11-09", 75.8],
        ["2026-11-10", 75.79],
    ],
    average: { "11-09": 75.97, "11-10": 75.96, "01-09": 76.05 },
};

const ICE: IceData = {
    kind: "ice",
    station: "Esimerkkijärvi, Laituri",
    measures_ice: true,
    limits: { walking: 10, snowmobile: 15, car: 20 },
    max_age: 14,
    window: 30,
    years: null,
    measurements: [{ day: "2026-02-09", total: 25, clear: 21, snow_ice: 4, snow_on_ice: 13, bearing: 23, weak: false }],
    average: { "02-09": 22.4 },
    events: { freeze_up: { day: "2026-01-01", average: 174, season_start: 7 } },
};

function hass(data: object | Error): HomeAssistant {
    const state = (entity_id: string, value: string) => ({ entity_id, state: value, last_changed: "", last_updated: "1", attributes: {} });
    return {
        language: "fi",
        locale: { language: "fi", number_format: "language" },
        config: { time_zone: "Europe/Helsinki" },
        states: { [LEVEL]: state(LEVEL, "75.79"), [BEARS]: state(BEARS, "unavailable"), [MEASURED]: state(MEASURED, "2026-02-09") },
        entities: {
            [LEVEL]: {
                entity_id: LEVEL,
                platform: "syke_hydrology",
                translation_key: "water_level",
                display_precision: 2,
                device_id: "laituri",
            },
            [BEARS]: { entity_id: BEARS, platform: "syke_hydrology", translation_key: "ice_bearing_class", device_id: "laituri" },
            [MEASURED]: { entity_id: MEASURED, platform: "syke_hydrology", translation_key: "ice_measured", device_id: "laituri" },
            "sensor.esimerkkijarvi_laituri_water_level_long_term_average": {
                entity_id: "sensor.esimerkkijarvi_laituri_water_level_long_term_average",
                platform: "syke_hydrology",
                translation_key: "water_level_average",
            },
        },
        formatEntityName: () => "Vedenkorkeus",
        callWS: vi.fn(async () => {
            if (data instanceof Error) {
                throw data;
            }
            return data;
        }) as HomeAssistant["callWS"],
    };
}

async function card(entity: string, data: object | Error, config: Record<string, unknown> = {}): Promise<SykeHydrologyCard> {
    const element = document.createElement("syke-hydrology-card");
    element.setConfig({ type: "custom:syke-hydrology-card", entity, ...config });
    element.hass = hass(data);
    document.body.append(element);
    await element.updateComplete;
    // The fetch resolves, and the card draws what came at the width it would measure, as happy-dom lays nothing out.
    await new Promise((resolve) => setTimeout(resolve, 0));
    (element as unknown as { width: number }).width = 360;
    await element.updateComplete;
    return element;
}

interface IceTips {
    iceTip(data: IceData, day: string, ghost: Map<string, IceData["measurements"][number]>): unknown[];
}

beforeAll(async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-11T10:00:00Z"));
    await import("../src/syke-hydrology-card");
});

afterEach(() => {
    document.body.innerHTML = "";
});

describe("the configuration", () => {
    it("needs a sensor, a known chart and valid heights", () => {
        const element = document.createElement("syke-hydrology-card");
        expect(() => element.setConfig({ type: "custom:syke-hydrology-card", entity: "" })).toThrow();
        expect(() => element.setConfig({ type: "custom:syke-hydrology-card", entity: LEVEL, chart: "pie" as "average" })).toThrow();
        expect(() => element.setConfig({ type: "custom:syke-hydrology-card", entity: LEVEL, height_mode: "fixed", height: -5 })).toThrow();
        expect(() => element.setConfig({ type: "custom:syke-hydrology-card", entity: LEVEL, chart: "difference" })).not.toThrow();
    });

    it("fits one row of a sections view at least", () => {
        const element = document.createElement("syke-hydrology-card");
        element.setConfig({ type: "custom:syke-hydrology-card", entity: LEVEL });
        expect(element.getGridOptions()).toMatchObject({ rows: "auto", min_rows: 1 });
    });

    it("offers the water level first in the picker, never an average", () => {
        expect(cardEntities(hass(MEASUREMENT))).toEqual([LEVEL, BEARS, MEASURED]);
    });
});

describe("a measurement", () => {
    it("asks the integration for its data and tells its value against the average", async () => {
        const element = await card(LEVEL, MEASUREMENT);
        expect(element.hass?.callWS).toHaveBeenCalledWith({ type: "syke_hydrology/card", entity_id: LEVEL });
        const text = element.shadowRoot?.textContent?.replace(/\s+/g, " ") ?? "";
        expect(text).toContain("Vedenkorkeus");
        expect(text).toContain("75,79");
        expect(text).toContain("17 cm alle ka.");
        expect(text).toContain("mitattu 10.11.");
    });

    it("has a tooltip of the day's measurement, average and difference", async () => {
        const element = await card(LEVEL, MEASUREMENT);
        const tip = (element as unknown as { measurementTip(data: MeasurementData, day: string): unknown[] }).measurementTip(
            MEASUREMENT,
            "2026-11-10",
        );
        const texts = tip.map((line) => String((line as { values: unknown[] }).values.at(-1)));
        expect(texts).toEqual(["Mitattu 75,79 m", "Keskiarvo 75,96 m", "Ero keskiarvoon −17 cm"]);
    });

    it("says so when the integration can't draw the sensor", async () => {
        const element = await card(LEVEL, Object.assign(new Error("no"), { code: "not_supported" }));
        expect(element.shadowRoot?.textContent).toContain(`Kortti ei piirrä anturia ${LEVEL}`);
    });

    it("says so when the sensor isn't there", async () => {
        const element = await card("sensor.not_there", MEASUREMENT);
        expect(element.shadowRoot?.textContent).toContain("Anturia sensor.not_there ei löydy");
    });
});

describe("the ice", () => {
    it("in autumn tells there is no ice, when it was last measured and when it freezes on average", async () => {
        const element = await card(BEARS, ICE);
        const text = element.shadowRoot?.textContent?.replace(/\s+/g, " ") ?? "";
        expect(text).toContain("Jää · talvi 2026–27");
        expect(text).toContain("Esimerkkijärvi, Laituri · mitattu 9.2.2026");
        expect(text).toContain("Ei jäätä");
        expect(text).toContain("keskimäärin 22.12., 41 vrk päästä");
    });

    it("has a tooltip of a measurement's bearing and what it bears", async () => {
        const element = await card(BEARS, ICE);
        const tip = (element as unknown as IceTips).iceTip(ICE, "2026-02-09", new Map());
        const texts = tip.map((line) => String((line as { values: unknown[] }).values.at(-1)));
        expect(texts).toEqual(["Kantava paksuus 23 cm", "Kantaa auton", "Keskiarvo 22 cm"]);
    });

    it("names last winter's line, drawn a year on, in the legend and in its tooltip", async () => {
        const element = await card(BEARS, ICE);
        const legend = element.shadowRoot?.querySelector(".foot")?.textContent?.replace(/\s+/g, " ") ?? "";
        expect(legend).toContain("Viime talvi");
        expect(legend).not.toContain("Kantavuus");
        const ghost = new Map([["2027-02-09", ICE.measurements[0]]]);
        const tip = (element as unknown as IceTips).iceTip(ICE, "2027-02-09", ghost);
        const texts = tip.map((line) => String((line as { values: unknown[] }).values.at(-1)));
        expect(texts.slice(0, 3)).toEqual(["Viime talvi 9.2.2026", "Kantava paksuus 23 cm", "Kantaa auton"]);
    });
});

describe("fetching", () => {
    it("asks again when another sensor of the station changes, as a new measurement can leave the card's own as it was", async () => {
        const element = await card(BEARS, ICE);
        const before = element.hass as HomeAssistant;
        const measured = before.states[MEASURED] as NonNullable<HomeAssistant["states"][string]>;
        element.hass = { ...before, states: { ...before.states, [MEASURED]: { ...measured, state: "2026-02-19", last_updated: "2" } } };
        await element.updateComplete;
        expect(before.callWS).toHaveBeenCalledTimes(2);
    });
});

describe("the days ahead", () => {
    const ahead = (element: SykeHydrologyCard, data: MeasurementData) =>
        (element as unknown as { aheadText(data: MeasurementData): string }).aheadText(data);

    it("tell how the average moves in 60 days, a water level in centimetres, with its sign", async () => {
        const element = await card(LEVEL, MEASUREMENT);
        expect(ahead(element, { ...MEASUREMENT, average: { "11-11": 75.96, "01-10": 76.05 } })).toBe("Ka. +9 cm 60 vrk:ssa");
        expect(ahead(element, { ...MEASUREMENT, average: { "11-11": 76.05, "01-10": 75.96 } })).toBe("Ka. −9 cm 60 vrk:ssa");
        expect(ahead(element, { ...MEASUREMENT, average: { "11-11": 75.96, "01-10": 75.96 } })).toBe("Ka. ±0 cm 60 vrk:ssa");
    });

    it("go only as far as the average has days, at least two weeks, and without today's give the value", async () => {
        const element = await card(LEVEL, MEASUREMENT);
        expect(ahead(element, { ...MEASUREMENT, average: { "11-11": 75.96, "12-20": 76.0 } })).toBe("Ka. +4 cm 39 vrk:ssa");
        expect(ahead(element, { ...MEASUREMENT, average: { "11-11": 75.96, "11-20": 76.0 } })).toBe("");
        expect(ahead(element, { ...MEASUREMENT, average: { "01-09": 76.05 } })).toBe("Ka. 76,05 m 59 vrk:n päästä");
    });
});

describe("pointing at a chart", () => {
    const frame = { from: "2026-11-01", days: 195, left: 44, right: 400 };
    const stops = ["2027-01-09", "2027-01-23", "2027-02-06"];

    it("snaps to the nearest measurement within five days, or stays on the day", async () => {
        const { nearest } = await import("../src/syke-hydrology-card");
        expect(nearest(stops, "2027-01-12")).toBe("2027-01-09");
        expect(nearest(stops, "2027-01-20")).toBe("2027-01-23");
        expect(nearest(stops, "2027-01-16")).toBe("2027-01-16");
    });

    it("steps from one measurement to the next on the ice, however far apart, and stops at the ends", async () => {
        const { stepDay } = await import("../src/syke-hydrology-card");
        expect(stepDay(undefined, 1, frame, stops)).toBe("2027-01-09");
        expect(stepDay(undefined, -1, frame, stops)).toBe("2027-02-06");
        expect(stepDay("2027-01-09", 1, frame, stops)).toBe("2027-01-23");
        expect(stepDay("2027-01-16", -1, frame, stops)).toBe("2027-01-09");
        expect(stepDay("2027-02-06", 1, frame, stops)).toBe("2027-02-06");
    });

    it("steps a day at a time on a daily chart, within it", async () => {
        const { stepDay } = await import("../src/syke-hydrology-card");
        expect(stepDay(undefined, 1, frame)).toBe("2026-11-01");
        expect(stepDay("2026-12-31", 1, frame)).toBe("2027-01-01");
        expect(stepDay("2026-11-01", -1, frame)).toBe("2026-11-01");
    });
});
