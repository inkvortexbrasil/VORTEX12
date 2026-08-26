/**
 * MULTIVERSO SOCIAL — MIXER & FATIADOR DE VÍDEOS SOCIAL
 * VORTEX 12.0 — Estúdio InkVortex Brasil
 * Arquitetura de 3 Colunas: Lote | Direta | Player
 */

window.socialMixerState = {
  directVideos: [],
  directAudios: [],
  batchVideos: [],
  batchAudios: [],
  finalVideos: [],
  
  selectedBatchVideo: null,
  selectedBatchAudio: null,
  selectedDirectVideo: null,
  selectedDirectAudio: null,

  batchTarget: 'both', // 'video' | 'audio' | 'both'
  qualityProfile: 'fast_remux',
  
  activeJob: null,
  pollTimer: null,
  finalVideoUrl: null
};

window.openSocialRoom = async function() {
  try {
    window.switchMultiverseRoom('socialMediaView', 'btnNavSocial');
    if (typeof window.updateTopbarTitle === 'function') {
      window.updateTopbarTitle('🌐 Multiverso Social', '3 Colunas: Fatiar em Lote ➔ Mixagem Direta ➔ Player Final (19 Minutos)');
    }
    
    const isFirstLoad = !document.getElementById('batchVideoContainer');
    
    window.renderSocialRoomLayout();
    
    if (isFirstLoad || !window.socialMixerState.pollTimer) {
      await window.loadSocialSources();
    }
  } catch (err) {
    console.error('[MULTIVERSO SOCIAL] Erro ao abrir sala:', err);
  }
};

window.closeSocialRoom = function() {
  const room = document.getElementById('socialMediaView');
  if (room) room.style.display = 'none';
  const welcome = document.getElementById('multiverseWelcome');
  if (welcome) welcome.style.display = 'flex';
  if (window.highlightActiveRoom) window.highlightActiveRoom(null);
  if (window.socialMixerState.pollTimer) {
    clearInterval(window.socialMixerState.pollTimer);
    window.socialMixerState.pollTimer = null;
  }
};

