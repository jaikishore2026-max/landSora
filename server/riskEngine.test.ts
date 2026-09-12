import { describe, expect, it } from "vitest";
import { calculateHistoricalTelemetryRisk, calculatePrototypeRisk, riskLevel } from "./services/riskEngine";

describe("riskEngine", () => {
  it("maps the documented score bands", () => {
    expect(riskLevel(25)).toBe("LOW");
    expect(riskLevel(26)).toBe("MODERATE");
    expect(riskLevel(51)).toBe("HIGH");
    expect(riskLevel(76)).toBe("CRITICAL");
  });

  it("normalizes environmental inputs into a prototype score", () => {
    const result = calculatePrototypeRisk({ rainfallScore: 80, terrainScore: 70, historicalLandslideScore: 60, recentEventScore: 90 });
    expect(result.score).toBe(75);
    expect(result.level).toBe("HIGH");
  });

  it("replays the 2024 Wayanad event as a critical 90/100 risk", () => {
    const result = calculateHistoricalTelemetryRisk({
      rainfallMmHr: 41.5,
      tiltDegreesPerHour: 0.22,
      historicalBaselineScore: 85,
      nasaEonetScore: 75,
    });

    expect(result.score).toBe(90);
    expect(result.level).toBe("CRITICAL");
    expect(result.rawInputs.rainfallMmHr).toBe(41.5);
  });
});
