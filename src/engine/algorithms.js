import { scheduleFCFS } from "./fcfs.js";
import { scheduleSJF } from "./sjf.js";
import { scheduleSRTF } from "./srtf.js";
import { schedulePriority } from "./priority.js";
import { scheduleRoundRobin } from "./roundRobin.js";

/** Run one named scheduler with the options relevant to that algorithm. */
export function runAlgorithm(algorithm, processes, options = {}) {
  switch (algorithm) {
    case "FCFS":
      return scheduleFCFS(processes, options);
    case "SJF":
      return scheduleSJF(processes, options);
    case "SRTF":
      return scheduleSRTF(processes, options);
    case "Priority":
      return schedulePriority(processes, options);
    case "Round Robin":
      return scheduleRoundRobin(processes, options);
    default:
      throw new RangeError(`Unknown scheduling algorithm: ${algorithm}`);
  }
}
