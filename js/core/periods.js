// Period maths with no DOM. Phase 4 adds the real date-range builder here.

// How many values the user will get for this range and grouping
export function countPeriods(range, timeStep) {
  const years = range.end - range.start + 1;

  if (timeStep === 'yearly') {
    return years;
  }

  if (timeStep === 'monthly') {
    return years * 12;
  }

  // Daily: count the real days from the first to the last day of the range
  const first = Date.UTC(range.start, 0, 1);
  const last = Date.UTC(range.end + 1, 0, 1);

  return Math.round((last - first) / 86400000);
}

// First few period labels, for the example file preview
export function sampleLabels(range, timeStep, count = 3) {
  const total = Math.min(count, countPeriods(range, timeStep));
  const labels = [];

  for (let i = 0; i < total; i += 1) {
    const n = String(i + 1).padStart(2, '0');

    if (timeStep === 'yearly') {
      labels.push(String(range.start + i));
    } else if (timeStep === 'monthly') {
      labels.push(`${range.start}-${n}`);
    } else {
      labels.push(`${range.start}-01-${n}`);
    }
  }

  return labels;
}

// More values than this makes the export very slow, so the Time step blocks it
export const MAX_PERIODS = 5000;

const UNITS = { daily: 'day', monthly: 'month', yearly: 'year' };
const LABEL_FORMATS = { daily: 'YYYY-MM-dd', monthly: 'YYYY-MM', yearly: 'YYYY' };

// Band names may only hold letters, digits and underscores
const BAND_FORMATS = { daily: 'YYYY_MM_dd', monthly: 'YYYY_MM', yearly: 'YYYY' };

// A map file holds one band per period, and too many bands make it fail
export const MAX_BANDS = 400;

// Everything Earth Engine needs to loop over the periods on its side
export function periodSpec(range, timeStep) {
  return {
    startDate: `${range.start}-01-01`,
    unit: UNITS[timeStep],
    format: LABEL_FORMATS[timeStep],
    bandFormat: BAND_FORMATS[timeStep],
    count: countPeriods(range, timeStep)
  };
}