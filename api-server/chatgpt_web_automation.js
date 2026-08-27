// Robo ChatGPT Web independente do Robo Gemini.
// Fase 1: gera todos os prompts da fila, sem downloads.
// Fase 2: baixa as imagens concluídas em ordem.
const { addExtra } = require('puppeteer-extra');
const puppeteer = addExtra(require('puppeteer-core'));
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const browserExtensionBridge = require('./browser_extension_bridge');
const robotManifest = require('./robot_manifest');

puppeteer.use(StealthPlugin());

const { FILES_ROOT } = require('./utils/paths');
const ROOT = FILES_ROOT;
const CHATGPT_ACCOUNTS = Object.freeze({
  'chatgpt-1': { id: 'chatgpt-1', label: 'ChatGPT' }
});
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function isGenerationBusyLabel(value) {
  const label = String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return label.includes('stop-button')
    || label.includes('stop generating')
    || label.includes('stop streaming')
    || label.includes('stop responding')
    || label.includes('parar de gerar')
    || label.includes('parar resposta')
    || label.includes('parar de responder')
    || label === 'parar'
    || label === 'stop';
}

function isQuotaExhaustedMessage(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return [
    'quota',
    'rate limit',
    'usage limit',
    'image generation limit',
    'you have reached your limit',
    "you've reached your limit",
    'limite de uso',
    'limite de geração',
    'atingiu seu limite',
    'atingiu o limite'
  ].some(marker => text.includes(marker));
}

function quotaExhaustedError(provider) {
  const error = new Error(`Cota de imagens do ${provider} esgotada; as posições sem arquivo físico permanecem disponíveis para uma nova rodada ou outro provedor.`);
  error.code = 'ROBOT_QUOTA_EXHAUSTED';
  return error;
}

function isBrowserControlDetachedError(error) {
  const detachReason = browserExtensionBridge.status().lastUnexpectedDetach?.reason || '';
  const detail = `${error?.message || ''} ${error?.name || ''} ${detachReason}`.toLowerCase();
  return detail.includes('detached frame')
    || detail.includes('canceled_by_user')
    || detail.includes('target closed')
    || detail.includes('session closed')
    || detail.includes('connection closed')
    || detail.includes('bridge-disconnected')
    || detail.includes('sessao de controle da guia')
    || detail.includes('session with given id not found');
}

function browserControlDetachedError(error) {
  const detachReason = browserExtensionBridge.status().lastUnexpectedDetach?.reason;
  const suffix = detachReason ? ` (${detachReason})` : '';
  const wrapped = new Error(
    `A guia do ChatGPT perdeu o controle da Ponte VORTEX${suffix}. `
    + 'Feche o DevTools e nao cancele a faixa de controle do Edge antes de reiniciar o robo. '
    + 'O prompt nao sera reenviado automaticamente.'
  );
  wrapped.code = 'CHATGPT_BROWSER_DETACHED';
  wrapped.cause = error;
  return wrapped;
}

function throwIfBrowserControlDetached(error) {
  if (isBrowserControlDetachedError(error)) throw browserControlDetachedError(error);
}

function isExplicitSendControl(control) {
  const testId = String(control?.testId || '').trim().toLowerCase();
  const label = String(control?.label || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (testId === 'send-button' || testId === 'composer-send-button') return true;
  return label === 'enviar'
    || label === 'send'
    || label.startsWith('enviar prompt')
    || label.startsWith('enviar mensagem')
    || label.startsWith('send prompt')
    || label.startsWith('send message');
}

function normalizeAccountId(value) {
  return 'chatgpt-1';
}

function accountInfo(value) {
  return CHATGPT_ACCOUNTS[normalizeAccountId(value)];
}

async function connectAccountBrowser() {
  return browserExtensionBridge.connectPuppeteer(puppeteer, {
    platform: 'chatgpt',
    defaultViewport: null
  });
}

async function testCurrentChromeTab() {
  const browser = await browserExtensionBridge.connectPuppeteer(puppeteer, {
    defaultViewport: null
  });
  try {
    const pages = await browser.pages();
    const page = pages.find(candidate => candidate.url().includes('chatgpt.com')) || pages[0];
    if (!page) throw new Error('A Ponte VORTEX conectou, mas nenhuma pagina foi disponibilizada.');
    return await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      composerFound: Boolean(document.querySelector('textarea, div[contenteditable="true"]'))
    }));
  } finally {
    await browser.disconnect().catch(() => {});
  }
}

function visibleRect(el) {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.top >= 0;
}

async function clickVisibleText(page, variants, timeoutMs = 7000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const targetPoint = await page.evaluate((wanted) => {
      const candidates = Array.from(document.querySelectorAll('button, [role="button"], [role="menuitem"], li, span, div'));
      const isVisible = el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && rect.top >= 0
          && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const composer = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea')).find(isVisible);
      const form = composer ? composer.closest('form') : null;
      for (const variant of wanted) {
        const needle = String(variant).trim().toLowerCase();
        const target = candidates
          .filter(el => (el.textContent || '').trim().toLowerCase() === needle && isVisible(el))
          .map(el => {
            const role = String(el.getAttribute('role') || '').toLowerCase();
            const inOpenMenu = !!el.closest('[role="menu"], [role="listbox"], [data-radix-menu-content], [data-radix-popper-content-wrapper]');
            const currentMenuItem = el.closest('.__menu-item');
            const inSubmittedMessage = !!el.closest('[data-testid="collapsible-user-message-content"], [data-testid="collapsible-user-message-root"]');
            let score = 0;
            // A interface atual do ChatGPT nao publica role="menuitem". O
            // item verdadeiro do menu + usa a classe __menu-item. Sem esta
            // prioridade, o robo pode clicar no texto "Criar imagem" de uma
            // mensagem antiga da conversa.
            if (currentMenuItem) score += 200;
            if (role === 'menuitem' || role === 'menuitemradio' || role === 'option') score += 100;
            if (inOpenMenu) score += 80;
            if (el.matches('button, [role="button"]')) score += 20;
            if (form && form.contains(el)) score -= 60;
            if (inSubmittedMessage) score -= 500;
            return { el: currentMenuItem || el, score };
          })
          .filter(item => item.score > 0)
          .sort((left, right) => right.score - left.score)[0]?.el;
        if (target) {
          const rect = target.getBoundingClientRect();
          return { variant, x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
        }
      }
      return null;
    }, variants);
    if (targetPoint) {
      await page.mouse.click(targetPoint.x, targetPoint.y);
      return targetPoint.variant;
    }
    await delay(350);
  }
  return null;
}

async function clickPlusPhysically(page) {
  const targetPoint = await page.evaluate(() => {
    const isVisible = element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && rect.top >= 0
        && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const composer = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea')).find(isVisible);
    if (!composer) return null;
    const form = composer.closest('form');
    const candidates = Array.from((form || document).querySelectorAll('button, [role="button"]'));
    const target = candidates.find(element => {
      const label = `${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''} ${element.textContent || ''}`
        .replace(/\s+/g, ' ').trim().toLowerCase();
      return isVisible(element) && (
        label.includes('adicionar arquivos e mais')
        || label.includes('adicionar arquivos')
        || label.includes('add files and more')
        || label.includes('attach files')
        || label === '+'
      );
    });
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
  });
  if (!targetPoint) {
    throw new Error('O botao + do compositor do ChatGPT nao foi encontrado.');
  }
  await page.mouse.click(targetPoint.x, targetPoint.y);
}

async function inspectComposerState(page) {
  return page.evaluate(() => {
    const isVisible = element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && rect.top >= 0
        && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const normalizeText = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const isImageModeText = text => {
      const norm = normalizeText(text);
      return norm.includes('criar imagem') || norm.includes('crie uma imagem') || norm.includes('gerar imagem') || norm.includes('create image') || norm.includes('create an image') || norm.includes('dall-e');
    };
    const extractTypedText = element => {
      if (element.matches('textarea')) return element.value || '';
      const clone = element.cloneNode(true);
      clone.querySelectorAll('button, [role="button"], [contenteditable="false"], svg').forEach(item => item.remove());
      Array.from(clone.querySelectorAll('*'))
        .filter(item => isImageModeText(item.textContent))
        .forEach(item => item.remove());
      return clone.textContent || '';
    };
    const composer = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea')).find(isVisible);
    if (!composer) {
      return { found: false, imageModeActive: false, promptLength: 0, clickPoint: null, fallbackClickPoint: null };
    }

    const composerRect = composer.getBoundingClientRect();
    const form = composer.closest('form');
    const imageModeElement = Array.from(document.querySelectorAll('button, [role="button"], span, div, a'))
      .filter(element => isImageModeText(element.textContent || element.getAttribute('aria-label') || element.getAttribute('title')) && isVisible(element))
      .find(element => {
        if (form && form.contains(element)) return true;
        const rect = element.getBoundingClientRect();
        const verticallyNear = rect.bottom >= composerRect.top - 90 && rect.top <= composerRect.bottom + 90;
        const horizontallyNear = rect.right >= composerRect.left - 320 && rect.left <= composerRect.right;
        return verticallyNear && horizontallyNear;
      }) || null;

    const chipRect = imageModeElement ? imageModeElement.getBoundingClientRect() : null;
    const leftInset = composerRect.left + 20;
    const rightInset = composerRect.right - 24;
    const afterChip = chipRect ? chipRect.right + 18 : composerRect.left + Math.max(24, composerRect.width * 0.35);
    const clickX = Math.min(rightInset, Math.max(leftInset, afterChip));
    const clickY = composerRect.top + (composerRect.height / 2);
    const rawValue = extractTypedText(composer);

    return {
      found: true,
      imageModeActive: !!imageModeElement,
      promptLength: String(rawValue || '').trim().length,
      clickPoint: { x: clickX, y: clickY },
      fallbackClickPoint: { x: Math.max(leftInset, rightInset - 40), y: clickY }
    };
  });
}

async function isImageModeActive(page) {
  const state = await inspectComposerState(page).catch(() => ({ imageModeActive: false }));
  return state.imageModeActive === true;
}

async function ensureComposerVisible(page) {
  const result = await page.evaluate((debuggerOffset) => {
    const isRendered = element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0
        && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const composer = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea'))
      .find(isRendered);
    if (!composer) return { found: false, fullyVisible: false };

    // O compositor do ChatGPT e fixo. Rolar a conversa nao compensa a faixa
    // externa de depuracao do Edge; por isso o bloco completo do formulario
    // recebe um deslocamento vertical independente do fluxo da conversa.
    const container = composer.closest('form') || composer.parentElement;
    if (!container) return { found: true, fullyVisible: false };
    container.dataset.vortexDebuggerOffset = String(debuggerOffset);
    container.style.setProperty('translate', `0 -${debuggerOffset}px`, 'important');

    const rect = container.getBoundingClientRect();
    const visualTop = window.visualViewport?.offsetTop || 0;
    const visualBottom = visualTop + (window.visualViewport?.height || window.innerHeight);

    return {
      found: true,
      pinned: true,
      fullyVisible: rect.top >= visualTop && rect.bottom <= visualBottom,
      top: rect.top,
      bottom: rect.bottom,
      visualTop,
      visualBottom
    };
  }, 64);
  await delay(250);
  return result;
}

async function releaseComposerOffset(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-vortex-debugger-offset]').forEach(container => {
      container.style.removeProperty('translate');
      delete container.dataset.vortexDebuggerOffset;
    });
  }).catch(() => {});
}

async function selectImageMode(page, onProgress, position, total) {
  const progress = Math.round(((position - 1) / total) * 55);

  // Este ciclo e intencionalmente repetido para cada imagem. Nao reaproveitar
  // o selo da imagem anterior: o ChatGPT pode manter um estado visual obsoleto.
  if (onProgress) onProgress(progress, `Imagem ${position}/${total} - passo 1/4: acionando +...`);
  await clickPlusPhysically(page);
  await delay(500);

  if (onProgress) onProgress(progress, `Imagem ${position}/${total} - passo 2/4: selecionando Criar imagem...`);
  const imageMode = await clickVisibleText(page, ['Criar imagem', 'Crie uma imagem', 'Create image', 'Create an image'], 5000);
  if (!imageMode) {
    throw new Error('O modo Criar imagem nao foi encontrado depois do clique em +.');
  }
  await delay(600);
  if (!await isImageModeActive(page)) {
    throw new Error('O modo Criar imagem nao permaneceu ativo. O prompt ainda nao foi colado.');
  }
  await ensureComposerVisible(page);

}

async function composerSelector(page) {
  return page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea'));
    const visible = candidates.find(element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && rect.top >= 0
        && style.visibility !== 'hidden' && style.display !== 'none';
    });
    if (!visible) return null;
    return visible.matches('div[contenteditable="true"]')
      ? 'div[contenteditable="true"]'
      : 'textarea';
  }).catch(() => null);
}

