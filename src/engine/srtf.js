import { runPreemptive } from "./preemptiveCore.js";

/** Shortest Remaining Time First: reevaluate the shortest ready job each tick. */
export function scheduleSRTF(processes, options = {}) {
  return runPreemptive(processes, options, (a, b) => a.remaining - b.remaining);
}

export { scheduleSRTF as schedule };
