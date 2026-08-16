// The hero panel: overall percentage, counts, and the tree image.

import { EXPANSIONS, TREE_IMAGES } from '../data/expansions.js';
import { state, ownedTasks } from '../lib/state.js';
import { computeStage, nextStage, stageNumber, statusFor, COMPLETE } from '../lib/progress.js';

function renderTree(stageIdx) {
  const img = document.getElementById('treeImg');
  const src = TREE_IMAGES[Math.max(0, Math.min(5, stageIdx))];
  if (img && src && !img.src.endsWith(src)) img.src = src;
}

/** Recalculate every headline figure. Returns per-expansion tallies. */
export function updateStats() {
  const tasks = ownedTasks();
  const perExp = {};
  let total = 0;
  let completed = 0;

  for (const t of tasks) {
    total += 1;
    const bucket = (perExp[t.expansion] ??= { total: 0, completed: 0 });
    bucket.total += 1;
    if (statusFor(state.doneMap[t.id] ?? 0, t.total) === COMPLETE) {
      completed += 1;
      bucket.completed += 1;
    }
  }

  const pct = total ? completed / total : 0;
  const stage = computeStage(pct);
  const next = nextStage(pct);

  document.getElementById('pctValue').textContent = `${(pct * 100).toFixed(1)}%`;
  document.getElementById('pctBar').style.width = `${(pct * 100).toFixed(1)}%`;
  document.getElementById('completeValue').textContent = `${completed} / ${total}`;
  document.getElementById('stageLabel').textContent = stage.label;
  document.getElementById('expCountValue').textContent = `${state.owned.size} of ${EXPANSIONS.length}`;
  document.getElementById('nextStageValue').textContent = next
    ? `${next.min * 100}% for ${next.label}`
    : 'Max stage reached';

  renderTree(stageNumber(pct));
  return perExp;
}
