import { getState, emit, on } from '../../state.js';
import { getDataset } from '../../data/catalog.js';
import { el } from '../../ui/dom.js';
import * as stepData from './step-data.js';
import * as stepArea from './step-area.js';
import * as stepTime from './step-time.js';
import * as stepOutput from './step-output.js';
import * as stepReview from './step-review.js';

const STEPS = {
  data: stepData,
  area: stepArea,
  time: stepTime,
  output: stepOutput,
  review: stepReview
};

let progressEl = null;
let bodyEl = null;
let footerEl = null;
let paneEl = null;
let current = 'data';

// Which steps apply to the chosen dataset
export function getFlow(datasetId) {
  const dataset = getDataset(datasetId);
  const flow = ['data', 'area'];

  // Before a dataset is picked, show the full flow
  if (!dataset || dataset.years) {
    flow.push('time');
  }

  if (!dataset || dataset.outputChoice) {
    flow.push('output');
  }

  flow.push('review');

  return flow;
}

export function initWizard(container, paneContainer) {
  paneEl = paneContainer;
  progressEl = el('div', { class: 'progress' });
  bodyEl = el('div', { class: 'step-body' });
  footerEl = el('div', { class: 'step-footer' });

  container.append(progressEl, bodyEl, footerEl);

  // Only the progress bar and buttons react to state changes
  on('change', updateChrome);

  goTo('data');
}

// Build a step's body once, when the user arrives on it
function goTo(stepId) {
  const step = STEPS[stepId];

  current = stepId;

  bodyEl.replaceChildren(
    el('h2', { class: 'step-title' }, step.title),
    el('p', { class: 'step-hint' }, step.hint),
    step.render(getState())
  );

  updateChrome();
  emit('step:changed', stepId);
}

function updateChrome() {
  const flow = getFlow(getState().datasetId);
  const index = flow.indexOf(current);

  progressEl.replaceChildren(...flow.map((id, i) => progressItem(id, i, index)));
  paneEl.replaceChildren(STEPS[current].pane(getState()));
  renderFooter(flow, index);
}

function progressItem(id, i, index) {
  let cls = 'progress-item';

  if (i < index) {
    cls += ' done';
  } else if (i === index) {
    cls += ' active';
  }

  return el('div', { class: cls }, STEPS[id].label);
}

function renderFooter(flow, index) {
  const isLast = index === flow.length - 1;
  const canGo = STEPS[current].isValid(getState());

  const back = el(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost',
      hidden: index === 0,
      onclick: () => move(-1)
    },
    'Back'
  );

  const next = el(
    'button',
    {
      type: 'button',
      class: 'btn btn-primary btn-next',
      disabled: !canGo,
      onclick: isLast ? requestDownload : () => move(1)
    },
    isLast ? 'Download' : 'Next'
  );

  footerEl.replaceChildren(back, next);
}

function move(delta) {
  const flow = getFlow(getState().datasetId);
  const target = flow[flow.indexOf(current) + delta];

  if (target) {
    goTo(target);
  }
}

function requestDownload() {
  // Demo mode has no login, so it can only show the flow
  if (getState().user && getState().user.demo) {
    showDemoNotice();
    return;
  }

  // Phase 4 listens for this event and starts the exports
  emit('download:requested', getState());
  console.log('download requested', getState());
}

function showDemoNotice() {
  if (bodyEl.querySelector('.demo-note')) {
    return;
  }

  bodyEl.append(
    el(
      'p',
      { class: 'demo-note', role: 'status' },
      'Demo mode: nothing is downloaded. Log in to run a real export.'
    )
  );
}