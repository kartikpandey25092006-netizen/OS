import { describe, expect, it } from "vitest";
import { compare } from "../../src/engine/compare.js";
import { scheduleRoundRobin } from "../../src/engine/roundRobin.js";

const FIXED_ALGORITHMS = ["FCFS", "SJF", "SRTF", "Priority", "Round Robin"];
const ALL_RESULTS = [...FIXED_ALGORITHMS, "Adaptive"];
const METRIC_NAMES = [
  "waiting",
  "turnaround",
  "response",
  "cpuUtilization",
  "throughput",
  "makespan",
  "maximumWaitingTime",
  "jainsFairnessIndex",
  "busyTime",
  "idleTime",
  "contextSwitchTime",
];

function workload(bursts, { arrivals = [], priorities = [] } = {}) {
  return bursts.map((burst, index) => ({
    pid: `P${index + 1}`,
    arrival: arrivals[index] ?? 0,
    burst,
    priority: priorities[index] ?? 1,
  }));
}

function rankingEntry(comparison, metric, name) {
  return comparison.rankings[metric].find((entry) => entry.name === name);
}

describe("comparison engine", () => {
  it("runs all five fixed algorithms plus a separate adaptive schedule on the same workload", () => {
    const input = workload([4, 2, 2], { arrivals: [0, 1, 2] });
    const original = structuredClone(input);
    const comparison = compare(input, { verify: false });

    expect(input).toEqual(original);
    expect(Object.keys(comparison.results)).toHaveLength(6);
    expect(Object.keys(comparison.results)).toEqual(
      expect.arrayContaining(ALL_RESULTS),
    );
    expect(comparison.selection.algorithm).toBe("SJF");
    expect(comparison.adaptive.algorithm).toBe("SJF");

    for (const name of ALL_RESULTS) {
      const { schedule, metrics, ranks } = comparison.results[name];
      expect(schedule.gantt.length).toBeGreaterThan(0);
      expect(schedule.processResults).toHaveLength(input.length);
      expect(metrics.perProcess).toHaveLength(input.length);
      expect(metrics.averages).toEqual({
        waiting: expect.any(Number),
        turnaround: expect.any(Number),
        response: expect.any(Number),
      });
      for (const metric of METRIC_NAMES) {
        expect(ranks[metric]).toBe(rankingEntry(comparison, metric, name).rank);
      }
    }

    expect(comparison.results.Adaptive.schedule).toEqual(
      comparison.results.SJF.schedule,
    );
    expect(comparison.results.Adaptive.metrics).toEqual(
      comparison.results.SJF.metrics,
    );
    expect(comparison.results.FCFS.metrics.averages.waiting).toBeCloseTo(7 / 3);
    expect(comparison.results.SJF.metrics.averages.waiting).toBeCloseTo(7 / 3);
    expect(comparison.results.SRTF.metrics.averages.waiting).toBeCloseTo(5 / 3);
    expect(comparison.results.Priority.metrics.averages.waiting).toBeCloseTo(
      7 / 3,
    );
    expect(
      comparison.results["Round Robin"].metrics.averages.waiting,
    ).toBeCloseTo(7 / 3);
  });

  it("sorts waiting ranks with competition ties and identifies a top-2 adaptive choice", () => {
    const comparison = compare(workload([4, 2, 2], { arrivals: [0, 1, 2] }), {
      goal: "waiting",
      verify: false,
    });
    const waiting = comparison.rankings.waiting;

    // SRTF waits (4, 0, 1), average 5/3. Each other schedule waits
    // a total of 7 time units, so five entries tie for second place.
    expect(waiting).toHaveLength(6);
    expect(waiting[0]).toMatchObject({ name: "SRTF", rank: 1 });
    expect(waiting[0].value).toBeCloseTo(5 / 3);
    expect(waiting.slice(1).map(({ rank }) => rank)).toEqual([2, 2, 2, 2, 2]);
    for (const { value } of waiting.slice(1)) expect(value).toBeCloseTo(7 / 3);
    expect(comparison.adaptive).toMatchObject({
      goal: "waiting",
      metric: "waiting",
      rank: 2,
      status: "top-2",
    });
    expect(comparison.adaptive.value).toBeCloseTo(7 / 3);
    expect(comparison.adaptive.bestValue).toBeCloseTo(5 / 3);
    expect(comparison.adaptive.regret).toBeCloseTo((7 / 3 - 5 / 3) / (5 / 3));
  });

  it("gives every algorithm rank 1 on a full tie and zero regret at a zero optimum", () => {
    const input = workload([5]);
    const waiting = compare(input, { goal: "waiting", verify: false });
    const response = compare(input, { goal: "response", verify: false });

    for (const comparison of [waiting, response]) {
      expect(comparison.rankings[comparison.adaptive.metric]).toHaveLength(6);
      expect(
        comparison.rankings[comparison.adaptive.metric].map(({ rank }) => rank),
      ).toEqual([1, 1, 1, 1, 1, 1]);
      expect(comparison.adaptive).toMatchObject({
        value: 0,
        bestValue: 0,
        rank: 1,
        status: "best",
        regret: 0,
      });
    }
  });

  it("ranks a worse adaptive result below two tied winners and computes regret against the best", () => {
    const comparison = compare(workload([10, 12, 11]), {
      goal: "waiting",
      verify: false,
    });

    // SJF/SRTF waits (0, 21, 10) -> 31/3. FCFS/Priority waits
    // (0, 10, 22) -> 32/3. RR q=11 waits (0, 21, 21) -> 14.
    expect(comparison.selection.algorithm).toBe("Round Robin");
    expect(comparison.selection.quantum).toBe(11);
    expect(comparison.rankings.waiting.map(({ rank }) => rank)).toEqual([
      1, 1, 3, 3, 5, 5,
    ]);
    expect(comparison.adaptive).toMatchObject({
      algorithm: "Round Robin",
      goal: "waiting",
      metric: "waiting",
      rank: 5,
      status: "worse",
    });
    expect(comparison.adaptive.value).toBe(14);
    expect(comparison.adaptive.bestValue).toBeCloseTo(31 / 3);
    expect(comparison.adaptive.regret).toBeCloseTo((14 - 31 / 3) / (31 / 3));
  });

  it("uses the same derived or overridden quantum for fixed and adaptive Round Robin", () => {
    const input = workload([10, 12, 11]);
    const derived = compare(input, { verify: false });
    const overridden = compare(input, { quantum: 3, verify: false });

    expect(derived.selection.algorithm).toBe("Round Robin");
    expect(derived.selection.quantum).toBe(11);
    expect(derived.results["Round Robin"].schedule).toEqual(
      scheduleRoundRobin(input, { quantum: 11 }),
    );
    expect(derived.results.Adaptive.schedule).toEqual(
      derived.results["Round Robin"].schedule,
    );

    expect(overridden.selection.algorithm).toBe("Round Robin");
    expect(overridden.selection.quantum).toBe(3);
    expect(overridden.results["Round Robin"].schedule).toEqual(
      scheduleRoundRobin(input, { quantum: 3 }),
    );
    expect(overridden.results.Adaptive.schedule).toEqual(
      overridden.results["Round Robin"].schedule,
    );
    expect(overridden.results.Adaptive.schedule).not.toEqual(
      derived.results.Adaptive.schedule,
    );
  });

  it("ranks utilization, throughput, and overhead in the right directions", () => {
    const comparison = compare(workload([10, 12, 11]), {
      contextSwitchCost: 1,
      verify: false,
    });
    const fcfs = comparison.results.FCFS;
    const roundRobin = comparison.results["Round Robin"];

    expect(fcfs.metrics.cpuUtilization).toBe(1);
    expect(roundRobin.metrics.cpuUtilization).toBeLessThan(1);
    expect(fcfs.ranks.cpuUtilization).toBe(1);
    expect(fcfs.ranks.throughput).toBe(1);
    expect(roundRobin.ranks.cpuUtilization).toBeGreaterThan(1);
    expect(roundRobin.ranks.throughput).toBeGreaterThan(1);
    expect(fcfs.ranks.contextSwitchTime).toBe(1);
    expect(roundRobin.ranks.contextSwitchTime).toBeGreaterThan(1);
    expect(comparison.rankings.busyTime.every(({ rank }) => rank === 1)).toBe(
      true,
    );
  });

  it("maximizes fairness while applying the stated regret formula", () => {
    const comparison = compare(
      workload([20, 1, 1], { priorities: [1, 2, 3] }),
      { goal: "fairness", verify: false },
    );
    const fairness = comparison.rankings.jainsFairnessIndex;

    expect(comparison.selection.algorithm).toBe("Priority");
    expect(fairness[0]).toMatchObject({ name: "Round Robin", rank: 1 });
    expect(fairness[0].value).toBeCloseTo(25 / 27);
    expect(fairness.at(-1).value).toBeCloseTo(0.6);
    for (let index = 1; index < fairness.length; index += 1) {
      expect(fairness[index - 1].value).toBeGreaterThanOrEqual(
        fairness[index].value,
      );
    }
    expect(comparison.adaptive).toMatchObject({
      goal: "fairness",
      metric: "jainsFairnessIndex",
      rank: 2,
      status: "top-2",
    });
    expect(comparison.adaptive.value).toBeCloseTo(1681 / 2523);
    expect(comparison.adaptive.bestValue).toBeCloseTo(25 / 27);
    expect(comparison.adaptive.regret).toBeCloseTo(
      (1681 / 2523 - 25 / 27) / (25 / 27),
    );
  });

  it("runs the adaptive mixed Priority tie-break separately from fixed Priority", () => {
    const comparison = compare(
      workload([10, 2, 1], { priorities: [1, 1, 3] }),
      { goal: "waiting", verify: false },
    );

    expect(comparison.selection.ruleFired).toBe("priority-spread-mixed");
    expect(comparison.selection.priorityTieBreak).toBe("sjf");
    expect(
      comparison.results.Priority.schedule.gantt.map(({ pid }) => pid),
    ).toEqual(["P1", "P2", "P3"]);
    expect(
      comparison.results.Adaptive.schedule.gantt.map(({ pid }) => pid),
    ).toEqual(["P2", "P1", "P3"]);
    expect(comparison.results.Adaptive.metrics.averages.waiting).toBeLessThan(
      comparison.results.Priority.metrics.averages.waiting,
    );
  });
});
