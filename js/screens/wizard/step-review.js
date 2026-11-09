import { getDataset } from '../../data/catalog.js';
import { countPeriods } from '../../core/periods.js';
import { setState } from '../../state.js';
import { el } from '../../ui/dom.js';
import { infoCard, factList } from '../../ui/info.js';
import { runCard } from '../../ui/run-card.js';

export const label = 'Review';
export const title = 'Ready to download?';
export const hint = 'Check the summary and name your Drive folder.';

const FOLDER_PATTERN = /^[A-Za-z0-9_-]+$/;
const OUTPUT_NAMES = { csv: 'Table (CSV)', geotiff: 'Map file (GeoTIFF)' };

export function isValid(state) {
  return FOLDER_PATTERN.test(state.folderName);
}

// Letters and digits only, so the default folder name always passes the check
function slug(text) {
  const clean = text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  return clean.slice(0, 30) || 'area';
}

// Default folder name like rainfall_zomba_2015-2024
function suggestFolder(state, dataset) {
  const parts = [dataset.slug, slug(state.area.name)];

  if (state.range) {
    parts.push(`${state.range.start}-${state.range.end}`);
  }

  return parts.join('_');
}

export function render(state) {
  const dataset = getDataset(state.datasetId);
  const suggestion = suggestFolder(state, dataset);

  // Prefill on every arrival, the user can still edit it
  setState({ folderName: suggestion });

  const rows = [
    ['Data', dataset.label],
    ['Area', state.area.name]
  ];

  if (state.range) {
    rows.push(['Period', `${state.range.start} to ${state.range.end}, ${state.timeStep}`]);
  }

  rows.push(['Output', state.outputs.map((id) => OUTPUT_NAMES[id]).join(' and ')]);

  const summary = el('dl', { class: 'summary' });

  rows.forEach(([term, value]) => {
    summary.append(el('dt', {}, term), el('dd', {}, value));
  });

  const input = el('input', {
    type: 'text',
    id: 'folder',
    value: suggestion,
    maxlength: 60
  });

  input.addEventListener('input', () => {
    const name = input.value.trim();

    input.classList.toggle('invalid', !FOLDER_PATTERN.test(name));
    setState({ folderName: name });
  });

  return el(
    'div',
    {},
    summary,
    el(
      'div',
      { class: 'field' },
      el('label', { for: 'folder' }, 'Drive folder name'),
      input,
      el('small', { class: 'field-note' }, 'Letters, numbers, dash and underscore only.')
    )
  );
}

// Plain summary of what will be created and where it lands
export function pane(state) {
  const files = state.outputs.length;
  const rows = [['Area', state.area ? state.area.name : 'Not chosen']];

  if (state.range) {
    rows.push(['Values', countPeriods(state.range, state.timeStep).toLocaleString('en')]);
  }

  rows.push(['Files', `${files} ${files === 1 ? 'file' : 'files'}`]);
  rows.push(['Saved to', `My Drive / ${state.folderName}`]);

  const summary = infoCard(
    'What will be created',
    factList(rows),
    el('p', { class: 'caveat' }, 'Earth Engine queues the job, so files can take a few minutes to appear in Drive.')
  );

  const dataset = getDataset(state.datasetId);
  const stack = [];
  const lastTask = state.tasks[state.tasks.length - 1];

  // Every output of the latest download gets its own card
  if (lastTask) {
    state.tasks
      .filter((task) => task.batch === lastTask.batch)
      .forEach((task) => stack.push(runCard(task)));
  }

  if (dataset && !dataset.downloadReady && !(state.user && state.user.demo)) {
    stack.push(infoCard('Not available yet', el('p', { class: 'muted' }, 'Downloads for this dataset are coming soon. Rainfall works now.')));
  }

  return el('div', { class: 'pane-stack' }, ...stack, summary);
}