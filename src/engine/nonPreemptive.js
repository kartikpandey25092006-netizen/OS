import {
  appendSegment,
  assertValidProcesses,
  comparePid,
  processResult,
} from "./schedulerUtils.js";

/**
 * Run a non-preemptive scheduler. Only processes that have arrived may be chosen.
 * `rank` compares the algorithm's main criterion at dispatch time;
 * all ties use arrival, then PID.
 */
export function scheduleNonPreemptive(processes, rank) {
  assertValidProcesses(processes);

  const pending = [...processes];
  const gantt = [];
  const resultsByPid = new Map();
  let time = 0;

  while (pending.length > 0) {
    const ready = pending.filter((process) => process.arrival <= time);
    if (ready.length === 0) {
      const nextArrival = Math.min(
        ...pending.map((process) => process.arrival),
      );
      appendSegment(gantt, "IDLE", time, nextArrival);
      time = nextArrival;
      continue;
    }

    ready.sort(
      (a, b) =>
        rank(a, b, time) || a.arrival - b.arrival || comparePid(a.pid, b.pid),
    );
    const process = ready[0];
    pending.splice(pending.indexOf(process), 1);

    const start = time;
    time += process.burst;
    appendSegment(gantt, process.pid, start, time);
    resultsByPid.set(process.pid, processResult(process, start, time));
  }

  return {
    gantt,
    processResults: processes.map((process) => resultsByPid.get(process.pid)),
  };
}
