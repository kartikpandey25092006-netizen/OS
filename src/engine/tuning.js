import {
  ALGORITHM_NAMES,
  DEFAULT_OPTIONS,
  DEFAULT_TUNING_GRID,
} from "./config.js";
import { runAlgorithm } from "./algorithms.js";
import { calculateMetrics } from "./metrics.js";
import { selectAlgorithm } from "./selector.js";

const THRESHOLD_NAMES = ["priorityHigh", "cvHigh", "cvLow", "staggered"];
const GOALS = ["waiting", "response", "fairness"];

function score(metrics, goal) {
  if (goal === "waiting") return metrics.averages.waiting;
  if (goal === "response") return metrics.averages.response;
  return metrics.jainsFairnessIndex;
}

function equalScore(a, b) {
  return Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));
}

function isBetter(value, other, goal) {
  if (equalScore(value, other)) return false;
  return goal === "fairness" ? value > other : value < other;
}

function regret(value, best) {
  if (equalScore(value, best)) return 0;
  return best === 0 ? Infinity : (value - best) / best;
}

function loss(value, best, goal) {
  if (equalScore(value, best)) return 0;
  if (best === 0) return Infinity;
  return Math.max(
    0,
    goal === "fairness" ? (best - value) / best : (value - best) / best,
  );
}

function defaultConfig() {
  const defaults = DEFAULT_OPTIONS.selector;
  return {
    thresholds: Object.fromEntries(
      THRESHOLD_NAMES.map((name) => [name, defaults[name]]),
    ),
    moderateDefault: defaults.moderateDefault,
    rrQuantum: defaults.rrQuantum,
  };
}

