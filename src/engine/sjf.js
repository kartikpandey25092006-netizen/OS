import { scheduleNonPreemptive } from "./nonPreemptive.js";

/** Shortest Job First: choose the shortest burst among processes already ready. */
export function scheduleSJF(processes, _options = {}) {
  return scheduleNonPreemptive(processes, (a, b) => a.burst - b.burst);
}

export { scheduleSJF as schedule };
