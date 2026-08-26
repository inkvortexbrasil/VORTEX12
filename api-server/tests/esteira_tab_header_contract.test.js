const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const documentarios = fs.readFileSync(path.join(root, 'js', 'documentarios.js'), 'utf8');
const componentsCss = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');

test('Cabeçalho da Esteira e Abas de Minissérie são travados em 1 linha com reticências', () => {
  // 1. Verifica presença das classes e propriedades no CSS
  assert.ok(componentsCss.includes('.phase2-tab-btn'), 'components.css deve conter regra para .phase2-tab-btn');
  assert.ok(componentsCss.includes('white-space: nowrap !important;'), 'Deve forçar white-space: nowrap');
  assert.ok(componentsCss.includes('overflow: hidden !important;'), 'Deve forçar overflow: hidden');
  assert.ok(componentsCss.includes('text-overflow: ellipsis !important;'), 'Deve forçar text-overflow: ellipsis');
  assert.ok(componentsCss.includes('#docPhase2Header'), 'components.css deve conter regra para #docPhase2Header');
  assert.ok(componentsCss.includes('max-height: 46px !important;'), 'Cabeçalho deve ter altura máxima travada');

  // 2. Verifica a renderização em js/documentarios.js
  assert.ok(documentarios.includes('class="phase2-tab-btn"'), 'documentarios.js deve renderizar abas com .phase2-tab-btn');
  assert.ok(documentarios.includes('text-overflow: ellipsis'), 'documentarios.js deve ter inline text-overflow: ellipsis');
  assert.ok(documentarios.includes('title="M${cN} - ${safeTitle}"'), 'documentarios.js deve ter tooltip title com nome completo');
  assert.ok(documentarios.includes('min-height: 46px'), 'documentarios.js deve travar a altura de #docPhase2Header');
});
