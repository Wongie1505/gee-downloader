// Pure data, no DOM. Verify every ID in the EE catalog before relying on it.
//
// exports:       which outputs the engine can really produce for this dataset
// sourceKind:    'collection' (default) or 'image' for a single image
// bandPrefix:    start of each band name in a multiband map file
// nativeWgs84:   false means the data is in another projection and is
//                converted to plain lat/lon on export

const thisYear = new Date().getFullYear();

export const datasets = [
  {
    id: 'chirps',
    downloadReady: true,
    exports: { csv: true, geotiff: true },
    valueColumn: 'rainfall_mm',
    bandPrefix: 'rainfall_mm',
    slug: 'rainfall',
    label: 'Rainfall',
    blurb: 'Daily rainfall since 1981. Pixels are about 5.5 km wide.',
    collection: 'UCSB-CHG/CHIRPS/DAILY',
    band: 'precipitation',
    scale: 5566,
    reducer: 'sum',
    steps: ['daily', 'monthly', 'yearly'],
    years: [1981, thisYear],
    outputChoice: true,
    outputs: ['csv'],

    // Shown in the info card
    source: 'CHIRPS, UC Santa Barbara',
    coverage: '1981 to present',
    detail: '5.5 km pixels',
    unit: 'Millimetres of rain',
    caveat: 'Pixels are about 5.5 km wide, so a small area covers only a few of them.',
    sample: { header: ['period', 'rainfall_mm'], values: ['212.4', '187.9', '140.2'] }
  },
  {
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
  },
  {
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
  },
  {
    id: 'modis-lc',
    downloadReady: true,
    exports: { csv: false, geotiff: true },
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
    outputChoice: false,
    outputs: ['geotiff'],

    source: 'MODIS, NASA',
    coverage: '2001 to 2024',
    detail: '500 m pixels',
    unit: 'Land cover class codes',
    caveat: 'Pixels are 500 m wide, so it suits districts and regions better than small sites.',
    sample: {
      header: ['class', 'area_km2'],
      rows: [['Cropland', '1204.5'], ['Grassland', '830.2'], ['Built-up', '38.1']]
    }
  },
  {
    id: 'srtm',
    downloadReady: true,
    exports: { csv: false, geotiff: true },
    sourceKind: 'image',
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
  }
];

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