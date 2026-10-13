import { describe, expect, it } from "vitest";
import { scheduleFCFS } from "../../src/engine/fcfs.js";
import { scheduleSJF } from "../../src/engine/sjf.js";
import { scheduleSRTF } from "../../src/engine/srtf.js";
import { schedulePriority } from "../../src/engine/priority.js";
import { scheduleRoundRobin } from "../../src/engine/roundRobin.js";

const schedulers = [
  ["FCFS", scheduleFCFS],
  ["SJF", scheduleSJF],
  ["SRTF", scheduleSRTF],
  ["Priority", schedulePriority],
  [
    "preemptive Priority",
    (processes) => schedulePriority(processes, { preemptive: true }),
  ],
  ["Round Robin", scheduleRoundRobin],
];

describe.each(schedulers)("%s timeline safety", (_name, schedule) => {
  it("throws rather than losing a tick near the safe integer limit", () => {
    const processes = [
      { pid: "P1", arrival: 0, burst: 1, priority: 1 },
      { pid: "P2", arrival: Number.MAX_SAFE_INTEGER, burst: 1, priority: 1 },
    ];
    expect(() => schedule(processes)).toThrow(/safe integer/);
  });
});
