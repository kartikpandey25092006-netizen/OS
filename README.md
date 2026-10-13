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
- Arrival and burst times and priorities are integers; arrival is non-negative and burst is positive. A workload needs at least one process and PIDs must be unique.
- Scheduling ties use earlier arrival first, then lower PID.
- Idle periods are explicit `IDLE` intervals and count against CPU utilization.
- Adjacent Gantt intervals for the same process are merged.
- Burst coefficient of variation uses population standard deviation.
- Any configurable selector thresholds are centralized in `src/engine/config.js`.

## Development batches

The project is built in approved batches. Batch 0 establishes the app shell, shared process validation, configuration defaults, and tests. Scheduler rules, comparison behavior, and evaluation details will be documented alongside their implementation.
