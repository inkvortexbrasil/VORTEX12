
function getRichContextDescription(topic) {
  if (!topic) return "";
  const title = (topic.title || "").trim();
  let desc = (topic.description || topic.summary || "").trim();

  // If description starts with or contains title, strip the title repetition
  if (title && desc.startsWith(title)) {
    desc = desc.slice(title.length).trim().replace(/^[:\-\s–—]+/, '').trim();
  }

  // If description is empty or too short, pull rich DNA fields
  if (!desc || desc === title || desc.length < 30) {
    const parts = [
      topic.editorialPromise,
      topic.technicalTruth,
      topic.why,
      topic.angle
    ].filter(p => p && typeof p === 'string' && p.trim() !== title);
    
    if (parts.length > 0) {
      desc = parts.join(' ');
    }
  }

  // Ensure title repetition is removed after pulling rich fields
  if (title && desc.startsWith(title)) {
    desc = desc.slice(title.length).trim().replace(/^[:\-\s–—]+/, '').trim();
  }

  return desc;
}

// Renderização de Interface - Vortex 8

window.highlightActiveRoom = function(roomId) {
  const btns = ['btnNavSocial', 'btnNavStoryboard', 'btnNavAudio', 'btnNavLibrary', 'btnNavDocumentarios', 'btnNavComercial'];
  btns.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === roomId) el.classList.add('active');
      else el.classList.remove('active');
    }
  });
};

window.openLightbox = function(src) {
  if (!src) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:zoom-out;backdrop-filter:blur(10px);padding:40px;';
  overlay.innerHTML = `
    <button style="position:fixed;top:85px;right:40px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.35);color:#fff;font-size:1.6rem;width:48px;height:48px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);box-shadow:0 4px 20px rgba(0,0,0,0.6);transition:all 0.2s;" onmouseover="this.style.background='var(--brandGrad)'; this.style.borderColor='transparent';" onmouseout="this.style.background='rgba(255,255,255,0.18)'; this.style.borderColor='rgba(255,255,255,0.35)';">✕</button>
    <img src="${src}" style="max-height:78vh;max-width:85vw;object-fit:contain;border-radius:14px;box-shadow:0 0 80px rgba(0,0,0,0.9);border:2px solid var(--cyan);margin-top:40px;">
  `;
  overlay.addEventListener('click', () => document.body.removeChild(overlay));
  document.body.appendChild(overlay);
};

window.openAspectNativeVideoZoom = function(src, startSec = 0) {
  if (!src) return;
  const isImage = /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(src) || src.startsWith('data:image/');
  const overlay = document.createElement('div');
  overlay.id = 'aspectVideoZoomOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(12px);padding:20px;';
  overlay.innerHTML = `
    <div style="position:fixed;top:85px;right:40px;display:flex;align-items:center;gap:12px;z-index:100000;">
      <span style="color:var(--cyan);font-family:var(--uiRounded);font-size:0.82rem;font-weight:bold;background:rgba(0,0,0,0.6);padding:6px 14px;border-radius:20px;border:1px solid rgba(0,174,239,0.3);">🔍 ZOOM NATIVO (${isImage ? 'IMAGEM 9:16' : 'PROPORÇÃO ORIGINAL'})</span>
      <button id="closeVideoZoomBtn" style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.35);color:#fff;font-size:1.4rem;width:44px;height:44px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);box-shadow:0 4px 20px rgba(0,0,0,0.6);transition:all 0.2s;">✕</button>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;max-width:92vw;max-height:85vh;margin-top:40px;">
      ${isImage ? 
        `<img id="zoomAspectImg" src="${src}" style="max-width:85vw;max-height:80vh;object-fit:contain;border-radius:14px;box-shadow:0 0 80px rgba(0,0,0,0.95);border:2px solid var(--cyan);display:block;margin:auto;">` : 
        `<video id="zoomAspectPlayer" src="${src}" controls autoplay loop style="max-width:85vw;max-height:80vh;object-fit:contain;border-radius:14px;box-shadow:0 0 80px rgba(0,0,0,0.95);border:2px solid var(--cyan);background:#000;display:block;margin:auto;"></video>`
      }
    </div>
  `;
  const closeFn = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };
  overlay.querySelector('#closeVideoZoomBtn').onclick = closeFn;
  overlay.onclick = (e) => { if (e.target === overlay) closeFn(); };
  document.body.appendChild(overlay);
  const player = document.getElementById('zoomAspectPlayer');
  if (player && startSec > 0) player.currentTime = startSec;
};

window.addEventListener('keyup', function(e) {
  if (e.key === 'Escape') {
    // 0. Se o modal da galeria de fotos do CTA Comercial estiver aberto, fecha apenas ele!
    const ctaModal = document.getElementById('ctaLightboxModal');
    if (ctaModal && ctaModal.style.display !== 'none') {
      ctaModal.style.display = 'none';
      return;
    }

    // 0.1 Se o modal da galeria de fotos do documentário estiver aberto, fecha apenas ele!
    const docModal = document.getElementById('docImageLightboxModal');
    if (docModal && docModal.style.display !== 'none') {
      if (typeof window.closeDocImageModal === 'function') {
        window.closeDocImageModal();
      } else {
        docModal.style.display = 'none';
      }
      return;
    }

    // 1. Pausa áudio e vídeo de salas em qualquer lugar da página (Anti-ghosting, preservando Som Ambiente)
    document.querySelectorAll('audio, video').forEach(media => {
      if (media.id === 'ambientStudioAudio') return; // Preserva o Focus Music / Som Ambiente do estúdio
      if (!media.paused) {
          media.pause();
          media.currentTime = 0;
      }
    });

    // 2. Fecha todas as salas
    const rooms = [
      'socialMediaView', 'storyboardView', 'audioRoomView',
      'shortsView', 'documentariosRoomView', 'pageLibrary',
      'studioImmersiveModal'
    ];
    rooms.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.classList.contains('fullscreen-presentation')) {
        el.style.display = 'none';
      } else if (el) {
        el.style.display = 'none';
      }
    });

    // 3. Remove destaques dos botões das órbitas
    window.highlightActiveRoom(null);

    // 4. Restaura o painel central do Multiverso
    const welcome = document.getElementById('multiverseWelcome');
    if (welcome) welcome.style.display = 'flex';
  }
});

