import { validateProcesses } from "./validate.js";

// A natural PID order keeps P2 before P10 while remaining deterministic for text PIDs.
const pidOrder = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "variant",
});

function comparePid(a, b) {
  return pidOrder.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

function appendSegment(gantt, pid, start, end) {
  const previous = gantt.at(-1);
  if (previous?.pid === pid && previous.end === start) {
    previous.end = end;
  } else {
    gantt.push({ pid, start, end });
  }
}

/**
 * Run a non-preemptive scheduler. Only processes that have arrived may be chosen.
 * `rank` compares the algorithm's main criterion; all ties use arrival, then PID.
 */
export function scheduleNonPreemptive(processes, rank) {
  const validation = validateProcesses(processes);
  if (!validation.valid) {
    throw new RangeError(validation.errors.join(" "));
  }

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
      (a, b) => rank(a, b) || a.arrival - b.arrival || comparePid(a.pid, b.pid),
    );
    const process = ready[0];
    pending.splice(pending.indexOf(process), 1);

    const start = time;
    time += process.burst;
    appendSegment(gantt, process.pid, start, time);
    const turnaround = time - process.arrival;
    resultsByPid.set(process.pid, {
      pid: process.pid,
      arrival: process.arrival,
      burst: process.burst,
      priority: process.priority,
      start,
      completion: time,
      turnaround,
      waiting: turnaround - process.burst,
      response: start - process.arrival,
    });
  }

  return {
    gantt,
    processResults: processes.map((process) => resultsByPid.get(process.pid)),
  };
}
