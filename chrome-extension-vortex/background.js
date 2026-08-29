const BRIDGE_URL = 'ws://127.0.0.1:8787/vortex-browser';
const CHATGPT_URL = 'https://chatgpt.com/';
const GEMINI_URL = 'https://gemini.google.com/app';
const ROBOT_PLATFORMS = {
  chatgpt: {
    url: CHATGPT_URL,
    pattern: 'https://chatgpt.com/*',
    origin: 'https://chatgpt.com/'
  },
  gemini: {
    url: GEMINI_URL,
    pattern: 'https://gemini.google.com/*',
    origin: 'https://gemini.google.com/'
  }
};
const CENTRAL_PATTERNS = [
  'http://localhost:8787/*',
  'http://127.0.0.1:8787/*'
];

let socket = null;
let reconnectTimer = null;
const attachedSessions = new Map(); // sessionToken -> { sessionToken, tabId, platform, protection, downloadReturnTabId }
const tabToSession = new Map();     // tabId -> sessionToken
const armedDownloads = new Map();   // token -> { token, filename, platform, sessionToken, downloadId, armedAt }
let globalDownloadReturnTabId = null;

function validDownloadFilename(value) {
  const filename = String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!filename || filename.includes('..')) throw new Error('O nome temporario do download e invalido.');
  return filename;
}

chrome.downloads.onCreated.addListener(item => {
  for (const armed of armedDownloads.values()) {
    if (armed.downloadId == null) {
      armed.downloadId = item.id;
      break;
    }
  }
});

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  let matched = null;
  for (const armed of armedDownloads.values()) {
    if (armed.downloadId === item.id) {
      matched = armed;
      break;
    }
  }
  if (!matched) {
    for (const armed of armedDownloads.values()) {
      if (armed.downloadId == null) {
        armed.downloadId = item.id;
        matched = armed;
        break;
      }
    }
  }
  if (!matched) return;
  suggest({ filename: matched.filename, conflictAction: 'overwrite' });
  return true;
});

function send(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function respond(requestId, ok, result, error) {
  send({ type: 'response', requestId, ok, result, error });
}

function scheduleReconnect(delayMs = 2000) {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connectBridge, delayMs);
}

function connectBridge() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  try {
    socket = new WebSocket(BRIDGE_URL);
  } catch (error) {
    scheduleReconnect();
    return;
  }
  socket.addEventListener('open', () => {
    send({ type: 'hello', name: 'VORTEX12 - Ponte do Robo Web', version: '1.3.0' });
  });
  socket.addEventListener('message', event => {
    handleBridgeMessage(event.data).catch(error => {
      console.error('Ponte VORTEX:', error);
    });
  });
  socket.addEventListener('close', () => {
    socket = null;
    detachDebugger().catch(() => {});
    scheduleReconnect();
  });
  socket.addEventListener('error', () => {
    try { socket.close(); } catch (error) {}
  });
}

async function centralTab() {
  const tabs = await chrome.tabs.query({ url: CENTRAL_PATTERNS });
  if (!tabs.length) return null;
  const active = tabs.find(tab => tab.active);
  return active || tabs.sort((left, right) => (right.lastAccessed || 0) - (left.lastAccessed || 0))[0];
}

async function waitForTabReady(tabId, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === 'complete') return tab;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return chrome.tabs.get(tabId);
}

function platformFromRequest(platform, url) {
  if (platform === 'gemini' || String(url || '').startsWith(ROBOT_PLATFORMS.gemini.origin)) {
    return ROBOT_PLATFORMS.gemini;
  }
  return ROBOT_PLATFORMS.chatgpt;
}

