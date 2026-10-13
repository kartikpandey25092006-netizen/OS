import { DEFAULT_OPTIONS } from "./config.js";
import { runAlgorithm } from "./algorithms.js";
import { calculateMetrics } from "./metrics.js";
import {
  assertValidProcesses,
  contextSwitchCostFrom,
} from "./schedulerUtils.js";

const VERIFICATION_COMPETITORS = Object.freeze({
  FCFS: ["SJF", "SRTF", "Round Robin"],
  SJF: ["SRTF", "Round Robin", "Priority"],
  SRTF: ["SJF", "Round Robin", "Priority"],
  Priority: ["SJF", "SRTF", "Round Robin"],
  "Round Robin": ["SJF", "SRTF", "Priority"],
});

const GOAL_LABELS = Object.freeze({
  waiting: "average waiting time",
  response: "average response time",
  fairness: "Jain's waiting-time fairness index",
});

const format = (value) => value.toFixed(2);

function positiveWhole(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer.`);
  }
  return value;
}

function resolveSettings(options) {
  const defaults = DEFAULT_OPTIONS.selector;
  const thresholds = {
    priorityHigh: options.thresholds?.priorityHigh ?? defaults.priorityHigh,
    cvHigh: options.thresholds?.cvHigh ?? defaults.cvHigh,
    cvLow: options.thresholds?.cvLow ?? defaults.cvLow,
    staggered: options.thresholds?.staggered ?? defaults.staggered,
  };
  for (const [name, value] of Object.entries(thresholds)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be a non-negative finite threshold.`);
    }
  }
  if (thresholds.cvLow > thresholds.cvHigh) {
    throw new RangeError("cvLow must not exceed cvHigh.");
  }

  const goal = options.goal ?? defaults.goal;
  if (!Object.hasOwn(GOAL_LABELS, goal)) {
    throw new RangeError('goal must be "waiting", "response", or "fairness".');
  }
  const moderateDefault = options.moderateDefault ?? defaults.moderateDefault;
  if (!["SJF", "FCFS"].includes(moderateDefault)) {
    throw new RangeError('moderateDefault must be "SJF" or "FCFS".');
  }
  const rrQuantum = options.rrQuantum ?? defaults.rrQuantum;
  if (!["median", "mean"].includes(rrQuantum)) {
    throw new RangeError('rrQuantum must be "median" or "mean".');
  }
  if (options.quantum !== undefined) positiveWhole(options.quantum, "quantum");
  if (options.agingInterval !== undefined)
    positiveWhole(options.agingInterval, "agingInterval");
  if (
    options.agingEnabled !== undefined &&
    typeof options.agingEnabled !== "boolean"
  ) {
    throw new RangeError("agingEnabled must be a boolean.");
  }
  const verificationMargin =
    options.verificationMargin ?? defaults.verificationMargin;
  if (!Number.isFinite(verificationMargin) || verificationMargin < 0) {
    throw new RangeError(
      "verificationMargin must be a non-negative finite fraction.",
    );
  }

  return { thresholds, goal, moderateDefault, rrQuantum, verificationMargin };
}

