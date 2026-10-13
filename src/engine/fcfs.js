import { scheduleNonPreemptive } from "./nonPreemptive.js";

/** First Come, First Served: execute the earliest arrived ready process. */
export function scheduleFCFS(processes, _options = {}) {
  return scheduleNonPreemptive(processes, (a, b) => a.arrival - b.arrival);
}

export { scheduleFCFS as schedule };
