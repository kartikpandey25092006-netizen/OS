import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExplanationPanel } from "../../src/components/results/ExplanationPanel.jsx";
import { selectAlgorithm } from "../../src/engine/selector.js";

const process = (pid, arrival, burst, priority = 1) => ({
  pid,
  arrival,
  burst,
  priority,
});

describe("ExplanationPanel", () => {
  it("shows the fired rule, explanation, and actual workload statistics", () => {
    const selection = selectAlgorithm(
      [process("P1", 0, 20, 1), process("P2", 0, 1, 1), process("P3", 0, 1, 3)],
      { priorityMin: 1, priorityMax: 5, verify: false },
    );
    render(<ExplanationPanel selection={selection} />);

    expect(
      screen.getByRole("heading", { name: "Why this algorithm?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Rule fired: Priority spread with SJF ties"),
    ).toBeInTheDocument();
    expect(screen.getByText(selection.explanation)).toBeInTheDocument();
    expect(
      screen.getByText(selection.stats.burstCV.toFixed(2)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(selection.stats.prioritySpreadRatio.toFixed(2)),
    ).toBeInTheDocument();
    expect(screen.getByText(/Priority scale: 1 to 5/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a competing algorithm's verification warning separately", () => {
    const selection = selectAlgorithm(
      [process("P1", 0, 10), process("P2", 0, 12), process("P3", 0, 11)],
      { quantum: 11, verificationMargin: 0.1 },
    );
    expect(selection.verificationWarning).not.toBeNull();
    render(<ExplanationPanel selection={selection} />);

    const warning = screen.getByRole("alert");
    expect(
      within(warning).getByText("Verification warning"),
    ).toBeInTheDocument();
    expect(
      within(warning).getByText(selection.verificationWarning.message),
    ).toBeInTheDocument();
    expect(screen.getByText(selection.explanation)).toBeInTheDocument();
    expect(
      screen.getByText(/Rule fired: Low burst variation/),
    ).toBeInTheDocument();
  });
});
