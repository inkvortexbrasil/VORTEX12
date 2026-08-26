const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');

test('somente FlowMusic permanece como contrato musical ativo', () => {
  const contracts = fs.readFileSync(path.join(root, 'Todos_Contratos.md'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'api-server', 'server.js'), 'utf8');

  assert.match(contracts, /^# 🎵 MULTIVERSO FLOW MUSIC$/m);
  assert.match(contracts, /^## Contrato: FlowMusic$/m);
  assert.doesNotMatch(contracts, /^## Contrato: Audio$/m);
  assert.match(contracts, /^## Contrato: FlowMaster$/m);

  assert.match(server, /contract:\s*API_CONTRACTS\.flowMusic/);
  assert.doesNotMatch(server, /contract:\s*API_CONTRACTS\.audio/);
});
