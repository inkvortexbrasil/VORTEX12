window.currentAudioMode = 'flowmusic';
window.selectedAudioDocId = null;
let globalAudioLibrary = {};

window.switchAudioMode = function(mode) {
  window.currentAudioMode = mode;
  const campaign = AppState.getSelectedCampaign();
  renderAudioRoomLayout(window.currentAudioVideoUrl, window.currentAudioVideoTitle, window.currentAudioVideos, window.currentDedicatedAudioVideos);
};

function getAudioDocBlocks() {
  const validCampaigns = (AppState.campaigns || []).filter(c => c.title || (c.topic && (c.topic.title || c.topic.description)));
  validCampaigns.sort((a, b) => Number(b.number) - Number(a.number));
  const blocks = [];
  let blockNum = 1;
  const chunkSize = 3;
  for (let i = 0; i < validCampaigns.length; i += chunkSize) {
    const chunk = validCampaigns.slice(i, i + chunkSize);
    if (chunk.length === chunkSize) {
      const docNumStr = String(blockNum).padStart(2, '0');
      const numStrList = chunk.map(c => String(c.number || c.id || '?').padStart(2, '0')).join(', ');
      blocks.push({
        id: `doc-${blockNum}`,
        docNum: blockNum,
        docNumStr: docNumStr,
        title: `Documentário ${docNumStr}`,
        subtitle: `Minisséries ${numStrList}`,
        campaigns: chunk
      });
      blockNum++;
    }
  }
  return blocks;
}


window.openAudioRoom = function() {
  let campaign = AppState.getSelectedCampaign();
  if (!campaign && AppState.campaigns && AppState.campaigns.length > 0) {
    campaign = AppState.campaigns[0];
    AppState.selectedCampaignId = campaign.id || campaign.number;
  }
  if (!campaign) {
    window.switchMultiverseRoom('audioRoomView', 'btnNavAudio');
    return;
  }
  
  const numDisplay = String(campaign.number).padStart(2, '0');
  const titleStr = `🎧 Multiverso Flow Music - Minissérie ${numDisplay}`;
  let topicText = 'Sem tema definido';
  if (typeof campaign.topic === 'string') {
    topicText = campaign.topic;
  } else if (campaign.topic && campaign.topic.title) {
    topicText = campaign.topic.title;
  } else if (campaign.topic && campaign.topic.description) {
    topicText = campaign.topic.description;
  } else if (campaign.title) {
    topicText = campaign.title;
  }

  window.updateTopbarTitle(titleStr, topicText);
  window.switchMultiverseRoom('audioRoomView', 'btnNavAudio');
  if (typeof window.loadCtaDatabase === 'function') {
    window.loadCtaDatabase();
  }
  
  const contentDiv = document.getElementById('audioRoomContent');
  if (!contentDiv) return;

  contentDiv.innerHTML = '<div style="text-align: center; padding: 40px; width: 100%; color: var(--ivTextSecondary);">Preparando console de Sonoplastia... 🎧</div>';
  
  fetch(`/api/storyboard-media?campaign=${encodeURIComponent(campaign.number)}&scene=1`)
    .then(res => res.json())
    .then(data => {
      window.currentAudioVideoUrl = data.sonoplastiaVideo;
      window.currentAudioVideoTitle = data.sonoplastiaVideoTitle;
      window.currentAudioVideos = data.sonoplastiaVideos || [];
      window.currentDedicatedAudioVideos = data.dedicatedSonoplastiaVideos || [];
      window.upcomingCtaNum = data.upcomingCtaNum || '01';
      renderAudioRoomLayout(data.sonoplastiaVideo, data.sonoplastiaVideoTitle, window.currentAudioVideos, window.currentDedicatedAudioVideos);
    }).catch(e => {
      window.currentAudioVideoUrl = null;
      window.currentAudioVideoTitle = null;
      window.currentAudioVideos = [];
      window.currentDedicatedAudioVideos = [];
      renderAudioRoomLayout(null, null, [], []);
    });
};

