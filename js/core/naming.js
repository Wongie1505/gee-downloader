// Drive folder and file names. Earth Engine cannot make nested Drive folders,
// so every download gets one flat folder that starts with the same prefix.

export const FOLDER_PREFIX = 'GEE-Downloader_';

// Files inside the folder skip the prefix, so names stay short:
// GEE-Downloader_Rainfall_2023-2026-Dedza -> Rainfall_2023-2026-Dedza
export function filePrefix(folderName) {
  if (folderName.startsWith(FOLDER_PREFIX) && folderName.length > FOLDER_PREFIX.length) {
    return folderName.slice(FOLDER_PREFIX.length);
  }

  return folderName;
}

// The file the user will look for in Drive. Drive adds the extension itself.
export function driveFileName(kind, folderName, label) {
  const prefix = filePrefix(folderName);

  if (kind === 'period') {
    return `${prefix}_${label}.tif`;
  }

  if (kind === 'geotiff') {
    return `${prefix}.tif`;
  }

  if (kind === 'legend') {
    return `${prefix}_legend.csv`;
  }

  return `${prefix}.csv`;
}