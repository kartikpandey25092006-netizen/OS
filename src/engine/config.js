export const DEFAULT_OPTIONS = Object.freeze({
  priorityMin: null,
  priorityMax: null,
  selector: Object.freeze({
    priorityHigh: 0.4,
    cvHigh: 0.45,
    cvLow: 0.25,
    staggered: 0.3,
    moderateDefault: 'SJF',
    rrQuantum: 'median',
  }),
  contextSwitchCost: 0,
});

export const ALGORITHM_NAMES = Object.freeze(['FCFS', 'SJF', 'SRTF', 'Priority', 'Round Robin']);
