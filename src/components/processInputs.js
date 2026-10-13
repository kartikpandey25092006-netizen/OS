import { validateProcesses } from "../engine/validate.js";

const integerPattern = /^-?\d+$/;

export const PRESET_SCENARIOS = [
  {
    id: "priority",
    label: "Priority spread",
    description: "Distinct priorities show the priority rule.",
    processes: [
      { pid: "P1", arrival: 0, burst: 6, priority: 1 },
      { pid: "P2", arrival: 1, burst: 4, priority: 4 },
      { pid: "P3", arrival: 2, burst: 3, priority: 2 },
    ],
  },
  {
    id: "staggered",
    label: "Staggered high variance",
    description: "Uneven bursts and spaced arrivals favor SRTF.",
    processes: [
      { pid: "P1", arrival: 0, burst: 20, priority: 1 },
      { pid: "P2", arrival: 3, burst: 2, priority: 1 },
      { pid: "P3", arrival: 6, burst: 2, priority: 1 },
    ],
  },
  {
    id: "batch",
    label: "Batch high variance",
    description: "Uneven bursts arrive together and favor SJF.",
    processes: [
      { pid: "P1", arrival: 0, burst: 20, priority: 1 },
      { pid: "P2", arrival: 0, burst: 2, priority: 1 },
      { pid: "P3", arrival: 0, burst: 2, priority: 1 },
    ],
  },
  {
    id: "round-robin",
    label: "Similar bursts",
    description: "Similar bursts trigger Round Robin.",
    processes: [
      { pid: "P1", arrival: 0, burst: 5, priority: 1 },
      { pid: "P2", arrival: 0, burst: 6, priority: 1 },
      { pid: "P3", arrival: 0, burst: 5, priority: 1 },
    ],
  },
  {
    id: "moderate",
    label: "Moderate variation",
    description: "Moderate burst variation reaches the default rule.",
    processes: [
      { pid: "P1", arrival: 0, burst: 3, priority: 1 },
      { pid: "P2", arrival: 0, burst: 5, priority: 1 },
    ],
  },
];

export const DEFAULT_PROCESSES = PRESET_SCENARIOS[1].processes.map(
  (process) => ({
    ...process,
  }),
);

export function copyPreset(id) {
  const preset = PRESET_SCENARIOS.find((item) => item.id === id);
  if (!preset) throw new Error("Unknown preset scenario.");
  return preset.processes.map((process) => ({ ...process }));
}

export function nextProcessId(processes) {
  const used = new Set(processes.map(({ pid }) => pid));
  let number = 1;
  while (used.has(`P${number}`)) number += 1;
  return `P${number}`;
}

export function generateRandomProcesses(count = 5, random = Math.random) {
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    throw new Error("Process count must be an integer from 1 to 50.");
  }
  const draw = (maximum) => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new Error("Random source must return a number from 0 up to 1.");
    }
    return Math.floor(value * maximum);
  };
  return Array.from({ length: count }, (_, index) => ({
    pid: `P${index + 1}`,
    arrival: draw(11),
    burst: draw(20) + 1,
    priority: draw(5) + 1,
  }));
}

function readCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      if (field !== "" || closedQuote)
        throw new Error("Malformed CSV quotation.");
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
      closedQuote = false;
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
      closedQuote = false;
    } else {
      if (closedQuote && !/\s/.test(character)) {
        throw new Error("Malformed CSV quotation.");
      }
      if (!closedQuote) field += character;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quotation.");
  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

export function parseProcessCsv(text) {
  if (typeof text !== "string") throw new Error("CSV contents must be text.");
  const rows = readCsvRows(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2)
    throw new Error("CSV needs a header and at least one process.");

  const header = rows[0].map((value) => value.trim().toLowerCase());
  const required = ["pid", "arrival", "burst", "priority"];
  if (
    required.some(
      (name) => header.filter((column) => column === name).length !== 1,
    )
  ) {
    throw new Error(
      "CSV header must include pid, arrival, burst, and priority once each.",
    );
  }
  const column = Object.fromEntries(
    required.map((name) => [name, header.indexOf(name)]),
  );
  const processes = rows.slice(1).map((row, index) => {
    if (row.length !== header.length) {
      throw new Error(
        `CSV row ${index + 2} has ${row.length} columns; expected ${header.length}.`,
      );
    }
    const integer = (name) => {
      const value = row[column[name]].trim();
      if (!integerPattern.test(value)) {
        throw new Error(`CSV row ${index + 2}: ${name} must be an integer.`);
      }
      return Number(value);
    };
    return {
      pid: row[column.pid].trim(),
      arrival: integer("arrival"),
      burst: integer("burst"),
      priority: integer("priority"),
    };
  });
  const validation = validateProcesses(processes);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return processes;
}

export function toProcessCsv(processes) {
  const validation = validateProcesses(processes);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  const cell = (value) => `"${String(value).replaceAll('"', '""')}"`;
  return [
    "pid,arrival,burst,priority",
    ...processes.map((process) =>
      [process.pid, process.arrival, process.burst, process.priority]
        .map(cell)
        .join(","),
    ),
  ].join("\r\n");
}
