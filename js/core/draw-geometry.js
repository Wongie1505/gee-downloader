// Geometry helpers for the Draw tool. Points are [lon, lat]. No DOM, no Leaflet.

// An open ring around the rectangle that two opposite corners make
export function rectangleRing(a, b) {
  const west = Math.min(a[0], b[0]);
  const east = Math.max(a[0], b[0]);
  const south = Math.min(a[1], b[1]);
  const north = Math.max(a[1], b[1]);

  return [[west, south], [east, south], [east, north], [west, north]];
}

// Which side of the line o to a the point b is on
function side(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

// True when two segments cross each other in the middle.
// Segments that only touch at an end are not counted.
function segmentsCross(p1, p2, p3, p4) {
  return side(p3, p4, p1) * side(p3, p4, p2) < 0 && side(p1, p2, p3) * side(p1, p2, p4) < 0;
}

// Does the outline cross itself? closed adds the last-to-first side.
export function crossesItself(points, closed) {
  const sides = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    sides.push([points[i], points[i + 1]]);
  }

  if (closed && points.length > 2) {
    sides.push([points[points.length - 1], points[0]]);
  }

  for (let i = 0; i < sides.length; i += 1) {
    // Neighbouring sides share a point, so start two further on
    for (let j = i + 2; j < sides.length; j += 1) {
      const wraps = closed && i === 0 && j === sides.length - 1;

      if (!wraps && segmentsCross(sides[i][0], sides[i][1], sides[j][0], sides[j][1])) {
        return true;
      }
    }
  }

  return false;
}

// The shape the rest of the app expects: a Feature with a MultiPolygon
export function toFeature(ring) {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'MultiPolygon', coordinates: [[[...ring, ring[0]]]] }
  };
}