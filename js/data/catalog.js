// Lists the datasets. Each one lives in its own folder under js/datasets/.
//
// Fields every dataset config can use:
// exports:       which outputs the engine can really produce for this dataset
// sourceKind:    'collection' (default) or 'image' for a single image
// bandPrefix:    start of each band name in a multiband map file
// nativeWgs84:   false means the data is in another projection and is
//                converted to plain lat/lon on export

import chirps from '../datasets/chirps/index.js';
import modisNdvi from '../datasets/modis-ndvi/index.js';
import worldcover from '../datasets/worldcover/index.js';
import modisLc from '../datasets/modis-lc/index.js';
import srtm from '../datasets/srtm/index.js';

// The order here is the order on the Data step
export const datasets = [chirps, modisNdvi, worldcover, modisLc, srtm];

export function getDataset(id) {
  return datasets.find((dataset) => dataset.id === id) || null;
}

// Starting values for a freshly picked dataset
export function defaultsFor(dataset) {
  const defaults = {
    outputs: [...dataset.outputs],
    range: null,
    timeStep: null
  };

  if (dataset.years) {
    const [minYear, maxYear] = dataset.years;

    // Last 10 years, or less if the dataset is younger
    defaults.range = { start: Math.max(minYear, maxYear - 9), end: maxYear };
    defaults.timeStep = dataset.steps.includes('monthly')
      ? 'monthly'
      : dataset.steps[0];
  }

  return defaults;
}