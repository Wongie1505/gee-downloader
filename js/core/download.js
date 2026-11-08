// Runs one download from start to finish. Talks to state, never to the page.

import { getState, setState, emit } from '../state.js';
import { getDataset } from '../data/catalog.js';
import { buildTableRequest } from './export-build.js';
import { postExport, SessionError } from './export-run.js';
import { watchOperation } from './task-monitor.js';
import { isStale, refreshToken, friendlyError } from './auth.js';

const ACTIVE = ['STARTING', 'PENDING', 'RUNNING'];

// Tests shorten this so they do not wait four seconds per check
export const timing = { pollMs: undefined };

let counter = 0;

export function isActive(task) {
  return ACTIVE.includes(task.state);
}

function updateTask(key, patch) {
  const tasks = getState().tasks.map((task) => (task.key === key ? { ...task, ...patch } : task));

  setState({ tasks });
}

// Add a task so the interface can show it straight away
function addTask(state, dataset) {
  counter += 1;

  const task = {
    key: `task-${Date.now()}-${counter}`,
    name: state.folderName,
    datasetLabel: dataset.label,
    state: 'STARTING',
    progress: 0,
    error: null,
    driveUrl: null,
    operationName: null
  };

  setState({ tasks: [...state.tasks, task] });

  return task;
}

export async function startDownload() {
  const state = getState();
  const dataset = getDataset(state.datasetId);

  // Demo mode has no login. Never build a request for it, whatever the caller does.
  if (!state.user || state.user.demo) {
    return;
  }

  // One export at a time keeps the status simple
  if (state.tasks.some(isActive)) {
    return;
  }

  if (!dataset || !dataset.downloadReady || !state.outputs.includes('csv')) {
    return;
  }

  const task = addTask(state, dataset);

  try {
    // A token close to expiry would fail halfway, so refresh it first
    if (isStale()) {
      await refreshToken().catch(() => {
        throw new SessionError('Your session expired.');
      });
    }

    const request = buildTableRequest({
      dataset,
      area: state.area,
      range: state.range,
      timeStep: state.timeStep,
      folderName: state.folderName,
      projectId: state.user.projectId
    });

    const operation = await postExport(request.url, request.body);

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
    console.error('Export failed to start', error);
    updateTask(task.key, { state: 'FAILED', error: friendlyError(error) });
  }
}