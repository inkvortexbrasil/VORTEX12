// Robô Gemini Web da esteira de minisséries.
// Usa exclusivamente a guia Gemini adjacente à Central na sessão atual do Edge.
// Fase 1: gera e registra todas as imagens. Fase 2: baixa em ordem.
const { addExtra } = require('puppeteer-extra');
const puppeteer = addExtra(require('puppeteer-core'));
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const browserExtensionBridge = require('./browser_extension_bridge');
const robotManifest = require('./robot_manifest');

puppeteer.use(StealthPlugin());

const { FILES_ROOT } = require('./utils/paths');
const ROOT = FILES_ROOT;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function promptSequence(item, index) {
  const value = Number(item && (item.sequence || item.finalSequence || item.sceneNum));
  return Number.isInteger(value) && value > 0 ? value : index + 1;
}

function normalizedPrompt(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function promptSha256(value) {
  return crypto.createHash('sha256').update(normalizedPrompt(value), 'utf8').digest('hex');
}

function sameGeminiConversation(left, right) {
  try {
    const leftUrl = new URL(String(left || ''));
    const rightUrl = new URL(String(right || ''));
    return leftUrl.origin === rightUrl.origin && leftUrl.pathname === rightUrl.pathname;
  } catch (error) {
    return false;
  }
}

function isQuotaExhaustedMessage(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return [
    'quota',
    'rate limit',
    'usage limit',
    'image generation limit',
    'you have reached your limit',
    "you've reached your limit",
    'limite de uso',
    'limite de geração',
    'atingiu seu limite',
    'atingiu o limite'
  ].some(marker => text.includes(marker));
}

function quotaExhaustedError(provider) {
  const error = new Error(`Cota de imagens do ${provider} esgotada; as posições sem arquivo físico permanecem disponíveis para uma nova rodada ou outro provedor.`);
  error.code = 'ROBOT_QUOTA_EXHAUSTED';
  return error;
}

function checkpointPath(numStr, rootDir = ROOT) {
  return path.join(rootDir, 'minisseries', String(numStr), 'prompts', `gemini_checkpoint_${numStr}_minisseries.json`);
}

function canonicalGeminiConversationUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.origin !== 'https://gemini.google.com' || !/\/app/i.test(url.pathname)) return '';
    return `${url.origin}${url.pathname}`;
  } catch (error) {
    return '';
  }
}

function normalizeGeminiConversations(parsed, generated, completed) {
  const conversations = {};
  const source = parsed && typeof parsed.conversations === 'object' && parsed.conversations
    ? parsed.conversations
    : {};
  Object.values(source).forEach(rawGroup => {
    const conversationUrl = canonicalGeminiConversationUrl(rawGroup?.conversationUrl);
    if (!conversationUrl) return;
    conversations[conversationUrl] = {
      conversationUrl,
      generated: rawGroup && typeof rawGroup.generated === 'object' && rawGroup.generated ? rawGroup.generated : {},
      completed: rawGroup && typeof rawGroup.completed === 'object' && rawGroup.completed ? rawGroup.completed : {},
      firstSeenAt: rawGroup?.firstSeenAt || null,
      lastSeenAt: rawGroup?.lastSeenAt || null
    };
  });
  const ensureGroup = rawUrl => {
    const conversationUrl = canonicalGeminiConversationUrl(rawUrl);
    if (!conversationUrl) return null;
    if (!conversations[conversationUrl]) {
      conversations[conversationUrl] = {
        conversationUrl,
        generated: {},
        completed: {},
        firstSeenAt: null,
        lastSeenAt: null
      };
    }
    return conversations[conversationUrl];
  };
  Object.entries(generated).forEach(([sequence, entry]) => {
    const group = ensureGroup(entry?.conversationUrl);
    if (group && !group.generated[sequence]) group.generated[sequence] = entry;
  });
  Object.entries(completed).forEach(([sequence, entry]) => {
    const group = ensureGroup(entry?.conversationUrl);
    if (group && !group.completed[sequence]) group.completed[sequence] = entry;
  });
  return conversations;
}

function ensureGeminiConversation(checkpoint, rawUrl) {
  const conversationUrl = canonicalGeminiConversationUrl(rawUrl);
  if (!conversationUrl) return null;
  if (!checkpoint.conversations || typeof checkpoint.conversations !== 'object') checkpoint.conversations = {};
  if (!checkpoint.conversations[conversationUrl]) {
    checkpoint.conversations[conversationUrl] = {
      conversationUrl,
      generated: {},
      completed: {},
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: null
    };
  }
  return checkpoint.conversations[conversationUrl];
}

function normalizeGeminiCheckpoint(parsed, numStr) {
  const generated = parsed && typeof parsed.generated === 'object' && parsed.generated ? parsed.generated : {};
  const completed = parsed && typeof parsed.completed === 'object' && parsed.completed ? parsed.completed : {};
  return {
    version: 2,
    provider: 'gemini',
    number: String(numStr),
    generated,
    completed,
    conversationUrl: String(parsed?.conversationUrl || ''),
    conversations: normalizeGeminiConversations(parsed, generated, completed),
    updatedAt: parsed?.updatedAt || null
  };
}

function readGeminiCheckpoint(numStr, rootDir = ROOT) {
  const filePath = checkpointPath(numStr, rootDir);
  if (!fs.existsSync(filePath)) {
    return { version: 2, provider: 'gemini', number: String(numStr), generated: {}, completed: {}, conversationUrl: '', conversations: {} };
  }
  try {
    return normalizeGeminiCheckpoint(JSON.parse(fs.readFileSync(filePath, 'utf8')), numStr);
  } catch (error) {
    const backupPath = filePath + '.bak';
    if (fs.existsSync(backupPath)) {
      try {
        return normalizeGeminiCheckpoint(JSON.parse(fs.readFileSync(backupPath, 'utf8')), numStr);
      } catch (backupError) {}
    }
    throw new Error(`O checkpoint do Robô Gemini da minissérie ${numStr} está inválido.`);
  }
}

function findGeminiResumePlan({ numStr, prompts, rootDir = ROOT }) {
  const queue = Array.isArray(prompts) ? prompts : [];
  const checkpoint = readGeminiCheckpoint(numStr, rootDir);
  if (!queue.length) {
    return { resumable: false, recoveredSequences: [], resumeFrom: null, conversationUrl: '' };
  }
  const requested = new Map(queue.map((item, index) => [promptSequence(item, index), item]));
  const completedSet = new Set(Object.keys(checkpoint.completed || {})
    .map(rawSequence => Number.parseInt(rawSequence, 10))
    .filter(sequence => requested.has(sequence)));
  const candidates = Object.values(checkpoint.conversations || {}).map(group => {
    const conversationUrl = canonicalGeminiConversationUrl(group?.conversationUrl);
    const entries = Object.entries(group?.generated || {}).filter(([rawSequence]) => {
      const sequence = Number.parseInt(rawSequence, 10);
      return requested.has(sequence) && !completedSet.has(sequence);
    });
    const compatible = Boolean(conversationUrl) && entries.length > 0 && entries.every(([rawSequence, entry]) => {
      const sequence = Number.parseInt(rawSequence, 10);
      const item = requested.get(sequence);
      const prompt = item && (item.fullPrompt || item.prompt || '');
      return Boolean(item
        && entry
        && entry.imageKey
        && entry.promptSha256 === promptSha256(prompt)
        && sameGeminiConversation(entry.conversationUrl, conversationUrl));
    });
    return {
      compatible,
      conversationUrl,
      recoveredSequences: compatible
        ? entries.map(([rawSequence]) => Number.parseInt(rawSequence, 10)).sort((left, right) => left - right)
        : [],
      lastSeenAt: String(group?.lastSeenAt || '')
    };
  }).filter(candidate => candidate.compatible);
  candidates.sort((left, right) => {
    if (right.recoveredSequences.length !== left.recoveredSequences.length) {
      return right.recoveredSequences.length - left.recoveredSequences.length;
    }
    const preferredUrl = canonicalGeminiConversationUrl(checkpoint.conversationUrl);
    if (left.conversationUrl === preferredUrl && right.conversationUrl !== preferredUrl) return -1;
    if (right.conversationUrl === preferredUrl && left.conversationUrl !== preferredUrl) return 1;
    return right.lastSeenAt.localeCompare(left.lastSeenAt);
  });
  const selected = candidates[0] || { recoveredSequences: [], conversationUrl: '' };
  const recoveredSequences = selected.recoveredSequences;
  const completedCount = completedSet.size;
  const incomplete = recoveredSequences.length < queue.length || completedCount < queue.length;
  const resumeFrom = queue
    .map((item, index) => promptSequence(item, index))
    .find(sequence => !completedSet.has(sequence) && !recoveredSequences.includes(sequence)) || null;
  return {
    resumable: recoveredSequences.length > 0 && incomplete,
    recoveredSequences,
    resumeFrom,
    conversationUrl: selected.conversationUrl
  };
}

