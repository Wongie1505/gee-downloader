// MODIS NDVI, a 16-day composite at 250 m. Table and map files.

const thisYear = new Date().getFullYear();

export default {
  id: 'modis-ndvi',
  downloadReady: true,
  exports: { csv: true, geotiff: true },
  valueColumn: 'ndvi_mean',
  bandPrefix: 'ndvi',
  nativeWgs84: false,

  // Stored as whole numbers: real NDVI = stored value x 0.0001. Anything
  // outside -2000 to 10000 is a fill code and is hidden before averaging.
  scaleFactor: 0.0001,
  validRange: [-2000, 10000],

  // Marks cells outside the area in an exact clip
  noData: -9999,

  slug: 'ndvi',
  label: 'Vegetation (NDVI)',
  blurb: 'How green the land is, every 16 days at 250 m.',
  collection: 'MODIS/061/MOD13Q1',
  band: 'NDVI',
  scale: 250,
  reducer: 'mean',
  steps: ['monthly', 'yearly'],
  years: [2000, thisYear],
  outputChoice: true,
  outputs: ['csv'],

  source: 'MODIS, NASA',
  coverage: 'Feb 2000 to present',
  detail: '250 m pixels',
  unit: 'Index from -1 to 1',
  caveat: 'A 16-day composite counts in the month it starts. Cloudy rainy-season months can leave gaps.',
  sample: { header: ['period', 'ndvi_mean'], values: ['0.61', '0.58', '0.54'] }
};