import { DEFAULT_OPTIONS } from "./config.js";
import { validateProcesses } from "./validate.js";

// A natural PID order keeps P2 before P10 while remaining deterministic for text PIDs.
const pidOrder = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "variant",
});

export function comparePid(a, b) {
  return pidOrder.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

export function appendSegment(gantt, pid, start, end, type) {
  if (start === end) return;
  const previous = gantt.at(-1);
  if (
    previous?.pid === pid &&
    previous.end === start &&
    previous.type === type
  ) {
    previous.end = end;
  } else {
    gantt.push(type ? { pid, type, start, end } : { pid, start, end });
  }
}

export function assertValidProcesses(processes) {
  const validation = validateProcesses(processes);
  if (!validation.valid) throw new RangeError(validation.errors.join(" "));
}

export function contextSwitchCostFrom(options = {}) {
  const cost = options.contextSwitchCost ?? DEFAULT_OPTIONS.contextSwitchCost;
  if (!Number.isInteger(cost) || cost < 0) {
    throw new RangeError("contextSwitchCost must be a non-negative integer.");
  }
  return cost;
}

export function processResult(process, start, completion) {
  const turnaround = completion - process.arrival;
  return {
    pid: process.pid,
    arrival: process.arrival,
    burst: process.burst,
    priority: process.priority,
    start,
    completion,
    turnaround,
    waiting: turnaround - process.burst,
    response: start - process.arrival,
  };
}
