import React from "react";
import { AdaptiveSummary } from "./AdaptiveSummary.jsx";
import { ComparisonChart } from "./ComparisonChart.jsx";
import { ExplanationPanel } from "./ExplanationPanel.jsx";
import { MetricsTable } from "./MetricsTable.jsx";
import { ResultsActions } from "./ResultsActions.jsx";

/** Convenience layout for the outputs from compare(processes, options). */
export function ResultsView({ comparison }) {
  return (
    <section aria-label="Scheduling results" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary dark:text-chart-2">
            Simulation output
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            Scheduling results
          </h2>
        </div>
        <ResultsActions comparison={comparison} />
      </div>
      <AdaptiveSummary comparison={comparison} />
      <ExplanationPanel selection={comparison.selection} />
      <ComparisonChart comparison={comparison} />
      <MetricsTable comparison={comparison} />
    </section>
  );
}