function writeGeminiCheckpoint(checkpoint, rootDir = ROOT) {
  const filePath = checkpointPath(checkpoint.number, rootDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  checkpoint.updatedAt = new Date().toISOString();
  const temporaryPath = filePath + '.tmp';
  const backupPath = filePath + '.bak';
  if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backupPath);
  fs.writeFileSync(temporaryPath, JSON.stringify(checkpoint, null, 2), 'utf8');
  fs.renameSync(temporaryPath, filePath);
  return checkpoint;
}

function recordGeminiConversation({ numStr, conversationUrl, rootDir = ROOT }) {
  const checkpoint = readGeminiCheckpoint(numStr, rootDir);
  const url = String(conversationUrl || '');
  if (/^https:\/\/gemini\.google\.com\//i.test(url)) {
    checkpoint.conversationUrl = url;
    const group = ensureGeminiConversation(checkpoint, url);
    if (group) group.lastSeenAt = new Date().toISOString();
  }
  return writeGeminiCheckpoint(checkpoint, rootDir);
}

function recordGeminiGenerated({ numStr, sequence, prompt, imageKey, imageOrdinal, conversationUrl, rootDir = ROOT }) {
  const checkpoint = readGeminiCheckpoint(numStr, rootDir);
  const url = String(conversationUrl || '');
  checkpoint.generated[String(sequence)] = {
    imageKey: String(imageKey || ''),
    imageOrdinal: Number.isInteger(imageOrdinal) && imageOrdinal >= 0 ? imageOrdinal : null,
    promptSha256: promptSha256(prompt),
    conversationUrl: url,
    generatedAt: new Date().toISOString()
  };
  if (/^https:\/\/gemini\.google\.com\//i.test(url)) {
    checkpoint.conversationUrl = url;
    const group = ensureGeminiConversation(checkpoint, url);
    if (group) {
      group.generated[String(sequence)] = checkpoint.generated[String(sequence)];
      group.lastSeenAt = new Date().toISOString();
    }
  }
  return writeGeminiCheckpoint(checkpoint, rootDir);
}

function recordGeminiDownloaded({ numStr, sequence, targetPath, hash, conversationUrl, rootDir = ROOT }) {
  const checkpoint = readGeminiCheckpoint(numStr, rootDir);
  checkpoint.completed[String(sequence)] = {
    file: path.basename(targetPath),
    sha256: hash,
    conversationUrl: String(conversationUrl || ''),
    completedAt: new Date().toISOString()
  };
  const url = String(conversationUrl || '');
  if (/^https:\/\/gemini\.google\.com\//i.test(url)) {
    checkpoint.conversationUrl = url;
    const group = ensureGeminiConversation(checkpoint, url);
    if (group) {
      group.completed[String(sequence)] = checkpoint.completed[String(sequence)];
      group.lastSeenAt = new Date().toISOString();
    }
  }
  return writeGeminiCheckpoint(checkpoint, rootDir);
}

async function clickPoint(page, selectorBuilder, timeoutMs = 12000, pollMs = 300) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const point = await page.evaluate(selectorBuilder).catch(() => null);
    if (point) {
      await page.mouse.click(point.x, point.y);
      return true;
    }
    await delay(pollMs);
  }
  return false;
}