function renderAudioRoomLayout(videoUrl, videoTitle, videosList = [], dedicatedList = []) {
  // GUARD: durante render ativo, se a animação já estiver presente no DOM, previne sobresscrever.
  if (window.isRenderingAudio && document.getElementById('audioRenderStatusText')) return;

  const campaign = AppState.getSelectedCampaign();
  const contentDiv = document.getElementById('audioRoomContent');
  if (!contentDiv) return;

  let campNum = '01';
  if (campaign) {
    if (campaign.numStr) campNum = String(campaign.numStr).padStart(2, '0');
    else if (campaign.number) campNum = String(campaign.number).padStart(2, '0');
  }

  // Player HTML
  let playerHtml = '';
  if (window.isRenderingAudio) {
    playerHtml = `
      <style>
        @keyframes eqPulse {
          0%, 100% { height: 8px; opacity: 0.3; }
          50% { height: 48px; opacity: 1; filter: drop-shadow(0 0 8px var(--cyan)); }
        }
        @keyframes headphoneBeat {
          0% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.18) rotate(-4deg); filter: drop-shadow(0 0 25px var(--cyan)); }
          50% { transform: scale(0.92) rotate(4deg); filter: drop-shadow(0 0 35px var(--brand)); }
          75% { transform: scale(1.15) rotate(-2deg); filter: drop-shadow(0 0 25px var(--cyan)); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes soundwaveExpand {
          0% { transform: scale(0.5); opacity: 0.9; border-color: var(--cyan); }
          100% { transform: scale(2.2); opacity: 0; border-color: var(--brand); }
        }
      </style>

      <div class="vortex-crystal-panel" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; min-height: 350px; border-radius: 20px; border: 1.5px solid rgba(0, 174, 239, 0.5); padding: 30px 16px; position: relative; overflow: hidden;">
        
        <!-- Fundo com Néon Pulsante -->
        <div style="position: absolute; inset: -20px; background: radial-gradient(circle at center, rgba(0,174,239,0.25) 0%, rgba(255,0,85,0.15) 50%, transparent 80%); filter: blur(30px); animation: pulseGlow 2s ease-in-out infinite alternate;"></div>

        <!-- CONJUNTO DE ÁUDIO & FONE DINÂMICO -->
        <div style="display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 28px; width: 100%; position: relative; z-index: 2;">
          
          <!-- Equalizador Esquerdo -->
          <div style="display: flex; gap: 4px; align-items: flex-end; height: 50px;">
            <div style="width: 4px; background: var(--brandGrad); border-radius: 4px; animation: eqPulse 0.8s ease-in-out infinite 0.1s;"></div>
            <div style="width: 4px; background: var(--brandGrad); border-radius: 4px; animation: eqPulse 1.2s ease-in-out infinite 0.4s;"></div>
            <div style="width: 4px; background: var(--brandGrad); border-radius: 4px; animation: eqPulse 0.6s ease-in-out infinite 0.2s;"></div>
            <div style="width: 4px; background: var(--brandGrad); border-radius: 4px; animation: eqPulse 1.0s ease-in-out infinite 0.5s;"></div>
          </div>

          <!-- Núcleo Central do Fone com Ondas Sonoras -->
          <div style="position: relative; width: 130px; height: 130px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--cyan); animation: soundwaveExpand 1.8s cubic-bezier(0, 0.2, 0.8, 1) infinite;"></div>
            <div style="position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--brand); animation: soundwaveExpand 1.8s cubic-bezier(0, 0.2, 0.8, 1) infinite 0.6s;"></div>
            
            <div style="position: absolute; inset: 6px; border-radius: 50%; border: 3px solid transparent; border-top-color: var(--cyan); border-bottom-color: var(--brand); animation: spinGlow 1.2s linear infinite;"></div>
            <div style="position: absolute; inset: -8px; border-radius: 50%; border: 2px dashed rgba(0,210,106,0.4); animation: spinGlow 5s linear reverse infinite;"></div>

            <div style="font-size: 3.8rem; animation: headphoneBeat 1.2s ease-in-out infinite; z-index: 5; text-shadow: 0 0 30px var(--cyan); cursor: default;">🎧</div>
          </div>

          <!-- Equalizador Direito -->
          <div style="display: flex; gap: 4px; align-items: flex-end; height: 50px;">
            <div style="width: 4px; background: var(--brandGrad); border-radius: 4px; animation: eqPulse 0.9s ease-in-out infinite 0.3s;"></div>
            <div style="width: 4px; background: var(--brandGrad); border-radius: 4px; animation: eqPulse 0.5s ease-in-out infinite 0.1s;"></div>
            <div style="width: 4px; background: var(--brandGrad); border-radius: 4px; animation: eqPulse 1.1s ease-in-out infinite 0.6s;"></div>
            <div style="width: 4px; background: var(--brandGrad); border-radius: 4px; animation: eqPulse 0.7s ease-in-out infinite 0.2s;"></div>
          </div>

        </div>

        <h3 style="font-family: var(--uiRounded); font-size: 1.15rem; color: #fff; margin: 0 0 14px 0; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 25px rgba(0,174,239,0.9); text-align: center; position: relative; z-index: 2;">
          SÍNTESE SONORA EM ANDAMENTO
        </h3>
        
        <div style="background: rgba(0,0,0,0.7); border: 1px solid rgba(0,210,106,0.4); padding: 9px 18px; border-radius: 50px; display: flex; align-items: center; gap: 10px; position: relative; z-index: 2; box-shadow: 0 0 20px rgba(0,210,106,0.2);">
          <div style="width: 10px; height: 10px; background: #00d26a; border-radius: 50%; box-shadow: 0 0 12px #00d26a; animation: pulseGlow 0.8s infinite alternate;"></div>
          <span id="audioRenderStatusText" style="color: #00d26a; font-family: 'Courier New', monospace; font-size: 0.82rem; font-weight: bold; letter-spacing: 1px;">MOTOR FFMPEG + MISTRAL IA ATIVO...</span>
        </div>
      </div>
    `;
  } else {
    // ── PLAYER E SELETOR DE VÍDEOS MP4 RENDERIZADOS ──
    playerHtml = `
      <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:10px;">
        <video id="audioRoomPlayer" src="${videoUrl || ''}" loop onplay="document.getElementById('customPlayBtn').innerHTML='⏸ PAUSE'" onpause="document.getElementById('customPlayBtn').innerHTML='▶ PLAY'" style="width:100%;max-height:520px;object-fit:contain;border-radius:14px;display:block;background:#000;box-shadow:0 8px 30px rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.12);cursor:pointer;transition:transform 0.2s;" onclick="this.paused?this.play():this.pause()"></video>
        
        <div style="display:flex;gap:10px;justify-content:center;width:100%;">
          <button id="customPlayBtn" class="actionBtn" onclick="const p=document.getElementById('audioRoomPlayer'); p.paused?p.play():p.pause();" style="flex:1;background:linear-gradient(135deg, #00d26a, #00aeef);color:#fff;border:none;padding:10px 10px;font-size:1rem;font-weight:900;border-radius:10px;cursor:pointer;box-shadow:0 0 15px rgba(0,210,106,0.4);transition:all 0.2s;text-align:center;">▶ PLAY</button>
          <button class="actionBtn" onclick="const p=document.getElementById('audioRoomPlayer'); if(p.requestFullscreen) p.requestFullscreen(); else if(p.webkitRequestFullscreen) p.webkitRequestFullscreen();" style="background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:10px 16px;font-size:1rem;font-weight:900;border-radius:10px;cursor:pointer;transition:all 0.2s;text-align:center;">🔲 ZOOM</button>
        </div>

        <!-- Controle de Volume Customizado -->
        <div style="display:flex;align-items:center;gap:10px;width:100%;background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);">
          <span style="font-size:1.1rem;cursor:pointer;" onclick="const p=document.getElementById('audioRoomPlayer'); p.muted=!p.muted; this.innerText=p.muted?'🔇':'🔊'">🔊</span>
          <input type="range" min="0" max="1" step="0.01" value="1" oninput="document.getElementById('audioRoomPlayer').volume=this.value; document.getElementById('audioRoomPlayer').muted=false; this.previousElementSibling.innerText='🔊'" style="flex:1; cursor:pointer; accent-color: #00d26a;">
        </div>

        <!-- Seletor de Vídeos MP4 Renderizados (Abaixo do Volume) -->
        <div style="display: flex; flex-direction: column; gap: 4px; width: 100%; margin-top: 4px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color: #ec008c; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.8px;">🎬 VÍDEO MP4 RENDERIZADO:</span>
            <span id="audioMp4CountBadge" style="font-size: 0.68rem; color: rgba(255,255,255,0.6);"></span>
          </div>
          <select id="audioMP4Select" onchange="window.playSelectedRenderedMp4(this.value)" style="width: 100%; padding: 8px 10px; background: rgba(10,15,30,0.95); border: 1px solid rgba(236,0,140,0.5); color: #fff; border-radius: 8px; font-size: 0.8rem; font-weight: bold; outline: none; cursor: pointer; box-shadow: 0 0 10px rgba(236,0,140,0.2);">
            <option value="">Carregando MP4s...</option>
          </select>
        </div>
      </div>
    `;

    // Dispara carregamento dos seletores de áudio e vídeo
    setTimeout(() => {
      if (typeof window.loadSonoplastiaSelectors === 'function') {
        window.loadSonoplastiaSelectors(campNum);
      }
    }, 50);

  }

  let ctaTitle = 'CTA / Engajamento...';
  if (window.selectedCtaItem && window.selectedCtaItem.title) {
    ctaTitle = window.selectedCtaItem.title;
  }

  const consoleHtml = `
    <div style="max-width: 820px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; width: 100%; align-items: center;">

      <!-- Seletor de Modo: Minissérie (60s) vs Documentário (3min) -->
      <div style="display: flex; gap: 8px; width: 100%; justify-content: center; margin-bottom: 2px;">
        <span style="padding: 4px 16px; font-size: 0.78rem; font-weight: 800; border-radius: 20px; background: linear-gradient(135deg, #00d26a, #00aeef); color: #fff; box-shadow: 0 0 10px rgba(0,210,106,0.35); letter-spacing: 1px;">🎵 CONSOLE FLOW MUSIC</span>
      </div>

      <!-- Seletor de Documentários (3 Minisséries) -->
      ${(window.currentAudioMode === 'documentario') ? (() => {
        const docBlocks = getAudioDocBlocks();
        if (docBlocks.length === 0) return '<div style="color:var(--cyan);font-size:0.75rem;margin-bottom:4px;">Nenhum bloco de 3 minisséries completo disponível para documentário.</div>';
        if (!window.selectedAudioDocId && docBlocks[0]) window.selectedAudioDocId = docBlocks[0].id;
        return `
          <div style="display: flex; flex-direction: column; gap: 4px; width: 100%; align-items: center; margin-bottom: 4px;">
            <span style="color: #ec008c; font-size: 0.72rem; font-weight: bold; text-transform: uppercase;">🎬 SELECIONE O DOCUMENTÁRIO (3 MINISSÉRIES):</span>
            <select id="audioDocSelect" onchange="window.selectedAudioDocId=this.value;" style="width: 100%; padding: 5px 10px; background: rgba(10,15,30,0.95); border: 1px solid #ec008c; color: #fff; border-radius: 8px; font-size: 0.78rem; font-weight: bold; outline: none; cursor: pointer; box-shadow: 0 0 10px rgba(236,0,140,0.2);">
              ${docBlocks.map(b => `<option value="${b.id}" ${b.id === window.selectedAudioDocId ? 'selected' : ''}>${b.title} (${b.subtitle})</option>`).join('')}
            </select>
          </div>
        `;
      })() : ''}

      <!-- Row 1: Categoria, Variação e Vocal (Centralizados) -->
      <div style="display: flex; gap: 8px; width: 100%; justify-content: center; position: relative; z-index: 500;">
        <div style="flex: 1; position: relative; z-index: 501;">
          <input type="hidden" id="audioCategorySelect" value="">
          <div id="audioCatDisplay" class="actionBtn" onclick="window.toggleAudioCat()" style="padding: 6px 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.14); color: #fff; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; gap: 4px;">
            <span id="audioCatText" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Categoria...</span>
            <span style="opacity: .4; flex-shrink: 0; font-size: 0.65rem;">▼</span>
          </div>
          <div id="audioCatList" style="display: none; position: absolute; top: calc(100% + 5px); left: 0; right: 0; background: rgba(8,10,20,0.97); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; z-index: 9999; max-height: 200px; overflow-y: auto; box-shadow: 0 12px 40px rgba(0,0,0,0.95);"></div>
        </div>
        <div style="flex: 1; position: relative; z-index: 501;">
          <input type="hidden" id="audioStyleSelect" value="">
          <div id="audioVarDisplay" class="actionBtn" onclick="window.toggleAudioVar()" style="padding: 6px 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.14); color: #fff; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; gap: 4px;">
            <span id="audioVarText" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Variação...</span>
            <span style="opacity: .4; flex-shrink: 0; font-size: 0.65rem;">▼</span>
          </div>
          <div id="audioVarList" style="display: none; position: absolute; top: calc(100% + 5px); left: 0; right: 0; background: rgba(8,10,20,0.97); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; z-index: 9999; max-height: 200px; overflow-y: auto; box-shadow: 0 12px 40px rgba(0,0,0,0.95);"></div>
        </div>
        <div style="flex: 1; position: relative; z-index: 501;">
          <input type="hidden" id="audioVocalSelect" value="">
          <div id="audioVocalDisplay" class="actionBtn" onclick="window.toggleAudioVocal()" style="padding: 6px 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.14); color: #fff; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; gap: 4px;">
            <span id="audioVocalText" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Vocal...</span>
            <span style="opacity: .4; flex-shrink: 0; font-size: 0.65rem;">▼</span>
          </div>
          <div id="audioVocalList" style="display: none; position: absolute; top: calc(100% + 5px); left: 0; right: 0; background: rgba(8,10,20,0.97); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; z-index: 9999; max-height: 200px; overflow-y: auto; box-shadow: 0 12px 40px rgba(0,0,0,0.95);">
            <div style="padding: 8px 12px; color: #fff; font-size: 0.8rem; cursor: pointer;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background=''" onclick="window.selectAudioVocal('Voz Masculina (PT-BR)')">Voz Masculina (PT-BR)</div>
            <div style="padding: 8px 12px; color: #fff; font-size: 0.8rem; cursor: pointer;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background=''" onclick="window.selectAudioVocal('Voz Feminina (PT-BR)')">Voz Feminina (PT-BR)</div>
            <div style="padding: 8px 12px; color: #fff; font-size: 0.8rem; cursor: pointer;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background=''" onclick="window.selectAudioVocal('Coral Épico (PT-BR)')">Coral Épico (PT-BR)</div>
          </div>
        </div>
      </div>

      <!-- Row 2: 1. Gerar Flow Music -> 2. Seletor M4A -> 3. Renderizar (por último) -->
      <div style="display: flex; gap: 8px; width: 100%; justify-content: center; align-items: center; margin-top: 2px;">
        <button id="btnGerarPromptAudio" onclick="window.generateAudioPrompt()" class="actionBtn" style="flex: 0 0 auto; background: linear-gradient(135deg, #00d26a, #00aeef); border: none; color: #ffffff; padding: 8px 16px; font-weight: bold; font-size: 0.82rem; border-radius: 8px; cursor: pointer; white-space: nowrap; backdrop-filter: blur(8px); transition: all 0.2s ease; box-shadow: 0 0 12px rgba(0,210,106,0.35);">🎵 GERAR FLOW MUSIC</button>
        
        <!-- Seletor M4A dedicado no MEIO (Exclusivo para definir o arquivo M4A do Render) -->
        <select id="audioM4ASelect" onchange="window.selectedM4AFile = this.value" title="Selecione o arquivo M4A a ser renderizado" style="flex: 1; min-width: 140px; padding: 7px 10px; background: rgba(10,15,30,0.95); border: 1px solid rgba(0,210,106,0.5); color: #00d26a; border-radius: 8px; font-size: 0.78rem; font-weight: bold; outline: none; cursor: pointer; box-shadow: 0 0 10px rgba(0,210,106,0.2);">
          <option value="">Carregando faixas M4A...</option>
        </select>

        <!-- Botão Renderizar POR ÚLTIMO -->
        <button id="btnRenderizarAudioGeral" class="actionBtn" style="flex: 0 0 auto; padding: 8px 16px; font-weight: bold; font-size: 0.82rem; border-radius: 8px; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; background: rgba(0,210,106,0.15); border: 1px solid rgba(0,210,106,0.4); color: #00d26a;" onclick="window.startRenderizarAudio(this)">🎬 RENDERIZAR</button>
      </div>
      
      </div>
    `;

  const readyCount = (videosList || []).filter(v => v.hasVideo !== false).length;
  const pendingCount = (videosList || []).filter(v => v.hasVideo === false).length;
  const dedicatedCount = (dedicatedList || []).length;
  const upcomingCta = window.upcomingCtaNum || '01';

  const allCampaigns = AppState.campaigns || [];
  const campaignCountStr = `${allCampaigns.length || (AppState.documentaries || []).length} minisséries`;
  const sidebarHtml = renderFlowMusicSidebarHTML(campNum);

  // ── LAYOUT OFICIAL DO MULTIVERSO FLOW MUSIC (ESTRUTURA DE 2 COLUNAS) ──
  contentDiv.innerHTML = `
    <style>
      @keyframes renderBtnPulse {
        0%,100% { opacity:.85; filter:drop-shadow(0 0 5px rgba(255,0,85,.3)); }
        50%      { opacity:1;   filter:drop-shadow(0 0 20px rgba(255,0,85,.8)); }
      }

      #flowMusicLayout,
      #flowMusicLayout * {
        box-sizing: border-box;
      }

      .audio-hidden-scroll {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .audio-hidden-scroll::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }

      .audio-prompt-result-shell {
        width: 100%;
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .audio-prompt-result-head {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-height: 26px;
      }

      .audio-prompt-columns {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .audio-prompt-column {
        min-width: 0;
        min-height: 0;
        width: 100%;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.02);
        backdrop-filter: blur(1px);
      }

      .audio-prompt-column-text {
        padding: 14px 16px 18px;
        color: rgba(255, 255, 255, 0.9);
        font-size: calc(var(--readingFontSizeMultiplier, 1) * 0.78rem) !important;
        line-height: calc(var(--readingFontSizeMultiplier, 1) * 1.52) !important;
        overflow-wrap: anywhere;
      }
      .audio-prompt-pre-text {
        white-space: pre-wrap;
        display: block;
        font-size: 0.76rem;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.85);
      }

      #flowMusicLayout {
        position: fixed;
        left: 50vw;
        transform: translateX(-50%);
        top: 95px;
        bottom: 20px;
        width: 1720px;
        max-width: 96vw;
        display: flex;
        gap: 20px;
        z-index: 60;
        pointer-events: auto;
      }

      #flowMinisseriesSidebar {
        width: 420px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(0, 174, 239, 0.25);
        backdrop-filter: blur(1px);
        box-shadow: inset 0 0 15px rgba(0, 174, 239, 0.05);
        border-radius: 18px;
        padding: 16px;
        box-sizing: border-box;
      }

      #flowMusicWorkspace {
        flex: 1;
        min-width: 0;
        display: grid;
        grid-template-columns: 4fr 6fr;
        gap: 16px;
        height: 100%;
        overflow: hidden;
      }

      .audio-asset-zone {
        min-width: 0;
        min-height: 0;
        padding: 14px;
        overflow-y: auto;
        border: 1px solid rgba(0,174,239,0.28);
        border-radius: 14px;
        display: flex;
        flex-direction: column;
        background: rgba(255, 255, 255, 0.02);
      }

      .audio-asset-zone > div:first-child {
        min-height: 0 !important;
      }

      .audio-asset-zone > .vortex-crystal-panel {
        height: 100%;
        min-height: 0 !important;
        padding: 12px !important;
        overflow-y: auto !important;
      }

      .audio-asset-zone #audioRoomPlayer {
        width: 100% !important;
        max-height: calc(100vh - 350px) !important;
        object-fit: contain;
        flex: 1 1 auto;
      }

      .audio-console-shell {
        width: 100%;
        min-width: 0;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px 14px;
        border: 1px solid rgba(0,210,106,0.28);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.02);
        position: relative;
        z-index: 500;
        overflow: visible !important;
      }

      .audio-console-shell > div {
        max-width: none !important;
        gap: 7px !important;
        overflow: visible !important;
      }

      #audioPromptResult {
        width: 100%;
        min-width: 0;
        min-height: 0;
        height: 100%;
        border: 1px solid rgba(0, 174, 239, 0.28);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.02);
        backdrop-filter: blur(1px);
        padding: 12px 14px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        z-index: 1;
      }

      @media (max-width: 1200px) {
        #flowMusicLayout {
          width: 96vw;
          gap: 12px;
        }

        #flowMinisseriesSidebar {
          width: 320px;
        }
      }
    </style>
    
    <div id="flowMusicLayout">
      <!-- Coluna Esquerda: Lista de Minisséries -->
      <div id="flowMinisseriesSidebar">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 10px; margin-bottom: 12px;">
          <span style="font-family: var(--uiRounded); font-size: 0.85rem; font-weight: 800; color: #fff; letter-spacing: 1px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.1rem;">🎧</span> MINISSÉRIES FLOW MUSIC
          </span>
          <span id="flowMusicCampaignCount" style="color: var(--cyan); font-size: 0.75rem; font-weight: bold;">${campaignCountStr}</span>
        </div>
        <div id="flowMusicGridList" class="audio-hidden-scroll" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 4px;">
          ${sidebarHtml}
        </div>
      </div>

      <!-- Área de Trabalho do Flow Music (Dividida em 40% Player / 60% Console + Prompts) -->
      <div id="flowMusicWorkspace">
        <!-- Coluna Esquerda do Workspace (40%): PLAYER + SELETOR MP4 -->
        <div class="audio-asset-zone audio-hidden-scroll vortex-crystal-panel">
          ${playerHtml}
        </div>

        <!-- Coluna Direita do Workspace (60%): CONSOLE NO TOPO + PROMPTS ABAIXO -->
        <div style="height: 100%; display: flex; flex-direction: column; gap: 10px; min-width: 0; overflow: hidden;">
          <div class="audio-console-shell vortex-crystal-panel" style="flex: 0 0 auto;">
            ${consoleHtml}
          </div>

          <div id="audioPromptResult" class="vortex-crystal-panel" style="flex: 1 1 auto; min-height: 0; overflow: hidden;"></div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    if (typeof loadAudioLibrary === 'function') {
      loadAudioLibrary();
    }
    if (typeof window.loadSonoplastiaSelectors === 'function') {
      window.loadSonoplastiaSelectors(campNum);
    }
  }, 30);
}

// 📐 Painel Lateral de Minisséries para navegação direta dentro do Flow Music
function renderFlowMusicSidebarHTML(selectedCampNum) {
  const allCampaigns = AppState.campaigns || [];
  let list = [];
  
  if (allCampaigns.length > 0) {
    list = [...allCampaigns].sort((a, b) => Number(b.number || 0) - Number(a.number || 0));
  } else if ((AppState.documentaries || []).length > 0) {
    const docs = [...AppState.documentaries].sort((a, b) => Number(b.docNumStr || b.docId || b.docFolder || 0) - Number(a.docNumStr || a.docId || a.docFolder || 0));
    list = docs.map((d, idx) => ({
      id: `campaign-${String(d.docNumStr || d.docId || d.docFolder || (idx + 1)).padStart(2, '0')}`,
      number: d.docNumStr || d.docId || d.docFolder || (idx + 1),
      title: d.title || d.subtitle || `Minissérie #${String(d.docNumStr || d.docId || d.docFolder || (idx + 1)).padStart(2, '0')}`,
      topic: { title: d.title || d.subtitle || `Minissérie #${String(d.docNumStr || d.docId || d.docFolder || (idx + 1)).padStart(2, '0')}` }
    }));
  }

  if (list.length === 0) {
    return `<div style="text-align: center; color: var(--ivTextSecondary); padding: 40px 10px; font-size: 0.85rem;">Nenhuma minissérie cadastrada.</div>`;
  }

  const selNumStr = String(selectedCampNum || '01').padStart(2, '0');

  return list.map((c, idx) => {
    const numDisplay = String(c.number || (idx + 1)).padStart(2, '0');
    const isSelected = numDisplay === selNumStr;
    let titleText = c.title || (c.topic && c.topic.title) || (c.topic && c.topic.description) || `Minissérie #${numDisplay}`;

    return `
      <article class="docCard" style="position:relative; background: ${isSelected ? 'rgba(0,174,239,0.18)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isSelected ? 'var(--cyan)' : 'rgba(255,255,255,0.12)'}; border-radius: 14px; padding: 14px; display: flex; gap: 14px; align-items: center; cursor: pointer; transition: all 0.2s ease; box-shadow: ${isSelected ? '0 0 20px rgba(0,174,239,0.35)' : 'none'}; margin-bottom: 2px;" onclick="window.selectFlowMusicCampaign('${c.id || c.number}')">
        <div style="width: 48px; height: 48px; border-radius: 10px; background: linear-gradient(135deg, #00aeef, #ec008c); color: #fff; font-weight: 900; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(0,174,239,0.7); flex-shrink: 0; border: 2px solid #0d0d1e;">
          ${numDisplay}
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="background: rgba(0,174,239,0.2); color: var(--cyan); border: 1px solid rgba(0,174,239,0.4); padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: bold;">MINISSÉRIE #${numDisplay}</span>
            <span style="color: #ff9900; font-size: 0.75rem; font-weight: bold;">PRONTA</span>
          </div>
          <h4 style="color: #fff; margin: 4px 0 2px; font-family: var(--uiRounded); font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 800;" title="${escapeAudioPromptAttribute(titleText)}">${escapeAudioPromptHtml(titleText)}</h4>
        </div>
      </article>
    `;
  }).join('');
}

