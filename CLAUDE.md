# Dreamlight Valley PocketPal

A static tracker for Disney Dreamlight Valley "Dreamlight Duties". The player
enters how many units of each task tier they've completed; the app rolls that up
into per-category, per-expansion and overall percentages, and grows a wishing
well tree image through six stages as completion rises.

## Commands

```bash
npm install
npm run dev            # Vite dev server on :5173
npm run build          # production build to dist/
npm run preview        # serve dist/ locally
npm test               # unit tests for src/lib/progress.js
npm run test:smoke     # boots dist/ in jsdom — needs a build first
npm run test:all       # unit -> build -> smoke, what CI does
npm run validate:data  # tasks.json invariants, including id stability
```

CI (`.github/workflows/ci.yml`) runs validate:data, unit tests, build, and the
smoke tests on every push and PR. `npm run test:all` reproduces it locally.

Two layers of test on purpose: `src/lib/progress.test.js` covers the maths in
isolation, `tests/smoke.test.js` boots the actual built bundle in jsdom. The
second exists because a build that renders nothing still passes `vite build` —
that's how the `window.storage` bug survived to deployment.

## Architecture

Vanilla ES modules, no framework, no router. Vite handles bundling only.

```
index.html          static shell; every element the JS touches has a stable id
src/main.js         entry point — wires DOM events to state + render functions
src/styles.css      all styling, CSS custom properties at :root
src/data/
  tasks.json        1299 task tiers, the source data (see "Task data" below)
  expansions.js     expansion metadata, stage thresholds, tree image paths
src/lib/
  progress.js       pure functions: clamping, status, stage maths, grouping
  state.js          single mutable `state` object + debounced autosave
  storage.js        localStorage read/write, export/import
src/ui/
  chips.js          expansion toggle row
  stats.js          hero panel figures + tree image
  taskList.js       the big grouped task list
public/tree/        stage-0.jpg .. stage-5.jpg
```

### Data flow

`state.doneMap` (task id → units completed) is the only thing that really
changes. A count input mutates it, patches its own row and category header in
place, then calls `updateStats()` and `persist()`. Full `renderTaskList()` runs
only when the set of visible tasks changes — search, expansion toggle, custom
task added, import, reset.

### Task data

`src/data/tasks.json` is a flat array. Every entry:

```json
{
  "expansion": "Dreamlight Valley",
  "category": "Foraging",
  "task": "Remove Small Night Thorns",
  "tier": "Tier 1",
  "requirement": "Remove 20 Small Night Thorns",
  "reward": 50,
  "total": 20,
  "done": 20,
  "id": "t0"
}
```

- `id` must be unique and stable — it's the key in saved progress. Never
  renumber existing ids; append new ones. `scripts/task-ids.json` is a committed
  manifest of every shipped id and `npm run validate:data` fails if one vanishes.
  Only re-record it (`npm run validate:data -- --write-manifest`) when a removal
  is genuinely intended.
- `done` is the *starting* value shipped with the app, used to seed a fresh
  browser. It should always be `0` — the app ships empty and every player starts
  from scratch. The live count lives in `state.doneMap`, not here.
  `validate:data` fails the build if any shipped `done` is non-zero.
- `reward` is a number (currency, suffix from `REWARD_CURRENCY`) or a string
  (an item name, printed as-is).
- `expansion` must match an `id` in `src/data/expansions.js`.

Honeyglow Woods and Wishblossom Ranch tier requirements were not fully
verifiable, so those expansions may be sparse; the UI offers an add-task form
for any expansion with no entries.

## Conventions

- **Escape everything interpolated into HTML.** `taskList.js` builds markup as
  strings for performance, and custom task names are user input. Use the
  `escapeHtml` helper — don't skip it because a value "looks safe".
- **Keep `progress.js` pure.** No DOM access. It's the unit-tested layer.
- **Storage changes go in `storage.js` only.** `state.js` calls `load`/`save`
  and doesn't care what's underneath. Swapping localStorage for a Netlify
  Function should mean editing one file.
- **Bump `SCHEMA_VERSION` in `storage.js`** if the saved shape changes, and
  handle the old shape in `normalise()`.
- Event handlers are delegated on `#taskContainer`, because the list re-renders
  wholesale. Don't attach listeners to individual rows.

## Deployment

Netlify, site `dreamlight-valley-pocketpal`. `netlify.toml` holds the build
command, publish dir, SPA redirect and cache headers. Pushing to `main` triggers
a deploy once the repo is linked.

## Gotchas

- The original version ran as a Claude artifact and used `window.storage`. That
  API does not exist on a real website — if you see it referenced anywhere, it's
  a leftover bug.
- `STAGES` in `expansions.js` is ordered highest threshold first. `stageNumber()`
  inverts the index to get 0–5 for the image array. Reordering the array breaks
  the tree.
- ~1300 rows render at once. Avoid per-row listeners or per-keystroke full
  re-renders.
