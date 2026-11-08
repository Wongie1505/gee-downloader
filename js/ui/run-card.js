// The card that shows how an export is going. Phase 6 builds the full panel on this.

import { el } from './dom.js';

const TITLES = {
  STARTING: 'Sending your request',
  PENDING: 'Waiting in line',
  RUNNING: 'Running',
  SUCCEEDED: 'Done',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  UNKNOWN: 'Status unavailable'
};

function progressBar(task) {
  const percent = Math.round((task.progress || 0) * 100);

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

export function runCard(task) {
  const children = [
    el('h3', { class: 'info-title' }, TITLES[task.state] || task.state),
    el('p', { class: 'muted' }, `${task.datasetLabel}, saving to ${task.name}`)
  ];

  if (['STARTING', 'PENDING', 'RUNNING'].includes(task.state)) {
    children.push(progressBar(task));
    children.push(el('p', { class: 'muted run-hint' }, 'You can keep this page open. Files appear in Drive when this says Done.'));
  }

  if (task.state === 'SUCCEEDED') {
    children.push(el('p', { class: 'muted' }, 'Your file is in this Drive folder.'));

    if (task.driveUrl) {
      children.push(
        el('a', { class: 'btn btn-primary btn-small', href: task.driveUrl, target: '_blank', rel: 'noopener' }, 'Open in Drive')
      );
    }
  }

  if (task.error) {
    children.push(el('p', { class: 'run-error', role: 'alert' }, task.error.slice(0, 400)));
  }

  return el('div', { class: `info-card run-card run-${task.state.toLowerCase()}` }, ...children);
}