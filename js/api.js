// Conexão com o Motor Real V8 (Node Server localhost:8787)

function updateStatusMessage(msg) {
  const el = document.getElementById('generationStatusMessage');
  if (el) el.innerHTML = msg;
}

function requireKeysSet() {
  return true; // We now rely on the backend to manage keys natively.
}

const API = {
  async generateSubjects(customBrief = null) {
    // Monta o catálogo completo de assuntos já existentes no banco para a Mistral comparar e não repetir
    const existingCatalog = (AppState.campaigns || [])
      .map(c => ({
        title: c.title || c.topic?.title || '',
        groupSubject: c.topic?.groupSubject || ''
      }))
      .filter(c => c.title);

    const res = await fetch('/api/generate-subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief: customBrief, existingCatalog })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro na geração de assuntos");
    return data.subjects;
  },

  async saveSubject(campaignNumber, topic) {
    try {
      const res = await fetch('/api/minisseries/save-subject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignNumber, topic })
      });
      const data = await res.json().catch(() => ({}));
      return data;
    } catch (e) {
      console.error('Falha ao salvar assunto em disco:', e);
      return { ok: false, error: e.message };
    }
  },

  async generateGPT(campaignId) {
    updateStatusMessage("Preparando pacote de dados para o motor...");
    
    const campaign = AppState.campaigns.find(c => c.id === campaignId);
    if (!campaign) throw new Error("Campanha não encontrada no state.");

    const topicContext = campaign.topic?.description || campaign.topic?.groupSubject || campaign.description || campaign.title;

    const payload = {
      profile: 'adaptive',
      campaignNumber: campaign.number,
      topic: typeof campaign.topic === 'object' && campaign.topic ? {
        ...campaign.topic,
        title: campaign.title || campaign.topic.title,
        description: topicContext,
        groupSubject: topicContext
      } : {
        title: campaign.title,
        description: topicContext,
        groupSubject: topicContext
      }
    };

    updateStatusMessage("Iniciando geração editorial (GPT + Legenda Social)...");
    const startRes = await fetch('/api/generate-complete/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    
    const startData = await startRes.json();
    if (!startRes.ok) throw new Error(startData.error || "Erro ao iniciar job.");
    
    const jobId = startData.jobId;
    if (!jobId) throw new Error("A API não devolveu o ID do Job.");
    
    // Polling do Job
    let result = null;
    let pollCount = 0;
    while (pollCount < 3600) { // Timeout de segurança (~ 1 hora)
      await new Promise(r => setTimeout(r, 1000));
      pollCount++;
      
      const statusRes = await fetch(`/api/generate-complete/status?jobId=${encodeURIComponent(jobId)}`);
      const statusData = await statusRes.json();
      
      if (!statusRes.ok) throw new Error(statusData.error || "Erro ao consultar status.");
      
      // Atualiza interface com os passos
      const stageStr = statusData.stage ? `[${statusData.stage}]` : '';
      const stepStr = (statusData.step && statusData.total) ? `(${statusData.step}/${statusData.total})` : '';
      const detailStr = statusData.detail || 'Processando...';
      updateStatusMessage(`<b>${stageStr} ${stepStr}</b><br>${detailStr}`);
      
      if (statusData.status === 'done') {
        result = statusData.result;
        break;
      }
      
      if (statusData.status === 'error' || statusData.status === 'cancelled') {
        throw new Error(statusData.error || "Geração interrompida no servidor.");
      }
    }

    if (!result) throw new Error("Timeout na geração.");

    updateStatusMessage("Finalizando e empacotando os resultados...");

    // Mapeamento Inteligente: API -> V8 AppState
    const payloadResult = result.campaign || result;
    const scenes = payloadResult.scenes || [];
    
    campaign.scenes = scenes.map((s, i) => ({
      no: s.number,
      title: s.title,
      lines: s.lines || [],
      prompt: s.prompt
    }));
    campaign.gptScenes = campaign.scenes;
    
    let rawCaption = (payloadResult.socialCaption || "").trim();

    campaign.social = {
      baseCaption: rawCaption,
      caption: rawCaption
    };

    campaign.generatedGPT = true;

    if (payloadResult.flowMaster || (Array.isArray(payloadResult.motionScenes) && payloadResult.motionScenes.length)) {
      campaign.generatedGemini = true;
      campaign.generatedFlow = true;
      campaign.flow = payloadResult.flowMaster || { prompt: 'Create a clip using the images selected above, in that order.' };
      const rawMotions = payloadResult.motionScenes || [];
      campaign.geminiScenes = rawMotions.map((s, idx) => ({
        no: s.number || idx + 1,
        prompt: s.motionPrompt || s.prompt || '',
        assembledPrompt: s.assembledPrompt || s.motionPrompt || s.prompt || '',
        ...s
      }));
      campaign.motionScenes = campaign.geminiScenes;
    } else {
      campaign.generatedGemini = false;
      campaign.generatedFlow = false;
      campaign.flow = {};
      campaign.geminiScenes = [];
      campaign.motionScenes = [];
    }
    
    // Auto-create folders on disk
    fetch('/api/init-render-folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignNumber: campaign.number })
    }).catch(e => console.error('Failed to init folders', e));
    
    // Salvar o estado com a minissérie preenchida
    AppState.save();
  },

  async generateFlowGemini(campaignId) {
    updateStatusMessage("Preparando o Flow e os cinco movimentos do Gemini...");

    const campaign = AppState.campaigns.find(c => c.id === campaignId);
    if (!campaign) throw new Error("Campanha não encontrada no state.");

    const topicContext = campaign.topic?.description || campaign.topic?.groupSubject || campaign.description || campaign.title;
    const campaignNumber = campaign.number || campaign.id;
    const payload = {
      campaignNumber: campaignNumber,
      topic: {
        title: campaign.title,
        description: topicContext,
        groupSubject: topicContext,
        number: campaignNumber,
        motionBlueprint: campaign.topic?.motionBlueprint,
        visualUniverse: campaign.topic?.visualUniverse
      }
    };

    const startRes = await fetch('/api/generate-flow-gemini/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const startData = await startRes.json();
    if (!startRes.ok) throw new Error(startData.error || 'Erro ao iniciar Flow + Gemini.');

    const jobId = startData.jobId;
    if (!jobId) throw new Error('A API não devolveu o ID do job Flow + Gemini.');

    let result = null;
    let pollCount = 0;
    while (pollCount < 3600) {
      await new Promise(r => setTimeout(r, 1000));
      pollCount++;
      const statusRes = await fetch(`/api/generate-flow-gemini/status?jobId=${encodeURIComponent(jobId)}`);
      const statusData = await statusRes.json();
      if (!statusRes.ok) throw new Error(statusData.error || 'Erro ao consultar Flow + Gemini.');

      const stageStr = statusData.stage ? `[${statusData.stage}]` : '';
      const stepStr = (statusData.step && statusData.total) ? `(${statusData.step}/${statusData.total})` : '';
      updateStatusMessage(`<b>${stageStr} ${stepStr}</b><br>${statusData.detail || 'Processando...'}`);

      if (statusData.status === 'done') {
        result = statusData.result;
        break;
      }
      if (statusData.status === 'error' || statusData.status === 'cancelled') {
        throw new Error(statusData.error || 'Geração Flow + Gemini interrompida.');
      }
    }

    if (!result) throw new Error('Timeout na geração Flow + Gemini.');

    const flowMaster = result.flowMaster || {};
    const motionScenes = Array.isArray(result.motionScenes) ? result.motionScenes : [];
    const flowScenes = Array.isArray(flowMaster.scenes) ? flowMaster.scenes : [];

    campaign.flow = {
      prompt: flowMaster.prompt || '',
      globalDirective: flowMaster.globalDirective || '',
      scenes: flowScenes
    };
    campaign.geminiScenes = motionScenes.map(m => ({
      no: m.number,
      prompt: m.motionPrompt,
      geminiMotion: m.motionPrompt,
      flowScene: flowScenes.find(scene => Number(scene.number) === Number(m.number))
    }));
    campaign.motionScenes = campaign.geminiScenes;
    campaign.generatedGemini = true;
    campaign.generatedFlow = true;
    AppState.save();
  },

  async generateGemini(campaignId) {
    return this.generateFlowGemini(campaignId);
  }
};
