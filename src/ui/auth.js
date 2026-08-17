// Sign in / sign up / sign out panel. Renders nothing (and stays hidden) when
// Supabase isn't configured, so a plain localStorage-only deploy is
// unaffected.

import { authAvailable, signUp, signIn, signOut, onAuthChange } from '../lib/auth.js';

let busy = false;

function panel() {
  return document.getElementById('authPanel');
}

function fieldValues(root) {
  return {
    email: root.querySelector('#authEmail').value.trim(),
    password: root.querySelector('#authPassword').value,
  };
}

async function withBusy(onError, fn) {
  if (busy) return;
  busy = true;
  panel().querySelectorAll('button').forEach((b) => { b.disabled = true; });
  try {
    await fn();
  } catch (err) {
    onError(err.message || 'Something went wrong.');
  } finally {
    busy = false;
  }
}

function renderSignedOut(message = '') {
  const root = panel();
  root.innerHTML = `
    <form id="authForm" class="auth-form">
      <input type="email" id="authEmail" placeholder="Email" required autocomplete="email">
      <input type="password" id="authPassword" placeholder="Password (6+ characters)" required minlength="6" autocomplete="current-password">
      <button type="submit" class="ghost">Sign in</button>
      <button type="button" class="ghost" id="authSignUpBtn">Create account</button>
    </form>
    <div class="auth-message" id="authMessage"></div>
  `;
  root.querySelector('#authMessage').textContent = message;

  root.querySelector('#authForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const { email, password } = fieldValues(root);
    withBusy((msg) => renderSignedOut(msg), () => signIn(email, password));
  });

  root.querySelector('#authSignUpBtn').addEventListener('click', () => {
    const { email, password } = fieldValues(root);
    withBusy((msg) => renderSignedOut(msg), async () => {
      const data = await signUp(email, password);
      if (!data.session) {
        renderSignedOut('Check your email to confirm your account, then sign in.');
      }
    });
  });
}

function renderSignedIn(user, message = '') {
  const root = panel();
  root.innerHTML = `
    <div class="auth-status">
      <span>Signed in as <strong id="authEmailLabel"></strong> &mdash; progress syncs to your account.</span>
      <button type="button" class="ghost" id="authSignOutBtn">Sign out</button>
    </div>
    <div class="auth-message" id="authMessage"></div>
  `;
  root.querySelector('#authEmailLabel').textContent = user.email;
  root.querySelector('#authMessage').textContent = message;

  root.querySelector('#authSignOutBtn').addEventListener('click', () => {
    withBusy((msg) => renderSignedIn(user, msg), () => signOut());
  });
}

/**
 * @param {(session: object|null, isInitial: boolean) => void} onSessionChange
 *   Called on every sign-in/sign-out, including once on load with the
 *   restored session (if any). `isInitial` is true only for that first call.
 */
export function initAuthUI(onSessionChange) {
  if (!authAvailable()) {
    panel().hidden = true;
    return;
  }
  panel().hidden = false;

  let first = true;
  onAuthChange((session) => {
    if (session) renderSignedIn(session.user);
    else renderSignedOut();
    onSessionChange(session, first);
    first = false;
  });
}
