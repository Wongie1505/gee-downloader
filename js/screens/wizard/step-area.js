import { getDataset } from '../../data/catalog.js';
import { loadDistricts } from '../../core/districts.js';
import { areaKm2 } from '../../core/geo.js';
import { setState } from '../../state.js';
import { el } from '../../ui/dom.js';
import { infoCard, factList } from '../../ui/info.js';

export const label = 'Area';
export const title = 'Where do you need it?';
export const hint = 'Pick the district you want data for.';

// Below this many pixels the result is too coarse to be useful
const FEW_PIXELS = 20;

export function isValid(state) {
  return Boolean(state.area);
}

export function render(state) {
  const select = el(
    'select',
    { id: 'area-select', disabled: true },
    el('option', { value: '' }, 'Loading districts')
  );
  const note = el('small', { class: 'field-note' });

  loadDistricts()
    .then((districts) => fillSelect(select, districts, state))
    .catch((error) => {
      select.replaceChildren(el('option', { value: '' }, 'Districts unavailable'));
      note.textContent = error.message;
    });

  return el(
    'div',
    { class: 'field' },
    el('label', { for: 'area-select' }, 'District'),
    select,
    note
  );
}

function fillSelect(select, districts, state) {
  select.replaceChildren(
    el('option', { value: '' }, 'Choose a district'),
    ...districts.map((district) =>
      el(
        'option',
        { value: district.name, selected: state.area?.name === district.name },
        district.name
      )
    )
  );

  select.disabled = false;

  select.addEventListener('change', () => {
    const picked = districts.find((district) => district.name === select.value);

    setState({
      area: picked
        ? { source: 'district', name: picked.name, feature: picked.feature }
        : null
    });
  });
}

// Size of the area and how many data pixels fall inside it
export function pane(state) {
  if (!state.area) {
    return infoCard(
      'Your area',
      el('p', { class: 'muted' }, 'Choose a district and its outline shows on the map.')
    );
  }

  const dataset = getDataset(state.datasetId);
  const size = areaKm2(state.area.feature.geometry);
  const pixelKm = dataset.scale / 1000;
  const pixels = Math.max(1, Math.round(size / (pixelKm * pixelKm)));
  const children = [
    factList([
      ['Size', `${Math.round(size).toLocaleString('en')} km\u00b2`],
      [`${dataset.label} pixels`, `about ${pixels.toLocaleString('en')}`]
    ])
  ];

  if (pixels < FEW_PIXELS) {
    children.push(
      el('p', { class: 'caveat' }, 'Very few pixels cover this area, so results will be coarse.')
    );
  }

  return infoCard(state.area.name, ...children);
}
