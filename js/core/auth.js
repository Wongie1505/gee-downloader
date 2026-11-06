// Earth Engine sign-in. No DOM in here. Uses the global ee from index.html.

import { CLIENT_ID } from '../config.js';

const PROJECT_KEY = 'gd_project_id';
const HELP_KEY = 'gd_help_seen';
const SESSION_KEY = 'gd_session';

// Google tokens last about an hour, so treat them as old a little before that
const TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const REFRESH_AFTER_MS = 50 * 60 * 1000;

// Cloud project IDs: 6 to 30 characters, lowercase letters, digits, dashes
const PROJECT_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

let signedInAt = 0;
let activeProject = '';

export function isValidProjectId(value) {
  return PROJECT_PATTERN.test(value);
}

// ---- Small storage helpers, the browser may block storage ----

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

// ---- Session kept for this tab only (sessionStorage) ----
// It survives a refresh and a hard refresh, and it is gone when the tab or
// browser closes. The token is Earth Engine scope only and lasts about an hour.

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch (error) {
    return null;
  }
}

function saveSession() {
  const header = ee.data.getAuthToken();

  if (!header) {
    return;
  }

  const session = {
    token: String(header).replace(/^Bearer\s+/i, ''),
    savedAt: Date.now(),
    projectId: activeProject
  };

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    // Without storage the user simply logs in again after a refresh
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    // Nothing to clear
  }
}

function startSession(projectId, startedAt = Date.now()) {
  activeProject = projectId;
  signedInAt = startedAt;
}

// ---- Sign in, restore, refresh, sign out ----

export function signIn(projectId) {
  return authenticate()
    .then(() => initialize(projectId))
    .then(() => {
      startSession(projectId);
      saveSession();
    });
}

// Without a popup it only works if Google can sign the user in silently
function authenticate({ allowPopup = true } = {}) {
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
      () => {
        if (allowPopup) {
          ee.data.authenticateViaPopup(resolve, reject);
        } else {
          reject(new Error('Silent sign-in failed.'));
        }
      }
    );
  });
}

function initialize(projectId) {
  return new Promise((resolve, reject) => {
    ee.initialize(null, null, resolve, reject, null, projectId);
  });
}

// Hand a saved token back to the library without opening Google
function useStoredToken(session) {
  const ageSeconds = Math.floor((Date.now() - session.savedAt) / 1000);
  const secondsLeft = Math.max(60, Math.floor(TOKEN_LIFETIME_MS / 1000) - ageSeconds);

  ee.data.setAuthToken(CLIENT_ID, 'Bearer', session.token, secondsLeft, [], () => {}, false);
}

// Called once at page load. Returns the project ID, or null if the user
// has to log in. It never throws and never opens a popup.
export async function restoreSession() {
  const saved = readSession();

  if (!saved || !saved.token || !saved.projectId || typeof ee === 'undefined') {
    return null;
  }

  try {
    const stillFresh = Date.now() - saved.savedAt < REFRESH_AFTER_MS;

    if (stillFresh) {
      useStoredToken(saved);
      await initialize(saved.projectId);
      startSession(saved.projectId, saved.savedAt);
    } else {
      // Old token: ask Google for a new one without a popup
      await authenticate({ allowPopup: false });
      await initialize(saved.projectId);
      startSession(saved.projectId);
      saveSession();
    }

    return saved.projectId;
  } catch (error) {
    clearSession();

    return null;
  }
}

export function isStale() {
  return signedInAt > 0 && Date.now() - signedInAt > REFRESH_AFTER_MS;
}

// Silent refresh. If Google needs the user to click, this fails and the
// caller shows the login dialog.
export function refreshToken() {
  return authenticate({ allowPopup: false }).then(() => {
    signedInAt = Date.now();
    saveSession();
  });
}

export function signOut() {
  if (typeof ee !== 'undefined') {
    ee.data.clearAuthToken();
  }

  clearSession();
  signedInAt = 0;
  activeProject = '';
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