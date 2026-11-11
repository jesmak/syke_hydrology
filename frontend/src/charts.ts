/**
 * The card's drawings as SVG, each drawn for the size it is given: a measurement against its average year, its
 * difference from the average, a sparkline, the winter's ice and the bearing gauge.
 */
import { nothing, svg } from "lit";
import type { SVGTemplateResult } from "lit";

import {
    addDays,
    averageDay,
    averageLine,
    averageOn,
    bearingClass,
    daysBetween,
    differenceIn,
    eventIn,
    lastWinter,
    ticks,
    winterBearings,
} from "./data";
import type { IceNow } from "./data";
import type { BearingClass, Day, IceData, MeasurementData } from "./types";

/** How the card writes numbers and days, in the user's language and number format. */
export interface Formats {
    number(value: number, decimals: number): string;
    /** A day as the short day and month, such as 1.11. */
    day(day: Day): string;
    text(key: string): string;
}

/** Where a chart's days run, for pointing at one: its first day, how many days it covers and the x of its edges. */
export interface ChartFrame {
    from: Day;
    days: number;
    left: number;
    right: number;
}

/** A chart and its frame. */
export interface Drawn {
    chart: SVGTemplateResult;
    frame: ChartFrame;
}

/** The day at an x in the chart, within its days. */
export function dayAt(frame: ChartFrame, x: number): Day {
    const share = Math.min(1, Math.max(0, (x - frame.left) / (frame.right - frame.left || 1)));
    return addDays(frame.from, Math.round(share * frame.days));
}

/** The x of a day in the chart. */
export function xOf(frame: ChartFrame, day: Day): number {
    return frame.left + (daysBetween(frame.from, day) / frame.days) * (frame.right - frame.left);
}

/** Days drawn back from today and ahead of it. */
export const DAYS_BACK = 90;
export const DAYS_AHEAD = 60;
export const SPARK_DAYS = 30;

/** The colour of each bearing class, which a theme can change. */
export const CLASS_COLORS: Record<BearingClass, string> = {
    does_not_bear: "var(--syke-does-not-bear-color, var(--error-color, #db4437))",
    walking: "var(--syke-walking-color, var(--amber-color, #ffc107))",
    snowmobile: "var(--syke-snowmobile-color, var(--cyan-color, #00bcd4))",
    car: "var(--syke-car-color, var(--success-color, #43a047))",
};

const TOP = 16;
const BOTTOM = 18;
const CHAR = 6.2;

