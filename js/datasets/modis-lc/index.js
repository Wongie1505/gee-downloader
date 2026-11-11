// MODIS yearly land cover (IGBP classes), 2001 to 2024.

import legend from './legend.js';

export default {
  id: 'modis-lc',
  downloadReady: true,
  exports: { csv: true, geotiff: true },
  bandPrefix: 'landcover',
  nativeWgs84: false,
  slug: 'landcover_yearly',
  label: 'Land cover by year',
  blurb: 'Yearly maps from 2001 to 2024 at 500 m (MODIS).',
  collection: 'MODIS/061/MCD12Q1',
  band: 'LC_Type1',
  scale: 500,
  reducer: 'first',
  steps: ['yearly'],
  years: [2001, 2024],
  outputChoice: true,
  outputs: ['geotiff'],

  // Exported as a CSV next to the map, so the class codes can be read
  legend,
  csvNote: 'Area of each land cover class in km2, one row per class and year, for the exact shape of your area.',

  source: 'MODIS, NASA',
  coverage: '2001 to 2024',
  detail: '500 m pixels',
  unit: 'Land cover class codes',
  caveat: 'Pixels are 500 m wide, so it suits districts and regions better than small sites.',
  sample: {
    header: ['year', 'class_code', 'class_name', 'area_km2'],
    rows: [['2001', '12', 'Croplands', '1204.5'], ['2001', '10', 'Grasslands', '830.2'], ['2001', '13', 'Urban and built-up lands', '38.1']]
  }
};