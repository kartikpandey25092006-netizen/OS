/** Validate the shared process input model before it enters the scheduling engine. */
export function validateProcesses(processes) {
  const errors = [];
  if (!Array.isArray(processes) || processes.length === 0) {
    return { valid: false, errors: ["Enter at least one process."] };
  }

  const seen = new Set();
  processes.forEach((process, index) => {
    const row = index + 1;
    if (!process || typeof process !== "object") {
      errors.push(`Row ${row}: process must be an object.`);
      return;
    }
    const { pid, arrival, burst, priority } = process;
    if (typeof pid !== "string" || pid.trim() === "") {
      errors.push(`Row ${row}: PID must be a non-empty string.`);
    } else if (pid === "IDLE" || pid === "CONTEXT_SWITCH") {
      errors.push(`Row ${row}: PID "${pid}" is reserved for Gantt segments.`);
    } else if (seen.has(pid)) {
      errors.push(`Row ${row}: PID "${pid}" must be unique.`);
    } else {
      seen.add(pid);
    }
    if (!Number.isInteger(arrival) || arrival < 0) {
      errors.push(`Row ${row}: arrival must be a non-negative integer.`);
    } else if (!Number.isSafeInteger(arrival)) {
      errors.push(`Row ${row}: arrival exceeds the safe integer range.`);
    }
    if (!Number.isInteger(burst) || burst <= 0) {
      errors.push(`Row ${row}: burst must be a positive integer.`);
    } else if (!Number.isSafeInteger(burst)) {
      errors.push(`Row ${row}: burst exceeds the safe integer range.`);
    }
    if (!Number.isInteger(priority)) {
      errors.push(`Row ${row}: priority must be an integer.`);
    } else if (!Number.isSafeInteger(priority)) {
      errors.push(`Row ${row}: priority exceeds the safe integer range.`);
    }
  });

  if (errors.length === 0) {
    const earliestArrival = processes.reduce(
      (earliest, { arrival }) => Math.min(earliest, arrival),
      Infinity,
    );
    const minimumFinish = processes.reduce(
      (time, { burst }) => time + BigInt(burst),
      BigInt(earliestArrival),
    );
    if (minimumFinish > BigInt(Number.MAX_SAFE_INTEGER)) {
      errors.push("Total execution exceeds the safe integer timeline.");
    }
  }

  return { valid: errors.length === 0, errors };
}
