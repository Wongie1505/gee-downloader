// Finds this app's exports in the user's Earth Engine project. Every export we
// send has a description that starts with gd_, so they can be told apart from
// anything the user started in the Code Editor. No DOM in here.

import { summarize } from './task-monitor.js';

const PREFIX = 'gd_';

// One page of the list holds 500 operations, the newest first
const LIST_LIMIT = 500;

// The end of a description says which output it is: _table, _map, _areas,
// _legend, or a period like _2023-01 for the separate map files
const ENDING = /_(table|map|areas|legend|\d{4}(?:-\d{2}){0,2})$/;

const ENDING_NAMES = {
  table: 'Table',
  map: 'Map file',
  areas: 'Area table',
  legend: 'Legend'
};

// Resolves to the list of our jobs, or rejects with an Error
export function loadJobs() {
  return new Promise((resolve, reject) => {
    ee.data.listOperations(LIST_LIMIT, (operations, error) => {
      if (error || !operations) {
        reject(new Error(String(error || 'Earth Engine did not answer.')));
        return;
      }

      resolve(operations.map(toJob).filter(Boolean));
    });
  });
}

// null for anything that is not ours
export function toJob(operation) {
  const meta = operation.metadata || {};
  const description = String(meta.description || '');

  if (!description.startsWith(PREFIX)) {
    return null;
  }

  const name = description.slice(PREFIX.length);
  const match = name.match(ENDING);
  const ending = match ? match[1] : '';

  return {
    id: operation.name,
    group: match ? name.slice(0, match.index) : name,
    label: ENDING_NAMES[ending] || ending || 'Export',
    createdAt: Date.parse(meta.createTime) || 0,
    ...summarize(operation)
  };
}

const RUNNING = ['PENDING', 'RUNNING', 'CANCELLING'];

// One group per download, newest first
export function groupJobs(jobs) {
  const groups = new Map();

  jobs.forEach((job) => {
    if (!groups.has(job.group)) {
      groups.set(job.group, { key: job.group, jobs: [], newest: 0 });
    }

    const group = groups.get(job.group);

    group.jobs.push(job);
    group.newest = Math.max(group.newest, job.createdAt);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      total: group.jobs.length,
      done: group.jobs.filter((job) => job.state === 'SUCCEEDED').length,
      failed: group.jobs.filter((job) => job.state === 'FAILED').length,
      running: group.jobs.filter((job) => RUNNING.includes(job.state)).length,
      jobs: group.jobs.sort(byFailedThenLabel)
    }))
    .sort((a, b) => b.newest - a.newest);
}

function byFailedThenLabel(a, b) {
  const failed = Number(b.state === 'FAILED') - Number(a.state === 'FAILED');

  return failed || a.label.localeCompare(b.label);
}