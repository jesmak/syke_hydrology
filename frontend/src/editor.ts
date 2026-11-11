/**
 * The card's visual editor: the sensor, how a measurement is drawn and the height's rounding. The height mode is set in
 * YAML only.
 */
import { LitElement, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";

import type { HomeAssistant } from "./hass";
import { browserLanguage, translate } from "./localize/localize";
import { rowStepData, rowStepSchema, tidyRowStep } from "./rows";
import type { SykeCardConfig } from "./types";

interface SchemaEntry {
    name: string;
}

/** The measurements first, in the order a station's device lists them, then the ice. */
const FIRST = ["water_level", "discharge", "surface_temperature", "ice_bearing_class"];

/** The integration's sensors the card draws, the measurements' own first. */
export function cardEntities(hass: HomeAssistant): string[] {
    const ours = Object.values(hass.entities ?? {}).filter(
        (entry) => entry?.platform === "syke_hydrology" && entry.entity_id.startsWith("sensor.") && hass.states[entry.entity_id],
    );
    const rank = (key: string | null | undefined) => {
        const index = FIRST.indexOf(key ?? "");
        return index === -1 ? FIRST.length : index;
    };
    return ours
        .filter((entry) => !entry?.translation_key?.endsWith("_average"))
        .sort((a, b) => rank(a?.translation_key) - rank(b?.translation_key))
        .map((entry) => entry?.entity_id ?? "");
}

function schema(config: SykeCardConfig, text: (key: string) => string) {
    return [
        { name: "entity", required: true, selector: { entity: { filter: [{ integration: "syke_hydrology" }] } } },
        {
            name: "chart",
            selector: {
                select: {
                    mode: "dropdown",
                    options: ["average", "difference"].map((value) => ({ value, label: text(`editor.chart_${value}`) })),
                },
            },
        },
        ...rowStepSchema(config, text),
    ];
}

export class SykeHydrologyCardEditor extends LitElement {
    @property({ attribute: false }) public hass?: HomeAssistant;
    @state() private config: SykeCardConfig = { type: "custom:syke-hydrology-card", entity: "" };

    public setConfig(config: SykeCardConfig): void {
        this.config = { ...config };
    }

    protected render(): TemplateResult | typeof nothing {
        if (!this.hass) {
            return nothing;
        }
        return html`
            <ha-form
                .hass=${this.hass}
                .data=${{ chart: "average", ...rowStepData(this.config) }}
                .schema=${schema(this.config, (key) => this.text(key))}
                .computeLabel=${(entry: SchemaEntry) => this.text(`editor.${entry.name}`)}
                .computeHelper=${(entry: SchemaEntry) => this.helper(entry.name)}
                @value-changed=${this.valueChanged}
            ></ha-form>
        `;
    }

    private valueChanged(event: CustomEvent<{ value: SykeCardConfig }>): void {
        const config: SykeCardConfig = tidyRowStep(event.detail.value);
        // The default is shown in the form but left out of the configuration.
        if (config.chart === "average" || config.chart == null) {
            delete config.chart;
        }
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
    }

    private text(key: string): string {
        return translate(this.language(), key);
    }

    private helper(name: string): string | undefined {
        const key = `editor.${name}_helper`;
        const helper = translate(this.language(), key);
        return helper === key ? undefined : helper;
    }

    private language(): string {
        return this.hass?.locale?.language ?? this.hass?.language ?? browserLanguage();
    }
}

if (!customElements.get("syke-hydrology-card-editor")) {
    customElements.define("syke-hydrology-card-editor", SykeHydrologyCardEditor);
}

declare global {
    interface HTMLElementTagNameMap {
        "syke-hydrology-card-editor": SykeHydrologyCardEditor;
    }
}