const UI = {
  pageLibrary: null,
  subjectsGrid: null,
  leftPanel: null,
  contentArea: null,
  
  init() {
    this.pageLibrary = document.getElementById('pageLibrary');
    this.subjectsGrid = document.getElementById('subjectsGrid');
    this.leftPanel = document.getElementById('workspaceLeftPanel');
    this.contentArea = document.getElementById('multiversePromptsArea');
    
    this.renderWorkspace();
  },
  
  renderWorkspace() {
    if (typeof window.renderMultiverseControlPanel === 'function') {
      window.renderMultiverseControlPanel();
    }
  },

  renderIdeationGrid() {
    if (!this.subjectsGrid) return;

    const activePanel = document.getElementById('activeCampaignPanel');
    const rightArea   = document.getElementById('multiversePromptsArea');

    const hideCampaignPanel = () => {
      if (activePanel) activePanel.style.display = 'none';
      if (rightArea)   rightArea.style.display   = 'none';
    };

    if (AppState.isGeneratingSubjects) {
      hideCampaignPanel();
      this.subjectsGrid.style.display = 'flex';
      const nums = AppState.generatingNumbers && AppState.generatingNumbers.length > 0 ? AppState.generatingNumbers.join(', ') : '';
      const numLabel = nums ? `Minissérie #${nums}` : 'Nova Minissérie';

      this.subjectsGrid.innerHTML = `
        <div class="vortex-orbital-loader" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; position: relative; padding: 20px 10px; box-sizing: border-box;">
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

          <!-- Motores Orbitais (3 Esferas com Feixe de Energia) -->
          <div style="display: flex; align-items: center; justify-content: center; gap: clamp(24px, 4vw, 40px); margin-bottom: 28px; position: relative; width: 100%; max-width: 440px;">
            <!-- Linha de Energia Central -->
            <div style="position: absolute; top: 50%; left: 30px; right: 30px; height: 2px; background: linear-gradient(90deg, var(--cyan), var(--magenta)); opacity: 0.45; z-index: 0; filter: blur(2px);"></div>

            <!-- Motor 1 (Esquerda - 🧠 Consciência & Curadoria) -->
            <div style="position: relative; width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; z-index: 1; flex-shrink: 0;">
              <div style="position: absolute; inset: 0; border-radius: 50%; border: 2px dashed var(--cyan); animation: spinGlow 4s linear infinite;"></div>
              <div style="position: absolute; inset: -8px; border-radius: 50%; border: 1px solid rgba(0, 174, 239, 0.25); animation: spinGlow 8s linear reverse infinite;"></div>
              <div style="position: absolute; inset: 8px; border-radius: 50%; background: var(--cyan); opacity: 0.3; filter: blur(10px); animation: pulseGlow 2s ease-in-out infinite;"></div>
              <div style="font-size: 1.7rem; filter: drop-shadow(0 0 10px rgba(0,174,239,0.85));">🧠</div>
            </div>
            
            <!-- Motor Central (Núcleo - ⚡ Força Criativa / Fusão Editorial) -->
            <div style="position: relative; width: 130px; height: 130px; display: flex; align-items: center; justify-content: center; transform: translateY(-10px); z-index: 2; flex-shrink: 0;">
              <div style="position: absolute; inset: 0; border-radius: 50%; border: 4px solid transparent; border-top-color: var(--magenta); border-bottom-color: var(--cyan); animation: spinGlow 1.5s linear infinite;"></div>
              <div style="position: absolute; inset: -12px; border-radius: 50%; border: 2px dashed rgba(255,255,255,0.15); animation: spinGlow 6s linear reverse infinite;"></div>
              <div style="position: absolute; inset: 12px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.18); animation: spinGlow 3s linear infinite;"></div>
              
              <div style="position: absolute; inset: 20px; border-radius: 50%; background: var(--brandGrad); opacity: 0.65; filter: blur(18px); animation: pulseGlow 1.5s ease-in-out infinite alternate;"></div>
              <div style="font-size: 3.5rem; animation: pulseHeart 1.5s ease-in-out infinite alternate; z-index: 3;">⚡</div>
            </div>

            <!-- Motor 3 (Direita - 👁️ Visão Estratégica & IA) -->
            <div style="position: relative; width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; z-index: 1; flex-shrink: 0;">
              <div style="position: absolute; inset: 0; border-radius: 50%; border: 2px dashed var(--magenta); animation: spinGlow 4s linear infinite reverse;"></div>
              <div style="position: absolute; inset: -8px; border-radius: 50%; border: 1px solid rgba(232, 0, 109, 0.25); animation: spinGlow 8s linear infinite;"></div>
              <div style="position: absolute; inset: 8px; border-radius: 50%; background: var(--magenta); opacity: 0.3; filter: blur(10px); animation: pulseGlow 2s ease-in-out infinite 0.5s;"></div>
              <div style="font-size: 1.7rem; filter: drop-shadow(0 0 10px rgba(232,0,109,0.85));">👁️</div>
            </div>
          </div>

          <!-- Telemetria Textual -->
          <h2 style="font-family: var(--uiRounded); font-size: clamp(1.8rem, 3vw, 2.5rem); color: #fff; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 4px; text-shadow: 0 0 35px rgba(0,174,239,0.7); text-align: center; line-height: 1.2;">
            INVOCANDO MOTORES DE IA
          </h2>
          
          <div style="background: rgba(0,0,0,0.65); border: 1px solid rgba(255,255,255,0.18); padding: 10px 28px; border-radius: 50px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px; box-shadow: inset 0 0 20px rgba(0,0,0,0.85);">
            <div style="width: 12px; height: 12px; background: #00d26a; border-radius: 50%; box-shadow: 0 0 15px #00d26a; animation: pulseGlow 1s infinite;"></div>
            <span style="color: #00d26a; font-family: 'Courier New', monospace; font-size: 1rem; font-weight: bold; letter-spacing: 2px;">STATUS: PROCESSANDO EM ÓRBITA...</span>
          </div>

          <p style="color: var(--ivTextSecondary); font-size: 1.15rem; text-align: center; max-width: 540px; line-height: 1.5; font-family: var(--uiText); margin: 0;">
            Iniciando geração editorial (Mistral & VORTEX 12)...<br>
            <span style="color: #fff; font-weight: 600; text-shadow: 0 0 12px rgba(255,255,255,0.3);">Mapeando novos vetores para a ${numLabel}</span>
          </p>
        </div>
      `;
      return;
    }

    if (AppState.generatingError) {
      this.subjectsGrid.style.display = 'flex';
      this.subjectsGrid.innerHTML = `<div style="color:#ff4d4d; text-align:center; padding: 20px; font-weight: bold;">${AppState.generatingError}</div>`;
      return;
    }

    if (AppState.suggestedSubjects && AppState.suggestedSubjects.length > 0) {
      hideCampaignPanel();
      this.subjectsGrid.style.display = 'flex';
      this.subjectsGrid.style.flexDirection = 'column';
      this.subjectsGrid.style.gap = '16px';
      this.subjectsGrid.style.opacity = '0';
      this.subjectsGrid.style.transition = 'opacity 0.35s ease';

      const campaigns = AppState.suggestedSubjects.map(id => AppState.campaigns.find(c => c.id === id)).filter(Boolean);

      this.subjectsGrid.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 4px;">
          <h3 style="color: var(--cyan); font-size: 1rem; font-family: var(--uiRounded); letter-spacing: 1px; margin: 0;">✨ NOVAS MINISSÉRIES DISPONÍVEIS:</h3>
          <button onclick="AppState.suggestedSubjects=[]; UI.renderWorkspace();" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: var(--ivTextSecondary); border-radius: 20px; padding: 4px 12px; font-size: 0.75rem; cursor: pointer;" onmouseover="this.style.background='rgba(255,255,255,0.12)';" onmouseout="this.style.background='rgba(255,255,255,0.06)';">✕ Fechar</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; overflow-y: auto;">
          ${campaigns.map(c => {
             const numDisplay = String(c.number).padStart(2, '0');
             return `
              <article class="subjectCard" style="position:relative; transition: all 0.2s ease; background: rgba(10, 15, 28, 0.6); backdrop-filter: blur(8px); flex-shrink: 0;" onmouseover="this.style.borderColor='var(--cyan)';" onmouseout="this.style.borderColor='rgba(0,174,239,0.2)';">
                <div class="cardHeader" style="position:relative;">
                  <div style="position: absolute; top: -12px; left: -12px; width: 34px; height: 34px; background: var(--brandGrad); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--uiRounded); font-weight: bold; font-size: 0.95rem; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">${numDisplay}</div>
                  <h2 style="font-size: 0.95rem; line-height: 1.3; margin-left: 28px;">${c.title}</h2>
                </div>
                <p style="font-size: 0.8rem; color: var(--ivTextSecondary); margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${c.topic ? c.topic.description : ''}
                </p>
                <div style="margin-top: 10px; display: flex; gap: 8px;">
                  <button class="actionBtn" style="padding: 6px 12px; font-size: 0.75rem; background: rgba(255,255,255,0.08); color: var(--ivTextSecondary); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; transition: all 0.2s ease; flex: 1;" onclick="event.stopPropagation(); window.openContextModal('${c.id}')" onmouseover="this.style.background='rgba(255,255,255,0.15)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.color='var(--ivTextSecondary)';">
                    📖 Contexto
                  </button>
                  <button class="actionBtn" style="padding: 6px 12px; font-size: 0.75rem; background: rgba(0,174,239,0.1); color: var(--cyan); border: 1px solid rgba(0,174,239,0.3); border-radius: 16px; transition: all 0.2s ease; flex: 1;" onclick="event.stopPropagation(); window.openCampaignWorkspace('${c.id}');" onmouseover="this.style.background='var(--brandGrad)'; this.style.color='#fff'; this.style.borderColor='transparent';" onmouseout="this.style.background='rgba(0,174,239,0.1)'; this.style.color='var(--cyan)'; this.style.borderColor='rgba(0,174,239,0.3)';">
                    ⚙️ Abrir
                  </button>
                </div>
              </article>
             `;
          }).join('')}
        </div>
      `;
      requestAnimationFrame(() => { this.subjectsGrid.style.opacity = '1'; });
      return;
    }

    this.subjectsGrid.style.display = 'none';
    this.subjectsGrid.innerHTML = '';
  },

  openStudioModal(title) {
    const modal = document.getElementById('studioImmersiveModal');
    if(modal) {
      modal.style.display = 'flex';
      const titleEl = document.getElementById('studioModalTitle');
      if (titleEl) titleEl.innerText = title;
      
      const welcome = document.getElementById('multiverseWelcome');
      if (welcome) welcome.style.display = 'none';
    }
  },
  
  closeStudioModal() {
    const modal = document.getElementById('studioImmersiveModal');
    if(modal) {
      modal.style.display = 'none';
      AppState.studioActiveTab = '';
      
      const welcome = document.getElementById('multiverseWelcome');
      if (welcome) welcome.style.display = 'flex';
    }
  },

  renderStudio() {
    AppState.save();
    if (AppState.isGenerating) return;
    if (typeof window.renderMultiverseControlPanel === 'function') {
        window.renderMultiverseControlPanel();
    }
  }
};

Object.assign(UI, {


  renderGPTArea() {
    const campaign = AppState.getSelectedCampaign();
    if(!campaign) return;

    if (!campaign.generatedGPT) {
      this.contentArea.innerHTML = `
        <div style="padding: 32px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
          <h2 style="color: #fff; font-family: var(--uiRounded); margin-bottom: 16px;">Direção de Arte (GPT)</h2>
          <p style="color: var(--ivTextSecondary); margin-bottom: 32px; max-width: 500px;">Gere as dez cenas do GPT e a Legenda Social em uma única composição para esta minissérie.</p>
          <button class="actionBtn" style="background:var(--brandGrad); padding:16px 32px; font-size:1.1rem; border:none;" onclick="this.innerText='⏳ GERANDO GPT + LEGENDA...'; this.style.opacity='0.7'; this.style.pointerEvents='none'; handleGenerateAction('gpt', '${campaign.id}')">✨ GERAR GPT + LEGENDA SOCIAL</button>
        </div>
      `;
      return;
    }

    const scenes = Array.isArray(campaign.scenes) ? campaign.scenes : [];
    const isCapaActive = AppState.activeSceneIndex === 'capa';
    const rawGptIdx = Number(AppState.activeSceneIndex) || 0;
    const activeIdx = (!isCapaActive && rawGptIdx >= 0 && rawGptIdx < scenes.length) ? rawGptIdx : 0;
    if (!isCapaActive) {
      AppState.activeSceneIndex = activeIdx;
    }
    
    const tabsHtml = scenes.map((s, idx) => {
      const isActive = !isCapaActive && activeIdx === idx;
      return `
        <button style="min-width:0; width:100%; height:28px; overflow:hidden; white-space:nowrap; background: ${isActive ? 'linear-gradient(135deg, rgba(0,174,239,0.95), rgba(126,34,206,0.95))' : 'rgba(4,12,31,0.58)'}; color: ${isActive ? '#fff' : 'rgba(226,232,240,0.82)'}; border: 1px solid ${isActive ? 'rgba(103,232,249,0.9)' : 'rgba(148,163,184,0.2)'}; padding: 0; border-radius: 8px; font-weight: 800; cursor: pointer; transition: all 0.2s ease; font-size: 0.72rem; letter-spacing: 0.04em; text-align:center; box-shadow: ${isActive ? '0 0 12px rgba(0,174,239,0.45)' : 'inset 0 1px 0 rgba(255,255,255,0.04)'};" onclick="window.switchSceneTab(${idx}, 'gpt')">
          ${String(s.no).padStart(2, '0')}
        </button>
      `;
    }).join('');

    let contentHtml = '';
    if (isCapaActive) {
      const s0 = scenes[0] || {};
      const rawPrompt = s0.assembledPrompt || s0.prompt || '';
      const capaPrompt = window.formatCapaPrompt ? window.formatCapaPrompt(rawPrompt) : rawPrompt;
      const isCopied = !!campaign.copiedCapa;
      contentHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; flex-shrink: 0; width: 100%;">
          <button id="btnTabCapa" class="badge actionBtn" style="cursor: pointer; background: linear-gradient(135deg, rgba(0,174,239,0.95), rgba(126,34,206,0.95)); color: #fff; border: 1px solid rgba(103,232,249,0.9); padding: 6px 18px; font-size: 0.8rem; font-weight: 800; border-radius: 8px; transition: all 0.2s ease; box-shadow: 0 0 12px rgba(0,174,239,0.45); letter-spacing: 0.05em;" onclick="window.switchSceneTab('capa', 'gpt')">
            CAPA
          </button>
          <button class="badge actionBtn" style="cursor: pointer; background: ${isCopied ? 'var(--brandGrad)' : 'rgba(0, 174, 239, 0.25)'}; color: #fff; border: 1px solid ${isCopied ? 'transparent' : 'var(--cyan)'}; padding: 6px 18px; font-size: 0.8rem; font-weight: bold; border-radius: 8px; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0, 174, 239, 0.3);" onclick="window.copyExpandedContent('gpt', 'capa', this)">
            ${isCopied ? '✓ COPIADO' : '📋 COPIAR'}
          </button>
        </div>
        <div class="show-scroll" style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding-right: 6px; ">
          <p id="gptPromptText_capa" style="color: #e2e8f0; font-family: var(--readingFont, 'Inter', sans-serif); font-size: calc(0.86rem * var(--readingFontSizeMultiplier, 1)); line-height: 1.55; white-space: pre-wrap; text-shadow: 0 1px 3px rgba(0,0,0,0.9); margin: 0; padding: 4px 8px 75px 8px;">
            ${capaPrompt}
          </p>
        </div>
      `;
    } else if (scenes.length > 0 && scenes[activeIdx]) {
      const s = scenes[activeIdx];
      contentHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; flex-shrink: 0; width: 100%;">
          <button id="btnTabCapa" class="badge actionBtn" style="cursor: pointer; background: rgba(4,12,31,0.58); color: rgba(226,232,240,0.82); border: 1px solid rgba(148,163,184,0.2); padding: 6px 18px; font-size: 0.8rem; font-weight: 800; border-radius: 8px; transition: all 0.2s ease; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); letter-spacing: 0.05em;" onclick="window.switchSceneTab('capa', 'gpt')">
            CAPA
          </button>
          <button class="badge actionBtn" style="cursor: pointer; background: ${s.copiedGPT ? 'var(--brandGrad)' : 'rgba(0, 174, 239, 0.25)'}; color: #fff; border: 1px solid ${s.copiedGPT ? 'transparent' : 'var(--cyan)'}; padding: 6px 18px; font-size: 0.8rem; font-weight: bold; border-radius: 8px; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0, 174, 239, 0.3);" onclick="window.copyExpandedContent('gpt', ${activeIdx}, this)">
            ${s.copiedGPT ? '✓ COPIADO' : '📋 COPIAR'}
          </button>
        </div>
        <div class="show-scroll" style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding-right: 6px; ">
          <p id="gptPromptText_${activeIdx}" style="color: #e2e8f0; font-family: var(--readingFont, 'Inter', sans-serif); font-size: calc(0.86rem * var(--readingFontSizeMultiplier, 1)); line-height: 1.55; white-space: pre-wrap; text-shadow: 0 1px 3px rgba(0,0,0,0.9); margin: 0; padding: 4px 8px 75px 8px;">
            ${s.assembledPrompt || s.prompt}
          </p>
        </div>
      `;
    }

    this.contentArea.innerHTML = `
      <div style="padding: 0 8px 16px 8px; height: 100%; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
        <div style="display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 3px; width: 100%; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 0 1px 7px; flex-shrink: 0; box-sizing: border-box;">
          ${tabsHtml}
        </div>
        ${contentHtml}
      </div>
    `;
  },

  renderGeminiArea() {
    const campaign = AppState.getSelectedCampaign();
    if(!campaign) return;

    if (!campaign.generatedGPT) {
      this.contentArea.innerHTML = `<div style="padding:40px; text-align:center; color:var(--ivTextSecondary);">Gere primeiro as Cenas GPT.</div>`;
      return;
    }
    
    if (!campaign.generatedGemini) {
      this.contentArea.innerHTML = `
        <div style="padding: 32px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
          <h2 style="color: var(--magenta); font-family: var(--uiRounded); margin-bottom: 16px;">Movimentos Dinâmicos (Gemini)</h2>
          <p style="color: var(--ivTextSecondary); margin-bottom: 32px; max-width: 500px;">Gere o Flow e os cinco movimentos do Gemini em conjunto, com cada movimento alinhado à sua cena e transição.</p>
          <button class="actionBtn" style="background:rgba(232,0,109,0.2); color:var(--magenta); border:1px solid var(--magenta); padding:16px 32px; font-size:1.1rem;" onclick="this.innerText='⏳ GERANDO FLOW + GEMINI...'; this.style.opacity='0.7'; this.style.pointerEvents='none'; handleGenerateAction('gemini', '${campaign.id}')">🎥 GERAR FLOW + GEMINI</button>
        </div>
      `;
      return;
    }

    const geminiScenes = Array.isArray(campaign.geminiScenes) && campaign.geminiScenes.length
      ? campaign.geminiScenes
      : (Array.isArray(campaign.scenes) ? campaign.scenes.filter(s => s.geminiMotion).map((s, i) => ({ ...s, no: i + 1 })) : []);
    const rawGeminiIdx = Number(AppState.activeSceneIndex) || 0;
    const activeIdx = (rawGeminiIdx >= 0 && rawGeminiIdx < geminiScenes.length) ? rawGeminiIdx : 0;
    AppState.activeSceneIndex = activeIdx;
    
    const tabsHtml = geminiScenes.map((s, idx) => {
      const isActive = activeIdx === idx;
      return `
        <button style="min-width: 44px; height: 28px; background: ${isActive ? 'linear-gradient(135deg, rgba(0,174,239,0.95), rgba(126,34,206,0.95))' : 'rgba(4,12,31,0.58)'}; color: ${isActive ? '#fff' : 'rgba(226,232,240,0.82)'}; border: 1px solid ${isActive ? 'rgba(103,232,249,0.9)' : 'rgba(148,163,184,0.2)'}; padding: 0 10px; border-radius: 8px; font-weight: 800; cursor: pointer; transition: all 0.2s ease; flex-shrink: 0; font-size: 0.72rem; letter-spacing: 0.04em; text-align: center; box-shadow: ${isActive ? '0 0 12px rgba(0,174,239,0.45)' : 'inset 0 1px 0 rgba(255,255,255,0.04)'};" onclick="window.switchSceneTab(${idx}, 'gemini')">
          ${String(s.no).padStart(2, '0')}
        </button>
      `;
    }).join('');

    let contentHtml = '';
    if (geminiScenes.length > 0 && geminiScenes[activeIdx]) {
      const s = geminiScenes[activeIdx];
      contentHtml = `
        <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 8px; flex-shrink: 0; flex-wrap: wrap;">
          <button class="badge actionBtn" style="cursor: pointer; background: ${s.copiedGemini ? 'var(--brandGrad)' : 'rgba(0, 174, 239, 0.25)'}; color: #fff; border: 1px solid ${s.copiedGemini ? 'transparent' : 'var(--cyan)'}; padding: 6px 18px; font-size: 0.8rem; font-weight: bold; border-radius: 8px; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0, 174, 239, 0.3);" onclick="window.copyExpandedContent('gemini', ${activeIdx}, this)">
            ${s.copiedGemini ? '✓ COPIADO' : '📋 COPIAR'}
          </button>
        </div>
        <div class="show-scroll" style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding-right: 6px; ">
          <p id="geminiPromptText_${activeIdx}" style="color: #e2e8f0; display: block; font-family: var(--readingFont, 'Inter', sans-serif); font-size: calc(0.86rem * var(--readingFontSizeMultiplier, 1)); line-height: 1.55; white-space: pre-wrap; text-shadow: 0 1px 3px rgba(0,0,0,0.9); margin: 0; padding: 4px 8px 75px 8px;">
            ${s.geminiMotion || s.prompt || ''}
          </p>
        </div>
      `;
    }

    this.contentArea.innerHTML = `
      <div style="padding: 0 8px 16px 8px; height: 100%; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
        <div style="display: flex; gap: 5px; justify-content: center; width: 100%; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; flex-shrink: 0; box-sizing: border-box;">
          ${tabsHtml}
        </div>
        ${contentHtml}
      </div>
    `;
  },

  renderSocialArea() {
    const campaign = AppState.getSelectedCampaign();
    if (!campaign) return;

    if (!campaign.social || (!campaign.social.caption && !campaign.social.baseCaption)) {
      this.contentArea.innerHTML = `
        <div style="padding: 32px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
          <h2 style="color: var(--cyan); font-family: var(--uiRounded); margin-bottom: 12px; font-size: 1.3rem;">Legendas Social (Instagram / LinkedIn)</h2>
          <p style="color: var(--ivTextSecondary); margin-bottom: 18px; max-width: 440px; font-size: 0.88rem; line-height: 1.5;">A Legenda Social é gerada obrigatoriamente junto com o GPT.</p>
          <div style="background: rgba(0,174,239,0.12); color: var(--cyan); border: 1px solid rgba(0,174,239,0.35); padding: 9px 16px; border-radius: 9px; font-size: 0.8rem; font-weight: 800;">VINCULADA A GPT + LEGENDA SOCIAL</div>
        </div>
      `;
      return;
    }

    const isCopied = campaign.social ? campaign.social.copied : false;

    this.contentArea.innerHTML = `
      <div style="padding: 0 8px 16px 8px; height: 100%; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
        
        <!-- Cabeçalho Fixo da Aba -->
        <div style="display: flex; align-items: center; margin-bottom: 8px; flex-shrink: 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
          <div>
            <h2 style="color: #fff; font-family: var(--uiRounded); margin: 0 0 2px 0; font-size: 1rem;">Legendas (Social)</h2>
            <p style="color: rgba(255,255,255,0.45); margin: 0; font-size: 0.75rem;">Instagram, LinkedIn & Redes Sociais</p>
          </div>
        </div>

        <!-- Botão Fixo COPIAR Centralizado Abaixo do Cabeçalho -->
        <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 8px; flex-shrink: 0;">
          <button class="badge actionBtn" style="cursor: pointer; background: ${isCopied ? 'var(--brandGrad)' : 'rgba(0, 174, 239, 0.25)'}; color: #fff; border: 1px solid ${isCopied ? 'transparent' : 'var(--cyan)'}; padding: 6px 18px; font-size: 0.8rem; font-weight: bold; border-radius: 8px; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0, 174, 239, 0.3);" onclick="window.copyExpandedContent('social', 0, this)">
            ${isCopied ? 'COPIADO ✓' : '📋 COPIAR LEGENDA'}
          </button>
        </div>

        <!-- Área de Texto Rolável Independente -->
        <div class="show-scroll" style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding-right: 6px; ">
          <p id="socialCaptionText" style="color: #e2e8f0; font-family: var(--readingFont, 'Inter', sans-serif); font-size: calc(0.88rem * var(--readingFontSizeMultiplier, 1)); line-height: 1.6; white-space: pre-wrap; text-shadow: 0 1px 3px rgba(0,0,0,0.9); margin: 0; padding: 4px 8px 75px 8px;">
            ${campaign.social.caption || campaign.social.baseCaption || ''}
          </p>
        </div>
      </div>
    `;
  },

  renderFlowArea() {
    const campaign = AppState.getSelectedCampaign();
    if (!campaign) return;

    if (!campaign.flow || !campaign.flow.prompt) {
      this.contentArea.innerHTML = `
        <div style="padding: 32px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
          <h2 style="color: var(--cyan); font-family: var(--uiRounded); margin-bottom: 12px; font-size: 1.3rem;">Estrutura Master (Flow)</h2>
          <p style="color: var(--ivTextSecondary); margin-bottom: 18px; max-width: 440px; font-size: 0.88rem; line-height: 1.5;">A Estrutura Master do Flow é gerada obrigatoriamente junto com o Gemini.</p>
          <div style="background: rgba(232,0,109,0.12); color: var(--magenta); border: 1px solid rgba(232,0,109,0.35); padding: 9px 16px; border-radius: 9px; font-size: 0.8rem; font-weight: 800;">VINCULADA A FLOW + GEMINI</div>
        </div>
      `;
      return;
    }

    // Sempre expandido — sem toggle, sem película
    this.contentArea.innerHTML = `
      <div style="padding:12px 16px 12px 8px;height:100%;display:flex;flex-direction:column;overflow:hidden;">
        <div style="display:flex;align-items:center;margin-bottom:8px;">
          <div>
            <h2 style="color:#fff;font-family:var(--uiRounded);margin:0 0 2px;font-size:1rem;">Flow (Estrutura Mestre)</h2>
            <p style="color:rgba(255,255,255,0.45);margin:0;font-size:0.75rem;">Roteiro central consolidado da campanha.</p>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-shrink:0;">
          <h3 style="color:rgba(255,255,255,0.7);margin:0;font-size:0.82rem;text-transform:uppercase;letter-spacing:1.5px;">Roteiro Master</h3>
          <button class="badge actionBtn" style="cursor:pointer;background:${campaign.flow && campaign.flow.copied ? 'var(--brandGrad)' : 'transparent'};color:#fff;border:1px solid ${campaign.flow && campaign.flow.copied ? 'transparent' : 'rgba(255,255,255,0.2)'};padding:5px 10px;font-size:0.75rem;font-weight:bold;border-radius:6px;" onclick="window.copyExpandedContent('flow', 0, this)">
            ${campaign.flow && campaign.flow.copied ? 'COPIADO' : 'COPIAR'}
          </button>
        </div>

        <div class="show-scroll" style="flex:1;overflow-y:auto;min-height:0;">
          <p id="flowPromptText" style="color:#e2e8f0; font-family: var(--readingFont, 'Inter', sans-serif); font-size: calc(0.86rem * var(--readingFontSizeMultiplier, 1)); line-height:1.55; white-space:pre-wrap; margin:0; padding:4px 8px 75px 8px;">
            ${(campaign.flow && campaign.flow.prompt) ? campaign.flow.prompt : 'Roteiro ainda não gerado.'}
          </p>
        </div>
      </div>
    `;

  },


  renderLibrary() {
    const grid = document.getElementById('libraryGrid');
    const countEl = document.getElementById('libraryResultCount');
    if (!grid) return;

    if (AppState.campaigns.length === 0) {
      if (countEl) countEl.textContent = '0 minisséries';
      grid.innerHTML = `<div style="text-align: center; color: var(--ivTextSecondary); padding: 40px;">A Biblioteca está vazia. Gere assuntos na aba de Centro de Comando para começar.</div>`;
      grid.className = "";
      return;
    }

    const searchInput = document.getElementById('librarySearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Filter campaigns
    let filtered = AppState.campaigns.filter(c => {
      // 1. Apply Search
      if (searchTerm) {
        const term = searchTerm.replace('#', '').trim();
        const isNumeric = /^\d+$/.test(term);
        
        if (isNumeric) {
          // Busca exata pelo número da minissérie
          if (c.number !== parseInt(term, 10)) return false;
        } else {
          // Busca textual em Título e Descrição
          const matchTitle = c.title.toLowerCase().includes(term);
          const matchDesc = c.topic && c.topic.description && c.topic.description.toLowerCase().includes(term);
          if (!(matchTitle || matchDesc)) return false;
        }
      }
      
      // 2. Apply Status Filter
      const isComplete = c.generatedGPT && c.generatedGemini;
      if (AppState.libraryFilter === 'completed' && !isComplete) return false;
      if (AppState.libraryFilter === 'pending' && isComplete) return false;
      
      return true;
    });
    
    // Sort descending by number (latest to oldest)
    filtered.sort((a, b) => b.number - a.number);

    const completedCount = filtered.filter(c => c.generatedGPT && c.generatedGemini).length;
    if (countEl) {
      const itemLabel = filtered.length === 1 ? 'minissérie' : 'minisséries';
      const completeLabel = completedCount === 1 ? 'completa' : 'completas';
      countEl.textContent = `${filtered.length} ${itemLabel} · ${completedCount} ${completeLabel}`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="text-align: center; color: var(--ivTextSecondary); padding: 40px; font-size: 1.2rem;">Nenhuma minissérie encontrada com os filtros atuais.</div>`;
      return;
    }

    grid.className = "subjectsGrid";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "1fr 1fr";
    grid.style.gap = "24px 32px";

    const renderCard = (c) => {
      const isComplete = c.generatedGPT && c.generatedGemini;
      const numDisplay = String(c.number).padStart(2, '0');
      
      // O usuário solicitou que, abaixo do título, seja sempre exibido o conteúdo do próprio "Contexto", até onde couber.
      let descText = getRichContextDescription(c.topic);
      if (!descText) descText = `Minissérie técnica de alta autoridade #${numDisplay} da InkVortex Brasil.`;

      return `
        <article class="subjectCard" style="position:relative; transition: all 0.2s ease;" onmouseover="this.style.borderColor='var(--cyan)';" onmouseout="this.style.borderColor='rgba(0,174,239,0.2)';">
          ${isComplete ? '<div style="position:absolute; top:-8px; right:-8px; background:var(--cyan); color:#000; padding:4px 8px; border-radius:12px; font-size:0.7rem; font-weight:bold; z-index: 10;">COMPLETO</div>' : ''}
          <div class="cardHeader" style="position:relative;">
            <div style="position: absolute; top: -25px; left: -25px; width: 40px; height: 40px; background: var(--brandGrad); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--uiRounded); font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">${numDisplay}</div>
            <h2 style="font-size: 1.1rem; line-height: 1.3; margin-left: 24px;">${c.title}</h2>
          </div>
          <p style="font-size: 0.9rem; color: var(--ivTextSecondary); margin-top: 12px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; flex-grow: 1;">
            ${descText}
          </p>
          <div style="margin-top: 16px; margin-bottom: 8px; display: flex; justify-content: center; gap: 8px;">
            <button class="actionBtn" style="padding: 8px 16px; font-size: 0.75rem; background: rgba(0,174,239,0.1); color: var(--cyan); border: 1px solid rgba(0,174,239,0.3); border-radius: 20px; transition: all 0.2s ease;" onclick="event.stopPropagation(); window.openCampaignWorkspace('${c.id}');" onmouseover="this.style.background='var(--brandGrad)'; this.style.color='#fff'; this.style.borderColor='transparent';" onmouseout="this.style.background='rgba(0,174,239,0.1)'; this.style.color='var(--cyan)'; this.style.borderColor='rgba(0,174,239,0.3)';">
              ⚙️ ABRIR
            </button>
            <button class="actionBtn" style="padding: 8px 16px; font-size: 0.75rem; background: rgba(255,255,255,0.08); color: var(--ivTextSecondary); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; transition: all 0.2s ease;" onclick="event.stopPropagation(); window.openContextModal('${c.id}')" onmouseover="this.style.background='rgba(255,255,255,0.15)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.color='var(--ivTextSecondary)';">
              📖 CONTEXTO
            </button>
            <button class="actionBtn" style="padding: 8px 12px; font-size: 0.75rem; background: rgba(255,0,0,0.1); color: #ff4d4d; border: 1px solid rgba(255,0,0,0.3); border-radius: 20px; transition: all 0.2s ease;" onclick="event.stopPropagation(); window.handleDeleteCampaign('${c.id}')" onmouseover="this.style.background='rgba(255,0,0,0.8)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(255,0,0,0.1)'; this.style.color='#ff4d4d';">
              🗑️
            </button>
          </div>
        </article>
      `;
    };

    grid.innerHTML = filtered.map(c => renderCard(c)).join('');
  }
});