window.selectFlowMusicCampaign = function(campNumberOrId) {
  if (window.isRenderingAudio) return;
  
  const allCampaigns = AppState.campaigns || [];
  const found = allCampaigns.find(c => String(c.id) === String(campNumberOrId) || String(c.number) === String(campNumberOrId) || String(c.number).padStart(2, '0') === String(campNumberOrId).padStart(2, '0'));
  
  if (found) {
    AppState.selectedCampaignId = found.id || found.number;
    AppState.save();
  }
  
  window.openAudioRoom();
};

window.playM4AAudioFile = window.playWAVAudioFile = function(url, name) {
  window.currentAudioVideoUrl = url;
  window.currentAudioVideoTitle = name;
  const isVideo = String(url || '').toLowerCase().endsWith('.mp4');
  if (isVideo && !document.getElementById('audioRoomPlayer')) {
    renderAudioRoomLayout(url, name, window.currentAudioVideos, window.currentDedicatedAudioVideos);
  } else {
    const player = document.getElementById('audioRoomPlayer');
    if (player) {
      player.src = url;
      player.play().catch(e => {});
    } else {
      renderAudioRoomLayout(url, name, window.currentAudioVideos, window.currentDedicatedAudioVideos);
    }
  }
};

window.selectAudioVariation = function(index, isDedicated = false) {
    // GUARD: não trocar variação durante render ativo — a seleção não afeta o render em curso
    if (window.isRenderingAudio) return;

    const targetList = isDedicated ? window.currentDedicatedAudioVideos : window.currentAudioVideos;
    if (!targetList || !targetList[index]) return;
    const v = targetList[index];
    const cleanTitle = v.title ? v.title.replace('.mp4', '').replace(/_?[Ll]egendado/g, '').replace(/^\d{2}\s*-\s*/, '').replace(/Voz\s+Voz/gi, 'Voz').trim() : 'Padrão';
    
    window.currentAudioVideoUrl = v.url;
    window.currentAudioVideoTitle = cleanTitle;

    renderAudioRoomLayout(v.url, cleanTitle, window.currentAudioVideos, window.currentDedicatedAudioVideos);
    renderAudioPromptResult(cleanTitle, v.prompt || '');
};

function escapeAudioPromptHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAudioPromptAttribute(value) {
  return escapeAudioPromptHtml(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function splitFlowMusicPrompt(fullPrompt) {
  const text = String(fullPrompt || '').replace(/\r\n/g, '\n');
  const sections = { lyrics: '', musicalComposition: '', negativePrompt: '', voice: '', coverPrompt: '' };
  
  // Apenas cabeçalhos de seções principais oficiais (ignora tags de estrofes como [Verse 1], [Chorus], [Bridge], [Outro], etc.)
  const regex = /^\s*\[\s*(LYRICS?|LETRA|SOUND[^\]]*|SOM[^\]]*|STYLE[^\]]*|MUSICAL[^\]]*|COMPOSITION[^\]]*|EXCLUDE[^\]]*|NEGATIVE[^\]]*|VOICE|VOZ|COVER[^\]]*|ARTWORK[^\]]*|CAPA[^\]]*)\s*\]\s*$/gmi;
  const markers = Array.from(text.matchAll(regex));

  if (!markers.length) {
    sections.lyrics = text.trim();
    return sections;
  }

  markers.forEach((marker, index) => {
    const rawKey = String(marker[1] || '').toUpperCase().trim();
    let key = null;

    if (rawKey.includes('LYRIC') || rawKey.includes('LETRA')) {
      key = 'lyrics';
    } else if (rawKey.includes('SOUND') || rawKey.includes('SOM') || rawKey.includes('STYLE') || rawKey.includes('COMPOSITION') || rawKey.includes('MUSICAL')) {
      key = 'musicalComposition';
    } else if (rawKey.includes('EXCLUDE') || rawKey.includes('NEGATIVE')) {
      key = 'negativePrompt';
    } else if (rawKey.includes('VOICE') || rawKey.includes('VOZ')) {
      key = 'voice';
    } else if (rawKey.includes('COVER') || rawKey.includes('ARTWORK') || rawKey.includes('CAPA') || rawKey.includes('1024')) {
      key = 'coverPrompt';
    }

    if (!key) return;
    const start = marker.index + marker[0].length;
    const end = index + 1 < markers.length ? markers[index + 1].index : text.length;
    sections[key] = text.slice(start, end).trim();
  });

  return sections;
}

function splitLyricsIntoThreeColumns(lyricsText) {
  const raw = String(lyricsText || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return { col1: '', col2: '', col3: '' };

  const regex = /(?:^|\n)(?=\s*\[[^\]]+\])/g;
  const rawSections = raw.split(regex).map(s => s.trim()).filter(Boolean);

  if (rawSections.length >= 3) {
    const part1 = Math.ceil(rawSections.length / 3);
    const part2 = Math.ceil((rawSections.length - part1) / 2);
    const col1 = rawSections.slice(0, part1).join('\n\n');
    const col2 = rawSections.slice(part1, part1 + part2).join('\n\n');
    const col3 = rawSections.slice(part1 + part2).join('\n\n');
    return { col1, col2, col3 };
  }

  const lines = raw.split('\n');
  const part = Math.ceil(lines.length / 3);
  return {
    col1: lines.slice(0, part).join('\n').trim(),
    col2: lines.slice(part, part * 2).join('\n').trim(),
    col3: lines.slice(part * 2).join('\n').trim()
  };
}

function renderFlowMusicPromptColumns(campNum, campTitle, styleLabel, promptData) {
  const el = document.getElementById('audioPromptResult');
  if (!el) return;

  const composition = String(promptData.musicalComposition || promptData.sound || '').trim();
  const lyrics = String(promptData.lyrics || '').trim();
  const coverPrompt = String(promptData.coverPrompt || '').trim();
  
  const soundPrompt = composition || String(promptData.voice || promptData.voiceSpec || '').trim();

  let fullPrompt = String(promptData.prompt || '');
  if (!fullPrompt) {
    const parts = [];
    if (lyrics) parts.push(`[LYRICS]\n${lyrics}`);
    if (soundPrompt) parts.push(`[SOUND / SOM (ESTILO + VOZ)]\n${soundPrompt}`);
    if (coverPrompt) parts.push(`[COVER / ALBUM ARTWORK (1024x1024)]\n${coverPrompt}`);
    fullPrompt = parts.join('\n\n');
  }

  el.innerHTML = `
    <div class="audio-prompt-result-shell" style="height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 8px; overflow: hidden;">
      <div class="audio-prompt-result-head" style="flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px;">
          <span style="font-size:0.92rem;font-weight:800;color:#00d26a;white-space:nowrap;flex-shrink:0;">🎵 Flow Music #${escapeAudioPromptHtml(campNum)}</span>
          
          <!-- Seletor de Roteiros / Prompts Flow Music (Independente do M4A) -->
          <select id="flowMusicPromptSelect" onchange="window.onFlowMusicPromptSelect(this.value, '${campNum}')" title="Selecione o Roteiro de Prompt a ser visualizado" style="flex: 1; max-width: 480px; padding: 5px 10px; background: rgba(10,15,30,0.95); border: 1px solid rgba(0,210,106,0.5); color: #00d26a; border-radius: 8px; font-size: 0.78rem; font-weight: bold; outline: none; cursor: pointer; box-shadow: 0 0 10px rgba(0,210,106,0.2);">
            ${(window.cachedFlowMusicPrompts && window.cachedFlowMusicPrompts.length > 0)
              ? window.cachedFlowMusicPrompts.map(p => `
                <option value="${p.name}" ${p.name === (styleLabel || promptData.name || promptData.title) ? 'selected' : ''}>
                  🎵 ${p.name}
                </option>
              `).join('')
              : `<option value="${escapeAudioPromptAttribute(styleLabel || campTitle)}" selected>🎵 ${escapeAudioPromptHtml(styleLabel || campTitle)}</option>`}
          </select>
        </div>
        <button onclick="navigator.clipboard.writeText(this.dataset.txt).then(()=>{this.textContent='Copiado!';setTimeout(()=>{this.textContent='Copiar Prompt Completo';},2000)})"
          data-txt="${escapeAudioPromptAttribute(fullPrompt)}"
          style="flex:0 0 auto;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 14px;font-weight:700;font-size:0.75rem;border-radius:20px;cursor:pointer;transition:all 0.2s;">
          Copiar Prompt Completo
        </button>
      </div>

      <div class="audio-prompt-columns audio-hidden-scroll" style="flex: 1 1 auto; min-height: 0; overflow-y: auto !important; display: flex; flex-direction: column; gap: 12px; padding-right: 4px;">
        <!-- 1. LETRA (CARD COM 3 COLUNAS INTERNAS) -->
        ${lyrics ? (() => {
          const { col1, col2, col3 } = splitLyricsIntoThreeColumns(lyrics);
          return `
          <div style="background: rgba(0, 210, 106, 0.04); border: 1px solid rgba(0, 210, 106, 0.35); border-radius: 10px; padding: 12px; box-shadow: 0 0 14px rgba(0,210,106,0.06);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(0,210,106,0.2);">
              <strong style="color:#00d26a; font-size: 0.82rem; letter-spacing: 1.2px; font-weight: 800;">1. [ LYRICS / LETRA ]</strong>
              <button onclick="navigator.clipboard.writeText(this.dataset.txt).then(()=>{this.textContent='Copiado!';setTimeout(()=>{this.textContent='Copiar Letra';},1500)})"
                data-txt="${escapeAudioPromptAttribute(lyrics)}"
                style="background:linear-gradient(135deg,#00d26a,#009f4d);border:none;color:#fff;padding:5px 16px;font-size:0.75rem;font-weight:800;border-radius:12px;cursor:pointer;box-shadow:0 0 10px rgba(0,210,106,0.4);transition:all 0.2s;">
                Copiar Letra
              </button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; align-items: start;">
              <!-- Coluna 1 da Letra -->
              <div style="background: rgba(0,210,106,0.03); border: 1px solid rgba(0,210,106,0.15); border-radius: 8px; padding: 10px 12px;">
                <span class="audio-prompt-pre-text" style="white-space: pre-wrap; font-family: inherit; font-size: 0.76rem; line-height: 1.5; color: rgba(255,255,255,0.9);">${escapeAudioPromptHtml(col1)}</span>
              </div>

              <!-- Coluna 2 da Letra -->
              <div style="background: rgba(0,210,106,0.03); border: 1px solid rgba(0,210,106,0.15); border-radius: 8px; padding: 10px 12px;">
                <span class="audio-prompt-pre-text" style="white-space: pre-wrap; font-family: inherit; font-size: 0.76rem; line-height: 1.5; color: rgba(255,255,255,0.9);">${escapeAudioPromptHtml(col2)}</span>
              </div>

              <!-- Coluna 3 da Letra -->
              <div style="background: rgba(0,210,106,0.03); border: 1px solid rgba(0,210,106,0.15); border-radius: 8px; padding: 10px 12px;">
                <span class="audio-prompt-pre-text" style="white-space: pre-wrap; font-family: inherit; font-size: 0.76rem; line-height: 1.5; color: rgba(255,255,255,0.9);">${escapeAudioPromptHtml(col3)}</span>
              </div>
            </div>
          </div>`;
        })() : ''}

        <!-- 2. SOM (SEGUNDO LUGAR: ESTILO + VOZ) -->
        ${soundPrompt ? `
        <div style="background: rgba(0, 174, 239, 0.04); border: 1px solid rgba(0, 174, 239, 0.35); border-radius: 10px; padding: 12px; box-shadow: 0 0 14px rgba(0,174,239,0.06);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(0,174,239,0.2);">
            <strong style="color:#00aeef; font-size: 0.82rem; letter-spacing: 1.2px; font-weight: 800;">2. [ SOUND / SOM (ESTILO + VOZ) ]</strong>
            <button onclick="navigator.clipboard.writeText(this.dataset.txt).then(()=>{this.textContent='Copiado!';setTimeout(()=>{this.textContent='Copiar Som';},1500)})"
              data-txt="${escapeAudioPromptAttribute(soundPrompt)}"
              style="background:linear-gradient(135deg,#00aeef,#007bb5);border:none;color:#fff;padding:5px 16px;font-size:0.75rem;font-weight:800;border-radius:12px;cursor:pointer;box-shadow:0 0 10px rgba(0,174,239,0.4);transition:all 0.2s;">
              Copiar Som
            </button>
          </div>
          
          <div style="background:rgba(0,174,239,0.05);border:1px solid rgba(0,174,239,0.15);border-radius:8px;padding:10px 12px;">
            <span class="audio-prompt-pre-text" style="white-space: pre-wrap; font-family: inherit; font-size: 0.76rem; line-height: 1.5; color: rgba(255,255,255,0.9);">${escapeAudioPromptHtml(soundPrompt)}</span>
          </div>
        </div>` : ''}

        <!-- 3. CAPA DO ÁLBUM (TERCEIRO LUGAR: 1024x1024 QUADRADO) -->
        ${coverPrompt ? `
        <div style="background: rgba(236, 0, 140, 0.04); border: 1px solid rgba(236, 0, 140, 0.35); border-radius: 10px; padding: 12px; box-shadow: 0 0 14px rgba(236,0,140,0.06);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(236,0,140,0.2);">
            <strong style="color:#ec008c; font-size: 0.82rem; letter-spacing: 1.2px; font-weight: 800;">3. [ COVER / CAPA DO ÁLBUM (1024x1024) ]</strong>
            <button onclick="navigator.clipboard.writeText(this.dataset.txt).then(()=>{this.textContent='Copiado!';setTimeout(()=>{this.textContent='Copiar Capa';},1500)})"
              data-txt="${escapeAudioPromptAttribute(coverPrompt)}"
              style="background:linear-gradient(135deg,#ec008c,#7928ca);border:none;color:#fff;padding:5px 16px;font-size:0.75rem;font-weight:800;border-radius:12px;cursor:pointer;box-shadow:0 0 10px rgba(236,0,140,0.4);transition:all 0.2s;">
              Copiar Capa
            </button>
          </div>
          <span class="audio-prompt-pre-text" style="white-space: pre-wrap; font-family: inherit; font-size: 0.74rem; line-height: 1.45; color: rgba(255,255,255,0.85);">${escapeAudioPromptHtml(coverPrompt)}</span>
        </div>` : ''}
      </div>
    </div>`;
}

