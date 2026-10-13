import React, { useEffect, useId, useState } from "react";

const PROCESS_COLORS = [
  "#4f46e5",
  "#0891b2",
  "#b45309",
  "#be185d",
  "#15803d",
  "#7c3aed",
  "#c2410c",
  "#0369a1",
];

const PLAYBACK_SPEEDS = [0.5, 1, 2, 4];
const EMPTY_GANTT = [];

function colorForPid(pid) {
  let hash = 0;
  for (const character of String(pid))
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return PROCESS_COLORS[hash % PROCESS_COLORS.length];
}

function segmentLabel(pid) {
  return pid === "CONTEXT_SWITCH"
    ? "Context switch"
    : pid === "IDLE"
      ? "Idle"
      : String(pid);
}

function formatDuration(duration) {
  return `${duration} time ${duration === 1 ? "unit" : "units"}`;
}

function tickValues(gantt) {
  const boundaries = [
    ...new Set([0, ...gantt.flatMap(({ start, end }) => [start, end])]),
  ].sort((a, b) => a - b);
  if (boundaries.length <= 12) return boundaries;

  // Keep the first and last boundaries while thinning a dense timeline axis.
  const ticks = new Set();
  for (let index = 0; index < 12; index += 1) {
    ticks.add(boundaries[Math.round((index * (boundaries.length - 1)) / 11)]);
  }
  return [...ticks].sort((a, b) => a - b);
}

