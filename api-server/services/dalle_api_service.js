const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { FILES_ROOT } = require('../utils/paths');
const { env } = require('../utils/env_loader');
const robotManifest = require('../robot_manifest');
const { buildChatGPTQueue } = require('../routes/chatgpt_automation_routes');

let currentJob = {
  active: false,
  campaignNumber: null,
  total: 0,
  current: 0,
  currentSequence: null,
  completedSequences: [],
  failedSequences: [],
  skippedSequences: [],
  status: 'idle',
  log: 'Pronto para iniciar.',
  error: null,
  startedAt: null,
  updatedAt: null,
  abortController: null
};

function getOpenAIApiKey() {
  return process.env.OPENAI_API_KEY || (typeof env === 'function' ? env('OPENAI_API_KEY') : '') || '';
}

async function callDalle3Api({ prompt, size = '1792x1024', quality = 'standard', signal }) {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('Chave OPENAI_API_KEY não encontrada no arquivo .env.');
  }

  // DALL-E 3 prompt cleaning
  const cleanPrompt = String(prompt || '')
    .replace(/^\s*TITLE EXACT\s*:[^\n]*\r?\n?/i, '')
    .trim();

  if (!cleanPrompt) {
    throw new Error('Prompt vazio para geração no DALL-E 3.');
  }

  const payload = {
    model: 'chatgpt-image-latest',
    prompt: cleanPrompt,
    n: 1,
    size: 'auto',
    quality: 'high'
  };

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify(payload),
    signal
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error?.message || `Erro HTTP ${response.status} na API da OpenAI.`;
    throw new Error(`DALL-E 3: ${errorMsg}`);
  }

  const item = data.data?.[0];
  if (!item) {
    throw new Error('Resposta inválida do DALL-E 3 (dados de imagem ausentes).');
  }

  let finalB64 = item.b64_json;
  
  if (!finalB64 && item.url) {
    try {
      const imgRes = await fetch(item.url);
      if (!imgRes.ok) throw new Error('Falha ao baixar imagem via URL');
      const arrayBuffer = await imgRes.arrayBuffer();
      finalB64 = Buffer.from(arrayBuffer).toString('base64');
    } catch (err) {
      throw new Error(`DALL-E 3 retornou URL, mas o download falhou: ${err.message}`);
    }
  }

  if (!finalB64) {
    throw new Error('Resposta inválida do DALL-E 3 (sem b64_json nem url).');
  }

  return {
    b64_json: finalB64,
    revised_prompt: item.revised_prompt || cleanPrompt
  };
}

async function startDalleAutomationJob({ campaignNumber, sequences = [], quality = 'standard' }) {
  const cleanNumber = String(campaignNumber || '').replace(/\D/g, '').padStart(2, '0');
  if (!cleanNumber) throw new Error('Número de minissérie inválido.');

  if (currentJob.active) {
    throw new Error(`Existe uma tarefa do DALL-E 3 já em execução para a Minissérie #${currentJob.campaignNumber}.`);
  }

  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('Configure a chave OPENAI_API_KEY no arquivo .env antes de iniciar.');
  }

  const { queue } = buildChatGPTQueue({ ROOT: FILES_ROOT, numStr: cleanNumber });
  if (!Array.isArray(queue) || queue.length !== 50) {
    throw new Error(`A esteira da minissérie ${cleanNumber} não possui a fila completa de 50 prompts.`);
  }

  // Se 'sequences' foi especificado, filtra somente as posições desejadas
  const targetSequences = (Array.isArray(sequences) && sequences.length > 0)
    ? sequences.map(s => Number(s)).filter(s => Number.isInteger(s) && s >= 1 && s <= 50)
    : queue.map((_, i) => i + 1);

  if (targetSequences.length === 0) {
    throw new Error('Nenhuma posição válida selecionada para geração.');
  }

  const abortController = new AbortController();
  currentJob = {
    active: true,
    campaignNumber: cleanNumber,
    total: targetSequences.length,
    current: 0,
    currentSequence: null,
    completedSequences: [],
    failedSequences: [],
    skippedSequences: [],
    status: 'running',
    log: `Iniciando geração DALL-E 3 para ${targetSequences.length} posições...`,
    error: null,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    abortController
  };

  // Executa em segundo plano de forma assíncrona
  runDalleLoop(cleanNumber, queue, targetSequences, quality, abortController.signal).catch(err => {
    console.error(`[DALL-E 3 API] Falha na execução da minissérie ${cleanNumber}:`, err);
    currentJob.active = false;
    currentJob.status = 'error';
    currentJob.error = err.message;
    currentJob.log = `Erro: ${err.message}`;
    currentJob.updatedAt = new Date().toISOString();
  });

  return getDalleAutomationStatus(cleanNumber);
}

