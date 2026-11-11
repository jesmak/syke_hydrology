import type { LovelaceCardConfig } from "./hass";
import type { RowStepConfig } from "./rows";

export type ChartKind = "average" | "difference";

export interface SykeCardConfig extends LovelaceCardConfig, RowStepConfig {
    entity: string;
    /** How a measurement is drawn: against its average year, or as its difference from it. Not used for the ice. */
    chart?: ChartKind;
}

/** A day as `YYYY-MM-DD`, and a calendar day as `MM-DD`. */
export type Day = string;

/** What the integration's `syke_hydrology/card` command hands over for a measurement sensor or its average. */
export interface MeasurementData {
    kind: "measurement";
    /** The measurement's key, such as `water_level`. */
    measurement: string;
    station: string;
    entity_id: string | null;
    average_entity_id: string | null;
    unit: string | null;
    /** How many days a measurement is shown for before its sensor turns unavailable. */
    window: number;
    /** How many days back a calendar day's average is looked for, for a sum over a period. */
    average_back: number;
    /** The years of the averages, such as "1996–2025". */
    years: string | null;
    /** The past year's measurements, oldest first. */
    points: [Day, number][];
    /** The long-term average of each calendar day. */
    average: Record<string, number>;
}

export interface IceMeasurement {
    day: Day;
    total: number | null;
    clear: number | null;
    snow_ice: number | null;
    snow_on_ice: number | null;
    /** The clear ice and half of the snow ice, 0 for weak ice. */
    bearing: number | null;
    /** Ice in sight but too weak to measure. */
    weak: boolean;
}

export interface IceEvent {
    /** The newest day of the event in the past year. */
    day: Day | null;
    /** Its average day as days from the start of its season. */
    average: number | null;
    /** The month its season starts in: 7 for a freeze-up, 1 for a break-up. */
    season_start: number;
}

/** What the command hands over for any of a station's ice sensors. */
export interface IceData {
    kind: "ice";
    station: string;
    /** False for a station that records only the freeze-up and break-up dates. */
    measures_ice: boolean;
    limits: { walking: number; snowmobile: number; car: number };
    /** How old a measurement may be, in days, before it is called old. */
    max_age: number;
    /** How many days a measurement is shown for. */
    window: number;
    years: string | null;
    measurements: IceMeasurement[];
    /** The long-term average bearing thickness of each calendar day. */
    average: Record<string, number>;
    events: Record<string, IceEvent>;
}

export type CardData = MeasurementData | IceData;

export type BearingClass = "does_not_bear" | "walking" | "snowmobile" | "car";
