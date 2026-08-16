// Pure helpers for turning raw counts into progress, status and tree stage.
// Nothing in here touches the DOM, which makes it the easy part to unit test.

import { STAGES } from '../data/expansions.js';

export const NOT_STARTED = 0;
export const IN_PROGRESS = 1;
export const COMPLETE = 2;

export const STATUS_LABELS = {
  [NOT_STARTED]: 'Not started',
  [IN_PROGRESS]: 'In progress',
  [COMPLETE]: 'Complete',
};

/** Coerce user input into a whole number within 0..total. */
export function clampDone(value, total) {
  let v = Number(value);
  if (Number.isNaN(v) || v < 0) v = 0;
  if (v > total) v = total;
  return Math.round(v);
}

export function statusFor(done, total) {
  if (total <= 0) return NOT_STARTED;
  if (done >= total) return COMPLETE;
  if (done > 0) return IN_PROGRESS;
  return NOT_STARTED;
}

/** @returns {{min: number, label: string}} */
export function computeStage(pct) {
  return STAGES.find((s) => pct >= s.min) ?? STAGES[STAGES.length - 1];
}

/** STAGES is ordered high-to-low, so index 0 is Stage 5. */
export function stageNumber(pct) {
  const stage = computeStage(pct);
  return 5 - STAGES.findIndex((s) => s.label === stage.label);
}

/** The next stage the player is working towards, or null at max. */
export function nextStage(pct) {
  return [...STAGES].reverse().find((s) => s.min > pct) ?? null;
}

/** Completed vs total across a flat list of tier rows. */
export function tally(tasks, doneMap) {
  let total = 0;
  let completed = 0;
  for (const t of tasks) {
    total += 1;
    if (statusFor(doneMap[t.id] ?? 0, t.total) === COMPLETE) completed += 1;
  }
  return { total, completed };
}

/** Nest a flat task list into expansion -> category -> task name -> tiers. */
export function groupTasks(tasks) {
  const byExp = {};
  for (const t of tasks) {
    const exp = (byExp[t.expansion] ??= {});
    const cat = (exp[t.category] ??= {});
    (cat[t.task] ??= []).push(t);
  }
  return byExp;
}

/** Case-insensitive match across the fields a player would search by. */
export function matchesQuery(task, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (task.task || '').toLowerCase().includes(q) ||
    (task.category || '').toLowerCase().includes(q) ||
    (task.requirement || '').toLowerCase().includes(q)
  );
}