window.openContextModal = function(campaignId) {
  const campaign = AppState.campaigns.find(c => c.id === campaignId);
  if (!campaign || !campaign.topic) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(10px);padding:20px;';
  
  overlay.innerHTML = `
    <div style="background: rgba(10, 15, 28, 0.95); border: 1px solid rgba(0, 174, 239, 0.3); border-radius: 16px; width: 100%; max-width: 700px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <h2 style="margin: 0; color: #fff; font-size: 1.25rem;">📖 Contexto do Assunto #${String(campaign.number).padStart(2,'0')}</h2>
        <button id="closeCtxBtn" style="background:rgba(255,255,255,0.1); border:none; color:#fff; font-size:1.4rem; width:36px; height:36px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition: all 0.2s;">✕</button>
      </div>
      <div style="padding: 24px; overflow-y: auto; flex-grow: 1;">
        <h3 style="color: var(--cyan); margin-bottom: 16px; font-size: 1.15rem; line-height: 1.4;">${campaign.title}</h3>
        <p style="color: rgba(255,255,255,0.9); font-size: 1.05rem; line-height: 1.6; white-space: pre-wrap;">${getRichContextDescription(campaign.topic)}</p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector('#closeCtxBtn');
  closeBtn.onmouseover = () => closeBtn.style.background = 'var(--brandGrad)';
  closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.1)';

  const closeFn = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };
  closeBtn.onclick = closeFn;
  overlay.onclick = (e) => { if (e.target === overlay) closeFn(); };
};

window.copyToClipboard = function(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const oldText = btn.innerHTML;
    const oldBg = btn.style.background;
    btn.innerHTML = "✓ Copiado!";
    btn.style.background = "#00d26a";
    btn.style.color = "#000";
    setTimeout(() => {
      btn.innerHTML = oldText;
      btn.style.background = oldBg;
      btn.style.color = "";
    }, 2000);
  });
};

UI.renderStageOptions = function(bgList, portalVideos) {
  const grid = document.getElementById('stageGrid');
  if (!grid) return;
  
  const list = bgList || (typeof stageBackgrounds !== 'undefined' ? stageBackgrounds : []);
  const videos = portalVideos || (typeof stagePortalVideos !== 'undefined' ? stagePortalVideos : []);
  const activeVideoUrl = (typeof window.getSelectedLivingStageVideo === 'function' ? window.getSelectedLivingStageVideo() : '') || '/palco/00-portal-vivo-inkvortex.mp4';
  
  let html = '';

  if (list && list.length > 0) {
    html += `
      <div style="grid-column: 1 / -1; margin-bottom: 4px;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--cyan); letter-spacing: 1px; text-transform: uppercase;">Cenários & Wallpapers</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; grid-column: 1 / -1;">
        ${list.map(bg => `
          <div class="stageOption" onclick="window.changeBackground('${bg.url}')" style="position:relative; cursor:pointer; border-radius:8px; overflow:hidden; border:2px solid transparent; transition:all 0.2s;" onmouseover="this.style.borderColor='var(--cyan)'; this.style.transform='scale(1.05)';" onmouseout="this.style.borderColor='transparent'; this.style.transform='none';">
            <img src="${bg.url}" alt="${bg.label}" style="width:100%; height:80px; object-fit:cover; display:block;">
            <div style="position:absolute; bottom:0; left:0; right:0; text-align:center; padding:6px; background:rgba(0,0,0,0.8); color:#fff; font-size:0.75rem; font-family:var(--uiText); font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${bg.label}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (videos && videos.length > 0) {
    html += `
      <div style="grid-column: 1 / -1; margin-top: 14px; margin-bottom: 4px;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--magenta); letter-spacing: 1px; text-transform: uppercase;">VIAGENS DO PORTAL</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr; gap: 8px; grid-column: 1 / -1;">
        ${videos.map(v => {
          const isSelected = v.url === activeVideoUrl;
          return `
            <div class="portal-video-card ${isSelected ? 'is-selected' : ''}" data-portal-video-url="${encodeURIComponent(v.url)}" onclick="window.selectLivingStageVideo && window.selectLivingStageVideo('${v.url}')" style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.05); border:1px solid ${isSelected ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}; border-radius:8px; cursor:pointer;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="portal-video-check" style="color:var(--cyan); font-weight:bold;">${isSelected ? '✓' : ''}</span>
                <span style="font-size:0.8rem; color:#fff;">${v.label || v.name || 'Portal'}</span>
              </div>
              <button data-portal-video-selector aria-pressed="${isSelected}" class="portal-video-state actionBtn" style="padding:3px 8px; font-size:0.7rem; background:rgba(0,174,239,0.15); color:var(--cyan); border:none; border-radius:12px;">${isSelected ? 'PORTAL ATIVO' : 'SELECIONAR'}</button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  grid.style.display = 'grid';
  grid.innerHTML = html || '<p style="color:var(--ivTextSecondary); padding: 16px; text-align:center;">Nenhum palco encontrado.</p>';
};

// ============================================================
// SISTEMA DE TIPOGRAFIA — Zoom + Seleção de Fonte
// ============================================================

window.adjustFontSize = function(delta) {
  if (delta === 1) {
    window.currentReadingFontSize = 1;
  } else {
    window.currentReadingFontSize = Math.min(2, Math.max(0.5,
      Math.round(((window.currentReadingFontSize || 1) + delta) * 10) / 10
    ));
  }
  document.documentElement.style.setProperty('--readingFontSizeMultiplier', window.currentReadingFontSize);
  document.documentElement.style.setProperty('--readingFontSize', window.currentReadingFontSize + 'rem');
  localStorage.setItem('vortexFontSize', window.currentReadingFontSize);
  const display = document.getElementById('fontSizeDisplay');
  if (display) display.innerText = Math.round(window.currentReadingFontSize * 100) + '%';
};

window.applyFont = function(urlOrFontId, fontId, fontName, el) {
  let resolvedId   = fontId   || urlOrFontId;
  let resolvedName = fontName || urlOrFontId;
  let resolvedUrl  = urlOrFontId;

  window.activeFontId = resolvedId;

  const isSystemFont = !urlOrFontId.startsWith('/') && !urlOrFontId.includes('.') && !urlOrFontId.startsWith('http');
  if (!isSystemFont) {
    let styleEl = document.getElementById('custom-font-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'custom-font-style';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@font-face { font-family: '${resolvedId}'; src: url('${resolvedUrl}') format('truetype'); }`;
  }

  document.documentElement.style.setProperty('--uiRounded', `'${resolvedId}', sans-serif`);
  document.documentElement.style.setProperty('--uiText', `'${resolvedId}', sans-serif`);
  document.documentElement.style.setProperty('--readingFont', `'${resolvedId}', sans-serif`);
  document.body.style.fontFamily = `'${resolvedId}', sans-serif`;

  localStorage.setItem('vortexFontSelected', JSON.stringify({
    urlOrFontId: resolvedUrl,
    fontId: resolvedId,
    format: resolvedName
  }));

  if (el) {
    document.querySelectorAll('.dropdownItem').forEach(d => {
      d.style.background = 'rgba(0,0,0,0.4)';
      d.style.borderLeft = 'none';
      const s = d.querySelector('.font-status');
      if (s) { s.innerHTML = 'Aplicar'; s.style.color = '#fff'; }
    });
    el.style.background = 'var(--brandGrad)';
    el.style.borderLeft = '4px solid #fff';
    const s = el.querySelector('.font-status');
    if (s) { s.innerHTML = '✓ APLICADA'; }
  }
};

window.syncPhysicalWorkspaceForCampaign = async function(rawNumber) {
  const cNum = String(rawNumber || '').padStart(2, '0');
  if (!cNum || cNum === '00') return null;
  try {
    const res = await fetch(`/api/minisseries/workspace-data?number=${encodeURIComponent(cNum)}&t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.ok || !data.campaign) return null;
    
    const physical = data.campaign;
    let target = (AppState.campaigns || []).find(c => String(c.number || c.cNum || c.id) === String(cNum));
    if (target) {
      if (physical.topic) target.topic = physical.topic;
      if (physical.title) target.title = physical.title;
      if (physical.scenes && physical.scenes.length > 0) {
        target.scenes = physical.scenes;
        target.generatedGPT = true;
      }
      if (physical.scenes40 && physical.scenes40.length > 0) target.scenes40 = physical.scenes40;
      if (physical.scenes50 && physical.scenes50.length > 0) target.scenes50 = physical.scenes50;
      if (physical.geminiScenes && physical.geminiScenes.length > 0) {
        target.geminiScenes = physical.geminiScenes;
        target.generatedGemini = true;
      }
      if (physical.flow) {
        target.flow = physical.flow;
        target.generatedFlow = true;
      }
      if (physical.social) {
        target.social = physical.social;
        target.generatedSocial = true;
      }
      if (physical.flowMusic) {
        target.flowMusic = physical.flowMusic;
        target.audioPrompt = physical.flowMusic.prompt || '';
      } else {
        target.flowMusic = null;
        delete target.audioPrompt;
      }
      AppState.save();
    }
    return physical;
  } catch (err) {
    console.warn('[Workspace] Erro ao sincronizar com o disco:', err);
    return null;
  }
};

window.openCampaignWorkspace = async function(campaignId) {
  AppState.suggestedSubjects = [];
  AppState.selectedCampaignId = String(campaignId);
  AppState.save();
  const c = AppState.getSelectedCampaign();
  if (c) {
    const cNum = String(c.number || c.no || c.id || '01').padStart(2, '0');
    await window.syncPhysicalWorkspaceForCampaign(cNum);
  }
  UI.renderWorkspace();
  window.switchMultiverseRoom('multiverseWelcome');
};

window.renderMultiverseControlPanel = function() {
  const panel = document.getElementById('activeCampaignPanel');
  const rightArea = document.getElementById('multiversePromptsArea');
  const ideationHeader = document.querySelector('.ideationHeader');
  if(!panel || !rightArea) return;

  // Garante que a secao de criacao e busca por numero fique SEMPRE VISIVEL no topo do cockpit
  if (ideationHeader) ideationHeader.style.display = 'block';

  const campaign = AppState.getSelectedCampaign();
  const subjectsGrid = document.getElementById('subjectsGrid');
  
  if (!campaign) {
    panel.style.display = 'flex';
    rightArea.style.display = 'none';
    if (subjectsGrid) subjectsGrid.style.display = 'flex';
    const headerLabel = document.getElementById('activeMinisserieHeaderLabel');
    if (headerLabel) headerLabel.textContent = '--';
    
    panel.innerHTML = `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 20px;">
        <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.5; filter: grayscale(100%);">🌌</div>
        <h2 style="color: #fff; font-family: var(--uiRounded); font-size: 1.5rem; margin-bottom: 12px; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">NENHUMA MINISSÉRIE SELECIONADA</h2>
        <p style="color: var(--ivTextSecondary); max-width: 80%; line-height: 1.5; margin-bottom: 30px;">O Multiverso está aguardando suas diretrizes. Você pode criar novas ideias usando a Inteligência Artificial ou resgatar uma obra existente.</p>
        
        <div style="display: flex; gap: 16px; justify-content: center; width: 100%;">
          <button class="neonBtn" onclick="window.handleGenerateSubjects()" style="padding: 12px 24px; font-size: 0.9rem; flex: 1;">
            ✨ EXPANDIR (IA)
          </button>
          <button class="neonBtn" onclick="window.switchMultiverseRoom('pageLibrary')" style="padding: 12px 24px; font-size: 0.9rem; flex: 1; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); color: var(--ivTextSecondary);">
            📚 ABRIR BIBLIOTECA
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Se tiver campanha selecionada, mostra o painel ativo e a area direita de texto
  panel.style.display = 'flex';
  rightArea.style.display = 'flex';
  if (subjectsGrid) subjectsGrid.style.display = 'none';

  const cNum = String(campaign.number || campaign.no || campaign.id || '01').padStart(2, '0');

  // Atualiza o Label no Topo (Novo Layout do Dashboard)
  const headerLabel = document.getElementById('activeMinisserieHeaderLabel');
  if (headerLabel) {
    headerLabel.textContent = cNum;
  }

  const t = AppState.studioActiveTab || 'gpt';
  
  // Status de Telemetria das 4 Etapas
  const hasGpt = Array.isArray(campaign.scenes) && campaign.scenes.length >= 10;
  const hasGemini = Array.isArray(campaign.geminiScenes) && campaign.geminiScenes.length >= 5;
  const hasFlow = !!(campaign.flow && campaign.flow.prompt);
  const hasSocial = !!(campaign.social && campaign.social.caption);

  // O campo Minisséries Afins foi removido do dashboard central e será tratado no módulo de Documentários.

  panel.innerHTML = `
    <div class="cockpit-console" style="flex-shrink: 0; padding: 0; display: flex; flex-direction: column; gap: 6px;">

      <!-- Título Principal Compacto -->
      <div class="cockpit-hero" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.25); border-radius: 10px; padding: 8px 12px; text-align: center; overflow: hidden;">
        <strong style="color: #fff; font-size: 1.1rem; line-height: 1.4; font-family: var(--uiRounded); font-weight: 900; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 4px 12px rgba(0,0,0,0.9); text-transform: uppercase; letter-spacing: 1px;">
          ${campaign.title || campaign.topic?.title || campaign.assuntoPrincipal || 'SEM TÍTULO DEFINIDO'}
        </strong>
      </div>

      <!-- Grade de Telemetria dos Motores -->
      <div class="cockpit-status-grid" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.25); border-radius: 10px; padding: 8px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px;">
        <div class="cockpit-status-pill" style="display:flex; align-items:center; gap:8px; font-size:0.95rem; color: #fff; font-family: var(--uiRounded); font-weight: 900; text-transform: uppercase; text-shadow: 0 0 8px rgba(0,0,0,0.8); opacity: ${hasGpt ? '1' : '0.4'};">
          <span style="font-size: 1.1rem;">${hasGpt ? '✅' : '⏳'}</span> <span>GPT (IMAGENS)</span>
        </div>
        <div class="cockpit-status-pill" style="display:flex; align-items:center; gap:8px; font-size:0.95rem; color: #fff; font-family: var(--uiRounded); font-weight: 900; text-transform: uppercase; text-shadow: 0 0 8px rgba(0,0,0,0.8); opacity: ${hasGemini ? '1' : '0.4'};">
          <span style="font-size: 1.1rem;">${hasGemini ? '✅' : '⏳'}</span> <span>GEMINI (VÍDEO)</span>
        </div>
        <div class="cockpit-status-pill" style="display:flex; align-items:center; gap:8px; font-size:0.95rem; color: #fff; font-family: var(--uiRounded); font-weight: 900; text-transform: uppercase; text-shadow: 0 0 8px rgba(0,0,0,0.8); opacity: ${hasFlow ? '1' : '0.4'};">
          <span style="font-size: 1.1rem;">${hasFlow ? '✅' : '⏳'}</span> <span>FLOW (MASTER)</span>
        </div>
        <div class="cockpit-status-pill" style="display:flex; align-items:center; gap:8px; font-size:0.95rem; color: #fff; font-family: var(--uiRounded); font-weight: 900; text-transform: uppercase; text-shadow: 0 0 8px rgba(0,0,0,0.8); opacity: ${hasSocial ? '1' : '0.4'};">
          <span style="font-size: 1.1rem;">${hasSocial ? '✅' : '⏳'}</span> <span>LEGENDA SOCIAL</span>
        </div>
      </div>

      <!-- SELETOR DE CENAS DO ROBÔ GEMINI WEB -->
      <div class="cockpit-robot-station" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.25); border-radius: 10px; padding: 8px 10px; margin-top: 2px;">
        
        <!-- Indicador de Destino das Imagens -->
        <div class="cockpit-destination" style="background: rgba(0, 174, 239, 0.15); border: 1px solid rgba(0, 174, 239, 0.4); border-radius: 6px; padding: 5px 10px; margin-bottom: 6px; text-align: center; font-size: 0.85rem; font-family: var(--uiRounded); font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: 0.5px;">
          📁 DESTINO DO ROBÔ: /minisseries/${cNum}/flow/
        </div>

        <div class="cockpit-scene-selector" style="background: rgba(255,255,255,0.02); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 8px;">
          <div style="font-size: 0.95rem; font-family: var(--uiRounded); font-weight: 900; color: #fff; margin-bottom: 6px; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 0 8px rgba(0,0,0,0.8);">
            GEMINI WEB (5 MOVIMENTOS)
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; align-items: center;">
            <label style="font-size: 0.85rem; font-family: var(--uiRounded); font-weight: 800; color: #fff; display: flex; align-items: center; gap: 6px; cursor: pointer; text-transform: uppercase;">
              <input type="checkbox" id="geminiTodas" checked onchange="document.querySelectorAll('.gemini-scene-chk').forEach(cb => cb.checked = this.checked)" style="transform: scale(1.2);"> SELECIONAR TODAS AS CENAS
            </label>
            <div style="display: flex; gap: 12px; justify-content: center; margin-top: 3px;">
              <label style="font-size: 0.85rem; font-family: var(--uiRounded); font-weight: 800; color: #fff; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                <input type="checkbox" class="gemini-scene-chk" value="01" checked style="transform: scale(1.1); margin-bottom: 4px;"> 01
              </label>
              <label style="font-size: 0.85rem; font-family: var(--uiRounded); font-weight: 800; color: #fff; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                <input type="checkbox" class="gemini-scene-chk" value="02" checked style="transform: scale(1.1); margin-bottom: 4px;"> 02
              </label>
              <label style="font-size: 0.85rem; font-family: var(--uiRounded); font-weight: 800; color: #fff; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                <input type="checkbox" class="gemini-scene-chk" value="03" checked style="transform: scale(1.1); margin-bottom: 4px;"> 03
              </label>
              <label style="font-size: 0.85rem; font-family: var(--uiRounded); font-weight: 800; color: #fff; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                <input type="checkbox" class="gemini-scene-chk" value="04" checked style="transform: scale(1.1); margin-bottom: 4px;"> 04
              </label>
              <label style="font-size: 0.85rem; font-family: var(--uiRounded); font-weight: 800; color: #fff; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                <input type="checkbox" class="gemini-scene-chk" value="05" checked style="transform: scale(1.1); margin-bottom: 4px;"> 05
              </label>
            </div>
          </div>
        </div>

        <!-- Botões Disparo Robô e Resgate (NEON) -->
        <div class="cockpit-robot-actions" style="display: flex; gap: 6px; width: 100%; align-items: stretch; box-sizing: border-box;">
          <button id="btnAutomateGeminiWeb" class="neonBtn" style="padding: 4px 8px; flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="window.startGeminiWebAutomation('${campaign.id}')">
            <span style="font-size: 1.15rem; line-height: 1; flex-shrink: 0;">⚡</span>
            <span style="font-size: 0.86rem; font-weight: 800; letter-spacing: 0.6px; font-family: var(--uiRounded); white-space: nowrap;">ROBÔ GEMINI</span>
          </button>
          <button id="btnRescueGeminiWeb" class="neonBtn" style="padding: 0; width: 38px; min-width: 38px; max-width: 38px; height: 38px; background: rgba(0, 255, 128, 0.15); border: 1px solid rgba(0, 255, 128, 0.4); display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 8px;" title="Resgatar Downloads: Extrai as imagens que já estão prontas no chat ativo sem gerar novos prompts." onclick="window.rescueGeminiWebDownloads('${campaign.id}')">
            <span style="font-size: 1.15rem; line-height: 1; text-shadow: 0 0 8px rgba(0,255,128,0.8);">📥</span>
          </button>
        </div>
      </div>
      
      <div class="cockpit-module-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 4px;">
        <button class="neonBtn ${t === 'gpt' ? 'active' : ''}" onclick="AppState.studioActiveTab='gpt'; UI.renderWorkspace();" title="Direção de Arte (50 Cenas GPT)">
          <span style="font-size: 1.05rem; line-height: 1; flex-shrink: 0;">📝</span>
          <span style="font-size: 0.72rem; font-weight: 800; letter-spacing: 0.2px; font-family: var(--uiRounded); white-space: nowrap;">DIREÇÃO DE ARTE</span>
        </button>
        <button class="neonBtn ${t === 'gemini' ? 'active' : ''}" onclick="AppState.studioActiveTab='gemini'; UI.renderWorkspace();" title="Movimentos (5 Cenas Gemini)">
          <span style="font-size: 1.05rem; line-height: 1; flex-shrink: 0;">🚀</span>
          <span style="font-size: 0.72rem; font-weight: 800; letter-spacing: 0.2px; font-family: var(--uiRounded); white-space: nowrap;">MOVIMENTOS</span>
        </button>
        <button class="neonBtn ${t === 'flow' ? 'active' : ''}" onclick="AppState.studioActiveTab='flow'; UI.renderWorkspace();" title="Estrutura Master (Flow Prompts)">
          <span style="font-size: 1.05rem; line-height: 1; flex-shrink: 0;">🌊</span>
          <span style="font-size: 0.72rem; font-weight: 800; letter-spacing: 0.2px; font-family: var(--uiRounded); white-space: nowrap;">ESTRUTURA MASTER</span>
        </button>
        <button class="neonBtn ${t === 'social' ? 'active' : ''}" onclick="AppState.studioActiveTab='social'; UI.renderWorkspace();" title="Legenda Social (Feed e Hashtags)">
          <span style="font-size: 1.05rem; line-height: 1; flex-shrink: 0;">📱</span>
          <span style="font-size: 0.72rem; font-weight: 800; letter-spacing: 0.2px; font-family: var(--uiRounded); white-space: nowrap;">LEGENDA SOCIAL</span>
        </button>
      </div>
      
      <!-- Fim do Painel Central -->
    </div>
  `;

  // O painel visual continua sendo o mesmo painel do Gemini; o seletor GEM/GPT
  // apenas alterna seu conteúdo depois que o markup original foi montado.
  if (typeof window.mountVisualRobotSwitcher === 'function') {
    window.mountVisualRobotSwitcher(campaign.id);
  }

  // Renderiza a aba ativa na coluna direita
  if(t === 'gpt') UI.renderGPTArea();
  else if(t === 'gemini') UI.renderGeminiArea();
  else if(t === 'flow') UI.renderFlowArea();
  else if(t === 'social') UI.renderSocialArea();
};


window.exportSystemBackup = async function() {
  try {
    const payload = {
      campaigns: AppState.campaigns || [],
      activeStage: AppState.activeStage || 'multiverse',
      activeSubTab: AppState.activeSubTab || 'library',
      selectedCampaignId: AppState.selectedCampaignId,
      mistralKey: AppState.mistralKey || '',
      suggestedSubjects: AppState.suggestedSubjects || []
    };

    let serverResult = null;
    try {
      const resp = await fetch('/api/backup/export-to-root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        serverResult = await resp.json();
      }
    } catch (e) {
      console.warn('[Backup] Backend não respondeu na rota /api/backup/export-to-root:', e);
    }

    if (serverResult && serverResult.ok) {
      const count = serverResult.campaignsCount || (AppState.campaigns || []).length;
      alert(`💾 BACKUP OFICIAL SALVO COM SUCESSO!\n\nArquivo gravado diretamente na pasta raiz:\nF:\\VORTEX12\\${serverResult.fileName}\n\nTotal de minisséries salvas: ${count}`);
      if (typeof showToast === 'function') {
        showToast(`💾 Backup salvo em F:\\VORTEX12\\${serverResult.fileName}`, 'success');
      }
      return;
    }

    // Fallback apenas se o backend estiver totalmente inacessível
    const backupData = {
      systemName: 'InkVortex Brasil VORTEX 12.0',
      version: '12.0',
      timestamp: new Date().toISOString(),
      activeStage: AppState.activeStage || 'multiverse',
      activeSubTab: AppState.activeSubTab || 'library',
      selectedCampaignId: AppState.selectedCampaignId,
      mistralKey: AppState.mistralKey || '',
      suggestedSubjects: AppState.suggestedSubjects || [],
      campaignsCount: (AppState.campaigns || []).length,
      campaigns: AppState.campaigns || []
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `VORTEX12-BACKUP-OFICIAL-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast('💾 Backup exportado!', 'success');
  } catch (err) {
    alert('Erro ao exportar backup VORTEX 12.0: ' + err.message);
  }
};

window.importLatestBackupFromRoot = async function() {
  try {
    const resp = await fetch('/api/backup/import-latest-root', { method: 'POST' });
    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      throw new Error(errJson.error || errJson.message || 'Falha ao buscar backup na raiz do sistema.');
    }
    const data = await resp.json();
    if (!data.ok || !data.backupData) {
      throw new Error(data.error || 'Nenhum backup válido encontrado na pasta raiz F:\\VORTEX12.');
    }

    const backupData = data.backupData;
    const campaigns = Array.isArray(backupData.campaigns) ? backupData.campaigns : (Array.isArray(backupData) ? backupData : null);

    if (campaigns) {
      AppState.campaigns = campaigns;
      if (backupData.selectedCampaignId) AppState.selectedCampaignId = backupData.selectedCampaignId;
      if (backupData.mistralKey) AppState.mistralKey = backupData.mistralKey;
      if (backupData.suggestedSubjects && Array.isArray(backupData.suggestedSubjects)) {
        AppState.suggestedSubjects = backupData.suggestedSubjects;
      }
      if (backupData.activeStage) AppState.activeStage = backupData.activeStage;
      if (backupData.activeSubTab) AppState.activeSubTab = backupData.activeSubTab;

      AppState.save();

      UI.renderWorkspace();
      if (typeof UI.renderLibrary === 'function') UI.renderLibrary();

      const count = data.restoredCount || campaigns.length;
      const fileDateStr = data.mtime ? new Date(data.mtime).toLocaleString('pt-BR') : '';
      alert(`✅ BACKUP RESTAURADO COM SUCESSO!\n\nArquivo carregado da raiz:\nF:\\VORTEX12\\${data.fileName}\n${fileDateStr ? `Data da gravação: ${fileDateStr}\n` : ''}\nTotal de ${count} minisséries restauradas e sincronizadas no disco!`);
      if (typeof showToast === 'function') {
        showToast(`📥 Backup ${data.fileName} restaurado!`, 'success');
      }
    } else {
      alert('Formato de backup inválido: não contém lista de campanhas.');
    }
  } catch (err) {
    alert('Erro ao importar backup da raiz F:\\VORTEX12: ' + err.message);
  }
};

window.importSystemBackup = function(inputEl) {
  if (!inputEl || !inputEl.files || !inputEl.files[0]) {
    return window.importLatestBackupFromRoot();
  }

  const file = inputEl.files[0];
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      const campaigns = Array.isArray(data.campaigns) ? data.campaigns : (Array.isArray(data) ? data : null);

      if (campaigns) {
        AppState.campaigns = campaigns;
        if (data.selectedCampaignId) AppState.selectedCampaignId = data.selectedCampaignId;
        if (data.mistralKey) AppState.mistralKey = data.mistralKey;
        if (data.suggestedSubjects && Array.isArray(data.suggestedSubjects)) {
          AppState.suggestedSubjects = data.suggestedSubjects;
        }
        if (data.activeStage) AppState.activeStage = data.activeStage;
        if (data.activeSubTab) AppState.activeSubTab = data.activeSubTab;

        AppState.save();

        let diskSyncOk = false;
        try {
          const resp = await fetch('/api/minisseries/restore-backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ backupData: data })
          });
          if (resp.ok) {
            const resJson = await resp.json();
            if (resJson.ok) diskSyncOk = true;
          }
        } catch (eSync) {
          console.warn('[Backup] Sincronização em disco retornou erro:', eSync);
        }

        UI.renderWorkspace();
        if (typeof UI.renderLibrary === 'function') UI.renderLibrary();

        const count = campaigns.length;
        const msg = diskSyncOk
          ? `✅ BACKUP VORTEX 12.0 RESTAURADO COM SUCESSO!\n\n${count} minisséries restauradas e todos os arquivos sincronizados no disco.`
          : `✅ BACKUP VORTEX 12.0 RESTAURADO NO NAVEGADOR!\n\n${count} minisséries restauradas na memória e no cache local.`;

        alert(msg);
        if (typeof showToast === 'function') showToast('📥 Backup VORTEX 12.0 importado!', 'success');
      } else {
        alert('Formato de arquivo JSON inválido. O arquivo não contém uma lista de campanhas.');
      }
    } catch(err) {
      alert('Erro ao ler arquivo de backup: ' + err.message);
    } finally {
      if (inputEl) inputEl.value = '';
    }
  };
  reader.readAsText(file);
};

window.zipSystemToDriveD = async function() {
  const btn = document.getElementById('btnZipSystemToD');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.innerHTML = '⏳ COMPACTANDO...';
    btn.disabled = true;
  }
  if (typeof showToast === 'function') {
    showToast('🗜️ Compactando sistema VORTEX 12.0 para unidade D:...', 'info');
  }

  try {
    const resp = await fetch('/api/backup/zip-system-to-d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDrive: 'D:\\' })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Falha ao compactar sistema.');
    }

    const result = await resp.json();
    if (!result.ok) {
      throw new Error(result.error || 'Erro na compactação.');
    }

    alert(`🗜️ SISTEMA COMPACTADO COM SUCESSO!\n\nArquivo gerado na unidade de backup:\n${result.filePath}\n\nTamanho: ${result.sizeFormatted}\nData: ${new Date(result.createdAt).toLocaleString('pt-BR')}\n\nPronto para sincronização e segurança no segundo HD.`);
    if (typeof showToast === 'function') {
      showToast(`🗜️ Compactado: ${result.fileName} (${result.sizeFormatted})`, 'success');
    }
  } catch (err) {
    console.error('Erro ao compactar sistema:', err);
    alert('Erro ao compactar sistema para a unidade D:\\:\n' + err.message);
    if (typeof showToast === 'function') {
      showToast('❌ Erro na compactação do sistema: ' + err.message, 'error');
    }
  } finally {
    if (btn) {
      btn.innerHTML = originalText || '🗜️ COMPACTAR SISTEMA (ZIP)';
      btn.disabled = false;
    }
  }
};

window.resetSystemWithBackup = async function() {
  if (!confirm("⚠️ ALERTA VERMELHO — RESET DO SISTEMA\n\nIsso vai resetar toda a biblioteca de minisséries atual.\n\nClique OK para gerar um backup automático de segurança na pasta raiz F:\\VORTEX12 antes de prosseguir.")) {
    return;
  }

  try {
    const payload = {
      campaigns: AppState.campaigns || [],
      activeStage: AppState.activeStage || 'multiverse',
      activeSubTab: AppState.activeSubTab || 'library',
      selectedCampaignId: AppState.selectedCampaignId,
      suggestedSubjects: AppState.suggestedSubjects || [],
      mistralKey: AppState.mistralKey || "",
      isPreReset: true
    };

    let serverSaved = false;
    let savedName = '';
    try {
      const resp = await fetch('/api/backup/export-to-root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const resJson = await resp.json();
        if (resJson.ok) {
          serverSaved = true;
          savedName = resJson.fileName;
        }
      }
    } catch (e) {
      console.warn('[Reset] Falha ao gravar backup pré-reset na raiz:', e);
    }

    if (!serverSaved) {
      const backupObject = {
        systemName: "InkVortex Brasil VORTEX 12.0 — BACKUP PRÉ-RESET",
        version: "12.0",
        timestamp: new Date().toISOString(),
        activeStage: AppState.activeStage || "multiverse",
        activeSubTab: AppState.activeSubTab || "library",
        selectedCampaignId: AppState.selectedCampaignId,
        suggestedSubjects: AppState.suggestedSubjects || [],
        mistralKey: AppState.mistralKey || "",
        campaignsCount: (AppState.campaigns || []).length,
        campaigns: AppState.campaigns || []
      };
      const dataStr = JSON.stringify(backupObject, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `VORTEX12-BACKUP-PRE-RESET-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    AppState.campaigns = [];
    AppState.selectedCampaignId = null;
    AppState.suggestedSubjects = [];
    AppState.save();

    UI.renderWorkspace();
    if (typeof UI.renderLibrary === 'function') UI.renderLibrary();

    const infoMsg = serverSaved
      ? `✅ SISTEMA RESETADO COM SUCESSO!\n\nBackup de segurança salvo na pasta raiz:\nF:\\VORTEX12\\${savedName}\n\nVocê pode restaurá-lo a qualquer momento clicando em IMPORTAR BACKUP.`
      : `✅ SISTEMA RESETADO COM SUCESSO!\n\nBackup de segurança baixado automaticamente.`;

    alert(infoMsg);
    if (typeof showToast === 'function') showToast('⚠️ Sistema resetado com backup de segurança!', 'warning');
  } catch (err) {
    alert("❌ Falha no reset: " + err.message);
  }
};


window.applyFont = function(urlOrFontId, fontId, fontName, el) {
  let resolvedId   = fontId   || urlOrFontId;
  let resolvedName = fontName || urlOrFontId;
  let resolvedUrl  = urlOrFontId;

  window.activeFontId = resolvedId;

  const isSystemFont = !urlOrFontId.startsWith('/') && !urlOrFontId.includes('.') && !urlOrFontId.startsWith('http');
  if (!isSystemFont) {
    let styleEl = document.getElementById('custom-font-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'custom-font-style';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@font-face { font-family: '${resolvedId}'; src: url('${resolvedUrl}') format('truetype'); }`;
  }

  document.documentElement.style.setProperty('--uiRounded', `'${resolvedId}', sans-serif`);
  document.documentElement.style.setProperty('--uiText', `'${resolvedId}', sans-serif`);
  document.documentElement.style.setProperty('--readingFont', `'${resolvedId}', sans-serif`);
  document.body.style.fontFamily = `'${resolvedId}', sans-serif`;

  localStorage.setItem('vortexFontSelected', JSON.stringify({
    urlOrFontId: resolvedUrl,
    fontId: resolvedId,
    format: resolvedName
  }));

  if (el) {
    document.querySelectorAll('.dropdownItem').forEach(d => {
      d.style.background = 'rgba(0,0,0,0.4)';
      d.style.borderLeft = 'none';
      const s = d.querySelector('.font-status');
      if (s) { s.innerHTML = 'Aplicar'; s.style.color = '#fff'; }
    });
    el.style.background = 'var(--brandGrad)';
    el.style.borderLeft = '4px solid #fff';
    const s = el.querySelector('.font-status');
    if (s) { s.innerHTML = '✓ APLICADA'; }
  }

  const btn = document.getElementById('btnFonts');
  if (btn) {
    btn.innerHTML = 'Aa';
    btn.title = `Tipografia: ${resolvedName}`;
  }
};

UI.renderFontOptions = function(fonts) {
  const list = document.getElementById('fontsList');
  if (!list) return;

  const defaultFonts = [
    { fontFamily: 'DMSans', familyLabel: 'DM Sans' },
    { fontFamily: 'Inter', familyLabel: 'Inter' },
    { fontFamily: 'Manrope', familyLabel: 'Manrope' },
    { fontFamily: 'NotoSans', familyLabel: 'Noto Sans' },
    { fontFamily: 'Outfit', familyLabel: 'Outfit' },
    { fontFamily: 'PlusJakartaSans', familyLabel: 'Plus Jakarta Sans' },
    { fontFamily: 'SourceSans3', familyLabel: 'Source Sans 3' },
    { fontFamily: 'Space_Grotesk', familyLabel: 'Space Grotesk' }
  ];

  const fontItems = (fonts && fonts.length > 0) ? fonts : defaultFonts;

  list.innerHTML = fontItems.map(f => {
    const url = f.url || f.fontFamily;
    const fontName = f.familyLabel || f.fontFamily;
    const fontId = f.fontFamily;
    const isActive = window.activeFontId === fontId;
    const bg = isActive ? 'var(--brandGrad)' : 'rgba(0,0,0,0.4)';
    const border = isActive ? '4px solid #fff' : 'none';
    const text = isActive ? '✓ APLICADA' : 'Aplicar';
    
    return `
      <div class="dropdownItem actionBtn" onclick="window.applyFont('${url}', '${fontId}', '${fontName}', this)" style="transition: all 0.3s; background: ${bg}; border-left: ${border}; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; color: #fff; font-family: '${fontId}', sans-serif; font-size: 1.1rem; text-align: left; margin-bottom: 6px; cursor: pointer;">
        <span>${fontName}</span>
        <span class="font-status" style="font-size:0.8rem; font-weight: bold;">${text}</span>
      </div>
    `;
  }).join('');
};

/**
 * BANCO DE 22 EIXOS TECNOLÓGICOS DE VANGUARDA (InkVortex Brasil)
 */
window.VORTEX_TECH_THEMES = [
  {
    id: 'theme_01',
    number: 1,
    title: 'Eletrônica Impressa & Sensores Híbridos',
    category: 'Eletrônica Funcional',
    summary: 'Eletrônica Impressa & Sensores Híbridos [Eletrônica Funcional]',
    briefing: 'Eletrônica Impressa & Sensores Híbridos [Eletrônica Funcional]'
  },
  {
    id: 'theme_02',
    number: 2,
    title: 'Passaporte Digital de Produto & Embalagens Conectadas',
    category: 'Rastreabilidade & Smart Packaging',
    summary: 'Passaporte Digital de Produto & Embalagens Conectadas [Rastreabilidade & Smart Packaging]',
    briefing: 'Passaporte Digital de Produto & Embalagens Conectadas [Rastreabilidade & Smart Packaging]'
  },
  {
    id: 'theme_03',
    number: 3,
    title: 'Cura Fotônica Avançada',
    category: 'Processos Fotoquímicos',
    summary: 'Cura Fotônica Avançada [Processos Fotoquímicos]',
    briefing: 'Cura Fotônica Avançada [Processos Fotoquímicos]'
  },
  {
    id: 'theme_04',
    number: 4,
    title: 'Cores Estruturais & Biomimética Fotônica',
    category: 'Nanotecnologia Óptica',
    summary: 'Cores Estruturais & Biomimética Fotônica [Nanotecnologia Óptica]',
    briefing: 'Cores Estruturais & Biomimética Fotônica [Nanotecnologia Óptica]'
  },
  {
    id: 'theme_05',
    number: 5,
    title: 'Direct-to-Shape & Impressão Industrial de Geometrias Complexas',
    category: 'Robótica & Impressão 3D',
    summary: 'Direct-to-Shape & Impressão Industrial de Geometrias Complexas [Robótica & Impressão 3D]',
    briefing: 'Direct-to-Shape & Impressão Industrial de Geometrias Complexas [Robótica & Impressão 3D]'
  },
  {
    id: 'theme_06',
    number: 6,
    title: 'Inteligência Artificial Preditiva & Controle Espectral Inline',
    category: 'Automação & Visão Computacional',
    summary: 'Inteligência Artificial Preditiva & Controle Espectral Inline [Automação & Visão Computacional]',
    briefing: 'Inteligência Artificial Preditiva & Controle Espectral Inline [Automação & Visão Computacional]'
  },
  {
    id: 'theme_07',
    number: 7,
    title: 'Substratos de Barreira Biodegradáveis & Celulose Nanofibrilada',
    category: 'Materiais Sustentáveis',
    summary: 'Substratos de Barreira Biodegradáveis & Celulose Nanofibrilada [Materiais Sustentáveis]',
    briefing: 'Substratos de Barreira Biodegradáveis & Celulose Nanofibrilada [Materiais Sustentáveis]'
  },
  {
    id: 'theme_08',
    number: 8,
    title: 'Nanopontos Quânticos & Tintas de Alta Fidelidade Espectral',
    category: 'Nanomateriais & Segurança',
    summary: 'Nanopontos Quânticos & Tintas de Alta Fidelidade Espectral [Nanomateriais & Segurança]',
    briefing: 'Nanopontos Quânticos & Tintas de Alta Fidelidade Espectral [Nanomateriais & Segurança]'
  },
  {
    id: 'theme_09',
    number: 9,
    title: 'Telas Transparentes & Displays Flexíveis Impressos',
    category: 'Optoeletrônica Impressa',
    summary: 'Telas Transparentes & Displays Flexíveis Impressos [Optoeletrônica Impressa]',
    briefing: 'Telas Transparentes & Displays Flexíveis Impressos [Optoeletrônica Impressa]'
  },
  {
    id: 'theme_10',
    number: 10,
    title: 'Decoração Cerâmica Digital & Tintas Inorgânicas Fundíveis em Vidro',
    category: 'Vidros & Cerâmicas Industriais',
    summary: 'Decoração Cerâmica Digital & Tintas Inorgânicas Fundíveis em Vidro [Vidros & Cerâmicas Industriais]',
    briefing: 'Decoração Cerâmica Digital & Tintas Inorgânicas Fundíveis em Vidro [Vidros & Cerâmicas Industriais]'
  },
  {
    id: 'theme_11',
    number: 11,
    title: 'Eletrônica Efêmera & Dispositivos Biodegradáveis Impressos',
    category: 'Eletrônica Verde',
    summary: 'Eletrônica Efêmera & Dispositivos Biodegradáveis Impressos [Eletrônica Verde]',
    briefing: 'Eletrônica Efêmera & Dispositivos Biodegradáveis Impressos [Eletrônica Verde]'
  },
  {
    id: 'theme_12',
    number: 12,
    title: 'Microfluídica Impressa & Dispositivos Lab-on-a-Chip Descartáveis',
    category: 'Biotecnologia & Saúde',
    summary: 'Microfluídica Impressa & Dispositivos Lab-on-a-Chip Descartáveis [Biotecnologia & Saúde]',
    briefing: 'Microfluídica Impressa & Dispositivos Lab-on-a-Chip Descartáveis [Biotecnologia & Saúde]'
  },
  {
    id: 'theme_13',
    number: 13,
    title: 'Manufatura Aditiva Funcional & Texturização Háptica',
    category: 'Acabamento Tátil & Braille',
    summary: 'Manufatura Aditiva Funcional & Texturização Háptica [Acabamento Tátil & Braille]',
    briefing: 'Manufatura Aditiva Funcional & Texturização Háptica [Acabamento Tátil & Braille]'
  },
  {
    id: 'theme_14',
    number: 14,
    title: 'Tintas Dinâmicas & Resposta a Estímulos',
    category: 'Tintas Inteligentes',
    summary: 'Tintas Dinâmicas & Resposta a Estímulos [Tintas Inteligentes]',
    briefing: 'Tintas Dinâmicas & Resposta a Estímulos [Tintas Inteligentes]'
  },
  {
    id: 'theme_15',
    number: 15,
    title: 'Colheita de Energia Impressa & Painéis Fotovoltaicos Orgânicos',
    category: 'Energia Renovável',
    summary: 'Colheita de Energia Impressa & Painéis Fotovoltaicos Orgânicos [Energia Renovável]',
    briefing: 'Colheita de Energia Impressa & Painéis Fotovoltaicos Orgânicos [Energia Renovável]'
  },
  {
    id: 'theme_16',
    number: 16,
    title: 'Nanoimprint Lithography Industrial para Óptica e Microholografia',
    category: 'Nanoestruturação de Superfície',
    summary: 'Nanoimprint Lithography Industrial para Óptica e Microholografia [Nanoestruturação de Superfície]',
    briefing: 'Nanoimprint Lithography Industrial para Óptica e Microholografia [Nanoestruturação de Superfície]'
  },
  {
    id: 'theme_17',
    number: 17,
    title: 'Cura por Feixe de Elétrons sem Fotoiniciadores',
    category: 'Embalagens Alimentícias',
    summary: 'Cura por Feixe de Elétrons sem Fotoiniciadores [Embalagens Alimentícias]',
    briefing: 'Cura por Feixe de Elétrons sem Fotoiniciadores [Embalagens Alimentícias]'
  },
  {
    id: 'theme_18',
    number: 18,
    title: 'Tintas à Base de Grafeno, MXenes e Nanotubos de Carbono',
    category: 'Nanomateriais Condutivos',
    summary: 'Tintas à Base de Grafeno, MXenes e Nanotubos de Carbono [Nanomateriais Condutivos]',
    briefing: 'Tintas à Base de Grafeno, MXenes e Nanotubos de Carbono [Nanomateriais Condutivos]'
  },
  {
    id: 'theme_19',
    number: 19,
    title: 'Desentintagem & Reciclagem Circular de Embalagens Multicamada',
    category: 'Economia Circular',
    summary: 'Desentintagem & Reciclagem Circular de Embalagens Multicamada [Economia Circular]',
    briefing: 'Desentintagem & Reciclagem Circular de Embalagens Multicamada [Economia Circular]'
  },
  {
    id: 'theme_20',
    number: 20,
    title: 'Gêmeo Digital & Indústria Gráfica 5.0',
    category: 'Indústria 4.0 / 5.0',
    summary: 'Gêmeo Digital & Indústria Gráfica 5.0 [Indústria 4.0 / 5.0]',
    briefing: 'Gêmeo Digital & Indústria Gráfica 5.0 [Indústria 4.0 / 5.0]'
  },
  {
    id: 'theme_21',
    number: 21,
    title: 'Impressão Têxtil Digital & Estamparia de Vanguarda',
    category: 'Impressão Têxtil Industrial',
    summary: 'Impressão Têxtil Digital & Estamparia de Vanguarda [Impressão Têxtil Industrial]',
    briefing: 'Impressão Têxtil Digital & Estamparia de Vanguarda [Impressão Têxtil Industrial]'
  },
  {
    id: 'theme_22',
    number: 22,
    title: 'Tema Livre / Personalizado',
    category: 'Tema Livre',
    summary: 'Tema Livre / Personalizado [Tema Livre]',
    briefing: 'Tema Livre / Personalizado [Tema Livre]'
  }
];

window.openThemePickerModal = function(nextNumber, onConfirm) {
  const existingOverlay = document.getElementById('themePickerModalOverlay');
  if (existingOverlay && document.body.contains(existingOverlay)) {
    document.body.removeChild(existingOverlay);
  }

  const overlay = document.createElement('div');
  overlay.id = 'themePickerModalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,18,0.88);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(14px);padding:20px;';

  const numFormatted = String(nextNumber).padStart(2, '0');
  const themes = window.VORTEX_TECH_THEMES || [];
  let selectedIndex = 0;

  overlay.innerHTML = `
    <div style="background: linear-gradient(135deg, rgba(14,20,38,0.96), rgba(8,12,24,0.98)); border: 1px solid rgba(0,174,239,0.35); border-radius: 18px; width: 100%; max-width: 720px; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 30px rgba(0,174,239,0.15); font-family: var(--uiRounded); overflow: hidden;">
      
      <!-- Cabeçalho do Modal -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="background: var(--brandGrad); border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; box-shadow: 0 0 15px rgba(232,0,109,0.4);">✨</div>
          <div>
            <h2 style="margin: 0; color: #fff; font-size: 1.15rem; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">Expandir Inteligência Editorial</h2>
            <div style="font-size: 0.8rem; color: var(--cyan); margin-top: 2px;">Curadoria de Vanguarda · Mistral Large</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="background: rgba(0,174,239,0.15); border: 1px solid var(--cyan); padding: 4px 12px; border-radius: 20px; color: #fff; font-weight: 900; font-size: 0.85rem; box-shadow: 0 0 10px rgba(0,174,239,0.3);">
            MINISSÉRIE #${numFormatted}
          </div>
          <button id="closeThemeModalBtn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 1.2rem; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">✕</button>
        </div>
      </div>

      <!-- Corpo do Modal — Apenas o Seletor dos Eixos -->
      <div style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
        
        <div>
          <label style="display: block; color: var(--cyan); font-size: 0.85rem; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
            🔬 1. Escolha o Eixo Tecnológico (${themes.length} Bancos de Dados)
          </label>
          <select id="themeSelectorDropdown" style="width: 100%; padding: 14px 16px; background: rgba(0,0,0,0.6); border: 1px solid rgba(0,174,239,0.45); border-radius: 10px; color: #fff; font-family: var(--uiRounded); font-size: 0.95rem; font-weight: bold; outline: none; cursor: pointer; box-shadow: inset 0 2px 6px rgba(0,0,0,0.5);">
            ${themes.map((t, idx) => {
              const label = t.number === 22 
                ? '22. ✨ TEMA LIVRE / PERSONALIZADO' 
                : `${String(t.number).padStart(2, '0')}. ${t.title} [${t.category}]`;
              return `<option value="${idx}" ${idx === 0 ? 'selected' : ''} style="background: #0b1120; color: #fff;">${label}</option>`;
            }).join('')}
          </select>
        </div>

        <!-- Campo Dinâmico Exclusivo para Tema Livre 22 -->
        <div id="customThemeContainer" style="display: none; flex-direction: column; gap: 8px;">
          <label style="color: var(--cyan); font-size: 0.82rem; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase;">
            ✍️ Digite seu Tema Livre / Tópico Personalizado
          </label>
          <input type="text" id="customThemeInput" placeholder="Ex: Impressão Têxtil Industrial & Estamparia Digital de Alta Velocidade..." style="width: 100%; box-sizing: border-box; padding: 14px 16px; background: rgba(0,0,0,0.6); border: 1px solid rgba(232,0,109,0.5); border-radius: 10px; color: #fff; font-family: var(--uiRounded); font-size: 0.95rem; font-weight: bold; outline: none; box-shadow: 0 0 10px rgba(232,0,109,0.2);">
        </div>

      </div>

      <!-- Rodapé / Ações -->
      <div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3);">
        <button id="cancelThemeModalBtn" style="padding: 10px 20px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; color: var(--ivTextSecondary); font-family: var(--uiRounded); font-size: 0.85rem; font-weight: bold; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.color='var(--ivTextSecondary)';">
          ✕ Cancelar
        </button>
        <button id="confirmThemeModalBtn" class="neonBtn" style="padding: 10px 24px; font-size: 0.9rem; font-weight: 900; background: var(--brandGrad); border: none; border-radius: 20px; color: #fff; cursor: pointer; box-shadow: 0 0 20px rgba(0,174,239,0.4); display: flex; align-items: center; gap: 8px;">
          🚀 GERAR MINISSÉRIE #${numFormatted} (IA)
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  const selectEl = overlay.querySelector('#themeSelectorDropdown');
  const customContainer = overlay.querySelector('#customThemeContainer');
  const customInput = overlay.querySelector('#customThemeInput');
  const closeBtn = overlay.querySelector('#closeThemeModalBtn');
  const cancelBtn = overlay.querySelector('#cancelThemeModalBtn');
  const confirmBtn = overlay.querySelector('#confirmThemeModalBtn');

  const onSelectionChange = () => {
    selectedIndex = parseInt(selectEl.value, 10) || 0;
    const selectedTheme = themes[selectedIndex];
    if (selectedTheme && selectedTheme.number === 22) {
      customContainer.style.display = 'flex';
      if (customInput) customInput.focus();
    } else {
      customContainer.style.display = 'none';
    }
  };

  if (selectEl) {
    selectEl.onchange = onSelectionChange;
  }

  const closeModal = () => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const selectedTheme = themes[selectedIndex];
      let finalBrief = '';

      if (selectedTheme && selectedTheme.number === 22) {
        finalBrief = customInput ? customInput.value.trim() : '';
        if (!finalBrief) {
          alert('Por favor, digite o tema livre desejado para a minissérie.');
          if (customInput) customInput.focus();
          return;
        }
      } else if (selectedTheme) {
        finalBrief = `${selectedTheme.title} [${selectedTheme.category}]`;
      }

      if (!finalBrief) {
        alert('Por favor, selecione um eixo tecnológico válido.');
        return;
      }

      closeModal();
      if (typeof onConfirm === 'function') {
        onConfirm(finalBrief, nextNumber);
      }
    };
  }
};