function renderFlowMusicResult(campNum, campTitle, styleLabel, data) {
  const fullPrompt = data.prompt || '';
  const parsed = fullPrompt ? splitFlowMusicPrompt(fullPrompt) : {};
  renderFlowMusicPromptColumns(campNum, campTitle, styleLabel, {
    lyrics: data.lyrics || parsed.lyrics || '',
    musicalComposition: data.musicalComposition || parsed.musicalComposition || '',
    negativePrompt: data.negativePrompt || parsed.negativePrompt || '',
    voice: data.voiceSpec || parsed.voice || data.voice || '',
    coverPrompt: data.coverPrompt || parsed.coverPrompt || '',
    prompt: fullPrompt
  });
}

function renderAudioPromptResult(style, prompt) {
  window.lastAudioStyle = style;
  window.lastAudioPrompt = prompt;
  
  const resultGrid = document.getElementById('audioPromptResult');
  if (!resultGrid) return;
  
  const isRendering = window.isRenderingAudio ? true : false;
  const isLegendaTab = window.currentAudioTab === 'legenda';

  const campaign = AppState.getSelectedCampaign();
  
  // 1. Extração do Número Amigável da Minissérie (01, 02, 03...)
  let campNum = '01';
  if (campaign) {
    if (campaign.numStr) campNum = String(campaign.numStr).padStart(2, '0');
    else if (campaign.number) campNum = String(campaign.number).padStart(2, '0');
    else if (AppState && AppState.data && AppState.data.campaigns) {
      const idx = AppState.data.campaigns.findIndex(c => c.id === campaign.id);
      if (idx !== -1) campNum = String(idx + 1).padStart(2, '0');
    }
  }
  const campTitle = campaign ? (campaign.title || campaign.topic?.title || 'DTG vs DTF') : 'InkVortex';

  // 2. Formatação do Estilo Musical & Vocal Limpos
  const catEl = document.getElementById('audioCatText');
  const varEl = document.getElementById('audioVarText');
  const vocalEl = document.getElementById('audioVocalText');
  
  let catText = catEl ? catEl.innerText.replace('Categoria...', '').trim() : '';
  let varText = varEl ? varEl.innerText.replace('Variação...', '').trim() : '';
  let vocalText = vocalEl ? vocalEl.innerText.replace('Vocal...', '').trim() : '';

  let cleanStyle = [catText, varText, vocalText].filter(Boolean).join(' | ');
  if (!cleanStyle) {
    cleanStyle = style ? style.replace('.mp4', '').replace(/_?[Ll]egendado/g, '').replace(/_/g, ' ').replace(/^\d{2}\s*-\s*/, '').replace(/Voz\s+Voz/gi, 'Voz').trim() : 'Estilo Personalizado';
  }

  // 3. Checagem de Dedicatória Especial ao Inscrito
  const chkDedicated = document.getElementById('chkAudioDedicated');
  const txtSubscriber = document.getElementById('txtAudioSubscriberName');
  let dedicatedText = "";
  if (chkDedicated && chkDedicated.checked) {
    const subName = (txtSubscriber && txtSubscriber.value.trim()) ? txtSubscriber.value.trim() : '[NOME DO INSCRITO]';
    dedicatedText = `\n🎁 DEDICATÓRIA DA FAIXA: Composição autoral dedicada com carinho ao inscrito @${subName}!\n`;
  }
  
  // 4. Apenas A 1ª FRASE INICIAL com 1 EMOJI de Revelação (Sem Spoilers)
  let singleIntroPhrase = "";
  if (campaign && campaign.social && campaign.social.caption) {
      const cleanLines = campaign.social.caption.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.includes('Versão:'));
      if (cleanLines.length > 0) {
          singleIntroPhrase = cleanLines[0]; // Apenas a primeira linha da síntese
      }
  }

  let ctaTag = 'CTA 01';
  let ctaNumStr = '01';
  if (prompt) {
    const match = prompt.match(/CTA\s*#?(\d{2})/i) || prompt.match(/#CTA_(\d{2})/i);
    if (match) {
      ctaNumStr = match[1];
      ctaTag = `CTA ${ctaNumStr}`;
    } else if (window.selectedCtaItem && window.selectedCtaItem.id) {
      ctaNumStr = String(window.selectedCtaItem.id).replace(/[^0-9]/g, '').padStart(2, '0');
      ctaTag = `CTA ${ctaNumStr}`;
    }
  } else if (window.selectedCtaItem && window.selectedCtaItem.id) {
    ctaNumStr = String(window.selectedCtaItem.id).replace(/[^0-9]/g, '').padStart(2, '0');
    ctaTag = `CTA ${ctaNumStr}`;
  }

  let fullText = `🔥 TRILHA SONORA OFICIAL | MINISSÉRIE #${campNum}: ${campTitle.toUpperCase()} 🎬🎧

🎵 [ESTILO MUSICAL: ${cleanStyle.toUpperCase()} | ${ctaTag}]${dedicatedText}
Escute este trecho exclusivo em áudio autoral de alta definição gravado pela InkVortex Brasil!

✨ REVELAÇÃO DA MINISSÉRIE:
${singleIntroPhrase || '🖨️ Um gostinho exclusivo do que espera por você no documentário completo!'}

👇 COMO PARTICIPAR E SOLICITAR SUA TRILHA (3 PASSOS):
1️⃣ SE INSCREVA NO CANAL INKVORTEX BRASIL (Exclusivo para inscritos do canal!)
2️⃣ DIGITE O SEU ESTILO MUSICAL FAVORITO (ex: Blues, Rock, Synthwave, Reggae, Lo-Fi)
3️⃣ INDIQUE A MINISSÉRIE E SEU NOME NOS COMENTÁRIOS!

🍿 VÍDEO COMPLETO DA MINISSÉRIE:
Assista ao documentário completo em 8K no canal da InkVortex Brasil!

🛒 Insumos, peças e tintas têxteis de alta definição na nossa loja do Mercado Livre: Link na Bio!
#InkVortexBrasil #Minissérie${campNum} #TrilhaSonora #DTG #DTF #ImpressaoDigital`;

  if (!isRendering && prompt) {
    const promptSections = splitFlowMusicPrompt(prompt);
    renderFlowMusicPromptColumns(campNum, campTitle, cleanStyle, {
      lyrics: promptSections.lyrics,
      musicalComposition: promptSections.musicalComposition,
      negativePrompt: promptSections.negativePrompt,
      voice: promptSections.voice,
      coverPrompt: promptSections.coverPrompt,
      prompt
    });
  } else if (!isRendering) {
    resultGrid.innerHTML = `
      <div class="flow-music-empty-state">
        <div class="flow-music-empty-state__icon">🎼</div>
        <h2>Prepare sua próxima trilha no Flow Music</h2>
        <p>Escolha categoria, variação e voz. Depois gere o roteiro musical e salve o M4A na pasta indicada para liberar a renderização.</p>
        <div class="flow-music-empty-state__steps" aria-label="Etapas do Flow Music">
          <span>1 · DEFINIR ESTILO</span>
          <span>2 · GERAR FLOW MUSIC</span>
          <span>3 · SALVAR M4A</span>
        </div>
      </div>
    `;
  }
  
  window.copyAudioCaption = function() {
      navigator.clipboard.writeText(fullText).then(() => {
          const btn = document.getElementById('btnCopyAudioCaption');
          if (btn) {
              btn.innerHTML = '✅ Copiado!';
              btn.style.background = 'var(--brandGrad)';
              btn.style.border = 'none';
              btn.style.color = '#ffffff';
              setTimeout(() => {
                 btn.innerHTML = '📋 Copiar Legenda';
                 btn.style.background = 'rgba(255, 255, 255, 0.06)';
                 btn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                 btn.style.color = '#ffffff';
              }, 3000);
          }
      });
  };

  window.copyAudioMp4FileName = function(btn) {
    const campaign = AppState.getSelectedCampaign();
    let campNum = '01';
    if (campaign) {
      if (campaign.numStr) campNum = String(campaign.numStr).padStart(2, '0');
      else if (campaign.number) campNum = String(campaign.number).padStart(2, '0');
    }
    const rawStyle = window.lastAudioStyle || style || 'Personalizado';
    const cleanStyle = rawStyle.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, ' ').trim();
    const mp4FileName = `${campNum} - ${cleanStyle}.mp4`;

    navigator.clipboard.writeText(mp4FileName).then(() => {
      if (btn) {
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '✅ Nome Copiado!';
        btn.style.background = 'var(--brandGrad)';
        btn.style.border = 'none';
        btn.style.color = '#ffffff';
        setTimeout(() => {
          btn.innerHTML = oldHtml;
          btn.style.background = 'rgba(255, 255, 255, 0.06)';
          btn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
          btn.style.color = '#ffffff';
        }, 2500);
      }
    });
  };
}

