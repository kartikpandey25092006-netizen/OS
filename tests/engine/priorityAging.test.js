import { describe, expect, it } from "vitest";
import { schedulePriority } from "../../src/engine/priority.js";

const byPid = (results) =>
  Object.fromEntries(results.map((result) => [result.pid, result]));

describe("schedulePriority preemption and aging", () => {
  it("preempts when a higher-priority process arrives if requested", () => {
    const processes = [
      { pid: "P1", arrival: 0, burst: 5, priority: 5 },
      { pid: "P2", arrival: 1, burst: 2, priority: 1 },
    ];

    // Without preemption: P1 0-5, P2 5-7.
    // With preemption: P1 0-1, P2 1-3, P1 3-7.
    expect(schedulePriority(processes).gantt).toEqual([
      { pid: "P1", start: 0, end: 5 },
      { pid: "P2", start: 5, end: 7 },
    ]);
    const { gantt, processResults } = schedulePriority(processes, {
      preemptive: true,
    });
    expect(gantt).toEqual([
      { pid: "P1", start: 0, end: 1 },
      { pid: "P2", start: 1, end: 3 },
      { pid: "P1", start: 3, end: 7 },
    ]);
    expect(byPid(processResults)).toMatchObject({
      P1: { start: 0, completion: 7, waiting: 2, response: 0 },
      P2: { start: 1, completion: 3, waiting: 0, response: 0 },
    });
  });

  it("records context-switch overhead on preemption and return", () => {
    const { gantt } = schedulePriority(
      [
        { pid: "P1", arrival: 0, burst: 5, priority: 5 },
        { pid: "P2", arrival: 1, burst: 2, priority: 1 },
      ],
      { preemptive: true, contextSwitchCost: 1 },
    );

    expect(gantt).toEqual([
      { pid: "P1", start: 0, end: 1 },
      { pid: "CONTEXT_SWITCH", type: "CONTEXT_SWITCH", start: 1, end: 2 },
      { pid: "P2", start: 2, end: 4 },
      { pid: "CONTEXT_SWITCH", type: "CONTEXT_SWITCH", start: 4, end: 5 },
      { pid: "P1", start: 5, end: 9 },
    ]);
  });

  it("ages a waiting low-priority process into the CPU ahead of later arrivals", () => {
    const processes = [
      { pid: "P0", arrival: 0, burst: 2, priority: 5 },
      ...Array.from({ length: 7 }, (_, index) => ({
        pid: `P${index + 1}`,
        arrival: index * 2,
        burst: 2,
        priority: 1,
      })),
    ];

    // Without aging, P1-P7 occupy 0-14 and P0 starts at 14.
    // Every 2 units of ready-queue waiting improves P0 priority by 1.
    // At t=8 it reaches priority 1 and wins the tie by earlier arrival.
    const noAging = schedulePriority(processes);
    const withAging = schedulePriority(processes, { agingInterval: 2 });
    expect(byPid(noAging.processResults).P0).toMatchObject({
      start: 14,
      completion: 16,
      waiting: 14,
    });
    expect(byPid(withAging.processResults).P0).toMatchObject({
      start: 8,
      completion: 10,
      waiting: 8,
    });
    expect(withAging.gantt.findIndex(({ pid }) => pid === "P0")).toBeLessThan(
      withAging.gantt.findIndex(({ pid }) => pid === "P7"),
    );
  });

  it("validates the aging interval when provided", () => {
    const processes = [{ pid: "P1", arrival: 0, burst: 1, priority: 1 }];
    expect(() => schedulePriority(processes, { agingInterval: 0 })).toThrow();
    expect(() => schedulePriority(processes, { agingInterval: 1.5 })).toThrow();
  });
});
