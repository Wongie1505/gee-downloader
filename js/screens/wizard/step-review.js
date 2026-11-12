import { getDataset } from '../../data/catalog.js';
import { countPeriods } from '../../core/periods.js';
import { FOLDER_PREFIX } from '../../core/naming.js';
import { setState } from '../../state.js';
import { el } from '../../ui/dom.js';
import { infoCard, factList } from '../../ui/info.js';

export const label = 'Review';
export const title = 'Ready to download?';
export const hint = 'Check the summary and name your Drive folder.';

const FOLDER_PATTERN = /^[A-Za-z0-9_-]+$/;

export function isValid(state) {
  return FOLDER_PATTERN.test(state.folderName);
}

// Letters and digits only, so the default folder name always passes the check
function slug(text) {
  const clean = text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  return clean.slice(0, 30) || 'area';
}

// rainfall_zomba -> Rainfall_Zomba
function titleCase(text) {
  return text.replace(/(^|_)([a-z])/g, (match, lead, letter) => lead + letter.toUpperCase());
}

// Date series saved as separate maps become one file per period
function mapsAsFiles(state, dataset) {
  return state.outputs.includes('geotiff') && Boolean(dataset.years) && state.layout === 'separate';
}

function outputName(id, state, dataset) {
  if (id === 'csv') {
    return dataset.legend ? 'Area table (CSV)' : 'Table (CSV)';
  }

  return mapsAsFiles(state, dataset) ? 'Map files (GeoTIFF), one per period' : 'Map file (GeoTIFF)';
}

// How many files the download creates. Periods without data are skipped, so it can be less.
function fileCount(state, dataset) {
  let files = 0;

  state.outputs.forEach((id) => {
    files += id === 'geotiff' && mapsAsFiles(state, dataset) ? countPeriods(state.range, state.timeStep) : 1;
  });

  return files + (hasLegend(state, dataset) ? 1 : 0);
}

// Land cover maps come with a legend file that the user does not pick
function hasLegend(state, dataset) {
  return Boolean(dataset && dataset.legend && state.outputs.includes('geotiff'));
}

// Default folder name like GEE-Downloader_Rainfall_2023-2026-Dedza
export function suggestFolder(state, dataset) {
  const place = [];

  if (state.range) {
    const { start, end } = state.range;

    place.push(start === end ? `${start}` : `${start}-${end}`);
  }

  place.push(titleCase(slug(state.area.name)));

  return `${FOLDER_PREFIX}${titleCase(dataset.slug)}_${place.join('-')}`;
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

  const outputNames = state.outputs.map((id) => outputName(id, state, dataset));

  if (hasLegend(state, dataset)) {
    outputNames.push('Legend (CSV)');
  }

  rows.push(['Output', outputNames.join(' and ')]);

  const summary = el('dl', { class: 'summary' });

  rows.forEach(([term, value]) => {
    summary.append(el('dt', {}, term), el('dd', {}, value));
  });

  const input = el('input', {
    type: 'text',
    id: 'folder',
    value: suggestion,
    maxlength: 100
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
      el('small', { class: 'field-note' }, 'Letters, numbers, dash and underscore only. If this name already exists in your Drive, the files go into that folder.')
    )
  );
}

// Plain summary of what will be created and where it lands
export function pane(state) {
  const dataset = getDataset(state.datasetId);
  const files = state.outputs.length > 0 && state.area ? fileCount(state, dataset) : 0;
  const rows = [['Area', state.area ? state.area.name : 'Not chosen']];

  if (state.range) {
    rows.push(['Values', countPeriods(state.range, state.timeStep).toLocaleString('en')]);
  }

  rows.push(['Files', `${mapsAsFiles(state, dataset) ? 'Up to ' : ''}${files} ${files === 1 ? 'file' : 'files'}`]);
  rows.push(['Saved to', `My Drive / ${state.folderName}`]);

  const summary = infoCard(
    'What will be created',
    factList(rows),
    el('p', { class: 'caveat' }, 'Earth Engine queues the job, so files can take a few minutes to appear in Drive.')
  );

  const stack = [];

  if (dataset && !dataset.downloadReady && !(state.user && state.user.demo)) {
    stack.push(infoCard('Not available yet', el('p', { class: 'muted' }, 'Downloads for this dataset are coming soon. Rainfall works now.')));
  }

  return el('div', { class: 'pane-stack' }, ...stack, summary);
}