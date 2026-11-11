// Builds Earth Engine requests for table (CSV) and map (GeoTIFF) exports.
// Uses the global ee. Nothing here talks to the network, it only describes jobs.

import { periodSpec, MAX_BANDS } from './periods.js';
import { estimatePixels, formatNumber } from './geo.js';
import { filePrefix } from './naming.js';

const ENDPOINT = 'https://earthengine.googleapis.com/v1';

// Pixels times bands above this is too big to export in one file
const MAX_RASTER_VALUES = 500e6;

// A problem the user can fix, shown as plain words
export class RequestError extends Error {}

// Merge all images of one period into one image
function combine(inPeriod, reducer) {
  if (reducer === 'mean') {
    return inPeriod.mean();
  }

  // Class maps have one image per year, so take it as it is
  if (reducer === 'first') {
    return ee.Image(inPeriod.first());
  }

  return inPeriod.sum();
}

// ---- Table: one row per period, the value averaged over the area ----

function buildSeries(dataset, region, spec) {
  const column = dataset.valueColumn;
  const first = ee.Date(spec.startDate);
  const collection = ee.ImageCollection(dataset.collection).select(dataset.band);

  // Runs on Google's servers, so a long series stays one small request
  const rows = ee.List.sequence(0, spec.count - 1).map((index) => {
    const start = first.advance(index, spec.unit);
    const end = start.advance(1, spec.unit);
    const inPeriod = collection.filterDate(start, end);
    const stats = combine(inPeriod, dataset.reducer).reduceRegion({
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

export function buildTableRequest({ dataset, area, range, timeStep, folderName, projectId }) {
  const spec = periodSpec(range, timeStep);

  // Planar edges, so a big district is not bent along great circles
  const region = ee.Geometry(area.feature.geometry, null, false);
  const table = buildSeries(dataset, region, spec);

  return {
    url: `${ENDPOINT}/projects/${projectId}/table:export`,
    body: {
      expression: JSON.parse(ee.Serializer.toCloudApiJSON(table)),
      description: `gd_${filePrefix(folderName)}_table`,
      fileExportOptions: {
        fileFormat: 'CSV',
        driveDestination: { folder: folderName, filenamePrefix: filePrefix(folderName) }
      },
      selectors: ['period', dataset.valueColumn],
      requestId: crypto.randomUUID()
    }
  };
}

// ---- Map file: one band per period, or a single band for one-off maps ----

function staticImage(dataset) {
  if (dataset.sourceKind === 'image') {
    return ee.Image(dataset.collection).select(dataset.band);
  }

  return ee.ImageCollection(dataset.collection).select(dataset.band).mosaic();
}

function stackPeriods(dataset, spec) {
  const first = ee.Date(spec.startDate);
  const collection = ee.ImageCollection(dataset.collection).select(dataset.band);
  const indexes = ee.List.sequence(0, spec.count - 1);

  // Periods with no images are dropped, in the pictures and in the names alike
  const images = indexes
    .map((index) => {
      const start = first.advance(index, spec.unit);
      const inPeriod = collection.filterDate(start, start.advance(1, spec.unit));
      const name = ee.String(`${dataset.bandPrefix}_`).cat(start.format(spec.bandFormat));
      const image = combine(inPeriod, dataset.reducer).rename(ee.List([name]));

      return ee.Algorithms.If(inPeriod.size().gt(0), image, null);
    })
    .removeAll([null]);

  const names = indexes
    .map((index) => {
      const start = first.advance(index, spec.unit);
      const inPeriod = collection.filterDate(start, start.advance(1, spec.unit));
      const name = ee.String(`${dataset.bandPrefix}_`).cat(start.format(spec.bandFormat));

      return ee.Algorithms.If(inPeriod.size().gt(0), name, null);
    })
    .removeAll([null]);

  return ee.ImageCollection.fromImages(images).toBands().rename(names);
}

function finishRaster(dataset, region, source) {
  let image = source;

  // Other projections become plain lat/lon. Nearest neighbour keeps class codes intact.
  if (dataset.nativeWgs84 === false) {
    image = image.reproject('EPSG:4326', null, dataset.scale);
  }

  // The file covers the rectangle around the area. Cutting to the exact
  // shape would write zeros outside it, which look like real data.
  return image.clipToBoundsAndScale(region, null, null, null, dataset.scale);
}

function buildRaster(dataset, region, spec) {
  return finishRaster(dataset, region, spec ? stackPeriods(dataset, spec) : staticImage(dataset));
}

// Too many values in one file makes Earth Engine refuse it
function checkSize(area, dataset, bands) {
  const values = estimatePixels(area.feature.geometry, dataset.scale) * bands;

  if (values > MAX_RASTER_VALUES) {
    throw new RequestError(
      `This map file would hold about ${formatNumber(values)} values, over the limit of ${formatNumber(MAX_RASTER_VALUES)}. Choose a smaller area or fewer periods.`
    );
  }
}

export function buildImageRequest({ dataset, area, range, timeStep, folderName, projectId }) {
  const spec = dataset.years ? periodSpec(range, timeStep) : null;
  const bands = spec ? spec.count : 1;

  if (bands > MAX_BANDS) {
    throw new RequestError(`A map file holds up to ${MAX_BANDS} values. Choose fewer periods, or table only.`);
  }

  checkSize(area, dataset, bands);

  const region = ee.Geometry(area.feature.geometry, null, false);
  const image = buildRaster(dataset, region, spec);

  return {
    url: `${ENDPOINT}/projects/${projectId}/image:export`,
    body: {
      expression: JSON.parse(ee.Serializer.toCloudApiJSON(image)),
      description: `gd_${filePrefix(folderName)}_map`,
      fileExportOptions: {
        fileFormat: 'GEO_TIFF',
        driveDestination: { folder: folderName, filenamePrefix: filePrefix(folderName) }
      },
      maxPixels: '10000000000',
      requestId: crypto.randomUUID()
    }
  };
}

// ---- Separate files: one map per period, each its own Earth Engine task ----

// One period as its own single-band image
function periodImage(dataset, spec, period) {
  const start = ee.Date(spec.startDate).advance(period.index, spec.unit);
  const inPeriod = ee
    .ImageCollection(dataset.collection)
    .select(dataset.band)
    .filterDate(start, start.advance(1, spec.unit));

  const bandName = `${dataset.bandPrefix}_${period.label.replace(/-/g, '_')}`;

  return combine(inPeriod, dataset.reducer).rename([bandName]);
}

export function buildPeriodRequest({ dataset, area, range, timeStep, folderName, projectId, period }) {
  const spec = periodSpec(range, timeStep);

  checkSize(area, dataset, 1);

  const region = ee.Geometry(area.feature.geometry, null, false);
  const image = finishRaster(dataset, region, periodImage(dataset, spec, period));
  const name = `${filePrefix(folderName)}_${period.label}`;

  return {
    url: `${ENDPOINT}/projects/${projectId}/image:export`,
    body: {
      expression: JSON.parse(ee.Serializer.toCloudApiJSON(image)),
      description: `gd_${name}`,
      fileExportOptions: {
        fileFormat: 'GEO_TIFF',
        driveDestination: { folder: folderName, filenamePrefix: name }
      },
      maxPixels: '10000000000',
      requestId: crypto.randomUUID()
    }
  };
}

// ---- Legend: a small CSV that explains the class codes of a land cover map ----

export function buildLegendRequest({ dataset, folderName, projectId }) {
  const prefix = filePrefix(folderName);

  // A fixed list, so Earth Engine does no real computing for this file
  const rows = dataset.legend.map((item) =>
    ee.Feature(null, {
      code: item.code,
      name: item.name,
      color_hex: item.color,
      description: item.description
    })
  );

  return {
    url: `${ENDPOINT}/projects/${projectId}/table:export`,
    body: {
      expression: JSON.parse(ee.Serializer.toCloudApiJSON(ee.FeatureCollection(rows))),
      description: `gd_${prefix}_legend`,
      fileExportOptions: {
        fileFormat: 'CSV',
        driveDestination: { folder: folderName, filenamePrefix: `${prefix}_legend` }
      },
      selectors: ['code', 'name', 'color_hex', 'description'],
      requestId: crypto.randomUUID()
    }
  };
}