const { addExtra } = require('puppeteer-extra');
const puppeteer = addExtra(require('puppeteer-core'));
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const browserExtensionBridge = require('./browser_extension_bridge');
const robotManifest = require('./robot_manifest');
const os = require('os');

puppeteer.use(StealthPlugin());

const { FILES_ROOT } = require('./utils/paths');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runQwenCurrentTabAutomation(ROOT, numStr, requestedSequences, jobState, onProgress) {
  let browser = null;
  const mode = 'minisseries'; // Qwen is only for minisseries
  if (!numStr || numStr === 'flow') throw new Error("Qwen não opera no modo Flow genérico. É necessário informar o número da minissérie.");
  
  const cleanNumber = String(numStr).padStart(2, '0');
  
  const targetDir = path.join(FILES_ROOT, 'minisseries', cleanNumber, `M${cleanNumber}`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Load prompts
  let promptsToGenerate = [];
  if (mode === 'minisseries') {
    const jsonPath = path.join(FILES_ROOT, 'minisseries', cleanNumber, 'prompts', `50_prompts_esteira_chatgpt_${cleanNumber}.json`);
    if (!fs.existsSync(jsonPath)) throw new Error(`Arquivo JSON não encontrado: ${jsonPath}`);
    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const scenes = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.scenes) ? parsed.scenes : []);
    
    for (const seq of requestedSequences) {
      const scene = scenes.find(s => s.sequence === seq || s.sceneNumber === seq);
      if (scene) {
        promptsToGenerate.push({ sequence: seq, text: scene.fullPrompt || scene.prompt || scene.text || '' });
      }
    }
  } else {
    // Flow mode
    const txtPath = path.join(FILES_ROOT, 'flow', 'prompts', 'flow_prompts.txt');
    if (!fs.existsSync(txtPath)) throw new Error(`Arquivo TXT não encontrado: ${txtPath}`);
    const lines = fs.readFileSync(txtPath, 'utf8').split('\n').filter(l => l.trim().length > 10);
    for (const seq of requestedSequences) {
      if (lines[seq - 1]) {
        promptsToGenerate.push({ sequence: seq, text: lines[seq - 1].trim() });
      }
    }
  }

  if (promptsToGenerate.length === 0) {
    if (onProgress) onProgress(100, 'Nenhum prompt selecionado ou encontrado para geração.');
    return { sequences: [] };
  }

  try {
    if (onProgress) onProgress(5, `Conectando ao Edge para automação do Qwen...`);
    
    // Conectar ao Edge usando a ponte
    browser = await browserExtensionBridge.connectPuppeteer(puppeteer, { defaultViewport: null, platform: 'qwen' });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('chat.qwen.ai'));

    if (!page) {
      throw new Error("Nenhuma guia do chat.qwen.ai foi encontrada no navegador. Deixe o site aberto.");
    }

    await page.bringToFront();
    if (onProgress) onProgress(10, `Guia do Qwen localizada. Verificando área de texto...`);

    // GERAÇÃO EM LOTE
    let generatedCount = 0;
    const totalPrompts = promptsToGenerate.length;

    for (let i = 0; i < totalPrompts; i++) {
      if (jobState.cancelRequested) throw new Error("Cancelado pelo usuário.");
      
      const item = promptsToGenerate[i];
      if (onProgress) {
        const progress = 10 + Math.round((i / totalPrompts) * 70);
        onProgress(progress, `Cena ${item.sequence} (${i+1}/${totalPrompts}): Inserindo prompt no Qwen...`);
      }

      // Esperar textarea
      const textareaHandle = await page.waitForFunction(() => {
        const textareas = Array.from(document.querySelectorAll('textarea, [contenteditable="true"]'));
        return textareas.find(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && !el.disabled;
        });
      }, { timeout: 15000 });

      if (!textareaHandle) throw new Error("Caixa de texto não encontrada no Qwen.");

      // Focar e colar o texto
      await textareaHandle.focus();
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');

      await page.evaluate((text) => navigator.clipboard.writeText(text), item.text);
      await page.keyboard.down('Control');
      await page.keyboard.press('V');
      await page.keyboard.up('Control');
      await delay(500);

      if (jobState.cancelRequested) throw new Error("Cancelado pelo usuário.");

      // Enviar o prompt (O Enter funciona nativamente)
      await page.keyboard.press('Enter');
      await delay(500);

      if (onProgress) {
        const progress = 10 + Math.round(((i + 0.5) / totalPrompts) * 70);
        onProgress(progress, `Cena ${item.sequence} (${i+1}/${totalPrompts}): Aguardando término da geração...`);
      }

      await delay(2000); 

      let isGenerating = true;
      let checkCount = 0;
      while (isGenerating && checkCount < 60) {
        if (jobState.cancelRequested) throw new Error("Cancelado pelo usuário.");
        await delay(2000);
        checkCount++;
        
        isGenerating = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
          const stopBtn = buttons.find(b => {
            if (b.getBoundingClientRect().width === 0) return false;
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            const html = b.innerHTML.toLowerCase();
            
            // Textos comuns de botão de parada
            if (aria.includes('stop') || aria.includes('parar') || aria.includes('cancel')) return true;
            if (html.includes('stop') || html.includes('parar')) return true;
            
            // Detecção visual do "quadradinho" (Stop icon tem um <rect> SVG)
            if (html.includes('<svg') && html.includes('<rect')) {
               // Ignora botões de anexo, mais ou microfone
               if (!aria.includes('voice') && !aria.includes('micro') && !aria.includes('audio') && !html.includes('plus')) {
                 return true;
               }
            }
            return false;
          });
          
          return !!stopBtn;
        });
      }
      
      await delay(2000); // Margem de segurança
      generatedCount++;
    }

    // DOWNLOAD EM LOTE
    if (onProgress) onProgress(85, `Geração concluída. Iniciando download de ${generatedCount} imagens...`);
    
    const downloadsFolder = path.join(os.homedir(), 'Downloads');

    for (let i = 0; i < promptsToGenerate.length; i++) {
      if (jobState.cancelRequested) break;
      const item = promptsToGenerate[i];
      const targetFilePath = path.join(targetDir, `img_${String(item.sequence).padStart(3, '0')}.png`);

      if (onProgress) onProgress(85 + Math.round((i / totalPrompts) * 10), `Baixando Cena ${item.sequence}...`);

      await page.evaluate(async (seqIndex, totalPrompts) => {
        const images = Array.from(document.querySelectorAll('img[src*="blob:"], img[src*="aliyuncs.com"]')); 
        const recentImages = images.slice(-totalPrompts);
        const targetImg = recentImages[seqIndex];
        
        if (targetImg) {
          targetImg.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          targetImg.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          
          await new Promise(r => setTimeout(r, 800)); 
          
          const container = targetImg.closest('div') || targetImg.parentElement;
          const buttons = Array.from(container.querySelectorAll('button, span, div, a'));
          
          const downloadBtn = buttons.find(b => {
            const svg = b.querySelector('svg');
            const txt = (b.getAttribute('aria-label') || b.textContent || '').toLowerCase();
            const classes = b.className || '';
            return txt.includes('download') || txt.includes('baixar') || (svg && (classes.includes('download') || svg.innerHTML.includes('download')));
          });
          
          if (downloadBtn) downloadBtn.click();
        }
      }, i, totalPrompts);

      await delay(2500); // Aguardar o arquivo chegar
      
      const files = fs.readdirSync(downloadsFolder);
      let latestFile = null;
      let latestTime = 0;
      const now = Date.now();
      
      for (const file of files) {
        if (!file.toLowerCase().endsWith('.png') && !file.toLowerCase().endsWith('.jpg') && !file.toLowerCase().endsWith('.webp')) continue;
        const fullPath = path.join(downloadsFolder, file);
        const stats = fs.statSync(fullPath);
        if (now - stats.mtimeMs < 10000 && stats.mtimeMs > latestTime) {
          latestTime = stats.mtimeMs;
          latestFile = fullPath;
        }
      }

      if (latestFile) {
        fs.renameSync(latestFile, targetFilePath);
        const pLabel = mode === 'minisseries' ? `img_${String(item.sequence).padStart(3, '0')}` : `flow_${item.sequence}`;
        robotManifest.markItemGenerated(cleanNumber, pLabel, 'qwen', true);
      }
    }

    if (browser) await browser.disconnect().catch(() => {});
    if (onProgress) onProgress(100, `Automação Qwen concluída com sucesso!`);
    return { sequences: promptsToGenerate.map(p => p.sequence) };
    
  } catch (error) {
    if (browser) await browser.disconnect().catch(() => {});
    throw error;
  }
}

module.exports = {
  runQwenCurrentTabAutomation
};
