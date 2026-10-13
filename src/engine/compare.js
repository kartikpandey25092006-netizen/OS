import { ALGORITHM_NAMES, DEFAULT_OPTIONS } from "./config.js";
import { runAlgorithm } from "./algorithms.js";
import { calculateMetrics } from "./metrics.js";
import { contextSwitchCostFrom } from "./schedulerUtils.js";
import { selectAlgorithm } from "./selector.js";

const METRICS = Object.freeze([
  {
    key: "waiting",
    value: (metrics) => metrics.averages.waiting,
    better: "min",
  },
  {
    key: "turnaround",
    value: (metrics) => metrics.averages.turnaround,
    better: "min",
  },
  {
    key: "response",
    value: (metrics) => metrics.averages.response,
    better: "min",
  },
  {
    key: "cpuUtilization",
    value: (metrics) => metrics.cpuUtilization,
    better: "max",
  },
  {
    key: "throughput",
    value: (metrics) => metrics.throughput,
    better: "max",
  },
  { key: "makespan", value: (metrics) => metrics.makespan, better: "min" },
  {
    key: "maximumWaitingTime",
    value: (metrics) => metrics.maximumWaitingTime,
    better: "min",
  },
  {
    key: "jainsFairnessIndex",
    value: (metrics) => metrics.jainsFairnessIndex,
    better: "max",
  },
  { key: "busyTime", value: (metrics) => metrics.busyTime, better: "max" },
  { key: "idleTime", value: (metrics) => metrics.idleTime, better: "min" },
  {
    key: "contextSwitchTime",
    value: (metrics) => metrics.contextSwitchTime,
    better: "min",
  },
]);

const GOAL_METRIC = Object.freeze({
  waiting: "waiting",
  response: "response",
  fairness: "jainsFairnessIndex",
});

// Scheduling scores are derived from integer times, but ratios can differ by
// a few floating-point bits even when two schedules are mathematically tied.
function sameScore(a, b) {
  return (
    Math.abs(a - b) <=
    1e-12 * Math.max(Math.abs(a), Math.abs(b), Number.MIN_VALUE)
  );
}

function rankMetric(results, key, value, better) {
  const ordered = Object.entries(results)
    .map(([name, result]) => ({ name, value: value(result.metrics) }))
    .sort((a, b) => (better === "min" ? a.value - b.value : b.value - a.value));

  let rank = 0;
  let rankValue;
  for (let index = 0; index < ordered.length; index += 1) {
    if (index === 0 || !sameScore(ordered[index].value, rankValue)) {
      rank = index + 1;
      rankValue = ordered[index].value;
    }
    ordered[index].rank = rank;
    results[ordered[index].name].ranks[key] = rank;
  }
  return ordered;
}

function comparisonQuantum(selection, options) {
  if (options.quantum !== undefined) return options.quantum;
  const basis = options.rrQuantum ?? DEFAULT_OPTIONS.selector.rrQuantum;
  const burst =
    basis === "mean" ? selection.stats.meanBurst : selection.stats.medianBurst;
  return Math.max(1, Math.round(burst));
}

function regretFor(value, bestValue) {
  if (sameScore(value, bestValue)) return 0;
  if (bestValue === 0) return Infinity;
  return (value - bestValue) / bestValue;
}

/** Compare all five baseline schedulers and the adaptive decision on one workload. */
export function compare(processes, options = {}) {
  const selection = selectAlgorithm(processes, options);
  const contextSwitchCost = contextSwitchCostFrom(options);
  const quantum = comparisonQuantum(selection, options);
  const results = {};

  for (const name of [...ALGORITHM_NAMES, "Adaptive"]) {
    const algorithm = name === "Adaptive" ? selection.algorithm : name;
    const schedulerOptions = {
      contextSwitchCost,
      ...(algorithm === "Round Robin" ? { quantum } : {}),
      ...(algorithm === "Priority" &&
      options.agingEnabled !== false &&
      options.agingInterval !== undefined
        ? { agingInterval: options.agingInterval }
        : {}),
      ...(name === "Adaptive" && selection.priorityTieBreak
        ? { priorityTieBreak: selection.priorityTieBreak }
        : {}),
      ...(name === "Adaptive" && selection.agingInterval
        ? { agingInterval: selection.agingInterval }
        : {}),
    };
    const schedule = runAlgorithm(algorithm, processes, schedulerOptions);
    results[name] = {
      schedule,
      metrics: calculateMetrics(schedule),
      ranks: {},
    };
  }

  const rankings = Object.fromEntries(
    METRICS.map(({ key, value, better }) => [
      key,
      rankMetric(results, key, value, better),
    ]),
  );
  const goal = options.goal ?? DEFAULT_OPTIONS.selector.goal;
  const metric = GOAL_METRIC[goal];
  const value = rankings[metric].find(({ name }) => name === "Adaptive").value;
  const bestValue = rankings[metric][0].value;
  const rank = results.Adaptive.ranks[metric];

  return {
    selection,
    results,
    rankings,
    adaptive: {
      algorithm: selection.algorithm,
      goal,
      metric,
      value,
      bestValue,
      rank,
      status: rank === 1 ? "best" : rank === 2 ? "top-2" : "worse",
      regret: regretFor(value, bestValue),
    },
  };
}
