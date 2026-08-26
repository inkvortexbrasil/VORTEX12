const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { getStacherDir, getDownloadsDir, getAmbientMusicDir, FILES_ROOT } = require('../utils/paths');

test('endpoint de som ambiente resolve caminhos base em VORTEX12_FILES e caminhos de música', () => {
  const stacherDir = getStacherDir();
  assert.equal(stacherDir, path.join(FILES_ROOT, 'stacher'));
  assert.ok(fs.existsSync(stacherDir), 'Pasta stacher deve existir');
});

test('getAmbientMusicDir resolve D:\\Músicas com pastas e faixas corretas', () => {
  const musicDir = getAmbientMusicDir();
  assert.ok(musicDir, 'Diretório de músicas deve ser retornado');
  assert.ok(fs.existsSync(musicDir), 'Diretório retornado deve existir no sistema');

  if (fs.existsSync('D:\\Músicas')) {
    assert.equal(musicDir, 'D:\\Músicas');
    const entries = fs.readdirSync('D:\\Músicas', { withFileTypes: true });
    const folderNames = entries.filter(e => e.isDirectory()).map(e => e.name.toLowerCase());
    assert.ok(folderNames.includes('ambiente'), 'Deve conter pasta ambiente');
    assert.ok(folderNames.includes('diversas'), 'Deve conter pasta diversas');
    assert.ok(folderNames.includes('mix'), 'Deve conter pasta mix');
    assert.ok(folderNames.includes('strange kind of woman'), 'Deve conter pasta strange kind of woman');
  }
});
