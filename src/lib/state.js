// Single source of truth for player progress, plus debounced autosave.

import RAW_TASKS from '../data/tasks.json';
import { EXPANSIONS } from '../data/expansions.js';
import * as storage from './storage.js';

const SAVE_DEBOUNCE_MS = 400;

const defaultOwned = () =>
  new Set(EXPANSIONS.filter((e) => e.defaultOwned).map((e) => e.id));

export const state = {
  /** @type {Set<string>} expansion ids the player owns */
  owned: defaultOwned(),
  /** @type {Record<string, number>} task id -> units completed */
  doneMap: {},
  /** @type {object[]} tasks the player added by hand */
  customTasks: [],
};

/** Base game tasks plus anything the player added. */
export function allTasks() {
  return RAW_TASKS.concat(state.customTasks);
}

/** Only the tasks belonging to expansions the player owns. */
export function ownedTasks() {
  return allTasks().filter((t) => state.owned.has(t.expansion));
}

export async function loadState() {
  const saved = await storage.load();
  if (saved) applySave(saved);
  seedMissingCounts();
}

function applySave(saved) {
  if (saved.owned) state.owned = new Set(saved.owned);
  if (saved.done) state.doneMap = saved.done;
  if (saved.custom) state.customTasks = saved.custom;
}

/** Tasks absent from the save fall back to the shipped starting values. */
function seedMissingCounts() {
  for (const t of allTasks()) {
    if (!(t.id in state.doneMap)) state.doneMap[t.id] = t.done ?? 0;
  }
}

export function resetState() {
  state.doneMap = {};
  state.customTasks = [];
  state.owned = defaultOwned();
  seedMissingCounts();
}

export function replaceState(saved) {
  state.owned = defaultOwned();
  state.doneMap = {};
  state.customTasks = [];
  applySave(saved);
  seedMissingCounts();
}

export function snapshot() {
  return {
    owned: [...state.owned],
    done: state.doneMap,
    custom: state.customTasks,
  };
}

let saveTimer = null;
let onStatus = () => {};

/** Register a callback for save status text: 'saving' | 'saved' | 'error'. */
export function onSaveStatus(fn) {
  onStatus = fn;
}

export function persist() {
  onStatus('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await storage.save(snapshot());
      onStatus('saved');
    } catch {
      onStatus('error');
    }
  }, SAVE_DEBOUNCE_MS);
}

export function addCustomTask({ expansion, category, task, tier, requirement, total }) {
  const id = `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const entry = {
    id,
    expansion,
    category: category.trim(),
    task: task.trim(),
    tier: tier.trim() || 'Tier 1',
    requirement: requirement.trim(),
    reward: null,
    total: Number(total) || 1,
    done: 0,
  };
  state.customTasks.push(entry);
  state.doneMap[id] = 0;
  return entry;
}
