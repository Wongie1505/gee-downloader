// Draw an area on the Leaflet map: a rectangle (two clicks) or a polygon
// (a click per corner). Leaflet is a global (L). The wizard step owns the buttons.

import { rectangleRing, crossesItself, toFeature } from '../core/draw-geometry.js';
import { areaKm2 } from '../core/geo.js';

const SHAPE_STYLE = { color: '#2f6b4f', weight: 3, dashArray: '6 6', fillOpacity: 0.12 };
const DOT_STYLE = { radius: 5, color: '#2f6b4f', weight: 2, fillColor: '#ffffff', fillOpacity: 1 };

// A click this close (in pixels) to the first corner closes the polygon
const CLOSE_PIXELS = 12;

// shape is 'rectangle' or 'polygon'. handlers:
//   onChange({ points, km2 })  after every click, km2 is 0 until there is a shape
//   onError(message)           a click or finish that cannot be used
//   accept(feature)            returns null to take the area, or a message to keep drawing
// Returns { undo, finish, cancel }.
export function startDrawing(map, shape, handlers) {
  const layer = L.layerGroup().addTo(map);
  const container = map.getContainer();
  let points = [];
  let hover = null;

  container.classList.add('is-drawing');
  map.doubleClickZoom.disable();

  // Longitudes past the date line are wrapped back into -180 to 180
  function pointOf(latlng) {
    const wrapped = latlng.wrap();

    return [wrapped.lng, wrapped.lat];
  }

  const flip = (point) => [point[1], point[0]];

  // The outline as it stands, or null while there is not enough for a shape
  function currentRing() {
    if (shape === 'rectangle') {
      const corner = points[1] || hover;

      return points.length > 0 && corner ? rectangleRing(points[0], corner) : null;
    }

    return points.length >= 3 ? points : null;
  }

  function measure() {
    const ring = currentRing();

    return ring ? areaKm2(toFeature(ring).geometry) : 0;
  }

  function redraw() {
    layer.clearLayers();

    const ring = currentRing();

    if (ring) {
      L.polygon(ring.map(flip), SHAPE_STYLE).addTo(layer);
    } else if (points.length > 0) {
      L.polyline([...points, ...(hover ? [hover] : [])].map(flip), SHAPE_STYLE).addTo(layer);
    }

    points.forEach((point) => L.circleMarker(flip(point), DOT_STYLE).addTo(layer));
  }

  function changed() {
    redraw();
    handlers.onChange({ points: points.length, km2: measure() });
  }

  function stop() {
    layer.remove();
    map.off('click', onClick);
    map.off('mousemove', onMove);
    document.removeEventListener('keydown', onKey);
    container.classList.remove('is-drawing');
    map.doubleClickZoom.enable();
  }

  function finish() {
    const ring = currentRing();

    if (!ring) {
      handlers.onError(shape === 'rectangle' ? 'Click two opposite corners.' : 'Click at least 3 corners first.');
      return;
    }

    if (crossesItself(ring, true)) {
      handlers.onError('The outline crosses itself. Undo the last point and try again.');
      return;
    }

    // The step checks the size. If it says no, drawing carries on so the user can undo.
    const refusal = handlers.accept(toFeature(ring));

    if (refusal) {
      handlers.onError(refusal);
      return;
    }

    stop();
  }

  function onClick(event) {
    const point = pointOf(event.latlng);

    if (shape === 'rectangle') {
      if (points.length === 0) {
        points = [point];
        changed();
        return;
      }

      if (point[0] === points[0][0] || point[1] === points[0][1]) {
        handlers.onError('Those two corners are in a line. Click a corner away from the first one.');
        return;
      }

      points = [points[0], point];
      finish();
      return;
    }

    // Clicking the first corner again closes the polygon
    if (points.length >= 3) {
      const first = map.latLngToContainerPoint(flip(points[0]));
      const here = map.latLngToContainerPoint(event.latlng);

      if (first.distanceTo(here) <= CLOSE_PIXELS) {
        finish();
        return;
      }
    }

    if (crossesItself([...points, point], false)) {
      handlers.onError('That point would make the outline cross itself.');
      return;
    }

    points.push(point);
    changed();
  }

  function onMove(event) {
    hover = pointOf(event.latlng);

    // Only the rubber band moves, the area readout waits for a click
    redraw();
  }

  function onKey(event) {
    if (event.key === 'Escape') {
      stop();
    }
  }

  map.on('click', onClick);
  map.on('mousemove', onMove);
  document.addEventListener('keydown', onKey);

  return {
    // Removes the last corner
    undo() {
      points.pop();
      changed();
    },
    finish,
    cancel: stop
  };
}