async function loadAudioLibrary() {
  try {
    if (!globalAudioLibrary || Object.keys(globalAudioLibrary).length === 0) {
      const res = await fetch('/api/audio-library');
      if (res.ok) {
        globalAudioLibrary = await res.json();
      }
    }
    
    const catList = document.getElementById('audioCatList');
    if (catList && globalAudioLibrary) {
      catList.innerHTML = '';
      for (const cat in globalAudioLibrary) {
        if (cat === 'error') continue;
        const escapedCat = cat.replace(/'/g, "\\'");
        catList.innerHTML += `<div style="padding: 9px 12px; color: #fff; font-size: 0.85rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05);" onmouseover="this.style.background='rgba(0,210,106,0.15)'" onmouseout="this.style.background=''" onclick="window.selectAudioCat('${escapedCat}')">${cat}</div>`;
      }
    }
  } catch(e) {
    console.error('Erro ao carregar biblioteca de áudio', e);
  }
}

window.toggleAudioCat = function() {
  const list = document.getElementById('audioCatList');
  if (!list) return;
  if (!list.innerHTML || list.innerHTML.trim() === '') {
    loadAudioLibrary().then(() => {
      list.style.display = 'block';
    });
  } else if (list.style.display === 'none' || !list.style.display) {
    list.style.display = 'block';
    const varList = document.getElementById('audioVarList');
    if (varList) varList.style.display = 'none';
    const vocalList = document.getElementById('audioVocalList');
    if (vocalList) vocalList.style.display = 'none';
  } else {
    list.style.display = 'none';
  }
};

window.toggleAudioVar = function() {
  const list = document.getElementById('audioVarList');
  if (!list) return;
  if (list.style.display === 'none' || !list.style.display) {
    list.style.display = 'block';
    const catList = document.getElementById('audioCatList');
    if (catList) catList.style.display = 'none';
    const vocalList = document.getElementById('audioVocalList');
    if (vocalList) vocalList.style.display = 'none';
  } else {
    list.style.display = 'none';
  }
};

window.toggleAudioVocal = function() {
  const list = document.getElementById('audioVocalList');
  if (!list) return;
  if (list.style.display === 'none' || !list.style.display) {
    list.style.display = 'block';
    const catList = document.getElementById('audioCatList');
    if (catList) catList.style.display = 'none';
    const varList = document.getElementById('audioVarList');
    if (varList) varList.style.display = 'none';
  } else {
    list.style.display = 'none';
  }
};

window.selectAudioCat = function(cat) {
  const catInput = document.getElementById('audioCategorySelect');
  if (catInput) catInput.value = cat;
  const catText = document.getElementById('audioCatText');
  if (catText) catText.innerText = cat;
  const catList = document.getElementById('audioCatList');
  if (catList) catList.style.display = 'none';
  
  const styleInput = document.getElementById('audioStyleSelect');
  if (styleInput) styleInput.value = '';
  const varText = document.getElementById('audioVarText');
  if (varText) varText.innerText = 'Variação...';
  
  const varList = document.getElementById('audioVarList');
  if (varList) {
    varList.innerHTML = '';
    const lib = globalAudioLibrary || {};
    if (lib[cat]) {
      for (const variation of lib[cat]) {
        const escapedVar = variation.replace(/'/g, "\\'");
        varList.innerHTML += `<div style="padding: 9px 12px; color: #fff; font-size: 0.85rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05);" onmouseover="this.style.background='rgba(0,174,239,0.15)'" onmouseout="this.style.background=''" onclick="window.selectAudioVar('${escapedVar}')">${variation}</div>`;
      }
    }
  }
};

window.selectAudioVar = function(variation) {
  const styleInput = document.getElementById('audioStyleSelect');
  if (styleInput) styleInput.value = variation;
  const varText = document.getElementById('audioVarText');
  if (varText) varText.innerText = variation;
  const varList = document.getElementById('audioVarList');
  if (varList) varList.style.display = 'none';
};

window.selectAudioVocal = function(vocal) {
  const vocalInput = document.getElementById('audioVocalSelect');
  if (vocalInput) vocalInput.value = vocal;
  const vocalText = document.getElementById('audioVocalText');
  if (vocalText) vocalText.innerText = vocal;
  const vocalList = document.getElementById('audioVocalList');
  if (vocalList) vocalList.style.display = 'none';
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('#audioCatDisplay') && !e.target.closest('#audioCatList')) {
    const catList = document.getElementById('audioCatList');
    if (catList) catList.style.display = 'none';
  }
  if (!e.target.closest('#audioVarDisplay') && !e.target.closest('#audioVarList')) {
    const varList = document.getElementById('audioVarList');
    if (varList) varList.style.display = 'none';
  }
  if (!e.target.closest('#audioVocalDisplay') && !e.target.closest('#audioVocalList')) {
    const vocalList = document.getElementById('audioVocalList');
    if (vocalList) vocalList.style.display = 'none';
  }
});

window.toggleAudioDedicatedInput = function(isChecked) {
  const box = document.getElementById('boxAudioSubscriber');
  if (box) {
    box.style.display = isChecked ? 'flex' : 'none';
  }
};

window.closeAudioRoom = function() {
  document.getElementById('audioRoomView').style.display = 'none';
  document.getElementById('multiverseWelcome').style.display = 'flex';
  if (window.highlightActiveRoom) window.highlightActiveRoom(null);
};

