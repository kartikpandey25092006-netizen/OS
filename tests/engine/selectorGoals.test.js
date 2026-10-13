import { describe, expect, it } from "vitest";
import { selectAlgorithm } from "../../src/engine/selector.js";
import { schedulePriority } from "../../src/engine/priority.js";

function workload(bursts, { priorities = [], arrivals = [] } = {}) {
  return bursts.map((burst, index) => ({
    pid: `P${index + 1}`,
    arrival: arrivals[index] ?? 0,
    burst,
    priority: priorities[index] ?? 1,
  }));
}

describe("goal-aware selection", () => {
  it("prefers Round Robin for response time in moderate and high-CV batch arrivals", () => {
    const moderate = workload([8, 4, 6]); // CV = sqrt(8/3) / 6 = 0.272...
    const highCv = workload([20, 1, 1]); // CV = 1.221...

    expect(
      selectAlgorithm(moderate, { goal: "waiting", verify: false }).algorithm,
    ).toBe("SJF");
    const moderateResponse = selectAlgorithm(moderate, {
      goal: "response",
      verify: false,
    });
    expect(moderateResponse.algorithm).toBe("Round Robin");
    expect(moderateResponse.quantum).toBe(6);
    expect(moderateResponse.explanation).toMatch(/response/i);

    expect(
      selectAlgorithm(highCv, { goal: "waiting", verify: false }).algorithm,
    ).toBe("SJF");
    const highCvResponse = selectAlgorithm(highCv, {
      goal: "response",
      verify: false,
    });
    expect(highCvResponse.algorithm).toBe("Round Robin");
    expect(highCvResponse.quantum).toBe(1);
  });

  it("uses Round Robin for fairness outside the priority rule, including staggered arrivals", () => {
    const lowCv = workload([5, 5, 5]);
    const moderate = workload([8, 4, 6]);
    const highCvStaggered = workload([20, 1, 1], { arrivals: [0, 3, 6] });

    for (const processes of [lowCv, moderate, highCvStaggered]) {
      const selected = selectAlgorithm(processes, {
        goal: "fairness",
        verify: false,
      });
      expect(selected.algorithm).toBe("Round Robin");
      expect(selected.quantum).toBeGreaterThan(0);
      expect(selected.explanation).toMatch(/fairness/i);
    }
    expect(
      selectAlgorithm(highCvStaggered, { goal: "waiting", verify: false })
        .algorithm,
    ).toBe("SRTF");
  });

  it("keeps a strong priority signal for fairness and enables aging", () => {
    const processes = workload([20, 1, 1], { priorities: [1, 2, 3] });
    const selected = selectAlgorithm(processes, {
      goal: "fairness",
      verify: false,
    });

    expect(selected.algorithm).toBe("Priority");
    expect(selected.agingInterval).toBe(1); // rounded median burst
    expect(selected.explanation).toMatch(/aging/i);
  });

  it("uses shortest-job tie-breaking in the mixed Priority path", () => {
    const processes = workload([10, 2, 1], { priorities: [1, 1, 3] });
    const selected = selectAlgorithm(processes, { verify: false });

    expect(selected.ruleFired).toBe("priority-spread-mixed");
    expect(selected.priorityTieBreak).toBe("sjf");
    expect(schedulePriority(processes).gantt.map(({ pid }) => pid)).toEqual([
      "P1",
      "P2",
      "P3",
    ]);
    expect(
      schedulePriority(processes, {
        priorityTieBreak: selected.priorityTieBreak,
      }).gantt.map(({ pid }) => pid),
    ).toEqual(["P2", "P1", "P3"]);
  });
});

describe("hybrid verification", () => {
  it("flags a better waiting-time schedule without replacing the rule pick", () => {
    const processes = workload([10, 12, 11]); // CV < 0.25, so RR q=11
    const selected = selectAlgorithm(processes, {
      goal: "waiting",
      verificationMargin: 0.1,
    });

    // RR: P1 0-10, P2 10-21, P3 21-32, P2 32-33.
    // Waits are (0, 21, 21), average 14. SJF waits (0, 21, 10),
    // average 31/3; its relative improvement is (14 - 31/3) / 14.
    expect(selected.algorithm).toBe("Round Robin");
    expect(selected.quantum).toBe(11);
    expect(selected.verificationWarning).toMatchObject({
      goal: "waiting",
      competitor: "SJF",
      selectedValue: 14,
    });
    expect(selected.verificationWarning.competitorValue).toBeCloseTo(31 / 3);
    expect(selected.verificationWarning.improvementRatio).toBeCloseTo(
      (14 - 31 / 3) / 14,
    );
    expect(selected.verificationWarning.message).toMatch(/SJF/);
  });

  it("respects the margin and optional verification switch", () => {
    const processes = workload([10, 12, 11]);
    const wideMargin = selectAlgorithm(processes, {
      goal: "waiting",
      verificationMargin: 0.3,
    });
    const disabled = selectAlgorithm(processes, {
      goal: "waiting",
      verify: false,
      verificationMargin: 0,
    });

    expect(wideMargin.algorithm).toBe("Round Robin");
    expect(wideMargin.verificationWarning).toBeNull();
    expect(disabled.algorithm).toBe("Round Robin");
    expect(disabled.verificationWarning).toBeNull();
  });

  it("does not warn when improvement equals the configured margin", () => {
    const processes = workload([10, 12, 11]);
    const baseline = selectAlgorithm(processes, {
      goal: "waiting",
      verificationMargin: 0,
    });
    const exactMargin = baseline.verificationWarning.improvementRatio;

    expect(baseline.verificationWarning).not.toBeNull();
    expect(
      selectAlgorithm(processes, {
        goal: "waiting",
        verificationMargin: exactMargin,
      }).verificationWarning,
    ).toBeNull();
  });

  it("compares average response time for a response goal", () => {
    const processes = workload([8, 4, 6]);
    const selected = selectAlgorithm(processes, {
      goal: "response",
      verificationMargin: 0.05,
    });

    // RR q=6 starts P1/P2/P3 at 0/6/10 (average response 16/3).
    // SJF starts P2/P3/P1 at 0/4/10 (average response 14/3).
    expect(selected.algorithm).toBe("Round Robin");
    expect(selected.verificationWarning).toMatchObject({
      goal: "response",
      competitor: "SJF",
    });
    expect(selected.verificationWarning.selectedValue).toBeCloseTo(16 / 3);
    expect(selected.verificationWarning.competitorValue).toBeCloseTo(14 / 3);
    expect(selected.verificationWarning.improvementRatio).toBeCloseTo(0.125);
  });

  it("maximizes Jain's fairness index when checking a priority pick", () => {
    const processes = workload([20, 1, 1], { priorities: [1, 2, 3] });
    const selected = selectAlgorithm(processes, {
      goal: "fairness",
      verificationMargin: 0.1,
    });

    // Priority waits (0,20,21): Jain = 1681/2523.
    // RR q=1 waits (2,1,2): Jain = 25/27.
    expect(selected.algorithm).toBe("Priority");
    expect(selected.verificationWarning).toMatchObject({
      goal: "fairness",
      competitor: "Round Robin",
    });
    expect(selected.verificationWarning.selectedValue).toBeCloseTo(1681 / 2523);
    expect(selected.verificationWarning.competitorValue).toBeCloseTo(25 / 27);
    expect(selected.verificationWarning.improvementRatio).toBeCloseTo(
      (25 / 27 - 1681 / 2523) / (1681 / 2523),
    );
  });
});
