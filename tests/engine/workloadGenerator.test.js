import { describe, expect, it } from "vitest";
import {
  generateWorkload,
  generateWorkloads,
  seededRandom,
  WORKLOAD_TYPES,
} from "../../src/engine/workloadGenerator.js";
import { validateProcesses } from "../../src/engine/validate.js";

describe("seeded workload generator", () => {
  it("repeats the same random sequence and workload for the same seed", () => {
    const first = seededRandom(123);
    const second = seededRandom(123);
    expect(Array.from({ length: 8 }, () => first())).toEqual(
      Array.from({ length: 8 }, () => second()),
    );
    expect(generateWorkload({ type: "mixed", size: 12, seed: 99 })).toEqual(
      generateWorkload({ type: "mixed", size: 12, seed: 99 }),
    );
    expect(generateWorkload({ type: "mixed", size: 12, seed: 99 })).not.toEqual(
      generateWorkload({ type: "mixed", size: 12, seed: 100 }),
    );
  });

  it("generates exactly 50 valid workloads spanning all six types and allowed sizes", () => {
    const workloads = generateWorkloads({ count: 50, seed: 2026 });
    expect(workloads).toEqual(generateWorkloads({ count: 50, seed: 2026 }));
    expect(workloads).toHaveLength(50);
    expect(new Set(workloads.map(({ type }) => type))).toEqual(
      new Set(WORKLOAD_TYPES),
    );
    for (const workload of workloads) {
      expect(workload.size).toBeGreaterThanOrEqual(3);
      expect(workload.size).toBeLessThanOrEqual(50);
      expect(workload.processes).toHaveLength(workload.size);
      expect(validateProcesses(workload.processes).valid).toBe(true);
    }
  });

  it("creates the promised batch, staggered, and priority-heavy patterns", () => {
    const batch = generateWorkload({ type: "batch-arrival", size: 8, seed: 1 });
    expect(batch.every(({ arrival }) => arrival === 0)).toBe(true);
    const staggered = generateWorkload({
      type: "staggered-arrival",
      size: 8,
      seed: 1,
    });
    expect(staggered[0].arrival).toBe(0);
    expect(
      staggered.every(
        (process, index) =>
          index === 0 || process.arrival > staggered[index - 1].arrival,
      ),
    ).toBe(true);
    const priority = generateWorkload({
      type: "priority-heavy",
      size: 8,
      seed: 1,
    });
    expect(priority.map(({ priority: value }) => value)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it("rejects invalid types, sizes, counts, and seeds", () => {
    expect(() => generateWorkload({ type: "unknown" })).toThrow(
      /unknown workload type/i,
    );
    expect(() => generateWorkload({ size: 2 })).toThrow(/size/i);
    expect(() => generateWorkloads({ count: 501 })).toThrow(/count/i);
    expect(() => generateWorkloads({ seed: 1.5 })).toThrow(/seed/i);
  });
});
