// Reads a GeoJSON file or a zipped shapefile into one GeoJSON Feature.
// No DOM in here. The shapefile reader is the global shp from vendor/shp.

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function readAreaFile(file) {
  const name = file.name.toLowerCase();

  if (file.size > MAX_FILE_BYTES) {
    throw new Error('That file is over 15 MB. Simplify it and try again.');
  }

  let data = null;

  if (name.endsWith('.zip')) {
    data = await readShapefile(file);
  } else if (name.endsWith('.geojson') || name.endsWith('.json')) {
    data = await readGeoJson(file);
  } else {
    throw new Error('Use a .geojson file, or a .zip that holds a shapefile.');
  }

  return toFeature(data);
}

async function readGeoJson(file) {
  try {
    return JSON.parse(await file.text());
  } catch (error) {
    throw new Error('That file is not valid GeoJSON.');
  }
}

async function readShapefile(file) {
  if (typeof shp !== 'function') {
    throw new Error('The shapefile reader did not load. Reload the page and try again.');
  }

  try {
    return await shp(await file.arrayBuffer());
  } catch (error) {
    throw new Error('Could not read the shapefile. Zip the .shp, .dbf and .prj files together.');
  }
}

// Walk any GeoJSON shape and gather every geometry inside it
function collect(node, found) {
  if (!node) {
    return found;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collect(item, found));
  } else if (node.type === 'FeatureCollection') {
    collect(node.features, found);
  } else if (node.type === 'Feature') {
    collect(node.geometry, found);
  } else if (node.type === 'GeometryCollection') {
    collect(node.geometries, found);
  } else {
    found.push(node);
  }

  return found;
}

// Merge every polygon into a single MultiPolygon feature
function toFeature(data) {
  const polygons = [];

  collect(data, []).forEach((geometry) => {
    if (geometry.type === 'Polygon') {
      polygons.push(geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
      polygons.push(...geometry.coordinates);
    }
  });

  if (polygons.length === 0) {
    throw new Error('No polygons found. The file has points or lines only.');
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'MultiPolygon', coordinates: polygons }
  };
}
