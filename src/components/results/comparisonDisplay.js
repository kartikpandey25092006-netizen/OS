import { ALGORITHM_NAMES } from "../../engine/config.js";

export const PREEMPTIVE_PRIORITY_NAME = "Priority (preemptive)";

// The extra Priority mode is visible alongside the five fixed algorithms.
// It stays outside the five-algorithm ranking used by the adaptive evaluator.
export const COMPARISON_DISPLAY_NAMES = [
  ...ALGORITHM_NAMES.flatMap((name) =>
    name === "Priority" ? [name, PREEMPTIVE_PRIORITY_NAME] : [name],
  ),
  "Adaptive",
];

export function comparisonDisplayName(name) {
  return name === "Priority" ? "Priority (non-preemptive)" : name;
}

export function comparisonDisplayResult(comparison, name) {
  return name === PREEMPTIVE_PRIORITY_NAME
    ? comparison.priorityPreemptive
    : comparison.results[name];
}
