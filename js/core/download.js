// Runs one download from start to finish. Talks to state, never to the page.

import { getState, setState, emit } from '../state.js';
import { getDataset } from '../data/catalog.js';
import { buildTableRequest, buildImageRequest, buildPeriodRequest, buildLegendRequest, RequestError } from './export-build.js';
import { postExport, SessionError, NetworkError } from './export-run.js';
import { watchGroup } from './task-monitor.js';
import { buildAreaRequest } from './area-table.js';
import { periodsWithData } from './period-check.js';
import { periodSpec, periodLabels, MAX_FILES } from './periods.js';
import { driveFileName } from './naming.js';
import { isStale, refreshToken, friendlyError } from './auth.js';

const ACTIVE = ['STARTING', 'PENDING', 'RUNNING'];

const SESSION_TEXT = 'Your session expired. Log in again and press Download, your choices are kept.';

// Each output is its own Earth Engine job. "period" is one map of a date series.
const KINDS = {
  csv: { label: 'Table (CSV)', build: buildTableRequest },
  geotiff: { label: 'Map file (GeoTIFF)', build: buildImageRequest },
  period: { label: 'Map file (GeoTIFF)', build: buildPeriodRequest },
  legend: { label: 'Legend (CSV)', build: buildLegendRequest },
  areas: { label: 'Area table (CSV)', build: buildAreaRequest }
};

// Tests shorten these so they do not wait seconds per check
export const timing = { pollMs: undefined, retryDelays: [1500, 4000], poolSize: 5 };

let counter = 0;
let stopWatching = null;

export function isActive(task) {
  return ACTIVE.includes(task.state);
}

// Several tasks change at once, so the page only redraws once.
// changes is an object of task key to the fields to update.
function updateTasks(changes) {
  const tasks = getState().tasks.map((task) => (changes[task.key] ? { ...task, ...changes[task.key] } : task));

  setState({ tasks });
}

