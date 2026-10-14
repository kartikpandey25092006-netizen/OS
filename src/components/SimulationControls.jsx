import React from "react";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function SimulationControls({ controls, onChange }) {
  const update = (name, value) =>
    onChange((current) => ({ ...current, [name]: value }));

  return (
    <section
      aria-labelledby="simulation-controls-title"
      className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6"
    >
      <h2
        id="simulation-controls-title"
        className="text-lg font-semibold tracking-tight"
      >
        Simulation controls
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a goal and adjust how the scheduling algorithms run.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Optimization goal
          <select
            aria-label="Optimization goal"
            value={controls.goal}
            onChange={(event) => update("goal", event.target.value)}
            className={inputClass}
          >
            <option value="waiting">Minimum average waiting time</option>
            <option value="response">Minimum average response time</option>
            <option value="fairness">Waiting-time fairness</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Round Robin quantum
          <input
            aria-label="Round Robin quantum"
            type="number"
            min="1"
            step="1"
            placeholder="Auto: median burst"
            value={controls.quantum}
            onChange={(event) => update("quantum", event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium">
          Context-switch cost
          <input
            aria-label="Context-switch cost"
            type="number"
            min="0"
            step="1"
            value={controls.contextSwitchCost}
            onChange={(event) =>
              update("contextSwitchCost", event.target.value)
            }
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium">
          Priority scale
          <select
            aria-label="Priority scale"
            value={controls.priorityScaleMode}
            onChange={(event) =>
              update("priorityScaleMode", event.target.value)
            }
            className={inputClass}
          >
            <option value="auto">Use input min/max</option>
            <option value="manual">Set range manually</option>
          </select>
        </label>
      </div>

      {controls.priorityScaleMode === "manual" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Minimum priority
            <input
              aria-label="Minimum priority"
              type="number"
              step="1"
              value={controls.priorityMin}
              onChange={(event) => update("priorityMin", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium">
            Maximum priority
            <input
              aria-label="Maximum priority"
              type="number"
              step="1"
              value={controls.priorityMax}
              onChange={(event) => update("priorityMax", event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
          <input
            aria-label="Enable priority aging"
            type="checkbox"
            checked={controls.agingEnabled}
            onChange={(event) => update("agingEnabled", event.target.checked)}
            className="size-4 accent-primary"
          />
          Enable priority aging
        </label>
        {controls.agingEnabled && (
          <label className="mt-3 block text-sm font-medium">
            Aging interval (time units)
            <input
              aria-label="Aging interval"
              type="number"
              min="1"
              step="1"
              placeholder="Auto: median burst"
              value={controls.agingInterval}
              onChange={(event) => update("agingInterval", event.target.value)}
              className={inputClass}
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Leave blank to use the rounded median burst.
            </span>
          </label>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Priority convention: lower number means higher priority. Automatic scale
        uses the smallest and largest priorities in the current workload.
      </p>
    </section>
  );
}
