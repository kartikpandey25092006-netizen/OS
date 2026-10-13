export const RESULT_METRICS = Object.freeze([
  {
    key: "waiting",
    label: "Average waiting time",
    shortLabel: "Avg wait",
    getValue: (metrics) => metrics.averages.waiting,
  },
  {
    key: "turnaround",
    label: "Average turnaround time",
    shortLabel: "Avg turnaround",
    getValue: (metrics) => metrics.averages.turnaround,
  },
  {
    key: "response",
    label: "Average response time",
    shortLabel: "Avg response",
    getValue: (metrics) => metrics.averages.response,
  },
  {
    key: "cpuUtilization",
    label: "CPU utilization",
    shortLabel: "CPU use",
    getValue: (metrics) => metrics.cpuUtilization,
    fraction: true,
  },
  {
    key: "jainsFairnessIndex",
    label: "Waiting-time fairness",
    shortLabel: "Fairness",
    getValue: (metrics) => metrics.jainsFairnessIndex,
  },
]);

export const GOAL_LABELS = Object.freeze({
  waiting: "Average waiting time",
  response: "Average response time",
  fairness: "Waiting-time fairness",
});

export function formatNumber(value, digits = 2) {
  if (value === Infinity) return "∞";
  if (value === -Infinity) return "−∞";
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

export function formatPercent(fraction, digits = 1) {
  if (fraction === Infinity) return "∞";
  if (fraction === -Infinity) return "−∞";
  return Number.isFinite(fraction)
    ? `${(fraction * 100).toFixed(digits)}%`
    : "—";
}
