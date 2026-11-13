// SRTM elevation, a single 30 m image.

export default {
  id: 'srtm',
  downloadReady: true,
  exports: { csv: false, geotiff: true },
  sourceKind: 'image',
  // Marks cells outside the area in an exact clip
  noData: -9999,

  slug: 'elevation',
  label: 'Elevation',
  blurb: 'Height above sea level at 30 m (SRTM).',
  collection: 'USGS/SRTMGL1_003',
  band: 'elevation',
  scale: 30,
  reducer: null,
  steps: [],
  years: null,
  outputChoice: false,
  outputs: ['geotiff'],

  source: 'SRTM, NASA and USGS',
  coverage: '2000, one map',
  detail: '30 m pixels',
  unit: 'Metres above sea level',
  caveat: 'Heights can read slightly high under forest or buildings.',
  sample: null
};