/** Compute the population burst CV and the two configured scale ratios. */
export function calculateWorkloadStats(processes, options = {}) {
  assertValidProcesses(processes);
  const count = processes.length;
  const bursts = processes.map(({ burst }) => burst).sort((a, b) => a - b);
  const meanBurst = bursts.reduce((sum, burst) => sum + burst, 0) / count;
  const midpoint = Math.floor(count / 2);
  const medianBurst =
    count % 2 === 1
      ? bursts[midpoint]
      : (bursts[midpoint - 1] + bursts[midpoint]) / 2;
  const variance =
    bursts.reduce((sum, burst) => sum + (burst - meanBurst) ** 2, 0) / count;
  const burstStdDev = Math.sqrt(variance);
  const burstCV = meanBurst === 0 ? 0 : burstStdDev / meanBurst;

  const observed = processes.reduce(
    (extremes, process) => ({
      minPriority: Math.min(extremes.minPriority, process.priority),
      maxPriority: Math.max(extremes.maxPriority, process.priority),
      minArrival: Math.min(extremes.minArrival, process.arrival),
      maxArrival: Math.max(extremes.maxArrival, process.arrival),
    }),
    {
      minPriority: Infinity,
      maxPriority: -Infinity,
      minArrival: Infinity,
      maxArrival: -Infinity,
    },
  );
  const scaleMin =
    options.priorityMin ?? DEFAULT_OPTIONS.priorityMin ?? observed.minPriority;
  const scaleMax =
    options.priorityMax ?? DEFAULT_OPTIONS.priorityMax ?? observed.maxPriority;
  if (
    !Number.isSafeInteger(scaleMin) ||
    !Number.isSafeInteger(scaleMax) ||
    scaleMin > observed.minPriority ||
    scaleMax < observed.maxPriority ||
    scaleMin > scaleMax
  ) {
    throw new RangeError(
      "Priority scale must use safe integer bounds that include every input priority.",
    );
  }
  const scaleRange = scaleMax - scaleMin;
  const prioritySpan = observed.maxPriority - observed.minPriority;
  const arrivalSpan = observed.maxArrival - observed.minArrival;

  return {
    processCount: count,
    meanBurst,
    medianBurst,
    burstStdDev,
    burstCV,
    prioritySpreadRatio: scaleRange === 0 ? 0 : prioritySpan / scaleRange,
    staggeredArrivalRatio: meanBurst === 0 ? 0 : arrivalSpan / meanBurst,
    priorityScale: { min: scaleMin, max: scaleMax, range: scaleRange },
    prioritySpan,
    arrivalSpan,
  };
}

function roundedQuantum(stats, settings, override) {
  return (
    override ??
    Math.max(
      1,
      Math.round(
        settings.rrQuantum === "median" ? stats.medianBurst : stats.meanBurst,
      ),
    )
  );
}

function metricForGoal(metrics, goal) {
  if (goal === "waiting") return metrics.averages.waiting;
  if (goal === "response") return metrics.averages.response;
  return metrics.jainsFairnessIndex;
}

function verificationWarning(processes, choice, options, settings, rrQuantum) {
  if (options.verify === false) return null;
  const commonOptions = { contextSwitchCost: contextSwitchCostFrom(options) };
  const chosenOptions = {
    ...commonOptions,
    ...(choice.algorithm === "Round Robin" ? { quantum: choice.quantum } : {}),
    ...(choice.priorityTieBreak
      ? { priorityTieBreak: choice.priorityTieBreak }
      : {}),
    ...(choice.agingInterval ? { agingInterval: choice.agingInterval } : {}),
  };
  const selectedValue = metricForGoal(
    calculateMetrics(runAlgorithm(choice.algorithm, processes, chosenOptions)),
    settings.goal,
  );
  let best = null;

  for (const competitor of VERIFICATION_COMPETITORS[choice.algorithm]) {
    const competitorOptions = {
      ...commonOptions,
      ...(competitor === "Round Robin" ? { quantum: rrQuantum } : {}),
      ...(competitor === "Priority" &&
      options.agingEnabled !== false &&
      options.agingInterval !== undefined
        ? { agingInterval: options.agingInterval }
        : {}),
    };
    const competitorValue = metricForGoal(
      calculateMetrics(runAlgorithm(competitor, processes, competitorOptions)),
      settings.goal,
    );
    const improvement =
      settings.goal === "fairness"
        ? competitorValue - selectedValue
        : selectedValue - competitorValue;
    const improvementRatio =
      improvement > 0 && selectedValue > 0 ? improvement / selectedValue : 0;
    if (best === null || improvementRatio > best.improvementRatio) {
      best = { competitor, competitorValue, improvementRatio };
    }
  }

  if (!best || best.improvementRatio <= settings.verificationMargin)
    return null;
  return {
    competitor: best.competitor,
    selectedValue,
    competitorValue: best.competitorValue,
    improvementRatio: best.improvementRatio,
    goal: settings.goal,
    message: `${best.competitor} improves ${GOAL_LABELS[settings.goal]} by ${format(best.improvementRatio * 100)}% (${format(best.competitorValue)} versus ${format(selectedValue)} for ${choice.algorithm}). The rule-based choice remains ${choice.algorithm}.`,
  };
}

