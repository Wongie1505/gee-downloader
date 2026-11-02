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
