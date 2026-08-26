const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', '..');
const indexPath = path.join(root, 'index.html');

test('dashboard expõe somente os três Multiversos oficiais', () => {
  const html = fs.readFileSync(indexPath, 'utf8');
  const navIds = Array.from(html.matchAll(/<button\b[^>]*\bid="(btnNav[^"]+)"/g), match => match[1]);

  assert.deepEqual(navIds, [
    'btnNavAudio',
    'btnNavLibrary',
    'btnNavDocumentarios'
  ]);

  assert.match(html, /Multiverso Flow Music/);
  assert.doesNotMatch(html, /Multiverso Auditivo|Multiverso Audiovisual|Multiverso Editorial|Multiverso Visual|Multiverso Comercial/);
  assert.doesNotMatch(html, /socialMediaView|storyboardView|flowRoomView|comercialView/);
  assert.doesNotMatch(html, /js\/(?:social|storyboard|flow|comercial)\.js/);
  assert.match(html, /Esteira de Produção e Acervo Final/);
});

test('Multiverso Flow Music mantém a sala de áudio oficial', () => {
  const html = fs.readFileSync(indexPath, 'utf8');
  const audioPath = path.join(root, 'js', 'audio.js');
  const source = fs.readFileSync(audioPath, 'utf8');

  assert.match(html, /<script src="js\/audio\.js\?v=\d+"><\/script>/);
  assert.match(source, /window\.openAudioRoom\s*=\s*function/);
  assert.match(source, /Multiverso Flow Music/);
  assert.doesNotThrow(() => new vm.Script(source, { filename: 'audio.js' }));
});

test('módulos aposentados foram removidos e permanecem recuperáveis em pontos de restauração', () => {
  for (const file of ['social.js', 'storyboard.js', 'flow.js', 'comercial.js']) {
    assert.equal(fs.existsSync(path.join(root, 'js', file)), false, `${file} ainda existe no código ativo`);
  }

  assert.equal(
    fs.existsSync(path.join(root, 'scratch', 'restoration', 'baseline_dashboard_four_multiverses.zip')),
    true
  );
  assert.equal(
    fs.existsSync(path.join(root, 'scratch', 'restoration', 'baseline_before_retire_audiovisual.zip')),
    true
  );
});
