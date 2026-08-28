// Lógica Principal - Vortex 8

document.addEventListener('DOMContentLoaded', async () => {
  AppState.init();
  await window.compactCampaignNumbering({ silent: true, render: false });
  UI.init();
  setupGlobalListeners();
  
  // API Key Configuration Logic
  const btnSaveApiKey = document.getElementById('btnSaveApiKey');
  const inputMistral = document.getElementById('inputMistralKey');

  // Load existing keys from backend
  if (inputMistral) {
    fetch('/api/config/keys')
      .then(res => res.json())
      .then(data => {
        if (data.mistral) inputMistral.value = data.mistral;
        else inputMistral.placeholder = "Chave Mistral vazia...";
      })
      .catch(e => console.error("Erro ao carregar chaves", e));
  }

  if (btnSaveApiKey) {
    btnSaveApiKey.addEventListener('click', async () => {
      const mistralVal = inputMistral ? inputMistral.value.trim() : '';
      
      btnSaveApiKey.innerText = "SALVANDO...";
      try {
        await fetch('/api/config/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mistral: mistralVal })
        });
        document.getElementById('modalApiConfig').style.display = 'none';
        btnSaveApiKey.innerText = "SALVO!";
      } catch(e) {
        alert("Erro ao salvar chaves no servidor.");
      }
      setTimeout(() => btnSaveApiKey.innerText = "SALVAR CHAVES", 2000);
    });
  }
  
  // Carrega fundos por página (Multiverso)
  window.vortexWallpapers = {};
  const defaultWallpaper = '/palco/01-obra-prima-inkvortex-hd.png';
  window.currentRoomId = 'multiverseWelcome'; // Default room

  window.normalizeWallpaperUrl = function(url) {
    if (!url || typeof url !== 'string' || url === 'none' || url === 'undefined') {
      return defaultWallpaper;
    }
    let u = url.trim();
    if (u.includes('00-obra-prima-inkvortex-hd')) {
      return defaultWallpaper;
    }
    if (!u.startsWith('/') && !u.startsWith('http')) {
      u = '/' + u;
    }
    return u;
  };

  // Setup individual wallpapers per room
  try {
    const saved = localStorage.getItem('vortexWallpapersConfigV9');
    if (saved) {
      const parsed = JSON.parse(saved);
      window.vortexWallpapers = {};
      for (const [k, v] of Object.entries(parsed || {})) {
        window.vortexWallpapers[k] = window.normalizeWallpaperUrl(v);
      }
    } else {
      window.vortexWallpapers = {
        'multiverseWelcome': defaultWallpaper,
        'pageLibrary': defaultWallpaper,
        'storyboardView': defaultWallpaper,
        'socialMediaView': defaultWallpaper,
        'audioRoomView': defaultWallpaper,
        'documentariosRoomView': defaultWallpaper,
        'shortsView': defaultWallpaper
      };
    }
  } catch (e) {
    window.vortexWallpapers = {};
  }

  window.updateWallpaperForCurrentRoom = function() {
    const rawBg = window.vortexWallpapers[window.currentRoomId] || defaultWallpaper;
    const bgUrl = window.normalizeWallpaperUrl(rawBg);
    document.documentElement.style.setProperty('--ivStageImage', `url('${bgUrl}')`);
    document.body.style.backgroundImage = `url('${bgUrl}')`;
  };

  // Initial load
  window.updateWallpaperForCurrentRoom();
  
  // Carrega tipografia salva
  try {
    const savedFontJson = localStorage.getItem('vortexFontSelected');
    if (savedFontJson) {
      const f = JSON.parse(savedFontJson);
      if (typeof window.applyFont === 'function') {
        window.applyFont(f.urlOrFontId, f.fontId, f.format);
      }
    }
  } catch(e){}
  
  // Carrega zoom salvo
  try {
    const savedZoom = localStorage.getItem('vortexFontSize');
    if (savedZoom) {
      window.currentReadingFontSize = parseFloat(savedZoom);
      document.documentElement.style.setProperty('--readingFontSizeMultiplier', window.currentReadingFontSize);
      document.documentElement.style.setProperty('--readingFontSize', window.currentReadingFontSize + 'rem');
      const display = document.getElementById('fontSizeDisplay');
      if (display) {
        display.innerText = Math.round(window.currentReadingFontSize * 100) + '%';
      }
    } else {
      window.currentReadingFontSize = 1;
      document.documentElement.style.setProperty('--readingFontSizeMultiplier', 1);
      document.documentElement.style.setProperty('--readingFontSize', '1rem');
    }
  } catch(e){}
  
  // Restaura a tela exata (se existir)
  if (AppState.activeStage && AppState.activeStage !== 'ideation') {
    UI.renderWorkspace();
  }
  // Se for ideation, verifica se tem assuntos
  else if (AppState.suggestedSubjects && AppState.suggestedSubjects.length > 0) {
    UI.renderWorkspace();
  } else {
    handleGenerateSubjects();
  }
  
  // Carrega o wallpaper
  loadStageBackground();

  // Auto-retoma telemetria de robôs ativos caso a página tenha sido recarregada (F5)
  if (typeof window.autoResumeAllRobotTelemetries === 'function') {
    window.autoResumeAllRobotTelemetries();
  }

  // Restaura automaticamente a sala do Multiverso salva em caso de F5
  try {
    const savedRoom = localStorage.getItem('vortex_active_room');
    if (savedRoom && savedRoom !== 'multiverseWelcome') {
      setTimeout(() => {
        if (savedRoom === 'audioRoomView' && typeof window.openAudioRoom === 'function') {
          window.openAudioRoom();
        } else if (savedRoom === 'pageLibrary' && typeof window.openLibraryRoom === 'function') {
          window.openLibraryRoom();
        } else if (savedRoom === 'documentariosRoomView' && typeof window.openDocumentarios === 'function') {
          window.openDocumentarios();
        } else if (savedRoom === 'socialMediaView' && typeof window.openSocialRoom === 'function') {
          window.openSocialRoom();
        } else if (savedRoom === 'shortsView') {
          window.switchMultiverseRoom('shortsView', null);
        }
      }, 150);
    }
  } catch(_) {}
});

let stageBackgroundsFallback = [
  { url: '/palco/01-obra-prima-inkvortex-hd.png', label: '👑 Obra Prima HD (Prime)' },
  { url: '/palco/vortex_nebula_clean.jpg', label: 'Nebula Clean' },
  { url: '/palco/vortex_cosmic_master.jpg', label: 'Cosmic Master' },
  { url: '/palco/04-vortex-puro-8k.jpg', label: 'Vortex Puro 8K' },
  { url: '/palco/05-vortex-dark-center-8k.jpg', label: 'Vortex Dark' },
  { url: '/palco/01-azul-eletrico-1920x1080.png', label: 'Azul Elétrico' },
  { url: '/palco/02-gradiente-inkvortex-1920x1080.png', label: 'Gradiente' },
  { url: '/palco/03-aurora-vortex-1920x1080.png', label: 'Aurora' },
  { url: '/palco/vortex_cosmic_super.png', label: 'Cosmic Super' },
  { url: '/palco/VORTEX_FAREWELL_WALLPAPER.jpg', label: 'Farewell Wallpaper' },
  { url: '/palco/VORTEX_FAREWELL_WALLPAPER_HD.jpg', label: 'Farewell HD' },
  { url: '/palco/ChatGPT Image 13 de jul. de 2026, 20_04_43 (1).png', label: 'InkVortex Art 01' },
  { url: '/palco/ChatGPT Image 13 de jul. de 2026, 20_04_43 (2).png', label: 'InkVortex Art 02' },
  { url: '/palco/ChatGPT Image 13 de jul. de 2026, 20_04_44 (3).png', label: 'InkVortex Art 03' },
  { url: '/palco/ChatGPT Image 13 de jul. de 2026, 20_04_44 (4).png', label: 'InkVortex Art 04' },
  { url: '/palco/ChatGPT Image 13 de jul. de 2026, 20_04_44 (5).png', label: 'InkVortex Art 05' },
  { url: '/palco/ChatGPT Image 13 de jul. de 2026, 20_04_45 (6).png', label: 'InkVortex Art 06' },
  { url: '/palco/ChatGPT Image 13 de jul. de 2026, 20_04_45 (7).png', label: 'InkVortex Art 07' },
  { url: '/palco/ChatGPT Image 13 de jul. de 2026, 20_04_45 (8).png', label: 'InkVortex Art 08' },
  { url: '/palco/ChatGPT Image 13 de jul. de 2026, 20_04_46 (10).png', label: 'InkVortex Art 10' }
];

let stageBackgrounds = stageBackgroundsFallback;
let stagePortalVideosFallback = [
  {
    id: 'portal-video-default',
    label: 'Viagem 00 · Portal Vivo Inkvortex',
    file: 'palco/00-portal-vivo-inkvortex.mp4',
    url: '/palco/00-portal-vivo-inkvortex.mp4',
    order: 0,
    type: 'video'
  }
];
let stagePortalVideos = stagePortalVideosFallback;

async function loadStageBackground() {
  try {
    const response = await fetch(`/api/palco?_t=${Date.now()}`);
    if (response.ok) {
      const data = await response.json();
      if (data.backgrounds && data.backgrounds.length > 0) {
        stageBackgrounds = data.backgrounds;
      }
      stagePortalVideos = Array.isArray(data.portalVideos) && data.portalVideos.length > 0
        ? data.portalVideos
        : stagePortalVideosFallback;
    }
  } catch (error) {
    console.warn('Usando lista local de palcos', error);
  } finally {
    if (!stageBackgrounds || stageBackgrounds.length === 0) {
      stageBackgrounds = stageBackgroundsFallback;
    }
    if (!stagePortalVideos || stagePortalVideos.length === 0) {
      stagePortalVideos = stagePortalVideosFallback;
    }
    let bgUrl = stageBackgrounds[0].url;
    if (typeof window.currentRoomId !== 'undefined' && window.vortexWallpapers && window.vortexWallpapers[window.currentRoomId]) {
        bgUrl = window.vortexWallpapers[window.currentRoomId];
    }
    bgUrl = window.normalizeWallpaperUrl ? window.normalizeWallpaperUrl(bgUrl) : (bgUrl.startsWith('/') ? bgUrl : '/' + bgUrl);
    
    document.documentElement.style.setProperty('--ivStageImage', `url('${bgUrl}')`);
    document.body.style.backgroundImage = `url('${bgUrl}')`;
  }
}

function setupGlobalListeners() {
  
  const btnReset = document.getElementById('btnReset');
  
  // O btnReset é tratado na lógica de Backup no final do arquivo

  window.toggleDropdown = function(id) {
    // Close other dropdowns
    document.querySelectorAll('.vortexDropdown').forEach(el => {
      if (el.id !== id) el.style.display = 'none';
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.vortexRightActions .iconBtn, .vortexRightActions .actionBtn, .vortexGlobalActions .iconBtn, .vortexGlobalActions .actionBtn').forEach(btn => btn.classList.remove('active'));
    
    const el = document.getElementById(id);
    if (el) {
      const isHidden = el.style.display === 'none' || el.style.display === '';
      el.style.display = isHidden ? 'block' : 'none';
      
      // Toggle active class on the button that triggered it
      if (isHidden) {
        if (id === 'dropdownFonts') { let b = document.getElementById('btnFonts'); if(b) b.classList.add('active'); }
        if (id === 'dropdownSystem') { let b = document.getElementById('btnSystem'); if(b) b.classList.add('active'); }
        if (id === 'dropdownStage') { let b = document.getElementById('btnChangeWallpaper') || document.getElementById('btnStage'); if(b) b.classList.add('active'); }
        if (id === 'dropdownImport') { let b = document.getElementById('btnImport'); if(b) b.classList.add('active'); }
      }
      
      // If opening, load content if needed
      if (isHidden) {
        if (id === 'dropdownStage' && typeof UI.renderStageOptions === 'function') {
          fetch(`/api/palco?_t=${Date.now()}`).then(res => res.json()).then(data => {
            if (data.backgrounds && data.backgrounds.length > 0) {
              stageBackgrounds = data.backgrounds;
            } else {
              stageBackgrounds = stageBackgroundsFallback;
            }
            stagePortalVideos = Array.isArray(data.portalVideos) && data.portalVideos.length > 0
              ? data.portalVideos
              : stagePortalVideosFallback;
            UI.renderStageOptions(stageBackgrounds, stagePortalVideos);
          }).catch(e => {
            console.warn("API de palcos offline, carregando lista da pasta palco:", e);
            stageBackgrounds = stageBackgroundsFallback;
            stagePortalVideos = stagePortalVideosFallback;
            UI.renderStageOptions(stageBackgrounds, stagePortalVideos);
          });
        }
        if (id === 'dropdownFonts' && typeof UI.renderFontOptions === 'function') {
          if (window.localFonts.length === 0) {
            fetch('/api/fonts').then(res => res.json()).then(data => {
              window.localFonts = data.fonts || [];
              UI.renderFontOptions(window.localFonts);
            }).catch(e => console.error("Erro ao carregar fontes", e));
          } else {
            UI.renderFontOptions(window.localFonts);
          }
        }
      }
    }
  };

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.vortexRightActions') && !e.target.closest('.vortexGlobalActions') && !e.target.closest('.vortexDropdown')) {
      document.querySelectorAll('.vortexDropdown').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.vortexRightActions .iconBtn, .vortexRightActions .actionBtn, .vortexGlobalActions .iconBtn, .vortexGlobalActions .actionBtn').forEach(btn => btn.classList.remove('active'));
    }
  });

  window.changeBackground = function(url) {
    const safeUrl = window.normalizeWallpaperUrl ? window.normalizeWallpaperUrl(url) : (url.startsWith('/') ? url : '/' + url);
    document.documentElement.style.setProperty('--ivStageImage', `url('${safeUrl}')`);
    document.body.style.backgroundImage = `url('${safeUrl}')`;
    
    // Salva especificamente para a sala atual
    if(window.currentRoomId) {
      window.vortexWallpapers[window.currentRoomId] = safeUrl;
      localStorage.setItem('vortexWallpapersConfigV9', JSON.stringify(window.vortexWallpapers));
    }
  };

  // Botão Gerar Assuntos
  const btnGenerate = document.getElementById('btnGenerateSubjects');
  if (btnGenerate) {
    btnGenerate.addEventListener('click', handleGenerateSubjects);
  }

  const btnTestDossie = document.getElementById('btnTestDossie');
  if (btnTestDossie) {
    btnTestDossie.addEventListener('click', () => {
      handleGerarDossieCompleto(true);
    });
  }

} // end setupGlobalListeners

// Global ESC Key Logic (Escape Hatch)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // ═══════════════════════════════════════════════════════════════
    // PROTEÇÃO GLOBAL DE TRABALHOS — cobre TODOS os multiversos:
    //   • Documentários  (window.activeDocJobId)
    //   • Áudio          (window.isRenderingAudio)
    //   • Flow/Minissérie(window.isRenderingSerie / isRenderingTodos)
    //   • Qualquer outro  (window.anyJobRunning = true)
    // ═══════════════════════════════════════════════════════════════
    const jobAtivo = window.anyJobRunning === true
      || (window.activeDocJobId && window.activeDocJobId !== '')
      || (window.isRenderingAudio === true)
      || (window.isRenderingSerie && Object.values(window.isRenderingSerie).some(Boolean))
      || (window.isRenderingTodos && Object.values(window.isRenderingTodos).some(Boolean));

    if (jobAtivo) {
      // Permite fechar card expandido de documentário mas bloqueia navegação
      if (typeof window.closeExpandedDocCard === 'function' && window.activeBlockIndex !== null) {
        window.closeExpandedDocCard();
      }
      // Toast visual: informa o Diretor que o trabalho está protegido
      let toast = document.getElementById('escBlockedToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'escBlockedToast';
        toast.style.cssText = `
          position:fixed; bottom:28px; left:50%; transform:translateX(-50%);
          background:rgba(0,174,239,0.18); border:1px solid rgba(0,174,239,0.5);
          backdrop-filter:blur(12px); color:#fff; font-size:0.88rem; font-weight:600;
          padding:12px 22px; border-radius:40px; z-index:99999;
          box-shadow:0 4px 24px rgba(0,174,239,0.25); pointer-events:none;
          transition:opacity 0.3s ease; opacity:0;
        `;
        document.body.appendChild(toast);
      }
      toast.innerHTML = '🔒 Trabalho em execução — navegação bloqueada para não interromper.';
      toast.style.opacity = '1';
      clearTimeout(window._escToastTimer);
      window._escToastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
      return; // BLOQUEIA: não fecha modal, não navega
    }

    // Rule 1: Close any zoom or full-screen player states first
    const zoomedPlayers = document.querySelectorAll('.media-player.zoomed, .video-container.zoomed, .zoom-active');
    if (zoomedPlayers.length > 0) {
      zoomedPlayers.forEach(player => {
        player.classList.remove('zoomed');
        player.classList.remove('zoom-active');
      });
      const renderModal = document.getElementById('renderImmersiveModal');
      if (renderModal && renderModal.style.display !== 'none') {
        renderModal.style.display = 'none';
      }
      return;
    }

    // Rule 2: If no zoom is active, return to the Dashboard (multiverseWelcome)
    if (window.currentRoomId && window.currentRoomId !== 'multiverseWelcome') {
      if (typeof window.switchMultiverseRoom === 'function') {
        window.switchMultiverseRoom('multiverseWelcome', null);
      }
    }
  }
});