window.generateAudioPrompt = async function() {
  // ── MODO DOCUMENTÁRIO (3 MINUTOS / 180S) ──────────────────────────────────
  if (window.currentAudioMode === 'documentario') {
    const docBlocks = getAudioDocBlocks();
    if (docBlocks.length === 0) {
      alert('Nenhum bloco de 3 minisséries completo disponível para gerar roteiro de documentário.');
      return;
    }
    const selId = window.selectedAudioDocId || docBlocks[0].id;
    const selectedBlock = docBlocks.find(b => b.id === selId) || docBlocks[0];

    const catSelect = document.getElementById('audioCategorySelect');
    const varSelect = document.getElementById('audioStyleSelect');
    const vocalSelect = document.getElementById('audioVocalSelect');
    if (!catSelect || !varSelect || !vocalSelect || !catSelect.value || !varSelect.value || !vocalSelect.value) {
      alert('Por favor, selecione Categoria, Variação e Vocal antes de gerar o roteiro do documentário.');
      return;
    }
    const style = `${catSelect.value} - ${varSelect.value} | Voz: ${vocalSelect.value}`;

    const resultGrid = document.getElementById('audioPromptResult');
    if (!resultGrid) return;

    resultGrid.innerHTML = `
      <div class="vortex-crystal-panel" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; position: relative; flex: 1; border: 1px solid #ec008c; border-radius: 12px;">
        <div style="font-size: 3.2rem; margin-bottom: 16px; animation: float 2.5s ease-in-out infinite;">🎬🎼</div>
        <h3 style="color: #fff; font-family: var(--uiRounded); font-size: 1.4rem; margin: 0 0 8px 0; letter-spacing: 1px;">
          ORQUESTRANDO ROTEIRO SINFÔNICO DO DOCUMENTÁRIO (3 MINUTOS)
        </h3>
        <p style="color: #ec008c; font-weight: bold; font-size: 1rem; margin: 0 0 8px 0;">
          ${selectedBlock.title} (${selectedBlock.subtitle})
        </p>
        <p style="color: var(--ivTextSecondary); font-size: 0.9rem; margin: 0;">
          Harmonizando os 3 Atos para o estilo <strong style="color: var(--cyan);">[${style}]</strong>...
        </p>
      </div>
    `;

    const episodes = selectedBlock.campaigns.map(c => {
      let desc = '';
      if (c.topic && typeof c.topic === 'object' && c.topic.description) {
        desc = c.topic.description;
      } else if (c.topic && typeof c.topic === 'string') {
        desc = c.topic;
      } else if (c.description) {
        desc = c.description;
      } else {
        desc = c.title || '';
      }
      return {
        number: c.number,
        title: c.title || c.topic?.title || `Minissérie ${c.number}`,
        description: desc
      };
    });

    try {
      const response = await fetch('/api/generate-documentary-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentaryTitle: selectedBlock.title,
          documentaryName: selectedBlock.title,
          style: style,
          episodes: episodes
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao gerar roteiro do documentário');

      renderAudioPromptResult(`${selectedBlock.title} (3min)`, data.prompt);
    } catch(err) {
      alert('Erro: ' + err.message);
      renderAudioPromptResult('Erro', 'Falha na geração do roteiro.');
    }
    return;
  }
  // ── MODO FLOW MUSIC ────────────────────────────────────────────────────────
  if (window.currentAudioMode === 'flowmusic') {
    const campaign = AppState.getSelectedCampaign();
    if (!campaign) {
      alert('Por favor, selecione uma minissérie na Biblioteca antes de gerar o Flow Music.');
      return;
    }

    const catSelect  = document.getElementById('audioCategorySelect');
    const varSelect  = document.getElementById('audioStyleSelect');
    const vocalSelect = document.getElementById('audioVocalSelect');
    if (!catSelect || !varSelect || !vocalSelect || !catSelect.value || !varSelect.value || !vocalSelect.value) {
      alert('Por favor, selecione Categoria, Variação e Vocal antes de gerar o Flow Music.');
      return;
    }

    const estiloMusical   = catSelect.value;
    const variacaoMusical = varSelect.value;
    const voz             = vocalSelect.value;
    const styleLabel      = `${estiloMusical} — ${variacaoMusical} | Voz: ${voz}`;

    // Extrai título e contexto da minissérie selecionada
    const campTitle = campaign.title || campaign.topic?.title || `Minissérie ${campaign.number}`;
    let campContext = '';
    if (campaign.topic && typeof campaign.topic === 'object' && campaign.topic.description) {
      campContext = campaign.topic.description;
    } else if (campaign.topic && typeof campaign.topic === 'string') {
      campContext = campaign.topic;
    } else {
      campContext = campTitle;
    }

    let campNum = '01';
    if (campaign.numStr) campNum = String(campaign.numStr).padStart(2, '0');
    else if (campaign.number) campNum = String(campaign.number).padStart(2, '0');

    const resultGrid = document.getElementById('audioPromptResult');
    if (!resultGrid) { console.error('Flow Music: audioPromptResult element not found'); return; }

    resultGrid.innerHTML = `
      <div class="vortex-crystal-panel" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; position: relative; flex: 1; border: 1px solid #00d26a; border-radius: 12px;">
        <div style="font-size: 3.2rem; margin-bottom: 16px; animation: float 2.5s ease-in-out infinite;">🎵✨</div>
        <h3 style="color: #00d26a; font-family: var(--uiRounded); font-size: 1.4rem; margin: 0 0 8px 0; letter-spacing: 1px;">
          GERANDO IDENTIDADE MUSICAL FLOW
        </h3>
        <p style="color: #fff; font-weight: bold; font-size: 1rem; margin: 0 0 6px 0;">#${campNum} — ${campTitle}</p>
        <p style="color: var(--ivTextSecondary); font-size: 0.9rem; margin: 0;">
          Estilo: <strong style="color: var(--cyan);">${styleLabel}</strong>
        </p>
      </div>
    `;

    try {
      const response = await fetch('/api/generate-flow-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estiloMusical,
          variacaoMusical,
          voz,
          title: campTitle,
          context: campContext,
          topic: campaign.topic || null,
          campaignNum: campNum,
          campaignId: campaign.id
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao gerar Flow Music');

      campaign.audioPrompt = data.prompt || `[LYRICS]\n${data.lyrics || ''}\n\n[MUSICAL COMPOSITION]\n${data.musicalComposition || ''}\n\n[VOICE]\n${data.voice || ''}`;
      campaign.audioStyle = styleLabel;
      AppState.save();

      const cleanVoice = String(voz || '').replace(/\s*\(pt-br\)/i, '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
      const generatedName = `#${campNum} - ${estiloMusical} - ${variacaoMusical}${cleanVoice ? ` - ${cleanVoice}` : ''}`;
      const newPromptObj = {
        name: generatedName,
        title: generatedName,
        ...data
      };
      window.cachedFlowMusicPrompts = window.cachedFlowMusicPrompts || [];
      window.cachedFlowMusicPrompts = [newPromptObj, ...window.cachedFlowMusicPrompts.filter(p => p.name !== generatedName)];
      window.currentActivePromptData = newPromptObj;

      renderFlowMusicResult(campNum, campTitle, generatedName, data);
      window.loadSonoplastiaSelectors(campNum);
    } catch(err) {
      alert('Erro: ' + err.message);
      renderAudioPromptResult('Erro', 'Falha na geração do Flow Music.');
    }
    return;
  }
  // ──────────────────────────────────────────────────────────────────────────

  const campaign = AppState.getSelectedCampaign();
  if (!campaign) return;
  
  const catSelect = document.getElementById('audioCategorySelect');
  const varSelect = document.getElementById('audioStyleSelect');
  const vocalSelect = document.getElementById('audioVocalSelect');
  
  if (!catSelect || !varSelect || !vocalSelect || !catSelect.value || !varSelect.value || !vocalSelect.value) {
    alert('Por favor, selecione Categoria, Variação e Vocal antes de gerar o roteiro musical.');
    return;
  }
  
  const style = `${catSelect.value} - ${varSelect.value} | Voz: ${vocalSelect.value}`;
  
  const resultGrid = document.getElementById('audioPromptResult');
  if (!resultGrid) return;
  
  const container = document.getElementById('audioRoomView');
  if (container) container.classList.add('sonic-pulse');

  resultGrid.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; position: relative; flex: 1; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 200px; height: 200px; background: radial-gradient(circle, var(--cyan) 0%, transparent 70%); opacity: 0.15; filter: blur(30px); animation: pulse 2s ease-in-out infinite;"></div>
      <div style="display: flex; gap: 16px; margin-bottom: 24px; z-index: 1;">
        <div style="font-size: 2.5rem; animation: float 3s ease-in-out infinite;">🎵</div>
        <div style="font-size: 3rem; animation: float 2.5s ease-in-out infinite 0.5s; filter: drop-shadow(0 0 10px var(--cyan));">🎹</div>
        <div style="font-size: 2.5rem; animation: float 3.5s ease-in-out infinite 1s;">✨</div>
      </div>
      <h3 style="color: #fff; font-family: var(--uiRounded); font-size: 1.5rem; margin: 0 0 12px 0; letter-spacing: 1px; z-index: 1;">
        SINTETIZANDO ÁUDIO NO VORTEX (MISTRAL IA)
      </h3>
      <p style="color: var(--ivTextSecondary); font-family: var(--uiText); font-size: 1.1rem; max-width: 400px; margin: 0; z-index: 1;">
        Orquestrando frequências para o DNA <strong style="color: var(--cyan); font-weight: 600;">[${style}]</strong>...
      </p>
      <div style="width: 250px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 4px; margin-top: 32px; overflow: hidden; z-index: 1;">
        <div style="width: 50%; height: 100%; background: var(--brandGrad); border-radius: 4px; animation: cyberProgress 2s ease-in-out infinite alternate;"></div>
      </div>
    </div>
    
    <style>
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-15px); }
      }
      @keyframes cyberProgress {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    </style>
  `;
  
  try {
    const captionText = (campaign.social && campaign.social.caption) ? campaign.social.caption : (campaign.socialCaption || '');
    
    const chkDedicated = document.getElementById('chkAudioDedicated');
    const txtSubscriber = document.getElementById('txtAudioSubscriberName');
    const isDedicated = chkDedicated ? chkDedicated.checked : false;
    const dedicatedSubscriber = txtSubscriber ? txtSubscriber.value.trim() : '';

    let campNum = '01';
    if (campaign.numStr) campNum = String(campaign.numStr).padStart(2, '0');
    else if (campaign.number) campNum = String(campaign.number).padStart(2, '0');
    else if (AppState && AppState.data && AppState.data.campaigns) {
      const idx = AppState.data.campaigns.findIndex(c => c.id === campaign.id);
      if (idx !== -1) campNum = String(idx + 1).padStart(2, '0');
    }

    let ctaNumSel = '01';
    if (window.selectedCtaItem && window.selectedCtaItem.id) {
      ctaNumSel = String(window.selectedCtaItem.id).replace(/[^0-9]/g, '').padStart(2, '0');
    }
    const ctaTagSel = `CTA ${ctaNumSel}`;
    const cleanStyleSel = style.replace(/_?[Ll]egendado/g, '').replace(/^\d{2}\s*-\s*/, '').replace(/Voz\s+Voz/gi, 'Voz').trim();
    
    let singleIntroPhraseSel = '';
    if (captionText) {
      const cleanLines = captionText.split('\n').map(l => l.replace(/^[0-9#\-\*•\s\u1F60-\u1F64\u1F68-\u1F6F\u2600-\u26FF\u2700-\u27BF]+/gu, '').trim()).filter(l => l.length > 15);
      if (cleanLines.length > 0) singleIntroPhraseSel = cleanLines[0];
    }
    const dedicatedTextSel = isDedicated ? ` | 🎁 DEDICATÓRIA AO INSCRITO: ${dedicatedSubscriber || '[INSCRITO]'}` : '';

    const linkedCaptionText = `🔥 TRILHA SONORA OFICIAL | MINISSÉRIE #${campNum}: ${(campaign.title || '').toUpperCase()} 🎬🎧

🎵 [ESTILO MUSICAL: ${cleanStyleSel.toUpperCase()} | ${ctaTagSel}]${dedicatedTextSel}
Escute este trecho exclusivo em áudio autoral de alta definição gravado pela InkVortex Brasil!

✨ REVELAÇÃO DA MINISSÉRIE:
${singleIntroPhraseSel || '🖨️ Um gostinho exclusivo do que espera por você no documentário completo!'}

👇 COMO PARTICIPAR E SOLICITAR SUA TRILHA (3 PASSOS):
1️⃣ SE INSCREVA NO CANAL INKVORTEX BRASIL (Exclusivo para inscritos do canal!)
2️⃣ DIGITE O SEU ESTILO MUSICAL FAVORITO (ex: Blues, Rock, Synthwave, Reggae, Lo-Fi)
3️⃣ INDIQUE A MINISSÉRIE E SEU NOME NOS COMENTÁRIOS!

🍿 VÍDEO COMPLETO DA MINISSÉRIE:
Assista ao documentário completo em 8K no canal da InkVortex Brasil!

🛒 Insumos, peças e tintas têxteis de alta definição na nossa loja do Mercado Livre: Link na Bio!
#InkVortexBrasil #Minissérie${campNum} #TrilhaSonora #DTG #DTF #ImpressaoDigital`;

    const response = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        campaignNum: campNum,
        campaignTitle: campaign.title || (campaign.topic && campaign.topic.title) || `Minissérie ${campNum}`,
        style: style,
        caption: captionText,
        scenes: campaign.scenes || [],
        topic: campaign.topic || {},
        isDedicated: isDedicated,
        dedicatedSubscriber: dedicatedSubscriber,
        selectedCta: window.selectedCtaItem || null,
        linkedCaption: linkedCaptionText
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API backend (${response.status})`);
    }

    const data = await response.json();
    const generatedPrompt = data.prompt || data.audioPrompt || 'Roteiro gerado.';

    campaign.audioPrompt = generatedPrompt;
    campaign.audioStyle = style;
    AppState.save();
    renderAudioPromptResult(style, generatedPrompt);
    
  } catch(e) {
    console.warn("API de áudio indisponível, utilizando gerador inteligente de contingência:", e);
    
    const styleParts = style.split(' | ');
    const genero = styleParts[0] || "Cinematic Epic";
    const voz = styleParts[1] || "Sem Voz";
    
    const fallbackPrompt = `[CONTRATO MUSICAL 60S - INKVORTEX BRASIL]\n[Language: pt-BR (Português do Brasil - Fonética Brasileira)]\n[Genre: ${genero}]\n[Vocals: ${voz}]\n[Brand Signature: InkVortex Brasil]\n[Duration: 60s Total]\n\n(Ato 1 - A Preparação 0s-11s)\nIntrodução envolvente de ${campaign.title || 'Minissérie'}, estabelecendo o tom técnico e rítmico em Português do Brasil.\n\n(Ato 2 - O Desenvolvimento 11s-46s)\nDesenvolvimento rítmico progressivo acompanhando a física dos materiais e os detalhes da narrativa visual.\n\n(Ato 3 - O Ápice e Merchã InkVortex 46s-60s)\nClímax musical com menção expressiva da marca InkVortex Brasil e encerramento triunfal.`;

    campaign.audioPrompt = fallbackPrompt;
    campaign.audioStyle = style;
    AppState.save();
    renderAudioPromptResult(style, fallbackPrompt);
  } finally {
    const container = document.getElementById('audioRoomView');
    if (container) container.classList.remove('sonic-pulse');
  }
};

window.copyAudioPrompt = function(btn) {
  const prompt = decodeURIComponent(btn.getAttribute('data-prompt'));
  navigator.clipboard.writeText(prompt).then(() => {
    const originalText = btn.innerHTML;
    btn.innerHTML = "✅ COPIADO!";
    btn.style.background = "var(--brandGrad)";
    btn.style.border = "none";
    btn.style.color = "#ffffff";
    btn.style.boxShadow = "0 0 12px rgba(0,174,239,0.4)";
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = "rgba(255, 255, 255, 0.06)";
      btn.style.border = "1px solid rgba(255, 255, 255, 0.2)";
      btn.style.color = "#ffffff";
      btn.style.boxShadow = "none";
    }, 3000);
  });
};

window.openAudioRoomFromLibrary = function(campaignId) {
  AppState.selectedCampaignId = campaignId;
  AppState.activeStage = 'expansion';
  
  window.openAudioRoom();
};


window._rawTextFontSize = 18;

window.zoomRawText = function(delta) {
  const editor = document.getElementById('rawTextEditor');
  const indicator = document.getElementById('zoomFontIndicator');
  window._rawTextFontSize = Math.min(36, Math.max(12, (window._rawTextFontSize || 18) + delta));
  if (editor) editor.style.fontSize = window._rawTextFontSize + 'px';
  if (indicator) indicator.innerText = window._rawTextFontSize + 'px';
};

window.resetZoomRawText = function() {
  const editor = document.getElementById('rawTextEditor');
  const indicator = document.getElementById('zoomFontIndicator');
  window._rawTextFontSize = 18;
  if (editor) editor.style.fontSize = '18px';
  if (indicator) indicator.innerText = '18px';
};

window.playSelectedRenderedMp4 = function(url) {
  if (!url) return;
  const player = document.getElementById('audioRoomPlayer');
  if (player) {
    player.src = url;
    player.play().catch(() => {});
    window.currentAudioVideoUrl = url;
  }
};

window.playM4AAudioFile = function(url, name) {
  window.playSelectedRenderedMp4(url);
};

window.loadSonoplastiaSelectors = async function(campNum) {
  const m4aSelect = document.getElementById('audioM4ASelect');
  const mp4Select = document.getElementById('audioMP4Select');
  const countBadge = document.getElementById('audioMp4CountBadge');

  try {
    const res = await fetch(`/api/list-m4a-files?campaignNum=${campNum}`);
    if (res.ok) {
      const data = await res.json();
      const m4aFiles = data.m4aFiles || [];
      const mp4Files = data.mp4Files || [];
      const promptFiles = data.promptFiles || [];
      window.cachedFlowMusicPrompts = promptFiles;

      // 1. Popula Seletor de Prompts (no Card de Prompts)
      const promptSelect = document.getElementById('flowMusicPromptSelect');
      if (promptSelect && promptFiles.length > 0) {
        promptSelect.innerHTML = promptFiles.map((p, i) => {
          return `<option value="${p.name}" ${i === 0 ? 'selected' : ''}>🎵 ${p.name}</option>`;
        }).join('');
      }

      // Se há prompts no disco, renderiza automaticamente o primeiro disponível
      if (promptFiles.length > 0) {
        window.onFlowMusicPromptSelect(promptFiles[0].name, campNum);
      } else {
        const campaign = AppState.getSelectedCampaign();
        if (campaign && campaign.audioPrompt) {
          renderAudioPromptResult(campaign.audioStyle || 'Padrão', campaign.audioPrompt);
        } else {
          renderAudioPromptResult('Padrão', '');
        }
      }

      // 2. Popula Seletor M4A (Exclusivo para definir o áudio de Renderização no Console)
      if (m4aSelect) {
        if (m4aFiles.length === 0) {
          m4aSelect.innerHTML = '<option value="">⚠️ Nenhum .m4a em /sonoplastia/m4a/</option>';
          window.selectedM4AFile = null;
        } else {
          m4aSelect.innerHTML = m4aFiles.map((f, i) => {
            return `<option value="${f.name}" ${i === 0 ? 'selected' : ''}>🎵 ${f.name}</option>`;
          }).join('');
          window.selectedM4AFile = m4aFiles[0].name;
        }
      }

      // 3. Popula Seletor MP4 (Vídeos Renderizados Prontos)
      if (mp4Select) {
        if (countBadge) countBadge.textContent = `(${mp4Files.length})`;
        if (mp4Files.length === 0) {
          mp4Select.innerHTML = '<option value="">⚠️ Nenhum MP4 renderizado</option>';
        } else {
          mp4Select.innerHTML = mp4Files.map((v, i) => {
            return `<option value="${v.url}" ${i === 0 ? 'selected' : ''}>${v.isLegendado ? '⭐' : '🎬'} ${v.name}</option>`;
          }).join('');

          const player = document.getElementById('audioRoomPlayer');
          if (player) {
            const bestVideo = mp4Files.find(v => v.isLegendado) || mp4Files[0];
            if (bestVideo) {
              player.src = bestVideo.url;
              window.currentAudioVideoUrl = bestVideo.url;
            }
          }
        }
      }
    }
  } catch(e) {
    console.error('Erro ao carregar seletores de sonoplastia:', e);
  }
};

window.onFlowMusicPromptSelect = function(promptName, campNum) {
  if (!promptName) return;
  const num = String(campNum || '01').padStart(2, '0');
  
  if (window.cachedFlowMusicPrompts && window.cachedFlowMusicPrompts.length > 0) {
    const found = window.cachedFlowMusicPrompts.find(p => p.name === promptName || p.title === promptName);
    if (found && (found.lyrics || found.musicalComposition || found.prompt)) {
      window.currentActivePromptData = found;
      renderFlowMusicResult(num, '', promptName, found);
      return;
    }
  }

  const jsonUrl = `/minisseries/${encodeURIComponent(num)}/sonoplastia/flow-music/${encodeURIComponent(promptName + '.json')}?t=${Date.now()}`;
  const txtUrl = `/minisseries/${encodeURIComponent(num)}/sonoplastia/flow-music/${encodeURIComponent(promptName + '.txt')}?t=${Date.now()}`;

  fetch(jsonUrl, { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && (data.lyrics || data.musicalComposition || data.prompt)) {
        window.currentActivePromptData = data;
        renderFlowMusicResult(num, '', promptName, data);
      } else {
        fetch(txtUrl, { cache: 'no-store' })
          .then(r => r.ok ? r.text() : '')
          .then(txt => {
            if (txt && txt.trim()) {
              renderAudioPromptResult(promptName, txt);
            }
          });
      }
    })
    .catch(() => {});
};

window.startRenderizarAudio = async function(btn) {
  const campaign = AppState.getSelectedCampaign();
  if (!campaign) {
    alert('Por favor, selecione uma minissérie na Biblioteca antes de renderizar.');
    return;
  }

  let campNum = '01';
  if (campaign.numStr) campNum = String(campaign.numStr).padStart(2, '0');
  else if (campaign.number) campNum = String(campaign.number).padStart(2, '0');

  const selectedM4a = window.selectedM4AFile || (document.getElementById('audioM4ASelect') ? document.getElementById('audioM4ASelect').value : null);

  const resultGrid = document.getElementById('audioPromptResult');
  if (!resultGrid) return;

  resultGrid.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; position: relative; flex: 1; border: 1px solid #00d26a; border-radius: 12px; background: rgba(10,15,30,0.9); box-shadow: 0 0 25px rgba(0,210,106,0.3);">
      <div style="font-size: 3.5rem; margin-bottom: 16px; animation: pulse 1.2s infinite ease-in-out;">🎬⚡</div>
      <h3 style="color: #00d26a; font-family: var(--uiRounded); font-size: 1.4rem; margin: 0 0 8px 0; letter-spacing: 1px;">
        RENDERIZANDO ÁUDIO COM CAPA E LEGENDAS (OPENAI WHISPER)
      </h3>
      <p style="color: #fff; font-weight: bold; font-size: 1rem; margin: 0 0 6px 0;">Minissérie #${campNum} — ${selectedM4a ? selectedM4a : (campaign.title || 'InkVortex')}</p>
      <p style="color: var(--cyan); font-size: 0.9rem; margin: 0;">
        Ancorando palavras via Whisper-1 + Needleman-Wunsch e aplicando passagem única FFmpeg...
      </p>
    </div>
  `;

  if (btn) { btn.disabled = true; btn.innerText = '🎬 Renderizando...'; }

  try {
    const renderRes = await fetch('/api/render-m4a-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignNum: campNum,
        m4aFile: selectedM4a || undefined
      })
    });

    const renderData = await renderRes.json();
    if (!renderRes.ok) throw new Error(renderData.error || 'Erro na renderização final com OpenAI Whisper-1');

    alert('✅ Renderização Automática Concluída com Sucesso!\nVídeo "' + (renderData.outputLegendadoName || 'legendado.mp4') + '" gerado com sucesso!');
    await window.loadSonoplastiaSelectors(campNum);
  } catch(err) {
    alert('Erro ao renderizar: ' + err.message);
    renderAudioPromptResult(campaign.audioStyle || '', campaign.audioPrompt || '');
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = '🎵 RENDERIZAR'; }
  }
};

