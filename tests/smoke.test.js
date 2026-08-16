// End-to-end smoke test against the *built* output in dist/.
//
// The unit tests cover the maths; this covers the thing that actually broke
// once already — the app loading, rendering, and saving in a real DOM. A build
// that renders an empty page still passes `vite build`, so something has to
// boot it and look.
//
// Requires `npm run build` first. CI runs build before this.

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '../dist');
const STORAGE_KEY = 'dlv-tracker-progress';

function bundlePath() {
  const assets = path.join(DIST, 'assets');
  const file = fs.readdirSync(assets).find((f) => f.endsWith('.js'));
  if (!file) throw new Error('No JS bundle found in dist/assets');
  return path.join(assets, file);
}

/** Boot the built app in jsdom, optionally with a pre-seeded save. */
async function boot(savedState) {
  const consoleErrors = [];
  const vc = new VirtualConsole();
  vc.on('error', (...args) => consoleErrors.push(args.join(' ')));

  const dom = new JSDOM(fs.readFileSync(path.join(DIST, 'index.html'), 'utf8'), {
    url: 'https://example.test/',
    runScripts: 'dangerously',
    virtualConsole: vc,
    pretendToBeVisual: true,
  });

  if (savedState) {
    dom.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
  }

  const script = dom.window.document.createElement('script');
  script.textContent = fs.readFileSync(bundlePath(), 'utf8');
  dom.window.document.body.appendChild(script);

  await new Promise((r) => setTimeout(r, 800));

  const doc = dom.window.document;
  return {
    dom,
    doc,
    consoleErrors,
    text: (id) => doc.getElementById(id)?.textContent,
    saved: () => JSON.parse(dom.window.localStorage.getItem(STORAGE_KEY) ?? 'null'),
  };
}

beforeAll(() => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    throw new Error('dist/ not found — run `npm run build` before the smoke test');
  }
});

describe('built app', () => {
  it('boots without console errors and renders every tier', async () => {
    const app = await boot();
    expect(app.consoleErrors).toEqual([]);
    expect(app.doc.querySelectorAll('tr[data-task-id]')).toHaveLength(1299);
    expect(app.doc.querySelectorAll('#chipsRow .chip')).toHaveLength(6);
  });

  it('starts a fresh visitor at zero', async () => {
    const app = await boot();
    expect(app.text('pctValue')).toBe('0.0%');
    expect(app.text('completeValue')).toBe('0 / 1299');
    expect(app.text('stageLabel')).toBe('Stage 0');
    expect(app.doc.getElementById('treeImg').getAttribute('src')).toBe('/tree/stage-0.jpg');
  });

  it('ships no personal progress in the bundle', async () => {
    const app = await boot();
    const started = [...app.doc.querySelectorAll('.status-pill')].filter(
      (p) => p.textContent !== 'Not started',
    );
    expect(started).toHaveLength(0);
  });

  it('restores a saved state and moves the tree', async () => {
    const fresh = await boot();
    const ids = [...fresh.doc.querySelectorAll('tr[data-task-id]')].map(
      (tr) => tr.dataset.taskId,
    );
    // Complete every task, so the tree must reach its final stage.
    const done = Object.fromEntries(
      [...fresh.doc.querySelectorAll('tr[data-task-id]')].map((tr) => [
        tr.dataset.taskId,
        Number(tr.dataset.total),
      ]),
    );

    const app = await boot({ version: 1, owned: null, done, custom: [] });
    expect(app.text('completeValue')).toBe(`${ids.length} / ${ids.length}`);
    expect(app.text('stageLabel')).toBe('Stage 5');
    expect(app.text('nextStageValue')).toBe('Max stage reached');
    expect(app.doc.getElementById('treeImg').getAttribute('src')).toBe('/tree/stage-5.jpg');
  });

  it('persists an edited count to localStorage', async () => {
    const app = await boot();
    const input = app.doc.querySelector('input.done-input');
    const row = input.closest('tr');
    input.value = String(row.dataset.total);
    input.dispatchEvent(new app.dom.window.Event('input', { bubbles: true }));

    await new Promise((r) => setTimeout(r, 700));

    expect(row.querySelector('.status-pill').textContent).toBe('Complete');
    expect(app.saved().done[input.dataset.id]).toBe(Number(row.dataset.total));
  });

  it('narrows the list when searching', async () => {
    const app = await boot();
    const search = app.doc.getElementById('search');
    const before = app.doc.querySelectorAll('tr[data-task-id]').length;

    search.value = 'fish';
    search.dispatchEvent(new app.dom.window.Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));

    const after = app.doc.querySelectorAll('tr[data-task-id]').length;
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
  });

  it('drops an expansion from the totals when toggled off', async () => {
    const app = await boot();
    const before = app.text('completeValue');

    const chip = app.doc.querySelector('#chipsRow input[data-exp="Eternity Isle"]');
    chip.checked = false;
    chip.dispatchEvent(new app.dom.window.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));

    expect(app.text('completeValue')).not.toBe(before);
    expect(app.text('expCountValue')).toBe('5 of 6');
  });
});
