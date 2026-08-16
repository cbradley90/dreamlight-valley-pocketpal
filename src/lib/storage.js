// Persistence layer.
//
// The original single-file version ran inside a Claude artifact and used
// `window.storage`, which does not exist on a normal website. This module is
// the drop-in replacement: same async shape, backed by localStorage, so a
// future swap to a server-backed store only means editing this file.

const STORAGE_KEY = 'dlv-tracker-progress';
const SCHEMA_VERSION = 1;

function isAvailable() {
  try {
    const probe = '__dlv_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    // Private browsing, disabled storage, or a sandboxed iframe.
    return false;
  }
}

export const storageAvailable = isAvailable();

/**
 * @returns {Promise<{owned: string[], done: Record<string, number>, custom: object[]} | null>}
 */
export async function load() {
  if (!storageAvailable) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return normalise(JSON.parse(raw));
  } catch {
    console.warn('Saved progress was unreadable; starting from defaults.');
    return null;
  }
}

export async function save(state) {
  if (!storageAvailable) throw new Error('storage unavailable');
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: SCHEMA_VERSION, ...state }),
  );
}

export async function clear() {
  if (!storageAvailable) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// Accepts both the current shape and any older/partial payload.
function normalise(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  return {
    owned: Array.isArray(parsed.owned) ? parsed.owned : null,
    done: parsed.done && typeof parsed.done === 'object' ? parsed.done : null,
    custom: Array.isArray(parsed.custom) ? parsed.custom : null,
  };
}

/** Download the current state as a JSON file. */
export function exportToFile(state) {
  const payload = JSON.stringify({ version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), ...state }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dreamlight-pocketpal-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** @returns {Promise<object|null>} parsed save, or null if the file was invalid. */
export async function importFromFile(file) {
  const text = await file.text();
  try {
    return normalise(JSON.parse(text));
  } catch {
    return null;
  }
}
