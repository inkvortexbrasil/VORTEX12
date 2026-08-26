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
const validatorEnd = serverSource.indexOf('\n\n//', validatorStart);
const formatterStart = serverSource.indexOf('function formatFlowPrompt');
const formatterEnd = serverSource.indexOf('\n\nasync function runFlowGeminiJob', formatterStart);

assert.ok(validatorStart >= 0 && validatorEnd > validatorStart, 'Validador FlowMaster deve existir.');
assert.ok(formatterStart >= 0 && formatterEnd > formatterStart, 'Formatador FlowMaster deve existir.');

const validatorSource = serverSource.slice(validatorStart, validatorEnd);
const formatterSource = serverSource.slice(formatterStart, formatterEnd);
const sandbox = {};
vm.runInNewContext(`${validatorSource}\nfunction parseGeneratedJSON(value) { return value; }\n${formatterSource}\nthis.validate = validateFlowMasterOutput; this.format = formatFlowPrompt;`, sandbox);

const globalDirective = 'Create one 10-second 16:9 video using the five attached images in exact numerical order: [01] for Scene 1, [02] for Scene 2, [03] for Scene 3, [04] for Scene 4, and [05] for Scene 5. Preserve each reference identity, materials, geometry, lighting, and brand details. Follow the timed shot plan below without swapping, combining, or omitting any reference.';
const ranges = ['0.0-2.0s', '2.0-4.0s', '4.0-6.0s', '6.0-8.0s', '8.0-10.0s'];
const validFlowMaster = {
  globalDirective,
  scenes: ranges.map((timeRange, index) => {
    const number = index + 1;
    const reference = `[${String(number).padStart(2, '0')}]`;
    return {
      number,
      imageReference: reference,
      timeRange,
      referenceFrame: `Reference ${reference} shows the principal textile mechanism centered in a clean cinematic composition before its visible transformation begins`,
      camera: 'Slow dolly in from a wide shot toward the centered principal subject',
      subjectMotion: 'The principal material expands gradually from left to right',
      environmentMotion: 'Fine suspended fibers drift gently behind the subject',
      endFrame: 'The transformed surface fills the central third of frame',
      transition: number < 5 ? `Match movement into Scene ${number + 1}` : 'Hold the final composition steadily'
    };
  })
};

const validated = sandbox.validate(validFlowMaster);
assert.strictEqual(validated.scenes.length, 5, 'Devem existir cinco cenas validadas.');
assert.strictEqual(validated.scenes[0].imageReference, '[01]');
assert.strictEqual(validated.scenes[4].imageReference, '[05]');

const formatted = sandbox.format(validFlowMaster);
assert.ok(formatted.prompt.startsWith('[GLOBAL VIDEO DIRECTIVE]\n'), 'O prompt deve começar pela diretriz global gerada.');
assert.ok(formatted.prompt.includes('[TIMED SHOT PLAN]'), 'O prompt deve conter o plano temporal.');
for (let number = 1; number <= 5; number += 1) {
  const reference = String(number).padStart(2, '0');
  assert.ok(formatted.prompt.includes(`REFERENCE [${reference}] -> SCENE ${number}`), `O mapa [${reference}] -> Scene ${number} deve estar incorporado.`);
}
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
assert.ok(contractSource.includes('"imageReference": "[01]"'), 'O contrato oficial deve incorporar a referência visual.');

console.log('flowmaster_self_contained_prompt.test.js: OK');
