import { describe, it, expect } from "vitest";
import { rxLabel, rxTiming, RX_LANG_OPTIONS } from "./rx-labels";

describe("prescription labels", () => {
  it("renders English, Marathi and bilingual labels", () => {
    expect(rxLabel("diagnosis", "en")).toBe("Diagnosis");
    expect(rxLabel("diagnosis", "mr")).toBe("निदान");
    expect(rxLabel("diagnosis", "both")).toBe("Diagnosis / निदान");
  });

  it("offers exactly the three supported languages", () => {
    expect(RX_LANG_OPTIONS.map((o) => o.value)).toEqual(["en", "mr", "both"]);
  });

  it("translates known timing presets and passes free text through", () => {
    expect(rxTiming("After food", "en")).toBe("After food");
    expect(rxTiming("After food", "mr")).toBe("जेवणानंतर");
    expect(rxTiming("Before food", "both")).toBe("Before food / जेवणापूर्वी");
    expect(rxTiming("1 hr before activity", "mr")).toBe("1 hr before activity");
    expect(rxTiming(null, "mr")).toBeNull();
  });
});