function makeTask(batch, kind, context, dataset, extra = {}) {
  counter += 1;

  return {
    key: `task-${Date.now()}-${counter}`,
    batch,
    kind,
    kindLabel: kind === 'check' ? 'Checking dates' : KINDS[kind].label,
    name: context.folderName,
    fileName: kind === 'check' ? null : driveFileName(kind, context.folderName, extra.label),
    datasetId: dataset.id,
    datasetLabel: dataset.label,
    state: 'STARTING',
    progress: 0,
    error: null,
    driveUrl: null,
    operationName: null,
    context,
    ...extra
  };
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

// One output: build the request and send it. The group watcher follows it from there.
// Returns 'expired' when Google says the login is over.
async function runTask(task, dataset) {
  const { context } = task;

  try {
    const request = KINDS[task.kind].build({
      dataset,
      area: context.area,
      range: context.range,
      timeStep: context.timeStep,
      folderName: context.folderName,
      projectId: context.projectId,
      period: task.period,
      extent: context.extent
    });

    const operation = await postWithRetry(request.url, request.body);

    updateTasks({ [task.key]: { operationName: operation.name, state: 'PENDING' } });
    return 'sent';
  } catch (error) {
    if (error instanceof SessionError) {
      updateTasks({ [task.key]: { state: 'FAILED', error: SESSION_TEXT } });
      return 'expired';
    }

    // Help debugging: the browser console shows the full error
    console.error(`Export failed to start (${task.fileName || task.kind})`, error);
    updateTasks({ [task.key]: { state: 'FAILED', error: plainMessage(error) } });
    return 'failed';
  }
}

// Sends the tasks a few at a time, so 100 maps do not hit Google in one burst.
// One failed task never stops the others.
async function runPool(tasks, dataset) {
  const queue = [...tasks];
  let expired = false;

  async function worker() {
    while (queue.length > 0) {
      const task = queue.shift();

      if (expired) {
        updateTasks({ [task.key]: { state: 'FAILED', error: SESSION_TEXT } });
        continue;
      }

      // Several workers can hit the expired login together, but it is announced once
      if ((await runTask(task, dataset)) === 'expired' && !expired) {
        expired = true;
        emit('session:expired');
      }
    }
  }

  const workers = Math.min(timing.poolSize, queue.length);

  await Promise.all(Array.from({ length: workers }, worker));
}

// One watcher per download, it stops itself when every task has ended
function startWatching(batch) {
  if (stopWatching) {
    stopWatching();
  }

  stopWatching = watchGroup(
    () => getState().tasks.filter((task) => task.batch === batch),
    updateTasks,
    timing.pollMs
  );
}

// A token close to expiry would fail halfway, so refresh it first
async function sessionIsFresh(tasks) {
  if (!isStale()) {
    return true;
  }

  try {
    await refreshToken();
    return true;
  } catch (error) {
    const changes = {};

    tasks.forEach((task) => {
      changes[task.key] = { state: 'FAILED', error: SESSION_TEXT };
    });
    updateTasks(changes);
    emit('session:expired');
    return false;
  }
}

// Finds the dates that have data, then turns each one into its own task
async function runPeriods(batch, context, dataset, checkTask) {
  let periods = [];

  try {
    const indexes = await periodsWithData(dataset, periodSpec(context.range, context.timeStep));
    const labels = periodLabels(context.range, context.timeStep);

    periods = indexes.map((index) => ({ index, label: labels[index] }));
  } catch (error) {
    console.error('Could not check which dates have data', error);
    updateTasks({ [checkTask.key]: { state: 'FAILED', error: plainMessage(error) } });
    return;
  }

  if (periods.length === 0) {
    updateTasks({ [checkTask.key]: { state: 'FAILED', error: 'Earth Engine has no data for these dates. Choose other years.' } });
    return;
  }

  // Swap the placeholder for the real tasks in one go
  const tasks = periods.map((period) => makeTask(batch, 'period', context, dataset, { label: period.label, period }));
  const rest = getState().tasks.filter((task) => task.key !== checkTask.key);

  setState({ tasks: [...rest, ...tasks] });
  await runPool(tasks, dataset);
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

  // Land cover maps always come with a legend, the user does not pick it
  if (kinds.includes('geotiff') && dataset.legend) {
    kinds.push('legend');
  }

  // For land cover the table is not a time series but the area of each class
  const jobs = kinds.map((kind) => (kind === 'csv' && dataset.legend ? 'areas' : kind));

  // Everything this download needs, kept with its tasks so a retry sends the same thing
  const context = {
    area: state.area,
    range: state.range,
    timeStep: state.timeStep,
    folderName: state.folderName,
    extent: state.extent,
    projectId: state.user.projectId
  };

  const mapsAsFiles = jobs.includes('geotiff') && Boolean(dataset.years) && state.layout === 'separate';

  const batch = `batch-${Date.now()}`;
  const plain = jobs
    .filter((kind) => !(mapsAsFiles && kind === 'geotiff'))
    .map((kind) => makeTask(batch, kind, context, dataset));

  // The placeholder shows "checking dates" until the real tasks replace it
  const checkTask = mapsAsFiles ? makeTask(batch, 'check', context, dataset) : null;

  setState({ tasks: [...state.tasks, ...plain, ...(checkTask ? [checkTask] : [])] });

  if (mapsAsFiles && periodSpec(context.range, context.timeStep).count > MAX_FILES) {
    updateTasks({
      [checkTask.key]: {
        state: 'FAILED',
        error: `Separate files are limited to ${MAX_FILES} per download. Choose monthly steps, fewer years, or the table.`
      }
    });
  }

  if (!(await sessionIsFresh([...plain, ...(checkTask ? [checkTask] : [])]))) {
    return;
  }

  startWatching(batch);

  const work = [runPool(plain, dataset)];

  if (checkTask && getState().tasks.find((task) => task.key === checkTask.key).state === 'STARTING') {
    work.push(runPeriods(batch, context, dataset, checkTask));
  }

  await Promise.all(work);
}

// Sends again only the files that failed, with the choices of the original download
export async function retryFailed() {
  const state = getState();
  const last = state.tasks[state.tasks.length - 1];

  if (!last || !state.user || state.user.demo || state.tasks.some(isActive)) {
    return;
  }

  const failed = state.tasks.filter((task) => task.batch === last.batch && task.state === 'FAILED' && task.kind !== 'check');

  if (failed.length === 0) {
    return;
  }

  const changes = {};

  failed.forEach((task) => {
    changes[task.key] = { state: 'STARTING', error: null, progress: 0, operationName: null, driveUrl: null };
  });
  updateTasks(changes);

  if (!(await sessionIsFresh(failed))) {
    return;
  }

  startWatching(last.batch);
  await runPool(failed, getDataset(failed[0].datasetId));
}