async function waitForComposer(page, timeoutMs = 30000) {
  await page.waitForFunction(() => {
    const candidates = Array.from(document.querySelectorAll(
      'rich-textarea [contenteditable="true"], .ql-editor[contenteditable="true"], div[contenteditable="true"], textarea'
    ));
    return candidates.some(element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, { timeout: timeoutMs });
}

async function startNewGeminiChat(page, onProgress) {
  const clicked = await clickPoint(page, () => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const links = Array.from(document.querySelectorAll('a[href], button'));
    const target = links.find(element => {
      const label = normalize([
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.textContent
      ].filter(Boolean).join(' '));
      return label === 'nova conversa'
        || label === 'novo chat'
        || label === 'new chat'
        || label.startsWith('nova conversa ')
        || label.startsWith('novo chat ')
        || label.startsWith('new chat ');
    });
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : null;
  });
  if (!clicked) throw new Error('O comando Nova conversa não foi encontrado no Gemini.');
  await delay(1200);
  await waitForComposer(page);
  await page.evaluate(() => { window.__vortexSessionKeys = []; }).catch(() => {});
  if (onProgress) onProgress(4, 'Nova conversa do Gemini aberta na conta atual.');
}

async function openGeminiConversation(page, conversationUrl, onProgress) {
  const url = String(conversationUrl || '');
  if (!/^https:\/\/gemini\.google\.com\/.*\/app\//i.test(url)) {
    throw new Error('O chat original do Gemini ainda não foi registrado. Use FOTOS para continuar em uma nova conta.');
  }
  if (page.url() !== url) await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForComposer(page);
  if (onProgress) onProgress(4, 'Chat original do Gemini reaberto na mesma conta.');
}

async function activateGeminiImageMode(page, onProgress) {
  const inspectActiveState = async () => page.evaluate(() => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const isVisible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.getAttribute('aria-hidden') !== 'true';
    };
    const isImageModeLabel = value => {
      const label = normalize(value);
      if (!label) return false;
      if (['imagem', 'imagens', 'image', 'images'].includes(label)) return true;
      return /(?:^|\s)(?:criar|gerar)\s+image(?:m|ns)?(?:\s|$)/.test(label)
        || /(?:^|\s)(?:create|generate)\s+images?(?:\s|$)/.test(label);
    };
    const composer = Array.from(document.querySelectorAll(
      'rich-textarea [contenteditable="true"], .ql-editor[contenteditable="true"], div[contenteditable="true"], textarea'
    )).find(isVisible);
    if (!composer) return { active: false, evidence: ['composer ausente'] };
    const composerRect = composer.getBoundingClientRect();
    const composerLabel = normalize([
      composer.getAttribute('aria-label'),
      composer.getAttribute('placeholder'),
      composer.getAttribute('data-placeholder')
    ].filter(Boolean).join(' '));
    if (/(?:descreva|describe|crie|create|gere|generate).*(?:imagem|image)/.test(composerLabel)) {
      return { active: true, evidence: [`composer:${composerLabel}`] };
    }

    const evidence = [];
    const candidates = Array.from(document.querySelectorAll(
      'button, [role="button"], [role="menuitem"], [role="option"], [aria-pressed], [aria-selected], [aria-checked], mat-chip, mat-chip-row, mat-chip-option, [class*="chip"], [class*="pill"]'
    ));
    for (const element of candidates) {
      if (!isVisible(element)) continue;
      const label = normalize([
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.getAttribute('data-tooltip'),
        element.getAttribute('data-test-id'),
        element.textContent
      ].filter(Boolean).join(' '));
      if (!isImageModeLabel(label)) continue;
      const rect = element.getBoundingClientRect();
      const nearComposer = rect.bottom >= composerRect.top - 240 && rect.top <= composerRect.bottom + 240
        && rect.right >= composerRect.left - 420 && rect.left <= composerRect.right + 160;
      if (!nearComposer) continue;

      const role = normalize(element.getAttribute('role'));
      const state = normalize([
        element.getAttribute('aria-pressed'),
        element.getAttribute('aria-selected'),
        element.getAttribute('aria-checked'),
        element.getAttribute('data-selected'),
        element.getAttribute('data-active')
      ].filter(Boolean).join(' '));
      const className = normalize(typeof element.className === 'string' ? element.className : '');
      const explicitlySelected = state.split(' ').includes('true')
        || /(?:^|[-_\s])(selected|active|checked|highlighted)(?:$|[-_\s])/.test(className);
      const removableChip = Boolean(element.querySelector(
        '[aria-label*="remov" i], [aria-label*="remove" i], [aria-label*="fechar" i], [aria-label*="close" i]'
      ));
      const persistentControl = role !== 'menuitem' && role !== 'option';
      const explicitCommand = /(?:^|\s)(?:criar|gerar)\s+image(?:m|ns)?(?:\s|$)/.test(label)
        || /(?:^|\s)(?:create|generate)\s+images?(?:\s|$)/.test(label);
      evidence.push(`${role || element.tagName.toLowerCase()}:${label}:${state || 'sem-estado'}`);
      if (explicitlySelected || removableChip || (persistentControl && explicitCommand)) {
        return { active: true, evidence: evidence.slice(0, 8) };
      }
    }
    return { active: false, evidence: evidence.slice(0, 8) };
  }).catch(error => ({ active: false, evidence: [`inspecao:${String(error && error.message || error)}`] }));

  const initialState = await inspectActiveState();
  if (initialState.active) {
    if (onProgress) onProgress(7, 'Modo Criar imagem já ativo no Gemini.');
    return true;
  }

  const toolsClicked = await clickPoint(page, () => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const composer = Array.from(document.querySelectorAll(
      'rich-textarea [contenteditable="true"], .ql-editor[contenteditable="true"], div[contenteditable="true"], textarea'
    )).find(element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (!composer) return null;
    const composerRect = composer.getBoundingClientRect();
    const candidates = Array.from(document.querySelectorAll('button, [role="button"]'));
    const ranked = candidates.map(element => {
      const label = normalize([
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.textContent
      ].filter(Boolean).join(' '));
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const visible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      const matches = label === '+'
        || label.includes('ferramentas')
        || label.includes('tools')
        || label.includes('adicionar')
        || label.includes('add files');
      if (!visible || !matches) return null;
      const horizontalGap = Math.max(0, composerRect.left - rect.right, rect.left - composerRect.right);
      const verticalGap = Math.max(0, composerRect.top - rect.bottom, rect.top - composerRect.bottom);
      const priority = label.includes('ferramentas') || label.includes('tools') ? 0 : label === '+' ? 1 : 2;
      return { element, rect, priority, distance: horizontalGap + verticalGap };
    }).filter(Boolean).sort((a, b) => a.priority - b.priority || a.distance - b.distance);
    const target = ranked[0] && ranked[0].element;
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, 8000, 200);
  if (!toolsClicked) throw new Error('O botão de ferramentas do Gemini não foi encontrado para ativar Criar imagem.');

  await delay(500);
  const imageModeClicked = await clickPoint(page, () => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const isImageModeLabel = value => {
      const label = normalize(value);
      if (!label) return false;
      return /(?:^|\s)(?:criar|gerar)\s+image(?:m|ns)?(?:\s|$)/.test(label)
        || /(?:^|\s)(?:create|generate)\s+images?(?:\s|$)/.test(label);
    };
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], [role="menuitem"], li, span, div'));
    const ranked = candidates.map(element => {
      const label = normalize([
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.textContent
      ].filter(Boolean).join(' '));
      if (!isImageModeLabel(label)) return null;
      const target = element.closest('button, [role="button"], [role="menuitem"], [role="option"], li') || element;
      const rect = target.getBoundingClientRect();
      const style = window.getComputedStyle(target);
      if (rect.width <= 0 || rect.height <= 0 || style.display === 'none' || style.visibility === 'hidden') return null;
      const role = normalize(target.getAttribute('role'));
      const targetLabel = normalize([
        target.getAttribute('aria-label'),
        target.getAttribute('title'),
        target.textContent
      ].filter(Boolean).join(' '));
      const rolePriority = role === 'menuitem' || role === 'option' ? 0 : target.tagName === 'BUTTON' ? 1 : 2;
      const labelPriority = ['criar imagem', 'criar imagens', 'create image', 'create images', 'generate image', 'generate images'].includes(targetLabel) ? 0 : 1;
      return { target, rolePriority, labelPriority, area: rect.width * rect.height };
    }).filter(Boolean).sort((a, b) => a.rolePriority - b.rolePriority || a.labelPriority - b.labelPriority || a.area - b.area);
    const target = ranked[0] && ranked[0].target;
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, 8000, 200);
  if (!imageModeClicked) throw new Error('A opção Criar imagem não apareceu no menu do Gemini.');

  let lastState = { active: false, evidence: [] };
  for (let attempt = 0; attempt < 32; attempt++) {
    lastState = await inspectActiveState();
    if (lastState.active) {
      if (onProgress) onProgress(7, 'Modo Criar imagem ativado e confirmado no Gemini.');
      return true;
    }
    await delay(250);
  }
  const evidence = Array.isArray(lastState.evidence) && lastState.evidence.length > 0
    ? lastState.evidence.join(' | ')
    : 'nenhum indicador visual reconhecido';
  throw new Error(`O modo Criar imagem do Gemini não foi confirmado depois do clique único. Estado observado: ${evidence}`);
}

async function activateGeminiComplexReasoning(page, onProgress) {
  if (onProgress) onProgress(9, 'Modelo Flash mantido conforme pré-seleção do operador.');
}

async function inspectGeminiState(page) {
  return page.evaluate(() => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const fingerprint = value => {
      let hash = 2166136261;
      const text = String(value || '');
      for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(36);
    };
    const controls = Array.from(document.querySelectorAll(
      'button[aria-label], button[title], a[download], [role="button"][aria-label]'
    )).filter(element => {
      const label = normalize([element.getAttribute('aria-label'), element.getAttribute('title'), element.textContent].filter(Boolean).join(' '));
      return label.includes('download') || label.includes('baixar');
    });

    const generatedImages = Array.from(document.querySelectorAll(
      'model-response img, [data-test-id*="response"] img, .response-container img, article img, section img, .generated-image img'
    )).filter(img => {
      const src = img.currentSrc || img.src || '';
      if (!src || src.startsWith('data:image/svg')) return false;
      const rect = img.getBoundingClientRect();
      const isAvatar = (rect.width > 0 && rect.width < 80) || (rect.height > 0 && rect.height < 80)
        || /avatar|sparkle|icon|logo/i.test(img.className || '')
        || /avatar|sparkle|icon|logo/i.test(img.getAttribute('aria-label') || '');
      return !isAvatar;
    });

    window.__vortexSessionKeys = window.__vortexSessionKeys || [];
    const imageKeySet = new Set();
    const imageKeys = [];

    controls.forEach((control, index) => {
      const response = control.closest('model-response, [data-test-id*="response"], .response-container, article, section');
      const image = (response && response.querySelector('img[src]')) || control.closest('div')?.querySelector('img[src]');
      const source = image && (image.currentSrc || image.src);
      const key = (response && (response.getAttribute('data-response-id') || response.getAttribute('data-test-id') || response.id))
        || control.getAttribute('data-test-id')
        || `gemini-image-${fingerprint(`${source || ''}|${index}`)}`;
      if (!imageKeySet.has(key)) {
        imageKeySet.add(key);
        imageKeys.push(key);
      }
      if (!window.__vortexSessionKeys.includes(key)) {
        window.__vortexSessionKeys.push(key);
      }
    });

    generatedImages.forEach((image, index) => {
      const response = image.closest('model-response, [data-test-id*="response"], .response-container, article, section');
      const source = image.currentSrc || image.src;
      const key = (response && (response.getAttribute('data-response-id') || response.getAttribute('data-test-id') || response.id))
        || `gemini-image-${fingerprint(`${source || ''}|${index}`)}`;
      if (!imageKeySet.has(key)) {
        imageKeySet.add(key);
        imageKeys.push(key);
      }
      if (!window.__vortexSessionKeys.includes(key)) {
        window.__vortexSessionKeys.push(key);
      }
    });

    // Imunidade ao scroll virtual: garante que chaves já vistas na sessão nunca diminuam
    // mesmo quando o Angular remove do DOM as mensagens do topo.
    window.__vortexSessionKeys.forEach(key => {
      if (!imageKeySet.has(key)) {
        imageKeySet.add(key);
        imageKeys.push(key);
      }
    });

    const busy = Array.from(document.querySelectorAll('button, [role="button"]')).some(element => {
      const label = normalize([element.getAttribute('aria-label'), element.textContent].filter(Boolean).join(' '));
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const visibleAndActive = rect.width > 0
        && rect.height > 0
        && element.getAttribute('aria-hidden') !== 'true'
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number.parseFloat(style.opacity || '1') > 0;
      const busyLabels = [
        'parar', 'parar resposta', 'parar de responder', 'parar de gerar', 'interromper', 
        'stop', 'stop response', 'stop generating', 'cancelar', 'cancel'
      ];
      return visibleAndActive && (
        busyLabels.some(value => label === value || label.startsWith(`${value} `)) ||
        element.getAttribute('data-test-id') === 'stop-button' ||
        (element.querySelector('svg') && /\b(?:parar|stop|interromper)\b/i.test(label) && !label.includes('comparar'))
      );
    });
    const sendButtonActive = Array.from(document.querySelectorAll('button, [role="button"]')).some(element => {
      const label = normalize([element.getAttribute('aria-label'), element.getAttribute('title')].filter(Boolean).join(' '));
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
        && (label.includes('enviar') || label.includes('send')) && !label.includes('ferramentas');
    });
    const responses = Array.from(document.querySelectorAll(
      'model-response, [data-test-id*="response"], .response-container, article'
    )).filter(element => normalize(element.innerText || element.textContent));
    const latestResponseText = responses.length
      ? normalize(responses[responses.length - 1].innerText || responses[responses.length - 1].textContent)
      : '';
    return { imageKeys, busy, sendButtonActive, latestResponseText };
  });
}