function validateConfig(config) {
  for (const name of THRESHOLD_NAMES) {
    const value = config.thresholds?.[name];
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be a non-negative finite threshold.`);
    }
  }
  if (config.thresholds.cvLow > config.thresholds.cvHigh) {
    throw new RangeError("cvLow must not exceed cvHigh.");
  }
  if (!["SJF", "FCFS"].includes(config.moderateDefault)) {
    throw new RangeError("moderateDefault must be SJF or FCFS.");
  }
  if (!["median", "mean"].includes(config.rrQuantum)) {
    throw new RangeError("rrQuantum must be median or mean.");
  }
}

function validateWorkloads(workloads, goal) {
  if (!Array.isArray(workloads) || workloads.length === 0) {
    throw new RangeError("Evaluation needs at least one workload.");
  }
  if (!GOALS.includes(goal)) throw new RangeError("Unknown evaluation goal.");
  for (const workload of workloads) {
    if (!workload || !Array.isArray(workload.processes)) {
      throw new RangeError("Every workload needs a processes array.");
    }
  }
}

/** Fixed-algorithm scores are shared by every threshold candidate. */
function prepareWorkloads(workloads, goal, rrQuantum) {
  return workloads.map((workload) => {
    const { processes } = workload;
    const stats = selectAlgorithm(processes, { goal, verify: false }).stats;
    const quantum = Math.max(
      1,
      Math.round(rrQuantum === "mean" ? stats.meanBurst : stats.medianBurst),
    );
    const fixed = Object.fromEntries(
      ALGORITHM_NAMES.map((algorithm) => {
        const schedule = runAlgorithm(algorithm, processes, {
          ...(algorithm === "Round Robin" ? { quantum } : {}),
        });
        return [algorithm, score(calculateMetrics(schedule), goal)];
      }),
    );
    const bestScore = ALGORITHM_NAMES.reduce(
      (best, name) =>
        best === null || isBetter(fixed[name], best, goal) ? fixed[name] : best,
      null,
    );
    const bestAlgorithms = ALGORITHM_NAMES.filter((name) =>
      equalScore(fixed[name], bestScore),
    );
    return {
      workload,
      processes,
      fixed,
      bestScore,
      bestAlgorithms,
      adaptiveCache: new Map(),
    };
  });
}

function adaptiveScore(record, selection, goal) {
  if (
    selection.algorithm !== "Priority" ||
    (!selection.priorityTieBreak && !selection.agingInterval)
  ) {
    return record.fixed[selection.algorithm];
  }
  const key = `${selection.priorityTieBreak ?? "arrival"}:${selection.agingInterval ?? 0}`;
  if (!record.adaptiveCache.has(key)) {
    const schedule = runAlgorithm("Priority", record.processes, {
      ...(selection.priorityTieBreak
        ? { priorityTieBreak: selection.priorityTieBreak }
        : {}),
      ...(selection.agingInterval
        ? { agingInterval: selection.agingInterval }
        : {}),
    });
    record.adaptiveCache.set(key, score(calculateMetrics(schedule), goal));
  }
  return record.adaptiveCache.get(key);
}

function assess(records, goal, config, details = false) {
  let agreements = 0;
  let totalRegret = 0;
  let totalLoss = 0;
  const cases = [];
  const confusionMatrix = Object.fromEntries(
    ALGORITHM_NAMES.map((selected) => [
      selected,
      Object.fromEntries(ALGORITHM_NAMES.map((best) => [best, 0])),
    ]),
  );

  for (const record of records) {
    const selection = selectAlgorithm(record.processes, {
      goal,
      ...config,
      verify: false,
    });
    const selectedScore = adaptiveScore(record, selection, goal);
    const agrees = record.bestAlgorithms.includes(selection.algorithm);
    const caseRegret = regret(selectedScore, record.bestScore);
    const caseLoss = loss(selectedScore, record.bestScore, goal);
    if (agrees) agreements += 1;
    totalRegret += caseRegret;
    totalLoss += caseLoss;
    if (details) {
      const bestAlgorithm = record.bestAlgorithms[0];
      confusionMatrix[selection.algorithm][bestAlgorithm] += 1;
      cases.push({
        id: record.workload.id,
        type: record.workload.type,
        size: record.workload.size ?? record.processes.length,
        selectedAlgorithm: selection.algorithm,
        bestAlgorithm,
        bestAlgorithms: record.bestAlgorithms,
        selectedScore,
        bestScore: record.bestScore,
        regret: caseRegret,
        loss: caseLoss,
        agrees,
        ruleFired: selection.ruleFired,
        stats: selection.stats,
      });
    }
  }

  const summary = {
    workloadCount: records.length,
    agreements,
    agreementRate: agreements / records.length,
    meanRegret: totalRegret / records.length,
    meanLoss: totalLoss / records.length,
  };
  if (!details) return { summary };
  const failureCases = cases
    .filter((item) => !item.agrees && item.loss > 0)
    .sort((a, b) => b.loss - a.loss || a.id.localeCompare(b.id));
  return { summary, confusionMatrix, cases, failureCases };
}

/** Compare one rule configuration against the empirical best fixed scheduler. */
export function evaluateSelector(
  workloads,
  { goal = "waiting", ...overrides } = {},
) {
  validateWorkloads(workloads, goal);
  const config = {
    ...defaultConfig(),
    ...overrides,
    thresholds: { ...defaultConfig().thresholds, ...overrides.thresholds },
  };
  validateConfig(config);
  return assess(
    prepareWorkloads(workloads, goal, config.rrQuantum),
    goal,
    config,
    true,
  );
}

function gridValues(grid, name) {
  const values = grid[name];
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError(`${name} needs at least one grid value.`);
  }
  return values;
}

function candidateConfigs(grid) {
  const configs = [];
  for (const priorityHigh of gridValues(grid, "priorityHigh"))
    for (const cvHigh of gridValues(grid, "cvHigh"))
      for (const cvLow of gridValues(grid, "cvLow"))
        for (const staggered of gridValues(grid, "staggered"))
          for (const moderateDefault of gridValues(grid, "moderateDefault"))
            for (const rrQuantum of gridValues(grid, "rrQuantum")) {
              const config = {
                thresholds: { priorityHigh, cvHigh, cvLow, staggered },
                moderateDefault,
                rrQuantum,
              };
              if (cvLow <= cvHigh) {
                validateConfig(config);
                configs.push(config);
              }
            }
  return configs;
}

/** The default candidate is evaluated first, so tuning cannot lower agreement. */
export function tuneThresholds(
  workloads,
  { goal = "waiting", grid = DEFAULT_TUNING_GRID } = {},
) {
  validateWorkloads(workloads, goal);
  const defaults = defaultConfig();
  const recordsByQuantum = new Map();
  const records = (rrQuantum) => {
    if (!recordsByQuantum.has(rrQuantum)) {
      recordsByQuantum.set(
        rrQuantum,
        prepareWorkloads(workloads, goal, rrQuantum),
      );
    }
    return recordsByQuantum.get(rrQuantum);
  };
  const summary = (config) =>
    assess(records(config.rrQuantum), goal, config).summary;
  const baselineSummary = summary(defaults);
  let bestConfig = defaults;
  let bestSummary = baselineSummary;
  const candidates = candidateConfigs(grid);
  let candidatesEvaluated = 1;
  const defaultKey = JSON.stringify(defaults);
  for (const config of candidates) {
    if (JSON.stringify(config) === defaultKey) continue;
    candidatesEvaluated += 1;
    const current = summary(config);
    if (
      current.agreements > bestSummary.agreements ||
      (current.agreements === bestSummary.agreements &&
        current.meanLoss < bestSummary.meanLoss)
    ) {
      bestConfig = config;
      bestSummary = current;
    }
  }

  const thresholdSensitivity = THRESHOLD_NAMES.flatMap((parameter) =>
    gridValues(grid, parameter).map((value) => {
      const config = {
        ...bestConfig,
        thresholds: { ...bestConfig.thresholds, [parameter]: value },
      };
      return {
        parameter,
        value,
        agreementRate:
          config.thresholds.cvLow <= config.thresholds.cvHigh
            ? summary(config).agreementRate
            : null,
      };
    }),
  );
  return {
    goal,
    workloadCount: workloads.length,
    candidatesEvaluated,
    defaultConfig: defaults,
    bestConfig,
    baseline: assess(records(defaults.rrQuantum), goal, defaults, true),
    tuned: assess(records(bestConfig.rrQuantum), goal, bestConfig, true),
    thresholdSensitivity,
  };
}
