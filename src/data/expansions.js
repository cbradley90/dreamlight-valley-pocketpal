// Expansion packs. `locked: true` means it ships with the base game and can't
// be toggled off. `defaultOwned` decides the initial state on a fresh browser.
export const EXPANSIONS = [
  { id: 'Dreamlight Valley', label: 'Dreamlight Valley', color: 'var(--accent-gold)', locked: true,  defaultOwned: true },
  { id: 'Eternity Isle',     label: 'Eternity Isle',     color: 'var(--mist)',        locked: false, defaultOwned: true },
  { id: 'Story Book Vale',   label: 'Story Book Vale',   color: 'var(--storybook)',   locked: false, defaultOwned: true },
  { id: 'Wishblossom Ranch', label: 'Wishblossom Ranch', color: 'var(--ranch)',       locked: false, defaultOwned: true },
  { id: 'Honeyglow Woods',   label: 'Honeyglow Woods',   color: 'var(--honeyglow)',   locked: false, defaultOwned: true },
  { id: 'Special Events',    label: 'Seasonal events',   color: 'var(--festive)',     locked: false, defaultOwned: true },
];

export const EXP_MAP = Object.fromEntries(EXPANSIONS.map((e) => [e.id, e]));

// Currency suffix for numeric rewards, per expansion. Non-numeric rewards are
// item names and are printed as-is. Seasonal events have no single currency.
export const REWARD_CURRENCY = {
  'Dreamlight Valley': 'dreamlight',
  'Wishblossom Ranch': 'dreamlight',
  'Honeyglow Woods': 'dreamlight',
  'Eternity Isle': 'mist',
  'Story Book Vale': 'story magic',
  'Special Events': '',
};

// Tree growth stages, highest threshold first. `min` is a completion fraction.
export const STAGES = [
  { min: 0.9, label: 'Stage 5' },
  { min: 0.7, label: 'Stage 4' },
  { min: 0.5, label: 'Stage 3' },
  { min: 0.3, label: 'Stage 2' },
  { min: 0.1, label: 'Stage 1' },
  { min: 0.0, label: 'Stage 0' },
];

// Served from /public/tree — Vite copies these through to the build root.
export const TREE_IMAGES = [
  '/tree/stage-0.jpg',
  '/tree/stage-1.jpg',
  '/tree/stage-2.jpg',
  '/tree/stage-3.jpg',
  '/tree/stage-4.jpg',
  '/tree/stage-5.jpg',
];
