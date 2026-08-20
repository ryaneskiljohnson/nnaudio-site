import { describe, expect, it } from "vitest";
import {
  CYMASPHERE_FORMATS,
  CYMASPHERE_META,
  CYMASPHERE_PRESS,
  CYMASPHERE_PRICE_LABEL,
  CYMASPHERE_PRICE_NOTE,
  CYMASPHERE_PRICE_USD,
  CYMASPHERE_SALES,
  isCymasphereSlug,
} from "./cymasphere-sales";

const salesText = JSON.stringify({
  ...CYMASPHERE_SALES,
  ...CYMASPHERE_META,
  press: CYMASPHERE_PRESS,
  price: CYMASPHERE_PRICE_LABEL,
  note: CYMASPHERE_PRICE_NOTE,
});

describe("cymasphere sales copy", () => {
  it("is the locked $149 one-time offer", () => {
    expect(CYMASPHERE_PRICE_USD).toBe(149);
    expect(CYMASPHERE_PRICE_LABEL).toBe("$149");
    expect(CYMASPHERE_PRICE_NOTE.toLowerCase()).toContain("one-time");
    expect(salesText).not.toMatch(/\$499|\$6\b|\$59\b/i);
    expect(salesText.toLowerCase()).not.toMatch(/subscription|\/mo|per month/);
  });

  it("states what it is and the documented formats", () => {
    expect(CYMASPHERE_SALES.lede.toLowerCase()).toContain("harmony");
    expect(CYMASPHERE_SALES.lede.toLowerCase()).toContain("midi");
    expect(CYMASPHERE_FORMATS).toEqual(["VST3", "AU", "Standalone", "iPad"]);
    expect(salesText).not.toMatch(/\bAAX\b/);
    expect(salesText.toLowerCase()).not.toContain("android");
  });

  it("includes short SOS and Attack proof with live links", () => {
    const sources = CYMASPHERE_PRESS.map((item) => item.source);
    expect(sources).toContain("Sound on Sound");
    expect(sources).toContain("Attack Magazine");
    expect(CYMASPHERE_PRESS[0].href).toBe(
      "https://www.soundonsound.com/reviews/cymasphere"
    );
    expect(CYMASPHERE_PRESS[1].href).toBe(
      "https://www.attackmagazine.com/technique/video-tutorials/cymasphere-a-new-complex-chord-generator/"
    );
    expect(CYMASPHERE_PRESS[0].quote.length).toBeGreaterThan(20);
    expect(CYMASPHERE_PRESS[1].quote.length).toBeGreaterThan(20);
  });

  it("does not invent filler, founder story, or CymaSynth as the hero", () => {
    const lower = salesText.toLowerCase();
    expect(lower).not.toContain("push the boundaries");
    expect(lower).not.toContain("intelligent music creation");
    expect(lower).not.toContain("aaron");
    expect(lower).not.toContain("berklee");
    expect(lower).not.toContain("cymasynth");
    expect(lower).not.toContain("serum");
    expect(lower).not.toMatch(/stars?|testimonials?|reviewed by \d+/);
  });

  it("identifies the cymasphere slug", () => {
    expect(isCymasphereSlug("cymasphere")).toBe(true);
    expect(isCymasphereSlug("Cymasphere")).toBe(true);
    expect(isCymasphereSlug("cymasynth")).toBe(false);
  });
});
