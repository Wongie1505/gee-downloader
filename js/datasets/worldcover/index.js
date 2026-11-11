// ESA WorldCover 2021, one 10 m land cover map.

import legend from './legend.js';

export default {
  id: 'worldcover',
  downloadReady: true,
  exports: { csv: true, geotiff: true },
  sourceKind: 'collection',
  slug: 'landcover_2021',
  label: 'Land cover 2021',
  blurb: 'One 10 m map for 2021 (ESA WorldCover).',
  collection: 'ESA/WorldCover/v200',
  band: 'Map',
  scale: 10,
  reducer: null,
  steps: [],
  years: null,
  outputChoice: true,
  outputs: ['geotiff'],

  // The year of the map, used in the area table
  mapYear: 2021,

  // Exported as a CSV next to the map, so the class codes can be read
  legend,
  csvNote: 'Area of each land cover class in km2, for the exact shape of your area.',

  source: 'ESA WorldCover',
  coverage: '2021, one map',
  detail: '10 m pixels',
  unit: 'Land cover class codes',
  caveat: 'A single snapshot, so it cannot show change over time.',
  sample: {
    header: ['year', 'class_code', 'class_name', 'area_km2'],
    rows: [['2021', '40', 'Cropland', '1204.5'], ['2021', '30', 'Grassland', '830.2'], ['2021', '50', 'Built-up', '38.1']]
  }
};