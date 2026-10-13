import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
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
  const getBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function () {
      if (this.classList.contains("recharts-responsive-container")) {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 800,
          bottom: 288,
          width: 800,
          height: 288,
          toJSON: () => ({}),
        };
      }
      return getBoundingClientRect.call(this);
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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function loadScenario(user, id) {
  await user.selectOptions(screen.getByLabelText("Demo scenario"), id);
  await user.click(screen.getByRole("button", { name: "Load" }));
}

async function run(user) {
  await user.click(screen.getByRole("button", { name: "Run simulation" }));
  return screen.findByRole("region", { name: "Scheduling results" });
}

describe("simulator workflow", () => {
  it("accepts manual process edits and runs the comparison", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.change(screen.getByLabelText("Burst for row 1"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Arrival for row 2"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Arrival for row 3"), {
      target: { value: "0" },
    });
    await user.click(screen.getByRole("button", { name: "Add process" }));
    fireEvent.change(screen.getByLabelText("Burst for row 4"), {
      target: { value: "1" },
    });

    const results = await run(user);
    expect(
      within(results).getByRole("heading", { name: "SJF" }),
    ).toBeInTheDocument();
    expect(
      within(results).getByText(
        /rule fired: high burst variation, batch arrivals/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Gantt timeline" }),
    ).toBeInTheDocument();
    expect(
      within(results).getByRole("heading", { name: "Compare algorithms" }),
    ).toBeInTheDocument();
    expect(
      within(results).getByRole("heading", { name: "Why this algorithm?" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["priority", "7", "Priority", /rule fired: priority spread/i],
    ["batch", "18", "SJF", /rule fired: high burst variation, batch arrivals/i],
    ["round-robin", "4", "Round Robin", /rule fired: low burst variation/i],
  ])(
    "runs the manually adjusted %s demo scenario",
    async (scenario, burst, algorithm, rule) => {
      const user = userEvent.setup();
      render(<App />);
      await loadScenario(user, scenario);
      fireEvent.change(screen.getByLabelText("Burst for row 1"), {
        target: { value: burst },
      });
      expect(screen.getByLabelText("Burst for row 1")).toHaveValue(
        Number(burst),
      );

      const results = await run(user);
      expect(
        within(results).getByRole("heading", { name: algorithm }),
      ).toBeInTheDocument();
      expect(within(results).getByText(rule)).toBeInTheDocument();
      expect(
        screen.getByRole("group", {
          name: /execution: \d+ of \d+ segments visible/i,
        }),
      ).toBeInTheDocument();
    },
  );

  it("blocks invalid input and clears stale results after a change", async () => {
    const user = userEvent.setup();
    render(<App />);
    await run(user);
    expect(
      screen.getByRole("region", { name: "Scheduling results" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Burst for row 1"), {
      target: { value: "0" },
    });
    expect(
      screen.getByRole("button", { name: "Run simulation" }),
    ).toBeDisabled();
    expect(
      screen.getByText(/row 1: burst must be a positive integer/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Scheduling results" }),
    ).not.toBeInTheDocument();
  });

  it("changes the adaptive decision when the optimization goal changes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loadScenario(user, "moderate");

    let results = await run(user);
    expect(
      within(results).getByRole("heading", { name: "SJF" }),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Optimization goal"),
      "response",
    );
    expect(
      screen.queryByRole("region", { name: "Scheduling results" }),
    ).not.toBeInTheDocument();
    results = await run(user);
    expect(
      within(results).getByRole("heading", { name: "Round Robin" }),
    ).toBeInTheDocument();
  });
});
