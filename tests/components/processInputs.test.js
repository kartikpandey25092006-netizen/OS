import { describe, expect, it } from "vitest";
import {
  copyPreset,
  generateRandomProcesses,
  nextProcessId,
  parseProcessCsv,
  PRESET_SCENARIOS,
  toProcessCsv,
} from "../../src/components/processInputs.js";
import { selectAlgorithm } from "../../src/engine/selector.js";
import { validateProcesses } from "../../src/engine/validate.js";

describe("process input helpers", () => {
  it("provides valid presets for all four main selector rules", () => {
    const expected = {
      priority: "priority-spread",
      staggered: "high-cv-staggered",
      batch: "high-cv-batch",
      "round-robin": "low-cv",
      moderate: "moderate",
    };
    for (const preset of PRESET_SCENARIOS) {
      expect(validateProcesses(preset.processes).valid).toBe(true);
      expect(
        selectAlgorithm(preset.processes, { verify: false }).ruleFired,
      ).toBe(expected[preset.id]);
    }
  });

  it("copies presets without sharing mutable rows", () => {
    const first = copyPreset("priority");
    first[0].burst = 99;
    expect(copyPreset("priority")[0].burst).toBe(6);
    expect(() => copyPreset("missing")).toThrow(/unknown preset/i);
  });

  it("uses the first free process ID", () => {
    expect(nextProcessId([{ pid: "P1" }, { pid: "P3" }])).toBe("P2");
  });

  it("generates bounded valid processes with injectable randomness", () => {
    const values = [0, 0.5, 0.99];
    let index = 0;
    const processes = generateRandomProcesses(
      3,
      () => values[index++ % values.length],
    );
    expect(processes).toEqual([
      { pid: "P1", arrival: 0, burst: 11, priority: 5 },
      { pid: "P2", arrival: 0, burst: 11, priority: 5 },
      { pid: "P3", arrival: 0, burst: 11, priority: 5 },
    ]);
    expect(validateProcesses(processes).valid).toBe(true);
    expect(() => generateRandomProcesses(0)).toThrow(/1 to 50/);
    expect(() => generateRandomProcesses(2, () => 1)).toThrow(/random source/i);
  });

  it("round-trips quoted PIDs, BOM, CRLF, and reordered headers", () => {
    const csv =
      '\uFEFFpriority,burst,pid,arrival\r\n1,3,"P,1",0\r\n2,4,"P""2",5\r\n';
    const processes = parseProcessCsv(csv);
    expect(processes).toEqual([
      { pid: "P,1", arrival: 0, burst: 3, priority: 1 },
      { pid: 'P"2', arrival: 5, burst: 4, priority: 2 },
    ]);
    expect(parseProcessCsv(toProcessCsv(processes))).toEqual(processes);
  });

  it("rejects malformed and invalid CSV without returning partial data", () => {
    expect(() => parseProcessCsv("pid,arrival,burst\nP1,0,5")).toThrow(
      /header/i,
    );
    expect(() =>
      parseProcessCsv("pid,arrival,burst,priority\nP1,0,0,1"),
    ).toThrow(/positive integer/i);
    expect(() =>
      parseProcessCsv("pid,arrival,burst,priority\nP1,0.5,3,1"),
    ).toThrow(/arrival must be an integer/i);
    expect(() =>
      parseProcessCsv('pid,arrival,burst,priority\n"P1,0,3,1'),
    ).toThrow(/unclosed csv quotation/i);
  });
});
