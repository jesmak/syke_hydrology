/**
 * A dashboard card for the SYKE hydrology integration: one measurement of a station against its long-term average, or
 * the station's ice. A card held lower than its content needs switches to a smaller form instead of cutting anything
 * off, down to one row.
 */
import { LitElement, css, html, nothing, render } from "lit";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";

import { CLASS_COLORS, WINTER_LEFT, averageChart, dayAt, differenceChart, gauge, sparkline, winterChart, xOf } from "./charts";
import type { ChartFrame, Drawn, Formats } from "./charts";
import { CARD_VERSION } from "./const";
import {
    addDays,
    averageDay,
    averageOn,
    currentPoint,
    daysBetween,
    difference,
    bearingClass,
    differenceIn,
    eventIn,
    iceOn,
    lastWinter,
    lastMeasured,
    today,
    winterOf,
} from "./data";
import type { IceNow } from "./data";
import { cardEntities } from "./editor";
import type { HomeAssistant } from "./hass";
import { gridMinRows, heightCardSize, heightMode, heightStyle, validHeight } from "./height";
import { browserLanguage, translate } from "./localize/localize";
import { drawnScale, fillLimit, filledHeight, filledStyle, spareRoom, validRowStep } from "./rows";
import type { BearingClass, CardData, ChartKind, IceData, IceMeasurement, MeasurementData, SykeCardConfig } from "./types";

/** The charts' height on automatic rows before the rows are filled, and the least they are drawn with when held. */
const MEASUREMENT_CHART = 150;
const DIFFERENCE_CHART = 110;
const ICE_CHART = 135;
const MIN_CHART = 90;
/** The sparkline under the row in two rows: 120 px less the row, the padding, the border and the gap above it. */
const SPARK_CHART = 56;
/** The one-row form: a 36 px row with 9 px of padding and ha-card's 1 px border above and below. */
const MIN_HEIGHT = 56;
/** The icons beside the limits' numbers need this much room between the lines, or they would overlap. */
const ICON_ROOM = 13;
const RETRY = 60_000;
const CHARTS: ChartKind[] = ["average", "difference"];

const CLASS_ICONS: Record<BearingClass, string> = {
    does_not_bear: "mdi:water-alert",
    walking: "mdi:walk",
    snowmobile: "mdi:snowmobile",
    car: "mdi:car",
};
const OLD_COLOR = "var(--syke-old)";

/** One way of drawing the card, from the richest to a single row. */
interface Form {
    /** Whether it starts with a header the spare room goes under. One without is centred. */
    header: boolean;
    row?: boolean;
    /** The chart's height on automatic rows; a form without it has no chart. */
    chart?: number;
    /** The least the chart is drawn with when held, 90 px unless the form says otherwise. */
    least?: number;
    render(chart: number): TemplateResult;
}

/**
 * The locales Home Assistant's number format setting asks for, as its own frontend reads it: `numberFormatToLocale`, except
 * none, which `formatNumberToParts` writes in en-US without grouping.
 */
function numberLocale(hass: HomeAssistant | undefined, language: string): string | string[] | undefined {
    switch (hass?.locale?.number_format) {
        case "comma_decimal":
            return ["en-US", "en"];
        case "decimal_comma":
            return ["de", "es", "it"];
        case "space_comma":
            return ["fr", "sv", "cs"];
        case "quote_decimal":
            return ["de-CH"];
        case "none":
            return "en-US";
        case "system":
            return undefined;
        default:
            return language;
    }
}

interface CardRegistration {
    type: string;
    name: string;
    description: string;
    documentationURL?: string;
    preview?: boolean;
}

