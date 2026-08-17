// The grouped, collapsible task list.
//
// Rendering is string-based for speed — there are ~1300 tier rows — so every
// interpolated value goes through escapeHtml(). Custom task names come from
// user input and end up in this markup, so that matters.

import { EXPANSIONS, REWARD_CURRENCY } from '../data/expansions.js';
import { state, ownedTasks, allTasks } from '../lib/state.js';
import { groupTasks, matchesQuery, tally, statusFor, STATUS_LABELS, COMPLETE } from '../lib/progress.js';

// Category keys the player has collapsed, so re-renders don't reopen them.
const collapsed = new Set();

/** @param {string} key `${expansionId}::${categoryName}` */
export function setCollapsed(key, isCollapsed) {
  if (isCollapsed) collapsed.add(key);
  else collapsed.delete(key);
}

export function setAllCollapsed(isCollapsed) {
  collapsed.clear();
  if (!isCollapsed) return;
  document
    .querySelectorAll('details.category')
    .forEach((d) => collapsed.add(d.dataset.catKey));
}

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);

function formatReward(reward, expansionId) {
  if (reward == null) return '';
  if (typeof reward !== 'number') return escapeHtml(reward);
  const currency = REWARD_CURRENCY[expansionId] ?? '';
  return escapeHtml(currency ? `${reward} ${currency}` : String(reward));
}

function tierRow(task, expansionId) {
  const done = state.doneMap[task.id] ?? 0;
  const status = statusFor(done, task.total);
  const checked = status === COMPLETE ? 'checked' : '';
  return `<tr data-task-id="${escapeHtml(task.id)}" data-total="${task.total}">
    <td class="check-cell"><input type="checkbox" class="done-check" data-id="${escapeHtml(task.id)}" ${checked} title="Mark complete"></td>
    <td class="req-cell"><span class="tier-tag">${escapeHtml(task.tier)}</span>${escapeHtml(task.requirement)}</td>
    <td class="reward-cell">${formatReward(task.reward, expansionId)}</td>
    <td><input class="done-input" type="number" min="0" max="${task.total}" value="${done}" data-id="${escapeHtml(task.id)}"></td>
    <td class="total-label">of ${task.total}</td>
    <td><span class="status-pill status-${status}">${STATUS_LABELS[status]}</span></td>
  </tr>`;
}

function categoryBlock(expansion, categoryName, taskGroups, query) {
  const flat = Object.values(taskGroups).flat();
  if (query && !flat.some((t) => matchesQuery(t, query))) return '';

  const { total, completed } = tally(flat, state.doneMap);
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;
  // Searching auto-expands so matches aren't hidden inside collapsed sections.
  const key = `${expansion.id}::${categoryName}`;
  const open = query || !collapsed.has(key) ? 'open' : '';

  const body = Object.entries(taskGroups)
    .map(([taskName, tiers]) => {
      if (query && !tiers.some((t) => matchesQuery(t, query))) return '';
      const rows = tiers.map((t) => tierRow(t, expansion.id)).join('');
      return `<div class="task-name">${escapeHtml(taskName)}</div><table class="tiers">${rows}</table>`;
    })
    .join('');

  return `<details class="category" ${open} data-cat-key="${escapeHtml(expansion.id)}::${escapeHtml(categoryName)}">
    <summary>
      <span class="cat-check" role="checkbox" aria-checked="${allDone}" tabindex="0" data-cat-key="${escapeHtml(key)}" title="Mark whole category complete"></span>
      <i class="chev">&#9656;</i>
      <span class="cat-name">${escapeHtml(categoryName)}</span>
      <span class="progress-track cat-progress"><span class="progress-fill" style="width:${pct}%;display:block;height:100%"></span></span>
      <span class="cat-fraction">${completed}/${total}</span>
    </summary>
    <div class="task-block">${body}</div>
  </details>`;
}

function customForm(expansion) {
  return `<p class="empty-note">No ${escapeHtml(expansion.label)} tasks added yet &mdash; add your own from the in-game Dreamlight Duties menu.</p>
  <form class="custom-form" data-exp="${escapeHtml(expansion.id)}">
    <input name="category" placeholder="Category, e.g. Honey Collection" required>
    <input name="task" placeholder="Task name, e.g. Collect Honeycomb" required>
    <input name="tier" placeholder="Tier" value="Tier 1">
    <input name="requirement" placeholder="Requirement text" required>
    <input name="total" type="number" min="1" placeholder="Total required" required>
    <button type="submit">Add task</button>
  </form>`;
}

export function renderTaskList() {
  const container = document.getElementById('taskContainer');
  const query = document.getElementById('search').value.trim().toLowerCase();
  const tasks = ownedTasks();
  const grouped = groupTasks(tasks);

  const html = EXPANSIONS.filter((exp) => state.owned.has(exp.id))
    .map((exp) => {
      const expTasks = tasks.filter((t) => t.expansion === exp.id);
      if (query && expTasks.length > 0 && !expTasks.some((t) => matchesQuery(t, query))) return '';

      const { total, completed } = tally(expTasks, state.doneMap);
      const categories = grouped[exp.id] ?? {};

      const body = Object.keys(categories)
        .sort()
        .map((name) => categoryBlock(exp, name, categories[name], query))
        .join('');

      return `<div class="exp-section" style="--exp-color:${exp.color}">
        <div class="exp-header"><h2>${escapeHtml(exp.label)}</h2><span class="exp-count">${completed} / ${total} tiers complete</span></div>
        ${body}
        ${expTasks.length === 0 ? customForm(exp) : ''}
      </div>`;
    })
    .join('');

  container.innerHTML = html;
}

/**
 * Patch the category header for one row in place, so typing a count doesn't
 * force a full re-render of 1300 rows.
 */
export function refreshCategoryFor(inputEl) {
  const details = inputEl.closest('details.category');
  if (!details) return;
  const [expId, catName] = details.dataset.catKey.split('::');
  const catTasks = allTasks().filter((t) => t.expansion === expId && t.category === catName);
  const { total, completed } = tally(catTasks, state.doneMap);
  const pct = total ? Math.round((completed / total) * 100) : 0;
  details.querySelector('.cat-fraction').textContent = `${completed}/${total}`;
  details.querySelector('.progress-fill').style.width = `${pct}%`;
  details.querySelector('.cat-check').setAttribute('aria-checked', String(total > 0 && completed === total));
}
