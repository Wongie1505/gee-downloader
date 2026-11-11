// ESA WorldCover 2021, one 10 m land cover map.

export default {
  id: 'worldcover',
  downloadReady: true,
  exports: { csv: false, geotiff: true },
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
  outputChoice: false,

  // The area table (csv) arrives in a later update
  outputs: ['geotiff'],

  source: 'ESA WorldCover',
  coverage: '2021, one map',
  detail: '10 m pixels',
  unit: 'Land cover class codes',
  caveat: 'A single snapshot, so it cannot show change over time.',
  sample: {
    header: ['class', 'area_km2'],
    rows: [['Cropland', '1204.5'], ['Grassland', '830.2'], ['Built-up', '38.1']]
  }
};
