import { describe, expect, it } from "vitest";
import { schedulePriority } from "../../src/engine/priority.js";

describe("schedulePriority", () => {
  it("uses lower numbers as higher priority", () => {
    const { gantt, processResults } = schedulePriority([
      { pid: "P1", arrival: 0, burst: 4, priority: 3 },
      { pid: "P2", arrival: 0, burst: 3, priority: 1 },
      { pid: "P3", arrival: 0, burst: 2, priority: 2 },
    ]);

    // Priority 1 (P2) runs 0-3, priority 2 (P3) runs 3-5, and
    // priority 3 (P1) runs 5-9, so their waits are 0, 3, and 5.
    expect(gantt).toEqual([
      { pid: "P2", start: 0, end: 3 },
      { pid: "P3", start: 3, end: 5 },
      { pid: "P1", start: 5, end: 9 },
    ]);
    const byPid = Object.fromEntries(
      processResults.map((process) => [process.pid, process]),
    );
    expect(byPid).toMatchObject({
      P2: { waiting: 0, turnaround: 3, response: 0 },
      P3: { waiting: 3, turnaround: 5, response: 3 },
      P1: { waiting: 5, turnaround: 9, response: 5 },
    });
  });

  it("breaks equal-priority ties by earlier arrival, then lower PID", () => {
    const { gantt } = schedulePriority([
      { pid: "P3", arrival: 1, burst: 1, priority: 1 },
      { pid: "P2", arrival: 0, burst: 1, priority: 1 },
      { pid: "P1", arrival: 0, burst: 1, priority: 1 },
    ]);

    expect(gantt.map(({ pid }) => pid)).toEqual(["P1", "P2", "P3"]);
  });

  it("does not preempt for a later higher-priority arrival", () => {
    const { gantt } = schedulePriority([
      { pid: "P1", arrival: 0, burst: 5, priority: 9 },
      { pid: "P2", arrival: 1, burst: 2, priority: 0 },
    ]);

    expect(gantt).toEqual([
      { pid: "P1", start: 0, end: 5 },
      { pid: "P2", start: 5, end: 7 },
    ]);
  });
});
