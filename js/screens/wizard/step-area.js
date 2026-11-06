import { getDataset } from '../../data/catalog.js';
import { loadDistricts, largestDistrict } from '../../core/districts.js';
import { areaKm2, formatNumber } from '../../core/geo.js';
import { readAreaFile } from '../../core/roi-parse.js';
import { prepareArea } from '../../core/roi-validate.js';
import { setState } from '../../state.js';
import { el } from '../../ui/dom.js';
import { infoCard, factList } from '../../ui/info.js';

export const label = 'Area';
export const title = 'Where do you need it?';
export const hint = 'Pick a district, or upload your own area.';

// Below this many pixels the result is too coarse to be useful
const FEW_PIXELS = 20;

// Used only if the districts file cannot be loaded
const FALLBACK_LIMIT = { name: 'Mzimba', km2: 10500 };

let limit = FALLBACK_LIMIT;

export function isValid(state) {
  return Boolean(state.area);
}

function limitNote() {
  return `GeoJSON or a zipped shapefile (.shp, .dbf, .prj). Up to ${formatNumber(limit.km2)} km\u00b2, the size of ${limit.name}.`;
}

export function render(state) {
  const select = el(
    'select',
    { id: 'area-select', disabled: true },
    el('option', { value: '' }, 'Loading districts')
  );
  const note = el('small', { class: 'field-note' }, limitNote());
  const status = el('p', { class: 'area-status', hidden: true });
  const fileInput = el('input', {
    type: 'file',
    id: 'area-file',
    accept: '.geojson,.json,.zip',
    hidden: true
  });

  // Coming back to this step with an uploaded area already chosen
  if (state.area && state.area.source === 'upload') {
    const size = formatNumber(areaKm2(state.area.feature.geometry));

    showStatus(status, `Using ${state.area.name}, ${size} km\u00b2`, 'ok');
  }

  loadDistricts()
    .then((districts) => {
      limit = largestDistrict(districts);
      note.textContent = limitNote();
      fillSelect(select, districts, state, status);
    })
    .catch((error) => {
      select.replaceChildren(el('option', { value: '' }, 'Districts unavailable'));
      note.textContent = error.message;
    });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];

    // Reset so the same file can be picked again
    fileInput.value = '';

    if (file) {
      useFile(file, select, status);
    }
  });

  // Draw is a placeholder for the demo, it does nothing yet
  const actions = el(
    'div',
    { class: 'area-actions' },
    el('span', {}, 'or'),
    el('button', { type: 'button', class: 'link', onclick: () => fileInput.click() }, 'Upload a file'),
    el('button', { type: 'button', class: 'link', disabled: true, title: 'Coming soon' }, 'Draw on map'),
    el('small', { class: 'soon' }, 'soon')
  );

  return el(
    'div',
    { class: 'field' },
    el('label', { for: 'area-select' }, 'District'),
    select,
    actions,
    note,
    status,
    fileInput
  );
}

function fillSelect(select, districts, state, status) {
  select.replaceChildren(
    el('option', { value: '' }, 'Choose a district'),
    ...districts.map((district) =>
      el(
        'option',
        {
          value: district.name,
          selected: state.area?.source === 'district' && state.area.name === district.name
        },
        district.name
      )
    )
  );

  select.disabled = false;

  select.addEventListener('change', () => {
    const picked = districts.find((district) => district.name === select.value);

    showStatus(status, '', 'ok');
    setState({
      area: picked
        ? { source: 'district', name: picked.name, feature: picked.feature }
        : null
    });
  });
}

async function useFile(file, select, status) {
  showStatus(status, 'Reading file', 'busy');

  try {
    // The limit comes from the districts file, so make sure it is loaded
    const districts = await loadDistricts().catch(() => null);

    if (districts) {
      limit = largestDistrict(districts);
    }

    const raw = await readAreaFile(file);
    const { feature, km2 } = prepareArea(raw, limit);

    select.value = '';
    setState({
      area: { source: 'upload', name: file.name.replace(/\.[^.]+$/, ''), feature }
    });
    showStatus(status, `Using ${file.name}, ${formatNumber(km2)} km\u00b2`, 'ok');
  } catch (error) {
    // The previous area stays selected, only the message changes
    showStatus(status, error.message, 'error');
  }
}

function showStatus(status, text, kind) {
  status.className = `area-status ${kind}`;
  status.textContent = text;
  status.hidden = !text;
  status.setAttribute('role', kind === 'error' ? 'alert' : 'status');
}

// Size of the area and how many data pixels fall inside it
export function pane(state) {
  if (!state.area) {
    return infoCard(
      'Your area',
      el('p', { class: 'muted' }, 'Choose a district or upload a file and its outline shows on the map.')
    );
  }

  const dataset = getDataset(state.datasetId);
  const size = areaKm2(state.area.feature.geometry);
  const pixelKm = dataset.scale / 1000;
  const pixels = Math.max(1, Math.round(size / (pixelKm * pixelKm)));
  const children = [
    factList([
      ['Source', state.area.source === 'upload' ? 'Your file' : 'District'],
      ['Size', `${formatNumber(size)} km\u00b2`],
      [`${dataset.label} pixels`, `about ${formatNumber(pixels)}`]
    ])
  ];

  if (pixels < FEW_PIXELS) {
    children.push(
      el('p', { class: 'caveat' }, 'Very few pixels cover this area, so results will be coarse.')
    );
  }

  return infoCard(state.area.name, ...children);
}
