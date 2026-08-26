const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const mainSource = read('css', 'main.css');
const componentsSource = read('css', 'components.css');
const audioSource = read('js', 'audio.js');
const documentariesSource = read('js', 'documentarios.js');
const indexSource = read('index.html');

assert.ok(mainSource.includes('.vortex-crystal-panel'), 'O Estudio deve possuir uma superficie cristalina unica.');
assert.ok(mainSource.includes('background: rgba(255, 255, 255, 0.02) !important'), 'O painel cristalino deve preservar o wallpaper.');
assert.ok(mainSource.includes('backdrop-filter: blur(1px) !important'), 'O cristal deve usar desfoque minimo.');
assert.ok(audioSource.includes('audio-prompt-column audio-hidden-scroll vortex-crystal-panel'), 'O Auditivo deve usar o cristal nos textos.');
assert.ok(!audioSource.includes('background: rgba(4, 10, 22, 0.68)'), 'A pelicula antiga do Auditivo nao pode voltar.');
assert.ok(!audioSource.includes('background: rgba(4, 10, 22, 0.96)'), 'Os titulos do Auditivo nao podem recriar a pelicula antiga.');
assert.ok(!fs.existsSync(path.join(root, 'js', 'flow.js')), 'A antiga Sala Audiovisual nao pode voltar ao codigo ativo.');
assert.ok(documentariesSource.includes('class="vortex-crystal-slot"'), 'Os 50 quadros vazios devem mostrar o palco.');
assert.ok(!documentariesSource.includes('background: rgba(10,15,30,0.85); transition: border-color'), 'Os quadros vazios nao podem recuperar o fundo escuro.');
assert.ok(indexSource.includes('id="promptsPreviewBox" class="vortex-crystal-panel"'), 'O painel de prompts deve ser cristalino.');
assert.ok(indexSource.includes('id="shortsStatusBox" class="vortex-crystal-panel"'), 'O painel de status deve ser cristalino.');
assert.ok(indexSource.includes('Painel Esquerdo: Telemetria') && indexSource.includes('class="vortex-crystal-panel" style="flex: 1; display: flex; flex-direction: column; gap: 16px;'), 'A telemetria de Shorts deve preservar o palco.');
assert.ok(componentsSource.includes('background: rgba(255, 255, 255, 0.02);'), 'Os campos de cena devem seguir o mesmo cristal.');
assert.ok(indexSource.includes('css/main.css?v=112'), 'A Central deve entregar a nova folha sem cache antigo.');

console.log('crystal-panels-ui-ok');
