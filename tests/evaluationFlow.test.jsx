import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { App } from "../src/App.jsx";

beforeAll(() => {
  const original = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function () {
      if (this.classList.contains("recharts-responsive-container")) {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 800,
          bottom: 450,
          width: 800,
          height: 450,
          toJSON: () => ({}),
        };
      }
      return original.call(this);
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(cleanup);
afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("evaluation workflow", () => {
  it("evaluates 50 generated workloads and applies tuned settings to the simulator", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Evaluation" }));
    expect(
      await screen.findByRole(
        "heading",
        { name: "Test and tune the selector" },
        { timeout: 10000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Generated workloads")).toHaveValue(50);
    await user.selectOptions(
      screen.getByLabelText("Evaluation goal"),
      "fairness",
    );
    await user.click(screen.getByRole("button", { name: "Run evaluation" }));
    const results = await screen.findByRole(
      "region",
      { name: "Evaluation results" },
      { timeout: 10000 },
    );
    expect(
      within(results).getByRole("heading", { name: "Tuning results" }),
    ).toBeInTheDocument();
    expect(
      within(results).getByText(/50 generated workloads/i),
    ).toBeInTheDocument();
    expect(
      within(results).getByRole("table", { name: /confusion matrix/i }),
    ).toBeInTheDocument();
    expect(
      within(results).getByRole("heading", { name: "Failure cases" }),
    ).toBeInTheDocument();
    await user.click(
      within(results).getByRole("button", { name: "Apply tuned thresholds" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      /tuned rules are active/i,
    );
    expect(screen.getByLabelText("Optimization goal")).toHaveValue("fairness");
    expect(screen.getByLabelText("Enable priority aging")).toBeChecked();
    expect(screen.getByLabelText("Aging interval")).toHaveValue(null);
    expect(
      screen.getByRole("button", { name: "Run simulation" }),
    ).toBeEnabled();
    await user.selectOptions(
      screen.getByLabelText("Demo scenario"),
      "priority",
    );
    await user.click(screen.getByRole("button", { name: "Load" }));
    await user.click(screen.getByRole("button", { name: "Run simulation" }));
    const simulation = await screen.findByRole("region", {
      name: "Scheduling results",
    });
    expect(
      within(simulation).getByRole("heading", { name: "Round Robin" }),
    ).toBeInTheDocument();
  });
});
