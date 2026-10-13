import { describe, expect, it } from "vitest";
import {
  calculateWorkloadStats,
  selectAlgorithm,
} from "../../src/engine/selector.js";

function processes(bursts, { arrivals = [], priorities = [] } = {}) {
  return bursts.map((burst, index) => ({
    pid: `P${index + 1}`,
    arrival: arrivals[index] ?? 0,
    burst,
    priority: priorities[index] ?? 1,
  }));
}

const withoutVerification = { verify: false };

describe("adaptive selector statistics and ordered rules", () => {
  it("uses population standard deviation and computes every workload statistic", () => {
    const input = processes([11, 29], {
      arrivals: [0, 6],
      priorities: [1, 5],
    });
    const stats = calculateWorkloadStats(input, {
      priorityMin: 1,
      priorityMax: 11,
    });

    // Mean BT = 20, population SD = sqrt((9² + 9²)/2) = 9.
    // CV = 9/20 = 0.45; priority spread = (5-1)/(11-1) = 0.40.
    // Staggered arrival ratio = (6-0)/20 = 0.30.
    expect(stats.meanBurst).toBe(20);
    expect(stats.medianBurst).toBe(20);
    expect(stats.burstStdDev).toBe(9);
    expect(stats.burstCV).toBeCloseTo(0.45);
    expect(stats.prioritySpreadRatio).toBeCloseTo(0.4);
    expect(stats.staggeredArrivalRatio).toBeCloseTo(0.3);
    expect(stats.priorityScale).toEqual({ min: 1, max: 11, range: 10 });
  });

  it("fires the priority-spread rule at exactly 0.40, before low CV", () => {
    const input = processes([10, 10], { priorities: [1, 5] });
    const result = selectAlgorithm(input, {
      ...withoutVerification,
      priorityMin: 1,
      priorityMax: 11,
    });

    // (5-1)/(11-1) = 0.40; equal bursts give CV = 0.
    expect(result.stats.prioritySpreadRatio).toBeCloseTo(0.4);
    expect(result.algorithm).toBe("Priority");
    expect(result.ruleFired).toBe("priority-spread");
    expect(result.explanation).toContain("0.40");
  });

  it("fires the mixed priority path when spread is 0.40 and CV is 0.45", () => {
    const result = selectAlgorithm(
      processes([11, 29], { priorities: [1, 5] }),
      {
        ...withoutVerification,
        priorityMin: 1,
        priorityMax: 11,
      },
    );

    expect(result.stats.prioritySpreadRatio).toBeCloseTo(0.4);
    expect(result.stats.burstCV).toBeCloseTo(0.45);
    expect(result.algorithm).toBe("Priority");
    expect(result.ruleFired).toBe("priority-spread-mixed");
    expect(result.explanation).toContain("0.40");
    expect(result.explanation).toContain("0.45");
    expect(result.explanation).toMatch(/SJF|shortest/i);
  });

  it("chooses SRTF when CV is 0.45 and staggered ratio is 0.30", () => {
    const result = selectAlgorithm(
      processes([11, 29], { arrivals: [0, 6] }),
      withoutVerification,
    );

    // CV = 9/20 = 0.45; arrival span / mean BT = 6/20 = 0.30.
    expect(result.stats.burstCV).toBeCloseTo(0.45);
    expect(result.stats.staggeredArrivalRatio).toBeCloseTo(0.3);
    expect(result.algorithm).toBe("SRTF");
    expect(result.ruleFired).toBe("high-cv-staggered");
    expect(result.explanation).toContain("0.45");
    expect(result.explanation).toContain("0.30");
  });

  it("chooses SJF for high CV with batch arrivals", () => {
    const result = selectAlgorithm(processes([11, 29]), withoutVerification);

    expect(result.stats.burstCV).toBeCloseTo(0.45);
    expect(result.stats.staggeredArrivalRatio).toBe(0);
    expect(result.algorithm).toBe("SJF");
    expect(result.ruleFired).toBe("high-cv-batch");
    expect(result.explanation).toContain("0.45");
    expect(result.explanation).toContain("0.00");
  });

  it("chooses Round Robin for CV below 0.25 and uses median burst", () => {
    const result = selectAlgorithm(processes([4, 6]), withoutVerification);

    // Mean BT = 5, population SD = 1, so CV = 0.20 < 0.25.
    expect(result.stats.burstCV).toBeCloseTo(0.2);
    expect(result.algorithm).toBe("Round Robin");
    expect(result.ruleFired).toBe("low-cv");
    expect(result.quantum).toBe(5);
    expect(result.explanation).toContain("0.20");
    expect(result.explanation).toContain("0.25");
  });

  it("uses the moderate fallback at exactly CV 0.25", () => {
    const input = processes([3, 5]);
    const result = selectAlgorithm(input, withoutVerification);
    const fcfs = selectAlgorithm(input, {
      ...withoutVerification,
      moderateDefault: "FCFS",
    });

    // Mean BT = 4, population SD = 1, CV = 1/4 = 0.25.
    expect(result.stats.burstCV).toBeCloseTo(0.25);
    expect(result.algorithm).toBe("SJF");
    expect(result.ruleFired).toBe("moderate");
    expect(result.explanation).toContain("0.25");
    expect(fcfs.algorithm).toBe("FCFS");
    expect(fcfs.ruleFired).toBe("moderate");
  });

  it("does not enter the high-CV branch below 0.45", () => {
    const result = selectAlgorithm(processes([12, 28]), withoutVerification);

    // Mean BT = 20, population SD = 8, CV = 0.40.
    expect(result.stats.burstCV).toBeCloseTo(0.4);
    expect(result.algorithm).toBe("SJF");
    expect(result.ruleFired).toBe("moderate");
  });

  it("uses custom thresholds to change the first matching rule", () => {
    const lowCvInput = processes([4, 6]);
    const defaultChoice = selectAlgorithm(lowCvInput, withoutVerification);
    const tunedChoice = selectAlgorithm(lowCvInput, {
      ...withoutVerification,
      thresholds: { cvLow: 0.15 },
    });

    // CV = 0.20: below the default 0.25, but above the tuned 0.15.
    expect(defaultChoice.ruleFired).toBe("low-cv");
    expect(tunedChoice.ruleFired).toBe("moderate");
    expect(tunedChoice.algorithm).toBe("SJF");
    expect(tunedChoice.explanation).toContain("0.15");

    const priorityInput = processes([10, 10], { priorities: [1, 5] });
    const priorityChoice = selectAlgorithm(priorityInput, {
      ...withoutVerification,
      priorityMin: 1,
      priorityMax: 11,
    });
    const raisedPriorityThreshold = selectAlgorithm(priorityInput, {
      ...withoutVerification,
      priorityMin: 1,
      priorityMax: 11,
      thresholds: { priorityHigh: 0.5 },
    });

    // Spread = 0.40: enough for the default 0.40, below the tuned 0.50.
    expect(priorityChoice.ruleFired).toBe("priority-spread");
    expect(raisedPriorityThreshold.ruleFired).toBe("low-cv");
    expect(raisedPriorityThreshold.algorithm).toBe("Round Robin");
  });

  it("does not enter the staggered branch below 0.30", () => {
    const result = selectAlgorithm(
      processes([11, 29], { arrivals: [0, 5] }),
      withoutVerification,
    );

    // Arrival span / mean BT = 5/20 = 0.25.
    expect(result.stats.staggeredArrivalRatio).toBeCloseTo(0.25);
    expect(result.algorithm).toBe("SJF");
    expect(result.ruleFired).toBe("high-cv-batch");
  });

  it("uses the observed priority scale by default and a custom 1-10 scale", () => {
    const input = processes([10, 10], { priorities: [1, 5] });
    const inferred = calculateWorkloadStats(input);
    const custom = calculateWorkloadStats(input, {
      priorityMin: 1,
      priorityMax: 10,
    });

    expect(inferred.priorityScale).toEqual({ min: 1, max: 5, range: 4 });
    expect(inferred.prioritySpreadRatio).toBe(1);
    expect(custom.priorityScale).toEqual({ min: 1, max: 10, range: 9 });
    expect(custom.prioritySpreadRatio).toBeCloseTo(4 / 9);
    expect(
      selectAlgorithm(input, {
        ...withoutVerification,
        priorityMin: 1,
        priorityMax: 10,
      }).algorithm,
    ).toBe("Priority");
  });

  it("handles a zero priority range and rejects zero burst time", () => {
    const input = processes([4, 6]);
    const stats = calculateWorkloadStats(input);

    expect(stats.priorityScale).toEqual({ min: 1, max: 1, range: 0 });
    expect(stats.prioritySpreadRatio).toBe(0);
    expect(Number.isFinite(stats.prioritySpreadRatio)).toBe(true);
    expect(() => calculateWorkloadStats(processes([0, 0]))).toThrow(
      /burst|positive|mean/i,
    );
  });

  it("rejects inherited object property names as goals", () => {
    const input = processes([4, 6]);

    expect(() =>
      selectAlgorithm(input, { ...withoutVerification, goal: "constructor" }),
    ).toThrow(/goal/i);
    expect(() =>
      selectAlgorithm(input, { ...withoutVerification, goal: "toString" }),
    ).toThrow(/goal/i);
  });

  it("can derive the RR quantum from mean burst and accepts an override", () => {
    const input = processes([10, 10, 15]);
    const fromMedian = selectAlgorithm(input, withoutVerification);
    const fromMean = selectAlgorithm(input, {
      ...withoutVerification,
      rrQuantum: "mean",
    });
    const overridden = selectAlgorithm(input, {
      ...withoutVerification,
      quantum: 3,
    });

    // Mean BT = 35/3 = 11.67; median BT = 10; CV is about 0.20.
    expect(fromMedian.algorithm).toBe("Round Robin");
    expect(fromMedian.quantum).toBe(10);
    expect(fromMean.quantum).toBe(12);
    expect(overridden.quantum).toBe(3);
  });

  it("prints computed example stats and decisions for the rule table", () => {
    const examples = [
      {
        name: "priority spread",
        input: processes([10, 10], { priorities: [1, 5] }),
        options: { priorityMin: 1, priorityMax: 11 },
      },
      {
        name: "mixed priority",
        input: processes([11, 29], { priorities: [1, 5] }),
        options: { priorityMin: 1, priorityMax: 11 },
      },
      {
        name: "high CV staggered",
        input: processes([11, 29], { arrivals: [0, 6] }),
      },
      { name: "high CV batch", input: processes([11, 29]) },
      { name: "low CV", input: processes([4, 6]) },
      { name: "moderate", input: processes([3, 5]) },
    ];

    const rows = examples.map(({ name, input, options = {} }) => {
      const { algorithm, quantum, ruleFired, stats } = selectAlgorithm(input, {
        ...withoutVerification,
        ...options,
      });
      return {
        example: name,
        cv: stats.burstCV.toFixed(2),
        prioritySpread: stats.prioritySpreadRatio.toFixed(2),
        staggered: stats.staggeredArrivalRatio.toFixed(2),
        rule: ruleFired,
        decision: quantum ? `${algorithm} (q=${quantum})` : algorithm,
      };
    });

    console.table(rows);
    expect(new Set(rows.map(({ rule }) => rule)).size).toBe(6);
  });
});
