import { describe, expect, it } from "vitest";
import { scheduleFCFS } from "../../src/engine/fcfs.js";
import { scheduleSJF } from "../../src/engine/sjf.js";
import { scheduleSRTF } from "../../src/engine/srtf.js";
import { schedulePriority } from "../../src/engine/priority.js";
import { scheduleRoundRobin } from "../../src/engine/roundRobin.js";
import { calculateMetrics } from "../../src/engine/metrics.js";

const WORKLOAD_COUNT = 500;

// A local, fixed-seed generator keeps failed cases reproducible. The evaluation
// workload generator is a separate Batch 7 feature.
function random(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function workloads() {
  const next = random(0x20261013);
  const integer = (min, max) => min + Math.floor(next() * (max - min + 1));

  return Array.from({ length: WORKLOAD_COUNT }, () => {
    const count = integer(1, 6);
    return Array.from({ length: count }, (_, index) => ({
      pid: `P${index + 1}`,
      arrival: integer(0, 12),
      burst: integer(1, 8),
      priority: integer(-2, 4),
    }));
  });
}

const cases = workloads();
const algorithms = [
  ["FCFS", scheduleFCFS, () => ({})],
  ["SJF", scheduleSJF, () => ({})],
  ["SRTF", scheduleSRTF, (index) => ({ contextSwitchCost: index % 3 })],
  [
    "Priority",
    schedulePriority,
    (index) => ({
      agingInterval: index % 2 === 0 ? (index % 5) + 1 : undefined,
    }),
  ],
  [
    "Preemptive Priority",
    schedulePriority,
    (index) => ({
      preemptive: true,
      agingInterval: index % 2 === 0 ? (index % 5) + 1 : undefined,
      contextSwitchCost: index % 3,
    }),
  ],
  [
    "Round Robin",
    scheduleRoundRobin,
    (index) => ({
      quantum: (index % 4) + 1,
      contextSwitchCost: index % 3,
    }),
  ],
];

function checkInvariants(processes, { gantt, processResults }, label) {
  const inputByPid = new Map(
    processes.map((process) => [process.pid, process]),
  );
  const resultsByPid = new Map(
    processResults.map((result) => [result.pid, result]),
  );
  const executedByPid = new Map(processes.map(({ pid }) => [pid, 0]));
  let previousEnd = 0;
  let busyTime = 0;

  expect(processResults.length, label).toBe(processes.length);
  expect(resultsByPid.size, label).toBe(processes.length);
  expect(gantt.length, label).toBeGreaterThan(0);

  for (const segment of gantt) {
    expect(Number.isSafeInteger(segment.start), label).toBe(true);
    expect(Number.isSafeInteger(segment.end), label).toBe(true);
    expect(segment.start, label).toBe(previousEnd);
    expect(segment.end, label).toBeGreaterThan(segment.start);
    previousEnd = segment.end;

    if (segment.pid === "IDLE" || segment.pid === "CONTEXT_SWITCH") continue;
    const input = inputByPid.get(segment.pid);
    expect(input, label).toBeDefined();
    expect(segment.start, label).toBeGreaterThanOrEqual(input.arrival);
    const duration = segment.end - segment.start;
    executedByPid.set(segment.pid, executedByPid.get(segment.pid) + duration);
    busyTime += duration;
  }

  for (const input of processes) {
    const result = resultsByPid.get(input.pid);
    expect(result, label).toBeDefined();
    expect(result.turnaround, label).toBe(result.completion - input.arrival);
    expect(result.waiting, label).toBe(result.turnaround - input.burst);
    expect(result.response, label).toBe(result.start - input.arrival);
    expect(result.start, label).toBeGreaterThanOrEqual(input.arrival);
    expect(result.completion, label).toBeGreaterThan(result.start);
    expect(executedByPid.get(input.pid), label).toBe(input.burst);
  }

  const metrics = calculateMetrics({ gantt, processResults });
  expect(metrics.makespan, label).toBe(previousEnd);
  expect(metrics.cpuUtilization, label).toBeCloseTo(busyTime / previousEnd, 12);
  expect(metrics.cpuUtilization, label).toBeGreaterThanOrEqual(0);
  expect(metrics.cpuUtilization, label).toBeLessThanOrEqual(1);
}

describe("scheduler invariants on deterministic random workloads", () => {
  for (const [name, schedule, optionsForCase] of algorithms) {
    it(`${name} satisfies all invariants on ${WORKLOAD_COUNT} workloads`, () => {
      for (let index = 0; index < cases.length; index += 1) {
        const processes = cases[index];
        const label = `${name} case ${index + 1}: ${JSON.stringify(processes)}`;
        const result = schedule(processes, optionsForCase(index));
        checkInvariants(processes, result, label);
      }
    });
  }
});
