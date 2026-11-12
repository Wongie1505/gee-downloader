// My downloads: everything this app has sent to Earth Engine, found by the
// gd_ prefix, so it also shows downloads from earlier visits.

import { el } from '../../ui/dom.js';
import { getState, on } from '../../state.js';
import { bar } from '../../ui/run-card.js';
import { loadJobs, groupJobs } from '../../core/my-downloads.js';
import { friendlyError } from '../../core/auth.js';

// Tests shorten this so they do not wait 10 seconds
export const timing = { refreshMs: 10000 };

const STATE_NAMES = {
  PENDING: 'Waiting',
  RUNNING: 'Running',
  CANCELLING: 'Cancelling',
  SUCCEEDED: 'Done',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  UNKNOWN: 'Unknown'
};

export function initDownloads(root) {
  let groups = null;
  let problem = '';
  let timer = null;
  let loading = false;

  // Which file lists the user opened, so a refresh does not close them
  const opened = new Set();

  function visible() {
    return document.body.dataset.view === 'downloads';
  }

  function isDemo() {
    const user = getState().user;

    return Boolean(user && user.demo);
  }

  async function refresh() {
    clearTimeout(timer);

    if (loading || isDemo() || !getState().user) {
      return;
    }

    loading = true;

    try {
      groups = groupJobs(await loadJobs());
      problem = '';
    } catch (error) {
      console.error('Could not list downloads', error);
      problem = friendlyError(error);
    }

    loading = false;
    draw();

    // Keep checking while something is still running
    if (visible() && groups && groups.some((group) => group.running > 0)) {
      timer = setTimeout(refresh, timing.refreshMs);
    }
  }

  function whenText(time) {
    if (!time) {
      return '';
    }

    return new Date(time).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function groupCard(group) {
    const ended = group.total - group.running;
    const parts = [`${group.done} of ${group.total} done`];

    if (group.running > 0) {
      parts.push(`${group.running} running`);
    }

    if (group.failed > 0) {
      parts.push(`${group.failed} failed`);
    }

    const rows = group.jobs.map((job) =>
      el(
        'div',
        { class: `run-file${job.state === 'FAILED' ? ' run-file-bad' : ''}` },
        el('span', {}, job.label),
        el('span', {}, job.state === 'FAILED' && job.error ? job.error.slice(0, 80) : STATE_NAMES[job.state] || job.state)
      )
    );

    const details = el('details', { class: 'run-files' }, el('summary', {}, 'Show files'), el('div', { class: 'run-files-list' }, ...rows));

    details.open = opened.has(group.key);
    details.addEventListener('toggle', () => {
      if (details.open) {
        opened.add(group.key);
      } else {
        opened.delete(group.key);
      }
    });

    const link = group.jobs.find((job) => job.driveUrl);
    const children = [
      el('h3', { class: 'info-title' }, group.key),
      el('p', { class: 'muted' }, `${whenText(group.newest)}. ${parts.join(', ')}.`),
      bar(ended / group.total),
      details
    ];

    if (link && group.running === 0) {
      children.push(el('a', { class: 'btn btn-primary btn-small', href: link.driveUrl, target: '_blank', rel: 'noopener' }, 'Open in Drive'));
    }

    return el('div', { class: `info-card run-card run-${group.running > 0 ? 'running' : group.failed > 0 ? 'failed' : 'succeeded'}` }, ...children);
  }

  function content() {
    if (isDemo()) {
      return [el('p', { class: 'demo-note' }, 'Demo mode is not connected to Earth Engine, so there are no downloads to show.')];
    }

    if (problem) {
      return [el('p', { class: 'run-error', role: 'alert' }, problem)];
    }

    if (groups === null) {
      return [el('p', { class: 'muted' }, 'Loading your downloads...')];
    }

    if (groups.length === 0) {
      return [el('p', { class: 'muted' }, 'No downloads yet. Start one from the app and it will show up here.')];
    }

    return groups.map(groupCard);
  }

  function draw() {
    const main = document.querySelector('main');
    const scroll = main ? main.scrollTop : 0;

    root.replaceChildren(
      el(
        'div',
        { class: 'downloads-head' },
        el('h1', {}, 'My downloads'),
        el('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: refresh }, 'Refresh')
      ),
      el('p', { class: 'muted' }, 'Exports from this Earth Engine project that were started here, newest first. The latest 500 are checked.'),
      el('div', { class: 'stack' }, ...content())
    );

    if (main) {
      main.scrollTop = scroll;
    }
  }

  on('screen:shown', (name) => {
    clearTimeout(timer);

    if (name === 'downloads') {
      draw();
      refresh();
    }
  });
}