import { describe, expect, it } from "vitest";
import { selectAlgorithm } from "../../src/engine/selector.js";
import { compare } from "../../src/engine/compare.js";

const processes = [
  { pid: "P1", arrival: 0, burst: 20, priority: 1 },
  { pid: "P2", arrival: 0, burst: 1, priority: 2 },
  { pid: "P3", arrival: 0, burst: 1, priority: 3 },
];

describe("priority aging toggle", () => {
  it("disables fairness auto-aging and an explicit interval when turned off", () => {
    const enabled = selectAlgorithm(processes, {
      goal: "fairness",
      agingEnabled: true,
      agingInterval: 2,
      verify: false,
    });
    const disabled = selectAlgorithm(processes, {
      goal: "fairness",
      agingEnabled: false,
      agingInterval: 2,
      verify: false,
    });
    expect(enabled.algorithm).toBe("Priority");
    expect(enabled.agingInterval).toBe(2);
    expect(disabled.algorithm).toBe("Priority");
    expect(disabled).not.toHaveProperty("agingInterval");
    expect(disabled.explanation).not.toMatch(/aging improves/i);
  });

  it("keeps the comparison baseline unaged when the toggle is off", () => {
    const disabled = compare(processes, {
      goal: "fairness",
      agingEnabled: false,
      agingInterval: 1,
    });
    const defaultRun = compare(processes, { goal: "fairness" });
    expect(disabled.results.Priority.schedule.gantt).toEqual(
      defaultRun.results.Priority.schedule.gantt,
    );
  });
});
