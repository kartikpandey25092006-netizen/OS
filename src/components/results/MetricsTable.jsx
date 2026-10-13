import React from "react";
import { ALGORITHM_NAMES } from "../../engine/config.js";
import { formatNumber, formatPercent } from "./resultFormatting.js";

/** Every algorithm uses the same metric definitions and goal rank. */
export function MetricsTable({ comparison }) {
  const names = [...ALGORITHM_NAMES, "Adaptive"];
  const { results, adaptive } = comparison;

  return (
    <section
      aria-labelledby="metrics-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="metrics-heading"
          className="text-lg font-semibold text-foreground"
        >
          Algorithm metrics
        </h2>
        <p className="text-xs text-muted-foreground">
          Lower times are better. Higher CPU use and fairness are better.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[790px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Comparison of scheduling metrics for all algorithms
          </caption>
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Algorithm
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">
                Avg wait
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">
                Avg turnaround
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">
                Avg response
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">
                CPU use
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">
                Throughput
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">
                Fairness
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Goal rank
              </th>
            </tr>
          </thead>
          <tbody>
            {names.map((name) => {
              const result = results[name];
              const { metrics } = result;
              const highlighted = name === "Adaptive";
              return (
                <tr
                  key={name}
                  className={
                    highlighted
                      ? "border-t border-primary/20 bg-primary/10 font-semibold text-foreground"
                      : "border-t border-border text-foreground"
                  }
                >
                  <th scope="row" className="whitespace-nowrap px-4 py-3">
                    {name}
                    {highlighted && (
                      <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                        {adaptive.algorithm}
                      </span>
                    )}
                  </th>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatNumber(metrics.averages.waiting)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatNumber(metrics.averages.turnaround)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatNumber(metrics.averages.response)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatPercent(metrics.cpuUtilization)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatNumber(metrics.throughput, 3)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatNumber(metrics.jainsFairnessIndex, 3)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    #{result.ranks[adaptive.metric]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
