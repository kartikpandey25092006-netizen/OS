export const DEFAULT_CONTROLS = Object.freeze({
  goal: "waiting",
  quantum: "",
  contextSwitchCost: "0",
  agingEnabled: false,
  agingInterval: "3",
  priorityScaleMode: "auto",
  priorityMin: "1",
  priorityMax: "10",
});

function integerField(raw, label, minimum) {
  if (String(raw).trim() === "") {
    throw new RangeError(`${label} is required.`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${label} must be an integer of at least ${minimum}.`);
  }
  return value;
}

/** Convert editable control strings into validated engine options. */
export function controlsToOptions(controls, processes) {
  if (!["waiting", "response", "fairness"].includes(controls.goal)) {
    throw new RangeError("Choose a valid optimization goal.");
  }
  const options = {
    goal: controls.goal,
    contextSwitchCost: integerField(
      controls.contextSwitchCost,
      "Context-switch cost",
      0,
    ),
    agingEnabled: controls.agingEnabled,
  };
  if (String(controls.quantum).trim() !== "") {
    options.quantum = integerField(controls.quantum, "Quantum", 1);
  }
  if (controls.agingEnabled) {
    options.agingInterval = integerField(
      controls.agingInterval,
      "Aging interval",
      1,
    );
  }
  if (controls.priorityScaleMode === "manual") {
    const priorityMin = integerField(
      controls.priorityMin,
      "Priority scale minimum",
      Number.MIN_SAFE_INTEGER,
    );
    const priorityMax = integerField(
      controls.priorityMax,
      "Priority scale maximum",
      Number.MIN_SAFE_INTEGER,
    );
    if (priorityMin > priorityMax) {
      throw new RangeError("Priority scale minimum must not exceed maximum.");
    }
    if (
      processes.some(
        ({ priority }) => priority < priorityMin || priority > priorityMax,
      )
    ) {
      throw new RangeError(
        "Priority scale must include every process priority.",
      );
    }
    options.priorityMin = priorityMin;
    options.priorityMax = priorityMax;
  } else if (controls.priorityScaleMode !== "auto") {
    throw new RangeError("Choose an automatic or manual priority scale.");
  }
  return options;
}
