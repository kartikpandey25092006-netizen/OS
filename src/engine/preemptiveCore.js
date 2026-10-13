import {
  appendSegment,
  assertValidProcesses,
  comparePid,
  contextSwitchCostFrom,
  processResult,
} from "./schedulerUtils.js";

/**
 * Simulate one integer time unit per step so arrivals and aging can change the
 * winner at any tick. A dispatch is reconsidered after context-switch overhead.
 */
export function runPreemptive(processes, options, compare) {
  assertValidProcesses(processes);
  const contextSwitchCost = contextSwitchCostFrom(options);
  const states = processes.map((process) => ({
    process,
    remaining: process.burst,
    executed: 0,
    start: null,
    completion: null,
  }));
  const gantt = [];
  let time = 0;
  let lastRunPid = null;
  let completed = 0;

  while (completed < states.length) {
    const ready = states.filter(
      ({ process, remaining }) => process.arrival <= time && remaining > 0,
    );
    if (ready.length === 0) {
      const nextArrival = Math.min(
        ...states
          .filter(({ remaining }) => remaining > 0)
          .map(({ process }) => process.arrival),
      );
      appendSegment(gantt, "IDLE", time, nextArrival);
      time = nextArrival;
      lastRunPid = null;
      continue;
    }

    ready.sort(
      (a, b) =>
        compare(a, b, time) ||
        a.process.arrival - b.process.arrival ||
        comparePid(a.process.pid, b.process.pid),
    );
    const next = ready[0];
    if (
      lastRunPid !== null &&
      lastRunPid !== next.process.pid &&
      contextSwitchCost > 0
    ) {
      appendSegment(
        gantt,
        "CONTEXT_SWITCH",
        time,
        time + contextSwitchCost,
        "CONTEXT_SWITCH",
      );
      time += contextSwitchCost;
      lastRunPid = null;
      continue;
    }

    if (next.start === null) next.start = time;
    appendSegment(gantt, next.process.pid, time, time + 1);
    next.remaining -= 1;
    next.executed += 1;
    time += 1;
    lastRunPid = next.process.pid;
    if (next.remaining === 0) {
      next.completion = time;
      completed += 1;
    }
  }

  return {
    gantt,
    processResults: states.map(({ process, start, completion }) =>
      processResult(process, start, completion),
    ),
  };
}