async function ensureRobotTab(platform = 'chatgpt', requestedUrl = '', activate = true) {
  const config = platformFromRequest(platform, requestedUrl);
  const central = await centralTab();
  if (!central) {
    throw new Error('A guia da Central VORTEX12 nao foi encontrada nesta janela.');
  }
  const robotTabs = await chrome.tabs.query({ url: [config.pattern] });
  const adjacentTabs = robotTabs
    .filter(candidate => candidate.windowId === central.windowId)
    .sort((left, right) => (right.lastAccessed || 0) - (left.lastAccessed || 0));
  const tab = adjacentTabs[0];

  if (!tab) {
    const label = config === ROBOT_PLATFORMS.gemini ? 'GEMINI' : 'GPT';
    throw new Error(`AGUARDANDO A GUIA ${label}: abra a sessao desejada imediatamente ao lado da Central e confirme novamente.`);
  }
  if (activate) await chrome.tabs.update(tab.id, { active: true });
  return waitForTabReady(tab.id);
}

async function ensureChatGPTTab(url = CHATGPT_URL) {
  return ensureRobotTab('chatgpt', url);
}

async function actualTargetInfo(tabId, type, fallbackUrl = CHATGPT_URL) {
  const tab = await chrome.tabs.get(tabId);
  return {
    targetId: type === 'tab' ? 'tabTargetId' : 'pageTargetId',
    type,
    title: tab.title || type,
    url: tab.url || fallbackUrl,
    attached: false,
    canAccessOpener: false
  };
}

function dispatchCdp(sessionToken, message) {
  send({
    type: 'cdp',
    sessionToken,
    message: JSON.stringify(message)
  });
}

async function restoreRobotTabProtection(protection) {
  if (!protection || protection.tabId == null) return;
  await chrome.tabs.update(protection.tabId, {
    autoDiscardable: protection.autoDiscardable
  }).catch(() => {});
}

async function beginNativeDownloadSession(sessionToken = null) {
  let targetTabId = null;
  let session = null;
  if (sessionToken && attachedSessions.has(sessionToken)) {
    session = attachedSessions.get(sessionToken);
    targetTabId = session.tabId;
  } else if (attachedSessions.size === 1) {
    session = Array.from(attachedSessions.values())[0];
    targetTabId = session.tabId;
  }
  if (targetTabId == null) throw new Error('Nenhuma guia do Robo Web esta conectada para o download.');
  const robotTab = await chrome.tabs.get(targetTabId);
  const [activeTab] = await chrome.tabs.query({ active: true, windowId: robotTab.windowId });
  const returnTabId = activeTab?.id !== targetTabId ? activeTab?.id ?? null : null;
  if (session) {
    session.downloadReturnTabId = returnTabId;
  } else {
    globalDownloadReturnTabId = returnTabId;
  }
  await chrome.tabs.update(targetTabId, { active: true });
  await new Promise(resolve => setTimeout(resolve, 350));
  return { active: true, tabId: targetTabId };
}

async function endNativeDownloadSession(sessionToken = null) {
  let returnTabId = null;
  if (sessionToken && attachedSessions.has(sessionToken)) {
    const session = attachedSessions.get(sessionToken);
    returnTabId = session.downloadReturnTabId;
    session.downloadReturnTabId = null;
  } else {
    returnTabId = globalDownloadReturnTabId;
    globalDownloadReturnTabId = null;
  }
  if (returnTabId == null) return;
  await chrome.tabs.update(returnTabId, { active: true }).catch(() => {});
}

async function detachDebugger(sessionToken = null) {
  if (sessionToken) {
    const session = attachedSessions.get(sessionToken);
    if (!session) return;
    attachedSessions.delete(sessionToken);
    tabToSession.delete(session.tabId);
    await chrome.debugger.sendCommand(
      { tabId: session.tabId },
      'Emulation.setFocusEmulationEnabled',
      { enabled: false }
    ).catch(() => {});
    await chrome.debugger.sendCommand(
      { tabId: session.tabId },
      'Emulation.clearIdleOverride'
    ).catch(() => {});
    await chrome.debugger.detach({ tabId: session.tabId }).catch(() => {});
    if (session.downloadReturnTabId != null) {
      await chrome.tabs.update(session.downloadReturnTabId, { active: true }).catch(() => {});
    }
    await restoreRobotTabProtection(session.protection);
    return;
  }

  for (const session of Array.from(attachedSessions.values())) {
    attachedSessions.delete(session.sessionToken);
    tabToSession.delete(session.tabId);
    await chrome.debugger.sendCommand(
      { tabId: session.tabId },
      'Emulation.setFocusEmulationEnabled',
      { enabled: false }
    ).catch(() => {});
    await chrome.debugger.sendCommand(
      { tabId: session.tabId },
      'Emulation.clearIdleOverride'
    ).catch(() => {});
    await chrome.debugger.detach({ tabId: session.tabId }).catch(() => {});
    if (session.downloadReturnTabId != null) {
      await chrome.tabs.update(session.downloadReturnTabId, { active: true }).catch(() => {});
    }
    await restoreRobotTabProtection(session.protection);
  }
}