// Lógica de Modais

window.localFonts = [];



window.initializeCampaignWorkspace = async function(campaignNumber) {
  const response = await fetch('/api/init-render-folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignNumber })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Não foi possível preparar as pastas da nova minissérie.');
  }
  return data;
};

window.applyCampaignNumberMappings = function(mappings) {
  const numberMap = new Map((mappings || []).map(mapping => [
    Number(mapping.oldNumber),
    Number(mapping.newNumber)
  ]));
  let changed = 0;
  (AppState.campaigns || []).forEach(campaign => {
    const nextNumber = numberMap.get(Number(campaign.number));
    if (!nextNumber || nextNumber === Number(campaign.number)) return;
    campaign.number = nextNumber;
    changed++;
  });
  return changed;
};

window.compactCampaignNumbering = async function(options = {}) {
  const campaigns = Array.isArray(AppState.campaigns) ? AppState.campaigns : [];
  if (campaigns.length === 0) return { ok: true, mappings: [], renumbered: 0 };
  try {
    const response = await fetch('/api/minisseries/compact-workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignNumbers: campaigns.map(campaign => campaign.number) })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Não foi possível compactar a numeração das minisséries.');
    }
    const changed = window.applyCampaignNumberMappings(data.mappings);
    if (changed > 0) AppState.save();
    if (options.render !== false && typeof UI !== 'undefined' && UI.renderLibrary) UI.renderLibrary();
    return data;
  } catch (error) {
    console.error('Falha ao compactar a numeração:', error);
    if (!options.silent) alert(error.message || 'Não foi possível compactar a numeração das minisséries.');
    return { ok: false, error: error.message || String(error) };
  }
};

window.handleCreateManualSubject = async function() {
  const briefInput = document.getElementById('customBriefInput');
  const briefVal = briefInput && briefInput.value.trim() !== '' ? briefInput.value.trim() : null;

  if (!briefVal) {
    alert('Por favor, digite um assunto antes de criar manualmente.');
    return;
  }

  let nextNumber = 1;
  if (AppState.campaigns.length > 0) {
    nextNumber = Math.max(...AppState.campaigns.map(c => Number(c.number) || 0)) + 1;
  }

  const newCampaign = {
    id: 'camp_' + Date.now(),
    number: nextNumber,
    title: briefVal,
    topic: {
      assuntoPrincipal: briefVal,
      description: "Minissérie criada manualmente pelo Diretor.",
      targetAudience: "Geral",
      emotionalTone: "Informativo"
    },
    scenes: [],
    generatedGPT: false,
    generatedGemini: false,
    generatedFlow: false,
    gptScenes: [],
    geminiScenes: [],
    flow: null,
    created_at: new Date().toISOString()
  };

  try {
    await window.initializeCampaignWorkspace(newCampaign.number);
    await API.saveSubject(newCampaign.number, newCampaign.topic);
    AppState.campaigns.push(newCampaign);
    AppState.selectedCampaignId = newCampaign.id;
    AppState.save();
    briefInput.value = '';
    UI.renderWorkspace();
  } catch (error) {
    alert(error.message || 'Não foi possível criar a nova minissérie.');
  }
};

async function handleGenerateSubjects() {
  if (AppState.isGeneratingSubjects) {
    console.warn("Geração de assuntos já em andamento. Ignorando clique duplicado.");
    return;
  }
  
  // Calcula o próximo número
  let nextNumber = 1;
  if (AppState.campaigns && AppState.campaigns.length > 0) {
    nextNumber = Math.max(...AppState.campaigns.map(c => Number(c.number) || 0)) + 1;
  }

  // Abre a caixa de confirmação e seleção dos 20 temas de vanguarda
  if (typeof window.openThemePickerModal === 'function') {
    window.openThemePickerModal(nextNumber, (selectedBrief) => {
      window.executeGenerateSubject(selectedBrief, nextNumber);
    });
  } else {
    window.executeGenerateSubject(null, nextNumber);
  }
}

async function executeGenerateSubject(briefVal = null, targetNumber = null) {
  if (AppState.isGeneratingSubjects) {
    console.warn("Geração de assuntos já em andamento. Ignorando clique duplicado.");
    return;
  }

  const btn = document.getElementById('btnGenerateSubjects');
  if (btn) {
    btn.innerHTML = '✨ Gerando...';
    btn.disabled = true;
  }
  
  // Garante o cálculo do próximo número
  let nextNumber = targetNumber;
  if (!nextNumber) {
    nextNumber = 1;
    if (AppState.campaigns && AppState.campaigns.length > 0) {
      nextNumber = Math.max(...AppState.campaigns.map(c => Number(c.number) || 0)) + 1;
    }
  }

  // Ativa a telemetria pulsante para 1 minissérie
  AppState.isGeneratingSubjects = true;
  AppState.generatingError = null;
  AppState.generatingNumbers = [nextNumber];
  UI.renderIdeationGrid();
  
  try {
    const rawSubjects = await API.generateSubjects(briefVal);
    const subjectList = Array.isArray(rawSubjects) ? rawSubjects : [rawSubjects];
    const subject = subjectList[0];

    if (!subject || !subject.title) {
      throw new Error("A Inteligência retornou um formato inesperado sem título.");
    }
    
    const batchTimestamp = Date.now();
    const newCampaign = {
      id: 'camp_' + batchTimestamp + '_0',
      number: nextNumber,
      title: subject.title,
      topic: subject,
      schemaVersion: '2.0',
      generatedGPT: false,
      generatedGemini: false,
      generatedFlow: false,
      scenes: [],
      gptScenes: [],
      geminiScenes: [],
      social: {},
      flow: {}
    };

    await window.initializeCampaignWorkspace(newCampaign.number);
    await API.saveSubject(newCampaign.number, subject);

    AppState.campaigns.unshift(newCampaign);
    
    // Armazena o ID da nova minissérie para o Centro de Comando exibir
    AppState.suggestedSubjects = [newCampaign.id];
    AppState.isGeneratingSubjects = false;
    AppState.save();
    UI.renderIdeationGrid();
  } catch(e) {
    console.error(e);
    AppState.isGeneratingSubjects = false;
    AppState.generatingError = e.message || "Erro na comunicação com a API.";
    UI.renderIdeationGrid();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "✨ EXPANDIR (IA)";
      btn.style.opacity = '1';
    }
  }
}
window.executeGenerateSubject = executeGenerateSubject;


// Quando o diretor clica em um assunto na grade do Centro de Comando
window.selectSubject = async function(campaignId) {
  const campaign = AppState.campaigns.find(c => c.id === campaignId);
  if (!campaign) return;
  
  AppState.selectedCampaignId = campaign.id;
  
  // Remove do Centro de Comando (Ideation Grid) pois já foi despachado para a produção
  AppState.suggestedSubjects = AppState.suggestedSubjects.filter(id => id !== campaignId);
  
  // Mudar para o Estúdio!
  AppState.activeStage = 'studio';
  AppState.studioActiveTab = 'gpt'; // Já cai na aba de prompts
  
  AppState.save();
  
  
  UI.renderWorkspace();
};

window.createCustomSubject = function() {
  const input = document.getElementById('customSubjectInput');
  const customTitle = input ? input.value.trim() : "";
  if(!customTitle) return;
  
  let nextNumber = parseInt(customTitle);
  if (isNaN(nextNumber)) {
    if (AppState.campaigns.length > 0) {
      nextNumber = Math.max(...AppState.campaigns.map(c => Number(c.number) || 0)) + 1;
    } else {
      nextNumber = 1;
    }
  }
  
  const existingCampaign = AppState.campaigns.find(c => Number(c.number) === nextNumber);

  if (existingCampaign) {
    AppState.selectedCampaignId = existingCampaign.id;
    AppState.save();
    if (input) input.value = "";
    if (typeof showToast === 'function') showToast(`✔ Minissérie #${String(existingCampaign.number).padStart(2,'0')} selecionada!`, 'success');
    UI.renderWorkspace();
  } else {
    if (typeof showToast === 'function') {
      showToast(`⚠️ Minissérie #${String(nextNumber).padStart(2,'0')} não encontrada. Use ✨ EXPANDIR (IA) para gerar novos temas.`, 'warning');
    }
    if (input) input.value = "";
  }
};


// Funções de Modal Expandido e Leitura

  // Funções de Clipboard e Formatação
  
window.toggleSceneExpand = async function(type, index) {
  if (AppState.expandedCard && AppState.expandedCard.type === type && AppState.expandedCard.index === index) {
    AppState.expandedCard = null; // Colapsa se clicar de novo
  } else {
    AppState.expandedCard = { type, index };
  }
  
  if (AppState.expandedCard) {
    if (type === 'gpt') {
      await window.buildGptPromptForExpanded(index);
    } else if (type === 'gemini') {
      const campaign = AppState.getSelectedCampaign();
      const s = campaign.scenes[index];
      s.assembledGemini = s.geminiMotion;
    }
  }
  
  UI.renderStudio(); // Renderiza para expandir
};

window.setGlobalGptMode = function(mode) {
  if (!AppState) return;
  AppState.globalGptMode = mode;
  AppState.save();
  UI.renderStudio();
  if (AppState.expandedCard && AppState.expandedCard.type === 'gpt') {
    window.buildGptPromptForExpanded(AppState.expandedCard.index);
  }
};

window.isSelfContainedFlowPrompt = function(prompt) {
  const text = String(prompt || '').trim();
  if (!text) return false;
  if (text.includes('[INTRODUCTION]')) return false;
  if (text.includes('Reference image content:')) return false;
  if (text.toLowerCase().includes('create a clip using the images selected above')) return true;
  // Formato unificado: parágrafo único terminando com (no subtitles)
  // Formato legado estruturado: também aceito se contiver os marcadores de cena
  const hasUnifiedFormat = text.toLowerCase().includes('(no subtitles)');
  const hasStructuredFormat = text.includes('[TIMED SHOT PLAN]') &&
    [1, 2, 3, 4, 5].every(n => text.includes(`REFERENCE [${String(n).padStart(2,'0')}] -> SCENE ${n}`));
  return hasUnifiedFormat || hasStructuredFormat;
};

window.buildGptPromptForExpanded = async function(index) {
  const campaign = AppState.getSelectedCampaign();
  if(!campaign) return;
  const s = campaign.scenes[index];

  let finalPrompt = String(s.prompt || '').replace(/^\s*TITLE EXACT\s*:\s*["“].*?["”]\s*\r?\n\r?\n?/i, '').trim();

  s.assembledPrompt = finalPrompt;
};



window.formatCapaPrompt = function(scene1Prompt) {
  let prompt = String(scene1Prompt || '').trim();
  if (!prompt) return '';
  prompt = prompt.replace(/^\s*TITLE EXACT\s*:\s*["“].*?["”]\s*\r?\n\r?\n?/i, '').trim();

  if (/^A\s+16:9\s+widescreen\s+cinematic\s+shot/i.test(prompt)) {
    return prompt.replace(/^A\s+16:9\s+widescreen\s+cinematic\s+shot/i, 'A 9:16 vertical cinematic shot');
  }
  if (/^A\s+16:9\s+widescreen/i.test(prompt)) {
    return prompt.replace(/^A\s+16:9\s+widescreen/i, 'A 9:16 vertical');
  }
  if (/^16:9\s+widescreen/i.test(prompt)) {
    return prompt.replace(/^16:9\s+widescreen/i, '9:16 vertical');
  }
  if (/^A\s+16:9/i.test(prompt)) {
    return prompt.replace(/^A\s+16:9/i, 'A 9:16 vertical');
  }
  if (/^16:9/i.test(prompt)) {
    return prompt.replace(/^16:9/i, '9:16 vertical');
  }
  return `A 9:16 vertical cinematic shot of ${prompt.replace(/^A\s+/i, '')}`;
};

window.copyExpandedContent = async function(type, index, btnElement) {
  const campaign = AppState.getSelectedCampaign();
  if(!campaign) return;
  
  let textToCopy = "";
  
  if (type === 'gpt') {
    if (index === 'capa') {
      const s0 = (campaign.scenes && campaign.scenes[0]) || {};
      const rawPrompt = s0.assembledPrompt || s0.prompt || "";
      const baseClean = String(rawPrompt).replace(/^\s*TITLE EXACT\s*:\s*["“].*?["”]\s*\r?\n\r?\n?/i, '').trim();
      textToCopy = window.formatCapaPrompt ? window.formatCapaPrompt(baseClean) : baseClean;
      campaign.copiedCapa = true;
    } else {
      const s = (campaign.scenes && campaign.scenes[index]) || {};
      const rawPrompt = s.assembledPrompt || s.prompt || "";
      textToCopy = String(rawPrompt).replace(/^\s*TITLE EXACT\s*:\s*["“].*?["”]\s*\r?\n\r?\n?/i, '').trim();
      s.copiedGPT = true;
    }
  } else if (type === 'gemini') {
    const geminiScenes = Array.isArray(campaign.geminiScenes) ? campaign.geminiScenes : campaign.scenes || [];
    const geminiScene = geminiScenes[index] || {};
    textToCopy = geminiScene.geminiMotion || geminiScene.prompt || "";
    geminiScene.assembledGemini = textToCopy;
    geminiScene.copiedGemini = true;
  } else if (type === 'social') {
    textToCopy = (campaign.social && (campaign.social.caption || campaign.social.baseCaption || campaign.social.socialCaption)) || campaign.socialCaption || "";
    if (campaign.social) campaign.social.copied = true;
  } else if (type === 'flow') {
    textToCopy = campaign.flow ? campaign.flow.prompt || "" : "";
    if (textToCopy && !window.isSelfContainedFlowPrompt(textToCopy)) {
      alert('Este roteiro Flow pertence ao formato legado e não contém o mapa interno [01]–[05]. Gere uma nova versão antes de copiar.');
      return;
    }
    if (campaign.flow) campaign.flow.copied = true;
  }
  
  AppState.save();
  if (textToCopy) {
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch(e) {
      console.warn("Clipboard access warning:", e);
    }
  }
  
  if (btnElement) {
    btnElement.innerText = "✓ COPIADO";
    btnElement.style.background = "var(--brandGrad)";
    btnElement.style.color = "#fff";
    btnElement.style.borderColor = "transparent";
  }
  
  if (typeof UI !== 'undefined' && typeof UI.renderGPTArea === 'function' && type === 'gpt') {
    UI.renderGPTArea();
  }
};

window.openReadModal = async function(type, index) {
  const campaign = AppState.getSelectedCampaign();
  if(!campaign) return;

  const modal = document.getElementById('modalRead');
  const titleEl = document.getElementById('modalReadTitle');
  const contentEl = document.getElementById('modalReadContent');
  const badgeEl = document.getElementById('modalReadBadge');
  const copyBtn = document.getElementById('modalReadCopyBtn');
  const togglesEl = document.getElementById('modalGptToggles');
  
  let finalContent = "";
  let isCopied = false;

  modal.style.display = 'flex';
  contentEl.value = "Carregando...";
  badgeEl.style.display = 'none';
  togglesEl.style.display = 'none';

  if (type === 'gpt') {
    const s = campaign.scenes[index];
    titleEl.innerText = `CENA ${s.no} (PROMPT GPT)`;
    isCopied = !!s.copiedGPT;
    
    const cleanPrompt = String(s.prompt || '').replace(/^\s*TITLE EXACT\s*:\s*["“].*?["”]\s*\r?\n\r?\n?/i, '').trim();
    finalContent = cleanPrompt;
    contentEl.value = finalContent;
    
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(finalContent);
      s.copiedGPT = true;
      AppState.save();
      UI.renderStudio();
      badgeEl.style.display = 'block';
      copyBtn.innerText = "✓ COPIADO";
    };

  } else if (type === 'gemini') {
    const geminiScenes = Array.isArray(campaign.geminiScenes) ? campaign.geminiScenes : campaign.scenes || [];
    const s = geminiScenes[index] || {};
    titleEl.innerText = `CENA ${s.no} (GEMINI MOTION)`;
    isCopied = !!s.copiedGemini;
    finalContent = s.geminiMotion || s.prompt || '';

    copyBtn.onclick = () => {
      navigator.clipboard.writeText(finalContent);
      s.copiedGemini = true;
      AppState.save();
      UI.renderStudio();
      badgeEl.style.display = 'block';
      copyBtn.innerText = "✓ COPIADO";
    };

  } else if (type === 'social') {
    titleEl.innerText = `LEGENDA SOCIAL`;
    isCopied = !!campaign.social.copied;
    
    finalContent = campaign.social.caption || campaign.social.baseCaption || "";

    copyBtn.onclick = () => {
      navigator.clipboard.writeText(finalContent);
      campaign.social.copied = true;
      AppState.save();
      UI.renderStudio();
      badgeEl.style.display = 'block';
      copyBtn.innerText = "✓ COPIADO";
    };

  } else if (type === 'flow') {
    titleEl.innerText = `ROTEIRO MASTER`;
    isCopied = !!(campaign.flow && campaign.flow.copied);
    
    finalContent = (campaign.flow && campaign.flow.prompt) ? campaign.flow.prompt : "Roteiro não gerado.";

    copyBtn.onclick = async () => {
      if(!campaign.flow || !campaign.flow.prompt) return;
      if (!window.isSelfContainedFlowPrompt(campaign.flow.prompt)) {
        alert('Este roteiro Flow pertence ao formato legado e não contém o mapa interno [01]–[05]. Gere uma nova versão antes de copiar.');
        return;
      }
      await navigator.clipboard.writeText(campaign.flow.prompt);
      campaign.flow.copied = true;
      AppState.save();
      UI.renderStudio();
      badgeEl.style.display = 'block';
      copyBtn.innerText = "COPIADO";
    };
  }

  contentEl.value = finalContent;
  
  if (isCopied) {
    badgeEl.style.display = 'block';
    copyBtn.innerText = "✓ COPIADO";
  } else {
    badgeEl.style.display = 'none';
    copyBtn.innerText = "COPIAR TEXTO";
  }
};

