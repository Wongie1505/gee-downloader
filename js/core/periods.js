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

// Separate files mean one Earth Engine task per period. Each project can queue
// 3000, so this stays far below that and keeps one download manageable.
export const MAX_FILES = 400;

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

// Every period's label, in order, for file names: 2023, 2023-01, 2023-01-31
export function periodLabels(range, timeStep) {
  const total = countPeriods(range, timeStep);
  const labels = [];

  for (let i = 0; i < total; i += 1) {
    if (timeStep === 'yearly') {
      labels.push(String(range.start + i));
    } else if (timeStep === 'monthly') {
      const year = range.start + Math.floor(i / 12);
      const month = String((i % 12) + 1).padStart(2, '0');

      labels.push(`${year}-${month}`);
    } else {
      // January 1 plus i days, in UTC so the time zone cannot shift the date
      labels.push(new Date(Date.UTC(range.start, 0, 1 + i)).toISOString().slice(0, 10));
    }
  }

  return labels;
}