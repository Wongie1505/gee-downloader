// Runs one download from start to finish. Talks to state, never to the page.

import { getState, setState, emit } from '../state.js';
import { getDataset } from '../data/catalog.js';
import { buildTableRequest, buildImageRequest, RequestError } from './export-build.js';
import { postExport, SessionError, NetworkError } from './export-run.js';
import { watchOperation } from './task-monitor.js';
import { isStale, refreshToken, friendlyError } from './auth.js';

const ACTIVE = ['STARTING', 'PENDING', 'RUNNING'];

// Each output is its own Earth Engine job
const KINDS = {
  csv: { label: 'Table (CSV)', build: buildTableRequest },
  geotiff: { label: 'Map file (GeoTIFF)', build: buildImageRequest }
};

// Tests shorten these so they do not wait seconds per check
export const timing = { pollMs: undefined, retryDelays: [1500, 4000] };

let counter = 0;

export function isActive(task) {
  return ACTIVE.includes(task.state);
}

function updateTask(key, patch) {
  const tasks = getState().tasks.map((task) => (task.key === key ? { ...task, ...patch } : task));

  setState({ tasks });
}

// Add a task so the interface can show it straight away
function addTask(batch, kind, state, dataset) {
  counter += 1;

  const task = {
    key: `task-${Date.now()}-${counter}`,
    batch,
    kind,
    kindLabel: KINDS[kind].label,
    name: state.folderName,
    datasetLabel: dataset.label,
    state: 'STARTING',
    progress: 0,
    error: null,
    driveUrl: null,
    operationName: null
  };

  setState({ tasks: [...getState().tasks, task] });

  return task;
}

// A dropped connection is retried twice before giving up. Every try sends the
// same body, so the same requestId makes Earth Engine ignore a duplicate.
async function postWithRetry(url, body) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await postExport(url, body);
    } catch (error) {
      const delay = timing.retryDelays[attempt];

      if (!(error instanceof NetworkError) || delay === undefined) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

function plainMessage(error) {
  if (error instanceof NetworkError || error instanceof RequestError) {
    return error.message;
  }

  return friendlyError(error);
}

// One output: build the request, send it, then watch it
async function runTask(task, state, dataset) {
  try {
    const request = KINDS[task.kind].build({
      dataset,
      area: state.area,
      range: state.range,
      timeStep: state.timeStep,
      folderName: state.folderName,
      projectId: state.user.projectId
    });

    const operation = await postWithRetry(request.url, request.body);

    updateTask(task.key, { operationName: operation.name, state: 'PENDING' });
    watchOperation(operation.name, (update) => updateTask(task.key, update), timing.pollMs);
  } catch (error) {
    if (error instanceof SessionError) {
      updateTask(task.key, {
        state: 'FAILED',
        error: 'Your session expired. Log in again and press Download, your choices are kept.'
      });
      emit('session:expired');
      return;
    }

    // Help debugging: the browser console shows the full error
    console.error(`Export failed to start (${task.kind})`, error);
    updateTask(task.key, { state: 'FAILED', error: plainMessage(error) });
  }
}

export async function startDownload() {
  const state = getState();
  const dataset = getDataset(state.datasetId);

  // Demo mode has no login. Never build a request for it, whatever the caller does.
  if (!state.user || state.user.demo) {
    return;
  }

  // One download at a time keeps the status simple
  if (state.tasks.some(isActive)) {
    return;
  }

  // Only outputs the engine can really make for this dataset
  const kinds = dataset
    ? state.outputs.filter((kind) => KINDS[kind] && dataset.exports && dataset.exports[kind])
    : [];

  if (kinds.length === 0) {
    return;
  }

  const batch = `batch-${Date.now()}`;
  const tasks = kinds.map((kind) => addTask(batch, kind, state, dataset));

  // A token close to expiry would fail halfway, so refresh it first
  if (isStale()) {
    try {
      await refreshToken();
    } catch (error) {
      tasks.forEach((task) => {
        updateTask(task.key, {
          state: 'FAILED',
          error: 'Your session expired. Log in again and press Download, your choices are kept.'
        });
      });
      emit('session:expired');
      return;
    }
  }

  // The outputs run side by side on Earth Engine
  await Promise.all(tasks.map((task) => runTask(task, state, dataset)));
}