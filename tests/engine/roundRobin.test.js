import { describe, expect, it } from "vitest";
import { scheduleRoundRobin } from "../../src/engine/roundRobin.js";

const byPid = (results) =>
  Object.fromEntries(results.map((result) => [result.pid, result]));

describe("scheduleRoundRobin", () => {
  it("uses quantum 4 and computes the hand-verified waiting times", () => {
    const processes = [
      { pid: "P3", arrival: 0, burst: 3, priority: 1 },
      { pid: "P1", arrival: 0, burst: 24, priority: 1 },
      { pid: "P2", arrival: 0, burst: 3, priority: 1 },
    ];

    // PID order gives P1 0-4, P2 4-7, P3 7-10, P1 10-30.
    // Waiting = completion - arrival - burst: P1=6, P2=4, P3=7.
    // Average = 17 / 3 = 5.666..., displayed as 5.67.
    const { gantt, processResults } = scheduleRoundRobin(processes, {
      quantum: 4,
    });
    expect(gantt).toEqual([
      { pid: "P1", start: 0, end: 4 },
      { pid: "P2", start: 4, end: 7 },
      { pid: "P3", start: 7, end: 10 },
      { pid: "P1", start: 10, end: 30 },
    ]);
    expect(processResults.map(({ pid }) => pid)).toEqual(
      processes.map(({ pid }) => pid),
    );
    expect(byPid(processResults)).toMatchObject({
      P1: { start: 0, completion: 30, turnaround: 30, waiting: 6, response: 0 },
      P2: { start: 4, completion: 7, turnaround: 7, waiting: 4, response: 4 },
      P3: { start: 7, completion: 10, turnaround: 10, waiting: 7, response: 7 },
    });
    expect(
      processResults.reduce((sum, process) => sum + process.waiting, 0) / 3,
    ).toBeCloseTo(5.67, 2);
  });

  it("queues an arrival at quantum expiry before the preempted process", () => {
    const { gantt } = scheduleRoundRobin(
      [
        { pid: "P1", arrival: 0, burst: 8, priority: 1 },
        { pid: "P2", arrival: 4, burst: 1, priority: 1 },
      ],
      { quantum: 4 },
    );

    // P2 arrives at t=4, exactly when P1's quantum expires.
    expect(gantt).toEqual([
      { pid: "P1", start: 0, end: 4 },
      { pid: "P2", start: 4, end: 5 },
      { pid: "P1", start: 5, end: 9 },
    ]);
  });

  it("counts context-switch overhead and increases waiting time", () => {
    const processes = [
      { pid: "P1", arrival: 0, burst: 4, priority: 1 },
      { pid: "P2", arrival: 0, burst: 4, priority: 1 },
    ];
    const noCost = scheduleRoundRobin(processes, { quantum: 2 });
    const withCost = scheduleRoundRobin(processes, {
      quantum: 2,
      contextSwitchCost: 1,
    });

    // With cost: P1 0-2, switch 2-3, P2 3-5, switch 5-6,
    // P1 6-8, switch 8-9, P2 9-11. Waits rise from (2,4) to (4,7).
    expect(withCost.gantt).toEqual([
      { pid: "P1", start: 0, end: 2 },
      { pid: "CONTEXT_SWITCH", type: "CONTEXT_SWITCH", start: 2, end: 3 },
      { pid: "P2", start: 3, end: 5 },
      { pid: "CONTEXT_SWITCH", type: "CONTEXT_SWITCH", start: 5, end: 6 },
      { pid: "P1", start: 6, end: 8 },
      { pid: "CONTEXT_SWITCH", type: "CONTEXT_SWITCH", start: 8, end: 9 },
      { pid: "P2", start: 9, end: 11 },
    ]);
    expect(byPid(noCost.processResults)).toMatchObject({
      P1: { waiting: 2 },
      P2: { waiting: 4 },
    });
    expect(byPid(withCost.processResults)).toMatchObject({
      P1: { waiting: 4 },
      P2: { waiting: 7 },
    });
    const averageWait = (results) =>
      results.reduce((sum, process) => sum + process.waiting, 0) /
      results.length;
    expect(averageWait(withCost.processResults)).toBeGreaterThan(
      averageWait(noCost.processResults),
    );
  });

  it("merges consecutive quanta for a lone process without switch cost", () => {
    const { gantt, processResults } = scheduleRoundRobin(
      [{ pid: "P1", arrival: 0, burst: 5, priority: 1 }],
      { quantum: 2, contextSwitchCost: 3 },
    );

    expect(gantt).toEqual([{ pid: "P1", start: 0, end: 5 }]);
    expect(processResults[0]).toMatchObject({
      start: 0,
      completion: 5,
      waiting: 0,
      response: 0,
    });
  });

  it("does not charge a switch after an idle gap", () => {
    const { gantt } = scheduleRoundRobin(
      [
        { pid: "P1", arrival: 1, burst: 1, priority: 1 },
        { pid: "P2", arrival: 5, burst: 2, priority: 1 },
      ],
      { quantum: 1, contextSwitchCost: 3 },
    );

    expect(gantt).toEqual([
      { pid: "IDLE", start: 0, end: 1 },
      { pid: "P1", start: 1, end: 2 },
      { pid: "IDLE", start: 2, end: 5 },
      { pid: "P2", start: 5, end: 7 },
    ]);
  });

  it("validates quantum, context-switch cost, and workload", () => {
    const process = [{ pid: "P1", arrival: 0, burst: 1, priority: 1 }];
    expect(() => scheduleRoundRobin(process, { quantum: 0 })).toThrow();
    expect(() => scheduleRoundRobin(process, { quantum: 1.5 })).toThrow();
    expect(() =>
      scheduleRoundRobin(process, { quantum: 1, contextSwitchCost: -1 }),
    ).toThrow();
    expect(() => scheduleRoundRobin([], { quantum: 1 })).toThrow();
  });
});
