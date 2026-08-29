const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { FILES_ROOT } = require('./utils/paths');
const ROOT = FILES_ROOT;
const IMAGE_EXTENSIONS = Object.freeze(['.jpg', '.jpeg', '.png', '.webp']);
const DEFAULT_LEASE_MS = 30 * 60 * 1000;

function safeNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) throw new Error('Número de minissérie inválido para o manifesto dos robôs.');
  return digits.padStart(2, '0');
}

function safeMode(value) {
  return value === 'flow' ? 'flow' : 'minisseries';
}

function safeProvider(value) {
  const provider = String(value || '').toLowerCase();
  if (provider !== 'chatgpt' && provider !== 'gemini') {
    throw new Error(`Provedor inválido para o manifesto: ${provider || 'vazio'}.`);
  }
  return provider;
}

function safeRunId(value) {
  const runId = String(value || '').trim();
  if (!/^[a-z0-9._:-]{6,160}$/i.test(runId)) throw new Error('Identificador de execução inválido.');
  return runId;
}

function normalizeSequence(value) {
  const sequence = Number.parseInt(value, 10);
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999) {
    throw new Error(`Posição de imagem inválida: ${value}.`);
  }
  return sequence;
}

function sequenceKey(value) {
  return String(normalizeSequence(value)).padStart(3, '0');
}

function promptSequence(item, index) {
  return normalizeSequence(item?.sequence || item?.finalSequence || item?.sceneNum || index + 1);
}

function promptText(item) {
  return String(item?.fullPrompt || item?.prompt || '').replace(/\r\n?/g, '\n').trim();
}

function promptSha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function canonicalConversationUrl(value, provider = '') {
  try {
    const url = new URL(String(value || ''));
    if (provider === 'chatgpt') {
      if (url.origin !== 'https://chatgpt.com' || !url.pathname.startsWith('/c/')) return '';
      const conversationId = decodeURIComponent(url.pathname.slice(3).split('/')[0] || '');
      if (!conversationId || /^WEB:/i.test(conversationId)) return '';
    }
    if (provider === 'gemini' && (url.origin !== 'https://gemini.google.com' || !/\/app/i.test(url.pathname))) return '';
    if (!provider && url.origin !== 'https://chatgpt.com' && url.origin !== 'https://gemini.google.com') return '';
    return `${url.origin}${url.pathname}`;
  } catch (error) {
    return '';
  }
}

function manifestPath(numStr, mode = 'minisseries', rootDir = ROOT) {
  const number = safeNumber(numStr);
  const suffix = safeMode(mode);
  return path.join(rootDir, 'minisseries', number, 'prompts', `robot_manifest_${number}_${suffix}.json`);
}

function targetDirFor(numStr, mode = 'minisseries', rootDir = ROOT) {
  const number = safeNumber(numStr);
  return safeMode(mode) === 'flow'
    ? path.join(rootDir, 'minisseries', number, 'flow')
    : path.join(rootDir, 'minisseries', number, `M${number}`);
}

function targetBaseName(sequence, mode = 'minisseries') {
  return safeMode(mode) === 'flow'
    ? `cena_${String(normalizeSequence(sequence)).padStart(2, '0')}`
    : `img_${sequenceKey(sequence)}`;
}

function emptyManifest(numStr, mode) {
  return {
    version: 1,
    number: safeNumber(numStr),
    mode: safeMode(mode),
    scenes: {},
    sessions: {},
    claims: {},
    events: [],
    updatedAt: null
  };
}

function normalizeManifest(parsed, numStr, mode) {
  const base = emptyManifest(numStr, mode);
  return {
    ...base,
    scenes: parsed && typeof parsed.scenes === 'object' && parsed.scenes ? parsed.scenes : {},
    sessions: parsed && typeof parsed.sessions === 'object' && parsed.sessions ? parsed.sessions : {},
    claims: parsed && typeof parsed.claims === 'object' && parsed.claims ? parsed.claims : {},
    events: Array.isArray(parsed?.events) ? parsed.events : [],
    updatedAt: parsed?.updatedAt || null
  };
}

