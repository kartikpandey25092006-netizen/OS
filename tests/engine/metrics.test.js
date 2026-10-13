import { describe, expect, it } from "vitest";
import { calculateMetrics } from "../../src/engine/metrics.js";

describe("calculateMetrics", () => {
  it("calculates hand-verified averages, utilization, throughput, and fairness", () => {
    const gantt = [
      { pid: "IDLE", start: 0, end: 2 },
      { pid: "P1", start: 2, end: 4 },
      { pid: "CONTEXT_SWITCH", type: "CONTEXT_SWITCH", start: 4, end: 5 },
      { pid: "P2", start: 5, end: 7 },
      { pid: "CONTEXT_SWITCH", type: "CONTEXT_SWITCH", start: 7, end: 8 },
      { pid: "P1", start: 8, end: 9 },
    ];
    const processResults = [
      {
        pid: "P2",
        arrival: 3,
        burst: 2,
        priority: 1,
        start: 5,
        completion: 7,
        turnaround: 4,
        waiting: 2,
        response: 2,
      },
      {
        pid: "P1",
        arrival: 2,
        burst: 3,
        priority: 1,
        start: 2,
        completion: 9,
        turnaround: 7,
        waiting: 4,
        response: 0,
      },
    ];

    const metrics = calculateMetrics({ gantt, processResults });

    // P1 runs 2-4 and 8-9, P2 runs 5-7: busy=5 of makespan=9.
    // Waits (P2=2, P1=4) average to 3. Turnarounds (4, 7) average to 5.5.
    // Responses (2, 0) average to 1. Two completions in 9 units give 2/9.
    // Jain(wait) = (2+4)^2 / (2*(2^2+4^2)) = 36/40 = 0.9.
    expect(metrics.perProcess).toEqual(processResults);
    expect(metrics.averages).toEqual({
      waiting: 3,
      turnaround: 5.5,
      response: 1,
    });
    expect(metrics.busyTime).toBe(5);
    expect(metrics.idleTime).toBe(2);
    expect(metrics.contextSwitchTime).toBe(2);
    expect(metrics.makespan).toBe(9);
    expect(metrics.cpuUtilization).toBeCloseTo(5 / 9);
    expect(metrics.throughput).toBeCloseTo(2 / 9);
    expect(metrics.maximumWaitingTime).toBe(4);
    expect(metrics.jainsFairnessIndex).toBeCloseTo(0.9);
  });

  it("defines fairness as 1 when every process has zero waiting", () => {
    const metrics = calculateMetrics({
      gantt: [
        { pid: "P1", start: 0, end: 2 },
        { pid: "P2", start: 2, end: 4 },
      ],
      processResults: [
        {
          pid: "P1",
          arrival: 0,
          burst: 2,
          priority: 1,
          start: 0,
          completion: 2,
          turnaround: 2,
          waiting: 0,
          response: 0,
        },
        {
          pid: "P2",
          arrival: 2,
          burst: 2,
          priority: 1,
          start: 2,
          completion: 4,
          turnaround: 2,
          waiting: 0,
          response: 0,
        },
      ],
    });

    expect(metrics.averages).toEqual({
      waiting: 0,
      turnaround: 2,
      response: 0,
    });
    expect(metrics.maximumWaitingTime).toBe(0);
    expect(metrics.jainsFairnessIndex).toBe(1);
    expect(metrics.cpuUtilization).toBe(1);
    expect(metrics.throughput).toBe(0.5);
  });

  it("includes initial idle time in a single process makespan", () => {
    const metrics = calculateMetrics({
      gantt: [
        { pid: "IDLE", start: 0, end: 5 },
        { pid: "P1", start: 5, end: 8 },
      ],
      processResults: [
        {
          pid: "P1",
          arrival: 5,
          burst: 3,
          priority: 4,
          start: 5,
          completion: 8,
          turnaround: 3,
          waiting: 0,
          response: 0,
        },
      ],
    });

    // The wall clock ends at t=8, including five idle units before arrival.
    expect(metrics.makespan).toBe(8);
    expect(metrics.busyTime).toBe(3);
    expect(metrics.idleTime).toBe(5);
    expect(metrics.cpuUtilization).toBeCloseTo(3 / 8);
    expect(metrics.throughput).toBeCloseTo(1 / 8);
    expect(metrics.jainsFairnessIndex).toBe(1);
  });

  it("does not mutate the supplied schedule and is repeatable", () => {
    const gantt = Object.freeze([
      Object.freeze({ pid: "P1", start: 0, end: 2 }),
    ]);
    const processResults = Object.freeze([
      Object.freeze({
        pid: "P1",
        arrival: 0,
        burst: 2,
        priority: 1,
        start: 0,
        completion: 2,
        turnaround: 2,
        waiting: 0,
        response: 0,
      }),
    ]);

    const first = calculateMetrics({ gantt, processResults });
    expect(calculateMetrics({ gantt, processResults })).toEqual(first);
    expect(gantt).toEqual([{ pid: "P1", start: 0, end: 2 }]);
    expect(processResults[0]).toMatchObject({
      waiting: 0,
      turnaround: 2,
      response: 0,
    });
  });
});
