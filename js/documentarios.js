// 🎥 Multiverso minisséries 9.0 — Seletor Manual de MP3 por Minissérie com Leitura de Tempo (MM:SS) e Confirmação no Botão ATUALIZAR

let currentAffinityBlocks = [];
let activeBlockIndex = null; // null = Grade 2 Colunas; number = Card Expandido
let blockAudioStatus = {};
let activeDocumentariosTab = 'production'; // 'production' | 'library'

// Estado das seleções e confirmações de áudio pelo Diretor
let userSelectedDocMp3s = {}; // { "01": "filename.mp3", "02": "filename.mp3" }
let userConfirmedDocMp3s = {}; // { "01": true, "02": true }

window.copyDocCaption = function(docNumStr, btn) {
  const doc = (AppState.documentaries || []).find(d => String(d.docId || d.docFolder).padStart(2,'0') === docNumStr);
  const titleStr = doc ? (doc.campaignTitles || []).join(' • ') : `minissérie ${docNumStr}`;
  const text = `🔥 MINISSÉRIE ESPECIAL YOUTUBE | INKVORTEX BRASIL 🎬🍿\n\n📺 ${titleStr}\n\n🍿 Assista à minissérie completa no canal da InkVortex Brasil!\n\n🛒 Insumos, peças e tintas têxteis de alta definição na nossa loja do Mercado Livre: Link na Bio!\n\n#InkVortexBrasil #ImpressaoDigital #DTG #DTF #Minisserie #Têxtil`;

  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const oldHtml = btn.innerHTML;
      btn.innerHTML = '✅ Legenda Copiada!';
      btn.style.background = '#00d26a';
      btn.style.color = '#fff';
      setTimeout(() => {
        btn.innerHTML = oldHtml;
        btn.style.background = 'var(--brandGrad)';
        btn.style.color = '#fff';
      }, 2500);
    }
  });
};

// Atalho Tecla ESC para fechar card expandido
window.addEventListener('keydown', function(event) {
  if (event.key === 'Escape' || event.key === 'Esc') {
    if (activeBlockIndex !== null) {
      window.closeExpandedDocCard();
    }
  }
});

window.handleStartGeminiChunk = function(startIdx, endIdx) {
  // Desmarca tudo primeiro
  document.querySelectorAll('.gemini-img-check').forEach(cb => cb.checked = false);
  
  // Marca apenas as da faixa especificada
  document.querySelectorAll('.gemini-img-check').forEach(cb => {
    const val = parseInt(cb.value, 10);
    if (val >= startIdx && val <= endIdx) {
      cb.checked = true;
    }
  });

  // Dispara o robô
  handleStartGeminiDocRobot();
}

window.openDocumentarios = async function() {
  try {
    window.switchMultiverseRoom('documentariosRoomView', 'btnNavDocumentarios');
    
    if (typeof window.updateTopbarTitle === 'function') {
      window.updateTopbarTitle('🎬 Multiverso Minisséries', 'Esteira de Produção de Minisséries (50 Prompts por Minissérie).');
    }

    const savedJobId = localStorage.getItem('activeDocJobId');
    if (savedJobId) {
      window.activeDocJobId = savedJobId;
    }

    buildAffinityBlocks();
    if (activeBlockIndex === null && currentAffinityBlocks.length > 0) {
      activeBlockIndex = 0;
      window.activeBlockIndex = 0;
    }
    renderDocumentariosWorkspace();

    if (typeof fetchDocumentaries === 'function') {
      await fetchDocumentaries();
      buildAffinityBlocks();
      if (activeBlockIndex === null && currentAffinityBlocks.length > 0) {
        activeBlockIndex = 0;
        window.activeBlockIndex = 0;
      }
      renderDocumentariosWorkspace();
    }
  } catch (err) {
    console.error('Erro ao abrir Multiverso Minisséries:', err);
  }
};

window.closeDocumentarios = function() {
  document.getElementById('documentariosRoomView').style.display = 'none';
  document.getElementById('multiverseWelcome').style.display = 'flex';
  if (window.highlightActiveRoom) window.highlightActiveRoom(null);
};

async function fetchDocumentaries() {
  try {
    const res = await fetch('/api/documentaries');
    if (res.ok) {
      const data = await res.json();
      const projects = Array.isArray(data.docs) ? data.docs : [];
      const campaigns = Array.isArray(AppState.campaigns) ? AppState.campaigns : [];
      const campaignByNumber = new Map();
      campaigns.forEach((campaign, index) => {
        const rawNumber = campaign.number || campaign.numStr || campaign.id || (index + 1);
        const match = String(rawNumber).match(/\d+/);
        if (!match) return;
        const number = String(Number.parseInt(match[0], 10)).padStart(2, '0');
        campaignByNumber.set(number, campaign);
      });

      const visibleProjects = campaignByNumber.size > 0
        ? projects.filter(project => campaignByNumber.has(String(project.docNumStr).padStart(2, '0')))
        : projects;

      AppState.documentaries = visibleProjects.map(project => {
        const number = String(project.docNumStr).padStart(2, '0');
        const campaign = campaignByNumber.get(number);
        return {
          ...project,
          title: campaign?.title || campaign?.topic?.title || project.title || `Minissérie #${number}`
        };
      });
      AppState.documentaries.sort((a, b) => Number(b.docNumStr || b.docId || b.docFolder || 0) - Number(a.docNumStr || a.docId || a.docFolder || 0));
    }
  } catch(e) {
    AppState.documentaries = [];
  }
}

// 🧠 Agrupamento Temático e Estrito: 1 Minissérie por card (50 prompts)
function buildAffinityBlocks() {
  const allCampaigns = AppState.campaigns || [];
  window.orphanCampaigns = {};
  
  if (allCampaigns.length > 0) {
    const sorted = [...allCampaigns].sort((a, b) => Number(b.number || 0) - Number(a.number || 0));

    currentAffinityBlocks = sorted.map((c, idx) => {
      const numDisplay = String(c.number || (idx + 1)).padStart(2, '0');
      const title = c.title || (c.topic && c.topic.title) || `Minissérie #${numDisplay}`;
      const savedDoc = (AppState.documentaries || []).find(d => String(d.docId || d.docFolder).padStart(2, '0') === numDisplay);
      
      return {
        id: `minisserie-${numDisplay}`,
        docNum: idx + 1,
        numDisplay: numDisplay,
        title: title,
        subtitle: `Minissérie #${numDisplay}`,
        campaigns: [c],
        campaign: c,
        category: title,
        socialCaption: c.socialCaption || (savedDoc ? savedDoc.socialCaption : null)
      };
    });
  } else if ((AppState.documentaries || []).length > 0) {
    const docs = [...AppState.documentaries].sort((a, b) => Number(b.docNumStr || b.docId || b.docFolder || 0) - Number(a.docNumStr || a.docId || a.docFolder || 0));
    currentAffinityBlocks = docs.map((doc, idx) => {
      const numDisplay = String(doc.docNumStr || doc.docId || doc.docFolder || (idx + 1)).padStart(2, '0');
      const title = doc.title || doc.subtitle || `Minissérie #${numDisplay}`;
      const fakeCampaign = {
        id: `campaign-${numDisplay}`,
        number: numDisplay,
        title: title,
        topic: { title: title, description: title },
        scenes: []
      };
      return {
        id: `minisserie-${numDisplay}`,
        docNum: idx + 1,
        numDisplay: numDisplay,
        title: title,
        subtitle: `Minissérie #${numDisplay}`,
        campaigns: [fakeCampaign],
        campaign: fakeCampaign,
        category: title,
        socialCaption: doc.socialCaption || null
      };
    });
  } else {
    currentAffinityBlocks = [];
  }
}

// 📡 Telemetria de Áudio MP3 (Carrega todas as faixas disponíveis com tempo MM:SS)
async function refreshActiveBlockTelemetry() {
  if (activeBlockIndex === null || !currentAffinityBlocks[activeBlockIndex]) return;
  const currentBlock = currentAffinityBlocks[activeBlockIndex];

  try {
    const res = await fetch('/api/check-block-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        campaigns: currentBlock.campaigns,
        campaignIds: currentBlock.campaigns.map(c => c.number || c.id)
      })
    });
    if (res.ok) {
      const data = await res.json();
      blockAudioStatus = data.results || {};
      
      // O Diretor relatou que a UI dizia "Sem áudios. Execute a Fase 2". 
      // Isso ocorria porque o cache de MP3 não estava sendo alimentado.
      if (!window.docMp3Cache) window.docMp3Cache = {};
      Object.keys(blockAudioStatus).forEach(cNum => {
         const tracks = blockAudioStatus[cNum].availableTracks || [];
         window.docMp3Cache[cNum] = tracks.map(t => t.filename);
         
         // Se só tem 1 track, seleciona automaticamente para poupar tempo
         if (tracks.length === 1 && !userSelectedDocMp3s[cNum]) {
             userSelectedDocMp3s[cNum] = tracks[0].filename;
             // userConfirmedDocMp3s[cNum] = true; // Deixa o usuário confirmar manualmente para evitar surpresas, ou auto-confirma
         }
      });
    }
  } catch(e) {
    console.warn('Erro na telemetria:', e);
  }
}

// 🔍 Seleção de Faixa MP3 pelo Diretor
window.handleSelectDocMp3Track = function(campaignNum, filename) {
  if (!userSelectedDocMp3s) userSelectedDocMp3s = {};
  if (!userConfirmedDocMp3s) userConfirmedDocMp3s = {};

  userSelectedDocMp3s[campaignNum] = filename;
  // Alterar uma faixa coloca a minissérie em revisão até clicar em ATUALIZAR
  userConfirmedDocMp3s[campaignNum] = false;
  renderDocumentariosWorkspace();
};

// 🔄 Botão ATUALIZAR: Valida e Confirma as faixas MP3 selecionadas pelo Diretor
async function handleRefreshTelemetry() {
  if (activeBlockIndex === null || !currentAffinityBlocks[activeBlockIndex]) return;
  const currentBlock = currentAffinityBlocks[activeBlockIndex];

  await refreshActiveBlockTelemetry();

  let unselected = [];
  currentBlock.campaigns.forEach(c => {
    const cNum = String(c.number || (typeof c.id === 'string' ? (c.id.match(/\d+/)||[1])[0] : c.id)).padStart(2, '0');
    const selected = userSelectedDocMp3s[cNum];
    if (!selected) {
      unselected.push(cNum);
    } else {
      userConfirmedDocMp3s[cNum] = true;
    }
  });

  if (unselected.length > 0) {
    alert(`⚠️ Por favor, escolha a faixa MP3 no seletor para a(s) Minissérie(s) #${unselected.join(', #')} antes de atualizar.`);
  } else {
    alert(`✅ Faixas MP3 confirmadas com sucesso para o minissérie ${currentBlock.numDisplay}!`);
  }

  renderDocumentariosWorkspace();
}

