import { DEFAULT_OPTIONS } from "./config.js";
import {
  appendSegment,
  assertValidProcesses,
  comparePid,
  contextSwitchCostFrom,
  processResult,
  safeAddTime,
} from "./schedulerUtils.js";

/**
 * Round Robin. Arrivals through the slice's end enter the queue before the
 * process whose quantum just expired, including arrivals at that exact time.
 */
export function scheduleRoundRobin(processes, options = {}) {
  assertValidProcesses(processes);
  const quantum = options.quantum ?? DEFAULT_OPTIONS.roundRobinQuantum;
  if (!Number.isSafeInteger(quantum) || quantum <= 0) {
    throw new RangeError("quantum must be a positive integer.");
  }
  const contextSwitchCost = contextSwitchCostFrom(options);
  const arrivalOrder = [...processes].sort(
    (a, b) => a.arrival - b.arrival || comparePid(a.pid, b.pid),
  );
  const stateByPid = new Map(
    processes.map((process) => [
      process.pid,
      { process, remaining: process.burst, start: null, completion: null },
    ]),
  );
  const ready = [];
  const gantt = [];
  let time = 0;
  let nextArrivalIndex = 0;
  let completed = 0;
  let lastRunPid = null;

  function enqueueArrivals() {
    while (
      nextArrivalIndex < arrivalOrder.length &&
      arrivalOrder[nextArrivalIndex].arrival <= time
    ) {
      ready.push(stateByPid.get(arrivalOrder[nextArrivalIndex].pid));
      nextArrivalIndex += 1;
    }
  }

  while (completed < processes.length) {
    enqueueArrivals();
    if (ready.length === 0) {
      const nextArrival = arrivalOrder[nextArrivalIndex].arrival;
      appendSegment(gantt, "IDLE", time, nextArrival);
      time = nextArrival;
      lastRunPid = null;
      continue;
    }

    const current = ready.shift();
    if (
      lastRunPid !== null &&
      lastRunPid !== current.process.pid &&
      contextSwitchCost > 0
    ) {
      const switchEnd = safeAddTime(time, contextSwitchCost);
      appendSegment(gantt, "CONTEXT_SWITCH", time, switchEnd, "CONTEXT_SWITCH");
      time = switchEnd;
      enqueueArrivals();
    }

    if (current.start === null) current.start = time;
    const duration = Math.min(quantum, current.remaining);
    const sliceEnd = safeAddTime(time, duration);
    appendSegment(gantt, current.process.pid, time, sliceEnd);
    time = sliceEnd;
    current.remaining -= duration;
    lastRunPid = current.process.pid;

    enqueueArrivals();
    if (current.remaining === 0) {
      current.completion = time;
      completed += 1;
    } else {
      ready.push(current);
    }
  }

  return {
    gantt,
    processResults: processes.map((process) => {
      const { start, completion } = stateByPid.get(process.pid);
      return processResult(process, start, completion);
    }),
  };
}

export { scheduleRoundRobin as schedule };
