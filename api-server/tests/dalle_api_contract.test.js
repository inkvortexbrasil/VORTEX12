const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const robotManifest = require('../robot_manifest');
const dalleApiService = require('../services/dalle_api_service');
const createDalleAutomationRouter = require('../routes/dalle_automation_routes');

test('Contrato DALL-E 3: safeProvider aceita dalle como provedor oficial', () => {
  const { safeProvider } = robotManifest.__testHooks;
  assert.equal(safeProvider('dalle'), 'dalle');
  assert.equal(safeProvider('DALLE'), 'dalle');
  assert.equal(safeProvider('chatgpt'), 'chatgpt');
  assert.equal(safeProvider('gemini'), 'gemini');
  assert.throws(() => safeProvider('midjourney'), /Provedor inválido/);
});

test('Contrato DALL-E 3: getDalleAutomationStatus retorna estrutura padronizada de telemetria', () => {
  const status = dalleApiService.getDalleAutomationStatus('01');
  assert.equal(typeof status, 'object');
  assert.equal(typeof status.active, 'boolean');
  assert.equal(typeof status.percent, 'number');
  assert.ok(Array.isArray(status.completedSequences));
  assert.ok(Array.isArray(status.failedSequences));
  assert.ok(Array.isArray(status.skippedSequences));
  assert.equal(typeof status.log, 'string');
});

test('Contrato DALL-E 3: Roteador HTTP responde a GET /api/automate-dalle/status e POST cancel', async () => {
  const router = createDalleAutomationRouter();

  // Teste GET status
  let resStatusHeaders = {};
  let resStatusBody = '';
  const mockResStatus = {
    writeHead(code, headers) { resStatusHeaders = { code, ...headers }; },
    end(body) { resStatusBody = body; }
  };
  await router({ method: 'GET' }, mockResStatus, '/api/automate-dalle/status', { number: '01' }, async () => ({}));
  assert.equal(resStatusHeaders.code, 200);
  const parsedStatus = JSON.parse(resStatusBody);
  assert.equal(parsedStatus.ok, true);
  assert.ok(parsedStatus.status);

  // Teste POST cancel
  let resCancelHeaders = {};
  let resCancelBody = '';
  const mockResCancel = {
    writeHead(code, headers) { resCancelHeaders = { code, ...headers }; },
    end(body) { resCancelBody = body; }
  };
  await router({ method: 'POST' }, mockResCancel, '/api/automate-dalle/cancel', {}, async () => ({}));
  assert.equal(resCancelHeaders.code, 200);
  const parsedCancel = JSON.parse(resCancelBody);
  assert.equal(parsedCancel.ok, true);
});

test('Contrato DALL-E 3: Roteador HTTP valida parâmetros inválidos em POST /api/automate-dalle/start', async () => {
  const router = createDalleAutomationRouter();
  let resHeaders = {};
  let resBody = '';
  const mockRes = {
    writeHead(code, headers) { resHeaders = { code, ...headers }; },
    end(body) { resBody = body; }
  };
  await router({ method: 'POST' }, mockRes, '/api/automate-dalle/start', {}, async () => ({ campaignNumber: '' }));
  assert.equal(resHeaders.code, 400);
  const parsed = JSON.parse(resBody);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.error);
});
