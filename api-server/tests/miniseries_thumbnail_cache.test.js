const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildMiniseriesImageManifest } = require('../services/miniseries_thumbnail_manifest');

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-thumbnails-'));

try {
  const campaignDir = path.join(temporaryRoot, 'minisseries', '18', 'M18');
  const legacyDir = path.join(temporaryRoot, 'minisseries', '18', 'imagens');
  fs.mkdirSync(campaignDir, { recursive: true });
  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(path.join(campaignDir, 'img_001.jpg'), Buffer.from('image-one'));
  fs.writeFileSync(path.join(campaignDir, 'img_004.png'), Buffer.from('image-four'));
  fs.writeFileSync(path.join(legacyDir, 'img_005.webp'), Buffer.from('legacy-five'));

  const first = buildMiniseriesImageManifest({
    root: temporaryRoot,
    docNum: '18',
    campaignNum: '18'
  });

  assert.strictEqual(first.count, 2);
  assert.deepStrictEqual(first.entries.map(entry => entry.sequence), [1, 4]);
  assert.strictEqual(first.entries[0].url, '/minisseries/18/M18/img_001.jpg');
  assert.ok(first.entries.every(entry => entry.url.includes('/M18/')));

  const previousVersion = first.entries[0].version;
  fs.writeFileSync(path.join(campaignDir, 'img_001.jpg'), Buffer.from('image-one-updated'));
  const second = buildMiniseriesImageManifest({
    root: temporaryRoot,
    docNum: '18',
    campaignNum: '18'
  });
  assert.notStrictEqual(second.entries[0].version, previousVersion);

  const documentarios = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'documentarios.js'), 'utf8');
  assert(documentarios.includes("const DOC_THUMB_DB_NAME = 'vortex-miniseries-thumbnails-v1'"));
  assert(documentarios.includes('/api/minisseries/image-manifest'));
  assert(documentarios.includes('data-doc-thumb-sequence'));
  assert(documentarios.includes('createImageBitmap'));
  assert(!documentarios.includes('const jpgUrl = `/minisseries/${numDisplay}/M${cNum}/img_${numPadded}.jpg?t=${window.docImageCacheKey}`'));

  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert(server.includes("url.searchParams.has('v')"));
  assert(server.includes("max-age=31536000, immutable"));

  console.log('miniseries-thumbnail-cache-ok');
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
