import { describe, expect, it } from "vitest";
import { scheduleFCFS } from "../../src/engine/fcfs.js";
import { scheduleSJF } from "../../src/engine/sjf.js";
import { schedulePriority } from "../../src/engine/priority.js";

const schedulers = [
  ["FCFS", scheduleFCFS],
  ["SJF", scheduleSJF],
  ["Priority", schedulePriority],
];

describe.each(schedulers)(
  "%s shared non-preemptive behavior",
  (_name, schedule) => {
    it("inserts IDLE before the first arrival and for later gaps", () => {
      const { gantt, processResults } = schedule([
        { pid: "P2", arrival: 8, burst: 2, priority: 1 },
        { pid: "P1", arrival: 5, burst: 2, priority: 2 },
      ]);

      expect(gantt).toEqual([
        { pid: "IDLE", start: 0, end: 5 },
        { pid: "P1", start: 5, end: 7 },
        { pid: "IDLE", start: 7, end: 8 },
        { pid: "P2", start: 8, end: 10 },
      ]);
      expect(processResults.find(({ pid }) => pid === "P1")).toMatchObject({
        start: 5,
        completion: 7,
        turnaround: 2,
        waiting: 0,
        response: 0,
      });
    });

    it("handles a single process with complete result fields", () => {
      const process = { pid: "P1", arrival: 0, burst: 4, priority: 3 };
      expect(schedule([process])).toEqual({
        gantt: [{ pid: "P1", start: 0, end: 4 }],
        processResults: [
          {
            ...process,
            start: 0,
            completion: 4,
            turnaround: 4,
            waiting: 0,
            response: 0,
          },
        ],
      });
    });

    it("uses numeric PID order for identical arrivals and selection values", () => {
      const processes = [
        { pid: "P10", arrival: 2, burst: 1, priority: 1 },
        { pid: "P2", arrival: 2, burst: 1, priority: 1 },
        { pid: "P1", arrival: 2, burst: 1, priority: 1 },
      ];
      const { gantt, processResults } = schedule(processes);

      expect(gantt).toEqual([
        { pid: "IDLE", start: 0, end: 2 },
        { pid: "P1", start: 2, end: 3 },
        { pid: "P2", start: 3, end: 4 },
        { pid: "P10", start: 4, end: 5 },
      ]);
      expect(processResults.map(({ pid }) => pid)).toEqual(
        processes.map(({ pid }) => pid),
      );
    });

    it("does not mutate its input and returns the same schedule on repeated calls", () => {
      const processes = Object.freeze([
        Object.freeze({ pid: "P2", arrival: 0, burst: 2, priority: 1 }),
        Object.freeze({ pid: "P1", arrival: 0, burst: 4, priority: 2 }),
      ]);

      const first = schedule(processes, {});
      expect(schedule(processes, {})).toEqual(first);
      expect(processes.map(({ pid }) => pid)).toEqual(["P2", "P1"]);
    });

    it("rejects invalid workload data and the reserved IDLE PID", () => {
      expect(() =>
        schedule([{ pid: "P1", arrival: 0, burst: 0, priority: 1 }]),
      ).toThrow();
      expect(() =>
        schedule([{ pid: "IDLE", arrival: 0, burst: 1, priority: 1 }]),
      ).toThrow();
    });
  },
);
