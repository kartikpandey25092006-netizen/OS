import { describe, expect, it } from "vitest";
import { buildEvaluationJson } from "../../src/components/evaluation/evaluationExport.js";

describe("evaluation JSON export", () => {
  it("records the run settings and preserves infinite regret explicitly", () => {
    const result = {
      goal: "response",
      candidatesEvaluated: 2,
      defaultConfig: {},
      bestConfig: {},
      baseline: { summary: { meanRegret: Infinity } },
      tuned: { summary: { meanRegret: 0 } },
      thresholdSensitivity: [],
    };
    const parsed = JSON.parse(
      buildEvaluationJson(result, { seed: 7, count: 50 }),
    );
    expect(parsed.generatedWith).toEqual({ seed: 7, count: 50 });
    expect(parsed.baseline.summary.meanRegret).toBe("Infinity");
  });
});
