const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const chatgpt = read('api-server/chatgpt_web_automation.js');
const chatgptRoutes = read('api-server/routes/chatgpt_automation_routes.js');
const geminiRoutes = read('api-server/routes/automation_routes.js');
const server = read('api-server/server.js');
const activeRobotSource = [chatgpt, chatgptRoutes, geminiRoutes, server].join('\n');

assert.ok(!fs.existsSync(path.join(root, 'api-server', 'gemini_web_automation.js')),
  'O motor Gemini de perfil dedicado deve permanecer retirado.');

for (const forbidden of [
  'profileDir',
  'debugPort',
  '--user-data-dir',
  'dedicated-profile',
  'gemini_chrome_profile',
  'chatgpt_chrome_account',
  'gemini_web_automation',
  'runGeminiAutomation'
]) {
  assert.ok(!activeRobotSource.includes(forbidden), `Referência legada proibida: ${forbidden}`);
}

assert.ok(!chatgptRoutes.includes('/api/automate-chatgpt/accounts'),
  'A rota de enumeração de perfis dedicados deve permanecer retirada.');
assert.ok(!chatgptRoutes.includes('/api/automate-chatgpt/reset-account'),
  'A rota de reset de perfil dedicado deve permanecer retirada.');
assert.ok(chatgpt.includes("platform: 'chatgpt'"),
  'O ChatGPT deve se conectar explicitamente à guia atual pela Ponte VORTEX.');
assert.ok(geminiRoutes.includes('runGeminiCurrentTabAutomation({'),
  'A geração Gemini da minissérie deve usar a guia atual preparada pelo operador.');
assert.ok(geminiRoutes.includes("engine: 'current-tab'"),
  'Os jobs Gemini devem declarar o motor current-tab.');

console.log('browser-profiles-retired-ok');
