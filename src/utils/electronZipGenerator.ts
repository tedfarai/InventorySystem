import JSZip from 'jszip';
import {
  ELECTRON_PACKAGE_JSON,
  ELECTRON_MAIN_JS,
  ELECTRON_PRELOAD_JS,
  ELECTRON_INDEX_HTML,
  ELECTRON_README_MD
} from '../data/electronCodeFiles';

export async function generateElectronProjectZip(): Promise<Blob> {
  const zip = new JSZip();

  // Root files
  zip.file('package.json', ELECTRON_PACKAGE_JSON);
  zip.file('main.js', ELECTRON_MAIN_JS);
  zip.file('preload.js', ELECTRON_PRELOAD_JS);
  zip.file('index.html', ELECTRON_INDEX_HTML);
  zip.file('README.md', ELECTRON_README_MD);

  // Scripts directory
  const scriptsFolder = zip.folder('scripts');
  if (scriptsFolder) {
    scriptsFolder.file(
      'init-db.js',
      `const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'data_store', 'procurement.sqlite');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite:', err);
    process.exit(1);
  }
  console.log('Database initialized successfully at:', dbPath);
  db.close();
});
`
    );
  }

  // Assets directory placeholder / gitkeep
  const assetsFolder = zip.folder('assets');
  if (assetsFolder) {
    assetsFolder.file('README.txt', 'Place custom application icons (icon.ico, icon.png, icon.icns) in this directory.');
  }

  // Generate zip file as Blob
  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}

export async function downloadElectronProjectZip(filename = 'Paramount_Procurement_Electron_Desktop.zip') {
  const blob = await generateElectronProjectZip();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