export class SykeHydrologyCard extends LitElement {
    @property({ attribute: false }) public hass?: HomeAssistant;
    @property({ attribute: false }) public layout?: string;
    @state() private config?: SykeCardConfig;
    @state() private data?: CardData;
    @state() private error?: string;
    /** The form drawn, by its place in `forms()`, and its chart's height. */
    @state() private form = 0;
    @state() private chartHeight = 0;
    /** The content's width, which the charts are drawn for. */
    @state() private width = 0;
    /** On automatic rows, the height that fills the card's rows and the room that leaves for the chart. */
    @state() private filled = 0;
    @state() private spare = 0;
    /** A card held to a limit it would grow past, in pixels. */
    @state() private held = 0;
    /** The day pointed at in the chart, whose values the tooltip shows. */
    @state() private pointed?: string;
    /** What the data was fetched for, so it is fetched again only when the sensor changes. */
    private fetchedFor?: string;
    /** The day the card was last drawn on. */
    private drawnDay?: string;
    private retry?: number;
    private frame?: number;
    private readonly resizes = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => this.measureSoon());
    private observed?: Element;

    public static getConfigElement(): HTMLElement {
        return document.createElement("syke-hydrology-card-editor");
    }

    /** Offers the first measurement of the integration when the card is added from the picker. */
    public static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
        return { entity: (hass ? cardEntities(hass)[0] : undefined) ?? "" };
    }

    public setConfig(config: SykeCardConfig): void {
        const language = browserLanguage();
        if (!config?.entity || typeof config.entity !== "string") {
            throw new Error(translate(language, "error.invalid_configuration"));
        }
        if (config.chart != null && !CHARTS.includes(config.chart)) {
            throw new Error(translate(language, "error.invalid_chart"));
        }
        if (!validHeight(config)) {
            throw new Error(translate(language, "error.invalid_height"));
        }
        if (!validRowStep(config)) {
            throw new Error(translate(language, "error.invalid_row_step"));
        }
        if (config.entity !== this.config?.entity) {
            this.data = undefined;
            this.fetchedFor = undefined;
        }
        this.config = { ...config };
    }

    public getCardSize(): number {
        return heightCardSize(this.config ?? {}, 5, MIN_HEIGHT);
    }

    public getGridOptions(): Record<string, unknown> {
        return { columns: 12, rows: "auto", min_columns: 6, min_rows: gridMinRows(MIN_HEIGHT) };
    }

    public connectedCallback(): void {
        super.connectedCallback();
        if (this.hass) {
            this.requestUpdate();
        }
    }

    public disconnectedCallback(): void {
        super.disconnectedCallback();
        this.resizes?.disconnect();
        this.observed = undefined;
        cancelAnimationFrame(this.frame ?? 0);
        if (this.retry !== undefined) {
            window.clearTimeout(this.retry);
            this.retry = undefined;
            this.fetchedFor = undefined;
        }
    }

    protected shouldUpdate(changed: PropertyValues): boolean {
        if ([...changed.keys()].some((key) => key !== "hass") || !this.config) {
            return true;
        }
        const previous = changed.get("hass") as HomeAssistant | undefined;
        return (
            !previous ||
            this.stationEntities().some((id) => previous.states[id] !== this.hass?.states[id]) ||
            // A new day moves today's line and the measurements' ages, and is when the averages move on.
            this.today() !== this.drawnDay ||
            // The registry names the sensor, and it can come in after the states. The frontend builds the function that
            // reads the name from it a moment later still, so a change of either is drawn.
            previous.entities !== this.hass?.entities ||
            previous.formatEntityName !== this.hass?.formatEntityName ||
            previous.locale !== this.hass?.locale ||
            previous.language !== this.hass?.language
        );
    }

    protected render(): TemplateResult | typeof nothing {
        if (!this.hass || !this.config) {
            return nothing;
        }
        if (!this.hass.states[this.config.entity]) {
            return this.message(this.text("error.entity_not_found", { entity: this.config.entity }));
        }
        if (this.error) {
            return this.message(this.error);
        }
        if (!this.data) {
            return html`<ha-card style=${this.cardStyle()}><div class="card"></div></ha-card>`;
        }
        const forms = this.forms(this.data);
        const form = forms[Math.min(this.form, forms.length - 1)];
        const chart = this.chartHeight || form.chart || MIN_CHART;
        const held = this.isHeld();
        return html`
            <ha-card class=${[held ? "held" : "", form.header ? "" : "centred"].join(" ")} style=${this.cardStyle()}>
                <div class="card ${form.row ? "row-card" : ""}">${this.width ? form.render(chart) : nothing}</div>
            </ha-card>
            <div class="measurer" aria-hidden="true"></div>
        `;
    }

    protected updated(changed: PropertyValues): void {
        this.drawnDay = this.today();
        void this.fetch();
        const card = this.renderRoot.querySelector("ha-card");
        if (card && card !== this.observed) {
            this.resizes?.disconnect();
            this.resizes?.observe(card);
            this.observed = card;
        }
        if (![...changed.keys()].every((key) => ["filled", "spare", "chartHeight", "held", "pointed"].includes(String(key)))) {
            this.measureSoon();
        }
    }

    private async fetch(): Promise<void> {
        const hass = this.hass;
        const entity = this.config?.entity;
        const state = entity ? hass?.states[entity] : undefined;
        if (!hass?.callWS || !entity || !state || this.retry !== undefined) {
            return;
        }
        // A new measurement can leave the card's own sensor as it was, such as the ice bearing a car before and after,
        // but it changes another sensor of the station, such as the day the ice was measured.
        const key = [entity, this.today(), ...this.stationEntities().map((id) => hass.states[id]?.last_updated ?? "")].join("|");
        if (key === this.fetchedFor) {
            return;
        }
        this.fetchedFor = key;
        try {
            const data = await hass.callWS<CardData>({ type: "syke_hydrology/card", entity_id: entity });
            if (key === this.fetchedFor) {
                this.data = data;
                this.error = undefined;
            }
        } catch (error) {
            if (key !== this.fetchedFor) {
                return;
            }
            const code = (error as { code?: string })?.code;
            if (code === "not_supported" || code === "not_found") {
                this.error = this.text("error.not_supported", { entity });
                return;
            }
            this.error = this.text("error.fetch_failed");
            this.retry = window.setTimeout(() => {
                this.retry = undefined;
                this.fetchedFor = undefined;
                this.error = undefined;
            }, RETRY);
        }
    }

    /** The card's sensor and the other sensors of its station, found through its device in the registry. */
    private stationEntities(): string[] {
        const entity = this.config?.entity ?? "";
        const device = this.hass?.entities?.[entity]?.device_id;
        if (!device) {
            return [entity];
        }
        return [
            entity,
            ...Object.values(this.hass?.entities ?? {}).flatMap((entry) =>
                entry && entry.device_id === device && entry.entity_id !== entity ? [entry.entity_id] : [],
            ),
        ];
    }

    private measureSoon(): void {
        cancelAnimationFrame(this.frame ?? 0);
        this.frame = requestAnimationFrame(() => this.measure());
    }

    /**
     * The content's width, then the form: on automatic rows the richest, filling whole rows with its chart, and held to
     * a height the richest that fits it with its chart at least 90 px, the chart taking what is left.
     */
    private measure(): void {
        const card = this.renderRoot.querySelector<HTMLElement>("ha-card");
        const inner = card?.querySelector<HTMLElement>(":scope > .card");
        if (!card || !inner || !card.clientWidth || !this.data || !this.config) {
            return;
        }
        const style = getComputedStyle(inner);
        const width = Math.floor(inner.clientWidth - px(style.paddingLeft) - px(style.paddingRight));
        if (width !== this.width) {
            this.width = width;
            return;
        }
        const forms = this.forms(this.data);
        const room = this.room(card, forms);
        if (room === undefined) {
            this.form = 0;
            this.held = 0;
            this.fillRows(card, inner, forms[0]);
            return;
        }
        this.filled = 0;
        this.spare = 0;
        // The copy measured has the card's padding but not its border.
        const chrome = px(getComputedStyle(card).borderTopWidth) + px(getComputedStyle(card).borderBottomWidth);
        let chosen = forms.length - 1;
        let chart = 0;
        for (const [index, form] of forms.entries()) {
            const least = form.least ?? MIN_CHART;
            const needed = this.measureForm(form, form.chart ? least : 0, card.clientWidth) + chrome;
            if (needed <= room + 0.01) {
                chosen = index;
                chart = form.chart ? least + Math.floor(room - needed) : 0;
                break;
            }
        }
        this.form = chosen;
        this.chartHeight = chart;
    }

    /**
     * The height the card is held to, or undefined on automatic rows. A card growing up to a limit is held only once its
     * richest form wouldn't fit under it.
     */
    private room(card: HTMLElement, forms: Form[]): number | undefined {
        const config: SykeCardConfig | Record<string, never> = this.config ?? {};
        const mode = heightMode(config);
        if (mode === "max" && config.max_height && heightStyle(config, this.layout, MIN_HEIGHT).startsWith("max-height")) {
            const limit = Math.max(config.max_height, MIN_HEIGHT);
            const chrome = px(getComputedStyle(card).borderTopWidth) + px(getComputedStyle(card).borderBottomWidth);
            const richest = this.measureForm(forms[0], forms[0].chart ?? 0, card.clientWidth, false) + chrome;
            if (richest <= limit) {
                this.held = 0;
                return undefined;
            }
            this.held = limit;
            return limit;
        }
        if (!heightStyle(config, this.layout, MIN_HEIGHT)) {
            return undefined;
        }
        // The whole card, border included, as each form's height is measured with the border added.
        return card.offsetHeight;
    }

    /**
     * A form's height at the card's width, drawn in a hidden copy so the card itself never changes size to be measured.
     * Held, its texts keep to one line, as the card's do.
     */
    private measureForm(form: Form, chart: number, width: number, held = true): number {
        const measurer = this.renderRoot.querySelector<HTMLElement>(".measurer");
        if (!measurer) {
            return 0;
        }
        measurer.style.width = `${width}px`;
        render(
            html`<div class=${held ? "held" : ""}>
                <div class="card ${form.row ? "row-card" : ""} measured-copy">${form.render(chart)}</div>
            </div>`,
            measurer,
        );
        const height = measurer.querySelector(".measured-copy")?.getBoundingClientRect().height ?? 0;
        render(nothing, measurer);
        const card = this.renderRoot.querySelector<HTMLElement>("ha-card");
        return height / (card ? drawnScale(card) : 1);
    }

    /**
     * On automatic rows in a sections view, the card takes the whole rows its content needs, or the half rows with
     * `row_step: half`, up to the limit of a card that grows up to one. The chart takes the room left over.
     */
    private fillRows(card: HTMLElement, inner: HTMLElement, form: Form): void {
        const limit = fillLimit(this.config ?? {}, this.layout, MIN_HEIGHT);
        if (!limit) {
            this.filled = 0;
            this.spare = 0;
            this.chartHeight = form.chart ?? 0;
            return;
        }
        const last = inner.lastElementChild;
        if (!last) {
            return;
        }
        // From the card's top to the end of its own last part, less the room the chart was given, as drawn now.
        const content =
            (last.getBoundingClientRect().bottom - card.getBoundingClientRect().top) / drawnScale(card) +
            px(getComputedStyle(inner).paddingBottom) +
            px(getComputedStyle(card).borderBottomWidth) -
            Math.max(0, this.chartHeight - (form.chart ?? 0));
        const filled = filledHeight(content, this.config ?? {}, limit);
        this.filled = filled;
        this.spare = spareRoom(filled, content);
        this.chartHeight = (form.chart ?? 0) + (form.chart ? this.spare : 0);
    }

    /** Whether the card is held to a height, so its texts keep to one line. */
    private isHeld(): boolean {
        return this.held > 0 || (heightStyle(this.config ?? {}, this.layout, MIN_HEIGHT) !== "" && !this.growsToLimit());
    }

    /** A card with `height_mode: max` is held only once its content passes the limit. */
    private growsToLimit(): boolean {
        return heightMode(this.config ?? {}) === "max" && heightStyle(this.config ?? {}, this.layout, MIN_HEIGHT).startsWith("max-height");
    }

    private cardStyle(): string {
        if (this.held) {
            return `height: ${this.held}px`;
        }
        return filledStyle(this.config ?? {}, this.layout, MIN_HEIGHT, this.filled);
    }

    // ---- The forms ----

    private forms(data: CardData): Form[] {
        return data.kind === "measurement" ? this.measurementForms(data) : this.iceForms(data);
    }

    private measurementForms(data: MeasurementData): Form[] {
        const difference = this.config?.chart === "difference";
        const draw = (height: number) =>
            this.chartRoom(
                difference
                    ? differenceChart(data, this.today(), this.width, height, this.formats())
                    : averageChart(data, this.today(), this.width, height, this.formats()),
                (day) => this.measurementTip(data, day),
            );
        const chart = difference ? DIFFERENCE_CHART : MEASUREMENT_CHART;
        return [
            {
                header: true,
                chart,
                render: (height) => html`${this.measurementHeader(data)} ${draw(height)} ${this.measurementFoot(data, difference)}`,
            },
            {
                header: true,
                chart,
                render: (height) => html`${this.measurementHeader(data)} ${draw(height)}`,
            },
            // Two rows: the row with the past and coming weeks under it, as wide as the card.
            {
                header: true,
                row: true,
                chart: SPARK_CHART,
                least: SPARK_CHART,
                render: (height) =>
                    html`${this.measurementRow(data)}
                        <div class="spark-room">${sparkline(data, this.today(), height)}</div>`,
            },
            { header: false, row: true, render: () => this.measurementRow(data) },
        ];
    }

    private iceForms(data: IceData): Form[] {
        const day = this.today();
        const now = iceOn(data, day);
        const winter = winterOf(day);
        const gaugePart = now
            ? html`<div class="gauge-room">${gauge(now, data, averageOn(data.average, day), this.width, this.formats())}</div>`
            : nothing;
        return [
            {
                header: true,
                chart: ICE_CHART,
                render: (height) =>
                    html`${this.iceHeader(data, now, winter)} ${this.iceChart(data, winter, height)} ${this.iceLegend(data, winter)}
                    ${this.oldLine(data, now)} ${this.seasonRows(data, winter)}`,
            },
            {
                header: true,
                chart: ICE_CHART,
                render: (height) =>
                    html`${this.iceHeader(data, now, winter)} ${this.iceChart(data, winter, height)} ${this.iceLegend(data, winter)}
                    ${this.oldLine(data, now)}`,
            },
            {
                header: false,
                render: () =>
                    html`${this.iceTop(data, now)} ${gaugePart} ${this.layers(now)} ${this.oldLine(data, now)}
                    ${this.seasonRows(data, winter)}`,
            },
            { header: false, render: () => html`${this.iceTop(data, now)} ${gaugePart} ${this.layers(now)} ${this.oldLine(data, now)}` },
            { header: false, render: () => html`${this.iceTop(data, now)} ${gaugePart} ${this.oldLine(data, now)}` },
            { header: false, render: () => this.iceTop(data, now) },
            { header: false, row: true, render: () => this.iceRow(data, now, winter) },
        ];
    }

    // ---- A measurement ----

    private measurementName(data: MeasurementData): string {
        const state = data.entity_id ? this.hass?.states[data.entity_id] : undefined;
        if (!state) {
            return data.measurement;
        }
        return this.hass?.formatEntityName?.(state, [{ type: "entity" }]) || String(state.attributes.friendly_name ?? data.measurement);
    }

    /** The decimals the measurement's sensor is shown with. */
    private decimals(data: MeasurementData): number {
        const entry = data.entity_id ? this.hass?.entities?.[data.entity_id] : undefined;
        if (typeof entry?.display_precision === "number") {
            return entry.display_precision;
        }
        return data.unit === "m" ? 2 : data.unit === "cm" || data.unit === "mm" ? 0 : 1;
    }

    /** The newest value's difference from its average, short, so the header keeps to one line whenever it can. */
    private differenceText(data: MeasurementData): string | undefined {
        const point = currentPoint(data, this.today());
        const value = point ? difference(data, point) : undefined;
        if (value === undefined) {
            return undefined;
        }
        const shown = differenceIn(data.unit, value);
        const decimals = shown.unit === "cm" || shown.unit === "mm" ? 0 : this.decimals(data);
        const rounded = Number(shown.value.toFixed(decimals));
        if (rounded === 0) {
            return this.text("card.at_average");
        }
        const amount = `${this.number(Math.abs(rounded), decimals)} ${shown.unit ?? ""}`.trim();
        return this.text(rounded > 0 ? "card.above" : "card.below", { value: amount });
    }

    private measurementHeader(data: MeasurementData): TemplateResult {
        const day = this.today();
        const point = currentPoint(data, day);
        const last = lastMeasured(data);
        const sub = point
            ? this.text("card.measured", { day: this.day(point[0]) })
            : last
              ? this.text("card.measured", { day: this.day(last, true) })
              : "";
        const delta = this.differenceText(data);
        return html`<div class="header">
            <div class="titles">
                <div class="name one-line" title=${this.measurementName(data)}>${this.measurementName(data)}</div>
                <div class="sub one-line">${[data.station, sub].filter(Boolean).join(" · ")}</div>
            </div>
            ${
                point
                    ? html`<div class="value">
                          <div class="number">
                              ${this.number(point[1], this.decimals(data))} <span class="unit">${data.unit ?? ""}</span>
                          </div>
                          ${delta ? html`<span class="chip ${(difference(data, point) ?? 0) > 0 ? "above" : ""}">${delta}</span>` : nothing}
                      </div>`
                    : nothing
            }
        </div>`;
    }

    private aheadText(data: MeasurementData): string {
        const day = this.today();
        const now = averageOn(data.average, day, data.average_back);
        let ahead = 60;
        while (ahead >= 14 && averageOn(data.average, addDays(day, ahead), data.average_back) === undefined) {
            ahead -= 1;
        }
        const later = averageOn(data.average, addDays(day, ahead), data.average_back);
        if (later === undefined || ahead < 14) {
            return "";
        }
        if (now === undefined) {
            return this.text("card.later", {
                value: `${this.number(later, this.decimals(data))} ${data.unit ?? ""}`.trim(),
                days: String(ahead),
            });
        }
        const change = differenceIn(data.unit, later - now);
        const decimals = change.unit === "cm" || change.unit === "mm" ? 0 : this.decimals(data);
        const rounded = Number(change.value.toFixed(decimals));
        const sign = rounded > 0 ? "+" : rounded === 0 ? "±" : "";
        const value = `${sign}${this.number(rounded, decimals)} ${change.unit ?? ""}`.trim();
        return this.text("card.change", { value, days: String(ahead) });
    }

    private measurementFoot(data: MeasurementData, difference: boolean): TemplateResult {
        const ahead = this.aheadText(data);
        if (difference) {
            const unit = differenceIn(data.unit, 0).unit ?? "";
            return html`<div class="foot">
                <span>${this.text("card.difference_axis", { unit })}</span><span class="ahead">${ahead}</span>
            </div>`;
        }
        return html`<div class="foot">
            <span class="legend"><i class="line measured"></i>${this.text("card.legend_measured")}</span>
            <span class="legend"><i class="line average"></i>${this.averageLegend(data.years)}</span>
            <span class="ahead">${ahead}</span>
        </div>`;
    }

    private measurementRow(data: MeasurementData): TemplateResult {
        const point = currentPoint(data, this.today());
        const last = lastMeasured(data);
        const state = data.entity_id ? this.hass?.states[data.entity_id] : undefined;
        const delta = this.differenceText(data);
        return html`<div class="row">
            <div class="row-icon"><ha-state-icon .hass=${this.hass} .stateObj=${state}></ha-state-icon></div>
            <div class="row-titles">
                <div class="one-line">${this.measurementName(data)}</div>
                <div class="one-line sub">${[data.station, last ? this.day(last, !point) : ""].filter(Boolean).join(" · ")}</div>
            </div>
            <div class="spacer"></div>
            ${
                point
                    ? html`<div class="row-value">
                          <div class="number">
                              ${this.number(point[1], this.decimals(data))} <span class="unit">${data.unit ?? ""}</span>
                          </div>
                          ${delta ? html`<span class="chip ${(difference(data, point) ?? 0) > 0 ? "above" : ""}">${delta}</span>` : nothing}
                      </div>`
                    : nothing
            }
        </div>`;
    }

    // ---- The ice ----

    private winterName(winter: number): string {
        return `${winter}–${String(winter + 1).slice(2)}`;
    }

    private classColor(now: IceNow): string {
        return now.old ? OLD_COLOR : CLASS_COLORS[now.bearingClass];
    }

    private iceHeader(data: IceData, now: IceNow | undefined, winter: number): TemplateResult {
        const title = data.measures_ice ? this.text("ice.winter", { winter: this.winterName(winter) }) : this.text("ice.dates_only");
        if (!now) {
            const last = data.measurements.at(-1)?.day;
            const sub = data.measures_ice
                ? last
                    ? this.text("card.measured", { day: this.day(last, true) })
                    : this.text("ice.never")
                : "";
            return html`<div class="header">
                <div class="titles">
                    <div class="name one-line">${title}</div>
                    <div class="sub one-line">${[data.station, sub].filter(Boolean).join(" · ")}</div>
                </div>
                ${data.measures_ice ? html`<div class="value"><span class="chip neutral">${this.text("ice.no_ice")}</span></div>` : nothing}
            </div>`;
        }
        const m = now.measurement;
        const age = html`<span class=${now.old ? "old" : ""}>${this.age(now.age)}</span>`;
        const total = now.measurement.weak
            ? this.text("ice.weak_short")
            : m.total !== null
              ? this.text("ice.total", { value: this.number(m.total, 0) })
              : "";
        return html`<div class="header">
            <div class="titles">
                <div class="name one-line">${title}</div>
                <div class="sub one-line">${data.station} · ${this.day(m.day)}, ${age}${total ? ` · ${total}` : ""}</div>
            </div>
            <div class="value">
                <div class="number">${this.number(now.bearing, 0)} <span class="unit">cm</span></div>
                <span class="chip" style=${this.chipStyle(this.classColor(now))}
                    ><ha-icon .icon=${CLASS_ICONS[now.bearingClass]}></ha-icon>${this.text(`ice.class.${now.bearingClass}`)}</span
                >
            </div>
        </div>`;
    }

    private iceChart(data: IceData, winter: number, height: number): TemplateResult {
        const drawn = winterChart(data, this.today(), winter, this.width, height, this.formats());
        const { limits } = drawn;
        const spaced = limits.every((mark, index) => index === 0 || Math.abs(mark.y - limits[index - 1].y) >= ICON_ROOM);
        // While this winter has no measurement, pointing snaps to last winter's, which are drawn instead.
        const ghost = lastWinter(data, winter, this.today());
        const days = ghost.size ? [...ghost.keys()] : data.measurements.map((m) => m.day);
        return this.chartRoom(
            drawn,
            (day) => this.iceTip(data, day, ghost),
            html`${
                spaced
                    ? limits.map(
                          (mark) =>
                              html`<ha-icon
                                  class="limit-icon"
                                  .icon=${CLASS_ICONS[mark.limit]}
                                  style=${`top: ${mark.y - 6}px; left: ${WINTER_LEFT - 34}px; color: ${CLASS_COLORS[mark.limit]}`}
                              ></ha-icon>`,
                      )
                    : nothing
            }`,
            days,
        );
    }

    // ---- Pointing at a chart ----

    /** A chart with the day pointed at in it: a line on the day and its values in a box beside it. */
    private chartRoom(
        drawn: Drawn,
        tip: (day: string) => TemplateResult[],
        extra: TemplateResult | typeof nothing = nothing,
        stops?: string[],
    ): TemplateResult {
        const { frame } = drawn;
        const last = addDays(frame.from, frame.days);
        const inFrame = stops?.filter((day) => day >= frame.from && day <= last).sort();
        const snap = (day: string) => (inFrame ? nearest(inFrame, day) : day);
        const pointed = this.pointed && this.pointed >= frame.from && this.pointed <= last ? this.pointed : undefined;
        const x = pointed ? xOf(frame, pointed) : 0;
        const flip = x > (frame.left + frame.right) / 2;
        return html`<div
            class="chart-room"
            tabindex="0"
            role="group"
            aria-label=${this.text("tooltip.chart")}
            @pointermove=${(event: PointerEvent) => this.point(event, frame, snap)}
            @pointerdown=${(event: PointerEvent) => this.point(event, frame, snap)}
            @pointerleave=${(event: PointerEvent) => {
                if (event.pointerType === "mouse") {
                    this.pointed = undefined;
                }
            }}
            @keydown=${(event: KeyboardEvent) => this.step(event, frame, inFrame)}
            @blur=${() => (this.pointed = undefined)}
        >
            ${drawn.chart} ${extra}
            ${
                pointed
                    ? html`<div class="pointer" style=${`left: ${x}px`}></div>
                          <div class="tip" style=${flip ? `right: ${this.width - x + 8}px` : `left: ${x + 8}px`}>
                              <div class="tip-day">${this.day(pointed, true)}</div>
                              ${tip(pointed).map((line) => html`<div>${line}</div>`)}
                          </div>`
                    : nothing
            }
        </div>`;
    }

    private point(event: PointerEvent, frame: ChartFrame, snap: (day: string) => string): void {
        const room = event.currentTarget as HTMLElement;
        const box = room.getBoundingClientRect();
        // Drawn sizes are scaled in a dialog's opening animation, the chart's own are not.
        const scale = box.width / (room.offsetWidth || box.width || 1);
        this.pointed = snap(dayAt(frame, (event.clientX - box.left) / scale));
    }

    /**
     * The arrow keys move the day pointed at: on a chart of measurements made now and then, such as the winter's ice,
     * from one measurement to the next, and on a daily one by a day. Escape closes the tooltip.
     */
    private step(event: KeyboardEvent, frame: ChartFrame, stops?: string[]): void {
        if (event.key === "Escape") {
            this.pointed = undefined;
            return;
        }
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
            return;
        }
        event.preventDefault();
        this.pointed = stepDay(this.pointed, event.key === "ArrowLeft" ? -1 : 1, frame, stops);
    }

    private measurementTip(data: MeasurementData, day: string): TemplateResult[] {
        const lines: TemplateResult[] = [];
        const point = data.points.find(([d]) => d === day);
        const average = averageOn(data.average, day, data.average_back);
        const unit = data.unit ?? "";
        const decimals = this.decimals(data);
        if (point) {
            const value = `${this.number(point[1], decimals)} ${unit}`.trim();
            lines.push(html`<i class="tip-line measured"></i>${this.text("tooltip.measured", { value })}`);
        }
        if (average !== undefined) {
            const value = `${this.number(average, decimals)} ${unit}`.trim();
            lines.push(html`<i class="tip-line average"></i>${this.text("tooltip.average", { value })}`);
        }
        if (point && average !== undefined) {
            const shown = differenceIn(data.unit, point[1] - average);
            const places = shown.unit === "cm" || shown.unit === "mm" ? 0 : decimals;
            const rounded = Number(shown.value.toFixed(places));
            const value = `${rounded > 0 ? "+" : ""}${this.number(rounded, places)} ${shown.unit ?? ""}`.trim();
            lines.push(html`${this.text("tooltip.difference", { value })}`);
        }
        return lines;
    }

    private iceTip(data: IceData, day: string, ghost: Map<string, IceMeasurement>): TemplateResult[] {
        const lines: TemplateResult[] = [];
        const last = ghost.get(day);
        const measurement = last ?? data.measurements.find((m) => m.day === day);
        if (last) {
            lines.push(html`<i class="tip-line ghost"></i>${this.text("tooltip.last_winter", { day: this.day(last.day, true) })}`);
        }
        if (measurement && measurement.bearing !== null) {
            const kind = bearingClass(measurement.bearing, data.limits);
            const text = measurement.weak
                ? this.text("ice.weak_short")
                : this.text("tooltip.bearing", { value: this.number(measurement.bearing, 0) });
            lines.push(html`<i class="tip-dot" style=${`background: ${CLASS_COLORS[kind]}`}></i>${text}`);
            lines.push(html`${this.text(`ice.class.${kind}`)}`);
        }
        const average = averageOn(data.average, day);
        if (average !== undefined && average >= 0.5) {
            lines.push(html`<i class="tip-line average"></i>${this.text("tooltip.average_bearing", { value: this.number(average, 0) })}`);
        }
        if (data.events.freeze_up?.day === day) {
            lines.push(html`${this.text("ice.froze")}`);
        }
        if (data.events.break_up?.day === day) {
            lines.push(html`${this.text("ice.thawed")}`);
        }
        return lines;
    }

    private iceLegend(data: IceData, winter: number): TemplateResult {
        // In a winter with nothing measured yet, the line drawn is last winter's.
        const ghost = lastWinter(data, winter, this.today()).size > 0;
        return html`<div class="foot">
            ${
                ghost
                    ? html`<span class="legend"><i class="line ghost"></i>${this.text("ice.last_winter")}</span>`
                    : html`<span class="legend"><i class="line measured"></i>${this.text("ice.legend_bearing")}</span>`
            }
            <span class="legend"><i class="line average"></i>${this.averageLegend(data.years)}</span>
            <span class="legend"><i class="line freeze"></i>${this.text("ice.froze")}</span>
            <span class="legend"><i class="line thaw"></i>${this.text("ice.legend_thawed")}</span>
        </div>`;
    }

    private oldLine(data: IceData, now: IceNow | undefined): TemplateResult | typeof nothing {
        return now?.old
            ? html`<div class="old-line">
                  <ha-icon icon="mdi:clock-alert-outline"></ha-icon>
                  <span>${this.text("ice.old", { days: String(data.max_age) })}</span>
              </div>`
            : nothing;
    }

    /** The winter's freeze-up and break-up against their averages, or the coming freeze-up and how the last winter went. */
    private seasonRows(data: IceData, winter: number): TemplateResult | typeof nothing {
        const day = this.today();
        const freeze = data.events.freeze_up;
        const breakUp = data.events.break_up;
        if (!freeze && !breakUp) {
            return nothing;
        }
        const rows: [string, TemplateResult | string][] = [];
        const versus = (actual: string, average: string | undefined) => {
            if (!average) {
                return this.day(actual);
            }
            const days = daysBetween(average, actual);
            if (days === 0) {
                return html`${this.day(actual)} · ${this.text("card.at_average")}`;
            }
            const key = days > 0 ? "ice.later_than_average" : "ice.earlier_than_average";
            return html`${this.day(actual)} ·
                <span class=${days > 0 ? "late" : "early"}>${this.text(key, { days: String(Math.abs(days)) })}</span>`;
        };
        const coming = (average: string | undefined) =>
            average ? this.text("ice.on_average_day", { day: this.day(average), when: this.when(daysBetween(day, average)) }) : "–";
        const froze = eventIn(freeze, winter);
        if (froze) {
            rows.push([this.text("ice.froze"), versus(froze, freeze && averageDay(freeze, winter))]);
            const thawed = eventIn(breakUp, winter);
            if (thawed) {
                rows.push([this.text("ice.thawed"), versus(thawed, breakUp && averageDay(breakUp, winter))]);
            } else if (breakUp) {
                rows.push([this.text("ice.thaws"), coming(averageDay(breakUp, winter))]);
            }
        } else {
            if (freeze) {
                rows.push([this.text("ice.freezes"), coming(averageDay(freeze, winter))]);
            }
            const lastFroze = eventIn(freeze, winter - 1);
            const lastThawed = eventIn(breakUp, winter - 1);
            if (lastFroze || lastThawed) {
                const relative = (actual: string, average: string | undefined) => {
                    const days = average ? daysBetween(average, actual) : 0;
                    return days === 0
                        ? nothing
                        : html` <span class=${days > 0 ? "late" : "early"}
                              >(${this.text(days > 0 ? "ice.late" : "ice.early", { days: String(Math.abs(days)) })})</span
                          >`;
                };
                // A line each, as the two never fit on one line beside the label.
                const lines = [
                    ...(lastFroze
                        ? [
                              html`${this.text("ice.last_winter_froze", { day: this.day(lastFroze) })}${relative(lastFroze, freeze && averageDay(freeze, winter - 1))}`,
                          ]
                        : []),
                    ...(lastThawed
                        ? [
                              html`${this.text("ice.last_winter_thawed", { day: this.day(lastThawed) })}${relative(lastThawed, breakUp && averageDay(breakUp, winter - 1))}`,
                          ]
                        : []),
                ];
                lines.forEach((line, index) => rows.push([index === 0 ? this.text("ice.last_winter") : "", line]));
            }
        }
        return html`<div class="season">
            ${rows.map(
                ([key, value]) =>
                    html`<div class="season-key">${key}</div>
                        <div class="season-value">${value}</div>`,
            )}
        </div>`;
    }

    /** What the ice bears, how old the measurement is, and the station. */
    private iceTop(data: IceData, now: IceNow | undefined): TemplateResult {
        const where = html`<div class="where one-line">
            ${data.measures_ice ? this.text("ice.title") : this.text("ice.dates_only")} · ${data.station}
        </div>`;
        if (!now) {
            const last = data.measurements.at(-1)?.day;
            return html`<div class="ice-top">
                <div class="ice-icon neutral"><ha-icon icon="mdi:waves"></ha-icon></div>
                <div class="titles">
                    ${where}
                    <div class="big one-line">${this.text("ice.no_ice")}</div>
                    <div class="sub one-line">${last ? this.text("ice.last", { day: this.day(last, true) }) : this.text("ice.never")}</div>
                </div>
            </div>`;
        }
        const color = this.classColor(now);
        return html`<div class="ice-top">
            <div class="ice-icon" style=${this.chipStyle(color)}><ha-icon .icon=${CLASS_ICONS[now.bearingClass]}></ha-icon></div>
            <div class="titles">
                ${where}
                <div class="big one-line">${this.text(`ice.class.${now.bearingClass}`)}</div>
                <div class="sub one-line">
                    ${now.measurement.weak ? this.text("ice.weak") : this.text("ice.bearing", { value: this.number(now.bearing, 0) })}
                </div>
            </div>
            <div class="value">
                <div class="date">${this.day(now.measurement.day)}</div>
                <span class="chip ${now.old ? "old" : ""}">${this.age(now.age)}</span>
            </div>
        </div>`;
    }

    private layers(now: IceNow | undefined): TemplateResult | typeof nothing {
        const m = now?.measurement;
        if (!m || m.weak || m.clear === null) {
            return nothing;
        }
        const snow = m.snow_on_ice ?? 0;
        const snowIce = m.snow_ice ?? 0;
        const total = snow + snowIce + m.clear || 1;
        const share = (value: number) => `width: ${(value / total) * 100}%`;
        return html`<div class="layers">
                <div class="layer snow" style=${share(snow)}></div>
                <div class="layer snow-ice" style=${share(snowIce)}></div>
                <div class="layer clear-ice" style=${share(m.clear)}></div>
            </div>
            <div class="layer-labels">
                <span><i class="snow"></i>${this.text("ice.snow_on_ice", { value: this.number(snow, 0) })}</span>
                <span><i class="snow-ice"></i>${this.text("ice.snow_ice", { value: this.number(snowIce, 0) })}</span>
                <span><i class="clear-ice"></i>${this.text("ice.clear_ice", { value: this.number(m.clear, 0) })}</span>
                ${m.total !== null ? html`<span>${this.text("ice.total_long", { value: this.number(m.total, 0) })}</span>` : nothing}
            </div>`;
    }

    private iceRow(data: IceData, now: IceNow | undefined, winter: number): TemplateResult {
        if (!now) {
            const freeze = data.events.freeze_up;
            const average = freeze ? averageDay(freeze, winter) : undefined;
            const coming = average && average >= this.today() ? average : undefined;
            return html`<div class="row">
                <div class="row-icon neutral"><ha-icon icon="mdi:waves"></ha-icon></div>
                <div class="row-titles">
                    <div class="one-line">${data.measures_ice ? this.text("ice.no_ice") : this.text("ice.dates_only")}</div>
                    <div class="one-line sub">${data.station}</div>
                </div>
                <div class="spacer"></div>
                ${
                    coming
                        ? html`<div class="row-value">
                              <div class="small">${this.text("ice.freezes_short", { day: this.day(coming) })}</div>
                              <span class="chip neutral">${this.when(daysBetween(this.today(), coming))}</span>
                          </div>`
                        : nothing
                }
            </div>`;
        }
        const color = this.classColor(now);
        return html`<div class="row">
            <div class="row-icon" style=${this.chipStyle(color)}><ha-icon .icon=${CLASS_ICONS[now.bearingClass]}></ha-icon></div>
            <div class="row-titles">
                <div class="one-line">${this.text(`ice.class.${now.bearingClass}`)}</div>
                <div class="one-line sub">
                    ${now.measurement.weak ? this.text("ice.weak_short") : `${this.number(now.bearing, 0)} cm`} · ${data.station}
                </div>
            </div>
            <div class="spacer"></div>
            <div class="row-value">
                <div class="small">${this.day(now.measurement.day)}</div>
                <span class="chip ${now.old ? "old" : ""}">${this.age(now.age)}</span>
            </div>
        </div>`;
    }

    // ---- Texts and numbers ----

    /** The average's line in a legend, with its years shortened to two digits each: "1996–2025" is 96–25. */
    private averageLegend(years: string | null): string {
        return years
            ? this.text("card.legend_average", { years: years.replace(/\d{2}(\d{2})/g, "$1") })
            : this.text("card.legend_average_plain");
    }

    private chipStyle(color: string): string {
        return `background: color-mix(in srgb, ${color} 22%, transparent); color: ${color}`;
    }

    private age(days: number): string {
        return days === 0 ? this.text("ice.measured_today") : this.text("ice.days_ago", { days: String(days) });
    }

    private when(days: number): string {
        if (days === 0) {
            return this.text("card.today");
        }
        return days > 0 ? this.text("ice.in_days", { days: String(days) }) : this.text("ice.days_ago", { days: String(-days) });
    }

    private today(): string {
        return today(this.hass);
    }

    private formats(): Formats {
        return { number: (value, decimals) => this.number(value, decimals), day: (day) => this.day(day), text: (key) => this.text(key) };
    }

    private number(value: number, decimals: number): string {
        return new Intl.NumberFormat(numberLocale(this.hass, this.language()), {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
            useGrouping: this.hass?.locale?.number_format !== "none",
        }).format(value);
    }

    /** A day as its day and month, with the year when asked for. */
    private day(day: string, year = false): string {
        return new Intl.DateTimeFormat(this.language(), {
            day: "numeric",
            month: "numeric",
            year: year ? "numeric" : undefined,
            timeZone: "UTC",
        }).format(new Date(`${day}T00:00:00Z`));
    }

    private message(text: string): TemplateResult {
        return html`<ha-card><div class="card message">${text}</div></ha-card>`;
    }

    private text(key: string, replacements: Record<string, string> = {}): string {
        let text = translate(this.language(), key);
        for (const [name, value] of Object.entries(replacements)) {
            text = text.replaceAll(`{${name}}`, value);
        }
        return text;
    }

    private language(): string {
        return this.hass?.locale?.language ?? this.hass?.language ?? browserLanguage();
    }

    static get styles(): CSSResultGroup {
        return css`
            /* As tall as a sections view's grid rows make its cell, which a card held by them fills. */
            :host {
                display: block;
                height: 100%;
                position: relative;
                --syke-measured-color: var(--orange-color, #ff9800);
                --syke-average-color: var(--info-color, #039be5);
                --syke-freeze-color: var(--cyan-color, #00bcd4);
                --syke-thaw-color: var(--green-color, #4caf50);
                --syke-old: var(--syke-old-color, var(--warning-color, #ff9800));
            }
            ha-card {
                height: 100%;
                overflow: hidden;
                transition: none;
                box-sizing: border-box;
            }
            .card,
            .measured-copy {
                display: flex;
                flex-direction: column;
                gap: 0;
                box-sizing: border-box;
                padding: 16px;
                height: 100%;
            }
            .measured-copy {
                height: auto;
            }
            /* 9 px above and below a 36 px row, with ha-card's border, is one row of a sections view. */
            .card.row-card,
            .measured-copy.row-card {
                padding: 9px 16px;
            }
            ha-card.centred .card {
                justify-content: center;
            }
            .measurer {
                position: absolute;
                top: 0;
                left: 0;
                visibility: hidden;
                pointer-events: none;
                contain: layout paint;
            }
            .message {
                color: var(--secondary-text-color);
            }
            .one-line {
                overflow-wrap: anywhere;
            }
            .held .one-line {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                overflow-wrap: normal;
            }

            .header,
            .ice-top {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            .titles {
                flex: 1;
                min-width: 0;
            }
            .name {
                font-size: 16px;
                font-weight: 500;
                line-height: 22px;
            }
            .sub,
            .where {
                font-size: 12.5px;
                color: var(--secondary-text-color);
                line-height: 17px;
            }
            .old {
                color: var(--syke-old);
            }
            .value {
                text-align: end;
                flex: none;
            }
            .number {
                font-size: 24px;
                line-height: 28px;
                white-space: nowrap;
            }
            .unit {
                font-size: 14px;
                color: var(--secondary-text-color);
            }
            .chip {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
                line-height: 18px;
                padding: 0 8px;
                border-radius: 9px;
                white-space: nowrap;
                background: color-mix(in srgb, var(--syke-average-color) 18%, transparent);
                color: var(--syke-average-color);
            }
            .chip.above {
                background: color-mix(in srgb, var(--syke-measured-color) 18%, transparent);
                color: var(--syke-measured-color);
            }
            .chip.neutral {
                background: color-mix(in srgb, var(--secondary-text-color) 16%, transparent);
                color: var(--secondary-text-color);
            }
            .chip.old {
                background: color-mix(in srgb, var(--syke-old) 20%, transparent);
                color: var(--syke-old);
            }
            .chip ha-icon {
                --mdc-icon-size: 14px;
            }

            .chart-room {
                position: relative;
                margin-top: 10px;
                flex: none;
            }
            svg {
                display: block;
                overflow: visible;
            }
            svg text {
                fill: var(--secondary-text-color);
                font-size: 11px;
                font-family: inherit;
            }
            .grid {
                stroke: var(--divider-color);
                stroke-width: 0.6;
            }
            .zero {
                stroke: var(--divider-color);
                stroke-width: 1.2;
            }
            .future {
                fill: color-mix(in srgb, var(--syke-average-color) 7%, transparent);
            }
            .average {
                fill: none;
                stroke: var(--syke-average-color);
                stroke-width: 1.5;
                stroke-dasharray: 5 4;
            }
            .average-area {
                fill: var(--syke-average-color);
                opacity: 0.08;
            }
            .measured {
                fill: none;
                stroke: var(--syke-measured-color);
                stroke-width: 2;
            }
            .last {
                fill: var(--syke-measured-color);
            }
            .today {
                stroke: var(--secondary-text-color);
                stroke-dasharray: 2 3;
            }
            .bar-above {
                fill: var(--syke-measured-color);
            }
            .bar-below {
                fill: var(--syke-average-color);
            }
            /* Dots of 2 px with gaps of 2, as the legend's dotted 2 px line draws them. */
            .ghost {
                fill: none;
                stroke: var(--secondary-text-color);
                stroke-width: 2;
                stroke-dasharray: 2 2;
                opacity: 0.6;
            }
            .point {
                stroke: var(--card-background-color, var(--ha-card-background, #fff));
                stroke-width: 1.5;
            }
            .limit {
                stroke-opacity: 0.55;
                stroke-dasharray: 2 3;
            }
            .freeze,
            .freeze-average {
                stroke: var(--syke-freeze-color);
                stroke-width: 1.3;
            }
            .thaw,
            .thaw-average {
                stroke: var(--syke-thaw-color);
                stroke-width: 1.3;
            }
            .freeze-average,
            .thaw-average {
                stroke-dasharray: 4 3;
            }
            .freeze-average-label {
                fill: var(--syke-freeze-color);
            }
            .thaw-average-label {
                fill: var(--syke-thaw-color);
            }
            .chart-room:focus-visible {
                outline: 2px solid var(--primary-color);
                outline-offset: 2px;
                border-radius: 4px;
            }
            .pointer {
                position: absolute;
                top: 16px;
                bottom: 18px;
                width: 0;
                border-left: 1px solid var(--primary-text-color);
                opacity: 0.5;
                pointer-events: none;
            }
            .tip {
                position: absolute;
                top: 14px;
                padding: 6px 8px;
                border-radius: 6px;
                background: var(--card-background-color, var(--ha-card-background, #fff));
                border: 1px solid var(--divider-color);
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
                font-size: 12px;
                line-height: 17px;
                white-space: nowrap;
                pointer-events: none;
                z-index: 1;
            }
            .tip-day {
                font-weight: 500;
            }
            .tip .tip-line {
                display: inline-block;
                width: 12px;
                border-top: 2px solid;
                vertical-align: middle;
                margin-inline-end: 5px;
            }
            .tip-line.measured {
                border-color: var(--syke-measured-color);
            }
            /* As specific as the legend's own line rule, which comes later and would otherwise make it solid. */
            .legend .line.ghost,
            .tip .tip-line.ghost {
                border-color: var(--secondary-text-color);
                border-top-style: dotted;
                opacity: 0.7;
            }
            .tip-line.average {
                border-color: var(--syke-average-color);
                border-top-style: dashed;
            }
            .tip-dot {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                margin-inline-end: 6px;
            }
            .limit-icon {
                position: absolute;
                --mdc-icon-size: 12px;
                width: 12px;
                height: 12px;
                display: flex;
            }

            .foot {
                display: flex;
                flex-wrap: wrap;
                gap: 2px 14px;
                font-size: 12px;
                color: var(--secondary-text-color);
                margin-top: 6px;
                line-height: 17px;
            }
            .held .foot {
                flex-wrap: nowrap;
                overflow: hidden;
                white-space: nowrap;
            }
            .ahead {
                flex: 1;
                text-align: end;
            }
            .legend .line {
                display: inline-block;
                width: 14px;
                border-top: 2px solid;
                vertical-align: middle;
                margin-inline-end: 4px;
            }
            .line.measured {
                border-color: var(--syke-measured-color);
            }
            .line.average {
                border-color: var(--syke-average-color);
                border-top-style: dashed;
            }
            .line.freeze {
                border-color: var(--syke-freeze-color);
            }
            .line.thaw {
                border-color: var(--syke-thaw-color);
            }

            .ice-icon,
            .row-icon {
                flex: none;
                display: grid;
                place-items: center;
                border-radius: 50%;
            }
            .ice-icon {
                width: 48px;
                height: 48px;
                --mdc-icon-size: 26px;
            }
            .neutral {
                background: color-mix(in srgb, var(--secondary-text-color) 16%, transparent);
                color: var(--secondary-text-color);
            }
            .big {
                font-size: 18px;
                font-weight: 500;
                line-height: 24px;
            }
            .date,
            .small {
                font-size: 13px;
                color: var(--secondary-text-color);
                line-height: 18px;
            }
            .gauge-room {
                margin-top: 14px;
            }
            .zone {
                opacity: 0.28;
            }
            .gauge-average {
                stroke: var(--syke-average-color);
                stroke-width: 2;
                stroke-dasharray: 3 2;
            }
            .gauge-average-label {
                fill: var(--syke-average-color);
            }
            .gauge-value {
                fill: var(--primary-text-color);
                font-weight: 500;
            }
            .layers {
                display: flex;
                height: 10px;
                border-radius: 3px;
                overflow: hidden;
                margin-top: 4px;
            }
            .snow {
                background: var(--syke-snow-color, #e5e9f0);
            }
            .snow-ice {
                background: var(--syke-snow-ice-color, #9aa5b8);
            }
            .clear-ice {
                background: var(--syke-clear-ice-color, #5e81ac);
            }
            .layer-labels {
                display: flex;
                flex-wrap: wrap;
                gap: 2px 12px;
                font-size: 12px;
                color: var(--secondary-text-color);
                margin-top: 4px;
            }
            .layer-labels i {
                display: inline-block;
                width: 9px;
                height: 9px;
                border-radius: 2px;
                margin-inline-end: 4px;
                vertical-align: -1px;
            }
            .old-line {
                display: flex;
                gap: 6px;
                margin-top: 10px;
                font-size: 12.5px;
                color: var(--syke-old);
                --mdc-icon-size: 16px;
            }
            .season {
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 3px 10px;
                font-size: 13px;
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px solid var(--divider-color);
            }
            .season-key {
                color: var(--secondary-text-color);
            }
            .late {
                color: var(--syke-measured-color);
            }
            .early {
                color: var(--syke-average-color);
            }

            .row {
                display: flex;
                align-items: center;
                gap: 10px;
                min-height: 36px;
            }
            .row-icon {
                width: 36px;
                height: 36px;
                --mdc-icon-size: 20px;
                background: color-mix(in srgb, var(--syke-average-color) 14%, transparent);
                color: var(--syke-average-color);
            }
            .row-titles {
                flex: 0 1 auto;
                min-width: 0;
            }
            .row-titles .one-line {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 20px;
                font-weight: 500;
            }
            .row-titles .sub {
                font-weight: 400;
                line-height: 16px;
            }
            .spacer {
                flex: 1;
            }
            .spark-room {
                margin-top: 8px;
            }
            .spark-room svg {
                width: 100%;
            }
            .row-value {
                flex: none;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
            }
            /* A flex pair of a fixed height, as the unit's smaller font, set on the same baseline, would otherwise grow the line past 20 px. */
            .row-value .number {
                display: flex;
                align-items: baseline;
                gap: 3px;
                height: 20px;
                font-size: 17px;
                line-height: 20px;
            }
            .row-value .unit {
                font-size: 12px;
            }
            .row-value .chip {
                line-height: 16px;
            }
        `;
    }
}