async function attachDebugger(tabId, sessionToken, platform = 'chatgpt') {
  if (attachedSessions.has(sessionToken)) {
    await detachDebugger(sessionToken);
  }
  if (tabToSession.has(tabId)) {
    const existingSessionToken = tabToSession.get(tabId);
    await detachDebugger(existingSessionToken);
  }

  const tab = await chrome.tabs.get(tabId);
  const protection = {
    tabId,
    autoDiscardable: tab.autoDiscardable !== false
  };
  await chrome.tabs.update(tabId, { autoDiscardable: false });
  try {
    await chrome.debugger.attach({ tabId }, '1.3');
    const session = {
      sessionToken,
      tabId,
      platform,
      protection,
      downloadReturnTabId: null
    };
    attachedSessions.set(sessionToken, session);
    tabToSession.set(tabId, sessionToken);

    await chrome.debugger.sendCommand(
      { tabId },
      'Emulation.setFocusEmulationEnabled',
      { enabled: true }
    );
    await chrome.debugger.sendCommand(
      { tabId },
      'Emulation.setIdleOverride',
      { isUserActive: true, isScreenUnlocked: true }
    ).catch(() => {});
  } catch (error) {
    attachedSessions.delete(sessionToken);
    tabToSession.delete(tabId);
    await chrome.debugger.detach({ tabId }).catch(() => {});
    await restoreRobotTabProtection(protection);
    throw error;
  }
}

async function handleCdpMessage(sessionToken, rawMessage) {
  const session = attachedSessions.get(sessionToken);
  if (!session || session.tabId == null) throw new Error('Nenhuma guia do Robo Web esta conectada para esta sessao.');
  const tabId = session.tabId;
  const fallbackUrl = session.platform === 'gemini' ? GEMINI_URL : CHATGPT_URL;
  const parsed = JSON.parse(rawMessage);
  const tabInfo = await actualTargetInfo(tabId, 'tab', fallbackUrl);
  const pageInfo = await actualTargetInfo(tabId, 'page', fallbackUrl);

  if (parsed.method === 'Browser.getVersion') {
    dispatchCdp(sessionToken, {
      id: parsed.id,
      sessionId: parsed.sessionId,
      method: parsed.method,
      result: {
        protocolVersion: '1.3',
        product: 'chrome',
        revision: 'unknown',
        userAgent: navigator.userAgent,
        jsVersion: 'unknown'
      }
    });
    return;
  }
  if (parsed.method === 'Target.getBrowserContexts') {
    dispatchCdp(sessionToken, { id: parsed.id, sessionId: parsed.sessionId, method: parsed.method, result: { browserContextIds: [] } });
    return;
  }
  if (parsed.method === 'Target.setDiscoverTargets') {
    dispatchCdp(sessionToken, { method: 'Target.targetCreated', params: { targetInfo: tabInfo } });
    dispatchCdp(sessionToken, { method: 'Target.targetCreated', params: { targetInfo: pageInfo } });
    dispatchCdp(sessionToken, { id: parsed.id, sessionId: parsed.sessionId, method: parsed.method, result: {} });
    return;
  }
  if (parsed.method === 'Target.setAutoAttach') {
    if (parsed.sessionId === 'tabTargetSessionId') {
      dispatchCdp(sessionToken, {
        method: 'Target.attachedToTarget',
        sessionId: 'tabTargetSessionId',
        params: { targetInfo: pageInfo, sessionId: 'pageTargetSessionId' }
      });
      dispatchCdp(sessionToken, { id: parsed.id, sessionId: parsed.sessionId, method: parsed.method, result: {} });
      return;
    }
    if (!parsed.sessionId) {
      dispatchCdp(sessionToken, {
        method: 'Target.attachedToTarget',
        params: { targetInfo: tabInfo, sessionId: 'tabTargetSessionId' }
      });
      dispatchCdp(sessionToken, { id: parsed.id, sessionId: parsed.sessionId, method: parsed.method, result: {} });
      return;
    }
  }

  const command = { ...parsed };
  if (command.sessionId === 'pageTargetSessionId') delete command.sessionId;
  const debuggee = { tabId };
  if (command.sessionId) debuggee.sessionId = command.sessionId;
  try {
    const result = await chrome.debugger.sendCommand(debuggee, command.method, command.params);
    dispatchCdp(sessionToken, {
      id: command.id,
      sessionId: command.sessionId || 'pageTargetSessionId',
      method: command.method,
      result
    });
  } catch (error) {
    dispatchCdp(sessionToken, {
      id: command.id,
      sessionId: command.sessionId || 'pageTargetSessionId',
      method: command.method,
      error: {
        code: error.code,
        data: error.data,
        message: error.message || 'Falha no controle do Edge.'
      }
    });
  }
}