window.handleDocTranscribe = async function() {
  if (activeBlockIndex === null) return;
  const currentBlock = currentAffinityBlocks[activeBlockIndex];
  if (!currentBlock) return;
  const docNum = currentBlock.numDisplay || '1';
  
  const btn = document.getElementById('btnDocTranscribe');
  const loader = document.getElementById('docTranscriptionLoader');
  const textArea = document.getElementById('docTranscriptionText');
  
  if (btn) btn.style.display = 'none';
  if (loader) loader.style.display = 'block';
  if (textArea) textArea.style.display = 'none';
  
  const campaignsWithMp3s = currentBlock.campaigns.map(c => {
    const cNum = String(c.number || (typeof c.id === 'string' ? (c.id.match(/\d+/)||[1])[0] : c.id)).padStart(2, '0');
    return {
      ...c,
      selectedMp3: userSelectedDocMp3s[cNum] || null
    };
  });

  try {
    const res = await fetch('/api/documentaries/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docNum: docNum, campaigns: campaignsWithMp3s })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Erro na transcrição");
    
    // Mostra o textarea para o diretor revisar
    if (loader) loader.style.display = 'none';
    textArea.value = data.text;
    textArea.style.display = 'block';
    
    const correctorDiv = document.getElementById('docCorrectorDiv');
    if (correctorDiv) correctorDiv.style.display = 'block';
    
    // Salva o JSON bruto no escopo da sessao para envio posterior
    window.currentDocTranscribedData = data.rawWords;
    window.currentDocRawWords = data.rawWords;
    
  } catch (err) {
    console.error(err);
    alert("Erro extraindo legendas: " + err.message);
    if (btn) btn.style.display = 'inline-block';
    if (loader) loader.style.display = 'none';
  }
}

// Nova função: prévia de legendas via corretor ASS local (sem IA)
window.handleDocPreviewSubtitles = async function() {
  if (activeBlockIndex === null) return;
  const currentBlock = currentAffinityBlocks[activeBlockIndex];
  if (!currentBlock) return;

  const btn     = document.getElementById('btnDocPreview');
  const loader  = document.getElementById('docPreviewLoader');
  const textArea = document.getElementById('docSubtitlePreviewText');
  const infoDiv = document.getElementById('docPreviewInfo');

  if (btn)    { btn.style.display = 'none'; }
  if (loader) { loader.style.display = 'block'; }
  if (textArea) { textArea.style.display = 'none'; }

  const campaignsWithMp3s = currentBlock.campaigns.map(c => {
    const cNum = String(c.number || (typeof c.id === 'string' ? (c.id.match(/\d+/)||[1])[0] : c.id)).padStart(2, '0');
    return { ...c, selectedMp3: userSelectedDocMp3s[cNum] || null };
  });

  try {
    const res = await fetch('/api/documentaries/preview-subtitles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docNum: currentBlock.numDisplay, campaigns: campaignsWithMp3s })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Erro na prévia');

    window.currentDocRawWords = data.rawWords;

    if (loader)  loader.style.display = 'none';
    if (textArea) { textArea.value = data.text; textArea.style.display = 'block'; }
    if (infoDiv) infoDiv.style.display = 'block';
    if (btn)    { btn.style.display = 'inline-block'; btn.textContent = '🔄 ATUALIZAR PRÉVIA'; }

  } catch (err) {
    console.error(err);
    alert('Erro na prévia de legendas: ' + err.message);
    if (loader) loader.style.display = 'none';
    if (btn)   { btn.style.display = 'inline-block'; }
  }
};

// 🔍 Abrir Card Expandido Focado
window.openExpandedDocCard = async function(index) {
  activeBlockIndex = index;
  userConfirmedDocMp3s = {}; // Reseta confirmações ao abrir novo card
  await refreshActiveBlockTelemetry();

  // Rastreia o número do minissérie expandido para auto-descoberta de job
  const block = currentAffinityBlocks[index];
  if (block && block.numDisplay) {
    window.currentExpandedDocNum = String(block.numDisplay).padStart(2, '0');
  }

  renderDocumentariosWorkspace();

  // Auto-inicia polling se há um job rodando para este minissérie
  setTimeout(() => resumeDocPolling(window.currentExpandedDocNum), 300);
};

// ✖️ Fechar Card Expandido
window.closeExpandedDocCard = function() {
  activeBlockIndex = null;
  renderDocumentariosWorkspace();
};

// 🧠 Gerar Roteiro
async function handleGenerateDocumentary() {
  if (activeBlockIndex === null) return;
  const currentBlock = currentAffinityBlocks[activeBlockIndex];
  if (!currentBlock) return;

  try {
    const res = await fetch('/api/generate-documentary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        docNum: currentBlock.numDisplay, 
        numDisplay: currentBlock.numDisplay, 
        campaigns: currentBlock.campaigns 
      })
    });

    if (!res.ok) throw new Error('Falha ao gerar roteiro documental.');
    const data = await res.json();
    window.currentDocumentary = data.script;
    window.currentDocFilename = data.filename;
    
    // Atualiza o submenu se estiver aberto
    const scriptArea = document.getElementById('docPhase1ScriptArea');
    if (scriptArea) {
      scriptArea.value = data.script;
    }
    
    alert(`✨ Roteiro para o minissérie ${currentBlock.numDisplay} gerado com sucesso!`);
    await fetchDocumentaries();
    renderDocumentariosWorkspace();
  } catch(err) {
    alert('Erro: ' + err.message);
  }
}

// 🎬 Renderizar Vídeo Final

// ✨ FASE 1: Gerar imagens (Mistral + Pollinations)
async function handleGenerateImages() {
  if (activeBlockIndex === null) return;
  const currentBlock = currentAffinityBlocks[activeBlockIndex];
  if (!currentBlock) return;

  const btn = document.getElementById('btnGenerateImages');
  if (btn) { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; btn.innerText = '⏳ SOLICITANDO IMAGENS...'; }

  try {
    const res = await fetch('/api/generate-doc-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numDisplay: currentBlock.numDisplay,
        docNum: currentBlock.numDisplay,
        campaigns: currentBlock.campaigns
      })
    });

    if (!res.ok) throw new Error(await res.text());

    const job = await res.json();
    window.activeDocJobId = job.jobId;
    localStorage.setItem('activeDocJobId', job.jobId);
    window.anyJobRunning = true; 
    resumeDocPolling();
  } catch(error) {
    alert('Erro ao iniciar Fase 1: ' + error.message);
    if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; btn.innerText = '✨ FASE 1: GERAR PROMPTS TEXTUAIS (Mistral)'; }
  }
}

// 🤖 FASE 2: Iniciar Robô Gemini para Imagens Específicas
async function handleStartGeminiDocRobot(providedCheckboxes = null) {
  if (activeBlockIndex === null) return;
  const currentBlock = currentAffinityBlocks[activeBlockIndex];
  if (!currentBlock) return;

  // Coleta os índices marcados (usa os fornecidos pelo botão M ou os gerais)
  const checkedBoxes = providedCheckboxes || document.querySelectorAll('.gemini-img-check:checked');
  if (checkedBoxes.length === 0) {
    alert("Nenhuma imagem selecionada. Marque ao menos uma caixa para o robô baixar.");
    return;
  }
  const selectedIndices = Array.from(checkedBoxes).map(cb => parseInt(cb.value, 10));

  const log = document.getElementById('docMonitorLog');
  const bar = document.getElementById('docMonitorBar');
  const percent = document.getElementById('docMonitorPercent');
  const monitor = document.getElementById('docMonitorContainer');

  if (monitor) monitor.style.display = 'block';
  if (log) log.innerText = "Iniciando Robô Gemini (Automação Chrome)...";
  if (percent) percent.innerText = "0%";
  if (bar) bar.style.width = "0%";

  try {
    const mFolders = currentBlock.campaigns.slice(0, 3).map(c => 'M' + String(c.number || (typeof c.id === 'string' ? (c.id.match(/\d+/)||[1])[0] : c.id)).padStart(2, '0'));
    
    const res = await fetch('/api/automate-gemini/start-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docNum: currentBlock.numDisplay,
        indices: selectedIndices,
        mFolders: mFolders
      })
    });

    if (!res.ok) throw new Error(await res.text());

    const job = await res.json();
    window.activeDocGeminiJobId = job.jobId;
    window.activeDocGeminiCampaignNumber = String(currentBlock.numDisplay).padStart(2, '0');
    if (typeof window.saveActiveDocGeminiJob === 'function') {
      window.saveActiveDocGeminiJob({
        jobId: job.jobId,
        provider: 'gemini',
        campaignNumber: window.activeDocGeminiCampaignNumber
      });
    }
    if (typeof window.showDocGeminiTopbarTelemetry === 'function') {
      window.showDocGeminiTopbarTelemetry();
    }
    const logEl = document.getElementById('docGeminiMonitorLog');
    const barEl = document.getElementById('docGeminiMonitorBar');
    const pctEl = document.getElementById('docGeminiMonitorPercent');
    if (logEl) logEl.innerText = `🔮 Iniciando Robô Gemini para M${currentBlock.numDisplay}...`;
    if (barEl) barEl.style.width = '5%';
    if (pctEl) pctEl.innerText = '5%';
    if (typeof window.pollDocGeminiAutomationStatus === 'function') {
      window.pollDocGeminiAutomationStatus();
    }

  } catch(error) {
    alert('Erro ao iniciar Robô: ' + error.message);
  }
}

window.rescueDocVisualRobot = async function(cNum) {
  const isGPT = AppState.visualRobotProvider === 'chatgpt';
  const prefix = isGPT ? 'ChatGPT' : 'Gemini';
  
  if (!confirm(`📥 RESGATE ${prefix} (M${cNum}):\n\nO robô NÃO vai gerar novos prompts. Ele usará somente o chat que você deixou aberto ao lado da Central e salvará cada imagem na sua posição absoluta.\n\nDeseja iniciar o resgate agora?`)) return;

  try {
    const blockEl = document.getElementById(`phase2-block-M${cNum}`);
    let checkedBoxes = [];
    if (blockEl) {
      checkedBoxes = Array.from(blockEl.querySelectorAll('.gemini-img-check:checked, .chatgpt-img-check:checked'))
        .map(cb => parseInt(cb.value, 10))
        .filter(v => Number.isInteger(v) && v > 0);
    } else {
      checkedBoxes = Array.from(document.querySelectorAll(`.gemini-img-check[data-cnum="${cNum}"]:checked`))
        .map(cb => parseInt(cb.value, 10))
        .filter(v => Number.isInteger(v) && v > 0);
    }
    const scenesToSend = checkedBoxes.length ? checkedBoxes : 'auto';

    const endpoint = isGPT ? '/api/automate-chatgpt/rescue' : '/api/automate-gemini/rescue';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: String(cNum).padStart(2, '0'), scenes: scenesToSend })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    
    if (isGPT) {
      window.activeDocGptJobId = data.jobId;
      window.activeDocGptCampaignNumber = String(cNum).padStart(2, '0');
      window.activeDocChatGPTJobId = data.jobId;
      if (typeof window.saveActiveDocGptJob === 'function') {
        window.saveActiveDocGptJob({
          jobId: data.jobId,
          provider: 'chatgpt',
          campaignNumber: window.activeDocGptCampaignNumber,
          mode: 'rescue'
        });
      }
      if (typeof window.showDocGptTopbarTelemetry === 'function') {
        window.showDocGptTopbarTelemetry();
      }
      const log = document.getElementById('docGptMonitorLog');
      const bar = document.getElementById('docGptMonitorBar');
      const percent = document.getElementById('docGptMonitorPercent');
      if (log) log.innerText = `🤖 Iniciando Resgate de Download (GPT) para M${cNum}...`;
      if (bar) bar.style.width = '5%';
      if (percent) percent.innerText = '5%';
      if (typeof window.pollDocGptAutomationStatus === 'function') {
        window.pollDocGptAutomationStatus();
      }
    } else {
      window.activeDocGeminiJobId = data.jobId;
      window.activeDocGeminiCampaignNumber = String(cNum).padStart(2, '0');
      window.activeDocChatGPTJobId = data.jobId;
      if (typeof window.saveActiveDocGeminiJob === 'function') {
        window.saveActiveDocGeminiJob({
          jobId: data.jobId,
          provider: 'gemini',
          campaignNumber: window.activeDocGeminiCampaignNumber,
          mode: 'rescue'
        });
      }
      if (typeof window.showDocGeminiTopbarTelemetry === 'function') {
        window.showDocGeminiTopbarTelemetry();
      }
      const log = document.getElementById('docGeminiMonitorLog');
      const bar = document.getElementById('docGeminiMonitorBar');
      const percent = document.getElementById('docGeminiMonitorPercent');
      if (log) log.innerText = `🔮 Iniciando Resgate de Download (Gemini) para M${cNum}...`;
      if (bar) bar.style.width = '5%';
      if (percent) percent.innerText = '5%';
      if (typeof window.pollDocGeminiAutomationStatus === 'function') {
        window.pollDocGeminiAutomationStatus();
      }
    }
  } catch(err) {
    alert(`Erro no resgate ${prefix}: ` + err.message);
  }
};

