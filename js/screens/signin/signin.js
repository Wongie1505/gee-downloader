// The login dialog, the header login state, and session expiry.

import { getState, setState, on } from '../../state.js';
import {
  signIn,
  signOut,
  isStale,
  refreshToken,
  restoreSession,
  isValidProjectId,
  savedProjectId,
  saveProjectId,
  helpSeen,
  markHelpSeen,
  friendlyError
} from '../../core/auth.js';
import { startDemo, endDemo, demoWasActive } from '../../core/demo.js';

const CHECK_EVERY_MS = 60 * 1000;

// Tests replace this so they do not reload the page
export const hooks = { reload: () => window.location.reload() };

let dialog = null;
let input = null;
let submit = null;
let errorEl = null;

export function initSignIn() {
  dialog = document.getElementById('signin-dialog');
  input = document.getElementById('project-id');
  submit = document.getElementById('signin-submit');
  errorEl = document.getElementById('signin-error');

  dialog.addEventListener('click', onDialogClick);
  submit.addEventListener('click', handleSubmit);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  });

  document.getElementById('logout').addEventListener('click', handleLogout);

  document.getElementById('demo-btn').addEventListener('click', handleDemo);

  // The router asks for this when a signed-out user opens the app
  on('auth:required', () => openSignIn());
  on('session:expired', () => expire());
  on('change', renderHeader);

  renderHeader();
  setInterval(checkSession, CHECK_EVERY_MS);
}

// ---- Dialog ----

function openDialog() {
  if (dialog.open) {
    return;
  }

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

function closeDialog() {
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
}

function openSignIn(message = '') {
  input.value = savedProjectId();
  showError(message);
  setBusy(false);

  // First visit goes to the access guide, later visits go straight to login
  const firstVisit = !helpSeen();

  showView(firstVisit ? 'help' : 'login');
  openDialog();

  if (!firstVisit) {
    input.focus();
  }
}

function showView(name) {
  dialog.querySelectorAll('[data-view]').forEach((section) => {
    section.hidden = section.dataset.view !== name;
  });

  if (name === 'help') {
    markHelpSeen();
  }
}

function onDialogClick(event) {
  const switcher = event.target.closest('[data-show]');

  if (switcher) {
    showView(switcher.dataset.show);
    return;
  }

  // Clicking the dim area outside the box lands on the dialog itself
  if (event.target.closest('[data-close]') || event.target === dialog) {
    closeDialog();
  }
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

function setBusy(busy) {
  submit.disabled = busy;
  input.disabled = busy;
  submit.textContent = busy ? 'Waiting for Google' : 'Sign in with Google';
}

// ---- Sign in and out ----

async function handleSubmit() {
  const projectId = input.value.trim().toLowerCase();

  if (!isValidProjectId(projectId)) {
    showError('Enter your Earth Engine Project ID: lowercase letters, numbers and dashes, like my-project-123.');
    return;
  }

  showError('');
  setBusy(true);

  try {
    await signIn(projectId);

    saveProjectId(projectId);
    setState({ user: { projectId }, projectId });
    closeDialog();
    window.location.hash = '#app';
  } catch (error) {
    showError(friendlyError(error));
    setBusy(false);
  }
}

// View the app flow without logging in. No Google, no Earth Engine, no downloads.
function handleDemo() {
  startDemo();
  setState({ user: { projectId: 'demo', demo: true } });
  window.location.hash = '#app';
}

function handleLogout() {
  endDemo();
  signOut();
  setState({ user: null });
  window.location.hash = '#home';

  // A fresh page is the cleanest reset for the Earth Engine library
  hooks.reload();
}

// ---- Restore a login from this tab after a refresh ----

export async function tryRestoreSession() {
  // Demo mode comes back after a refresh
  if (demoWasActive()) {
    setState({ user: { projectId: 'demo', demo: true } });
    return;
  }

  const projectId = await restoreSession();

  if (projectId) {
    setState({ user: { projectId }, projectId });
  }
}

// ---- Session expiry ----

// Exported so tests can call it without waiting a minute
export async function checkSession() {
  if (!getState().user || !isStale()) {
    return;
  }

  try {
    await refreshToken();
  } catch (error) {
    expire();
  }
}

// Keep the wizard choices, only the login is lost
function expire() {
  setState({ user: null });
  window.location.hash = '#home';
  openSignIn('Your session expired. Log in again to carry on.');
}

// ---- Header ----

function renderHeader() {
  const user = getState().user;
  const pill = document.getElementById('user-pill');

  document.body.dataset.auth = user ? 'in' : 'out';
  pill.textContent = user ? user.projectId : '';
  pill.hidden = !user;
  pill.classList.toggle('demo', Boolean(user && user.demo));
  document.getElementById('logout').hidden = !user;
  document.getElementById('login-link').textContent = user ? 'Open app' : 'Log in';
  document.getElementById('demo-btn').hidden = Boolean(user);
}