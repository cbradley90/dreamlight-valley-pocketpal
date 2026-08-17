// Thin wrapper around Supabase Auth. Email + password only — no magic links,
// no social providers, so there's no OAuth redirect config to get right.
//
// Every function here is a no-op / resolves to a signed-out state when
// Supabase isn't configured, so callers don't need their own guard around
// every call.

import { supabase, supabaseConfigured } from './supabaseClient.js';

export function authAvailable() {
  return supabaseConfigured;
}

/** @returns {Promise<object|null>} the current session, or null if signed out. */
export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** @returns {Promise<object>} `{ user, session }` — session is null if email confirmation is required. */
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** @param {(session: object|null) => void} fn */
export function onAuthChange(fn) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => fn(session));
  return () => data.subscription.unsubscribe();
}
