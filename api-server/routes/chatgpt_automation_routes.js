const {
  runChatGPTAutomation,
  runChatGPTDownloadOnly,
  normalizeAccountId,
  testCurrentChromeTab,
  selectPromptsBySequence,
  recoverChatGPTDownloadsCurrentTab
} = require('../chatgpt_web_automation');
const { runGeminiCurrentTabAutomation } = require('../gemini_current_tab_automation');
const browserExtensionBridge = require('../browser_extension_bridge');
const robotManifest = require('../robot_manifest');
const fs = require('fs');
const path = require('path');

function automationJobStatusPath(root, numStr, provider) {
  return path.join(root, 'minisseries', String(numStr), 'prompts', `robot_job_status_${provider}_${numStr}.json`);
}

function persistAutomationJob(root, numStr, job) {
  const filePath = automationJobStatusPath(root, numStr, job.provider || 'web');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = filePath + '.tmp';
  fs.writeFileSync(temporaryPath, JSON.stringify({ ...job, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  fs.renameSync(temporaryPath, filePath);
}

function bridgeDetachSuffix(platform) {
  const detach = browserExtensionBridge.status().lastUnexpectedDetach;
  if (!detach || detach.platform !== platform) return '';
  return ` Controle do Edge interrompido (${detach.reason}).`;
}

function readComplementaryScenes(ROOT, numStr) {
  const jsonPath = path.join(ROOT, 'minisseries', String(numStr), 'prompts', '40_prompts_complementares.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Arquivo dos 40 prompts complementares não encontrado para a minissérie ${numStr}. Gere os complementares primeiro.`);
  }
  const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const scenes = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.scenes) ? parsed.scenes : []);
  if (scenes.length < 40) throw new Error(`A minissérie ${numStr} possui apenas ${scenes.length} prompts complementares; a esteira precisa de 40.`);
  return scenes.slice(0, 40);
}

function normalizeGPTTitle(scene, prompt) {
  const rawTitle = String(scene && (scene.titleExact || scene.title || scene.headlineText || '')).trim();
  const embeddedMatch = String(prompt || '').match(/^\s*TITLE EXACT\s*:\s*["“](.*?)["”]\s*(?:\r?\n|$)/i);
  const title = rawTitle || (embeddedMatch ? embeddedMatch[1] : '');
  return title
    .replace(/^\s*TITLE EXACT\s*:\s*/i, '')
    .replace(/^["“]|["”]$/g, '')
    .trim();
}

function composeGPTMainPrompt(title, visualPrompt, sceneIndex) {
  const prompt = String(visualPrompt || '').trim();
  if (!prompt) throw new Error(`A cena GPT ${sceneIndex + 1} não possui prompt visual.`);
  return prompt.replace(/^\s*TITLE EXACT\s*:\s*["“].*?["”]\s*\r?\n\r?\n?/i, '').trim();
}

function normalizeGPTScene(scene, index) {
  const visualPrompt = String(scene && (scene.visualPrompt || scene.prompt || scene.gptPrompt || scene.description || scene.fullPrompt || '')).trim();
  const title = normalizeGPTTitle(scene, visualPrompt);
  const prompt = composeGPTMainPrompt(title, visualPrompt, index);
  return {
    sequence: 0,
    finalSequence: 0,
    source: 'gpt',
    type: 'gpt',
    sceneNum: String(index + 1).padStart(2, '0'),
    gptSceneRef: index + 1,
    block: index + 1,
    positionInBlock: 1,
    title,
    fullPrompt: prompt
  };
}

function validateGPTAnchorQueue(queue) {
  for (let block = 1; block <= 10; block++) {
    const finalPosition = ((block - 1) * 5) + 1;
    const item = queue[finalPosition - 1];
    if (!item || item.source !== 'gpt' || Number(item.gptSceneRef) !== block) {
      throw new Error(`A posição ${String(finalPosition).padStart(2, '0')} precisa ser a cena GPT principal do bloco ${block}.`);
    }
    if (!item.fullPrompt || !String(item.fullPrompt).trim()) {
      throw new Error(`A cena GPT principal do bloco ${block} está sem prompt visual.`);
    }
  }
}

function writeGPTSourcePrompts({ ROOT, numStr, gptScenes }) {
  const anchors = Array.isArray(gptScenes) ? gptScenes.slice(0, 10) : [];
  if (anchors.length < 10) throw new Error(`A minissérie ${numStr} precisa das 10 cenas GPT antes de salvar a fonte da esteira.`);

  const prompts = anchors.map((scene, index) => normalizeGPTScene(scene, index));
  const promptsDir = path.join(ROOT, 'minisseries', String(numStr), 'prompts');
  fs.mkdirSync(promptsDir, { recursive: true });
  const jsonPath = path.join(promptsDir, `10_prompts_gpt_${numStr}.json`);
  const txtPath = path.join(promptsDir, `10_prompts_gpt_${numStr}.txt`);
  const text = prompts.map(item => {
    let header = `GPT CENA #${String(item.gptSceneRef).padStart(2, '0')} [BLOCO ${item.block}] [POSIÇÃO 1]`;
    if (item.title) header += `\nTítulo: ${item.title}`;
    return `${header}\nPrompt: ${item.fullPrompt}`;
  }).join('\n\n----------------------------------------\n\n');

  fs.writeFileSync(jsonPath, JSON.stringify(prompts, null, 2), 'utf8');
  fs.writeFileSync(txtPath, text, 'utf8');
  return { prompts, jsonPath, txtPath, text };
}

function sanitizePromptText(promptText) {
  return String(promptText || '')
    .replace(/^\s*TITLE EXACT\s*:\s*["“].*?["”]\s*\r?\n\r?\n?/i, '')
    .replace(/^\s*TITLE EXACT\s*:[^\n]*\r?\n\r?\n?/i, '')
    .trim();
}

function readGPTSourcePrompts(ROOT, numStr) {
  const jsonPath = path.join(ROOT, 'minisseries', String(numStr), 'prompts', `10_prompts_gpt_${numStr}.json`);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Arquivo dos 10 prompts GPT não encontrado para a minissérie ${numStr}. Gere a base GPT primeiro.`);
  }
  const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const prompts = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.prompts) ? parsed.prompts : []);
  if (prompts.length < 10) throw new Error(`A fonte GPT da minissérie ${numStr} possui apenas ${prompts.length} prompts; são necessários 10.`);
  return prompts.slice(0, 10).map((scene, index) => normalizeGPTScene(scene, index));
}

function readFinalChatGPTQueue(ROOT, numStr) {
  const jsonPath = path.join(ROOT, 'minisseries', String(numStr), 'prompts', `50_prompts_esteira_chatgpt_${numStr}.json`);
  const txtPath = path.join(ROOT, 'minisseries', String(numStr), 'prompts', `50_prompts_esteira_chatgpt_${numStr}.txt`);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`A fila final de 50 prompts da minissérie ${numStr} ainda não foi criada. Gere os 40 complementares primeiro.`);
  }
  const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const rawQueue = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.queue) ? parsed.queue : []);
  if (rawQueue.length !== 50) throw new Error(`A fila final da minissérie ${numStr} possui ${rawQueue.length} itens; são necessários 50.`);
  const queue = rawQueue.map((item, index) => {
    const cleaned = { ...item };
    if (cleaned.source === 'gpt') {
      const absoluteSequence = Number(cleaned.sequence || cleaned.finalSequence || index + 1);
      return {
        ...normalizeGPTScene(cleaned, Math.floor(index / 5)),
        sequence: absoluteSequence,
        finalSequence: absoluteSequence,
        sceneNum: String(absoluteSequence).padStart(3, '0')
      };
    }
    if (cleaned.fullPrompt) cleaned.fullPrompt = sanitizePromptText(cleaned.fullPrompt);
    if (cleaned.prompt) cleaned.prompt = sanitizePromptText(cleaned.prompt);
    return cleaned;
  });
  return {
    queue,
    jsonPath,
    txtPath,
    text: queue.map(item => `IMAGEM #${String(item.sequence || item.finalSequence).padStart(2, '0')}\nPrompt: ${item.fullPrompt || item.prompt}`).join('\n\n----------------------------------------\n\n')
  };
}

