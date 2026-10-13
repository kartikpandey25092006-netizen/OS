import { describe, expect, it } from 'vitest';
import { validateProcesses } from '../../src/engine/validate.js';

const validProcess = { pid: 'P1', arrival: 0, burst: 5, priority: 1 };

describe('validateProcesses', () => {
  it('accepts a valid non-empty workload', () => {
    expect(validateProcesses([validProcess])).toEqual({ valid: true, errors: [] });
  });

  it('rejects empty workloads', () => {
    expect(validateProcesses([]).errors).toContain('Enter at least one process.');
  });

  it('rejects duplicate PIDs and invalid numeric fields', () => {
    const result = validateProcesses([
      validProcess,
      { pid: 'P1', arrival: -1, burst: 0, priority: 1.5 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Row 2: PID "P1" must be unique.');
    expect(result.errors).toContain('Row 2: arrival must be a non-negative integer.');
    expect(result.errors).toContain('Row 2: burst must be a positive integer.');
    expect(result.errors).toContain('Row 2: priority must be an integer.');
  });

  it('reserves Gantt segment PIDs for idle and context-switch time', () => {
    for (const pid of ['IDLE', 'CONTEXT_SWITCH']) {
      const result = validateProcesses([{ ...validProcess, pid }]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain(`PID "${pid}" is reserved`);
    }
  });
});
