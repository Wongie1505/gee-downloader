import { getDataset } from '../../data/catalog.js';
import { loadDistricts, largestDistrict } from '../../core/districts.js';
import { areaKm2, formatNumber } from '../../core/geo.js';
import { readAreaFile } from '../../core/roi-parse.js';
import { prepareArea } from '../../core/roi-validate.js';
import { setState, on } from '../../state.js';
import { getMap } from '../../ui/map.js';
import { startDrawing } from '../../ui/draw.js';
import { el } from '../../ui/dom.js';
import { infoCard, factList } from '../../ui/info.js';

export const label = 'Area';
export const title = 'Where do you need it?';
export const hint = 'Pick a district, upload a file, or draw your own area.';

// Below this many pixels the result is too coarse to be useful
const FEW_PIXELS = 20;

// Used only if the districts file cannot be loaded
const FALLBACK_LIMIT = { name: 'Mzimba', km2: 10500 };

let limit = FALLBACK_LIMIT;

// The drawing in progress, if any. Leaving the step or the app stops it.
let drawing = null;

function stopDrawing() {
  if (drawing) {
    drawing.cancel();
    drawing = null;
  }
}

on('step:changed', stopDrawing);
on('screen:shown', stopDrawing);

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

  // Coming back to this step with an uploaded or drawn area already chosen
  if (state.area && (state.area.source === 'upload' || state.area.source === 'draw')) {
    const size = formatNumber(areaKm2(state.area.feature.geometry));
    const what = state.area.source === 'draw' ? 'your drawn area' : state.area.name;

    showStatus(status, `Using ${what}, ${size} km\u00b2`, 'ok');
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

  const panel = drawPanel(select, status);

  const actions = el(
    'div',
    { class: 'area-actions' },
    el('span', {}, 'or'),
    el('button', { type: 'button', class: 'link', onclick: () => fileInput.click() }, 'Upload a file'),
    el('button', { type: 'button', class: 'link', onclick: panel.open }, 'Draw on map')
  );

  return el(
    'div',
    { class: 'field' },
    el('label', { for: 'area-select' }, 'District'),
    select,
    actions,
    panel.element,
    note,
    status,
    fileInput
  );
}

const HELP = {
  rectangle: 'Click one corner on the map, then the opposite corner.',
  polygon: 'Click each corner of your area. Click the first corner again, or press Finish, to close it.'
};

// The small panel with the shape choice and Undo, Finish and Cancel
function drawPanel(select, status) {
  const help = el('p', { class: 'field-note' }, HELP.rectangle);
  const rectangle = el('button', { type: 'button', class: 'chip', onclick: () => begin('rectangle') }, 'Rectangle');
  const polygon = el('button', { type: 'button', class: 'chip', onclick: () => begin('polygon') }, 'Polygon');
  const undo = el('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: () => drawing && drawing.undo() }, 'Undo');
  const finish = el('button', { type: 'button', class: 'btn btn-primary btn-small', onclick: () => drawing && drawing.finish() }, 'Finish');
  const cancel = el('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: close }, 'Cancel');
  const element = el(
    'div',
    { class: 'draw-panel', hidden: true },
    el('div', { class: 'draw-shapes' }, rectangle, polygon),
    help,
    el('div', { class: 'draw-buttons' }, undo, finish, cancel)
  );

  function close() {
    stopDrawing();
    element.hidden = true;
    showStatus(status, '', 'ok');
  }

  function begin(shape) {
    stopDrawing();
    showStatus(status, '', 'ok');
    help.textContent = HELP[shape];
    rectangle.classList.toggle('on', shape === 'rectangle');
    polygon.classList.toggle('on', shape === 'polygon');
    finish.hidden = shape === 'rectangle';

    drawing = startDrawing(getMap('app-map'), shape, {
      onChange: ({ points, km2 }) => {
        if (km2 > limit.km2) {
          showStatus(status, `${formatNumber(km2)} km\u00b2 is over the limit of ${formatNumber(limit.km2)} km\u00b2.`, 'error');
        } else {
          showStatus(status, km2 > 0 ? `Drawing, ${formatNumber(km2)} km\u00b2` : `${points} ${points === 1 ? 'corner' : 'corners'}`, 'busy');
        }
      },
      onError: (message) => showStatus(status, message, 'error'),
      accept: (feature) => {
        try {
          const area = prepareArea(feature, limit);

          select.value = '';
          setState({ area: { source: 'draw', name: 'Drawn area', feature: area.feature } });
          element.hidden = true;
          drawing = null;
          showStatus(status, `Using your drawn area, ${formatNumber(area.km2)} km\u00b2`, 'ok');

          return null;
        } catch (error) {
          return error.message;
        }
      }
    });
  }

  return {
    element,
    open() {
      element.hidden = false;
      begin('rectangle');
    }
  };
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

const SOURCE_NAMES = { upload: 'Your file', draw: 'Drawn on the map', district: 'District' };

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
      ['Source', SOURCE_NAMES[state.area.source] || 'District'],
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