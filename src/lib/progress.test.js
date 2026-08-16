import { describe, it, expect } from 'vitest';
import {
  clampDone, statusFor, computeStage, stageNumber, nextStage,
  tally, groupTasks, matchesQuery,
  NOT_STARTED, IN_PROGRESS, COMPLETE,
} from './progress.js';

describe('clampDone', () => {
  it('rounds and bounds input to 0..total', () => {
    expect(clampDone('7', 20)).toBe(7);
    expect(clampDone(-3, 20)).toBe(0);
    expect(clampDone(99, 20)).toBe(20);
    expect(clampDone(4.6, 20)).toBe(5);
  });

  it('treats junk input as zero', () => {
    expect(clampDone('', 20)).toBe(0);
    expect(clampDone('abc', 20)).toBe(0);
  });
});

describe('statusFor', () => {
  it('classifies the three states', () => {
    expect(statusFor(0, 20)).toBe(NOT_STARTED);
    expect(statusFor(1, 20)).toBe(IN_PROGRESS);
    expect(statusFor(20, 20)).toBe(COMPLETE);
  });

  it('never reports complete for a zero-total task', () => {
    expect(statusFor(0, 0)).toBe(NOT_STARTED);
  });
});

describe('stage maths', () => {
  it('maps completion to the right stage', () => {
    expect(computeStage(0).label).toBe('Stage 0');
    expect(computeStage(0.1).label).toBe('Stage 1');
    expect(computeStage(0.55).label).toBe('Stage 3');
    expect(computeStage(1).label).toBe('Stage 5');
  });

  it('converts stage to a 0-5 image index', () => {
    expect(stageNumber(0)).toBe(0);
    expect(stageNumber(0.95)).toBe(5);
  });

  it('reports the next threshold, and null at max', () => {
    expect(nextStage(0).min).toBe(0.1);
    expect(nextStage(0.95)).toBeNull();
  });
});

describe('tally', () => {
  const doneMap = { a: 5, b: 10, c: 0 };
  const tasks = [
    { id: 'a', total: 10 },
    { id: 'b', total: 10 },
    { id: 'c', total: 10 },
  ];

  it('counts only fully complete tiers', () => {
    expect(tally(tasks, doneMap)).toEqual({ total: 3, completed: 1 });
  });

  it('treats an unseen id as zero', () => {
    expect(tally([{ id: 'zzz', total: 5 }], doneMap)).toEqual({ total: 1, completed: 0 });
  });
});

describe('groupTasks', () => {
  it('nests expansion -> category -> task name', () => {
    const grouped = groupTasks([
      { expansion: 'E', category: 'C', task: 'T', id: '1' },
      { expansion: 'E', category: 'C', task: 'T', id: '2' },
    ]);
    expect(grouped.E.C.T).toHaveLength(2);
  });
});

describe('matchesQuery', () => {
  const task = { task: 'Catch Fish', category: 'Fishing', requirement: 'Catch 20 Fish' };

  it('matches case-insensitively across fields', () => {
    expect(matchesQuery(task, 'fish')).toBe(true);
    expect(matchesQuery(task, 'FISHING')).toBe(true);
    expect(matchesQuery(task, 'mine')).toBe(false);
  });

  it('matches everything on an empty query', () => {
    expect(matchesQuery(task, '')).toBe(true);
  });
});
