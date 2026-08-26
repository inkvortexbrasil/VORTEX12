const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const createChatGPTAutomationRouter = require('../routes/chatgpt_automation_routes');
const createGeminiAutomationRouter = require('../routes/automation_routes');

test('endpoint /api/automate-chatgpt/status auto-discovers running job after F5 and supports provider filtering', async () => {
  const activeChatGPTWebJobs = {
    'job-old-1': { jobId: 'job-old-1', status: 'completed', progress: 100 },
    'job-gpt-running': { jobId: 'job-gpt-running', provider: 'chatgpt', status: 'running', progress: 45, message: 'GPT gerando cena 22/50...' },
    'job-gemini-running': { jobId: 'job-gemini-running', provider: 'gemini', status: 'running', progress: 80, message: 'Gemini baixando cena 40/50...' }
  };

  const router = createChatGPTAutomationRouter({
    activeChatGPTWebJobs,
    send: (res, code, data) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    },
    sendApiError: (res, err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    },
    readBody: async () => ({}),
    ROOT: path.resolve(__dirname, '../..'),
    sanitizeNumericId: id => String(id).padStart(2, '0')
  });

  const server = http.createServer(async (req, res) => {
    const handled = await router(req, res);
    if (!handled) {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    // 1. Consulta SEM jobId (simulando F5 genérico)
    const resNoId = await fetch(`http://127.0.0.1:${port}/api/automate-chatgpt/status`);
    assert.strictEqual(resNoId.status, 200);
    const dataNoId = await resNoId.json();
    assert.strictEqual(dataNoId.status, 'running');

    // 2. Consulta filtrando por provider=chatgpt
    const resGpt = await fetch(`http://127.0.0.1:${port}/api/automate-chatgpt/status?provider=chatgpt`);
    assert.strictEqual(resGpt.status, 200);
    const dataGpt = await resGpt.json();
    assert.strictEqual(dataGpt.jobId, 'job-gpt-running');
    assert.strictEqual(dataGpt.provider, 'chatgpt');
    assert.strictEqual(dataGpt.progress, 45);

    // 3. Consulta filtrando por provider=gemini
    const resGemini = await fetch(`http://127.0.0.1:${port}/api/automate-chatgpt/status?provider=gemini`);
    assert.strictEqual(resGemini.status, 200);
    const dataGemini = await resGemini.json();
    assert.strictEqual(dataGemini.jobId, 'job-gemini-running');
    assert.strictEqual(dataGemini.provider, 'gemini');
    assert.strictEqual(dataGemini.progress, 80);

    // 4. Consulta com jobId específico
    const resSpecific = await fetch(`http://127.0.0.1:${port}/api/automate-chatgpt/status?jobId=job-old-1`);
    assert.strictEqual(resSpecific.status, 200);
    const dataSpecific = await resSpecific.json();
    assert.strictEqual(dataSpecific.status, 'completed');
    assert.strictEqual(dataSpecific.jobId, 'job-old-1');
  } finally {
    server.close();
  }
});

test('endpoint /api/automate-gemini/status auto-discovers running job after F5 (no jobId)', async () => {
  const activeGeminiWebJobs = {
    'gemini-run-1': { jobId: 'gemini-run-1', status: 'running', progress: 60, message: 'Baixando cena 03...' }
  };

  const router = createGeminiAutomationRouter({
    activeGeminiWebJobs,
    PORT: 0,
    send: (res, code, data) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    },
    sendApiError: (res, err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    },
    readBody: async () => ({}),
    ROOT: path.resolve(__dirname, '../..'),
    sanitizeNumericId: id => String(id).padStart(2, '0')
  });

  const server = http.createServer(async (req, res) => {
    const handled = await router(req, res);
    if (!handled) {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    // 1. Consulta SEM jobId
    const res = await fetch(`http://127.0.0.1:${port}/api/automate-gemini/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'running');
    assert.strictEqual(data.jobId, 'gemini-run-1');
    assert.strictEqual(data.progress, 60);
  } finally {
    server.close();
  }
});

test('frontend js/app.js and index.html implement side-by-side dual telemetries (GPT and Gemini)', () => {
  const appJs = fs.readFileSync(path.resolve(__dirname, '../../js/app.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');

  // Funções de persistência e consulta independentes para GPT e Gemini
  assert(appJs.includes('window.saveActiveDocGptJob = function'), 'js/app.js deve conter saveActiveDocGptJob');
  assert(appJs.includes('window.saveActiveDocGeminiJob = function'), 'js/app.js deve conter saveActiveDocGeminiJob');
  assert(appJs.includes('window.getActiveDocGptJob = function'), 'js/app.js deve conter getActiveDocGptJob');
  assert(appJs.includes('window.getActiveDocGeminiJob = function'), 'js/app.js deve conter getActiveDocGeminiJob');
  assert(appJs.includes('window.isDocGptRobotRunning = function'), 'js/app.js deve conter isDocGptRobotRunning');
  assert(appJs.includes('window.isDocGeminiRobotRunning = function'), 'js/app.js deve conter isDocGeminiRobotRunning');
  assert(appJs.includes('window.showDocGptTopbarTelemetry = function'), 'js/app.js deve conter showDocGptTopbarTelemetry');
  assert(appJs.includes('window.showDocGeminiTopbarTelemetry = function'), 'js/app.js deve conter showDocGeminiTopbarTelemetry');
  assert(appJs.includes('window.pollDocGptAutomationStatus = function'), 'js/app.js deve conter pollDocGptAutomationStatus');
  assert(appJs.includes('window.pollDocGeminiAutomationStatus = function'), 'js/app.js deve conter pollDocGeminiAutomationStatus');
  assert(appJs.includes('window.cancelDocChatGPTRobot = async function'), 'js/app.js deve conter cancelDocChatGPTRobot');
  assert(appJs.includes('window.cancelDocGeminiRobot = async function'), 'js/app.js deve conter cancelDocGeminiRobot');

  // Compatibilidade retroativa
  assert(appJs.includes('window.saveActiveDocRobotJob = function'), 'js/app.js deve conter saveActiveDocRobotJob');
  assert(appJs.includes('window.clearActiveDocRobotJob = function'), 'js/app.js deve conter clearActiveDocRobotJob');
  assert(appJs.includes('window.getActiveDocRobotJob = function'), 'js/app.js deve conter getActiveDocRobotJob');
  assert(appJs.includes('window.autoResumeAllRobotTelemetries = async function'), 'js/app.js deve conter autoResumeAllRobotTelemetries');
  assert(appJs.includes('window.ensureDocTopbarTelemetryElement = function'), 'js/app.js deve conter ensureDocTopbarTelemetryElement');
  assert(appJs.includes('window.isDocRobotRunning = function'), 'js/app.js deve conter isDocRobotRunning');
  assert(appJs.includes('autoResumeAllRobotTelemetries();'), 'DOMContentLoaded deve acionar autoResumeAllRobotTelemetries');

  // Elementos no topo fixo (index.html)
  assert(indexHtml.includes('id="docMonitorsRow"'), 'index.html deve conter docMonitorsRow');
  assert(indexHtml.includes('id="docGptMonitorContainer"'), 'index.html deve conter docGptMonitorContainer');
  assert(indexHtml.includes('id="docGeminiMonitorContainer"'), 'index.html deve conter docGeminiMonitorContainer');
  assert(indexHtml.includes('id="docMonitorContainer"'), 'index.html deve conter docMonitorContainer para compatibilidade');
  assert(indexHtml.includes('id="topbarMultiverseTitle"'), 'index.html deve conter topbarMultiverseTitle');
});