async function waitForComposer(page, timeoutMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const selector = await composerSelector(page);
    if (selector) {
      return selector;
    }
    await delay(1000);
  }
  throw new Error('A caixa do ChatGPT não apareceu. Faça login na conta selecionada e tente novamente.');
}

async function waitForAuthenticatedSession(page, timeoutMs = 300000, onProgress) {
  const start = Date.now();
  let lastNotice = 0;
  while (Date.now() - start < timeoutMs) {
    const state = await page.evaluate(() => {
      const body = (document.body?.innerText || '').toLowerCase();
      const url = String(location.href || '').toLowerCase();
      const composer = !!document.querySelector('textarea, div[contenteditable="true"]');
      const authPage = /login|auth|accounts\.openai|criar conta|sign up|log in|fazer login/.test(url + ' ' + body);
      return { composer, authPage };
    }).catch(() => ({ composer: false, authPage: true }));
    if (state.composer && !state.authPage) return await waitForComposer(page, 15000);
    if (onProgress && Date.now() - lastNotice > 4000) {
      onProgress(5, 'Navegador aberto: aguardando você concluir o login no ChatGPT...');
      lastNotice = Date.now();
    }
    await delay(1000);
  }
  throw new Error('Login do ChatGPT não foi confirmado. Faça o login no navegador e chame o robô novamente.');
}

async function clickComposerTextAreaPhysically(page) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const state = await inspectComposerState(page);
    if (!state.found || !state.clickPoint) {
      throw new Error('A área livre da caixa de mensagem do ChatGPT não foi encontrada.');
    }

    const clickPoint = attempt === 0 ? state.clickPoint : state.fallbackClickPoint;
    await page.mouse.click(clickPoint.x, clickPoint.y);
    await delay(250);

    const caretReady = await page.evaluate(() => {
      const isVisible = element => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && rect.top >= 0
          && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const composer = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea')).find(isVisible);
      if (!composer) return false;
      if (document.activeElement === composer || composer.contains(document.activeElement)) return true;
      const selection = window.getSelection();
      return !!(selection && selection.rangeCount > 0 && selection.anchorNode && composer.contains(selection.anchorNode));
    });
    if (caretReady) return true;
  }
  return false;
}

async function inspectSendControlState(page) {
  const snapshot = await page.evaluate(() => {
    const isVisible = element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && rect.top >= 0
        && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const composer = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea')).find(isVisible);
    if (!composer) return { composerFound: false, controls: [] };
    const form = composer.closest('form') || composer.parentElement;
    const controls = Array.from((form || document).querySelectorAll('button, [role="button"]'))
      .filter(isVisible)
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          testId: element.getAttribute('data-testid') || '',
          label: [
            element.getAttribute('aria-label'),
            element.getAttribute('title'),
            element.textContent
          ].filter(Boolean).join(' '),
          enabled: !element.disabled && element.getAttribute('aria-disabled') !== 'true',
          x: rect.left + (rect.width / 2),
          y: rect.top + (rect.height / 2)
        };
      });
    return { composerFound: true, controls };
  });
  const control = (snapshot.controls || []).find(isExplicitSendControl) || null;
  return {
    composerFound: snapshot.composerFound === true,
    found: Boolean(control),
    enabled: control?.enabled === true,
    testId: control?.testId || '',
    label: control?.label || '',
    x: control?.x || 0,
    y: control?.y || 0
  };
}

async function waitForSubmissionEvidence(page, timeoutMs = 3500) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const composerState = await inspectComposerState(page);
    if (composerState.found && composerState.promptLength === 0) return true;
    const generationState = await inspectGenerationCompletionState(page);
    if (generationState.busy) return true;
    await delay(150);
  }
  return false;
}

async function clickSendArrowPhysically(page, shouldCancel, readinessTimeoutMs = 30000) {
  const started = Date.now();
  let keyboardAttempted = false;
  let lastState = { composerFound: false, found: false, enabled: false, testId: '', label: '' };

  // Aguarda a expansao do compositor antes de medir a seta real.
  await delay(500);

  while (Date.now() - started < readinessTimeoutMs) {
    if (shouldCancel && shouldCancel()) throw new Error('__CHATGPT_CANCELLED__');

    try {
      const composerState = await inspectComposerState(page);
      if (composerState.found && composerState.promptLength === 0) return true;

      lastState = await inspectSendControlState(page);
      if (lastState.found && lastState.enabled && lastState.x > 0 && lastState.y > 0) {
        await page.mouse.click(lastState.x, lastState.y);
        if (await waitForSubmissionEvidence(page)) return true;

        // O Enter e usado uma unica vez, apenas quando a propria interface
        // confirmou que a seta explicita estava presente e habilitada.
        if (!keyboardAttempted) {
          const focused = await clickComposerTextAreaPhysically(page);
          if (focused) {
            await page.keyboard.press('Enter');
            keyboardAttempted = true;
            if (await waitForSubmissionEvidence(page)) return true;
          }
        }
      }
    } catch (error) {
      throwIfBrowserControlDetached(error);
      throw error;
    }

    await delay(250);
  }

  const detail = lastState.found
    ? `botao=${lastState.testId || lastState.label || 'identificado'}, habilitado=${lastState.enabled ? 'sim' : 'nao'}`
    : `compositor=${lastState.composerFound ? 'encontrado' : 'ausente'}, botao=nao encontrado`;
  throw new Error(
    `O botao de envio do ChatGPT nao ficou pronto em ${Math.round(readinessTimeoutMs / 1000)}s (${detail}). `
    + 'O prompt permaneceu na caixa e nao sera reenviado automaticamente.'
  );
}

async function focusComposerForDirectInput(page) {
  const state = await page.evaluate(() => {
    const isVisible = element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && rect.top >= 0
        && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const composer = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea')).find(isVisible);
    if (!composer) return { found: false, focused: false };

    composer.focus({ preventScroll: true });
    if (composer.matches('textarea')) {
      const end = String(composer.value || '').length;
      composer.setSelectionRange(end, end);
    } else {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(composer);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const selection = window.getSelection();
    const selectionInside = !!(
      selection
      && selection.rangeCount > 0
      && selection.anchorNode
      && composer.contains(selection.anchorNode)
    );
    return {
      found: true,
      focused: document.activeElement === composer || composer.contains(document.activeElement) || selectionInside
    };
  });

  if (!state?.found) {
    throw new Error('A caixa de mensagem do ChatGPT nao foi encontrada para receber o prompt.');
  }
  if (!state.focused) {
    throw new Error('A caixa de mensagem do ChatGPT nao recebeu o foco para inserir o prompt.');
  }
  return state;
}

async function insertPromptDirectly(page, prompt) {
  const client = page && typeof page._client === 'function' ? page._client() : null;
  if (!client || typeof client.send !== 'function') {
    throw new Error('A insercao direta de texto nao esta disponivel na guia controlada.');
  }
  const text = String(prompt || '');
  if (!text.trim()) throw new Error('O prompt vazio nao pode ser inserido no ChatGPT.');

  // Input.insertText dispara os eventos nativos do editor. O foco e o cursor
  // precisam estar no contenteditable real antes do comando; eventos sinteticos
  // adicionais podem dessincronizar o estado React/ProseMirror do ChatGPT.
  await focusComposerForDirectInput(page);
  await client.send('Input.insertText', { text });
}

async function countCompletedGeneratedImages(page) {
  return page.evaluate(() => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return Array.from(document.querySelectorAll('button[aria-label], [role="button"][aria-label]')).filter(element => {
      const label = normalize(element.getAttribute('aria-label'));
      return label.includes('compartilhar esta imagem') || label.includes('share this image');
    }).length;
  });
}

async function inspectGenerationCompletionState(page) {
  return page.evaluate(() => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const fingerprint = value => {
      const text = String(value || '');
      let hash = 2166136261;
      for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(36);
    };
    const controlLabel = element => normalize([
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('data-testid'),
      element.textContent
    ].filter(Boolean).join(' '));
    const isImageShareControl = element => {
      const label = controlLabel(element);
      return (label.includes('compartilhar') || label.includes('share') || label.includes('baixar') || label.includes('download'))
        && (label.includes('imagem') || label.includes('image'));
    };
    const turnIdentity = (turn, response, fallback) => {
      // O data-message-id do ChatGPT pode nascer como request-WEB:* e depois
      // virar UUID. A identidade do container da conversa permanece estável e
      // precisa ter prioridade para a mesma imagem não parecer uma imagem nova.
      const stableId = (turn && turn.getAttribute('data-turn-id'))
        || (turn && turn.getAttribute('data-testid'))
        || (turn && turn.id)
        || (response && response.getAttribute('data-message-id'))
        || (response && response.id);
      return stableId || fallback;
    };

    const completedImageTurnIds = Array.from(document.querySelectorAll(
      'button[aria-label], button[title], [role="button"][aria-label], [role="button"][title]'
    )).filter(isImageShareControl).map((control, index) => {
      const turn = control.closest('[data-testid^="conversation-turn-"], [data-turn="assistant"], article, section');
      const response = turn && turn.querySelector('[data-message-author-role="assistant"]');
      const imageContainer = control.closest('div');
      const image = (imageContainer && imageContainer.querySelector('img[src]'))
        || (turn && turn.querySelector('img[src]'));
      const imageSource = image && (image.currentSrc || image.src);
      const fallback = `image-${fingerprint(`${imageSource || ''}|${index}`)}`;
      return turnIdentity(turn, response, fallback);
    });

    const completedResponseTurnIds = [];
    Array.from(document.querySelectorAll('[data-message-author-role="assistant"]')).forEach(response => {
      const turn = response.closest('[data-testid^="conversation-turn-"], [data-turn="assistant"], article, section');
      const text = normalize(response.innerText || response.textContent);
      const responseCompleted = !!(turn || response).querySelector(
        'button[data-testid="copy-turn-action-button"], button[aria-label="Copiar resposta"], button[aria-label="Copy response"]'
      );
      if (text && responseCompleted) {
        completedResponseTurnIds.push(turnIdentity(turn, response, `message-${fingerprint(text)}`));
      }
    });

    // "Parar de responder" pode ficar fora do formulario do compositor.
    // A busca global impede o preparo do proximo prompt durante a geracao.
    const busy = Array.from(document.querySelectorAll(
      'button, [role="button"], [data-testid]'
    )).some(element => {
      const label = controlLabel(element);
      return label.includes('stop-button')
        || label.includes('stop generating')
        || label.includes('stop streaming')
        || label.includes('stop responding')
        || label.includes('parar de gerar')
        || label.includes('parar resposta')
        || label.includes('parar de responder')
        || label === 'parar'
        || label === 'stop';
    });

    const assistantResponses = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
    const latestAssistantText = assistantResponses.length
      ? normalize(assistantResponses[assistantResponses.length - 1].innerText || assistantResponses[assistantResponses.length - 1].textContent)
      : '';
    return { completedImageTurnIds, completedResponseTurnIds, busy, latestAssistantText };
  });
}

async function waitForGenerationOutcome(page, before, options = {}) {
  const pollMs = Number.isFinite(options.pollMs) ? Math.max(1, options.pollMs) : 1000;
  const settleGraceMs = Number.isFinite(options.settleGraceMs) ? Math.max(1, options.settleGraceMs) : 90000;
  const shouldCancel = options.shouldCancel;
  const previousImageIds = new Set(before.completedImageTurnIds || []);
  const previousResponseIds = new Set(before.completedResponseTurnIds || []);
  let idleSince = null;

  while (true) {
    if (shouldCancel && shouldCancel()) throw new Error('__CHATGPT_CANCELLED__');
    if (options.keepComposerVisible === true) {
      await ensureComposerVisible(page).catch(() => {});
    }
    const current = await inspectGenerationCompletionState(page);
    const newImageTurnId = (current.completedImageTurnIds || []).find(id => !previousImageIds.has(id));
    if (newImageTurnId) {
      return { kind: 'image', turnId: newImageTurnId, ...current };
    }

    if (current.busy) {
      idleSince = null;
    } else {
      const newResponseTurnId = (current.completedResponseTurnIds || []).find(id => !previousResponseIds.has(id));
      if (newResponseTurnId) {
        return { kind: 'message', turnId: newResponseTurnId, ...current };
      }
      if (idleSince === null) {
        idleSince = Date.now();
      } else if (Date.now() - idleSince >= settleGraceMs) {
        return { kind: 'uncertain', ...current };
      }
    }
    await delay(pollMs);
  }
}

