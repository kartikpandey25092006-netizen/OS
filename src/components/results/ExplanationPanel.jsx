import React from "react";
import { formatNumber } from "./resultFormatting.js";

const RULE_LABELS = Object.freeze({
  "priority-spread": "Priority spread",
  "priority-spread-mixed": "Priority spread with SJF ties",
  "high-cv-staggered": "High burst variation, staggered arrivals",
  "high-cv-batch": "High burst variation, batch arrivals",
  "low-cv": "Low burst variation",
  moderate: "Moderate burst variation",
});

/** Mirrors the selector's evidence; a warning never replaces the rule's pick. */
export function ExplanationPanel({ selection }) {
  const { stats, verificationWarning } = selection;

  return (
    <section
      aria-labelledby="explanation-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary dark:text-chart-2">
            Decision logic
          </p>
          <h2
            id="explanation-heading"
            className="mt-1 text-lg font-semibold text-foreground"
          >
            Why this algorithm?
          </h2>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
          Rule fired: {RULE_LABELS[selection.ruleFired] ?? selection.ruleFired}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-foreground">
        {selection.explanation}
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-muted/50 p-3">
          <dt className="text-xs text-muted-foreground">Burst CV</dt>
          <dd className="mt-1 font-semibold tabular-nums text-foreground">
            {formatNumber(stats.burstCV)}
          </dd>
        </div>
        <div className="rounded-xl bg-muted/50 p-3">
          <dt className="text-xs text-muted-foreground">Priority spread</dt>
          <dd className="mt-1 font-semibold tabular-nums text-foreground">
            {formatNumber(stats.prioritySpreadRatio)}
          </dd>
        </div>
        <div className="rounded-xl bg-muted/50 p-3">
          <dt className="text-xs text-muted-foreground">Arrival stagger</dt>
          <dd className="mt-1 font-semibold tabular-nums text-foreground">
            {formatNumber(stats.staggeredArrivalRatio)}
          </dd>
        </div>
        <div className="rounded-xl bg-muted/50 p-3">
          <dt className="text-xs text-muted-foreground">Mean burst</dt>
          <dd className="mt-1 font-semibold tabular-nums text-foreground">
            {formatNumber(stats.meanBurst)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        Priority scale: {stats.priorityScale.min} to {stats.priorityScale.max}.{" "}
        Lower values mean higher priority.
      </p>
      {verificationWarning && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <p className="font-semibold">Verification warning</p>
          <p className="mt-1 leading-6">{verificationWarning.message}</p>
        </div>
      )}
    </section>
  );
}
