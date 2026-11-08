import { getDataset } from '../../data/catalog.js';
import { sampleLabels } from '../../core/periods.js';
import { getState, setState } from '../../state.js';
import { el } from '../../ui/dom.js';
import { infoCard } from '../../ui/info.js';

export const label = 'Output';
export const title = 'What should you get back?';
export const hint = 'Tick one or both.';

const OPTIONS = [
  { id: 'csv', name: 'Table (CSV)', note: 'One row per period, ready for Excel.', ready: true },
  { id: 'geotiff', name: 'Map file (GeoTIFF)', note: 'Opens in QGIS or ArcGIS.', ready: false }
];

export function isValid(state) {
  return state.outputs.length > 0;
}

export function render(state) {
  const list = el('div', { class: 'stack' });

  OPTIONS.forEach((option) => {
    const box = el('input', {
      type: 'checkbox',
      checked: state.outputs.includes(option.id),
      disabled: !option.ready,
      onchange: () => toggle(option.id, box.checked)
    });

    list.append(
      el(
        'label',
        { class: 'check' },
        box,
        el('span', {}, el('strong', {}, option.name), el('small', {}, option.ready ? option.note : 'Coming soon.'))
      )
    );
  });

  return list;
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
    children.push(el('h4', { class: 'info-sub' }, 'Map file (GeoTIFF)'), el('p', { class: 'muted' }, bandNote(dataset, state)));
  }

  if (children.length === 0) {
    children.push(el('p', { class: 'muted' }, 'Tick an output to see what the file looks like.'));
  } else {
    children.push(el('p', { class: 'caveat muted' }, 'Example layout. The numbers are illustrative.'));
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

  return `One file with one band per period, named like ${first}.`;
}