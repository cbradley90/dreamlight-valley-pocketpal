// Sign in / sign up / sign out form rendering, plus a helper to watch auth
// state. This module only knows how to draw the form/status into whatever
// container it's given and talk to Supabase Auth — main.js owns deciding
// which screen is visible and what to do on each transition (the gate).

import { signUp, signIn, signOut, onAuthChange } from '../lib/auth.js';

let busy = false;

function fieldValues(root) {
  return {
    email: root.querySelector('#authEmail').value.trim(),
    password: root.querySelector('#authPassword').value,
  };
}

async function withBusy(root, onError, fn) {
  if (busy) return;
  busy = true;
  root.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  try {
    await fn();
  } catch (err) {
    onError(err.message || 'Something went wrong.');
  } finally {
    busy = false;
  }
}

export function renderSignedOut(root, message = '') {
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
    withBusy(root, (msg) => renderSignedOut(root, msg), () => signIn(email, password));
  });

  root.querySelector('#authSignUpBtn').addEventListener('click', () => {
    const { email, password } = fieldValues(root);
    withBusy(root, (msg) => renderSignedOut(root, msg), async () => {
      const data = await signUp(email, password);
      if (!data.session) {
        renderSignedOut(root, 'Check your email to confirm your account, then sign in.');
      }
    });
  });
}

export function renderSignedIn(root, user, message = '') {
  root.innerHTML = `
    <div class="auth-status">
      <span>Signed in as <strong id="authEmailLabel"></strong></span>
      <button type="button" class="ghost" id="authSignOutBtn">Sign out</button>
    </div>
    <div class="auth-message" id="authMessage"></div>
  `;
  root.querySelector('#authEmailLabel').textContent = user.email;
  root.querySelector('#authMessage').textContent = message;

  root.querySelector('#authSignOutBtn').addEventListener('click', () => {
    withBusy(root, (msg) => renderSignedIn(root, user, msg), () => signOut());
  });
}

/**
 * @param {(session: object|null, isInitial: boolean) => void} onSessionChange
 *   Called on every sign-in/sign-out, including once on load with the
 *   restored session (if any). `isInitial` is true only for that first call.
 */
export function watchAuth(onSessionChange) {
  let first = true;
  onAuthChange((session) => {
    onSessionChange(session, first);
    first = false;
  });
}
