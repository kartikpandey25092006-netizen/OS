import { describe, expect, it } from "vitest";
import { generateWorkloads } from "../../src/engine/workloadGenerator.js";
import { evaluateSelector, tuneThresholds } from "../../src/engine/tuning.js";
import { ALGORITHM_NAMES } from "../../src/engine/config.js";

const workloads = generateWorkloads({ count: 50, seed: 2026 });

describe("selector evaluation and tuning", () => {
  it.each(["waiting", "response", "fairness"])(
    "keeps tuned agreement at least as high as defaults for the %s goal",
    (goal) => {
      const result = tuneThresholds(workloads, { goal });
      expect(result.workloadCount).toBe(50);
      expect(result.candidatesEvaluated).toBeGreaterThan(1);
      expect(result.baseline.summary.agreementRate).toBeGreaterThanOrEqual(0);
      expect(result.baseline.summary.agreementRate).toBeLessThanOrEqual(1);
      expect(result.tuned.summary.agreementRate).toBeGreaterThanOrEqual(
        result.baseline.summary.agreementRate,
      );
      expect(result.thresholdSensitivity).toHaveLength(12);
      expect(result.tuned.cases).toHaveLength(50);
      expect(
        ALGORITHM_NAMES.reduce(
          (sum, selected) =>
            sum +
            Object.values(result.tuned.confusionMatrix[selected]).reduce(
              (a, b) => a + b,
              0,
            ),
          0,
        ),
      ).toBe(50);
      expect(
        result.tuned.failureCases.every(
          ({ agrees, loss }) => !agrees && loss > 0,
        ),
      ).toBe(true);
    },
  );

  it("matches the standalone default evaluation and is deterministic", () => {
    const first = tuneThresholds(workloads);
    const second = tuneThresholds(workloads);
    expect(first.bestConfig).toEqual(second.bestConfig);
    expect(first.tuned.summary).toEqual(second.tuned.summary);
    expect(evaluateSelector(workloads).summary).toEqual(first.baseline.summary);
  });

  it("retains the default configuration when a custom grid performs worse", () => {
    const grid = {
      priorityHigh: [0],
      cvHigh: [2],
      cvLow: [0],
      staggered: [0],
      moderateDefault: ["FCFS"],
      rrQuantum: ["mean"],
    };
    const result = tuneThresholds(workloads, { grid });
    expect(result.tuned.summary.agreementRate).toBeGreaterThanOrEqual(
      result.baseline.summary.agreementRate,
    );
  });

  it("rejects empty samples and invalid configurations", () => {
    expect(() => tuneThresholds([])).toThrow(/at least one workload/i);
    expect(() => evaluateSelector(workloads, { goal: "unknown" })).toThrow(
      /goal/i,
    );
    expect(() =>
      evaluateSelector(workloads, { thresholds: { cvLow: 2 } }),
    ).toThrow(/cvLow/i);
  });
});