export function GanttPlaybackControls({
  currentStep,
  stepCount,
  isPlaying,
  speed,
  onPlayPause,
  onStep,
  onReplay,
  onSpeedChange,
  className = "",
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      aria-label="Gantt playback controls"
    >
      <button
        type="button"
        onClick={onReplay}
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label="Replay Gantt chart"
      >
        Replay
      </button>
      <button
        type="button"
        onClick={onPlayPause}
        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={isPlaying ? "Pause Gantt playback" : "Play Gantt playback"}
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        onClick={onStep}
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label="Step Gantt playback"
      >
        Step
      </button>
      <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
        Speed
        <select
          aria-label="Playback speed"
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {PLAYBACK_SPEEDS.map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>
      </label>
      <span
        className="min-w-22 text-right text-sm tabular-nums text-muted-foreground"
        aria-live="polite"
      >
        Step {currentStep} of {stepCount}
      </span>
    </div>
  );
}

export function GanttChart({
  gantt = EMPTY_GANTT,
  title = "Execution timeline",
  showPlayback = true,
  className = "",
}) {
  const [visibleCount, setVisibleCount] = useState(gantt.length);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [activeIndex, setActiveIndex] = useState(null);
  const titleId = useId();
  const tooltipId = useId();
  const patternId = useId().replace(/:/g, "");

  useEffect(() => {
    setVisibleCount(gantt.length);
    setIsPlaying(false);
    setActiveIndex(null);
  }, [gantt]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = window.setInterval(() => {
      setVisibleCount((current) => Math.min(current + 1, gantt.length));
    }, 700 / speed);
    return () => window.clearInterval(timer);
  }, [gantt.length, isPlaying, speed]);

  useEffect(() => {
    if (isPlaying && visibleCount >= gantt.length) setIsPlaying(false);
  }, [gantt.length, isPlaying, visibleCount]);

  if (gantt.length === 0) {
    return (
      <section className={className} aria-label={title}>
        <h3 className="text-base font-semibold text-card-foreground">
          {title}
        </h3>
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          Run a schedule to see its Gantt chart.
        </p>
      </section>
    );
  }

  const maxTime = Math.max(1, ...gantt.map(({ end }) => end));
  const width = Math.max(720, gantt.length * 78);
  const plotLeft = 24;
  const plotWidth = width - 48;
  const xAt = (time) => plotLeft + (time / maxTime) * plotWidth;
  const shownSegments = showPlayback ? gantt.slice(0, visibleCount) : gantt;
  const activeSegment =
    activeIndex === null ? null : shownSegments[activeIndex];
  const processPids = [...new Set(gantt.map(({ pid }) => pid))].filter(
    (pid) => pid !== "IDLE" && pid !== "CONTEXT_SWITCH",
  );
  const hasIdle = gantt.some(({ pid }) => pid === "IDLE");
  const hasSwitch = gantt.some(({ pid }) => pid === "CONTEXT_SWITCH");

  function handlePlayPause() {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (visibleCount >= gantt.length) setVisibleCount(0);
      setIsPlaying(true);
    }
  }

  function handleStep() {
    setIsPlaying(false);
    setVisibleCount((current) => (current >= gantt.length ? 1 : current + 1));
  }

  function handleReplay() {
    setIsPlaying(false);
    setVisibleCount(0);
    setActiveIndex(null);
  }

  return (
    <section className={className} aria-labelledby={titleId}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3
          id={titleId}
          className="text-base font-semibold text-card-foreground"
        >
          {title}
        </h3>
        <span className="text-xs text-muted-foreground">
          Time units · total {maxTime}
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card p-3">
        <svg
          role="group"
          aria-label={`${title}: ${shownSegments.length} of ${gantt.length} segments visible`}
          width="100%"
          height="132"
          viewBox={`0 0 ${width} 132`}
          style={{ minWidth: `${Math.min(width, 720)}px` }}
        >
          <defs>
            <pattern
              id={`${patternId}-idle`}
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="8" height="8" fill="#cbd5e1" />
              <rect width="3" height="8" fill="#94a3b8" />
            </pattern>
            <pattern
              id={`${patternId}-switch`}
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="8" height="8" fill="#fbbf24" />
              <rect width="3" height="8" fill="#b45309" />
            </pattern>
          </defs>
          <rect
            x={plotLeft}
            y="24"
            width={plotWidth}
            height="48"
            rx="8"
            fill="var(--muted)"
          />
          {shownSegments.map(({ pid, start, end }, index) => {
            const x = xAt(start);
            const segmentWidth = Math.max(2, xAt(end) - x);
            const label = segmentLabel(pid);
            const barLabel = pid === "CONTEXT_SWITCH" ? "CS" : label;
            const fill =
              pid === "IDLE"
                ? `url(#${patternId}-idle)`
                : pid === "CONTEXT_SWITCH"
                  ? `url(#${patternId}-switch)`
                  : colorForPid(pid);
            const details = `${label}: ${start} to ${end} (${formatDuration(end - start)})`;

            return (
              <g key={`${pid}-${start}-${end}-${index}`}>
                <rect
                  x={x}
                  y="24"
                  width={segmentWidth}
                  height="48"
                  fill={fill}
                  stroke="var(--card)"
                  strokeWidth="2"
                  role="img"
                  aria-label={details}
                  aria-describedby={
                    activeIndex === index ? tooltipId : undefined
                  }
                  tabIndex="0"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                >
                  <title>{details}</title>
                </rect>
                {segmentWidth >= 46 && (
                  <text
                    x={x + segmentWidth / 2}
                    y="54"
                    textAnchor="middle"
                    fill={
                      pid === "IDLE" || pid === "CONTEXT_SWITCH"
                        ? "#1e293b"
                        : "#fff"
                    }
                    fontSize="13"
                    fontWeight="700"
                    pointerEvents="none"
                  >
                    {segmentWidth >= 88 ? barLabel : barLabel.slice(0, 5)}
                  </text>
                )}
              </g>
            );
          })}
          <line
            x1={plotLeft}
            y1="92"
            x2={width - plotLeft}
            y2="92"
            stroke="var(--muted-foreground)"
            strokeWidth="1"
          />
          {tickValues(gantt).map((time) => (
            <g key={time}>
              <line
                x1={xAt(time)}
                y1="88"
                x2={xAt(time)}
                y2="97"
                stroke="var(--muted-foreground)"
                strokeWidth="1"
              />
              <text
                x={xAt(time)}
                y="115"
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize="12"
                fontWeight="500"
              >
                {time}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {activeSegment && (
        <div
          id={tooltipId}
          role="tooltip"
          className="mt-2 inline-flex rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background"
        >
          {segmentLabel(activeSegment.pid)} · {activeSegment.start}–
          {activeSegment.end} ·{" "}
          {formatDuration(activeSegment.end - activeSegment.start)}
        </div>
      )}
      <div
        className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"
        aria-label="Gantt legend"
      >
        {processPids.map((pid) => (
          <span className="inline-flex items-center gap-1.5" key={pid}>
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: colorForPid(pid) }}
              aria-hidden="true"
            />
            {pid}
          </span>
        ))}
        {hasIdle && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm bg-muted-foreground"
              aria-hidden="true"
            />
            Idle
          </span>
        )}
        {hasSwitch && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm bg-amber-500"
              aria-hidden="true"
            />
            Context switch
          </span>
        )}
      </div>
      {showPlayback && (
        <GanttPlaybackControls
          className="mt-4 border-t border-border pt-4"
          currentStep={visibleCount}
          stepCount={gantt.length}
          isPlaying={isPlaying}
          speed={speed}
          onPlayPause={handlePlayPause}
          onStep={handleStep}
          onReplay={handleReplay}
          onSpeedChange={setSpeed}
        />
      )}
    </section>
  );
}
