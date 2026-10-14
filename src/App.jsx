import React, { Suspense, useEffect, useState } from "react";
import { Cpu, Moon, Play, Sun } from "@phosphor-icons/react";
import { ALGORITHM_NAMES } from "./engine/config.js";
import { compare } from "./engine/compare.js";
import { validateProcesses } from "./engine/validate.js";
import { GanttChart } from "./components/GanttChart.jsx";
import { ProcessTable } from "./components/ProcessTable.jsx";
import { DEFAULT_PROCESSES } from "./components/processInputs.js";
import { SimulationControls } from "./components/SimulationControls.jsx";
import {
  controlsToOptions,
  DEFAULT_CONTROLS,
} from "./components/simulationOptions.js";
import { Badge } from "./components/ui/badge.jsx";
import { Button } from "./components/ui/button.jsx";
import { Card, CardContent, CardHeader } from "./components/ui/card.jsx";
import "./styles.css";
import "./app.css";

const TIMELINE_NAMES = ["Adaptive", ...ALGORITHM_NAMES];
const ResultsView = React.lazy(() =>
  import("./components/results/ResultsView.jsx").then(({ ResultsView }) => ({
    default: ResultsView,
  })),
);
const EvaluationPage = React.lazy(() =>
  import("./components/evaluation/EvaluationPage.jsx").then(
    ({ EvaluationPage }) => ({ default: EvaluationPage }),
  ),
);

