// The panel that slides in from the right with the latest download, and the
// header pill that opens it. The cards inside come from run-card.js.

import { el } from './dom.js';
import { getState, on } from '../state.js';
import { batchCards } from './run-card.js';
import { retryFailed } from '../core/download.js';

const ACTIVE = ['STARTING', 'PENDING', 'RUNNING'];

export function initRunPanel(panel, pill) {
  const body = el('div', { class: 'run-panel-body' });
  let lastBatch = null;
  let lastTasks = null;
  let open = false;

  function setOpen(next) {
    open = next;
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    pill.setAttribute('aria-expanded', String(open));
  }

  panel.append(
    el(
      'div',
      { class: 'run-panel-head' },
      el('h2', {}, 'Download progress'),
      el('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: () => setOpen(false) }, 'Close')
    ),
    body,
    el('div', { class: 'run-panel-foot' }, el('a', { href: '#downloads', onclick: () => setOpen(false) }, 'All my downloads'))
  );

  pill.addEventListener('click', () => setOpen(!open));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) {
      setOpen(false);
    }
  });

  // "2 running", or what is left to look at once everything has ended
  function showPill(tasks) {
    const running = tasks.filter((task) => ACTIVE.includes(task.state)).length;
    const failed = tasks.filter((task) => task.state === 'FAILED' && task.kind !== 'check').length;

    pill.hidden = false;
    pill.classList.toggle('run-pill-failed', running === 0 && failed > 0);

    if (running > 0) {
      pill.textContent = `${running} running`;
    } else {
      pill.textContent = failed > 0 ? `${failed} failed` : 'All done';
    }
  }

  function render() {
    const { tasks } = getState();

    // Only redraw when the tasks changed, not for every wizard click
    if (tasks === lastTasks) {
      return;
    }

    lastTasks = tasks;

    if (tasks.length === 0) {
      pill.hidden = true;
      setOpen(false);
      return;
    }

    const last = tasks[tasks.length - 1];
    const batch = tasks.filter((task) => task.batch === last.batch);

    // A new download opens the panel by itself
    if (last.batch !== lastBatch) {
      lastBatch = last.batch;
      setOpen(true);
    }

    showPill(batch);

    // Keep the scroll positions, or a refresh every few seconds would jump to the top
    const outer = body.scrollTop;
    const inner = body.querySelector('.run-files-list');
    const innerTop = inner ? inner.scrollTop : 0;

    body.replaceChildren(...batchCards(batch, retryFailed));
    body.scrollTop = outer;

    const again = body.querySelector('.run-files-list');

    if (again) {
      again.scrollTop = innerTop;
    }
  }

  on('change', render);
  render();
}