function readFlowChatGPTQueue(ROOT, numStr) {
  const geminiJson7 = path.join(ROOT, 'minisseries', String(numStr), 'prompts', `7_prompts_gemini_motions_${numStr}.json`);
  const geminiJson10 = path.join(ROOT, 'minisseries', String(numStr), 'prompts', `10_prompts_gemini_motions_${numStr}.json`);
  const geminiJson5 = path.join(ROOT, 'minisseries', String(numStr), 'prompts', `5_prompts_gemini_motions_${numStr}.json`);
  const geminiJson = fs.existsSync(geminiJson7) ? geminiJson7 : (fs.existsSync(geminiJson10) ? geminiJson10 : geminiJson5);
  const flowJson = path.join(ROOT, 'minisseries', String(numStr), 'flow', `flow_master_prompts_${numStr}.json`);
  let scenes = [];
  if (fs.existsSync(geminiJson)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(geminiJson, 'utf8'));
      scenes = Array.isArray(parsed.motionScenes) ? parsed.motionScenes : (Array.isArray(parsed) ? parsed : []);
    } catch (_) {}
  }
  if (!scenes.length && fs.existsSync(flowJson)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(flowJson, 'utf8'));
      scenes = Array.isArray(parsed.scenes) ? parsed.scenes : (Array.isArray(parsed) ? parsed : []);
    } catch (_) {}
  }
  const queue = scenes.slice(0, 7).map((item, index) => {
    const sequence = index + 1;
    const promptText = sanitizePromptText(item.motionPrompt || item.prompt || item.visualPrompt || item.referenceFrame || '');
    return {
      sequence,
      finalSequence: sequence,
      sceneNum: String(sequence).padStart(2, '0'),
      type: 'chatgpt-flow',
      fullPrompt: promptText,
      prompt: promptText
    };
  });
  return { queue };
}

