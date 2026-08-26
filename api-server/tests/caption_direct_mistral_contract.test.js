const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const serverSource = fs.readFileSync(path.join(root, 'api-server', 'server.js'), 'utf8');
const llmSource = fs.readFileSync(path.join(root, 'api-server', 'services', 'llm_service.js'), 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'js', 'api.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const contracts = fs.readFileSync(path.join(root, 'Todos_Contratos.md'), 'utf8');

const validatorStart = serverSource.indexOf('const CAPTION_ROOT_FIELDS');
const validatorEnd = serverSource.indexOf('\n\n//', validatorStart);
assert.ok(validatorStart >= 0 && validatorEnd > validatorStart, 'O validador Caption deve existir.');

const validatorSource = serverSource.slice(validatorStart, validatorEnd);
const sandbox = {};
vm.runInNewContext(`
function sanitizeNumericId(raw, fallback = '00') {
  const digitsOnly = String(raw ?? '').replace(/\\D/g, '');
  return (digitsOnly || fallback).padStart(2, '0');
}
function countPromptWords(value) {
  return String(value || '').trim().split(/\\s+/u).filter(Boolean).length;
}
${validatorSource}
this.validateCaption = validateCaptionOutput;
`, sandbox);

const emojis = ['🔬', '🧵', '⚙️', '🧪', '📐', '🏭', '⚠️', '🎯'];
const bodyLines = emojis.map((emoji, index) => (
  `${emoji} Esta frase tecnica${index + 1} apresenta conteúdo novo claro verificável profissional objetivo preciso contextualizado responsável aplicável coerente relevante agora.`
));
bodyLines.push('🌀 A InkVortex Brasil apresenta conhecimento técnico claro verificável profissional objetivo preciso contextualizado responsável aplicável coerente relevante.');
bodyLines.push('💬 Como você aplicaria este conhecimento técnico claro verificável profissional objetivo preciso contextualizado responsável aplicável coerente relevante?');

const title = 'Título Técnico Exato';
const socialCaption = [
  `MINISSÉRIE 05 — ${title}`,
  '',
  ...bodyLines,
  '',
  '#TecnologiaTextil #ProcessoDigital #InovacaoAplicada #ConhecimentoTecnico #InkVortexBrasil'
].join('\n');

const valid = sandbox.validateCaption({ socialCaption }, '5', title);
assert.strictEqual(valid.socialCaption, socialCaption, 'A legenda validada deve permanecer byte a byte igual.');

const captionContractSection = contracts.slice(
  contracts.indexOf('## Contrato: Caption'),
  contracts.indexOf('\n---', contracts.indexOf('## Contrato: Caption'))
);
const documentedJsonMatch = captionContractSection.match(/\{\n  "socialCaption": "(?:[^"\\]|\\.)*"\n\}/u);
assert.ok(documentedJsonMatch, 'O contrato Caption deve conter um exemplo JSON integral.');
const documentedExample = JSON.parse(documentedJsonMatch[0]);
sandbox.validateCaption(documentedExample, '05', 'TÍTULO EXATO DA MINISSÉRIE');

assert.strictEqual(
  sandbox.validateCaption({ caption: socialCaption.replace('MINISSÉRIE 05', 'MINISSÉRIE 06') }).socialCaption,
  socialCaption.replace('MINISSÉRIE 05', 'MINISSÉRIE 06'),
  'A embalagem alternativa deve ser aceita sem reescrever a legenda.'
);
assert.strictEqual(
  sandbox.validateCaption({ text: socialCaption.replace('conhecimento técnico claro', 'loja oficial no Mercado Livre') }).socialCaption,
  socialCaption.replace('conhecimento técnico claro', 'loja oficial no Mercado Livre'),
  'O conteúdo editorial deve chegar ao Diretor sem bloqueio automático.'
);
assert.throws(() => sandbox.validateCaption({ socialCaption: '' }), /não contém texto utilizável/);

assert.match(contracts, /## Contrato: Caption\s+- \*\*Motor:\*\* mistral-large-latest\s+- \*\*Parâmetros:\*\* `\{ temperature: 0\.82,/);
assert.ok(contracts.includes('MINISSÉRIE NN — TÍTULO EXATO DA MINISSÉRIE'));
assert.ok(contracts.includes('A quinta e última deve ser exatamente #InkVortexBrasil.'));
assert.ok(serverSource.includes('parseCaptionResult(captionRes, campaignNumber, title)'));
assert.ok(serverSource.includes('parseCaptionResult(captionRes, captionNumber, captionTitle)'));
assert.ok(llmSource.includes("type: 'json_schema'"));
assert.ok(serverSource.includes("name: 'vortex_social_caption'"));
assert.ok(!llmSource.includes('socialCaption deve possuir exatamente 14 linhas'));
assert.ok(apiSource.includes('campaignNumber: campaign.number'));
assert.ok(apiSource.includes('caption: rawCaption'));
assert.ok(!apiSource.includes('formatCampaignSocialCaption'));
assert.ok(!appSource.includes('formatCampaignSocialCaption'));
assert.ok(!appSource.includes('regenerateSocialCaption'));
assert.ok(!appSource.includes('standardizeAllCampaignCaptions'));
assert.ok(!appSource.includes('authorityOptions'));
assert.ok(!appSource.includes('storeOptions'));

console.log('caption_direct_mistral_contract.test.js: OK');
