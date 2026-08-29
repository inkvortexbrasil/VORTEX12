const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const serverSource = fs.readFileSync(path.join(root, 'api-server', 'server.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');
const contractSource = fs.readFileSync(path.join(root, 'Todos_Contratos.md'), 'utf8');

const validatorStart = serverSource.indexOf('const FLOWMASTER_ROOT_FIELDS');
const validatorEnd = serverSource.indexOf('const FLOW_MUSIC_ROOT_FIELDS', validatorStart);
const formatterStart = serverSource.indexOf('function formatFlowPrompt');
const formatterEnd = serverSource.indexOf('async function runFlowGeminiJob', formatterStart);

assert.ok(validatorStart >= 0 && validatorEnd > validatorStart, 'Validador FlowMaster deve existir.');
assert.ok(formatterStart >= 0 && formatterEnd > formatterStart, 'Formatador FlowMaster deve existir.');

const validatorSource = serverSource.slice(validatorStart, validatorEnd);
const formatterSource = serverSource.slice(formatterStart, formatterEnd);
const sandbox = {};
vm.runInNewContext(`${validatorSource}\nfunction parseGeneratedJSON(value) { return value; }\n${formatterSource}\nthis.validate = validateFlowMasterOutput; this.format = formatFlowPrompt;`, sandbox);

const validScenes = [
  {
    number: 1,
    imageReference: '[01]',
    timeRange: '0.0-2.0s',
    omniFlashPrompt: 'A cinematic wide shot with a slow forward dolly. The metallic textile fibers crystallize under a bright blue laser beam. Dark environment with high-contrast neon lighting. The camera tilts up slightly at the end to seamlessly transition into the next frame. (no subtitles)'
  },
  {
    number: 2,
    imageReference: '[02]',
    timeRange: '2.0-4.0s',
    omniFlashPrompt: 'A cinematic medium shot tracking left. The metallic textile fibers crystallize under a bright blue laser beam. Dark environment with high-contrast neon lighting. The camera tilts up slightly at the end to seamlessly transition into the next frame. (no subtitles)'
  },
  {
    number: 3,
    imageReference: '[03]',
    timeRange: '4.0-6.0s',
    omniFlashPrompt: 'A cinematic close-up with a gentle zoom-in. The metallic textile fibers crystallize under a bright blue laser beam. Dark environment with high-contrast neon lighting. The camera tilts up slightly at the end to seamlessly transition into the next frame. (no subtitles)'
  },
  {
    number: 4,
    imageReference: '[04]',
    timeRange: '6.0-8.0s',
    omniFlashPrompt: 'A cinematic arc shot orbiting right. The metallic textile fibers crystallize under a bright blue laser beam. Dark environment with high-contrast neon lighting. The camera tilts up slightly at the end to seamlessly transition into the next frame. (no subtitles)'
  },
  {
    number: 5,
    imageReference: '[05]',
    timeRange: '8.0-10.0s',
    omniFlashPrompt: 'A cinematic low-angle tracking shot. The metallic textile fibers crystallize under a bright blue laser beam. Dark environment with high-contrast neon lighting. The camera tilts up slightly at the end to seamlessly transition into the next frame. (no subtitles)'
  }
];

const validFlowMaster = {
  scenes: validScenes
};

const validated = sandbox.validate(validFlowMaster);
assert.strictEqual(validated.scenes.length, 5, 'Devem existir cinco cenas validadas.');
assert.strictEqual(validated.scenes[0].imageReference, '[01]');
assert.strictEqual(validated.scenes[4].imageReference, '[05]');

const formatted = sandbox.format(validFlowMaster);
assert.ok(!formatted.prompt.includes('[TIMED SHOT PLAN]'), 'O prompt unificado não deve conter o bloco [TIMED SHOT PLAN].');
assert.ok(!formatted.prompt.includes('REFERENCE ['), 'O prompt unificado não deve conter rótulos REFERENCE.');
assert.ok(formatted.prompt.endsWith('(no subtitles)'), 'O prompt unificado deve terminar com (no subtitles) uma única vez.');
assert.strictEqual((formatted.prompt.match(/\(no subtitles\)/gi) || []).length, 1, '(no subtitles) deve aparecer exatamente uma vez no prompt unificado.');
assert.ok(!formatted.prompt.includes('Reference image content:'), 'A composição estática não deve ser redescrita ao Omni Flash.');
assert.ok(!formatted.prompt.includes('[INTRODUCTION]'), 'A introdução literária foi aposentada.');

const swappedReference = JSON.parse(JSON.stringify(validFlowMaster));
swappedReference.scenes[0].imageReference = '[02]';
assert.throws(() => sandbox.validate(swappedReference), /Scene 1 deve usar exclusivamente imageReference "\[01\]"/);

assert.ok(!fs.existsSync(path.join(root, 'flow', 'flow.txt')), 'flow/flow.txt deve permanecer retirado.');
assert.ok(!fs.existsSync(path.join(root, 'flow')), 'A pasta raiz flow deve permanecer retirada quando vazia.');
assert.ok(!appSource.includes("fetchPrefix('./flow/flow.txt')"), 'app.js não pode concatenar o prefixo legado.');
assert.ok(!uiSource.includes("fetchPrefix('./flow/flow.txt')"), 'ui.js não pode exibir o prefixo legado.');
assert.ok(appSource.includes('isSelfContainedFlowPrompt'), 'Prompts Flow legados devem ser bloqueados na cópia.');
assert.ok(!contractSource.includes('## Contrato: FlowMaster'), 'O contrato FlowMaster aposentado deve permanecer retirado dos contratos ativos.');

console.log('flowmaster_self_contained_prompt.test.js: OK');
