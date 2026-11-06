// Decides what sits on the app map: dataset preview on the Data step,
// district outline on every step after it.

import { getState, on } from '../state.js';
import { getMap, hasMap, MALAWI_BOUNDS } from './map.js';

const MAP_ID = 'app-map';
const OUTLINE = { color: '#2f6b4f', weight: 3, fill: false };

let step = 'data';
let areaLayer = null;
let areaFeature = null;
let previewLayer = null;
let previewId = null;

export function initMapLayers() {
  on('step:changed', (id) => {
    step = id;
    render(true);
  });

  on('change', () => render(false));
  on('screen:shown', () => render(true));
}

function render(refit) {
  // The map only exists once the app screen has been shown
  if (!hasMap(MAP_ID)) {
    return;
  }

  const map = getMap(MAP_ID);
  const state = getState();
  const areaChanged = syncArea(map, state);

  syncPreview(map, state);

  if (refit || areaChanged) {
    fit(map);
  }
}

// Outline of the chosen district, shown after the Data step
function syncArea(map, state) {
  const wanted = step !== 'data' && state.area ? state.area : null;
  const wantedFeature = wanted ? wanted.feature : null;

  if (wantedFeature === areaFeature) {
    return false;
  }

  if (areaLayer) {
    areaLayer.remove();
    areaLayer = null;
  }

  if (wanted) {
    areaLayer = L.geoJSON(wanted.feature, { style: OUTLINE }).addTo(map);
  }

  areaFeature = wantedFeature;

  return true;
}

// Static picture of the dataset over Malawi, shown on the Data step only
function syncPreview(map, state) {
  const wanted = step === 'data' ? state.datasetId : null;

  if (wanted === previewId) {
    return;
  }

  if (previewLayer) {
    previewLayer.remove();
    previewLayer = null;
  }

  if (wanted) {
    previewLayer = L.imageOverlay(`assets/previews/${wanted}.png`, MALAWI_BOUNDS, {
      opacity: 0.9
    });

    // A missing image should fail quietly, not break the step
    previewLayer.on('error', () => previewLayer && previewLayer.remove());
    previewLayer.addTo(map);
  }

  previewId = wanted;
}

function fit(map) {
  if (areaLayer) {
    map.fitBounds(areaLayer.getBounds(), { padding: [40, 40] });
  } else {
    map.fitBounds(MALAWI_BOUNDS);
  }
}