function buildChatGPTQueue({ ROOT, numStr, gptScenes }) {
  const diskPath = path.join(ROOT, 'minisseries', String(numStr), 'prompts', `10_prompts_gpt_${numStr}.json`);
  const anchors = fs.existsSync(diskPath)
    ? readGPTSourcePrompts(ROOT, numStr)
    : (Array.isArray(gptScenes) && gptScenes.length >= 10 ? gptScenes.slice(0, 10) : readGPTSourcePrompts(ROOT, numStr));
  if (anchors.length < 10) throw new Error(`A minissérie ${numStr} precisa das 10 cenas GPT antes de montar a esteira.`);
  const complementary = readComplementaryScenes(ROOT, numStr);
  const queue = [];

  for (let block = 1; block <= 10; block++) {
    const main = normalizeGPTScene(anchors[block - 1], block - 1);
    main.sequence = queue.length + 1;
    main.finalSequence = main.sequence;
    queue.push(main);

    const blockScenes = complementary
      .filter(scene => Number(scene.gptSceneRef || scene.block) === block)
      .sort((a, b) => Number(a.positionInBlock || 0) - Number(b.positionInBlock || 0));
    if (blockScenes.length < 4) throw new Error(`O bloco ${block} possui ${blockScenes.length} complementares; são necessários 4.`);

    blockScenes.slice(0, 4).forEach((scene, complementIndex) => {
      const finalSequence = queue.length + 1;
      const prompt = String(scene.prompt || '').trim();
      if (!prompt) throw new Error(`O complementar ${scene.index || `${block}-${complementIndex + 1}`} está sem prompt.`);
      queue.push({
        sequence: finalSequence,
        finalSequence,
        source: 'complementary',
        type: 'gpt-complementary',
        sceneNum: String(finalSequence).padStart(3, '0'),
        sourceIndex: Number(scene.index || 0),
        gptSceneRef: block,
        block,
        positionInBlock: Number(scene.positionInBlock || complementIndex + 2),
        title: main.title,
        fullPrompt: prompt
      });
    });
  }

  if (queue.length !== 50) throw new Error(`A esteira montada possui ${queue.length} itens; o esperado é 50.`);
  queue.forEach((item, index) => {
    item.sequence = index + 1;
    item.finalSequence = index + 1;
    item.sceneNum = String(index + 1).padStart(3, '0');
  });
  validateGPTAnchorQueue(queue);

  const promptsDir = path.join(ROOT, 'minisseries', String(numStr), 'prompts');
  fs.mkdirSync(promptsDir, { recursive: true });
  const jsonPath = path.join(promptsDir, `50_prompts_esteira_chatgpt_${numStr}.json`);
  const txtPath = path.join(promptsDir, `50_prompts_esteira_chatgpt_${numStr}.txt`);
  const text = queue.map(item => {
    const origin = item.source === 'gpt' ? `GPT CENA ${item.gptSceneRef}` : `COMPLEMENTAR ${item.sourceIndex} / GPT CENA ${item.gptSceneRef}`;
    let header = `IMAGEM FINAL #${item.sceneNum} [${origin}] [BLOCO ${item.block}] [POSIÇÃO ${item.positionInBlock}]`;
    if (item.title && item.source === 'gpt') header += `\nTítulo: ${item.title}`;
    return `${header}\nPrompt: ${item.fullPrompt}`;
  }).join('\n\n----------------------------------------\n\n');
  fs.writeFileSync(jsonPath, JSON.stringify(queue, null, 2), 'utf8');
  fs.writeFileSync(txtPath, text, 'utf8');
  return { queue, text, jsonPath, txtPath };
}

