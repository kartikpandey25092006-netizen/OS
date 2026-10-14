import { generateWorkloads } from "../src/engine/workloadGenerator.js";
import { tuneThresholds } from "../src/engine/tuning.js";

const count = 50;
const seed = 2026;
const workloads = generateWorkloads({ count, seed });
const rows = [];

for (const goal of ["waiting", "response", "fairness"]) {
  const result = tuneThresholds(workloads, { goal });
  rows.push({
    goal,
    workloads: count,
    defaultAgreement: `${(result.baseline.summary.agreementRate * 100).toFixed(1)}%`,
    tunedAgreement: `${(result.tuned.summary.agreementRate * 100).toFixed(1)}%`,
    defaultMeanRegret: result.baseline.summary.meanRegret.toFixed(4),
    tunedMeanRegret: result.tuned.summary.meanRegret.toFixed(4),
    tunedFailures: result.tuned.failureCases.length,
    tunedThresholds: JSON.stringify(result.bestConfig.thresholds),
    moderateDefault: result.bestConfig.moderateDefault,
    rrQuantum: result.bestConfig.rrQuantum,
  });
}

console.log(
  `Batch 7 evaluation · seed ${seed} · ${count} generated workloads per goal`,
);
console.table(rows);
