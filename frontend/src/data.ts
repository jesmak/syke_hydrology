/**
 * What the card works out from the integration's data: days and calendar days, a measurement's difference from its
 * average, the ice at a day and the winters the ice is drawn by.
 */
import type { HomeAssistant } from "./hass";
import type { BearingClass, CardData, Day, IceData, IceEvent, IceMeasurement, MeasurementData } from "./types";

const DAY_MS = 86_400_000;

/** A winter starts in July, as a freeze-up falls on either side of the new year. */
export const WINTER_STARTS = 7;

export function addDays(day: Day, days: number): Day {
    return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Days from `from` to `to`, negative when `to` is earlier. */
export function daysBetween(from: Day, to: Day): number {
    return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** Today in the time zone the user's profile asks for: the server's or the browser's. */
export function today(hass: HomeAssistant | undefined, now = new Date()): Day {
    const zone = hass?.locale?.time_zone === "server" ? hass.config?.time_zone : undefined;
    // en-CA writes a date as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** The average of the day, or of the newest calendar day before it that has one, at most `back` days back. */
export function averageOn(average: Record<string, number>, day: Day, back = 0): number | undefined {
    for (let offset = 0; offset <= back; offset++) {
        const value = average[addDays(day, -offset).slice(5)];
        if (value !== undefined) {
            return value;
        }
    }
    return undefined;
}

/** The longest gap in an average that its line is drawn across. */
export const JOINED_GAP = 31;

/**
 * The average of each day from `from` to `to`, for drawing its line. A gap of at most JOINED_GAP days, such as between
 * the clusters of days a snow course's average has around its measurement dates, is joined by a straight line, read
 * from up to a month past either end so a gap at the edge is joined too. A longer gap, such as a surface temperature's
 * under the ice, stays a gap.
 */
export function averageLine(data: MeasurementData, from: Day, to: Day): [Day, number | undefined][] {
    const days: [Day, number | undefined][] = [];
    for (let day = addDays(from, -JOINED_GAP); day <= addDays(to, JOINED_GAP); day = addDays(day, 1)) {
        days.push([day, averageOn(data.average, day, data.average_back)]);
    }
    let previous = -1;
    for (let index = 0; index < days.length; index++) {
        if (days[index][1] === undefined) {
            continue;
        }
        if (previous >= 0 && index - previous > 1 && index - previous <= JOINED_GAP + 1) {
            const start = days[previous][1] as number;
            const end = days[index][1] as number;
            for (let between = previous + 1; between < index; between++) {
                days[between][1] = start + ((end - start) * (between - previous)) / (index - previous);
            }
        }
        previous = index;
    }
    return days.filter(([day]) => day >= from && day <= to);
}

/** The measurement's newest point, while its sensor still shows it. */
export function currentPoint(data: MeasurementData, day: Day): [Day, number] | undefined {
    const last = data.points.at(-1);
    return last && daysBetween(last[0], day) <= data.window ? last : undefined;
}

/** The newest point's difference from the average of its day. */
export function difference(data: MeasurementData, point: [Day, number]): number | undefined {
    const average = averageOn(data.average, point[0], data.average_back);
    return average === undefined ? undefined : point[1] - average;
}

/**
 * A difference in the unit it reads best in: a water level in metres differs by centimetres, so it is told in them.
 * Returns the value and its unit.
 */
export function differenceIn(unit: string | null, value: number): { value: number; unit: string | null } {
    return unit === "m" ? { value: value * 100, unit: "cm" } : { value, unit };
}

/** The year a winter started in: the winter of a day from July to June. */
export function winterOf(day: Day): number {
    const year = Number(day.slice(0, 4));
    return Number(day.slice(5, 7)) >= WINTER_STARTS ? year : year - 1;
}

/** Whether a day is in the winter that started in July of `winter`. */
export function inWinter(day: Day, winter: number): boolean {
    return winterOf(day) === winter;
}

/** An event's average day in the winter that started in July of `winter`. */
export function averageDay(event: IceEvent, winter: number): Day | undefined {
    if (event.average === null) {
        return undefined;
    }
    const year = event.season_start >= WINTER_STARTS ? winter : winter + 1;
    return addDays(`${year}-${String(event.season_start).padStart(2, "0")}-01`, event.average);
}

export function bearingClass(thickness: number, limits: IceData["limits"]): BearingClass {
    if (thickness >= limits.car) {
        return "car";
    }
    if (thickness >= limits.snowmobile) {
        return "snowmobile";
    }
    return thickness >= limits.walking ? "walking" : "does_not_bear";
}

export interface IceNow {
    measurement: IceMeasurement;
    /** Days since it was measured. */
    age: number;
    old: boolean;
    bearing: number;
    bearingClass: BearingClass;
}

/** The newest ice measurement on the day, while the station's sensors still show it, as they do for `window` days. */
export function iceOn(data: IceData, day: Day): IceNow | undefined {
    const measurement = data.measurements.filter((m) => m.day <= day).at(-1);
    if (!measurement || measurement.bearing === null || daysBetween(measurement.day, day) > data.window) {
        return undefined;
    }
    const age = daysBetween(measurement.day, day);
    return {
        measurement,
        age,
        old: age > data.max_age,
        bearing: measurement.bearing,
        bearingClass: bearingClass(measurement.bearing, data.limits),
    };
}

/** The bearing thickness of each of the winter's measurements, oldest first. */
export function winterBearings(data: IceData, winter: number): [Day, number][] {
    return data.measurements
        .filter((m) => m.bearing !== null && inWinter(m.day, winter))
        .map((m): [Day, number] => [m.day, m.bearing as number]);
}

/**
 * Last winter's measurements, moved a year on to the days of this winter, by the day they are drawn on. Shown while
 * this winter has no measurement by the day, so the coming winter can be compared with the last. Empty otherwise.
 */
export function lastWinter(data: IceData, winter: number, day: Day): Map<Day, IceMeasurement> {
    if (data.measurements.some((m) => m.day <= day && inWinter(m.day, winter))) {
        return new Map();
    }
    return new Map(data.measurements.filter((m) => m.bearing !== null && inWinter(m.day, winter - 1)).map((m) => [aYearOn(m.day), m]));
}

/** The same calendar day a year on. 29 February, which the next year has no day for, is the 28th. */
export function aYearOn(day: Day): Day {
    const moved = `${Number(day.slice(0, 4)) + 1}${day.slice(4)}`;
    return moved.endsWith("-02-29") ? moved.replace(/29$/, "28") : moved;
}

/** The event's day when it happened in the winter. */
export function eventIn(event: IceEvent | undefined, winter: number): Day | undefined {
    return event?.day && inWinter(event.day, winter) ? event.day : undefined;
}

/** The newest measured day, of either kind of data. */
export function lastMeasured(data: CardData): Day | undefined {
    return data.kind === "measurement" ? data.points.at(-1)?.[0] : data.measurements.at(-1)?.day;
}

/**
 * Round values for an axis covering `low` to `high` with about `count` of them: steps of 1, 2 or 5 times a power
 * of ten, the axis widened to the steps around it, and the decimals the step needs.
 */
export function ticks(low: number, high: number, count: number): { values: number[]; decimals: number; low: number; high: number } {
    const raw = (high - low) / Math.max(count - 1, 1) || Math.abs(high) || 1;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = ([1, 2, 5, 10].find((nice) => nice * magnitude >= raw - 1e-12) ?? 10) * magnitude;
    const first = Number((Math.floor(low / step + 1e-9) * step).toFixed(10));
    const last = Number((Math.ceil(high / step - 1e-9) * step).toFixed(10));
    const values: number[] = [];
    for (let value = first; value <= last + step / 2; value += step) {
        // A zero worked out from a negative start would print as -0.
        values.push(Number(value.toFixed(10)) || 0);
    }
    const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    return { values, decimals, low: first, high: last };
}