module.exports = function createChatGPTAutomationRouter(ctx) {
  const { activeChatGPTWebJobs, activeGeminiWebJobs, send, sendApiError, readBody, ROOT, sanitizeNumericId } = ctx;
  return async function handleChatGPTRoute(req, res) {
    if (req.url.startsWith('/api/robot-manifest/status') && req.method === 'GET') {
      try {
        const url = new URL(req.url, 'http://127.0.0.1');
        const numStr = sanitizeNumericId(url.searchParams.get('number') || '01');
        const mode = url.searchParams.get('mode') === 'flow' ? 'flow' : 'minisseries';
        const total = mode === 'flow' ? 7 : 50;
        const manifest = robotManifest.reconcileManifest({ numStr, mode, total, rootDir: ROOT });
        const scenes = Object.values(manifest.scenes || {});
        send(res, 200, {
          ok: true,
          number: numStr,
          mode,
          summary: {
            completed: scenes.filter(scene => scene.status === 'completed').length,
            generated: scenes.filter(scene => scene.status === 'generated').length,
            pending: scenes.filter(scene => scene.status === 'pending').length,
            conflicts: scenes.filter(scene => scene.status === 'conflict').length,
            activeClaims: Object.keys(manifest.claims || {}).length
          },
          manifest
        });
      } catch (error) {
        sendApiError(res, error);
      }
      return true;
    }

    if (req.url === '/api/automate-gemini-vortex/start' && req.method === 'POST') {
      try {
        const payload = await readBody(req);
        const numStr = sanitizeNumericId(payload.number || payload.campaignId || '01');
        if (payload.recoveryMode) {
          throw new Error('As funções PROMPTS e FOTOS foram retiradas. Marque as posições desejadas e inicie o ROBÔ.');
        }
        let prompts = readFinalChatGPTQueue(ROOT, numStr).queue;
        const selectedSequences = Array.isArray(payload.selectedSequences) ? payload.selectedSequences : [];
        if (selectedSequences.length) {
          prompts = selectPromptsBySequence(prompts, selectedSequences);
        }

        if (!prompts.length) throw new Error('Nenhuma cena válida foi enviada ao robô Gemini.');

        const jobId = `gemini-vortex-${numStr}-${Date.now()}`;
        const requestedSequences = prompts.map((item, index) => Number(item.sequence || item.finalSequence || index + 1));
        activeChatGPTWebJobs[jobId] = {
          jobId,
          provider: 'gemini',
          mode: 'minisseries',
          selectedSequences: requestedSequences,
          status: 'running',
          progress: 1,
          resume: false,
          resumeFrom: null,
          recoveredSequences: [],
          message: `Gemini: abrindo um novo chat para ${prompts.length} posição(ões) absoluta(s)...`
        };
        persistAutomationJob(ROOT, numStr, activeChatGPTWebJobs[jobId]);
        send(res, 200, {
          ok: true,
          jobId,
          provider: 'gemini',
          total: prompts.length,
          resume: false,
          resumeFrom: null,
          recovered: 0
        });

        (async () => {
          try {
            const result = await runGeminiCurrentTabAutomation({
              runId: jobId,
              numStr,
              prompts,
              conversationUrl: '',
              recoverSameChat: false,
              expectedRecoveredSequences: [],
              shouldCancel: () => Boolean(activeChatGPTWebJobs[jobId]?.cancelRequested),
              onProgress: (progress, message) => {
                if (activeChatGPTWebJobs[jobId]) {
                  activeChatGPTWebJobs[jobId].progress = progress;
                  activeChatGPTWebJobs[jobId].message = message;
                  persistAutomationJob(ROOT, numStr, activeChatGPTWebJobs[jobId]);
                }
              }
            });
            if (activeChatGPTWebJobs[jobId]) {
              const existingSet = new Set((result.existing || []).map(Number));
              const requestedMissing = requestedSequences.filter(sequence => !existingSet.has(Number(sequence)));
              const partialSelection = selectedSequences.length > 0;
              activeChatGPTWebJobs[jobId].status = requestedMissing.length ? 'failed' : 'completed';
              activeChatGPTWebJobs[jobId].progress = 100;
              activeChatGPTWebJobs[jobId].result = result;
              activeChatGPTWebJobs[jobId].message = requestedMissing.length
                ? `Rodada Gemini parcial incompleta: faltam as cenas selecionadas ${requestedMissing.join(', ')}.`
                : partialSelection
                  ? `Rodada Gemini parcial concluída: ${selectedSequences.length}/${selectedSequences.length} cenas selecionadas presentes.`
                  : (mode === 'flow' ? `Resgate concluído: as ${total} imagens estão presentes.` : `Minissérie concluída: as ${total} imagens estão presentes.`);
              if (requestedMissing.length) activeChatGPTWebJobs[jobId].error = activeChatGPTWebJobs[jobId].message;
              persistAutomationJob(ROOT, numStr, activeChatGPTWebJobs[jobId]);
            }
          } catch (error) {
            if (activeChatGPTWebJobs[jobId]) {
              const cancelled = error.message === '__GEMINI_CANCELLED__' || activeChatGPTWebJobs[jobId].cancelRequested;
              activeChatGPTWebJobs[jobId].status = cancelled ? 'cancelled' : 'failed';
              activeChatGPTWebJobs[jobId].error = cancelled
                ? 'Robô Gemini parado pelo usuário.'
                : `${error.message || 'Falha no robô Gemini.'}${bridgeDetachSuffix('gemini')}`;
              activeChatGPTWebJobs[jobId].message = activeChatGPTWebJobs[jobId].error;
              persistAutomationJob(ROOT, numStr, activeChatGPTWebJobs[jobId]);
            }
          }
        })();
      } catch (error) {
        sendApiError(res, error);
      }
      return true;
    }

    if (req.url === '/api/automate-chatgpt/browser-bridge' && req.method === 'GET') {
      send(res, 200, { ok: true, ...browserExtensionBridge.status() });
      return true;
    }

    if (req.url.startsWith('/api/automate-chatgpt/browser-bridge/platform') && req.method === 'GET') {
      try {
        const url = new URL(req.url, 'http://localhost');
        const param = url.searchParams.get('platform');
        const platform = param === 'gemini' ? 'gemini' : 'chatgpt';
        const tab = await browserExtensionBridge.ensurePlatformTab(platform, { activate: false });
        send(res, 200, { ok: true, platform, tab });
      } catch (error) {
        sendApiError(res, error);
      }
      return true;
    }

    if (req.url === '/api/automate-chatgpt/browser-bridge/test' && req.method === 'POST') {
      try {
        const result = await testCurrentChromeTab();
        send(res, 200, { ok: true, connected: true, result });
      } catch (error) {
        sendApiError(res, error);
      }
      return true;
    }

    if (req.url === '/api/automate-chatgpt/queue' && req.method === 'POST') {
      try {
        const payload = await readBody(req);
        const numStr = sanitizeNumericId(payload.number || payload.campaignId || '01');
        const diskPath = path.join(ROOT, 'minisseries', String(numStr), 'prompts', `10_prompts_gpt_${numStr}.json`);
        if (!fs.existsSync(diskPath) && Array.isArray(payload.gptScenes) && payload.gptScenes.length >= 10) {
          writeGPTSourcePrompts({ ROOT, numStr, gptScenes: payload.gptScenes });
        }
        const built = buildChatGPTQueue({ ROOT, numStr });
        send(res, 200, { ok: true, number: numStr, total: built.queue.length, queue: built.queue, text: built.text, files: { json: built.jsonPath, txt: built.txtPath } });
      } catch (error) {
        sendApiError(res, error);
      }
      return true;
    }

    if (req.url === '/api/automate-chatgpt/start' && req.method === 'POST') {
      try {
        const payload = await readBody(req);
        const numStr = sanitizeNumericId(payload.number || payload.campaignId || '01');
        if (payload.resumeMissing === true || payload.missingPhotosNewChat === true || payload.continueExistingChat === true) {
          throw new Error('As funções PROMPTS e FOTOS foram retiradas. Marque as posições desejadas e inicie o ROBÔ.');
        }
        let prompts = Array.isArray(payload.prompts) ? payload.prompts : [];
        let expectedConversationTitle = '';
        const explicitlySelectedSequences = Array.isArray(payload.selectedSequences) ? payload.selectedSequences : [];
        if (payload.fullQueue === true) {
          // O robô recebe somente a fila final oficial já montada pela Central.
          const finalQueue = readFinalChatGPTQueue(ROOT, numStr).queue;
          prompts = finalQueue;
          expectedConversationTitle = String(finalQueue[0]?.title || '');
          if (explicitlySelectedSequences.length) {
            prompts = selectPromptsBySequence(prompts, explicitlySelectedSequences);
          }
        }
        if (!prompts.length) throw new Error('Nenhuma cena válida foi enviada ao robô ChatGPT.');
        const accountId = normalizeAccountId(payload.accountId);
        // O dashboard trabalha com 5 imagens do Flow; a esteira trabalha com 50 imagens.
        // Uma fila completa sempre pertence à esteira, mesmo que o cliente não envie o modo.
        const mode = payload.fullQueue === true || payload.mode !== 'flow' ? 'minisseries' : 'flow';
        const jobId = `chatgpt-job-${numStr}-${Date.now()}`;
        const selectedSequences = prompts.map((item, index) => Number(item.sequence || item.finalSequence || index + 1));
        activeChatGPTWebJobs[jobId] = {
          jobId,
          provider: 'chatgpt',
          accountId,
          mode,
          selectedSequences,
          status: 'running',
          progress: 1,
          resume: false,
          resumeFrom: null,
          recoveredSequences: [],
          message: `GPT: abrindo um novo chat para ${prompts.length} posição(ões) absoluta(s)...`
        };
        persistAutomationJob(ROOT, numStr, activeChatGPTWebJobs[jobId]);
        send(res, 200, {
          ok: true,
          jobId,
          accountId,
          total: prompts.length,
          resume: false,
          resumeFrom: null,
          recovered: 0
        });
        (async () => {
          try {
            const result = await runChatGPTAutomation({
              runId: jobId,
              accountId,
              numStr,
              prompts,
              mode,
              conversationUrl: '',
              reuseCurrentChat: false,
              recoverMissing: false,
              expectedRecoveredSequences: [],
              expectedConversationTitle,
              shouldCancel: () => Boolean(activeChatGPTWebJobs[jobId]?.cancelRequested),
              onProgress: (progress, message) => {
                if (activeChatGPTWebJobs[jobId]) {
                  activeChatGPTWebJobs[jobId].progress = progress;
                  activeChatGPTWebJobs[jobId].message = message;
                  persistAutomationJob(ROOT, numStr, activeChatGPTWebJobs[jobId]);
                }
              }
            });
            if (activeChatGPTWebJobs[jobId]) {
              const existingSet = new Set((result.existing || []).map(Number));
              const requestedMissing = explicitlySelectedSequences.length
                ? explicitlySelectedSequences.filter(sequence => !existingSet.has(Number(sequence)))
                : result.missing;
              const partialSelection = explicitlySelectedSequences.length > 0;
              activeChatGPTWebJobs[jobId].status = requestedMissing.length ? 'failed' : 'completed';
              activeChatGPTWebJobs[jobId].progress = 100;
              activeChatGPTWebJobs[jobId].result = result;
              activeChatGPTWebJobs[jobId].message = requestedMissing.length
                ? partialSelection
                  ? `Rodada GPT parcial incompleta: faltam as cenas selecionadas ${requestedMissing.join(', ')}.`
                  : `Rodada incompleta: ${result.existing.length}/${total} imagens presentes; faltam ${result.missing.length}.`
                : partialSelection
                  ? `Rodada GPT parcial concluída: ${explicitlySelectedSequences.length}/${explicitlySelectedSequences.length} cenas selecionadas presentes.`
                  : (mode === 'flow' ? `Rodada concluída: as ${total} imagens estão presentes.` : `Minissérie concluída: as ${total} imagens estão presentes.`);
              if (requestedMissing.length) activeChatGPTWebJobs[jobId].error = activeChatGPTWebJobs[jobId].message;
              persistAutomationJob(ROOT, numStr, activeChatGPTWebJobs[jobId]);
            }
          } catch (error) {
            if (activeChatGPTWebJobs[jobId]) {
              const cancelled = error.message === '__CHATGPT_CANCELLED__' || activeChatGPTWebJobs[jobId].cancelRequested;
              activeChatGPTWebJobs[jobId].status = cancelled ? 'cancelled' : 'failed';
              activeChatGPTWebJobs[jobId].error = cancelled
                ? 'Robô ChatGPT parado pelo usuário.'
                : `${error.message || 'Falha no robô ChatGPT.'}${bridgeDetachSuffix('chatgpt')}`;
              if (error.result) activeChatGPTWebJobs[jobId].result = error.result;
              activeChatGPTWebJobs[jobId].message = activeChatGPTWebJobs[jobId].error;
              persistAutomationJob(ROOT, numStr, activeChatGPTWebJobs[jobId]);
            }
          }
        })();
      } catch (error) {
        sendApiError(res, error);
      }
      return true;
    }

    if (req.url === '/api/automate-chatgpt/download-existing' && req.method === 'POST') {
      try {
        const payload = await readBody(req);
        const numStr = sanitizeNumericId(payload.number || payload.campaignId || '01');
        const accountId = normalizeAccountId(payload.accountId);
        const mode = payload.mode === 'flow' ? 'flow' : 'minisseries';
        const total = Math.min(50, Math.max(1, Number.parseInt(payload.total, 10) || (mode === 'flow' ? 7 : 50)));

        const jobId = `chatgpt-download-${numStr}-${Date.now()}`;
        activeChatGPTWebJobs[jobId] = {
          jobId,
          accountId,
          mode,
          status: 'running',
          progress: 1,
          message: `Abrindo o chat para baixar as imagens 01-${String(total).padStart(2, '0')}...`
        };
        send(res, 200, { ok: true, jobId, accountId, total });

        (async () => {
          try {
            const result = await recoverChatGPTDownloadsCurrentTab({
              numStr,
              runId: jobId,
              mode,
              sequences: 'auto',
              shouldCancel: () => Boolean(activeChatGPTWebJobs[jobId]?.cancelRequested),
              onProgress: (progress, message) => {
                if (activeChatGPTWebJobs[jobId]) {
                  activeChatGPTWebJobs[jobId].progress = progress;
                  activeChatGPTWebJobs[jobId].message = message;
                }
              }
            });
            if (activeChatGPTWebJobs[jobId]) {
              activeChatGPTWebJobs[jobId].status = 'completed';
              activeChatGPTWebJobs[jobId].progress = 100;
              activeChatGPTWebJobs[jobId].result = result;
              activeChatGPTWebJobs[jobId].message = `Downloads GPT 01-${String(total).padStart(2, '0')} concluidos em ordem.`;
            }
          } catch (error) {
            if (activeChatGPTWebJobs[jobId]) {
              const cancelled = error.message === '__CHATGPT_CANCELLED__' || activeChatGPTWebJobs[jobId].cancelRequested;
              activeChatGPTWebJobs[jobId].status = cancelled ? 'cancelled' : 'failed';
              activeChatGPTWebJobs[jobId].error = cancelled
                ? 'Robo ChatGPT parado pelo usuario.'
                : (error.message || 'Falha na passagem exclusiva de download.');
              activeChatGPTWebJobs[jobId].message = activeChatGPTWebJobs[jobId].error;
            }
          }
        })();
      } catch (error) {
        sendApiError(res, error);
      }
      return true;
    }

    if (req.url === '/api/automate-chatgpt/rescue' && req.method === 'POST') {
      try {
        const payload = await readBody(req);
        const numStr = sanitizeNumericId(payload.number || payload.campaignId || '01');
        const jobId = `chatgpt-rescue-${numStr}-${Date.now()}`;
        const mode = payload.mode === 'flow' ? 'flow' : (payload.mode || 'minisseries');
        const scenes = payload.scenes || [];
        const defaultPrompts = {
          prompts: readFinalChatGPTQueue(ROOT, numStr).queue
        };
        const finalQueue = isFlow ? [] : defaultPrompts.prompts;
        const gptOnlyQueue = finalQueue.filter(item => item.source === 'gpt' || item.type === 'gpt');
        const effectiveDefault = gptOnlyQueue.length ? gptOnlyQueue : finalQueue;
        const targetPrompts = isFlow
          ? (Array.isArray(payload.prompts) && payload.prompts.length ? payload.prompts : readFlowChatGPTQueue(ROOT, numStr).queue)
          : effectiveDefault;
        const targetSequences = scenes === 'auto' || !Array.isArray(scenes) || !scenes.length
          ? (isFlow ? 'auto' : targetPrompts.map(item => Number(item.sequence || item.finalSequence)))
          : scenes;

        activeChatGPTWebJobs[jobId] = {
          jobId,
          docNum: numStr,
          engine: 'chatgpt-1',
          mode,
          status: 'running',
          progress: 5,
          message: `Iniciando Resgate GPT no Chrome (${mode === 'flow' ? 'Flow 7 Cenas' : 'Minissérie ' + numStr})...`
        };

        send(res, 200, { jobId, status: 'running' });

        (async () => {
          try {
            const result = await recoverChatGPTDownloadsCurrentTab({
              numStr,
              runId: jobId,
              mode,
              sequences: targetSequences,
              prompts: targetPrompts,
              shouldCancel: () => Boolean(activeChatGPTWebJobs[jobId]?.cancelRequested),
              onProgress: (percent, msg) => {
                if (activeChatGPTWebJobs[jobId]) {
                  activeChatGPTWebJobs[jobId].progress = percent;
                  activeChatGPTWebJobs[jobId].message = msg;
                }
              }
            });

            if (activeChatGPTWebJobs[jobId]) {
              const targetFolder = mode === 'flow' ? 'flow' : `M${numStr}`;
              activeChatGPTWebJobs[jobId].status = 'completed';
              activeChatGPTWebJobs[jobId].progress = 100;
              activeChatGPTWebJobs[jobId].result = result;
              activeChatGPTWebJobs[jobId].message = `Resgate concluído! Imagem(ns) salva(s) em minisseries/${numStr}/${targetFolder}/.`;
            }
          } catch(err) {
            if (activeChatGPTWebJobs[jobId]) {
              activeChatGPTWebJobs[jobId].status = 'failed';
              activeChatGPTWebJobs[jobId].error = err.message || 'Falha no resgate';
              activeChatGPTWebJobs[jobId].message = activeChatGPTWebJobs[jobId].error;
            }
          }
        })();
      } catch(err) {
        sendApiError(res, err);
      }
      return true;
    }

    if (req.url.startsWith('/api/automate-chatgpt/cancel') && req.method === 'POST') {
      try {
        const url = new URL(req.url, 'http://localhost');
        const jobId = url.searchParams.get('jobId');
        const provider = url.searchParams.get('provider');
        let job = (jobId && jobId !== 'active' && jobId !== 'null' && jobId !== 'undefined')
          ? activeChatGPTWebJobs[jobId]
          : null;
        if (!job && provider) {
          job = Object.values(activeChatGPTWebJobs).find(j => j && j.status === 'running' && (j.provider === provider || (provider === 'chatgpt' ? !j.provider : false)));
        }
        if (job) {
          job.cancelRequested = true;
          job.status = 'cancelled';
          const pLabel = job.provider === 'gemini' ? 'Gemini' : 'ChatGPT';
          job.message = `Robô ${pLabel} parado pelo usuário.`;
          job.error = job.message;
        }
        send(res, 200, { ok: true, jobId, message: 'Solicitação de parada enviada ao robô.' });
      } catch (error) {
        sendApiError(res, error);
      }
      return true;
    }

    if (req.url.startsWith('/api/automate-chatgpt/status') && req.method === 'GET') {
      try {
        const url = new URL(req.url, 'http://localhost');
        const jobId = url.searchParams.get('jobId');
        const provider = url.searchParams.get('provider');
        let job = (jobId && jobId !== 'active' && jobId !== 'null' && jobId !== 'undefined')
          ? (activeChatGPTWebJobs[jobId] || (activeGeminiWebJobs && activeGeminiWebJobs[jobId]))
          : null;
        if (!job && provider === 'gemini') {
          job = (activeGeminiWebJobs && Object.values(activeGeminiWebJobs).find(j => j && j.status === 'running'))
            || Object.values(activeChatGPTWebJobs).find(j => j && j.status === 'running' && j.provider === 'gemini');
        }
        if (!job && provider === 'chatgpt') {
          job = Object.values(activeChatGPTWebJobs).find(j => j && j.status === 'running' && (j.provider === 'chatgpt' || !j.provider));
        }
        if (!job && !jobId && !provider) {
          job = Object.values(activeChatGPTWebJobs).find(j => j && j.status === 'running')
            || (activeGeminiWebJobs && Object.values(activeGeminiWebJobs).find(j => j && j.status === 'running'));
        }
        send(res, 200, job || { status: 'idle', progress: 0, message: 'Nenhum trabalho ativo.' });
      } catch (error) {
        sendApiError(res, error);
      }
      return true;
    }

    return false;
  };
};

// Expostos para que a geração Mistral grave a fonte GPT e feche a fila final
// no mesmo ciclo, antes de o robô receber qualquer prompt.
module.exports.writeGPTSourcePrompts = writeGPTSourcePrompts;
module.exports.readGPTSourcePrompts = readGPTSourcePrompts;
module.exports.buildChatGPTQueue = buildChatGPTQueue;
module.exports.readFinalChatGPTQueue = readFinalChatGPTQueue;
module.exports.composeGPTMainPrompt = composeGPTMainPrompt;
module.exports.normalizeGPTScene = normalizeGPTScene;
module.exports.validateGPTAnchorQueue = validateGPTAnchorQueue;
