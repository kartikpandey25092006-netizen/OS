# Limitations and failure cases

The simulator models one CPU with integer arrivals, bursts, and priorities. It does not model I/O blocking, deadlines, multicore execution, cache effects, or real operating-system dispatch behavior. The UI random-row control is capped at 50, while the engine's 120-process test covers larger inputs.

The adaptive selector is a rule-based heuristic. The observed priority scale gives spread ratio 1 whenever priorities differ, so the default priority rule often overrides burst-based rules. Manual priority bounds can change this. The 50-workload grid search chose `priorityHigh=1.05`, effectively disabling that branch under the observed scale. The tuned thresholds were scored on the same sample used to choose them; [the evaluation report](evaluation-50.md) must not be read as evidence of out-of-sample accuracy.

The tuned 50-workload run still had 5 waiting, 19 response, and 10 fairness failures. For example, on a high-variance batch, a response-time goal may prefer Round Robin, but a particular quantum can still yield a worse average response than another fixed scheduler. The UI exposes individual failure cases and verification warnings for inspection.

Jain's index here measures equality of waiting times. It can rate uniformly long waits as fair, so read it alongside average and maximum wait. Signed fairness regret is negative when the adaptive score is below the best score. A best score of zero can also make ordinary relative regret undefined; the comparison module reports infinity in that case.

The 120-process test is a controlled performance check with small bursts. SRTF and preemptive Priority inspect ready processes over simulated time, so very large burst totals can take much longer even when the number of rows is small. The generous 15-second bound is a regression guard, not a browser performance promise.
