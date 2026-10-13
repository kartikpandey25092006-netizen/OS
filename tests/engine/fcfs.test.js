import { describe, expect, it } from "vitest";
import { scheduleFCFS } from "../../src/engine/fcfs.js";

const byPid = (results) =>
  Object.fromEntries(results.map((result) => [result.pid, result]));

describe("scheduleFCFS", () => {
  it("runs equal arrivals in PID order and computes the hand-verified waiting times", () => {
    const processes = [
      { pid: "P3", arrival: 0, burst: 3, priority: 1 },
      { pid: "P1", arrival: 0, burst: 24, priority: 1 },
      { pid: "P2", arrival: 0, burst: 3, priority: 1 },
    ];

    // P1: 0-24, P2: 24-27, P3: 27-30. Waiting = start - arrival
    // gives 0, 24, 27; average waiting = (0 + 24 + 27) / 3 = 17.
    const { gantt, processResults } = scheduleFCFS(processes);
    expect(gantt).toEqual([
      { pid: "P1", start: 0, end: 24 },
      { pid: "P2", start: 24, end: 27 },
      { pid: "P3", start: 27, end: 30 },
    ]);
    expect(processResults).toHaveLength(3);
    expect(byPid(processResults)).toMatchObject({
      P1: { start: 0, completion: 24, turnaround: 24, waiting: 0, response: 0 },
      P2: {
        start: 24,
        completion: 27,
        turnaround: 27,
        waiting: 24,
        response: 24,
      },
      P3: {
        start: 27,
        completion: 30,
        turnaround: 30,
        waiting: 27,
        response: 27,
      },
    });
    expect(
      processResults.reduce((sum, process) => sum + process.waiting, 0) / 3,
    ).toBe(17);
  });

  it("chooses earlier arrival before PID when the CPU becomes free", () => {
    const { gantt } = scheduleFCFS([
      { pid: "P1", arrival: 2, burst: 2, priority: 1 },
      { pid: "P2", arrival: 0, burst: 3, priority: 1 },
      { pid: "P3", arrival: 1, burst: 1, priority: 1 },
    ]);

    expect(gantt).toEqual([
      { pid: "P2", start: 0, end: 3 },
      { pid: "P3", start: 3, end: 4 },
      { pid: "P1", start: 4, end: 6 },
    ]);
  });

  it("rejects an empty workload", () => {
    expect(() => scheduleFCFS([])).toThrow();
  });
});