async function composerPoint(page) {
  return page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll(
      'rich-textarea [contenteditable="true"], .ql-editor[contenteditable="true"], div[contenteditable="true"], textarea'
    ));
    const target = candidates.find(element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
}

async function composerText(page) {
  return page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll(
      'rich-textarea [contenteditable="true"], .ql-editor[contenteditable="true"], div[contenteditable="true"], textarea'
    ));
    const target = candidates.find(element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (!target) return '';
    return String('value' in target ? target.value : target.innerText || target.textContent || '').trim();
  });
}

async function waitForGeminiComposerIdle(page, shouldCancel) {
  let readySince = null;
  const started = Date.now();
  const maxWaitMs = 15000;
  while (true) {
    if (shouldCancel && shouldCancel()) throw new Error('__GEMINI_CANCELLED__');
    const state = await inspectGeminiState(page);
    const point = await composerPoint(page);
    if (!state.busy && point) {
      if (readySince === null) readySince = Date.now();
      if (Date.now() - readySince >= 1000) return true;
    } else if (point && Date.now() - started >= maxWaitMs) {
      return true;
    } else {
      readySince = null;
    }
    await delay(500);
  }
}

async function insertPrompt(page, prompt) {
  const point = await composerPoint(page);
  if (!point) throw new Error('A caixa de comando do Gemini não foi encontrada.');
  await page.mouse.click(point.x, point.y);
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  const client = page._client();
  await client.send('Input.insertText', { text: String(prompt || '') });
  await page.keyboard.press('End');
}

async function clickGeminiSend(page) {
  return clickPoint(page, () => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const composers = Array.from(document.querySelectorAll(
      'rich-textarea [contenteditable="true"], .ql-editor[contenteditable="true"], div[contenteditable="true"], textarea'
    ));
    const composer = composers.find(element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    const composerRect = composer && composer.getBoundingClientRect();
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const candidates = buttons.filter(element => {
      const label = normalize([element.getAttribute('aria-label'), element.getAttribute('title')].filter(Boolean).join(' '));
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !element.disabled
        && (label.includes('enviar') || label.includes('send'))
        && !label.includes('ferramentas');
    });
    const target = candidates.sort((left, right) => {
      if (!composerRect) return 0;
      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      const leftDistance = Math.abs(leftRect.top - composerRect.top) + Math.abs(leftRect.left - composerRect.right);
      const rightDistance = Math.abs(rightRect.top - composerRect.top) + Math.abs(rightRect.left - composerRect.right);
      return leftDistance - rightDistance;
    })[0];
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, 5000, 100);
}

async function waitForGeminiPromptAccepted(page, shouldCancel, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (shouldCancel && shouldCancel()) throw new Error('__GEMINI_CANCELLED__');
    const state = await inspectGeminiState(page);
    if (state.busy || !(await composerText(page))) return true;
    await delay(300);
  }
  return false;
}

async function sendPromptAndWait(page, prompt, shouldCancel) {
  // Loop externo: reenvia o MESMO prompt até o Gemini entregar uma imagem.
  // Qualquer resposta sem imagem (erro, recusa, mensagem qualquer) dispara retry imediato.
  let originCount = null; // contagem de imagens antes da 1ª tentativa deste prompt

  while (true) {
    await waitForGeminiComposerIdle(page, shouldCancel);

    // Lê o estado atual após o idle.
    // Na primeira iteração: estabelece originCount (referência deste prompt).
    // Nas iterações de retry: verifica se o Diretor já gerou a imagem manualmente.
    // Se o count já aumentou desde originCount, retorna aquela imagem sem reenviar.
    const preInsertState = await inspectGeminiState(page);
    const preInsertKeys = preInsertState.imageKeys || [];
    if (originCount === null) {
      originCount = preInsertKeys.length;
    } else if (preInsertKeys.length > originCount) {
      // Intervenção manual detectada: nova imagem já está na tela.
      // Retorna sem reenviar para não gerar duplicata.
      const imageOrdinal = preInsertKeys.length - 1;
      return { kind: 'image', imageKey: preInsertKeys[imageOrdinal], imageOrdinal };
    }

    await insertPrompt(page, prompt);
    await delay(1000); // Give Gemini UI time to fully register the paste before clicking
    let accepted = false;
    while (!accepted) {
      if (shouldCancel && shouldCancel()) throw new Error('__GEMINI_CANCELLED__');
      const clicked = await clickGeminiSend(page);
      if (clicked) accepted = await waitForGeminiPromptAccepted(page, shouldCancel, 2000);
      if (!accepted) await delay(500);
    }
    await delay(300);
    const before = await inspectGeminiState(page);
    const previousCount = (before.imageKeys || []).length;
    let busyObserved = false;
    let idleSince = null;
    let shouldRetry = false;
    while (true) {
      if (shouldCancel && shouldCancel()) throw new Error('__GEMINI_CANCELLED__');
      const state = await inspectGeminiState(page);
      const currentKeys = state.imageKeys || [];
      if (state.busy) {
        busyObserved = true;
        idleSince = null;
      }
      // Imagem gerada com sucesso.
      if (currentKeys.length > previousCount) {
        const imageOrdinal = currentKeys.length - 1;
        await waitForGeminiComposerIdle(page, shouldCancel).catch(() => {});
        return { kind: 'image', imageKey: currentKeys[imageOrdinal], imageOrdinal };
      }
      // Gemini terminou a resposta (botão Parar sumiu), mas não entregou imagem (erro em texto).
      // A seta de enviar NÃO estará ativa, mas devemos ignorá-la e reenviar o MESMO prompt imediatamente.
      if (!state.busy && busyObserved) {
        if (isQuotaExhaustedMessage(state.latestResponseText)) throw quotaExhaustedError('Gemini');
        shouldRetry = true;
        break;
      }
      // Segurança: se nunca ficou busy e já passou 90s, também reinicia o prompt.
      if (!state.busy && !busyObserved) {
        if (idleSince === null) idleSince = Date.now();
        else if (Date.now() - idleSince >= 90000) { shouldRetry = true; break; }
      }
      await delay(1000);
    }
    if (shouldRetry) {
      // Pausa mínima antes de reinserir o prompt para o Gemini processar o estado.
      await delay(400);
    }
  }
}