async function waitForGenerationToBecomeIdle(page, shouldCancel, pollMs = 750) {
  while (true) {
    if (shouldCancel && shouldCancel()) throw new Error('__CHATGPT_CANCELLED__');
    const state = await inspectGenerationCompletionState(page);
    if (!state.busy) return state;
    await delay(pollMs);
  }
}

async function prepareComposerForNextPrompt(page, shouldCancel) {
  // Barreira obrigatoria antes do + de cada cena. Enquanto o ChatGPT exibir
  // um controle de parada, nenhum elemento do proximo prompt e preparado.
  await waitForGenerationToBecomeIdle(page, shouldCancel);
  await dismissImageShareDialog(page).catch(() => {});
  await waitForComposer(page);
  await ensureComposerVisible(page);

  let state = await inspectComposerState(page);
  if (state.promptLength > 0) {
    const recovered = await recoverComposerForNextScene(page);
    if (!recovered) {
      throw new Error('A caixa do ChatGPT permaneceu preenchida antes da proxima cena.');
    }
    state = await inspectComposerState(page);
  }
  if (!state.found || state.promptLength !== 0) {
    throw new Error('A caixa do ChatGPT nao ficou vazia para receber o proximo prompt.');
  }
}

async function sendPromptAndWait(page, prompt, onProgress, position, total, shouldCancel, onConversationReady = null) {
  await waitForComposer(page);
  await ensureComposerVisible(page);

  // Passo 1 e 2: Clica em + e seleciona "Criar imagem" no menu
  await selectImageMode(page, onProgress, position, total);

  // Passo 3: Clica na área livre da caixa de mensagem
  await clickComposerTextAreaPhysically(page).catch(() => {});

  // Passo 4: Insere o prompt diretamente
  await insertPromptDirectly(page, prompt);
  await delay(700);

  let composerState = await inspectComposerState(page);
  if (composerState.promptLength === 0) {
    throw new Error('O prompt não apareceu na caixa de mensagem depois da inserção direta. Nada foi enviado.');
  }

  const completionBefore = await inspectGenerationCompletionState(page);
  if (onProgress) onProgress(Math.round(((position - 1) / total) * 55), `Imagem ${position}/${total} - passo 3/4: espaco vazio acionado e prompt inserido...`);
  
  // Passo 5: Aciona a seta de envio (clique físico + submit + Enter)
  await clickSendArrowPhysically(page, shouldCancel);
  const currentConversationUrl = await waitForChatGPTConversationUrl(page);
  if (typeof onConversationReady === 'function') {
    await onConversationReady(currentConversationUrl);
  }
  if (onProgress) onProgress(Math.round((position / total) * 55), `Imagem ${position}/${total} - passo 4/4: seta acionada.`);

  // Passo 6: Aguarda a conclusão da geração da imagem
  if (onProgress) onProgress(Math.round((position / total) * 55), `Gerando imagem ${position}/${total} no ChatGPT...`);
  const outcome = await waitForGenerationOutcome(page, completionBefore, {
    pollMs: 1000,
    settleGraceMs: 90000,
    shouldCancel,
    keepComposerVisible: true
  });
  if (outcome.kind !== 'image') return outcome;
  await delay(1000);
  if (onProgress) onProgress(Math.round((position / total) * 55), `Imagem ${position}/${total} concluída no ChatGPT. Nenhum download foi feito ainda.`);
  return outcome;
}

async function waitForNewFile(dir, existingFiles, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await delay(700);
    const current = fs.readdirSync(dir).filter(file => !/\.(crdownload|tmp|part)$/i.test(file));
    const newFile = current.find(file => !existingFiles.includes(file));
    if (newFile) return newFile;
  }
  return null;
}

async function downloadImageInOrder(page, targetDir, sequence, onProgress, total) {
  fs.mkdirSync(targetDir, { recursive: true });
  const cdp = await page.target().createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: path.resolve(targetDir) });
  const existingFiles = fs.readdirSync(targetDir).filter(file => !/\.(crdownload|tmp|part)$/i.test(file));

  const clicked = await page.evaluate((index) => {
    const isVisible = el => { const rect = el.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && rect.top >= 0; };
    const all = Array.from(document.querySelectorAll('button, a'))
      .filter(el => {
        const label = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`.toLowerCase();
        return isVisible(el) && (label.includes('baixar') || label.includes('download')); 
      });
    if (!all[index]) return { clicked: false, total: all.length };
    all[index].click();
    return { clicked: true, total: all.length };
  }, sequence - 1);
  if (!clicked.clicked) throw new Error(`Botão de download da imagem ${sequence} não encontrado. Foram encontrados ${clicked.total}.`);

  const downloaded = await waitForNewFile(targetDir, existingFiles);
  if (!downloaded) throw new Error(`O download da imagem ${sequence} não apareceu na pasta.`);
  const targetName = `img_${String(sequence).padStart(3, '0')}.jpg`;
  const targetPath = path.join(targetDir, targetName);
  const downloadedPath = path.join(targetDir, downloaded);
  if (downloadedPath !== targetPath) {
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    fs.renameSync(downloadedPath, targetPath);
  }
  await cdp.detach().catch(() => {});
  if (onProgress) onProgress(55 + Math.round((sequence / total) * 45), `Download ${sequence}/${total} concluído.`);
}

async function startNewChat(page, onProgress) {
  const clicked = await page.evaluate(() => {
    const isVisible = el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top >= 0;
    };
    const candidates = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    const target = candidates.find(el => {
      if (!isVisible(el)) return false;
      const label = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`
        .replace(/\s+/g, ' ').trim().toLowerCase();
      return label === 'novo chat' || label === 'new chat';
    });
    if (!target) return false;
    target.click();
    return true;
  });
  if (!clicked) throw new Error('Botao Novo chat nao encontrado no ChatGPT.');
  await delay(1000);
  await waitForComposer(page, 15000);
  if (onProgress) onProgress(6, 'Novo chat aberto para esta minisserie.');
}

async function waitForChatGPTConversationUrl(page, timeoutMs = 30000, pollMs = 250) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const conversationUrl = canonicalChatGPTConversationUrl(page.url());
    if (conversationUrl) return conversationUrl;
    await delay(pollMs);
  }
  throw new Error('O ChatGPT recebeu o primeiro prompt, mas nao criou uma URL de conversa /c/... valida.');
}

function promptSequence(item, index) {
  const value = Number(item && (item.sequence || item.finalSequence || item.sceneNum));
  return Number.isInteger(value) && value > 0 ? value : index + 1;
}

