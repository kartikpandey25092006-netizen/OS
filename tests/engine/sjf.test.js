import { describe, expect, it } from "vitest";
import { scheduleSJF } from "../../src/engine/sjf.js";

const byPid = (results) =>
  Object.fromEntries(results.map((result) => [result.pid, result]));

describe("scheduleSJF", () => {
  it("runs the shortest available burst first and computes the hand-verified waiting times", () => {
    const processes = [
      { pid: "P1", arrival: 0, burst: 24, priority: 1 },
      { pid: "P3", arrival: 0, burst: 3, priority: 1 },
      { pid: "P2", arrival: 0, burst: 3, priority: 1 },
    ];

    // P2: 0-3, P3: 3-6, P1: 6-30. Waiting = start - arrival
    // gives P2=0, P3=3, P1=6; average waiting = (0 + 3 + 6) / 3 = 3.
    const { gantt, processResults } = scheduleSJF(processes);
    expect(gantt).toEqual([
      { pid: "P2", start: 0, end: 3 },
      { pid: "P3", start: 3, end: 6 },
      { pid: "P1", start: 6, end: 30 },
    ]);
    expect(processResults).toHaveLength(3);
    expect(byPid(processResults)).toMatchObject({
      P2: { start: 0, completion: 3, turnaround: 3, waiting: 0, response: 0 },
      P3: { start: 3, completion: 6, turnaround: 6, waiting: 3, response: 3 },
      P1: { start: 6, completion: 30, turnaround: 30, waiting: 6, response: 6 },
    });
    expect(
      processResults.reduce((sum, process) => sum + process.waiting, 0) / 3,
    ).toBe(3);
  });

  it("does not preempt the running process when shorter work arrives", () => {
    const { gantt } = scheduleSJF([
      { pid: "P3", arrival: 1, burst: 2, priority: 1 },
      { pid: "P1", arrival: 0, burst: 6, priority: 1 },
      { pid: "P2", arrival: 1, burst: 1, priority: 1 },
    ]);

    expect(gantt).toEqual([
      { pid: "P1", start: 0, end: 6 },
      { pid: "P2", start: 6, end: 7 },
      { pid: "P3", start: 7, end: 9 },
    ]);
  });

  it("breaks equal-burst ties by arrival, then PID", () => {
    const { gantt } = scheduleSJF([
      { pid: "P3", arrival: 1, burst: 2, priority: 1 },
      { pid: "P2", arrival: 0, burst: 2, priority: 1 },
      { pid: "P1", arrival: 0, burst: 2, priority: 1 },
    ]);

    expect(gantt.map(({ pid }) => pid)).toEqual(["P1", "P2", "P3"]);
  });
});
