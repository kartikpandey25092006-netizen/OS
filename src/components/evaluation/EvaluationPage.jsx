import React, { useState } from "react";
import { generateWorkloads } from "../../engine/workloadGenerator.js";
import { tuneThresholds } from "../../engine/tuning.js";
import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import { Card, CardContent } from "../ui/card.jsx";
import { EvaluationResults } from "./EvaluationResults.jsx";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function EvaluationPage({ onApply }) {
  const [count, setCount] = useState("50");
  const [seed, setSeed] = useState("2026");
  const [goal, setGoal] = useState("waiting");
  const [result, setResult] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");

  function change(setter, value) {
    setter(value);
    setResult(null);
    setError("");
  }

  function runEvaluation(event) {
    event.preventDefault();
    try {
      if (count.trim() === "" || seed.trim() === "") {
        throw new RangeError("Workload count and seed are required.");
      }
      const options = { count: Number(count), seed: Number(seed) };
      const workloads = generateWorkloads(options);
      setResult(tuneThresholds(workloads, { goal }));
      setSettings(options);
      setError("");
    } catch (cause) {
      setResult(null);
      setError(
        cause instanceof Error ? cause.message : "Evaluation could not run.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="hero-panel no-print rounded-3xl border border-border p-6 sm:p-8 lg:p-10">
        <Badge className="mb-4">BATCH 7 · EVALUATION</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Test and tune the selector
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          Generate repeatable workloads, compare each rule choice with the
          empirically best fixed scheduler, and inspect where the rules fall
          short.
        </p>
      </section>

      <Card className="no-print border border-border bg-card shadow-sm">
        <CardContent>
          <form
            onSubmit={runEvaluation}
            className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <label className="text-sm font-medium">
              Generated workloads
              <input
                aria-label="Generated workloads"
                type="number"
                min="1"
                max="500"
                step="1"
                value={count}
                onChange={(event) => change(setCount, event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium">
              Seed
              <input
                aria-label="Evaluation seed"
                type="number"
                step="1"
                value={seed}
                onChange={(event) => change(setSeed, event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium">
              Optimization goal
              <select
                aria-label="Evaluation goal"
                value={goal}
                onChange={(event) => change(setGoal, event.target.value)}
                className={inputClass}
              >
                <option value="waiting">Average waiting time</option>
                <option value="response">Average response time</option>
                <option value="fairness">Waiting-time fairness</option>
              </select>
            </label>
            <Button type="submit" size="lg" className="w-full lg:w-auto">
              Run evaluation
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Default: 50 workloads. Six workload types rotate across sizes from 3
            to 50 processes.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {result ? (
        <EvaluationResults
          result={result}
          settings={settings}
          onApply={onApply}
        />
      ) : (
        <section
          aria-label="Evaluation placeholder"
          className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center"
        >
          <h2 className="text-lg font-semibold">Ready to evaluate</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Run the seeded sample to see agreement, regret, threshold
            sensitivity, and failure cases.
          </p>
        </section>
      )}
    </div>
  );
}