async function handleBridgeMessage(rawData) {
  const message = JSON.parse(String(rawData));
  if (message.type === 'ping') {
    send({ type: 'pong', at: Date.now() });
    return;
  }
  if (message.type === 'ensure-tab') {
    try {
      const tab = await ensureRobotTab(message.platform, message.url, message.activate !== false);
      respond(message.requestId, true, {
        id: tab.id,
        windowId: tab.windowId,
        index: tab.index,
        url: tab.url,
        title: tab.title
      });
    } catch (error) {
      respond(message.requestId, false, null, error.message);
    }
    return;
  }
  if (message.type === 'download-url') {
    try {
      const url = String(message.url || '');
      const filename = String(message.filename || '').replace(/\\/g, '/').replace(/^\/+/, '');
      if (!/^(?:https?:|data:)/i.test(url)) throw new Error('A imagem do Gemini nao forneceu um endereco valido para download.');
      if (!filename || filename.includes('..')) throw new Error('O nome temporario do download e invalido.');
      const downloadId = await chrome.downloads.download({
        url,
        filename,
        conflictAction: 'overwrite',
        saveAs: false
      });
      const completed = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          chrome.downloads.onChanged.removeListener(onChanged);
          reject(new Error('O download do Gemini excedeu o tempo limite.'));
        }, 180000);
        const onChanged = delta => {
          if (delta.id !== downloadId || !delta.state) return;
          if (delta.state.current === 'complete') {
            clearTimeout(timer);
            chrome.downloads.onChanged.removeListener(onChanged);
            resolve(true);
          } else if (delta.state.current === 'interrupted') {
            clearTimeout(timer);
            chrome.downloads.onChanged.removeListener(onChanged);
            reject(new Error('O Edge interrompeu o download do Gemini.'));
          }
        };
        chrome.downloads.onChanged.addListener(onChanged);
      });
      if (!completed) throw new Error('O Edge nao confirmou o download do Gemini.');
      const [item] = await chrome.downloads.search({ id: downloadId });
      if (!item || !item.filename) throw new Error('O arquivo baixado pelo Gemini nao foi localizado.');
      respond(message.requestId, true, { id: downloadId, filename: item.filename, state: item.state });
    } catch (error) {
      respond(message.requestId, false, null, error.message);
    }
    return;
  }
  if (message.type === 'arm-download') {
    try {
      const token = crypto.randomUUID();
      const filename = validDownloadFilename(message.filename);
      armedDownloads.set(token, {
        token,
        filename,
        platform: message.platform || null,
        sessionToken: message.sessionToken || null,
        downloadId: null,
        armedAt: Date.now()
      });
      respond(message.requestId, true, { token });
    } catch (error) {
      respond(message.requestId, false, null, error.message);
    }
    return;
  }
  if (message.type === 'wait-download') {
    try {
      const entry = armedDownloads.get(message.token);
      if (!entry) throw new Error('O download preparado pelo Robo Web nao foi localizado.');
      const token = message.token;
      const deadline = Date.now() + 180000;
      let item = null;
      while (Date.now() < deadline) {
        if (!armedDownloads.has(token)) throw new Error('O download preparado foi cancelado.');
        if (entry.downloadId != null) {
          [item] = await chrome.downloads.search({ id: entry.downloadId });
          if (item?.state === 'complete') break;
          if (item?.state === 'interrupted') throw new Error('O Edge interrompeu o download do Gemini.');
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      if (!item || item.state !== 'complete' || !item.filename) throw new Error('O download original do Gemini excedeu o tempo limite.');
      armedDownloads.delete(token);
      respond(message.requestId, true, { id: item.id, filename: item.filename, state: item.state });
    } catch (error) {
      armedDownloads.delete(message.token);
      respond(message.requestId, false, null, error.message);
    }
    return;
  }
  if (message.type === 'cancel-download') {
    if (message.token && armedDownloads.has(message.token)) {
      armedDownloads.delete(message.token);
    }
    respond(message.requestId, true, { cancelled: true });
    return;
  }
  if (message.type === 'begin-native-download-session') {
    try {
      const result = await beginNativeDownloadSession(message.sessionToken);
      respond(message.requestId, true, result);
    } catch (error) {
      respond(message.requestId, false, null, error.message);
    }
    return;
  }
  if (message.type === 'end-native-download-session') {
    await endNativeDownloadSession(message.sessionToken);
    respond(message.requestId, true, { restored: true });
    return;
  }
  if (message.type === 'attach') {
    try {
      await attachDebugger(message.tabId, message.sessionToken, message.platform);
      respond(message.requestId, true, { attached: true, tabId: message.tabId });
    } catch (error) {
      respond(message.requestId, false, null, error.message);
    }
    return;
  }
  if (message.type === 'detach') {
    await detachDebugger(message.sessionToken);
    respond(message.requestId, true, { detached: true });
    return;
  }
  if (message.type === 'cdp' && message.sessionToken && attachedSessions.has(message.sessionToken)) {
    await handleCdpMessage(message.sessionToken, message.message);
  }
}

chrome.debugger.onEvent.addListener((source, method, params) => {
  const sessionToken = tabToSession.get(source.tabId);
  if (!sessionToken) return;
  dispatchCdp(sessionToken, {
    sessionId: source.sessionId || 'pageTargetSessionId',
    method,
    params
  });
});

chrome.debugger.onDetach.addListener((source, reason) => {
  const sessionToken = tabToSession.get(source.tabId);
  if (!sessionToken) return;
  const session = attachedSessions.get(sessionToken);
  attachedSessions.delete(sessionToken);
  tabToSession.delete(source.tabId);
  if (session) {
    if (session.downloadReturnTabId != null) {
      chrome.tabs.update(session.downloadReturnTabId, { active: true }).catch(() => {});
    }
    restoreRobotTabProtection(session.protection).catch(() => {});
  }
  send({ type: 'detached', sessionToken, reason });
});

chrome.action.onClicked.addListener(() => {
  connectBridge();
  ensureChatGPTTab().catch(error => console.error('Ponte VORTEX:', error));
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('vortex-bridge', { periodInMinutes: 0.5 });
  connectBridge();
});

chrome.runtime.onStartup.addListener(connectBridge);
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'vortex-bridge') connectBridge();
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && /^http:\/\/(localhost|127\.0\.0\.1):8787\//.test(tab.url || '')) {
    connectBridge();
  }
});

connectBridge();

