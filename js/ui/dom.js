// Tiny element builder: el('div', { class: 'x', onclick: fn }, child1, child2)

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on')) {
      // onclick becomes a click listener
      node.addEventListener(key.slice(2), value);
    } else if (value !== false && value != null) {
      node.setAttribute(key, value);
    }
  }

  // Skip null and false so conditional children are easy
  node.append(...children.filter((child) => child != null && child !== false));

  return node;
}
