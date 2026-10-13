import { scheduleNonPreemptive } from "./nonPreemptive.js";
import { runPreemptive } from "./preemptiveCore.js";

// Waiting is cumulative: time since arrival minus time already spent on the CPU.
// A running process keeps the priority it has earned, but does not age further.
function effectivePriority(process, waiting, agingInterval) {
  return agingInterval == null
    ? BigInt(process.priority)
    : BigInt(process.priority) - BigInt(waiting) / BigInt(agingInterval);
}

function compareEffectivePriority(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Lower numbers mean higher priority. Aging improves priority by one for each
 * complete `agingInterval` spent waiting in the ready queue.
 */
export function schedulePriority(processes, options = {}) {
  const {
    preemptive = false,
    agingInterval,
    priorityTieBreak = "arrival",
  } = options;
  if (
    agingInterval != null &&
    (!Number.isSafeInteger(agingInterval) || agingInterval <= 0)
  ) {
    throw new RangeError("agingInterval must be a positive integer.");
  }
  if (!["arrival", "sjf"].includes(priorityTieBreak)) {
    throw new RangeError('priorityTieBreak must be "arrival" or "sjf".');
  }

  if (preemptive) {
    return runPreemptive(processes, options, (a, b, time) => {
      const aWaiting = time - a.process.arrival - a.executed;
      const bWaiting = time - b.process.arrival - b.executed;
      const priorityOrder = compareEffectivePriority(
        effectivePriority(a.process, aWaiting, agingInterval),
        effectivePriority(b.process, bWaiting, agingInterval),
      );
      return (
        priorityOrder ||
        (priorityTieBreak === "sjf" ? a.remaining - b.remaining : 0)
      );
    });
  }

  return scheduleNonPreemptive(processes, (a, b, time) => {
    const aWaiting = time - a.arrival;
    const bWaiting = time - b.arrival;
    const priorityOrder = compareEffectivePriority(
      effectivePriority(a, aWaiting, agingInterval),
      effectivePriority(b, bWaiting, agingInterval),
    );
    return (
      priorityOrder || (priorityTieBreak === "sjf" ? a.burst - b.burst : 0)
    );
  });
}

export { schedulePriority as schedule };