window.handleGenerateAction = async function(type, campaignId, fromDashboard = false) {
  AppState.isGenerating = true; // Trava a UI
  const contentArea = document.getElementById('subjectsGrid') || document.body;
  const leftPanel = document.getElementById('activeCampaignPanel');
  const rightPanel = document.getElementById('multiversePromptsArea');
  const controlPanel = document.getElementById('multiverseControlPanel');
  
  // Preserva os painéis laterais (esquerdo e direito) visíveis durante a animação central
  if (leftPanel) leftPanel.style.display = 'flex';
  if (rightPanel) rightPanel.style.display = 'flex';
  
  if (contentArea && contentArea.id === 'subjectsGrid') {
    contentArea.style.display = 'flex';
  }
  
  // Salvar conteúdo original para restaurar depois se der erro
  const originalHtml = contentArea === document.body ? '' : contentArea.innerHTML;
  
  contentArea.innerHTML = `
    <style>
      @keyframes spinGlow { 100% { transform: rotate(360deg); } }
      @keyframes pulseGlow {
        0% { transform: scale(1); opacity: 0.3; }
        50% { transform: scale(1.2); opacity: 0.7; }
        100% { transform: scale(1); opacity: 0.3; }
      }
      @keyframes pulseHeart {
        0% { transform: scale(0.9); filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)); }
        50% { transform: scale(1.1); filter: drop-shadow(0 0 25px rgba(255,255,255,1)); }
        100% { transform: scale(0.9); filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)); }
      }
    </style>
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; position:relative;">
      
      <!-- Motores Orbitais -->
      <div style="display:flex; align-items:center; gap: 40px; margin-bottom: 60px; position:relative;">
        <!-- Conexão Central (Linha de energia) -->
        <div style="position:absolute; top:50%; left:40px; right:40px; height:2px; background: linear-gradient(90deg, var(--cyan), var(--magenta)); opacity: 0.4; z-index:0; filter: blur(2px);"></div>

        <!-- Motor 1 (Esquerda) -->
        <div style="position:relative; width:80px; height:80px; display:flex; align-items:center; justify-content:center; z-index:1;">
          <div style="position:absolute; inset:0; border-radius:50%; border:2px dashed var(--cyan); animation: spinGlow 4s linear infinite;"></div>
          <div style="position:absolute; inset:-10px; border-radius:50%; border:1px solid rgba(0, 174, 239, 0.2); animation: spinGlow 8s linear reverse infinite;"></div>
          <div style="position:absolute; inset:10px; border-radius:50%; background:var(--cyan); opacity:0.3; filter:blur(10px); animation: pulseGlow 2s ease-in-out infinite;"></div>
          <div style="font-size: 1.8rem; filter: drop-shadow(0 0 10px rgba(0,174,239,0.8));">🧠</div>
        </div>
        
        <!-- Motor Central (Núcleo) -->
        <div style="position:relative; width:150px; height:150px; display:flex; align-items:center; justify-content:center; transform: translateY(-20px); z-index:2;">
          <div style="position:absolute; inset:0; border-radius:50%; border:4px solid transparent; border-top-color: var(--magenta); border-bottom-color: var(--cyan); animation: spinGlow 1.5s linear infinite;"></div>
          <div style="position:absolute; inset:-15px; border-radius:50%; border:2px dashed rgba(255,255,255,0.1); animation: spinGlow 6s linear reverse infinite;"></div>
          <div style="position:absolute; inset:15px; border-radius:50%; border:1px solid rgba(255, 255, 255, 0.15); animation: spinGlow 3s linear infinite;"></div>
          
          <div style="position:absolute; inset:25px; border-radius:50%; background:var(--brandGrad); opacity:0.6; filter:blur(20px); animation: pulseGlow 1.5s ease-in-out infinite alternate;"></div>
          <div style="font-size: 4rem; animation: pulseHeart 1.5s ease-in-out infinite alternate; z-index: 3;">⚡</div>
        </div>

        <!-- Motor 3 (Direita) -->
        <div style="position:relative; width:80px; height:80px; display:flex; align-items:center; justify-content:center; z-index:1;">
          <div style="position:absolute; inset:0; border-radius:50%; border:2px dashed var(--magenta); animation: spinGlow 4s linear infinite reverse;"></div>
          <div style="position:absolute; inset:-10px; border-radius:50%; border:1px solid rgba(232, 0, 109, 0.2); animation: spinGlow 8s linear infinite;"></div>
          <div style="position:absolute; inset:10px; border-radius:50%; background:var(--magenta); opacity:0.3; filter:blur(10px); animation: pulseGlow 2s ease-in-out infinite 0.5s;"></div>
          <div style="font-size: 1.8rem; filter: drop-shadow(0 0 10px rgba(232,0,109,0.8));">👁️</div>
        </div>
      </div>

      <!-- Telemetria Textual -->
      <h2 style="font-family: var(--uiRounded); font-size: 3rem; color: #fff; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 4px; text-shadow: 0 0 40px rgba(0,174,239,0.6); text-align: center;">
        Invocando Motores de IA
      </h2>
      
      <div style="background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); padding: 12px 32px; border-radius: 50px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px; box-shadow: inset 0 0 20px rgba(0,0,0,0.8);">
        <div style="width: 14px; height: 14px; background: #00d26a; border-radius: 50%; box-shadow: 0 0 15px #00d26a; animation: pulseGlow 1s infinite;"></div>
        <span style="color: #00d26a; font-family: 'Courier New', monospace; font-size: 1.15rem; font-weight: bold; letter-spacing: 2px;">STATUS: PROCESSANDO EM ÓRBITA...</span>
      </div>

      <p id="generationStatusMessage" style="color:var(--ivTextSecondary); font-size: 1.3rem; text-align:center; max-width: 600px; line-height: 1.6; font-family: var(--uiText);">
        Conectando ao núcleo V8 central...<br>Aguarde enquanto as redes neurais moldam sua minissérie.
      </p>
    </div>
  `;
  
  try {
    if (type === 'gpt' || type === 'minisserie') {
      await API.generateGPT(campaignId);
    } else if (type === 'gemini') {
      await API.generateGemini(campaignId);
    }
  } catch(e) {
    alert("Erro na geração: " + e.message);
  } finally {
    AppState.isGenerating = false; // Destrava a UI
    const controlPanel = document.getElementById('multiverseControlPanel');
    if (controlPanel) {
      controlPanel.style.background = 'rgba(255, 255, 255, 0.02)';
      controlPanel.style.border = '1px solid rgba(0, 174, 239, 0.25)';
      controlPanel.style.boxShadow = 'inset 0 0 15px rgba(0,174,239,0.06), 0 0 20px rgba(0,174,239,0.1)';
      controlPanel.style.backdropFilter = 'blur(1px)';
    }
  }
  
  if (fromDashboard) {
    UI.closeStudioModal();
    UI.renderPulsePanel();
  } else {
    UI.renderStudio();
  }
};

window.resetCurrentCampaignVersion = async function() {
  const campaign = AppState.getSelectedCampaign();
  if (!campaign || AppState.isGenerating) return;

  const number = String(campaign.number || campaign.no || '').padStart(2, '0');
  const confirmed = confirm(
    `♻️ NOVA VERSÃO DA MINISSÉRIE ${number}\n\n` +
    'O número, o título e o assunto serão preservados.\n\n' +
    'GPT, Legenda Social, Flow e Gemini serão apagados juntos, inclusive os arquivos desta minissérie, para começar uma composição totalmente nova.\n\n' +
    'Deseja continuar?'
  );
  if (!confirmed) return;

  try {
    const response = await fetch('/api/minisseries/reset-workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignNumber: campaign.number })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'A pasta da minissérie não pôde ser preparada para a nova versão.');
    }

    campaign.generatedGPT = false;
    campaign.generatedGemini = false;
    campaign.generatedFlow = false;
    campaign.scenes = [];
    campaign.gptScenes = [];
    campaign.geminiScenes = [];
    campaign.motionScenes = [];
    campaign.social = {};
    campaign.flow = {};
    delete campaign.audioPrompt;
    delete campaign.audioStyle;

    AppState.studioActiveTab = 'gpt';
    AppState.activeSceneIndex = 0;
    AppState.save();
    UI.renderStudio();
    if (typeof showToast === 'function') {
      showToast(`Minissérie ${number} pronta para uma nova versão.`, 'success');
    }
  } catch (error) {
    alert(`A nova versão foi cancelada para proteger os dados.\n\n${error.message || error}`);
  }
};

window.switchSceneTab = function(index, type) {
  AppState.activeSceneIndex = index;
  if(type === 'gpt' && UI.renderGPTArea) UI.renderGPTArea();
  if(type === 'gemini' && UI.renderGeminiArea) UI.renderGeminiArea();
};

window.handleDeleteCampaign = async function(campaignId) {
  const campaign = AppState.campaigns.find(c => c.id === campaignId);
  if (!campaign) {
    alert('Minissérie não encontrada na Biblioteca.');
    return;
  }
  const numberLabel = String(campaign.number || '').padStart(2, '0');
  const confirmed = confirm(
    `🚨 EXCLUSÃO TOTAL DA MINISSÉRIE #${numberLabel}\n\n` +
    'Esta ação apagará definitivamente o registro e a pasta completa, incluindo imagens, áudios, vídeos, legendas, prompts e checkpoints.\n\n' +
    'As minisséries posteriores serão renumeradas automaticamente para manter a sequência.\n\n' +
    'Deseja continuar?'
  );
  if (!confirmed) return;

  try {
    const response = await fetch('/api/minisseries/delete-workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignNumber: campaign.number,
        remainingCampaignNumbers: AppState.campaigns
          .filter(item => item.id !== campaignId)
          .map(item => item.number)
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'A pasta da minissérie não pôde ser apagada.');
    }

    AppState.campaigns = AppState.campaigns.filter(c => c.id !== campaignId);
    window.applyCampaignNumberMappings(data.mappings);
    AppState.suggestedSubjects = AppState.suggestedSubjects.filter(id => id !== campaignId);
    if (AppState.selectedCampaignId === campaignId) AppState.selectedCampaignId = null;
    AppState.save();
    UI.renderLibrary();
  } catch (error) {
    alert(`A exclusão foi cancelada para proteger o banco.\n\n${error.message || error}`);
  }
};

// (Funções de related_subjects removidas)

// Atalho Ninja: Digitar um número e dar Enter na biblioteca
window.quickOpenCampaign = function(val) {
  if (!val) return;
  const term = val.trim().replace('#', '');
  
  // Acha a campanha que tenha exatamente esse número
  const target = AppState.campaigns.find(c => String(c.number) === term);
  if (target) {
    window.openCampaignFromLibrary(target.id);
  } else {
    // Se não for número, tenta encontrar pelo título para agilizar
    const targetTitle = AppState.campaigns.find(c => c.title.toLowerCase().includes(term.toLowerCase()));
    if (targetTitle) {
      window.openCampaignFromLibrary(targetTitle.id);
    }
  }
};

window.openCampaignFromLibrary = function(campaignId) {
  AppState.selectedCampaignId = campaignId;
  AppState.activeStage = 'studio';
  AppState.studioActiveTab = null;
  AppState.save();
  

  
  UI.renderWorkspace();
};

window.setLibraryFilter = function(filter) {
  AppState.libraryFilter = filter;
  
  // Atualiza visual dos três botões de filtro
  const btnAll     = document.getElementById('btnFilterAll');
  const btnPending = document.getElementById('btnFilterPending');
  const btnComp    = document.getElementById('btnFilterCompleted');

  const activeStyle   = 'background: var(--brandGrad); color: #fff; border: 1px solid transparent; font-weight: bold; padding: 10px 22px; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 15px rgba(0,174,239,0.4); font-size: 0.88rem;';
  const inactiveStyle = 'background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.18); font-weight: normal; padding: 10px 22px; border-radius: 10px; cursor: pointer; font-size: 0.88rem; box-shadow: none;';
  
  if (btnAll)     btnAll.style.cssText     = filter === 'all'       ? activeStyle : inactiveStyle;
  if (btnPending) btnPending.style.cssText = filter === 'pending'   ? activeStyle : inactiveStyle;
  if (btnComp)    btnComp.style.cssText    = filter === 'completed' ? activeStyle : inactiveStyle;
  
  UI.renderLibrary();
};

// Lógica de Backup VORTEX 12.0 (Exportar, Importar e Reset Seguro)
const btnExport = document.getElementById('btnExport');
const inputImport = document.getElementById('importBackupFile');
const btnReset = document.getElementById('btnReset');

if (btnExport) {
  btnExport.addEventListener('click', () => {
    if (typeof window.exportSystemBackup === 'function') {
      window.exportSystemBackup();
    }
  });
}

if (btnReset) {
  btnReset.addEventListener('click', () => {
    if (typeof window.resetSystemWithBackup === 'function') {
      window.resetSystemWithBackup();
    }
  });
}

if (inputImport) {
  inputImport.addEventListener('change', (e) => {
    if (typeof window.importSystemBackup === 'function') {
      window.importSystemBackup(e.target);
    }
  });
}

// CSS inline dinâmico pro spinner
const style = document.createElement('style');
style.innerHTML = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;
document.head.appendChild(style);

window.toggleApi = function(apiStr) {
  if (apiStr === 'gpt-on') AppState.apiStatus.gpt = true;
  if (apiStr === 'gpt-off') AppState.apiStatus.gpt = false;
  if (apiStr === 'gemini') AppState.apiStatus.gemini = !AppState.apiStatus.gemini;
  UI.renderPulsePanel();
}

