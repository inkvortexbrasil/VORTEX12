const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', '..');

function collectLocalAssets(html) {
  const assets = [];
  const patterns = [
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
    /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const source = match[1];
      if (/^(?:https?:)?\/\//i.test(source) || source.startsWith('data:')) continue;
      assets.push(source.split(/[?#]/, 1)[0]);
    }
  }
  return assets;
}

test('index referencia somente scripts e estilos locais existentes', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const assets = collectLocalAssets(html);
  const missing = assets.filter(asset => !fs.existsSync(path.join(root, asset.replace(/\//g, path.sep))));

  assert.ok(assets.length > 0, 'nenhum ativo local foi detectado no index');
  assert.deepEqual(missing, []);
  assert.doesNotMatch(html, /js\/typography\.js/i);
});

test('scripts embutidos no index possuem sintaxe válida', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  let inlineIndex = 0;

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(match[1])) continue;
    inlineIndex += 1;
    assert.doesNotThrow(
      () => new vm.Script(match[2], { filename: `index-inline-${inlineIndex}.js` }),
      `script embutido ${inlineIndex} contém sintaxe inválida`
    );
  }

  assert.ok(inlineIndex > 0, 'nenhum script embutido foi detectado no index');
});
