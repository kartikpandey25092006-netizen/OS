import React, { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ProcessTable } from "../../src/components/ProcessTable.jsx";
import { DEFAULT_PROCESSES } from "../../src/components/processInputs.js";

function Example() {
  const [processes, setProcesses] = useState(DEFAULT_PROCESSES);
  return <ProcessTable processes={processes} onChange={setProcesses} />;
}

afterEach(cleanup);

describe("ProcessTable", () => {
  it("adds, edits, and removes rows with a reusable PID", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: /add process/i }));
    expect(screen.getByLabelText("PID for row 4")).toHaveValue("P4");
    fireEvent.change(screen.getByLabelText("Burst for row 4"), {
      target: { value: "7" },
    });
    expect(screen.getByLabelText("Burst for row 4")).toHaveValue(7);
    await user.click(screen.getByRole("button", { name: /remove row 4/i }));
    expect(screen.queryByLabelText("PID for row 4")).not.toBeInTheDocument();
  });

  it("shows field and row validation for invalid edits", () => {
    render(<Example />);
    fireEvent.change(screen.getByLabelText("Burst for row 1"), {
      target: { value: "0" },
    });
    expect(screen.getByLabelText("Burst for row 1")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByText(/row 1: burst must be a positive integer/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export csv/i })).toBeDisabled();
  });

  it("loads a preset and generates the selected number of rows", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.selectOptions(
      screen.getByLabelText(/demo scenario/i),
      "round-robin",
    );
    await user.click(screen.getByRole("button", { name: "Load" }));
    expect(screen.getByLabelText("Burst for row 1")).toHaveValue(5);
    fireEvent.change(screen.getByLabelText(/random rows/i), {
      target: { value: "4" },
    });
    await user.click(screen.getByRole("button", { name: "Generate" }));
    expect(screen.getByLabelText("PID for row 4")).toHaveValue("P4");
  });

  it("rejects an invalid CSV upload and preserves the current table", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const file = new File(["pid,arrival,burst,priority\nP1,0,0,1"], "bad.csv", {
      type: "text/csv",
    });
    Object.defineProperty(file, "text", {
      value: async () => "pid,arrival,burst,priority\nP1,0,0,1",
    });
    await user.upload(screen.getByLabelText("CSV file"), file);
    await waitFor(() =>
      expect(screen.getByText(/positive integer/i)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("PID for row 3")).toHaveValue("P3");
  });

  it("replaces the table after a valid CSV upload", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const file = new File(["pid,arrival,burst,priority\nA,1,3,2"], "good.csv", {
      type: "text/csv",
    });
    Object.defineProperty(file, "text", {
      value: async () => "pid,arrival,burst,priority\nA,1,3,2",
    });
    await user.upload(screen.getByLabelText("CSV file"), file);
    await waitFor(() =>
      expect(screen.getByLabelText("PID for row 1")).toHaveValue("A"),
    );
    expect(screen.getByLabelText("Arrival for row 1")).toHaveValue(1);
    expect(screen.queryByLabelText("PID for row 2")).not.toBeInTheDocument();
  });
});
