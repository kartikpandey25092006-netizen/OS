import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App.jsx";

describe("application shell", () => {
  it("renders the simulator title and priority convention", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", {
        name: /adaptive cpu scheduling simulator/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/lower number means higher priority/i),
    ).toBeInTheDocument();
  });
});
