// Small builders for the info card that sits over the map

import { el } from './dom.js';

export function infoCard(title, ...children) {
  return el(
    'div',
    { class: 'info-card' },
    el('h3', { class: 'info-title' }, title),
    ...children
  );
}

// rows is [[label, value], ...]
export function factList(rows) {
  const list = el('dl', { class: 'facts' });

  rows.forEach(([term, value]) => {
    list.append(el('dt', {}, term), el('dd', {}, value));
  });

  return list;
}
