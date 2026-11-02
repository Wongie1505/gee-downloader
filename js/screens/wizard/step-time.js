import { getDataset } from '../../data/catalog.js';
import { countPeriods } from '../../core/periods.js';
import { setState } from '../../state.js';
import { el } from '../../ui/dom.js';
import { infoCard, factList } from '../../ui/info.js';

export const label = 'Time';
export const title = 'Which years?';
export const hint = 'Choose the period and how to group it.';

export function isValid(state) {
  const dataset = getDataset(state.datasetId);

  return Boolean(state.range) && dataset.steps.includes(state.timeStep);
}

export function render(state) {
  const dataset = getDataset(state.datasetId);
  const [minYear, maxYear] = dataset.years;

  const readout = el(
    'div',
    { class: 'range-readout' },
    `${state.range.start} to ${state.range.end}`
  );
  const startInput = yearSlider(minYear, maxYear, state.range.start);
  const endInput = yearSlider(minYear, maxYear, state.range.end);

  // Keep start <= end by pushing the other handle along
  function sync(changed) {
    let start = Number(startInput.value);
    let end = Number(endInput.value);

    if (start > end) {
      if (changed === 'start') {
        end = start;
      } else {
        start = end;
      }
    }

    startInput.value = start;
    endInput.value = end;
    readout.textContent = `${start} to ${end}`;
    setState({ range: { start, end } });
  }

  startInput.addEventListener('input', () => sync('start'));
  endInput.addEventListener('input', () => sync('end'));

  return el(
    'div',
    {},
    el('div', { class: 'field' }, el('label', {}, 'Years'), readout, startInput, endInput),
    el('div', { class: 'field' }, el('label', {}, 'Group by'), stepButtons(dataset, state.timeStep))
  );
}

function yearSlider(min, max, value) {
  return el('input', { type: 'range', min, max, step: 1, value });
}

function stepButtons(dataset, selected) {
  const group = el('div', { class: 'segmented' });

  dataset.steps.forEach((name) => {
    const button = el(
      'button',
      {
        type: 'button',
        'aria-pressed': String(name === selected),
        onclick: () => {
          group.querySelectorAll('button').forEach((other) => {
            other.setAttribute('aria-pressed', String(other === button));
          });

          setState({ timeStep: name });
        }
      },
      name[0].toUpperCase() + name.slice(1)
    );

    group.append(button);
  });

  return group;
}

// Live count of how many values the choices will produce
export function pane(state) {
  if (!state.range) {
    return infoCard('Your period', el('p', { class: 'muted' }, 'Pick the years to see the numbers.'));
  }

  const periods = countPeriods(state.range, state.timeStep);
  const grouping = state.timeStep[0].toUpperCase() + state.timeStep.slice(1);
  const children = [
    factList([
      ['Years', `${state.range.start} to ${state.range.end}`],
      ['Grouped', grouping],
      ['Values', periods.toLocaleString('en')]
    ])
  ];

  if (state.timeStep === 'daily') {
    children.push(
      el('p', { class: 'caveat' }, 'Daily values make long tables. Monthly is usually enough to see trends.')
    );
  }

  return infoCard('Your period', ...children);
}