async function handleCancelGeminiRobot() {
  if (!confirm("Deseja forçar a parada do Robô Gemini? Isso fechará o navegador imediatamente.")) return;
  
  try {
    const res = await fetch('/api/automate-gemini/cancel', { method: 'POST' });
    if (res.ok) {
      if (window.activeDocPollInterval) clearInterval(window.activeDocPollInterval);
      const log = document.getElementById('docMonitorLog');
      if (log) {
        log.style.background = 'rgba(210, 0, 0, 0.2)';
        log.style.borderLeftColor = '#d20000';
        log.innerText = "ROBÔ PARADO PELO USUÁRIO.";
      }
    }
  } catch (e) {
    alert("Erro ao parar robô: " + e.message);
  }
}

async function handleRenderVideo() {
  if (activeBlockIndex === null) return;
  const currentBlock = currentAffinityBlocks[activeBlockIndex];
  if (!currentBlock) return;

  const btn = document.getElementById('btnRenderDoc');
  if (btn) { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; }

  try {
    const res = await fetch('/api/render-documentary/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numDisplay: currentBlock.numDisplay,
        docNum: currentBlock.numDisplay,
        script: window.currentDocumentary || 'minissérie com Trilha Sonora Multi-MP3 e Legenda Vertical',
        campaigns: currentBlock.campaigns,
        
      })
    });

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(errTxt);
    }

    const job = await res.json();
    window.activeDocJobId = job.jobId;
    localStorage.setItem('activeDocJobId', job.jobId);
    window.anyJobRunning = true; // PROTEÇÃO GLOBAL: bloqueia ESC durante renderização de minissérie
    resumeDocPolling();
  } catch(error) {
    alert('Erro ao iniciar renderização: ' + error.message);
    if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
  }
}

// ⚡ REMONTAGEM RÁPIDA: usa imagens + MP3 já existentes — só roda o FFmpeg com nova legenda
async function handleReassembleVideo() {
  if (activeBlockIndex === null) return;
  const currentBlock = currentAffinityBlocks[activeBlockIndex];
  if (!currentBlock) return;

  if (window.anyJobRunning) {
    alert('Aguarde o processo atual terminar antes de iniciar uma remontagem.');
    return;
  }

  const numStr = String(currentBlock.numDisplay).padStart(2, '0');
  if (!confirm(`⚡ REMONTAGEM RÁPIDA — Doc ${numStr}\n\nUsa as imagens e o áudio já existentes no disco.\nSó regenera a legenda e monta o MP4 via FFmpeg.\n\nNenhuma imagem será baixada. Deseja prosseguir?`)) return;

  const btn = document.getElementById('btnReassembleDoc');
  if (btn) { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; btn.innerText = '⏳ Remontando...'; }

  try {
    const res = await fetch('/api/render-documentary/reassemble', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docNum: numStr, campaigns: currentBlock.campaigns })
    });

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(errTxt);
    }

    const job = await res.json();
    window.activeDocJobId = job.jobId;
    localStorage.setItem('activeDocJobId', job.jobId);
    window.anyJobRunning = true; // PROTEÇÃO GLOBAL: bloqueia ESC
    resumeDocPolling();
  } catch(error) {
    alert('Erro ao iniciar remontagem: ' + error.message);
    if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; btn.innerText = '⚡ REMONTAR'; }
  }
}

function resumeDocPolling(docNumOverride) {
  // 1. Tenta usar jobId já conhecido
  if (!window.activeDocJobId) {
    window.activeDocJobId = localStorage.getItem('activeDocJobId');
  }

  // 2. Se ainda não tem jobId, tenta auto-descobrir pelo número do minissérie
  if (!window.activeDocJobId) {
    const numStr = docNumOverride || (window.currentExpandedDocNum ? String(window.currentExpandedDocNum).padStart(2,'0') : null);
    if (numStr) {
      fetch('/api/render-documentary/active?docNum=' + numStr)
        .then(r => r.json())
        .then(data => {
          if (data && data.jobId && data.status === 'running') {
            window.activeDocJobId = data.jobId;
            localStorage.setItem('activeDocJobId', data.jobId);
            window.anyJobRunning = true;
            resumeDocPolling(numStr); // reinicia com jobId correto
          }
        })
        .catch(() => {});
    }
    return;
  }

  if (window.activeDocPollInterval) clearInterval(window.activeDocPollInterval);

  // Garante que o monitor está visível (mesmo se foi renderizado com display:none)
  const monitor = document.getElementById('docMonitorContainer');
  const log = document.getElementById('docMonitorLog');
  const bar = document.getElementById('docMonitorBar');
  const percent = document.getElementById('docMonitorPercent');
  const btn = document.getElementById('btnRenderDoc');

  if (monitor) monitor.style.display = 'block';

  let falhasConsecutivas = 0; // RESILIÊNCIA: só cancela após 3 falhas de rede seguidas
  const MAX_FALHAS = 3;

  window.activeDocPollInterval = setInterval(async () => {
    try {
      const statusRes = await fetch(`/api/render-documentary/status?jobId=${window.activeDocJobId}`);
      
      if (statusRes.status === 404) {
        // O servidor reiniciou ou o job terminou sem avisar. Limpa o lixo da memória.
        clearInterval(window.activeDocPollInterval);
        localStorage.removeItem('activeDocJobId');
        window.activeDocJobId = null;
        window.anyJobRunning = false;
        if (monitor) monitor.style.display = 'none';
        if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
        return;
      }

      if (!statusRes.ok) throw new Error('Falha ao verificar progresso');
      const currentJob = await statusRes.json();

      falhasConsecutivas = 0; // Resposta OK — reset do contador de falhas

      if (currentJob.status === 'running') {
        if (log) log.innerText = currentJob.detail;
        let p = (currentJob.step / 4) * 100;

        if (currentJob.step === 3) {
          // Usa campos explícitos do JSON (mais confiável e granular que regex no texto)
          const imgOk    = currentJob.imagesOk    || 0;
          const imgTotal = currentJob.imagesTotal || 0;

          if (imgTotal > 0) {
            // Progresso entre 50% (início das imagens) e 80% (antes do FFmpeg)
            p = 50 + (imgOk / imgTotal) * 30;
          } else {
            // Fallback: parser do detail antigo
            const match = currentJob.detail ? currentJob.detail.match(/(\d+)\/(\d+)\s+salvas/) : null;
            if (match) {
              const saved = parseInt(match[1], 10);
              const total = parseInt(match[2], 10);
              if (total > 0) p = 50 + (saved / total) * 30;
            }
          }
        }

        if (bar) bar.style.width = `${p.toFixed(1)}%`;
        if (percent) percent.innerText = `${Math.round(p)}%`;

      } else if (currentJob.status === 'done') {
        clearInterval(window.activeDocPollInterval);
        localStorage.removeItem('activeDocJobId');
        window.activeDocJobId = null;
        window.anyJobRunning = false; // PROTEÇÃO GLOBAL: libera ESC
        
        // Invalida cache de imagens caso o robô tenha acabado de gerar novas imagens
        window.docImageCacheKey = Date.now();
        if (bar) bar.style.width = '100%';
        if (percent) percent.innerText = '100%';
        if (log) {
          log.style.background = 'rgba(0, 210, 106, 0.2)';
          log.style.borderLeftColor = '#00d26a';
          log.innerHTML = `✅ minissérie FINALIZADO E CATALOGADO!<br>Vídeo: ${currentJob.result.video}`;
        }
        await fetchDocumentaries();
        if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; btn.innerText = '✨ RENDERIZAR NOVO'; }
      } else if (currentJob.status === 'error') {
        clearInterval(window.activeDocPollInterval);
        localStorage.removeItem('activeDocJobId');
        window.activeDocJobId = null;
        window.anyJobRunning = false; // PROTEÇÃO GLOBAL: libera ESC
        if (log) { log.style.background = 'rgba(255,68,68,0.2)'; log.innerHTML = `❌ Erro: ${currentJob.error}`; }
        if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
      }
    } catch(err) {
      falhasConsecutivas++;
      if (log) log.innerText = `⚡ Reconectando... (tentativa ${falhasConsecutivas}/${MAX_FALHAS})`;
      if (falhasConsecutivas >= MAX_FALHAS) {
        // Só cancela após 3 falhas seguidas (ex: servidor morto permanentemente)
        clearInterval(window.activeDocPollInterval);
        window.anyJobRunning = false; // PROTEÇÃO GLOBAL: libera ESC após falha definitiva
        if (log) {
          log.style.background = 'rgba(255,150,0,0.15)';
          log.style.borderLeftColor = '#ff9600';
          log.innerText = '⚠️ Servidor inacessível após 3 tentativas. O render continua no servidor — recarregue a página para reconectar.';
        }
      }
      // Se falhasConsecutivas < MAX_FALHAS: silencia e tenta no próximo ciclo (2s)
    }
  }, 2000);
}

// 🖥️ Renderização Principal no Contêiner
function renderDocumentariosWorkspace() {
  const gridList = document.getElementById('docGridList');
  const detailsArea = document.getElementById('docDetailsArea');
  if (!gridList || !detailsArea) return;

  if (typeof window.releaseDocThumbnailObjectUrls === 'function') {
    window.releaseDocThumbnailObjectUrls();
  }

  gridList.innerHTML = renderDocLeftSidebarHTML();

  if (window.activeDocTab === 'esteira') {
      if (activeBlockIndex !== null && currentAffinityBlocks[activeBlockIndex]) {
        renderDocEsteiraDirect();
        if (window.activeDocJobId) resumeDocPolling();
      } else {
        detailsArea.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 20px;">🎬</div>
            <h2 style="color: var(--cyan); margin-bottom: 10px; font-family: var(--uiRounded);">Selecione uma Minissérie na Esteira</h2>
            <p style="color: rgba(255,255,255,0.7); max-width: 400px; margin-bottom: 30px; font-size: 0.95rem;">
              Escolha uma minissérie à esquerda para iniciar a produção.
            </p>
          </div>
        `;
      }
  } else {
      if (window.activeAcervoBlockIndex !== null) {
          detailsArea.innerHTML = renderAcervoExpandedCard();
      } else {
          detailsArea.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px; text-align: center;">
              <div style="font-size: 3rem; margin-bottom: 20px;">🎥</div>
              <h2 style="color: #00ff66; margin-bottom: 10px; font-family: var(--uiRounded);">Selecione uma Minissérie do Acervo</h2>
              <p style="color: rgba(255,255,255,0.7); max-width: 400px; margin-bottom: 30px; font-size: 0.95rem;">
                Escolha uma minissérie à esquerda para renderizar ou assistir.
              </p>
            </div>
          `;
      }
  }
}

// Expõe a função globalmente para as abas
window.renderDocumentariosWorkspace = renderDocumentariosWorkspace;

// 🚀 STATE TAB
window.activeDocTab = 'esteira';