function path(points: [number, number | undefined][]): string {
    let drawn = "";
    let open = false;
    for (const [x, y] of points) {
        if (y === undefined) {
            open = false;
            continue;
        }
        drawn += `${open ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
        open = true;
    }
    return drawn;
}

/** The first of each month between two days, for the axis's labels. */
function monthStarts(from: Day, to: Day): Day[] {
    const days: Day[] = [];
    for (let day = from; day <= to; day = addDays(day, 1)) {
        if (day.endsWith("-01")) {
            days.push(day);
        }
    }
    return days;
}

/** The left margin a column of labels needs. */
function labelRoom(labels: string[]): number {
    return Math.ceil(Math.max(...labels.map((label) => label.length), 1) * CHAR) + 8;
}

function todayLine(x: number, height: number, text: string): SVGTemplateResult {
    return svg`<line class="today" x1=${x} x2=${x} y1=${TOP} y2=${height - BOTTOM}></line>
        <text class="today-label" x=${x} y=${TOP - 4} text-anchor="middle">${text}</text>`;
}

/** The measurement 90 days back and its average 90 days back and 60 ahead, the days ahead shaded. */
export function averageChart(data: MeasurementData, today: Day, width: number, height: number, f: Formats): Drawn {
    const from = addDays(today, -DAYS_BACK);
    const to = addDays(today, DAYS_AHEAD);
    const measured = data.points.filter(([day]) => day >= from && day <= today);
    const average = averageLine(data, from, to);
    const values = [...measured.map(([, value]) => value), ...average.flatMap(([, value]) => (value === undefined ? [] : [value]))];
    const axis = ticks(Math.min(...values), Math.max(...values), 4);
    const { low, high } = axis;
    const labels = axis.values.map((value) => f.number(value, axis.decimals));
    const left = labelRoom(labels);
    const frame: ChartFrame = { from, days: DAYS_BACK + DAYS_AHEAD, left, right: width - 4 };
    const x = (day: Day) => xOf(frame, day);
    const y = (value: number) => TOP + (1 - (value - low) / (high - low)) * (height - TOP - BOTTOM);
    const last = measured.at(-1);
    const chart = svg`<svg class="chart" width=${width} height=${height} role="img">
        <rect class="future" x=${x(today)} y=${TOP} width=${x(to) - x(today)} height=${height - TOP - BOTTOM}></rect>
        ${axis.values.map(
            (value, index) => svg`<line class="grid" x1=${left} x2=${width - 4} y1=${y(value)} y2=${y(value)}></line>
                <text x=${left - 5} y=${y(value) + 4} text-anchor="end">${labels[index]}</text>`,
        )}
        ${monthStarts(from, to).map((day) => svg`<text x=${x(day)} y=${height - 4} text-anchor="middle">${f.day(day)}</text>`)}
        <path class="average" d=${path(average.map(([day, value]) => [x(day), value === undefined ? undefined : y(value)]))}></path>
        <path class="measured" d=${path(measured.map(([day, value]) => [x(day), y(value)]))}></path>
        ${last ? svg`<circle class="last" cx=${x(last[0])} cy=${y(last[1])} r="3.5"></circle>` : nothing}
        ${todayLine(x(today), height, f.text("card.today"))}
    </svg>`;
    return { chart, frame };
}

/** The measurement's difference from its average on each of the 90 days back, as bars around zero. */
export function differenceChart(data: MeasurementData, today: Day, width: number, height: number, f: Formats): Drawn {
    const from = addDays(today, -DAYS_BACK);
    const bars: [Day, number][] = [];
    for (const [day, value] of data.points) {
        const average = day >= from && day <= today ? averageOn(data.average, day, data.average_back) : undefined;
        if (average !== undefined) {
            bars.push([day, differenceIn(data.unit, value - average).value]);
        }
    }
    const values = bars.map(([, value]) => value);
    const top = Math.max(0, ...values);
    const bottom = Math.min(0, ...values);
    const pad = (top - bottom || 1) * 0.12;
    const high = top + (top > 0 ? pad : pad / 3);
    const low = bottom - (bottom < 0 ? pad : pad / 3);
    const decimals = top - bottom >= 3 ? 0 : 1;
    const marks = [...new Set([0, ...(bottom < 0 ? [bottom] : []), ...(top > 0 ? [top] : [])])];
    const labels = marks.map((value) => (value > 0 ? "+" : "") + f.number(value, decimals));
    const left = labelRoom(labels);
    const frame: ChartFrame = { from, days: DAYS_BACK, left, right: width - 4 };
    const x = (day: Day) => xOf(frame, day);
    const y = (value: number) => TOP + (1 - (value - low) / (high - low)) * (height - TOP - BOTTOM);
    const bar = Math.max(((width - left - 4) / DAYS_BACK) * 0.8, 0.8);
    const chart = svg`<svg class="chart" width=${width} height=${height} role="img">
        ${marks.map(
            (
                value,
                index,
            ) => svg`<line class=${value === 0 ? "zero" : "grid"} x1=${left} x2=${width - 4} y1=${y(value)} y2=${y(value)}></line>
                <text x=${left - 5} y=${y(value) + 4} text-anchor="end">${labels[index]}</text>`,
        )}
        ${bars.map(
            ([day, value]) =>
                svg`<rect class=${value > 0 ? "bar-above" : "bar-below"} x=${x(day) - bar / 2} width=${bar} y=${Math.min(y(value), y(0))} height=${Math.abs(y(value) - y(0))}></rect>`,
        )}
        ${monthStarts(from, today).map((day) => svg`<text x=${x(day)} y=${height - 4} text-anchor="middle">${f.day(day)}</text>`)}
    </svg>`;
    return { chart, frame };
}

/** The measurement 30 days back and its average 30 back and ahead, stretched to whatever width it is given. */
export function sparkline(data: MeasurementData, today: Day, height: number): SVGTemplateResult {
    const from = addDays(today, -SPARK_DAYS);
    const to = addDays(today, SPARK_DAYS);
    const width = 200;
    const measured = data.points.filter(([day]) => day >= from && day <= today);
    const average = averageLine(data, from, to);
    const values = [...measured.map(([, value]) => value), ...average.flatMap(([, value]) => (value === undefined ? [] : [value]))];
    const low = Math.min(...values);
    const high = Math.max(...values);
    const x = (day: Day) => (daysBetween(from, day) / (SPARK_DAYS * 2)) * width;
    const y = (value: number) => 2 + (1 - (value - low) / (high - low || 1)) * (height - 4);
    return svg`<svg class="spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" height=${height}>
        <path class="average" vector-effect="non-scaling-stroke" d=${path(average.map(([day, value]) => [x(day), value === undefined ? undefined : y(value)]))}></path>
        <path class="measured" vector-effect="non-scaling-stroke" d=${path(measured.map(([day, value]) => [x(day), y(value)]))}></path>
        <line class="today" vector-effect="non-scaling-stroke" x1=${x(today)} x2=${x(today)} y1="0" y2=${height}></line>
    </svg>`;
}

export type Limit = keyof IceData["limits"];

/** Where the winter chart draws each limit, for the icons the card puts beside their numbers. */
export interface LimitMark {
    limit: Limit;
    y: number;
}

/** The winter's ice runs from November to the middle of May. */
export function winterSpan(winter: number): [Day, Day] {
    return [`${winter}-11-01`, `${winter + 1}-05-15`];
}

/** The limits' numbers sit this far from the left edge, so the icons fit beside them. */
export const WINTER_LEFT = 44;
const ICE_MAX = 35;

/**
 * The bearing thickness of each of the winter's measurements, coloured by what it bears, against the limits and the
 * average, the freeze-up and break-up with their averages, and today. A winter with no measurement yet shows the one
 * before as a faint line.
 */
export function winterChart(
    data: IceData,
    today: Day,
    winter: number,
    width: number,
    height: number,
    f: Formats,
): Drawn & { limits: LimitMark[] } {
    const [from, to] = winterSpan(winter);
    const left = WINTER_LEFT;
    const days = daysBetween(from, to);
    const top = Math.max(ICE_MAX, ...data.measurements.map((m) => m.bearing ?? 0)) + 2;
    const frame: ChartFrame = { from, days, left, right: width - 4 };
    const x = (day: Day) => xOf(frame, day);
    const y = (value: number) => TOP + (1 - value / top) * (height - TOP - BOTTOM);
    let average = "";
    for (let day = from; day <= to; day = addDays(day, 1)) {
        const value = averageOn(data.average, day);
        if (value !== undefined) {
            average += `${average ? "L" : "M"}${x(day).toFixed(1)},${y(value).toFixed(1)}`;
        }
    }
    const measured = winterBearings(data, winter).filter(([day]) => day <= today);
    const ghost = [...lastWinter(data, winter, today)].map(([day, m]): [Day, number] => [day, m.bearing as number]);
    const limits: LimitMark[] = (["walking", "snowmobile", "car"] as const).map((limit) => ({ limit, y: y(data.limits[limit]) }));
    const line = (day: Day | undefined, kind: string, label = "") =>
        day && day >= from && day <= to
            ? svg`<line class=${kind} x1=${x(day)} x2=${x(day)} y1=${TOP} y2=${height - BOTTOM}></line>
                ${label ? svg`<text class=${`${kind}-label`} x=${x(day) + 3} y=${TOP + 9}>${label}</text>` : nothing}`
            : nothing;
    const freeze = data.events.freeze_up;
    const breakUp = data.events.break_up;
    const chart = svg`<svg class="chart" width=${width} height=${height} role="img">
        ${limits.map(
            (
                mark,
            ) => svg`<line class="limit" style=${`stroke: ${CLASS_COLORS[mark.limit]}`} x1=${left} x2=${width - 4} y1=${mark.y} y2=${mark.y}></line>
                <text x=${left - 4} y=${mark.y + 4} text-anchor="end">${data.limits[mark.limit]}</text>`,
        )}
        ${monthStarts(from, to).map((day) => svg`<text x=${x(day)} y=${height - 4} text-anchor="middle">${f.day(day)}</text>`)}
        ${average ? svg`<path class="average-area" d=${`${average}L${x(to)},${y(0)}L${x(from)},${y(0)}Z`}></path><path class="average" d=${average}></path>` : nothing}
        ${ghost.length ? svg`<path class="ghost" d=${path(ghost.map(([day, value]) => [x(day), y(value)]))}></path>` : nothing}
        ${measured.length ? svg`<path class="measured" d=${path(measured.map(([day, value]) => [x(day), y(value)]))}></path>` : nothing}
        ${measured.map(
            ([day, value]) =>
                svg`<circle class="point" cx=${x(day)} cy=${y(value)} r="3.5" style=${`fill: ${CLASS_COLORS[bearingClass(value, data.limits)]}`}></circle>`,
        )}
        ${freeze ? line(averageDay(freeze, winter), "freeze-average", f.text("card.average_short")) : nothing}
        ${breakUp ? line(averageDay(breakUp, winter), "thaw-average", f.text("card.average_short")) : nothing}
        ${line(eventIn(freeze, winter), "freeze")}
        ${line(eventIn(breakUp, winter), "thaw")}
        ${today >= from && today <= to ? todayLine(x(today), height, f.text("card.today")) : nothing}
    </svg>`;
    return { chart, frame, limits };
}

const GAUGE_MAX = 35;

/** The bearing thickness against the limits, with the day's average. */
export function gauge(now: IceNow, data: IceData, average: number | undefined, width: number, f: Formats): SVGTemplateResult {
    const max = Math.max(GAUGE_MAX, now.bearing + 3);
    const x = (value: number) => (Math.min(value, max) / max) * width;
    const bar = 14;
    const zones: [number, number, BearingClass][] = [
        [0, data.limits.walking, "does_not_bear"],
        [data.limits.walking, data.limits.snowmobile, "walking"],
        [data.limits.snowmobile, data.limits.car, "snowmobile"],
        [data.limits.car, max, "car"],
    ];
    const color = now.old ? "var(--syke-old-color, var(--warning-color, #ff9800))" : CLASS_COLORS[now.bearingClass];
    return svg`<svg class="gauge" width=${width} height="46" role="img">
        ${zones.map(([a, b, kind]) => svg`<rect class="zone" x=${x(a)} y=${bar} width=${Math.max(x(b) - x(a) - 1, 0)} height="12" rx="2" style=${`fill: ${CLASS_COLORS[kind]}`}></rect>`)}
        ${[data.limits.walking, data.limits.snowmobile, data.limits.car].map((v) => svg`<text x=${x(v)} y=${bar + 26} text-anchor="middle">${v}</text>`)}
        <text x="0" y=${bar + 26}>0</text><text x=${width} y=${bar + 26} text-anchor="end">cm</text>
        ${
            average !== undefined && average >= 0.5
                ? svg`<line class="gauge-average" x1=${x(average)} x2=${x(average)} y1=${bar - 4} y2=${bar + 16}></line>
                    <text class="gauge-average-label" x=${x(average)} y=${bar - 6} text-anchor="middle">${f.text("card.average_short")} ${f.number(average, 0)}</text>`
                : nothing
        }
        <rect x="0" y=${bar} width=${Math.max(x(now.bearing), 3)} height="12" rx="2" style=${`fill: ${color}`}></rect>
        <text class="gauge-value" x=${Math.max(x(now.bearing), 3) + 4} y=${bar + 10}>${f.number(now.bearing, 0)}</text>
    </svg>`;
}