function normalizePromptForCheckpoint(value) {
  return String(value || '')
    .replace(/^GPT CENA\s*#?\d+[^:\n]*:\s*/i, '')
    .replace(/^GPT CENA\s*#?\d+[^\n]*\r?\n\r?\n?/i, '')
    .replace(/^TITLE EXACT\s*:[^\n]*\r?\n\r?\n?/i, '')
    .replace(/^Prompt:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function promptFingerprint(value) {
  return crypto.createHash('sha256').update(normalizePromptForCheckpoint(value), 'utf8').digest('hex');
}

function sameChatGPTConversation(left, right) {
  try {
    const leftUrl = new URL(String(left || ''));
    const rightUrl = new URL(String(right || ''));
    return leftUrl.origin === rightUrl.origin && leftUrl.pathname === rightUrl.pathname;
  } catch (error) {
    return false;
  }
}

function selectPromptsBySequence(prompts, sequences) {
  const requested = new Set((Array.isArray(sequences) ? sequences : [])
    .map(value => Number.parseInt(value, 10))
    .filter(value => Number.isInteger(value) && value > 0));
  if (!requested.size) return prompts.slice();
  return prompts.filter((item, index) => requested.has(promptSequence(item, index)));
}

function checkpointPath(numStr, mode = 'minisseries', rootDir = ROOT) {
  const safeNumber = String(numStr);
  const suffix = mode === 'flow' ? 'flow' : 'minisseries';
  return path.join(rootDir, 'minisseries', safeNumber, 'prompts', `chatgpt_checkpoint_${safeNumber}_${suffix}.json`);
}

function validateRecoveredPromptPrefix(expectedRecoveredSequences, actuallyRecoveredSequences, requestedSequences) {
  const normalize = values => Array.from(new Set((Array.isArray(values) ? values : [])
    .map(value => Number.parseInt(value, 10))
    .filter(value => Number.isInteger(value) && value > 0)));
  const expected = normalize(expectedRecoveredSequences);
  const actual = normalize(actuallyRecoveredSequences);
  const requested = normalize(requestedSequences);
  const actualSet = new Set(actual);
  const requestedSet = new Set(requested);
  const missingExpected = expected.filter(sequence => !actualSet.has(sequence));
  if (missingExpected.length) {
    return { ok: false, missingExpected, extraSequences: [] };
  }
  if (actual.some(sequence => !requestedSet.has(sequence))) {
    return { ok: false, missingExpected: [], extraSequences: [] };
  }

  let foundGap = false;
  for (const sequence of requested) {
    if (actualSet.has(sequence)) {
      if (foundGap) return { ok: false, missingExpected: [], extraSequences: [] };
    } else {
      foundGap = true;
    }
  }

  const expectedSet = new Set(expected);
  return {
    ok: true,
    missingExpected: [],
    extraSequences: actual.filter(sequence => !expectedSet.has(sequence))
  };
}

function canonicalChatGPTConversationUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.origin !== 'https://chatgpt.com' || !url.pathname.startsWith('/c/')) return '';
    const conversationId = decodeURIComponent(url.pathname.slice(3).split('/')[0] || '');
    if (!conversationId || /^WEB:/i.test(conversationId)) return '';
    return `${url.origin}${url.pathname}`;
  } catch (error) {
    return '';
  }
}

function normalizeChatGPTConversations(parsed, generated, completed) {
  const conversations = {};
  const source = parsed && typeof parsed.conversations === 'object' && parsed.conversations
    ? parsed.conversations
    : {};
  Object.values(source).forEach(rawGroup => {
    const conversationUrl = canonicalChatGPTConversationUrl(rawGroup?.conversationUrl);
    if (!conversationUrl) return;
    conversations[conversationUrl] = {
      conversationUrl,
      generated: rawGroup && typeof rawGroup.generated === 'object' && rawGroup.generated ? rawGroup.generated : {},
      completed: rawGroup && typeof rawGroup.completed === 'object' && rawGroup.completed ? rawGroup.completed : {},
      firstSeenAt: rawGroup?.firstSeenAt || null,
      lastSeenAt: rawGroup?.lastSeenAt || null
    };
  });
  const ensureGroup = rawUrl => {
    const conversationUrl = canonicalChatGPTConversationUrl(rawUrl);
    if (!conversationUrl) return null;
    if (!conversations[conversationUrl]) {
      conversations[conversationUrl] = {
        conversationUrl,
        generated: {},
        completed: {},
        firstSeenAt: null,
        lastSeenAt: null
      };
    }
    return conversations[conversationUrl];
  };
  Object.entries(generated).forEach(([sequence, entry]) => {
    const group = ensureGroup(entry?.conversationUrl);
    if (group && !group.generated[sequence]) group.generated[sequence] = entry;
  });
  Object.entries(completed).forEach(([sequence, entry]) => {
    const group = ensureGroup(entry?.conversationUrl);
    if (group && !group.completed[sequence]) group.completed[sequence] = entry;
  });
  return conversations;
}

function ensureChatGPTConversation(checkpoint, rawUrl) {
  const conversationUrl = canonicalChatGPTConversationUrl(rawUrl);
  if (!conversationUrl) return null;
  if (!checkpoint.conversations || typeof checkpoint.conversations !== 'object') checkpoint.conversations = {};
  if (!checkpoint.conversations[conversationUrl]) {
    checkpoint.conversations[conversationUrl] = {
      conversationUrl,
      generated: {},
      completed: {},
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: null
    };
  }
  return checkpoint.conversations[conversationUrl];
}

function normalizeChatGPTCheckpoint(parsed, numStr, mode) {
  const generated = parsed && typeof parsed.generated === 'object' && parsed.generated ? parsed.generated : {};
  const completed = parsed && typeof parsed.completed === 'object' && parsed.completed ? parsed.completed : {};
  return {
    version: 3,
    number: String(numStr),
    mode,
    generated,
    completed,
    conversationUrl: String(parsed?.conversationUrl || ''),
    conversations: normalizeChatGPTConversations(parsed, generated, completed),
    updatedAt: parsed?.updatedAt || null
  };
}

function readChatGPTCheckpoint(numStr, mode = 'minisseries', rootDir = ROOT) {
  const filePath = checkpointPath(numStr, mode, rootDir);
  if (!fs.existsSync(filePath)) {
    return { version: 3, number: String(numStr), mode, generated: {}, completed: {}, conversationUrl: '', conversations: {} };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return normalizeChatGPTCheckpoint(parsed, numStr, mode);
  } catch (error) {
    const backupPath = filePath + '.bak';
    if (fs.existsSync(backupPath)) {
      try {
        return normalizeChatGPTCheckpoint(JSON.parse(fs.readFileSync(backupPath, 'utf8')), numStr, mode);
      } catch (backupError) {}
    }
    throw new Error(`O checkpoint do Robô GPT da minissérie ${numStr} está inválido.`);
  }
}

function findChatGPTResumePlan({ numStr, prompts, mode = 'minisseries', rootDir = ROOT }) {
  const queue = Array.isArray(prompts) ? prompts : [];
  const checkpoint = readChatGPTCheckpoint(numStr, mode, rootDir);
  if (!queue.length) {
    return { resumable: false, recoveredSequences: [], resumeFrom: null, conversationUrl: '' };
  }
  const requested = new Map(queue.map((item, index) => [promptSequence(item, index), item]));
  const completedSet = new Set(completedCheckpointSequences(numStr, mode, rootDir)
    .filter(sequence => requested.has(sequence)));
  const candidates = Object.values(checkpoint.conversations || {}).map(group => {
    const conversationUrl = canonicalChatGPTConversationUrl(group?.conversationUrl);
    const entries = Object.entries(group?.generated || {}).filter(([rawSequence]) => {
      const sequence = Number.parseInt(rawSequence, 10);
      return requested.has(sequence) && !completedSet.has(sequence);
    });
    const compatible = Boolean(conversationUrl) && entries.length > 0 && entries.every(([rawSequence, entry]) => {
      const sequence = Number.parseInt(rawSequence, 10);
      const item = requested.get(sequence);
      const prompt = item && (item.fullPrompt || item.prompt || '');
      return Boolean(item
        && entry
        && entry.imageKey
        && entry.promptSha256 === promptFingerprint(prompt)
        && sameChatGPTConversation(entry.conversationUrl, conversationUrl));
    });
    return {
      compatible,
      conversationUrl,
      recoveredSequences: compatible
        ? entries.map(([rawSequence]) => Number.parseInt(rawSequence, 10)).sort((left, right) => left - right)
        : [],
      lastSeenAt: String(group?.lastSeenAt || '')
    };
  }).filter(candidate => candidate.compatible);
  candidates.sort((left, right) => {
    if (right.recoveredSequences.length !== left.recoveredSequences.length) {
      return right.recoveredSequences.length - left.recoveredSequences.length;
    }
    const preferredUrl = canonicalChatGPTConversationUrl(checkpoint.conversationUrl);
    if (left.conversationUrl === preferredUrl && right.conversationUrl !== preferredUrl) return -1;
    if (right.conversationUrl === preferredUrl && left.conversationUrl !== preferredUrl) return 1;
    return right.lastSeenAt.localeCompare(left.lastSeenAt);
  });
  const selected = candidates[0] || { recoveredSequences: [], conversationUrl: '' };
  const recoveredSequences = selected.recoveredSequences;
  const completedCount = completedSet.size;
  const incomplete = recoveredSequences.length < queue.length || completedCount < queue.length;
  const resumeFrom = queue
    .map((item, index) => promptSequence(item, index))
    .find(sequence => !completedSet.has(sequence) && !recoveredSequences.includes(sequence)) || null;
  return {
    resumable: recoveredSequences.length > 0 && incomplete,
    recoveredSequences,
    resumeFrom,
    conversationUrl: selected.conversationUrl
  };
}

function generatedCheckpointSequences(numStr, mode = 'minisseries', conversationUrl = '', rootDir = ROOT) {
  const checkpoint = readChatGPTCheckpoint(numStr, mode, rootDir);
  const expectedUrl = String(conversationUrl || checkpoint.conversationUrl || '');
  const canonicalUrl = canonicalChatGPTConversationUrl(expectedUrl);
  const generated = canonicalUrl && checkpoint.conversations?.[canonicalUrl]
    ? checkpoint.conversations[canonicalUrl].generated
    : checkpoint.generated;
  return Object.entries(generated)
    .filter(([, entry]) => entry && entry.imageKey
      && (!expectedUrl || String(entry.conversationUrl || '') === expectedUrl))
    .map(([value]) => Number.parseInt(value, 10))
    .filter(value => Number.isInteger(value) && value > 0)
    .sort((left, right) => left - right);
}

function completedCheckpointSequences(numStr, mode = 'minisseries', rootDir = ROOT) {
  const checkpoint = readChatGPTCheckpoint(numStr, mode, rootDir);
  const targetDir = mode === 'flow'
    ? path.join(rootDir, 'minisseries', String(numStr), 'flow')
    : path.join(rootDir, 'minisseries', String(numStr), 'M' + String(numStr));
  return Object.entries(checkpoint.completed)
    .filter(([, entry]) => {
      if (!entry || !entry.file || !entry.sha256) return false;
      const filePath = path.join(targetDir, path.basename(entry.file));
      return fs.existsSync(filePath) && sha256File(filePath) === entry.sha256;
    })
    .map(([value]) => Number.parseInt(value, 10))
    .filter(value => Number.isInteger(value) && value > 0)
    .sort((left, right) => left - right);
}

function existingImageSequences(numStr, mode = 'minisseries', rootDir = ROOT) {
  const targetDir = mode === 'flow'
    ? path.join(rootDir, 'minisseries', String(numStr), 'flow')
    : path.join(rootDir, 'minisseries', String(numStr), 'M' + String(numStr));
  if (!fs.existsSync(targetDir)) return [];
  const pattern = mode === 'flow'
    ? /^cena_(\d{2})\.(?:jpe?g|png|webp)$/i
    : /^img_(\d{3})\.(?:jpe?g|png|webp)$/i;
  return fs.readdirSync(targetDir).map(file => {
    const match = file.match(pattern);
    if (!match) return null;
    const filePath = path.join(targetDir, file);
    try {
      return fs.statSync(filePath).size > 0 ? Number.parseInt(match[1], 10) : null;
    } catch (error) {
      return null;
    }
  }).filter(value => Number.isInteger(value) && value > 0).sort((left, right) => left - right);
}

function missingImageSequences(numStr, total = 50, mode = 'minisseries', rootDir = ROOT) {
  const existing = new Set(existingImageSequences(numStr, mode, rootDir));
  return Array.from({ length: total }, (_, index) => index + 1).filter(sequence => !existing.has(sequence));
}

function writeChatGPTCheckpoint(checkpoint, rootDir = ROOT) {
  const filePath = checkpointPath(checkpoint.number, checkpoint.mode, rootDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  checkpoint.updatedAt = new Date().toISOString();
  const temporaryPath = filePath + '.tmp';
  const backupPath = filePath + '.bak';
  if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backupPath);
  fs.writeFileSync(temporaryPath, JSON.stringify(checkpoint, null, 2), 'utf8');
  fs.renameSync(temporaryPath, filePath);
  return checkpoint;
}

function recordChatGPTConversation({ numStr, mode, conversationUrl, rootDir = ROOT }) {
  const checkpoint = readChatGPTCheckpoint(numStr, mode, rootDir);
  const normalizedUrl = String(conversationUrl || '');
  if (/^https:\/\/chatgpt\.com\/c\//i.test(normalizedUrl)) {
    checkpoint.conversationUrl = normalizedUrl;
    const group = ensureChatGPTConversation(checkpoint, normalizedUrl);
    if (group) group.lastSeenAt = new Date().toISOString();
  }
  return writeChatGPTCheckpoint(checkpoint, rootDir);
}

function recordChatGPTGenerated({ numStr, mode, sequence, prompt, imageKey, conversationUrl, rootDir = ROOT }) {
  const checkpoint = readChatGPTCheckpoint(numStr, mode, rootDir);
  const normalizedUrl = String(conversationUrl || '');
  const sequenceKey = String(sequence);
  const promptSha256 = promptFingerprint(prompt);
  const existing = checkpoint.generated[sequenceKey];
  if (existing
    && existing.promptSha256 === promptSha256
    && sameChatGPTConversation(existing.conversationUrl, normalizedUrl)) {
    // A primeira resposta confirmada e imutavel dentro do mesmo chat. Uma
    // virtualizacao posterior nunca pode reatribuir a cena a outra imagem.
    return checkpoint;
  }
  checkpoint.generated[sequenceKey] = {
    imageKey: String(imageKey || ''),
    promptSha256,
    conversationUrl: normalizedUrl,
    generatedAt: new Date().toISOString()
  };
  if (/^https:\/\/chatgpt\.com\/c\//i.test(normalizedUrl)) {
    checkpoint.conversationUrl = normalizedUrl;
    const group = ensureChatGPTConversation(checkpoint, normalizedUrl);
    if (group) {
      group.generated[sequenceKey] = checkpoint.generated[sequenceKey];
      group.lastSeenAt = new Date().toISOString();
    }
  }
  return writeChatGPTCheckpoint(checkpoint, rootDir);
}

function recordChatGPTCheckpoint({ numStr, mode, sequence, targetPath, hash, conversationUrl, rootDir = ROOT }) {
  const filePath = checkpointPath(numStr, mode, rootDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const checkpoint = readChatGPTCheckpoint(numStr, mode, rootDir);
  checkpoint.completed[String(sequence)] = {
    file: path.basename(targetPath),
    sha256: hash,
    conversationUrl: String(conversationUrl || ''),
    completedAt: new Date().toISOString()
  };
  const normalizedUrl = String(conversationUrl || '');
  if (/^https:\/\/chatgpt\.com\/c\//i.test(normalizedUrl)) {
    checkpoint.conversationUrl = normalizedUrl;
    const group = ensureChatGPTConversation(checkpoint, normalizedUrl);
    if (group) {
      group.completed[String(sequence)] = checkpoint.completed[String(sequence)];
      group.lastSeenAt = new Date().toISOString();
    }
  }
  return writeChatGPTCheckpoint(checkpoint, rootDir);
}

async function inspectGeneratedPromptPairs(page, prompts) {
  const expected = prompts.map((item, index) => ({
    sequence: promptSequence(item, index),
    prompt: normalizePromptForCheckpoint(item.fullPrompt || item.prompt || '')
  })).filter(item => item.prompt);

  return page.evaluate(items => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const fingerprint = value => {
      const text = String(value || '');
      let hash = 2166136261;
      for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(36);
    };
    const controlLabel = element => normalize([
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('data-testid'),
      element.textContent
    ].filter(Boolean).join(' '));
    const isImageShareControl = element => {
      const label = controlLabel(element);
      return (label.includes('compartilhar') || label.includes('share') || label.includes('baixar') || label.includes('download'))
        && (label.includes('imagem') || label.includes('image'));
    };
    const identity = (turn, response, controlIndex) => {
      const image = turn && turn.querySelector('img[src]');
      const imageSource = image && (image.currentSrc || image.src);
      return (turn && turn.getAttribute('data-turn-id'))
        || (turn && turn.getAttribute('data-testid'))
        || (turn && turn.id)
        || (response && response.getAttribute('data-message-id'))
        || (response && response.id)
        || `image-${fingerprint(`${imageSource || ''}|${controlIndex}`)}`;
    };

    const pairs = [];
    let latestUserText = '';
    const roleNodes = Array.from(document.querySelectorAll(
      '[data-message-author-role="user"], [data-message-author-role="assistant"]'
    ));
    roleNodes.forEach(node => {
      const role = node.getAttribute('data-message-author-role');
      if (role === 'user') {
        latestUserText = normalize(node.textContent || node.innerText);
        return;
      }
      if (!latestUserText) return;
      const turn = node.closest('[data-testid^="conversation-turn-"], [data-turn="assistant"], article, section');
      if (!turn) return;
      const controls = Array.from(turn.querySelectorAll(
        'button[aria-label], button[title], [role="button"][aria-label], [role="button"][title]'
      )).filter(isImageShareControl);
      if (!controls.length) return;
      const matched = items.find(item => {
        // O ChatGPT UI oculta o texto longo exibindo 'Mostrar mais' / 'Show more'.
        // Usamos um prefixo curto de 40 caracteres (as 2-3 primeiras frases do prompt),
        // que fica 100% visível na caixa do usuário antes do botão 'Mostrar mais'.
        const prefix = item.prompt.substring(0, 40);
        return prefix.length >= 8 && latestUserText.includes(prefix);
      });
      // Uma mensagem do usuario pode alimentar somente uma resposta com
      // imagem. Consumir o texto aqui impede que respostas virtualizadas
      // posteriores sejam atribuidas ao mesmo prompt.
      latestUserText = '';
      if (!matched) return;
      if (pairs.some(pair => pair.sequence === matched.sequence)) return;
      const allControls = Array.from(document.querySelectorAll(
        'button[aria-label], button[title], [role="button"][aria-label], [role="button"][title]'
      )).filter(isImageShareControl);
      const controlIndex = Math.max(0, allControls.indexOf(controls[0]));
      pairs.push({
        sequence: matched.sequence,
        imageKey: identity(turn, node, controlIndex)
      });
    });
    return pairs;
  }, expected);
}

async function reconcileGeneratedImages({ page, numStr, mode, prompts, conversationUrl, runId, onProgress, rootDir = ROOT }) {
  const currentUrl = String(conversationUrl || page.url() || '');
  const checkpoint = readChatGPTCheckpoint(numStr, mode, rootDir);
  const visibleState = await inspectGenerationCompletionState(page).catch(() => ({ completedImageTurnIds: [] }));
  const visibleImageKeys = visibleState.completedImageTurnIds || [];
  const visibleKeys = new Set(visibleImageKeys);
  const requested = new Map(prompts.map((item, index) => [
    promptSequence(item, index),
    item
  ]));
  const reconciled = new Map();

  Object.entries(checkpoint.generated || {}).forEach(([rawSequence, entry]) => {
    const sequence = Number.parseInt(rawSequence, 10);
    if (!requested.has(sequence) || !entry || !entry.imageKey) return;
    const item = requested.get(sequence);
    const prompt = item && (item.fullPrompt || item.prompt || '');
    if (entry.promptSha256 !== promptFingerprint(prompt)) return;
    if (!sameChatGPTConversation(entry.conversationUrl, currentUrl)) return;
    if (!visibleKeys.has(String(entry.imageKey))) return;
    reconciled.set(sequence, { sequence, imageKey: String(entry.imageKey) });
  });

  const discovered = await inspectGeneratedPromptPairs(page, prompts);
  discovered.forEach(found => {
    const item = requested.get(found.sequence);
    if (!item || !found.imageKey) return;
    if (reconciled.has(found.sequence)) return;
    reconciled.set(found.sequence, found);
    recordChatGPTGenerated({
      numStr,
      mode,
      sequence: found.sequence,
      prompt: item.fullPrompt || item.prompt || '',
      imageKey: found.imageKey,
      conversationUrl: currentUrl,
      rootDir
    });
    if (runId) {
      robotManifest.markGenerated({
        numStr,
        mode,
        provider: 'chatgpt',
        runId,
        sequence: found.sequence,
        prompt: item.fullPrompt || item.prompt || '',
        imageKey: found.imageKey,
        conversationUrl: currentUrl
      });
    }
  });

  if (onProgress && reconciled.size) {
    onProgress(8, `${reconciled.size} imagem(ns) já pronta(s) no chat original foram recuperadas sem repetir prompts.`);
  }
  return reconciled;
}

async function openConversationByUrl(page, conversationUrl, onProgress) {
  const targetUrl = String(conversationUrl || '');
  if (!/^https:\/\/chatgpt\.com\/c\//i.test(targetUrl)) {
    throw new Error('O chat original desta minissérie ainda não foi registrado. Execute primeiro uma rodada inicial.');
  }
  if (page.url() !== targetUrl) {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  await waitForComposer(page, 30000);
  if (onProgress) onProgress(4, 'Chat original reaberto; preparando somente as cenas faltantes...');
}

async function reuseCurrentConversation(page, expectedTitle, onProgress) {
  if (!/\/c\//i.test(String(page.url() || ''))) {
    throw new Error('A guia do ChatGPT não está em uma conversa existente desta minissérie.');
  }
  const matches = await page.evaluate(title => {
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ').trim().toLowerCase();
    return normalize(document.body?.innerText || '').includes(normalize(title));
  }, expectedTitle).catch(() => false);
  if (!matches) {
    throw new Error('O chat aberto não corresponde ao título da minissérie selecionada. Abra o chat correto e tente novamente.');
  }
  await waitForComposer(page, 30000);
  if (onProgress) onProgress(4, 'Chat original identificado na guia atual; preparando as cenas faltantes...');
}

async function recoverComposerForNextScene(page) {
  await dismissImageShareDialog(page).catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
  await delay(250);
  const state = await inspectComposerState(page).catch(() => ({ found: false, promptLength: 0 }));
  if (!state.found) return false;
  if (state.promptLength > 0) {
    const focused = await clickComposerTextAreaPhysically(page).catch(() => false);
    if (!focused) return false;
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await delay(300);
  }
  const finalState = await inspectComposerState(page).catch(() => ({ found: false, promptLength: -1 }));
  return finalState.found && finalState.promptLength === 0;
}

async function runChatGPTAutomation({
  accountId,
  numStr,
  prompts,
  mode = 'minisseries',
  runId = `chatgpt-${String(numStr)}-${Date.now()}`,
  conversationUrl,
  reuseCurrentChat = false,
  recoverMissing = false,
  expectedRecoveredSequences = [],
  expectedConversationTitle = '',
  onProgress,
  shouldCancel
}) {
  if (!Array.isArray(prompts) || prompts.length === 0) throw new Error('Nenhum prompt foi enviado ao robô ChatGPT.');

  const requestedPrompts = prompts.slice();
  const expectedTotal = mode === 'flow' ? 7 : 50;
  const manifestRun = robotManifest.beginRun({
    numStr,
    mode,
    provider: 'chatgpt',
    runId,
    prompts: requestedPrompts,
    conversationUrl,
    total: expectedTotal
  });
  const runnable = new Set(manifestRun.runnableSequences);
  prompts = requestedPrompts.filter((item, index) => runnable.has(promptSequence(item, index)));
  if (!prompts.length) {
    const waiting = manifestRun.skipped.some(item => item.reason !== 'completed');
    robotManifest.finishRun({ numStr, mode, provider: 'chatgpt', runId, status: waiting ? 'waiting_for_provider' : 'completed' });
    const existing = robotManifest.existingSequences({ numStr, mode, total: expectedTotal });
    const existingSet = new Set(existing);
    return {
      attempted: 0,
      completedThisRound: [],
      failedScenes: [],
      skipped: manifestRun.skipped,
      existing,
      missing: Array.from({ length: expectedTotal }, (_, index) => index + 1).filter(sequence => !existingSet.has(sequence)),
      conversationUrl: '',
      targetDir: robotManifest.targetDirFor(numStr, mode)
    };
  }

  const account = accountInfo(accountId);
  const isFlow = mode === 'flow';
  const targetDir = isFlow
    ? path.join(ROOT, 'minisseries', String(numStr), 'flow')
    : path.join(ROOT, 'minisseries', String(numStr), 'M' + String(numStr));
  const targetPrefix = isFlow ? 'cena' : 'img';
  fs.mkdirSync(targetDir, { recursive: true });

  let registeredRunConversationUrl = '';
  const registerRunConversation = rawUrl => {
    const canonicalUrl = canonicalChatGPTConversationUrl(rawUrl);
    if (!canonicalUrl) return registeredRunConversationUrl;
    robotManifest.updateRunConversation({ numStr, mode, provider: 'chatgpt', runId, conversationUrl: canonicalUrl });
    recordChatGPTConversation({ numStr, mode, conversationUrl: canonicalUrl });
    registeredRunConversationUrl = canonicalUrl;
    return registeredRunConversationUrl;
  };

  let browser;
  try {
    browser = await connectAccountBrowser(account);
    const pages = await browser.pages();
    // A sessao do navegador pode manter uma aba about:blank ao lado do ChatGPT.
    // O robo deve sempre priorizar a pagina autenticada do ChatGPT.
    const page = pages.find(candidate => candidate.url().includes('chatgpt.com'))
      || pages.find(candidate => !candidate.url().startsWith('chrome-extension://'))
      || await browser.newPage();
    if (!page.url().includes('chatgpt.com')) await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (onProgress) onProgress(5, `${account.label}: Edge aberto; aguardando login confirmado...`);
    await waitForAuthenticatedSession(page, 300000, onProgress);
    if (conversationUrl) {
      await openConversationByUrl(page, conversationUrl, onProgress);
    } else if (reuseCurrentChat) {
      await reuseCurrentConversation(page, expectedConversationTitle, onProgress);
    } else {
      await startNewChat(page, onProgress);
    }

    const openedConversationUrl = canonicalChatGPTConversationUrl(page.url());
    if (openedConversationUrl) {
      registerRunConversation(openedConversationUrl);
    } else if (conversationUrl || reuseCurrentChat) {
      registerRunConversation(page.url());
    }
    const recoveredImages = recoverMissing
      ? await reconcileGeneratedImages({
          page,
          numStr,
          mode,
          prompts,
          conversationUrl: page.url(),
          runId,
          onProgress
        })
      : new Map();
    const expectedRecovered = Array.isArray(expectedRecoveredSequences)
      ? expectedRecoveredSequences.map(Number).filter(Number.isInteger).sort((left, right) => left - right)
      : [];
    const actuallyRecovered = Array.from(recoveredImages.keys()).sort((left, right) => left - right);
    const requestedSequences = prompts.map((item, index) => promptSequence(item, index));
    const recoveredValidation = validateRecoveredPromptPrefix(
      expectedRecovered,
      actuallyRecovered,
      requestedSequences
    );
    if (recoverMissing && expectedRecovered.length && !recoveredValidation.ok) {
      throw new Error(
        `Retomada protegida: o chat original nao confirmou as ${expectedRecovered.length} imagens registradas. Nenhum novo prompt foi enviado.`
      );
    }
    if (recoverMissing && recoveredValidation.extraSequences.length && onProgress) {
      onProgress(
        9,
        `Retomada reconciliada: ${recoveredValidation.extraSequences.length} imagem(ns) adicional(is) já existente(s) no final do chat foram incorporadas sem repetir prompt.`
      );
    }
    const promptsToGenerate = prompts.filter((item, index) => !recoveredImages.has(promptSequence(item, index)));
    const failedScenes = [];
    const completedThisRound = [];
    const generatedThisRound = Array.from(recoveredImages.values()).sort((left, right) => left.sequence - right.sequence);

    // FASE 1: gerar a rodada inteira. Nenhum download ocorre neste laco.
    // Loop externo de retry: o mesmo prompt e reenviado ate o ChatGPT entregar uma imagem.
    // Qualquer resposta sem imagem (erro, aviso, texto de qualquer tipo) dispara o retry
    // imediato do mesmo prompt. O lote so avanca quando a imagem e confirmada.
    // originImageIds: IDs de imagem antes da 1a tentativa desta cena; detecta intervencao manual.
    for (let index = 0; index < promptsToGenerate.length; index++) {
      if (shouldCancel && shouldCancel()) throw new Error('__CHATGPT_CANCELLED__');
      const item = promptsToGenerate[index];
      const prompt = item.fullPrompt || item.prompt || '';
      const sceneSequence = promptSequence(item, index);
      let imageGenerated = false;
      let originImageIds = null; // conjunto de IDs antes da 1a tentativa desta cena
      let consecutiveTechnicalFailures = 0;
      while (!imageGenerated) {
        if (shouldCancel && shouldCancel()) throw new Error('__CHATGPT_CANCELLED__');
        // Antes de qualquer envio ou reenvio, procura no chat uma resposta com
        // imagem ligada ao texto exato deste prompt. Isso incorpora uma imagem
        // que terminou depois de uma falha de telemetria e impede repetir o
        // último prompt ao retomar a mesma conversa.
        try {
          const existingPairs = await inspectGeneratedPromptPairs(page, [item]);
          const existingPair = existingPairs.find(pair => pair.sequence === sceneSequence && pair.imageKey);
          if (existingPair) {
            generatedThisRound.push({ sequence: sceneSequence, imageKey: existingPair.imageKey });
            recordChatGPTGenerated({
              numStr,
              mode,
              sequence: sceneSequence,
              prompt,
              imageKey: existingPair.imageKey,
              conversationUrl: page.url()
            });
            robotManifest.markGenerated({
              numStr,
              mode,
              provider: 'chatgpt',
              runId,
              sequence: sceneSequence,
              prompt,
              imageKey: existingPair.imageKey,
              conversationUrl: page.url()
            });
            if (onProgress) {
              onProgress(
                Math.round(((index + 1) / Math.max(1, promptsToGenerate.length)) * 70),
                `Cena ${String(sceneSequence).padStart(2, '0')} já encontrada no chat e reconciliada; nenhum prompt foi repetido (${index + 1}/${promptsToGenerate.length}).`
              );
            }
            imageGenerated = true;
            break;
          }
        } catch (pairError) {
          if (pairError.message === '__CHATGPT_CANCELLED__') throw pairError;
        }
        // Antes de cada retry, verifica se o Diretor ja gerou a imagem manualmente
        // (equivalente ao originCount do robo Gemini).
        if (originImageIds !== null) {
          try {
            const checkState = await inspectGenerationCompletionState(page);
            const manualImageId = (checkState.completedImageTurnIds || []).find(id => !originImageIds.has(id));
            if (manualImageId) {
              generatedThisRound.push({ sequence: sceneSequence, imageKey: manualImageId });
              recordChatGPTGenerated({ numStr, mode, sequence: sceneSequence, prompt, imageKey: manualImageId, conversationUrl: page.url() });
              robotManifest.markGenerated({
                numStr,
                mode,
                provider: 'chatgpt',
                runId,
                sequence: sceneSequence,
                prompt,
                imageKey: manualImageId,
                conversationUrl: page.url()
              });
              if (onProgress) {
                onProgress(
                  Math.round(((index + 1) / Math.max(1, promptsToGenerate.length)) * 70),
                  `Cena ${String(sceneSequence).padStart(2, '0')} gerada via intervencao do Diretor; avancando (${index + 1}/${promptsToGenerate.length}).`
                );
              }
              imageGenerated = true;
              break;
            }
          } catch (checkError) {
            if (checkError.message === '__CHATGPT_CANCELLED__') throw checkError;
          }
        }
        try {
          await prepareComposerForNextPrompt(page, shouldCancel);
          // Registra originImageIds uma unica vez, antes da 1a tentativa real de envio.
          if (originImageIds === null) {
            const originState = await inspectGenerationCompletionState(page);
            originImageIds = new Set(originState.completedImageTurnIds || []);
          }
          const outcome = await sendPromptAndWait(
            page,
            prompt,
            onProgress,
            index + 1,
            promptsToGenerate.length,
            shouldCancel,
            registerRunConversation
          );
          consecutiveTechnicalFailures = 0;
          if (outcome.kind === 'image') {
            generatedThisRound.push({ sequence: sceneSequence, imageKey: outcome.turnId });
            recordChatGPTGenerated({
              numStr,
              mode,
              sequence: sceneSequence,
              prompt,
              imageKey: outcome.turnId,
              conversationUrl: page.url()
            });
            robotManifest.markGenerated({
              numStr,
              mode,
              provider: 'chatgpt',
              runId,
              sequence: sceneSequence,
              prompt,
              imageKey: outcome.turnId,
              conversationUrl: page.url()
            });
            if (onProgress) {
              onProgress(
                Math.round(((index + 1) / Math.max(1, promptsToGenerate.length)) * 70),
                `Cena ${String(sceneSequence).padStart(2, '0')} gerada e registrada; downloads somente depois da última tentativa (${index + 1}/${promptsToGenerate.length}).`
              );
            }
            imageGenerated = true;
          } else {
            if (isQuotaExhaustedMessage(outcome.latestAssistantText)) throw quotaExhaustedError('ChatGPT');
            // Resposta sem imagem (erro, aviso ou texto): reinsere o mesmo prompt.
            if (onProgress) {
              onProgress(
                Math.round(((index + 1) / Math.max(1, promptsToGenerate.length)) * 70),
                `Cena ${String(sceneSequence).padStart(2, '0')}: ChatGPT respondeu sem imagem; reenviando o mesmo prompt...`
              );
            }
            await waitForGenerationToBecomeIdle(page, shouldCancel);
            await delay(400);
          }
        } catch (error) {
          if (error.message === '__CHATGPT_CANCELLED__') throw error;
          if (error.code === 'ROBOT_QUOTA_EXHAUSTED') throw error;
          throwIfBrowserControlDetached(error);
          consecutiveTechnicalFailures += 1;
          if (consecutiveTechnicalFailures >= 3) {
            throw new Error(
              `Cena ${String(sceneSequence).padStart(2, '0')} interrompida depois de 3 falhas tecnicas consecutivas: ${error.message || 'falha nao identificada'}`
            );
          }
          // Erro tecnico: aguarda o ChatGPT estabilizar e tenta o mesmo prompt novamente.
          if (onProgress) {
            onProgress(
              Math.round(((index + 1) / Math.max(1, promptsToGenerate.length)) * 70),
              `Cena ${String(sceneSequence).padStart(2, '0')}: erro tecnico (${error.message || 'desconhecido'}); reenviando o mesmo prompt...`
            );
          }
          await waitForGenerationToBecomeIdle(page, shouldCancel);
          await recoverComposerForNextScene(page).catch(() => false);
          await delay(400);
        }
      }
      recordChatGPTConversation({ numStr, mode, conversationUrl: page.url() });
      await delay(750);
    }

    // Barreira de proteção para a ÚLTIMA imagem: garante que o spinner 
    // termine antes de liberar o robô para iniciar os downloads.
    if (onProgress) onProgress(70, 'Aguardando estabilização da última cena gerada...');
    await waitForGenerationToBecomeIdle(page, shouldCancel);
    await delay(1500);

    // FASE 2: com a geração encerrada, preparar o DOM e re-inspecionar chaves ao vivo
    const downloadedHashes = new Set();
    if (onProgress) {
      onProgress(
        70,
        `Geração encerrada: ${generatedThisRound.length}/${prompts.length} imagens confirmadas para esta recuperação. Iniciando os downloads em sequência...`
      );
    }
    await prepareDownloadPass(page, generatedThisRound.length);

    const livePairs = await inspectGeneratedPromptPairs(page, prompts).catch(() => []);
    const liveKeyMap = new Map((livePairs || [])
      .filter(pair => pair && Number.isInteger(pair.sequence) && pair.imageKey)
      .map(pair => [Number(pair.sequence), String(pair.imageKey)]));

    for (let index = 0; index < generatedThisRound.length; index++) {
      if (shouldCancel && shouldCancel()) throw new Error('__CHATGPT_CANCELLED__');
      const generated = generatedThisRound[index];
      const sequence = generated.sequence;
      const liveKey = liveKeyMap.get(sequence) || generated.imageKey;

      try {
        let saved;
        if (liveKey) {
          try {
            saved = await downloadGeneratedImageByKey({
              page,
              imageKey: liveKey,
              targetDir,
              sequence,
              targetPrefix,
              downloadedHashes,
              numStr,
              mode
            });
          } catch (keyErr) {
            if (keyErr.message === '__CHATGPT_CANCELLED__') throw keyErr;
            saved = await downloadImageInOrderFixed(
              page,
              targetDir,
              sequence,
              null,
              generatedThisRound.length,
              targetPrefix,
              downloadedHashes,
              70,
              30,
              index
            );
          }
        } else {
          saved = await downloadImageInOrderFixed(
            page,
            targetDir,
            sequence,
            null,
            generatedThisRound.length,
            targetPrefix,
            downloadedHashes,
            70,
            30,
            index
          );
        }

        if (saved && saved.targetPath && saved.hash) {
          recordChatGPTCheckpoint({
            numStr,
            mode,
            sequence,
            targetPath: saved.targetPath,
            hash: saved.hash,
            conversationUrl: page.url()
          });
          robotManifest.markCompleted({
            numStr,
            mode,
            provider: 'chatgpt',
            runId,
            sequence,
            targetPath: saved.targetPath,
            hash: saved.hash,
            conversationUrl: page.url()
          });
          completedThisRound.push(sequence);
          if (onProgress) {
            onProgress(
              70 + Math.round(((index + 1) / Math.max(1, generatedThisRound.length)) * 30),
              `Download da cena ${String(sequence).padStart(2, '0')} concluído e registrado (${index + 1}/${generatedThisRound.length}).`
            );
          }
        }
      } catch (error) {
        if (error.message === '__CHATGPT_CANCELLED__') throw error;
        failedScenes.push({ sequence, reason: `download: ${error.message || 'falha não identificada'}` });
        await dismissImageShareDialog(page).catch(() => {});
        if (onProgress) {
          onProgress(
            70 + Math.round(((index + 1) / Math.max(1, generatedThisRound.length)) * 30),
            `Cena ${String(sequence).padStart(2, '0')} foi gerada, mas o download ficou pendente; seguindo para a próxima.`
          );
        }
      }
    }
    const existing = robotManifest.existingSequences({ numStr, mode, total: expectedTotal });
    const existingSet = new Set(existing);
    const missing = Array.from({ length: expectedTotal }, (_, index) => index + 1).filter(sequence => !existingSet.has(sequence));
    const summary = {
      attempted: prompts.length,
      completedThisRound,
      failedScenes,
      skipped: manifestRun.skipped,
      existing,
      missing,
      conversationUrl: page.url(),
      targetDir
    };
    recordChatGPTConversation({ numStr, mode, conversationUrl: page.url() });
    const downloadFailures = failedScenes.filter(item => String(item.reason || '').startsWith('download:'));
    if (downloadFailures.length) {
      const error = new Error(
        `A rodada gerou as imagens, mas ${downloadFailures.length} download(s) nao chegaram a pasta oficial. Nenhuma conclusao foi registrada.`
      );
      error.code = 'CHATGPT_DOWNLOAD_INCOMPLETE';
      error.result = summary;
      if (onProgress) onProgress(100, error.message);
      throw error;
    }
    if (onProgress) {
      onProgress(
        100,
        missing.length
          ? `Rodada concluída: ${existing.length}/${expectedTotal} imagens presentes; faltam ${missing.length}. Use COMPLETAR FALTANTES.`
          : `Rodada concluída: as ${expectedTotal} imagens estão presentes e validadas.`
      );
    }
    robotManifest.finishRun({ numStr, mode, provider: 'chatgpt', runId, status: 'completed' });
    return summary;
  } catch (error) {
    const cancelled = error.message === '__CHATGPT_CANCELLED__';
    robotManifest.finishRun({
      numStr,
      mode,
      provider: 'chatgpt',
      runId,
      status: cancelled ? 'cancelled' : (error.code === 'ROBOT_QUOTA_EXHAUSTED' ? 'quota_exhausted' : 'failed'),
      error: error.message || 'Falha no robô ChatGPT.'
    });
    throw error;
  } finally {
    const pages = browser ? await browser.pages().catch(() => []) : [];
    const chatPage = pages.find(candidate => candidate.url().includes('chatgpt.com'));
    if (chatPage) await releaseComposerOffset(chatPage);
    if (browser) await browser.disconnect().catch(() => {});
  }
}

async function openConversationForDownload(page, conversationTitle, onProgress) {
  const expected = String(conversationTitle || '').replace(/\s+/g, ' ').trim();
  if (!expected) throw new Error('O titulo do chat de origem nao foi informado para a passagem de download.');

  const alreadyOpen = await page.evaluate(title => {
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ').trim().toLowerCase();
    return normalize(document.body.innerText).includes(normalize(title));
  }, expected);
  if (alreadyOpen) {
    if (onProgress) onProgress(3, `Chat "${expected}" localizado e mantido aberto.`);
    return;
  }

  const prefix = expected.split(/\s+/).slice(0, 4).join(' ');
  const point = await page.evaluate((fullTitle, shortTitle) => {
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ').trim().toLowerCase();
    const full = normalize(fullTitle);
    const short = normalize(shortTitle);
    const candidates = Array.from(document.querySelectorAll('a, button, [role="button"]')).filter(element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    });
    const target = candidates.find(element => {
      const text = normalize(element.textContent);
      return text === full || text === short || (text.length >= 8 && full.startsWith(text));
    });
    if (!target) return null;
    target.scrollIntoView({ behavior: 'auto', block: 'center' });
    const rect = target.getBoundingClientRect();
    return { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
  }, expected, prefix);
  if (!point) throw new Error(`O chat "${prefix}" nao foi encontrado na lista de conversas do ChatGPT.`);

  await page.mouse.click(point.x, point.y);
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const opened = await page.evaluate(title => {
      const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ').trim().toLowerCase();
      return location.pathname.includes('/c/') && normalize(document.body.innerText).includes(normalize(title));
    }, expected).catch(() => false);
    if (opened) {
      if (onProgress) onProgress(3, `Chat "${prefix}" aberto para a passagem de download.`);
      return;
    }
    await delay(250);
  }
  throw new Error(`O chat "${prefix}" foi selecionado, mas o conteudo correto nao abriu.`);
}

async function runChatGPTDownloadOnly({
  accountId,
  numStr,
  total = 50,
  mode = 'minisseries',
  conversationTitle,
  onProgress,
  shouldCancel
}) {
  const account = accountInfo(accountId);
  const isFlow = mode === 'flow';
  const targetDir = isFlow
    ? path.join(ROOT, 'minisseries', String(numStr), 'flow')
    : path.join(ROOT, 'minisseries', String(numStr), 'M' + String(numStr));
  const targetPrefix = isFlow ? 'cena' : 'img';
  fs.mkdirSync(targetDir, { recursive: true });

  const browser = await connectAccountBrowser(account);
  try {
    const pages = await browser.pages();
    const page = pages.find(candidate => candidate.url().includes('chatgpt.com'))
      || pages.find(candidate => !candidate.url().startsWith('chrome-extension://'))
      || await browser.newPage();
    if (!page.url().includes('chatgpt.com')) {
      await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    if (onProgress) onProgress(1, `${account.label}: abrindo a passagem exclusiva de download...`);
    await waitForAuthenticatedSession(page, 300000, onProgress);
    await openConversationForDownload(page, conversationTitle, onProgress);
    await prepareDownloadPass(page, total);

    const downloadedHashes = new Set();
    for (let index = 0; index < total; index++) {
      if (shouldCancel && shouldCancel()) throw new Error('__CHATGPT_CANCELLED__');
      await downloadImageInOrderFixed(
        page,
        targetDir,
        index + 1,
        onProgress,
        total,
        targetPrefix,
        downloadedHashes,
        5,
        95
      );
      await delay(700);
    }
    if (onProgress) onProgress(100, `Downloads 01-${String(total).padStart(2, '0')} concluídos em ${targetDir}.`);
  } finally {
    await browser.disconnect().catch(() => {});
  }
}

function snapshotDownloadDirectory(dir) {
  const snapshot = new Map();
  for (const file of fs.readdirSync(dir)) {
    if (/\.(crdownload|tmp|part)$/i.test(file)) continue;
    try {
      const stat = fs.statSync(path.join(dir, file));
      snapshot.set(file, `${stat.size}:${stat.mtimeMs}`);
    } catch (error) {}
  }
  return snapshot;
}

async function waitForDownloadedFile(dir, before, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await delay(500);
    for (const file of fs.readdirSync(dir)) {
      if (/\.(crdownload|tmp|part)$/i.test(file)) continue;
      try {
        const stat = fs.statSync(path.join(dir, file));
        const signature = `${stat.size}:${stat.mtimeMs}`;
        if (!before.has(file) || before.get(file) !== signature) return file;
      } catch (error) {}
    }
  }
  return null;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function imageShareDialogIsOpen(page) {
  return page.evaluate(() => {
    const isVisible = element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return Array.from(document.querySelectorAll('[role="dialog"]')).filter(isVisible).some(dialog =>
      Array.from(dialog.querySelectorAll('button, a')).some(element => {
        const label = normalize(`${element.getAttribute('aria-label') || ''} ${element.textContent || ''}`);
        return label === 'baixar' || label === 'download';
      })
    );
  }).catch(() => false);
}

async function dismissImageShareDialog(page) {
  if (!await imageShareDialogIsOpen(page)) return;
  const closeRequested = await page.evaluate(() => {
    const isVisible = element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).filter(isVisible).find(candidate =>
      Array.from(candidate.querySelectorAll('button, a')).some(element => {
        const label = normalize(`${element.getAttribute('aria-label') || ''} ${element.textContent || ''}`);
        return label === 'baixar' || label === 'download';
      })
    );
    if (!dialog) return null;
    const closeButton = Array.from(dialog.querySelectorAll('button, [role="button"]')).filter(isVisible).find(element => {
      const label = normalize(
        `${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''} ${element.textContent || ''}`
      );
      return label === 'fechar' || label === 'close' || label.startsWith('fechar ') || label.startsWith('close ');
    });
    if (!closeButton) return false;
    closeButton.click();
    return true;
  });
  if (closeRequested) {
    const closeStarted = Date.now();
    while (Date.now() - closeStarted < 2000) {
      if (!await imageShareDialogIsOpen(page)) return;
      await delay(150);
    }
  }

  const outsidePoint = await page.evaluate(() => {
    const isVisible = element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).filter(isVisible).find(candidate =>
      Array.from(candidate.querySelectorAll('button, a')).some(element => {
        const label = normalize(`${element.getAttribute('aria-label') || ''} ${element.textContent || ''}`);
        return label === 'baixar' || label === 'download';
      })
    );
    if (!dialog) return null;
    const rect = dialog.getBoundingClientRect();
    const candidates = [
      { x: Math.min(window.innerWidth - 80, rect.right + 120), y: rect.top + (rect.height / 2) },
      { x: Math.max(80, rect.left - 120), y: rect.top + (rect.height / 2) },
      { x: window.innerWidth / 2, y: Math.max(80, rect.top - 80) }
    ];
    return candidates.find(point =>
      point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom
    ) || null;
  });
  if (outsidePoint) await page.mouse.click(outsidePoint.x, outsidePoint.y);

  const started = Date.now();
  while (Date.now() - started < 4000) {
    if (!await imageShareDialogIsOpen(page)) return;
    await delay(150);
  }

  await page.keyboard.press('Escape').catch(() => {});
  await delay(800);
  if (await imageShareDialogIsOpen(page)) {
    throw new Error('O quadro de compartilhamento permaneceu aberto depois do clique fora.');
  }
}
async function prepareDownloadPass(page, total) {
  await dismissImageShareDialog(page);
  await page.evaluate(async () => {
    const step = 700;
    while (window.scrollY > 0) {
      window.scrollBy(0, -step);
      await new Promise(r => setTimeout(r, 120));
    }
  }).catch(() => {});
  await delay(1000);
}

