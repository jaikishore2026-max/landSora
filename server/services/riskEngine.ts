export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type RiskInputs = {
  rainfallScore: number;
  terrainScore: number;
  historicalLandslideScore: number;
  recentEventScore: number;
};

export type HistoricalTelemetryInputs = {
  rainfallMmHr: number;
  tiltDegreesPerHour: number;
  historicalBaselineScore: number;
  nasaEonetScore: number;
};

export function riskLevel(score: number): RiskLevel {
  if (score >= 76) return "CRITICAL";
  if (score >= 51) return "HIGH";
  if (score >= 26) return "MODERATE";
  return "LOW";
}

export function calculatePrototypeRisk(inputs: RiskInputs) {
  const values = Object.values(inputs).map(value => Math.max(0, Math.min(100, value)));
  const score = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return { score, level: riskLevel(score), inputs };
}

/**
 * Converts the historical event's measured values to the risk engine's
 * documented 0-100 factor scale before using the normal four-factor formula.
 */
export function calculateHistoricalTelemetryRisk(inputs: HistoricalTelemetryInputs) {
  const normalizedInputs: RiskInputs = {
    rainfallScore: Math.min(100, Math.max(0, (inputs.rainfallMmHr / 41.5) * 100)),
    terrainScore: Math.min(100, Math.max(0, (inputs.tiltDegreesPerHour / 0.22) * 100)),
    historicalLandslideScore: inputs.historicalBaselineScore,
    recentEventScore: inputs.nasaEonetScore,
  };

  return {
    ...calculatePrototypeRisk(normalizedInputs),
    rawInputs: inputs,
  };
}
