import { describe, expect, it } from "vitest";
import { scheduleSRTF } from "../../src/engine/srtf.js";

const byPid = (results) =>
  Object.fromEntries(results.map((result) => [result.pid, result]));

describe("scheduleSRTF", () => {
  it("preempts for the shortest remaining job and computes the hand-verified average", () => {
    const processes = [
      { pid: "P1", arrival: 0, burst: 8, priority: 1 },
      { pid: "P2", arrival: 1, burst: 4, priority: 1 },
      { pid: "P3", arrival: 2, burst: 9, priority: 1 },
      { pid: "P4", arrival: 3, burst: 5, priority: 1 },
    ];

    // P1 runs 0-1, P2 1-5, P4 5-10, P1 10-17, P3 17-26.
    // Waiting = completion - arrival - burst: 9, 0, 15, 2.
    // Average waiting = (9 + 0 + 15 + 2) / 4 = 6.5.
    const { gantt, processResults } = scheduleSRTF(processes);
    expect(gantt).toEqual([
      { pid: "P1", start: 0, end: 1 },
      { pid: "P2", start: 1, end: 5 },
      { pid: "P4", start: 5, end: 10 },
      { pid: "P1", start: 10, end: 17 },
      { pid: "P3", start: 17, end: 26 },
    ]);
    expect(processResults.map(({ pid }) => pid)).toEqual(
      processes.map(({ pid }) => pid),
    );
    expect(byPid(processResults)).toMatchObject({
      P1: { start: 0, completion: 17, turnaround: 17, waiting: 9, response: 0 },
      P2: { start: 1, completion: 5, turnaround: 4, waiting: 0, response: 0 },
      P3: {
        start: 17,
        completion: 26,
        turnaround: 24,
        waiting: 15,
        response: 15,
      },
      P4: { start: 5, completion: 10, turnaround: 7, waiting: 2, response: 2 },
    });
    expect(
      processResults.reduce((sum, process) => sum + process.waiting, 0) / 4,
    ).toBe(6.5);
  });

  it("keeps the earlier arrival when a new process ties the remaining time", () => {
    const { gantt } = scheduleSRTF([
      { pid: "P2", arrival: 2, burst: 2, priority: 1 },
      { pid: "P1", arrival: 0, burst: 4, priority: 1 },
    ]);

    // At t=2, P1 has 2 left and P2 needs 2; P1 arrived first.
    expect(gantt).toEqual([
      { pid: "P1", start: 0, end: 4 },
      { pid: "P2", start: 4, end: 6 },
    ]);
  });

  it("records a context switch only between different running processes", () => {
    const { gantt, processResults } = scheduleSRTF(
      [
        { pid: "P1", arrival: 0, burst: 5, priority: 1 },
        { pid: "P2", arrival: 1, burst: 1, priority: 1 },
      ],
      { contextSwitchCost: 2 },
    );

    // P1 0-1, switch 1-3, P2 3-4, switch 4-6, P1 6-10.
    expect(gantt).toEqual([
      { pid: "P1", start: 0, end: 1 },
      { pid: "CONTEXT_SWITCH", type: "CONTEXT_SWITCH", start: 1, end: 3 },
      { pid: "P2", start: 3, end: 4 },
      { pid: "CONTEXT_SWITCH", type: "CONTEXT_SWITCH", start: 4, end: 6 },
      { pid: "P1", start: 6, end: 10 },
    ]);
    expect(byPid(processResults)).toMatchObject({
      P1: { completion: 10, waiting: 5 },
      P2: { start: 3, completion: 4, waiting: 2 },
    });
  });

  it("does not charge a switch at initial dispatch or after an idle gap", () => {
    const { gantt } = scheduleSRTF(
      [
        { pid: "P1", arrival: 5, burst: 1, priority: 1 },
        { pid: "P2", arrival: 8, burst: 1, priority: 1 },
      ],
      { contextSwitchCost: 3 },
    );

    expect(gantt).toEqual([
      { pid: "IDLE", start: 0, end: 5 },
      { pid: "P1", start: 5, end: 6 },
      { pid: "IDLE", start: 6, end: 8 },
      { pid: "P2", start: 8, end: 9 },
    ]);
  });

  it("validates the workload and context-switch cost", () => {
    expect(() => scheduleSRTF([])).toThrow();
    expect(() =>
      scheduleSRTF([{ pid: "P1", arrival: 0, burst: 0, priority: 1 }]),
    ).toThrow();
    expect(() =>
      scheduleSRTF([{ pid: "P1", arrival: 0, burst: 1, priority: 1 }], {
        contextSwitchCost: -1,
      }),
    ).toThrow();
  });
});