window.generateFlowMaster = async function(campaignId, btn) {
  AppState.isGenerating = true; // Trava a UI
  
  // Preserva os painéis laterais (esquerdo e direito) visíveis durante a animação central
  if (leftPanel) leftPanel.style.display = 'flex';
  if (rightPanel) rightPanel.style.display = 'flex';
  
  if (contentArea && contentArea.id === 'subjectsGrid') {
    contentArea.style.display = 'flex';
  }
  
  contentArea.innerHTML = `
    <style>
      @keyframes spinGlowFlow { 100% { transform: rotate(360deg); } }
      @keyframes pulseGlowFlow {
        0% { transform: scale(1); opacity: 0.3; }
        50% { transform: scale(1.2); opacity: 0.7; }
        100% { transform: scale(1); opacity: 0.3; }
      }
      @keyframes pulseHeartFlow {
        0% { transform: scale(0.9); filter: drop-shadow(0 0 10px rgba(255,215,0,0.5)); }
        50% { transform: scale(1.1); filter: drop-shadow(0 0 35px rgba(255,215,0,1)); }
        100% { transform: scale(0.9); filter: drop-shadow(0 0 10px rgba(255,215,0,0.5)); }
      }
    </style>
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; position:relative;">
      
      <!-- Motores Orbitais Master -->
      <div style="display:flex; align-items:center; gap: 40px; margin-bottom: 60px; position:relative;">
        <!-- Conexao Central -->
        <div style="position:absolute; top:50%; left:40px; right:40px; height:2px; background: linear-gradient(90deg, #ff8c00, #ffd700); opacity: 0.6; z-index:0; filter: blur(2px);"></div>

        <!-- Motor 1 (Esquerda) -->
        <div style="position:relative; width:80px; height:80px; display:flex; align-items:center; justify-content:center; z-index:1;">
          <div style="position:absolute; inset:0; border-radius:50%; border:2px dashed #ff8c00; animation: spinGlowFlow 3s linear infinite;"></div>
          <div style="position:absolute; inset:-10px; border-radius:50%; border:1px solid rgba(255, 140, 0, 0.3); animation: spinGlowFlow 6s linear reverse infinite;"></div>
          <div style="position:absolute; inset:10px; border-radius:50%; background:#ff8c00; opacity:0.3; filter:blur(10px); animation: pulseGlowFlow 2s ease-in-out infinite;"></div>
          <div style="font-size: 1.8rem; filter: drop-shadow(0 0 10px rgba(255,140,0,0.8));">🧠</div>
        </div>
        
        <!-- Motor Central (Nucleo) -->
        <div style="position:relative; width:150px; height:150px; display:flex; align-items:center; justify-content:center; transform: translateY(-20px); z-index:2;">
          <div style="position:absolute; inset:0; border-radius:50%; border:4px solid transparent; border-top-color: #ffd700; border-bottom-color: #ff8c00; animation: spinGlowFlow 1.2s linear infinite;"></div>
          <div style="position:absolute; inset:-15px; border-radius:50%; border:2px dashed rgba(255,215,0,0.3); animation: spinGlowFlow 4s linear reverse infinite;"></div>
          <div style="position:absolute; inset:15px; border-radius:50%; border:1px solid rgba(255, 215, 0, 0.2); animation: spinGlowFlow 2.5s linear infinite;"></div>
          
          <div style="position:absolute; inset:25px; border-radius:50%; background:linear-gradient(45deg, #ff8c00, #ffd700); opacity:0.6; filter:blur(20px); animation: pulseGlowFlow 1.5s ease-in-out infinite alternate;"></div>
          <div style="font-size: 4rem; animation: pulseHeartFlow 1.5s ease-in-out infinite alternate; z-index: 3;">🔥</div>
        </div>

        <!-- Motor 3 (Direita) -->
        <div style="position:relative; width:80px; height:80px; display:flex; align-items:center; justify-content:center; z-index:1;">
          <div style="position:absolute; inset:0; border-radius:50%; border:2px dashed #ffd700; animation: spinGlowFlow 3s linear infinite reverse;"></div>
          <div style="position:absolute; inset:-10px; border-radius:50%; border:1px solid rgba(255, 215, 0, 0.3); animation: spinGlowFlow 6s linear infinite;"></div>
          <div style="position:absolute; inset:10px; border-radius:50%; background:#ffd700; opacity:0.3; filter:blur(10px); animation: pulseGlowFlow 2s ease-in-out infinite 0.5s;"></div>
          <div style="font-size: 1.8rem; filter: drop-shadow(0 0 10px rgba(255,215,0,0.8));">🎬</div>
        </div>
      </div>

      <!-- Telemetria Textual -->
      <h2 style="font-family: var(--uiRounded); font-size: 3rem; color: #fff; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 4px; text-shadow: 0 0 40px rgba(255,215,0,0.6); text-align: center;">
        Invocando Motores de IA
      </h2>
      
      <div style="background: rgba(0,0,0,0.6); border: 1px solid rgba(255,215,0,0.3); padding: 12px 32px; border-radius: 50px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px; box-shadow: inset 0 0 20px rgba(0,0,0,0.8);">
        <div style="width: 14px; height: 14px; background: #ffd700; border-radius: 50%; box-shadow: 0 0 15px #ffd700; animation: pulseGlowFlow 1s infinite;"></div>
        <span style="color: #ffd700; font-family: 'Courier New', monospace; font-size: 1.15rem; font-weight: bold; letter-spacing: 2px;">STATUS: SINTONIZANDO VEO...</span>
      </div>

      <p style="color:var(--ivTextSecondary); font-size: 1.3rem; text-align:center; max-width: 600px; line-height: 1.6; font-family: var(--uiText);">
        Conectando ao núcleo cinemático central...<br>Aguarde enquanto as diretrizes do especialista moldam sua minissérie.
      </p>
    </div>
  `;
  
  try {
    const campaign = AppState.campaigns.find(c => c.id === campaignId);
    const campaignNumber = campaign.number || campaign.id;
    const topicContext = campaign.topic?.description || campaign.topic?.groupSubject || campaign.description || campaign.title;
    const response = await fetch('/api/generate-flow', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        campaign,
        campaignNumber: campaignNumber,
        title: campaign.title,
        description: topicContext,
        topic: campaign.topic || {
          title: campaign.title,
          description: topicContext,
          groupSubject: topicContext,
          number: campaignNumber,
          motionBlueprint: campaign.topic?.motionBlueprint
        },
        scenes: campaign.scenes 
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Erro na geracao");
    }
    
    const data = await response.json();
    campaign.flow = { prompt: data.prompt };
    AppState.save();
  } catch (error) {
    console.error("Erro ao gerar roteiro master:", error);
    alert("Falha: " + error.message);
  } finally {
    AppState.isGenerating = false;
    const controlPanel = document.getElementById('multiverseControlPanel');
    if (controlPanel) {
      controlPanel.style.background = 'rgba(255, 255, 255, 0.02)';
      controlPanel.style.border = '1px solid rgba(0, 174, 239, 0.25)';
      controlPanel.style.boxShadow = 'inset 0 0 15px rgba(0,174,239,0.06), 0 0 20px rgba(0,174,239,0.1)';
      controlPanel.style.backdropFilter = 'blur(1px)';
    }
    UI.renderStudio(); // Recarrega a UI do cockpit
  }
};

// ==========================================
// MÉTODOS DO MULTIVERSO (NOVAS SALAS)
// ==========================================

window.updateTopbarTitle = function(title = '', subtitle = '') {
  const titleBox = document.getElementById('topbarMultiverseTitle');
  const tEl = document.getElementById('topbarTitle');
  const sEl = document.getElementById('topbarSubtitle');
  const isDocRobotActive = typeof window.isDocRobotRunning === 'function'
    ? window.isDocRobotRunning()
    : !!(window.activeDocGptJobId || window.activeDocGeminiJobId || window.activeDocChatGPTJobId || (typeof window.getActiveDocRobotJob === 'function' && window.getActiveDocRobotJob()));

  if (titleBox) {
    // O container fica sempre com display:flex — como é position:absolute,
    // não interfere no layout flex dos botões esquerda/direita.
    titleBox.style.display = 'flex';
  }


  if (tEl) {
    tEl.innerText = title;
    tEl.title = title;
    tEl.style.display = isDocRobotActive ? 'none' : '';
  }

  if (sEl) {
    sEl.innerText = subtitle;
    sEl.title = subtitle;
    sEl.style.display = (isDocRobotActive || !subtitle) ? 'none' : '';
  }

  if (typeof window.syncTopbarTitlesAndTelemetries === 'function') {
    window.syncTopbarTitlesAndTelemetries();
  }
};

window.switchMultiverseRoom = function(roomId, btnId) {
  // Update tracking variable and change wallpaper
  window.currentRoomId = roomId;
  try {
    localStorage.setItem('vortex_active_room', roomId);
  } catch (_) {}
  if(window.updateWallpaperForCurrentRoom) window.updateWallpaperForCurrentRoom();

  if (roomId === 'multiverseWelcome') {
    window.updateTopbarTitle('', '');
  } else if (roomId === 'pageLibrary') {
    window.updateTopbarTitle('📚 Multiverso Biblioteca', 'Acesse o histórico geral de minisséries catalogadas.');
  }

  const rooms = [
    'pageLibrary',
    'multiverseWelcome',
    'socialMediaView',
    'storyboardView',
    'audioRoomView',
    'documentariosRoomView',
    'shortsView',
    'comercialView'
  ];
  
  // Hide all rooms
  rooms.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
      el.style.display = 'none';
      el.classList.remove('active');
    }
  });

  const orbitLeft = document.getElementById('orbitLeft');

  const btnBack = document.getElementById('btnBackToDashboard');

  // Show the target room
  const target = document.getElementById(roomId);
  if(target) {
    target.style.display = 'flex';
    target.classList.add('active');
  }

  // Dashboard vs Isolated Room logic: As 7 abas do Multiverso (orbitLeft) pertencem EXCLUSIVAMENTE ao Dashboard Central
  if(roomId === 'multiverseWelcome') {
    if(orbitLeft) orbitLeft.style.display = 'flex';

    if(btnBack) btnBack.style.display = 'none';
  } else {
    if(orbitLeft) orbitLeft.style.display = 'none';

    if(btnBack) btnBack.style.display = 'flex';
  }

  if(btnId && window.highlightActiveRoom) {
    window.highlightActiveRoom(btnId);
  }
};

window.openCommandRoom = function() {
  // pageIdeation não existe no V9 — o Centro de Comando é o multiverseWelcome
  window.switchMultiverseRoom('multiverseWelcome', null);
  if (typeof UI !== 'undefined' && UI.renderIdeationGrid) {
    UI.renderIdeationGrid();
  }
};

window.openLibraryRoom = function() {
  window.switchMultiverseRoom('pageLibrary', 'btnNavLibrary');
  if (typeof UI !== 'undefined' && UI.renderLibrary) {
    // Garante que o filtro 'Todas' começa ativo visualmente
    window.setLibraryFilter(AppState.libraryFilter || 'all');
  }
};

window.openGPTModal = function() {
  const promptsArea = document.getElementById('multiversePromptsArea');
  if(promptsArea) {
    promptsArea.style.display = 'flex';
    AppState.studioActiveTab = 'gpt';
    if (typeof UI !== 'undefined' && UI.renderGPTArea) {
      UI.renderGPTArea();
    }
  }
};

window.openGeminiModal = function() {
  const promptsArea = document.getElementById('multiversePromptsArea');
  if(promptsArea) {
    promptsArea.style.display = 'flex';
    AppState.studioActiveTab = 'gemini';
    if (typeof UI !== 'undefined' && UI.renderGeminiArea) {
      UI.renderGeminiArea();
    }
  }
};

window.openFlowModal = function() {
  const promptsArea = document.getElementById('multiversePromptsArea');
  if(promptsArea) {
    promptsArea.style.display = 'flex';
    AppState.studioActiveTab = 'flow';
    if (typeof UI !== 'undefined' && UI.renderFlowArea) {
      UI.renderFlowArea();
    }
  }
};

// Seletor compacto compartilhado pelo painel visual: GEM / GPT.
window.setVisualRobotProvider = function(provider, campaignId) {
  AppState.visualRobotProvider = provider === 'chatgpt' ? 'chatgpt' : 'gemini';
  AppState.save();
  if (typeof UI !== 'undefined' && UI.renderWorkspace) UI.renderWorkspace();
};

