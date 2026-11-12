// The cards that show how an export is going. Phase 6 builds the full panel on this.

import { el } from './dom.js';

const ACTIVE = ['STARTING', 'PENDING', 'RUNNING'];

const TITLES = {
  STARTING: 'Sending your request',
  PENDING: 'Waiting in line',
  RUNNING: 'Running',
  SUCCEEDED: 'Done',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  UNKNOWN: 'Status unavailable'
};

// Short words for the file list
const ROW_STATES = {
  STARTING: 'Sending',
  PENDING: 'Waiting',
  RUNNING: 'Running',
  SUCCEEDED: 'Done',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  UNKNOWN: 'Unknown'
};

// Remembers if the user opened the file list, so a refresh of the card keeps it
let listOpen = null;

export function bar(fraction) {
  const percent = Math.round(fraction * 100);

  return el(
    'div',
    {
      class: 'bar',
      role: 'progressbar',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': percent
    },
    el('div', { class: 'bar-fill', style: `width: ${percent}%` })
  );
}

function driveButton(url) {
  return el('a', { class: 'btn btn-primary btn-small', href: url, target: '_blank', rel: 'noopener' }, 'Open in Drive');
}

// One output with its own card: a table, a single map, or the legend
export function runCard(task) {
  const checking = task.kind === 'check';
  const title = checking && task.state === 'STARTING' ? 'Checking dates' : TITLES[task.state] || task.state;
  const detail = checking
    ? 'Looking up which dates have data, so empty ones are skipped.'
    : `${task.datasetLabel}, ${task.kindLabel || 'Table (CSV)'}, saving to ${task.name}`;

  const children = [el('h3', { class: 'info-title' }, title), el('p', { class: 'muted' }, detail)];

  if (task.fileName) {
    children.push(el('p', { class: 'muted' }, `File: ${task.fileName}`));
  }

  if (ACTIVE.includes(task.state)) {
    children.push(bar(task.progress || 0));
    children.push(el('p', { class: 'muted run-hint' }, 'You can keep this page open. Files appear in Drive when this says Done.'));
  }

  if (task.state === 'SUCCEEDED') {
    children.push(el('p', { class: 'muted' }, 'Your file is in this Drive folder.'));

    if (task.driveUrl) {
      children.push(driveButton(task.driveUrl));
    }
  }

  if (task.error) {
    children.push(el('p', { class: 'run-error', role: 'alert' }, task.error.slice(0, 400)));
  }

  return el('div', { class: `info-card run-card run-${task.state.toLowerCase()}` }, ...children);
}

function countOf(tasks, state) {
  return tasks.filter((task) => task.state === state).length;
}

// Many maps, one card: "37 of 120 done", with the file list folded away
function groupCard(tasks) {
  const total = tasks.length;
  const done = countOf(tasks, 'SUCCEEDED');
  const failed = countOf(tasks, 'FAILED');
  const running = countOf(tasks, 'RUNNING');
  const waiting = tasks.filter((task) => ['STARTING', 'PENDING'].includes(task.state)).length;
  const ended = tasks.filter((task) => !ACTIVE.includes(task.state)).length;
  const finished = ended === total;

  let title = `${done} of ${total} done`;

  if (finished && failed === 0 && done === total) {
    title = `All ${total} map files are done`;
  } else if (finished && failed > 0) {
    title = `${done} of ${total} done, ${failed} failed`;
  }

  const children = [el('h3', { class: 'info-title' }, title)];

  // The bar counts files, it does not guess at the progress inside each one
  children.push(bar(ended / total));

  if (!finished) {
    children.push(el('p', { class: 'muted run-hint' }, `${running} running, ${waiting} waiting. You can keep this page open.`));
  }

  // Failed files first, so they are the first thing seen
  const sorted = [...tasks].sort((a, b) => Number(b.state === 'FAILED') - Number(a.state === 'FAILED'));

  const list = el(
    'div',
    { class: 'run-files-list' },
    ...sorted.map((task) =>
      el(
        'div',
        { class: `run-file${task.state === 'FAILED' ? ' run-file-bad' : ''}` },
        el('span', {}, task.fileName),
        el('span', {}, ROW_STATES[task.state] || task.state)
      )
    )
  );

  const details = el('details', { class: 'run-files' }, el('summary', {}, 'Show files'), list);

  details.open = listOpen === null ? failed > 0 : listOpen;
  details.addEventListener('toggle', () => {
    listOpen = details.open;
  });
  children.push(details);

  const link = tasks.find((task) => task.driveUrl);

  if (finished && done > 0 && link) {
    children.push(driveButton(link.driveUrl));
  }

  return el('div', { class: `info-card run-card run-${finished ? (failed > 0 ? 'failed' : 'succeeded') : 'running'}` }, ...children);
}

// Names the files that failed and offers to send only those again
function failureCard(failed, onRetry) {
  const rows = failed.map((task) =>
    el('div', { class: 'run-file run-file-bad' }, el('span', {}, task.fileName), el('span', {}, (task.error || '').slice(0, 90)))
  );

  return el(
    'div',
    { class: 'info-card run-card run-failed' },
    el('h3', { class: 'info-title' }, `${failed.length} ${failed.length === 1 ? 'file' : 'files'} failed`),
    el('div', { class: 'run-files-list' }, ...rows),
    el('button', { type: 'button', class: 'btn btn-primary btn-small', onclick: onRetry }, 'Retry failed')
  );
}

// All the cards for one download, in the order they should appear
export function batchCards(tasks, onRetry) {
  const series = tasks.filter((task) => task.kind === 'period');
  const others = tasks.filter((task) => task.kind !== 'period');
  const cards = [];

  const retryable = tasks.filter((task) => task.state === 'FAILED' && task.kind !== 'check');
  const busy = tasks.some((task) => ACTIVE.includes(task.state));

  if (retryable.length > 0 && !busy) {
    cards.push(failureCard(retryable, onRetry));
  }

  others.forEach((task) => cards.push(runCard(task)));

  if (series.length > 0) {
    cards.push(groupCard(series));
  }

  return cards;
}