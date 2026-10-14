/** Reproducible synthetic workloads for evaluating scheduling rules. */

export const WORKLOAD_TYPES = Object.freeze([
  "uniform-bursts",
  "high-variance-bursts",
  "batch-arrival",
  "staggered-arrival",
  "priority-heavy",
  "mixed",
]);

function whole(value, name, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(
      `${name} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  return value;
}

/** Mulberry32: a small deterministic PRNG; no global random state is changed. */
export function seededRandom(seed) {
  whole(seed, "seed", Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function integer(random, minimum, maximum) {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function buildProcesses(type, size, random) {
  const arrivals = [];
  let nextArrival = 0;
  for (let index = 0; index < size; index += 1) {
    if (type === "batch-arrival") {
      arrivals.push(0);
    } else if (type === "staggered-arrival") {
      nextArrival += index === 0 ? 0 : integer(random, 2, 6);
      arrivals.push(nextArrival);
    } else {
      arrivals.push(integer(random, 0, Math.max(3, size)));
    }
  }

  return Array.from({ length: size }, (_, index) => {
    let burst;
    if (type === "uniform-bursts") {
      burst = integer(random, 5, 8);
    } else if (type === "high-variance-bursts") {
      burst = index === 0 ? integer(random, 24, 36) : integer(random, 1, 5);
    } else if (type === "priority-heavy") {
      burst = integer(random, 3, 12);
    } else if (type === "mixed") {
      burst =
        index % 4 === 0 ? integer(random, 18, 30) : integer(random, 1, 12);
    } else {
      burst = integer(random, 1, 20);
    }
    return {
      pid: `P${index + 1}`,
      arrival: arrivals[index],
      burst,
      priority:
        type === "priority-heavy"
          ? index + 1
          : type === "uniform-bursts" || type === "high-variance-bursts"
            ? 1
            : integer(random, 1, 10),
    };
  });
}

export function generateWorkload({ type = "mixed", size = 5, seed = 1 } = {}) {
  if (!WORKLOAD_TYPES.includes(type))
    throw new RangeError("Unknown workload type.");
  whole(size, "size", 3, 50);
  return buildProcesses(type, size, seededRandom(seed));
}

/** Cycle through every workload type while varying sizes from 3 to 50. */
export function generateWorkloads({ count = 50, seed = 2026 } = {}) {
  whole(count, "count", 1, 500);
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const type = WORKLOAD_TYPES[index % WORKLOAD_TYPES.length];
    const size = integer(random, 3, 50);
    return {
      id: `W${index + 1}`,
      type,
      size,
      processes: buildProcesses(type, size, random),
    };
  });
}
