// MODIS NDVI. Not ready yet, it still needs the 0.0001 scale factor (phase 5b).

const thisYear = new Date().getFullYear();

export default {
  id: 'modis-ndvi',
  downloadReady: false,
  exports: { csv: false, geotiff: false },
  bandPrefix: 'ndvi',
  nativeWgs84: false,
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
  coverage: '2000 to present',
  detail: '250 m pixels',
  unit: 'Index from -1 to 1',
  caveat: 'Heavy cloud in the rainy season can leave gaps or low values.',
  sample: { header: ['period', 'ndvi_mean'], values: ['0.61', '0.58', '0.54'] }
};
