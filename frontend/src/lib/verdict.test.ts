import { describe, expect, it } from "vitest";
import { formatBytes, formatScore, verdictMeta, VERDICTS } from "./verdict";

describe("verdict helpers", () => {
  it("has exactly the three required outcomes", () => {
    expect(Object.values(VERDICTS).map((v) => v.label).sort()).toEqual(
      ["Inconclusive", "Likely Authentic", "Potentially Counterfeit"],
    );
  });

  it("defaults to Inconclusive when there is no verdict", () => {
    expect(verdictMeta(null).label).toBe("Inconclusive");
    expect(verdictMeta(undefined).label).toBe("Inconclusive");
  });

  it("never invents a score", () => {
    expect(formatScore(null)).toBe("\u2014");
    expect(formatScore(undefined)).toBe("\u2014");
    expect(formatScore(0.8765)).toBe("0.88");
  });

  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
