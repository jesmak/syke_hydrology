import { expect, test, vi } from "vitest";

// The same file loaded twice in one page, as two dashboard resources of the card with different versions in their URLs.
test("the card loaded twice registers once, throws nothing and is listed and logged once", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await import("../src/syke-hydrology-card");
    const card = customElements.get("syke-hydrology-card");
    const editor = customElements.get("syke-hydrology-card-editor");
    vi.resetModules();
    await expect(import("../src/syke-hydrology-card")).resolves.toBeDefined();

    expect(customElements.get("syke-hydrology-card")).toBe(card);
    expect(customElements.get("syke-hydrology-card-editor")).toBe(editor);
    const registry = window as unknown as { customCards?: { type: string }[] };
    expect(registry.customCards?.filter((entry) => entry.type === "syke-hydrology-card")).toHaveLength(1);
    expect(info).toHaveBeenCalledTimes(1);
});
