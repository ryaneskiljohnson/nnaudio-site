import { describe, expect, it } from "vitest";
import {
  CYMASPHERE_ATTACK,
  CYMASPHERE_FAQ,
  CYMASPHERE_FORMATS,
  CYMASPHERE_INCLUDES_CYMASYNTH,
  CYMASPHERE_META,
  CYMASPHERE_PRICE_LABEL,
  CYMASPHERE_PRICE_NOTE,
  CYMASPHERE_PRICE_USD,
  CYMASPHERE_SALES,
  CYMASPHERE_SOS,
  CYMASPHERE_UNAUDITED_DEMO_VIDEO_ID,
  collectCymasphereDemoVideos,
  filterCymasphereDemoVideos,
  isCymasphereSlug,
} from "./cymasphere-sales";

const salesText = JSON.stringify({
  ...CYMASPHERE_SALES,
  ...CYMASPHERE_META,
  attack: CYMASPHERE_ATTACK,
  sos: CYMASPHERE_SOS,
  faq: CYMASPHERE_FAQ,
  price: CYMASPHERE_PRICE_LABEL,
  note: CYMASPHERE_PRICE_NOTE,
});

describe("cymasphere sales copy", () => {
  it("is the locked $149 one-time offer", () => {
    expect(CYMASPHERE_PRICE_USD).toBe(149);
    expect(CYMASPHERE_PRICE_LABEL).toBe("$149");
    expect(CYMASPHERE_SALES.priceLine).toBe("$149 one-time. No subscription.");
    expect(CYMASPHERE_SALES.ctaLabel).toBe("Get Cymasphere");
    expect(salesText).not.toMatch(/\$499|\$6\b|\$59\b/i);
    expect(salesText.toLowerCase()).not.toMatch(/\/mo|per month|monthly|yearly/);
    expect(salesText.toLowerCase()).not.toContain("trial");
    expect(salesText.toLowerCase()).not.toContain("was-$");
  });

  it("states the MIDI harmony offer and documented formats", () => {
    expect(CYMASPHERE_META.title).toContain("MIDI harmony engine");
    expect(CYMASPHERE_SALES.headline).toBe("Unstick the progression.");
    expect(CYMASPHERE_FORMATS).toEqual(["Standalone", "VST3", "AU", "iPad"]);
    expect(salesText).not.toMatch(/\bAAX\b/);
    expect(salesText.toLowerCase()).not.toContain("android");
    expect(salesText).not.toContain("Song Builder");
    expect(salesText).not.toContain("LilyPond");
  });

  it("includes SOS and Attack proof with live links", () => {
    expect(CYMASPHERE_SOS.href).toBe(
      "https://www.soundonsound.com/reviews/cymasphere"
    );
    expect(CYMASPHERE_ATTACK.href).toBe(
      "https://www.attackmagazine.com/technique/video-tutorials/cymasphere-a-new-complex-chord-generator/"
    );
    expect(CYMASPHERE_SOS.quotes).toEqual([
      "chord-focused MIDI note generator",
      "brilliant harmonic playground",
      "well worth a stab",
    ]);
    expect(CYMASPHERE_ATTACK.quote).toContain(
      "Cymasphere goes far deeper, especially on the theory"
    );
    expect(CYMASPHERE_ATTACK.kind).toBe("video tutorial, not a scored review");
    expect(CYMASPHERE_SOS.date).toBe("print Jan 2024 / online 21 Dec 2023");
    expect(salesText).toContain("Robin Bigwood");
  });

  it("does not put SOS 2024 limits or extra Attack quotes on this page", () => {
    const lower = salesText.toLowerCase();
    expect(lower).not.toContain("looks confusing");
    expect(lower).not.toContain("incredible harmony engine");
    expect(lower).not.toContain("playing styles");
    expect(lower).not.toContain("not entirely clear");
    expect(lower).not.toContain("who cymasphere is really for");
    expect(lower).not.toContain("no daw plug-in");
    expect(lower).not.toContain("no daw plugin");
    expect(lower).not.toContain("tutorial series");
    expect(lower).not.toContain("download free");
    expect(CYMASPHERE_SALES.limitsLead).toBe(
      "This is not a three-knob chord picker. The GUI is dense because the theory is on the surface."
    );
    expect(CYMASPHERE_SOS.eraCaveat).toMatch(/2023–24 standalone/);
    expect(CYMASPHERE_SOS.eraCaveat).toMatch(/AU\/VST3/);
    expect(CYMASPHERE_INCLUDES_CYMASYNTH).toBe(false);
    expect(CYMASPHERE_SOS.eraCaveat.toLowerCase()).toContain("separate product");
  });

  it("does not invent a CymaSynth suite, filler, or social proof", () => {
    expect(CYMASPHERE_INCLUDES_CYMASYNTH).toBe(false);
    const lower = salesText.toLowerCase();
    expect(lower).not.toContain("ships with");
    expect(lower).not.toContain("one $149 purchase");
    expect(lower).not.toContain("serum");
    expect(lower).not.toContain("serum 2");
    expect(lower).not.toContain("feature parity");
    expect(lower).not.toContain("push the boundaries");
    expect(lower).not.toContain("intelligent music creation");
    expect(lower).not.toContain("aaron");
    expect(lower).not.toContain("download free");
    expect(lower).not.toContain("cymasphere.com");
    expect(CYMASPHERE_FAQ.some((item) => item.q.includes("CymaSynth"))).toBe(
      true
    );
    expect(
      CYMASPHERE_FAQ.find((item) => item.q.includes("CymaSynth"))?.a
    ).toBe("No.");
  });

  it("identifies the cymasphere slug", () => {
    expect(isCymasphereSlug("cymasphere")).toBe(true);
    expect(isCymasphereSlug("Cymasphere")).toBe(true);
    expect(isCymasphereSlug("cymasynth")).toBe(false);
  });

  it("keeps only the Stall Short demo and drops the unaudited catalog clip", () => {
    expect(
      filterCymasphereDemoVideos([
        "https://youtu.be/4ggHir150p8",
        "https://www.youtube.com/shorts/lZZwMcxmWEQ",
        "https://www.youtube.com/watch?v=4ggHir150p8",
      ])
    ).toEqual(["https://www.youtube.com/shorts/lZZwMcxmWEQ"]);
    expect(
      filterCymasphereDemoVideos([
        `https://www.youtube.com/watch?v=${CYMASPHERE_UNAUDITED_DEMO_VIDEO_ID}`,
      ])
    ).toEqual([]);
  });

  it("does not fall back to the unaudited demo_video_url", () => {
    expect(
      collectCymasphereDemoVideos({
        demo_videos: [],
        demo_video_url: "https://youtu.be/4ggHir150p8",
      })
    ).toEqual([]);
    expect(
      collectCymasphereDemoVideos({
        demo_videos: [
          { url: "https://youtu.be/4ggHir150p8", order: 1 },
          { url: "https://www.youtube.com/shorts/lZZwMcxmWEQ", order: 2 },
        ],
        demo_video_url: "https://youtu.be/4ggHir150p8",
      })
    ).toEqual([{ url: "https://www.youtube.com/shorts/lZZwMcxmWEQ", order: 1 }]);
  });
});
