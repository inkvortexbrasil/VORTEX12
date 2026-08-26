const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..', '..');
const serverSource = fs.readFileSync(path.join(root, 'api-server', 'server.js'), 'utf8');
const llmSource = fs.readFileSync(path.join(root, 'api-server', 'services', 'llm_service.js'), 'utf8');
const contracts = fs.readFileSync(path.join(root, 'Todos_Contratos.md'), 'utf8');
const responseBuilderStart = llmSource.indexOf('function buildResponseFormat');
const responseBuilderEnd = llmSource.indexOf('\nasync function generateStage', responseBuilderStart);
assert.ok(responseBuilderStart >= 0 && responseBuilderEnd > responseBuilderStart, 'O construtor de JSON Schema deve existir.');
const responseBuilderSandbox = {};
vm.runInNewContext(`${llmSource.slice(responseBuilderStart, responseBuilderEnd)}\nthis.buildResponseFormat = buildResponseFormat;`, responseBuilderSandbox);
const { buildResponseFormat } = responseBuilderSandbox;

const schemaStart = serverSource.indexOf('const REQUIRED_TEXT_SCHEMA');
const schemaEnd = serverSource.indexOf('const SCENES50_REQUIRED_FIELDS', schemaStart);
assert.ok(schemaStart >= 0 && schemaEnd > schemaStart, 'Os esquemas estruturados devem existir no servidor.');
const schemaSandbox = {};
vm.runInNewContext(`${serverSource.slice(schemaStart, schemaEnd)}\nthis.schemas = STRUCTURED_OUTPUT_SCHEMAS;`, schemaSandbox);

const expectedSchemas = ['themes', 'scenes50', 'scenes45', 'scenes916', 'flowMaster', 'caption', 'flowMusic'];
assert.deepEqual(Object.keys(schemaSandbox.schemas).sort(), expectedSchemas.sort());
for (const name of expectedSchemas) {
  const descriptor = schemaSandbox.schemas[name];
  const format = buildResponseFormat(descriptor, name);
  assert.equal(format.type, 'json_schema');
  assert.equal(format.json_schema.strict, true);
  assert.equal(format.json_schema.schema.type, 'object');
}

assert.equal((serverSource.match(/responseSchema:\s*STRUCTURED_OUTPUT_SCHEMAS\./g) || []).length, 9);
assert.doesNotMatch(serverSource, /responseSchema:\s*true/);
assert.match(llmSource, /type:\s*'json_schema'/);
assert.match(llmSource, /Math\.min\(1, Number\(validationRetries\)/);
assert.match(serverSource, /As 10 cenas foram preservadas/);
assert.match(serverSource, /O FlowMaster foi preservado/);

for (const [name, temperature] of [
  ['Themes', '0.82'],
  ['Scenes50', '0.82'],
  ['Scenes45', '0.82'],
  ['Scenes916', '0.82'],
  ['FlowMaster', '0.82'],
  ['Caption', '0.82'],
  ['FlowMusic', '0.82']
]) {
  const sectionStart = contracts.indexOf(`## Contrato: ${name}`);
  assert.ok(sectionStart >= 0, `Contrato ${name} ausente.`);
  const section = contracts.slice(sectionStart, sectionStart + 220);
  assert.match(section, /Motor:\*\* mistral-large-latest/);
  assert.match(section, new RegExp(`temperature: ${temperature.replace('.', '\\.')}`));
}

assert.match(contracts, /Política global — ENTREGA PRIMEIRO/);
assert.match(contracts, /O controle de qualidade editorial final pertence ao Diretor-Geral/);

console.log('mistral-delivery-first-schema-ok');
