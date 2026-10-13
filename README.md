# Adaptive CPU Scheduling Simulator

A browser-based university Operating Systems project for exploring CPU scheduling algorithms and comparing their metrics. The app uses JavaScript ES modules, React 18, Vite, Tailwind CSS, Recharts, Vitest, React Testing Library, ESLint, and Prettier. It has no backend.

## Setup

```sh
npm install
npm run dev
```

Run checks with `npm test` and `npm run lint`; create a production build with `npm run build`.

## Architecture

- `src/engine/` contains pure JavaScript scheduling logic and validation. Engine modules do not import React or browser APIs.
- `src/components/` contains reusable UI components.
- `src/pages/` contains page-level views.
- `tests/engine/` mirrors engine modules; UI tests live in `tests/`.

## Conventions

- Priority uses lower numbers for higher priority.
- Arrival and burst times and priorities are safe integers; arrival is non-negative and burst is positive. A workload needs at least one process and unique, non-empty string PIDs. `IDLE` and `CONTEXT_SWITCH` are reserved Gantt PIDs. Schedulers reject a timeline that would exceed JavaScript's safe integer range.
- Scheduling ties use earlier arrival first, then lower PID. PID comparison is numeric-aware: `P2` precedes `P10`. If two PIDs compare equally, their character order decides.
- Idle periods are explicit `IDLE` intervals and count against CPU utilization.
- Adjacent Gantt intervals for the same process are merged.
- A context switch costs zero time by default. With a positive `contextSwitchCost`, it appears as `{ pid: "CONTEXT_SWITCH", type: "CONTEXT_SWITCH", start, end }`. It happens between distinct processes, including after one completes, but not at the initial dispatch or after an idle interval. It is overhead rather than useful CPU work.
- All times, the Round Robin quantum, context-switch cost, and aging interval use integer time units.
- Burst coefficient of variation uses population standard deviation.
- Any configurable selector thresholds are centralized in `src/engine/config.js`.

## Non-preemptive schedulers

`src/engine/fcfs.js`, `sjf.js`, and `priority.js` each export `schedule(processes, options)` and a named variant (`scheduleFCFS`, `scheduleSJF`, or `schedulePriority`). Every scheduler validates its input and throws a `RangeError` when it is invalid. They do not mutate the input.

Processes have the shape `{ pid, arrival, burst, priority }`. All three schedulers return `{ gantt, processResults }`. The Gantt array contains ordered `{ pid, start, end }` intervals, including `IDLE` gaps. `processResults` follows input order and adds `start`, `completion`, `turnaround`, `waiting`, and `response` to each process. Times are integer units.

- **FCFS:** run the ready process with the earliest arrival.
- **SJF:** run the ready process with the shortest burst. Once a process starts, it runs to completion.
- **Priority:** run the ready process with the lowest priority number. Once a process starts, it runs to completion.

For all three, only arrived processes are eligible. If none has arrived, time advances to the next arrival and an `IDLE` interval is recorded. For a non-preemptive run, waiting and response are both `start - arrival`; turnaround is `completion - arrival`.

## Preemptive schedulers and options

- **SRTF** (`src/engine/srtf.js`): each time unit, run the ready process with the shortest remaining burst. An arrival can preempt the current process.
- **Round Robin** (`src/engine/roundRobin.js`): run each ready process for up to `options.quantum` time units (default 4). New arrivals join the queue in arrival/PID order. When an arrival coincides with quantum expiry, it enters before the preempted process is requeued. A lone process can keep running across quantum boundaries; those adjacent Gantt intervals merge.
- **Preemptive Priority** (`schedulePriority(processes, { preemptive: true })`): each time unit, run the ready process with the lowest effective priority number.

SRTF, Round Robin, and preemptive Priority accept `contextSwitchCost` (default 0). A scheduling choice commits when the switch begins. Arrivals and aging during the switch affect the next decision after the selected process has run for one time unit. In Round Robin, arrivals during the switch join the back of the queue.

Priority also accepts `agingInterval`, a positive integer, in both modes. After every complete interval of accumulated time waiting in the ready queue, effective priority improves by 1 (its number decreases). Aging stops while the process runs. The original priority value in `processResults` remains unchanged. Without `agingInterval`, aging is disabled.

## Metrics

