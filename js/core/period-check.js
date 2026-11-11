// Asks Earth Engine which periods really have images, so empty ones
// (a month in the future, a gap in the data) are skipped instead of failing.

const TIMEOUT_MS = 90000;

// Resolves to a list of period numbers, counting from 0
export function periodsWithData(dataset, spec) {
  return new Promise((resolve, reject) => {
    // A stalled connection must not leave the page waiting forever
    const timer = setTimeout(() => reject(new Error('Earth Engine took too long to answer. Try again.')), TIMEOUT_MS);

    const first = ee.Date(spec.startDate);
    const collection = ee.ImageCollection(dataset.collection).select(dataset.band);

    const found = ee.List.sequence(0, spec.count - 1)
      .map((index) => {
        const start = first.advance(index, spec.unit);
        const size = collection.filterDate(start, start.advance(1, spec.unit)).size();

        return ee.Algorithms.If(size.gt(0), index, null);
      })
      .removeAll([null]);

    found.evaluate((indexes, error) => {
      clearTimeout(timer);

      if (error) {
        reject(new Error(String(error)));
        return;
      }

      resolve(indexes.map(Number));
    });
  });
}