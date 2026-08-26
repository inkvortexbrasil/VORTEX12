const assert = require('assert');
const http = require('http');
const WebSocket = require('ws');
const { BrowserExtensionBridge } = require('../browser_extension_bridge');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const bridge = new BrowserExtensionBridge();
  const server = http.createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });
  bridge.attachServer(server);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = server.address().port;
  const client = new WebSocket(`ws://127.0.0.1:${port}/vortex-browser`);
  const seen = [];
  client.on('message', raw => {
    const message = JSON.parse(String(raw));
    seen.push(message);
    if (message.type === 'ensure-tab') {
      const isGemini = message.platform === 'gemini';
      client.send(JSON.stringify({
        type: 'response', requestId: message.requestId, ok: true,
        result: {
          id: isGemini ? 88 : 77,
          windowId: 5,
          index: 1,
          url: isGemini ? 'https://gemini.google.com/app' : 'https://chatgpt.com/'
        }
      }));
    } else if (message.type === 'attach') {
      client.send(JSON.stringify({
        type: 'response', requestId: message.requestId, ok: true,
        result: { attached: true, tabId: message.tabId }
      }));
    } else if (message.type === 'detach') {
      client.send(JSON.stringify({
        type: 'response', requestId: message.requestId, ok: true,
        result: { detached: true }
      }));
    } else if (message.type === 'begin-native-download-session') {
      client.send(JSON.stringify({
        type: 'response', requestId: message.requestId, ok: true,
        result: { active: true, tabId: 77 }
      }));
    } else if (message.type === 'end-native-download-session') {
      client.send(JSON.stringify({
        type: 'response', requestId: message.requestId, ok: true,
        result: { restored: true }
      }));
    } else if (message.type === 'cdp') {
      client.send(JSON.stringify({
        type: 'cdp', sessionToken: message.sessionToken, message: message.message
      }));
    }
  });

  await new Promise((resolve, reject) => {
    client.once('open', resolve);
    client.once('error', reject);
  });
  client.send(JSON.stringify({ type: 'hello', name: 'teste', version: '1.1.7' }));
  for (let attempt = 0; attempt < 20 && !bridge.isConnected(); attempt++) await wait(10);
  assert.equal(bridge.isConnected(), true);

  const tab = await bridge.ensureChatGPTTab();
  assert.equal(tab.id, 77);
  assert.equal(tab.windowId, 5);

  const geminiTab = await bridge.ensureGeminiTab();
  assert.equal(geminiTab.id, 88);
  assert.equal(geminiTab.url, 'https://gemini.google.com/app');

  const inspectedTab = await bridge.ensurePlatformTab('chatgpt', { activate: false });
  assert.equal(inspectedTab.id, 77);

  // Test 1: Single transport flow
  const transport = await bridge.createTransport('chatgpt');
  await bridge.beginNativeDownloadSession();
  await bridge.endNativeDownloadSession();
  const received = new Promise(resolve => { transport.onmessage = resolve; });
  transport.send(JSON.stringify({ id: 1, method: 'Browser.getVersion' }));
  assert.equal(await received, JSON.stringify({ id: 1, method: 'Browser.getVersion' }));
  transport.close();
  await wait(30);

  // Test 2: Concurrent Multi-Session Transport (ChatGPT + Gemini simultaneously)
  const gptTransport = await bridge.createTransport('chatgpt');
  const geminiTransport = await bridge.createTransport('gemini');

  assert.equal(bridge.status().active, true);
  assert.deepEqual(bridge.status().activePlatforms.sort(), ['chatgpt', 'gemini']);

  // Trying to open a second GPT transport concurrently should throw
  let duplicateError = null;
  try {
    await bridge.createTransport('chatgpt');
  } catch (err) {
    duplicateError = err;
  }
  assert(duplicateError, 'Deve impedir duas sessões do mesmo provedor');

  // Both transports send/receive CDP independently
  const gptReceived = new Promise(resolve => { gptTransport.onmessage = resolve; });
  const geminiReceived = new Promise(resolve => { geminiTransport.onmessage = resolve; });

  gptTransport.send(JSON.stringify({ id: 10, method: 'Page.enable' }));
  geminiTransport.send(JSON.stringify({ id: 20, method: 'DOM.enable' }));

  assert.equal(await gptReceived, JSON.stringify({ id: 10, method: 'Page.enable' }));
  assert.equal(await geminiReceived, JSON.stringify({ id: 20, method: 'DOM.enable' }));

  // Detaching GPT should NOT close Gemini
  gptTransport.close();
  await wait(30);
  assert.equal(gptTransport.closed, true);
  assert.equal(geminiTransport.closed, false);
  assert.deepEqual(bridge.status().activePlatforms, ['gemini']);

  // Unexpected detach on Gemini
  client.send(JSON.stringify({
    type: 'detached',
    sessionToken: geminiTransport.sessionToken,
    reason: 'canceled_by_user'
  }));
  await wait(30);
  assert.equal(geminiTransport.closed, true);
  assert.equal(bridge.status().lastUnexpectedDetach.reason, 'canceled_by_user');
  assert.equal(bridge.status().lastUnexpectedDetach.platform, 'gemini');

  clearInterval(bridge.pingTimer);
  client.close();
  await new Promise(resolve => server.close(resolve));
  bridge.wss.close();
  console.log('browser-extension-bridge-ok');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