// 📐 1. PAINEL ESQUERDO (Lista de Produção + Catalogados)
function renderDocLeftSidebarHTML() {
  let html = '';

  if (window.activeDocTab === 'esteira') {
      let hasReadyBlocks = currentAffinityBlocks.length > 0;
      if (hasReadyBlocks) {
        html += currentAffinityBlocks.map((block, idx) => {
          const numDisplay = block.numDisplay;
          const numsStr = block.campaigns.map(c => `#${String(c.number||c.id).padStart(2,'0')}`).join(' • ');
          const isSelected = activeBlockIndex === idx;

            const mainCardHTML = `
              <article class="docCard" style="position:relative; background: ${isSelected ? 'rgba(0,174,239,0.15)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isSelected ? 'var(--cyan)' : 'rgba(255,255,255,0.15)'}; border-radius: 14px; padding: 14px; display: flex; gap: 14px; align-items: center; cursor: pointer; transition: all 0.2s ease; box-shadow: ${isSelected ? '0 0 20px rgba(0,174,239,0.35)' : 'none'}; margin-bottom: 10px;" onclick="window.openExpandedDocCard(${idx})">
                <div style="width: 48px; height: 48px; border-radius: 10px; background: linear-gradient(135deg, #00aeef, #ec008c); color: #fff; font-weight: 900; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(0,174,239,0.9); flex-shrink: 0; border: 2px solid #0d0d1e;">
                  ${numDisplay}
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0;">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span style="background: rgba(0,174,239,0.2); color: var(--cyan); border: 1px solid rgba(0,174,239,0.4); padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: bold;">MINISSÉRIE #${numDisplay}</span>
                    <span style="color: #ff9900; font-size: 0.75rem; font-weight: bold;">PRONTA</span>
                  </div>
                  <h4 style="color: #fff; margin: 4px 0 2px; font-family: var(--uiRounded); font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 800;" title="${block.category}">${block.category}</h4>
                </div>
              </article>
            `;
            return mainCardHTML;
        }).join('');
      } else {
         html = `<div style="text-align: center; color: var(--ivTextSecondary); padding: 50px 20px; font-size: 0.9rem;">Nenhuma minissérie disponível.</div>`;
      }
  } else {
      let docs = AppState.documentaries || [];
      if (docs.length > 0) {
        html += docs.map((doc, idx) => {
          const docNumStr = String(doc.docNumStr || doc.docId || doc.docFolder || '14').padStart(2, '0');
          const titleStr = doc.title || doc.subtitle || (doc.campaignTitles && doc.campaignTitles.length ? doc.campaignTitles.join(' + ') : `Minissérie #${docNumStr}`);
          const isSelected = window.activeAcervoBlockIndex === idx;
          const isFinalized = doc.finalized === true;
          const isReady = doc.ready === true;
          const statusColor = isFinalized ? '#00ff66' : (isReady ? 'var(--cyan)' : '#ffb020');
          const statusBackground = isFinalized ? 'rgba(0,255,102,0.16)' : (isReady ? 'rgba(0,174,239,0.16)' : 'rgba(255,176,32,0.14)');
          const statusBorder = isFinalized ? 'rgba(0,255,102,0.4)' : (isReady ? 'rgba(0,174,239,0.4)' : 'rgba(255,176,32,0.35)');
          const statusLabel = isFinalized
            ? `FINALIZADO${doc.sizeMb ? ` • ${doc.sizeMb}` : ''}`
            : (isReady ? `PRONTA • ${doc.imageCount} IMAGENS` : `AGUARDANDO • ${doc.imageCount || 0} IMAGENS`);
          
          return `
            <article class="docCard" style="position:relative; background: ${isSelected ? 'rgba(0,255,100,0.15)' : 'rgba(0,255,100,0.05)'}; border: 1px solid ${isSelected ? '#00ff66' : 'rgba(0,255,100,0.2)'}; border-radius: 14px; padding: 14px; display: flex; gap: 14px; align-items: center; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; box-shadow: ${isSelected ? '0 0 20px rgba(0,255,100,0.3)' : 'none'};" onclick="window.openAcervoDocCard(${idx})">
              <div style="width: 48px; height: 48px; border-radius: 10px; background: #00cc66; color: #000; font-weight: 900; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(0,204,102,0.6); flex-shrink: 0; border: 2px solid #0d0d1e;">
                ${docNumStr}
              </div>
              <div style="flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="background: ${statusBackground}; color: ${statusColor}; border: 1px solid ${statusBorder}; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: bold;">${statusLabel}</span>
                </div>
                <h4 style="color: #fff; margin: 4px 0 2px; font-family: var(--uiRounded); font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 800;" title="${titleStr}">${titleStr}</h4>
              </div>
            </article>
          `;
        }).join('');
      } else {
         html = `<div style="text-align: center; color: var(--ivTextSecondary); padding: 50px 20px; font-size: 0.9rem;">Nenhuma minissérie criada ainda.</div>`;
      }
  }




  return html;
}

// ---------------------------------------------------------
// 📋 MODAL DE CONFERÊNCIA DOS 50 PROMPTS FINAIS
// ---------------------------------------------------------
window.openDocPromptsModal = function(cNum) {
  const existingModal = document.getElementById('docPromptsModal');
  if (existingModal) existingModal.remove();

  const numStr = String(cNum || '01').padStart(2, '0');
  const modalHTML = `
    <div id="docPromptsModal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px); z-index: 10000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.25s ease;">
      <div style="width: 90%; max-width: 950px; height: 85vh; background: #0c0d19; border: 1px solid rgba(0,174,239,0.4); border-radius: 16px; box-shadow: 0 0 40px rgba(0,174,239,0.3); display: flex; flex-direction: column; overflow: hidden;">
        
        <!-- Modal Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid rgba(0,174,239,0.25); background: rgba(255,255,255,0.02);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg, #00aeef, #ec008c); color: #fff; font-weight: 900; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(0,174,239,0.7);">
              ${numStr}
            </div>
            <div>
              <h3 style="margin: 0; color: #fff; font-size: 1.15rem; font-family: var(--uiRounded); font-weight: 800;">50 Prompts Finais — Minissérie #${numStr}</h3>
              <span style="color: var(--cyan); font-size: 0.8rem; font-weight: 600;">10 Cenas GPT + 40 Prompts Complementares Mistral</span>
            </div>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <button id="btnModalGen40" class="actionBtn" onclick="window.generate40PromptsFromModal('${numStr}')" style="padding: 10px 18px; background: linear-gradient(135deg, rgba(0,174,239,0.25), rgba(236,0,140,0.25)); color: #fff; border: 1px solid var(--cyan); border-radius: 8px; font-weight: bold; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              🚀 GERAR 40 PROMPTS (MISTRAL)
            </button>
            <button id="btnModalCopy50" class="actionBtn" onclick="window.copy50PromptsFromModal()" style="padding: 10px 18px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.25); border-radius: 8px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">
              📋 COPIAR 50 PROMPTS
            </button>
            <button class="actionBtn" onclick="window.closeDocPromptsModal()" style="padding: 10px 14px; background: rgba(255,0,0,0.12); color: #ff6b6b; border: 1px solid rgba(255,0,0,0.3); border-radius: 8px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">
              ✖ FECHAR
            </button>
          </div>
        </div>

        <!-- Modal Content with Loader Overlay -->
        <div style="position: relative; flex: 1; min-height: 0; padding: 18px 24px; display: flex; flex-direction: column;">
          <textarea id="docPromptsModalTextArea" readonly style="flex: 1; width: 100%; background: rgba(0,0,0,0.55); color: #00ffcc; border: 1px solid rgba(0,174,239,0.3); border-radius: 10px; padding: 16px; font-family: monospace; font-size: 0.88rem; line-height: 1.5; resize: none; box-sizing: border-box; outline: none;"></textarea>

          <!-- Loader Overlay -->
          <div id="docPromptsModalLoader" style="display: none; position: absolute; top: 18px; left: 24px; right: 24px; bottom: 18px; background: rgba(12,13,25,0.92); border-radius: 10px; border: 1px solid var(--cyan); flex-direction: column; justify-content: center; align-items: center; z-index: 20; backdrop-filter: blur(4px);">
            <div style="width: 50px; height: 50px; background: var(--brandGrad); border-radius: 50%; animation: cinematicPulse 1.2s infinite alternate; margin-bottom: 20px; box-shadow: 0 0 25px var(--cyan);"></div>
            <h3 style="color: #fff; font-family: var(--uiRounded); margin: 0 0 8px 0; font-size: 1.2rem; letter-spacing: 1px;">CONECTANDO MISTRAL IA...</h3>
            <p id="docPromptsModalLoaderText" style="color: var(--cyan); font-family: monospace; font-size: 0.95rem; text-align: center; padding: 0 30px; line-height: 1.5; margin: 0;">
              Mistral está conectando 40 prompts complementares<br>às 10 cenas GPT da Minissérie #${numStr}... Por favor, aguarde.
            </p>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const ta = document.getElementById('docPromptsModalTextArea');
  ta.value = '⏳ Carregando prompts da Minissérie #' + numStr + '...';

  const queueUrl = `/minisseries/${numStr}/prompts/50_prompts_esteira_chatgpt_${numStr}.txt?t=${Date.now()}`;
  const promptUrl = `/minisseries/${numStr}/prompts/50_prompts_minisserie_${numStr}.txt?t=${Date.now()}`;

  fetch(queueUrl, { cache: 'no-store' })
    .then(res => res.ok ? res.text() : fetch(promptUrl, { cache: 'no-store' }).then(fb => fb.ok ? fb.text() : Promise.reject('Arquivo não encontrado')))
    .then(text => {
      ta.value = text;
      const btnGen = document.getElementById('btnModalGen40');
      if (btnGen) btnGen.innerText = '✨ REGERAR 40 PROMPTS (MISTRAL)';
    })
    .catch(() => {
      ta.value = `Nenhum arquivo de 50 prompts encontrado ainda para a Minissérie #${numStr}.\n\nClique no botão "🚀 GERAR 40 PROMPTS (MISTRAL)" acima para acionar o Mistral e consolidar a esteira oficial de 50 posições.`;
    });
};

window.closeDocPromptsModal = function() {
  const modal = document.getElementById('docPromptsModal');
  if (modal) modal.remove();
};

window.copy50PromptsFromModal = function() {
  const ta = document.getElementById('docPromptsModalTextArea');
  const btn = document.getElementById('btnModalCopy50');
  if (ta && ta.value) {
    navigator.clipboard.writeText(ta.value);
    if (btn) {
      const original = btn.innerText;
      btn.innerText = '✔️ COPIADO!';
      btn.style.background = 'rgba(0,255,100,0.2)';
      btn.style.borderColor = '#00ff66';
      setTimeout(() => {
        btn.innerText = original;
        btn.style.background = 'rgba(255,255,255,0.08)';
        btn.style.borderColor = 'rgba(255,255,255,0.25)';
      }, 2000);
    }
  }
};

