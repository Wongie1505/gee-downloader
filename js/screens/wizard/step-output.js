import { getDataset } from '../../data/catalog.js';
import { sampleLabels, countPeriods, MAX_BANDS, MAX_FILES } from '../../core/periods.js';
import { getState, setState } from '../../state.js';
import { el } from '../../ui/dom.js';
import { infoCard } from '../../ui/info.js';

export const label = 'Output';
export const title = 'What should you get back?';
export const hint = 'Tick one or both.';

const OPTIONS = [
  { id: 'csv', name: 'Table (CSV)', note: 'One row per period, ready for Excel.' },
  { id: 'geotiff', name: 'Map file (GeoTIFF)', note: 'Opens in QGIS or ArcGIS.' }
];

// How a map for many dates is saved
const LAYOUTS = [
  { id: 'separate', name: 'One file per period', note: 'A separate map for each date. Easier to open one at a time, and you see which ones failed.' },
  { id: 'multiband', name: 'One file with all periods', note: 'A single file with one band per period.' }
];

// Only date series have a layout choice, one-off maps are a single file
function showLayout(state, dataset) {
  return state.outputs.includes('geotiff') && Boolean(dataset.years);
}

// Separate files are one task each, a multiband file is one band each
function limitFor(state) {
  return state.layout === 'separate' ? MAX_FILES : MAX_BANDS;
}

function tooMany(state) {
  const dataset = getDataset(state.datasetId);

  return (
    showLayout(state, dataset) &&
    Boolean(state.range) &&
    countPeriods(state.range, state.timeStep) > limitFor(state)
  );
}

function limitMessage(state) {
  if (state.layout === 'separate') {
    return `Separate files are limited to ${MAX_FILES} per download. Choose monthly steps, fewer years, or the table.`;
  }

  return `A map file holds up to ${MAX_BANDS} values. Choose fewer periods, or table only.`;
}

export function isValid(state) {
  return state.outputs.length > 0 && !tooMany(state);
}

export function render(state) {
  const dataset = getDataset(state.datasetId);
  const list = el('div', { class: 'stack' });
  const layout = layoutOptions(state);

  layout.hidden = !showLayout(state, dataset);

  OPTIONS.forEach((option) => {
    // An output is only offered when the engine can really make it
    const ready = Boolean(dataset.exports && dataset.exports[option.id]);
    const box = el('input', {
      type: 'checkbox',
      checked: state.outputs.includes(option.id),
      disabled: !ready,
      onchange: () => {
        toggle(option.id, box.checked);
        layout.hidden = !showLayout(getState(), dataset);
      }
    });

    list.append(
      el(
        'label',
        { class: 'check' },
        box,
        el('span', {}, el('strong', {}, option.name), el('small', {}, ready ? option.note : 'Coming soon.'))
      )
    );
  });

  return el('div', { class: 'stack' }, list, layout);
}

// Radio buttons for the layout, shown only when a date series is chosen as a map
function layoutOptions(state) {
  const box = el('div', { class: 'stack' }, el('h4', { class: 'info-sub' }, 'How should map files be saved?'));

  LAYOUTS.forEach((option) => {
    const radio = el('input', {
      type: 'radio',
      name: 'layout',
      checked: state.layout === option.id,
      onchange: () => setState({ layout: option.id })
    });

    box.append(
      el('label', { class: 'check' }, radio, el('span', {}, el('strong', {}, option.name), el('small', {}, option.note)))
    );
  });

  return box;
}

function toggle(id, on) {
  const outputs = new Set(getState().outputs);

  if (on) {
    outputs.add(id);
  } else {
    outputs.delete(id);
  }

  setState({ outputs: [...outputs] });
}

// Show what each chosen file will look like
export function pane(state) {
  const dataset = getDataset(state.datasetId);
  const children = [];

  if (state.outputs.includes('csv') && dataset.sample) {
    children.push(el('h4', { class: 'info-sub' }, 'Table (CSV)'), sampleTable(dataset, state));
  }

  if (state.outputs.includes('geotiff')) {
    children.push(
      el('h4', { class: 'info-sub' }, 'Map file (GeoTIFF)'),
      el('p', { class: 'muted' }, bandNote(dataset, state))
    );
  }

  if (children.length === 0) {
    children.push(el('p', { class: 'muted' }, 'Tick an output to see what the file looks like.'));
  } else {
    children.push(el('p', { class: 'caveat muted' }, 'Example layout. The numbers are illustrative.'));
  }

  if (tooMany(state)) {
    children.push(el('p', { class: 'run-error' }, limitMessage(state)));
  }

  return infoCard('What you will get', ...children);
}

function sampleTable(dataset, state) {
  const { header, values, rows } = dataset.sample;

  // Series tables use real period labels, class tables are fixed
  const body = rows || sampleLabels(state.range, state.timeStep).map((label, i) => [label, values[i]]);

  const table = el('table', { class: 'sample-table' });

  table.append(
    el('thead', {}, el('tr', {}, ...header.map((name) => el('th', {}, name)))),
    el('tbody', {}, ...body.map((row) => el('tr', {}, ...row.map((cell) => el('td', {}, String(cell))))))
  );

  return table;
}

function bandNote(dataset, state) {
  if (!dataset.years) {
    return 'One file with a single band.';
  }

  const [first] = sampleLabels(state.range, state.timeStep, 1);

  if (state.layout === 'separate') {
    return `One file per period, with the period at the end of its name, like ..._${first}.tif. Each covers the rectangle around your area.`;
  }

  return `One file with one band per period, named like ${dataset.bandPrefix}_${first.replace(/-/g, '_')}. It covers the rectangle around your area.`;
}