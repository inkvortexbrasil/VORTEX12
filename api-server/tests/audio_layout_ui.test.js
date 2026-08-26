const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const audioSource = fs.readFileSync(path.join(root, 'js', 'audio.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.ok(audioSource.includes('grid-template-columns: 320px minmax(0, 1fr)'), 'O topo deve combinar roteiro e console em uma faixa compacta.');
assert.ok(audioSource.includes('grid-template-rows: 168px minmax(0, 1fr)'), 'A leitura deve ocupar todo o espaco vertical restante.');
assert.ok(audioSource.includes('audio-asset-zone audio-hidden-scroll vortex-crystal-panel'), 'Roteiro e arquivos devem compartilhar o mesmo painel cristalino.');
assert.ok(audioSource.includes('<details class="audio-m4a-drawer">'), 'Os arquivos M4A devem ficar incorporados e recolhiveis.');
assert.ok(audioSource.includes('id="audioM4ASummary"'), 'O resumo dos arquivos M4A deve permanecer identificavel.');
assert.ok(audioSource.includes('class="audio-console-shell vortex-crystal-panel"'), 'O console deve usar a faixa compacta superior.');
assert.ok(audioSource.includes('grid-column: 1 / -1') && audioSource.includes('grid-row: 2'), 'As tres leituras devem ocupar toda a largura inferior.');
assert.ok(audioSource.includes('font-size: 0.88rem') && audioSource.includes('line-height: 1.62'), 'Os textos devem manter leitura vertical confortavel.');
assert.ok(/js\/audio\.js\?v=\d+/.test(indexSource), 'A Central deve entregar a nova composicao sem cache antigo.');

console.log('audio-layout-ui-ok');