window.generate40PromptsFromModal = async function(cNum) {
  const numStr = String(cNum || '01').padStart(2, '0');
  const loader = document.getElementById('docPromptsModalLoader');
  const btn = document.getElementById('btnModalGen40');
  const ta = document.getElementById('docPromptsModalTextArea');

  if (loader) loader.style.display = 'flex';
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

  try {
    const currentBlock = currentAffinityBlocks.find(b => String(b.numDisplay).padStart(2, '0') === numStr) || currentAffinityBlocks[activeBlockIndex || 0] || {};
    const camp = currentBlock.campaign || (currentBlock.campaigns && currentBlock.campaigns[0]) || {};
    const title = currentBlock.title || camp.title || `Minissérie #${numStr}`;

    let context = '';
    if (camp.topic && typeof camp.topic === 'object' && camp.topic.description) {
      context = camp.topic.description;
    } else if (camp.topic && typeof camp.topic === 'string') {
      context = camp.topic;
    } else if (camp.description) {
      context = camp.description;
    } else {
      context = title;
    }

    const gptScenes = Array.isArray(camp.gptScenes) && camp.gptScenes.length
      ? camp.gptScenes.slice(0, 10)
      : (Array.isArray(camp.scenes) ? camp.scenes.slice(0, 10) : []);

    const res = await fetch('/api/generate-scenes50', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        context,
        gptScenes,
        campaignNum: numStr,
        campaignId: camp.id
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao gerar 40 prompts complementares');

    const queueUrl = `/minisseries/${numStr}/prompts/50_prompts_esteira_chatgpt_${numStr}.txt?t=${Date.now()}`;
    const promptUrl = `/minisseries/${numStr}/prompts/50_prompts_minisserie_${numStr}.txt?t=${Date.now()}`;

    let promptText = '';
    try {
      const fetchQueue = await fetch(queueUrl);
      if (fetchQueue.ok) {
        promptText = await fetchQueue.text();
      } else {
        const fetchFallback = await fetch(promptUrl);
        if (fetchFallback.ok) promptText = await fetchFallback.text();
      }
    } catch (_) {}

    if (!promptText && data.scenes) {
      promptText = data.scenes.map(s => `IMAGEM COMPLEMENTAR #${String(s.index).padStart(2, '0')} [GPT CENA ${s.gptSceneRef}] [BLOCO ${s.block}] [POSIÇÃO ${s.positionInBlock}]\nPrompt: ${s.prompt}\n`).join('\n----------------------------------------\n\n');
    }

    if (ta) ta.value = promptText || '40 prompts gerados com sucesso!';
    if (btn) btn.innerText = '✨ REGERAR 40 PROMPTS (MISTRAL)';
  } catch (err) {
    alert('Erro ao gerar 40 prompts: ' + err.message);
    if (ta) ta.value = 'Erro: ' + err.message;
  } finally {
    if (loader) loader.style.display = 'none';
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  }
};

// ---------------------------------------------------------
// 🖼️ SUB-MENU FASE 2: GERAÇÃO E VISUALIZAÇÃO DE IMAGENS
// ---------------------------------------------------------
const DOC_THUMB_DB_NAME = 'vortex-miniseries-thumbnails-v1';
const DOC_THUMB_STORE = 'thumbnails';

function openDocThumbnailDatabase() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  if (window.docThumbnailDatabasePromise) return window.docThumbnailDatabasePromise;

  window.docThumbnailDatabasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DOC_THUMB_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DOC_THUMB_STORE)) {
        const store = database.createObjectStore(DOC_THUMB_STORE, { keyPath: 'key' });
        store.createIndex('source', 'source', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(() => null);

  return window.docThumbnailDatabasePromise;
}

async function readDocThumbnail(key) {
  const database = await openDocThumbnailDatabase();
  if (!database) return null;
  return new Promise(resolve => {
    const request = database.transaction(DOC_THUMB_STORE, 'readonly').objectStore(DOC_THUMB_STORE).get(key);
    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => resolve(null);
  });
}

async function writeDocThumbnail(record) {
  const database = await openDocThumbnailDatabase();
  if (!database) return;
  await new Promise(resolve => {
    const transaction = database.transaction(DOC_THUMB_STORE, 'readwrite');
    transaction.objectStore(DOC_THUMB_STORE).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

async function createDocThumbnail(sourceUrl) {
  const response = await fetch(sourceUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error('Imagem indisponivel');
  const sourceBlob = await response.blob();
  const bitmap = await createImageBitmap(sourceBlob);
  const width = 360;
  const height = 203;
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (bitmap.width - sourceWidth) / 2;
  const sourceY = (bitmap.height - sourceHeight) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d', { alpha: false }).drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height
  );
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Miniatura indisponivel')), 'image/webp', 0.8);
  });
}

window.docThumbnailObjectUrls = window.docThumbnailObjectUrls || new Set();
window.releaseDocThumbnailObjectUrls = function() {
  for (const objectUrl of window.docThumbnailObjectUrls) URL.revokeObjectURL(objectUrl);
  window.docThumbnailObjectUrls.clear();
};

function showDocThumbnail(image, blob, cacheKey) {
  if (!image.isConnected || image.dataset.docThumbKey !== cacheKey) return;
  if (image.dataset.docThumbObjectUrl) {
    URL.revokeObjectURL(image.dataset.docThumbObjectUrl);
    window.docThumbnailObjectUrls.delete(image.dataset.docThumbObjectUrl);
  }
  const objectUrl = URL.createObjectURL(blob);
  window.docThumbnailObjectUrls.add(objectUrl);
  image.dataset.docThumbObjectUrl = objectUrl;
  image.src = objectUrl;
  image.style.opacity = '1';
  image.dataset.docThumbPresent = '1';
  image.dataset.docThumbReady = '1';
}

window.hydrateDocPhase2Thumbnails = async function(docNum, campaignNum) {
  const block = document.getElementById('phase2-block-M' + campaignNum);
  if (!block) return;
  const loadToken = `${docNum}-${campaignNum}-${Date.now()}`;
  block.dataset.docThumbLoadToken = loadToken;

  let manifest;
  try {
    const response = await fetch(`/api/minisseries/image-manifest?docNum=${encodeURIComponent(docNum)}&campaignNum=${encodeURIComponent(campaignNum)}`, { cache: 'no-store' });
    if (!response.ok) return;
    manifest = await response.json();
  } catch (_) {
    return;
  }
  if (!block.isConnected || block.dataset.docThumbLoadToken !== loadToken) return;

  const entriesBySequence = new Map((manifest.entries || []).map(entry => [Number(entry.sequence), entry]));
  const images = Array.from(block.querySelectorAll('img[data-doc-thumb-sequence]'));
  for (const image of images) {
    const entry = entriesBySequence.get(Number(image.dataset.docThumbSequence));
    if (!entry) {
      if (image.dataset.docThumbObjectUrl) {
        URL.revokeObjectURL(image.dataset.docThumbObjectUrl);
        window.docThumbnailObjectUrls.delete(image.dataset.docThumbObjectUrl);
        delete image.dataset.docThumbObjectUrl;
      }
      image.removeAttribute('src');
      image.style.opacity = '0';
      image.dataset.docThumbKey = '';
      image.dataset.docThumbReady = '0';
      image.dataset.docThumbPresent = '0';
      continue;
    }
    image.dataset.docThumbPresent = '1';
    const nextKey = `${entry.url}|${entry.version}`;
    image.dataset.docThumbReady = image.dataset.docThumbKey === nextKey && image.hasAttribute('src') ? '1' : '0';
    image.dataset.docThumbKey = nextKey;
  }

  const entries = Array.from(entriesBySequence.values());
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < entries.length) {
      const entry = entries[nextIndex++];
      const image = block.querySelector(`img[data-doc-thumb-sequence="${entry.sequence}"]`);
      if (!image || !image.isConnected) continue;
      const cacheKey = `${entry.url}|${entry.version}`;
      if (image.dataset.docThumbReady === '1' && image.dataset.docThumbKey === cacheKey) continue;
      const versionedUrl = `${entry.url}?v=${encodeURIComponent(entry.version)}`;
      try {
        let blob = await readDocThumbnail(cacheKey);
        if (!blob) {
          blob = await createDocThumbnail(versionedUrl);
          await writeDocThumbnail({ key: cacheKey, source: entry.url, version: entry.version, blob, savedAt: Date.now() });
        }
        showDocThumbnail(image, blob, cacheKey);
      } catch (_) {
        if (image.isConnected && image.dataset.docThumbKey === cacheKey) {
          image.src = versionedUrl;
          image.style.opacity = '1';
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, entries.length) }, worker));
};

window.switchPhase2Tab = function(targetCNum) {
  // Hide all blocks
  document.querySelectorAll('.phase2-miniseries-block').forEach(el => el.style.display = 'none');
  // Show target block
  const targetBlock = document.getElementById('phase2-block-M' + targetCNum);
  if (targetBlock) targetBlock.style.display = 'flex';
  
  // Update button styles
  document.querySelectorAll('.phase2-tab-btn').forEach(btn => {
    btn.style.border = '1px solid rgba(255,255,255,0.1)';
    btn.style.background = 'rgba(0,0,0,0.4)';
    btn.style.color = 'rgba(255,255,255,0.6)';
    btn.style.boxShadow = 'none';
  });
  const targetBtn = document.getElementById('tabBtnM' + targetCNum);
  if (targetBtn) {
    targetBtn.style.border = '1px solid var(--cyan)';
    targetBtn.style.background = 'rgba(0,174,239,0.15)';
    targetBtn.style.color = '#fff';
    targetBtn.style.boxShadow = '0 0 15px rgba(0,174,239,0.3)';
  }
  const currentBlock = activeBlockIndex === null ? null : currentAffinityBlocks[activeBlockIndex];
  if (currentBlock && typeof window.hydrateDocPhase2Thumbnails === 'function') {
    void window.hydrateDocPhase2Thumbnails(currentBlock.numDisplay, targetCNum);
  }
};

