import { describe, expect, it } from "vitest";
import { PRESET_SCENARIOS } from "../../src/components/processInputs.js";
import { compare } from "../../src/engine/compare.js";

const demos = [
  ["priority", "priority-spread", "Priority"],
  ["staggered", "high-cv-staggered", "SRTF"],
  ["round-robin", "low-cv", "Round Robin"],
  ["moderate", "moderate", "SJF"],
];

describe("scripted demo presets", () => {
  it.each(demos)("%s fires %s and runs %s", (id, rule, algorithm) => {
    const processes = PRESET_SCENARIOS.find(
      (preset) => preset.id === id,
    ).processes;
    const result = compare(processes);
    expect(result.selection.ruleFired).toBe(rule);
    expect(result.selection.algorithm).toBe(algorithm);
    expect(result.results.Adaptive.schedule.processResults).toHaveLength(
      processes.length,
    );
  });
});