export function App() {
  const [view, setView] = useState("simulator");
  const [processes, setProcesses] = useState(DEFAULT_PROCESSES);
  const [controls, setControls] = useState({ ...DEFAULT_CONTROLS });
  const [comparison, setComparison] = useState(null);
  const [timelineName, setTimelineName] = useState("Adaptive");
  const [runError, setRunError] = useState("");
  const [dark, setDark] = useState(false);
  const [appliedTuning, setAppliedTuning] = useState(null);
  const processValidation = validateProcesses(processes);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    return () => document.documentElement.classList.remove("dark");
  }, [dark]);

  function updateProcesses(next) {
    setProcesses(next);
    setComparison(null);
    setRunError("");
  }

  function updateControls(update) {
    const next = typeof update === "function" ? update(controls) : update;
    if (next.goal !== controls.goal) setAppliedTuning(null);
    setControls(next);
    setComparison(null);
    setRunError("");
  }

  function runSimulation() {
    if (!processValidation.valid) {
      setRunError("Fix process inputs before running the simulation.");
      return;
    }
    try {
      const options = controlsToOptions(controls, processes);
      const result = compare(processes, { ...options, ...appliedTuning });
      setComparison(result);
      setTimelineName("Adaptive");
      setRunError("");
    } catch (error) {
      setComparison(null);
      setRunError(
        error instanceof Error
          ? error.message
          : "Could not run the simulation.",
      );
    }
  }

  function applyTuning(config, goal) {
    setAppliedTuning(config);
    setControls({
      ...DEFAULT_CONTROLS,
      goal,
      agingEnabled: goal === "fairness",
      agingInterval: goal === "fairness" ? "" : DEFAULT_CONTROLS.agingInterval,
    });
    setComparison(null);
    setView("simulator");
  }

  const timelineResult = comparison?.results[timelineName];
  const timelineTitle =
    timelineName === "Adaptive" && comparison
      ? `Adaptive · ${comparison.selection.algorithm}`
      : timelineName;

  return (
    <main className="simulator-app min-h-screen bg-background text-foreground">
      <header className="app-header no-print border-b border-border/70 bg-card/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Cpu size={21} weight="duotone" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              Operating Systems Lab
            </p>
            <p className="text-xs text-muted-foreground">
              CPU scheduling workspace
            </p>
          </div>
          <nav
            aria-label="Main views"
            className="order-3 flex w-full gap-1 border-t border-border pt-2 sm:order-none sm:ml-5 sm:w-auto sm:border-0 sm:pt-0"
          >
            <Button
              type="button"
              variant={view === "simulator" ? "secondary" : "ghost"}
              onClick={() => setView("simulator")}
            >
              Simulator
            </Button>
            <Button
              type="button"
              variant={view === "evaluation" ? "secondary" : "ghost"}
              onClick={() => setView("evaluation")}
            >
              Evaluation
            </Button>
          </nav>
          <Badge variant="secondary" className="ml-auto hidden lg:inline-flex">
            UNIVERSITY PROJECT
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="ml-auto sm:ml-0"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setDark((value) => !value)}
          >
            {dark ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-7 sm:px-6 lg:px-8">
        {view === "evaluation" ? (
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">
                Loading evaluation…
              </p>
            }
          >
            <EvaluationPage onApply={applyTuning} />
          </Suspense>
        ) : (
          <>
            <section className="hero-panel no-print relative overflow-hidden rounded-3xl border border-border p-6 sm:p-8 lg:p-10">
              <div className="relative z-10 max-w-3xl">
                <Badge className="mb-4">INTERACTIVE SIMULATOR</Badge>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                  Adaptive CPU Scheduling Simulator
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  Build a workload, compare five scheduling algorithms, and
                  inspect why the adaptive rule chose its result. Follow each
                  process through the execution timeline.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                  <span className="rounded-full border border-border bg-background/70 px-3 py-1.5">
                    5 schedulers
                  </span>
                  <span className="rounded-full border border-border bg-background/70 px-3 py-1.5">
                    3 optimization goals
                  </span>
                  <span className="rounded-full border border-border bg-background/70 px-3 py-1.5">
                    Live comparison
                  </span>
                </div>
              </div>
            </section>

            {appliedTuning && (
              <div
                role="status"
                className="no-print mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm"
              >
                <span>
                  Tuned rules are active for the {controls.goal} goal.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAppliedTuning(null);
                    setComparison(null);
                  }}
                >
                  Reset rules
                </Button>
              </div>
            )}

            <div className="no-print mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
              <ProcessTable processes={processes} onChange={updateProcesses} />
              <div className="space-y-4">
                <SimulationControls
                  controls={controls}
                  onChange={updateControls}
                />
                <Card className="border border-border bg-card shadow-sm">
                  <CardContent className="space-y-3">
                    <Button
                      type="button"
                      size="lg"
                      onClick={runSimulation}
                      disabled={!processValidation.valid}
                      className="w-full"
                    >
                      <Play size={17} weight="fill" aria-hidden="true" />
                      Run simulation
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      {processValidation.valid
                        ? `${processes.length} ready ${processes.length === 1 ? "process" : "processes"} · results stay on this device`
                        : "Correct the highlighted rows to enable simulation."}
                    </p>
                  </CardContent>
                </Card>
                {runError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  >
                    {runError}
                  </p>
                )}
              </div>
            </div>

            {comparison ? (
              <div id="results" className="mt-8 space-y-6" aria-live="polite">
                <Card className="border border-border bg-card shadow-sm">
                  <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-primary dark:text-chart-2">
                        Execution trace
                      </p>
                      <h2 className="mt-1 text-xl font-semibold tracking-tight">
                        Gantt timeline
                      </h2>
                    </div>
                    <label className="no-print text-sm font-medium">
                      View algorithm
                      <select
                        aria-label="View algorithm timeline"
                        value={timelineName}
                        onChange={(event) =>
                          setTimelineName(event.target.value)
                        }
                        className="ml-2 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        {TIMELINE_NAMES.map((name) => (
                          <option key={name} value={name}>
                            {name === "Adaptive"
                              ? `Adaptive (${comparison.selection.algorithm})`
                              : name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </CardHeader>
                  <CardContent>
                    <GanttChart
                      gantt={timelineResult.schedule.gantt}
                      title={`${timelineTitle} execution`}
                    />
                  </CardContent>
                </Card>
                <Suspense
                  fallback={
                    <p className="text-sm text-muted-foreground">
                      Loading comparison…
                    </p>
                  }
                >
                  <ResultsView comparison={comparison} />
                </Suspense>
              </div>
            ) : (
              <section
                className="no-print mt-8 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center"
                aria-label="Results placeholder"
              >
                <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-chart-2">
                  <Play size={21} weight="duotone" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">
                  Ready when you are
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Run the current workload to see its timeline, algorithm
                  rankings, and the rule behind the adaptive choice.
                </p>
              </section>
            )}
          </>
        )}

        <footer className="no-print mt-10 border-t border-border py-5 text-xs text-muted-foreground">
          Operating Systems Lab · Browser-based scheduling simulator
        </footer>
      </div>
    </main>
  );
}
