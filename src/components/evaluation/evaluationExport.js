/** Preserve non-finite regret values as explicit strings in the downloaded JSON. */
export function buildEvaluationJson(result, { seed, count }) {
  return `${JSON.stringify(
    {
      generatedWith: { seed, count },
      goal: result.goal,
      candidatesEvaluated: result.candidatesEvaluated,
      defaultConfig: result.defaultConfig,
      bestConfig: result.bestConfig,
      baseline: result.baseline,
      tuned: result.tuned,
      thresholdSensitivity: result.thresholdSensitivity,
    },
    (_, value) =>
      typeof value === "number" && !Number.isFinite(value)
        ? String(value)
        : value,
    2,
  )}\n`;
}
