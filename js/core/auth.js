// Earth Engine sign-in. No DOM in here. Uses the global ee from index.html.

import { CLIENT_ID } from '../config.js';

const PROJECT_KEY = 'gd_project_id';
const HELP_KEY = 'gd_help_seen';

// Google tokens last about an hour, so refresh a little before that
const REFRESH_AFTER_MS = 50 * 60 * 1000;

// Cloud project IDs: 6 to 30 characters, lowercase letters, digits, dashes
const PROJECT_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

let signedInAt = 0;

export function isValidProjectId(value) {
  return PROJECT_PATTERN.test(value);
}

// ---- Small localStorage helpers, storage can be blocked by the browser ----

function readStorage(key) {
  try {
    return localStorage.getItem(key) || '';
  } catch (error) {
    return '';
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // Not saving is fine, the user just retypes next time
  }
}

export function savedProjectId() {
  return readStorage(PROJECT_KEY);
}

export function saveProjectId(id) {
  writeStorage(PROJECT_KEY, id);
}

export function helpSeen() {
  return readStorage(HELP_KEY) === '1';
}

export function markHelpSeen() {
  writeStorage(HELP_KEY, '1');
}

// ---- Sign in, refresh, sign out ----

export function signIn(projectId) {
  return authenticate()
    .then(() => initialize(projectId))
    .then(() => {
      signedInAt = Date.now();
    });
}

function authenticate() {
  return new Promise((resolve, reject) => {
    if (typeof ee === 'undefined') {
      reject(new Error('The Earth Engine library did not load. Check your connection and reload.'));
      return;
    }

    if (CLIENT_ID.startsWith('PASTE')) {
      reject(new Error('Add your OAuth Client ID to js/config.js first.'));
      return;
    }

    ee.data.authenticateViaOauth(
      CLIENT_ID,
      resolve,
      reject,
      null,
      // Silent sign-in failed, so open the Google popup
      () => ee.data.authenticateViaPopup(resolve, reject)
    );
  });
}

function initialize(projectId) {
  return new Promise((resolve, reject) => {
    ee.initialize(null, null, resolve, reject, null, projectId);
  });
}

export function isStale() {
  return signedInAt > 0 && Date.now() - signedInAt > REFRESH_AFTER_MS;
}

export function refreshToken() {
  return new Promise((resolve, reject) => {
    ee.data.refreshAuthToken(
      () => {
        signedInAt = Date.now();
        resolve();
      },
      reject,
      // Needing the user to click again counts as a failure here
      reject
    );
  });
}

export function signOut() {
  if (typeof ee !== 'undefined') {
    ee.data.clearAuthToken();
  }

  signedInAt = 0;
}

// ---- Turn raw Google and Earth Engine errors into plain sentences ----

const FRIENDLY = [
  [/popup/i, 'The Google window was closed or blocked. Allow pop-ups for this site and try again.'],
  [/access_denied/i, 'Google denied access. Use a Google account that is on the tester list.'],
  [/origin_mismatch|redirect_uri/i, 'This site address is not authorised in the Google Cloud project.'],
  [/has not been used|is disabled|service_disabled/i, 'The Earth Engine API is not enabled for this project.'],
  [/not registered|sign(ed)? up|register/i, 'This project is not registered for Earth Engine yet. Use How do I get access.'],
  [/not found|404|invalid.*project/i, 'Google could not find that Project ID. Check the spelling.'],
  [/permission|serviceusage|403/i, 'Your account cannot use this project. Check the Project ID and your access.']
];

export function friendlyError(error) {
  const raw = String((error && error.message) || error || '');
  const match = FRIENDLY.find(([pattern]) => pattern.test(raw));

  if (match) {
    return match[1];
  }

  // Unknown problem: show the raw text so it can be reported
  return raw ? `Something went wrong: ${raw}` : 'Something went wrong. Try again.';
}
