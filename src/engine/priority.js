import { scheduleNonPreemptive } from "./nonPreemptive.js";

/** Non-preemptive Priority: lower numbers mean higher priority. */
export function schedulePriority(processes, _options = {}) {
  return scheduleNonPreemptive(processes, (a, b) => a.priority - b.priority);
}

export { schedulePriority as schedule };