window.confirmAndRenderAudio = async function(campNum) {
  const editor = document.getElementById('rawTextEditor');
  const editedRawText = editor ? editor.value : '';

  const resultGrid = document.getElementById('audioPromptResult');
  if (resultGrid) {
    resultGrid.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; position: relative; flex: 1; border: 1px solid #00d26a; border-radius: 12px; background: rgba(10,15,30,0.9); box-shadow: 0 0 25px rgba(0,210,106,0.3);">
        <div style="font-size: 3.5rem; margin-bottom: 16px; animation: pulse 1.2s infinite ease-in-out;">🎬⚡</div>
        <h3 style="color: #00d26a; font-family: var(--uiRounded); font-size: 1.4rem; margin: 0 0 8px 0; letter-spacing: 1px;">
          RENDERIZANDO VÍDEO FFMPEG COM LEGENDA REVISADA
        </h3>
        <p style="color: #fff; font-weight: bold; font-size: 1rem; margin: 0 0 6px 0;">Minissérie #${campNum}</p>
        <p style="color: var(--cyan); font-size: 0.9rem; margin: 0;">
          Aplicando 2 passagens FFmpeg com a fonte Space Grotesk...
        </p>
      </div>
    `;
  }

  try {
    const burnRes = await fetch('/api/burn-m4a-ass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignNum: campNum,
        assContent: window._lastAssContent || '',
        alignedWords: window._lastAlignedWords || [],
        editedRawText
      })
    });

    const burnData = await burnRes.json();
    if (!burnRes.ok) throw new Error(burnData.error || 'Erro ao renderizar MP4 final');

    alert('✅ Renderização Final Concluída com Legenda Corrigida!\nVídeo "' + (burnData.outputLegendadoName || 'legendado.mp4') + '" gerado com sucesso!');
    window.openAudioRoom();
  } catch(err) {
    alert('Erro ao renderizar vídeo: ' + err.message);
    window.openAudioRoom();
  }
};

window.startRenderizarCapas4x5 = async function(btn) {
  const campaign = AppState.getSelectedCampaign();
  if(!campaign) {
    alert('Nenhuma minissérie selecionada.');
    return;
  }

  const originalText = btn ? btn.innerText : '🖼️ RENDERIZAR CAPA (4x5)';
  if (btn) {
    btn.innerText = '🖼️ Extraindo Capas 4x5...';
    btn.disabled = true;
    btn.style.opacity = '0.7';
  }

  try {
    const res = await fetch('/api/render-capas-4x5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign.number })
    });
    
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Erro ao renderizar capas');
    }

    if (btn) {
      btn.innerText = '✅ Capas 4x5 Geradas!';
      btn.style.background = '#00d26a';
      btn.style.color = '#fff';
      btn.style.borderColor = '#00d26a';
      btn.style.opacity = '1';
    }

    alert(`✨ Sucesso! ${data.count || 0} capa(s) no formato 4x5 (Instagram) foram geradas a partir do material cru na pasta sonoplastia!`);

    setTimeout(() => {
      if (btn) {
        btn.innerText = originalText;
        btn.disabled = false;
        btn.style.background = 'rgba(0,174,239,0.14)';
        btn.style.borderColor = 'rgba(0,174,239,0.4)';
        btn.style.color = 'var(--cyan)';
      }
    }, 3500);

  } catch(e) {
    if (btn) {
      btn.innerText = originalText;
      btn.disabled = false;
      btn.style.opacity = '1';
    }
    alert('Erro ao renderizar capas 4x5: ' + e.message);
  }
};

window.renderStandaloneCapas4x5 = async function(btn) {
  const originalText = btn ? btn.innerText : '🖼️ CAPA 4x5';
  if (btn) {
    btn.innerText = '⚡ PROCESSANDO...';
    btn.disabled = true;
    btn.style.opacity = '0.7';
  }

  try {
    const res = await fetch('/api/render-standalone-capas-4x5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Erro ao processar pasta capa 4x5');
    }

    if (btn) {
      btn.innerText = '✅ CAPAS CONCLUÍDAS!';
      btn.style.background = '#00d26a';
      btn.style.color = '#fff';
    }

    alert(`✨ PROCESSAMENTO DE CAPAS 4x5 CONCLUÍDO!\n\n📁 Pasta: F:\\VORTEX10\\render\\capa 4x5\n✅ Convertidas: ${data.convertedCount} nova(s) capa(s) para 4:5 Safe Zone.\n⏩ Mantidas: ${data.skippedCount} capa(s) que já estavam convertidas.`);

    setTimeout(() => {
      if (btn) {
        btn.innerText = originalText;
        btn.disabled = false;
        btn.style.background = 'var(--brandGrad)';
        btn.style.color = '#fff';
        btn.style.opacity = '1';
      }
    }, 3500);

  } catch(e) {
    if (btn) {
      btn.innerText = originalText;
      btn.disabled = false;
      btn.style.opacity = '1';
    }
    alert('Erro ao converter capas 4x5: ' + e.message);
  }
};

window.toggleAudioCta = function() {
  const list = document.getElementById('audioCtaList');
  if (!list) return;
  if (list.style.display === 'block') {
    list.style.display = 'none';
  } else {
    const catL = document.getElementById('audioCatList'); if (catL) catL.style.display = 'none';
    const varL = document.getElementById('audioVarList'); if (varL) varL.style.display = 'none';
    const vocL = document.getElementById('audioVocalList'); if (vocL) vocL.style.display = 'none';
    
    let html = '';
    const ctas = window.ctaDatabase || [];
    if (ctas.length === 0) {
      html = '<div style="padding:9px 12px;color:rgba(255,255,255,0.5);font-size:0.82rem;">Nenhuma CTA cadastrada</div>';
    } else {
      ctas.forEach(item => {
        const titleStr = item.title || item.id || 'CTA';
        html += `<div style="padding:9px 12px;color:#fff;font-size:0.82rem;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" onmouseover="this.style.background='rgba(0,174,239,0.2)'" onmouseout="this.style.background=''" onclick="window.selectAudioCta('${item.id}')">${titleStr}</div>`;
      });
    }
    list.innerHTML = html;
    list.style.display = 'block';
  }
};

window.selectAudioCta = function(ctaId) {
  const item = (window.ctaDatabase || []).find(i => i.id === ctaId);
  if (item) {
    window.selectedCtaItem = item;
    window.selectedCtaId = item.id;
    const txtSpan = document.getElementById('audioCtaText');
    if (txtSpan) txtSpan.innerText = '🎯 ' + (item.title || item.id);
  }
  const list = document.getElementById('audioCtaList');
  if (list) list.style.display = 'none';
};



// ============================================================
// SISTEMA DA CAIXA PRETA (CORREÇÃO MANUAL DE LEGENDAS ASS)
// ============================================================

window.openSubtitlesModal = async function(campaignId) {
  const campaign = campaignId ? AppState.campaigns.find(c => String(c.id) === String(campaignId) || String(c.number) === String(campaignId)) : AppState.getSelectedCampaign();
  const cNum = campaign ? String(campaign.number).padStart(2, '0') : '01';
  
  const modal = document.getElementById('modalSubtitles');
  const textarea = document.getElementById('modalSubtitlesContent');
  if (!modal || !textarea) return;

  textarea.value = `⏳ Carregando arquivo de legenda (.ass) da Caixa Preta - Minissérie #${cNum}...`;
  modal.style.display = 'flex';
  window.currentEditingSubtitlesCampaign = campaign;

  try {
    const res = await fetch(`/api/list-m4a-files?campaignNum=${cNum}`);
    const data = await res.json();
    const btnBurn = document.getElementById('btnBurnSubtitles');
    if (data && data.assContent) {
      textarea.value = data.assContent;
      if (btnBurn) btnBurn.disabled = false;
    } else {
      textarea.value = `A Minissérie #${cNum} ainda não possui um arquivo ASS. Use o botão RENDERIZAR para gerar a legenda TikTok antes da correção manual.`;
      if (btnBurn) btnBurn.disabled = true;
    }
  } catch(e) {
    textarea.value = `Não foi possível carregar o ASS da Minissérie #${cNum}: ${e.message}`;
    const btnBurn = document.getElementById('btnBurnSubtitles');
    if (btnBurn) btnBurn.disabled = true;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const btnBurn = document.getElementById('btnBurnSubtitles');
  if (btnBurn) {
    btnBurn.addEventListener('click', async () => {
      const textarea = document.getElementById('modalSubtitlesContent');
      const assContent = textarea ? textarea.value : '';
      const c = window.currentEditingSubtitlesCampaign || AppState.getSelectedCampaign();
      const cNum = c ? String(c.number).padStart(2, '0') : '01';
      
      btnBurn.innerHTML = '⏳ RENDERIZANDO CAIXA PRETA...';
      btnBurn.disabled = true;

      try {
        const res = await fetch('/api/burn-m4a-ass', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignNum: cNum, assContent })
        });
        const data = await res.json();
        if (data.success || data.ok) {
          if (typeof showToast === 'function') showToast('🔥 Legenda ASS salva e vídeo renderizado com sucesso!', 'success');
          document.getElementById('modalSubtitles').style.display = 'none';
          window.openAudioRoom();
        } else {
          alert('Erro ao renderizar legenda: ' + (data.error || 'Falha no servidor.'));
        }
      } catch(err) {
        alert('Erro ao conectar ao servidor: ' + err.message);
      } finally {
        btnBurn.innerHTML = '🔥 SALVAR E RENDERIZAR';
        btnBurn.disabled = false;
      }
    });
  }
});

/* ==========================================================================
   MÓDULO: Som Ambiente / Focus Music Studio (VORTEX12)
   ========================================================================== */
window.ambientFolders = [];
window.ambientAudioTracks = [];
window.ambientRootTracks = [];
window.ambientBaseDir = 'D:\\Músicas';
window.ambientCurrentFolder = localStorage.getItem('vortex_ambient_folder') || null;
window.isAmbientAudioPlaying = false;
window.currentAmbientTrack = null;
window.ambientAudioVolume = 0.7;

window.initAmbientStudioAudio = function() {
  const audio = document.getElementById('ambientStudioAudio');
  if (!audio) return;

  const savedVol = localStorage.getItem('vortex_ambient_volume');
  if (savedVol !== null) {
    window.ambientAudioVolume = parseFloat(savedVol) || 0.7;
  }
  audio.volume = window.ambientAudioVolume;

  const volSlider = document.getElementById('ambientAudioVolume');
  const volLabel = document.getElementById('ambientVolumeValue');
  if (volSlider) volSlider.value = window.ambientAudioVolume;
  if (volLabel) volLabel.textContent = `${Math.round(window.ambientAudioVolume * 100)}%`;

  // Restaura faixa salva anteriormente se houver
  try {
    const savedTrackStr = localStorage.getItem('vortex_ambient_track');
    if (savedTrackStr) {
      window.currentAmbientTrack = JSON.parse(savedTrackStr);
      if (window.currentAmbientTrack && window.currentAmbientTrack.url) {
        audio.src = window.currentAmbientTrack.url;
        const trackNameDisplay = document.getElementById('ambientCurrentTrackName');
        if (trackNameDisplay) {
          trackNameDisplay.textContent = window.currentAmbientTrack.name || 'Faixa salva';
        }
      }
    }
  } catch (_) {}

  audio.addEventListener('play', () => {
    window.isAmbientAudioPlaying = true;
    window.updateAmbientAudioUI();
  });

  audio.addEventListener('pause', () => {
    window.isAmbientAudioPlaying = false;
    window.updateAmbientAudioUI();
  });

  audio.addEventListener('ended', () => {
    window.playNextAmbientTrack();
  });

  audio.addEventListener('error', (e) => {
    console.warn('[AMBIENT AUDIO] Erro no player:', e);
    window.isAmbientAudioPlaying = false;
    window.updateAmbientAudioUI();
  });

  // Fechar dropdown ao clicar fora
  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('ambientAudioWrapper');
    const dropdown = document.getElementById('dropdownAmbientAudio');
    if (wrapper && dropdown && !wrapper.contains(e.target) && dropdown.style.display !== 'none') {
      dropdown.style.display = 'none';
    }
  });

  // Pré-carrega
  if (window.ambientCurrentFolder) {
    window.openAmbientAudioFolder(window.ambientCurrentFolder, false);
  } else {
    window.loadAmbientAudioFolders();
  }
};

window.toggleAmbientAudioDropdown = function(forceState) {
  const dropdown = document.getElementById('dropdownAmbientAudio');
  if (!dropdown) return;
  
  const isCurrentlyOpen = dropdown.style.display === 'block';
  const shouldOpen = forceState !== undefined ? forceState : !isCurrentlyOpen;

  if (shouldOpen) {
    const stageDropdown = document.getElementById('dropdownStage');
    if (stageDropdown) stageDropdown.style.display = 'none';
    
    dropdown.style.display = 'block';
    if (window.ambientCurrentFolder) {
      window.openAmbientAudioFolder(window.ambientCurrentFolder, false);
    } else {
      window.loadAmbientAudioFolders();
    }
  } else {
    dropdown.style.display = 'none';
  }
};

