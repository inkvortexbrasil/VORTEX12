
const FLOW_7_IMAGE_REFS = Object.freeze(['img_001', 'img_011', 'img_016', 'img_021', 'img_031', 'img_041', 'img_046']);

const GPT_10_SCENES_META = Object.freeze([
  { sceneNo: 1, imageFile: 'img_001', masterVideo: 'MASTER 1 (10s)', masterFile: 'master_1.mp4' },
  { sceneNo: 2, imageFile: 'img_006', masterVideo: 'MASTER 1 (10s)', masterFile: 'master_1.mp4' },
  { sceneNo: 3, imageFile: 'img_011', masterVideo: 'MASTER 1 (10s)', masterFile: 'master_1.mp4' },
  { sceneNo: 4, imageFile: 'img_016', masterVideo: 'MASTER 1 (10s)', masterFile: 'master_1.mp4' },
  { sceneNo: 5, imageFile: 'img_021', masterVideo: 'MASTER 1 (10s)', masterFile: 'master_1.mp4' },
  { sceneNo: 6, imageFile: 'img_026', masterVideo: 'MASTER 2 (10s)', masterFile: 'master_2.mp4' },
  { sceneNo: 7, imageFile: 'img_031', masterVideo: 'MASTER 2 (10s)', masterFile: 'master_2.mp4' },
  { sceneNo: 8, imageFile: 'img_036', masterVideo: 'MASTER 2 (10s)', masterFile: 'master_2.mp4' },
  { sceneNo: 9, imageFile: 'img_041', masterVideo: 'MASTER 2 (10s)', masterFile: 'master_2.mp4' },
  { sceneNo: 10, imageFile: 'img_046', masterVideo: 'MASTER 2 (10s)', masterFile: 'master_2.mp4' }
]);

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
    const controlPanel = document.getElementById('multiverseControlPanel');
    const orbitLeft = document.getElementById('orbitLeft');

    if (AppState.isGeneratingSubjects) {
      if (activePanel) activePanel.style.display = 'flex';
      if (rightArea)   rightArea.style.display   = 'flex';
      
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
      if (activePanel) activePanel.style.display = 'flex';
      if (rightArea)   rightArea.style.display   = 'flex';
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

    if (controlPanel) {
      controlPanel.style.background = 'rgba(255, 255, 255, 0.02)';
      controlPanel.style.border = '1px solid rgba(0, 174, 239, 0.25)';
      controlPanel.style.boxShadow = 'inset 0 0 15px rgba(0,174,239,0.06), 0 0 20px rgba(0,174,239,0.1)';
      controlPanel.style.backdropFilter = 'blur(1px)';
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


  renderMiniseriesNotGenerated(campaign) {
    const num = String(campaign.number || campaign.no || campaign.id || '').padStart(2, '0') || '15';
    return `
      <div style="padding: 32px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        <button class="actionBtn" style="background: var(--brandGrad); padding: 18px 36px; font-size: 1.15rem; font-weight: 800; font-family: var(--uiRounded); border: none; border-radius: 12px; box-shadow: 0 0 25px rgba(0, 174, 239, 0.45); cursor: pointer; letter-spacing: 0.5px; transition: all 0.2s ease;" onclick="this.innerText='⏳ GERANDO MINISSÉRIE ${num}...'; this.style.opacity='0.7'; this.style.pointerEvents='none'; handleGenerateAction('minisserie', '${campaign.id}')">
          ✨ GERAR MINISSÉRIE ${num}
        </button>
      </div>
    `;
  },

  renderGPTArea() {
    const campaign = AppState.getSelectedCampaign();
    if(!campaign) return;

    if (!campaign.generatedGPT) {
      this.contentArea.innerHTML = this.renderMiniseriesNotGenerated(campaign);
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
      const meta = GPT_10_SCENES_META[activeIdx] || { imageFile: `img_${String(activeIdx * 5 + 1).padStart(3, '0')}`, masterVideo: activeIdx < 5 ? 'MASTER 1 (10s)' : 'MASTER 2 (10s)' };
      const titleHtml = s.title ? `<div style="color: #fff; font-family: var(--uiRounded); font-size: 0.94rem; font-weight: 800; margin-bottom: 8px; padding: 6px 10px; background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 3px solid var(--cyan); text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${s.title}</div>` : '';
      contentHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; flex-shrink: 0; width: 100%; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <button id="btnTabCapa" class="badge actionBtn" style="cursor: pointer; background: rgba(4,12,31,0.58); color: rgba(226,232,240,0.82); border: 1px solid rgba(148,163,184,0.2); padding: 5px 14px; font-size: 0.76rem; font-weight: 800; border-radius: 8px; transition: all 0.2s ease; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); letter-spacing: 0.05em;" onclick="window.switchSceneTab('capa', 'gpt')">
              CAPA
            </button>
            <span style="font-size: 0.74rem; color: #fff; font-weight: 700;">Esteira: <code style="background: rgba(0, 174, 239, 0.15); padding: 2px 6px; border-radius: 4px; color: #67e8f9;">${meta.imageFile}.png</code></span>
            <span style="font-size: 0.72rem; color: #c084fc; font-weight: 800; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); padding: 2px 6px; border-radius: 4px;">🎬 ${meta.masterVideo}</span>
          </div>
          <button class="badge actionBtn" style="cursor: pointer; background: ${s.copiedGPT ? 'var(--brandGrad)' : 'rgba(0, 174, 239, 0.25)'}; color: #fff; border: 1px solid ${s.copiedGPT ? 'transparent' : 'var(--cyan)'}; padding: 5px 16px; font-size: 0.76rem; font-weight: bold; border-radius: 8px; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0, 174, 239, 0.3);" onclick="window.copyExpandedContent('gpt', ${activeIdx}, this)">
            ${s.copiedGPT ? '✓ COPIADO' : '📋 COPIAR'}
          </button>
        </div>
        ${titleHtml}
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

    if (!campaign.generatedGPT || !campaign.generatedGemini) {
      this.contentArea.innerHTML = this.renderMiniseriesNotGenerated(campaign);
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
      const refImg = s.referenceImage || FLOW_7_IMAGE_REFS[idx] || `img_${String(idx + 1).padStart(3, '0')}`;
      return `
        <button style="min-width:0; width:100%; height:34px; overflow:hidden; white-space:nowrap; background: ${isActive ? 'linear-gradient(135deg, rgba(0,174,239,0.95), rgba(126,34,206,0.95))' : 'rgba(4,12,31,0.58)'}; color: ${isActive ? '#fff' : 'rgba(226,232,240,0.82)'}; border: 1px solid ${isActive ? 'rgba(103,232,249,0.9)' : 'rgba(148,163,184,0.2)'}; padding: 1px 0; border-radius: 8px; font-weight: 800; cursor: pointer; transition: all 0.2s ease; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: ${isActive ? '0 0 12px rgba(0,174,239,0.45)' : 'inset 0 1px 0 rgba(255,255,255,0.04)'};" onclick="window.switchSceneTab(${idx}, 'gemini')">
          <span style="font-size: 0.74rem; font-weight: 900; line-height: 1.1;">${String(s.no || idx + 1).padStart(2, '0')}</span>
          <span style="font-size: 0.58rem; color: ${isActive ? '#fff' : 'var(--cyan)'}; opacity: 0.9; line-height: 1; margin-top: 1px;">${refImg}</span>
        </button>
      `;
    }).join('');

    let contentHtml = '';
    if (geminiScenes.length > 0 && geminiScenes[activeIdx]) {
      const s = geminiScenes[activeIdx];
      const refImg = s.referenceImage || FLOW_7_IMAGE_REFS[activeIdx] || `img_${String(activeIdx + 1).padStart(3, '0')}`;
      const titleHtml = s.title ? `<div style="color: #fff; font-family: var(--uiRounded); font-size: 0.88rem; font-weight: 800; margin-bottom: 6px; padding: 2px 4px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${s.title}</div>` : '';
      
      contentHtml = `
        <div style="background: rgba(0, 174, 239, 0.08); border: 1px solid rgba(0, 174, 239, 0.25); border-radius: 8px; padding: 6px 10px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
          <div>
            <span style="color: var(--cyan); font-size: 0.76rem; font-weight: 800; text-transform: uppercase;">Cena #${String(s.no || activeIdx + 1).padStart(2, '0')}</span>
            <span style="color: #fff; font-size: 0.76rem; font-weight: 700; margin-left: 8px;">Imagem Esteira: <code style="background: rgba(0, 174, 239, 0.2); padding: 2px 6px; border-radius: 4px; color: #67e8f9;">${refImg}.png</code></span>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="badge actionBtn" style="cursor: pointer; background: rgba(0, 255, 128, 0.15); color: #00ff80; border: 1px solid rgba(0, 255, 128, 0.4); padding: 5px 12px; font-size: 0.74rem; font-weight: bold; border-radius: 6px;" onclick="window.syncFlowImages('${campaign.id}')" title="Copia as 7 imagens padronizadas para a pasta flow">
              🔄 SINCRONIZAR PARA FLOW
            </button>
            <button class="badge actionBtn" style="cursor: pointer; background: ${s.copiedGemini ? 'var(--brandGrad)' : 'rgba(0, 174, 239, 0.25)'}; color: #fff; border: 1px solid ${s.copiedGemini ? 'transparent' : 'var(--cyan)'}; padding: 5px 12px; font-size: 0.74rem; font-weight: bold; border-radius: 6px; transition: all 0.2s ease;" onclick="window.copyExpandedContent('gemini', ${activeIdx}, this)">
              ${s.copiedGemini ? '✓ COPIADO' : '📋 COPIAR'}
            </button>
          </div>
        </div>
        ${titleHtml}
        <div class="show-scroll" style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding-right: 6px; ">
          <p id="geminiPromptText_${activeIdx}" style="color: #e2e8f0; display: block; font-family: var(--readingFont, 'Inter', sans-serif); font-size: calc(0.86rem * var(--readingFontSizeMultiplier, 1)); line-height: 1.55; white-space: pre-wrap; text-shadow: 0 1px 3px rgba(0,0,0,0.9); margin: 0; padding: 4px 8px 75px 8px;">
            ${s.geminiMotion || s.prompt || ''}
          </p>
        </div>
      `;
    }

    this.contentArea.innerHTML = `
      <div style="padding: 0 8px 16px 8px; height: 100%; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
        <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; width: 100%; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 0 1px 7px; flex-shrink: 0; box-sizing: border-box;">
          ${tabsHtml}
        </div>
        ${contentHtml}
      </div>
    `;
  },

  renderSocialArea() {
    const campaign = AppState.getSelectedCampaign();
    if (!campaign) {
      if (this.contentArea) {
        this.contentArea.innerHTML = `
          <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; box-sizing: border-box;">
            <div style="font-size: 2.8rem; margin-bottom: 12px; opacity: 0.5;">🌌</div>
            <h3 style="color: #fff; font-family: var(--uiRounded); font-size: 1.1rem; margin-bottom: 8px;">MULTIVERSO AGUARDANDO</h3>
            <p style="color: var(--ivTextSecondary); max-width: 440px; font-size: 0.88rem; line-height: 1.5; margin: 0;">
              Selecione uma minissérie na biblioteca ou crie uma nova obra para visualizar a apresentação editorial neste palco central.
            </p>
          </div>
        `;
      }
      return;
    }

    const isCopied = campaign.social ? !!campaign.social.copied : false;
    const rawCaption = (campaign.social && (campaign.social.caption || campaign.social.baseCaption || campaign.social.socialCaption))
      || campaign.socialCaption
      || '';

    if (!rawCaption) {
      this.contentArea.innerHTML = `
        <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; box-sizing: border-box;">
          <div style="font-size: 2.8rem; margin-bottom: 12px; opacity: 0.5;">📝</div>
          <h3 style="color: #fff; font-family: var(--uiRounded); font-size: 1.1rem; margin-bottom: 8px;">APRESENTAÇÃO DA MINISSÉRIE</h3>
          <p style="color: var(--ivTextSecondary); max-width: 440px; font-size: 0.88rem; line-height: 1.5; margin: 0 0 16px 0;">
            A narrativa social de apresentação desta obra ainda não foi gerada no estúdio.
          </p>
          <button class="neonBtn" onclick="window.handleGenerateSubjects()" style="padding: 8px 18px; font-size: 0.82rem; font-weight: 800;">
            ✨ EXPANDIR (IA)
          </button>
        </div>
      `;
      return;
    }

    // Separa as frases e as hashtags
    const rawLines = rawCaption.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const hashtagLines = rawLines.filter(l => l.startsWith('#'));
    const hashtagsText = hashtagLines.join(' ');
    const contentLines = rawLines.filter(l => !l.startsWith('#') && !/^miniss[eé]rie\s+\d+/i.test(l));

    this.contentArea.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%; min-height: 0; box-sizing: border-box; padding: 12px 18px 16px 18px; position: relative;">
        <!-- Topo: Botão Copiar no canto superior direito -->
        <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 10px; flex-shrink: 0;">
          <button id="btnCopySocialCaption" class="actionBtn" 
                  style="cursor: pointer; background: ${isCopied ? 'var(--brandGrad)' : 'rgba(0, 174, 239, 0.16)'}; color: #fff; border: 1px solid ${isCopied ? 'transparent' : 'rgba(0, 174, 239, 0.55)'}; padding: 7px 18px; font-size: 0.82rem; font-weight: 800; border-radius: 8px; box-shadow: 0 0 14px rgba(0,174,239,0.22); display: inline-flex; align-items: center; gap: 7px; letter-spacing: 0.5px; transition: all 0.2s ease;"
                  onclick="window.copyExpandedContent('social', 0, this)">
            <span style="font-size: 0.95rem;">${isCopied ? '✓' : '📋'}</span>
            <span>${isCopied ? 'COPIADO' : 'COPIAR'}</span>
          </button>
        </div>

        <!-- Leitura Horizontal Fluida das 10 Linhas da Minissérie -->
        <div class="show-scroll" style="flex: 1; overflow-y: auto; min-height: 0; padding-right: 6px;">
          <div id="socialCaptionText" style="display: flex; flex-direction: column; gap: 11px; color: #eaf4ff; font-family: var(--readingFont, 'Inter', sans-serif); font-size: calc(0.96rem * var(--readingFontSizeMultiplier, 1)); line-height: 1.62; text-shadow: 0 1px 4px rgba(0,0,0,0.85);">
            ${contentLines.length > 0
              ? contentLines.map(line => `
                  <div style="display: flex; align-items: flex-start; gap: 8px; background: rgba(255,255,255,0.02); border-radius: 8px; padding: 6px 10px; border: 1px solid rgba(255,255,255,0.04);">
                    <span style="line-height: 1.62; flex: 1;">${line}</span>
                  </div>
                `).join('')
              : `<p style="white-space: pre-wrap; margin: 0; line-height: 1.6;">${rawCaption}</p>`
            }
          </div>

          ${hashtagsText ? `
            <div style="margin-top: 16px; padding: 12px 14px; background: rgba(0, 174, 239, 0.06); border: 1px solid rgba(0, 174, 239, 0.25); border-radius: 10px; color: #00e5ff; font-weight: 700; font-size: 0.90rem; letter-spacing: 0.5px; line-height: 1.6; text-shadow: 0 0 12px rgba(0,229,255,0.35);">
              ${hashtagsText}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  renderFlowArea() {
    const campaign = AppState.getSelectedCampaign();
    if (!campaign) return;

    if (!campaign.generatedGPT || !campaign.flow || !campaign.flow.prompt) {
      this.contentArea.innerHTML = this.renderMiniseriesNotGenerated(campaign);
      return;
    }

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
  const headerLabel = document.getElementById('activeMinisserieHeaderLabel');
  
  if (!campaign) {
    panel.style.display = 'flex';
    rightArea.style.display = 'flex';
    if (subjectsGrid) subjectsGrid.style.display = 'flex';
    if (headerLabel) headerLabel.textContent = '--';
    
    panel.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px; padding: 6px 0;">
        <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 14px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 6px; opacity: 0.6;">🌌</div>
          <div style="color: #fff; font-family: var(--uiRounded); font-size: 0.92rem; font-weight: 900; margin-bottom: 6px;">NENHUMA MINISSÉRIE SELECIONADA</div>
          <p style="color: var(--ivTextSecondary); font-size: 0.78rem; line-height: 1.4; margin: 0 0 12px 0;">Digite o número acima ou crie uma nova obra via IA.</p>
          <button class="neonBtn" onclick="window.handleGenerateSubjects()" style="width: 100%; padding: 8px 14px; font-size: 0.8rem; font-weight: 800;">
            ✨ EXPANDIR (IA)
          </button>
        </div>
      </div>
    `;
    UI.renderSocialArea();
    return;
  }

  // Se tiver campanha selecionada, mostra o painel ativo e o palco central
  panel.style.display = 'flex';
  rightArea.style.display = 'flex';
  if (subjectsGrid) subjectsGrid.style.display = 'none';

  const cNum = String(campaign.number || campaign.no || campaign.id || '01').padStart(2, '0');

  // Atualiza o Label no Topo (Número da Minissérie)
  if (headerLabel) {
    headerLabel.textContent = cNum;
  }

  // Cockpit compacto no lado direito: Título Principal da Minissérie
  panel.innerHTML = `
    <div class="cockpit-console" style="display: flex; flex-direction: column; gap: 10px; padding: 0; width: 100%;">
      <!-- Título Principal da Minissérie -->
      <div class="cockpit-hero" style="background: linear-gradient(145deg, rgba(4, 12, 31, 0.4), rgba(255, 255, 255, 0.03)); border: 1px solid rgba(0, 174, 239, 0.35); border-radius: 14px; padding: 14px 16px; text-align: left; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
        <div style="color: var(--cyan); font-size: 0.68rem; font-family: var(--uiRounded); font-weight: 900; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 6px; opacity: 0.85;">
          TÍTULO DA MINISSÉRIE
        </div>
        <strong style="color: #fff; font-size: 0.98rem; line-height: 1.4; font-family: var(--uiRounded); font-weight: 900; display: block; text-shadow: 0 2px 10px rgba(0,0,0,0.9); text-transform: uppercase; letter-spacing: 0.5px;">
          ${campaign.title || campaign.topic?.title || campaign.assuntoPrincipal || 'SEM TÍTULO DEFINIDO'}
        </strong>
      </div>
    </div>
  `;

  // Renderiza a apresentação da minissérie (10 linhas e hashtags) no Palco Central
  UI.renderSocialArea();
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
 * BANCO DE 40 EIXOS TECNOLÓGICOS DE VANGUARDA (InkVortex Brasil)
 */
window.VORTEX_TECH_THEMES = [
  {
    id: 'theme_01',
    number: 1,
    title: 'Tema Livre / Personalizado',
    category: 'Tema Livre',
    summary: 'Tema Livre / Personalizado [Tema Livre]',
    briefing: 'Tema Livre / Personalizado [Tema Livre]'
  },
  {
    id: 'theme_02',
    number: 2,
    title: 'Impressão Direct-to-Film (DTF) Híbrida & Estamparia Sem Limite de Fibras',
    category: 'Indústria Têxtil',
    summary: 'Impressão Direct-to-Film (DTF) Híbrida & Estamparia Sem Limite de Fibras [Indústria Têxtil]',
    briefing: 'Impressão Direct-to-Film (DTF) Híbrida & Estamparia Sem Limite de Fibras [Indústria Têxtil]'
  },
  {
    id: 'theme_03',
    number: 3,
    title: 'Estamparia Digital Sustentável & Tecnologias Pigmentares sem Água',
    category: 'Indústria Têxtil',
    summary: 'Estamparia Digital Sustentável & Tecnologias Pigmentares sem Água [Indústria Têxtil]',
    briefing: 'Estamparia Digital Sustentável & Tecnologias Pigmentares sem Água [Indústria Têxtil]'
  },
  {
    id: 'theme_04',
    number: 4,
    title: 'Estamparia Direct-to-Garment (DTG) de Alta Velocidade & Microfábricas',
    category: 'Indústria Têxtil',
    summary: 'Estamparia Direct-to-Garment (DTG) de Alta Velocidade & Microfábricas [Indústria Têxtil]',
    briefing: 'Estamparia Direct-to-Garment (DTG) de Alta Velocidade & Microfábricas [Indústria Têxtil]'
  },
  {
    id: 'theme_05',
    number: 5,
    title: 'Impressão 3D Têxtil & Estruturas Poliméricas Integradas ao Tecido',
    category: 'Indústria Têxtil',
    summary: 'Impressão 3D Têxtil & Estruturas Poliméricas Integradas ao Tecido [Indústria Têxtil]',
    briefing: 'Impressão 3D Têxtil & Estruturas Poliméricas Integradas ao Tecido [Indústria Têxtil]'
  },
  {
    id: 'theme_06',
    number: 6,
    title: 'Sublimação Digital de Alta Performance & Tintas Fluorescentes',
    category: 'Indústria Têxtil',
    summary: 'Sublimação Digital de Alta Performance & Tintas Fluorescentes [Indústria Têxtil]',
    briefing: 'Sublimação Digital de Alta Performance & Tintas Fluorescentes [Indústria Têxtil]'
  },
  {
    id: 'theme_07',
    number: 7,
    title: 'Nanorevestimentos Funcionais & Estamparia de Tecidos Inteligentes',
    category: 'Indústria Têxtil',
    summary: 'Nanorevestimentos Funcionais & Estamparia de Tecidos Inteligentes [Indústria Têxtil]',
    briefing: 'Nanorevestimentos Funcionais & Estamparia de Tecidos Inteligentes [Indústria Têxtil]'
  },
  {
    id: 'theme_08',
    number: 8,
    title: 'Inteligência Artificial no Design Têxtil & Otimização Automática',
    category: 'Indústria Têxtil',
    summary: 'Inteligência Artificial no Design Têxtil & Otimização Automática [Indústria Têxtil]',
    briefing: 'Inteligência Artificial no Design Têxtil & Otimização Automática [Indústria Têxtil]'
  },
  {
    id: 'theme_09',
    number: 9,
    title: 'Impressão Têxtil UV-LED & Estamparia de Superfícies Híbridas',
    category: 'Indústria Têxtil',
    summary: 'Impressão Têxtil UV-LED & Estamparia de Superfícies Híbridas [Indústria Têxtil]',
    briefing: 'Impressão Têxtil UV-LED & Estamparia de Superfícies Híbridas [Indústria Têxtil]'
  },
  {
    id: 'theme_10',
    number: 10,
    title: 'Tintas Reativas Digitais & Fixação Contínua em Algodão',
    category: 'Indústria Têxtil',
    summary: 'Tintas Reativas Digitais & Fixação Contínua em Algodão [Indústria Têxtil]',
    briefing: 'Tintas Reativas Digitais & Fixação Contínua em Algodão [Indústria Têxtil]'
  },
  {
    id: 'theme_11',
    number: 11,
    title: 'E-Textiles & Circuitos Condutivos Impressos Diretamente no Fio',
    category: 'Indústria Têxtil',
    summary: 'E-Textiles & Circuitos Condutivos Impressos Diretamente no Fio [Indústria Têxtil]',
    briefing: 'E-Textiles & Circuitos Condutivos Impressos Diretamente no Fio [Indústria Têxtil]'
  },
  {
    id: 'theme_12',
    number: 12,
    title: 'Biotecnologia Têxtil & Estamparia com Corantes Vivos',
    category: 'Indústria Têxtil',
    summary: 'Biotecnologia Têxtil & Estamparia com Corantes Vivos [Indústria Têxtil]',
    briefing: 'Biotecnologia Têxtil & Estamparia com Corantes Vivos [Indústria Têxtil]'
  },
  {
    id: 'theme_13',
    number: 13,
    title: 'Automação Robótica na Estamparia & Manuseio Roll-to-Roll',
    category: 'Indústria Têxtil',
    summary: 'Automação Robótica na Estamparia & Manuseio Roll-to-Roll [Indústria Têxtil]',
    briefing: 'Automação Robótica na Estamparia & Manuseio Roll-to-Roll [Indústria Têxtil]'
  },
  {
    id: 'theme_14',
    number: 14,
    title: 'Impressão Têxtil Háptica & Efeitos de Relevo Digital',
    category: 'Indústria Têxtil',
    summary: 'Impressão Têxtil Háptica & Efeitos de Relevo Digital [Indústria Têxtil]',
    briefing: 'Impressão Têxtil Háptica & Efeitos de Relevo Digital [Indústria Têxtil]'
  },
  {
    id: 'theme_15',
    number: 15,
    title: 'Tingimento Estrutural Digital & Cores sem Pigmentos Químicos',
    category: 'Indústria Têxtil',
    summary: 'Tingimento Estrutural Digital & Cores sem Pigmentos Químicos [Indústria Têxtil]',
    briefing: 'Tingimento Estrutural Digital & Cores sem Pigmentos Químicos [Indústria Têxtil]'
  },
  {
    id: 'theme_16',
    number: 16,
    title: 'Gêmeo Digital Têxtil & Simulação Virtual de Estampa',
    category: 'Indústria Têxtil',
    summary: 'Gêmeo Digital Têxtil & Simulação Virtual de Estampa [Indústria Têxtil]',
    briefing: 'Gêmeo Digital Têxtil & Simulação Virtual de Estampa [Indústria Têxtil]'
  },
  {
    id: 'theme_17',
    number: 17,
    title: 'Rastreabilidade Têxtil & Passaporte Digital Impresso',
    category: 'Indústria Têxtil',
    summary: 'Rastreabilidade Têxtil & Passaporte Digital Impresso [Indústria Têxtil]',
    briefing: 'Rastreabilidade Têxtil & Passaporte Digital Impresso [Indústria Têxtil]'
  },
  {
    id: 'theme_18',
    number: 18,
    title: 'Reciclagem Circular de Tecidos & Desentintagem Ecológica',
    category: 'Indústria Têxtil',
    summary: 'Reciclagem Circular de Tecidos & Desentintagem Ecológica [Indústria Têxtil]',
    briefing: 'Reciclagem Circular de Tecidos & Desentintagem Ecológica [Indústria Têxtil]'
  },
  {
    id: 'theme_19',
    number: 19,
    title: 'Tintas Termocrômicas Digitais & Estamparia Responsiva',
    category: 'Indústria Têxtil',
    summary: 'Tintas Termocrômicas Digitais & Estamparia Responsiva [Indústria Têxtil]',
    briefing: 'Tintas Termocrômicas Digitais & Estamparia Responsiva [Indústria Têxtil]'
  },
  {
    id: 'theme_20',
    number: 20,
    title: 'Acabamento Têxtil Digital & Tratamentos Antimicrobianos Impressos',
    category: 'Indústria Têxtil',
    summary: 'Acabamento Têxtil Digital & Tratamentos Antimicrobianos Impressos [Indústria Têxtil]',
    briefing: 'Acabamento Têxtil Digital & Tratamentos Antimicrobianos Impressos [Indústria Têxtil]'
  },
  {
    id: 'theme_21',
    number: 21,
    title: 'Estamparia Direta Integrada a Corte a Laser (Print & Cut Têxtil)',
    category: 'Indústria Têxtil',
    summary: 'Estamparia Direta Integrada a Corte a Laser (Print & Cut Têxtil) [Indústria Têxtil]',
    briefing: 'Estamparia Direta Integrada a Corte a Laser (Print & Cut Têxtil) [Indústria Têxtil]'
  },
  {
    id: 'theme_22',
    number: 22,
    title: 'Impressão Digital Single-Pass & Substituição da Rotativa',
    category: 'Indústria Têxtil',
    summary: 'Impressão Digital Single-Pass & Substituição da Rotativa [Indústria Têxtil]',
    briefing: 'Impressão Digital Single-Pass & Substituição da Rotativa [Indústria Têxtil]'
  },
  {
    id: 'theme_23',
    number: 23,
    title: 'Tecidos Biodegradáveis Autolimpantes & Nanotecnologia Fotocatalítica',
    category: 'Indústria Têxtil',
    summary: 'Tecidos Biodegradáveis Autolimpantes & Nanotecnologia Fotocatalítica [Indústria Têxtil]',
    briefing: 'Tecidos Biodegradáveis Autolimpantes & Nanotecnologia Fotocatalítica [Indústria Têxtil]'
  },
  {
    id: 'theme_24',
    number: 24,
    title: 'Produção Têxtil Hiperlocal & Microfábricas Conectadas em Nuvem',
    category: 'Indústria Têxtil',
    summary: 'Produção Têxtil Hiperlocal & Microfábricas Conectadas em Nuvem [Indústria Têxtil]',
    briefing: 'Produção Têxtil Hiperlocal & Microfábricas Conectadas em Nuvem [Indústria Têxtil]'
  },
  {
    id: 'theme_25',
    number: 25,
    title: 'Metamateriais Têxteis & Impressão de Estruturas Auxéticas Adaptativas',
    category: 'Indústria Têxtil',
    summary: 'Metamateriais Têxteis & Impressão de Estruturas Auxéticas Adaptativas [Indústria Têxtil]',
    briefing: 'Metamateriais Têxteis & Impressão de Estruturas Auxéticas Adaptativas [Indústria Têxtil]'
  },
  {
    id: 'theme_26',
    number: 26,
    title: 'Estamparia Digital de Alta Resolução em Sedas e Fibras Delicadas',
    category: 'Indústria Têxtil',
    summary: 'Estamparia Digital de Alta Resolução em Sedas e Fibras Delicadas [Indústria Têxtil]',
    briefing: 'Estamparia Digital de Alta Resolução em Sedas e Fibras Delicadas [Indústria Têxtil]'
  },
  {
    id: 'theme_27',
    number: 27,
    title: 'Tintas Condutivas Transparentes para Vestuário Eletrônico',
    category: 'Indústria Têxtil',
    summary: 'Tintas Condutivas Transparentes para Vestuário Eletrônico [Indústria Têxtil]',
    briefing: 'Tintas Condutivas Transparentes para Vestuário Eletrônico [Indústria Têxtil]'
  },
  {
    id: 'theme_28',
    number: 28,
    title: 'Manufatura Aditiva Têxtil para Vestuário Esportivo de Alta Performance',
    category: 'Indústria Têxtil',
    summary: 'Manufatura Aditiva Têxtil para Vestuário Esportivo de Alta Performance [Indústria Têxtil]',
    briefing: 'Manufatura Aditiva Têxtil para Vestuário Esportivo de Alta Performance [Indústria Têxtil]'
  },
  {
    id: 'theme_29',
    number: 29,
    title: 'Impressão Sublimática de Grande Formato para Decoração e Moda',
    category: 'Indústria Têxtil',
    summary: 'Impressão Sublimática de Grande Formato para Decoração e Moda [Indústria Têxtil]',
    briefing: 'Impressão Sublimática de Grande Formato para Decoração e Moda [Indústria Têxtil]'
  },
  {
    id: 'theme_30',
    number: 30,
    title: 'Tintas Pigmentares de Baixa Viscosidade para Cabeças Piezoelétricas',
    category: 'Indústria Têxtil',
    summary: 'Tintas Pigmentares de Baixa Viscosidade para Cabeças Piezoelétricas [Indústria Têxtil]',
    briefing: 'Tintas Pigmentares de Baixa Viscosidade para Cabeças Piezoelétricas [Indústria Têxtil]'
  },
  {
    id: 'theme_31',
    number: 31,
    title: 'Revestimentos Fotovoltaicos Têxteis & Tecidos Geradores de Energia',
    category: 'Indústria Têxtil',
    summary: 'Revestimentos Fotovoltaicos Têxteis & Tecidos Geradores de Energia [Indústria Têxtil]',
    briefing: 'Revestimentos Fotovoltaicos Têxteis & Tecidos Geradores de Energia [Indústria Têxtil]'
  },
  {
    id: 'theme_32',
    number: 32,
    title: 'Personalização em Massa Algorítmica na Estamparia de Vestuário',
    category: 'Indústria Têxtil',
    summary: 'Personalização em Massa Algorítmica na Estamparia de Vestuário [Indústria Têxtil]',
    briefing: 'Personalização em Massa Algorítmica na Estamparia de Vestuário [Indústria Têxtil]'
  },
  {
    id: 'theme_33',
    number: 33,
    title: 'Impressão de Compósitos Têxteis para Proteção Industrial Avançada',
    category: 'Indústria Têxtil',
    summary: 'Impressão de Compósitos Têxteis para Proteção Industrial Avançada [Indústria Têxtil]',
    briefing: 'Impressão de Compósitos Têxteis para Proteção Industrial Avançada [Indústria Têxtil]'
  },
  {
    id: 'theme_34',
    number: 34,
    title: 'Corantes Sintéticos Sustentáveis para Impressão Jato de Tinta',
    category: 'Indústria Têxtil',
    summary: 'Corantes Sintéticos Sustentáveis para Impressão Jato de Tinta [Indústria Têxtil]',
    briefing: 'Corantes Sintéticos Sustentáveis para Impressão Jato de Tinta [Indústria Têxtil]'
  },
  {
    id: 'theme_35',
    number: 35,
    title: 'Tecidos Piezoelétricos Impressos & Captura de Energia Biomecânica',
    category: 'Indústria Têxtil',
    summary: 'Tecidos Piezoelétricos Impressos & Captura de Energia Biomecânica [Indústria Têxtil]',
    briefing: 'Tecidos Piezoelétricos Impressos & Captura de Energia Biomecânica [Indústria Têxtil]'
  },
  {
    id: 'theme_36',
    number: 36,
    title: 'Processos Fotoquímicos Avançados no Pré-tratamento Digital',
    category: 'Indústria Têxtil',
    summary: 'Processos Fotoquímicos Avançados no Pré-tratamento Digital [Indústria Têxtil]',
    briefing: 'Processos Fotoquímicos Avançados no Pré-tratamento Digital [Indústria Têxtil]'
  },
  {
    id: 'theme_37',
    number: 37,
    title: 'Tintas Fluorescentes e Fotoluminescentes de Base de Água',
    category: 'Indústria Têxtil',
    summary: 'Tintas Fluorescentes e Fotoluminescentes de Base de Água [Indústria Têxtil]',
    briefing: 'Tintas Fluorescentes e Fotoluminescentes de Base de Água [Indústria Têxtil]'
  },
  {
    id: 'theme_38',
    number: 38,
    title: 'Controle Espectral Inline IA na Estamparia Têxtil de Grande Volume',
    category: 'Indústria Têxtil',
    summary: 'Controle Espectral Inline IA na Estamparia Têxtil de Grande Volume [Indústria Têxtil]',
    briefing: 'Controle Espectral Inline IA na Estamparia Têxtil de Grande Volume [Indústria Têxtil]'
  },
  {
    id: 'theme_39',
    number: 39,
    title: 'Estamparia Híbrida Analógico-Digital (Screen-to-Digital Textil)',
    category: 'Indústria Têxtil',
    summary: 'Estamparia Híbrida Analógico-Digital (Screen-to-Digital Textil) [Indústria Têxtil]',
    briefing: 'Estamparia Híbrida Analógico-Digital (Screen-to-Digital Textil) [Indústria Têxtil]'
  },
  {
    id: 'theme_40',
    number: 40,
    title: 'Fibras Nanocelulósicas Funcionalizadas para Revestimento Digital',
    category: 'Indústria Têxtil',
    summary: 'Fibras Nanocelulósicas Funcionalizadas para Revestimento Digital [Indústria Têxtil]',
    briefing: 'Fibras Nanocelulósicas Funcionalizadas para Revestimento Digital [Indústria Têxtil]'
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
  
  if (typeof window.VORTEX_LAST_THEME_INDEX === 'undefined') {
    const storedTheme = localStorage.getItem('VORTEX_LAST_THEME_INDEX');
    window.VORTEX_LAST_THEME_INDEX = storedTheme !== null ? parseInt(storedTheme, 10) : 0;
  }
  
  let selectedIndex = window.VORTEX_LAST_THEME_INDEX + 1;
  // Nunca sugere o Tema Livre (índice 0) automaticamente
  if (selectedIndex >= themes.length || selectedIndex === 0) {
    selectedIndex = 1;
  }

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
            🔬 1. Escolha o Eixo Tecnológico (${themes.length} Eixos Têxteis)
          </label>
          <select id="themeSelectorDropdown" style="width: 100%; padding: 14px 16px; background: rgba(0,0,0,0.6); border: 1px solid rgba(0,174,239,0.45); border-radius: 10px; color: #fff; font-family: var(--uiRounded); font-size: 0.95rem; font-weight: bold; outline: none; cursor: pointer; box-shadow: inset 0 2px 6px rgba(0,0,0,0.5);">
            ${themes.map((t, idx) => {
              const label = t.number === 1 
                ? '01. ✨ TEMA LIVRE / PERSONALIZADO' 
                : String(t.number).padStart(2, '0') + '. ' + t.title + ' [' + t.category + ']';
              return '<option value="' + idx + '" ' + (idx === selectedIndex ? 'selected' : '') + ' style="background: #0b1120; color: #fff;">' + label + '</option>';
            }).join('')}
          </select>
        </div>

        <!-- Campo Dinâmico Exclusivo para Tema Livre -->
        <div id="customThemeContainer" style="display: ${selectedIndex === 0 ? 'flex' : 'none'}; flex-direction: column; gap: 8px;">
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
    if (selectedTheme && selectedTheme.number === 1) {
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

      if (selectedTheme && selectedTheme.number === 1) {
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

      // Salva a escolha atual na janela para sugerir o próximo
      window.VORTEX_LAST_THEME_INDEX = selectedIndex;
      localStorage.setItem('VORTEX_LAST_THEME_INDEX', selectedIndex.toString());

      closeModal();
      if (typeof onConfirm === 'function') {
        onConfirm(finalBrief, nextNumber);
      }
    };
  }
};