window.mountVisualRobotSwitcher = function(campaignId) {
  const panel = document.getElementById('activeCampaignPanel');
  if (!panel) return;
  const geminiButton = panel.querySelector('button[onclick*="startGeminiWebAutomation"]');
  if (!geminiButton || !geminiButton.parentElement) return;

  const sharedPanel = geminiButton.parentElement;
  if (sharedPanel.dataset.visualRobotMounted === String(campaignId)) return;
  sharedPanel.dataset.visualRobotMounted = String(campaignId);

  window.__visualRobotGeminiMarkup = window.__visualRobotGeminiMarkup || {};
  const key = String(campaignId);
  window.__visualRobotGeminiMarkup[key] = sharedPanel.innerHTML;

  const selectorMarkup = `
    <select id="visualRobotProvider" onchange="window.setVisualRobotProvider(this.value, '${key}')">
      <option value="chatgpt" ${AppState.visualRobotProvider === 'chatgpt' ? 'selected' : ''}>GPT</option>
      <option value="gemini" ${(AppState.visualRobotProvider || 'gemini') === 'gemini' ? 'selected' : ''}>GEMINI</option>
    </select>`;

  // O GPT nasce de uma cópia real do bloco Gemini. Assim, fonte, tamanho,
  // margens, bordas, espaçamentos e alinhamentos permanecem rigorosamente
  // iguais; somente identificadores, textos e a ação do robô são trocados.
  const buildGPTMarkupFromGemini = () => {
    const template = document.createElement('template');
    template.innerHTML = window.__visualRobotGeminiMarkup[key];

    const title = Array.from(template.content.querySelectorAll('div')).find(element => {
      const text = element.textContent.replace(/\s+/g, ' ').trim();
      return text === 'GEMINI WEB (7 MOVIMENTOS)' || text === 'GEMINI WEB (5 MOVIMENTOS)';
    });
    if (title) title.textContent = 'CHATGPT WEB (7 IMAGENS)';

    const selectAll = template.content.querySelector('#geminiTodas');
    if (selectAll) {
      selectAll.id = 'chatGPTFlowTodas';
      selectAll.setAttribute(
        'onchange',
        "document.querySelectorAll('.chatgpt-flow-scene-chk').forEach(cb => cb.checked = this.checked)"
      );
    }

    template.content.querySelectorAll('.gemini-scene-chk').forEach(input => {
      input.classList.remove('gemini-scene-chk');
      input.classList.add('chatgpt-flow-scene-chk');
    });

    const button = template.content.querySelector('button[onclick*="startGeminiWebAutomation"]');
    if (button) {
      button.id = 'btnAutomateChatGPTFlow';
      button.setAttribute('onclick', `window.startChatGPTFlowAutomation('${key}')`);
      const spans = button.querySelectorAll('span');
      if (spans[0]) spans[0].textContent = '🚀';
      if (spans[1]) spans[1].textContent = 'ROBÔ GPT';
    }

    const rescueButton = template.content.querySelector('button[onclick*="rescueGeminiWebDownloads"]');
    if (rescueButton) {
      rescueButton.id = 'btnRescueChatGPTFlow';
      rescueButton.setAttribute('onclick', `window.rescueChatGPTWebDownloads('${key}')`);
    }

    return template.innerHTML;
  };

  const render = () => {
    const isGPT = AppState.visualRobotProvider === 'chatgpt';
    sharedPanel.innerHTML = selectorMarkup + (isGPT
      ? buildGPTMarkupFromGemini()
      : window.__visualRobotGeminiMarkup[key]);

    let statusBox = sharedPanel.parentElement?.querySelector('#chatGPTAutomationStatusBox') || document.getElementById('chatGPTAutomationStatusBox');
    if (!statusBox && sharedPanel.parentElement) {
      statusBox = document.createElement('div');
      statusBox.id = 'chatGPTAutomationStatusBox';
      statusBox.style.cssText = 'display: none; width: 100%; margin-top: 6px; padding: 6px 12px; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(10px); border: 1px solid rgba(0, 210, 106, 0.35); border-radius: 8px; box-shadow: inset 0 0 10px rgba(0, 210, 106, 0.1), 0 4px 10px rgba(0,0,0,0.5); overflow: hidden; position: relative; box-sizing: border-box;';
      statusBox.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; width: 100%; gap: 6px; z-index: 1;">
          <span style="font-size: 1rem; filter: drop-shadow(0 0 5px rgba(255,255,255,0.8)); color: #fff;">⏳</span>
          <div id="chatGPTAutomationStatusText" style="color: #ffffff; font-family: var(--uiRounded); font-weight: 900; font-size: 0.85rem; letter-spacing: 0.5px; white-space: nowrap; text-align: center; text-shadow: 0 0 5px rgba(255,255,255,0.3);">...</div>
        </div>
        <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: rgba(255,255,255,0.1); border-radius: 0; overflow: hidden; z-index: 1; display: flex;">
           <div id="chatGPTAutomationProgressBar" style="width: 0%; height: 100%; background: #00d26a; box-shadow: 0 0 8px #00d26a; transition: width 0.4s ease;"></div>
        </div>`;
      sharedPanel.after(statusBox);
    }
  };
  render();
};

// --- PERSISTÊNCIA E AUTO-RETOMADA DE TELEMETRIA DOS ROBÔS (F5 DECOUPLING) ---
window.saveActiveDocGptJob = function(jobData) {
  try {
    localStorage.setItem('vortex_active_doc_gpt_job', JSON.stringify({
      ...jobData,
      savedAt: Date.now()
    }));
  } catch(e) {}
};

window.clearActiveDocGptJob = function() {
  try {
    localStorage.removeItem('vortex_active_doc_gpt_job');
  } catch(e) {}
};

window.getActiveDocGptJob = function() {
  try {
    const raw = localStorage.getItem('vortex_active_doc_gpt_job');
    return raw ? JSON.parse(raw) : null;
  } catch(e) {
    return null;
  }
};

window.saveActiveDocGeminiJob = function(jobData) {
  try {
    localStorage.setItem('vortex_active_doc_gemini_job', JSON.stringify({
      ...jobData,
      savedAt: Date.now()
    }));
  } catch(e) {}
};

window.clearActiveDocGeminiJob = function() {
  try {
    localStorage.removeItem('vortex_active_doc_gemini_job');
  } catch(e) {}
};

window.getActiveDocGeminiJob = function() {
  try {
    const raw = localStorage.getItem('vortex_active_doc_gemini_job');
    return raw ? JSON.parse(raw) : null;
  } catch(e) {
    return null;
  }
};

// Aliases para compatibilidade total com chamadas legadas
window.saveActiveDocRobotJob = function(jobData) {
  if (jobData?.provider === 'gemini') {
    window.saveActiveDocGeminiJob(jobData);
  } else {
    window.saveActiveDocGptJob(jobData);
  }
  try {
    localStorage.setItem('vortex_active_doc_robot_job', JSON.stringify({
      ...jobData,
      savedAt: Date.now()
    }));
  } catch(e) {}
};

window.clearActiveDocRobotJob = function() {
  window.clearActiveDocGptJob();
  window.clearActiveDocGeminiJob();
  try {
    localStorage.removeItem('vortex_active_doc_robot_job');
  } catch(e) {}
};

window.getActiveDocRobotJob = function() {
  return window.getActiveDocGptJob() || window.getActiveDocGeminiJob() || (() => {
    try {
      const raw = localStorage.getItem('vortex_active_doc_robot_job');
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  })();
};

window.saveActiveFlowGeminiJob = function(jobId) {
  try { localStorage.setItem('vortex_active_flow_gemini_job', jobId); } catch(e) {}
};

window.clearActiveFlowGeminiJob = function() {
  try { localStorage.removeItem('vortex_active_flow_gemini_job'); } catch(e) {}
};

window.saveActiveFlowGptJob = function(jobId) {
  try { localStorage.setItem('vortex_active_flow_gpt_job', jobId); } catch(e) {}
};

window.clearActiveFlowGptJob = function() {
  try { localStorage.removeItem('vortex_active_flow_gpt_job'); } catch(e) {}
};

window.isDocGptRobotRunning = function() {
  return !!(window.activeDocGptJobId || (typeof window.getActiveDocGptJob === 'function' && window.getActiveDocGptJob()));
};

window.isDocGeminiRobotRunning = function() {
  return !!(window.activeDocGeminiJobId || (typeof window.getActiveDocGeminiJob === 'function' && window.getActiveDocGeminiJob()));
};

window.isDocqwenRobotRunning = function() {
  return Boolean(window.activeDocqwenJobActive);
};

window.isDocRobotRunning = function() {
  return window.isDocGptRobotRunning() || window.isDocGeminiRobotRunning() || window.isDocqwenRobotRunning() || !!(window.activeDocChatGPTJobId || (typeof window.getActiveDocRobotJob === 'function' && window.getActiveDocRobotJob()));
};

window.syncTopbarTitlesAndTelemetries = function() {
  const gptMonitor = document.getElementById('docGptMonitorContainer');
  const geminiMonitor = document.getElementById('docGeminiMonitorContainer');
  const qwenMonitor = document.getElementById('docqwenMonitorContainer');
  const oldMonitor = document.getElementById('docMonitorContainer');
  const title = document.getElementById('topbarTitle');
  const subtitle = document.getElementById('topbarSubtitle');

  const gptVisible = gptMonitor && gptMonitor.style.display !== 'none';
  const geminiVisible = geminiMonitor && geminiMonitor.style.display !== 'none';
  const qwenVisible = qwenMonitor && qwenMonitor.style.display !== 'none';
  const oldVisible = oldMonitor && oldMonitor.style.display !== 'none' && oldMonitor.offsetWidth > 0;
  const anyVisible = gptVisible || geminiVisible || qwenVisible || oldVisible || window.isDocRobotRunning();

  if (title) title.style.display = anyVisible ? 'none' : '';
  if (subtitle) subtitle.style.display = anyVisible ? 'none' : '';
};

window.ensureDocTopbarTelemetryElement = function() {
  const topbar = document.getElementById('topbarMultiverseTitle');
  if (!topbar) return null;

  let row = document.getElementById('docMonitorsRow');
  if (!row) {
    row = document.createElement('div');
    row.id = 'docMonitorsRow';
    row.style.cssText = 'display: flex; flex-direction: row; gap: 15px; align-items: center; width: 100%; max-width: 1200px; box-sizing: border-box; flex-wrap: wrap; margin-bottom: 5px;';
    topbar.appendChild(row);
  }

  let gptMonitor = document.getElementById('docGptMonitorContainer');
  if (!gptMonitor) {
    gptMonitor = document.createElement('div');
    gptMonitor.id = 'docGptMonitorContainer';
    gptMonitor.style.cssText = 'display:none; width: 100%; flex: 1; min-width: 250px; background:rgba(5,12,28,0.97); border:1.5px solid #00c6ff; border-radius:8px; padding:6px 12px; box-shadow:0 3px 16px rgba(0,198,255,0.3); text-align:left; position:relative; margin:0; box-sizing:border-box;';
    gptMonitor.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
        <h4 id="docGptMonitorTitle" style="margin:0; color:#fff; font-family:var(--uiRounded); font-size:0.75rem; font-weight:700; line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:5px;">
          <span style="font-size:0.82rem;">🤖</span> Status do Robô GPT
        </h4>
        <button onclick="window.cancelDocChatGPTRobot()" style="background:rgba(255,0,0,0.2); border:1px solid rgba(255,0,0,0.5); color:#ff4d4d; width:20px; height:20px; border-radius:50%; font-size:9px; font-weight:bold; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;" title="Parar Robô GPT" aria-label="Parar Robô GPT">✕</button>
      </div>
      <div style="background:rgba(255,255,255,0.1); width:100%; height:5px; border-radius:3px; overflow:hidden; margin-bottom:3px;">
        <div id="docGptMonitorBar" style="height:100%; width:0%; background:var(--brandGrad, linear-gradient(90deg, #00c6ff, #0072ff)); transition:width 0.3s;"></div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; min-width:0;">
        <span id="docGptMonitorLog" style="color:var(--cyan, #00c6ff); font-family:monospace; font-size:0.68rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0;">Iniciando...</span>
        <span id="docGptMonitorPercent" style="color:#fff; font-weight:bold; font-size:0.75rem; font-family:monospace; flex-shrink:0;">0%</span>
      </div>
    `;
    row.appendChild(gptMonitor);
  }

  let geminiMonitor = document.getElementById('docGeminiMonitorContainer');
  if (!geminiMonitor) {
    geminiMonitor = document.createElement('div');
    geminiMonitor.id = 'docGeminiMonitorContainer';
    geminiMonitor.style.cssText = 'display:none; width: 100%; flex: 1; min-width: 250px; background:rgba(5,12,28,0.97); border:1.5px solid #e8006d; border-radius:8px; padding:6px 12px; box-shadow:0 3px 16px rgba(232,0,109,0.3); text-align:left; position:relative; margin:0; box-sizing:border-box;';
    geminiMonitor.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
        <h4 id="docGeminiMonitorTitle" style="margin:0; color:#fff; font-family:var(--uiRounded); font-size:0.75rem; font-weight:700; line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:5px;">
          <span style="font-size:0.82rem;">🔮</span> Status do Robô Gemini
        </h4>
        <button onclick="window.cancelDocGeminiRobot()" style="background:rgba(255,0,0,0.2); border:1px solid rgba(255,0,0,0.5); color:#ff4d4d; width:20px; height:20px; border-radius:50%; font-size:9px; font-weight:bold; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;" title="Parar Robô Gemini" aria-label="Parar Robô Gemini">✕</button>
      </div>
      <div style="background:rgba(255,255,255,0.1); width:100%; height:5px; border-radius:3px; overflow:hidden; margin-bottom:3px;">
        <div id="docGeminiMonitorBar" style="height:100%; width:0%; background:linear-gradient(90deg, #00c6ff, #e8006d); transition:width 0.3s;"></div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; min-width:0;">
        <span id="docGeminiMonitorLog" style="color:var(--cyan, #00c6ff); font-family:monospace; font-size:0.68rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0;">Iniciando...</span>
        <span id="docGeminiMonitorPercent" style="color:#fff; font-weight:bold; font-size:0.75rem; font-family:monospace; flex-shrink:0;">0%</span>
      </div>
    `;
    row.appendChild(geminiMonitor);
  }

  let qwenMonitor = document.getElementById('docqwenMonitorContainer');
  if (!qwenMonitor) {
    qwenMonitor = document.createElement('div');
    qwenMonitor.id = 'docqwenMonitorContainer';
    qwenMonitor.style.cssText = 'display:none; width: 100%; flex: 1; min-width: 250px; background:rgba(5,12,28,0.97); border:1.5px solid #10b981; border-radius:8px; padding:6px 12px; box-shadow:0 3px 16px rgba(16,185,129,0.3); text-align:left; position:relative; margin:0; box-sizing:border-box;';
    qwenMonitor.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
        <h4 id="docqwenMonitorTitle" style="margin:0; color:#fff; font-family:var(--uiRounded); font-size:0.75rem; font-weight:700; line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:5px;">
          <span style="font-size:0.82rem;">⚡</span> Status QWEN
        </h4>
        <button onclick="window.cancelDocqwenRobot()" style="background:rgba(255,0,0,0.2); border:1px solid rgba(255,0,0,0.5); color:#ff4d4d; width:20px; height:20px; border-radius:50%; font-size:9px; font-weight:bold; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;" title="Parar Qwen" aria-label="Parar Qwen">✕</button>
      </div>
      <div style="background:rgba(255,255,255,0.1); width:100%; height:5px; border-radius:3px; overflow:hidden; margin-bottom:3px;">
        <div id="docqwenMonitorBar" style="height:100%; width:0%; background:linear-gradient(90deg, #10b981, #00c6ff); transition:width 0.3s;"></div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; min-width:0;">
        <span id="docqwenMonitorLog" style="color:#10b981; font-family:monospace; font-size:0.68rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0;">Iniciando...</span>
        <span id="docqwenMonitorPercent" style="color:#fff; font-weight:bold; font-size:0.75rem; font-family:monospace; flex-shrink:0;">0%</span>
      </div>
    `;
    row.appendChild(qwenMonitor);
  }

  let monitor = document.getElementById('docMonitorContainer');
  if (!monitor) {
    monitor = document.createElement('div');
    monitor.id = 'docMonitorContainer';
    monitor.style.cssText = 'display:none; width:0; height:0; overflow:hidden;';
    monitor.innerHTML = `<h4 id="docMonitorTitle">Status do Robô</h4><div id="docMonitorBar"></div><span id="docMonitorLog"></span><span id="docMonitorPercent"></span>`;
    topbar.appendChild(monitor);
  }

  window.syncTopbarTitlesAndTelemetries();
  return monitor;
};

// O segundo caminho (Multiverso > Minisséries) usa o mesmo seletor compacto.
window.mountDocTopbarTelemetry = function(wrapper) {
  return window.ensureDocTopbarTelemetryElement();
};

window.showDocGptTopbarTelemetry = function() {
  if (window.docGptTelemetryHideTimer) clearTimeout(window.docGptTelemetryHideTimer);
  window.docGptTelemetryHideTimer = null;
  window.ensureDocTopbarTelemetryElement();
  const monitor = document.getElementById('docGptMonitorContainer');
  if (monitor) monitor.style.display = 'block';
  window.syncTopbarTitlesAndTelemetries();
};

window.hideDocGptTopbarTelemetry = function(delay = 2500) {
  if (window.docGptTelemetryHideTimer) clearTimeout(window.docGptTelemetryHideTimer);
  window.docGptTelemetryHideTimer = setTimeout(() => {
    const monitor = document.getElementById('docGptMonitorContainer');
    if (monitor) monitor.style.display = 'none';
    window.syncTopbarTitlesAndTelemetries();
    window.docGptTelemetryHideTimer = null;
  }, delay);
};

window.showDocGeminiTopbarTelemetry = function() {
  if (window.docGeminiTelemetryHideTimer) clearTimeout(window.docGeminiTelemetryHideTimer);
  window.docGeminiTelemetryHideTimer = null;
  window.ensureDocTopbarTelemetryElement();
  const monitor = document.getElementById('docGeminiMonitorContainer');
  if (monitor) monitor.style.display = 'block';
  window.syncTopbarTitlesAndTelemetries();
};

window.hideDocGeminiTopbarTelemetry = function(delay = 2500) {
  if (window.docGeminiTelemetryHideTimer) clearTimeout(window.docGeminiTelemetryHideTimer);
  window.docGeminiTelemetryHideTimer = setTimeout(() => {
    const monitor = document.getElementById('docGeminiMonitorContainer');
    if (monitor) monitor.style.display = 'none';
    window.syncTopbarTitlesAndTelemetries();
    window.docGeminiTelemetryHideTimer = null;
  }, delay);
};

window.showDocqwenTopbarTelemetry = function() {
  if (window.docqwenTelemetryHideTimer) clearTimeout(window.docqwenTelemetryHideTimer);
  window.docqwenTelemetryHideTimer = null;
  window.ensureDocTopbarTelemetryElement();
  const monitor = document.getElementById('docqwenMonitorContainer');
  if (monitor) monitor.style.display = 'block';
  window.syncTopbarTitlesAndTelemetries();
};

window.hideDocqwenTopbarTelemetry = function(delay = 2500) {
  if (window.docqwenTelemetryHideTimer) clearTimeout(window.docqwenTelemetryHideTimer);
  window.docqwenTelemetryHideTimer = setTimeout(() => {
    const monitor = document.getElementById('docqwenMonitorContainer');
    if (monitor) monitor.style.display = 'none';
    window.syncTopbarTitlesAndTelemetries();
    window.docqwenTelemetryHideTimer = null;
  }, delay);
};

window.showDocTopbarTelemetry = function(provider) {
  if (provider === 'gemini') {
    window.showDocGeminiTopbarTelemetry();
  } else if (provider === 'chatgpt' || provider === 'gpt') {
    window.showDocGptTopbarTelemetry();
  } else if (provider === 'qwen') {
    window.showDocqwenTopbarTelemetry();
  } else {
    if (window.isDocGptRobotRunning()) window.showDocGptTopbarTelemetry();
    if (window.isDocGeminiRobotRunning()) window.showDocGeminiTopbarTelemetry();
    if (window.isDocqwenRobotRunning && window.isDocqwenRobotRunning()) window.showDocqwenTopbarTelemetry();
    if (!window.isDocGptRobotRunning() && !window.isDocGeminiRobotRunning() && !(window.isDocqwenRobotRunning && window.isDocqwenRobotRunning())) {
      if (typeof AppState !== 'undefined' && AppState.visualRobotProvider === 'gemini') window.showDocGeminiTopbarTelemetry();
      else if (typeof AppState !== 'undefined' && AppState.visualRobotProvider === 'qwen') window.showDocqwenTopbarTelemetry();
      else window.showDocGptTopbarTelemetry();
    }
  }
};

window.hideDocTopbarTelemetry = function(delay = 2500) {
  window.hideDocGptTopbarTelemetry(delay);
  window.hideDocGeminiTopbarTelemetry(delay);
  window.hideDocqwenTopbarTelemetry(delay);
};

window.autoResumeAllRobotTelemetries = async function() {
  window.ensureDocTopbarTelemetryElement();

  // 1. Minisséries Robot GPT Telemetry
  try {
    const savedDocGptJob = window.getActiveDocGptJob();
    const gptJobIdQuery = savedDocGptJob?.jobId ? `?jobId=${encodeURIComponent(savedDocGptJob.jobId)}&provider=chatgpt` : '?provider=chatgpt';
    const resGpt = await fetch('/api/automate-chatgpt/status' + gptJobIdQuery);
    if (resGpt.ok) {
      const job = await resGpt.json();
      if (job && job.status === 'running' && job.jobId && (job.provider === 'chatgpt' || !job.provider || job.jobId.includes('chatgpt'))) {
        window.activeDocGptJobId = job.jobId;
        window.activeDocGptCampaignNumber = savedDocGptJob?.campaignNumber || job.docNum || (job.jobId.match(/-(\d{2})-/)?.[1] || '01');
        window.saveActiveDocGptJob({
          jobId: job.jobId,
          provider: 'chatgpt',
          campaignNumber: window.activeDocGptCampaignNumber
        });
        window.showDocGptTopbarTelemetry();
        const log = document.getElementById('docGptMonitorLog');
        const bar = document.getElementById('docGptMonitorBar');
        const percent = document.getElementById('docGptMonitorPercent');
        if (log) log.innerText = job.message || 'Retomando GPT...';
        const pct = Math.min(100, Math.max(0, job.progress || 0));
        if (bar) bar.style.width = pct + '%';
        if (percent) percent.innerText = pct + '%';
        window.pollDocGptAutomationStatus();
      } else if (!job || (job.status !== 'running' && job.status !== 'idle')) {
        window.clearActiveDocGptJob();
      }
    }
  } catch (e) {
    console.warn('Erro ao auto-retomar telemetria doc GPT:', e);
  }

  // 2. Minisséries Robot Gemini Telemetry (Documentários)
  try {
    const savedDocGeminiJob = window.getActiveDocGeminiJob();
    const savedFlowGeminiJobId = localStorage.getItem('vortex_active_flow_gemini_job');
    // Apenas retoma a telemetria compacta da barra se houver um job real de Documentários gravado e não for o job do Flow
    if (savedDocGeminiJob?.jobId && savedDocGeminiJob.jobId !== savedFlowGeminiJobId) {
      const geminiJobIdQuery = `?jobId=${encodeURIComponent(savedDocGeminiJob.jobId)}`;
      let resGemini = await fetch('/api/automate-gemini/status' + geminiJobIdQuery);
      let job = resGemini.ok ? await resGemini.json() : null;
      if (!job || job.status === 'idle') {
        const resFallback = await fetch('/api/automate-chatgpt/status?provider=gemini&jobId=' + encodeURIComponent(savedDocGeminiJob.jobId));
        if (resFallback.ok) {
          const fbJob = await resFallback.json();
          if (fbJob && fbJob.status === 'running') job = fbJob;
        }
      }
      if (job && job.status === 'running') {
        window.activeDocGeminiJobId = job.jobId || savedDocGeminiJob.jobId;
        window.activeDocGeminiCampaignNumber = savedDocGeminiJob.campaignNumber || job.docNum || job.campaignNumber || (job.jobId?.match(/-(\d{2})-/)?.[1] || '01');
        window.saveActiveDocGeminiJob({
          jobId: window.activeDocGeminiJobId,
          provider: 'gemini',
          campaignNumber: window.activeDocGeminiCampaignNumber
        });
        window.showDocGeminiTopbarTelemetry();
        const log = document.getElementById('docGeminiMonitorLog');
        const bar = document.getElementById('docGeminiMonitorBar');
        const percent = document.getElementById('docGeminiMonitorPercent');
        if (log) log.innerText = job.message || 'Retomando Gemini...';
        const pct = Math.min(100, Math.max(0, job.progress || 0));
        if (bar) bar.style.width = pct + '%';
        if (percent) percent.innerText = pct + '%';
        window.pollDocGeminiAutomationStatus();
      } else if (!job || (job.status !== 'running' && job.status !== 'idle')) {
        window.clearActiveDocGeminiJob();
      }
    }
  } catch (e) {
    console.warn('Erro ao auto-retomar telemetria doc Gemini:', e);
  }

  // 3. Flow Gemini Robot Telemetry
  try {
    const savedGeminiJobId = localStorage.getItem('vortex_active_flow_gemini_job');
    const geminiQuery = savedGeminiJobId ? `?jobId=${encodeURIComponent(savedGeminiJobId)}` : '';
    const resGemini = await fetch('/api/automate-gemini/status' + geminiQuery);
    if (resGemini.ok) {
      const job = await resGemini.json();
      if (job && job.status === 'running') {
        window.activeGeminiJobId = job.jobId || savedGeminiJobId || 'active';
        window.saveActiveFlowGeminiJob(window.activeGeminiJobId);
        // Garante que o monitor compacto do topo não apareça sobreposto ao central
        const docMonitor = document.getElementById('docGeminiMonitorContainer');
        if (docMonitor) docMonitor.style.display = 'none';
        const box = document.getElementById('geminiAutomationStatusBox');
        if (box) box.style.display = 'block';
        window.updateGlobalTelemetryWidget(job.message || 'Robô Gemini em andamento...', job.progress || 0, 'running');
        window.pollGeminiAutomationStatus();
      } else {
        window.clearActiveFlowGeminiJob();
      }
    }
  } catch (e) {
    console.warn('Erro ao auto-retomar telemetria flow gemini:', e);
  }

  // 4. Flow GPT Robot Telemetry
  try {
    const savedGptJobId = localStorage.getItem('vortex_active_flow_gpt_job');
    if (savedGptJobId && savedGptJobId !== window.activeDocGptJobId) {
      const resGpt = await fetch('/api/automate-chatgpt/status?jobId=' + encodeURIComponent(savedGptJobId));
      if (resGpt.ok) {
        const job = await resGpt.json();
        if (job && job.status === 'running') {
          window.activeChatGPTJobId = job.jobId || savedGptJobId;
          window.pollChatGPTAutomationStatus();
        } else {
          window.clearActiveFlowGptJob();
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao auto-retomar telemetria flow gpt:', e);
  }

  // 5. Minisséries Qwen API Telemetry
  try {
    const resqwen = await fetch('/api/automate-qwen/status');
    if (resqwen.ok) {
      const data = await resqwen.json();
      const job = data?.status;
      if (job && job.active && job.status === 'running') {
        window.activeDocqwenCampaignNumber = job.campaignNumber;
        window.activeDocqwenJobActive = true;
        window.showDocqwenTopbarTelemetry();
        window.pollDocqwenAutomationStatus(job.campaignNumber);
      }
    }
  } catch (e) {
    console.warn('Erro ao auto-retomar telemetria doc Qwen:', e);
  }
};

window.mountDocVisualRobotSwitcher = function(numDisplay) {
  const wrapper = document.getElementById('phase2Wrapper');
  if (!wrapper) return;
  // O primeiro filho do wrapper é o bloco <style>; o cabeçalho real vem depois dele.
  const header = document.getElementById('docPhase2Header') || Array.from(wrapper.children).find(el => el.tagName === 'DIV' && el.style.justifyContent === 'space-between');
  if (!header) return;
  const actionArea = header.lastElementChild;
  if (!actionArea) return;
  window.mountDocTopbarTelemetry(wrapper);

  const oldProvider = document.getElementById('docVisualRobotProvider');
  if (oldProvider) oldProvider.remove();
  const oldProviderArea = document.getElementById('docVisualRobotProviderArea');
  if (oldProviderArea) oldProviderArea.remove();

  const providerArea = document.createElement('div');
  providerArea.id = 'docVisualRobotProviderArea';
  providerArea.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:8px; margin-left:auto; margin-right:12px;';
  providerArea.innerHTML = `
    <select id="docVisualRobotProvider" onchange="window.setDocVisualRobotProvider(this.value)" title="Escolher plataforma da esteira" style="background:rgba(0,0,0,0.45); color:#fff; border:1px solid rgba(0,174,239,0.55); border-radius:7px; padding:8px 12px; font-weight:900; letter-spacing:1px; cursor:pointer;">
      <option value="chatgpt" ${AppState.visualRobotProvider === 'chatgpt' ? 'selected' : ''}>GPT</option>
      <option value="gemini" ${AppState.visualRobotProvider === 'gemini' ? 'selected' : ''}>GEMINI</option>
      <option value="qwen" ${AppState.visualRobotProvider === 'qwen' ? 'selected' : ''}>QWEN</option>
    </select>`;
  header.insertBefore(providerArea, actionArea);

  wrapper.querySelectorAll('button[onclick*="startGeminiDocMiniseries"]').forEach(button => {
    if (!button.dataset.geminiOnclick) {
      button.dataset.geminiOnclick = button.getAttribute('onclick') || '';
      button.dataset.geminiText = button.textContent;
    }
  });
  window.applyDocVisualRobotProvider();
};

window.setDocVisualRobotProvider = function(provider) {
  AppState.visualRobotProvider = (provider === 'chatgpt' || provider === 'qwen') ? provider : 'gemini';
  AppState.save();
  window.applyDocVisualRobotProvider();
};

window.applyDocVisualRobotProvider = function() {
  const wrapper = document.getElementById('phase2Wrapper');
  if (!wrapper) return;
  const currentProvider = AppState.visualRobotProvider || 'gemini';
  const providerSelect = document.getElementById('docVisualRobotProvider');
  if (providerSelect) providerSelect.value = currentProvider;
  wrapper.querySelectorAll('button[data-gemini-onclick], button[onclick*="startGeminiDocMiniseries"], button[onclick*="startDocChatGPTFullAutomation"], button[onclick*="startDocqwenAutomation"]').forEach(button => {
    const cNum = (button.getAttribute('onclick') || button.dataset.geminiOnclick || '').match(/'([^']+)'/)?.[1] || '';
    if (currentProvider === 'chatgpt') {
      button.setAttribute('onclick', `window.startDocChatGPTFullAutomation('${cNum}')`);
      button.innerHTML = '🚀 INICIAR ROBÔ GPT ' + (cNum ? 'M' + cNum : '');
    } else if (currentProvider === 'qwen') {
      button.setAttribute('onclick', `window.startDocqwenAutomation('${cNum}')`);
      button.innerHTML = '⚡ GERAR QWEN ' + (cNum ? 'M' + cNum : '');
    } else {
      button.setAttribute('onclick', `window.startDocGeminiPreparedAutomation('${cNum}')`);
      button.innerHTML = '🚀 INICIAR ROBÔ GEMINI ' + (cNum ? 'M' + cNum : '');
    }
  });
  const monitorTitle = document.querySelector('#docMonitorContainer h4');
  if (monitorTitle) {
    if (currentProvider === 'chatgpt') monitorTitle.textContent = 'Status do Robô GPT';
    else if (currentProvider === 'qwen') monitorTitle.textContent = 'Status QWEN';
    else monitorTitle.textContent = 'Status do Robô Gemini';
  }
  const stopButton = wrapper.querySelector('button[onclick*="forceStopGeminiDocRobot"], button[onclick*="cancelDocChatGPTRobot"], button[onclick*="cancelDocqwenRobot"]');
  if (stopButton) {
    stopButton.setAttribute('onclick', 'window.cancelDocVisualRobot()');
  }
};

window.requireAdjacentRobotTab = async function(platform) {
  const normalized = platform === 'gemini' ? 'gemini' : 'chatgpt';
  const label = normalized === 'gemini' ? 'GEMINI' : 'GPT';
  const verify = async () => {
    const response = await fetch(`/api/automate-chatgpt/browser-bridge/platform?platform=${normalized}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `A guia ${label} não foi localizada.`);
    return true;
  };
  try {
    return await verify();
  } catch (error) {
    const retry = confirm(`AGUARDANDO A GUIA ${label}.\n\nAbra a sessão ${label} desejada imediatamente ao lado da Central e clique em OK para verificar novamente.`);
    if (!retry) return false;
    try {
      return await verify();
    } catch (retryError) {
      alert(retryError.message || `A guia ${label} ainda não foi localizada ao lado da Central.`);
      return false;
    }
  }
};

window.startDocGeminiPreparedAutomation = async function(cNum) {
  if (!await window.requireAdjacentRobotTab('gemini')) return;
  const campaign = (AppState.campaigns || []).find(c => String(c.number).padStart(2, '0') === String(cNum).padStart(2, '0') || String(c.number) === String(cNum));
  if (!campaign) return alert('Minissérie não encontrada para o robô Gemini.');
  const block = document.getElementById(`phase2-block-M${String(cNum).padStart(2, '0')}`);
  const selectedSequences = block
    ? Array.from(block.querySelectorAll('.gemini-img-check:checked')).map(input => Number(input.value)).filter(Number.isInteger)
    : [];
  const operation = selectedSequences.length
    ? `abrir um novo chat e gerar somente as ${selectedSequences.length} cenas marcadas (${selectedSequences.join(', ')})`
    : 'abrir um novo chat e solicitar as 50 posições da fila oficial';
  if (!confirm(`O Robô Gemini vai ${operation}. A geração terminará antes dos downloads. Deseja iniciar?`)) return;

  window.showDocGeminiTopbarTelemetry();
  const log = document.getElementById('docGeminiMonitorLog');
  const percent = document.getElementById('docGeminiMonitorPercent');
  const bar = document.getElementById('docGeminiMonitorBar');
  if (log) log.innerText = `GEMINI M${cNum}: preparando ${operation}...`;
  if (percent) percent.innerText = '1%';
  if (bar) bar.style.width = '1%';

  try {
    const response = await fetch('/api/automate-gemini-vortex/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        number: campaign.number,
        selectedSequences
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha ao iniciar o robô Gemini.');
    window.activeDocGeminiCampaignNumber = String(campaign.number).padStart(2, '0');
    window.activeDocGeminiJobId = data.jobId;
    window.activeDocChatGPTJobId = data.jobId;
    window.saveActiveDocGeminiJob({
      jobId: data.jobId,
      provider: 'gemini',
      campaignNumber: window.activeDocGeminiCampaignNumber
    });
    window.pollDocGeminiAutomationStatus();
  } catch (error) {
    if (log) log.innerText = 'ERRO ROBÔ GEMINI: ' + error.message;
    window.showDocGeminiTopbarTelemetry();
    if (/Gere os 40 complementares|A fila final de 50 prompts/i.test(error.message)) {
      if (confirm(`⚠️ ${error.message}\n\nDeseja abrir a janela para gerar os 40 prompts complementares agora?`)) {
        window.openDocPromptsModal(campaign.number);
      }
    } else {
      alert('Robô Gemini: ' + error.message);
    }
  }
};

window.startDocChatGPTDownloadOnly = async function(cNum) {
  if (!confirm(`O Robô GPT vai usar somente o chat que está visível ao lado da Central e recuperar os downloads encontrados, sem enviar prompts. As imagens serão salvas pelas posições absolutas. Deseja iniciar?`)) return;
  const campaign = (AppState.campaigns || []).find(c => String(c.number).padStart(2, '0') === String(cNum).padStart(2, '0') || String(c.number) === String(cNum));
  if (!campaign) return alert('Minissérie não encontrada para a passagem de download.');

  window.showDocGptTopbarTelemetry();
  const log = document.getElementById('docGptMonitorLog');
  const bar = document.getElementById('docGptMonitorBar');
  const percent = document.getElementById('docGptMonitorPercent');
  if (log) log.innerText = 'Robô GPT: lendo o chat visível e recuperando os downloads pelas posições absolutas...';
  if (bar) bar.style.width = '1%';
  if (percent) percent.innerText = '1%';

  try {
    const res = await fetch('/api/automate-chatgpt/download-existing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: 'chatgpt-1',
        campaignId: campaign.id,
        number: campaign.number,
        total: 50,
        mode: 'minisseries'
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao iniciar a passagem exclusiva de download.');
    window.activeDocGptCampaignNumber = String(campaign.number).padStart(2, '0');
    window.activeDocGptJobId = data.jobId;
    window.activeDocChatGPTJobId = data.jobId;
    window.saveActiveDocGptJob({
      jobId: data.jobId,
      provider: 'chatgpt',
      campaignNumber: window.activeDocGptCampaignNumber,
      mode: 'download-only'
    });
    window.pollDocGptAutomationStatus();
  } catch (error) {
    if (log) log.innerText = 'ERRO ROBÔ GPT: ' + error.message;
    window.hideDocGptTopbarTelemetry();
  }
};

window.startDocChatGPTFullAutomation = async function(cNum) {
  if (!await window.requireAdjacentRobotTab('chatgpt')) return;
  const campaign = (AppState.campaigns || []).find(c => String(c.number).padStart(2, '0') === String(cNum).padStart(2, '0') || String(c.number) === String(cNum));
  if (!campaign) return alert('Minissérie não encontrada para o robô GPT.');

  const block = document.getElementById(`phase2-block-M${String(cNum).padStart(2, '0')}`);
  const selectedSequences = block
    ? Array.from(block.querySelectorAll('.gemini-img-check:checked')).map(input => Number(input.value)).filter(Number.isInteger)
    : [];
  const operation = selectedSequences.length === 0
    ? 'abrir um novo chat e solicitar as 50 posições da fila oficial'
    : `abrir um novo chat e gerar somente as ${selectedSequences.length} cenas marcadas (${selectedSequences.join(', ')})`;
  if (!confirm(`O Robô GPT vai ${operation}. Primeiro concluirá toda a rodada de geração; somente depois fará os downloads em sequência. Deseja iniciar?`)) return;

  const scenes = Array.isArray(campaign.gptScenes) && campaign.gptScenes.length
    ? campaign.gptScenes
    : (Array.isArray(campaign.scenes) ? campaign.scenes : []);
  if (scenes.length < 10) return alert('A minissérie precisa ter as 10 cenas GPT preparadas antes de iniciar a esteira.');

  window.showDocGptTopbarTelemetry();
  const log = document.getElementById('docGptMonitorLog');
  const bar = document.getElementById('docGptMonitorBar');
  const percent = document.getElementById('docGptMonitorPercent');
  if (log) log.innerText = selectedSequences.length === 0
    ? 'Iniciando Robô GPT: preparando a rodada com 50 cenas...'
    : `Iniciando Robô GPT para ${selectedSequences.length} cenas marcadas...`;
  if (bar) bar.style.width = '2%';
  if (percent) percent.innerText = '2%';

  try {
    const res = await fetch('/api/automate-chatgpt/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: 'chatgpt-1',
        campaignId: campaign.id,
        number: campaign.number,
        fullQueue: true,
        selectedSequences
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao iniciar o robô GPT da esteira.');
    window.activeDocGptCampaignNumber = String(campaign.number).padStart(2, '0');
    window.activeDocGptJobId = data.jobId;
    window.activeDocChatGPTJobId = data.jobId;
    window.saveActiveDocGptJob({
      jobId: data.jobId,
      provider: 'chatgpt',
      campaignNumber: window.activeDocGptCampaignNumber,
      mode: 'full'
    });
    window.pollDocGptAutomationStatus();
  } catch (error) {
    if (log) log.innerText = 'ERRO ROBÔ GPT: ' + error.message;
    window.showDocGptTopbarTelemetry();
    if (/Gere os 40 complementares|A fila final de 50 prompts/i.test(error.message)) {
      if (confirm(`⚠️ ${error.message}\n\nDeseja abrir a janela para gerar os 40 prompts complementares agora?`)) {
        window.openDocPromptsModal(campaign.number);
      }
    } else {
      alert('Robô GPT: ' + error.message);
    }
  }
};

window.pollDocGptAutomationStatus = function() {
  if (window.activeDocGptPollInterval) clearInterval(window.activeDocGptPollInterval);
  window.activeDocGptPollInterval = setInterval(async () => {
    const jobId = window.activeDocGptJobId || window.getActiveDocGptJob()?.jobId;
    if (!jobId) return;
    try {
      const res = await fetch('/api/automate-chatgpt/status?jobId=' + encodeURIComponent(jobId) + '&provider=chatgpt');
      const job = await res.json();
      window.showDocGptTopbarTelemetry();
      const log = document.getElementById('docGptMonitorLog');
      const bar = document.getElementById('docGptMonitorBar');
      const percent = document.getElementById('docGptMonitorPercent');
      if (log) log.innerText = job.status === 'failed' ? 'ERRO ROBÔ GPT: ' + (job.error || 'falha') : (job.message || 'Processando GPT...');
      const pct = Math.min(100, Math.max(0, job.progress || 0));
      if (bar) bar.style.width = pct + '%';
      if (percent) percent.innerText = pct + '%';

      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        clearInterval(window.activeDocGptPollInterval);
        const finishedCampaignNumber = window.activeDocGptCampaignNumber;
        window.activeDocGptJobId = null;
        window.clearActiveDocGptJob();
        if (job.status === 'completed') {
          if (log) log.innerText = job.message || 'Robô GPT finalizou os downloads em ordem.';
          if (bar) bar.style.width = '100%';
          if (percent) percent.innerText = '100%';
        }
        if (finishedCampaignNumber) {
          window.refreshDocChatGPTThumbnails(finishedCampaignNumber);
        }
        if (job.status === 'failed') window.showDocTopbarTelemetry();
        else window.hideDocGptTopbarTelemetry(3000);
      }
    } catch (error) {
      console.warn('Status do robô GPT indisponível:', error.message);
    }
  }, 1500);
};

window.pollDocGeminiAutomationStatus = function() {
  if (window.activeDocGeminiPollInterval) clearInterval(window.activeDocGeminiPollInterval);
  window.activeDocGeminiPollInterval = setInterval(async () => {
    const jobId = window.activeDocGeminiJobId || window.getActiveDocGeminiJob()?.jobId;
    try {
      const geminiQuery = (jobId && jobId !== 'active') ? `?jobId=${encodeURIComponent(jobId)}` : '';
      let res = await fetch('/api/automate-gemini/status' + geminiQuery);
      let job = res.ok ? await res.json() : null;
      if (!job || job.status === 'idle') {
        const fallbackRes = await fetch('/api/automate-chatgpt/status?provider=gemini' + (jobId && jobId !== 'active' ? `&jobId=${encodeURIComponent(jobId)}` : ''));
        if (fallbackRes.ok) {
          const fallbackJob = await fallbackRes.json();
          if (fallbackJob && fallbackJob.status !== 'idle') {
            job = fallbackJob;
          }
        }
      }
      if (!job || job.status === 'idle') return;

      window.showDocGeminiTopbarTelemetry();
      const log = document.getElementById('docGeminiMonitorLog');
      const bar = document.getElementById('docGeminiMonitorBar');
      const percent = document.getElementById('docGeminiMonitorPercent');

      if (job.status === 'running') {
        if (log) log.innerText = job.message || 'Processando Gemini...';
        const pct = Math.min(100, Math.max(0, job.progress || 0));
        if (bar) bar.style.width = pct + '%';
        if (percent) percent.innerText = pct + '%';
        if (job.jobId && !window.activeDocGeminiJobId) {
          window.activeDocGeminiJobId = job.jobId;
        }
        if (job.docNum || job.campaignNumber) {
          window.activeDocGeminiCampaignNumber = String(job.docNum || job.campaignNumber).padStart(2, '0');
        }
      } else if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        clearInterval(window.activeDocGeminiPollInterval);
        const finishedCampaignNumber = window.activeDocGeminiCampaignNumber || job.docNum || job.campaignNumber;
        window.activeDocGeminiJobId = null;
        window.clearActiveDocGeminiJob();
        if (job.status === 'completed') {
          if (log) log.innerText = job.message || 'Robô Gemini finalizou os downloads em ordem.';
          if (bar) bar.style.width = '100%';
          if (percent) percent.innerText = '100%';
        } else if (job.status === 'failed') {
          if (log) log.innerText = 'ERRO ROBÔ GEMINI: ' + (job.error || job.message || 'falha');
        } else {
          if (log) log.innerText = 'Robô Gemini cancelado.';
        }
        if (finishedCampaignNumber) {
          window.refreshDocChatGPTThumbnails(finishedCampaignNumber);
        }
        if (job.status === 'failed') window.showDocGeminiTopbarTelemetry();
        else window.hideDocGeminiTopbarTelemetry(4000);
      }
    } catch (error) {
      console.warn('Status do robô Gemini indisponível:', error.message);
    }
  }, 1500);
};

window.pollDocChatGPTAutomationStatus = function() {
  if (window.activeDocGptJobId) window.pollDocGptAutomationStatus();
  if (window.activeDocGeminiJobId) window.pollDocGeminiAutomationStatus();
  if (window.activeDocqwenJobActive) window.pollDocqwenAutomationStatus();
  if (!window.activeDocGptJobId && !window.activeDocGeminiJobId && window.activeDocChatGPTJobId) {
    if (window.activeDocRobotProvider === 'gemini') {
      window.activeDocGeminiJobId = window.activeDocChatGPTJobId;
      window.pollDocGeminiAutomationStatus();
    } else {
      window.activeDocGptJobId = window.activeDocChatGPTJobId;
      window.pollDocGptAutomationStatus();
    }
  }
};

window.startDocqwenAutomation = async function(cNum) {
  const cleanNumber = String(cNum || '01').padStart(2, '0');
  const block = document.getElementById('phase2-block-M' + cleanNumber);
  const checkedBoxes = block ? block.querySelectorAll('.gemini-img-check:checked') : [];
  
  let sequences = [];
  if (checkedBoxes.length > 0) {
    sequences = Array.from(checkedBoxes).map(cb => Number(cb.value)).filter(Boolean);
  }
  
  const seqLabel = sequences.length > 0 ? `${sequences.length} posições marcadas (${sequences.join(', ')})` : 'todas as 50 posições da esteira (pulando as que já existem)';
  const confirmStart = confirm(`⚡ Iniciar geração direta via Qwen (OpenAI API)?\n\nMinissérie: #${cleanNumber}\nAlvo: ${seqLabel}\nFormato: 16:9 Widescreen (1792x1024)\n\nAs imagens geradas serão salvas automaticamente em minisseries/${cleanNumber}/M${cleanNumber}/.`);
  if (!confirmStart) return;

  window.activeDocqwenCampaignNumber = cleanNumber;
  window.activeDocqwenJobActive = true;
  window.showDocqwenTopbarTelemetry();
  
  const log = document.getElementById('docqwenMonitorLog');
  const bar = document.getElementById('docqwenMonitorBar');
  const percent = document.getElementById('docqwenMonitorPercent');
  if (log) log.innerText = `Iniciando Qwen para Minissérie #${cleanNumber}...`;
  if (bar) bar.style.width = '2%';
  if (percent) percent.innerText = '2%';

  // Atualiza visual do botão na esteira
  if (block) {
    const btn = block.querySelector('button[onclick*="startDocqwenAutomation"]');
    if (btn) {
      btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = '⏳ GERANDO Qwen...';
      btn.style.boxShadow = '0 0 15px #10b981';
    }
  }

  try {
    const res = await fetch('/api/automate-qwen/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignNumber: cleanNumber,
        sequences,
        quality: 'standard'
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Falha ao iniciar geração no Qwen.');
    }
    if (typeof showToast === 'function') {
      showToast(`⚡ Qwen iniciado para Minissérie #${cleanNumber}`, 'info');
    }
    window.pollDocqwenAutomationStatus(cleanNumber);
  } catch (err) {
    window.activeDocqwenJobActive = false;
    if (log) log.innerText = 'ERRO Qwen: ' + err.message;
    if (block) {
      const btn = block.querySelector('button[onclick*="startDocqwenAutomation"]');
      if (btn && btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
    }
    alert('Erro Qwen: ' + err.message);
  }
};

window.pollDocqwenAutomationStatus = function(targetCampaignNumber) {
  if (window.activeDocqwenPollInterval) clearInterval(window.activeDocqwenPollInterval);
  window.activeDocqwenPollInterval = setInterval(async () => {
    const cNum = targetCampaignNumber || window.activeDocqwenCampaignNumber;
    try {
      const res = await fetch('/api/automate-qwen/status' + (cNum ? `?number=${encodeURIComponent(cNum)}` : ''));
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.status) return;
      const job = data.status;

      window.showDocqwenTopbarTelemetry();
      const log = document.getElementById('docqwenMonitorLog');
      const bar = document.getElementById('docqwenMonitorBar');
      const percent = document.getElementById('docqwenMonitorPercent');

      const block = document.getElementById('phase2-block-M' + String(cNum).padStart(2, '0'));
      const btn = block ? block.querySelector('button[onclick*="startDocqwenAutomation"]') : null;

      if (job.status === 'running') {
        window.activeDocqwenJobActive = true;
        if (log) log.innerText = job.log || 'Processando Qwen...';
        const pct = Math.min(100, Math.max(0, job.percent || 0));
        if (bar) bar.style.width = pct + '%';
        if (percent) percent.innerText = pct + '%';
        if (btn) {
          btn.innerHTML = `⏳ GERANDO [${job.current}/${job.total}] (${pct}%)`;
          btn.style.boxShadow = '0 0 15px #10b981';
        }
        if (cNum) window.refreshDocChatGPTThumbnails(cNum);
      } else if (job.status === 'completed' || job.status === 'error' || job.status === 'cancelled') {
        clearInterval(window.activeDocqwenPollInterval);
        window.activeDocqwenJobActive = false;
        
        if (btn) {
          btn.innerHTML = `⚡ GERAR QWEN M${cNum}`;
          btn.style.boxShadow = '';
        }

        if (job.status === 'completed') {
          if (log) log.innerText = job.log || 'Qwen finalizou a esteira com sucesso.';
          if (bar) bar.style.width = '100%';
          if (percent) percent.innerText = '100%';
          if (typeof showToast === 'function') {
            showToast(`✅ Qwen: ${job.completedSequences?.length || 0} imagens geradas e salvas com sucesso!`, 'success');
          }
          window.hideDocqwenTopbarTelemetry(6000);
        } else if (job.status === 'error') {
          if (log) log.innerText = 'ERRO Qwen: ' + (job.error || job.log);
          if (typeof showToast === 'function') {
            showToast(`❌ Qwen: ${job.error || job.log}`, 'error');
          }
          window.showDocqwenTopbarTelemetry();
        } else {
          if (log) log.innerText = 'Qwen cancelado pelo operador.';
          window.hideDocqwenTopbarTelemetry(3000);
        }
        if (cNum) window.refreshDocChatGPTThumbnails(cNum);
      }
    } catch (err) {
      console.warn('Status do Qwen indisponível:', err.message);
    }
  }, 1200);
};

window.cancelDocqwenRobot = async function() {
  try {
    await fetch('/api/automate-qwen/cancel', { method: 'POST' });
    const log = document.getElementById('docqwenMonitorLog');
    if (log) log.innerText = 'Cancelando Qwen...';
  } catch (err) {
    console.warn('Erro ao cancelar Qwen:', err);
  }
};

window.isDocqwenRobotRunning = function() {
  return Boolean(window.activeDocqwenJobActive);
};

window.refreshDocChatGPTThumbnails = function(cNum) {
  const normalized = String(cNum).padStart(2, '0');
  const block = document.getElementById(`phase2-block-M${normalized}`);
  if (!block) return;
  const docNum = block.dataset.docNum || normalized;
  const campaignNum = block.dataset.campaignNum || normalized;
  if (typeof window.hydrateDocPhase2Thumbnails === 'function') {
    void window.hydrateDocPhase2Thumbnails(docNum, campaignNum);
  }
};

window.cancelDocChatGPTRobot = async function() {
  const jobId = window.activeDocGptJobId || window.getActiveDocGptJob()?.jobId || window.activeDocChatGPTJobId;
  if (!jobId) return;
  if (!confirm('Deseja parar o robô GPT da esteira?')) return;
  await fetch('/api/automate-chatgpt/cancel?jobId=' + encodeURIComponent(jobId) + '&provider=chatgpt', { method: 'POST' }).catch(() => {});
  if (window.activeDocGptPollInterval) clearInterval(window.activeDocGptPollInterval);
  window.activeDocGptJobId = null;
  window.clearActiveDocGptJob();
  const log = document.getElementById('docGptMonitorLog');
  if (log) log.innerText = 'ROBÔ GPT PARADO PELO USUÁRIO.';
  window.hideDocGptTopbarTelemetry();
};

window.cancelDocGeminiRobot = async function() {
  const jobId = window.activeDocGeminiJobId || window.getActiveDocGeminiJob()?.jobId || window.activeDocChatGPTJobId;
  if (!jobId) return;
  if (!confirm('Deseja parar o robô Gemini da esteira?')) return;
  await fetch('/api/automate-chatgpt/cancel?jobId=' + encodeURIComponent(jobId) + '&provider=gemini', { method: 'POST' }).catch(() => {});
  if (window.activeDocGeminiPollInterval) clearInterval(window.activeDocGeminiPollInterval);
  window.activeDocGeminiJobId = null;
  window.clearActiveDocGeminiJob();
  const log = document.getElementById('docGeminiMonitorLog');
  if (log) log.innerText = 'ROBÔ GEMINI PARADO PELO USUÁRIO.';
  window.hideDocGeminiTopbarTelemetry();
};

window.cancelDocVisualRobot = function(provider) {
  if (provider === 'chatgpt') return window.cancelDocChatGPTRobot();
  if (provider === 'gemini') return window.cancelDocGeminiRobot();
  if (window.isDocGptRobotRunning() && !window.isDocGeminiRobotRunning()) return window.cancelDocChatGPTRobot();
  if (window.isDocGeminiRobotRunning() && !window.isDocGptRobotRunning()) return window.cancelDocGeminiRobot();
  if (typeof AppState !== 'undefined' && AppState.visualRobotProvider === 'gemini') return window.cancelDocGeminiRobot();
  return window.cancelDocChatGPTRobot();
};

window.startChatGPTWebAutomation = async function(campaignId) {
  if (!confirm('Será gerada uma imagem-piloto no ChatGPT, com a conta escolhida. O download ocorrerá somente depois da geração. Deseja iniciar?')) return;
  const campaign = (AppState.campaigns || []).find(c => c.id === campaignId || c.number == campaignId);
  if (!campaign) return alert('Nenhuma minissérie selecionada.');
  const scenes = Array.isArray(campaign.gptScenes) && campaign.gptScenes.length ? campaign.gptScenes : (Array.isArray(campaign.scenes) ? campaign.scenes : []);
  const scene = scenes[0];
  const prompt = scene && (scene.prompt || scene.gptPrompt || scene.visualPrompt || scene.description || '');
  if (!prompt.trim()) return alert('A primeira cena GPT ainda não possui prompt para o teste.');

  const box = document.getElementById('chatGPTAutomationStatusBox');
  const txt = document.getElementById('chatGPTAutomationStatusText');
  const bar = document.getElementById('chatGPTAutomationProgressBar');
  const btn = document.getElementById('btnAutomateChatGPTWeb');
  if (box) box.style.display = 'block';
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.style.pointerEvents = 'none'; }
  if (txt) txt.textContent = '🤖 GPT: conectando à sessão selecionada...';
  try {
    const res = await fetch('/api/automate-chatgpt/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: 'chatgpt-1', campaignId: campaign.id, number: campaign.number, prompts: [{ type: 'gpt', sceneNum: '001', fullPrompt: prompt }] })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao iniciar o robô ChatGPT.');
    window.activeChatGPTJobId = data.jobId;
    window.pollChatGPTAutomationStatus();
  } catch (error) {
    if (txt) txt.textContent = '⚠️ ' + error.message;
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
  }
};

// Robô GPT do dashboard: gera as sete imagens destinadas ao Flow.
// A esteira de 50 imagens usa startChatGPTFullAutomation, em outro caminho.
window.startChatGPTFlowAutomation = async function(campaignId) {
  if (!confirm('Serão geradas as 7 imagens GPT destinadas ao Flow. O download ocorrerá somente depois da geração. Deseja iniciar?')) return;
  const campaign = (AppState.campaigns || []).find(c => c.id === campaignId || c.number == campaignId);
  if (!campaign) return alert('Nenhuma minissérie selecionada.');

  const selected = Array.from(document.querySelectorAll('.chatgpt-flow-scene-chk:checked')).map(cb => cb.value);
  const sourceScenes = Array.isArray(campaign.geminiScenes) && campaign.geminiScenes.length
    ? campaign.geminiScenes
    : (Array.isArray(campaign.scenes) ? campaign.scenes.filter(scene => scene.geminiMotion) : []);
  const prompts = sourceScenes.slice(0, 7).map((scene, index) => ({
    type: 'chatgpt-flow',
    sceneNum: String(index + 1).padStart(2, '0'),
    fullPrompt: String(scene.geminiMotion || scene.prompt || scene.visualPrompt || scene.description || '').trim()
  })).filter(item => (selected.length === 0 || selected.includes(item.sceneNum)) && item.fullPrompt);

  if (!prompts.length) return alert('Selecione pelo menos uma cena GPT com prompt visual disponível.');

  const box = document.getElementById('chatGPTAutomationStatusBox');
  const txt = document.getElementById('chatGPTAutomationStatusText');
  const bar = document.getElementById('chatGPTAutomationProgressBar');
  const btn = document.getElementById('btnAutomateChatGPTFlow');
  if (box) box.style.display = 'flex';
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.style.pointerEvents = 'none'; }
  if (txt) txt.textContent = '🤖 GPT: conectando ao Chrome e aguardando a conta selecionada...';
  if (bar) bar.style.width = '2%';

  try {
    const res = await fetch('/api/automate-chatgpt/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: 'chatgpt-1',
        campaignId: campaign.id,
        number: campaign.number,
        mode: 'flow',
        prompts
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao iniciar o robô GPT do Flow.');
    window.activeChatGPTJobId = data.jobId;
    window.pollChatGPTAutomationStatus();
  } catch (error) {
    if (txt) txt.textContent = '⚠️ ' + error.message;
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
  }
};

window.buildChatGPTQueue = async function(campaignId) {
  const campaign = (AppState.campaigns || []).find(c => c.id === campaignId || c.number == campaignId);
  if (!campaign) throw new Error('Nenhuma minissérie selecionada.');
  const scenes = Array.isArray(campaign.gptScenes) && campaign.gptScenes.length ? campaign.gptScenes : (Array.isArray(campaign.scenes) ? campaign.scenes : []);
  const res = await fetch('/api/automate-chatgpt/queue', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId: campaign.id, number: campaign.number, gptScenes: scenes.slice(0, 10) })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao montar a esteira de 50 imagens.');
  return data;
};

window.startChatGPTFullAutomation = async function(campaignId) {
  if (!confirm('A Central vai montar a fila final com 50 imagens. O robô gerará as 50 primeiro e somente depois iniciará os downloads em ordem. Deseja iniciar?')) return;
  const campaign = (AppState.campaigns || []).find(c => c.id === campaignId || c.number == campaignId);
  if (!campaign) return alert('Nenhuma minissérie selecionada.');
  const scenes = Array.isArray(campaign.gptScenes) && campaign.gptScenes.length ? campaign.gptScenes : (Array.isArray(campaign.scenes) ? campaign.scenes : []);
  const box = document.getElementById('chatGPTAutomationStatusBox');
  const txt = document.getElementById('chatGPTAutomationStatusText');
  const bar = document.getElementById('chatGPTAutomationProgressBar');
  const btn = document.getElementById('btnAutomateChatGPTFull');
  if (box) box.style.display = 'flex';
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.style.pointerEvents = 'none'; }
  if (txt) txt.textContent = '🧩 Central: montando a fila GPT 01–50...';
  if (bar) bar.style.width = '2%';
  try {
    const res = await fetch('/api/automate-chatgpt/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: 'chatgpt-1', campaignId: campaign.id, number: campaign.number, fullQueue: true, gptScenes: scenes.slice(0, 10) })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao iniciar a esteira GPT.');
    window.activeChatGPTJobId = data.jobId;
    window.saveActiveFlowGptJob(data.jobId);
    window.pollChatGPTAutomationStatus();
  } catch (error) {
    if (txt) txt.textContent = '⚠️ ' + error.message;
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
  }
};

window.pollChatGPTAutomationStatus = function() {
  if (window.chatGPTPollInterval) clearInterval(window.chatGPTPollInterval);
  window.chatGPTPollInterval = setInterval(async () => {
    if (!window.activeChatGPTJobId) return;
    try {
      const res = await fetch('/api/automate-chatgpt/status?jobId=' + encodeURIComponent(window.activeChatGPTJobId));
      const job = await res.json();
      const box = document.getElementById('chatGPTAutomationStatusBox');
      const txt = document.getElementById('chatGPTAutomationStatusText');
      const bar = document.getElementById('chatGPTAutomationProgressBar');
      const percent = document.getElementById('chatGPTAutomationPercent');
      const btn = document.getElementById('btnAutomateChatGPTFlow') || document.getElementById('btnAutomateChatGPTWeb');
      const fullBtn = document.getElementById('btnAutomateChatGPTFull');
      if (box) box.style.display = 'flex';
      let msg = job.status === 'failed' ? '❌ ' + (job.error || 'ERRO') : (job.message || 'Processando...');
      
      if (txt) txt.textContent = msg;
      const pVal = Math.min(100, Math.max(0, job.progress || 0));
      if (bar) bar.style.width = pVal + '%';
      if (percent) percent.innerText = pVal + '%';
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        clearInterval(window.chatGPTPollInterval);
        window.activeChatGPTJobId = null;
        window.clearActiveFlowGptJob();
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
        if (fullBtn) { fullBtn.disabled = false; fullBtn.style.opacity = '1'; fullBtn.style.pointerEvents = 'auto'; }
        setTimeout(() => {
          const currentBox = document.getElementById('chatGPTAutomationStatusBox');
          if (currentBox) currentBox.style.display = 'none';
        }, 3500);
      }
    } catch (error) { console.warn('Status do robô GPT indisponível:', error.message); }
  }, 1500);
};

// 🤖 AUTOMAÇÃO DO ROBÔ GEMINI WEB (IMAGENS HD IMAGEN 3 DE 5-7MB)
window.startGeminiWebAutomation = async function(campaignId) {
  if (typeof window.requireAdjacentRobotTab === 'function' && !await window.requireAdjacentRobotTab('gemini')) {
    return;
  }
  if (!confirm("⚠️ ATENÇÃO: Deseja realmente iniciar o Robô Gemini Web para as cenas selecionadas?\n\nEste processo assumirá o controle do seu Chrome.")) {
    return;
  }
  const campaign = (AppState.campaigns || []).find(c => c.id === campaignId || c.number == campaignId);
  if (!campaign) {
    alert("Nenhuma minissérie selecionada.");
    return;
  }

  const numStr = String(campaign.number || campaign.id).padStart(2, '0');
  
  const box = document.getElementById('geminiAutomationStatusBox');
  const txt = document.getElementById('geminiAutomationStatusText');
  const pct = document.getElementById('geminiAutomationPercent');
  const bar = document.getElementById('geminiAutomationProgressBar');
  const btn = document.getElementById('btnAutomateGeminiWeb');

  const docMonitor = document.getElementById('docGeminiMonitorContainer');
  if (docMonitor) docMonitor.style.display = 'none';
  if (box) box.style.display = 'block';
  if (btn) {
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';
  }

  if (txt) txt.innerText = `🤖 ROBÔ GEMINI WEB: Conectando ao Chrome (Minissérie ${numStr})...`;
  if (pct) pct.innerText = '5%';
  if (bar) bar.style.width = '5%';

  try {
    const selectedGemini = Array.from(document.querySelectorAll('.gemini-scene-chk') || []).filter(cb => cb.checked).map(cb => cb.value);

    const prompts = [];
    const geminiScenes = Array.isArray(campaign.geminiScenes)
      ? campaign.geminiScenes
      : (Array.isArray(campaign.scenes) ? campaign.scenes.filter(s => s.geminiMotion) : []);
    if (geminiScenes.length) {
      // GEMINI — até 7 cenas de movimento em ordem (limite do Google Flow)
      geminiScenes.slice(0, 7).forEach((s, idx) => {
        const sceneNum = String(idx + 1).padStart(2, '0');
        if (selectedGemini.includes(sceneNum) || selectedGemini.length === 0) {
           const cenaMotion = (s.geminiMotion || s.prompt || '').trim();
           prompts.push({ type: 'gemini', sceneNum: sceneNum, fullPrompt: cenaMotion });
        }
      });
    }

    if (prompts.length === 0) {
      alert("Selecione pelo menos uma cena do Gemini para iniciar o robô.");
      if (box) box.style.display = 'none';
      if (btn) {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
      return;
    }


    const res = await fetch('/api/automate-gemini/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign.id, number: numStr, prompts: prompts })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }

    const data = await res.json();
    window.activeGeminiJobId = data.jobId;
    window.saveActiveFlowGeminiJob(data.jobId);
    window.pollGeminiAutomationStatus();

  } catch(err) {
    if (txt) txt.innerText = `⚠️ ${err.message || 'Falha na automação (servidor iniciando)'}`;
    if (btn) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  }
};

window.updateGlobalTelemetryWidget = function(titleText, progressVal, statusType) {
  // Desabilitada: a telemetria maior do Gemini agora cumpre esse papel na mesma posição.
};

window.hideGlobalTelemetryWidget = function() {
  // Desabilitada
};

window.pollGeminiAutomationStatus = function() {
  if (window.geminiPollInterval) clearInterval(window.geminiPollInterval);

  let idleTicks = 0;

  window.geminiPollInterval = setInterval(async () => {
    if (!window.activeGeminiJobId) return;

    try {
      const res = await fetch('/api/automate-gemini/status?jobId=' + encodeURIComponent(window.activeGeminiJobId));
      if (!res.ok) return;

      const job = await res.json();
      const box = document.getElementById('geminiAutomationStatusBox');
      const txt = document.getElementById('geminiAutomationStatusText');
      const pct = document.getElementById('geminiAutomationPercent');
      const bar = document.getElementById('geminiAutomationProgressBar');
      const btn = document.getElementById('btnAutomateGeminiWeb');

      if (!job.status || job.status === 'idle') {
        idleTicks++;
        if (idleTicks < 5) {
          if (box) box.style.display = 'block';
          return;
        }
        clearInterval(window.geminiPollInterval);
        window.activeGeminiJobId = null;
        window.geminiLastStatus = null;
        window.clearActiveFlowGeminiJob();
        if (box) box.style.display = 'none';
        window.hideGlobalTelemetryWidget();
        if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
        return;
      }
      idleTicks = 0;

      // Job ativo: força o box 100% visível
      if (box) box.style.display = 'block';

      const percentVal = Math.min(100, Math.max(0, job.progress || 0));
      window.geminiLastStatus = { message: job.message, progress: percentVal, status: job.status || 'running', error: job.error };

      if (txt) txt.innerText = `🤖 ${job.message || 'Processando...'}`;
      if (pct) pct.innerText = `${percentVal}%`;
      if (bar) bar.style.width = `${percentVal}%`;

      window.updateGlobalTelemetryWidget(job.message, percentVal, job.status || 'running');

      if (job.status === 'completed') {
        clearInterval(window.geminiPollInterval);
        window.activeGeminiJobId = null;
        window.geminiLastStatus = null;
        window.clearActiveFlowGeminiJob();
        if (txt) txt.innerText = `🟢 CONCLUÍDO: ${job.message || 'Todas as imagens HD salvas!'}`;
        if (pct) pct.innerText = '100%';
        if (bar) bar.style.width = '100%';
        if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
        // Esconde o box após 8s para não poluir a tela
        setTimeout(() => { 
          if (box) box.style.display = 'none';
          window.hideGlobalTelemetryWidget();
        }, 8000);
      } else if (job.status === 'failed' || job.status === 'cancelled') {
        clearInterval(window.geminiPollInterval);
        window.activeGeminiJobId = null;
        window.geminiLastStatus = null;
        window.clearActiveFlowGeminiJob();
        if (txt) txt.innerText = `❌ ERRO: ${job.error || 'Falha na automação'}`;
        if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
        setTimeout(() => { 
          if (box) box.style.display = 'none';
          window.hideGlobalTelemetryWidget();
        }, 10000);
      }
    } catch(err) {
      console.error("Erro no poll do robô:", err);
    }
  }, 1500);
};

window.cancelGeminiWebAutomation = async function() {
  if (!window.activeGeminiJobId && !window.activeDocGeminiJobId) {
    const box = document.getElementById('geminiAutomationStatusBox');
    const btn = document.getElementById('btnAutomateGeminiWeb');
    if (box) box.style.display = 'none';
    window.hideGlobalTelemetryWidget();
    if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
    return;
  }
  
  const box = document.getElementById('geminiAutomationStatusBox');
  const txt = document.getElementById('geminiAutomationStatusText');
  const btn = document.getElementById('btnAutomateGeminiWeb');
  
  if (txt) txt.innerText = '🛑 CANCELANDO ROBÔ... Aguarde.';
  window.updateGlobalTelemetryWidget('🛑 CANCELANDO ROBÔ... Aguarde.', 0, 'failed');
  
  try {
    const jobId = window.activeGeminiJobId || window.activeDocGeminiJobId;
    await fetch('/api/automate-gemini/cancel?jobId=' + jobId, { method: 'POST' });
  } catch(e) {}
  
  if (window.geminiPollInterval) clearInterval(window.geminiPollInterval);
  if (window.activeDocPollInterval) clearInterval(window.activeDocPollInterval);
  
  window.activeGeminiJobId = null;
  window.activeDocGeminiJobId = null;
  window.geminiLastStatus = null;
  window.clearActiveFlowGeminiJob();
  
  setTimeout(() => {
    if (box) box.style.display = 'none';
    if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
  }, 1500);
};

window.rescueGeminiWebDownloads = async function(campaignId) {
  const campaign = (AppState.campaigns || []).find(c => c.id === campaignId || c.number == campaignId);
  if (!campaign) return alert('Nenhuma minissérie selecionada.');
  const numStr = String(campaign.number || campaign.id).padStart(2, '0');
  
  if (!confirm('📥 RESGATE GEMINI: o robô NÃO vai enviar prompts nem trocar de chat.\nEle usará somente o chat Gemini que você deixou visível e salvará os downloads pelas posições absolutas.\n\nDeseja iniciar o resgate agora?')) return;

  try {
    const res = await fetch('/api/automate-gemini/rescue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign.id, number: numStr, scenes: 'auto' })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    window.activeGeminiJobId = data.jobId;
    window.saveActiveFlowGeminiJob(data.jobId);
    window.pollGeminiAutomationStatus();
  } catch(err) {
    alert('Erro no resgate Gemini: ' + err.message);
  }
};

window.rescueChatGPTWebDownloads = async function(campaignId) {
  const campaign = (AppState.campaigns || []).find(c => c.id === campaignId || c.number == campaignId);
  if (!campaign) return alert('Nenhuma minissérie selecionada.');
  const numStr = String(campaign.number || campaign.id).padStart(2, '0');
  
  if (!confirm('📥 RESGATE GPT: o robô NÃO vai enviar prompts nem trocar de chat.\nEle usará somente o chat ChatGPT que você deixou visível e salvará os downloads pelas posições absolutas.\n\nDeseja iniciar o resgate agora?')) return;

  const selected = Array.from(document.querySelectorAll('.chatgpt-flow-scene-chk:checked')).map(cb => cb.value);
  const sourceScenes = Array.isArray(campaign.geminiScenes) && campaign.geminiScenes.length
    ? campaign.geminiScenes
    : (Array.isArray(campaign.scenes) ? campaign.scenes.filter(scene => scene.geminiMotion) : []);
  const prompts = sourceScenes.slice(0, 7).map((scene, index) => ({
    type: 'chatgpt-flow',
    sceneNum: String(index + 1).padStart(2, '0'),
    fullPrompt: String(scene.geminiMotion || scene.prompt || scene.visualPrompt || scene.description || '').trim()
  })).filter(item => item.fullPrompt);

  const box = document.getElementById('chatGPTAutomationStatusBox');
  const txt = document.getElementById('chatGPTAutomationStatusText');
  const bar = document.getElementById('chatGPTAutomationProgressBar');
  if (box) box.style.display = 'flex';
  if (txt) txt.textContent = '📥 Resgate GPT: conectando e inspecionando a conversa aberta...';
  if (bar) bar.style.width = '5%';

  try {
    const res = await fetch('/api/automate-chatgpt/rescue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        number: numStr,
        mode: 'flow',
        scenes: selected.length ? selected : 'auto',
        prompts
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    window.activeChatGPTJobId = data.jobId;
    window.saveActiveFlowGptJob(data.jobId);
    window.pollChatGPTAutomationStatus();
  } catch(err) {
    if (txt) txt.textContent = '⚠️ Erro no resgate: ' + err.message;
    alert('Erro no resgate GPT: ' + err.message);
  }
};

window.syncFlowImages = async function(campaignId) {
  const campaign = (AppState.campaigns || []).find(c => c.id === campaignId || c.number == campaignId);
  if (!campaign) return alert('Nenhuma minissérie selecionada.');
  const numStr = String(campaign.number || campaign.id || '').replace(/\D/g, '').padStart(2, '0');

  try {
    const res = await fetch('/api/sync-flow-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: numStr })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (data.copied > 0) {
      alert(`✓ Sincronização concluída!\n\n${data.copied} imagem(ns) padronizada(s) copiadas de M${numStr}/ para flow/:\n` +
        data.files.map(f => `• ${f.src} ➔ ${f.dest}`).join('\n'));
    } else {
      alert(`⚠️ Nenhuma imagem de referência encontrada ainda em minisseries/${numStr}/M${numStr}/.\nGere as imagens da esteira antes de sincronizar.`);
    }
  } catch (err) {
    alert('Erro ao sincronizar imagens para o Flow: ' + err.message);
  }
};