window.loadAmbientAudioFolders = async function() {
  const listEl = document.getElementById('ambientTrackList');
  const pathText = document.getElementById('ambientPathText');
  const btnBack = document.getElementById('btnAmbientBackFolder');
  const searchBox = document.getElementById('ambientSearchContainer');
  if (!listEl) return;

  if (pathText) pathText.textContent = window.ambientBaseDir || 'D:\\Músicas';
  if (btnBack) btnBack.style.display = 'none';
  if (searchBox) searchBox.style.display = 'none';

  listEl.innerHTML = '<div style="font-size:0.75rem; color:rgba(255,255,255,0.6); text-align:center; padding:16px 0;">Carregando pastas em D:\\Músicas...</div>';

  try {
    const res = await fetch('/api/ambient-audio/folders');
    const data = await res.json();
    
    if (data.ok) {
      window.ambientBaseDir = data.baseDir || 'D:\\Músicas';
      window.ambientFolders = data.folders || [];
      window.ambientRootTracks = data.rootTracks || [];
      if (pathText) pathText.textContent = window.ambientBaseDir;
      window.renderAmbientFolderView();
    } else {
      listEl.innerHTML = `<div style="font-size:0.75rem; color:#ff4d4d; text-align:center; padding:12px 0;">${data.error || 'Erro ao listar pastas.'}</div>`;
    }
  } catch (err) {
    console.error('[AMBIENT AUDIO] Erro ao carregar pastas:', err);
    listEl.innerHTML = '<div style="font-size:0.75rem; color:#ff4d4d; text-align:center; padding:12px 0;">Erro ao conectar com o estúdio.</div>';
  }
};

window.renderAmbientFolderView = function() {
  const listEl = document.getElementById('ambientTrackList');
  if (!listEl) return;

  const folders = window.ambientFolders || [];
  const rootTracks = window.ambientRootTracks || [];

  if (folders.length === 0 && rootTracks.length === 0) {
    listEl.innerHTML = `
      <div style="font-size:0.75rem; color:rgba(255,255,255,0.6); text-align:center; padding:16px 8px; line-height:1.4;">
        Nenhuma pasta ou música encontrada em<br>
        <span style="color:#00c6ff; font-family:monospace; font-size:0.7rem;">${window.ambientBaseDir || 'D:\\Músicas'}</span>
      </div>`;
    return;
  }

  listEl.innerHTML = '';

  // 1. Renderiza Pastas
  folders.forEach(folder => {
    const item = document.createElement('div');
    item.className = 'ambient-folder-item';
    item.title = `Clique para abrir a pasta ${folder.name} (${folder.trackCount} músicas)`;

    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:9px; overflow:hidden; flex:1;">
        <span style="font-size:1.15rem; flex-shrink:0;">📁</span>
        <div style="overflow:hidden; display:flex; flex-direction:column;">
          <span style="font-size:0.82rem; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${folder.name}">${folder.name}</span>
          <span style="font-size:0.68rem; color:rgba(0,198,255,0.8); font-family:monospace;">${folder.trackCount} ${folder.trackCount === 1 ? 'música' : 'músicas'}</span>
        </div>
      </div>
      <div style="flex-shrink:0; margin-left:8px;">
        <span style="font-size:0.7rem; font-weight:bold; padding:3px 8px; border-radius:5px; background:rgba(0,198,255,0.18); color:#00c6ff; border:1px solid rgba(0,198,255,0.4);">
          ABRIR ❯
        </span>
      </div>
    `;

    item.onclick = (e) => {
      e.stopPropagation();
      window.openAmbientAudioFolder(folder.name, true);
    };

    listEl.appendChild(item);
  });

  // 2. Renderiza faixas avulsas da raiz se houver
  if (rootTracks.length > 0) {
    const divider = document.createElement('div');
    divider.style.cssText = 'font-size:0.7rem; color:rgba(255,255,255,0.4); text-transform:uppercase; font-weight:bold; margin:10px 0 4px 2px;';
    divider.textContent = 'Músicas na Raiz:';
    listEl.appendChild(divider);

    rootTracks.forEach(track => {
      listEl.appendChild(window.createAmbientTrackItemElement(track));
    });
  }
};

window.openAmbientAudioFolder = async function(folderName, userTriggered = true) {
  window.ambientCurrentFolder = folderName;
  localStorage.setItem('vortex_ambient_folder', folderName);

  const listEl = document.getElementById('ambientTrackList');
  const pathText = document.getElementById('ambientPathText');
  const btnBack = document.getElementById('btnAmbientBackFolder');
  const searchBox = document.getElementById('ambientSearchContainer');
  const searchInput = document.getElementById('ambientSearchInput');

  if (pathText) pathText.textContent = `${window.ambientBaseDir || 'D:\\Músicas'} ❯ ${folderName}`;
  if (btnBack) btnBack.style.display = 'block';
  if (searchBox) searchBox.style.display = 'block';
  if (searchInput) searchInput.value = '';

  if (listEl) {
    listEl.innerHTML = `<div style="font-size:0.75rem; color:rgba(255,255,255,0.6); text-align:center; padding:16px 0;">Abrindo pasta <b>${folderName}</b>...</div>`;
  }

  try {
    const res = await fetch('/api/ambient-audio/list?folder=' + encodeURIComponent(folderName));
    const data = await res.json();
    if (data.ok && Array.isArray(data.tracks)) {
      window.ambientAudioTracks = data.tracks;
      window.renderAmbientTrackList(window.ambientAudioTracks);
    } else {
      if (listEl) listEl.innerHTML = `<div style="font-size:0.75rem; color:rgba(255,255,255,0.6); text-align:center; padding:12px 0;">Nenhuma música encontrada em ${folderName}.</div>`;
    }
  } catch (err) {
    console.error('[AMBIENT AUDIO] Erro ao carregar músicas da pasta:', err);
    if (listEl) listEl.innerHTML = '<div style="font-size:0.75rem; color:#ff4d4d; text-align:center; padding:12px 0;">Erro ao carregar pasta.</div>';
  }
};

window.backToAmbientFolders = function() {
  window.ambientCurrentFolder = null;
  localStorage.removeItem('vortex_ambient_folder');
  window.loadAmbientAudioFolders();
};

window.filterAmbientTracks = function(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) {
    window.renderAmbientTrackList(window.ambientAudioTracks);
    return;
  }
  const filtered = (window.ambientAudioTracks || []).filter(t => t.name.toLowerCase().includes(q) || t.fileName.toLowerCase().includes(q));
  window.renderAmbientTrackList(filtered, true);
};

window.createAmbientTrackItemElement = function(track) {
  const isCurrent = window.currentAmbientTrack && window.currentAmbientTrack.url === track.url;
  const isPlayingThis = isCurrent && window.isAmbientAudioPlaying;

  const item = document.createElement('div');
  item.className = `ambient-track-item ${isCurrent ? 'is-selected' : ''}`;
  item.title = `Clique para ${isPlayingThis ? 'desligar' : 'tocar'} esta música`;
  
  const sizeMb = (track.size / (1024 * 1024)).toFixed(1);

  item.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; overflow:hidden; flex:1;">
      <span style="font-size:1rem; flex-shrink:0;">${isPlayingThis ? '🎵' : '🎼'}</span>
      <div style="overflow:hidden; display:flex; flex-direction:column;">
        <span class="ambient-track-title" style="font-size:0.78rem; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${track.name}">${track.name}</span>
        <span style="font-size:0.68rem; color:rgba(255,255,255,0.45); font-family:monospace;">${track.ext.toUpperCase()} • ${sizeMb} MB</span>
      </div>
    </div>
    <div style="flex-shrink:0; margin-left:8px;">
      <span style="font-size:0.7rem; font-weight:bold; padding:2px 8px; border-radius:4px; ${isPlayingThis ? 'background:rgba(0,198,255,0.25); color:#00c6ff; border:1px solid #00c6ff;' : 'background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.5);'}">
        ${isPlayingThis ? 'TOCANDO' : 'TOCAR'}
      </span>
    </div>
  `;

  item.onclick = (e) => {
    e.stopPropagation();
    window.selectAmbientAudioTrack(track.url, track.name, track.fileName, track.folder);
  };

  return item;
};

window.renderAmbientTrackList = function(tracksToRender, isFiltered = false) {
  const listEl = document.getElementById('ambientTrackList');
  if (!listEl) return;

  const tracks = tracksToRender || window.ambientAudioTracks || [];

  if (tracks.length === 0) {
    listEl.innerHTML = `
      <div style="font-size:0.75rem; color:rgba(255,255,255,0.6); text-align:center; padding:16px 8px; line-height:1.4;">
        ${isFiltered ? 'Nenhuma música corresponde ao filtro digitado.' : 'Nenhum arquivo de áudio nesta pasta.'}
      </div>`;
    return;
  }

  listEl.innerHTML = '';
  tracks.forEach(track => {
    listEl.appendChild(window.createAmbientTrackItemElement(track));
  });
};

window.selectAmbientAudioTrack = function(url, trackName, fileName, folderName) {
  const audio = document.getElementById('ambientStudioAudio');
  if (!audio) return;

  const isSameTrack = window.currentAmbientTrack && window.currentAmbientTrack.url === url;

  if (isSameTrack && window.isAmbientAudioPlaying) {
    window.toggleAmbientAudioPlayback();
    return;
  }

  window.currentAmbientTrack = { url, name: trackName, fileName, folder: folderName || window.ambientCurrentFolder || '' };
  localStorage.setItem('vortex_ambient_track', JSON.stringify(window.currentAmbientTrack));
  
  audio.src = url;
  audio.play().then(() => {
    window.isAmbientAudioPlaying = true;
    window.updateAmbientAudioUI();
    if (typeof showToast === 'function') {
      showToast(`🎧 Tocando: ${trackName}`, 'info');
    }
  }).catch(err => {
    console.error('[AMBIENT AUDIO] Erro ao reproduzir:', err);
    alert('Não foi possível reproduzir a faixa de áudio: ' + err.message);
  });
};

window.playNextAmbientTrack = function() {
  if (!window.ambientAudioTracks || window.ambientAudioTracks.length === 0) return;
  const currentIndex = window.ambientAudioTracks.findIndex(t => window.currentAmbientTrack && window.currentAmbientTrack.url === t.url);
  const nextIndex = (currentIndex + 1) % window.ambientAudioTracks.length;
  const nextTrack = window.ambientAudioTracks[nextIndex];
  if (nextTrack) {
    window.selectAmbientAudioTrack(nextTrack.url, nextTrack.name, nextTrack.fileName, nextTrack.folder);
  }
};

window.toggleAmbientAudioPlayback = function() {
  const audio = document.getElementById('ambientStudioAudio');
  if (!audio) return;

  if (window.isAmbientAudioPlaying) {
    audio.pause();
    audio.currentTime = 0; // Desliga de verdade
    window.isAmbientAudioPlaying = false;
    window.updateAmbientAudioUI();
    if (typeof showToast === 'function') {
      showToast('🔇 Som Ambiente Desligado', 'info');
    }
  } else {
    if (window.currentAmbientTrack && window.currentAmbientTrack.url) {
      if (!audio.src || audio.src === '' || audio.src === window.location.href) {
        audio.src = window.currentAmbientTrack.url;
      }
      audio.play().then(() => {
        window.isAmbientAudioPlaying = true;
        window.updateAmbientAudioUI();
      }).catch(err => {
        console.error('[AMBIENT AUDIO] Erro ao ligar áudio:', err);
      });
    } else {
      window.toggleAmbientAudioDropdown(true);
    }
  }
};

window.setAmbientAudioVolume = function(val) {
  const numVal = parseFloat(val);
  window.ambientAudioVolume = numVal;
  
  const audio = document.getElementById('ambientStudioAudio');
  if (audio) audio.volume = numVal;

  const volLabel = document.getElementById('ambientVolumeValue');
  if (volLabel) volLabel.textContent = `${Math.round(numVal * 100)}%`;

  localStorage.setItem('vortex_ambient_volume', String(numVal));
};

window.updateAmbientAudioUI = function() {
  const btn = document.getElementById('btnAmbientAudio');
  const icon = document.getElementById('ambientAudioIcon');
  const label = document.getElementById('ambientAudioLabel');
  const toggleBtn = document.getElementById('btnToggleAmbientPlayback');
  const trackNameDisplay = document.getElementById('ambientCurrentTrackName');

  if (window.isAmbientAudioPlaying) {
    if (btn) {
      btn.classList.add('is-playing');
      btn.title = `Música Ambiente Tocando: ${window.currentAmbientTrack ? window.currentAmbientTrack.name : ''}`;
    }
    if (icon) icon.textContent = '🔊';
    if (label) label.textContent = 'SOM';
    if (toggleBtn) {
      toggleBtn.textContent = 'LIGADO';
      toggleBtn.style.background = 'rgba(0, 198, 255, 0.25)';
      toggleBtn.style.borderColor = '#00c6ff';
      toggleBtn.style.color = '#00c6ff';
      toggleBtn.style.boxShadow = '0 0 10px rgba(0, 198, 255, 0.4)';
    }
    if (trackNameDisplay) {
      trackNameDisplay.textContent = window.currentAmbientTrack ? window.currentAmbientTrack.name : 'Música Ativa';
    }
  } else {
    if (btn) {
      btn.classList.remove('is-playing');
      btn.title = 'Música Ambiente do Estúdio (Desligado)';
    }
    if (icon) icon.textContent = '🔇';
    if (label) label.textContent = 'SOM';
    if (toggleBtn) {
      toggleBtn.textContent = 'DESLIGADO';
      toggleBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      toggleBtn.style.borderColor = 'rgba(255, 255, 255, 0.25)';
      toggleBtn.style.color = '#fff';
      toggleBtn.style.boxShadow = 'none';
    }
    if (trackNameDisplay) {
      trackNameDisplay.textContent = 'Nenhuma faixa tocando';
    }
  }

  // Atualiza destaque visual na lista caso esteja visível
  const listEl = document.getElementById('ambientTrackList');
  if (listEl && window.ambientCurrentFolder) {
    listEl.querySelectorAll('.ambient-track-item').forEach(el => {
      const isSelected = window.currentAmbientTrack && el.title.includes(window.currentAmbientTrack.name);
      if (isSelected) el.classList.add('is-selected');
      else el.classList.remove('is-selected');
    });
  }
};

// Inicialização automática ao carregar o DOM
document.addEventListener('DOMContentLoaded', () => {
  window.initAmbientStudioAudio();
});

