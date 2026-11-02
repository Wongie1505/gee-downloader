import { datasets, defaultsFor, getDataset } from '../../data/catalog.js';
import { setState } from '../../state.js';
import { el } from '../../ui/dom.js';
import { infoCard, factList } from '../../ui/info.js';

export const label = 'Data';
export const title = 'What data do you need?';
export const hint = 'Pick one dataset. Run the steps again for another.';

export function isValid(state) {
  return Boolean(state.datasetId);
}

export function render(state) {
  const list = el('div', { class: 'layer-list' });

  datasets.forEach((dataset) => {
    const row = el(
      'button',
      {
        type: 'button',
        class: 'layer',
        'data-id': dataset.id,
        'aria-pressed': String(state.datasetId === dataset.id),
        onclick: () => select(dataset, list)
      },
      el('span', { class: 'layer-dot' }),
      el('span', { class: 'layer-name' }, dataset.label),
      el('span', { class: 'layer-blurb' }, dataset.blurb),
      el('code', {}, dataset.collection)
    );

    list.append(row);
  });

  return list;
}

function select(dataset, list) {
  // Picking a dataset resets time and output to sensible defaults
  setState({ datasetId: dataset.id, ...defaultsFor(dataset) });

  list.querySelectorAll('.layer').forEach((row) => {
    row.setAttribute('aria-pressed', String(row.dataset.id === dataset.id));
  });
}

// Right-hand card: where the dataset comes from and what to watch for
export function pane(state) {
  const dataset = getDataset(state.datasetId);

  if (!dataset) {
    return infoCard(
      'About the data',
      el('p', { class: 'muted' }, 'Pick a dataset to see where it comes from and what to watch for.')
    );
  }

  return infoCard(
    dataset.label,
    factList([
      ['Source', dataset.source],
      ['Coverage', dataset.coverage],
      ['Detail', dataset.detail],
      ['Units', dataset.unit]
    ]),
    el('p', { class: 'caveat' }, dataset.caveat)
  );
}
