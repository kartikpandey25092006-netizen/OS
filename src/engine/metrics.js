/**
 * Summarize a completed schedule. Utilization is useful process execution
 * divided by the full timeline, including idle and context-switch overhead.
 */
export function calculateMetrics({ gantt, processResults }) {
  if (
    !Array.isArray(gantt) ||
    gantt.length === 0 ||
    !Array.isArray(processResults) ||
    processResults.length === 0
  ) {
    throw new RangeError("Metrics require a completed, non-empty schedule.");
  }

  const perProcess = processResults.map((result) => ({ ...result }));
  const count = perProcess.length;
  const makespan = gantt.at(-1).end;
  let busyTime = 0;
  let idleTime = 0;
  let contextSwitchTime = 0;

  for (const { pid, start, end } of gantt) {
    const duration = end - start;
    if (pid === "IDLE") idleTime += duration;
    else if (pid === "CONTEXT_SWITCH") contextSwitchTime += duration;
    else busyTime += duration;
  }

  const totals = perProcess.reduce(
    (sum, process) => ({
      waiting: sum.waiting + process.waiting,
      turnaround: sum.turnaround + process.turnaround,
      response: sum.response + process.response,
    }),
    { waiting: 0, turnaround: 0, response: 0 },
  );
  const averages = {
    waiting: totals.waiting / count,
    turnaround: totals.turnaround / count,
    response: totals.response / count,
  };
  const maximumWaitingTime = perProcess.reduce(
    (maximum, { waiting }) => Math.max(maximum, waiting),
    0,
  );

  // Scaling by the largest wait avoids overflow when valid times are large.
  const normalizedWaits =
    maximumWaitingTime === 0
      ? []
      : perProcess.map(({ waiting }) => waiting / maximumWaitingTime);
  const waitSum = normalizedWaits.reduce((sum, wait) => sum + wait, 0);
  const waitSquares = normalizedWaits.reduce(
    (sum, wait) => sum + wait * wait,
    0,
  );
  const jainsFairnessIndex =
    maximumWaitingTime === 0
      ? 1
      : Math.min(1, (waitSum * waitSum) / (count * waitSquares));

  return {
    perProcess,
    averages,
    cpuUtilization: busyTime / makespan,
    throughput: count / makespan,
    makespan,
    maximumWaitingTime,
    jainsFairnessIndex,
    busyTime,
    idleTime,
    contextSwitchTime,
  };
}
