import React, { useRef, useState } from "react";
import { validateProcesses } from "../engine/validate.js";
import {
  copyPreset,
  generateRandomProcesses,
  nextProcessId,
  parseProcessCsv,
  PRESET_SCENARIOS,
  toProcessCsv,
} from "./processInputs.js";

const numberFields = ["arrival", "burst", "priority"];

function editedValue(field, value) {
  if (field === "pid" || value.trim() === "") return value;
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

function fieldHasError(errors, row, field) {
  return errors.some((error) => {
    if (!error.startsWith(`Row ${row}:`)) return false;
    if (field === "pid") return error.includes("PID");
    return error.includes(`${field} `);
  });
}

/** Controlled process editor. The parent owns rows and runs the engine after validation. */
export function ProcessTable({ processes, onChange }) {
  const [fileError, setFileError] = useState("");
  const [generatorCount, setGeneratorCount] = useState(5);
  const [scenario, setScenario] = useState("");
  const uploadRef = useRef(null);
  const validation = validateProcesses(processes);

  const edit = (index, field, value) => {
    onChange(
      processes.map((process, row) =>
        row === index
          ? { ...process, [field]: editedValue(field, value) }
          : process,
      ),
    );
  };

  const add = () => {
    onChange([
      ...processes,
      { pid: nextProcessId(processes), arrival: 0, burst: 5, priority: 1 },
    ]);
  };

  const remove = (index) => {
    onChange(processes.filter((_, row) => row !== index));
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = parseProcessCsv(await file.text());
      onChange(imported);
      setFileError("");
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Could not read CSV file.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const download = () => {
    if (!validation.valid) return;
    const blob = new Blob([toProcessCsv(processes)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cpu-processes.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const generate = () => {
    try {
      onChange(generateRandomProcesses(Number(generatorCount)));
      setFileError("");
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : "Could not generate processes.",
      );
    }
  };

  const loadScenario = () => {
    if (!scenario) return;
    onChange(copyPreset(scenario));
    setFileError("");
  };

  return (
    <section
      aria-labelledby="process-table-title"
      className="min-w-0 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="process-table-title"
            className="text-lg font-semibold tracking-tight"
          >
            Processes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set each arrival, CPU burst, and priority. Lower priority numbers
            run first.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Add process
        </button>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="flex min-w-0 items-end gap-2">
          <label
            className="min-w-0 flex-1 text-xs font-medium text-muted-foreground"
            htmlFor="process-preset"
          >
            Demo scenario
            <select
              id="process-preset"
              value={scenario}
              onChange={(event) => setScenario(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Choose a scenario</option>
              {PRESET_SCENARIOS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={loadScenario}
            disabled={!scenario}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Load
          </button>
        </div>
        <div className="flex items-end gap-2">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="process-count"
          >
            Random rows
            <input
              id="process-count"
              type="number"
              min="1"
              max="50"
              step="1"
              value={generatorCount}
              onChange={(event) => setGeneratorCount(event.target.value)}
              className="mt-1 block w-20 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <button
            type="button"
            onClick={generate}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Generate
          </button>
        </div>
        <div className="flex items-end gap-2">
          <input
            ref={uploadRef}
            aria-label="CSV file"
            type="file"
            accept=".csv,text/csv"
            onChange={importFile}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!validation.valid}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[580px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Process inputs for CPU scheduling
          </caption>
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-3">
                PID
              </th>
              <th scope="col" className="px-3 py-3">
                Arrival
              </th>
              <th scope="col" className="px-3 py-3">
                Burst
              </th>
              <th scope="col" className="px-3 py-3">
                Priority
              </th>
              <th scope="col" className="px-3 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {processes.map((process, index) => (
              <tr key={index} className="hover:bg-muted/20">
                <td className="p-2">
                  <input
                    type="text"
                    aria-label={`PID for row ${index + 1}`}
                    aria-invalid={fieldHasError(
                      validation.errors,
                      index + 1,
                      "pid",
                    )}
                    value={process.pid}
                    onChange={(event) => edit(index, "pid", event.target.value)}
                    className="w-full min-w-20 rounded-md border border-input bg-background px-2 py-2 text-foreground aria-invalid:border-destructive"
                  />
                </td>
                {numberFields.map((field) => (
                  <td key={field} className="p-2">
                    <input
                      type="number"
                      min={
                        field === "burst"
                          ? 1
                          : field === "arrival"
                            ? 0
                            : undefined
                      }
                      step="1"
                      aria-label={`${field[0].toUpperCase() + field.slice(1)} for row ${index + 1}`}
                      aria-invalid={fieldHasError(
                        validation.errors,
                        index + 1,
                        field,
                      )}
                      value={process[field]}
                      onChange={(event) =>
                        edit(index, field, event.target.value)
                      }
                      className="w-full min-w-20 rounded-md border border-input bg-background px-2 py-2 text-foreground aria-invalid:border-destructive"
                    />
                  </td>
                ))}
                <td className="p-2 text-right">
                  <button
                    type="button"
                    aria-label={`Remove row ${index + 1}`}
                    onClick={() => remove(index)}
                    className="rounded-md px-2 py-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {fileError && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {fileError}
        </p>
      )}
      {!validation.valid && (
        <div
          role="alert"
          className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <strong>Fix process inputs before running:</strong>
          <ul className="mt-1 list-disc pl-5">
            {validation.errors.map((error, index) => (
              <li key={`${error}-${index}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
