# GEE Downloader

Earth Engine data for people who do not write code.

Pick a dataset, pick an area in Malawi, press Download. The files land in your own Google Drive. There is no script to run, and no clicking Run 300 times for a monthly series.

Built by Wakuzilwa Ms, final-year GIS student at the Malawi University of Science and Technology (MUST), for the Earth Sciences department creativity competition.

## Why this exists

The Earth Engine Code Editor is powerful, but you have to write JavaScript to use it. And if you want one rainfall map per month for ten years, that is 120 runs, each with a manual export click. That is where many people give up.

This site does the same work behind a short wizard. It is a static page with no server of mine in the middle. You log in with your own Earth Engine account, and the exports run in your own Earth Engine project, into your own Drive.

## What it does

Five datasets:

| Dataset | Source | Resolution | Outputs |
|---|---|---|---|
| Rainfall | CHIRPS daily | 5.5 km | CSV, GeoTIFF |
| Vegetation (NDVI) | MODIS MOD13Q1 | 250 m | CSV, GeoTIFF |
| Land cover 2021 | ESA WorldCover v200 | 10 m | GeoTIFF, area table |
| Land cover by year, 2001 to 2024 | MODIS MCD12Q1 | 500 m | GeoTIFF, area table |
| Elevation | SRTM | 30 m | GeoTIFF |

Areas: pick any of the 32 districts of Malawi, upload a GeoJSON or a zipped shapefile, or draw a rectangle or polygon on the map. Uploads and drawings are capped at the size of Mzimba, the largest district.

Time steps: daily, monthly or yearly, where the dataset allows it.

Things worth knowing about the output:

- A series of maps can be saved as one file per period (for example `Rainfall_2023-2026-Dedza_2023-01.tif`) or as one multiband file. Separate files are the default. A download is capped at 400 files, and periods with no data are skipped instead of failing.
- Land cover maps come with a legend CSV (code, name, colour, a plain sentence on what the class means).
- Land cover also has an area table: km2 per class and year, measured inside the exact shape of your area, with zero rows for absent classes.
- NDVI is scaled to real values (0.0001 factor) and fill codes are hidden before averaging.
- Each download goes into one Drive folder named like `GEE-Downloader_Rainfall_2023-2026-Dedza`. Earth Engine cannot make nested folders, so the prefix keeps them together.
- Progress is real, taken from Earth Engine, and a panel slides in from the right with the latest download. If some files fail, they are named and a Retry button sends only those again.
- My downloads lists every export this app has sent, found by the `gd_` prefix on the task name. It also shows downloads from earlier visits.
- A Demo button lets you walk through the wizard without logging in. Nothing is downloaded in demo mode.

## How it works

- Plain HTML, CSS and JavaScript with ES modules. No framework, no bundler, no backend.
- Login uses Google OAuth in the browser. The token stays in `sessionStorage` and refreshes quietly before it expires.
- The browser build of the Earth Engine library has no `ee.batch`, so exports are sent as REST calls (`image:export` and `table:export`) with `fetch`. Each request carries a `requestId`, so a retry after a dropped connection cannot start the same export twice.
- Many maps mean many tasks. They are sent five at a time, and one failed file never stops the rest. Progress for large downloads comes from one `listOperations` call instead of one request per task.
- Each dataset has its own folder in `js/datasets/` with its settings, legend and preview picture. The shared export engine is in `js/core/`.

```
index.html          the only page
css/                styles
js/
  main.js           start-up
  router.js         #home  #about  #app  #downloads
  state.js          shared state and a small event bus
  core/             logic with no page code (auth, exports, periods, area table, monitoring)
  datasets/         one folder per dataset: index.js, legend.js where needed, preview.png
  data/catalog.js   the list of datasets
  screens/          login dialog, wizard steps, My downloads
  ui/               map, cards, progress panel
data/               Malawi district boundaries (GeoJSON)
vendor/             Leaflet and shpjs, with their licences in LICENSES.md
tests/smoke.html    a standalone page that exports one DEM to your Drive
```

## Try it

Demo: open the site and press Demo.

Real use needs a Google Earth Engine account with a Cloud project registered for noncommercial use. The app is in Google's Testing mode, so only people on my test-user list can log in. To use it yourself, run your own copy:

1. Clone the repo.
2. In Google Cloud, make an OAuth client of type Web application. Add `http://localhost:5500` and `http://127.0.0.1:5500` as authorised JavaScript origins.
3. Put the client ID in `js/config.js`.
4. Serve the folder on port 5500 (the VS Code Live Server extension does this) and open it from there. Opening `index.html` straight from disk does not work, because browsers block ES modules on `file://`.
5. Log in with the ID of your own Earth Engine Cloud project.

## Known limits

- It is for Malawi. The district picker and the previews are built around it, although an uploaded area can be anywhere inside the size cap.
- OpenStreetMap tiles are fine for a demo, not for heavy traffic.
- My downloads checks the latest 500 jobs in your project.
- Retry only works for the download you just ran, because the original choices are kept in memory.
- NDVI is not filtered by the quality flag, so cloudy rainy-season months can be noisy or empty.

## Data credits

- Rainfall: CHIRPS, Climate Hazards Center, UC Santa Barbara.
- NDVI and yearly land cover: MODIS, NASA.
- Land cover 2021: ESA WorldCover 2021 v200, licensed CC BY 4.0.
- Elevation: SRTM, NASA and USGS.
- Base map: OpenStreetMap contributors.

Libraries I did not write are listed with their licences in `vendor/LICENSES.md`. Leaflet draws the maps and shpjs reads shapefiles.