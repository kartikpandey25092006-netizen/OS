import React from "react";
import {
  formatNumber,
  formatPercent,
  GOAL_LABELS,
} from "./resultFormatting.js";

const STATUS_TEXT = {
  best: "Best for this goal",
  "top-2": "Top two for this goal",
  worse: "Room to improve",
};

/** A concise summary of the actual adaptive run, separate from fixed baselines. */
export function AdaptiveSummary({ comparison }) {
  const { adaptive, selection } = comparison;
  const isFairness = adaptive.goal === "fairness";
  const score = isFairness
    ? formatNumber(adaptive.value, 3)
    : formatNumber(adaptive.value);
  const best = isFairness
    ? formatNumber(adaptive.bestValue, 3)
    : formatNumber(adaptive.bestValue);

  return (
    <section
      aria-labelledby="adaptive-summary-heading"
      className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm dark:border-primary/30 dark:from-primary/15 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary dark:text-chart-2">
            Adaptive pick
          </p>
          <h2
            id="adaptive-summary-heading"
            className="mt-1 text-2xl font-bold tracking-tight text-foreground"
          >
            {adaptive.algorithm}
          </h2>
          {selection.quantum !== undefined && (
            <p className="mt-1 text-sm text-muted-foreground">
              Quantum: {selection.quantum} time units
            </p>
          )}
        </div>
        <span className="rounded-full border border-primary/20 bg-card px-3 py-1.5 text-xs font-semibold text-primary dark:text-chart-2">
          {STATUS_TEXT[adaptive.status] ?? adaptive.status} · rank{" "}
          {adaptive.rank}
        </span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/80 p-3">
          <dt className="text-xs text-muted-foreground">
            {GOAL_LABELS[adaptive.goal] ?? adaptive.goal}
          </dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {score}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-card/80 p-3">
          <dt className="text-xs text-muted-foreground">Best score</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {best}
          </dd>
        </div>
        <div className="col-span-2 rounded-xl border border-border bg-card/80 p-3 sm:col-span-1">
          <dt className="text-xs text-muted-foreground">Regret</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatPercent(adaptive.regret)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
