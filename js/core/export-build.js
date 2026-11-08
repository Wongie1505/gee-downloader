// Builds the Earth Engine request for a table (CSV) export. Uses the global ee.
// Nothing here talks to the network, it only describes the job.

import { periodSpec } from './periods.js';

const ENDPOINT = 'https://earthengine.googleapis.com/v1';

// One row per period: the dataset value for that period, averaged over the area
function buildSeries(dataset, region, spec) {
  const column = dataset.valueColumn;
  const first = ee.Date(spec.startDate);
  const collection = ee.ImageCollection(dataset.collection).select(dataset.band);

  // Runs on Google's servers, so a long series stays one small request
  const rows = ee.List.sequence(0, spec.count - 1).map((index) => {
    const start = first.advance(index, spec.unit);
    const end = start.advance(1, spec.unit);
    const inPeriod = collection.filterDate(start, end);

    // Rain adds up over a period, vegetation is averaged
    const combined = dataset.reducer === 'mean' ? inPeriod.mean() : inPeriod.sum();

    const stats = combined.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: region,
      scale: dataset.scale,
      maxPixels: 1e9
    });

    // A period with no images (the future, or a gap) gives no row
    const value = ee.Algorithms.If(inPeriod.size().gt(0), stats.get(dataset.band), null);

    return ee.Feature(null, {
      period: start.format(spec.format),
      [column]: value
    });
  });

  return ee.FeatureCollection(rows).filter(ee.Filter.notNull([column]));
}

// Returns { url, body } ready to POST. Folder name and file name use the
// folder the user typed, the task description starts with gd_ so My downloads
// can find our jobs later.
export function buildTableRequest({ dataset, area, range, timeStep, folderName, projectId }) {
  const spec = periodSpec(range, timeStep);

  // Planar edges, so a big district is not bent along great circles
  const region = ee.Geometry(area.feature.geometry, null, false);
  const table = buildSeries(dataset, region, spec);

  return {
    url: `${ENDPOINT}/projects/${projectId}/table:export`,
    body: {
      expression: JSON.parse(ee.Serializer.toCloudApiJSON(table)),
      description: `gd_${folderName}`,
      fileExportOptions: {
        fileFormat: 'CSV',
        driveDestination: { folder: folderName, filenamePrefix: folderName }
      },
      selectors: ['period', dataset.valueColumn],
      requestId: crypto.randomUUID()
    }
  };
}