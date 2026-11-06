// Checks and cleans an uploaded area before it can be used. No DOM in here.

import { areaKm2, formatNumber } from './geo.js';

const MAX_VERTICES = 20000;
const SCALE = 100000; // 5 decimal places, about 1 m

function round(value) {
  return Math.round(value * SCALE) / SCALE;
}

// Keep lon and lat only, round them, and make sure the ring is closed
function cleanRing(ring) {
  const points = ring.map((position) => {
    const lon = Number(position[0]);
    const lat = Number(position[1]);

    if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) {
      throw new Error(
        'The coordinates are not in degrees. Include the .prj file in the zip, or export the data as WGS84 (EPSG:4326).'
      );
    }

    return [round(lon), round(lat)];
  });

  const first = points[0];
  const last = points[points.length - 1];

  if (first && (first[0] !== last[0] || first[1] !== last[1])) {
    points.push([first[0], first[1]]);
  }

  if (points.length < 4) {
    throw new Error('A shape has too few points to be a polygon.');
  }

  return points;
}

function countVertices(polygons) {
  return polygons.reduce(
    (total, rings) => total + rings.reduce((sum, ring) => sum + ring.length, 0),
    0
  );
}

// limit is { name, km2 }. Returns the cleaned feature and its area.
export function prepareArea(feature, limit) {
  const coordinates = feature.geometry.coordinates.map((rings) => rings.map(cleanRing));
  const vertices = countVertices(coordinates);

  if (vertices > MAX_VERTICES) {
    throw new Error(
      `This shape has ${formatNumber(vertices)} points. Simplify it to under ${formatNumber(MAX_VERTICES)} in QGIS and try again.`
    );
  }

  const geometry = { type: 'MultiPolygon', coordinates };
  const km2 = areaKm2(geometry);

  if (!(km2 > 0)) {
    throw new Error('This shape has no area. Check that the file holds polygons.');
  }

  if (km2 > limit.km2) {
    throw new Error(
      `This area is ${formatNumber(km2)} km\u00b2. The limit is ${formatNumber(limit.km2)} km\u00b2, the size of ${limit.name}.`
    );
  }

  return { feature: { type: 'Feature', properties: {}, geometry }, km2 };
}