function readManifest(numStr, mode = 'minisseries', rootDir = ROOT) {
  const filePath = manifestPath(numStr, mode, rootDir);
  if (!fs.existsSync(filePath)) return emptyManifest(numStr, mode);
  try {
    return normalizeManifest(JSON.parse(fs.readFileSync(filePath, 'utf8')), numStr, mode);
  } catch (error) {
    throw new Error(`Manifesto dos robôs inválido em ${filePath}.`);
  }
}

function writeManifest(manifest, rootDir = ROOT) {
  const filePath = manifestPath(manifest.number, manifest.mode, rootDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  manifest.updatedAt = new Date().toISOString();
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(manifest, null, 2), 'utf8');
  fs.renameSync(temporaryPath, filePath);
  return manifest;
}

function appendEvent(manifest, type, details = {}) {
  manifest.events.push({
    id: crypto.randomUUID(),
    type,
    at: new Date().toISOString(),
    ...details
  });
}

function positionFiles({ numStr, mode = 'minisseries', sequence, rootDir = ROOT }) {
  const targetDir = targetDirFor(numStr, mode, rootDir);
  if (!fs.existsSync(targetDir)) return [];
  const baseName = targetBaseName(sequence, mode).toLowerCase();
  return fs.readdirSync(targetDir)
    .filter(file => {
      const extension = path.extname(file).toLowerCase();
      return IMAGE_EXTENSIONS.includes(extension) && path.basename(file, extension).toLowerCase() === baseName;
    })
    .map(file => {
      const filePath = path.join(targetDir, file);
      const stat = fs.statSync(filePath);
      return {
        file,
        filePath,
        bytes: stat.size,
        sha256: stat.size > 0 ? sha256File(filePath) : ''
      };
    });
}

function expireClaims(manifest, now = Date.now()) {
  Object.entries(manifest.claims).forEach(([key, claim]) => {
    const staleProcess = Number.isInteger(claim?.processId) && claim.processId !== process.pid;
    if (!claim || staleProcess || Date.parse(claim.expiresAt || '') <= now) {
      delete manifest.claims[key];
      appendEvent(manifest, staleProcess ? 'claim_released_after_restart' : 'claim_expired', { sequence: Number(key), runId: claim?.runId || '' });
    }
  });
}

function reconcileManifest({ numStr, mode = 'minisseries', total, rootDir = ROOT }) {
  const manifest = readManifest(numStr, mode, rootDir);
  const limit = Number.isInteger(total) && total > 0 ? total : (safeMode(mode) === 'flow' ? 5 : 50);
  expireClaims(manifest);

  const targetDir = targetDirFor(numStr, mode, rootDir);
  let allFiles = [];
  if (fs.existsSync(targetDir)) {
    allFiles = fs.readdirSync(targetDir)
      .filter(file => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()));
  }

  const filesByBaseName = {};
  for (const file of allFiles) {
    const baseName = path.basename(file, path.extname(file)).toLowerCase();
    if (!filesByBaseName[baseName]) filesByBaseName[baseName] = [];
    const filePath = path.join(targetDir, file);
    const stat = fs.statSync(filePath);
    if (stat.size > 0) {
      filesByBaseName[baseName].push({ file, filePath, bytes: stat.size, mtimeMs: stat.mtimeMs });
    }
  }

  for (let sequence = 1; sequence <= limit; sequence++) {
    const key = sequenceKey(sequence);
    const scene = manifest.scenes[key] || { sequence, status: 'pending' };
    const baseName = targetBaseName(sequence, mode).toLowerCase();
    const files = filesByBaseName[baseName] || [];

    if (files.length > 1) {
      scene.status = 'conflict';
      scene.conflictingFiles = files.map(f => {
        if (!f.sha256) f.sha256 = sha256File(f.filePath);
        return { file: f.file, sha256: f.sha256, bytes: f.bytes };
      });
      scene.updatedAt = new Date().toISOString();
    } else if (files.length === 1) {
      const file = files[0];
      let needsHash = true;
      if (scene.status === 'completed' && scene.acceptedFile === file.file && scene.sha256) {
        if (scene.bytes === file.bytes && scene.mtimeMs === file.mtimeMs) {
          needsHash = false;
        }
      }
      if (needsHash) {
        file.sha256 = sha256File(file.filePath);
        scene.sha256 = file.sha256;
        scene.bytes = file.bytes;
        scene.mtimeMs = file.mtimeMs;
      }
      scene.status = 'completed';
      scene.acceptedFile = file.file;
      scene.completedAt = scene.completedAt || new Date().toISOString();
      scene.updatedAt = new Date().toISOString();
      delete scene.conflictingFiles;
    } else if (scene.status === 'completed' || scene.status === 'conflict') {
      scene.status = scene.imageKey && scene.conversationUrl ? 'generated' : 'pending';
      delete scene.acceptedFile;
      delete scene.sha256;
      delete scene.bytes;
      delete scene.mtimeMs;
      delete scene.conflictingFiles;
      scene.updatedAt = new Date().toISOString();
    }
    manifest.scenes[key] = scene;
  }
  return writeManifest(manifest, rootDir);
}

