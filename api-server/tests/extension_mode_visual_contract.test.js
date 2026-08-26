const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = (...segments) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test('modo extensão é carregado depois da base visual', () => {
  const html = read('index.html');
  const mainIndex = html.indexOf('css/main.css');
  const extensionIndex = html.indexOf('css/extension-mode.css');

  assert.ok(mainIndex >= 0, 'main.css precisa existir');
  assert.ok(extensionIndex > mainIndex, 'o modo extensão deve sobrescrever a base visual');
  assert.match(html, /id="libraryResultCount"/);
  assert.match(html, /class="cockpit-command-header"/);
});

test('dashboard preserva o wallpaper sem película fosca', () => {
  const css = read('css', 'extension-mode.css');

  assert.match(css, /@media \(max-width: 1600px\)/);
  assert.match(css, /#orbitLeft/);
  assert.match(css, /#multiverseControlPanel/);
  assert.match(css, /#multiversePromptsArea/);
  assert.match(css, /#multiverseControlPanel \*,\s*#multiversePromptsArea \*\s*\{[^}]*backdrop-filter:\s*none/s);
  assert.doesNotMatch(css, /backdrop-filter:\s*blur\(/, 'a camada visual não pode fosquear o wallpaper');
  assert.match(css, /\.cockpit-module-grid\s*\{[^}]*grid-template-columns:\s*1fr 1fr/s);
  assert.match(css, /\.cockpit-destination\s*\{[^}]*color:\s*#fff/s);
  assert.match(css, /--cockpit-left-width:\s*360px/);
  assert.match(css, /--cockpit-left-edge:\s*8px/);
  assert.match(css, /--cockpit-main-top:\s*108px/);
  assert.match(css, /#multiverseWelcome::before\s*\{[^}]*width:\s*var\(--cockpit-left-width\)/s);
  assert.match(css, /#multiverseControlPanel\s*\{[^}]*left:\s*var\(--cockpit-left-edge\)[^}]*transform:\s*none/s);
  assert.match(css, /#orbitLeft\s*\{[^}]*top:\s*calc\(var\(--cockpit-main-top\) \+ var\(--cockpit-main-height\)\)[^}]*width:\s*var\(--cockpit-left-width\)/s);
  assert.match(css, /#multiversePromptsArea\s*\{[^}]*left:\s*auto[^}]*width:\s*360px/s);
  assert.match(css, /button\[onclick\*="switchSceneTab"\]/);
  assert.match(css, /#orbitLeft \.actionBtn > div\s*\{[^}]*align-items:\s*center[^}]*text-align:\s*center/s);
  assert.match(css, /\.cockpit-scene-selector > div:first-child\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.cockpit-scene-selector > div:last-child\s*\{[^}]*justify-content:\s*center/s);
});

test('dashboard amplo usa duas torres simetricas e libera o portal central', () => {
  const css = read('css', 'extension-mode.css');
  const wideRule = css.match(/@media \(min-width: 1601px\)\s*\{([\s\S]*?)\n\}\n\n@media \(max-width: 1280px\)/);

  assert.ok(wideRule, 'o Dashboard amplo precisa de uma regra propria');
  assert.match(wideRule[1], /--cockpit-left-width:\s*360px/);
  assert.match(wideRule[1], /--cockpit-left-edge:\s*20px/);
  assert.match(wideRule[1], /#multiverseControlPanel\s*\{[^}]*left:\s*var\(--cockpit-left-edge\)[^}]*width:\s*var\(--cockpit-left-width\)/s);
  assert.match(wideRule[1], /#orbitLeft\s*\{[^}]*top:\s*calc\(var\(--cockpit-main-top\) \+ var\(--cockpit-main-height\)\)[^}]*width:\s*var\(--cockpit-left-width\)/s);
  assert.match(wideRule[1], /#multiversePromptsArea\s*\{[^}]*right:\s*var\(--cockpit-left-edge\)[^}]*width:\s*var\(--cockpit-left-width\)/s);
  assert.doesNotMatch(wideRule[1], /#audioRoomGrid|#libraryGridContainer|#docEsteiraLayout/, 'a regra ampla nao pode alterar outras salas');
});

test('Expandir IA usa palco provisório central sem desmontar as torres', () => {
  const css = read('css', 'extension-mode.css');

  assert.match(css, /#subjectsGrid\[style\*="display: flex"\]\s*\{[^}]*position:\s*fixed[^}]*left:\s*50vw[^}]*width:\s*min\(760px,[^}]*transform:\s*translateX\(-50%\)/s);
  assert.match(css, /#multiverseWelcome:has\(#subjectsGrid\[style\*="display: flex"\]\) #activeCampaignPanel,\s*#multiverseWelcome:has\(#subjectsGrid\[style\*="display: flex"\]\) #multiversePromptsArea\s*\{[^}]*display:\s*flex\s*!important/s);
  assert.match(css, /#subjectsGrid\[style\*="display: flex"\]:has\(\.subjectCard\) > div:nth-child\(2\)\s*\{[^}]*grid-template-rows:\s*repeat\(3, minmax\(0, 1fr\)\)/s);
  assert.match(css, /#subjectsGrid\[style\*="display: flex"\] \.subjectCard\s*\{[^}]*backdrop-filter:\s*none\s*!important/s);
});

test('geração de assuntos possui motores orbitais de IA animados no portal', () => {
  const uiJs = read('js', 'ui.js');

  assert.match(uiJs, /class="vortex-orbital-loader"/);
  assert.match(uiJs, /INVOCANDO MOTORES DE IA/);
  assert.match(uiJs, /STATUS: PROCESSANDO EM ÓRBITA\.\.\./);
  assert.match(uiJs, /🧠/);
  assert.match(uiJs, /⚡/);
  assert.match(uiJs, /👁️/);
  assert.match(uiJs, /Mapeando novos vetores para a/);
});

test('Portal Vivo parte do núcleo InkVortex e desembarca no player Zoom da Minissérie 01', () => {
  const html = read('index.html');
  const { getPalcoDir } = require('../utils/paths.js');
  const css = read('css', 'extension-mode.css');
  const livingStage = read('js', 'living-stage.js');
  const videoPath = path.join(getPalcoDir(), '00-portal-vivo-inkvortex.mp4');

  assert.match(html, /id="livingStageTrigger"[^>]*aria-label="Seja bem-vindo: ativar Portal Vivo"/);
  assert.doesNotMatch(html, /<span>SEJA BEM-VINDO<\/span>/);
  assert.match(html, /class="living-stage-vortex-svg"/);
  assert.equal((html.match(/<path d="M18 18C/g) || []).length, 3);
  assert.match(html, /id="livingStageVideo"[\s\S]*src="\/palco\/00-portal-vivo-inkvortex\.mp4"/);
  assert.match(html, /js\/living-stage\.js\?v=\d+/);
  assert.match(css, /#livingStageTrigger\s*\{[^}]*left:\s*50%[^}]*top:\s*50%/s);
  assert.match(css, /#livingStageTrigger\s*\{[^}]*width:\s*42px[^}]*height:\s*42px[^}]*background:\s*transparent/s);
  assert.match(css, /\.living-stage-trigger-mark/);
  assert.match(css, /@keyframes living-stage-vortex-spin/);
  assert.match(css, /#livingStageVideo\s*\{[^}]*object-fit:\s*cover/s);
  assert.match(css, /#livingStageLayer\s*\{[^}]*z-index:\s*2147483000/s);
  assert.match(livingStage, /video\.muted = false/);
  assert.match(livingStage, /video\.addEventListener\('ended', \(\) => finishPortalExperience\('acervo'\)\)/);
  assert.match(livingStage, /await window\.openDocumentarios\(\)/);
  assert.match(livingStage, /await window\.switchDocTab\('acervo'\)/);
  assert.match(livingStage, /normalizeMinisserieNumber/);
  assert.match(livingStage, /window\.openAcervoDocCard\(minisserie01Index\)/);
  assert.match(livingStage, /document\.querySelector\('#acervoRenderStage video'\)/);
  assert.match(livingStage, /window\.openAspectNativeVideoZoom\(videoSource, 0\)/);
  assert.match(livingStage, /zoomPlayer\.muted = false/);
  assert.match(livingStage, /await zoomPlayer\.play\(\)/);
  assert.match(livingStage, /close\.addEventListener\('click', \(\) => finishPortalExperience\('dashboard'\)\)/);
  assert.match(livingStage, /event\.key === 'Escape'/);
  assert.ok(fs.existsSync(videoPath), 'o MP4 estável do Portal Vivo precisa existir');
  assert.ok(fs.statSync(videoPath).size > 1_000_000, 'o Portal Vivo não pode ser um arquivo vazio');
});

test('Multiverso cataloga videos da raiz de palco e persiste somente um Portal ativo', () => {
  const html = read('index.html');
  const css = read('css', 'extension-mode.css');
  const app = read('js', 'app.js');
  const ui = read('js', 'ui.js');
  const livingStage = read('js', 'living-stage.js');
  const server = read('api-server', 'server.js');

  assert.match(server, /function listStagePortalVideos\(\)/);
  assert.match(server, /new Set\(\['\.mp4', '\.webm'\]\)/);
  assert.match(server, /req\.url === '\/api\/palco'/);
  assert.match(server, /portalVideos:\s*listStagePortalVideos\(\)/);
  assert.match(app, /data\.portalVideos/);
  assert.match(app, /UI\.renderStageOptions\(stageBackgrounds, stagePortalVideos\)/);
  assert.match(ui, /VIAGENS DO PORTAL/);
  assert.match(ui, /data-portal-video-selector/);
  assert.match(ui, /PORTAL ATIVO/);
  assert.match(livingStage, /vortexLivingStageVideoV1/);
  assert.match(livingStage, /window\.localStorage\.setItem\(PORTAL_VIDEO_STORAGE_KEY, selectedUrl\)/);
  assert.match(livingStage, /window\.selectLivingStageVideo/);
  assert.match(css, /\.portal-video-card\.is-selected/);
  assert.match(css, /\.portal-video-check/);
  assert.match(html, /id="dropdownStage"[\s\S]*width:\s*420px/);
});

test('Flow Music, Biblioteca, Esteira e Acervo possuem estados visuais oficiais', () => {
  const audio = read('js', 'audio.js');
  const ui = read('js', 'ui.js');
  const docs = read('js', 'documentarios.js');
  const css = read('css', 'extension-mode.css');

  assert.match(audio, /flow-music-empty-state/);
  assert.doesNotMatch(audio, /Réplica exata da arquitetura de viewport do Multiverso Audiovisual/);
  assert.match(ui, /libraryResultCount/);
  assert.match(ui, /cockpit-robot-station/);
  assert.match(ui, /s\.copiedGemini \? '✓ COPIADO' : '📋 COPIAR'/);
  assert.doesNotMatch(ui, /COPIAR MOVIMENTO/);
  assert.match(docs, /renderDocEsteiraDirect/);
  assert.match(docs, /acervo-detail-card/);
  assert.match(docs, /acervo-missing-chip/);
  assert.match(css, /#audioRoomGrid/);
  assert.match(css, /#audioRoomGrid\s*\{[^}]*max-width:\s*1120px[^}]*grid-template-columns:\s*300px minmax\(0, 1fr\)/s);
  assert.match(css, /\.audio-console-shell\s*\{[^}]*width:\s*760px[^}]*justify-self:\s*center/s);
  assert.match(css, /\.audio-console-shell > div\s*\{[^}]*max-width:\s*730px/s);
  assert.match(css, /#libraryGridContainer/);
  assert.match(css, /#libraryHeaderFixed\s*\{[^}]*width:\s*min\(1040px,/s);
  assert.match(css, /#libraryGridContainer\s*\{[^}]*width:\s*min\(1120px,/s);
  assert.match(css, /#libraryGrid\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s);
  assert.match(css, /#libraryGrid \.subjectCard\s*\{[^}]*height:\s*300px/s);
  assert.match(css, /#docEsteiraLayout/);
  assert.match(css, /#docEsteiraLayout\s*\{[^}]*width:\s*min\(1120px,[^}]*max-width:\s*none/s);
  assert.match(css, /#docEsteiraLayout > div:first-child\s*\{[^}]*width:\s*320px/s);
  assert.match(css, /#acervoRenderStage\s*\{[^}]*flex:\s*1 1 auto[^}]*aspect-ratio:\s*auto/s);
  assert.match(css, /#btnRenderFinalMinisserie\s*\{[^}]*min-width:\s*190px[^}]*white-space:\s*nowrap/s);
  assert.match(css, /#docDetailsArea\s*\{[^}]*overflow:\s*hidden/s);
});

test('Painel de Prompts GPT possui aba CAPA no extremo esquerdo, COPIAR no extremo direito e conversão 9:16', () => {
  const ui = read('js', 'ui.js');
  const app = read('js', 'app.js');
  const css = read('css', 'extension-mode.css');

  assert.match(ui, /id="btnTabCapa"[^>]*onclick="window\.switchSceneTab\('capa', 'gpt'\)"/);
  assert.match(ui, /display:\s*flex;\s*justify-content:\s*space-between;\s*align-items:\s*center/);
  assert.match(ui, /onclick="window\.copyExpandedContent\('gpt', 'capa', this\)"/);
  assert.match(app, /window\.formatCapaPrompt\s*=\s*function/);
  assert.match(app, /index === 'capa'/);
  assert.match(css, /#multiversePromptsArea #btnTabCapa/);

  // Executa e valida o formatCapaPrompt
  const formatCapaMatch = app.match(/window\.formatCapaPrompt\s*=\s*function\([\s\S]*?\n\};/);
  assert.ok(formatCapaMatch, 'window.formatCapaPrompt precisa estar definido');
  
  const sandbox = { window: {} };
  const fn = new Function('window', formatCapaMatch[0]);
  fn(sandbox.window);

  const samplePrompt169 = 'A 16:9 widescreen cinematic shot of a futuristic ink laboratory with neon glow.';
  const converted = sandbox.window.formatCapaPrompt(samplePrompt169);
  assert.equal(converted, 'A 9:16 vertical cinematic shot of a futuristic ink laboratory with neon glow.');

  const sampleTitleExact = 'TITLE EXACT: "O Futuro da Impressão"\n\nA 16:9 widescreen cinematic shot of an advanced printer.';
  const convertedTitle = sandbox.window.formatCapaPrompt(sampleTitleExact);
  assert.equal(convertedTitle, 'A 9:16 vertical cinematic shot of an advanced printer.');
});

test('Palco cósmico e imagens estáticas são servidas corretamente sem erro de escopo', () => {
  const serverCode = read('api-server', 'server.js');
  assert.match(serverCode, /const isMediaRequest = \(/);
  assert.doesNotMatch(serverCode, /else\s*\{\s*const isMediaRequest/, 'isMediaRequest deve ter escopo global dentro da funcao serveStatic');
  
  const mainCss = read('css', 'main.css');
  assert.match(mainCss, /--ivStageImage:\s*url\('\/palco\/01-obra-prima-inkvortex-hd\.png'\)/);
  
  const appJs = read('js', 'app.js');
  assert.match(appJs, /const defaultWallpaper = '\/palco\/01-obra-prima-inkvortex-hd\.png'/);
  assert.match(appJs, /window\.normalizeWallpaperUrl/);
});