async function waitForNewDownload(targetDir, before, timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await delay(150);
    const current = fs.readdirSync(targetDir);
    const found = current.find(file => !before.has(file) && !/\.(?:crdownload|tmp|part)$/i.test(file));
    if (found) return found;
  }
  return '';
}

async function hydrateGeminiImageHistory(page, expectedCount, shouldCancel, onProgress) {
  const expected = Math.max(0, Number(expectedCount) || 0);
  if (!expected) return [];
  let toTop = true;
  let lastReported = -1;
  let attempts = 0;
  const maxAttempts = 12;
  let stableCount = 0;
  let lastCount = 0;

  while (attempts < maxAttempts) {
    if (shouldCancel && shouldCancel()) throw new Error('__GEMINI_CANCELLED__');
    const state = await inspectGeminiState(page);
    const imageKeys = state.imageKeys || [];
    if (imageKeys.length >= expected) return imageKeys;
    if (onProgress && imageKeys.length !== lastReported) {
      lastReported = imageKeys.length;
      onProgress(70, `Gemini: preparando o historico para download (${imageKeys.length}/${expected}).`);
    }

    if (imageKeys.length === lastCount && imageKeys.length > 0) {
      stableCount++;
      if (stableCount >= 4) {
        return imageKeys;
      }
    } else {
      stableCount = 0;
      lastCount = imageKeys.length;
    }

    await page.evaluate(({ moveToTop }) => {
      const candidates = Array.from(document.querySelectorAll('*')).filter(element => {
        const style = window.getComputedStyle(element);
        return element.scrollHeight > element.clientHeight + 100
          && (style.overflowY === 'auto' || style.overflowY === 'scroll');
      });
      const target = candidates.sort((left, right) => {
        return (right.scrollHeight - right.clientHeight) - (left.scrollHeight - left.clientHeight);
      })[0];
      if (target) target.scrollTop = moveToTop ? 0 : target.scrollHeight;
      window.scrollTo({ top: moveToTop ? 0 : document.documentElement.scrollHeight, behavior: 'auto' });
    }, { moveToTop: toTop }).catch(() => {});
    toTop = !toTop;
    attempts++;
    await delay(800);
  }

  const finalState = await inspectGeminiState(page);
  return finalState.imageKeys || [];
}

async function downloadGeminiImage({ page, imageKey, imageOrdinal, targetDir, sequence, downloadedHashes, targetFileName = '' }) {
  const locatePoint = async () => page.evaluate(({ expectedKey, expectedOrdinal }) => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const fingerprint = value => {
      let hash = 2166136261;
      const text = String(value || '');
      for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(36);
    };
    const controls = Array.from(document.querySelectorAll(
      'button[aria-label], button[title], a[download], [role="button"][aria-label]'
    )).filter(element => {
      const label = normalize([element.getAttribute('aria-label'), element.getAttribute('title'), element.textContent].filter(Boolean).join(' '));
      return label.includes('download') || label.includes('baixar');
    });
    let matchedImage = null;
    const target = controls.find((control, index) => {
      const response = control.closest('model-response, [data-test-id*="response"], .response-container, article, section');
      const image = (response && response.querySelector('img[src]')) || control.closest('div')?.querySelector('img[src]');
      const source = image && (image.currentSrc || image.src);
      const key = (response && (response.getAttribute('data-response-id') || response.getAttribute('data-test-id') || response.id))
        || control.getAttribute('data-test-id')
        || `gemini-image-${fingerprint(`${source || ''}|${index}`)}`;
      const matches = (expectedKey && key === expectedKey) || (Number.isInteger(expectedOrdinal) && expectedOrdinal >= 0 && index === expectedOrdinal);
      if (matches) matchedImage = image;
      return matches;
    });
    if (!target) return null;
    target.scrollIntoView({ behavior: 'auto', block: 'center' });
    const rect = target.getBoundingClientRect();
    const imageRect = matchedImage && matchedImage.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      hoverX: imageRect ? imageRect.left + imageRect.width / 2 : rect.left,
      hoverY: imageRect ? imageRect.top + imageRect.height / 2 : rect.top,
      imageUrl: matchedImage && (matchedImage.currentSrc || matchedImage.src)
    };
  }, { expectedKey: imageKey, expectedOrdinal: imageOrdinal });

  let point = await locatePoint();
  if (!point) {
    for (let scrollStep = 0; scrollStep < 15; scrollStep++) {
      await page.evaluate(() => window.scrollBy(0, 1000)).catch(() => {});
      await delay(300);
      point = await locatePoint();
      if (point) break;
    }
  }
  if (!point) {
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    await delay(400);
    for (let scrollStep = 0; scrollStep < 15; scrollStep++) {
      point = await locatePoint();
      if (point) break;
      await page.evaluate(() => window.scrollBy(0, 1000)).catch(() => {});
      await delay(300);
    }
  }
  if (!point) {
    throw new Error(`Cena ${String(sequence).padStart(2, '0')}: imagem do Gemini não localizada para download.`);
  }
  await page.mouse.move(point.hoverX, point.hoverY);
  await delay(350);
  const clickPoint = await page.evaluate(({ expectedKey, expectedOrdinal }) => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const fingerprint = value => {
      let hash = 2166136261;
      const text = String(value || '');
      for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(36);
    };
    const controls = Array.from(document.querySelectorAll(
      'button[aria-label], button[title], a[download], [role="button"][aria-label]'
    )).filter(element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const label = normalize([element.getAttribute('aria-label'), element.getAttribute('title'), element.textContent].filter(Boolean).join(' '));
      return rect.width > 0 && rect.height > 0
        && style.visibility !== 'hidden' && style.display !== 'none'
        && (label.includes('download') || label.includes('baixar'));
    });
    const target = controls.find((control, index) => {
      const response = control.closest('model-response, [data-test-id*="response"], .response-container, article, section');
      const image = (response && response.querySelector('img[src]')) || control.closest('div')?.querySelector('img[src]');
      const source = image && (image.currentSrc || image.src);
      const key = (response && (response.getAttribute('data-response-id') || response.getAttribute('data-test-id') || response.id))
        || control.getAttribute('data-test-id')
        || `gemini-image-${fingerprint(`${source || ''}|${index}`)}`;
      return Number.isInteger(expectedOrdinal) && expectedOrdinal >= 0
        ? index === expectedOrdinal
        : key === expectedKey;
    });
    if (!target) return null;
    target.scrollIntoView({ behavior: 'auto', block: 'center' });
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, { expectedKey: imageKey, expectedOrdinal: imageOrdinal });
  if (!clickPoint) {
    throw new Error(`Cena ${String(sequence).padStart(2, '0')}: botao final de download do Gemini nao localizado.`);
  }
  const temporaryName = `VORTEX11-robo/gemini-${Date.now()}-${String(sequence).padStart(2, '0')}.png`;
  const armed = await browserExtensionBridge.armDownload(temporaryName);
  let downloaded;
  try {
    await page.mouse.click(clickPoint.x, clickPoint.y);
    downloaded = await browserExtensionBridge.waitDownload(armed.token);
  } catch (error) {
    await browserExtensionBridge.cancelDownload(armed.token);
    throw error;
  }
  const downloadedPath = path.resolve(downloaded.filename);
  if (!fs.existsSync(downloadedPath)) throw new Error(`Cena ${String(sequence).padStart(2, '0')}: o download original do Gemini nao apareceu.`);
  const buffer = fs.readFileSync(downloadedPath);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  if (!buffer.length || downloadedHashes.has(hash)) {
    throw new Error(`Cena ${String(sequence).padStart(2, '0')}: o Gemini entregou um arquivo vazio ou repetido.`);
  }
  downloadedHashes.add(hash);
  const inferredNumber = path.basename(path.dirname(path.resolve(targetDir)));
  const inferredMode = String(targetFileName || '').startsWith('cena_') || path.basename(targetDir).toLowerCase() === 'flow'
    ? 'flow'
    : 'minisseries';
  const extension = path.extname(targetFileName || downloadedPath).toLowerCase() || '.png';
  const saved = robotManifest.commitFile({
    numStr: inferredNumber,
    mode: inferredMode,
    sequence,
    sourcePath: downloadedPath,
    extension
  });
  fs.rmSync(downloadedPath, { force: true });
  return saved;
}