async function openShareDialogForImage(page, sequence, targetIndex) {
  const index = Number.isInteger(targetIndex) && targetIndex >= 0 ? targetIndex : sequence - 1;
  const located = await page.evaluate(targetIndex => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const buttons = Array.from(document.querySelectorAll('button[aria-label], [role="button"][aria-label]')).filter(element => {
      const label = normalize(element.getAttribute('aria-label'));
      return label.includes('compartilhar esta imagem') || label.includes('share this image');
    });
    const target = buttons[targetIndex];
    if (!target) return { found: false, total: buttons.length };
    target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
    return { found: true, total: buttons.length };
  }, index);
  if (!located.found) {
    throw new Error(`O botão de compartilhamento da imagem ${sequence} não foi encontrado. Total localizado: ${located.total}.`);
  }

  await delay(350);
  const point = await page.evaluate(targetIndex => {
    const isVisible = element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight
        && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const buttons = Array.from(document.querySelectorAll('button[aria-label], [role="button"][aria-label]')).filter(element => {
      const label = normalize(element.getAttribute('aria-label'));
      return label.includes('compartilhar esta imagem') || label.includes('share this image');
    });
    const target = buttons[targetIndex];
    if (!target || !isVisible(target)) return null;
    const rect = target.getBoundingClientRect();
    return { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
  }, index);
  if (!point) throw new Error(`A imagem ${sequence} foi localizada, mas o botão de compartilhamento não ficou visível.`);
  await page.mouse.click(point.x, point.y);

  const dialogStarted = Date.now();
  while (Date.now() - dialogStarted < 5000) {
    if (await imageShareDialogIsOpen(page)) return;
    await delay(150);
  }
  throw new Error(`O quadro de compartilhamento da imagem ${sequence} não abriu.`);
}

