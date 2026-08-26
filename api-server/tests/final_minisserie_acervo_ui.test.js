const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('novo Acervo não anuncia 8K nem finalização fictícia', () => {
  const index = read('index.html');
  const ui = read('js/documentarios.js');

  assert.match(index, />\s*🎥 ACERVO\s*</);
  assert.doesNotMatch(index, /ACERVO\s+8K/i);
  assert.doesNotMatch(ui, /8K FINALIZADO|MP4 8K|ACERVO 8K/i);
  assert.match(ui, /FINALIZADO/);
  assert.match(ui, /PRONTA/);
  assert.match(ui, /AGUARDANDO/);
});

test('renderização final existe somente no Acervo e usa player embutido com seletor de M4A', () => {
  const ui = read('js/documentarios.js');
  const server = read('api-server/server.js');

  assert.match(ui, /startFinalMinisserieRender/);
  assert.match(ui, /\/api\/render-final-minisserie/);
  assert.match(ui, /<video controls/);
  assert.match(ui, /final-render-stage/);
  assert.match(ui, /acervoM4ASelect/);
  assert.match(ui, /m4aFile:\s*selectedM4a/);
  assert.doesNotMatch(ui, /openDocPhase5Submenu|handleRenderDocumentary|openDocumentaryInWindowsPlayer/);
  assert.doesNotMatch(server, /\/api\/documentaries\/open-windows-player/);
});

test('interface unificada da Esteira entra direto na grade e elimina fases 1, 3, 4 e CTA', () => {
  const ui = read('js/documentarios.js');

  assert.match(ui, /renderDocEsteiraDirect/);
  assert.match(ui, /openDocPromptsModal/);
  assert.match(ui, /generate40PromptsFromModal/);
  assert.match(ui, /GERAR 40 PROMPTS/);
  assert.doesNotMatch(ui, /openDocPhase1Submenu/);
  assert.doesNotMatch(ui, /openDocPhase3Submenu/);
  assert.doesNotMatch(ui, /openDocPhase4Submenu/);
  assert.doesNotMatch(ui, /handleGenerateDocCTA/);
  assert.doesNotMatch(ui, /handleGenerateDocCaption/);
  assert.doesNotMatch(ui, /doc-phase-grid/);
  assert.doesNotMatch(ui, /docPhase4DalleArea/);
});