async function runGeminiCurrentTabAutomation({
  numStr,
  runId = `gemini-${String(numStr)}-${Date.now()}`,
  prompts,
  conversationUrl = '',
  recoverSameChat = false,
  expectedRecoveredSequences = [],
  onProgress,
  shouldCancel
}) {
  if (!Array.isArray(prompts) || !prompts.length) throw new Error('Nenhum prompt foi enviado ao robô Gemini.');
  const requestedPrompts = prompts.slice();
  const manifestRun = robotManifest.beginRun({
    numStr,
    mode: 'minisseries',
    provider: 'gemini',
    runId,
    prompts: requestedPrompts,
    conversationUrl,
    total: 50
  });
  const runnable = new Set(manifestRun.runnableSequences);
  prompts = requestedPrompts.filter((item, index) => runnable.has(promptSequence(item, index)));
  if (!prompts.length) {
    const waiting = manifestRun.skipped.some(item => item.reason !== 'completed');
    robotManifest.finishRun({ numStr, mode: 'minisseries', provider: 'gemini', runId, status: waiting ? 'waiting_for_provider' : 'completed' });
    const existing = robotManifest.existingSequences({ numStr, mode: 'minisseries', total: 50 });
    const existingSet = new Set(existing);
    return {
      existing,
      missing: Array.from({ length: 50 }, (_, index) => index + 1).filter(sequence => !existingSet.has(sequence)),
      failures: [],
      skipped: manifestRun.skipped,
      conversationUrl: ''
    };
  }
  const targetDir = path.join(ROOT, 'minisseries', String(numStr), `M${numStr}`);
  fs.mkdirSync(targetDir, { recursive: true });
  let browser;
  try {
    browser = await browserExtensionBridge.connectPuppeteer(puppeteer, {
      platform: 'gemini',
      defaultViewport: null
    });
    const pages = await browser.pages();
    const page = pages.find(candidate => candidate.url().includes('gemini.google.com'));
    if (!page) throw new Error('A guia Gemini preparada não foi localizada na sessão atual do Edge.');
    await waitForComposer(page, 300000);
    await startNewGeminiChat(page, onProgress);
    await activateGeminiImageMode(page, onProgress);
    if (onProgress) onProgress(7, 'Novo chat Gemini preparado para a rodada atual.');
    robotManifest.updateRunConversation({ numStr, mode: 'minisseries', provider: 'gemini', runId, conversationUrl: page.url() });
    recordGeminiConversation({ numStr, conversationUrl: page.url() });

    const currentUrl = page.url();
    const checkpoint = readGeminiCheckpoint(numStr);
    const requested = new Map(prompts.map((item, index) => [promptSequence(item, index), item]));
    const generated = new Map();
    if (recoverSameChat) {
      Object.entries(checkpoint.generated || {}).forEach(([rawSequence, entry]) => {
        const sequence = Number.parseInt(rawSequence, 10);
        if (!requested.has(sequence) || !entry || !entry.imageKey) return;
        const item = requested.get(sequence);
        const prompt = item && (item.fullPrompt || item.prompt || '');
        if (entry.promptSha256 !== promptSha256(prompt)) return;
        const imageOrdinal = Number.isInteger(entry.imageOrdinal) && entry.imageOrdinal >= 0 ? entry.imageOrdinal : null;
        if (!sameGeminiConversation(entry.conversationUrl, currentUrl)) return;
        generated.set(sequence, { sequence, imageKey: String(entry.imageKey), imageOrdinal });
      });
    }
    const expectedRecovered = Array.isArray(expectedRecoveredSequences)
      ? expectedRecoveredSequences.map(Number).filter(Number.isInteger).sort((left, right) => left - right)
      : [];
    const actuallyRecovered = Array.from(generated.keys()).sort((left, right) => left - right);
    if (recoverSameChat && expectedRecovered.length
      && (expectedRecovered.length !== actuallyRecovered.length
        || expectedRecovered.some((sequence, index) => sequence !== actuallyRecovered[index]))) {
      throw new Error(
        `Retomada protegida: o checkpoint nao corresponde integralmente às ${expectedRecovered.length} cenas registradas. Nenhum novo prompt foi enviado.`
      );
    }
    const toGenerate = prompts.filter((item, index) => !generated.has(promptSequence(item, index)));
    if (onProgress && generated.size) onProgress(8, `${generated.size} imagem(ns) do Gemini recuperada(s) no mesmo chat.`);

    const failures = [];
    for (let index = 0; index < toGenerate.length; index++) {
      if (shouldCancel && shouldCancel()) throw new Error('__GEMINI_CANCELLED__');
      const item = toGenerate[index];
      const sequence = promptSequence(item, index);
      const prompt = item.fullPrompt || item.prompt || '';
      try {
        const result = await sendPromptAndWait(page, prompt, shouldCancel);
        if (result.kind === 'image') {
          const imageOrdinal = generated.size;
          generated.set(sequence, { sequence, imageKey: result.imageKey, imageOrdinal });
          recordGeminiGenerated({ numStr, sequence, prompt, imageKey: result.imageKey, imageOrdinal, conversationUrl: page.url() });
          robotManifest.markGenerated({
            numStr,
            mode: 'minisseries',
            provider: 'gemini',
            runId,
            sequence,
            prompt,
            imageKey: result.imageKey,
            imageOrdinal,
            conversationUrl: page.url()
          });
        } else {
          failures.push({ sequence, reason: 'o Gemini não entregou imagem' });
        }
      } catch (error) {
        if (error.message === '__GEMINI_CANCELLED__') throw error;
        if (error.code === 'ROBOT_QUOTA_EXHAUSTED') throw error;
        failures.push({ sequence, reason: error.message || 'falha não identificada' });
      }
      if (onProgress) onProgress(
        Math.round(((index + 1) / Math.max(1, toGenerate.length)) * 70),
        `Gemini: cena ${String(sequence).padStart(2, '0')} processada (${index + 1}/${toGenerate.length}); downloads somente ao final.`
      );
      await delay(750);
    }

    const generatedList = Array.from(generated.values()).sort((left, right) => left.sequence - right.sequence);
    const downloadedHashes = new Set();
    if (onProgress) onProgress(70, `Gemini: geração encerrada; iniciando ${generatedList.length} download(s) na numeração original.`);
    await browserExtensionBridge.beginNativeDownloadSession();
    try {
      await hydrateGeminiImageHistory(page, generatedList.length, shouldCancel, onProgress);
      for (let index = 0; index < generatedList.length; index++) {
        if (shouldCancel && shouldCancel()) throw new Error('__GEMINI_CANCELLED__');
        const entry = generatedList[index];
        let downloadCompleted = false;
        try {
          const saved = await downloadGeminiImage({
            page,
            imageKey: entry.imageKey,
            imageOrdinal: entry.imageOrdinal,
            targetDir,
            sequence: entry.sequence,
            downloadedHashes
          });
          recordGeminiDownloaded({
            numStr,
            sequence: entry.sequence,
            targetPath: saved.targetPath,
            hash: saved.hash,
            conversationUrl: page.url()
          });
          robotManifest.markCompleted({
            numStr,
            mode: 'minisseries',
            provider: 'gemini',
            runId,
            sequence: entry.sequence,
            targetPath: saved.targetPath,
            hash: saved.hash,
            conversationUrl: page.url()
          });
          downloadCompleted = true;
        } catch (error) {
          failures.push({ sequence: entry.sequence, reason: `download: ${error.message || 'falha não identificada'}` });
        }
        if (onProgress) onProgress(
          70 + Math.round(((index + 1) / Math.max(1, generatedList.length)) * 30),
          downloadCompleted
            ? `Gemini: download ${index + 1}/${generatedList.length} concluido e validado.`
            : `Gemini: download ${index + 1}/${generatedList.length} pendente; arquivo nao salvo.`
        );
      }
    } finally {
      await browserExtensionBridge.endNativeDownloadSession();
    }

    const existing = robotManifest.existingSequences({ numStr, mode: 'minisseries', total: 50 });
    const existingSet = new Set(existing);
    const missing = Array.from({ length: 50 }, (_, index) => index + 1).filter(sequence => !existingSet.has(sequence));
    recordGeminiConversation({ numStr, conversationUrl: page.url() });
    if (onProgress) onProgress(100, missing.length
      ? `Rodada Gemini concluída: ${existing.length}/50 imagens presentes; faltam ${missing.length}.`
      : 'Rodada Gemini concluída: as 50 imagens estão presentes.');
    robotManifest.finishRun({ numStr, mode: 'minisseries', provider: 'gemini', runId, status: failures.length ? 'partial' : 'completed' });
    return { existing, missing, failures, skipped: manifestRun.skipped, conversationUrl: page.url() };
  } catch (error) {
    const cancelled = error.message === '__GEMINI_CANCELLED__';
    robotManifest.finishRun({
      numStr,
      mode: 'minisseries',
      provider: 'gemini',
      runId,
      status: cancelled ? 'cancelled' : (error.code === 'ROBOT_QUOTA_EXHAUSTED' ? 'quota_exhausted' : 'failed'),
      error: error.message || 'Falha no robô Gemini.'
    });
    throw error;
  } finally {
    if (browser) await browser.disconnect().catch(() => {});
  }
}

