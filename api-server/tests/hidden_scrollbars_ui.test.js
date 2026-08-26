const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const mainSource = fs.readFileSync(path.join(root, 'css', 'main.css'), 'utf8');
const componentsSource = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');
const layoutSource = fs.readFileSync(path.join(root, 'css', 'layout.css'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');

assert.ok(mainSource.includes('*::-webkit-scrollbar'), 'A proteção global das barras deve existir.');
assert.ok(mainSource.includes('display: none !important'), 'As barras visuais devem permanecer ocultas.');
assert.ok(mainSource.includes('scrollbar-width: none !important'), 'A proteção deve cobrir todos os navegadores compatíveis.');
assert.ok(!mainSource.includes('.show-scroll::-webkit-scrollbar'), 'As áreas de texto não podem reativar a barra.');
assert.ok(!mainSource.includes('scrollbar-width: thin'), 'Nenhuma barra fina pode ser forçada.');
assert.ok(!componentsSource.includes('::-webkit-scrollbar'), 'Menus e listas não podem ter exceções visuais.');
assert.ok(layoutSource.includes('overflow-y: auto'), 'A rolagem da Biblioteca deve continuar funcional.');
assert.ok(uiSource.includes('overflow-y: auto'), 'A rolagem dos textos deve continuar funcional.');

console.log('hidden-scrollbars-ui-ok');
