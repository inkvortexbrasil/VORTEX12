const path = require('path');
const { sanitizeNumericId, safeJoin } = require('../utils/security');
const fs = require('fs');
const {
  runGeminiCurrentTabAutomation,
  runGeminiFlowCurrentTabAutomation,
  recoverGeminiFlowDownloadsCurrentTab
} = require('../gemini_current_tab_automation.js');

function readLastRobotSelection(root, numStr, provider, total) {
  const filePath = path.join(root, 'minisseries', String(numStr), 'prompts', `robot_job_status_${provider}_${numStr}.json`);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed.selectedSequences)
      ? parsed.selectedSequences.map(Number).filter(sequence => Number.isInteger(sequence) && sequence > 0 && sequence <= total)
      : [];
  } catch (_) {
    return [];
  }
}

module.exports = function createAutomationRouter(ctx) {
  const {
    activeGeminiWebJobs,
    send,
    sendApiError,
    readBody,
    ensureDirectory,
    ROOT,
    PORT,
    generateScenes50Prompt
  } = ctx;

  return async function handleAutomationRoute(req, res) {
    if (req.url.startsWith('/api/automate-gemini/cancel') && req.method === 'POST') {
      const qJob = (req.url.split('jobId=')[1] || '').split('&')[0];
      if (qJob && activeGeminiWebJobs[qJob]) {
        activeGeminiWebJobs[qJob].cancelRequested = true;
        activeGeminiWebJobs[qJob].message = 'Parada solicitada pelo usuário.';
      }
      send(res, 200, { ok: true });
      return true;
    }

    if (req.url === '/api/automate-gemini/start' && req.method === 'POST') {
      try {
        const payload = await readBody(req);
        const numStr = sanitizeNumericId(payload.number || payload.campaignId || '06');
        const jobId = `gemini-job-${numStr}-${Date.now()}`;

        const docFolder = safeJoin(ROOT, 'minisseries', numStr);
        ensureDirectory(path.join(docFolder, 'flow'));

        activeGeminiWebJobs[jobId] = {
          jobId,
          docNum: numStr,
          engine: 'current-tab',
          status: 'running',
          progress: 5,
          message: `Iniciando robô Google Chrome (Minissérie ${numStr})...`
        };

        send(res, 200, { jobId, status: 'running' });

        (async () => {
          try {
            const prompts = Array.isArray(payload.prompts) ? payload.prompts : [];
            const result = await runGeminiFlowCurrentTabAutomation({
              numStr,
              runId: jobId,
              prompts,
              shouldCancel: () => Boolean(activeGeminiWebJobs[jobId]?.cancelRequested),
              onProgress: (percent, msg) => {
                if (activeGeminiWebJobs[jobId]) {
                  activeGeminiWebJobs[jobId].progress = percent;
                  activeGeminiWebJobs[jobId].message = msg;
                }
              }
            });

            if (activeGeminiWebJobs[jobId]) {
              activeGeminiWebJobs[jobId].status = 'completed';
              activeGeminiWebJobs[jobId].progress = 100;
              activeGeminiWebJobs[jobId].result = result;
              activeGeminiWebJobs[jobId].message = `${result.savedFiles.length}/${prompts.length} imagem(ns) salva(s) em minisseries/${numStr}/flow/.`;
            }
          } catch(err) {
            if (activeGeminiWebJobs[jobId]) {
              const cancelled = err.message === '__GEMINI_CANCELLED__' || activeGeminiWebJobs[jobId].cancelRequested;
              activeGeminiWebJobs[jobId].status = cancelled ? 'cancelled' : 'failed';
              activeGeminiWebJobs[jobId].error = cancelled ? 'Cancelado' : (err.message || 'Falha na automação do Chrome');
              activeGeminiWebJobs[jobId].message = cancelled ? 'Robô Gemini cancelado pelo usuário.' : activeGeminiWebJobs[jobId].error;
              if (err.result) activeGeminiWebJobs[jobId].result = err.result;
            }
          }
        })();
      } catch(err) {
        sendApiError(res, err);
      }
      return true;
    }
    if (req.url === '/api/automate-gemini/rescue' && req.method === 'POST') {
      try {
        const payload = await readBody(req);
        const numStr = sanitizeNumericId(payload.number || payload.campaignId || '06');
        const jobId = `gemini-rescue-${numStr}-${Date.now()}`;
        const mode = payload.mode || 'minisseries';
        const total = mode === 'flow' ? 5 : 50;
        const lastSelection = readLastRobotSelection(ROOT, numStr, 'gemini', total);
        const scenes = Array.isArray(payload.scenes) && payload.scenes.length
          ? payload.scenes
          : (payload.scenes === 'auto' && lastSelection.length ? lastSelection : (payload.scenes || 'auto'));

        activeGeminiWebJobs[jobId] = {
          jobId,
          docNum: numStr,
          engine: 'current-tab',
          status: 'running',
          progress: 5,
          message: `Iniciando Resgate Gemini no Chrome (Minissérie ${numStr})...`
        };

        send(res, 200, { jobId, status: 'running' });

        (async () => {
          try {
            const result = await recoverGeminiFlowDownloadsCurrentTab({
              numStr,
              runId: jobId,
              mode,
              expectedCount: scenes === 'auto' ? null : (Array.isArray(scenes) ? scenes.length : null),
              sequences: scenes,
              shouldCancel: () => Boolean(activeGeminiWebJobs[jobId]?.cancelRequested),
              onProgress: (percent, msg) => {
                if (activeGeminiWebJobs[jobId]) {
                  activeGeminiWebJobs[jobId].progress = percent;
                  activeGeminiWebJobs[jobId].message = msg;
                }
              }
            });

            if (activeGeminiWebJobs[jobId]) {
              const targetFolder = mode === 'flow' ? 'flow' : `M${numStr}`;
              activeGeminiWebJobs[jobId].status = 'completed';
              activeGeminiWebJobs[jobId].progress = 100;
              activeGeminiWebJobs[jobId].result = result;
              activeGeminiWebJobs[jobId].message = `Resgate concluído! ${result.savedFiles.length} imagem(ns) salva(s) em minisseries/${numStr}/${targetFolder}/.`;
            }
          } catch(err) {
            if (activeGeminiWebJobs[jobId]) {
              activeGeminiWebJobs[jobId].status = 'failed';
              activeGeminiWebJobs[jobId].error = err.message || 'Falha no resgate';
              activeGeminiWebJobs[jobId].message = activeGeminiWebJobs[jobId].error;
            }
          }
        })();
      } catch(err) {
        sendApiError(res, err);
      }
      return true;
    }

    if (req.url === '/api/automate-gemini/start-doc' && req.method === 'POST') {
      try {
        const payload = await readBody(req);
        const numStr = sanitizeNumericId(payload.docNum || '01');
        const targetIndicesSet = new Set(
          Array.isArray(payload.indices)
            ? payload.indices.map(x => parseInt(x, 10)).filter(x => !isNaN(x))
            : []
        );
        if (targetIndicesSet.size > 200) {
          throw new Error('Número de índices solicitados excede o limite permitido (200).');
        }
        const jobId = `gemini-doc-${numStr}-${Date.now()}`;

        const docFolder = safeJoin(ROOT, 'minisseries', numStr);
        ensureDirectory(path.join(docFolder, 'M' + numStr));
        ensureDirectory(path.join(docFolder, 'legendas'));
        ensureDirectory(path.join(docFolder, 'cta'));
        ensureDirectory(path.join(docFolder, 'prompts'));
        ensureDirectory(path.join(docFolder, 'flow'));

        let jsonPromptsPath = path.join(docFolder, 'prompts', '50_prompts.json');
        let txtMinisseriePath = path.join(docFolder, 'prompts', `50_prompts_minisserie_${numStr}.txt`);
        let legacyTxtPath = path.join(docFolder, 'prompts', 'prompts_imagens.txt');

        if (!fs.existsSync(jsonPromptsPath) && !fs.existsSync(txtMinisseriePath) && !fs.existsSync(legacyTxtPath)) {
          await generateScenes50Prompt({ campaignNum: numStr, title: `Minissérie #${numStr}` });
        }

        const parsedPrompts = [];
        if (fs.existsSync(jsonPromptsPath)) {
          try {
            const jsonArr = JSON.parse(fs.readFileSync(jsonPromptsPath, 'utf-8'));
            if (Array.isArray(jsonArr)) {
              for (const item of jsonArr) {
                const idx = parseInt(item.index || item.number || item.sceneNum, 10);
                if (targetIndicesSet.size === 0 || targetIndicesSet.has(idx)) {
                  parsedPrompts.push({ type: 'doc', sceneNum: idx, fullPrompt: item.prompt || item.fullPrompt || '' });
                }
              }
            }
          } catch(errJson) {}
        }

        if (parsedPrompts.length === 0) {
          let rawText = '';
          if (fs.existsSync(txtMinisseriePath)) {
            rawText = fs.readFileSync(txtMinisseriePath, 'utf-8');
          } else if (fs.existsSync(legacyTxtPath)) {
            rawText = fs.readFileSync(legacyTxtPath, 'utf-8');
          } else {
            try { rawText = fs.readFileSync(path.join(docFolder, 'prompts_imagens.txt'), 'utf-8'); } catch(e) {}
          }

          if (rawText) {
            const blocks = rawText.split(/(?:----------------------------------------|\n\n+)/);
            for (const block of blocks) {
              const matchIdx = block.match(/(?:IMAGEM\s*#|\[IMG\s*)(\d+)/i);
              const matchPrompt = block.match(/Prompt:\s*(.*)/is) || block.match(/\[IMG\s*\d+\]\s*(.*)/is);
              if (matchIdx) {
                const idx = parseInt(matchIdx[1], 10);
                if (targetIndicesSet.size === 0 || targetIndicesSet.has(idx)) {
                  const promptText = matchPrompt ? matchPrompt[1].trim() : block.trim();
                  parsedPrompts.push({ type: 'doc', sceneNum: idx, fullPrompt: promptText });
                }
              }
            }
          }
        }

        if (parsedPrompts.length === 0) {
          throw new Error("Nenhum prompt encontrado para os índices selecionados.");
        }

        activeGeminiWebJobs[jobId] = {
          jobId,
          docNum: numStr,
          engine: 'current-tab',
          status: 'running',
          progress: 5,
          message: `Usando o chat Gemini preparado no Edge para ${parsedPrompts.length} imagens...`
        };

        send(res, 200, { jobId, status: 'running' });

        (async () => {
          try {
            const result = await runGeminiCurrentTabAutomation({
              numStr,
              runId: jobId,
              prompts: parsedPrompts,
              shouldCancel: () => Boolean(activeGeminiWebJobs[jobId]?.cancelRequested),
              onProgress: (percent, msg) => {
                if (activeGeminiWebJobs[jobId]) {
                  activeGeminiWebJobs[jobId].progress = percent;
                  activeGeminiWebJobs[jobId].message = msg;
                }
              }
            });

            if (activeGeminiWebJobs[jobId]) {
              activeGeminiWebJobs[jobId].status = 'completed';
              activeGeminiWebJobs[jobId].progress = 100;
              activeGeminiWebJobs[jobId].result = result;
              activeGeminiWebJobs[jobId].message = `Todas as imagens distribuídas nas gavetas!`;
            }
          } catch(err) {
            if (activeGeminiWebJobs[jobId]) {
              activeGeminiWebJobs[jobId].status = 'failed';
              activeGeminiWebJobs[jobId].error = err.message || 'Falha na automação';
            }
          }
        })();
      } catch(err) {
        sendApiError(res, err);
      }
      return true;
    }

    if (req.url === '/api/automate-gemini/recover-flow-downloads' && req.method === 'POST') {
      try {
        const payload = await readBody(req);
        const numStr = sanitizeNumericId(payload.number || '19');
        const sequences = Array.isArray(payload.sequences)
          ? payload.sequences.map(Number).filter(sequence => Number.isInteger(sequence) && sequence > 0 && sequence <= 50)
          : [];
        const expectedCount = sequences.length || Math.max(1, Math.min(50, Number(payload.expectedCount) || 3));
        const jobId = `gemini-recover-${numStr}-${Date.now()}`;
        activeGeminiWebJobs[jobId] = {
          jobId, docNum: numStr, engine: 'current-tab', status: 'running', progress: 1,
          message: `Recuperando ${expectedCount} download(s) do chat atual do Gemini...`
        };
        send(res, 200, { jobId, status: 'running' });
        (async () => {
          try {
            const result = await recoverGeminiFlowDownloadsCurrentTab({
              numStr,
              runId: jobId,
              mode: 'flow',
              expectedCount,
              sequences,
              shouldCancel: () => Boolean(activeGeminiWebJobs[jobId]?.cancelRequested),
              onProgress: (percent, message) => {
                if (activeGeminiWebJobs[jobId]) {
                  activeGeminiWebJobs[jobId].progress = percent;
                  activeGeminiWebJobs[jobId].message = message;
                }
              }
            });
            if (activeGeminiWebJobs[jobId]) {
              activeGeminiWebJobs[jobId].status = 'completed';
              activeGeminiWebJobs[jobId].progress = 100;
              activeGeminiWebJobs[jobId].result = result;
              activeGeminiWebJobs[jobId].message = `${result.savedFiles.length}/${expectedCount} imagem(ns) recuperada(s) em minisseries/${numStr}/flow/.`;
            }
          } catch (error) {
            if (activeGeminiWebJobs[jobId]) {
              activeGeminiWebJobs[jobId].status = 'failed';
              activeGeminiWebJobs[jobId].error = error.message || 'Falha na recuperacao dos downloads do Gemini.';
              activeGeminiWebJobs[jobId].message = activeGeminiWebJobs[jobId].error;
            }
          }
        })();
      } catch (error) {
        sendApiError(res, error);
      }
      return true;
    }

    if (req.url.startsWith('/api/automate-gemini/status') && req.method === 'GET') {
      try {
        const urlObj = new URL(req.url, 'http://localhost:' + PORT);
        const jobId = urlObj.searchParams.get('jobId');
        let job = (jobId && jobId !== 'active' && jobId !== 'null' && jobId !== 'undefined')
          ? activeGeminiWebJobs[jobId]
          : null;
        if (!job) {
          job = Object.values(activeGeminiWebJobs).find(j => j && j.status === 'running');
        }
        send(res, 200, job || { status: 'idle', progress: 0, message: 'Nenhum trabalho ativo' });
      } catch(err) {
        sendApiError(res, err);
      }
      return true;
    }

    return false; // Rota não atendida por este módulo
  }
}
