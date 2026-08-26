const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');

const BRIDGE_PATH = '/vortex-browser';
const REQUEST_TIMEOUT_MS = 15000;

class ExtensionRelayTransport {
  constructor(bridge, sessionToken, platform = 'chatgpt') {
    this.bridge = bridge;
    this.sessionToken = sessionToken;
    this.platform = platform;
    this.onmessage = undefined;
    this.onclose = undefined;
    this.closed = false;
  }

  send(message) {
    if (this.closed) {
      const label = this.platform === 'gemini' ? 'Gemini' : (this.platform === 'qwen' ? 'Qwen' : 'ChatGPT');
      throw new Error(`A conexao com a guia do ${label} foi encerrada.`);
    }
    this.bridge.sendCdp(this.sessionToken, message);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.bridge.detach(this.sessionToken).catch(() => {});
    this.onclose?.();
  }

  receive(message) {
    if (!this.closed) this.onmessage?.(message);
  }

  disconnect(reason = '') {
    if (this.closed) return;
    this.closed = true;
    this.disconnectReason = String(reason || 'unknown');
    this.onclose?.();
  }
}

class BrowserExtensionBridge {
  constructor() {
    this.server = null;
    this.wss = null;
    this.socket = null;
    this.clientInfo = null;
    this.pending = new Map();
    this.activeTransports = new Map(); // sessionToken -> ExtensionRelayTransport
    this.lastUnexpectedDetach = null;
    this.pingTimer = null;
  }

  get activeTransport() {
    for (const transport of this.activeTransports.values()) {
      if (!transport.closed) return transport;
    }
    return null;
  }

  getTransportByPlatform(platform) {
    const normalized = platform === 'gemini' ? 'gemini' : (platform === 'qwen' ? 'qwen' : 'chatgpt');
    for (const transport of this.activeTransports.values()) {
      if (!transport.closed && transport.platform === normalized) {
        return transport;
      }
    }
    return null;
  }

