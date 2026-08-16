#!/usr/bin/env node
// Guards the invariants of src/data/tasks.json.
//
// The important one is id stability: ids are the keys in players' saved
// progress, so renumbering an existing task silently moves someone's count onto
// a different task. CI compares against the committed id manifest to catch it.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TASKS_PATH = join(root, 'src/data/tasks.json');
const MANIFEST_PATH = join(root, 'scripts/task-ids.json');

const REQUIRED_FIELDS = ['id', 'expansion', 'category', 'task', 'tier', 'requirement', 'total'];

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const tasks = JSON.parse(readFileSync(TASKS_PATH, 'utf8'));
if (!Array.isArray(tasks)) {
  console.error('tasks.json must be an array');
  process.exit(1);
}

// Expansion ids come from the app's own config, so the two can't drift.
const expansionsSrc = readFileSync(join(root, 'src/data/expansions.js'), 'utf8');
const validExpansions = new Set(
  [...expansionsSrc.matchAll(/^\s*\{\s*id:\s*'([^']+)'/gm)].map((m) => m[1]),
);
if (validExpansions.size === 0) fail('Could not parse any expansion ids from expansions.js');

// --- per-task checks ---------------------------------------------------------

const seen = new Map();

tasks.forEach((t, i) => {
  const where = `tasks[${i}]${t?.id ? ` (${t.id})` : ''}`;

  for (const field of REQUIRED_FIELDS) {
    if (t[field] === undefined || t[field] === null || t[field] === '') {
      fail(`${where}: missing required field "${field}"`);
    }
  }

  if (t.id !== undefined) {
    if (seen.has(t.id)) fail(`${where}: duplicate id, already used by tasks[${seen.get(t.id)}]`);
    else seen.set(t.id, i);
  }

  if (t.expansion && !validExpansions.has(t.expansion)) {
    fail(`${where}: unknown expansion "${t.expansion}"`);
  }

  if (typeof t.total !== 'number' || !Number.isInteger(t.total) || t.total < 1) {
    fail(`${where}: total must be a positive integer, got ${JSON.stringify(t.total)}`);
  }

  const done = t.done ?? 0;
  if (typeof done !== 'number' || !Number.isInteger(done) || done < 0) {
    fail(`${where}: done must be a non-negative integer, got ${JSON.stringify(t.done)}`);
  } else if (typeof t.total === 'number' && done > t.total) {
    fail(`${where}: done (${done}) exceeds total (${t.total})`);
  }

  if (t.reward !== null && t.reward !== undefined) {
    const ok = typeof t.reward === 'number' || typeof t.reward === 'string';
    if (!ok) fail(`${where}: reward must be a number, a string, or null`);
  }
});

// --- id stability ------------------------------------------------------------

const currentIds = tasks.map((t) => t.id).filter(Boolean);

if (process.argv.includes('--write-manifest')) {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(currentIds, null, 0)}\n`);
  console.log(`Wrote manifest with ${currentIds.length} ids.`);
} else if (existsSync(MANIFEST_PATH)) {
  const previous = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const currentSet = new Set(currentIds);
  const removed = previous.filter((id) => !currentSet.has(id));

  if (removed.length > 0) {
    fail(
      `${removed.length} task id(s) present in the manifest have disappeared from tasks.json: ` +
        `${removed.slice(0, 10).join(', ')}${removed.length > 10 ? ', ...' : ''}\n` +
        '    Removing or renumbering an id destroys saved progress for that task.\n' +
        '    If this is deliberate, run: npm run validate:data -- --write-manifest',
    );
  }

  const added = currentIds.filter((id) => !previous.includes(id));
  if (added.length > 0) {
    warn(`${added.length} new task id(s) added. Run with --write-manifest to record them.`);
  }
} else {
  warn('No id manifest found. Run: npm run validate:data -- --write-manifest');
}

// --- report ------------------------------------------------------------------

for (const w of warnings) console.warn(`warning: ${w}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s) in tasks.json:\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const byExpansion = {};
for (const t of tasks) byExpansion[t.expansion] = (byExpansion[t.expansion] ?? 0) + 1;

console.log(`tasks.json OK — ${tasks.length} tiers, ${seen.size} unique ids`);
for (const [exp, count] of Object.entries(byExpansion).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(5)}  ${exp}`);
}
