// Land cover area table: how many km2 each class covers inside the exact area.
// One row per class and year. Classes with no pixels get 0, so every year has the same rows.
// Uses the global ee. Nothing here talks to the network, it only describes the job.

import { periodSpec } from './periods.js';
import { filePrefix } from './naming.js';
import { ENDPOINT, staticImage } from './export-build.js';

// Rows for one map: one feature per class in the legend
function classRows(image, region, dataset, year) {
  // Real ground area of every pixel in km2, grouped by the class value
  const stats = ee.Image.pixelArea()
    .divide(1e6)
    .addBands(image)
    .reduceRegion({
      reducer: ee.Reducer.sum().group({ groupField: 1, groupName: 'code' }),
      geometry: region,
      scale: dataset.scale,
      maxPixels: 1e10,
      tileScale: 4
    });

  const groups = ee.List(stats.get('groups'));
  const keys = groups.map((group) => ee.Number(ee.Dictionary(group).get('code')).format('%d'));
  const sums = groups.map((group) => ee.Dictionary(group).get('sum'));
  const areas = ee.Dictionary.fromLists(keys, sums);

  const rows = dataset.legend.map((item) => {
    // A class with no pixels in the area is missing from the groups, so it is 0
    const area = ee.Number(areas.get(String(item.code), 0));

    return ee.Feature(null, {
      year,
      class_code: item.code,
      class_name: item.name,
      area_km2: area.multiply(1000).round().divide(1000)
    });
  });

  return ee.List(rows);
}

// One map for one-off datasets, one map per year for yearly ones
function buildRows(dataset, region, range) {
  if (!dataset.years) {
    return classRows(staticImage(dataset), region, dataset, dataset.mapYear);
  }

  const spec = periodSpec(range, 'yearly');
  const first = ee.Date(spec.startDate);
  const collection = ee.ImageCollection(dataset.collection).select(dataset.band);

  return ee.List.sequence(0, spec.count - 1)
    .map((index) => {
      const start = first.advance(index, 'year');
      const inPeriod = collection.filterDate(start, start.advance(1, 'year'));
      const image = ee.Image(inPeriod.first());

      // A year with no map (the future) gives no rows
      return ee.Algorithms.If(inPeriod.size().gt(0), classRows(image, region, dataset, start.get('year')), ee.List([]));
    })
    .flatten();
}

export function buildAreaRequest({ dataset, area, range, folderName, projectId }) {
  const region = ee.Geometry(area.feature.geometry, null, false);
  const table = ee.FeatureCollection(buildRows(dataset, region, range));
  const name = `${filePrefix(folderName)}_areas`;

  return {
    url: `${ENDPOINT}/projects/${projectId}/table:export`,
    body: {
      expression: JSON.parse(ee.Serializer.toCloudApiJSON(table)),
      description: `gd_${name}`,
      fileExportOptions: {
        fileFormat: 'CSV',
        driveDestination: { folder: folderName, filenamePrefix: name }
      },
      selectors: ['year', 'class_code', 'class_name', 'area_km2'],
      requestId: crypto.randomUUID()
    }
  };
}