  attachServer(server) {
    if (this.server === server) return;
    if (this.server) throw new Error('A Ponte VORTEX ja foi ligada a outro servidor.');

    this.server = server;
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 32 * 1024 * 1024 });
    this.wss.on('connection', socket => this.acceptConnection(socket));

    server.on('upgrade', (request, socket, head) => {
      let pathname = '';
      try {
        pathname = new URL(request.url, 'http://127.0.0.1').pathname;
      } catch (error) {
        socket.destroy();
        return;
      }
      if (pathname !== BRIDGE_PATH) return;
      this.wss.handleUpgrade(request, socket, head, ws => {
        this.wss.emit('connection', ws, request);
      });
    });

    this.pingTimer = setInterval(() => {
      if (this.isConnected()) this.sendRaw({ type: 'ping', at: Date.now() });
    }, 20000);
    this.pingTimer.unref?.();
  }

  acceptConnection(socket) {
    if (this.socket && this.socket !== socket) {
      this.socket.close(1000, 'Nova Ponte VORTEX conectada');
    }
    this.socket = socket;
    this.clientInfo = null;
    socket.on('message', data => this.handleMessage(data));
    socket.on('close', () => this.handleDisconnect(socket));
    socket.on('error', () => this.handleDisconnect(socket));
  }

  handleMessage(data) {
    let message;
    try {
      message = JSON.parse(String(data));
    } catch (error) {
      return;
    }

    if (message.type === 'hello') {
      this.clientInfo = {
        name: String(message.name || 'Ponte VORTEX'),
        version: String(message.version || 'desconhecida'),
        connectedAt: new Date().toISOString()
      };
      this.sendRaw({ type: 'hello-ack', server: 'VORTEX12', version: '12.0' });
      return;
    }

    if (message.type === 'response' && message.requestId) {
      const pending = this.pending.get(message.requestId);
      if (!pending) return;
      this.pending.delete(message.requestId);
      clearTimeout(pending.timer);
      if (message.ok) pending.resolve(message.result);
      else pending.reject(new Error(message.error || 'A Ponte VORTEX recusou a operacao.'));
      return;
    }

    if (message.type === 'cdp' && message.sessionToken && typeof message.message === 'string') {
      const transport = this.activeTransports.get(message.sessionToken);
      if (transport && !transport.closed) {
        transport.receive(message.message);
      }
      return;
    }

    if (message.type === 'detached' && message.sessionToken) {
      const transport = this.activeTransports.get(message.sessionToken);
      if (transport) {
        this.activeTransports.delete(message.sessionToken);
        this.lastUnexpectedDetach = {
          reason: String(message.reason || 'unknown'),
          platform: transport.platform,
          at: new Date().toISOString()
        };
        transport.disconnect(this.lastUnexpectedDetach.reason);
      }
      return;
    }
  }

  handleDisconnect(socket) {
    if (this.socket !== socket) return;
    this.socket = null;
    this.clientInfo = null;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('A Ponte VORTEX foi desconectada do Edge.'));
    }
    this.pending.clear();
    for (const transport of Array.from(this.activeTransports.values())) {
      this.activeTransports.delete(transport.sessionToken);
      this.lastUnexpectedDetach = {
        reason: 'bridge-disconnected',
        platform: transport.platform,
        at: new Date().toISOString()
      };
      transport.disconnect(this.lastUnexpectedDetach.reason);
    }
  }

  isConnected() {
    return Boolean(this.socket && this.socket.readyState === WebSocket.OPEN && this.clientInfo);
  }

  status() {
    const activeSessions = Array.from(this.activeTransports.values())
      .filter(t => !t.closed)
      .map(t => ({ sessionToken: t.sessionToken, platform: t.platform }));
    return {
      connected: this.isConnected(),
      mode: 'same-chrome-window',
      client: this.clientInfo,
      active: activeSessions.length > 0,
      activePlatforms: activeSessions.map(s => s.platform),
      activeSessions,
      lastUnexpectedDetach: this.lastUnexpectedDetach
    };
  }

  sendRaw(payload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('A Ponte VORTEX do Edge nao esta conectada.');
    }
    this.socket.send(JSON.stringify(payload));
  }

  request(type, payload = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
    if (!this.isConnected()) {
      return Promise.reject(new Error(
        'A Ponte VORTEX do Edge nao esta conectada. Ative a extensao VORTEX11 uma unica vez no Edge.'
      ));
    }
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`A Ponte VORTEX nao respondeu ao comando ${type}.`));
      }, timeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
      try {
        this.sendRaw({ type, requestId, ...payload });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(error);
      }
    });
  }

  ensurePlatformTab(platform = 'chatgpt', options = {}) {
    const bridgeVersion = String(this.clientInfo?.version || '0.0.0');
    const [major, minor, patch] = bridgeVersion.split('.').map(value => Number.parseInt(value, 10) || 0);
    if (major < 1 || (major === 1 && (minor < 1 || (minor === 1 && patch < 5)))) {
      return Promise.reject(new Error(
        'A Ponte VORTEX 1.1.5 ou superior ainda nao foi ativada. Recarregue a extensao VORTEX11 em edge://extensions e confirme novamente.'
      ));
    }
    const normalized = platform === 'gemini' ? 'gemini' : (platform === 'qwen' ? 'qwen' : 'chatgpt');
    const url = normalized === 'gemini'
      ? 'https://gemini.google.com/app'
      : (normalized === 'qwen' ? 'https://chat.qwen.ai/' : 'https://chatgpt.com/');
    return this.request('ensure-tab', {
      platform: normalized,
      url,
      activate: options.activate !== false
    }, 35000);
  }

  ensureChatGPTTab() {
    return this.ensurePlatformTab('chatgpt');
  }

  ensureGeminiTab() {
    return this.ensurePlatformTab('gemini');
  }

  downloadUrl(url, filename) {
    return this.request('download-url', { url, filename }, 190000);
  }

  armDownload(filename, platform = null, sessionToken = null) {
    return this.request('arm-download', { filename, platform, sessionToken }, 10000);
  }

  waitDownload(token) {
    return this.request('wait-download', { token }, 190000);
  }

  cancelDownload(token) {
    return this.request('cancel-download', { token }, 10000).catch(() => ({ cancelled: true }));
  }

  beginNativeDownloadSession(sessionToken = null) {
    return this.request('begin-native-download-session', { sessionToken }, 10000);
  }

  endNativeDownloadSession(sessionToken = null) {
    return this.request('end-native-download-session', { sessionToken }, 10000).catch(() => ({ restored: true }));
  }

  async createTransport(platform = 'chatgpt') {
    const normalized = platform === 'gemini' ? 'gemini' : (platform === 'qwen' ? 'qwen' : 'chatgpt');
    const existing = this.getTransportByPlatform(normalized);
    if (existing && !existing.closed) {
      const label = normalized === 'gemini' ? 'Gemini' : (normalized === 'qwen' ? 'Qwen' : 'ChatGPT');
      throw new Error(`O Robo Web ja esta controlando uma guia do ${label}.`);
    }
    const tab = await this.ensurePlatformTab(normalized, { activate: true });
    this.lastUnexpectedDetach = null;
    const sessionToken = crypto.randomUUID();
    await this.request('attach', { sessionToken, tabId: tab.id, platform: normalized });
    const transport = new ExtensionRelayTransport(this, sessionToken, normalized);
    this.activeTransports.set(sessionToken, transport);
    return transport;
  }

  sendCdp(sessionToken, message) {
    const transport = this.activeTransports.get(sessionToken);
    if (!transport || transport.closed) {
      throw new Error('A sessao de controle da guia do Robo Web nao esta ativa.');
    }
    this.sendRaw({ type: 'cdp', sessionToken, message });
  }

  async detach(sessionToken) {
    if (!sessionToken) return;
    this.activeTransports.delete(sessionToken);
    await this.request('detach', { sessionToken }, 5000).catch(() => {});
  }

  async connectPuppeteer(puppeteer, options = {}) {
    const transport = await this.createTransport(options.platform || 'chatgpt');
    try {
      return await puppeteer.connect({
        transport,
        defaultViewport: options.defaultViewport !== undefined ? options.defaultViewport : null
      });
    } catch (error) {
      transport.close();
      throw error;
    }
  }
}

const browserExtensionBridge = new BrowserExtensionBridge();

module.exports = browserExtensionBridge;
module.exports.BrowserExtensionBridge = BrowserExtensionBridge;
module.exports.ExtensionRelayTransport = ExtensionRelayTransport;
module.exports.BRIDGE_PATH = BRIDGE_PATH;

