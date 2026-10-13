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
- Arrival and burst times and priorities are integers; arrival is non-negative and burst is positive. A workload needs at least one process and unique, non-empty string PIDs. `IDLE` and `CONTEXT_SWITCH` are reserved Gantt PIDs.
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

SRTF, Round Robin, and preemptive Priority accept `contextSwitchCost` (default 0). SRTF and preemptive Priority reconsider the winner after switch overhead because arrivals or aging may have changed the ready set. Round Robin keeps its selected queue entry; arrivals during the switch join the back of the queue.

Priority also accepts `agingInterval`, a positive integer, in both modes. After every complete interval of accumulated time waiting in the ready queue, effective priority improves by 1 (its number decreases). Aging stops while the process runs. The original priority value in `processResults` remains unchanged. Without `agingInterval`, aging is disabled.

## Development batches

The project is built in approved batches. Batch 0 establishes the app shell, shared process validation, configuration defaults, and tests. Batch 1 adds FCFS, non-preemptive SJF, and non-preemptive Priority. Batch 2 adds SRTF, Round Robin, preemptive Priority, context-switch overhead, and aging. Comparison and evaluation follow in later approved batches.