window.openDocPhase2Submenu = function(targetCNum = null) {
  if (activeBlockIndex === null && currentAffinityBlocks.length > 0) {
    activeBlockIndex = 0;
    window.activeBlockIndex = 0;
  }
  if (activeBlockIndex === null) return;
  const currentBlock = currentAffinityBlocks[activeBlockIndex];
  if (!currentBlock) return;
  
  const detailsArea = document.getElementById('docDetailsArea');
  if (!detailsArea) return;
  
  const numDisplay = currentBlock.numDisplay;
  
  let html = `
    <div id="phase2Wrapper" style="padding: 10px 16px; display: flex; flex-direction: column; gap: 6px; height: 100%; box-sizing: border-box; overflow: hidden; animation: fadeIn 0.3s ease;">
      <style>
        #docDetailsArea { overflow: hidden !important; }
        .phase2-tab-btn {
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          display: block !important;
          max-width: 100% !important;
          height: 38px !important;
          line-height: 18px !important;
          box-sizing: border-box !important;
        }
        #docPhase2Header {
          min-height: 46px !important;
          max-height: 46px !important;
          height: 46px !important;
          box-sizing: border-box !important;
        }
      </style>
      <!-- Cabeçalho Sub-menu -->
      <div id="docPhase2Header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,174,239,0.2); padding-bottom: 6px; margin-bottom: 2px; min-height: 46px; max-height: 46px; height: 46px; box-sizing: border-box;">
        <div style="display: flex; gap: 12px; align-items: center; min-width: 0; flex: 1; overflow: hidden;">
          <div style="display: flex; gap: 10px; min-width: 0; flex: 1; overflow: hidden;">
            ${currentBlock.campaigns.map(c => {
              const cN = String(c.number || (typeof c.id === 'string' ? (c.id.match(/\d+/)||[1])[0] : c.id)).padStart(2, '0');
              const isActiveTab = targetCNum ? (cN === targetCNum) : (cN === String(currentBlock.campaigns[0].number || (typeof currentBlock.campaigns[0].id === 'string' ? (currentBlock.campaigns[0].id.match(/\d+/)||[1])[0] : currentBlock.campaigns[0].id)).padStart(2, '0'));
              const rawTitle = (c.title || 'Série').trim();
              const safeTitle = rawTitle.replace(/"/g, '&quot;');
              return `
                <button onclick="window.switchPhase2Tab('${cN}')" id="tabBtnM${cN}" class="phase2-tab-btn" title="M${cN} - ${safeTitle}" style="padding: 9px 18px; border-radius: 8px; font-weight: bold; font-size: 0.92rem; cursor: pointer; transition: all 0.2s; border: 1px solid ${isActiveTab ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}; background: ${isActiveTab ? 'rgba(0,174,239,0.15)' : 'rgba(0,0,0,0.4)'}; color: ${isActiveTab ? '#fff' : 'rgba(255,255,255,0.6)'}; box-shadow: ${isActiveTab ? '0 0 15px rgba(0,174,239,0.3)' : 'none'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-align: left; display: block; height: 38px; line-height: 18px; box-sizing: border-box;">
                  M${cN} - ${rawTitle}
                </button>
              `;
            }).join('')}
          </div>
        </div>
        <div style="display: flex; gap: 10px; flex-shrink: 0; align-items: center;">
          <button class="actionBtn" onclick="window.forceStopGeminiDocRobot()" style="padding: 10px 14px; background:rgba(255,0,0,0.15); color:#ff4d4d; border:1px solid rgba(255,0,0,0.3); border-radius:8px; font-weight:bold; font-size: 0.8rem; white-space: nowrap;">⏹ PARAR ROBÔ</button>
        </div>
      </div>

      <!-- Bloco da Minissérie Selecionada -->
      <div style="display: flex; flex-direction: column; gap: 0; flex: 1; min-height: 0; height: 100%;">
        ${
          currentBlock.campaigns
          .map((c, idx) => {
          const cNum = String(c.number || (typeof c.id === 'string' ? (c.id.match(/\d+/)||[1])[0] : c.id)).padStart(2, '0');
          // Descobre o idx global desta campanha no array original para calcular o startIdx (1 a 60)
          const globalCampIdx = currentBlock.campaigns.findIndex(camp => String(camp.number || (typeof camp.id === 'string' ? (camp.id.match(/\d+/)||[1])[0] : camp.id)).padStart(2, '0') === cNum);
          const startIdx = globalCampIdx * 20 + 1;
          
          const isTarget = targetCNum ? (cNum === targetCNum) : (idx === 0);
          
          let gridHTML = `<div style="display: grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(10, 1fr); gap: 6px 8px; margin-top: 8px; flex: 1; min-height: 0; box-sizing: border-box;">`;
          for (let i = 1; i <= 50; i++) {
            gridHTML += `
              <label class="vortex-crystal-slot" style="position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.18); transition: border-color 0.15s;" onclick="if(event.target.tagName !== 'INPUT'){ window.viewDocPhase2ImageSingle('${numDisplay}', '${cNum}', ${i}); }" onmouseover="this.style.borderColor='#00aeef';" onmouseout="if(!this.querySelector('input').checked){ this.style.borderColor='rgba(255,255,255,0.18)'; }">
                <input type="checkbox" class="gemini-img-check" value="${i}" data-cnum="${cNum}" style="position: absolute; top: 3px; left: 3px; z-index: 10; width: 13px; height: 13px; accent-color: var(--cyan); cursor: pointer;" onchange="this.parentElement.style.borderColor = this.checked ? '#00aeef' : 'rgba(255,255,255,0.18)'">
                <div style="position: absolute; bottom: 2px; right: 4px; z-index: 12; background: rgba(0,0,0,0.85); color: #ffffff; font-size: 0.7rem; padding: 1px 5px; border-radius: 4px; font-weight: 900; font-family: var(--uiRounded); border: 1px solid rgba(0,174,239,0.4); text-shadow: 0 1px 2px #000; pointer-events: none;">${i}</div>
                <img data-doc-thumb-sequence="${i}" alt="Imagem ${i}" decoding="async" style="width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0; transition: opacity 0.2s;">
              </label>
            `;
          }
          gridHTML += `</div>`;

          return `
            <div id="phase2-block-M${cNum}" data-doc-num="${numDisplay}" data-campaign-num="${cNum}" class="phase2-miniseries-block" style="display: ${isTarget ? 'flex' : 'none'}; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 8px 12px; flex-direction: column; flex: 1; height: 100%; min-height: 0; box-sizing: border-box;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
                <div style="display: flex; align-items: center; margin-right: 30px;">
                  <div style="display: flex; gap: 6px;">
                    <button class="actionBtn" onclick="window.selectRobotBatch('phase2-block-M${cNum}', 'gpt')" style="padding: 4px 12px; font-size: 0.75rem; font-weight:bold; background: rgba(0,255,0,0.1); color: #0f0; border: 1px solid rgba(0,255,0,0.4); border-radius: 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(0,255,0,0.2)'" onmouseout="this.style.background='rgba(0,255,0,0.1)'">🟢 GPT</button>
                    <button class="actionBtn" onclick="window.selectRobotBatch('phase2-block-M${cNum}', 'gemini')" style="padding: 4px 12px; font-size: 0.75rem; font-weight:bold; background: rgba(0,174,239,0.1); color: var(--cyan); border: 1px solid var(--cyan); border-radius: 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(0,174,239,0.2)'" onmouseout="this.style.background='rgba(0,174,239,0.1)'">🔵 GEMINI</button>
                  </div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                  <button class="actionBtn" onclick="window.openDocPromptsModal('${cNum}')" style="padding: 8px 16px; background: linear-gradient(135deg, rgba(0,174,239,0.35), rgba(236,0,140,0.35)); color: #fff; border: 1px solid var(--cyan); border-radius: 8px; font-size: 0.85rem; font-weight: 800; cursor: pointer; box-shadow: 0 0 12px rgba(0,174,239,0.4); display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;" onmouseover="this.style.boxShadow='0 0 18px rgba(0,174,239,0.8)'; this.style.transform='translateY(-1px)';" onmouseout="this.style.boxShadow='0 0 12px rgba(0,174,239,0.4)'; this.style.transform='none';">✨ GERAR 40 PROMPTS</button>
                  <button class="actionBtn" onclick="window.deleteSelectedDocPhase2Images('phase2-block-M${cNum}', '${numDisplay}', '${cNum}')" style="padding: 10px 16px; background: rgba(255,0,0,0.12); color: #ff6b6b; border: 1px solid rgba(255,0,0,0.35); border-radius: 8px; font-size: 0.85rem; font-weight: bold; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,0,0,0.22)'" onmouseout="this.style.background='rgba(255,0,0,0.12)'">🗑️ DELETAR MARCADAS</button>
                  <button class="actionBtn" onclick="window.markEmptyDocPhase2Checkboxes('phase2-block-M${cNum}')" style="padding: 10px 16px; background: rgba(0,174,239,0.12); color: var(--cyan); border: 1px solid rgba(0,174,239,0.45); border-radius: 8px; font-size: 0.85rem; font-weight: bold; cursor: pointer;">□ MARCAR VAZIAS</button>
                  <button class="actionBtn" onclick="window.viewDocPhase2Images('${numDisplay}', '${cNum}', ${startIdx})" style="padding: 10px 16px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; font-size: 0.85rem; font-weight: bold; cursor: pointer;">🖼️ VISUALIZAR A TELA CHEIA</button>
                  <button class="actionBtn" onclick="window.startGeminiDocMiniseries('${cNum}')" style="padding: 10px 16px; font-size: 0.85rem; font-weight:bold; background: rgba(0,174,239,0.15); color: var(--cyan); border: 1px solid rgba(0,174,239,0.4); border-radius: 8px;">🤖 INICIAR ROBÔ M${cNum}</button>
                  <button class="actionBtn rescueBtn" onclick="window.rescueDocVisualRobot('${cNum}')" style="padding: 10px 16px; font-size: 0.85rem; font-weight:bold; background: rgba(0,255,0,0.15); color: #0f0; border: 1px solid rgba(0,255,0,0.4); border-radius: 8px;">📥 RESGATE</button>
                </div>
              </div>
              ${gridHTML}
            </div>
          `;
        }).join('')
        }
      </div>
    </div>
  `;
  detailsArea.innerHTML = html;
  
  if (!window.selectRobotBatch) {
    window.selectRobotBatch = function(blockId, robot) {
      const block = document.getElementById(blockId);
      if (!block) return;
      const checkboxes = block.querySelectorAll('.gemini-img-check');
      const gptSet = new Set([1, 6, 11, 16, 21, 26, 31, 36, 41, 46]);
      const geminiSet = new Set([2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 15, 17, 18, 19, 20, 22, 23, 24, 25, 27, 28, 29, 30, 32, 33, 34, 35, 37, 38, 39, 40, 42, 43, 44, 45, 47, 48, 49, 50]);
      let targetSet;
      if (robot === 'gpt') targetSet = gptSet;
      if (robot === 'gemini') targetSet = geminiSet;
      checkboxes.forEach(cb => {
        const val = Number(cb.value);
        cb.checked = targetSet.has(val);
        if (cb.onchange) cb.onchange();
      });
    };
  }

  if (typeof window.mountDocVisualRobotSwitcher === 'function') {
    window.mountDocVisualRobotSwitcher(numDisplay);
  }
  const firstCampaign = currentBlock.campaigns[0];
  const initialCampaign = targetCNum || String(firstCampaign.number || (typeof firstCampaign.id === 'string' ? (firstCampaign.id.match(/\d+/)||[1])[0] : firstCampaign.id)).padStart(2, '0');
  if (typeof window.hydrateDocPhase2Thumbnails === 'function') {
    void window.hydrateDocPhase2Thumbnails(numDisplay, initialCampaign);
  }
};

window.renderDocEsteiraDirect = window.openDocPhase2Submenu;

window.startGeminiDocFromSubmenu = function() {
  const btn = document.getElementById('btnStartGeminiDocSub');
  if (btn) {
    btn.innerHTML = '⏳ ACIONANDO...';
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.6';
  }
  // Se clicar no botão global, e não houver checkbox selecionado, marca TODOS.
  const allCheckboxes = document.querySelectorAll('.gemini-img-check');
  let hasChecked = Array.from(allCheckboxes).some(cb => cb.checked);
  if (!hasChecked) {
    allCheckboxes.forEach(cb => cb.checked = true);
  }
  handleStartGeminiDocRobot();
};

window.startGeminiDocMiniseries = function(cNum) {
  const block = document.getElementById('phase2-block-M' + cNum);
  if (!block) return;
  const checkboxes = block.querySelectorAll('.gemini-img-check:checked');
  if (checkboxes.length === 0) {
    // Se nenhum estiver marcado, marca todos do bloco M
    const allInBlock = block.querySelectorAll('.gemini-img-check');
    allInBlock.forEach(cb => cb.checked = true);
  }
  // Envia apenas os selecionados DESTE bloco (ou todos do bloco se nenhum estava marcado)
  handleStartGeminiDocRobot(block.querySelectorAll('.gemini-img-check:checked'));
};

window.toggleDocPhase2Checkboxes = function(blockId) {
  const block = document.getElementById(blockId);
  if (!block) return;
  const checkboxes = block.querySelectorAll('.gemini-img-check');
  if (checkboxes.length === 0) return;
  
  let allChecked = true;
  checkboxes.forEach(cb => { if (!cb.checked) allChecked = false; });
  
  const targetState = !allChecked;
  checkboxes.forEach(cb => {
    cb.checked = targetState;
    cb.parentElement.style.borderColor = targetState ? 'var(--cyan)' : 'transparent';
  });
};

window.deleteSelectedDocPhase2Images = async function(blockId, docNum, campaignNum) {
  const block = document.getElementById(blockId);
  if (!block) return;

  const checkedBoxes = Array.from(block.querySelectorAll('.gemini-img-check:checked'));
  if (checkedBoxes.length === 0) {
    alert('Nenhuma imagem marcada para exclusão. Marque as miniaturas que deseja excluir e clique novamente em DELETAR MARCADAS.');
    return;
  }

  const sequences = [];
  checkedBoxes.forEach(cb => {
    const seq = parseInt(cb.value, 10);
    if (!isNaN(seq) && seq >= 1 && seq <= 50) {
      sequences.push(seq);
    }
  });

  if (sequences.length === 0) {
    alert('Nenhuma sequência válida selecionada.');
    return;
  }

  const sortedSeq = [...sequences].sort((a, b) => a - b);
  const formattedList = sortedSeq.length <= 10
    ? sortedSeq.map(s => String(s).padStart(2, '0')).join(', ')
    : `${sortedSeq.slice(0, 8).map(s => String(s).padStart(2, '0')).join(', ')}... (+${sortedSeq.length - 8})`;

  const confirmMsg = `Deseja realmente deletar as ${sortedSeq.length} imagem(ns) marcada(s) da Minissérie #${campaignNum}?\n\nPosições: [ ${formattedList} ]\n\nEssa ação apagará os arquivos físicos do disco e as posições ficarão vazias para nova geração com o robô.`;
  if (!confirm(confirmMsg)) {
    return;
  }

  try {
    const response = await fetch('/api/minisseries/delete-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docNum: String(docNum).padStart(2, '0'),
        campaignNum: String(campaignNum).padStart(2, '0'),
        sequences: sortedSeq
      })
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Falha ao deletar imagens no servidor.');
    }

    // Desmarca os checkboxes e reseta as bordas
    checkedBoxes.forEach(cb => {
      cb.checked = false;
      if (cb.parentElement) {
        cb.parentElement.style.borderColor = 'rgba(255,255,255,0.18)';
      }
    });

    // Invalida cache de thumbnails e re-hidrata a grade imediatamente
    window.docImageCacheKey = Date.now();
    if (typeof window.hydrateDocPhase2Thumbnails === 'function') {
      await window.hydrateDocPhase2Thumbnails(docNum, campaignNum);
    }

    // Atualiza contadores e estado do card se houver função de sincronização
    if (typeof window.updateCampaignCardProgress === 'function') {
      window.updateCampaignCardProgress(docNum, campaignNum);
    }

    console.log(`[DELETE IMAGES] ${result.deletedCount || sortedSeq.length} imagens excluídas com sucesso.`);
  } catch (err) {
    console.error('[DELETE IMAGES] Erro:', err);
    alert('Erro ao excluir imagens: ' + (err.message || err));
  }
};