function beginRun({ numStr, mode = 'minisseries', provider, runId, prompts, conversationUrl = '', total, rootDir = ROOT, leaseMs = DEFAULT_LEASE_MS }) {
  const normalizedProvider = safeProvider(provider);
  const normalizedRunId = safeRunId(runId);
  const queue = Array.isArray(prompts) ? prompts : [];
  const manifest = reconcileManifest({ numStr, mode, total, rootDir });
  const now = new Date();
  const expiresAt = new Date(now.getTime() + leaseMs).toISOString();
  const canonicalUrl = canonicalConversationUrl(conversationUrl, normalizedProvider);
  const runnableSequences = [];
  const skipped = [];

  queue.forEach((item, index) => {
    const sequence = promptSequence(item, index);
    const key = sequenceKey(sequence);
    const scene = manifest.scenes[key] || { sequence, status: 'pending' };
    const claim = manifest.claims[key];
    if (scene.status === 'completed') {
      skipped.push({ sequence, reason: 'completed', acceptedFile: scene.acceptedFile || '' });
      return;
    }
    if (scene.status === 'conflict') {
      skipped.push({ sequence, reason: 'conflict' });
      return;
    }
    if (claim && claim.runId !== normalizedRunId) {
      skipped.push({ sequence, reason: 'claimed', runId: claim.runId });
      return;
    }
    // A presenca fisica do arquivo e a unica conclusao operacional.
    // Uma posicao sem arquivo pode ser solicitada novamente em qualquer
    // rodada/provedor, independentemente do chat que gerou uma tentativa
    // anterior. A posicao absoluta continua protegida pelo claim e pelo
    // commit exclusivo do arquivo final.
    // Uma nova rodada substitui somente a tentativa sem arquivo. O historico
    // anterior nao pode bloquear nem contaminar a nova relacao posicao/prompt.
    scene.status = 'pending';
    delete scene.provider;
    delete scene.conversationUrl;
    delete scene.promptSha256;
    delete scene.imageKey;
    delete scene.imageOrdinal;
    delete scene.generatedAt;
    scene.updatedAt = now.toISOString();
    manifest.scenes[key] = scene;
    manifest.claims[key] = { sequence, runId: normalizedRunId, provider: normalizedProvider, processId: process.pid, claimedAt: now.toISOString(), expiresAt };
    runnableSequences.push(sequence);
  });

  manifest.sessions[normalizedRunId] = {
    runId: normalizedRunId,
    provider: normalizedProvider,
    mode: safeMode(mode),
    conversationUrl: canonicalUrl,
    selectedSequences: queue.map(promptSequence),
    runnableSequences,
    skipped,
    status: 'running',
    startedAt: manifest.sessions[normalizedRunId]?.startedAt || now.toISOString(),
    updatedAt: now.toISOString()
  };
  appendEvent(manifest, 'run_started', { runId: normalizedRunId, provider: normalizedProvider, runnableSequences, skipped });
  writeManifest(manifest, rootDir);
  return { runId: normalizedRunId, runnableSequences, skipped, manifest };
}