/** The nearest of the days within five of the day, as a winter's ice is measured every ten days or so, or the day itself. */
export function nearest(days: string[], day: string): string {
    const near = days.filter((each) => Math.abs(daysBetween(each, day)) <= 5);
    near.sort((a, b) => Math.abs(daysBetween(a, day)) - Math.abs(daysBetween(b, day)));
    return near[0] ?? day;
}

/**
 * The day an arrow key moves to from the day pointed at: the next or previous of `stops` when the chart has them,
 * otherwise a day on, within the chart. With nothing pointed at yet, the first press picks the chart's first or last.
 */
export function stepDay(pointed: string | undefined, direction: 1 | -1, frame: ChartFrame, stops?: string[]): string | undefined {
    const last = addDays(frame.from, frame.days);
    if (stops) {
        if (!stops.length) {
            return pointed;
        }
        if (pointed === undefined) {
            return direction > 0 ? stops[0] : stops[stops.length - 1];
        }
        const next = direction > 0 ? stops.find((day) => day > pointed) : stops.filter((day) => day < pointed).at(-1);
        return next ?? pointed;
    }
    if (pointed === undefined) {
        return direction > 0 ? frame.from : last;
    }
    const next = addDays(pointed, direction);
    return next < frame.from || next > last ? pointed : next;
}

function px(value: string): number {
    return Number.parseFloat(value) || 0;
}

if (!customElements.get("syke-hydrology-card")) {
    console.info(
        `%c  SYKE-HYDROLOGY-CARD \n%c  ${CARD_VERSION}    `,
        "color: orange; font-weight: bold; background: black",
        "color: white; font-weight: bold; background: dimgray",
    );

    const registry = window as unknown as { customCards?: CardRegistration[] };
    registry.customCards = registry.customCards ?? [];
    registry.customCards.push({
        type: "syke-hydrology-card",
        name: translate(browserLanguage(), "common.name"),
        description: translate(browserLanguage(), "common.description"),
        documentationURL: "https://github.com/jesmak/syke_hydrology#hydrology-card",
        preview: true,
    });
    customElements.define("syke-hydrology-card", SykeHydrologyCard);
}

declare global {
    interface HTMLElementTagNameMap {
        "syke-hydrology-card": SykeHydrologyCard;
    }
}
