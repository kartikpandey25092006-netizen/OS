import { describe, expect, it } from "vitest";
import { compare } from "../../src/engine/compare.js";

function workload(bursts, { arrivals = [], priorities = [] } = {}) {
  return bursts.map((burst, index) => ({
    pid: `P${index + 1}`,
    arrival: arrivals[index] ?? 0,
    burst,
    priority: priorities[index] ?? 1,
  }));
}

function ranksByName(entries) {
  return Object.fromEntries(entries.map(({ name, rank }) => [name, rank]));
}

describe("comparison outcomes on hand-checkable workloads", () => {
  it("ranks tied algorithms first and gives an adaptive best pick zero regret", () => {
    const result = compare(workload([1, 2, 3]), { verify: false });

    // All six schedules execute P1, P2, P3, so waits are (0, 1, 3).
    expect(result.selection.algorithm).toBe("SJF");
    expect(result.rankings.waiting).toHaveLength(6);
    for (const row of result.rankings.waiting) {
      expect(row.value).toBeCloseTo(4 / 3);
      expect(row.rank).toBe(1);
    }
    expect(result.adaptive).toMatchObject({
      algorithm: "SJF",
      goal: "waiting",
      metric: "waiting",
      rank: 1,
      status: "best",
      regret: 0,
    });
    expect(result.adaptive.value).toBeCloseTo(4 / 3);
    expect(result.adaptive.bestValue).toBeCloseTo(4 / 3);
    expect(result.results.Adaptive.ranks.waiting).toBe(1);
  });

  it("identifies a unique better scheduler and a top-two adaptive pick", () => {
    const processes = workload([3, 3, 1], { arrivals: [0, 0, 1] });
    const result = compare(processes, { verify: false });

    // SRTF: P1 0-1, P3 1-2, P1 2-4, P2 4-7 -> waits (1, 4, 0).
    // SJF: P1 0-3, P3 3-4, P2 4-7 -> waits (0, 4, 2).
    expect(result.selection.algorithm).toBe("SJF");
    expect(result.results.SRTF.metrics.averages.waiting).toBeCloseTo(5 / 3);
    expect(result.results.SJF.metrics.averages.waiting).toBe(2);
    expect(result.results.Adaptive.metrics.averages.waiting).toBe(2);
    expect(ranksByName(result.rankings.waiting)).toMatchObject({
      SRTF: 1,
      SJF: 2,
      Adaptive: 2,
      FCFS: 4,
      Priority: 4,
      "Round Robin": 4,
    });
    expect(result.adaptive).toMatchObject({
      metric: "waiting",
      rank: 2,
      status: "top-2",
    });
    expect(result.adaptive.bestValue).toBeCloseTo(5 / 3);
    expect(result.adaptive.regret).toBeCloseTo(0.2);
  });

  it("uses competition ranks for ties ahead of a worse adaptive pick", () => {
    const result = compare(workload([10, 12, 11]), { verify: false });

    // SJF/SRTF waits sum to 31, FCFS/Priority to 32, and RR q=11 to 42.
    expect(result.selection.algorithm).toBe("Round Robin");
    expect(result.selection.quantum).toBe(11);
    expect(ranksByName(result.rankings.waiting)).toMatchObject({
      SJF: 1,
      SRTF: 1,
      FCFS: 3,
      Priority: 3,
      "Round Robin": 5,
      Adaptive: 5,
    });
    expect(result.adaptive).toMatchObject({
      rank: 5,
      status: "worse",
      value: 14,
    });
    expect(result.adaptive.bestValue).toBeCloseTo(31 / 3);
    expect(result.adaptive.regret).toBeCloseTo((14 - 31 / 3) / (31 / 3));
  });

  it("defines regret as zero when the best and adaptive scores are both zero", () => {
    const result = compare(workload([2, 2, 2], { arrivals: [0, 2, 4] }), {
      verify: false,
    });

    expect(result.rankings.waiting).toHaveLength(6);
    expect(
      result.rankings.waiting.every(
        ({ value, rank }) => value === 0 && rank === 1,
      ),
    ).toBe(true);
    expect(result.adaptive).toMatchObject({
      value: 0,
      bestValue: 0,
      rank: 1,
      status: "best",
      regret: 0,
    });
  });

  it("maximizes fairness ranking while retaining the specified signed regret", () => {
    const result = compare(workload([20, 1, 1], { priorities: [1, 2, 3] }), {
      goal: "fairness",
      verify: false,
    });

    // Priority waits (0, 20, 21): Jain = 1681/2523.
    // RR q=1 waits (2, 1, 2): Jain = 25/27, the largest score.
    expect(result.selection.algorithm).toBe("Priority");
    expect(result.rankings.jainsFairnessIndex[0]).toMatchObject({
      name: "Round Robin",
      rank: 1,
    });
    expect(result.results.Priority.metrics.jainsFairnessIndex).toBeCloseTo(
      1681 / 2523,
    );
    expect(
      result.results["Round Robin"].metrics.jainsFairnessIndex,
    ).toBeCloseTo(25 / 27);
    expect(result.adaptive).toMatchObject({
      goal: "fairness",
      metric: "jainsFairnessIndex",
      rank: 2,
      status: "top-2",
    });
    expect(result.adaptive.value).toBeCloseTo(1681 / 2523);
    expect(result.adaptive.bestValue).toBeCloseTo(25 / 27);
    expect(result.adaptive.regret).toBeCloseTo(
      (1681 / 2523 - 25 / 27) / (25 / 27),
    );
    expect(result.adaptive.regret).toBeLessThan(0);
  });
});
