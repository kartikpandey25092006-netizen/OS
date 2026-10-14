import { describe, expect, it } from "vitest";
import { ALGORITHM_NAMES } from "../../src/engine/config.js";
import { runAlgorithm } from "../../src/engine/algorithms.js";
import { compare } from "../../src/engine/compare.js";
import { validateProcesses } from "../../src/engine/validate.js";

const one = [{ pid: "P1", arrival: 0, burst: 7, priority: 2 }];
const identical = Array.from({ length: 4 }, (_, index) => ({
  pid: `P${index + 1}`,
  arrival: 0,
  burst: 3,
  priority: 1,
}));

describe("final engine edge cases", () => {
  it.each(ALGORITHM_NAMES)("%s handles a single process", (algorithm) => {
    const result = runAlgorithm(algorithm, one, { quantum: 2 });
    expect(result.gantt).toEqual([{ pid: "P1", start: 0, end: 7 }]);
    expect(result.processResults[0]).toMatchObject({
      completion: 7,
      waiting: 0,
      turnaround: 7,
      response: 0,
    });
  });

  it.each(ALGORITHM_NAMES)(
    "%s breaks identical input ties by PID",
    (algorithm) => {
      const result = runAlgorithm(algorithm, [...identical].reverse(), {
        quantum: 3,
      });
      expect(result.gantt.map(({ pid }) => pid)).toEqual([
        "P1",
        "P2",
        "P3",
        "P4",
      ]);
    },
  );

  it.each(ALGORITHM_NAMES)(
    "%s records a huge arrival gap as idle time",
    (algorithm) => {
      const result = runAlgorithm(
        algorithm,
        [
          { pid: "P1", arrival: 0, burst: 2, priority: 1 },
          { pid: "P2", arrival: 1_000_000, burst: 1, priority: 1 },
        ],
        { quantum: 1 },
      );
      expect(result.gantt).toContainEqual({
        pid: "IDLE",
        start: 2,
        end: 1_000_000,
      });
      expect(
        result.processResults.find(({ pid }) => pid === "P2").completion,
      ).toBe(1_000_001);
    },
  );

  it("compares 120 processes with complete, non-overlapping timelines", () => {
    const processes = Array.from({ length: 120 }, (_, index) => ({
      pid: `P${index + 1}`,
      arrival: Math.floor(index / 4),
      burst: (index % 5) + 1,
      priority: (index % 7) + 1,
    }));
    const started = performance.now();
    const result = compare(processes, { verify: false });
    const elapsed = performance.now() - started;

    for (const { schedule, metrics } of Object.values(result.results)) {
      expect(schedule.processResults).toHaveLength(120);
      expect(metrics.busyTime).toBe(360);
      expect(schedule.gantt.at(-1).end).toBe(metrics.makespan);
      for (let index = 1; index < schedule.gantt.length; index += 1) {
        expect(schedule.gantt[index].start).toBe(schedule.gantt[index - 1].end);
      }
    }
    // Generous CI guard: this case is small enough for an interactive demo.
    expect(elapsed).toBeLessThan(15_000);
  });

  it("rejects invalid inputs before comparison", () => {
    for (const invalid of [
      [],
      [{ ...one[0], burst: 0 }],
      [{ ...one[0], arrival: -1 }],
      [one[0], { ...one[0] }],
      [{ ...one[0], priority: 1.5 }],
    ]) {
      expect(validateProcesses(invalid).valid).toBe(false);
      expect(() => compare(invalid)).toThrow(RangeError);
    }
  });
});
