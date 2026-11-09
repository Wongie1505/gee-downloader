// Small geometry helpers with no DOM and no libraries

const EARTH_RADIUS_KM = 6371.0088;

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

// Spherical area of one ring in km2 (same method Turf uses)
function ringArea(ring) {
  let total = 0;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];

    total += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }

  return Math.abs((total * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2);
}

// First ring is the outline, the rest are holes
function polygonArea(rings) {
  const [outline, ...holes] = rings;
  const holeArea = holes.reduce((sum, hole) => sum + ringArea(hole), 0);

  return ringArea(outline) - holeArea;
}

export function areaKm2(geometry) {
  if (geometry.type === 'Polygon') {
    return polygonArea(geometry.coordinates);
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.reduce((sum, polygon) => sum + polygonArea(polygon), 0);
  }

  return 0;
}

// 12345.6 becomes "12,346"
export function formatNumber(value) {
  return Math.round(value).toLocaleString('en');
}

// Walk any polygon coordinates and find the rectangle around them
export function bboxOf(geometry) {
  const box = { west: 180, south: 90, east: -180, north: -90 };

  function visit(node) {
    if (typeof node[0] === 'number') {
      box.west = Math.min(box.west, node[0]);
      box.east = Math.max(box.east, node[0]);
      box.south = Math.min(box.south, node[1]);
      box.north = Math.max(box.north, node[1]);
      return;
    }

    node.forEach(visit);
  }

  visit(geometry.coordinates);

  return box;
}

// How many pixels fit in the rectangle around the area at this pixel size
export function estimatePixels(geometry, scaleMeters) {
  const box = bboxOf(geometry);
  const midLat = (box.south + box.north) / 2;
  const widthM = (box.east - box.west) * 111320 * Math.cos(toRad(midLat));
  const heightM = (box.north - box.south) * 110574;

  return Math.ceil(widthM / scaleMeters) * Math.ceil(heightM / scaleMeters);
}