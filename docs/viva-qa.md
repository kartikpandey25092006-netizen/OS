# Viva Q&A

**Why is Priority's lower number more urgent?** This project defines lower values as higher priority, consistently in the engine and UI. The choice is a convention; reversing it would require changing comparisons and explanations together.

**What is the difference between SJF and SRTF?** SJF picks the shortest burst from ready processes and runs it to completion. SRTF can preempt when a newly arrived process has less remaining work.

**Why use Round Robin?** A quantum shares CPU time among ready processes. It can improve initial response, while small quanta plus context-switch overhead can increase completion and waiting times.

**How are ties broken?** Earlier arrival wins, then numeric-aware lower PID. At a Round Robin quantum boundary, a simultaneous new arrival is queued before the preempted process.

**What does idle mean?** No process is ready. It appears explicitly in the Gantt and lowers CPU utilization because utilization is useful busy time divided by makespan.

**What is a context switch?** An optional cost between different running processes. Its Gantt interval is overhead and never counted as useful execution.

**How does aging help?** A waiting process's effective priority improves every configured interval. It limits starvation without changing the original input priority.

**What is burst CV?** Population standard deviation of bursts divided by their mean. It distinguishes similar from uneven bursts without depending on the absolute time scale.

**Why can the adaptive choice lose?** The selector follows short, explainable rules. It does not optimize every possible workload. Hybrid verification reports a better competitor while preserving the rule decision.

**How is regret defined?** `(adaptive score − best score) / best score`. For fairness, higher is better, so a worse adaptive fairness score gives negative signed regret. Agreement counts ties among fixed algorithms.

**What did tuning establish?** On the 50 generated workloads with seed 2026, a grid search improved agreement for each goal. Those are in-sample observations; another seed or real workload may differ.

**What are the project's main limits?** Integer, single CPU workloads; no I/O blocking, deadlines, or multicore scheduling. The rule table is a heuristic, and the fairness index measures equality of waiting times rather than waiting-time quality.