window.renderSocialRoomLayout = function() {
  const container = document.getElementById('socialMediaView');
  if (!container) return;
  
  if (document.getElementById('batchVideoContainer')) return; // Mantém a DOM intacta se já foi renderizada

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; height: calc(100% - 80px); width: 100%; margin-top: 80px;">
      
      <!-- COLUNA 1: FATIAR EM LOTE -->
      <div style="display: flex; flex-direction: column; background: transparent; border: 1px solid rgba(255, 0, 127, 0.4); box-shadow: inset 0 0 20px rgba(255, 0, 127, 0.1); border-radius: 18px; padding: 18px; gap: 12px; height: 100%;">
        <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
          <h2 style="margin: 0; font-size: 1rem; color: #ff007f; display: flex; align-items: center; gap: 8px;">
            <span style="background: rgba(255,0,127,0.2); padding: 4px 8px; border-radius: 6px;">✂️</span>
            1. FATIAR EM LOTE (19 MIN)
          </h2>
        </div>

        <div>
          <label style="font-size: 0.74rem; color: #ff007f; display: block; margin-bottom: 6px; font-weight: bold;">PASTA DE VÍDEO (D:\\Videos):</label>
          <div id="batchVideoContainer"></div>
        </div>

        <div>
          <label style="font-size: 0.74rem; color: #ff007f; display: block; margin-bottom: 6px; font-weight: bold;">PASTA DE ÁUDIO (D:\\Musicas):</label>
          <div id="batchAudioContainer"></div>
        </div>

        <div style="background: rgba(0,0,0,0.3); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); margin-top: 10px;">
          <label style="font-size: 0.72rem; color: rgba(255,255,255,0.75); display: block; margin-bottom: 8px; font-weight: bold;">DESTINO DAS FATIAS:</label>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="font-size: 0.76rem; display: flex; align-items: center; gap: 6px; cursor: pointer; color: #fff;">
              <input type="radio" name="batchTargetRadio" value="both" checked onchange="window.socialMixerState.batchTarget = this.value;">
              <span>📁 Ambos (Vídeo Social / Audio Social)</span>
            </label>
            <label style="font-size: 0.76rem; display: flex; align-items: center; gap: 6px; cursor: pointer; color: #00c6ff;">
              <input type="radio" name="batchTargetRadio" value="video" onchange="window.socialMixerState.batchTarget = this.value;">
              <span>🎬 Apenas Vídeo ➔ <b>D:\\Video Social</b></span>
            </label>
            <label style="font-size: 0.76rem; display: flex; align-items: center; gap: 6px; cursor: pointer; color: #ff007f;">
              <input type="radio" name="batchTargetRadio" value="audio" onchange="window.socialMixerState.batchTarget = this.value;">
              <span>🎵 Apenas Trilha ➔ <b>D:\\Audio Social</b></span>
            </label>
          </div>
        </div>

        <div id="batchProgressBox" style="display: none; background: rgba(0,0,0,0.6); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,0,127,0.4); box-shadow: 0 4px 20px rgba(255,0,127,0.15); margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 6px;">
            <span id="batchProgressStatus" style="color: #ff007f; font-weight: bold;">Processando...</span>
            <span id="batchProgressPercent" style="font-family: monospace; color: #fff; font-weight: bold;">0%</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
            <div id="batchProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #ff007f, #ff66b2); transition: width 0.3s;"></div>
          </div>
        </div>

        <div style="margin-top: auto;">
          <button id="batchActionBtn" onclick="window.startSocialBatchSplit()" style="width: 100%; padding: 14px; background: linear-gradient(90deg, #d500f9, #ff007f); color: #fff; border: none; border-radius: 8px; font-weight: bold; font-size: 0.9rem; cursor: pointer; text-shadow: 0 1px 3px rgba(0,0,0,0.5); box-shadow: 0 4px 15px rgba(255,0,127,0.3); transition: transform 0.1s;">
            ✂️ INICIAR FATIAMENTO EM LOTE
          </button>
        </div>
      </div>

      <!-- COLUNA 2: MIXAGEM DIRETA -->
      <div style="display: flex; flex-direction: column; background: transparent; border: 1px solid rgba(0, 198, 255, 0.4); box-shadow: inset 0 0 20px rgba(0, 198, 255, 0.1); border-radius: 18px; padding: 18px; gap: 12px; height: 100%;">
        <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
          <h2 style="margin: 0; font-size: 1rem; color: #00c6ff; display: flex; align-items: center; gap: 8px;">
            <span style="background: rgba(0,198,255,0.2); padding: 4px 8px; border-radius: 6px;">⚡</span>
            2. MIXAGEM DIRETA (19 MIN)
          </h2>
        </div>

        <div>
          <label style="font-size: 0.74rem; color: #00c6ff; display: block; margin-bottom: 6px; font-weight: bold;">PASTA DE VÍDEO PRONTO (D:\\Video Social):</label>
          <div id="directVideoContainer"></div>
        </div>

        <div>
          <label style="font-size: 0.74rem; color: #00c6ff; display: block; margin-bottom: 6px; font-weight: bold;">PASTA DE ÁUDIO PRONTO (D:\\Audio Social):</label>
          <div id="directAudioContainer"></div>
        </div>



        <div id="mixProgressBox" style="display: none; background: rgba(0,0,0,0.6); padding: 12px; border-radius: 10px; border: 1px solid rgba(0,198,255,0.4); box-shadow: 0 4px 20px rgba(0,198,255,0.15); margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 6px;">
            <span id="mixProgressStatus" style="color: #00c6ff; font-weight: bold;">Processando...</span>
            <span id="mixProgressPercent" style="font-family: monospace; color: #fff; font-weight: bold;">0%</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
            <div id="mixProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #00c6ff, #0072ff); transition: width 0.3s;"></div>
          </div>
        </div>

        <div style="margin-top: auto;">
          <button id="directActionBtn" onclick="window.startSocialDirectMix()" style="width: 100%; padding: 14px; background: linear-gradient(90deg, #00c6ff, #10b981); color: #fff; border: none; border-radius: 8px; font-weight: bold; font-size: 0.9rem; cursor: pointer; text-shadow: 0 1px 3px rgba(0,0,0,0.5); box-shadow: 0 4px 15px rgba(0,255,136,0.3); transition: transform 0.1s;">
            🎬 INICIAR MIXAGEM SOCIAL
          </button>
        </div>
      </div>

      <!-- COLUNA 3: PLAYER FINAL -->
      <div style="display: flex; flex-direction: column; background: transparent; border: 1px solid rgba(16, 185, 129, 0.4); box-shadow: inset 0 0 20px rgba(16, 185, 129, 0.1); border-radius: 18px; padding: 18px; gap: 12px; height: 100%;">
        <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
          <h2 style="margin: 0; font-size: 1rem; color: #10b981; display: flex; align-items: center; gap: 8px;">
            <span style="background: rgba(16,185,129,0.2); padding: 4px 8px; border-radius: 6px;">▶️</span>
            3. VÍDEO FINAL
          </h2>
          <button onclick="window.hidePlayer()" title="Fechar vídeo e liberar arquivo no Windows" style="background: rgba(255,50,50,0.2); color: #ff5555; border: 1px solid rgba(255,50,50,0.5); border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; cursor: pointer; font-weight: bold; transition: 0.2s;">
            ❌ DESCARREGAR
          </button>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; background: transparent; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); position: relative;">
          <video id="finalSocialPlayer" controls style="width: 100%; height: 100%; object-fit: contain; display: none;"></video>
          <div id="finalSocialPlaceholder" style="color: rgba(255,255,255,0.4); font-size: 0.8rem; text-align: center; padding: 20px;">
            <span style="font-size: 2rem; display: block; margin-bottom: 10px;">🍿</span>
            O vídeo final mixado<br>aparecerá aqui.
          </div>
        </div>

        <div id="finalVideoContainer" style="margin-top: auto;"></div>

      </div>
    </div>
  `;
};

window.loadSocialSources = async function() {
  try {
    const res = await fetch('/api/social-mixer/sources');
    const data = await res.json();
    if (data.ok) {
      window.socialMixerState.batchVideos = data.batchVideos || [];
      window.socialMixerState.batchAudios = data.batchAudios || [];
      window.socialMixerState.directVideos = data.directVideos || [];
      window.socialMixerState.directAudios = data.directAudios || [];
      window.socialMixerState.finalVideos = data.finalVideos || [];
      window.renderSocialSourceDropdowns();
    }
  } catch (err) {
    console.error('[SOCIAL MIXER] Erro ao carregar fontes:', err);
  }
};

function createCascadingSelectors(containerId, list, colorStyle, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  
  let selectedPath = [];
  
  function renderLevel(levelIndex) {
    while (container.children.length > levelIndex) {
      container.removeChild(container.lastChild);
    }
    
    const prefix = selectedPath.length > 0 ? selectedPath.join(' / ') + ' / ' : '';
    const matchingItems = list.filter(item => prefix === '' || item.name.startsWith(prefix));
    
    if (matchingItems.length === 0) {
      onSelect(null);
      return;
    }
    
    const folders = new Set();
    const files = [];
    
    matchingItems.forEach(item => {
      const remainder = prefix === '' ? item.name : item.name.substring(prefix.length);
      if (remainder.includes(' / ')) {
        folders.add(remainder.split(' / ')[0]);
      } else {
        files.push(item);
      }
    });
    
    const sortedFolders = Array.from(folders).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const sortedFiles = files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    
    if (sortedFolders.length === 0 && sortedFiles.length === 0) {
      onSelect(null);
      return;
    }
    
    const select = document.createElement('select');
    select.style.width = '100%';
    select.style.padding = '10px';
    select.style.background = 'rgba(0,0,0,0.5)';
    select.style.border = colorStyle;
    select.style.borderRadius = '6px';
    select.style.color = '#fff';
    select.style.fontSize = '0.8rem';
    select.style.outline = 'none';
    select.style.cursor = 'pointer';
    select.style.marginTop = levelIndex > 0 ? '6px' : '0px';
    
    let html = `<option value="">-- Selecione --</option>`;
    sortedFolders.forEach(f => {
      html += `<option value="FOLDER:${f}">📁 ${f}</option>`;
    });
    sortedFiles.forEach(f => {
      html += `<option value="FILE:${f.filePath}" title="${f.name}">📄 ${f.name.split(' / ').pop()} (${f.durationFormatted})</option>`;
    });
    
    select.innerHTML = html;
    select.onchange = (e) => {
      const val = e.target.value;
      if (!val) {
        selectedPath = selectedPath.slice(0, levelIndex);
        renderLevel(levelIndex + 1);
        onSelect(null);
      } else if (val.startsWith('FOLDER:')) {
        const folderName = val.substring(7);
        selectedPath = selectedPath.slice(0, levelIndex);
        selectedPath.push(folderName);
        onSelect(null);
        renderLevel(levelIndex + 1);
      } else if (val.startsWith('FILE:')) {
        onSelect(val.substring(5));
        while (container.children.length > levelIndex + 1) {
          container.removeChild(container.lastChild);
        }
      }
    };
    container.appendChild(select);
  }
  
  renderLevel(0);
}

window.renderSocialSourceDropdowns = function() {
  const s = window.socialMixerState;
  
  createCascadingSelectors('batchVideoContainer', s.batchVideos, '1px solid rgba(255,0,127,0.3)', filePath => {
    s.selectedBatchVideo = filePath ? s.batchVideos.find(v => v.filePath === filePath) : null;
  });
  
  createCascadingSelectors('batchAudioContainer', s.batchAudios, '1px solid rgba(255,0,127,0.3)', filePath => {
    s.selectedBatchAudio = filePath ? s.batchAudios.find(a => a.filePath === filePath) : null;
  });

  createCascadingSelectors('directVideoContainer', s.directVideos, '1px solid rgba(0,198,255,0.3)', filePath => {
    s.selectedDirectVideo = filePath ? s.directVideos.find(v => v.filePath === filePath) : null;
  });

  createCascadingSelectors('directAudioContainer', s.directAudios, '1px solid rgba(0,198,255,0.3)', filePath => {
    s.selectedDirectAudio = filePath ? s.directAudios.find(a => a.filePath === filePath) : null;
  });

  createCascadingSelectors('finalVideoContainer', s.finalVideos, '1px solid rgba(16,185,129,0.5)', filePath => {
    if (filePath) {
      window.showPlayer(`/api/social-media/file?path=${encodeURIComponent(filePath)}`);
    } else {
      window.hidePlayer();
    }
  });
};

// ==========================================
// FATIAR EM LOTE (BATCH SPLIT)
// ==========================================
window.startSocialBatchSplit = async function() {
  const { selectedBatchVideo, selectedBatchAudio, batchTarget } = window.socialMixerState;

  if (batchTarget === 'video' && !selectedBatchVideo) return alert('Selecione um vídeo na Coluna 1 para fatiar.');
  if (batchTarget === 'audio' && !selectedBatchAudio) return alert('Selecione um áudio na Coluna 1 para fatiar.');
  if (batchTarget === 'both' && (!selectedBatchVideo || !selectedBatchAudio)) return alert('Selecione um vídeo e um áudio para fatiar ambos.');

  const btn = document.getElementById('batchActionBtn');
  const dBtn = document.getElementById('directActionBtn');
  
  if (btn) { btn.disabled = true; btn.innerText = '⏳ FATIANDO...'; btn.style.opacity = '0.6'; }
  if (dBtn) dBtn.disabled = true;
  
  showProgressBox(true, 'batch');

  try {
    const payload = {
      type: batchTarget,
      videoPath: selectedBatchVideo ? selectedBatchVideo.filePath : null,
      audioPath: selectedBatchAudio ? selectedBatchAudio.filePath : null,
      segmentDuration: 19 * 60
    };

    const res = await fetch('/api/social-mixer/batch-split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.ok || !data.job) throw new Error(data.error || 'Falha ao iniciar fatiamento');

    pollJob(data.job.id, 'batch');
  } catch (err) {
    alert(`Erro ao iniciar fatiamento: ${err.message}`);
    resetButtons();
  }
};

// ==========================================
// MIXAGEM DIRETA (DIRECT MIX)
// ==========================================
window.startSocialDirectMix = async function() {
  const { selectedDirectVideo, selectedDirectAudio, qualityProfile } = window.socialMixerState;
  
  if (!selectedDirectVideo || !selectedDirectAudio) {
    return alert('Selecione um vídeo e um áudio prontos para mixar.');
  }

  const btn = document.getElementById('directActionBtn');
  const bBtn = document.getElementById('batchActionBtn');

  if (btn) { btn.disabled = true; btn.innerText = '⏳ MIXANDO...'; btn.style.opacity = '0.6'; }
  if (bBtn) bBtn.disabled = true;
  
  showProgressBox(true, 'mix');
  window.hidePlayer();

  try {
    const payload = {
      videoPath: selectedDirectVideo.filePath,
      audioPath: selectedDirectAudio.filePath,
      startTime: 0,
      duration: 19 * 60,
      qualityProfile: 'fast_remux'
    };

    const res = await fetch('/api/social-mixer/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.ok || !data.job) throw new Error(data.error || 'Falha ao iniciar trabalho');

    pollJob(data.job.id, 'mix');
  } catch (err) {
    alert(`Erro ao iniciar mixagem: ${err.message}`);
    resetButtons();
  }
};

// ==========================================
// HELPER FUNCS
// ==========================================
function showProgressBox(show, type) {
  const bBox = document.getElementById('batchProgressBox');
  const mBox = document.getElementById('mixProgressBox');
  
  if (bBox) bBox.style.display = (show && type === 'batch') ? 'block' : 'none';
  if (mBox) mBox.style.display = (show && type === 'mix') ? 'block' : 'none';
}

function updateProgressUI(statusText, percent, type) {
  const prefix = type === 'batch' ? 'batch' : 'mix';
  const boxEl = document.getElementById(`${prefix}ProgressBox`);
  const statusEl = document.getElementById(`${prefix}ProgressStatus`);
  const pctEl = document.getElementById(`${prefix}ProgressPercent`);
  const barEl = document.getElementById(`${prefix}ProgressBar`);
  
  if (boxEl && boxEl.style.display === 'none') {
    boxEl.style.display = 'block';
  }
  
  if (statusEl) statusEl.innerText = statusText;
  if (pctEl) pctEl.innerText = `${percent}%`;
  if (barEl) barEl.style.width = `${percent}%`;
}

function resetButtons() {
  const bBtn = document.getElementById('batchActionBtn');
  const dBtn = document.getElementById('directActionBtn');
  if (bBtn) { bBtn.disabled = false; bBtn.innerText = '✂️ INICIAR FATIAMENTO EM LOTE'; bBtn.style.opacity = '1'; }
  if (dBtn) { dBtn.disabled = false; dBtn.innerText = '🎬 INICIAR MIXAGEM SOCIAL'; dBtn.style.opacity = '1'; }
}

function pollJob(jobId, jobType) {
  let isDone = false;
  
  const checkStatus = async () => {
    if (isDone) return;
    try {
      const res = await fetch(`/api/social-mixer/job-status?jobId=${jobId}&_=${Date.now()}`);
      const data = await res.json();
      
      if (data.ok && data.job) {
        const job = data.job;
        updateProgressUI(job.currentStep || 'Processando...', job.progress, jobType);

        if (job.status === 'done') {
          isDone = true;
          window.socialMixerState.pollTimer = null;
          
          if (jobType === 'batch') {
            updateProgressUI('✅ Fatiamento Concluído!', 100, jobType);
            alert(`🎉 Fatiamento em Lote finalizado!\nVídeos: ${job.generatedVideos ? job.generatedVideos.length : 0}\nÁudios: ${job.generatedAudios ? job.generatedAudios.length : 0}`);
          } else {
            updateProgressUI('✅ Mixagem Concluída!', 100, jobType);
            window.showPlayer(`/api/social-media/file?path=${encodeURIComponent(job.finalFilePath)}`);
          }
          
          resetButtons();
          await window.loadSocialSources();
          return;
        } else if (job.status === 'error') {
          isDone = true;
          window.socialMixerState.pollTimer = null;
          
          updateProgressUI(`❌ Erro: ${job.error}`, 0, jobType);
          resetButtons();
          return;
        }
      }
    } catch (_) {}
    
    if (!isDone) {
      window.socialMixerState.pollTimer = setTimeout(checkStatus, 250);
    }
  };

  if (window.socialMixerState.pollTimer) {
    clearTimeout(window.socialMixerState.pollTimer);
  }
  checkStatus();
}

window.showPlayer = function(url) {
  const player = document.getElementById('finalSocialPlayer');
  const placeholder = document.getElementById('finalSocialPlaceholder');
  if (player && placeholder) {
    placeholder.style.display = 'none';
    player.style.display = 'block';
    player.src = url;
    player.play().catch(e => console.log('Autoplay bloqueado', e));
  }
}

window.hidePlayer = function() {
  const player = document.getElementById('finalSocialPlayer');
  const placeholder = document.getElementById('finalSocialPlaceholder');
  if (player && placeholder) {
    player.style.display = 'none';
    player.pause();
    player.removeAttribute('src');
    player.load(); // Força o navegador a soltar o arquivo (destrói o Stream do Node.js)
    placeholder.style.display = 'block';
  }
}
