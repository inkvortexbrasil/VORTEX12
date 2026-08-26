const { runQwenCurrentTabAutomation } = require('../qwen_web_automation');
const fs = require('fs');
const path = require('path');
const robotManifest = require('../robot_manifest');

let activeQwenWebJobs = {};

function createQwenAutomationRouter(ROOT) {
  return async function handleQwenAutomationRoutes(req, res, pathname, query, readJsonBody, send, sendApiError) {
    if (req.method === 'POST' && pathname === '/api/automate-qwen/start') {
      try {
        const body = await readJsonBody(req);
        const { sequences, accountId, targetDir } = body;
        const number = body.campaignNumber || body.number;
        
        const jobId = `qwen_web_${number || 'flow'}_${Date.now()}`;
        activeQwenWebJobs[jobId] = {
          jobId,
          status: 'running',
          progress: 5,
          message: 'Iniciando Robô Qwen...',
          startedAt: new Date().toISOString()
        };

        // Fire and forget automation
        runQwenCurrentTabAutomation(ROOT, number, sequences, activeQwenWebJobs[jobId], (progress, message) => {
          if (activeQwenWebJobs[jobId] && activeQwenWebJobs[jobId].status !== 'cancelled') {
            activeQwenWebJobs[jobId].progress = progress;
            activeQwenWebJobs[jobId].message = message;
            activeQwenWebJobs[jobId].log = message; // backward compat with older app.js expecting 'log'
            activeQwenWebJobs[jobId].percent = progress; // backward compat
          }
        }).then(result => {
          if (activeQwenWebJobs[jobId] && activeQwenWebJobs[jobId].status !== 'cancelled') {
            activeQwenWebJobs[jobId].status = 'completed';
            activeQwenWebJobs[jobId].progress = 100;
            activeQwenWebJobs[jobId].percent = 100;
            activeQwenWebJobs[jobId].message = 'Qwen finalizou com sucesso!';
            activeQwenWebJobs[jobId].log = 'Qwen finalizou com sucesso!';
            activeQwenWebJobs[jobId].completedSequences = result.sequences || [];
          }
        }).catch(err => {
          if (activeQwenWebJobs[jobId] && activeQwenWebJobs[jobId].status !== 'cancelled') {
            activeQwenWebJobs[jobId].status = 'error';
            activeQwenWebJobs[jobId].error = err.message;
            activeQwenWebJobs[jobId].message = 'Erro: ' + err.message;
            activeQwenWebJobs[jobId].log = 'Erro: ' + err.message;
          }
        });

        return send(res, 200, { ok: true, jobId, message: 'Automação Qwen iniciada no Edge.' });
      } catch (err) {
        return sendApiError(res, err);
      }
    }

    if (req.method === 'GET' && pathname === '/api/automate-qwen/status') {
      const jobId = query.jobId;
      const cNum = query.number || query.campaignNumber;
      
      let job = null;
      if (jobId && jobId !== 'active' && activeQwenWebJobs[jobId]) {
        job = activeQwenWebJobs[jobId];
      }
      
      if (!job && cNum) {
        // Encontrar o job mais recente dessa minissérie, independente do status
        job = Object.values(activeQwenWebJobs)
                .filter(j => j && j.jobId.includes(`_${cNum}_`))
                .sort((a,b) => b.jobId.localeCompare(a.jobId))[0];
      }
      
      if (!job) {
        job = Object.values(activeQwenWebJobs).find(j => j && j.status === 'running');
      }
          
      return send(res, 200, { 
        ok: true, 
        status: job || { status: 'idle', progress: 0, message: 'Nenhum trabalho ativo.', log: 'Nenhum trabalho ativo.' }
      });
    }

    if (req.method === 'POST' && pathname === '/api/automate-qwen/cancel') {
      const jobId = query.jobId;
      const job = (jobId && jobId !== 'active' && activeQwenWebJobs[jobId])
          ? activeQwenWebJobs[jobId]
          : Object.values(activeQwenWebJobs).find(j => j && j.status === 'running');
          
      if (job) {
        job.status = 'cancelled';
        job.message = 'Cancelado pelo operador.';
        job.log = 'Cancelado pelo operador.';
        job.error = job.message;
        job.cancelRequested = true;
      }
      return send(res, 200, { ok: true, message: 'Qwen cancelado.' });
    }

    return false;
  };
}

module.exports = createQwenAutomationRouter;
