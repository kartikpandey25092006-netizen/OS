import { describe, expect, it } from "vitest";
import { buildResultsCsv } from "../../src/components/results/resultsCsv.js";
import { compare } from "../../src/engine/compare.js";

describe("results CSV", () => {
  it("exports all fixed schedulers and the adaptive run with full-precision scores", () => {
    const comparison = compare([
      { pid: "P1", arrival: 0, burst: 5, priority: 1 },
      { pid: "P2", arrival: 1, burst: 2, priority: 1 },
    ]);
    const csv = buildResultsCsv(comparison);
    const rows = csv.trim().split("\r\n");
    expect(rows).toHaveLength(7);
    expect(rows[0]).toContain("Average waiting time");
    expect(rows[6]).toContain("Adaptive");
    expect(rows[6]).toContain(comparison.adaptive.algorithm);
    expect(rows[6]).toContain(
      String(comparison.results.Adaptive.metrics.averages.waiting),
    );
  });
});
