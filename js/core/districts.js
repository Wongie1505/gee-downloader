// Loads the bundled district boundaries and checks them. No DOM in here.

import { areaKm2 } from './geo.js';

const FILE = 'data/malawi-districts.geojson';




// Lowercase on purpose: field names are matched ignoring capitals
const NAME_KEYS = ['Name'];



let cached = null;

// Returns [{ name, feature }] sorted by name. Loaded once, then reused.
export function loadDistricts() {
  if (!cached) {
    cached = fetchDistricts().catch((error) => {
      // Do not cache a failure, so a retry can work
      cached = null;
      throw error;
    });
  }

  return cached;
}


// Finds the district name whatever the capitals: Name, NAME and name all work
function nameOf(properties = {}) {
  const fields = Object.keys(properties);

  for (const wanted of NAME_KEYS) {
    const field = fields.find((f) => f.toLowerCase() === wanted && properties[f]);

    if (field) {
      return String(properties[field]).trim();
    }
  }

  return null;
}

async function fetchDistricts() {
  const response = await fetch(FILE);

  if (!response.ok) {
    throw new Error(`Could not load ${FILE} (status ${response.status}).`);
  }

  const data = await response.json();
  const polygons = (data.features || []).filter(isPolygon);

  if (polygons.length === 0) {
    throw new Error(`${FILE} has no polygon features.`);
  }

  const districts = polygons
    .map((feature) => ({ name: nameOf(feature.properties), feature }))
    .filter((district) => district.name);

  if (districts.length === 0) {
    const fields = Object.keys(polygons[0].properties || {}).join(', ');

    throw new Error(`No name field found in ${FILE}. Fields present: ${fields || 'none'}.`);
  }

  // Keep only the name so the GeoJSON stays small in state
  districts.forEach((district) => {
    district.feature = {
      type: 'Feature',
      properties: { name: district.name },
      geometry: district.feature.geometry
    };
  });

  return districts.sort((a, b) => a.name.localeCompare(b.name));
}

// The biggest district (Mzimba) sets the size limit for uploaded areas
export function largestDistrict(districts) {
  return districts.reduce(
    (best, district) => {
      const km2 = areaKm2(district.feature.geometry);

      return km2 > best.km2 ? { name: district.name, km2 } : best;
    },
    { name: '', km2: 0 }
  );
}
