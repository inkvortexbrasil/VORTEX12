(function initializeLivingStage() {
  'use strict';

  const RETURN_DELAY_MS = 480;
  const PORTAL_VIDEO_STORAGE_KEY = 'vortexLivingStageVideoV1';
  const DEFAULT_PORTAL_VIDEO = '/palco/00-portal-vivo-inkvortex.mp4';
  let returnTimer = null;

  function elements() {
    return {
      trigger: document.getElementById('livingStageTrigger'),
      layer: document.getElementById('livingStageLayer'),
      video: document.getElementById('livingStageVideo'),
      close: document.getElementById('livingStageClose')
    };
  }

  function normalizePortalVideoUrl(value) {
    try {
      const parsed = new URL(String(value || ''), window.location.origin);
      if (parsed.origin !== window.location.origin) return '';
      if (!parsed.pathname.startsWith('/palco/')) return '';
      if (!/\.(mp4|webm)$/i.test(parsed.pathname)) return '';
      return parsed.pathname;
    } catch (_) {
      return '';
    }
  }

  function getSelectedPortalVideo() {
    try {
      return normalizePortalVideoUrl(window.localStorage.getItem(PORTAL_VIDEO_STORAGE_KEY)) || DEFAULT_PORTAL_VIDEO;
    } catch (_) {
      return DEFAULT_PORTAL_VIDEO;
    }
  }

  function refreshPortalVideoSelection(selectedUrl) {
    document.querySelectorAll('[data-portal-video-url]').forEach(card => {
      let cardUrl = '';
      try {
        cardUrl = normalizePortalVideoUrl(decodeURIComponent(card.dataset.portalVideoUrl || ''));
      } catch (_) {
        cardUrl = '';
      }
      const isSelected = cardUrl === selectedUrl;
      card.classList.toggle('is-selected', isSelected);
      const selector = card.querySelector('[data-portal-video-selector]');
      const check = card.querySelector('.portal-video-check');
      const state = card.querySelector('.portal-video-state');
      if (selector) selector.setAttribute('aria-pressed', String(isSelected));
      if (check) check.textContent = isSelected ? '✓' : '';
      if (state) state.textContent = isSelected ? 'PORTAL ATIVO' : 'SELECIONAR';
    });
  }

  function applyPortalVideo(value, options = {}) {
    const selectedUrl = normalizePortalVideoUrl(value);
    if (!selectedUrl) return false;

    const { video } = elements();
    if (!video) return false;

    const currentUrl = normalizePortalVideoUrl(video.currentSrc || video.getAttribute('src') || video.src);
    if (currentUrl !== selectedUrl) {
      video.pause();
      video.setAttribute('src', selectedUrl);
      video.load();
    }

    if (options.persist !== false) {
      try {
        window.localStorage.setItem(PORTAL_VIDEO_STORAGE_KEY, selectedUrl);
      } catch (_) {
        // A seleção continua válida durante a sessão mesmo sem armazenamento local.
      }
    }

    refreshPortalVideoSelection(selectedUrl);
    if (options.announce && typeof window.showToast === 'function') {
      window.showToast('Viagem do Portal selecionada.', 'success');
    }
    return true;
  }

  function normalizeMinisserieNumber(value) {
    const match = String(value ?? '').match(/\d+/);
    if (!match) return '';
    return String(Number(match[0])).padStart(2, '0');
  }

  async function openMinisserie01InAcervo() {
    if (typeof window.openDocumentarios === 'function') {
      await window.openDocumentarios();
    }
    if (typeof window.switchDocTab === 'function') {
      await window.switchDocTab('acervo');
    }

    const documentaries = typeof AppState !== 'undefined' && Array.isArray(AppState.documentaries)
      ? AppState.documentaries
      : [];
    const minisserie01Index = documentaries.findIndex(doc => normalizeMinisserieNumber(
      doc && (doc.docNumStr || doc.docId || doc.docFolder || doc.number || doc.id)
    ) === '01');

    if (minisserie01Index < 0 || typeof window.openAcervoDocCard !== 'function') return;

    window.openAcervoDocCard(minisserie01Index);

    const acervoPlayer = document.querySelector('#acervoRenderStage video');
    if (!acervoPlayer) return;

    const videoSource = acervoPlayer.currentSrc || acervoPlayer.getAttribute('src') || acervoPlayer.src;
    if (!videoSource) return;



    try {
      acervoPlayer.muted = false;
      acervoPlayer.volume = 1;
      await acervoPlayer.play();
    } catch (error) {
      console.warn('O player da Minissérie 01 foi aberto e aguarda o comando Play:', error);
    }
  }

  function finishPortalExperience(destination = 'dashboard') {
    const { layer, video } = elements();
    if (!layer || !video) return;

    layer.classList.remove('is-active');
    layer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('living-stage-active');

    window.clearTimeout(returnTimer);
    returnTimer = window.setTimeout(async () => {
      video.pause();
      video.currentTime = 0;

      if (destination === 'acervo') {
        await openMinisserie01InAcervo();
      }
    }, RETURN_DELAY_MS);
  }

  async function startPortalExperience() {
    const { layer, video } = elements();
    if (!layer || !video || document.body.classList.contains('living-stage-active')) return;

    window.clearTimeout(returnTimer);
    applyPortalVideo(getSelectedPortalVideo(), { persist: false });
    video.pause();
    video.currentTime = 0;
    video.muted = false;
    video.volume = 1;

    document.body.classList.add('living-stage-active');
    layer.setAttribute('aria-hidden', 'false');
    layer.classList.add('is-active');

    try {
      await video.play();
    } catch (error) {
      console.error('Portal Vivo não pôde iniciar:', error);
      finishPortalExperience('dashboard');
      window.alert('O Portal Vivo não pôde iniciar. Tente clicar novamente.');
    }
  }

  function bindLivingStage() {
    const { trigger, video, close } = elements();
    if (!trigger || !video || !close) return;

    trigger.addEventListener('click', startPortalExperience);
    close.addEventListener('click', () => finishPortalExperience('dashboard'));
    video.addEventListener('ended', () => finishPortalExperience('acervo'));
    video.addEventListener('error', () => {
      const failedUrl = normalizePortalVideoUrl(video.currentSrc || video.getAttribute('src') || video.src);
      if (failedUrl && failedUrl !== DEFAULT_PORTAL_VIDEO) {
        applyPortalVideo(DEFAULT_PORTAL_VIDEO, { persist: true });
      }
      if (document.body.classList.contains('living-stage-active')) {
        finishPortalExperience('dashboard');
        window.alert(failedUrl !== DEFAULT_PORTAL_VIDEO
          ? 'O vídeo selecionado não está disponível. O Portal 00 foi restaurado como padrão.'
          : 'O arquivo do Portal Vivo não está disponível.');
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains('living-stage-active')) {
        finishPortalExperience('dashboard');
      }
    });

    applyPortalVideo(getSelectedPortalVideo(), { persist: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindLivingStage, { once: true });
  } else {
    bindLivingStage();
  }

  window.startLivingStage = startPortalExperience;
  window.stopLivingStage = () => finishPortalExperience('dashboard');
  window.getSelectedLivingStageVideo = getSelectedPortalVideo;
  window.selectLivingStageVideo = value => applyPortalVideo(value, { persist: true, announce: true });
})();