async function runGeminiFlowCurrentTabAutomation({
  numStr,
  runId = `gemini-flow-${String(numStr)}-${Date.now()}`,
  prompts,
  onProgress,
  shouldCancel
}) {
  if (!Array.isArray(prompts) || !prompts.length) throw new Error('Nenhum prompt foi enviado ao robo Gemini.');
  const requestedPrompts = prompts.slice();
  const manifestRun = robotManifest.beginRun({
    numStr,
    mode: 'flow',
    provider: 'gemini',
    runId,
    prompts: requestedPrompts,
    total: 5
  });
  const runnable = new Set(manifestRun.runnableSequences);
  prompts = requestedPrompts.filter((item, index) => runnable.has(promptSequence(item, index)));
  if (!prompts.length) {
    const waiting = manifestRun.skipped.some(item => item.reason !== 'completed');
    robotManifest.finishRun({ numStr, mode: 'flow', provider: 'gemini', runId, status: waiting ? 'waiting_for_provider' : 'completed' });
    return { savedFiles: [], failures: [], skipped: manifestRun.skipped, conversationUrl: '' };
  }
  const targetDir = path.join(ROOT, 'minisseries', String(numStr), 'flow');
  fs.mkdirSync(targetDir, { recursive: true });
  let browser;
  try {
    browser = await browserExtensionBridge.connectPuppeteer(puppeteer, {
      platform: 'gemini',
      defaultViewport: null
    });
    const pages = await browser.pages();
    const page = pages.find(candidate => candidate.url().includes('gemini.google.com'));
    if (!page) throw new Error('A guia Gemini preparada nao foi localizada na sessao atual do Edge.');
    await waitForComposer(page, 300000);
    await startNewGeminiChat(page, onProgress);
    await activateGeminiImageMode(page, onProgress);
    if (onProgress) onProgress(7, 'Novo chat Gemini preparado para a rodada atual.');
    robotManifest.updateRunConversation({ numStr, mode: 'flow', provider: 'gemini', runId, conversationUrl: page.url() });

    const generated = [];
    const failures = [];
    for (let index = 0; index < prompts.length; index++) {
      if (shouldCancel && shouldCancel()) throw new Error('__GEMINI_CANCELLED__');
      const item = prompts[index];
      const sequence = promptSequence(item, index);
      const prompt = item.fullPrompt || item.prompt || '';
      try {
        const result = await sendPromptAndWait(page, prompt, shouldCancel);
        if (result.kind === 'image') {
          generated.push({ sequence, imageKey: result.imageKey, imageOrdinal: result.imageOrdinal });
          robotManifest.markGenerated({
            numStr,
            mode: 'flow',
            provider: 'gemini',
            runId,
            sequence,
            prompt,
            imageKey: result.imageKey,
            imageOrdinal: result.imageOrdinal,
            conversationUrl: page.url()
          });
        } else failures.push({ sequence, reason: 'o Gemini nao entregou imagem' });
      } catch (error) {
        if (error.message === '__GEMINI_CANCELLED__') throw error;
        if (error.code === 'ROBOT_QUOTA_EXHAUSTED') throw error;
        failures.push({ sequence, reason: error.message || 'falha nao identificada' });
      }
      if (onProgress) onProgress(
        10 + Math.round(((index + 1) / Math.max(1, prompts.length)) * 65),
        `Gemini: cena ${String(sequence).padStart(2, '0')} processada (${index + 1}/${prompts.length}); downloads somente ao final.`
      );
      await delay(500);
    }

    const downloadedHashes = new Set();
    const savedFiles = [];
    if (onProgress) onProgress(76, `Gemini: geracao encerrada; baixando ${generated.length} imagem(ns) automaticamente.`);
      for (let index = 0; index < generated.length; index++) {
        if (shouldCancel && shouldCancel()) throw new Error('__GEMINI_CANCELLED__');
        const entry = generated[index];
        let downloadCompleted = false;
        try {
          const saved = await downloadGeminiImage({
            page,
            imageKey: entry.imageKey,
            imageOrdinal: entry.imageOrdinal,
            targetDir,
            sequence: entry.sequence,
            downloadedHashes,
            targetFileName: `cena_${String(entry.sequence).padStart(2, '0')}.png`
          });
          savedFiles.push(saved.targetPath);
          robotManifest.markCompleted({
            numStr,
            mode: 'flow',
            provider: 'gemini',
            runId,
            sequence: entry.sequence,
            targetPath: saved.targetPath,
            hash: saved.hash,
            conversationUrl: page.url()
          });
          downloadCompleted = true;
        } catch (error) {
          failures.push({ sequence: entry.sequence, reason: `download: ${error.message || 'falha nao identificada'}` });
        }
        if (onProgress) onProgress(
          76 + Math.round(((index + 1) / Math.max(1, generated.length)) * 24),
          downloadCompleted
            ? `Gemini: download ${index + 1}/${generated.length} concluido e validado.`
            : `Gemini: download ${index + 1}/${generated.length} pendente; arquivo nao salvo.`
        );
      }
    const result = { savedFiles, failures, skipped: manifestRun.skipped, conversationUrl: page.url() };
    if (savedFiles.length !== prompts.length) {
      if (onProgress) onProgress(100, `Robo Gemini encerrado com pendencia: ${savedFiles.length}/${prompts.length} imagem(ns) salva(s) em flow.`);
      const error = new Error(`Download Gemini incompleto: ${savedFiles.length}/${prompts.length} imagem(ns) validada(s).`);
      error.result = result;
      throw error;
    }
    if (onProgress) onProgress(100, `Robo Gemini concluido: ${savedFiles.length}/${prompts.length} imagem(ns) salva(s) e validada(s) em flow.`);
    robotManifest.finishRun({ numStr, mode: 'flow', provider: 'gemini', runId, status: 'completed' });
    return result;
  } catch (error) {
    const cancelled = error.message === '__GEMINI_CANCELLED__';
    robotManifest.finishRun({
      numStr,
      mode: 'flow',
      provider: 'gemini',
      runId,
      status: cancelled ? 'cancelled' : (error.code === 'ROBOT_QUOTA_EXHAUSTED' ? 'quota_exhausted' : 'failed'),
      error: error.message || 'Falha no robô Gemini Flow.'
    });
    throw error;
  } finally {
    if (browser) await browser.disconnect().catch(() => {});
  }
}

function ordinalTo0Based(ordinal) {
  return Number.isInteger(ordinal) && ordinal >= 0 ? ordinal : null;
}

const GPT_ANCHOR_SEQUENCES = new Set([1, 6, 11, 16, 21, 26, 31, 36, 41, 46]);

