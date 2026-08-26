const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const { TECH_THEMES } = require(path.join(root, 'api-server', 'utils', 'tech_themes'));
const serverSource = fs.readFileSync(path.join(root, 'api-server', 'server.js'), 'utf8');
const contracts = fs.readFileSync(path.join(root, 'Todos_Contratos.md'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');

// 1. Validação dos 22 Eixos Tecnológicos
assert.equal(Array.isArray(TECH_THEMES), true, 'TECH_THEMES deve ser um array.');
assert.equal(TECH_THEMES.length, 22, 'Devem existir exatamente 22 temas cadastrados.');

const textileTheme = TECH_THEMES.find(t => t.number === 21);
assert.ok(textileTheme, 'O tema 21 de Impressão Têxtil deve existir.');
assert.equal(textileTheme.title, 'Impressão Têxtil Digital & Estamparia de Vanguarda', 'O tema 21 deve ter o título limpo e amplo sem parênteses.');

const customTheme = TECH_THEMES.find(t => t.number === 22);
assert.ok(customTheme, 'O tema 22 de Tema Livre / Personalizado deve existir.');
assert.equal(customTheme.title, 'Tema Livre / Personalizado', 'O tema 22 deve ser o Tema Livre.');

TECH_THEMES.forEach((theme, index) => {
  assert.equal(theme.number, index + 1, `O tema ${index + 1} deve possuir número sequencial correto.`);
  assert.ok(theme.id && typeof theme.id === 'string', `Tema ${index + 1} deve ter id válido.`);
  assert.ok(theme.title && theme.title.trim().length > 5, `Tema ${index + 1} deve ter título descritivo.`);
  assert.equal(/\(|\)/.test(theme.title), false, `O título do tema ${index + 1} ("${theme.title}") não deve conter parênteses com exemplos.`);
  assert.ok(theme.category && theme.category.trim().length > 3, `Tema ${index + 1} deve ter categoria válida.`);
  assert.ok(theme.summary && theme.summary.trim().length > 5, `Tema ${index + 1} deve ter resumo.`);
  assert.ok(theme.briefing && theme.briefing.trim().length > 5, `Tema ${index + 1} deve ter briefing.`);
});

// 2. Validação do Contrato Themes em Todos_Contratos.md
const themesSection = contracts.slice(contracts.indexOf('## Contrato: Themes'), contracts.indexOf('## Contrato: Scenes50'));
assert.match(themesSection, /Crie exatamente 1 \(uma\) ideia editorial de alta autoridade/i, 'O contrato Themes deve instruir a criação de 1 ideia editorial.');
assert.match(themesSection, /A chave "topics" deve conter exatamente 1 objeto/i, 'A saída de Themes deve especificar 1 objeto na lista.');

// 3. Validação do Schema Estruturado no Backend
assert.match(serverSource, /topics:\s*\{\s*type:\s*'array',\s*minItems:\s*1,\s*maxItems:\s*1/i, 'O schema de Themes deve ter minItems: 1 e maxItems: 1.');
assert.match(serverSource, /req\.url === '\/api\/tech-themes' && req\.method === 'GET'/, 'O endpoint /api/tech-themes deve estar implementado.');

// 4. Validação do Frontend
assert.match(uiSource, /window\.VORTEX_TECH_THEMES\s*=/, 'js/ui.js deve exportar window.VORTEX_TECH_THEMES.');
assert.match(uiSource, /window\.openThemePickerModal\s*=/, 'js/ui.js deve disponibilizar a função window.openThemePickerModal.');
assert.match(appSource, /openThemePickerModal/, 'js/app.js deve invocar openThemePickerModal ao clicar em Expandir IA.');
assert.match(appSource, /window\.executeGenerateSubject\s*=/, 'js/app.js deve exportar window.executeGenerateSubject para geração unitária.');

console.log('tech-themes-modal-contract-ok');
