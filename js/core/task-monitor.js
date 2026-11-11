// Watches the exports of one download until they all finish. No DOM in here.

const POLL_MS = 4000;
const MAX_ERRORS = 5;

// Up to this many tasks are checked one by one. Above it, one list call
// answers for all of them, so 120 tasks do not mean 120 requests per check.
const SINGLE_LIMIT = 3;

// One page of the list holds 500 operations, the newest first
const LIST_LIMIT = 500;

// Tasks the list did not show are asked for by name, a few per check
const FALLBACK_MAX = 25;
const FINISHED = ['SUCCEEDED', 'FAILED', 'CANCELLED', 'UNKNOWN'];

export function isFinished(state) {
  return FINISHED.includes(state);
}

// Only trust links that really point to Google Drive
function pickDriveUrl(uris) {
  const found = (uris || []).find((uri) => String(uri).startsWith('https://drive.google.com/'));

  return found || null;
}

// Turn Earth Engine's operation into the few fields the app shows
export function summarize(operation) {
  const meta = operation.metadata || {};
  const state = meta.state || (operation.done ? 'SUCCEEDED' : 'RUNNING');
  const update = {
    state,
    progress: typeof meta.progress === 'number' ? meta.progress : 0
  };

  if (state === 'FAILED') {
    update.error = (operation.error && operation.error.message) || 'The export failed.';
  }

  if (state === 'SUCCEEDED') {
    update.progress = 1;
    update.driveUrl = pickDriveUrl(meta.destinationUris);
  }

  return update;
}

function getOne(name) {
  return new Promise((resolve) => {
    ee.data.getOperation(name, (operation, error) => resolve(error ? null : operation));
  });
}

function listAll() {
  return new Promise((resolve) => {
    ee.data.listOperations(LIST_LIMIT, (operations, error) => resolve(error ? null : operations));
  });
}

// Returns a Map of operation name to the operation Earth Engine reported
async function fetchOperations(watching) {
  const found = new Map();

  if (watching.length > SINGLE_LIMIT) {
    const listed = await listAll();

    (listed || []).forEach((operation) => found.set(operation.name, operation));
  }

  const missing = watching.filter((task) => !found.has(task.operationName)).slice(0, FALLBACK_MAX);
  const answers = await Promise.all(missing.map((task) => getOne(task.operationName)));

  answers.forEach((operation, i) => {
    if (operation) {
      found.set(missing[i].operationName, operation);
    }
  });

  return found;
}

// getTasks returns the current tasks of the download. onUpdates gets an object
// of task key to the few fields that changed. Returns a function that stops watching.
export function watchGroup(getTasks, onUpdates, pollMs = POLL_MS) {
  let stopped = false;
  let errors = 0;
  let timer = null;

  function schedule() {
    timer = setTimeout(check, pollMs);
  }

  async function check() {
    if (stopped) {
      return;
    }

    const tasks = getTasks();

    if (tasks.every((task) => isFinished(task.state))) {
      stopped = true;
      return;
    }

    // Tasks still being sent have no operation name yet
    const watching = tasks.filter((task) => task.operationName && !isFinished(task.state));

    if (watching.length === 0) {
      schedule();
      return;
    }

    const found = await fetchOperations(watching);

    if (stopped) {
      return;
    }

    if (found.size === 0) {
      errors += 1;

      if (errors >= MAX_ERRORS) {
        // The exports may still finish, we just cannot see them any more
        const lost = { state: 'UNKNOWN', error: 'Could not check progress. The export may still finish, so look in your Drive.' };
        const updates = {};

        watching.forEach((task) => {
          updates[task.key] = lost;
        });
        onUpdates(updates);
        stopped = true;
        return;
      }

      schedule();
      return;
    }

    errors = 0;

    const updates = {};

    watching.forEach((task) => {
      if (found.has(task.operationName)) {
        updates[task.key] = summarize(found.get(task.operationName));
      }
    });
    onUpdates(updates);
    schedule();
  }

  check();

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}