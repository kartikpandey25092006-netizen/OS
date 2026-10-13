import React from "react";
import { buildResultsCsv } from "./resultsCsv.js";

export function ResultsActions({ comparison }) {
  function downloadCsv() {
    const blob = new Blob([buildResultsCsv(comparison)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cpu-scheduling-results.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={downloadCsv}
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Export results CSV
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Print results
      </button>
    </div>
  );
}