window.markEmptyDocPhase2Checkboxes = function(blockId) {
  const block = document.getElementById(blockId);
  if (!block) return;
  block.querySelectorAll('.gemini-img-check').forEach(checkbox => {
    const image = checkbox.parentElement.querySelector('img[data-doc-thumb-sequence]');
    const isEmpty = !image || image.dataset.docThumbPresent !== '1';
    checkbox.checked = isEmpty;
    checkbox.parentElement.style.borderColor = isEmpty ? 'var(--cyan)' : 'transparent';
  });
};

window.viewDocPhase2Images = function(docNum, cNum, startIdx) {
  const images = [];
  const mFolderStr = String(cNum).padStart(2, '0');
  window.docImageCacheKey = window.docImageCacheKey || Date.now();
  for (let i = 1; i <= 50; i++) {
    images.push(`/minisseries/${docNum}/M${mFolderStr}/img_${String(i).padStart(3, '0')}.jpg?t=${window.docImageCacheKey}`);
  }
  
  window.openDocImageModal(images, 0, 1, 50);
};

window.viewDocPhase2ImageSingle = function(docNum, cNum, imgNumber) {
  const images = [];
  const mFolderStr = String(cNum).padStart(2, '0');
  window.docImageCacheKey = window.docImageCacheKey || Date.now();
  for (let i = 1; i <= 50; i++) {
    images.push(`/minisseries/${docNum}/M${mFolderStr}/img_${String(i).padStart(3, '0')}.jpg?t=${window.docImageCacheKey}`);
  }
  const targetIndex = Math.max(0, imgNumber - 1);
  window.openDocImageModal(images, targetIndex, 1, 50);
};



// 🔍 Visualizador de Imagens HD em Tela Cheia (Slideshow / Carrossel com Setas ◀ ▶)
window.currentDocModalImages = [];
window.currentDocModalIndex = 0;
window.currentDocModalStartIdx = 1;
window.currentDocModalTotal = 60;

window.openDocImageModal = function(images, index = 0, startIdx = 1, totalGlobal = null) {
  if (!images || images.length === 0) return;
  window.currentDocModalImages = Array.isArray(images) ? images : [images];
  window.currentDocModalIndex = Math.max(0, Math.min(index, window.currentDocModalImages.length - 1));
  window.currentDocModalStartIdx = startIdx;
  window.currentDocModalTotal = totalGlobal || window.currentDocModalImages.length;

  let modal = document.getElementById('docImageLightboxModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'docImageLightboxModal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.94); z-index:100000; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter:blur(10px); padding:20px; box-sizing:border-box; user-select:none;';
    modal.innerHTML = `
      <!-- Botão Fechar ✕ posicionado em top: 80px; right: 35px (Abaixo da Topbar, 100% livre e clicável) -->
      <button style="position:fixed; top:80px; right:35px; cursor:pointer; color:#fff; font-size:1.6rem; font-weight:bold; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.35); width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:100002; backdrop-filter:blur(8px); box-shadow:0 4px 20px rgba(0,0,0,0.6); transition:all 0.2s ease;" onclick="window.closeDocImageModal()" onmouseover="this.style.background='var(--brandGrad)'; this.style.borderColor='transparent';" onmouseout="this.style.background='rgba(255,255,255,0.18)'; this.style.borderColor='rgba(255,255,255,0.35)';">✕</button>

      <!-- Seta Esquerda ◀ -->
      <button id="docImageLightboxPrev" style="position:fixed; left:30px; top:50%; transform:translateY(-50%); cursor:pointer; color:#fff; font-size:2rem; background:rgba(0,174,239,0.25); border:1px solid var(--cyan); width:58px; height:58px; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:100001; backdrop-filter:blur(6px); transition:all 0.2s ease; box-shadow:0 0 20px rgba(0,174,239,0.4);" onclick="window.navDocImageModal(-1)" onmouseover="this.style.background='var(--brandGrad)'; this.style.transform='translateY(-50%) scale(1.1)';" onmouseout="this.style.background='rgba(0,174,239,0.25)'; this.style.transform='translateY(-50%) scale(1)';">◀</button>

      <!-- Foto HD Central Ampliada -->
      <img id="docImageLightboxImg" src="" onerror="if(this.src.includes('.jpg')){ this.src=this.src.replace('.jpg', '.png'); }" style="max-width:85vw; max-height:80vh; border-radius:14px; box-shadow:0 12px 40px rgba(0,174,239,0.45); border:2px solid var(--cyan); object-fit:contain; transition:all 0.3s ease;">

      <!-- Seta Direita ▶ -->
      <button id="docImageLightboxNext" style="position:fixed; right:30px; top:50%; transform:translateY(-50%); cursor:pointer; color:#fff; font-size:2rem; background:rgba(0,174,239,0.25); border:1px solid var(--cyan); width:58px; height:58px; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:100001; backdrop-filter:blur(6px); transition:all 0.2s ease; box-shadow:0 0 20px rgba(0,174,239,0.4);" onclick="window.navDocImageModal(1)" onmouseover="this.style.background='var(--brandGrad)'; this.style.transform='translateY(-50%) scale(1.1)';" onmouseout="this.style.background='rgba(0,174,239,0.25)'; this.style.transform='translateY(-50%) scale(1)';">▶</button>

      <!-- Rodapé Contador de Fotos -->
      <div id="docImageLightboxCounter" style="position:fixed; bottom:25px; background:rgba(10,15,30,0.85); border:1px solid rgba(0,174,239,0.4); padding:8px 22px; border-radius:20px; color:#fff; font-family:var(--uiRounded); font-weight:bold; font-size:0.95rem; box-shadow:0 4px 15px rgba(0,0,0,0.6); z-index:100001;"></div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) window.closeDocImageModal();
    });

    window.addEventListener('keydown', (e) => {
      if (modal.style.display !== 'none') {
        if (e.key === 'ArrowLeft') window.navDocImageModal(-1);
        if (e.key === 'ArrowRight') window.navDocImageModal(1);
      }
    });
  }

  window.updateDocImageModalView();
  modal.style.display = 'flex';
};

window.navDocImageModal = function(dir) {
  if (!window.currentDocModalImages || window.currentDocModalImages.length === 0) return;
  const total = window.currentDocModalImages.length;
  window.currentDocModalIndex = (window.currentDocModalIndex + dir + total) % total;
  window.updateDocImageModalView();
};

window.updateDocImageModalView = function() {
  const imgEl = document.getElementById('docImageLightboxImg');
  const counterEl = document.getElementById('docImageLightboxCounter');
  const images = window.currentDocModalImages || [];
  const idx = window.currentDocModalIndex || 0;
  const startIdx = window.currentDocModalStartIdx || 1;
  const total = window.currentDocModalTotal || images.length;

  if (imgEl && images[idx]) {
    imgEl.src = images[idx];
  }
  if (counterEl) {
    const globalFotoNum = startIdx + idx;
    counterEl.innerHTML = `🖼️ Foto <span style="color:var(--cyan);">${globalFotoNum}</span> de <span style="color:var(--cyan);">${total}</span>`;
  }
};

window.closeDocImageModal = function() {
  const modal = document.getElementById('docImageLightboxModal');
  if (modal) modal.style.display = 'none';
};




window.docAudioPlayer = null;
window.activeAudioBtn = null;

window.previewDocMp3 = function(cNum, fileName) {
  const selected = fileName || userSelectedDocMp3s[cNum];
  if (!selected) {
    alert("Por favor, selecione uma trilha no menu suspenso primeiro.");
    return;
  }

  const numStr = String(cNum).padStart(2, '0');
  const cleanName = selected.trim();
  const btn = window.event ? window.event.target : null;

  if (window.docAudioPlayer) {
    const isSame = window.docAudioPlayer.src.includes(encodeURIComponent(cleanName));
    window.docAudioPlayer.pause();
    window.docAudioPlayer = null;
    if (window.activeAudioBtn) {
      window.activeAudioBtn.innerText = '▶ TOCAR MP3';
      window.activeAudioBtn.style.background = 'rgba(255,255,255,0.1)';
      window.activeAudioBtn.style.color = '#fff';
      window.activeAudioBtn = null;
    }
    if (isSame) return; // Se era a mesma música, apenas pausa
  }

  const audioUrl = `/minisseries/${numStr}/sonoplastia/m4a/${encodeURIComponent(cleanName)}`;
  const player = new Audio(audioUrl);
  window.docAudioPlayer = player;
  if (btn) window.activeAudioBtn = btn;

  if (btn) {
    btn.innerText = '⏸ PAUSAR ÁUDIO';
    btn.style.background = '#00ff66';
    btn.style.color = '#000';
  }

  const resetBtn = () => {
    if (btn) {
      btn.innerText = '▶ TOCAR MP3';
      btn.style.background = 'rgba(255,255,255,0.1)';
      btn.style.color = '#fff';
    }
    window.docAudioPlayer = null;
    window.activeAudioBtn = null;
  };

  player.onended = resetBtn;
  player.onpause = resetBtn;

  player.play().catch(err => {
    console.warn("Tentando rota estática alternativa para áudio...", err);
    const fallbackUrl = `/api/file?path=${encodeURIComponent('minisseries/' + numStr + '/sonoplastia/m4a/' + cleanName)}`;
    const fallbackPlayer = new Audio(fallbackUrl);
    window.docAudioPlayer = fallbackPlayer;
    fallbackPlayer.onended = resetBtn;
    fallbackPlayer.onpause = resetBtn;
    fallbackPlayer.play().catch(e => {
      resetBtn();
      alert(`Não foi possível reproduzir a trilha "${cleanName}". Verifique se o arquivo está na pasta /minisseries/${numStr}/sonoplastia/m4a/.`);
    });
  });
};



// ==========================================
// 🚀 ACERVO DE VÍDEOS FINAIS & TAB LOGIC
// ==========================================

window.activeAcervoBlockIndex = null;

window.switchDocTab = async function(tabName) {
  window.activeDocTab = tabName;
  const btnEsteira = document.getElementById('btnTabDocEsteira');
  const btnAcervo = document.getElementById('btnTabDocAcervo');

  if (btnEsteira && btnAcervo) {
    if (tabName === 'esteira') {
      btnEsteira.style.background = 'var(--brandGrad)';
      btnEsteira.style.border = '1px solid transparent';
      btnEsteira.style.color = '#fff';
      
      btnAcervo.style.background = 'rgba(255,255,255,0.06)';
      btnAcervo.style.border = '1px solid rgba(255,255,255,0.18)';
      btnAcervo.style.color = 'rgba(255,255,255,0.8)';
    } else {
      btnAcervo.style.background = 'linear-gradient(135deg, #00ff66, #00cc66)';
      btnAcervo.style.border = '1px solid transparent';
      btnAcervo.style.color = '#000';
      
      btnEsteira.style.background = 'rgba(255,255,255,0.06)';
      btnEsteira.style.border = '1px solid rgba(255,255,255,0.18)';
      btnEsteira.style.color = 'rgba(255,255,255,0.8)';

      if (typeof fetchDocumentaries === 'function') {
        await fetchDocumentaries();
      }
    }
  }
  
  activeBlockIndex = null;
  window.activeBlockIndex = null;
  window.activeAcervoBlockIndex = null;
  if (typeof window.renderDocumentariosWorkspace === 'function') {
      window.renderDocumentariosWorkspace();
  } else {
      renderDocumentariosWorkspace();
  }
};

window.openExpandedDocCard = function(idx) {
  activeBlockIndex = idx;
  window.activeBlockIndex = idx;
  if (typeof window.renderDocumentariosWorkspace === 'function') {
      window.renderDocumentariosWorkspace();
  } else {
      renderDocumentariosWorkspace();
  }
};

window.closeExpandedDocCard = function() {
  activeBlockIndex = null;
  window.activeBlockIndex = null;
  if (typeof window.renderDocumentariosWorkspace === 'function') {
      window.renderDocumentariosWorkspace();
  } else {
      renderDocumentariosWorkspace();
  }
};

window.openAcervoDocCard = function(idx) {
  window.activeAcervoBlockIndex = idx;
  if (typeof window.renderDocumentariosWorkspace === 'function') {
      window.renderDocumentariosWorkspace();
  } else {
      renderDocumentariosWorkspace();
  }
};

window.renderAcervoExpandedCard = function() {
  let docs = AppState.documentaries || [];
  const doc = docs[window.activeAcervoBlockIndex];
  if (!doc) {
    return `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px; text-align: center;">
        <div style="font-size: 4rem; margin-bottom: 20px;">🎥</div>
        <h2 style="color: #00ff66; margin-bottom: 10px; font-family: var(--uiRounded);">Selecione uma Minissérie do Acervo</h2>
        <p style="color: rgba(255,255,255,0.7); max-width: 400px; margin-bottom: 30px; font-size: 0.95rem;">
          Escolha uma minissérie à esquerda para renderizar ou assistir ao vídeo final existente.
        </p>
      </div>
    `;
  }

  const docNumStr = String(doc.docNumStr || doc.docId || doc.docFolder || '14').padStart(2, '0');
  const titleStr = doc.title || doc.subtitle || `Minissérie #${docNumStr}`;
  const encodedDocFolder = encodeURIComponent(docNumStr);
  const posterCandidates = [
    `/minisseries/${encodedDocFolder}/M${encodedDocFolder}/img_001.jpg`,
    `/minisseries/${encodedDocFolder}/M${encodedDocFolder}/img_001.jpeg`,
    `/minisseries/${encodedDocFolder}/M${encodedDocFolder}/img_001.png`,
    `/minisseries/${encodedDocFolder}/M${encodedDocFolder}/img_001.webp`
  ];
  const encodedPosterCandidates = encodeURIComponent(JSON.stringify(posterCandidates));
  const isRendering = window.activeFinalRenderCampaign === docNumStr;
  const missingItems = Array.isArray(doc.missing) ? doc.missing : [];
  const renderButtonLabel = doc.finalized ? '♻️ RENDERIZAR NOVAMENTE' : '⚡ RENDERIZAR VÍDEO FINAL';
  const renderButtonDisabled = !doc.ready || isRendering;

  const playerContent = isRendering
    ? `
      <div class="final-render-stage" role="status" aria-live="polite">
        <div class="final-render-grid"></div>
        <div class="final-render-orbit final-render-orbit-a"></div>
        <div class="final-render-orbit final-render-orbit-b"></div>
        <div class="final-render-node final-render-node-a"><strong>M4A</strong><small>TRILHA</small></div>
        <div class="final-render-node final-render-node-b"><strong>ASS</strong><small>LEGENDA</small></div>
        <div class="final-render-node final-render-node-c"><strong>${doc.imageCount}</strong><small>IMAGENS</small></div>
        <div class="final-render-core"><span>🎬</span><strong>MP4</strong></div>
        <div class="final-render-copy">
          <h2>INVOCANDO MOTORES IA</h2>
          <div class="final-render-status-dot"></div>
          <p>Distribuindo ${doc.imageCount} imagens, mixando os três áudios e queimando a legenda dançante.</p>
          <small>O M4A governa a duração final. Não feche a Central.</small>
        </div>
      </div>
    `
    : (doc.finalized && doc.videoUrl
      ? `<video controls preload="metadata" src="${doc.videoUrl}?v=${doc.modifiedAt || Date.now()}" style="width:100%; height:100%; object-fit:contain; background:transparent;" aria-label="Vídeo final da minissérie ${docNumStr}"></video>`
      : `
        <img src="${posterCandidates[0]}" data-poster-candidates="${encodedPosterCandidates}" data-poster-index="0" onerror="window.tryNextAcervoPoster(this)" alt="Imagem inicial de ${titleStr}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; opacity:0.34; filter:saturate(0.7);">
        <div style="position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; gap:12px; padding:28px;">
          <div style="font-size:3.2rem; filter:drop-shadow(0 0 18px rgba(0,174,239,0.7));">🎞️</div>
          <strong style="font-family:var(--uiRounded); color:#fff; font-size:1.25rem;">VÍDEO FINAL AINDA NÃO RENDERIZADO</strong>
          <span style="color:var(--cyan); font-weight:700;">${doc.imageCount || 0} imagens detectadas</span>
        </div>
      `);

  return `
    <div class="acervo-detail-shell" style="padding: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; animation: fadeIn 0.3s ease;">
      <div class="vortex-crystal-panel acervo-detail-card" style="max-width: 980px; width: 100%; border: 1px solid rgba(0,255,102,0.4); border-radius: 20px; overflow: hidden; padding: 24px; display: flex; flex-direction: column; gap: 18px;">
        
        <div class="acervo-detail-header" style="display:flex; justify-content:space-between; align-items:center; gap:18px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #00ff66; color: #000; font-weight: 900; padding: 6px 14px; border-radius: 8px; font-size: 1.1rem;">#${docNumStr}</div>
            <h3 style="margin: 0; color: #fff; font-family: var(--uiRounded); font-size: 1.4rem;">${titleStr}</h3>
          </div>
          <button class="actionBtn" id="btnRenderFinalMinisserie" onclick="window.startFinalMinisserieRender('${docNumStr}')" ${renderButtonDisabled ? 'disabled' : ''} style="padding:12px 20px; border-radius:10px; border:1px solid ${doc.ready ? 'rgba(0,255,102,0.6)' : 'rgba(255,255,255,0.15)'}; background:${doc.ready ? 'linear-gradient(135deg, rgba(0,174,239,0.9), rgba(0,210,106,0.9))' : 'rgba(255,255,255,0.06)'}; color:${doc.ready ? '#fff' : 'rgba(255,255,255,0.35)'}; font-weight:900; letter-spacing:.5px; cursor:${renderButtonDisabled ? 'not-allowed' : 'pointer'}; box-shadow:${doc.ready ? '0 0 22px rgba(0,210,106,0.24)' : 'none'}; white-space:nowrap;">
            ${isRendering ? '⏳ RENDERIZANDO...' : renderButtonLabel}
          </button>
        </div>

        <div id="acervoRenderStage" style="position:relative; width:100%; aspect-ratio:16/9; background:transparent; border-radius:14px; overflow:hidden; border:1px solid rgba(0,174,239,0.35); display:flex; align-items:center; justify-content:center; text-align:center; box-sizing:border-box; box-shadow:inset 0 0 50px rgba(0,0,0,0.5);">
          ${playerContent}
        </div>

        <!-- Seletor de Trilha Sonora M4A no Acervo -->
        <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; padding: 10px 14px; background: rgba(0, 210, 106, 0.04); border: 1px solid rgba(0, 210, 106, 0.3); border-radius: 12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color: #00ff66; font-size: 0.76rem; font-weight: 800; letter-spacing: 0.8px;">🎵 SELECIONE A TRILHA SONORA M4A PARA O VÍDEO FINAL:</span>
            <span style="font-size: 0.72rem; color: rgba(255,255,255,0.6);">${doc.m4aList ? doc.m4aList.length : 0} trilhas detectadas</span>
          </div>
          <select id="acervoM4ASelect" onchange="window.selectedAcervoM4AFile = this.value" style="width: 100%; padding: 8px 12px; background: rgba(10,15,30,0.95); border: 1px solid rgba(0,255,102,0.5); color: #00ff66; border-radius: 8px; font-size: 0.82rem; font-weight: bold; outline: none; cursor: pointer; box-shadow: 0 0 12px rgba(0,255,102,0.2);">
            ${doc.m4aList && doc.m4aList.length > 0 ? doc.m4aList.map((m, idx) => `
              <option value="${m.name}" ${idx === 0 ? 'selected' : ''}>
                🎵 ${m.name} ${m.hasAss ? '· (ASS: ✅ Pronto)' : '· (ASS: ⚠️ Ausente)'}
              </option>
            `).join('') : '<option value="">⚠️ Nenhum arquivo M4A em sonoplastia/m4a/</option>'}
          </select>
        </div>

        <div class="acervo-status-grid" style="display:flex; justify-content:space-between; align-items:flex-start; gap:20px; color:rgba(255,255,255,0.62); font-size:.88rem;">
          <div style="display:flex; flex-direction:column; gap:5px;">
            <span>🖼️ Imagens disponíveis: <strong style="color:#fff;">${doc.imageCount || 0}</strong></span>
            <span>🎵 M4A: <strong style="color:${doc.hasAudio ? '#00ff66' : '#ffb020'};">${doc.hasAudio ? 'encontrado' : 'ausente'}</strong> • ASS: <strong style="color:${doc.hasAss ? '#00ff66' : '#ffb020'};">${doc.hasAss ? 'encontrado' : 'ausente'}</strong></span>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
            ${doc.finalized ? `<span>📅 Renderizado em: ${doc.date}</span><span>📦 MP4 • ${doc.sizeMb}</span>` : '<span>📦 Nenhum MP4 final no disco</span>'}
            <span>📁 <strong style="color:var(--cyan);">/minisseries/video social/</strong></span>
          </div>
        </div>

        ${!doc.ready && missingItems.length > 0 ? `
          <div class="acervo-missing-panel" style="background:rgba(255,176,32,0.08); border:1px solid rgba(255,176,32,0.28); border-radius:10px; padding:11px 14px; color:#ffd27a; font-size:.82rem; line-height:1.5;">
            <strong>Para liberar a renderização:</strong>
            ${missingItems.map(item => `<span class="acervo-missing-chip">${item}</span>`).join('')}
          </div>
        ` : ''}

      </div>
    </div>
  `;
};