async function openShareDialogForImageKey(page, imageKey, sequence) {
  const locateShareControl = async scroll => page.evaluate((expectedKey, shouldScroll) => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const fingerprint = value => {
      const text = String(value || '');
      let hash = 2166136261;
      for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(36);
    };
    const controls = Array.from(document.querySelectorAll(
      'button[aria-label], button[title], [role="button"][aria-label], [role="button"][title]'
    )).filter(element => {
      const label = normalize([
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.getAttribute('data-testid'),
        element.textContent
      ].filter(Boolean).join(' '));
      return (label.includes('compartilhar') || label.includes('share') || label.includes('baixar') || label.includes('download'))
        && (label.includes('imagem') || label.includes('image'));
    });
    const target = controls.find((control, index) => {
      const turn = control.closest('[data-testid^="conversation-turn-"], [data-turn="assistant"], article, section');
      const response = turn && turn.querySelector('[data-message-author-role="assistant"]');
      const imageContainer = control.closest('div');
      const image = (imageContainer && imageContainer.querySelector('img[src]'))
        || (turn && turn.querySelector('img[src]'));
      const imageSource = image && (image.currentSrc || image.src);
      const key = (turn && turn.getAttribute('data-turn-id'))
        || (turn && turn.getAttribute('data-testid'))
        || (turn && turn.id)
        || (response && response.getAttribute('data-message-id'))
        || (response && response.id)
        || `image-${fingerprint(`${imageSource || ''}|${index}`)}`;
      return key === expectedKey;
    });
    if (!target) return null;
    if (shouldScroll) target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
    const rect = target.getBoundingClientRect();
    const style = window.getComputedStyle(target);
    if (rect.width <= 0 || rect.height <= 0 || style.visibility === 'hidden' || style.display !== 'none') return null;
    return { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
  }, imageKey, scroll);

  let located = await locateShareControl(true);
  if (!located) {
    for (let scrollStep = 0; scrollStep < 15; scrollStep++) {
      await page.evaluate(() => window.scrollBy(0, 1000)).catch(() => {});
      await delay(300);
      located = await locateShareControl(true);
      if (located) break;
    }
  }
  if (!located) {
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    await delay(400);
    for (let scrollStep = 0; scrollStep < 15; scrollStep++) {
      located = await locateShareControl(true);
      if (located) break;
      await page.evaluate(() => window.scrollBy(0, 1000)).catch(() => {});
      await delay(300);
    }
  }
  if (!located) {
    throw new Error(`Cena ${String(sequence).padStart(2, '0')}: a imagem concluída não foi localizada para download.`);
  }
  await delay(350);
  const point = await locateShareControl(false);
  if (!point) {
    throw new Error(`Cena ${String(sequence).padStart(2, '0')}: o controle de download não ficou visível.`);
  }
  await page.mouse.click(point.x, point.y);

  const started = Date.now();
  while (Date.now() - started < 5000) {
    if (await imageShareDialogIsOpen(page)) return;
    await delay(150);
  }
  throw new Error(`Cena ${String(sequence).padStart(2, '0')}: o quadro de compartilhamento não abriu.`);
}

