import { describe, expect, it } from "vitest";
import { compare } from "../../src/engine/compare.js";
import { calculateMetrics } from "../../src/engine/metrics.js";
import { schedulePriority } from "../../src/engine/priority.js";

describe("selector and comparison consistency", () => {
  it("verifies the same aged Priority competitor that comparison ranks", () => {
    const processes = [
      { pid: "P1", arrival: 3, burst: 12, priority: 12 },
      { pid: "P2", arrival: 5, burst: 9, priority: 15 },
      { pid: "P3", arrival: 6, burst: 16, priority: 5 },
      { pid: "P4", arrival: 17, burst: 13, priority: 4 },
    ];
    const comparison = compare(processes, {
      goal: "fairness",
      priorityMin: 1,
      priorityMax: 100,
      agingInterval: 1,
      verificationMargin: 0,
    });

    expect(comparison.selection.algorithm).toBe("Round Robin");
    expect(comparison.selection.verificationWarning).toMatchObject({
      competitor: "Priority",
      goal: "fairness",
    });

    const agedPriority = comparison.results.Priority;
    const unagedFairness = calculateMetrics(
      schedulePriority(processes),
    ).jainsFairnessIndex;
    expect(agedPriority.schedule).toEqual(
      schedulePriority(processes, { agingInterval: 1 }),
    );
    expect(agedPriority.metrics.jainsFairnessIndex).not.toBeCloseTo(
      unagedFairness,
    );
    expect(
      comparison.selection.verificationWarning.competitorValue,
    ).toBeCloseTo(agedPriority.metrics.jainsFairnessIndex);
  });
});