window.activeFinalRenderCampaign = window.activeFinalRenderCampaign || null;

window.startFinalMinisserieRender = async function(campaignNumber) {
  const number = String(campaignNumber).padStart(2, '0');
  const docs = AppState.documentaries || [];
  const doc = docs.find(item => String(item.docNumStr).padStart(2, '0') === number);
  if (!doc || !doc.ready || window.activeFinalRenderCampaign) return;

  if (doc.finalized) {
    const confirmed = confirm(`O vídeo final da minissérie #${number} já existe. Deseja renderizar novamente e substituí-lo somente depois que o novo MP4 for validado?`);
    if (!confirmed) return;
  }

  const selectedM4a = window.selectedAcervoM4AFile || (document.getElementById('acervoM4ASelect') ? document.getElementById('acervoM4ASelect').value : null);

  window.activeFinalRenderCampaign = number;
  window.anyJobRunning = true;
  renderDocumentariosWorkspace();

  try {
    const response = await fetch('/api/render-final-minisserie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignNum: number,
        m4aFile: selectedM4a || undefined,
        overwrite: doc.finalized === true
      })
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'A renderização final não foi concluída.');

    await fetchDocumentaries();
    window.activeAcervoBlockIndex = (AppState.documentaries || []).findIndex(item => String(item.docNumStr).padStart(2, '0') === number);
    if (typeof showToast === 'function') {
      showToast(`Vídeo final #${number} concluído com ${result.imageCount} imagens.`, 'success');
    }
  } catch (error) {
    await fetchDocumentaries();
    window.activeAcervoBlockIndex = (AppState.documentaries || []).findIndex(item => String(item.docNumStr).padStart(2, '0') === number);
    alert(`Renderização da minissérie #${number} interrompida: ${error.message}`);
  } finally {
    window.activeFinalRenderCampaign = null;
    window.anyJobRunning = false;
    renderDocumentariosWorkspace();
  }
};

window.tryNextAcervoPoster = function(image) {
  if (!image) return;
  let candidates = [];
  try {
    candidates = JSON.parse(decodeURIComponent(image.dataset.posterCandidates || ''));
  } catch (_) {
    candidates = [];
  }
  const nextIndex = Number(image.dataset.posterIndex || 0) + 1;
  if (nextIndex < candidates.length) {
    image.dataset.posterIndex = String(nextIndex);
    image.src = candidates[nextIndex];
    return;
  }
  image.removeAttribute('src');
  image.style.display = 'none';
};

window.startMinisserie50PromptsFromSubmenu = window.generate40PromptsFromModal;