async function clickDownloadInOpenDialog(page, sequence) {
  const point = await page.evaluate(() => {
    const isVisible = element => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).filter(isVisible).find(candidate =>
      Array.from(candidate.querySelectorAll('button, a')).some(element => {
        const label = normalize(`${element.getAttribute('aria-label') || ''} ${element.textContent || ''}`);
        return label === 'baixar' || label === 'download';
      })
    );
    if (!dialog) return null;
    const target = Array.from(dialog.querySelectorAll('button, a')).filter(isVisible).find(element => {
      const label = normalize(`${element.getAttribute('aria-label') || ''} ${element.textContent || ''}`);
      return label === 'baixar' || label === 'download';
    });
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
  });
  if (!point) throw new Error(`A opção Baixar da imagem ${sequence} não foi encontrada dentro do quadro.`);
  await page.mouse.click(point.x, point.y);
}

async function captureImageFromOpenDialog(page, sequence) {
  const storageKey = `__vortexOriginalImage_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  try {
    let metadata;
    const imageLoadDeadline = Date.now() + 15000;
    do {
      metadata = await page.evaluate(async key => {
        const isVisible = element => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        };
        const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).filter(isVisible).find(candidate =>
          Array.from(candidate.querySelectorAll('button, a')).some(element => {
            const label = normalize(`${element.getAttribute('aria-label') || ''} ${element.textContent || ''}`);
            return label === 'baixar' || label === 'download';
          })
        );
        if (!dialog) return { error: 'O quadro de compartilhamento nao esta aberto.' };
        const image = Array.from(dialog.querySelectorAll('img')).filter(isVisible).find(element => element.currentSrc || element.src);
        if (!image) return { error: 'A imagem original nao foi encontrada dentro do quadro.' };

        const response = await window.fetch(image.currentSrc || image.src, { credentials: 'include' });
        if (!response.ok) return { error: `O ChatGPT recusou o arquivo original com HTTP ${response.status}.` };
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = '';
        const binaryChunkSize = 0x8000;
        for (let offset = 0; offset < bytes.length; offset += binaryChunkSize) {
          binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + binaryChunkSize, bytes.length)));
        }
        const base64 = window.btoa(binary);
        window[key] = base64;
        return {
          contentType: response.headers.get('content-type') || 'application/octet-stream',
          size: bytes.length,
          base64Length: base64.length
        };
      }, storageKey);
      if (!metadata?.error || !String(metadata.error).includes('imagem original')) break;
      await delay(250);
    } while (Date.now() < imageLoadDeadline);
    if (!metadata || metadata.error) {
      throw new Error(`Imagem ${sequence}: ${metadata?.error || 'o arquivo original nao foi preparado.'}`);
    }

    const chunks = [];
    const transferChunkSize = 256 * 1024;
    for (let offset = 0; offset < metadata.base64Length; offset += transferChunkSize) {
      chunks.push(await page.evaluate(
        (key, start, length) => String(window[key] || '').slice(start, start + length),
        storageKey,
        offset,
        transferChunkSize
      ));
    }
    const buffer = Buffer.from(chunks.join(''), 'base64');
    if (buffer.length !== metadata.size) {
      throw new Error(`Imagem ${sequence}: o arquivo autenticado chegou incompleto.`);
    }
    if (!isSupportedImageBuffer(buffer)) {
      throw new Error(`Imagem ${sequence}: o arquivo baixado nao e uma imagem valida.`);
    }
    return { buffer, contentType: metadata.contentType || detectImageContentType(buffer) };
  } finally {
    await page.evaluate(key => { try { delete window[key]; } catch (error) {} }, storageKey).catch(() => {});
  }
}

function detectImageContentType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return 'application/octet-stream';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9) {
    return 'image/jpeg';
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  return 'application/octet-stream';
}

function isSupportedImageBuffer(buffer) {
  return Buffer.isBuffer(buffer) && detectImageContentType(buffer).startsWith('image/');
}

async function downloadGeneratedImageByKey({
  page,
  imageKey,
  targetDir,
  sequence,
  targetPrefix = 'img',
  downloadedHashes = new Set(),
  numStr,
  mode = targetPrefix === 'cena' ? 'flow' : 'minisseries'
}) {
  fs.mkdirSync(targetDir, { recursive: true });
  await dismissImageShareDialog(page);
  await openShareDialogForImageKey(page, imageKey, sequence);
  const captured = await captureImageFromOpenDialog(page, sequence);
  await dismissImageShareDialog(page);

  const hash = crypto.createHash('sha256').update(captured.buffer).digest('hex');
  if (downloadedHashes.has(hash)) {
    throw new Error(`Cena ${String(sequence).padStart(2, '0')}: o ChatGPT devolveu um arquivo idêntico a outra cena deste lote.`);
  }
  downloadedHashes.add(hash);

  const contentType = detectImageContentType(captured.buffer) || captured.contentType;
  const extension = contentType === 'image/png' ? '.png'
    : contentType === 'image/webp' ? '.webp'
      : '.jpg';
  const saved = robotManifest.commitBuffer({ numStr, mode, sequence, buffer: captured.buffer, extension });
  return { ...saved, contentType };
}

async function downloadImageInOrderFixed(
  page,
  targetDir,
  sequence,
  onProgress,
  total,
  targetPrefix = 'img',
  downloadedHashes = new Set(),
  progressStart = 55,
  progressSpan = 45,
  targetIndex = null
) {
  fs.mkdirSync(targetDir, { recursive: true });
  await dismissImageShareDialog(page);
  await openShareDialogForImage(page, sequence, targetIndex);
  const captured = await captureImageFromOpenDialog(page, sequence);
  await dismissImageShareDialog(page);

  const hash = crypto.createHash('sha256').update(captured.buffer).digest('hex');
  if (downloadedHashes.has(hash)) {
    throw new Error(`Download interrompido: a imagem ${sequence} repete um arquivo já baixado nesta passagem.`);
  }
  downloadedHashes.add(hash);

  const inferredNumber = path.basename(path.dirname(path.resolve(targetDir)));
  const inferredMode = targetPrefix === 'cena' ? 'flow' : 'minisseries';
  const contentType = detectImageContentType(captured.buffer);
  const extension = contentType === 'image/png' ? '.png'
    : contentType === 'image/webp' ? '.webp'
      : '.jpg';
  const saved = robotManifest.commitBuffer({
    numStr: inferredNumber,
    mode: inferredMode,
    sequence,
    buffer: captured.buffer,
    extension
  });
  if (onProgress) {
    const progress = progressStart + Math.round((sequence / total) * progressSpan);
    onProgress(progress, `Download ${sequence}/${total} concluído; quadro fechado e arquivo validado.`);
  }
  return { ...saved, contentType };
}

function gptPromptPrefix(prompt) {
  return String(prompt || '').replace(/\s+/g, ' ').trim().toLowerCase().substring(0, 80);
}

async function recoverGPTImageMetadataFromChat(page, sourcePrompts, shouldCancel) {
  const imageKeyBySequence = new Map();
  const maxAttempts = 50;
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    if (shouldCancel && shouldCancel()) throw new Error('__CHATGPT_CANCELLED__');
    
    const allControls = await page.evaluate(() => {
      const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return Array.from(document.querySelectorAll(
        'button[aria-label], button[title], [role="button"][aria-label], [role="button"][title]'
      )).filter(el => {
        const label = normalize([el.getAttribute('aria-label'), el.getAttribute('title'), el.textContent].filter(Boolean).join(' '));
        return label.includes('download') && (label.includes('imagem') || label.includes('image'));
      });
    });
    
    if (allControls.length >= sourcePrompts.length) {
      for (let i = 0; i < sourcePrompts.length; i++) {
        const seq = promptSequence(sourcePrompts, i);
        imageKeyBySequence.set(seq, { position: i, control: allControls[i] });
      }
      break;
    }
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(1000);
    attempt++;
  }
  
  return Object.fromEntries(imageKeyBySequence);
}

async function recoverChatGPTDownloadsCurrentTab({ numStr, mode = 'minisseries', runId = `chatgpt-recovery-${String(numStr)}-${Date.now()}`, sequences, prompts = [], onProgress, shouldCancel }) {
  const total = mode === 'flow' ? 7 : 50;
  const requestedFilter = sequences === 'auto'
    ? []
    : (Array.isArray(sequences)
      ? sequences.map(Number).filter(sequence => Number.isInteger(sequence) && sequence > 0 && sequence <= total)
      : []);
  const sourcePrompts = requestedFilter.length
    ? selectPromptsBySequence(Array.isArray(prompts) ? prompts : [], requestedFilter)
    : (Array.isArray(prompts) ? prompts : []);
  if (!sourcePrompts.length) throw new Error('A fila oficial de prompts não está disponível para o Resgate GPT.');

  const account = accountInfo('chatgpt-1');
  let browser;
  try {
    browser = await connectAccountBrowser(account);
    const pages = await browser.pages();
    const page = pages.find(candidate => candidate.url().includes('chatgpt.com'));
    if (!page) throw new Error("Aba do ChatGPT não encontrada. Abra o chatgpt.com na conversa desejada.");
    await waitForAuthenticatedSession(page, 300000, onProgress);

    if (onProgress) onProgress(3, 'Carregando mensagens antigas da conversa no navegador...');
    await page.evaluate(async () => {
      const step = 700;
      while (window.scrollY > 0) {
        window.scrollBy(0, -step);
        await new Promise(r => setTimeout(r, 120));
      }
    }).catch(() => {});
    await delay(1200);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await delay(1200);

    const exactPairs = await inspectGeneratedPromptPairs(page, sourcePrompts);
    const imageKeyBySequence = new Map(exactPairs
      .filter(pair => pair && Number.isInteger(pair.sequence) && pair.imageKey)
      .map(pair => [Number(pair.sequence), String(pair.imageKey)]));

    const recovery = robotManifest.beginRun({
      numStr,
      mode,
      provider: 'chatgpt',
      runId,
      prompts: sourcePrompts,
      conversationUrl: page.url(),
      total
    });
    const requestedSequences = recovery.runnableSequences;
    if (!requestedSequences.length) {
      robotManifest.finishRun({ numStr, mode, provider: 'chatgpt', runId, status: 'completed' });
      return { savedFiles: [], skipped: recovery.skipped, conversationUrl: page.url() };
    }

    const isFlow = mode === 'flow';
    const targetDir = isFlow 
      ? path.join(ROOT, 'minisseries', String(numStr), 'flow')
      : path.join(ROOT, 'minisseries', String(numStr), `M${numStr}`);
    fs.mkdirSync(targetDir, { recursive: true });

    if (onProgress) onProgress(10, `Resgatando imagens do ChatGPT (Cenas ${requestedSequences.join(', ')})`);

    await prepareDownloadPass(page, requestedSequences.length);
    const savedFiles = [];
    const downloadedHashes = new Set();

    for (let i = 0; i < requestedSequences.length; i++) {
      if (shouldCancel && shouldCancel()) throw new Error('__CHATGPT_CANCELLED__');
      const seq = Number(requestedSequences[i]);
      const hasKey = imageKeyBySequence.has(seq);

      try {
        let saved;
        if (!hasKey) {
          saved = await downloadImageInOrderFixed(
            page,
            targetDir,
            seq,
            onProgress ? (p, msg) => onProgress(10 + Math.round(((i + 1) / requestedSequences.length) * 80), msg) : null,
            requestedSequences.length,
            isFlow ? 'cena' : 'img',
            downloadedHashes,
            10,
            80,
            i
          );
        } else {
          saved = await downloadGeneratedImageByKey({
            page,
            imageKey: imageKeyBySequence.get(seq),
            targetDir,
            sequence: seq,
            targetPrefix: isFlow ? 'cena' : 'img',
            downloadedHashes,
            numStr,
            mode
          });
        }
        if (saved && saved.targetPath && saved.hash) {
          recordChatGPTCheckpoint({ numStr, mode, sequence: seq, targetPath: saved.targetPath, hash: saved.hash, conversationUrl: page.url() });
          robotManifest.markCompleted({
            numStr,
            mode,
            provider: 'chatgpt',
            runId,
            sequence: seq,
            targetPath: saved.targetPath,
            hash: saved.hash,
            conversationUrl: page.url()
          });
          savedFiles.push(saved.targetPath);
        }
        if (onProgress) onProgress(
          10 + Math.round(((i + 1) / requestedSequences.length) * 80),
          !hasKey 
            ? `Resgatando cena ${seq} (download por posição)...` 
            : `Resgatando cena ${seq}...`
        );
      } catch (sceneError) {
        if (sceneError.message === '__CHATGPT_CANCELLED__') throw sceneError;
        await dismissImageShareDialog(page).catch(() => {});
        if (onProgress) {
          onProgress(
            10 + Math.round(((i + 1) / requestedSequences.length) * 80),
            `Fim das imagens na conversa. Cena ${seq} não presente.`
          );
        }
        break;
      }
    }
    if (onProgress) {
      onProgress(
        100,
        savedFiles.length
          ? `Resgate concluído com sucesso: ${savedFiles.length} imagem(ns) resgatada(s) e salvas em M${numStr}.`
          : `Resgate finalizado: nenhuma imagem nova foi encontrada na conversa.`
      );
    }
    robotManifest.finishRun({ numStr, mode, provider: 'chatgpt', runId, status: 'completed' });
    return { savedFiles, skipped: recovery.skipped, conversationUrl: page.url() };
  } catch (error) {
    robotManifest.finishRun({
      numStr,
      mode,
      provider: 'chatgpt',
      runId,
      status: error.message === '__CHATGPT_CANCELLED__' ? 'cancelled' : 'failed',
      error: error.message || 'Falha no resgate GPT.'
    });
    throw error;
  } finally {
    if (browser) await browser.disconnect().catch(() => {});
  }
}

module.exports = {
  runChatGPTAutomation,
  runChatGPTDownloadOnly,
  recoverChatGPTDownloadsCurrentTab,
  normalizeAccountId,
  selectPromptsBySequence,
  completedCheckpointSequences,
  generatedCheckpointSequences,
  existingImageSequences,
  missingImageSequences,
  readChatGPTCheckpoint,
  findChatGPTResumePlan,
  connectAccountBrowser,
  testCurrentChromeTab,
  waitForAuthenticatedSession,
  __testHooks: Object.freeze({
    clickVisibleText,
    clickSendArrowPhysically,
    inspectComposerState,
    ensureComposerVisible,
    releaseComposerOffset,
    focusComposerForDirectInput,
    insertPromptDirectly,
    countCompletedGeneratedImages,
    inspectGenerationCompletionState,
    isGenerationBusyLabel,
    isQuotaExhaustedMessage,
    quotaExhaustedError,
    waitForGenerationOutcome,
    waitForGenerationToBecomeIdle,
    waitForChatGPTConversationUrl,
    prepareComposerForNextPrompt,
    selectPromptsBySequence,
    readChatGPTCheckpoint,
    promptFingerprint,
    sameChatGPTConversation,
    validateRecoveredPromptPrefix,
    findChatGPTResumePlan,
    generatedCheckpointSequences,
    completedCheckpointSequences,
    existingImageSequences,
    missingImageSequences,
    recordChatGPTCheckpoint,
    recordChatGPTGenerated,
    recordChatGPTConversation,
    inspectGeneratedPromptPairs,
    reconcileGeneratedImages,
    openShareDialogForImageKey,
    downloadGeneratedImageByKey,
    openConversationForDownload,
    prepareDownloadPass,
    dismissImageShareDialog,
    detectImageContentType,
    isSupportedImageBuffer
  })
};
