// The login dialog, the header login state, and session expiry.

import { getState, setState, on } from '../../state.js';
import {
  signIn,
  signOut,
  isStale,
  refreshToken,
  isValidProjectId,
  savedProjectId,
  saveProjectId,
  helpSeen,
  markHelpSeen,
  friendlyError
} from '../../core/auth.js';

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

  // The router asks for this when a signed-out user opens the app
  on('auth:required', () => openSignIn());
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

function handleLogout() {
  signOut();
  setState({ user: null });
  window.location.hash = '#home';

  // A fresh page is the cleanest reset for the Earth Engine library
  hooks.reload();
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

  document.body.dataset.auth = user ? 'in' : 'out';
  document.getElementById('user-pill').textContent = user ? user.projectId : '';
  document.getElementById('user-pill').hidden = !user;
  document.getElementById('logout').hidden = !user;
  document.querySelector('.nav-login').textContent = user ? 'Open app' : 'Log in';
}
