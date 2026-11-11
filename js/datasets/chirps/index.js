// CHIRPS rainfall. Config only, the shared engine lives in js/core/.

const thisYear = new Date().getFullYear();

export default {
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
};