async function recoverGeminiFlowDownloadsCurrentTab({ numStr, mode = 'minisseries', runId = `gemini-recovery-${String(numStr)}-${Date.now()}`, expectedCount, sequences, onProgress, shouldCancel }) {
  const total = mode === 'flow' ? 7 : 50;
  const manifest = robotManifest.reconcileManifest({ numStr, mode, total });
  let requestedSequences = [];
  if (sequences === 'auto' || !sequences || (Array.isArray(sequences) && sequences.length === 0)) {
    const generatedSequences = Object.entries(manifest.scenes || {})
      .filter(([, scene]) => scene?.status === 'generated' && scene.provider === 'gemini')
      .map(([key]) => Number.parseInt(key, 10))
      .sort((a, b) => a - b);
    if (generatedSequences.length > 0) {
      requestedSequences = generatedSequences;
    } else {
      const existing = robotManifest.existingSequences({ numStr, mode, total });
      const existingSet = new Set(existing);
      // Na minissérie oficial, o Gemini cuida exclusivamente das 40 posições complementares
      requestedSequences = Array.from({ length: total }, (_, index) => index + 1)
        .filter(sequence => (mode === 'flow' || !GPT_ANCHOR_SEQUENCES.has(sequence)) && !existingSet.has(sequence));
    }
  } else {
    requestedSequences = Array.isArray(sequences)
      ? sequences.map(Number).filter(sequence => Number.isInteger(sequence) && sequence > 0 && sequence <= total)
      : [];
  }
  
  if (requestedSequences.length === 0) {
    throw new Error('Nenhuma posição disponível para resgate no manifesto.');
  }

  const isFlow = mode === 'flow';
  const targetDir = isFlow 
    ? path.join(ROOT, 'minisseries', String(numStr), 'flow')
    : path.join(ROOT, 'minisseries', String(numStr), `M${numStr}`);
  fs.mkdirSync(targetDir, { recursive: true });
  let browser;
  try {
    browser = await browserExtensionBridge.connectPuppeteer(puppeteer, {
      platform: 'gemini',
      defaultViewport: null
    });
    const pages = await browser.pages();
    const page = pages.find(candidate => candidate.url().includes('gemini.google.com'));
    if (!page) throw new Error('A guia Gemini preparada não foi localizada no navegador aberto.');
    await waitForComposer(page, 300000);

    // Se sequences era 'auto', sincroniza com o checkpoint de posições geradas da conversa aberta
    if (sequences === 'auto' || !sequences || (Array.isArray(sequences) && sequences.length === 0)) {
      const checkpoint = readGeminiCheckpoint(numStr);
      const currentUrl = canonicalGeminiConversationUrl(page.url());
      const convGroup = (checkpoint.conversations && checkpoint.conversations[currentUrl]) ? checkpoint.conversations[currentUrl] : checkpoint;
      const checkpointGenSequences = Object.entries(convGroup.generated || {})
        .map(([seq, data]) => ({
          sequence: Number(seq),
          ordinal: data.imageOrdinal,
          generatedAt: data.generatedAt || ''
        }))
        .filter(entry => Number.isInteger(entry.sequence) && entry.sequence > 0 && !(checkpoint.completed && checkpoint.completed[String(entry.sequence)]))
        .sort((a, b) => {
          if (Number.isInteger(a.ordinal) && Number.isInteger(b.ordinal)) return a.ordinal - b.ordinal;
          return a.generatedAt > b.generatedAt ? 1 : -1;
        })
        .map(entry => entry.sequence);

      if (checkpointGenSequences.length > 0) {
        requestedSequences = checkpointGenSequences;
      }
    }

    // O chat que o Diretor deixou aberto e a fonte direta do Resgate. Nenhuma
    // URL antiga e reaberta ou validada contra historico de conversa.
    const recovery = robotManifest.beginRecoveryRun({
      numStr,
      mode,
      provider: 'gemini',
      runId,
      sequences: requestedSequences,
      conversationUrl: page.url(),
      total
    });
    requestedSequences = recovery.runnableSequences;
    if (!requestedSequences.length) {
      robotManifest.finishRun({ numStr, mode, provider: 'gemini', runId, status: 'completed' });
      return { savedFiles: [], skipped: recovery.skipped, conversationUrl: page.url() };
    }

    const count = requestedSequences.length;
    if (onProgress) onProgress(10, `Lendo o histórico de imagens no chat (Cenas ${requestedSequences.join(', ')})...`);
    const availableKeys = await hydrateGeminiImageHistory(page, count, shouldCancel, onProgress);
    if (!availableKeys || availableKeys.length === 0) {
      throw new Error('Nenhuma imagem gerada foi encontrada no chat ativo do Gemini.');
    }

    const toProcessCount = Math.min(requestedSequences.length, availableKeys.length);
    const downloadedHashes = new Set();
    const savedFiles = [];
    const failures = [];

    await browserExtensionBridge.beginNativeDownloadSession();
    try {
      for (let index = 0; index < toProcessCount; index++) {
        if (shouldCancel && shouldCancel()) throw new Error('__GEMINI_CANCELLED__');
        const sequence = requestedSequences[index];
        const scene = manifest.scenes[String(sequence).padStart(3, '0')];
        const imageKey = (scene && scene.imageKey) || availableKeys[index];
        const imageOrdinal = (scene && Number.isInteger(scene.imageOrdinal) && scene.imageOrdinal >= 0)
          ? scene.imageOrdinal
          : index;
        
        const percent = Math.round(15 + (((index + 1) / toProcessCount) * 85));
        if (onProgress) onProgress(percent, `Gemini: baixando cena ${sequence} (${index + 1}/${toProcessCount})...`);
        
        try {
          const saved = await downloadGeminiImage({
            page,
            imageKey,
            imageOrdinal,
            targetDir,
            sequence,
            downloadedHashes,
            targetFileName: isFlow
              ? `cena_${String(sequence).padStart(2, '0')}.png`
              : `img_${String(sequence).padStart(3, '0')}.png`
          });
          if (!isFlow) {
            recordGeminiDownloaded({ numStr, sequence, targetPath: saved.targetPath, hash: saved.hash, conversationUrl: page.url() });
          }
          robotManifest.markCompleted({
            numStr,
            mode,
            provider: 'gemini',
            runId,
            sequence,
            targetPath: saved.targetPath,
            hash: saved.hash,
            conversationUrl: page.url()
          });
          savedFiles.push(saved.targetPath);
          if (onProgress) onProgress(percent, `Gemini: cena ${sequence} concluída.`);
        } catch (downloadError) {
          failures.push({ sequence, reason: `download: ${downloadError.message || 'falha no download'}` });
        }
      }
    } finally {
      await browserExtensionBridge.endNativeDownloadSession();
    }

    robotManifest.finishRun({
      numStr,
      mode,
      provider: 'gemini',
      runId,
      status: failures.length ? (savedFiles.length ? 'partial' : 'failed') : 'completed'
    });
    return { savedFiles, failures, skipped: recovery.skipped, conversationUrl: page.url() };
  } catch (error) {
    robotManifest.finishRun({
      numStr,
      mode,
      provider: 'gemini',
      runId,
      status: error.message === '__GEMINI_CANCELLED__' ? 'cancelled' : 'failed',
      error: error.message || 'Falha no resgate Gemini.'
    });
    throw error;
  } finally {
    if (browser) await browser.disconnect().catch(() => {});
  }
}

module.exports = {
  runGeminiCurrentTabAutomation,
  runGeminiFlowCurrentTabAutomation,
  recoverGeminiFlowDownloadsCurrentTab,
  readGeminiCheckpoint,
  findGeminiResumePlan,
  recordGeminiGenerated,
  recordGeminiDownloaded,
  __testHooks: Object.freeze({
    promptSequence,
    promptSha256,
    sameGeminiConversation,
    isQuotaExhaustedMessage,
    quotaExhaustedError,
    findGeminiResumePlan,
    readGeminiCheckpoint,
    recordGeminiConversation,
    recordGeminiGenerated,
    recordGeminiDownloaded
  })
};