Pass any scheduler's `{ gantt, processResults }` to `calculateMetrics` from `src/engine/metrics.js`. The function returns copies of the per-process results, averages for waiting, turnaround, and response time, and these workload measures:

| Measure                          | Definition                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `makespan`                       | End of the last Gantt interval, measured from time 0.                                                                 |
| `busyTime`                       | Sum of process execution intervals.                                                                                   |
| `idleTime` / `contextSwitchTime` | Sum of the corresponding Gantt intervals.                                                                             |
| `cpuUtilization`                 | `busyTime / makespan`, a fraction from 0 to 1. Idle and context-switch time remain in the denominator.                |
| `throughput`                     | Completed process count divided by makespan, in processes per time unit.                                              |
| `maximumWaitingTime`             | Largest per-process waiting time.                                                                                     |
| `jainsFairnessIndex`             | `(sum(waiting))² / (count × sum(waiting²))`. Equal waits score 1; when all waits are zero, the score is defined as 1. |

The metrics function does not change the schedule. Its fairness measure describes how evenly waiting time is distributed; it does not imply that a larger wait is desirable.

## Adaptive selector

`selectAlgorithm(processes, options)` in `src/engine/selector.js` returns an algorithm choice, its computed `stats`, a `ruleFired` identifier, a numerical `explanation`, and a separate `verificationWarning` (or `null`). A Round Robin choice includes `quantum`. The mixed Priority choice includes `priorityTieBreak: "sjf"`; a fairness-oriented Priority choice also includes `agingInterval`. Use `runAlgorithm` from `src/engine/algorithms.js` to run the choice, passing its applicable scheduler options and any requested context-switch cost.

The selector calculates burst CV as population standard deviation divided by mean burst, priority spread as `(max priority - min priority) / priority scale range`, and arrival stagger as `(max arrival - min arrival) / mean burst`. The priority scale defaults to the workload's actual minimum and maximum. With this default, any workload containing distinct priority values has a spread ratio of 1 and enters the priority rule. Set `priorityMin` and `priorityMax` to use a manual scale that covers every input priority. A zero priority range produces a spread ratio of zero; a zero burst is rejected by process validation.

With the default `goal: "waiting"`, the first matching rule wins:

| Rule                 | Threshold    | Choice                                                         |
| -------------------- | ------------ | -------------------------------------------------------------- |
| Priority spread      | `>= 0.40`    | Priority; add SJF tie-breaking when burst CV is also `>= 0.45` |
| High burst variation | CV `>= 0.45` | SRTF when arrival stagger is `>= 0.30`; otherwise SJF          |
| Low burst variation  | CV `< 0.25`  | Round Robin                                                    |
| Moderate variation   | Otherwise    | SJF                                                            |

The thresholds live in `src/engine/config.js` and can be overridden with `options.thresholds`. `moderateDefault: "FCFS"` changes the waiting-goal fallback. Round Robin uses the median burst for its quantum by default; `rrQuantum: "mean"` switches to mean burst, and `quantum` overrides either. Derived quanta are rounded to the nearest positive integer because the schedulers use integer time units.

Set `goal` to `"response"` or `"fairness"` to adapt the choice within these branches. Response mode favors Round Robin for high-CV batch arrivals and moderate variation. Fairness mode favors Round Robin outside the priority branch; within that branch it enables aging, using the rounded median burst as its interval unless `agingInterval` is supplied. A priority signal still takes precedence over other rules.

By default, hybrid verification simulates the selected algorithm and three competitors, comparing average waiting time, average response time, or Jain's waiting-time fairness index according to the goal. If a competitor improves the goal metric by **more than** `verificationMargin` (default `0.05`, or 5% relative to the selected score), `verificationWarning` describes the best improvement. The rule-based choice remains the result. Set `verify: false` to skip these simulations.

## Development batches

The project is built in approved batches. Batch 0 establishes the app shell, shared process validation, configuration defaults, and tests. Batch 1 adds FCFS, non-preemptive SJF, and non-preemptive Priority. Batch 2 adds SRTF, Round Robin, preemptive Priority, context-switch overhead, and aging. Batch 3 adds metrics and randomized scheduling invariants. Batch 4 adds the adaptive selector and hybrid verification. Comparison and evaluation follow in later approved batches.
