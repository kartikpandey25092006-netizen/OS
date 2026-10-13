import React, { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { SimulationControls } from "../../src/components/SimulationControls.jsx";
import {
  DEFAULT_CONTROLS,
  controlsToOptions,
} from "../../src/components/simulationOptions.js";

const processes = [
  { pid: "P1", arrival: 0, burst: 5, priority: 2 },
  { pid: "P2", arrival: 1, burst: 3, priority: 7 },
];

function Example() {
  const [controls, setControls] = useState(DEFAULT_CONTROLS);
  return <SimulationControls controls={controls} onChange={setControls} />;
}

afterEach(cleanup);

describe("SimulationControls", () => {
  it("uses automatic quantum and priority scale by default", () => {
    expect(controlsToOptions(DEFAULT_CONTROLS, processes)).toEqual({
      goal: "waiting",
      contextSwitchCost: 0,
      agingEnabled: false,
    });
  });

  it("converts enabled overrides into engine options", () => {
    const controls = {
      ...DEFAULT_CONTROLS,
      goal: "fairness",
      quantum: "4",
      contextSwitchCost: "2",
      agingEnabled: true,
      agingInterval: "5",
      priorityScaleMode: "manual",
      priorityMin: "1",
      priorityMax: "10",
    };
    expect(controlsToOptions(controls, processes)).toEqual({
      goal: "fairness",
      quantum: 4,
      contextSwitchCost: 2,
      agingEnabled: true,
      agingInterval: 5,
      priorityMin: 1,
      priorityMax: 10,
    });
  });

  it("rejects invalid quantum, switch cost, aging interval, and scale", () => {
    expect(() =>
      controlsToOptions({ ...DEFAULT_CONTROLS, quantum: "0" }, processes),
    ).toThrow(/quantum/i);
    expect(() =>
      controlsToOptions(
        { ...DEFAULT_CONTROLS, contextSwitchCost: "-1" },
        processes,
      ),
    ).toThrow(/context-switch cost/i);
    expect(() =>
      controlsToOptions(
        { ...DEFAULT_CONTROLS, agingEnabled: true, agingInterval: "0" },
        processes,
      ),
    ).toThrow(/aging interval/i);
    expect(() =>
      controlsToOptions(
        {
          ...DEFAULT_CONTROLS,
          priorityScaleMode: "manual",
          priorityMin: "3",
        },
        processes,
      ),
    ).toThrow(/include every process priority/i);
  });

  it("reveals aging and manual priority controls when selected", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.queryByLabelText("Aging interval")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Minimum priority")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("Enable priority aging"));
    await user.selectOptions(screen.getByLabelText("Priority scale"), "manual");
    expect(screen.getByLabelText("Aging interval")).toHaveValue(3);
    expect(screen.getByLabelText("Minimum priority")).toHaveValue(1);
    expect(
      screen.getByText(/lower number means higher priority/i),
    ).toBeVisible();
  });
});
