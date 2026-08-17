// Persistence layer.
//
// The original single-file version ran inside a Claude artifact and used
// `window.storage`, which does not exist on a normal website. This module is
// the drop-in replacement, and it's the only place that knows where progress
// actually lives:
//
//   - signed out, or Supabase not configured: localStorage on this device.
//   - signed in: the `progress` table in Supabase, one row per user, gated by
//     Row Level Security (see supabase/schema.sql).
//
// state.js still just calls load()/save()/clear() and doesn't care which of
// the two backed the call.

import { supabase } from './supabaseClient.js';

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

async function currentUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * @returns {Promise<{owned: string[], done: Record<string, number>, custom: object[]} | null>}
 */
export async function load() {
  const userId = await currentUserId();
  return userId ? loadCloud(userId) : loadLocal();
}

export async function save(state) {
  const userId = await currentUserId();
  return userId ? saveCloud(state, userId) : saveLocal(state);
}

export async function clear() {
  const userId = await currentUserId();
  return userId ? clearCloud(userId) : clearLocal();
}

/**
 * Peek at a locally-saved progress file regardless of sign-in state. Used to
 * offer importing a device's local save into a freshly-created account.
 */
export function peekLocalSave() {
  return loadLocal();
}

function loadLocal() {
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

async function saveLocal(state) {
  if (!storageAvailable) throw new Error('storage unavailable');
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: SCHEMA_VERSION, ...state }),
  );
}

async function clearLocal() {
  if (!storageAvailable) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

async function loadCloud(userId) {
  const { data, error } = await supabase
    .from('progress')
    .select('owned,done,custom')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('Could not load cloud progress:', error.message);
    return null;
  }
  return data ? normalise(data) : null;
}

async function saveCloud(state, userId) {
  const { error } = await supabase.from('progress').upsert({
    user_id: userId,
    owned: state.owned ?? [],
    done: state.done ?? {},
    custom: state.custom ?? [],
  });
  if (error) throw error;
}

async function clearCloud(userId) {
  const { error } = await supabase.from('progress').delete().eq('user_id', userId);
  if (error) throw error;
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
