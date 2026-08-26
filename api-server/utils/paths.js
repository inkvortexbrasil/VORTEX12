const fs = require('fs');
const path = require('path');

const CODE_ROOT = path.resolve(__dirname, '../..');
const defaultFilesRoot = 'D:\\VORTEX12_FILES';
const legacyFilesRoot = path.resolve(CODE_ROOT, '../VORTEX12_FILES');
const fallbackFilesRoot = CODE_ROOT;

let resolvedFilesRoot = fallbackFilesRoot;
if (fs.existsSync(defaultFilesRoot)) {
  resolvedFilesRoot = defaultFilesRoot;
} else if (fs.existsSync(legacyFilesRoot)) {
  resolvedFilesRoot = legacyFilesRoot;
}

const FILES_ROOT = process.env.VORTEX_FILES_ROOT || resolvedFilesRoot;

function getMinisseriesDir(numStr = '') {
  if (!numStr) return path.join(FILES_ROOT, 'minisseries');
  const clean = String(numStr).replace(/\D/g, '').padStart(2, '0');
  return path.join(FILES_ROOT, 'minisseries', clean);
}

function getVideoSocialDir() {
  return path.join(FILES_ROOT, 'minisseries', 'video social');
}

function getPalcoDir() {
  return path.join(FILES_ROOT, 'palco');
}

function getLogoDir() {
  return path.join(FILES_ROOT, 'logo-inkvortex');
}

function getFontsDir() {
  return path.join(FILES_ROOT, 'fonts');
}

function getFfmpegDir() {
  const customFfmpeg = path.join(FILES_ROOT, 'ffmpeg');
  if (fs.existsSync(customFfmpeg)) return customFfmpeg;
  return path.join(CODE_ROOT, 'ffmpeg');
}

function getStacherDir() {
  const stacherPath = path.join(FILES_ROOT, 'stacher');
  if (fs.existsSync(stacherPath)) return stacherPath;
  const downloadsPath = path.join(FILES_ROOT, 'downloads');
  if (fs.existsSync(downloadsPath)) return downloadsPath;
  return stacherPath;
}

function getDownloadsDir() {
  return getStacherDir();
}

function getAmbientMusicDir() {
  const candidateDirs = [
    'D:\\Músicas',
    'D:/Músicas',
    'D:\\Musicas',
    'D:/Musicas',
    getStacherDir()
  ];
  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) return dir;
  }
  return getStacherDir();
}

module.exports = {
  CODE_ROOT,
  FILES_ROOT,
  getMinisseriesDir,
  getVideoSocialDir,
  getPalcoDir,
  getLogoDir,
  getFontsDir,
  getFfmpegDir,
  getStacherDir,
  getDownloadsDir,
  getAmbientMusicDir
};

