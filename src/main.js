// Entry point: wires the DOM to state and the render functions.

import './styles.css';
import {
  loadState, persist, resetState, replaceState, snapshot,
  onSaveStatus, state, addCustomTask,
} from './lib/state.js';
import * as storage from './lib/storage.js';
import { clampDone, statusFor, STATUS_LABELS } from './lib/progress.js';
import { renderChips } from './ui/chips.js';
import { renderTaskList, refreshCategoryFor, setCollapsed, setAllCollapsed } from './ui/taskList.js';
import { updateStats } from './ui/stats.js';
import { initAuthUI } from './ui/auth.js';

const SAVE_MESSAGES = {
  saving: 'Saving...',
  saved: 'Saved to this browser',
  error: 'Could not save (storage unavailable)',
};

function renderAll() {
  renderChips(() => {
    updateStats();
    renderTaskList();
    persist();
  });
  renderTaskList();
  updateStats();
}

function bindEvents() {
  const container = document.getElementById('taskContainer');

  // Delegated: one listener covers every count input, however many re-renders.
  container.addEventListener('input', (e) => {
    if (!e.target.classList.contains('done-input')) return;
    const row = e.target.closest('tr');
    const total = Number(row.dataset.total);
    const value = clampDone(e.target.value, total);
    e.target.value = value;
    state.doneMap[e.target.dataset.id] = value;

    const status = statusFor(value, total);
    const pill = row.querySelector('.status-pill');
    pill.className = `status-pill status-${status}`;
    pill.textContent = STATUS_LABELS[status];

    refreshCategoryFor(e.target);
    updateStats();
    persist();
  });

  // Delegated: the add-task form only exists for empty expansions.
  container.addEventListener('submit', (e) => {
    const form = e.target.closest('.custom-form');
    if (!form) return;
    e.preventDefault();
    addCustomTask({
      expansion: form.dataset.exp,
      category: form.category.value,
      task: form.task.value,
      tier: form.tier.value,
      requirement: form.requirement.value,
      total: form.total.value,
    });
    renderTaskList();
    updateStats();
    persist();
  });

  // <details> doesn't bubble 'toggle', so capture it.
  container.addEventListener(
    'toggle',
    (e) => {
      const details = e.target.closest('details.category');
      if (details) setCollapsed(details.dataset.catKey, !details.open);
    },
    true,
  );

  document.getElementById('search').addEventListener('input', renderTaskList);

  document.getElementById('expandAll').addEventListener('click', () => {
    setAllCollapsed(false);
    document.querySelectorAll('details.category').forEach((d) => { d.open = true; });
  });

  document.getElementById('collapseAll').addEventListener('click', () => {
    document.querySelectorAll('details.category').forEach((d) => { d.open = false; });
    setAllCollapsed(true);
  });

  document.getElementById('exportSave').addEventListener('click', () => {
    storage.exportToFile(snapshot());
  });

  const fileInput = document.getElementById('importFile');
  document.getElementById('importSave').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const saved = await storage.importFromFile(file);
    fileInput.value = '';
    if (!saved) {
      alert("That file doesn't look like a PocketPal save.");
      return;
    }
    if (!confirm('Replace your current progress with this save file?')) return;
    replaceState(saved);
    renderAll();
    persist();
  });

  document.getElementById('resetProgress').addEventListener('click', () => {
    const ok = confirm(
      'Reset all task counts in this browser back to zero? This cannot be undone — export your save first if you want a backup.',
    );
    if (!ok) return;
    resetState();
    renderAll();
    persist();
  });
}

// `loadState()` at boot already resolves the right backend (cloud, if a
// session was restored from a previous visit; local otherwise). This only
// needs to react to sign-in/sign-out happening live, during this visit.
async function handleAuthChange(session) {
  if (!session) {
    await loadState();
    renderAll();
    return;
  }

  const cloud = await storage.load();
  if (cloud) {
    replaceState(cloud);
  } else {
    const local = storage.peekLocalSave();
    const importLocal =
      local && confirm('Import your saved progress on this device into your account?');
    if (importLocal) {
      replaceState(local);
    } else {
      resetState();
    }
    persist();
  }
  renderAll();
}

async function init() {
  onSaveStatus((status) => {
    document.getElementById('saveText').textContent = SAVE_MESSAGES[status];
  });

  if (!storage.storageAvailable) {
    document.getElementById('saveText').textContent =
      'Storage unavailable — progress will not be saved';
  }

  await loadState();
  renderAll();
  bindEvents();

  initAuthUI((session, isInitial) => {
    if (isInitial) return;
    handleAuthChange(session);
  });
}

init();
