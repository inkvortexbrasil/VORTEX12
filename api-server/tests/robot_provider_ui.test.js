const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const state = fs.readFileSync(path.join(root, 'js', 'state.js'), 'utf8');
const bridgeExtension = fs.readFileSync(path.join(root, 'chrome-extension-vortex', 'background.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'chrome-extension-vortex', 'manifest.json'), 'utf8'));
const serverBridge = fs.readFileSync(path.join(root, 'api-server', 'browser_extension_bridge.js'), 'utf8');

const dashboardSwitcherStart = app.indexOf('window.mountVisualRobotSwitcher');
const dashboardSwitcherEnd = app.indexOf('window.mountDocTopbarTelemetry', dashboardSwitcherStart);
const dashboardSwitcher = app.slice(dashboardSwitcherStart, dashboardSwitcherEnd);

const switcherStart = app.indexOf('window.mountDocVisualRobotSwitcher');
const switcherEnd = app.indexOf('window.startDocChatGPTDownloadOnly', switcherStart);
const switcher = app.slice(switcherStart, switcherEnd);

assert(switcher.includes('docVisualRobotProvider'));
assert(switcher.includes('>GPT</option>'));
assert(switcher.includes('>GEMINI</option>'));
assert(!switcher.includes('↻ FOTOS'));
assert(!switcher.includes('↻ PROMPTS'));
assert(!app.includes('window.startDocVisualRobotMissing ='));
assert(!app.includes('window.startDocChatGPTCompleteMissing ='));
assert(!app.includes('window.startDocVisualRobotMissingPhotos ='));
assert(!app.includes('window.startDocChatGPTMissingPhotos ='));
assert(app.includes('/api/automate-gemini-vortex/start'));
assert(app.includes("topbar.appendChild(monitor)"));
assert(app.includes('window.showDocTopbarTelemetry'));
assert(app.includes('window.hideDocTopbarTelemetry'));
assert(app.includes("if (job.status === 'failed') window.showDocTopbarTelemetry()"));
assert(!app.includes('retomar automaticamente uma rodada interrompida'));
assert(!app.includes('retomando no mesmo chat'));
assert(app.includes('abrir um novo chat e solicitar as 50 posições da fila oficial'));
assert(app.includes('chat que está visível ao lado da Central'));
assert(app.includes('posições absolutas'));
const documentarios = fs.readFileSync(path.join(root, 'js', 'documentarios.js'), 'utf8');
assert(documentarios.includes('MARCAR VAZIAS'));
assert(documentarios.includes("image.dataset.docThumbPresent = '0'"));
assert(documentarios.includes("image.dataset.docThumbPresent = '1'"));
assert(documentarios.includes('window.markEmptyDocPhase2Checkboxes'));
assert(!switcher.includes('GPT 1'));
assert(!switcher.includes('GPT 2'));
assert(!switcher.includes('BAIXAR 01'));
assert(!switcher.includes('TROCAR CONTA'));
assert(!state.includes('chatGPTAccountId'));

assert(dashboardSwitcher.includes('buildGPTMarkupFromGemini'));
assert(dashboardSwitcher.includes('template.innerHTML = window.__visualRobotGeminiMarkup[key]'));
assert(dashboardSwitcher.includes("title.textContent = 'CHATGPT WEB (5 IMAGENS)'"));
assert(dashboardSwitcher.includes("button.id = 'btnAutomateChatGPTFlow'"));
assert(dashboardSwitcher.includes("spans[1].textContent = 'ROBÔ GPT'"));
assert(!dashboardSwitcher.includes('compactGPTLayout'));

assert(bridgeExtension.includes("Math.abs(candidate.index - central.index) === 1"));
assert(bridgeExtension.includes('AGUARDANDO A GUIA'));
assert(bridgeExtension.includes('if (activate) await chrome.tabs.update'));
assert(bridgeExtension.includes('autoDiscardable: false'));
assert(bridgeExtension.includes("'Emulation.setFocusEmulationEnabled'"));
assert(bridgeExtension.includes("'Emulation.setIdleOverride'"));
assert(bridgeExtension.includes('restoreRobotTabProtection(protection)'));
assert(!bridgeExtension.includes('chrome.tabs.create'));
assert(!bridgeExtension.includes('chrome.tabs.move'));
assert(manifest.host_permissions.includes('https://chatgpt.com/*'));
assert(manifest.host_permissions.includes('https://gemini.google.com/*'));
assert.ok(manifest.version === '1.1.7' || manifest.version === '1.2.0');
assert(serverBridge.includes('A Ponte VORTEX 1.1.5 ou superior ainda nao foi ativada'));
assert(bridgeExtension.includes('begin-native-download-session'));
assert(bridgeExtension.includes('end-native-download-session'));

console.log('robot-provider-ui-ok');
