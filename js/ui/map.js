// Leaflet helpers. Leaflet itself is a global (L) loaded in index.html.

export const MALAWI_BOUNDS = [[-17.2, 32.6], [-9.3, 36.0]];

// OpenStreetMap standard tiles need no API key. Keep attribution visible.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const CREDIT =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const maps = {};

export function hasMap(id) {
  return Boolean(maps[id]);
}

// Create a map once per container, then reuse it
export function getMap(id, options = {}) {
  if (maps[id]) {
    return maps[id];
  }

  const map = L.map(id, {
    zoomControl: false,
    scrollWheelZoom: false,
    ...options
  });

  L.tileLayer(TILES, { maxZoom: 19, attribution: CREDIT }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  map.fitBounds(MALAWI_BOUNDS);

  maps[id] = map;

  return map;
}

// A map inside a hidden screen has no size, so refresh after showing it
export function refreshMaps() {
  Object.values(maps).forEach((map) => map.invalidateSize());
}
