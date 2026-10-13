import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GanttChart } from "../../src/components/GanttChart.jsx";

const gantt = [
  { pid: "IDLE", start: 0, end: 2 },
  { pid: "P1", start: 2, end: 6 },
  { pid: "CONTEXT_SWITCH", type: "CONTEXT_SWITCH", start: 6, end: 7 },
  { pid: "P2", start: 7, end: 10 },
];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("GanttChart", () => {
  it("renders process, idle, and context-switch segments with a time axis", () => {
    render(<GanttChart gantt={gantt} />);

    expect(
      screen.getByRole("img", { name: "Idle: 0 to 2 (2 time units)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "P1: 2 to 6 (4 time units)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Context switch: 6 to 7 (1 time unit)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "P2: 7 to 10 (3 time units)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Context switch")).toBeInTheDocument();
    expect(screen.getByText("Time units · total 10")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("shows segment details on hover and keyboard focus", () => {
    render(<GanttChart gantt={gantt} />);
    const segment = screen.getByRole("img", {
      name: "P1: 2 to 6 (4 time units)",
    });

    fireEvent.mouseEnter(segment);
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "P1 · 2–6 · 4 time units",
    );
    fireEvent.mouseLeave(segment);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.focus(segment);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.blur(segment);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("replays, steps, pauses, and changes speed", () => {
    vi.useFakeTimers();
    render(<GanttChart gantt={gantt} />);

    expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Replay Gantt chart" }));
    expect(screen.getByText("Step 0 of 4")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: /P1: 2 to 6/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Step Gantt playback" }),
    );
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Idle: 0 to 2/ }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Playback speed" }), {
      target: { value: "2" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Play Gantt playback" }),
    );
    act(() => vi.advanceTimersByTime(350));
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Pause Gantt playback" }),
    );
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Play Gantt playback" }),
    );
    act(() => vi.advanceTimersByTime(700));
    expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Play Gantt playback" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Play Gantt playback" }),
    );
    expect(screen.getByText("Step 0 of 4")).toBeInTheDocument();
  });

  it("resets playback when a new schedule arrives", () => {
    const { rerender } = render(<GanttChart gantt={gantt} />);
    fireEvent.click(screen.getByRole("button", { name: "Replay Gantt chart" }));
    const nextGantt = [{ pid: "P3", start: 0, end: 3 }];
    rerender(<GanttChart gantt={nextGantt} />);

    expect(screen.getByText("Step 1 of 1")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "P3: 0 to 3 (3 time units)" }),
    ).toBeInTheDocument();
  });

  it("supports a compact chart without playback and an empty state", () => {
    const { rerender } = render(
      <GanttChart gantt={gantt} showPlayback={false} />,
    );
    expect(
      screen.queryByRole("button", { name: "Play Gantt playback" }),
    ).not.toBeInTheDocument();

    rerender(<GanttChart gantt={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Run a schedule to see its Gantt chart.",
    );
  });
});
