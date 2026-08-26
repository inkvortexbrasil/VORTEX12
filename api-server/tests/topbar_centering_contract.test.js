const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

test('Contrato Visual: Topbar limpa e protegida', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const mainCss = fs.readFileSync(path.join(ROOT, 'css', 'main.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');

  assert(indexHtml.includes('id="topbarMultiverseTitle"'), 'index.html deve conter topbarMultiverseTitle');
  assert(indexHtml.includes('id="topbarTitle"'), 'index.html deve conter topbarTitle');
  assert(indexHtml.includes('id="topbarSubtitle"'), 'index.html deve conter topbarSubtitle');
  assert(mainCss.includes('.vortexTopbar'), 'main.css deve definir .vortexTopbar');
  assert(appJs.includes('window.updateTopbarTitle'), 'app.js deve conter updateTopbarTitle');
});