/** Apply the ordered workload rules, then flag a material competitor win. */
export function selectAlgorithm(processes, options = {}) {
  const settings = resolveSettings(options);
  const stats = calculateWorkloadStats(processes, options);
  const { thresholds, goal } = settings;
  const quantum = roundedQuantum(stats, settings, options.quantum);
  let algorithm;
  let ruleFired;
  let explanation;
  let priorityTieBreak;
  let agingInterval;

  if (stats.prioritySpreadRatio >= thresholds.priorityHigh) {
    algorithm = "Priority";
    const mixed = stats.burstCV >= thresholds.cvHigh;
    ruleFired = mixed ? "priority-spread-mixed" : "priority-spread";
    if (mixed) priorityTieBreak = "sjf";
    explanation = `Priority spread = ${format(stats.prioritySpreadRatio)} >= ${format(thresholds.priorityHigh)}`;
    if (mixed) {
      explanation += ` and Burst CV = ${format(stats.burstCV)} >= ${format(thresholds.cvHigh)}, so Priority Scheduling with SJF tie-breaking was selected.`;
    } else {
      explanation += ", so Priority Scheduling was selected.";
    }
    if (goal === "fairness" && options.agingEnabled !== false) {
      agingInterval =
        options.agingInterval ?? Math.max(1, Math.round(stats.medianBurst));
      explanation += ` For fairness, aging improves priority every ${agingInterval} waiting time units.`;
    } else if (
      options.agingEnabled !== false &&
      options.agingInterval !== undefined
    ) {
      agingInterval = options.agingInterval;
    }
  } else if (stats.burstCV >= thresholds.cvHigh) {
    const staggered = stats.staggeredArrivalRatio >= thresholds.staggered;
    ruleFired = staggered ? "high-cv-staggered" : "high-cv-batch";
    const base = `Burst CV = ${format(stats.burstCV)} >= ${format(thresholds.cvHigh)} and arrivals are ${staggered ? "staggered" : "not staggered"} (${format(stats.staggeredArrivalRatio)} ${staggered ? ">=" : "<"} ${format(thresholds.staggered)})`;
    if (goal === "fairness" || (goal === "response" && !staggered)) {
      algorithm = "Round Robin";
      explanation = `${base}, so Round Robin with quantum ${quantum} was selected for ${goal === "fairness" ? "fairness" : "minimum response time"}.`;
    } else {
      algorithm = staggered ? "SRTF" : "SJF";
      explanation = `${base}, so ${algorithm} was selected.`;
    }
  } else if (stats.burstCV < thresholds.cvLow) {
    algorithm = "Round Robin";
    ruleFired = "low-cv";
    explanation = `Burst CV = ${format(stats.burstCV)} < ${format(thresholds.cvLow)}, so Round Robin with quantum ${quantum} (${options.quantum === undefined ? `${settings.rrQuantum} burst` : "manual override"}) was selected${goal === "waiting" ? "" : ` for ${goal === "response" ? "minimum response time" : "fairness"}`}.`;
  } else {
    ruleFired = "moderate";
    algorithm = goal === "waiting" ? settings.moderateDefault : "Round Robin";
    explanation = `Burst CV = ${format(stats.burstCV)} is between ${format(thresholds.cvLow)} and ${format(thresholds.cvHigh)}, so ${algorithm}${algorithm === "Round Robin" ? ` with quantum ${quantum} for ${goal === "response" ? "minimum response time" : "fairness"}` : ""} was selected.`;
  }

  const choice = {
    algorithm,
    ...(algorithm === "Round Robin" ? { quantum } : {}),
    ...(priorityTieBreak ? { priorityTieBreak } : {}),
    ...(agingInterval ? { agingInterval } : {}),
    stats,
    ruleFired,
    explanation,
  };
  return {
    ...choice,
    verificationWarning: verificationWarning(
      processes,
      choice,
      options,
      settings,
      quantum,
    ),
  };
}
