# Batch 7 evaluation: 50 generated workloads

Run `npm run evaluate` to reproduce this table. Seed: `2026`. The same 50 workloads are evaluated separately for each goal.

| Goal                  | Default agreement | Tuned agreement | Default mean regret | Tuned mean regret | Tuned failure cases |
| --------------------- | ----------------: | --------------: | ------------------: | ----------------: | ------------------: |
| Average waiting time  |      18.0% (9/50) |   90.0% (45/50) |              0.3960 |            0.0234 |                   5 |
| Average response time |      18.0% (9/50) |   62.0% (31/50) |              0.3900 |            0.0399 |                  19 |
| Waiting-time fairness |     32.0% (16/50) |   80.0% (40/50) |             -0.0899 |           -0.0098 |                  10 |

The search chose `priorityHigh=1.05`, `cvHigh=0.35`, `cvLow=0.15`, `staggered=0.2`, and `moderateDefault=SJF` for all three goals. It chose the **mean** burst for Round Robin quantum on waiting and response goals, and the **median** burst for fairness.

Agreement means the selected algorithm's name is among the fixed algorithms tied for the best goal score. Failure cases are disagreements that also have a worse score. Regret follows the signed Batch 5 formula: negative fairness regret means a lower fairness index than the best fixed algorithm. This is an in-sample evaluation on the workloads used by the search. The threshold above 1 disables the priority-spread branch under the automatic observed priority scale, whose ratio cannot exceed 1; that outcome should be tested on other seeds before treating it as a general rule.
