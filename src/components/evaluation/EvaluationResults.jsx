import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ALGORITHM_NAMES } from "../../engine/config.js";
import { Button } from "../ui/button.jsx";
import { Card, CardContent, CardHeader } from "../ui/card.jsx";
import { buildEvaluationJson } from "./evaluationExport.js";

const THRESHOLD_LABELS = {
  priorityHigh: "Priority spread",
  cvHigh: "High burst CV",
  cvLow: "Low burst CV",
  staggered: "Arrival stagger",
};

function percentage(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "∞";
}

function exportJson(result, settings) {
  const blob = new Blob([buildEvaluationJson(result, settings)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `scheduling-evaluation-${result.goal}-${settings.seed}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function SummaryCard({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function EvaluationResults({ result, settings, onApply }) {
  const [view, setView] = useState("tuned");
  const displayed = result[view];
  const sensitivity = result.thresholdSensitivity.map((item) => ({
    ...item,
    label: `${THRESHOLD_LABELS[item.parameter]} ${item.value.toFixed(2)}`,
  }));

  return (
    <section aria-label="Evaluation results" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary dark:text-chart-2">
            Evaluation output
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Tuning results
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.workloadCount} generated workloads ·{" "}
            {result.candidatesEvaluated} rule configurations checked
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => exportJson(result, settings)}
          >
            Export JSON
          </Button>
          <Button
            type="button"
            onClick={() => onApply(result.bestConfig, result.goal)}
          >
            Apply tuned thresholds
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Default agreement"
          value={percentage(result.baseline.summary.agreementRate)}
          detail={`${result.baseline.summary.agreements} of ${result.workloadCount} workloads`}
        />
        <SummaryCard
          label="Tuned agreement"
          value={percentage(result.tuned.summary.agreementRate)}
          detail={`${result.tuned.summary.agreements} of ${result.workloadCount} workloads`}
        />
        <SummaryCard
          label="Default mean regret"
          value={percentage(result.baseline.summary.meanRegret)}
          detail="Signed difference from the best fixed scheduler"
        />
        <SummaryCard
          label="Tuned mean regret"
          value={percentage(result.tuned.summary.meanRegret)}
          detail="Lower is better for time goals; near zero is better for fairness"
        />
      </div>

      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <h3 className="text-lg font-semibold">Best rule settings</h3>
          <p className="text-sm text-muted-foreground">
            Search maximizes agreement, then minimizes mean shortfall on ties.
          </p>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {Object.entries(result.bestConfig.thresholds).map(
              ([key, value]) => (
                <div key={key} className="rounded-lg bg-muted/40 p-3">
                  <dt className="text-xs text-muted-foreground">
                    {THRESHOLD_LABELS[key]}
                  </dt>
                  <dd className="mt-1 font-semibold tabular-nums">
                    {value.toFixed(2)}
                  </dd>
                </div>
              ),
            )}
            <div className="rounded-lg bg-muted/40 p-3">
              <dt className="text-xs text-muted-foreground">
                Moderate fallback
              </dt>
              <dd className="mt-1 font-semibold">
                {result.bestConfig.moderateDefault}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <dt className="text-xs text-muted-foreground">RR quantum rule</dt>
              <dd className="mt-1 font-semibold capitalize">
                {result.bestConfig.rrQuantum} burst
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <h3 className="text-lg font-semibold">Threshold sensitivity</h3>
          <p className="text-sm text-muted-foreground">
            Agreement when one threshold changes and the other tuned settings
            stay fixed.
          </p>
        </CardHeader>
        <CardContent>
          <div
            role="img"
            aria-label="Bar chart of agreement by threshold value"
            className="h-[450px] min-w-0"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sensitivity}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="var(--border)"
                />
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tickFormatter={percentage}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={118}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => [percentage(value), "Agreement"]}
                />
                <Bar
                  dataKey="agreementRate"
                  fill="var(--chart-3)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Threshold sensitivity data</caption>
            <thead>
              <tr>
                <th scope="col">Threshold</th>
                <th scope="col">Agreement</th>
              </tr>
            </thead>
            <tbody>
              {sensitivity.map((item) => (
                <tr key={`${item.parameter}-${item.value}`}>
                  <th scope="row">{item.label}</th>
                  <td>
                    {item.agreementRate === null
                      ? "Invalid combination"
                      : percentage(item.agreementRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            A missing bar means that value would make low CV exceed high CV.
          </p>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">
              Selection vs empirical best
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Columns use the first fixed algorithm on a tie; agreement counts
              every tied best algorithm.
            </p>
          </div>
          <label className="text-sm font-medium">
            Show configuration
            <select
              aria-label="Show evaluation configuration"
              value={view}
              onChange={(event) => setView(event.target.value)}
              className="ml-2 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="tuned">Tuned</option>
              <option value="baseline">Default</option>
            </select>
          </label>
        </CardHeader>
        <CardContent>
          <div
            tabIndex={0}
            aria-label="Scrollable confusion matrix"
            className="overflow-x-auto rounded-xl border border-border"
          >
            <table className="w-full min-w-[620px] border-collapse text-center text-sm">
              <caption className="sr-only">
                Confusion matrix of selected and best algorithms
              </caption>
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left">
                    Selected ↓ / best →
                  </th>
                  {ALGORITHM_NAMES.map((name) => (
                    <th scope="col" key={name} className="px-2 py-3">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALGORITHM_NAMES.map((selected) => (
                  <tr key={selected} className="border-t border-border">
                    <th scope="row" className="px-3 py-3 text-left font-medium">
                      {selected}
                    </th>
                    {ALGORITHM_NAMES.map((best) => (
                      <td
                        key={best}
                        className={`px-2 py-3 tabular-nums ${selected === best ? "bg-primary/10 font-semibold" : ""}`}
                      >
                        {displayed.confusionMatrix[selected][best]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <h3 className="text-lg font-semibold">Failure cases</h3>
          <p className="text-sm text-muted-foreground">
            {displayed.failureCases.length} workloads where the rule disagreed
            and produced a worse score.
          </p>
        </CardHeader>
        <CardContent>
          {displayed.failureCases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No score-losing disagreements in this sample.
            </p>
          ) : (
            <div
              tabIndex={0}
              aria-label="Scrollable failure cases"
              className="max-h-[420px] overflow-auto rounded-xl border border-border"
            >
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Failure cases for the selected configuration
                </caption>
                <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-3">
                      Workload
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Type / size
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Selected
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Best
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Score loss
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.failureCases.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <th scope="row" className="px-3 py-3 font-medium">
                        {item.id}
                      </th>
                      <td className="px-3 py-3">
                        {item.type.replaceAll("-", " ")} · {item.size}
                      </td>
                      <td className="px-3 py-3">{item.selectedAlgorithm}</td>
                      <td className="px-3 py-3">{item.bestAlgorithm}</td>
                      <td className="px-3 py-3 tabular-nums">
                        {percentage(item.loss)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