function beginRecoveryRun({ numStr, mode = 'minisseries', provider, runId, sequences, conversationUrl, total, rootDir = ROOT, leaseMs = DEFAULT_LEASE_MS }) {
  const normalizedProvider = safeProvider(provider);
  const normalizedRunId = safeRunId(runId);
  const canonicalUrl = canonicalConversationUrl(conversationUrl, normalizedProvider);
  const requested = (Array.isArray(sequences) ? sequences : []).map(normalizeSequence);
  const manifest = reconcileManifest({ numStr, mode, total, rootDir });
  const now = new Date();
  const expiresAt = new Date(now.getTime() + leaseMs).toISOString();
  const runnableSequences = [];
  const skipped = [];
  requested.forEach(sequence => {
    const key = sequenceKey(sequence);
    const scene = manifest.scenes[key];
    const claim = manifest.claims[key];
    if (scene?.status === 'completed') {
      skipped.push({ sequence, reason: 'completed', acceptedFile: scene.acceptedFile || '' });
      return;
    }
    if (claim && claim.runId !== normalizedRunId) {
      skipped.push({ sequence, reason: 'claimed', runId: claim.runId });
      return;
    }
    // O Resgate trabalha exclusivamente sobre o chat que o Diretor deixou
    // visivel. A ausencia de arquivo fisico autoriza a tentativa de download,
    // sem exigir provedor, URL ou telemetria de uma rodada anterior.
    if (!scene) manifest.scenes[key] = { sequence, status: 'pending', updatedAt: now.toISOString() };
    manifest.claims[key] = { sequence, runId: normalizedRunId, provider: normalizedProvider, processId: process.pid, conversationUrl: canonicalUrl, claimedAt: now.toISOString(), expiresAt };
    runnableSequences.push(sequence);
  });
  manifest.sessions[normalizedRunId] = {
    runId: normalizedRunId,
    provider: normalizedProvider,
    mode: safeMode(mode),
    conversationUrl: canonicalUrl,
    selectedSequences: requested,
    runnableSequences,
    skipped,
    kind: 'download_recovery',
    status: 'running',
    startedAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
  appendEvent(manifest, 'recovery_started', { runId: normalizedRunId, provider: normalizedProvider, conversationUrl: canonicalUrl, runnableSequences, skipped });
  writeManifest(manifest, rootDir);
  return { runId: normalizedRunId, runnableSequences, skipped, manifest };
}

function updateRunConversation({ numStr, mode = 'minisseries', provider, runId, conversationUrl, rootDir = ROOT }) {
  const manifest = readManifest(numStr, mode, rootDir);
  const normalizedProvider = safeProvider(provider);
  const normalizedRunId = safeRunId(runId);
  const session = manifest.sessions[normalizedRunId];
  if (!session || session.provider !== normalizedProvider) throw new Error('Sessão do robô não encontrada no manifesto.');
  const canonicalUrl = canonicalConversationUrl(conversationUrl, normalizedProvider);
  if (!canonicalUrl) throw new Error(`URL de conversa ${normalizedProvider} inválida.`);
  session.conversationUrl = canonicalUrl;
  session.updatedAt = new Date().toISOString();
  Object.values(manifest.claims).forEach(claim => {
    if (claim.runId === normalizedRunId) claim.conversationUrl = canonicalUrl;
  });
  appendEvent(manifest, 'conversation_registered', { runId: normalizedRunId, provider: normalizedProvider, conversationUrl: canonicalUrl });
  return writeManifest(manifest, rootDir);
}

function markGenerated({ numStr, mode = 'minisseries', provider, runId, sequence, prompt, imageKey, imageOrdinal = null, conversationUrl, rootDir = ROOT }) {
  const manifest = readManifest(numStr, mode, rootDir);
  const normalizedProvider = safeProvider(provider);
  const normalizedRunId = safeRunId(runId);
  const normalizedSequence = normalizeSequence(sequence);
  const key = sequenceKey(normalizedSequence);
  const claim = manifest.claims[key];
  if (!claim || claim.runId !== normalizedRunId || claim.provider !== normalizedProvider) {
    throw new Error(`Cena ${key} não está reservada por esta execução.`);
  }
  const canonicalUrl = canonicalConversationUrl(conversationUrl, normalizedProvider);
  if (!canonicalUrl) throw new Error(`Cena ${key}: conversa do provedor não registrada.`);
  manifest.scenes[key] = {
    ...(manifest.scenes[key] || {}),
    sequence: normalizedSequence,
    status: 'generated',
    promptSha256: promptSha256(prompt),
    provider: normalizedProvider,
    runId: normalizedRunId,
    conversationUrl: canonicalUrl,
    imageKey: String(imageKey || ''),
    imageOrdinal: Number.isInteger(imageOrdinal) ? imageOrdinal : null,
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  appendEvent(manifest, 'scene_generated', { runId: normalizedRunId, provider: normalizedProvider, sequence: normalizedSequence, conversationUrl: canonicalUrl });
  return writeManifest(manifest, rootDir);
}

function markCompleted({ numStr, mode = 'minisseries', provider, runId, sequence, targetPath, hash, conversationUrl, rootDir = ROOT }) {
  const manifest = readManifest(numStr, mode, rootDir);
  const normalizedProvider = safeProvider(provider);
  const normalizedRunId = safeRunId(runId);
  const normalizedSequence = normalizeSequence(sequence);
  const key = sequenceKey(normalizedSequence);
  const resolvedTargetDir = path.resolve(targetDirFor(numStr, mode, rootDir));
  const resolvedTarget = path.resolve(targetPath);
  if (path.dirname(resolvedTarget).toLowerCase() !== resolvedTargetDir.toLowerCase()) {
    throw new Error(`Cena ${key}: arquivo concluído fora da pasta oficial.`);
  }
  if (!fs.existsSync(resolvedTarget) || fs.statSync(resolvedTarget).size <= 0 || sha256File(resolvedTarget) !== hash) {
    throw new Error(`Cena ${key}: arquivo final não passou na validação do manifesto.`);
  }
  const canonicalUrl = canonicalConversationUrl(conversationUrl, normalizedProvider);
  manifest.scenes[key] = {
    ...(manifest.scenes[key] || {}),
    sequence: normalizedSequence,
    status: 'completed',
    provider: normalizedProvider,
    runId: normalizedRunId,
    conversationUrl: canonicalUrl,
    acceptedFile: path.basename(resolvedTarget),
    sha256: hash,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  delete manifest.claims[key];
  appendEvent(manifest, 'scene_completed', { runId: normalizedRunId, provider: normalizedProvider, sequence: normalizedSequence, acceptedFile: path.basename(resolvedTarget), sha256: hash });
  return writeManifest(manifest, rootDir);
}

function finishRun({ numStr, mode = 'minisseries', provider, runId, status = 'completed', error = '', rootDir = ROOT }) {
  const manifest = readManifest(numStr, mode, rootDir);
  const normalizedProvider = safeProvider(provider);
  const normalizedRunId = safeRunId(runId);
  Object.entries(manifest.claims).forEach(([key, claim]) => {
    if (claim?.runId === normalizedRunId) delete manifest.claims[key];
  });
  const session = manifest.sessions[normalizedRunId] || { runId: normalizedRunId, provider: normalizedProvider };
  session.status = status;
  session.error = String(error || '');
  session.finishedAt = new Date().toISOString();
  session.updatedAt = session.finishedAt;
  manifest.sessions[normalizedRunId] = session;
  appendEvent(manifest, 'run_finished', { runId: normalizedRunId, provider: normalizedProvider, status, error: String(error || '') });
  return writeManifest(manifest, rootDir);
}

function commitBuffer({ numStr, mode = 'minisseries', sequence, buffer, extension, rootDir = ROOT }) {
  if (!Buffer.isBuffer(buffer) || buffer.length <= 0) throw new Error('Arquivo de imagem vazio.');
  const normalizedExtension = String(extension || '').toLowerCase();
  if (!IMAGE_EXTENSIONS.includes(normalizedExtension)) throw new Error(`Extensão de imagem não permitida: ${normalizedExtension}.`);
  const normalizedSequence = normalizeSequence(sequence);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const existing = positionFiles({ numStr, mode, sequence: normalizedSequence, rootDir });
  if (existing.length) {
    const identical = existing.find(file => file.bytes === buffer.length && file.sha256 === hash);
    if (existing.length === 1 && identical) {
      return { targetPath: identical.filePath, targetName: identical.file, hash, alreadyPresent: true };
    }
    const error = new Error(`Cena ${sequenceKey(normalizedSequence)} já possui arquivo oficial; sobrescrita bloqueada.`);
    error.code = 'ROBOT_POSITION_OCCUPIED';
    error.files = existing.map(file => file.file);
    throw error;
  }

  const targetDir = targetDirFor(numStr, mode, rootDir);
  const stagingDir = path.join(targetDir, '.robot-staging');
  fs.mkdirSync(stagingDir, { recursive: true });
  const targetName = `${targetBaseName(normalizedSequence, mode)}${normalizedExtension}`;
  const targetPath = path.join(targetDir, targetName);
  const stagingPath = path.join(stagingDir, `${targetName}.${crypto.randomUUID()}.tmp`);
  try {
    fs.writeFileSync(stagingPath, buffer, { flag: 'wx' });
    if (fs.statSync(stagingPath).size !== buffer.length || sha256File(stagingPath) !== hash) {
      throw new Error(`Cena ${sequenceKey(normalizedSequence)}: staging não passou na validação.`);
    }
    fs.copyFileSync(stagingPath, targetPath, fs.constants.COPYFILE_EXCL);
    if (fs.statSync(targetPath).size !== buffer.length || sha256File(targetPath) !== hash) {
      fs.rmSync(targetPath, { force: true });
      throw new Error(`Cena ${sequenceKey(normalizedSequence)}: arquivo final não passou na validação.`);
    }
    return { targetPath, targetName, hash, alreadyPresent: false };
  } finally {
    fs.rmSync(stagingPath, { force: true });
  }
}

function commitFile({ numStr, mode = 'minisseries', sequence, sourcePath, extension = '', rootDir = ROOT }) {
  const resolvedSource = path.resolve(sourcePath);
  if (!fs.existsSync(resolvedSource)) throw new Error('Download temporário não localizado.');
  const finalExtension = String(extension || path.extname(resolvedSource)).toLowerCase();
  return commitBuffer({ numStr, mode, sequence, buffer: fs.readFileSync(resolvedSource), extension: finalExtension, rootDir });
}

function existingSequences({ numStr, mode = 'minisseries', total, rootDir = ROOT }) {
  const manifest = reconcileManifest({ numStr, mode, total, rootDir });
  return Object.entries(manifest.scenes)
    .filter(([, scene]) => scene?.status === 'completed')
    .map(([key]) => Number.parseInt(key, 10))
    .filter(Number.isInteger)
    .sort((left, right) => left - right);
}

module.exports = {
  ROOT,
  IMAGE_EXTENSIONS,
  manifestPath,
  targetDirFor,
  targetBaseName,
  canonicalConversationUrl,
  promptSha256,
  readManifest,
  reconcileManifest,
  beginRun,
  beginRecoveryRun,
  updateRunConversation,
  markGenerated,
  markCompleted,
  finishRun,
  commitBuffer,
  commitFile,
  positionFiles,
  existingSequences,
  __testHooks: Object.freeze({
    safeNumber,
    safeMode,
    safeProvider,
    normalizeSequence,
    sequenceKey,
    promptSequence,
    promptSha256,
    canonicalConversationUrl,
    expireClaims
  })
};
