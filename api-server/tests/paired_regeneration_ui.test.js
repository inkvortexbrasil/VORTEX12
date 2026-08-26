const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'api-server', 'server.js'), 'utf8');

assert.ok(!indexSource.includes('btnRegenerateActive'), 'O regenerador geral antigo não pode permanecer no painel.');
assert.ok(!uiSource.includes('handleRegenerateSocial'), 'A legenda não pode ter geração isolada.');
assert.ok(!uiSource.includes('generateFlowMaster'), 'O Flow não pode ter geração isolada no Estúdio.');
assert.ok(!fs.existsSync(path.join(root, 'js', 'flow.js')), 'A antiga Sala Audiovisual deve permanecer retirada.');

assert.ok(indexSource.includes('id="btnNewCampaignVersion"'), 'A Nova Versão única deve ficar no cabeçalho.');
assert.strictEqual((indexSource.match(/♻️ NOVA VERSÃO/g) || []).length, 1, 'Deve existir somente um comando de Nova Versão.');
assert.ok(!uiSource.includes('NOVA VERSÃO · GPT + LEGENDA'), 'Não pode existir nova versão isolada de GPT + Legenda.');
assert.ok(!uiSource.includes('NOVA VERSÃO · FLOW + GEMINI'), 'Não pode existir nova versão isolada de Flow + Gemini.');
assert.ok(!appSource.includes('regenerateGptSocialPair'), 'O regenerador pareado antigo de GPT deve ser removido.');
assert.ok(!appSource.includes('regenerateFlowGeminiPair'), 'O regenerador pareado antigo de Gemini deve ser removido.');
assert.ok(uiSource.includes('GERAR GPT + LEGENDA SOCIAL'), 'A primeira etapa oficial deve permanecer disponível.');
assert.ok(uiSource.includes('GERAR FLOW + GEMINI'), 'A segunda etapa oficial deve permanecer disponível.');
assert.ok(serverSource.includes("req.url === '/api/minisseries/reset-workspace'"), 'O reset físico seguro deve possuir rota própria.');

const resetStart = appSource.indexOf('window.resetCurrentCampaignVersion');
const resetEnd = appSource.indexOf('window.switchSceneTab', resetStart);
assert.ok(resetStart >= 0 && resetEnd > resetStart, 'O comando único de Nova Versão deve existir.');

const resetSource = appSource.slice(resetStart, resetEnd);
assert.ok(!/campaign\.(?:id|number|no|title|topic)\s*=/.test(resetSource), 'A nova versão não pode alterar ID, número, título ou assunto.');
assert.ok(resetSource.includes("fetch('/api/minisseries/reset-workspace'"), 'A pasta deve ser reiniciada antes do banco do navegador.');
assert.ok(resetSource.indexOf("fetch('/api/minisseries/reset-workspace'") < resetSource.indexOf('campaign.generatedGPT = false'), 'O banco só pode ser limpo depois da confirmação física.');
assert.ok(resetSource.includes('campaign.generatedGPT = false'));
assert.ok(resetSource.includes('campaign.generatedGemini = false'));
assert.ok(resetSource.includes('campaign.generatedFlow = false'));
assert.ok(resetSource.includes('campaign.social = {}'));
assert.ok(resetSource.includes('campaign.flow = {}'));

console.log('single-version-reset-ui-ok');