async function runDalleLoop(cleanNumber, fullQueue, targetSequences, quality, signal) {
  const targetDir = path.join(FILES_ROOT, 'minisseries', cleanNumber, `M${cleanNumber}`);
  const stagingDir = path.join(targetDir, '.staging');
  fs.mkdirSync(stagingDir, { recursive: true });

  for (let i = 0; i < targetSequences.length; i++) {
    if (signal.aborted) {
      currentJob.status = 'cancelled';
      currentJob.log = 'Geração cancelada pelo operador.';
      break;
    }

    const seq = targetSequences[i];
    const seqKey = String(seq).padStart(3, '0');
    currentJob.current = i + 1;
    currentJob.currentSequence = seq;
    currentJob.updatedAt = new Date().toISOString();

    // 1. Verifica se já existe arquivo físico concluído
    const existingFile = fs.readdirSync(targetDir).find(f => {
      const name = path.parse(f).name.toLowerCase();
      const ext = path.parse(f).ext.toLowerCase();
      return (name === `img_${seqKey}` || name === `img_${seq}`) && ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });

    if (existingFile) {
      currentJob.skippedSequences.push(seq);
      currentJob.log = `Posição #${seq} (img_${seqKey}) já existe em disco. Pulando.`;
      continue;
    }

    const queueItem = fullQueue[seq - 1];
    const prompt = queueItem?.fullPrompt || queueItem?.prompt || '';
    if (!prompt) {
      currentJob.failedSequences.push({ sequence: seq, error: 'Prompt não encontrado.' });
      currentJob.log = `Prompt ausente para a posição #${seq}. Pulando.`;
      continue;
    }

    currentJob.log = `[${i + 1}/${targetSequences.length}] Gerando img_${seqKey} no DALL-E 3 (16:9)...`;

    try {
      const result = await callDalle3Api({ prompt, size: '1792x1024', quality, signal });
      const imgBuffer = Buffer.from(result.b64_json, 'base64');
      const hash = crypto.createHash('sha256').update(imgBuffer).digest('hex');

      // Comita através do manifesto oficial
      const saved = robotManifest.commitBuffer({
        numStr: cleanNumber,
        mode: 'minisseries',
        sequence: seq,
        buffer: imgBuffer,
        extension: '.png'
      });

      robotManifest.markCompleted({
        numStr: cleanNumber,
        mode: 'minisseries',
        provider: 'dalle',
        runId: `dalle-api-${cleanNumber}-${Date.now()}`,
        sequence: seq,
        targetPath: saved.targetPath,
        hash: saved.hash,
        conversationUrl: 'https://api.openai.com/v1/images/generations'
      });

      currentJob.completedSequences.push(seq);
      currentJob.log = `[${i + 1}/${targetSequences.length}] img_${seqKey}.png concluída e salva com sucesso!`;
    } catch (err) {
      if (signal.aborted) break;
      console.error(`[DALL-E 3 API] Erro ao gerar sequência #${seq}:`, err.message);
      currentJob.failedSequences.push({ sequence: seq, error: err.message });
      currentJob.log = `Falha na posição #${seq}: ${err.message}`;
    }
  }

  if (!signal.aborted && currentJob.status !== 'error') {
    if (currentJob.completedSequences.length === 0 && currentJob.failedSequences.length > 0) {
      currentJob.status = 'error';
      const firstErr = currentJob.failedSequences[0]?.error || 'Erro desconhecido';
      currentJob.error = firstErr;
      currentJob.log = `DALL-E 3 falhou: ${firstErr}`;
    } else {
      currentJob.status = 'completed';
      currentJob.log = `Processamento DALL-E 3 finalizado. Concluídas: ${currentJob.completedSequences.length}, Puladas: ${currentJob.skippedSequences.length}, Falhas: ${currentJob.failedSequences.length}.`;
    }
  }

  currentJob.active = false;
  currentJob.updatedAt = new Date().toISOString();
}

function getDalleAutomationStatus(campaignNumber) {
  const percent = currentJob.total > 0 ? Math.round((currentJob.current / currentJob.total) * 100) : 0;
  return {
    active: currentJob.active,
    campaignNumber: currentJob.campaignNumber || campaignNumber || null,
    total: currentJob.total,
    current: currentJob.current,
    currentSequence: currentJob.currentSequence,
    percent,
    completedSequences: currentJob.completedSequences,
    failedSequences: currentJob.failedSequences,
    skippedSequences: currentJob.skippedSequences,
    status: currentJob.status,
    log: currentJob.log,
    error: currentJob.error,
    startedAt: currentJob.startedAt,
    updatedAt: currentJob.updatedAt
  };
}

function cancelDalleAutomationJob() {
  if (currentJob.active && currentJob.abortController) {
    currentJob.abortController.abort();
    currentJob.active = false;
    currentJob.status = 'cancelled';
    currentJob.log = 'Cancelamento solicitado pelo operador.';
    currentJob.updatedAt = new Date().toISOString();
  }
  return getDalleAutomationStatus();
}

module.exports = {
  callDalle3Api,
  startDalleAutomationJob,
  getDalleAutomationStatus,
  cancelDalleAutomationJob
};
