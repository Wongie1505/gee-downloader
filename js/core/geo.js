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
