// Watches one export until it finishes. No DOM in here.

const POLL_MS = 4000;
const MAX_ERRORS = 5;
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

// Calls onUpdate with each new status. Returns a function that stops watching.
export function watchOperation(name, onUpdate, pollMs = POLL_MS) {
  let stopped = false;
  let errors = 0;
  let timer = null;

  function schedule() {
    timer = setTimeout(check, pollMs);
  }

  function check() {
    if (stopped) {
      return;
    }

    ee.data.getOperation(name, (operation, error) => {
      if (stopped) {
        return;
      }

      if (error) {
        errors += 1;

        if (errors >= MAX_ERRORS) {
          // The export may still finish, we just cannot see it any more
          onUpdate({
            state: 'UNKNOWN',
            error: 'Could not check progress. The export may still finish, so look in your Drive.'
          });
          return;
        }

        schedule();
        return;
      }

      errors = 0;

      const update = summarize(operation);

      onUpdate(update);

      if (!isFinished(update.state)) {
        schedule();
      }
    });
  }

  check();

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}