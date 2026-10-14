export const DEFAULT_OPTIONS = Object.freeze({
  priorityMin: null,
  priorityMax: null,
  selector: Object.freeze({
    priorityHigh: 0.4,
    cvHigh: 0.45,
    cvLow: 0.25,
    staggered: 0.3,
    moderateDefault: "SJF",
    rrQuantum: "median",
    goal: "waiting",
    verificationMargin: 0.05,
  }),
  contextSwitchCost: 0,
  roundRobinQuantum: 4,
});

export const ALGORITHM_NAMES = Object.freeze([
  "FCFS",
  "SJF",
  "SRTF",
  "Priority",
  "Round Robin",
]);

/** Candidate values for the Batch 7 rule search; every default is included. */
export const DEFAULT_TUNING_GRID = Object.freeze({
  priorityHigh: Object.freeze([0.4, 0.8, 1.05]),
  cvHigh: Object.freeze([0.35, 0.45, 0.65]),
  cvLow: Object.freeze([0.15, 0.25, 0.35]),
  staggered: Object.freeze([0.2, 0.3, 0.5]),
  moderateDefault: Object.freeze(["SJF", "FCFS"]),
  rrQuantum: Object.freeze(["median", "mean"]),
});
