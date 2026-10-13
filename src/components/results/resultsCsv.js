import { ALGORITHM_NAMES } from "../../engine/config.js";

const HEADERS = [
  "Algorithm",
  "Effective algorithm",
  "Goal",
  "Goal rank",
  "Average waiting time",
  "Average turnaround time",
  "Average response time",
  "CPU utilization",
  "Throughput",
  "Makespan",
  "Maximum waiting time",
  "Jain fairness index",
];

function csvCell(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Export numeric scores at full precision so they can be checked in a spreadsheet. */
export function buildResultsCsv(comparison) {
  const rows = [[...HEADERS]];
  for (const name of [...ALGORITHM_NAMES, "Adaptive"]) {
    const result = comparison.results[name];
    const { metrics } = result;
    rows.push([
      name,
      name === "Adaptive" ? comparison.adaptive.algorithm : name,
      comparison.adaptive.goal,
      result.ranks[comparison.adaptive.metric],
      metrics.averages.waiting,
      metrics.averages.turnaround,
      metrics.averages.response,
      metrics.cpuUtilization,
      metrics.throughput,
      metrics.makespan,
      metrics.maximumWaitingTime,
      metrics.jainsFairnessIndex,
    ]);
  }
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
