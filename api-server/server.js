const { env, reloadEnvFile, parseEnvFile } = require('./utils/env_loader');
const contractParser = require('./contract_parser');
const { generateStage } = require('./services/llm_service');
const { checkLLMConnectivity, connectivityFailureMessage } = require('./llm_connectivity_check');
const videoService = require('./services/video_service');
const miniseriesWorkspaceService = require('./services/miniseries_workspace_service');
const { sanitizeNumericId, safeJoin } = require('./utils/security');
const createAutomationRouter = require('./routes/automation_routes');
const createChatGPTAutomationRouter = require('./routes/chatgpt_automation_routes');
const browserExtensionBridge = require('./browser_extension_bridge');
const { buildMiniseriesImageManifest } = require('./services/miniseries_thumbnail_manifest');
const {
  createFinalMinisserieRenderer,
  listFinalMinisserieCatalog
} = require('./services/final_minisserie_renderer');
const { writeGPTSourcePrompts, readGPTSourcePrompts, buildChatGPTQueue } = createChatGPTAutomationRouter;
const { generateTranscriptionData, alignAudioAndText, alignM4AText } = require('./services/audio_service');
const robotManifest = require('./robot_manifest');
const { TECH_THEMES } = require('./utils/tech_themes');
const systemZipService = require('./services/system_zip_service');
const socialMixerService = require('./services/social_mixer_service');








function parseAssTimeToSec(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const clean = timeStr.trim();
  const parts = clean.split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(clean) || 0;
}

function sanitizeTelemetryMessage(msg) { return String(msg || ''); }

function formatDurationSec(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

const { generateTikTokAssScript } = require('./ass_generator');
function extract10EmojiPhrasesFromCaption(captionText) {
  if (!captionText) return [];
  const rawLines = captionText.split('\n').map(l => l.trim()).filter(Boolean);
  const phrases = [];
  for (const line of rawLines) {
    const lower = line.toLowerCase();
    if (
      lower.startsWith('trilha sonora') ||
      lower.includes('inkvortexbrasil') ||
      lower.includes('mercado livre') ||
      lower.includes('como participar') ||
      lower.includes('vÃ­deo completo') ||
      lower.includes('quer se aprofundar') ||
      lower.startsWith('â–¶') ||
      lower.startsWith('ðŸ¿') ||
      lower.startsWith('ðŸ›’') ||
      lower.startsWith('ðŸ’¬') ||
      lower.startsWith('ðŸ“²') ||
      lower.startsWith('#')
    ) {
      continue;
    }
    // Se a linha comeÃ§a com emoji ou possui formataÃ§Ã£o de frase de impacto narrativa
    if (/^[^\w\s\d]/.test(line) || /^[\p{Extended_Pictographic}]/u.test(line) || line.length >= 30) {
      phrases.push(line);
      if (phrases.length === 10) break;
    }
  }
  return phrases;
}

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { generateImageBatch } = require('./gemini_imagen.js');
const { assembleShortsVideo } = require('./shorts_engine.js');

let serverIsUp = false;

process.on('uncaughtException', (err) => {
  console.error('[FATAL] ExceÃ§Ã£o nÃ£o capturada:', err);
  if (!serverIsUp) {
    console.error('[FATAL] Isso aconteceu ANTES do servidor terminar de subir. Encerrando o processo para evitar um estado "zumbi" silencioso.');
    process.exit(1);
  }
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Promise rejeitada sem handler:', reason);
});

const { CODE_ROOT, FILES_ROOT, getStacherDir, getAmbientMusicDir } = require('./utils/paths');
const ROOT = FILES_ROOT;
const finalMinisserieRenderer = createFinalMinisserieRenderer({ root: ROOT, videoService });
const ENV_PATH = path.join(__dirname, '.env');
const activeGeminiWebJobs = {};
const activeChatGPTWebJobs = {};
const PORT = Number(env('PORT', 8787));
const TELEMETRY_PATH = path.join(__dirname, 'inkvortex-api-telemetry.jsonl');
const DEFAULT_API_TIMEOUT_MS = 240000;
const STUDIO_VERSION = '12.0';
const ENGINE_VERSION = '12.0';
const SERVER_STARTED_AT = new Date().toISOString();

const DEFAULTS_ROOT = path.join(__dirname, 'defaults');
const LOCAL_WORKSPACE_DIRS = Object.freeze(['fonts','palco','logo-inkvortex','minisseries']);
const LOCAL_FIXED_DEFAULTS = Object.freeze([
  ['logo-inkvortex/logo-inkvortex.png','logo-inkvortex/logo-inkvortex.png']
]);

function ensureDirectory(dir){fs.mkdirSync(dir,{recursive:true});}
function copyFileIfMissing(source,target){
  if(fs.existsSync(target)||!fs.existsSync(source))return false;
  ensureDirectory(path.dirname(target));
  fs.copyFileSync(source,target);
  return true;
}
function uniqueMigrationTarget(target){
  if(!fs.existsSync(target))return target;
  const ext=path.extname(target),base=target.slice(0,-ext.length);let index=2,candidate;
  do{candidate=`${base}-migrado-${index}${ext}`;index+=1;}while(fs.existsSync(candidate));
  return candidate;
}
function migrateFilePreservingUserSource(source,target){
  if(!fs.existsSync(source)||!fs.statSync(source).isFile())return false;
  ensureDirectory(path.dirname(target));
  let finalTarget=target;
  if(fs.existsSync(target)){
    const same=fs.statSync(source).size===fs.statSync(target).size&&fs.readFileSync(source).equals(fs.readFileSync(target));
    if(same){fs.unlinkSync(source);return true;}
    finalTarget=uniqueMigrationTarget(target);
  }
  try{fs.renameSync(source,finalTarget);}catch(error){fs.copyFileSync(source,finalTarget);fs.unlinkSync(source);}
  return true;
}
function walkLegacyFiles(dir,callback,relative=[]){
  if(!fs.existsSync(dir))return;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name),parts=[...relative,entry.name];
    if(entry.isDirectory())walkLegacyFiles(full,callback,parts);
    else if(entry.isFile())callback(full,parts);
  }
}
function removeEmptyTree(dir){
  if(!fs.existsSync(dir))return;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true}))if(entry.isDirectory())removeEmptyTree(path.join(dir,entry.name));
  try{if(fs.readdirSync(dir).length===0)fs.rmdirSync(dir);}catch(error){}
}
function prepareLocalWorkspace(){
  for(const name of LOCAL_WORKSPACE_DIRS)ensureDirectory(path.join(ROOT,name));

  const legacyRoot=path.join(ROOT,'assets-inkvortex');
  if(fs.existsSync(legacyRoot)){
    const legacyLogo=path.join(legacyRoot,'logo-inkvortex.png');
    if(fs.existsSync(legacyLogo))migrateFilePreservingUserSource(legacyLogo,path.join(ROOT,'logo-inkvortex','logo-inkvortex.png'));
    const legacyStage=path.join(legacyRoot,'palco');
    walkLegacyFiles(legacyStage,(source,parts)=>migrateFilePreservingUserSource(source,path.join(ROOT,'palco',...parts)));
    removeEmptyTree(legacyStage);removeEmptyTree(legacyRoot);
  }
  for(const [defaultRelative,localRelative] of LOCAL_FIXED_DEFAULTS)copyFileIfMissing(path.join(DEFAULTS_ROOT,defaultRelative),path.join(ROOT,localRelative));
}

function writeEnv(updates) {
  const current = parseEnvFile(path.join(__dirname, '.env'));
  const merged = { ...current, ...updates };
  let content = '';
  for (const [key, value] of Object.entries(merged)) {
    if (value) content += `${key}=${value}\n`;
  }
  fs.writeFileSync(path.join(__dirname, '.env'), content, 'utf8');
  reloadEnvFile();
}

function apiProfileMode(){return String(env('INKVORTEX_API_PROFILE','adaptive')).trim().toLowerCase()==='fixed'?'fixed':'adaptive';}

const FLOW_7_SCENES_MAPPING = Object.freeze([
  { flowIndex: 1, flowScene: 'cena_01', gptIndex: 1, gptSceneNum: '01', imageFile: 'img_001' },
  { flowIndex: 2, flowScene: 'cena_02', gptIndex: 3, gptSceneNum: '03', imageFile: 'img_011' },
  { flowIndex: 3, flowScene: 'cena_03', gptIndex: 4, gptSceneNum: '04', imageFile: 'img_016' },
  { flowIndex: 4, flowScene: 'cena_04', gptIndex: 5, gptSceneNum: '05', imageFile: 'img_021' },
  { flowIndex: 5, flowScene: 'cena_05', gptIndex: 7, gptSceneNum: '07', imageFile: 'img_031' },
  { flowIndex: 6, flowScene: 'cena_06', gptIndex: 9, gptSceneNum: '09', imageFile: 'img_041' },
  { flowIndex: 7, flowScene: 'cena_07', gptIndex: 10, gptSceneNum: '10', imageFile: 'img_046' }
]);

function syncFlowImagesFromEsteira(root, rawCampaignNumber) {
  const numStr = sanitizeNumericId(rawCampaignNumber);
  const mDir = path.join(root, 'minisseries', numStr, `M${numStr}`);
  const flowDir = path.join(root, 'minisseries', numStr, 'flow');
  if (!fs.existsSync(mDir)) return { copied: 0, files: [] };
  fs.mkdirSync(flowDir, { recursive: true });

  const extensions = ['.png', '.jpg', '.jpeg', '.webp'];
  const copiedFiles = [];

  FLOW_7_SCENES_MAPPING.forEach(mapItem => {
    for (const ext of extensions) {
      const srcFile = path.join(mDir, `${mapItem.imageFile}${ext}`);
      if (fs.existsSync(srcFile) && fs.statSync(srcFile).size > 0) {
        const destFile = path.join(flowDir, `${mapItem.flowScene}${ext}`);
        fs.copyFileSync(srcFile, destFile);
        copiedFiles.push({ src: `${mapItem.imageFile}${ext}`, dest: `${mapItem.flowScene}${ext}` });
        break;
      }
    }
  });

  return { copied: copiedFiles.length, files: copiedFiles };
}

const STAGE_PROFILES = Object.freeze({
  themes:{label:'Uma ideia nova',initialOutputTokens:2500,maxOutputTokens:4000,timeoutMs:180000,gemini:{temperature:0.85,thinkingLevel:'high'},mistral:{temperature:0.82,reasoningEffort:'none'}},
  scenes45:{label:'10 cenas-âncora cinematográficas 16:9',initialOutputTokens:8000,maxOutputTokens:12000,timeoutMs:240000,gemini:{temperature:1.00,thinkingLevel:'high'},mistral:{temperature:0.82,reasoningEffort:'none'}},
  scenes916:{label:'7 movimentos Gemini estáticos 16:9 conectados ao Flow',initialOutputTokens:8000,maxOutputTokens:12000,timeoutMs:240000,gemini:{temperature:0.90,thinkingLevel:'high'},mistral:{temperature:0.82,reasoningEffort:'none'}},
  scenes50:{label:'50 Prompts CinematogrÃ¡ficos de MinissÃ©rie',initialOutputTokens:8000,maxOutputTokens:16000,timeoutMs:240000,gemini:{temperature:1.00,thinkingLevel:'high'},mistral:{temperature:0.82,reasoningEffort:'none'}},
  caption:{label:'Legenda Social final da Mistral',initialOutputTokens:5000,maxOutputTokens:8000,timeoutMs:240000,gemini:{temperature:0.76,thinkingLevel:'high'},mistral:{temperature:0.82,reasoningEffort:'none'}},
  audio:{label:'Roteiro SinfÃ´nico',initialOutputTokens:8000,maxOutputTokens:8192,timeoutMs:240000,gemini:{temperature:1.0,topP:0.95},mistral:{temperature:0.82,reasoningEffort:'none'}},
  flowMaster:{label:'Plano técnico de vídeo (Omni Flash)',initialOutputTokens:2048,maxOutputTokens:4096,timeoutMs:60000,gemini:{temperature:0.90,thinkingLevel:'low'},mistral:{temperature:0.82,reasoningEffort:'none'}},
  documentaryAudio:{label:'Roteiro SinfÃ´nico de DocumentÃ¡rio (3min)',initialOutputTokens:8000,maxOutputTokens:8192,timeoutMs:240000,gemini:{temperature:1.0,topP:0.95},mistral:{temperature:0.82,reasoningEffort:'none'}},
  flowMusic:{label:'Identidade Musical Flow',initialOutputTokens:2000,maxOutputTokens:3000,timeoutMs:120000,gemini:{temperature:0.78,topP:0.95},mistral:{temperature:0.82,reasoningEffort:'none'}}
});

const MISTRAL_STAGE_DEFAULT_MODELS = new Proxy({}, {
  get: (target, prop) => {
    const c = contractParser.getContract(prop);
    return c ? c.motor : 'gpt-4o';
  }
});
const MISTRAL_MODEL_FAMILY_FALLBACKS = Object.freeze({
  'mistral-small-2603':['mistral-small-latest'],
  'mistral-small-latest':['mistral-small-2603'],
  'mistral-large-2512':['mistral-large-latest'],
  'mistral-large-latest':['mistral-large-2512', 'mistral-large-2411'],
  'ministral-8b-latest':['mistral-small-latest'],
  'pixtral-large-latest':['mistral-large-latest'],
  'mistral-large-2411':['mistral-large-latest']
});

function canonicalStageName(taskName) {
  const value=String(taskName||'').toLowerCase();
  if(value.includes('theme')||value.includes('idea'))return 'themes';
  if(value.includes('9:16')||value.includes('916')||value.includes('motion')||value.includes('visual-scenes'))return 'scenes916';
  if(value.includes('4:5')||value.includes('45')||value.includes('static-scenes'))return 'scenes45';
  if(value.includes('caption'))return 'caption';
  return 'scenes45';
}
function resolvedStageProfile(taskName, provider, overrides={}) {
  const stage=overrides.profileName||canonicalStageName(taskName);
  const base=STAGE_PROFILES[stage]||STAGE_PROFILES.scenes45;
  const providerConfig=base[provider]||{};
  return {
    stage,
    label:base.label,
    temperature:Number.isFinite(Number(overrides.temperature))?Number(overrides.temperature):0.90,
    topP:Number.isFinite(Number(overrides.topP))?Number(overrides.topP):providerConfig.topP,
    thinkingLevel:overrides.thinkingLevel||providerConfig.thinkingLevel,
    reasoningEffort:overrides.reasoningEffort||providerConfig.reasoningEffort,
    initialOutputTokens:Number(overrides.initialOutputTokens||overrides.maxOutputTokens||base.initialOutputTokens),
    maxOutputTokens:Number(overrides.tokenCeiling||base.maxOutputTokens),
    timeoutMs:Number(overrides.timeoutMs||base.timeoutMs)
  };
}
function publicStageProfiles(provider=activeProvider()) {
  return Object.fromEntries(Object.keys(STAGE_PROFILES).map(stage=>{
    const profile=resolvedStageProfile(stage,provider,{profileName:stage});
    const publicProfile={label:profile.label,temperature:profile.temperature,initialOutputTokens:profile.initialOutputTokens,maxOutputTokens:profile.maxOutputTokens,timeoutMs:profile.timeoutMs};
    if(provider==='gemini'){
      publicProfile.topP=profile.topP;
      publicProfile.thinkingLevel=profile.thinkingLevel;
    }else{
      const info=activeProviderInfo(stage);
      const supportsReasoning=mistralSupportsAdjustableReasoning(info.model);
      publicProfile.model=info.model;
      publicProfile.modelSource=info.modelSource;
      publicProfile.reasoningEffort=supportsReasoning?normalizeOpenAIReasoningEffort(profile.reasoningEffort,stage):null;
      publicProfile.reasoningSupportedValues=supportsReasoning?['high','none']:[];
      publicProfile.reasoningMode=supportsReasoning?'adjustable':'disabled_for_model';
    }
    return [stage,publicProfile];
  }));
}

function interactionGenerationConfigFor(config = {}) {
  const generationConfig = {
    temperature: config.temperature,
    top_p: config.topP,
    max_output_tokens: config.maxOutputTokens
  };
  Object.keys(generationConfig).forEach(key => generationConfig[key] === undefined && delete generationConfig[key]);
  return generationConfig;
}
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}






function isOpenAIKeyFallbackStatus(status){
  return [401,403,429].includes(Number(status));
}
function isOpenAIModelAvailabilityError(status,message){
  return [400,404,422].includes(Number(status))&&/(model|modelo).*(?:not found|unknown|invalid|unavailable|access|permission|does not exist|nÃ£o existe|indisponÃ­vel)/i.test(String(message||''));
}





function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': 'http://localhost:' + PORT,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-InkVortex-Studio-Version': STUDIO_VERSION
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function apiErrorDescriptor(error){
  const detail=sanitizeTelemetryMessage(error&&error.message?error.message:error);
  if(/generation_cancelled/i.test(detail))return {status:499,code:'cancelled',error:'A geraÃ§Ã£o foi cancelada por vocÃª.',detail};
  if(/timeoutMs|tempo limite/i.test(detail))return {status:504,code:'timeout',error:'A API ultrapassou o tempo desta etapa. O conteÃºdo anterior foi preservado.',detail};
  if(/http=429|quota|rate.?limit|limite de requisi/i.test(detail))return {status:429,code:'quota',error:'A cota ou o limite temporÃ¡rio da API foi atingido. Aguarde o intervalo indicado pelo provedor e tente novamente.',detail};
  if(/key_slot|http=401|http=403|api key|chave/i.test(detail))return {status:401,code:'key',error:'A OpenAI recusou as chaves configuradas. Verifique OPENAI_API_KEY e OPENAI_API_KEY_2 no arquivo .env.',detail};
  if(/model.*(?:not found|unknown|invalid|unavailable|access)|modelo.*(?:nÃ£o existe|indisponÃ­vel)/i.test(detail))return {status:422,code:'model',error:'O modelo configurado nÃ£o estÃ¡ disponÃ­vel nesta conta. O Studio tentou o alias da mesma famÃ­lia antes de interromper.',detail};
  if(/JSON invÃ¡lido|JSON invalido|response_format|fora do formato JSON/i.test(detail))return {status:502,code:'json',error:'A API respondeu, mas o JSON chegou invÃ¡lido ou incompleto. Nenhum conteÃºdo foi substituÃ­do.',detail};
  if(/devolveu \d+ de \d+/i.test(detail))return {status:502,code:'incomplete',error:detail,detail};
  if(/EACCES|ambiente sem permissÃ£o|fora do sandbox/i.test(detail))return {status:503,code:'runtime_network_denied',error:'A Central foi iniciada em um ambiente sem permissÃ£o para acessar a internet. Reinicie pelo iniciar-central.bat no Windows. Nenhum conteÃºdo foi substituÃ­do. Detalhe: ' + detail,detail};
  if(/connection|conexÃ£o|fetch failed|network/i.test(detail))return {status:503,code:'connection',error:'A conexÃ£o com a API falhou depois das retentativas automÃ¡ticas. Nenhum conteÃºdo foi substituÃ­do. Detalhe: ' + detail,detail};
  if(/Gere os 40 complementares|A fila final de 50 prompts/i.test(detail))return {status:400,code:'missing_prompts',error:detail,detail};
  return {status:500,code:'api',error:'A etapa foi interrompida. Detalhe tÃ©cnico: ' + detail,detail};
}
function sendApiError(res,error){
  const descriptor=apiErrorDescriptor(error);
  send(res,descriptor.status,{error:descriptor.error,code:descriptor.code,detail:descriptor.detail});
}

function readBody(req, maxSize = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > maxSize) {
        reject(new Error('Corpo da requisicao muito grande.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('JSON invalido.'));
      }
    });
    req.on('error', reject);
  });
}

function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.m4a': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.opus': 'audio/opus',
    '.webm': 'audio/webm',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac'
  }[ext] || 'application/octet-stream';
}

function serveStatic(req, res, targetFileOverride) {
  const url = new URL(req.url, 'http://localhost:' + PORT);
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const isMediaRequest = (
    pathname.startsWith('/minisseries') ||
    pathname.startsWith('/palco') ||
    pathname.startsWith('/logo-inkvortex') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/stacher') ||
    pathname.startsWith('/downloads')
  );
  
  let file;
  if (targetFileOverride && typeof targetFileOverride === 'string') {
    file = path.resolve(targetFileOverride);
  } else {
    const primaryRoot = isMediaRequest ? FILES_ROOT : CODE_ROOT;
    file = path.resolve(primaryRoot, '.' + pathname.replace(/\//g, path.sep));

    if ((!fs.existsSync(file) || fs.statSync(file).isDirectory()) && pathname.startsWith('/downloads/')) {
      const stacherAlt = path.resolve(FILES_ROOT, 'stacher', pathname.slice('/downloads/'.length).replace(/\//g, path.sep));
      if (fs.existsSync(stacherAlt) && !fs.statSync(stacherAlt).isDirectory()) {
        file = stacherAlt;
      }
    }
    
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const secondaryRoot = isMediaRequest ? CODE_ROOT : FILES_ROOT;
      const fallbackFile = path.resolve(secondaryRoot, '.' + pathname.replace(/\//g, path.sep));
      if (fs.existsSync(fallbackFile) && !fs.statSync(fallbackFile).isDirectory()) {
        file = fallbackFile;
      }
    }
  }

  const baseName = path.basename(file);
  const blockedNames = ['.env', '.git'];
  if (baseName.startsWith('.') || blockedNames.includes(baseName)) {
    send(res, 404, 'Arquivo nao encontrado.', 'text/plain; charset=utf-8');
    return;
  }

  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    send(res, 404, 'Arquivo nao encontrado.', 'text/plain; charset=utf-8');
    return;
  }
  const staticHeaders = {
    'Content-Type': mime(file),
    'X-InkVortex-Studio-Version': STUDIO_VERSION
  };
  if (/\.(?:html|js|css|json|txt|ico)$/i.test(file)) {
    staticHeaders['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
    staticHeaders.Pragma = 'no-cache';
    staticHeaders.Expires = '0';
  } else if (/\.(?:png|jpe?g|webp|gif)$/i.test(file) && url.searchParams.has('v')) {
    staticHeaders['Cache-Control'] = 'public, max-age=31536000, immutable';
  } else if (pathname.startsWith('/minisseries') || isMediaRequest) {
    staticHeaders['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
    staticHeaders.Pragma = 'no-cache';
    staticHeaders.Expires = '0';
  } else {
    staticHeaders['Cache-Control'] = 'public, max-age=300';
  }

  const isStreamableMedia = ['.mp4', '.m4a', '.mp3', '.wav', '.aac', '.opus', '.webm', '.ogg', '.flac'].includes(path.extname(file).toLowerCase());
  if (isStreamableMedia) {
    const fileSize = fs.statSync(file).size;
    const rangeHeader = String(req.headers.range || '').trim();
    staticHeaders['Accept-Ranges'] = 'bytes';

    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
      let start;
      let end;

      if (match && (match[1] || match[2])) {
        if (!match[1]) {
          const suffixLength = Number(match[2]);
          if (Number.isFinite(suffixLength) && suffixLength > 0) {
            start = Math.max(0, fileSize - suffixLength);
            end = fileSize - 1;
          }
        } else {
          start = Number(match[1]);
          end = match[2] ? Number(match[2]) : fileSize - 1;
        }
      }

      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= fileSize || end < start) {
        res.writeHead(416, {
          ...staticHeaders,
          'Content-Range': `bytes */${fileSize}`,
          'Content-Length': '0'
        });
        res.end();
        return;
      }

      end = Math.min(end, fileSize - 1);
      staticHeaders['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
      staticHeaders['Content-Length'] = String(end - start + 1);
      res.writeHead(206, staticHeaders);
      if (req.method === 'HEAD') {
        res.end();
      } else {
        fs.createReadStream(file, { start, end }).pipe(res);
      }
      return;
    }

    staticHeaders['Content-Length'] = String(fileSize);
    res.writeHead(200, staticHeaders);
    if (req.method === 'HEAD') {
      res.end();
    } else {
      fs.createReadStream(file).pipe(res);
    }
    return;
  }

  res.writeHead(200, staticHeaders);
  if (req.method === 'HEAD') {
    res.end();
  } else {
    fs.createReadStream(file).pipe(res);
  }
}


function normalizeFontLabel(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function listLocalFontFamilies() {
  const fontRoot = path.join(ROOT, 'fonts');
  if (!fs.existsSync(fontRoot)) return [];
  const formats = new Map([['.woff2','woff2'],['.woff','woff'],['.ttf','truetype'],['.otf','opentype']]);
  const records = [];
  const walk = (dir, relativeParts = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      const nextParts = [...relativeParts, entry.name];
      if (entry.isDirectory()) { walk(full, nextParts); continue; }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!formats.has(ext)) continue;
      const relativeFile = nextParts.join('/');
      const familyFolder = relativeParts.length ? relativeParts[0] : 'Fontes avulsas';
      const familyLabel = normalizeFontLabel(familyFolder) || 'Fontes avulsas';
      const stem = path.basename(entry.name, ext);
      let variationLabel = normalizeFontLabel(stem);
      const familyPrefix = new RegExp('^' + familyLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i');
      variationLabel = variationLabel.replace(familyPrefix, '').trim() || 'Regular';
      if (relativeParts.length > 1) {
        const nested = relativeParts.slice(1).map(normalizeFontLabel).filter(Boolean).join(' / ');
        if (nested) variationLabel = nested + ' / ' + variationLabel;
      }
      const familyId = 'local-family-' + Buffer.from(familyFolder, 'utf8').toString('base64url');
      const id = 'local-font-' + Buffer.from(relativeFile, 'utf8').toString('base64url');
      const encodedUrl = '/fonts/' + nextParts.map(encodeURIComponent).join('/');
      records.push({
        id,
        label: variationLabel,
        familyId,
        familyLabel,
        file: relativeFile,
        fontFamily: 'InkVortexLocal_' + id.replace(/[^a-z0-9_]/gi, '_'),
        url: encodedUrl,
        format: formats.get(ext)
      });
    }
  };
  walk(fontRoot);
  const grouped = new Map();
  for (const font of records) {
    if (!grouped.has(font.familyId)) grouped.set(font.familyId, { id: font.familyId, label: font.familyLabel, source: 'local', variants: [] });
    grouped.get(font.familyId).variants.push(font);
  }
  return [...grouped.values()]
    .map(family => ({ ...family, variants: family.variants.sort((a,b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })) }))
    .sort((a,b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }));
}

function normalizeStageBackgroundLabel(value) {
  return String(value || '')
    .replace(/^\d{1,3}[\s._-]*/, '')
    .replace(/(?:[-_ ]?1920[-_ ]?x[-_ ]?1080)$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function listStageBackgrounds() {
  const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
  const stageRoot = path.join(ROOT, 'palco');
  const records = [];
  const walk = (dir, relativeParts = []) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      const nextParts = [...relativeParts, entry.name];
      if (entry.isDirectory()) { walk(full, nextParts); continue; }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!allowed.has(ext)) continue;
      const relativeFile = nextParts.join('/');
      const stem = path.basename(entry.name, ext);
      const orderMatch = stem.match(/^(\d{1,3})(?:\D|$)/);
      const stat = fs.statSync(full);
      records.push({
        id: 'stage-user-' + Buffer.from(relativeFile, 'utf8').toString('base64url'),
        label: normalizeStageBackgroundLabel(stem) || 'Palco sem nome',
        file: 'palco/' + relativeFile,
        url: '/palco/' + nextParts.map(encodeURIComponent).join('/'),
        order: orderMatch ? Number(orderMatch[1]) : null,
        native: false,
        source: 'user',
        modifiedAt: stat.mtimeMs
      });
    }
  };
  walk(stageRoot);
  return records.sort((a, b) => {
    const aHasNumber = Number.isFinite(a.order), bHasNumber = Number.isFinite(b.order);
    if (aHasNumber && bHasNumber && a.order !== b.order) return a.order - b.order;
    if (aHasNumber !== bHasNumber) return aHasNumber ? -1 : 1;
    return a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base', numeric: true });
  });
}

function listStagePortalVideos() {
  const allowed = new Set(['.mp4', '.webm']);
  const stageRoot = path.join(ROOT, 'palco');
  if (!fs.existsSync(stageRoot)) return [];

  const records = [];
  for (const entry of fs.readdirSync(stageRoot, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || !entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!allowed.has(ext)) continue;

    const stem = path.basename(entry.name, ext);
    const orderMatch = stem.match(/^(\d{1,3})(?:\D|$)/);
    const order = orderMatch ? Number(orderMatch[1]) : null;
    const baseLabel = normalizeStageBackgroundLabel(stem) || 'Viagem sem nome';
    const stat = fs.statSync(path.join(stageRoot, entry.name));
    records.push({
      id: 'portal-video-' + Buffer.from(entry.name, 'utf8').toString('base64url'),
      label: Number.isFinite(order)
        ? `Viagem ${String(order).padStart(2, '0')} · ${baseLabel}`
        : baseLabel,
      file: 'palco/' + entry.name,
      url: '/palco/' + encodeURIComponent(entry.name),
      order,
      type: 'video',
      sizeBytes: stat.size,
      modifiedAt: stat.mtimeMs
    });
  }

  return records.sort((a, b) => {
    const aHasNumber = Number.isFinite(a.order), bHasNumber = Number.isFinite(b.order);
    if (aHasNumber && bHasNumber && a.order !== b.order) return a.order - b.order;
    if (aHasNumber !== bHasNumber) return aHasNumber ? -1 : 1;
    return a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base', numeric: true });
  });
}

function serveLogo(res){
  const localLogo=path.join(ROOT,'logo-inkvortex','logo-inkvortex.png');
  const fallbackLogo=path.join(DEFAULTS_ROOT,'logo-inkvortex','logo-inkvortex.png');
  const file=fs.existsSync(localLogo)?localLogo:fallbackLogo;
  if(!fs.existsSync(file)){send(res,404,'Logo nao encontrada.','text/plain; charset=utf-8');return;}
  res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store, no-cache, must-revalidate, max-age=0','Pragma':'no-cache','Expires':'0'});
  fs.createReadStream(file).pipe(res);
}

function serveFavicon(res){
  const localFavicon=path.join(ROOT,'logo-inkvortex','favicon.png');
  const fallbackFavicon=path.join(DEFAULTS_ROOT,'logo-inkvortex','favicon.png');
  const file=fs.existsSync(localFavicon)?localFavicon:(fs.existsSync(fallbackFavicon)?fallbackFavicon:null);
  if(!file||!fs.existsSync(file)){send(res,404,'Favicon nao encontrado.','text/plain; charset=utf-8');return;}
  res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store, no-cache, must-revalidate, max-age=0','Pragma':'no-cache','Expires':'0'});
  fs.createReadStream(file).pipe(res);
}

const API_CONTRACTS = new Proxy({}, {
  get: (target, prop) => {
    const c = contractParser.getContract(prop);
    return c ? c.prompt : null;
  }
});
const API_CONTRACT_AUDIT = { ok: true, issues: [] };

function sourceTopicFromPayload(payload) {
  const topic=payload&&payload.topic&&typeof payload.topic==='object'?payload.topic:{};
  return {
    id:String(topic.id||'').trim(), title:String(topic.title||'').trim(), angle:String(topic.angle||'').trim(), why:String(topic.why||'').trim(),
    visualDirection:String(topic.visualDirection||'').trim(), centralQuestion:String(topic.centralQuestion||'').trim(),
    editorialPromise:String(topic.editorialPromise||'').trim(), technicalTruth:String(topic.technicalTruth||'').trim(),
    avoidCliches:Array.isArray(topic.avoidCliches)?topic.avoidCliches.slice(0,12).map(value=>String(value||'').trim()).filter(Boolean):[],
    groupId:String(topic.groupId||'').trim(), groupSubject:String(topic.groupSubject||'').trim()
  };
}
function stableSerialize(value) {
  if (Array.isArray(value)) return '[' + value.map(stableSerialize).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableSerialize(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function generationIntentFromPayload(payload) {
  return String(payload&&payload.generationIntent||'new-from-idea').trim()||'new-from-idea';
}
function compactIdeaField(value,limit=120){
  const text=String(value||'').replace(/\s+/g,' ').trim();
  return text.length>limit?text.slice(0,limit-1).trimEnd()+'â€¦':text;
}
function compactIdeaSignature(item) {
  return {
    t:compactIdeaField(item&&item.title,110),
    q:compactIdeaField(item&&item.centralQuestion,130),
    m:compactIdeaField(item&&item.technicalTruth||item&&item.angle,130),
    v:compactIdeaField(item&&item.visualDirection,130)
  };
}
function representativeIdeaSignatures(items,limit=30){
  const raw=(Array.isArray(items)?items:[]).map(compactIdeaSignature).filter(item=>item.t||item.q||item.m||item.v);
  const deduped=[];const seen=new Set();
  for(const item of raw){
    const key=JSON.stringify(item).toLocaleLowerCase('pt-BR');
    if(seen.has(key))continue;
    seen.add(key);deduped.push(item);
  }
  if(deduped.length<=limit)return deduped;
  const recentCount=Math.min(18,limit),olderSlots=limit-recentCount;
  const recent=deduped.slice(-recentCount),older=deduped.slice(0,-recentCount),sampled=[];
  if(olderSlots>0&&older.length){
    for(let i=0;i<olderSlots;i++){
      const index=Math.min(older.length-1,Math.floor(i*older.length/olderSlots));
      sampled.push(older[index]);
    }
  }
  return [...sampled,...recent];
}

const REQUIRED_TEXT_SCHEMA = Object.freeze({ type: 'string', minLength: 1 });
const STRUCTURED_OUTPUT_SCHEMAS = Object.freeze({
  themes: {
    name: 'vortex_themes',
    schema: {
      type: 'object',
      properties: {
        topics: {
          type: 'array', minItems: 1, maxItems: 1,
          items: {
            type: 'object',
            properties: {
              title: REQUIRED_TEXT_SCHEMA,
              description: REQUIRED_TEXT_SCHEMA,
              angle: REQUIRED_TEXT_SCHEMA,
              centralQuestion: REQUIRED_TEXT_SCHEMA,
              editorialPromise: REQUIRED_TEXT_SCHEMA,
              technicalTruth: REQUIRED_TEXT_SCHEMA,
              why: REQUIRED_TEXT_SCHEMA,
              visualDirection: REQUIRED_TEXT_SCHEMA,
              visualUniverse: {
                type: 'object',
                properties: {
                  style: REQUIRED_TEXT_SCHEMA,
                  coreSubject: REQUIRED_TEXT_SCHEMA,
                  materialsAndTextures: REQUIRED_TEXT_SCHEMA
                },
                required: ['style', 'coreSubject', 'materialsAndTextures'],
                additionalProperties: false
              },
              socialNarrative: {
                type: 'object',
                properties: {
                  keyFacts: {
                    type: 'array',
                    minItems: 10,
                    maxItems: 10,
                    items: REQUIRED_TEXT_SCHEMA
                  },
                  keywords: {
                    type: 'array',
                    minItems: 4,
                    maxItems: 4,
                    items: REQUIRED_TEXT_SCHEMA
                  }
                },
                required: ['keyFacts', 'keywords'],
                additionalProperties: false
              },
              musicStoryArc: {
                type: 'object',
                properties: {
                  beginning: REQUIRED_TEXT_SCHEMA,
                  turningPoint: REQUIRED_TEXT_SCHEMA,
                  resolution: REQUIRED_TEXT_SCHEMA
                },
                required: ['beginning', 'turningPoint', 'resolution'],
                additionalProperties: false
              }
            },
            required: [
              'title',
              'description',
              'angle',
              'centralQuestion',
              'editorialPromise',
              'technicalTruth',
              'why',
              'visualDirection',
              'visualUniverse',
              'socialNarrative',
              'musicStoryArc'
            ],
            additionalProperties: false
          }
        }
      },
      required: ['topics'],
      additionalProperties: false
    }
  },
  scenes50: {
    name: 'vortex_scenes50',
    schema: {
      type: 'object',
      properties: {
        scenes: {
          type: 'array', minItems: 40, maxItems: 40,
          items: {
            type: 'object',
            properties: {
              index: { type: 'integer' },
              gptSceneRef: { type: 'integer' },
              block: { type: 'integer' },
              positionInBlock: { type: 'integer' },
              prompt: REQUIRED_TEXT_SCHEMA
            },
            required: ['index', 'gptSceneRef', 'block', 'positionInBlock', 'prompt'],
            additionalProperties: false
          }
        }
      },
      required: ['scenes'],
      additionalProperties: false
    }
  },
  scenes45: {
    name: 'vortex_scenes45',
    schema: {
      type: 'object',
      properties: {
        scenes45: {
          type: 'array', minItems: 10, maxItems: 10,
          items: {
            type: 'object',
            properties: {
              number: { type: 'integer' },
              title: REQUIRED_TEXT_SCHEMA,
              prompt: REQUIRED_TEXT_SCHEMA
            },
            required: ['number', 'title', 'prompt'],
            additionalProperties: false
          }
        }
      },
      required: ['scenes45'],
      additionalProperties: false
    }
  },
  caption: {
    name: 'vortex_social_caption',
    schema: {
      type: 'object',
      properties: { socialCaption: REQUIRED_TEXT_SCHEMA },
      required: ['socialCaption'],
      additionalProperties: false
    }
  },
  flowMusic: {
    name: 'vortex_flow_music',
    schema: {
      type: 'object',
      properties: {
        musicalComposition: REQUIRED_TEXT_SCHEMA,
        lyrics: REQUIRED_TEXT_SCHEMA,
        coverPrompt: REQUIRED_TEXT_SCHEMA
      },
      required: ['musicalComposition', 'lyrics', 'coverPrompt'],
      additionalProperties: false
    }
  }
});

const SCENES50_REQUIRED_FIELDS = Object.freeze([
  'block',
  'gptSceneRef',
  'index',
  'positionInBlock',
  'prompt'
]);

function validateScenes50Output(rawScenes) {
  if (!Array.isArray(rawScenes) || rawScenes.length !== 40) {
    const received = Array.isArray(rawScenes) ? rawScenes.length : 0;
    throw new Error(`Scenes50 inválido: a Mistral retornou ${received} prompts; o contrato exige exatamente 40.`);
  }

  return rawScenes.map((scene, arrayIndex) => {
    const expectedIndex = arrayIndex + 1;
    const expectedBlock = Math.floor(arrayIndex / 4) + 1;
    const expectedPosition = (arrayIndex % 4) + 2;

    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
      throw new Error(`Scenes50 inválido: o item ${expectedIndex} não é um objeto JSON.`);
    }

    const prompt = typeof scene.prompt === 'string' ? scene.prompt.trim() : '';
    if (!prompt) throw new Error(`Scenes50 inválido: o prompt ${expectedIndex} está vazio.`);

    return {
      index: expectedIndex,
      gptSceneRef: expectedBlock,
      block: expectedBlock,
      positionInBlock: expectedPosition,
      prompt
    };
  });
}

function validateScenes45Output(rawScenes) {
  if (!Array.isArray(rawScenes) || rawScenes.length !== 10) {
    const received = Array.isArray(rawScenes) ? rawScenes.length : 0;
    throw new Error(`Scenes45 inválido: a Mistral retornou ${received} cenas; o contrato exige exatamente 10.`);
  }

  return rawScenes.map((scene, arrayIndex) => {
    const expectedNumber = arrayIndex + 1;
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
      throw new Error(`Scenes45 inválido: a cena ${expectedNumber} não é um objeto JSON.`);
    }

    const rawTitle = typeof scene.title === 'string' ? scene.title : '';
    const rawPrompt = typeof scene.prompt === 'string' ? scene.prompt : '';
    const title = rawTitle.trim();
    const prompt = rawPrompt.trim();

    if (!title) throw new Error(`Scenes45 inválido: o título da cena ${expectedNumber} está vazio.`);
    if (!prompt) throw new Error(`Scenes45 inválido: o prompt da cena ${expectedNumber} está vazio.`);

    return { number: expectedNumber, title, prompt };
  });
}

const SCENES916_REQUIRED_FIELDS = Object.freeze(['motionPrompt', 'number']);

function validateScenes916Output(rawScenes) {
  if (!Array.isArray(rawScenes) || rawScenes.length !== 7) {
    const received = Array.isArray(rawScenes) ? rawScenes.length : 0;
    throw new Error(`Scenes916 inválido: a Mistral retornou ${received} movimentos; o contrato exige exatamente 7.`);
  }

  return rawScenes.map((scene, arrayIndex) => {
    const expectedNumber = arrayIndex + 1;
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
      throw new Error(`Scenes916 inválido: o movimento ${expectedNumber} não é um objeto JSON.`);
    }

    const receivedFields = Object.keys(scene).sort();
    if (receivedFields.length !== SCENES916_REQUIRED_FIELDS.length
      || receivedFields.some((field, index) => field !== SCENES916_REQUIRED_FIELDS[index])) {
      throw new Error(`Scenes916 inválido: o movimento ${expectedNumber} deve conter somente number e motionPrompt.`);
    }

    const number = Number(scene.number);
    const rawPrompt = typeof scene.motionPrompt === 'string' ? scene.motionPrompt : '';
    const motionPrompt = rawPrompt.trim();

    if (!Number.isInteger(number) || number !== expectedNumber) {
      throw new Error(`Scenes916 inválido: o movimento Gemini ${expectedNumber} deve corresponder à cena Flow ${expectedNumber}.`);
    }
    if (!motionPrompt) throw new Error(`Scenes916 inválido: o motionPrompt ${expectedNumber} está vazio.`);
    return { number, motionPrompt };
  });
}

const FLOWMASTER_ROOT_FIELDS = Object.freeze(['scenes']);
const FLOWMASTER_SCENE_FIELDS = Object.freeze([
  'imageReference',
  'number',
  'omniFlashPrompt',
  'timeRange'
]);
const FLOWMASTER_TIME_RANGES = Object.freeze([
  '0.0-2.0s',
  '2.0-4.0s',
  '4.0-6.0s',
  '6.0-8.0s',
  '8.0-10.0s'
]);
const FLOWMASTER_CAMERA_TERMS = /\b(static shot|fixed shot|pan|tilt|dolly|truck|pedestal|zoom|crane|aerial|handheld|whip pan|arc|orbit|tracking shot|rack focus|push[ -]?in|pull[ -]?back)\b/i;

function countPromptWords(value) {
  return String(value || '').trim().split(/\s+/u).filter(Boolean).length;
}

function validateFlowMasterText(value, label, minWords, maxWords) {
  const raw = typeof value === 'string' ? value : '';
  const text = raw.trim();
  if (!text) throw new Error(`FlowMaster inválido: ${label} está vazio.`);
  return text;
}

function validateFlowMasterOutput(rawFlowMaster) {
  if (!rawFlowMaster || typeof rawFlowMaster !== 'object' || Array.isArray(rawFlowMaster)) {
    throw new Error('FlowMaster inválido: a resposta deve ser um objeto JSON.');
  }

  const rootFields = Object.keys(rawFlowMaster).sort();
  if (!rootFields.includes('scenes') || rootFields.some(f => f !== 'scenes')) {
    throw new Error('FlowMaster inválido: a raiz deve conter somente a chave scenes.');
  }


  if (!Array.isArray(rawFlowMaster.scenes) || rawFlowMaster.scenes.length !== 5) {
    const received = Array.isArray(rawFlowMaster.scenes) ? rawFlowMaster.scenes.length : 0;
    throw new Error(`FlowMaster inválido: foram recebidas ${received} cenas; o contrato exige exatamente 5.`);
  }

  const scenes = rawFlowMaster.scenes.map((scene, index) => {
    const number = index + 1;
    const reference = `[${String(number).padStart(2, '0')}]`;
    const timeRange = FLOWMASTER_TIME_RANGES[index];
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
      throw new Error(`FlowMaster inválido: a Scene ${number} não é um objeto JSON.`);
    }

    const sceneFields = Object.keys(scene).sort();
    if (sceneFields.length !== FLOWMASTER_SCENE_FIELDS.length
      || sceneFields.some((field, fieldIndex) => field !== FLOWMASTER_SCENE_FIELDS[fieldIndex])) {
      throw new Error(`FlowMaster inválido: a Scene ${number} contém campos ausentes ou adicionais.`);
    }
    if (Number(scene.number) !== number) {
      throw new Error(`FlowMaster inválido: a posição ${number} deve possuir number ${number}.`);
    }
    if (scene.imageReference !== reference) {
      throw new Error(`FlowMaster inválido: a Scene ${number} deve usar exclusivamente imageReference "${reference}".`);
    }
    if (scene.timeRange !== timeRange) {
      throw new Error(`FlowMaster inválido: a Scene ${number} deve usar timeRange "${timeRange}".`);
    }

    const omniFlashPrompt = validateFlowMasterText(scene.omniFlashPrompt, `omniFlashPrompt da Scene ${number}`, 20, 70);
    return {
      number,
      imageReference: reference,
      timeRange,
      omniFlashPrompt
    };
  });

  return { scenes };
}

const FLOW_MUSIC_ROOT_FIELDS = Object.freeze(['coverPrompt', 'lyrics', 'musicalComposition']);

function auditFlowMusicOutput(rawFlowMusic) {
  return validateFlowMusicOutput(rawFlowMusic);
}

function validateFlowMusicOutput(rawFlowMusic) {
  if (!rawFlowMusic || typeof rawFlowMusic !== 'object' || Array.isArray(rawFlowMusic)) {
    throw new Error('FlowMusic inválido: a resposta deve ser um objeto JSON.');
  }
  const lyrics = typeof rawFlowMusic.lyrics === 'string' ? rawFlowMusic.lyrics.trim() : '';
  const musicalComposition = typeof rawFlowMusic.musicalComposition === 'string'
    ? rawFlowMusic.musicalComposition.trim()
    : (typeof rawFlowMusic.sound === 'string' ? rawFlowMusic.sound.trim() : '');
  const coverPrompt = typeof rawFlowMusic.coverPrompt === 'string' ? rawFlowMusic.coverPrompt.trim() : '';
  const negativePrompt = typeof rawFlowMusic.negativePrompt === 'string' ? rawFlowMusic.negativePrompt.trim() : '';
  const voice = typeof rawFlowMusic.voice === 'string' ? rawFlowMusic.voice.trim() : '';

  if (!lyrics || !musicalComposition) {
    throw new Error('FlowMusic inválido: lyrics e musicalComposition devem conter texto utilizável.');
  }
  return { lyrics, musicalComposition, negativePrompt, voice, coverPrompt };
}

const CAPTION_ROOT_FIELDS = Object.freeze(['socialCaption']);

function auditCaptionOutput(rawCaptionResult) {
  return validateCaptionOutput(rawCaptionResult);
}

function validateCaptionOutput(rawCaptionResult) {
  if (typeof rawCaptionResult === 'string' && rawCaptionResult.trim()) {
    return { socialCaption: rawCaptionResult.trim() };
  }
  if (!rawCaptionResult || typeof rawCaptionResult !== 'object' || Array.isArray(rawCaptionResult)) {
    throw new Error('Caption inválido: a resposta não contém texto utilizável.');
  }
  const candidates = [
    rawCaptionResult.socialCaption,
    rawCaptionResult.caption,
    rawCaptionResult.social_caption,
    rawCaptionResult.text,
    ...Object.values(rawCaptionResult)
  ];
  const socialCaption = candidates.find(value => typeof value === 'string' && value.trim());
  if (!socialCaption) throw new Error('Caption inválido: a resposta não contém texto utilizável.');
  return { socialCaption: socialCaption.trim() };
}


function parseCaptionResult(result, expectedNumber, expectedTitle) {
  let parsed = result;
  if (result && typeof result.rawText === 'string') {
    try {
      parsed = JSON.parse(result.rawText.trim());
    } catch (_) {
      parsed = result.rawText;
    }
  }
  return validateCaptionOutput(parsed, expectedNumber, expectedTitle);
}


// â”€â”€ ALINHAMENTO TEMPORAL M4A + TXT (OPENAI WHISPER-1 + NEEDLEMAN-WUNSCH) â”€â”€

const AUDIO_TIKTOK_ASS_OPTIONS = Object.freeze({
  playResX: 1080,
  playResY: 1080,
  fontSize: 60,
  marginHorizontal: 36,
  marginVertical: 120,
  maxWordsPerPhrase: 4
});




function resolveAudioRenderAssets(payload, options = {}) {
  const requireCover = options.requireCover !== false;
  const campNum = sanitizeNumericId(payload.campaignNum || payload.cNum || payload.id || '15');
  const sonoDir = safeJoin(ROOT, 'minisseries', campNum, 'sonoplastia');
  const m4aDir = path.join(sonoDir, 'm4a');
  const assDir = path.join(sonoDir, 'ass');
  const mp4Dir = path.join(sonoDir, 'mp4');

  if (!fs.existsSync(m4aDir)) {
    throw new Error(`Falta a pasta de áudio: /minisseries/${campNum}/sonoplastia/m4a/`);
  }

  const m4aFiles = fs.readdirSync(m4aDir);
  let rawM4aFile = null;

  if (payload.m4aFile) {
    rawM4aFile = m4aFiles.find(file => file.toLowerCase() === String(payload.m4aFile).toLowerCase())
      || m4aFiles.find(file => file.toLowerCase().includes(String(payload.m4aFile).toLowerCase().replace('.m4a', '')));
  }
  if (!rawM4aFile) {
    rawM4aFile = m4aFiles.find(file => file.toLowerCase().endsWith('.m4a') && !file.toLowerCase().includes('_vocals') && !file.toLowerCase().includes('legendado'));
  }
  if (!rawM4aFile) {
    rawM4aFile = m4aFiles.find(file => file.toLowerCase().endsWith('.m4a') && !file.toLowerCase().includes('legendado'));
  }
  if (!rawM4aFile) {
    throw new Error(`Falta o arquivo M4A em /minisseries/${campNum}/sonoplastia/m4a/`);
  }

  const vocalFile = rawM4aFile;
  const vocalPath = path.join(m4aDir, rawM4aFile);
  const baseName = path.basename(rawM4aFile, path.extname(rawM4aFile)).replace(/_vocals$/i, '');
  let lyricsFile = m4aFiles.find(file => file.toLowerCase() === `${baseName.toLowerCase()}.txt`) || null;
  if (!lyricsFile) {
    const txtCandidates = m4aFiles.filter(file => file.toLowerCase().endsWith('.txt') && !file.toLowerCase().endsWith('.ass'));
    if (txtCandidates.length === 1) {
      lyricsFile = txtCandidates[0];
    } else if (txtCandidates.length > 1) {
      lyricsFile = txtCandidates.find(file => file.toLowerCase().includes(baseName.toLowerCase()) || baseName.toLowerCase().includes(file.toLowerCase().replace('.txt', '')))
        || txtCandidates.find(file => file.toLowerCase() === 'letra.txt')
        || null;
    }
  }
  const lyricsPath = lyricsFile ? path.join(m4aDir, lyricsFile) : null;

  fs.mkdirSync(assDir, { recursive: true });
  fs.mkdirSync(mp4Dir, { recursive: true });

  // Resolução da Capa: Prioridade na pasta m4a com o mesmo nome do M4A
  let coverImagePath = null;
  const directM4aCover = m4aFiles.find(file => {
    const fn = file.toLowerCase();
    return fn === `${baseName.toLowerCase()}.jpg` || fn === `${baseName.toLowerCase()}.jpeg` || fn === `${baseName.toLowerCase()}.png` || fn === `${baseName.toLowerCase()}.webp`;
  });
  if (directM4aCover) {
    coverImagePath = path.join(m4aDir, directM4aCover);
  } else {
    const genericM4aCover = m4aFiles.find(file => /^(capa|cover)\.(jpg|jpeg|png|webp)$/i.test(file)) || m4aFiles.find(file => /\.(jpg|jpeg|png|webp)$/i.test(file));
    if (genericM4aCover) {
      coverImagePath = path.join(m4aDir, genericM4aCover);
    } else if (fs.existsSync(mp4Dir)) {
      const mp4Files = fs.readdirSync(mp4Dir);
      const mp4Cover = mp4Files.find(file => /^(capa|cover)\.(jpg|jpeg|png|webp)$/i.test(file)) || mp4Files.find(file => /\.(jpg|jpeg|png|webp)$/i.test(file));
      if (mp4Cover) coverImagePath = path.join(mp4Dir, mp4Cover);
    }
  }

  if (requireCover && !coverImagePath) {
    throw new Error(`Falta a imagem de capa em /minisseries/${campNum}/sonoplastia/m4a/ (${baseName}.jpg ou capa.jpg).`);
  }

  return {
    campNum,
    baseName,
    rawM4aFile,
    vocalFile,
    lyricsFile,
    m4aDir,
    assDir,
    mp4Dir,
    audioPath: path.join(m4aDir, rawM4aFile),
    vocalPath,
    lyricsPath,
    coverImagePath
  };
}

async function renderAudioAssSinglePass(assets, assContent) {
  if (!String(assContent || '').trim()) {
    throw new Error('ConteÃºdo ASS nÃ£o fornecido.');
  }

  const assFilePath = path.join(assets.assDir, `${assets.baseName} legendado.ass`);
  const outputLegendadoMp4Path = path.join(assets.mp4Dir, `${assets.baseName} legendado.mp4`);
  fs.writeFileSync(assFilePath, assContent, 'utf8');

  const durationText = await videoService.getAudioDurationStr(assets.audioPath);
  const measuredDuration = Number.parseFloat(durationText);
  const duration = Number.isFinite(measuredDuration) && measuredDuration > 0 ? measuredDuration : 180;
  const durationArg = duration.toFixed(3);
  const ffmpegPath = videoService.getFfmpegPath();
  const escapedAssPath = assFilePath
    .replace(/\\/g, '/')
    .replace(':', '\\:')
    .replace(/'/g, "\\'");

  const escapedFontsDir = path.join(__dirname, '..', 'fonts', 'Space_Grotesk')
    .replace(/\\/g, '/')
    .replace(':', '\\:');
  const videoFilter = `scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,setsar=1,fps=25,subtitles='${escapedAssPath}':fontsdir='${escapedFontsDir}'`;
  const singlePass = `${ffmpegPath} -y -loop 1 -framerate 25 -i "${assets.coverImagePath}" -i "${assets.audioPath}" -map 0:v:0 -map 1:a:0 -vf "${videoFilter}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 192k -t ${durationArg} -shortest -movflags +faststart "${outputLegendadoMp4Path}"`;

  try {
    console.log(`🎵 ÁUDIO #${assets.campNum} — PASSAGEM ÚNICA: capa + M4A + ASS TikTok → MP4 final.`);
    await videoService.execFfmpegAsync(singlePass);
  } catch (error) {
    throw new Error(`Renderização de áudio interrompida: ${error.message || error}`);
  }

  return {
    success: true,
    ok: true,
    campaignNum: assets.campNum,
    rawM4aFile: assets.rawM4aFile,
    lyricsFile: assets.lyricsFile,
    assFileName: path.basename(assFilePath),
    outputLegendadoName: path.basename(outputLegendadoMp4Path),
    url: `/minisseries/${assets.campNum}/sonoplastia/mp4/${encodeURIComponent(path.basename(outputLegendadoMp4Path))}`,
    width: 1080,
    height: 1080,
    mode: 'audio-cover-single-pass'
  };
}

async function apiGenerateM4AASS(payload) {
  const assets = resolveAudioRenderAssets(payload, { requireCover: false });
  const targetAudio = assets.vocalPath || assets.audioPath;
  console.log(`🎙️ ÁUDIO #${assets.campNum}: Transcrevendo via OpenAI Whisper-1 (${path.basename(targetAudio)})...`);
  const result = await alignM4AText(targetAudio, AUDIO_TIKTOK_ASS_OPTIONS);
  const assContent = typeof result === 'object' ? result.assContent : result;
  const rawText = typeof result === 'object' ? result.rawText : '';
  const alignedWords = typeof result === 'object' ? result.alignedWords : [];

  // Gravação automática do arquivo .ass no disco
  const assFilePath = path.join(assets.assDir, `${assets.baseName} legendado.ass`);
  fs.mkdirSync(assets.assDir, { recursive: true });
  fs.writeFileSync(assFilePath, assContent, 'utf8');
  console.log(`✅ Arquivo ASS gravado no disco: ${path.basename(assFilePath)}`);

  // Renderização automática do MP4 em passagem única no disco se houver capa
  const mp4Files = fs.existsSync(assets.mp4Dir) ? fs.readdirSync(assets.mp4Dir) : [];
  const coverFile = mp4Files.find(file => /^(capa|cover)\.(jpg|jpeg|png|webp)$/i.test(file));
  if (coverFile) {
    console.log(`🎬 Renderizando MP4 final no disco via FFmpeg em passagem única...`);
    await renderAudioAssSinglePass(assets, assContent);
  }

  return { success: true, ok: true, campaignNum: assets.campNum, assContent, rawText, alignedWords, vocalFile: assets.vocalFile || assets.rawM4aFile, outputLegendadoName: `${assets.baseName} legendado.mp4` };
}

async function apiBurnM4AASS(payload) {
  const assets = resolveAudioRenderAssets(payload);
  let assContent = payload.assContent;
  if (payload.editedRawText && payload.alignedWords && payload.alignedWords.length > 0) {
    const { buildAssFromEditedRawText } = require('./services/audio_service');
    assContent = buildAssFromEditedRawText(payload.alignedWords, payload.editedRawText, AUDIO_TIKTOK_ASS_OPTIONS);
  }
  return renderAudioAssSinglePass(assets, assContent);
}

function findFirstExt(targetDir, ext) {
  if (!targetDir || !fs.existsSync(targetDir)) return null;
  try {
    const files = fs.readdirSync(targetDir);
    const found = files.find(f => f.toLowerCase().endsWith(ext.toLowerCase()));
    return found ? path.join(targetDir, found) : null;
  } catch(e) { return null; }
}

async function renderAudioM4AForCampaign(payload) {
  const assets = resolveAudioRenderAssets(payload);
  const targetAudio = assets.vocalPath || assets.audioPath;
  console.log(`🎙️ ÁUDIO #${assets.campNum}: Transcrevendo via OpenAI Whisper-1 (${path.basename(targetAudio)})...`);
  const result = await alignM4AText(targetAudio, AUDIO_TIKTOK_ASS_OPTIONS);
  const assContent = typeof result === 'object' ? result.assContent : result;
  return renderAudioAssSinglePass(assets, assContent);
}

async function renderM4AVideoForCampaign(payload) {
  const campNum = sanitizeNumericId(payload.campaignNum || payload.id || '15');
  let m4aDir = safeJoin(ROOT, 'minisseries', campNum, 'sonoplastia', 'm4a');

  if (!fs.existsSync(m4aDir)) {
    m4aDir = safeJoin(ROOT, 'minisseries', campNum, 'sonoplastia');
  }

  if (!fs.existsSync(m4aDir)) {
    fs.mkdirSync(m4aDir, { recursive: true });
  }

  const files = fs.readdirSync(m4aDir);
  const rawM4aFile = files.find(f => f.toLowerCase().endsWith('.m4a') && !f.toLowerCase().includes('legendado'));

  if (!rawM4aFile) {
    throw new Error(`Nenhum arquivo M4A cru encontrado na pasta /minisseries/${campNum}/sonoplastia/m4a/`);
  }

  const baseName = path.basename(rawM4aFile, path.extname(rawM4aFile));
  const audioPath = path.join(m4aDir, rawM4aFile);

  // Pasta Ãºnica centralizada para arquivos temporÃ¡rios e finais (NUNCA usa sonoplastia/m4a/)
  const videoSocialDir = safeJoin(ROOT, 'minisseries', 'video social');
  if (!fs.existsSync(videoSocialDir)) {
    fs.mkdirSync(videoSocialDir, { recursive: true });
  }

  // 1. Medir DuraÃ§Ã£o Total do M4A via ffprobe
  let duration = 180;
  try {
    const durStr = await videoService.getAudioDurationStr(audioPath);
    duration = parseFloat(durStr) || 180;
  } catch(e) {}

  // LocalizaÃ§Ã£o dos Componentes no Disco
  const flowDir = safeJoin(ROOT, 'minisseries', campNum, 'flow');
  const mFolderDir = safeJoin(ROOT, 'minisseries', campNum, `M${campNum}`);
  const logoDir = safeJoin(ROOT, 'minisseries', 'logo');

  const masterVideo = findFirstExt(flowDir, '.mp4') || findFirstExt(flowDir, '.mov');
  const logoVideo = findFirstExt(logoDir, '.mp4') || findFirstExt(logoDir, '.mov');

  // 2. Medir DuraÃ§Ã£o Real e Exata dos VÃ­deos Master e Logo via ffprobe
  let masterDuration = 10;
  if (masterVideo && fs.existsSync(masterVideo)) {
    try {
      const durStr = await videoService.getAudioDurationStr(masterVideo);
      masterDuration = parseFloat(durStr) || 10;
    } catch(e) {}
  }

  let logoDuration = 10;
  if (logoVideo && fs.existsSync(logoVideo)) {
    try {
      const durStr = await videoService.getAudioDurationStr(logoVideo);
      logoDuration = parseFloat(durStr) || 10;
    } catch(e) {}
  }

  const remainingForImages = Math.max(10, duration - (masterDuration + logoDuration));
  const imageDuration = remainingForImages / 50;

  console.log(`ðŸŽ¬ MULTIVERSO MINISSÃ‰RIES 16:9 WIDESCREEN: M4A=${duration.toFixed(2)}s | Master=${masterDuration.toFixed(2)}s | Logo=${logoDuration.toFixed(2)}s | 50 Imagens=${remainingForImages.toFixed(2)}s (${imageDuration.toFixed(2)}s cada)`);

  const imagePaths = [];
  if (fs.existsSync(mFolderDir)) {
    for (let i = 1; i <= 50; i++) {
      const numPadded = String(i).padStart(3, '0');
      let p = path.join(mFolderDir, `img_${numPadded}.jpg`);
      if (!fs.existsSync(p)) p = path.join(mFolderDir, `img_${numPadded}.png`);
      if (fs.existsSync(p)) imagePaths.push(p);
    }
  }

  const W = 1920;
  const H = 1080;
  const staticScale = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=25`;

  // --- PASSAGEM 1: VÃ­deo Master + 50 Imagens M[cNum] + Logo (Todos os temporÃ¡rios em /video social/) ---
  const imagesConcatTxt = path.join(videoSocialDir, `${campNum}_images_concat.txt`);
  const middleImagesMp4 = path.join(videoSocialDir, `${campNum}_middle_images.mp4`);
  let imgTxtContent = '';

  const totalImgs = imagePaths.length > 0 ? imagePaths.length : 50;
  const perImgDur = remainingForImages / totalImgs;
  imagePaths.forEach(img => {
    const escImg = img.replace(/\\/g, '/');
    imgTxtContent += `file '${escImg}'\nduration ${perImgDur.toFixed(4)}\n`;
  });
  if (imagePaths.length > 0) {
    const lastImg = imagePaths[imagePaths.length - 1].replace(/\\/g, '/');
    imgTxtContent += `file '${lastImg}'\n`;
  }
  fs.writeFileSync(imagesConcatTxt, imgTxtContent, 'utf8');

  console.log(`ðŸŽ¬ Gerando vÃ­deo intermediÃ¡rio das 50 fotos (${remainingForImages.toFixed(2)}s total em video social)...`);
  const cmdImages = `${videoService.getFfmpegPath()} -y -f concat -safe 0 -i "${imagesConcatTxt}" -vf "${staticScale}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${middleImagesMp4}"`;
  await videoService.execFfmpegAsync(cmdImages);

  // Step B: Concatena Master + middle_images.mp4 + Logo
  const baseMp4Path = path.join(videoSocialDir, `${campNum}_temp_base.mp4`);
  const socialFinalPath = path.join(videoSocialDir, `${campNum} - ${baseName}.mp4`);

  const inputs = [];
  const filterInputs = [];
  let idx = 0;

  if (masterVideo && fs.existsSync(masterVideo)) {
    inputs.push(`-t ${masterDuration.toFixed(4)} -i "${masterVideo}"`);
    filterInputs.push(`[${idx}:v]${staticScale}[v${idx}]`);
    idx++;
  } else {
    inputs.push(`-f lavfi -i color=c=0x0a0f1e:s=${W}x${H}:r=25:d=10`);
    filterInputs.push(`[${idx}:v]${staticScale}[v${idx}]`);
    idx++;
  }

  inputs.push(`-i "${middleImagesMp4}"`);
  filterInputs.push(`[${idx}:v]${staticScale}[v${idx}]`);
  idx++;

  if (logoVideo && fs.existsSync(logoVideo)) {
    inputs.push(`-t ${logoDuration.toFixed(4)} -i "${logoVideo}"`);
    filterInputs.push(`[${idx}:v]${staticScale}[v${idx}]`);
    idx++;
  } else {
    inputs.push(`-f lavfi -i color=c=0x0a0f1e:s=${W}x${H}:r=25:d=10`);
    filterInputs.push(`[${idx}:v]${staticScale}[v${idx}]`);
    idx++;
  }

  let concatStr = '';
  for (let i = 0; i < idx; i++) {
    concatStr += `[v${i}]`;
  }
  concatStr += `concat=n=${idx}:v=1:a=0[outv]`;

  const filterComplex1 = filterInputs.join(';') + ';' + concatStr;

  console.log(`ðŸŽ¬ ETAPA 1 (Passagem 1): Concatenando Master (${masterDuration.toFixed(1)}s) + 50 Fotos (${remainingForImages.toFixed(1)}s) + Logo (${logoDuration.toFixed(1)}s)...`);
  const cmdPass1 = `${videoService.getFfmpegPath()} -y ${inputs.join(' ')} -filter_complex "${filterComplex1}" -map "[outv]" -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${baseMp4Path}"`;
  await videoService.execFfmpegAsync(cmdPass1);
  console.log(`âœ… ETAPA 1 CONCLUÃDA: ${path.basename(baseMp4Path)}`);

  if (fs.existsSync(imagesConcatTxt)) try { fs.unlinkSync(imagesConcatTxt); } catch(e) {}
  if (fs.existsSync(middleImagesMp4)) try { fs.unlinkSync(middleImagesMp4); } catch(e) {}

  // --- PASSAGEM 2: InclusÃ£o do Ãudio M4A Integral + Queima das Legendas ASS 16:9 ---
  console.log(`ðŸŽ™ï¸ ETAPA 2 (Passagem 2): Gerando marcas ASS 16:9 e aplicando Ã¡udio M4A...`);
  const assContent = await alignM4AText(audioPath);
  const assFilePath = path.join(videoSocialDir, `${campNum}_temp.ass`);
  fs.writeFileSync(assFilePath, assContent, 'utf8');

  const escAssPath = assFilePath.replace(/\\/g, '/').replace(':', '\\:');
  const escAudioPath = audioPath.replace(/\\/g, '/');

  const cmdPass2 = `${videoService.getFfmpegPath()} -y -i "${baseMp4Path}" -i "${audioPath}" -filter_complex "[0:v]subtitles='${escAssPath}'[outv]" -map "[outv]" -map 1:a -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 192k -t ${duration} "${socialFinalPath}"`;
  await videoService.execFfmpegAsync(cmdPass2);

  console.log(`âœ… ETAPA 2 CONCLUÃDA! VÃ­deo Final 16:9 salvo EXCLUSIVAMENTE em /minisseries/video social/: ${path.basename(socialFinalPath)}`);

  if (fs.existsSync(baseMp4Path)) try { fs.unlinkSync(baseMp4Path); } catch(e) {}
  if (fs.existsSync(assFilePath)) try { fs.unlinkSync(assFilePath); } catch(e) {}

  return {
    success: true,
    campaignNum: campNum,
    rawM4aFile: rawM4aFile,
    outputLegendadoName: path.basename(socialFinalPath),
    videoSocialUrl: `/minisseries/video social/${encodeURIComponent(path.basename(socialFinalPath))}`,
    assFileName: path.basename(assFilePath),
    status: `MinissÃ©rie ${campNum} em 16:9 Widescreen (2 Passagens) salva em /minisseries/video social/!`
  };
}

async function renderFinalMinisserieVideo(payload) {
  return finalMinisserieRenderer.renderFinalMinisserieVideo(payload);
}

async function apiTranscribeM4AVideo(payload) {
  const assets = resolveAudioRenderAssets(payload, { requireCover: false });
  const targetAudio = assets.vocalPath || assets.audioPath;
  const result = await alignM4AText(targetAudio, AUDIO_TIKTOK_ASS_OPTIONS);
  const durationText = await videoService.getAudioDurationStr(targetAudio);
  const duration = Number.parseFloat(durationText) || 180;

  return {
    ok: true,
    success: true,
    campaignNum: assets.campNum,
    rawM4aFile: assets.rawM4aFile,
    lyricsFile: assets.lyricsFile,
    words: result.alignedWords,
    alignedWords: result.alignedWords,
    rawText: result.rawText,
    assContent: result.assContent,
    duration
  };
}

async function apiRenderM4AVideoFinal(payload) {
  const campNum = sanitizeNumericId(payload.campaignNum || payload.id || '15');
  const m4aDir = safeJoin(ROOT, 'minisseries', campNum, 'sonoplastia', 'm4a');
  
  const files = fs.readdirSync(m4aDir);
  const rawM4aFile = files.find(f => f.toLowerCase().endsWith('.m4a') && !f.toLowerCase().includes('legendado'));

  if (!rawM4aFile) {
    throw new Error(`Nenhum arquivo M4A cru encontrado na pasta /minisseries/${campNum}/sonoplastia/m4a/`);
  }

  const baseName = path.basename(rawM4aFile, path.extname(rawM4aFile));
  const audioPath = path.join(m4aDir, rawM4aFile);

  let coverImagePath = files.find(f => /^(capa|cover|01)\.(jpg|jpeg|png|webp)$/i.test(f) || (/\.(jpg|jpeg|png|webp)$/i.test(f) && !f.includes('legendado')));
  if (coverImagePath) {
    coverImagePath = path.join(m4aDir, coverImagePath);
  } else {
    const imgDir = safeJoin(ROOT, 'minisseries', campNum, `M${campNum}`);
    if (fs.existsSync(imgDir)) {
      const imgFiles = fs.readdirSync(imgDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
      if (imgFiles.length > 0) {
        coverImagePath = path.join(imgDir, imgFiles[0]);
      }
    }
  }

  const words = payload.words || [];
  if (words.length === 0) throw new Error("Nenhuma palavra fornecida para renderizaÃ§Ã£o.");

  const MAX_WORDS_PER_PHRASE = 4;
  const MAX_GAP_SECONDS = 1.0;
  
  const phrases = [];
  let currentPhrase = [];
  
  for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (currentPhrase.length > 0) {
          const lastW = currentPhrase[currentPhrase.length - 1];
          if (w.start - lastW.end > MAX_GAP_SECONDS) {
              phrases.push(currentPhrase);
              currentPhrase = [];
          }
      }
      currentPhrase.push(w);
      if (currentPhrase.length >= MAX_WORDS_PER_PHRASE) {
          phrases.push(currentPhrase);
          currentPhrase = [];
      }
  }
  if (currentPhrase.length > 0) phrases.push(currentPhrase);

  function formatTime(sec) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 100);
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  let assEvents = '';
  for (let pIdx = 0; pIdx < phrases.length; pIdx++) {
      const phrase = phrases[pIdx];
      const nextPhrase = phrases[pIdx + 1];
      
      for (let wIdx = 0; wIdx < phrase.length; wIdx++) {
          const activeWord = phrase[wIdx];
          const nextWord = phrase[wIdx + 1];
          const startT = formatTime(activeWord.start);
          
          let endTimeSec;
          if (nextWord) {
              endTimeSec = nextWord.start;
          } else {
              const nextPhraseStart = nextPhrase ? nextPhrase[0].start : null;
              endTimeSec = nextPhraseStart ? Math.min(activeWord.end + 0.5, nextPhraseStart) : (activeWord.end + 0.5);
          }
          endTimeSec = Math.max(activeWord.start + 0.05, endTimeSec);
          const endT = formatTime(endTimeSec);
          
          let lineText = '';
          for (let j = 0; j < phrase.length; j++) {
              const w = phrase[j].word.trim();
              if (j === wIdx) {
                  lineText += `{\\c&H0000E6FF&\\fscx112\\fscy112}${w}{\\r} `;
              } else {
                  lineText += `{\\c&H00FFFFFF&\\fscx100\\fscy100}${w}{\\r} `;
              }
          }
          assEvents += `Dialogue: 0,${startT},${endT},TikTok,,0,0,0,,${lineText.trim()}\n`;
      }
  }

  const assHeader = `[Script Info]
Title: TikTok Subtitles
ScriptType: v4.00+
WrapStyle: 1
ScaledBorderAndShadow: yes
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TikTok,Space Grotesk,80,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,6,3,2,40,40,140,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const assContent = assHeader + assEvents;
  const assFilePath = path.join(m4aDir, `${baseName} legendado.ass`);
  fs.writeFileSync(assFilePath, assContent, 'utf8');

  const baseMp4Path = path.join(m4aDir, `${baseName} base.mp4`);
  const outputLegendadoMp4Path = path.join(m4aDir, `${baseName} legendado.mp4`);

  let duration = 180;
  try {
    const durStr = await videoService.getAudioDurationStr(audioPath);
    duration = parseFloat(durStr) || 180;
  } catch(e) {}

  console.log(`ðŸŽ¬ Etapa 1: Gerando pista MP4 base com Capa e Ãudio via FFmpeg (DuraÃ§Ã£o: ${duration}s)...`);
  
  let ffmpegStage1 = '';
  if (coverImagePath && fs.existsSync(coverImagePath)) {
    const escCoverPath = coverImagePath.replace(/\\/g, '/');
    ffmpegStage1 = `${videoService.getFfmpegPath()} -y -loop 1 -framerate 2 -i "${escCoverPath}" -i "${audioPath}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -preset ultrafast -tune stillimage -c:a aac -b:a 192k -t ${duration} "${baseMp4Path}"`;
  } else {
    ffmpegStage1 = `${videoService.getFfmpegPath()} -y -f lavfi -i color=c=0x0a0f1e:s=1080x1080:r=2 -i "${audioPath}" -c:v libx264 -preset ultrafast -c:a aac -b:a 192k -t ${duration} "${baseMp4Path}"`;
  }

  await videoService.execFfmpegAsync(ffmpegStage1);
  console.log(`âœ… Etapa 1 ConcluÃ­da! Pista base gerada: ${path.basename(baseMp4Path)}`);

  console.log(`ðŸŽ¬ Etapa 2: Queimando legendas na pista base...`);
  const escAssPath = assFilePath.replace(/\\/g, '/').replace(':', '\\:');
  const ffmpegStage2 = `${videoService.getFfmpegPath()} -y -i "${baseMp4Path}" -vf "subtitles='${escAssPath}'" -c:v libx264 -preset ultrafast -c:a copy "${outputLegendadoMp4Path}"`;
  
  await videoService.execFfmpegAsync(ffmpegStage2);
  console.log(`âœ… Etapa 2 ConcluÃ­da! VÃ­deo legendado MP4 gerado com sucesso: ${path.basename(outputLegendadoMp4Path)}`);
  
  if (fs.existsSync(baseMp4Path)) {
     fs.unlinkSync(baseMp4Path);
  }

  return { 
    success: true, 
    campaignNum: campNum, 
    rawM4aFile: rawM4aFile, 
    outputLegendadoName: path.basename(outputLegendadoMp4Path), 
    assFileName: path.basename(assFilePath)
  };
}

async function generateFlowMusicPrompt(payload) {
  const source = payload || {};
  const style = String(source.estiloMusical || '').replace(/\s+/gu, ' ').trim();
  const variation = String(source.variacaoMusical || '').replace(/\s+/gu, ' ').trim();
  const selectedVoice = String(source.voz || '').replace(/\s+/gu, ' ').trim();
  const miniseriesTitle = String(source.title || '').replace(/\s+/gu, ' ').trim();
  const masterContext = String(source.context || '').trim();
  const sourceScenes = Array.isArray(source.scenes) ? source.scenes : [];

  if (!style || !variation || !selectedVoice || !miniseriesTitle || !masterContext) {
    throw new Error('FlowMusic: estilo, variação, voz, título e Contexto Master são obrigatórios.');
  }

  let userPrompt = `ESTILO MUSICAL: ${style}
VARIAÇÃO MUSICAL: ${variation}
VOZ: ${selectedVoice}
TÍTULO DA MINISSÉRIE: ${miniseriesTitle}

CONTEXTO MESTRE:
${masterContext}`;

  const topicObj = source.topic || (source.campaign && source.campaign.topic) || (source.musicStoryArc ? { musicStoryArc: source.musicStoryArc } : null);
  if (topicObj && topicObj.musicStoryArc && typeof topicObj.musicStoryArc === 'object') {
    const ma = topicObj.musicStoryArc;
    const maParts = [];
    if (ma.beginning) maParts.push(`Início: ${ma.beginning}`);
    if (ma.turningPoint) maParts.push(`Ponto de Virada: ${ma.turningPoint}`);
    if (ma.resolution) maParts.push(`Resolução: ${ma.resolution}`);
    if (maParts.length > 0) {
      userPrompt += `\n\nARCO NARRATIVO DA HISTÓRIA (GENOMA):\n${maParts.join('\n')}`;
    }
  }

  console.log(`🎵 Gerando briefing direto do Flow Music via Mistral para: ${style} - ${variation} | ${selectedVoice}...`);

  const result = await generateStage({
    taskName: 'flowMusic',
    profileName: 'flowMusic',
    prompt: userPrompt,
    responseSchema: STRUCTURED_OUTPUT_SCHEMAS.flowMusic,
    strictJson: true,
    validateResult: parsed => validateFlowMusicOutput(parsed, {
      title: miniseriesTitle,
      style,
      variation,
      voice: selectedVoice
    }),
    contract: API_CONTRACTS.flowMusic
  });

  const lyricsStr = result.lyrics;
  const compositionStr = result.musicalComposition;
  const coverPromptStr = result.coverPrompt || '';
  const prompt = `[LYRICS]\n${lyricsStr}\n\n[SOUND / SOM (ESTILO + VOZ)]\n${compositionStr}${coverPromptStr ? `\n\n[COVER / ALBUM ARTWORK (1024x1024)]\n${coverPromptStr}` : ''}`;

  try {
    const campNum = sanitizeNumericId(source.campaignNum || source.campaign || '01');
    const flowMusicDir = safeJoin(ROOT, 'minisseries', campNum, 'sonoplastia', 'flow-music');
    if (!fs.existsSync(flowMusicDir)) {
      fs.mkdirSync(flowMusicDir, { recursive: true });
    }

    const m4aDir = safeJoin(ROOT, 'minisseries', campNum, 'sonoplastia', 'm4a');
    if (!fs.existsSync(m4aDir)) {
      fs.mkdirSync(m4aDir, { recursive: true });
    }

    const cleanStyle = String(style || '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanVariation = String(variation || '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanVoice = String(selectedVoice || '').replace(/\s*\(pt-br\)/i, '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();

    // Padrão descritivo oficial solicitado pelo Diretor: "#<NN> - <Estilo> - <Variação> - <Voz>"
    const descriptiveBaseName = cleanStyle && cleanVariation
      ? `#${campNum} - ${cleanStyle} - ${cleanVariation}${cleanVoice ? ` - ${cleanVoice}` : ''}`
      : `#${campNum} - Flow Music`;

    const fileContent = `[LYRICS]
${lyricsStr}

[SOUND / SOM (ESTILO + VOZ)]
${compositionStr}
${coverPromptStr ? `\n[COVER / ALBUM ARTWORK (1024x1024)]\n${coverPromptStr}\n` : ''}`;

    // 1. Salva com o nome descritivo completo em sonoplastia/flow-music/ (sem nunca sobrescrever outras variações)
    const descriptiveTxtPath = path.join(flowMusicDir, `${descriptiveBaseName}.txt`);
    fs.writeFileSync(descriptiveTxtPath, fileContent, 'utf8');

    const descriptiveJsonPath = path.join(flowMusicDir, `${descriptiveBaseName}.json`);
    fs.writeFileSync(descriptiveJsonPath, JSON.stringify({
      campaignNumber: campNum,
      style: cleanStyle,
      variation: cleanVariation,
      voice: cleanVoice,
      lyrics: lyricsStr,
      musicalComposition: compositionStr,
      sound: compositionStr,
      coverPrompt: coverPromptStr,
      prompt,
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf8');

    // 2. Salva a letra cantada pronta com o mesmo nome descritivo na pasta sonoplastia/m4a/
    const m4aLyricsPath = path.join(m4aDir, `${descriptiveBaseName}.txt`);
    fs.writeFileSync(m4aLyricsPath, lyricsStr, 'utf8');

    // Higienização preventiva: remove arquivos legados ou redundantes
    for (const legacyName of [
      `FLOW MUSIC - #${campNum}.txt`,
      `FLOW_MUSIC_${campNum}.json`,
      `🎵 FLOW MUSIC — #${campNum}.txt`,
      `?? FLOW MUSIC - #${campNum}.txt`
    ]) {
      const legacyPath = path.join(flowMusicDir, legacyName);
      if (fs.existsSync(legacyPath)) {
        try { fs.unlinkSync(legacyPath); } catch (_) {}
      }
    }
    const legacyLetraPath = path.join(m4aDir, 'letra.txt');
    if (fs.existsSync(legacyLetraPath)) {
      try { fs.unlinkSync(legacyLetraPath); } catch (_) {}
    }

    console.log(`💾 Prompt Flow Music salvo exclusivamente com nome descritivo em: ${descriptiveTxtPath} e ${m4aLyricsPath}`);
  } catch(errSave) {
    console.error('Erro ao salvar arquivo de prompt Flow Music:', errSave);
  }

  return {
    lyrics: lyricsStr,
    musicalComposition: compositionStr,
    sound: compositionStr,
    coverPrompt: coverPromptStr,
    prompt
  };
}

async function generateFlowMaster(payload) {
  const { title, topic, description, scenes, campaign, campaignNumber, campaignNum, campaignId } = payload || {};
  const cNum = sanitizeNumericId(campaignNumber || campaignNum || campaignId || (campaign && (campaign.number || campaign.id)) || (topic && topic.number) || '01');
  const topicTitle = title || (topic && topic.title) || (campaign && campaign.title) || `Minissérie #${cNum}`;
  const topicDesc = description || (topic && topic.description) || (campaign && (campaign.description || campaign.groupSubject)) || topicTitle;

  let userPrompt = `TÍTULO DA MINISSÉRIE: ${topicTitle}
CONTEXTO DA MINISSÉRIE: ${topicDesc}`;
  const activeTopic = topic || (campaign && campaign.topic) || {};
  if (activeTopic.motionBlueprint && typeof activeTopic.motionBlueprint === 'object') {
    const mb = activeTopic.motionBlueprint;
    const mbParts = [];
    if (mb.actionVector) mbParts.push(`Vetor de Ação: ${mb.actionVector}`);
    if (mb.dynamicElements) mbParts.push(`Elementos Dinâmicos: ${mb.dynamicElements}`);
    if (mbParts.length > 0) {
      userPrompt += `\nBLUEPRINT DE MOVIMENTO E CÂMERA (10 SEGUNDOS):\n${mbParts.join('\n')}`;
    }
  }
  const sourceScenes = Array.isArray(scenes) && scenes.length > 0 ? scenes : (Array.isArray(campaign && campaign.scenes) ? campaign.scenes : []);
  if (sourceScenes.length > 0) {
    userPrompt += '\nCENAS:\n' + sourceScenes.map((s, i) => `Cena ${i+1}: ${s.prompt || s.title || ''}`).join('\n');
  }

  console.log(`🎬 Gerando Roteiro Master Flow via Mistral AI para: ${topicTitle} (Minissérie #${cNum})...`);

  const result = await generateStage({
    taskName: 'flowMaster',
    profileName: 'flowMaster',
    prompt: userPrompt,
    responseSchema: STRUCTURED_OUTPUT_SCHEMAS.flowMaster,
    contract: API_CONTRACTS.flowMaster
  });

  let parsed = result;
  if (result && result.rawText) {
    try {
      const clean = result.rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch(e) {
      throw new Error("A Inteligência falhou ao formatar o Roteiro FlowMaster (JSON). Texto Puro Gerado:\n\n" + result.rawText);
    }
  }

  const flowMaster = formatFlowPrompt(parsed);
  try {
    miniseriesWorkspaceService.saveMiniseriesFlowMaster(ROOT, cNum, flowMaster);
  } catch (errFlow) {
    console.error('Aviso: Falha ao salvar arquivo FlowMaster em generateFlowMaster:', errFlow);
  }

  return flowMaster;
}

async function generateScenes50Prompt(payload) {
  const { title, context, topic, gptScenes, campaignNum, campaignId } = payload || {};
  const cNum = sanitizeNumericId(campaignNum || campaignId || '01');
  const topicTitle = title || (topic && topic.title) || `Minissérie #${cNum}`;
  const topicContext = context || (topic && topic.description) || topicTitle;
  const diskSourcePath = path.join(ROOT, 'minisseries', String(cNum), 'prompts', `10_prompts_gpt_${cNum}.json`);
  if (!fs.existsSync(diskSourcePath)) {
    const anchors = Array.isArray(gptScenes) ? gptScenes.slice(0, 10) : [];
    if (anchors.length < 10) {
      throw new Error(`A minissérie ${cNum} precisa das 10 cenas GPT preparadas antes de gerar os 40 complementares.`);
    }
    writeGPTSourcePrompts({ ROOT, numStr: cNum, gptScenes: anchors });
  }
  const sourceAnchors = readGPTSourcePrompts(ROOT, cNum);

  console.log(`🎬 Gerando 40 prompts complementares via Mistral AI para Minissérie #${cNum}: ${topicTitle}...`);

  let userPrompt = `TÍTULO DA MINISSÉRIE: ${topicTitle}
CONTEXTO DO ASSUNTO: ${topicContext}`;
  const topicObj = topic || payload?.campaign?.topic;
  if (topicObj && topicObj.visualUniverse && typeof topicObj.visualUniverse === 'object') {
    const vu = topicObj.visualUniverse;
    const vuParts = [];
    if (vu.style) vuParts.push(`Estilo e Nível Tecnológico: ${vu.style}`);
    if (vu.coreSubject) vuParts.push(`Sujeito Central: ${vu.coreSubject}`);
    if (vu.materialsAndTextures) vuParts.push(`Materiais e Texturas: ${vu.materialsAndTextures}`);
    if (vuParts.length > 0) {
      userPrompt += `\nUNIVERSO VISUAL:\n${vuParts.join('\n')}`;
    }
  }
  userPrompt += `\n10 CENAS PRINCIPAIS PRODUZIDAS PELO GPT:\n${JSON.stringify(sourceAnchors, null, 2)}`;

  const result = await generateStage({
    taskName: 'scenes50',
    profileName: 'scenes50',
    prompt: userPrompt,
    responseSchema: STRUCTURED_OUTPUT_SCHEMAS.scenes50,
    contract: API_CONTRACTS.scenes50
  });

  let scenes = [];
  if (result && Array.isArray(result.scenes)) {
    scenes = result.scenes;
  } else if (result && result.rawText) {
    try {
      const clean = result.rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed.scenes)) scenes = parsed.scenes;
    } catch(e) {
      throw new Error("A Inteligência falhou ao formatar as 40 cenas (Scenes50). Texto Puro Gerado:\n\n" + result.rawText);
    }
  }

  if (!scenes || scenes.length === 0) {
    if (result && result.rawText) {
      throw new Error("A Inteligência não retornou nenhuma cena no formato esperado (Scenes50). Texto Puro Gerado:\n\n" + result.rawText);
    } else {
      throw new Error("A Inteligência não retornou os 40 prompts complementares válidos.");
    }
  }

  scenes = validateScenes50Output(scenes);

  const txtContent = scenes.map(s => `IMAGEM COMPLEMENTAR #${String(s.index).padStart(2, '0')} [GPT CENA ${s.gptSceneRef}] [BLOCO ${s.block}] [POSIÇÃO ${s.positionInBlock}]\nPrompt: ${s.prompt}\n`).join('\n----------------------------------------\n\n');

  try {
    const promptsDir = safeJoin(ROOT, 'minisseries', cNum, 'prompts');
    if (!fs.existsSync(promptsDir)) fs.mkdirSync(promptsDir, { recursive: true });

    const txtPath = path.join(promptsDir, `40_prompts_complementares_minisserie_${cNum}.txt`);
    fs.writeFileSync(txtPath, txtContent, 'utf-8');

    const jsonPath = path.join(promptsDir, `40_prompts_complementares.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(scenes, null, 2), 'utf-8');

    console.log(`💾 40 prompts complementares salvos em: ${txtPath}`);
  } catch(errSave) {
    console.error('Erro ao salvar arquivos de 40 prompts complementares:', errSave);
  }

  const finalQueue = buildChatGPTQueue({ ROOT, numStr: cNum, gptScenes: sourceAnchors });

  return {
    ok: true,
    scenes: scenes,
    prompt: txtContent,
    finalQueue: finalQueue.queue,
    finalQueueText: finalQueue.text,
    finalFiles: { json: finalQueue.jsonPath, txt: finalQueue.txtPath }
  };
}
async function generateDocumentary(payload) { return { ok: true, message: "Documentário gerado" }; }
async function renderDocumentaryVideo(payload) { return { ok: true, message: "Vídeo documentário renderizado" }; }

const activeJobs = new Map();

async function runCompleteGenerationJob(job, payload) {
  try {
    const topic = payload.topic || {};
    const title = topic.title || 'Minissérie Técnica InkVortex';
    const description = topic.description || topic.groupSubject || title;
    const rawCampaignNumber = payload.campaignNumber ?? topic.number;
    if (!/\d/u.test(String(rawCampaignNumber ?? ''))) {
      throw new Error('A geração editorial exige o número da minissérie para compor a legenda final.');
    }
    const campaignNumber = sanitizeNumericId(rawCampaignNumber);

    if (topic && (topic.title || topic.description)) {
      try {
        miniseriesWorkspaceService.saveMiniseriesSubject(ROOT, campaignNumber, topic);
      } catch (errSubject) {
        console.error('Aviso: Falha ao salvar arquivo de assunto:', errSubject);
      }
    }

    let sourcePrompt = `TÍTULO DA MINISSÉRIE: ${title}\nCONTEXTO DO ASSUNTO: ${description}`;
    if (topic.motionBlueprint && typeof topic.motionBlueprint === 'object') {
      const mb = topic.motionBlueprint;
      const mbParts = [];
      if (mb.actionVector) mbParts.push(`Vetor de Ação: ${mb.actionVector}`);
      if (mb.dynamicElements) mbParts.push(`Elementos Dinâmicos: ${mb.dynamicElements}`);
      if (mbParts.length > 0) {
        sourcePrompt += `\nBLUEPRINT DE MOVIMENTO E CÂMERA (10 SEGUNDOS):\n${mbParts.join('\n')}`;
      }
    }
    sourcePrompt += `${topic.centralQuestion ? `\nPERGUNTA CENTRAL (CENA 1): ${topic.centralQuestion}` : ''}${topic.visualUniverse && typeof topic.visualUniverse === 'object' ? `\nUNIVERSO VISUAL:\n- Estilo: ${topic.visualUniverse.style || ''}\n- Sujeito: ${topic.visualUniverse.coreSubject || ''}\n- Materiais/Texturas: ${topic.visualUniverse.materialsAndTextures || ''}` : ''}`;
    const captionSourcePrompt = `NÚMERO DA MINISSÉRIE: ${campaignNumber}
TÍTULO EXATO DA MINISSÉRIE: ${title}
CONTEXTO MESTRE: ${description}${topic.socialNarrative && typeof topic.socialNarrative === 'object' ? `${Array.isArray(topic.socialNarrative.keyFacts) && topic.socialNarrative.keyFacts.length > 0 ? `\nFATOS TÉCNICOS CHAVE (PROGRESSÃO DAS 10 LINHAS):\n${topic.socialNarrative.keyFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}` : ''}${Array.isArray(topic.socialNarrative.keywords) && topic.socialNarrative.keywords.length > 0 ? `\nPALAVRAS-CHAVE / TEMAS PARA HASHTAGS: ${topic.socialNarrative.keywords.join(', ')}` : ''}` : ''}`;

    job.stage = 'FASE 1: DIREÇÃO DE ARTE (MISTRAL)';
    job.step = 1;
    job.total = 2;
    job.detail = 'Gerando 10 cenas cinematográficas e prompts em português do Brasil...';

    const scenesRes = await generateStage({
      taskName: 'scenes45',
      profileName: 'scenes45',
      prompt: sourcePrompt,
      responseSchema: STRUCTURED_OUTPUT_SCHEMAS.scenes45,
      validateResult: parsed => {
        const rootFields = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? Object.keys(parsed)
          : [];
        if (rootFields.length !== 1 || rootFields[0] !== 'scenes45') {
          throw new Error('Scenes45 inválido: a raiz deve conter somente a chave scenes45.');
        }
        return { scenes45: validateScenes45Output(parsed.scenes45) };
      },
      contract: API_CONTRACTS.scenes45
    });

    let scenes45 = [];
    if (scenesRes && Array.isArray(scenesRes.scenes45)) scenes45 = scenesRes.scenes45;
    else if (scenesRes && scenesRes.rawText) {
      try {
        const parsed = JSON.parse(scenesRes.rawText.replace(/```json/gi, '').replace(/```/g, '').trim());
        scenes45 = Array.isArray(parsed.scenes45) ? parsed.scenes45 : [];
      } catch(e) {
        throw new Error("A Inteligência falhou ao formatar as cenas (Scenes45). Texto Puro Gerado:\n\n" + scenesRes.rawText);
      }
    }

    if (!scenes45 || scenes45.length === 0) {
      if (scenesRes && scenesRes.rawText) {
        throw new Error("A Inteligência não retornou nenhuma cena no formato JSON esperado. Texto Puro Gerado:\n\n" + scenesRes.rawText);
      } else {
        throw new Error("A Inteligência não retornou cenas válidas.");
      }
    }

    scenes45 = validateScenes45Output(scenes45);
    try {
      writeGPTSourcePrompts({ ROOT, numStr: campaignNumber, gptScenes: scenes45 });
    } catch (errGpt) {
      console.error('Aviso: Falha ao salvar prompts GPT âncora:', errGpt);
    }
    job.result = { scenes: scenes45, socialCaption: '' };

    job.stage = 'FASE 2: LEGENDA SOCIAL';
    job.step = 2;
    job.total = 2;
    job.detail = 'Redigindo Legenda Instagram/LinkedIn em 10 Linhas...';

    let socialCaption = '';
    try {
      const captionRes = await generateStage({
        taskName: 'caption',
        profileName: 'caption',
        prompt: captionSourcePrompt,
        responseSchema: STRUCTURED_OUTPUT_SCHEMAS.caption,
        contract: API_CONTRACTS.caption
      });
      socialCaption = parseCaptionResult(captionRes, campaignNumber, title).socialCaption;
      try {
        miniseriesWorkspaceService.saveMiniseriesCaption(ROOT, campaignNumber, {
          campaignNumber,
          title,
          socialCaption
        });
      } catch (errCaption) {
        console.error('Aviso: Falha ao salvar arquivo de legenda social:', errCaption);
      }
    } catch (captionError) {
      job.status = 'done';
      job.stage = 'CONCLUÍDO COM AVISO';
      job.detail = 'As 10 cenas foram preservadas. A legenda social pode ser gerada novamente de forma independente.';
      job.warning = String(captionError && captionError.message || captionError || 'Falha isolada na legenda social.');
      return;
    }

    job.status = 'done';
    job.stage = 'CONCLUÍDO';
    job.detail = 'Geração da Minissérie finalizada com sucesso! (10 Cenas de Direção de Arte e Legenda Social prontas)';
    job.result = {
      scenes: scenes45,
      socialCaption: socialCaption
    };
  } catch(err) {
    console.error('Erro na geração completa da minissérie:', err);
    job.status = 'error';
    job.error = err.message || 'Erro durante o processamento neural.';
  }
}

function parseGeneratedJSON(result) {
  if (!result) return {};
  if (typeof result === 'object' && !result.rawText) return result;
  if (typeof result.rawText !== 'string') return result;
  try {
    return JSON.parse(result.rawText.replace(/```json/gi, '').replace(/```/g, '').trim());
  } catch(e) {
    return result;
  }
}

function formatFlowPrompt(flowMaster) {
  const parsed = parseGeneratedJSON(flowMaster);
  const validated = validateFlowMasterOutput(parsed);
  const parts = validated.scenes.map(scene =>
    scene.omniFlashPrompt.replace(/\s*\(no subtitles\)\s*$/i, '').trim()
  );
  const prompt = `${parts.join(' ')} (no subtitles)`;
  return { ...validated, prompt };
}

async function runFlowGeminiJob(job, payload) {
  try {
    const topic = payload.topic || {};
    const title = topic.title || payload.title || 'Minissérie Técnica InkVortex';
    const description = topic.description || topic.groupSubject || payload.description || title;
    const rawCampaignNumber = payload.campaignNumber ?? topic.number ?? payload.campaignNum ?? payload.campaignId ?? '01';
    const campaignNumber = sanitizeNumericId(rawCampaignNumber);
    let sourcePrompt = `TÍTULO DA MINISSÉRIE: ${title}\nCONTEXTO DO ASSUNTO: ${description}`;
    if (topic.motionBlueprint && typeof topic.motionBlueprint === 'object') {
      const mb = topic.motionBlueprint;
      const mbParts = [];
      if (mb.actionVector) mbParts.push(`Vetor de Ação: ${mb.actionVector}`);
      if (mb.dynamicElements) mbParts.push(`Elementos Dinâmicos: ${mb.dynamicElements}`);
      if (mbParts.length > 0) {
        sourcePrompt += `\nBLUEPRINT DE MOVIMENTO E CÂMERA (10 SEGUNDOS):\n${mbParts.join('\n')}`;
      }
    }

    job.stage = 'ESTRUTURA MASTER (FLOW)';
    job.step = 1;
    job.detail = 'Aplicando a diretriz universal aprovada do Flow...';

    const flowMaster = {
      prompt: 'Create a clip using the images selected above, in that order.',
      globalDirective: '',
      scenes: []
    };
    try {
      miniseriesWorkspaceService.saveMiniseriesFlowMaster(ROOT, campaignNumber, flowMaster);
    } catch (errFlow) {
      console.error('Aviso: Falha ao salvar arquivo FlowMaster:', errFlow);
    }
    job.result = { flowMaster, motionScenes: [] };
    job.stage = 'MOVIMENTOS (GEMINI)';
    job.step = 2;
    job.detail = 'Criando sete prompts de movimento alinhados ao Flow (limite de 7 imagens)...';

    const motionPrompt = sourcePrompt;
    let motionScenes = [];
    try {
      const motionRes = await generateStage({
        taskName: 'scenes916',
        profileName: 'scenes916',
        prompt: motionPrompt,
        responseSchema: STRUCTURED_OUTPUT_SCHEMAS.scenes916,
        contract: API_CONTRACTS.scenes916
      });
      const motionParsed = parseGeneratedJSON(motionRes);
      motionScenes = validateScenes916Output(motionParsed.motionScenes);
      try {
        miniseriesWorkspaceService.saveMiniseriesGeminiMotions(ROOT, campaignNumber, {
          campaignNumber,
          title,
          motionScenes
        });
      } catch (errMotions) {
        console.error('Aviso: Falha ao salvar arquivo de movimentos Gemini:', errMotions);
      }
    } catch (motionError) {
      job.status = 'done';
      job.stage = 'CONCLUÍDO COM AVISO';
      job.detail = 'O FlowMaster foi preservado. Os movimentos podem ser gerados novamente sem perder a etapa anterior.';
      job.warning = String(motionError && motionError.message || motionError || 'Falha isolada nos movimentos.');
      return;
    }

    job.status = 'done';
    job.stage = 'CONCLUÍDO';
    job.detail = 'Flow e Gemini concluídos com dez cenas alinhadas.';
    job.result = { flowMaster, motionScenes };
  } catch(err) {
    console.error('Erro na geração Flow + Gemini:', err);
    job.status = 'error';
    job.error = err.message || 'Erro durante a geração Flow + Gemini.';
  }
}

function listDocumentaries() {
  return listFinalMinisserieCatalog(ROOT);
}

let automationRoutes;
let chatGPTAutomationRoutes;
async function handleApi(req, res) {
  if (!automationRoutes) {
    automationRoutes = createAutomationRouter({
      activeGeminiWebJobs, send, sendApiError, readBody, ensureDirectory, ROOT, PORT, generateScenes50Prompt
    });
  }
  if (!chatGPTAutomationRoutes) {
    chatGPTAutomationRoutes = createChatGPTAutomationRouter({
      activeChatGPTWebJobs, activeGeminiWebJobs, send, sendApiError, readBody, ROOT, sanitizeNumericId
    });
  }
  if (req.url.startsWith('/api/automate-chatgpt')
    || req.url.startsWith('/api/automate-gemini-vortex')
    || req.url.startsWith('/api/robot-manifest')) {
    const handled = await chatGPTAutomationRoutes(req, res);
    if (handled) return;
  }
  if (req.url === '/api/logo' || req.url.startsWith('/api/logo?')) {
    return serveLogo(res);
  }
  if (req.url === '/favicon.ico' || req.url === '/api/favicon' || req.url.startsWith('/api/favicon?')) {
    return serveFavicon(res);
  }

  if (req.method === 'GET' && (req.url === '/api/palco' || req.url.startsWith('/api/palco?'))) {
    return send(res, 200, {
      backgrounds: listStageBackgrounds(),
      portalVideos: listStagePortalVideos()
    });
  }

  if (req.url === '/api/fonts' || req.url.startsWith('/api/fonts?')) {
    const fontsList = [
      { fontFamily: 'DMSans', familyLabel: 'DM Sans', label: 'Local', url: 'DMSans' },
      { fontFamily: 'Inter', familyLabel: 'Inter', label: 'Local', url: 'Inter' },
      { fontFamily: 'Manrope', familyLabel: 'Manrope', label: 'Local', url: 'Manrope' },
      { fontFamily: 'NotoSans', familyLabel: 'Noto Sans', label: 'Local', url: 'NotoSans' },
      { fontFamily: 'Outfit', familyLabel: 'Outfit', label: 'Local', url: 'Outfit' },
      { fontFamily: 'PlusJakartaSans', familyLabel: 'Plus Jakarta Sans', label: 'Local', url: 'PlusJakartaSans' },
      { fontFamily: 'SourceSans3', familyLabel: 'Source Sans 3', label: 'Local', url: 'SourceSans3' },
      { fontFamily: 'Space_Grotesk', familyLabel: 'Space Grotesk', label: 'Local', url: 'Space_Grotesk' }
    ];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ fonts: fontsList }));
  }

  if (req.method === 'GET' && req.url.startsWith('/api/minisseries/image-manifest')) {
    const requestUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const docNum = sanitizeNumericId(requestUrl.searchParams.get('docNum'));
    const campaignNum = sanitizeNumericId(requestUrl.searchParams.get('campaignNum'));
    const manifest = buildMiniseriesImageManifest({ root: ROOT, docNum, campaignNum });
    return send(res, 200, { ok: true, ...manifest });
  }

  const SUBJECTS_ARRAY_KEYS = ['topics', 'themes', 'ideas', 'subjects', 'temas', 'assuntos', 'sugestoes', 'sugestões', 'items', 'list'];

  function extractSubjectsArray(parsedOrRaw) {
    if (!parsedOrRaw) return [];

    // Caso 1: o próprio valor já é o array (a IA devolveu [...] direto).
    if (Array.isArray(parsedOrRaw)) return parsedOrRaw;
    if (typeof parsedOrRaw !== 'object') return [];

    // Caso 2: uma das chaves conhecidas contém o array.
    for (const key of SUBJECTS_ARRAY_KEYS) {
      if (Array.isArray(parsedOrRaw[key])) return parsedOrRaw[key];
    }

    // Caso 3: o objeto é um único tópico com título e descrição
    if (parsedOrRaw.title && (parsedOrRaw.description || parsedOrRaw.angle)) {
      return [parsedOrRaw];
    }

    // Caso 4: nenhuma chave conhecida bateu — varre todas as propriedades
    // do objeto em busca do primeiro array não vazio de objetos
    for (const value of Object.values(parsedOrRaw)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        return value;
      }
    }

    return [];
  }

  if (req.url === '/api/tech-themes' && req.method === 'GET') {
    return send(res, 200, { ok: true, themes: TECH_THEMES || [] });
  }

  if (req.url === '/api/generate-subjects' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const customBrief = (payload.brief || '').trim();
      const catalog = payload.existingCatalog || [];
      
      const defaultTheme = (TECH_THEMES && TECH_THEMES.length > 0) ? TECH_THEMES[0].briefing : 'Inovação e tecnologia de ponta na indústria gráfica e têxtil InkVortex Brasil';
      const userPrompt = `ASSUNTO / BRIEFING: ${customBrief || defaultTheme}
CATÁLOGO DE TÓPICOS JÁ EXISTENTES (NÃO REPETIR):
${catalog.map(c => `- ${c.title} (${c.groupSubject || ''})`).join('\n')}`;

      const resGen = await generateStage({
        taskName: 'themes',
        profileName: 'themes',
        prompt: userPrompt,
        responseSchema: STRUCTURED_OUTPUT_SCHEMAS.themes,
        contract: API_CONTRACTS.themes
      });

      let subjects = extractSubjectsArray(resGen);
      console.log("[DEBUG MISTRAL] JSON parsing result:", resGen);
      console.log("[DEBUG MISTRAL] Extracted subjects count:", subjects.length);
      
      if (subjects.length === 0 && resGen && resGen.rawText) {
        try {
          const parsed = JSON.parse(resGen.rawText.replace(/```json/gi, '').replace(/```/g, '').trim());
          console.log("[DEBUG MISTRAL] Parsed rawText fallback:", parsed);
          subjects = extractSubjectsArray(parsed);
          console.log("[DEBUG MISTRAL] Extracted subjects from fallback count:", subjects.length);
        } catch(e) {
          throw new Error("A Inteligência enviou um formato inesperado. Texto Puro Gerado:\n\n" + resGen.rawText);
        }
      }
      
      send(res, 200, { ok: true, subjects });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/generate-caption' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const camp = payload.campaign || {};
      const captionTitle = camp.title || camp.topic?.title || 'Minissérie Técnica InkVortex';
      const captionContext = camp.topic?.description || camp.topic?.groupSubject || camp.description || captionTitle;
      const rawCaptionNumber = camp.number ?? payload.campaignNumber;
      if (!/\d/u.test(String(rawCaptionNumber ?? ''))) {
        throw new Error('A geração da legenda exige o número da minissérie.');
      }
      const captionNumber = sanitizeNumericId(rawCaptionNumber);
      let scenesPrompt = `NÚMERO DA MINISSÉRIE: ${captionNumber}\nTÍTULO EXATO DA MINISSÉRIE: ${captionTitle}\nCONTEXTO MESTRE: ${captionContext}`;
      const topicObj = camp.topic;
      if (topicObj && topicObj.socialNarrative && typeof topicObj.socialNarrative === 'object') {
        const sn = topicObj.socialNarrative;
        if (Array.isArray(sn.keyFacts) && sn.keyFacts.length > 0) {
          scenesPrompt += `\nFATOS TÉCNICOS CHAVE (PROGRESSÃO DAS 10 LINHAS):\n${sn.keyFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
        }
        if (Array.isArray(sn.keywords) && sn.keywords.length > 0) {
          scenesPrompt += `\nPALAVRAS-CHAVE / TEMAS PARA HASHTAGS: ${sn.keywords.join(', ')}`;
        }
      }

      const captionRes = await generateStage({
        taskName: 'caption',
        profileName: 'caption',
        prompt: scenesPrompt,
        responseSchema: STRUCTURED_OUTPUT_SCHEMAS.caption,
        contract: API_CONTRACTS.caption
      });

      const { socialCaption } = parseCaptionResult(captionRes, captionNumber, captionTitle);
      try {
        miniseriesWorkspaceService.saveMiniseriesCaption(ROOT, captionNumber, {
          campaignNumber: captionNumber,
          title: captionTitle,
          socialCaption
        });
      } catch (errCapSave) {
        console.error('Aviso: Falha ao salvar legenda social em disco:', errCapSave);
      }

      send(res, 200, { ok: true, socialCaption });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }


  if (req.url === '/api/sync-flow-images' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const numStr = sanitizeNumericId(payload.number || payload.campaignNumber || payload.campaignId || '01');
      const result = syncFlowImagesFromEsteira(ROOT, numStr);
      send(res, 200, { ok: true, number: numStr, ...result });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/generate-complete/start' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const jobId = 'job-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      
      const job = {
        id: jobId,
        status: 'processing',
        stage: 'Iniciando',
        step: 1,
        total: 3,
        detail: 'Conectando aos motores neurais V8...',
        result: null,
        error: null
      };
      activeJobs.set(jobId, job);
      
      runCompleteGenerationJob(job, payload);
      
      send(res, 200, { ok: true, jobId });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/generate-flow-gemini/start' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const jobId = 'flow-gemini-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const job = {
        id: jobId,
        status: 'processing',
        stage: 'Iniciando',
        step: 1,
        total: 2,
        detail: 'Conectando ao Flow e ao motor Gemini...',
        result: null,
        error: null
      };
      activeJobs.set(jobId, job);
      runFlowGeminiJob(job, payload);
      send(res, 200, { ok: true, jobId });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url.startsWith('/api/generate-complete/status') && req.method === 'GET') {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      const jobId = urlObj.searchParams.get('jobId');
      const job = activeJobs.get(jobId);
      
      if (!job) {
        send(res, 404, { ok: false, error: 'Job nÃ£o encontrado ou expirado.' });
        return;
      }
      
      send(res, 200, {
        ok: true,
        status: job.status,
        stage: job.stage,
        step: job.step,
        total: job.total,
        detail: job.detail,
        result: job.result,
        error: job.error
      });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url.startsWith('/api/generate-flow-gemini/status') && req.method === 'GET') {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      const jobId = urlObj.searchParams.get('jobId');
      const job = activeJobs.get(jobId);
      if (!job) {
        send(res, 404, { ok: false, error: 'Job Flow + Gemini nÃ£o encontrado ou expirado.' });
        return;
      }
      send(res, 200, {
        ok: true,
        status: job.status,
        stage: job.stage,
        step: job.step,
        total: job.total,
        detail: job.detail,
        result: job.result,
        error: job.error
      });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/init-render-folders' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const workspace = miniseriesWorkspaceService.ensureMiniseriesWorkspace(
        ROOT,
        payload.campaignNumber || payload.campaignNum
      );
      send(res, 200, {
        ok: true,
        campaignNum: workspace.campaignNumber,
        directoriesCreated: workspace.directories.length
      });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/minisseries/workspace-data')) {
    try {
      const campNum = parsedUrl.query && (parsedUrl.query.number || parsedUrl.query.campaignNum || parsedUrl.query.cNum);
      if (!campNum) {
        send(res, 400, { ok: false, error: 'Parâmetro number obrigatório.' });
        return;
      }
      const result = miniseriesWorkspaceService.readPhysicalCampaignWorkspace(ROOT, campNum);
      send(res, 200, result);
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/minisseries/save-subject' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const rawNumber = payload.campaignNumber || payload.campaignNum || payload.number;
      const topic = payload.topic || payload.subject || {};
      const saved = miniseriesWorkspaceService.saveMiniseriesSubject(ROOT, rawNumber, topic);
      send(res, 200, {
        ok: true,
        campaignNum: saved.campaignNumber,
        jsonPath: saved.jsonPath,
        txtPath: saved.txtPath
      });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/minisseries/restore-backup' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const backupData = payload.backupData || payload;
      const result = miniseriesWorkspaceService.restoreFullBackup(ROOT, backupData);
      send(res, 200, {
        ok: true,
        restoredCount: result.restoredCount,
        version: result.version,
        results: result.results
      });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if ((req.url === '/api/minisseries/export-backup' || req.url?.startsWith('/api/minisseries/export-backup?')) && (req.method === 'POST' || req.method === 'GET')) {
    try {
      let clientCampaigns = [];
      if (req.method === 'POST') {
        const payload = await readBody(req);
        clientCampaigns = payload.campaigns || [];
      }
      const backupData = miniseriesWorkspaceService.exportFullBackup(ROOT, clientCampaigns);
      send(res, 200, {
        ok: true,
        backup: backupData
      });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if ((req.url === '/api/backup/export-to-root' || req.url === '/api/minisseries/export-backup-root') && req.method === 'POST') {
    try {
      const payload = await readBody(req, 10 * 1024 * 1024); // 10 MB — backup pode ser grande
      const clientCampaigns = payload.campaigns || [];
      const extraMeta = {
        activeStage: payload.activeStage,
        activeSubTab: payload.activeSubTab,
        selectedCampaignId: payload.selectedCampaignId,
        mistralKey: payload.mistralKey,
        suggestedSubjects: payload.suggestedSubjects
      };
      const options = { isPreReset: !!payload.isPreReset };
      const result = miniseriesWorkspaceService.saveOfficialBackupToRoot(CODE_ROOT, FILES_ROOT, clientCampaigns, extraMeta, options);
      send(res, 200, result);
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if ((req.url === '/api/backup/import-latest-root' || req.url === '/api/minisseries/import-latest-root') && (req.method === 'POST' || req.method === 'GET')) {
    try {
      const result = miniseriesWorkspaceService.restoreLatestBackupFromRoot(CODE_ROOT, FILES_ROOT);
      send(res, 200, result);
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/backup/latest-info' && req.method === 'GET') {
    try {
      const latest = miniseriesWorkspaceService.findLatestBackupInRoot(CODE_ROOT);
      if (!latest) {
        send(res, 200, { ok: false, message: 'Nenhum backup encontrado na pasta raiz.' });
      } else {
        send(res, 200, {
          ok: true,
          fileName: latest.fileName,
          filePath: latest.filePath,
          mtime: latest.mtime,
          timestamp: latest.backupData?.timestamp,
          campaignsCount: latest.backupData?.campaignsCount || (latest.backupData?.campaigns || []).length
        });
      }
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if ((req.url === '/api/backup/zip-system-to-d' || req.url === '/api/system/zip-to-d') && (req.method === 'POST' || req.method === 'GET')) {
    try {
      let options = {};
      if (req.method === 'POST') {
        try {
          options = await readBody(req);
        } catch (_) {}
      }
      const result = systemZipService.zipSystemToDriveD({
        sourceRoot: CODE_ROOT,
        targetDrive: options.targetDrive || 'D:\\',
        fileName: options.fileName
      });
      send(res, 200, result);
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/backup/zip-list' && req.method === 'GET') {
    try {
      const targetDrive = (parsedUrl.query && parsedUrl.query.drive) || 'D:\\';
      const result = systemZipService.listSystemZipsInDrive(targetDrive);
      send(res, 200, result);
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url.startsWith('/api/social-mixer/sources') && req.method === 'GET') {
    try {
      const sources = socialMixerService.scanMediaSources();
      send(res, 200, { ok: true, ...sources });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/social-mixer/render' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const job = socialMixerService.startSocialMixRender(payload);
      send(res, 200, { ok: true, job });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url.startsWith('/api/social-mixer/job-status') && req.method === 'GET') {
    try {
      const jobId = new URL(req.url, 'http://localhost').searchParams.get('jobId') || '';
      const job = socialMixerService.getSocialJobStatus(jobId);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      send(res, 200, { ok: true, job });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/social-mixer/batch-split' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const job = socialMixerService.startBatchSplitJob(payload);
      send(res, 200, { ok: true, job });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/social-mixer/register-file' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const fileInfo = socialMixerService.registerExternalFile(payload.filePath);
      send(res, 200, { ok: true, file: fileInfo });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url.startsWith('/api/social-mixer/pick-file') && req.method === 'GET') {
    try {
      const requestUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const type = requestUrl.searchParams.get('type') || 'video';
      const title = type === 'audio' ? 'Selecione a Trilha Sonora' : 'Selecione o Vídeo de Origem';
      const fileInfo = socialMixerService.openNativeFileDialog(type, title);
      if (fileInfo) {
        send(res, 200, { ok: true, file: fileInfo });
      } else {
        send(res, 200, { ok: true, cancelled: true });
      }
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url.startsWith('/api/social-mixer/browse-fs') && req.method === 'GET') {
    try {
      const requestUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const dir = requestUrl.searchParams.get('dir') || '';
      const result = socialMixerService.browseFilesystem(dir);
      send(res, 200, { ok: true, ...result });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url.startsWith('/api/social-media/file') && req.method === 'GET') {
    try {
      const requestUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const targetPath = requestUrl.searchParams.get('path') || '';
      if (!targetPath || !fs.existsSync(targetPath)) {
        send(res, 404, { ok: false, error: 'Arquivo não encontrado' });
        return;
      }
      serveStatic(req, res, targetPath);
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/minisseries/delete-workspace' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const result = miniseriesWorkspaceService.deleteAndCompactMiniseriesWorkspaces(
        ROOT,
        payload.campaignNumber,
        payload.remainingCampaignNumbers || []
      );
      send(res, 200, {
        ok: true,
        campaignNum: result.deletion.campaignNumber,
        removedTargets: result.deletion.removed.length,
        mappings: result.mappings,
        renumbered: result.changed
      });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/minisseries/reset-workspace' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const result = miniseriesWorkspaceService.resetMiniseriesWorkspace(
        ROOT,
        payload.campaignNumber
      );
      send(res, 200, {
        ok: true,
        campaignNum: result.campaignNumber,
        removedTargets: result.removed.length,
        directoriesCreated: result.workspace.directories.length
      });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/minisseries/compact-workspaces' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const result = miniseriesWorkspaceService.compactMiniseriesWorkspaces(
        ROOT,
        payload.campaignNumbers || []
      );
      send(res, 200, {
        ok: true,
        mappings: result.mappings,
        renumbered: result.changed
      });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/minisseries/delete-images' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const docNum = sanitizeNumericId(payload.docNum || payload.docNumber || payload.number);
      const campaignNum = sanitizeNumericId(payload.campaignNum || payload.campaignNumber || payload.cNum || docNum);
      const sequences = Array.isArray(payload.sequences)
        ? payload.sequences.map(s => Number.parseInt(s, 10)).filter(s => Number.isInteger(s) && s >= 1 && s <= 50)
        : [];

      if (sequences.length === 0) {
        return send(res, 400, { ok: false, error: 'Nenhuma sequência válida informada para exclusão.' });
      }

      const minisseriesRoot = path.join(ROOT, 'minisseries');
      const campaignDir = path.join(minisseriesRoot, docNum, `M${campaignNum}`);
      const deletedFiles = [];
      const deletedSequences = [];
      const supportedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

      if (fs.existsSync(campaignDir)) {
        for (const seq of sequences) {
          const padded = String(seq).padStart(3, '0');
          let removedForSeq = false;
          for (const ext of supportedExtensions) {
            const filePath = path.join(campaignDir, `img_${padded}.${ext}`);
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
                deletedFiles.push(`img_${padded}.${ext}`);
                removedForSeq = true;
              } catch (e) {
                console.warn(`[DELETE IMAGES] Falha ao excluir ${filePath}:`, e.message);
              }
            }
          }
          if (removedForSeq) {
            deletedSequences.push(seq);
          }
        }
      }

      try {
        robotManifest.reconcileManifest({ numStr: docNum, mode: 'minisseries', total: 50, rootDir: ROOT });
      } catch (manifestErr) {
        console.warn('[DELETE IMAGES] Reconciliação do manifesto:', manifestErr.message);
      }

      return send(res, 200, {
        ok: true,
        docNum,
        campaignNum,
        deletedCount: deletedFiles.length,
        deletedSequences,
        deletedFiles
      });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

// ROTA HTTP /api/render-final-minisserie
if(req.url==='/api/render-final-minisserie'&&req.method==='POST'){
  try {
    const payload = await readBody(req);
    const result = await renderFinalMinisserieVideo(payload);
    send(res, 200, result);
  } catch(err) {
    send(res, 500, { error: err.message });
  }
  return;
}

  if(req.url==='/api/transcribe-m4a-video'&&req.method==='POST'){try{const payload=await readBody(req);send(res,200,await apiTranscribeM4AVideo(payload));}catch(error){sendApiError(res,error);}return;}
  if(req.url==='/api/generate-m4a-ass'&&req.method==='POST'){try{const payload=await readBody(req);send(res,200,await apiGenerateM4AASS(payload));}catch(error){sendApiError(res,error);}return;}
  if(req.url==='/api/burn-m4a-ass'&&req.method==='POST'){try{const payload=await readBody(req);send(res,200,await apiBurnM4AASS(payload));}catch(error){sendApiError(res,error);}return;}
  if(req.url==='/api/render-m4a-video-final'&&req.method==='POST'){try{const payload=await readBody(req);send(res,200,await renderAudioM4AForCampaign(payload));}catch(error){sendApiError(res,error);}return;}
  if(req.url==='/api/render-m4a-video'&&req.method==='POST'){try{const payload=await readBody(req);send(res,200,await renderAudioM4AForCampaign(payload));}catch(error){sendApiError(res,error);}return;}
  if(req.url==='/api/generate-scenes50'&&req.method==='POST'){try{const payload=await readBody(req);send(res,200,await generateScenes50Prompt(payload));}catch(error){sendApiError(res,error);}return;}
  if(req.url==='/api/generate-flow-music'&&req.method==='POST'){try{const payload=await readBody(req);send(res,200,await generateFlowMusicPrompt(payload));}catch(error){sendApiError(res,error);}return;}
  if(req.url==='/api/generate-flow'&&req.method==='POST'){try{const payload=await readBody(req);send(res,200,await generateFlowMaster(payload));}catch(error){sendApiError(res,error);}return;}
  if(req.url==='/api/generate-documentary'&&req.method==='POST'){try{const payload=await readBody(req);send(res,200,await generateDocumentary(payload));}catch(error){sendApiError(res,error);}return;}
  if(req.url==='/api/render-documentary'&&req.method==='POST'){try{const payload=await readBody(req);send(res,200,await renderDocumentaryVideo(payload));}catch(error){sendApiError(res,error);}return;}
  if (req.url.startsWith('/api/storyboard-media') && req.method === 'GET') {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      const campRaw = urlObj.searchParams.get('campaign') || '1';
      const cNum = sanitizeNumericId(campRaw);
      
      const mp4Dir = safeJoin(ROOT, 'minisseries', cNum, 'sonoplastia', 'mp4');
      const m4aDir = safeJoin(ROOT, 'minisseries', cNum, 'sonoplastia', 'm4a');
      const sonoDir = safeJoin(ROOT, 'minisseries', cNum, 'sonoplastia');
      
      let videosList = [];
      const videoSources = [
        { dir: mp4Dir, subfolder: 'mp4' },
        { dir: m4aDir, subfolder: 'm4a' },
        { dir: sonoDir, subfolder: '' }
      ];
      const targetSource = videoSources.find(source =>
        fs.existsSync(source.dir) && fs.readdirSync(source.dir).some(file => file.toLowerCase().endsWith('.mp4'))
      );
      
      if (targetSource) {
        const files = fs.readdirSync(targetSource.dir);
        videosList = files
          .filter(f => f.toLowerCase().endsWith('.mp4'))
          .map(f => {
            const relBase = targetSource.subfolder
              ? `/minisseries/${cNum}/sonoplastia/${targetSource.subfolder}`
              : `/minisseries/${cNum}/sonoplastia`;
            return {
              title: f,
              url: `${relBase}/${encodeURIComponent(f)}`,
              hasVideo: true
            };
          });
      }

      let activeVideo = videosList.find(v => v.title.toLowerCase().includes('legendado')) || videosList[0];
      
      send(res, 200, {
        ok: true,
        campaignNum: cNum,
        sonoplastiaVideo: activeVideo ? activeVideo.url : null,
        sonoplastiaVideoTitle: activeVideo ? activeVideo.title : null,
        sonoplastiaVideos: videosList,
        dedicatedSonoplastiaVideos: [],
        upcomingCtaNum: '01'
      });
    } catch(err) {
      send(res, 500, { error: err.message });
    }
    return;
  }

  if ((req.url.startsWith('/api/list-m4a-files') || req.url.startsWith('/api/list-wav-files')) && req.method === 'GET') {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      const campNum = sanitizeNumericId(urlObj.searchParams.get('campaignNum') || urlObj.searchParams.get('cNum'), '01');
      
      const m4aDir = safeJoin(ROOT, 'minisseries', campNum, 'sonoplastia', 'm4a');
      const mp4Dir = safeJoin(ROOT, 'minisseries', campNum, 'sonoplastia', 'mp4');
      const assDir = safeJoin(ROOT, 'minisseries', campNum, 'sonoplastia', 'ass');

      let allFiles = [];
      let m4aFiles = [];
      if (fs.existsSync(m4aDir)) {
        const dirEntries = fs.readdirSync(m4aDir);
        for (const f of dirEntries) {
          const fullPath = path.join(m4aDir, f);
          if (fs.statSync(fullPath).isDirectory()) continue;
          const ext = path.extname(f).toLowerCase();
          const relUrl = `/minisseries/${campNum}/sonoplastia/m4a/${encodeURIComponent(f)}`;
          const item = { name: f, url: relUrl, ext };
          allFiles.push(item);
          if (ext === '.m4a' || ext === '.wav') {
            m4aFiles.push(item);
          }
        }
      }

      let mp4Files = [];
      if (fs.existsSync(mp4Dir)) {
        const mp4Entries = fs.readdirSync(mp4Dir);
        for (const f of mp4Entries) {
          const fullPath = path.join(mp4Dir, f);
          if (fs.statSync(fullPath).isDirectory()) continue;
          const ext = path.extname(f).toLowerCase();
          if (ext === '.mp4') {
            const relUrl = `/minisseries/${campNum}/sonoplastia/mp4/${encodeURIComponent(f)}`;
            mp4Files.push({
              name: f,
              url: relUrl,
              ext,
              isLegendado: f.toLowerCase().includes('legendado')
            });
          }
        }
      }

      // Se houver mp4 em m4aDir, inclui também
      for (const item of allFiles) {
        if (item.ext === '.mp4' && !mp4Files.some(m => m.name === item.name)) {
          mp4Files.push({
            name: item.name,
            url: item.url,
            ext: item.ext,
            isLegendado: item.name.toLowerCase().includes('legendado')
          });
        }
      }

      let assContent = '';
      let assFileName = '';
      if (fs.existsSync(assDir)) {
        const assFiles = fs.readdirSync(assDir).filter(file => file.toLowerCase().endsWith('.ass'));
        const preferredAss = assFiles.find(file => file.toLowerCase().includes('legendado')) || assFiles[0];
        if (preferredAss) {
          assFileName = preferredAss;
          assContent = fs.readFileSync(path.join(assDir, preferredAss), 'utf8');
        }
      }

      const flowMusicDir = safeJoin(ROOT, 'minisseries', campNum, 'sonoplastia', 'flow-music');
      let promptFiles = [];
      if (fs.existsSync(flowMusicDir)) {
        const flowEntries = fs.readdirSync(flowMusicDir);
        const jsonFiles = flowEntries
          .filter(f => f.toLowerCase().endsWith('.json') && !/^flow_music_\d+\.json$/i.test(f))
          .sort((a, b) => {
            try {
              const sA = fs.statSync(path.join(flowMusicDir, a)).mtimeMs;
              const sB = fs.statSync(path.join(flowMusicDir, b)).mtimeMs;
              return sB - sA;
            } catch (_) { return 0; }
          });

        for (const jf of jsonFiles) {
          try {
            const parsed = JSON.parse(fs.readFileSync(path.join(flowMusicDir, jf), 'utf8'));
            const stem = path.basename(jf, '.json');
            promptFiles.push({
              file: jf,
              name: stem,
              title: stem,
              ...parsed
            });
          } catch (_) {}
        }
      }

      send(res, 200, {
        ok: true,
        success: true,
        campaignNum: campNum,
        files: allFiles,
        m4aFiles,
        mp4Files,
        promptFiles,
        assFileName,
        assContent
      });
    } catch(error) {
      sendApiError(res, error);
    }
    return;
  }

  if (req.url === '/api/audio-library' && req.method === 'GET') {
    try {
      const audioCatPath = fs.existsSync(path.join(CODE_ROOT, 'audio_categories.json'))
        ? path.join(CODE_ROOT, 'audio_categories.json')
        : path.join(ROOT, 'audio_categories.json');
      if (fs.existsSync(audioCatPath)) {
        const jsonText = fs.readFileSync(audioCatPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(jsonText);
      } else {
        send(res, 404, { error: 'Arquivo audio_categories.json nÃ£o encontrado na raiz.' });
      }
    } catch(error) {
      sendApiError(res, error);
    }
    return;
  }

  if(req.url==='/api/documentaries'&&req.method==='GET'){send(res,200,{docs: listDocumentaries()});return;}

  if (req.url === '/api/documentaries/correct-subtitles' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      if (!payload.text) throw new Error("Nenhum texto fornecido para correÃ§Ã£o.");
      
      const openaiKey = env('OPENAI_API_KEY', '');
      if (!openaiKey) throw new Error("Chave OPENAI_API_KEY necessÃ¡ria no Cofre de APIs para usar o corretor.");

      const systemPrompt = `VocÃª Ã© um Corretor OrtogrÃ¡fico de InteligÃªncia Artificial para legendas musicais da InkVortex Brasil.
Seu ÃšNICO objetivo Ã© corrigir palavras que estÃ£o escritas erradas em portuguÃªs devido a falhas de dicÃ§Ã£o, e consertar marcas registradas.

REGRAS DE MARCA (BRANDING) - PRIORIDADE MÃXIMA E ABSOLUTA:
- O nome da empresa Ã© "InkVortex". Se vocÃª ler "Inky Vortex", "Em que Vortex", "in cortex", "em que in cortex", "inque vortex" ou QUALQUER combinaÃ§Ã£o fonÃ©tica parecida (mesmo que sejam palavras vÃ¡lidas em portuguÃªs, como "Em que"), vocÃª DEVE obrigatoriamente substituir e aglutinar tudo em uma Ãºnica palavra: "InkVortex".
- Se ler "D G D T F", "D T G", "D T F": corrija para as siglas reais "DTG" ou "DTF".

REGRAS GERAIS DE COMPORTAMENTO:
1. NÃƒO invente contexto ou altere o sentido de outras palavras. Se o cantor cantou uma palavra estranha (ex: "caravela"), mantenha a palavra.
2. Fora as Regras de Marca acima, AJA COMO UM CORRETOR ORTOGRÃFICO CEGO. NÃ£o tente interpretar a mÃºsica. Corrija apenas a gramÃ¡tica, a vÃ­rgula e a pontuaÃ§Ã£o.
3. NÃƒO responda conversando comigo. Retorne APENAS o texto corrigido, nada mais.`;

      const resAi = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: payload.text }
          ],
          temperature: 0.1 // Temperatura super baixa para evitar alucinaÃ§Ãµes e focar apenas na gramÃ¡tica
        })
      });

      if (!resAi.ok) {
         const txt = await resAi.text();
         throw new Error(`OpenAI erro ${resAi.status}: ${txt}`);
      }

      const aiData = await resAi.json();
      if (aiData.error) throw new Error(aiData.error.message);
      
      const correctedText = aiData.choices[0].message.content.trim();
      send(res, 200, { ok: true, correctedText });
    } catch(err) {
      console.error("[CORRETOR SS] Erro:", err);
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/documentaries/transcribe' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const docNumStr = sanitizeNumericId(payload.docNum);
      const docFolder = safeJoin(ROOT, 'minisseries', docNumStr);
      if (!fs.existsSync(docFolder)) fs.mkdirSync(docFolder, { recursive: true });
      const { campaigns } = payload;
      if (!campaigns || campaigns.length === 0) throw new Error("Nenhuma minissÃ©rie fornecida para extraÃ§Ã£o de legendas.");

      const mp3List = [];
      campaigns.forEach(c => {
          const numVal = c.number || (typeof c.id === 'string' ? (c.id.match(/\d+/)||[1])[0] : c.id);
          const cNum = sanitizeNumericId(numVal || 1);
          const sonoDir = safeJoin(ROOT, 'minisseries', cNum, 'sonoplastia');
          
          let foundFile = null;
          
          if (c.selectedMp3) {
             const specificPath = path.join(ROOT, c.selectedMp3); 
             if (fs.existsSync(specificPath)) {
                 foundFile = specificPath;
             }
          }
          
          if (!foundFile) {
            const targetDirs = [path.join(sonoDir, 'geral', 'mp3')];
            for (const dir of targetDirs) {
              if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.mp3'));
                if (files.length > 0) {
                  foundFile = path.join(dir, files[0]);
                  break;
                }
              }
            }
          }
          
          if (foundFile) mp3List.push(foundFile);
      });

      if (mp3List.length === 0) throw new Error("Nenhum MP3 encontrado para extraÃ§Ã£o. Selecione as trilhas primeiro.");

      const { concatAudioTracks } = require('./documentary_engine.js');
      
      const masterMp3TempPath = path.join(docFolder, `${docNumStr}_Documentario_TrilhaMaster_Temp.mp3`);
      
      console.log(`[VOXTRAL] Unindo ${mp3List.length} trilhas temporariamente para audiÃ§Ã£o da IA...`);
      await concatAudioTracks(mp3List, masterMp3TempPath);
      
      console.log(`[VOXTRAL] Transcrevendo Ã¡udio unificado (isso pode levar alguns segundos)...`);
      const result = await generateTranscriptionData(masterMp3TempPath, '');
      const segments = result.words || result.segments || [];
      
      let allWords = [];
      const PT_BR_CORRECTIONS = {
          'algodao': 'algodÃ£o', 'impressao': 'impressÃ£o', 'impressora': 'impressora', 'impressoras': 'impressoras',
          'tecnica': 'tÃ©cnica', 'tecnico': 'tÃ©cnico', 'tecnicos': 'tÃ©cnicos', 'polimero': 'polÃ­mero', 'polimeros': 'polÃ­meros',
          'sublimacao': 'sublimaÃ§Ã£o', 'producao': 'produÃ§Ã£o', 'atencao': 'atenÃ§Ã£o', 'evolucao': 'evoluÃ§Ã£o',
          'revolucao': 'revoluÃ§Ã£o', 'solucao': 'soluÃ§Ã£o', 'edicao': 'ediÃ§Ã£o', 'opcao': 'opÃ§Ã£o',
          'minisserie': 'minissÃ©rie', 'minisseries': 'minissÃ©ries', 'nao': 'nÃ£o', 'sao': 'sÃ£o', 'estao': 'estÃ£o',
          'tambem': 'tambÃ©m', 'ja': 'jÃ¡', 'ate': 'atÃ©', 'voce': 'vocÃª', 'voces': 'vocÃªs', 'termica': 'tÃ©rmica'
      };

      segments.forEach(w => {
         let rawW = (w.word || w.text).trim();
         let clean = rawW.toLowerCase().replace(/[^a-z0-9Ã¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã£ÃµÃ§]/g, '');
         
         if (PT_BR_CORRECTIONS[clean]) {
             const prefix = rawW.match(/^[^a-zA-ZÃ¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã£ÃµÃ§]+/)?.[0] || '';
             const suffix = rawW.match(/[^a-zA-ZÃ¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã£ÃµÃ§]+$/)?.[0] || '';
             rawW = prefix + PT_BR_CORRECTIONS[clean] + suffix;
         }

         allWords.push({
           word: rawW,
           start: w.start,
           end: w.end
         });
      });
      
      try { fs.unlinkSync(masterMp3TempPath); } catch(e){}
      
      // Passar o texto bruto pra UI, e tambÃ©m salvar as timestamps temporariamente
      const rawText = allWords.map(w => w.word).join(' ');
      
      // Salva o JSON no disco caso o servidor reinicie, mas tambÃ©m retorna
      fs.writeFileSync(path.join(docFolder, 'transcription_raw.json'), JSON.stringify(allWords, null, 2));
      
      send(res, 200, { ok: true, text: rawText, rawWords: allWords });
    } catch(err) {
      console.error("[VOXTRAL] Erro:", err);
      sendApiError(res, err);
    }
    return;
  }

  // â”€â”€ PrÃ©via de Legendas: transcreve + aplica corretor ASS local (sem IA) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (req.url === '/api/documentaries/preview-subtitles' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const docNumStr = sanitizeNumericId(payload.docNum);
      const docFolder = safeJoin(ROOT, 'minisseries', docNumStr);
      if (!fs.existsSync(docFolder)) fs.mkdirSync(docFolder, { recursive: true });
      const { campaigns } = payload;
      if (!campaigns || campaigns.length === 0) throw new Error('Nenhuma minissÃ©rie fornecida.');

      // Monta lista de MP3s (mesmo algoritmo do endpoint /transcribe)
      const mp3List = [];
      campaigns.forEach(c => {
        const numVal = c.number || (typeof c.id === 'string' ? (c.id.match(/\d+/)||[1])[0] : c.id);
        const cNum = sanitizeNumericId(numVal || 1);
        const sonoDir = safeJoin(ROOT, 'minisseries', cNum, 'sonoplastia');
        let foundFile = null;
        if (c.selectedMp3) {
          const sp = path.join(ROOT, c.selectedMp3);
          if (fs.existsSync(sp)) foundFile = sp;
        }
        if (!foundFile) {
          const dir = path.join(sonoDir, 'geral', 'mp3');
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.mp3'));
            if (files.length > 0) foundFile = path.join(dir, files[0]);
          }
        }
        if (foundFile) mp3List.push(foundFile);
      });

      if (mp3List.length === 0) throw new Error('Nenhum MP3 encontrado. Selecione as trilhas primeiro.');

      const { concatAudioTracks, correctDocumentaryWords } = require('./documentary_engine.js');
      const masterTemp = path.join(docFolder, `${docNumStr}_preview_temp.mp3`);
      await concatAudioTracks(mp3List, masterTemp);

      console.log(`[PREVIEW-ASS] Transcrevendo para prÃ©via de legendas...`);
      const transcriptData = await generateTranscriptionData(masterTemp, '');
      const rawWordsPreview = transcriptData.words || transcriptData.segments || [];

      try { fs.unlinkSync(masterTemp); } catch(e){}

      // Aplica corretor ASS local e retorna texto prÃ©-corrigido
      const { words: correctedWords, text: correctedText } = correctDocumentaryWords(rawWordsPreview);

      // Salva rawWords no disco para reutilizar no render (evita re-transcriÃ§Ã£o)
      fs.writeFileSync(path.join(docFolder, 'transcription_raw.json'), JSON.stringify(rawWordsPreview, null, 2));

      send(res, 200, { ok: true, text: correctedText, rawWords: rawWordsPreview });
    } catch(err) {
      console.error('[PREVIEW-ASS] Erro:', err);
      sendApiError(res, err);
    }
    return;
  }

  if(req.url==='/api/save-audio-prompt-file'&&req.method==='POST'){
    try {
      // A pedido do diretor, o roteiro nÃ£o Ã© mais salvo em txt na pasta sonoplastia, para manter a pasta apenas com Ã¡udio/vÃ­deo.
      send(res, 200, { ok: true, message: 'Arquivo txt nÃ£o salvo.' });
    } catch(error) {
      sendApiError(res, error);
    }
    return;
  }
  if(req.url==='/api/shorts/generate-inputs'&&req.method==='POST'){
    try{
      const payload=await readBody(req);
      const { gptPrompts, geminiPrompts, campaignStr } = payload;
      const campStr = sanitizeNumericId(campaignStr);
      
      const gptDir = safeJoin(ROOT, 'minisseries', campStr, 'gpt');
      const geminiDir = safeJoin(ROOT, 'minisseries', campStr, 'gemini');
      
      let allPaths = [];
      if (gptPrompts && gptPrompts.length > 0) {
          const pathsGPT = await generateImageBatch(gptPrompts, gptDir, '');
          allPaths = allPaths.concat(pathsGPT);
      }
      if (geminiPrompts && geminiPrompts.length > 0) {
          const pathsGemini = await generateImageBatch(geminiPrompts, geminiDir, '');
          allPaths = allPaths.concat(pathsGemini);
      }

      send(res, 200, { ok: true, generatedPaths: allPaths });
    }catch(error){sendApiError(res,error);}
    return;
  }
  
  if (req.url === '/api/check-doc-images-status' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const docNum = sanitizeNumericId(payload.numDisplay || payload.docNum || '01');
      const imgDir = safeJoin(ROOT, 'minisseries', docNum, `M${docNum}`);
      let readyCount = 0;
      if (fs.existsSync(imgDir)) {
        const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.jpg'));
        files.forEach(f => {
          const p = path.join(imgDir, f);
          if (fs.existsSync(p) && fs.statSync(p).size > 10000) {
            readyCount++;
          }
        });
      }
      send(res, 200, { ok: true, docNum, readyCount });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url === '/api/check-block-audio' && req.method === 'POST') {
    try {
        const payload = await readBody(req);
        const { campaignIds, campaigns } = payload;
        const results = {};
        const { getAudioDuration, formatDurationSec } = require('./documentary_engine.js');

        const items = Array.isArray(campaigns) ? campaigns : (Array.isArray(campaignIds) ? campaignIds : []);

        for (const item of items) {
            let numVal = typeof item === 'object' ? item.number : item;
            if (!numVal && typeof item === 'object' && item.id) {
              const m = String(item.id).match(/\d+/);
              if (m) numVal = m[0];
            } else if (!numVal && typeof item === 'string') {
              const m = item.match(/\d+/);
              if (m) numVal = m[0];
            }

            const cNum = sanitizeNumericId(numVal || 1);
            const sonoDir = safeJoin(ROOT, 'minisseries', cNum, 'sonoplastia');
            const sonoGeralDir = path.join(sonoDir, 'geral', 'mp3');
            const sonoInscritoDir = path.join(sonoDir, 'inscrito');
            let mp3Files = [];
            let tracksWithDuration = [];

            const scanDirForMp3s = (targetDir) => {
              if (fs.existsSync(targetDir)) {
                const files = fs.readdirSync(targetDir).filter(f => {
                  const ext = path.extname(f).toLowerCase();
                  return ext === '.mp3' || ext === '.m4a' || ext === '.wav' || ext === '.aac';
                });
                files.forEach(f => {
                  if (!mp3Files.includes(f)) {
                    mp3Files.push(f);
                    tracksWithDuration.push({
                      filename: f,
                      fullPath: path.join(targetDir, f)
                    });
                  }
                });
              }
            };

            scanDirForMp3s(path.join(sonoDir, 'm4a'));
            scanDirForMp3s(sonoGeralDir);
            scanDirForMp3s(sonoDir);

            for (const item of tracksWithDuration) {
              const durSec = await getAudioDuration(item.fullPath);
              item.durationSec = Math.round(durSec);
              item.formattedTime = formatDurationSec(durSec);
            }
            
            const resObj = { 
              hasAudio: mp3Files.length > 0, 
              count: mp3Files.length, 
              file: mp3Files[0] || null, 
              allFiles: mp3Files,
              availableTracks: tracksWithDuration
            };

            if (typeof item === 'object') {
              if (item.id) results[item.id] = resObj;
              if (item.number) results[item.number] = resObj;
            } else {
              results[item] = resObj;
            }
            results[cNum] = resObj;
            results[parseInt(cNum, 10)] = resObj;
        }

        send(res, 200, { status: 'ok', results });
    } catch (err) { sendApiError(res, err); }
    return;
  }
  
  if (req.url === '/api/render-capas-4x5' && req.method === 'POST') {
    try {
        const payload = await readBody(req);
        const camp = payload.campaignId || "1";
        const campStr = sanitizeNumericId(camp);
        
        const sonoDir = safeJoin(ROOT, 'minisseries', campStr, 'sonoplastia');
        const socialAudioDir = safeJoin(ROOT, 'minisseries', 'Ã¡udio social');
        
        let sourceDir = sonoDir;
        let mp4Files = [];
        if (fs.existsSync(sonoDir)) {
            mp4Files = fs.readdirSync(sonoDir).filter(f => f.toLowerCase().endsWith('.mp4'));
        }
        if (mp4Files.length === 0 && fs.existsSync(socialAudioDir)) {
            sourceDir = socialAudioDir;
            mp4Files = fs.readdirSync(socialAudioDir).filter(f => f.toLowerCase().endsWith('.mp4') && f.startsWith(campStr + ' - '));
        }
        
        if (mp4Files.length === 0) {
             send(res, 400, { ok: false, error: 'Nenhum vÃ­deo MP4 encontrado na pasta sonoplastia ou Ã¡udio social.' });
             return;
        }

        const generatedFiles = [];
        if (!fs.existsSync(socialAudioDir)) fs.mkdirSync(socialAudioDir, { recursive: true });

        for (const mp4File of mp4Files) {
            const mp4Path = path.join(sourceDir, mp4File);
            const baseName = path.parse(mp4File).name.replace(/_?[Ll]egendado/gi, '').replace(/^[0-9]{1,3}\s*[-_]\s*/, '').trim();
            const out4x5Name = `${campStr} - ${baseName}_CAPA_4x5.png`;
            const out4x5Path = path.join(socialAudioDir, out4x5Name);

            // Pular se a capa 4x5 jÃ¡ foi renderizada previamente
            if (fs.existsSync(out4x5Path)) {
                generatedFiles.push(out4x5Name);
                continue;
            }

            // Renderiza diretamente a composiÃ§Ã£o 4:5 (1080x1350 com Safe Zone Instagram) na pasta f:\VORTEX10\render\Ã¡udio social
            const cmd4x5 = `${videoService.getFfmpegPath()} -y -ss 00:00:00.5 -i "${mp4Path}" -vframes 1 -filter_complex "[0:v]scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350,gblur=sigma=60,eq=brightness=-0.1:saturation=1.1[bg]; [0:v]scale=940:940[fg]; [bg][fg]overlay=70:205" "${out4x5Path}"`;
            try {
                await videoService.execFfmpegAsync(cmd4x5);
                if (fs.existsSync(out4x5Path)) {
                    generatedFiles.push(out4x5Name);
                }
            } catch(e) {
                console.error('Erro ao renderizar capa 4x5:', e);
            }
        }

        // Limpeza rigorosa da pasta sonoplastia: remove qualquer arquivo PNG residual se existir
        if (fs.existsSync(sonoDir)) {
            const pngResiduals = fs.readdirSync(sonoDir).filter(f => f.toLowerCase().endsWith('.png'));
            for (const png of pngResiduals) {
                try { fs.unlinkSync(path.join(sonoDir, png)); } catch(e) {}
            }
        }

        send(res, 200, { ok: true, count: generatedFiles.length, files: generatedFiles });
    } catch(err) { sendApiError(res, err); }
    return;
  }

  if (req.url === '/api/render-standalone-capas-4x5' && req.method === 'POST') {
    try {
        const targetDir = safeJoin(ROOT, 'minisseries', 'capa 4x5');
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const manifestPath = path.join(targetDir, '.processed_capas.json');
        let processedMap = {};
        if (fs.existsSync(manifestPath)) {
            try { processedMap = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch(e){}
        }

        const validExts = new Set(['.png', '.jpg', '.jpeg', '.webp']);
        const allFiles = fs.readdirSync(targetDir).filter(f => !f.startsWith('.') && validExts.has(path.extname(f).toLowerCase()));

        if (allFiles.length === 0) {
            send(res, 400, { ok: false, error: 'Nenhuma imagem (PNG, JPG, WEBP) encontrada na pasta F:\\VORTEX10\\minisseries\\capa 4x5' });
            return;
        }

        let convertedCount = 0;
        let skippedCount = 0;
        for (const file of allFiles) {
            const filePath = path.join(targetDir, file);
            const stat = fs.statSync(filePath);

            // Verifica se o arquivo jÃ¡ consta como processado com o mesmo tamanho/mtime
            if (processedMap[file] && processedMap[file].size === stat.size && processedMap[file].mtime === stat.mtimeMs) {
                skippedCount++;
                continue;
            }

            // Converte a imagem usando o filtro Safe Zone 4:5 (1080x1350)
            const tempOutPath = path.join(targetDir, `.temp_${Date.now()}_${file}`);
            const cmd = `${videoService.getFfmpegPath()} -y -i "${filePath}" -filter_complex "[0:v]scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350,gblur=sigma=60,eq=brightness=-0.1:saturation=1.1[bg]; [0:v]scale=940:940[fg]; [bg][fg]overlay=70:205" "${tempOutPath}"`;
            
            try {
                await videoService.execFfmpegAsync(cmd);
                if (fs.existsSync(tempOutPath)) {
                    // Substitui a imagem original pela versÃ£o convertida 4:5
                    fs.unlinkSync(filePath);
                    fs.renameSync(tempOutPath, filePath);

                    const newStat = fs.statSync(filePath);
                    processedMap[file] = {
                        processedAt: new Date().toISOString(),
                        size: newStat.size,
                        mtime: newStat.mtimeMs
                    };
                    convertedCount++;
                }
            } catch(err) {
                console.error(`Erro ao converter ${file} para 4x5:`, err);
                if (fs.existsSync(tempOutPath)) {
                    try { fs.unlinkSync(tempOutPath); } catch(e){}
                }
            }
        }

        // Salva o manifesto de controle de capas convertidas
        fs.writeFileSync(manifestPath, JSON.stringify(processedMap, null, 2), 'utf8');

        send(res, 200, { ok: true, convertedCount, skippedCount, total: allFiles.length });
    } catch(err) { sendApiError(res, err); }
    return;
  }

  if (req.url === '/api/render-audio-subs' && req.method === 'POST') {
    try {
        const payload = await readBody(req);
        const camp = payload.campaignId || "1";
        const campStr = sanitizeNumericId(camp);
        
        const isDedicated = payload.isDedicated ? true : false;
        let audioDir = isDedicated
          ? safeJoin(ROOT, 'minisseries', campStr, 'sonoplastia', 'inscrito')
          : safeJoin(ROOT, 'minisseries', campStr, 'sonoplastia', 'geral');
          
        let socialDir = isDedicated
          ? safeJoin(ROOT, 'minisseries', 'Ã¡udio social', campStr, 'inscrito')
          : safeJoin(ROOT, 'minisseries', 'Ã¡udio social', campStr, 'geral');
        
        if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
        if (!fs.existsSync(socialDir)) fs.mkdirSync(socialDir, { recursive: true });
        
        const baseAudioDir = audioDir;
        let mp4SubDir = path.join(baseAudioDir, 'mp4');
        let mp4Files = [];
        if (fs.existsSync(mp4SubDir)) {
          mp4Files = fs.readdirSync(mp4SubDir).filter(f => f.toLowerCase().endsWith('.mp4'));
          if (mp4Files.length > 0) audioDir = mp4SubDir;
        }
        if (mp4Files.length === 0) {
          mp4Files = fs.readdirSync(baseAudioDir).filter(f => f.toLowerCase().endsWith('.mp4'));
        }
        if (mp4Files.length === 0 && !isDedicated) {
           const fallbackRoot = safeJoin(ROOT, 'minisseries', campStr, 'sonoplastia');
           if (fs.existsSync(fallbackRoot)) {
             const rootMp4s = fs.readdirSync(fallbackRoot).filter(f => f.toLowerCase().endsWith('.mp4'));
             if (rootMp4s.length > 0) {
               audioDir = fallbackRoot;
               mp4Files = rootMp4s;
             }
           }
        }

        if (mp4Files.length === 0) {
             const targetFolderStr = isDedicated ? `f:\\VORTEX10\\render\\${campStr}\\sonoplastia\\inscrito\\mp4` : `f:\\VORTEX10\\render\\${campStr}\\sonoplastia\\geral\\mp4`;
             send(res, 400, { ok: false, error: `Nenhum MP4 encontrado na pasta ${targetFolderStr}. Baixe o vÃ­deo da geradora de mÃºsica e coloque lÃ¡.` });
             return;
        }

        const renderedFiles = [];
        delete require.cache[require.resolve('./ass_generator.js')];
        const { generateTikTokAssScript } = require('./ass_generator.js');
        const { burnSubtitlesToAudioVideo } = require('./shorts_engine.js');

        let promptsDir = path.join(baseAudioDir, 'prompts');
        if (!fs.existsSync(promptsDir)) promptsDir = baseAudioDir;
        const txtFiles = fs.readdirSync(promptsDir).filter(f => f.toLowerCase().endsWith('.txt'));

        for (const mp4Name of mp4Files) {
            let baseName = path.parse(mp4Name).name;
            const lowerMp4 = mp4Name.toLowerCase();
            let promptText = '';
            
            // 1. Pareamento Exato pelo Nome do Arquivo .txt
            let matchedTxt = txtFiles.find(t => path.parse(t).name.toLowerCase() === lowerMp4);

            // 2. Pareamento Inteligente pelo Estilo Musical (ex: ROCK, TRAP, REGGAE, BLUES)
            if (!matchedTxt) {
                const styleMatch = lowerMp4.match(/-\s*([a-z0-9]+)\s*-/i);
                if (styleMatch) {
                    const styleKw = styleMatch[1].toLowerCase();
                    matchedTxt = txtFiles.find(t => t.toLowerCase().includes(styleKw));
                }
            }

            // 3. Fallback FonÃ©tico de Voz
            if (!matchedTxt) {
                const keywords = ['masculina', 'feminina', 'coral'];
                for (const kw of keywords) {
                    if (lowerMp4.includes(kw)) {
                        matchedTxt = txtFiles.find(t => t.toLowerCase().includes(kw));
                        if (matchedTxt) break;
                    }
                }
            }

            if (matchedTxt) {
                baseName = path.parse(matchedTxt).name;
                promptText = fs.readFileSync(path.join(promptsDir, matchedTxt), 'utf-8');
            }

            const cleanBase = baseName.replace(/^[0-9]{1,3}\s*[-_]\s*/, '');
            const finalFileName = `${campStr} - ${cleanBase}_Legendado.mp4`;
            const outputPath = path.join(socialDir, finalFileName);
            
            // 0. Se o vÃ­deo final jÃ¡ existe, verifica se deve pular (batch mode) ou forÃ§ar (botÃ£o individual)
            if (fs.existsSync(outputPath)) {
                if (payload.skipIfExists === true) {
                    console.log(`ðŸ“Œ CENTRAL INKVORTEX: VÃ­deo final jÃ¡ existe em Ã¡udio social -> "${finalFileName}". Pulando (batch mode)...`);
                    renderedFiles.push(outputPath);
                    continue;
                }
                console.log(`ðŸ§¹ CENTRAL INKVORTEX: Apagando vÃ­deo antigo para forÃ§ar nova renderizaÃ§Ã£o -> "${finalFileName}"`);
                try { fs.unlinkSync(outputPath); } catch(e){}
            }

            const sourceMp4 = path.join(audioDir, mp4Name);
            
            // 1. TranscriÃ§Ã£o de Ãudio via OpenAI
            const transcriptData = await generateTranscriptionData(sourceMp4, promptText);
            
            // 2. GeraÃ§Ã£o do Arquivo ASS com CorreÃ§Ã£o Contextual de Marca (InkVortex / DTG / DTF / Link na Bio)
            const { assContent } = generateTikTokAssScript(transcriptData);
            const assPath = path.join(audioDir, `legenda_${baseName}.ass`);
            fs.writeFileSync(assPath, assContent, 'utf-8');
            
            // 3. Queima de Legendas (grava diretamente em render/audio social)
            await burnSubtitlesToAudioVideo({
                inputVideo: sourceMp4,
                assFile: assPath,
                outputPath: outputPath
            });

            // 4. Limpeza Seletiva: Deleta apenas o MP4 cru e a legenda temporÃ¡ria ASS.
            // MP3 e TXT sÃ£o MANTIDOS INTACTOS para o Multiverso DocumentÃ¡rios do YouTube!
            if (fs.existsSync(assPath)) {
                try { fs.unlinkSync(assPath); } catch(e){}
            }
            // PRESERVAÃ‡ÃƒO TOTAL DO MP4 BRUTO EM SONOPLASTIA (NUNCA DELETADO!)
            
            renderedFiles.push(outputPath);
        }
        
        send(res, 200, { ok: true, files: renderedFiles });
    } catch(err) {
        sendApiError(res, err);
    }
    return;
  }

  if(req.url==='/api/shorts/assemble'&&req.method==='POST'){
    try{
      const payload=await readBody(req);
      const outPath = await assembleShortsVideo(payload);
      send(res, 200, { ok: true, outputPath: outPath });
    }catch(error){sendApiError(res,error);}
    return;
  }
  if (req.url === '/api/render-multiverso/assemble' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const camp = payload.campaignId || "1";
      const campStr = sanitizeNumericId(camp);
      
      const gptDir = safeJoin(ROOT, 'minisseries', campStr, 'gpt');
      const flowDir = safeJoin(ROOT, 'minisseries', campStr, 'flow');
      const audioDir = safeJoin(ROOT, 'minisseries', campStr, 'sonoplastia');
      const ctaDir = safeJoin(ROOT, 'minisseries', 'cta');
      const logoDir = safeJoin(ROOT, 'minisseries', 'logo');
      
      const findFirstExt = (dir, ext) => {
        if (!fs.existsSync(dir)) return null;
        const file = fs.readdirSync(dir).find(f => f.toLowerCase().endsWith(ext));
        return file ? path.join(dir, file) : null;
      };
      
      const findMaster = (dir) => {
        if (!fs.existsSync(dir)) return null;
        const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.mp4') && !f.toLowerCase().startsWith('final'));
        return files.length > 0 ? path.join(dir, files[0]) : null;
      };
      
      const findImage = (dir, nameWithoutExt) => {
        if (!fs.existsSync(dir)) return null;
        for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
           const p = path.join(dir, nameWithoutExt + ext);
           if (fs.existsSync(p)) return p;
        }
        return null;
      };

      const geminiDir = safeJoin(ROOT, 'minisseries', campStr, 'gemini');
      const ctaVideoDir = safeJoin(ROOT, 'minisseries', 'cta_video');

      const getNextSequentialCtaCoverImage = () => {
        const primaryCtaDir = safeJoin(ROOT, 'minisseries', 'cta');
        if (!fs.existsSync(primaryCtaDir)) fs.mkdirSync(primaryCtaDir, { recursive: true });

        const validExts = new Set(['.png', '.jpg', '.jpeg', '.webp']);
        const files = fs.readdirSync(primaryCtaDir)
          .filter(f => !f.startsWith('.') && validExts.has(path.extname(f).toLowerCase()))
          .sort((a, b) => {
            const numA = parseInt(path.parse(a).name, 10) || 0;
            const numB = parseInt(path.parse(b).name, 10) || 0;
            return numA - numB;
          });

        if (files.length === 0) return null;

        const counterFile = path.join(primaryCtaDir, '.cta_render_counter.json');
        let counterData = { nextIndex: 0 };
        if (fs.existsSync(counterFile)) {
          try { counterData = JSON.parse(fs.readFileSync(counterFile, 'utf8')); } catch(e) {}
        }

        let index = Number(counterData.nextIndex) || 0;
        if (index >= files.length || index < 0) {
          index = 0;
        }

        const selectedFile = files[index];
        const selectedPath = path.join(primaryCtaDir, selectedFile);

        counterData.nextIndex = (index + 1) % files.length;
        counterData.lastUsedFile = selectedFile;
        counterData.lastUsedAt = new Date().toISOString();

        try {
          fs.writeFileSync(counterFile, JSON.stringify(counterData, null, 2), 'utf8');
        } catch(e) {}

        return selectedPath;
      };

      const coverImagePath = getNextSequentialCtaCoverImage() || findImage(gptDir, '01');
      const masterVideoPath = findMaster(flowDir);
      
      const gptImagePaths = [];
      for(let i=1; i<=5; i++) {
         const p = findImage(gptDir, sanitizeNumericId(i));
         if (p) gptImagePaths.push(p);
      }

      const geminiImagePaths = [];
      for(let i=1; i<=5; i++) {
         const p = findImage(geminiDir, sanitizeNumericId(i));
         if (p) geminiImagePaths.push(p);
      }
      
      const ctaVideoImagePath = findImage(ctaVideoDir, '01') || findImage(ctaDir, '01');
      const logoVideoPath = findFirstExt(logoDir, '.mp4');
      
      const audioGeralDir = safeJoin(ROOT, 'minisseries', campStr, 'sonoplastia', 'geral');
      const audioInscritoDir = safeJoin(ROOT, 'minisseries', campStr, 'sonoplastia', 'inscrito');
      
      let soundtrackPath = findFirstExt(path.join(audioGeralDir, 'mp3'), '.mp3')
        || findFirstExt(audioGeralDir, '.mp3')
        || findFirstExt(path.join(audioInscritoDir, 'mp3'), '.mp3')
        || findFirstExt(audioInscritoDir, '.mp3')
        || findFirstExt(audioDir, '.mp3');

      if (payload.soundtrackFile) {
          if (fs.existsSync(path.join(audioGeralDir, 'mp3', payload.soundtrackFile))) {
              soundtrackPath = path.join(audioGeralDir, 'mp3', payload.soundtrackFile);
          } else if (fs.existsSync(path.join(audioGeralDir, payload.soundtrackFile))) {
              soundtrackPath = path.join(audioGeralDir, payload.soundtrackFile);
          } else if (fs.existsSync(path.join(audioInscritoDir, 'mp3', payload.soundtrackFile))) {
              soundtrackPath = path.join(audioInscritoDir, 'mp3', payload.soundtrackFile);
          } else if (fs.existsSync(path.join(audioInscritoDir, payload.soundtrackFile))) {
              soundtrackPath = path.join(audioInscritoDir, payload.soundtrackFile);
          }
      }
      
      const videoSocialDir = safeJoin(ROOT, 'minisseries', 'video social', campStr);
      if (!fs.existsSync(videoSocialDir)) {
         fs.mkdirSync(videoSocialDir, { recursive: true });
      }
      let finalFileName = `${campStr} - Final.mp4`;
      if (soundtrackPath) {
          const rawVoiceName = path.parse(soundtrackPath).name;
          const cleanVoiceName = rawVoiceName.replace(/^[0-9]{1,3}\s*[-_]\s*/, '');
          finalFileName = `${campStr} - ${cleanVoiceName}.mp4`;
      }
      const outputPath = path.join(videoSocialDir, finalFileName);

      const missing = [];
      if (!coverImagePath) missing.push('Capa CTA na pasta /minisseries/cta/');
      if (!masterVideoPath) missing.push('VÃ­deo Master em flow/');
      if (gptImagePaths.length < 5) missing.push('Imagens GPT (01 a 05 em gpt/)');
      if (geminiImagePaths.length < 5) missing.push('Imagens Gemini (01 a 05 em gemini/)');
      if (!ctaVideoImagePath) missing.push('Imagem CTA 01 em cta_video/ ou cta/');
      if (!logoVideoPath) missing.push('VÃ­deo Logo em logo/');
      if (!soundtrackPath) missing.push('Trilha Sonora (.mp3) em sonoplastia/');
      
      if (missing.length > 0) {
         send(res, 400, { ok: false, error: 'Arquivos ausentes para renderizaÃ§Ã£o', missing });
         return;
      }

      if (fs.existsSync(outputPath) && payload.skipIfExists === true) {
         console.log(`ðŸ“Œ CENTRAL INKVORTEX: VÃ­deo final jÃ¡ existe -> "${finalFileName}". Pulando (batch mode)...`);
         send(res, 200, { ok: true, outputPath: outputPath, finalVideoUrl: `/minisseries/video social/${campStr}/${finalFileName}` });
         return;
      }

      const params = {
         coverImagePath,
         masterVideoPath,
         gptImagePaths,
         geminiImagePaths,
         ctaVideoImagePath,
         logoVideoPath,
         soundtrackPath,
         outputPath
      };
      
      const outPath = await assembleShortsVideo(params);

      send(res, 200, { ok: true, outputPath: outPath, finalVideoUrl: `/minisseries/video social/${campStr}/${finalFileName}` });
    } catch(error) {
      sendApiError(res, error);
    }
    return;
  }
  if (req.url.startsWith('/api/shorts/telemetry') && req.method === 'GET') {
    try {
      const urlParams = new URL(req.url, 'http://localhost:' + PORT);
      const camp = urlParams.searchParams.get('campaignId') || "1";
      const campStr = sanitizeNumericId(camp);
      
      const gptDir = safeJoin(ROOT, 'minisseries', campStr, 'gpt');
      const geminiDir = safeJoin(ROOT, 'minisseries', campStr, 'gemini');
      const flowDir = safeJoin(ROOT, 'minisseries', campStr, 'flow');
      const audioDir = safeJoin(ROOT, 'minisseries', campStr, 'sonoplastia');
      const ctaDir = safeJoin(ROOT, 'minisseries', 'cta');
      const logoDir = safeJoin(ROOT, 'minisseries', 'logo');
      
      const hasImages = fs.existsSync(gptDir) && fs.readdirSync(gptDir).filter(f => f.endsWith('.png')).length >= 5;
      const hasGemini = fs.existsSync(geminiDir) && fs.readdirSync(geminiDir).filter(f => f.endsWith('.png')).length >= 5;
      const hasFlow = fs.existsSync(flowDir) && fs.readdirSync(flowDir).filter(f => f.endsWith('.mp4')).length > 0;
      const hasAudio = fs.existsSync(audioDir) && fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3')).length > 0;
      const hasCta = fs.existsSync(ctaDir) && fs.readdirSync(ctaDir).filter(f => f.endsWith('.png')).length >= 3;
      const hasLogo = fs.existsSync(logoDir) && fs.readdirSync(logoDir).filter(f => f.endsWith('.mp4')).length > 0;
      
      const ready = hasImages && hasGemini && hasFlow && hasAudio && hasCta && hasLogo;
      
      send(res, 200, {
        campaignId: camp,
        ready,
        components: { hasImages, hasGemini, hasFlow, hasAudio, hasCta, hasLogo }
      });
    } catch(e) { sendApiError(res, e); }
    return;
  }
  if(req.url==='/api/shorts/batch-render'&&req.method==='POST'){
    try{
      const payload=await readBody(req);
      const { campaignIds } = payload;
      send(res, 200, { ok: true });
    }catch(error){sendApiError(res,error);}
    return;
  }
  if (req.url.startsWith('/api/cta/scan') && (req.method === 'GET' || req.method === 'POST')) {
    try {
      const ctaDir = safeJoin(ROOT, 'minisseries', 'cta');
      const dbPath = path.join(ctaDir, 'cta_database.json');
      if (!fs.existsSync(ctaDir)) fs.mkdirSync(ctaDir, { recursive: true });
      
      let db = [];
      if (fs.existsSync(dbPath)) {
        try { db = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch(e){}
      }

      const files = fs.readdirSync(ctaDir).filter(f => /^\d+\.(png|jpg|jpeg|webp)$/i.test(f));
      let updated = false;

      for (const file of files) {
        const relImage = `/minisseries/cta/${file}`;
        const basenameNoExt = path.basename(file, path.extname(file)); // Ex: "01", "02", "poster_trilha"
        
        // Verifica se hÃ¡ item no banco correspondente ao nome do arquivo ou ID numÃ©rico
        let existing = db.find(item => item.image === relImage || item.image.endsWith('/' + file) || item.numStr === basenameNoExt || item.id === `cta_${basenameNoExt}`);
        
        if (existing) {
          // Se a imagem no banco aponta para um arquivo com extensÃ£o diferente (ex: .jpg vs .png), sincroniza com a imagem real encontrada no disco!
          if (existing.image !== relImage) {
            existing.image = relImage;
            existing.aspectRatio = "9:16";
            updated = true;
          }
        } else {
          // Se Ã© um arquivo numerado novo (ex: 02.png, 03.png), cria item no banco
          const newItem = {
            id: `cta_${basenameNoExt}`,
            numStr: basenameNoExt,
            title: `Campanha Comercial CTA ${basenameNoExt.toUpperCase()}`,
            subtitle: `Arte 9:16 associada ao arquivo /minisseries/cta/${file}`,
            category: "Engajamento & InteraÃ§Ã£o",
            aspectRatio: "9:16",
            image: relImage,
            created_at: new Date().toISOString(),
            imagePrompt: `Create a vertical 9:16 aspect ratio poster for ChatGPT DALL-E 3 set inside a high-tech Epson DTG/DTF printing studio with vibrant cyan neon lights. Center glowing 3D neon text: "SUA TRILHA NA MINISSÃ‰RIE". Photorealistic 8k studio lighting.`,
            caption: `ðŸ”¥ CHAMADA COMERCIAL EXCLUSIVA INKVORTEX BRASIL CTA ${basenameNoExt.toUpperCase()}!\n\nConfira esta chamada interativa em nossa galeria oficial.\n\nðŸ‘‡ COMO PARTICIPAR:\n1ï¸âƒ£ Deixe seu comentÃ¡rio na publicaÃ§Ã£o.\n2ï¸âƒ£ Marque a opÃ§Ã£o de interesse.\n3ï¸âƒ£ Acompanhe o lanÃ§amento no nosso canal!\n\nðŸ›’ Link dos insumos na Bio!\n#InkVortexBrasil #Engajamento`
          };

          db.push(newItem);
          updated = true;
        }
      }

      db.sort((a, b) => {
        const numA = parseInt(a.numStr || String(a.id || '').replace(/\D/g, '') || 0, 10);
        const numB = parseInt(b.numStr || String(b.id || '').replace(/\D/g, '') || 0, 10);
        return numB - numA;
      });

      if (updated) {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      }

      send(res, 200, db);
    } catch(e) { sendApiError(res, e); }
    return;
  }
  if (req.url === '/api/cta/regenerate' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const { ctaId } = payload;
      const ctaDir = safeJoin(ROOT, 'minisseries', 'cta');
      const dbPath = path.join(ctaDir, 'cta_database.json');
      
      let db = [];
      if (fs.existsSync(dbPath)) {
        db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      }
      
      const item = db.find(i => i.id === ctaId);
      if (!item) throw new Error("CTA nÃ£o encontrada no banco de dados");

      const fileBasename = path.basename(item.image);
      const imgPath = path.join(ctaDir, fileBasename);

      if (!fs.existsSync(imgPath)) throw new Error(`Arquivo de imagem ${fileBasename} nÃ£o encontrado em /minisseries/cta/`);

      const base64 = fs.readFileSync(imgPath).toString('base64');
      const ext = path.extname(fileBasename).slice(1).toLowerCase() || 'png';
      const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      
      const openaiKey = env('OPENAI_API_KEY', '');
      if (!openaiKey) throw new Error("Chave OPENAI_API_KEY necessÃ¡ria no Cofre de APIs para usar a VisÃ£o Computacional.");

      const visionRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + openaiKey },
        body: JSON.stringify({
          model: 'pixtral-12b-2409',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: 'Analise esta imagem comercial CTA em portuguÃªs. Leia exatamente o texto e o tÃ­tulo escrito dentro da imagem. Em seguida, crie uma legenda comercial de engajamento completa para redes sociais (Instagram/LinkedIn/Shorts) contendo: 1. TÃ­tulo em caixa alta com emojis. 2. ExplicaÃ§Ã£o da proposta em 3 passos interativos para o inscrito comentar. 3. BenefÃ­cio/PrÃªmio para o leitor. 4. Assinatura de autoridade InkVortex Brasil, link da Bio do Mercado Livre e hashtags.' },
              { type: 'image_url', image_url: `data:${mimeType};base64,${base64}` }
            ]
          }]
        })
      });

      const vData = await visionRes.json();
      if (vData.choices && vData.choices[0]) {
        item.caption = vData.choices[0].message.content;
        const lines = item.caption.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) item.title = lines[0].replace(/[*#]/g, '');
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      } else {
        throw new Error("Erro na API Pixtral Vision: " + (vData.error ? vData.error.message : 'Sem resposta'));
      }

      send(res, 200, item);
    } catch(e) { sendApiError(res, e); }
    return;
  }
  if (req.url === '/api/cta/generate-ai' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const userTopic = payload.topic || 'Escolha a PrÃ³xima Trilha ou Tema da MinissÃ©rie';
      
      const openaiKey = env('OPENAI_API_KEY', '');
      if (!openaiKey) throw new Error("Chave OPENAI_API_KEY necessÃ¡ria no Cofre de APIs.");

      const ctaDir = safeJoin(ROOT, 'minisseries', 'cta');
      const dbPath = path.join(ctaDir, 'cta_database.json');
      if (!fs.existsSync(ctaDir)) fs.mkdirSync(ctaDir, { recursive: true });

      let db = [];
      if (fs.existsSync(dbPath)) {
        try { db = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch(e){}
      }

      // Calcula o maior nÃºmero existente no banco (ex: 01, 02) para continuar sequencialmente (03, 04...)
      const maxSeq = db.reduce((max, item) => Math.max(max, parseInt(item.numStr || String(item.id||'').replace(/\D/g, '') || 0, 10) || 0), 0);
      const numSeq = maxSeq + 1;
      const numStr = sanitizeNumericId(numSeq);

      // Lista dos 10 CenÃ¡rios de Alta Tecnologia InkVortex Brasil
      const scenarios = [
        "EstÃºdio Cyberpunk Neon HologrÃ¡fico de Alta Tecnologia",
        "Oficina TÃªxtil Epson Industrial HD (Microfibras & Tintas TÃªxteis em AÃ§Ã£o)",
        "LaboratÃ³rio BiotecnolÃ³gico Futurista & Biomoda Neon",
        "Palco de ProduÃ§Ã£o Musical CinemÃ¡tica & Ondas Sonoras HologrÃ¡ficas",
        "GalÃ¡xia Profunda Multiverso & Portais Dimensionais de Cristal",
        "Centro de Comando Espacial & Monitores HologrÃ¡ficos de Alta ResoluÃ§Ã£o",
        "Atelier de Arte Urbana Neon TÃªxtil & Tintas Fluorescentes em ExplosÃ£o",
        "LaboratÃ³rio de Engenharia Sonora & Instrumentos Futuristas Suspensos",
        "Sala de ProjeÃ§Ã£o CinemÃ¡tica 8K & Telas Transparentes de Neon",
        "Garagem de InovaÃ§Ã£o Industrial & Impressoras 3D/TÃªxteis Futuristas"
      ];

      // SeleÃ§Ã£o determinÃ­stica baseada no nÃºmero da CTA (numSeq)
      const assignedScenario = scenarios[(numSeq - 1) % scenarios.length];

      // 1. Escaneia o histÃ³rico do banco de dados para garantir varredura de CTAs anteriores
      const existingHistory = db.map(item => `[CTA ${item.numStr || item.id}] TÃ­tulo: "${item.title}" | Chamada na Arte: "${item.textInImage || ''}" | Categoria: "${item.category || ''}"`).join('\n');

      let promptSystem = ``;
      
      if (payload.isDocumentary) {
        promptSystem = `VocÃª Ã© o Diretor Criativo Executivo da InkVortex Brasil.
Sua missÃ£o Ã© criar a CAPA OFICIAL (THUMBNAIL 16:9) e a Legenda de Engajamento para o novo DocumentÃ¡rio Ã‰pico #${numStr} da InkVortex.

ESTRUTURA ESTRATÃ‰GICA DA CTA DO DOCUMENTÃRIO (A TRILHA DESSE MUNDO JÃ EXISTE):
Este documentÃ¡rio nÃ£o tem legendas, Ã© uma imersÃ£o visual 100% pura embalada por uma Trilha Sonora musical (Blues, Rock, Lo-Fi, etc) poderosa.
O objetivo da CTA Ã© convocar o espectador a mergulhar no Multiverso, desafiando-o a comentar qual o estilo musical combinou mais com a arte que ele acabou de assistir.

DIRETRIZES DE CRIAÃ‡ÃƒO DA ARTE VISUAL (DALL-E 3):
1. FORMATO DA ARTE: ProporÃ§Ã£o estritamente 16:9 (Horizontal Widescreen - Formato de Capa de YouTube).
2. TÃTULO CENTRAL NEON: O DALL-E deve escrever no centro da imagem a exata frase em portuguÃªs: "A TRILHA DESSE MUNDO JÃ EXISTE. QUAL Ã‰ A SUA?"
3. CENÃRIO: Ambientar num "${assignedScenario}" altamente cinematogrÃ¡fico e hiper-realista.

ESTRUTURA DA LEGENDA DO POST ('caption'):
A legenda redigida em portuguÃªs deve ter:
- BLOCO 1: TÃ­tulo em caixa alta com emojis exaltando o Mergulho no Multiverso.
- BLOCO 2: Texto Ã©pico avisando que o DocumentÃ¡rio Ã© apenas uma amostra visual da nossa Tecnologia de ImpressÃ£o DTG/DTF e desafiando o leitor a comentar qual estilo musical (Blues, Rock, etc) ditou o ritmo das imagens.
- BLOCO 3: Convite para assistir as minissÃ©ries completas no canal oficial do YouTube.
- BLOCO 4: Chamada Comercial ("Insumos, peÃ§as e tintas tÃªxteis de alta definiÃ§Ã£o na loja do Mercado Livre: Link na Bio!") + Hashtags.

FORMATO DE RESPOSTA (JSON):
{
  "title": "A TRILHA DESSE MUNDO JÃ EXISTE",
  "subtitle": "CTA Oficial DocumentÃ¡rio #${numStr}",
  "category": "DocumentÃ¡rio Original",
  "textInImage": "A TRILHA DESSE MUNDO JÃ EXISTE. QUAL Ã‰ A SUA?",
  "imagePrompt": "Create a horizontal 16:9 aspect ratio epic cinematic YouTube thumbnail poster for ChatGPT DALL-E 3 set inside a ${assignedScenario}. Prominently center the glowing 3D neon typography text written in Portuguese: \\"A TRILHA DESSE MUNDO JÃ EXISTE. QUAL Ã‰ A SUA?\\". Photorealistic 8k, cinematic lighting.",
  "caption": "ðŸ”¥ [HEADLINE Ã‰PICA]\n\nðŸŽ§ [TEXTO DESAFIANDO A COMENTAR O ESTILO MUSICAL]\n\nðŸ‘‡ [CONVITE PARA MARATONAR AS MINISSÃ‰RIES]\n\nðŸ›’ Insumos, peÃ§as e tintas oficiais na nossa loja do Mercado Livre: Link na Bio!\n#InkVortexBrasil #ImpressaoDigital #DTG #DTF #TrilhaSonora #Documentario"
}`;
      } else {
        promptSystem = `VocÃª Ã© o Diretor Criativo Executivo, Mestre em Engajamento e Especialista em Gatilhos Mentais da InkVortex Brasil.
Sua missÃ£o Ã© criar uma NOVA campanha de Call to Action (CTA #${numStr}) 100% INÃ‰DITA E PROVOCATIVA em portuguÃªs.

ESTRUTURA ESTRATÃ‰GICA DA CTA:
Esta CTA funciona como uma CAPA ISCA DE ALTA CONVERSÃƒO (THUMBNAIL MAGNÃ‰TICA DE VÃDEO). 
O objetivo primÃ¡rio Ã© gerar CURIOSIDADE IRRESISTÃVEL, SUSPENSE E TENSÃƒO DE CLIQUE para fazer o espectador parar de rolar o feed e CLICAR para ouvir a trilha sonora autoral com legendas dinÃ¢micas.

HISTÃ“RICO DE CTAS JÃ GERADAS NO BANCO DE DADOS (PROIBIDO REPETIR CONCEITOS ANTERIORES):
${existingHistory || 'Nenhuma CTA anterior registrada.'}

DIRETRIZES DE CRIAÃ‡ÃƒO DA ARTE VISUAL (DALL-E 3 / CHATGPT):

1. REGRA DE OURO DO TÃTULO CENTRAL (O GANCHO MAGNÃ‰TICO):
   - Crie uma chamada comercial central em portuguÃªs com EXATAMENTE 8 A 12 PALAVRAS.
   - O tÃ­tulo deve usar gatilhos mentais de curiosidade, desafio, suspense ou votaÃ§Ã£o de trilha musical.

2. FORMATO DA ARTE:
   - ProporÃ§Ã£o estritamente vertical 9:16 (formato ideal para capas de Reels/Shorts/TikTok).

3. CENÃRIO OBRIGATÃ“RIO DESTA CTA #${numStr}:
   - VocÃª DEVE ambientar o 'imagePrompt' estritamente dentro do seguinte cenÃ¡rio da marca:
     ðŸ‘‰ "${assignedScenario}"

4. AUTONOMIA PARA A IA GERADORA DE IMAGEM (DALL-E 3 / CHATGPT):
   - No 'imagePrompt' em inglÃªs, instrua o DALL-E 3 a desenhar a frase central de 8 a 12 palavras em letras 3D neon hiper-detalhadas no centro da imagem.
   - DÃª LIBERDADE TOTAL para a IA geradora incluir e posicionar elegantemente na cena 1 a 2 elementos/badges visuais de reproduÃ§Ã£o e CTA de Ã¡udio (ex: 'â–¶ï¸ CLIQUE E OUÃ‡A A TRILHA' ou 'ðŸ”Š ÃUDIO EXCLUSIVO').

5. ESTRUTURA DA LEGENDA DO POST ('caption') - ELEGANTE E CONVERTEDORA:
   A legenda redigida em portuguÃªs deve ter obrigatoriamente 4 blocos impecÃ¡veis:
   - BLOCO 1: HEADLINE DE IMPACTO (TÃ­tulo em caixa alta com emojis provocativos que aguÃ§am a curiosidade).
   - BLOCO 2: REVELAÃ‡ÃƒO DA EXPERIÃŠNCIA ÃšNICA (Texto persuasivo explicando que se trata de uma produÃ§Ã£o musical autoral inÃ©dita produzida com inteligÃªncia artificial e tecnologia de alta definiÃ§Ã£o InkVortex Brasil).
   - BLOCO 3: CHAMADA DE AÃ‡ÃƒO INTERATIVA EM 3 PASSOS (PASSO 1 Ã‰ OBRIGATÃ“RIO):
     1ï¸âƒ£ SE INSCREVA NO CANAL INKVORTEX BRASIL (Regra de Ouro: BenefÃ­cio e criaÃ§Ã£o de trilha autoral exclusiva para inscritos do canal!).
     2ï¸âƒ£ DIGITE O SEU ESTILO MUSICAL FAVORITO (ex: Blues, Rock, Synthwave, Reggae, Lo-Fi).
     3ï¸âƒ£ INDIQUE A MINISSÃ‰RIE E SEU NOME NOS COMENTÃRIOS para gravarmos sua faixa com saudaÃ§Ã£o especial!
   - BLOCO 4: BÃ”NUS, AUTORIDADE & BIO DO MERCADO LIVRE:
     * BÃ´nus: "ðŸŽ Os comentÃ¡rios mais engajados ganham uma faixa autoral dedicada com saudaÃ§Ã£o em seu nome!"
     * Chamada Comercial: "ðŸ›’ Insumos, peÃ§as e tintas tÃªxteis de alta definiÃ§Ã£o na nossa loja do Mercado Livre: Link na Bio!"
     * Assinatura InkVortex Brasil + Hashtags estratÃ©gicas de alto alcance (#InkVortexBrasil #ImpressaoDigital #DTG #DTF #TrilhaSonora #Minisseries).

FORMATO DE RESPOSTA (RETORNE ESTRITAMENTE JSON):
{
  "title": "TÃ­tulo provocativo em caixa alta com emojis para a capa",
  "subtitle": "SubtÃ­tulo explicativo em portuguÃªs instigando o clique",
  "category": "Engajamento & InteraÃ§Ã£o",
  "textInImage": "Frase central de suspense/curiosidade com EXATAMENTE 8 A 12 PALAVRAS em portuguÃªs",
  "imagePrompt": "Create a vertical 9:16 aspect ratio high-converting CTA video cover poster for ChatGPT DALL-E 3 set inside a ${assignedScenario}. Prominently center the glowing 3D neon typography text written in Portuguese: \\"DIGITE AQUI A FRASE CENTRAL DE 8 A 12 PALAVRAS\\". Empowered and free to elegantly place 1 or 2 visual audio/play CTA badges or neon buttons in the scene (such as 'â–¶ï¸ CLIQUE E OUÃ‡A A TRILHA' or 'ðŸ”Š ÃUDIO EXCLUSIVO') to maximize viewer click-through rate. Photorealistic 8k, cinematic softbox studio lighting.",
  "caption": "ðŸ”¥ [HEADLINE DE IMPACTO EM CAIXA ALTA]\n\nðŸŽ§ [REVELAÃ‡ÃƒO DA EXPERIÃŠNCIA MUSICAL INÃ‰DITA INKVORTEX]\n\nðŸ‘‡ COMO PARTICIPAR E SOLICITAR SUA TRILHA (3 PASSOS):\n1ï¸âƒ£ SE INSCREVA NO CANAL INKVORTEX BRASIL (Exclusivo para inscritos do canal!).\n2ï¸âƒ£ DIGITE O SEU ESTILO MUSICAL FAVORITO (ex: Blues, Rock, Synthwave, Reggae, Lo-Fi).\n3ï¸âƒ£ INDIQUE A MINISSÃ‰RIE E SEU NOME NOS COMENTÃRIOS!\n\nðŸŽ BÃ”NUS EXCLUSIVO: Os inscritos com comentÃ¡rios mais engajados ganham uma mÃºsica autoral personalizada com saudaÃ§Ã£o em seu nome!\n\nðŸ›’ Insumos, peÃ§as e tintas oficiais na nossa loja do Mercado Livre: Link na Bio!\n#InkVortexBrasil #ImpressaoDigital #DTG #DTF #TrilhaSonora #Minisseries"
}`;
      }

      const resAi = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + openaiKey },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: promptSystem }]
        })
      });

      const aiData = await resAi.json();
      if (!aiData.choices || !aiData.choices[0]) {
        throw new Error("Erro na OpenAI AI: " + (aiData.error ? aiData.error.message : 'Sem resposta'));
      }

      const parsed = JSON.parse(aiData.choices[0].message.content);
      
      // Procura se jÃ¡ existe uma imagem numerada no disco para este nÃºmero (ex: render/cta/02.png ou 02.jpg)
      let foundImg = null;
      const filesOnDisk = fs.readdirSync(ctaDir);
      const matchFile = filesOnDisk.find(f => f.startsWith(numStr) && /\.(png|jpg|jpeg|webp)$/i.test(f));
      if (matchFile) {
        foundImg = `/minisseries/cta/${matchFile}`;
      }

      const timestamp = Date.now();
      const newItem = {
        id: `cta_${numStr}`,
        numStr: numStr,
        title: `[CTA ${numStr}] ${parsed.title || userTopic}`,
        subtitle: parsed.subtitle || `Campanha comercial #${numStr} gerada via Mistral AI`,
        category: parsed.category || (payload.isDocumentary ? "DocumentÃ¡rio Original" : "Engajamento & InteraÃ§Ã£o"),
        aspectRatio: payload.isDocumentary ? "16:9" : "9:16",
        image: foundImg || `/minisseries/cta/${numStr}.png`,
        created_at: new Date().toISOString(),
        textInImage: parsed.textInImage || '',
        imagePrompt: parsed.imagePrompt || '',
        caption: parsed.caption
      };

      db.unshift(newItem);
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

      if (payload.isDocumentary && payload.docNum) {
         const docNumStr = sanitizeNumericId(payload.docNum);
         const docFolder = safeJoin(ROOT, 'minisseries', docNumStr);
         ensureDirectory(path.join(docFolder, 'cta'));
         
         const txtContent = `TÃTULO: ${parsed.title}\n\nSUBTÃTULO: ${parsed.subtitle}\n\nTEXTO DA IMAGEM: ${parsed.textInImage}\n\nPROMPT DALL-E 3:\n${parsed.imagePrompt}\n\nLEGENDA SOCIAL:\n${parsed.caption}`;
         fs.writeFileSync(path.join(docFolder, 'cta', 'cta_oficial.txt'), txtContent, 'utf8');
      }

      send(res, 200, newItem);
    } catch(e) { sendApiError(res, e); }
    return;
  }

  if (req.url === '/api/doc/generate-caption' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const docNum = payload.docNum;
      const campaigns = payload.campaigns || [];
      if (!docNum) throw new Error("docNum Ã© obrigatÃ³rio.");
      if (campaigns.length === 0) throw new Error("O contexto das minissÃ©ries (campaigns) nÃ£o foi enviado.");
      
      const numStr = sanitizeNumericId(docNum);

      const openaiKey = env('OPENAI_API_KEY', '');
      if (!openaiKey) throw new Error("Chave OPENAI_API_KEY necessÃ¡ria no Cofre de APIs.");

      // Monta o contexto a partir das 3 minissÃ©ries recebidas do front-end
      let contextoDoc = campaigns.map(c => {
        const cNum = sanitizeNumericId(c.number || (typeof c.id === 'string' ? (c.id.match(/\d+/)||[1])[0] : c.id));
        const cTitle = c.topic?.title || c.title || `MINISSÃ‰RIE ${cNum}`;
        const cDesc = c.topic?.description || 'DescriÃ§Ã£o nÃ£o disponÃ­vel';
        const cCaption = c.socialCaption || c.social?.caption || 'Legenda nÃ£o disponÃ­vel';
        return `[MINISSÃ‰RIE ${cNum} - ${cTitle}]\nTEMA/DESCRIÃ‡ÃƒO: ${cDesc}\nLEGENDA ORIGINAL: ${cCaption}`;
      }).join('\n\n---\n\n');

      const promptSystem = `VocÃª Ã© o Diretor Criativo Executivo da InkVortex Brasil.
Sua missÃ£o Ã© criar a LEGENDA OFICIAL DE YOUTUBE/INSTAGRAM para o nosso novo DocumentÃ¡rio Ã‰pico TecnolÃ³gico #${numStr}.

CONTEXTO BASE DO DOCUMENTÃRIO (O ROTEIRO MASTER COM AS 3 MINISSÃ‰RIES):
${contextoDoc}

REGRAS RÃGIDAS DE FORMATAÃ‡ÃƒO DA LEGENDA (EXATAMENTE COMO AS MINISSÃ‰RIES):
1. A legenda deve ser altamente educativa, agregando valor real de aprendizado e fundindo a essÃªncia do documentÃ¡rio em uma narrativa Ã©pica Ãºnica, com InÃ­cio, Meio e Fim.
2. A legenda deve vir estruturada em EXATAMENTE 10 FRASES curtas e consecutivas.
3. Para garantir uma leitura escaneÃ¡vel, inicie CADA UMA das 10 frases em uma NOVA LINHA (novo parÃ¡grafo) acompanhada de 1 emoji inicial contextualizado. 
4. NÃ£o use subtÃ­tulos nem marcadores numÃ©ricos. NÃ£o escreva "Aqui estÃ¡ a legenda" ou qualquer outra explicaÃ§Ã£o fora da legenda. Apenas as 10 frases com emojis.`;

      const resAi = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: promptSystem }],
          temperature: 0.7,
          max_tokens: 1500
        })
      });
      if (!resAi.ok) {
        const txt = await resAi.text();
        throw new Error(`OpenAI erro ${resAi.status}: ${txt}`);
      }
      const aiData = await resAi.json();
      let generatedText = aiData.choices[0].message.content.trim();
      
      generatedText = generatedText.replace(/^['"\`]+|['"\`]+$/g, '').trim();
      
      const appendedCaption = `${generatedText}

ðŸ‘‡ ASSISTA O MULTIVERSO COMPLETO NO NOSSO CANAL OFICIAL DA INKVORTEX BRASIL (YOUTUBE)!
ðŸ”¥ Deixe seu comentÃ¡rio com dÃºvidas tecnolÃ³gicas ou nos diga qual o seu estilo musical favorito da trilha sonora.
ðŸ›’ Insumos, peÃ§as e tintas oficiais na nossa loja do Mercado Livre: Link na Bio!

#InkVortexBrasil #Documentario8K #TecnologiaTextil #ImpressaoDigital #DTG #DTF #ModaCircular`;
      // Salva a legenda gerada no dossiÃª para persistÃªncia
      const docFolder = safeJoin(ROOT, 'minisseries', numStr);
      const dossierPath = path.join(docFolder, `${numStr} - dossie.json`);
      if (fs.existsSync(dossierPath)) {
        try {
          const dossier = JSON.parse(fs.readFileSync(dossierPath, 'utf8'));
          dossier.socialCaption = appendedCaption;
          fs.writeFileSync(dossierPath, JSON.stringify(dossier, null, 2), 'utf8');
          
          // Salva em legendas/legenda_oficial.txt
          ensureDirectory(path.join(docFolder, 'legendas'));
          fs.writeFileSync(path.join(docFolder, 'legendas', 'legenda_oficial.txt'), appendedCaption, 'utf8');
        } catch (err) {
          console.error("Erro ao salvar a legenda no dossiÃª ou na pasta legendas:", err);
        }
      }

      send(res, 200, { caption: appendedCaption });
    } catch(e) { sendApiError(res, e); }
    return;
  }

  if(req.url==='/api/config/keys'&&req.method==='GET'){
    try {
      const openaiKey = env('OPENAI_API_KEY', '');
      const geminiKey = env('GEMINI_API_KEY', '');
      const mask = (key) => key ? key.substring(0, 4) + '...' + key.substring(key.length - 4) : '';
      send(res, 200, {
        mistral: mask(openaiKey),
        gemini: mask(geminiKey)
      });
    } catch(error) { sendApiError(res, error); }
    return;
  }
  if(req.url==='/api/config/keys'&&req.method==='POST'){
    try {
      const payload = await readBody(req);
      const updates = {};
      if (payload.mistral && !payload.mistral.includes('...')) updates.OPENAI_API_KEY = payload.mistral;
      if (payload.gemini && !payload.gemini.includes('...')) updates.GEMINI_API_KEY = payload.gemini;
      writeEnv(updates);
      send(res, 200, { ok: true });
    } catch(error) { sendApiError(res, error); }
    return;
  }

  if (req.url === '/api/ping') {
    send(res, 200, {
      ok: true,
      status: 'online',
      service: 'vortex-central',
      version: STUDIO_VERSION,
      pid: process.pid,
      startedAt: SERVER_STARTED_AT
    });
    return;
  }

  if (req.url.startsWith('/api/ambient-audio/folders') && req.method === 'GET') {
    try {
      const baseDir = getAmbientMusicDir();
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      const validExts = ['.opus', '.webm', '.flac', '.ogg', '.m4a', '.mp3', '.wav', '.aac'];
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      const folders = [];
      const rootTracks = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(baseDir, entry.name);
          let count = 0;
          try {
            const subEntries = fs.readdirSync(subPath, { withFileTypes: true });
            count = subEntries.filter(s => s.isFile() && validExts.includes(path.extname(s.name).toLowerCase())).length;
          } catch (_) {}
          folders.push({
            name: entry.name,
            trackCount: count,
            path: subPath
          });
        } else if (entry.isFile() && validExts.includes(path.extname(entry.name).toLowerCase())) {
          const ext = path.extname(entry.name).toLowerCase();
          const stat = fs.statSync(path.join(baseDir, entry.name));
          rootTracks.push({
            fileName: entry.name,
            name: path.basename(entry.name, ext).replace(/_/g, ' '),
            ext,
            size: stat.size,
            url: `/api/ambient-audio/stream?path=${encodeURIComponent(path.join(baseDir, entry.name))}`,
            folder: ''
          });
        }
      }

      folders.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));
      rootTracks.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));

      send(res, 200, { ok: true, baseDir, folders, rootTracks });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url.startsWith('/api/ambient-audio/stream') && req.method === 'GET') {
    try {
      const parsedUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const filePath = parsedUrl.searchParams.get('path') || '';
      if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        send(res, 404, { ok: false, error: 'Arquivo de áudio não encontrado' });
        return;
      }
      serveStatic(req, res, filePath);
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }

  if (req.url.startsWith('/api/ambient-audio/list') && req.method === 'GET') {
    try {
      const parsedUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const folderParam = parsedUrl.searchParams.get('folder') || '';
      const baseDir = getAmbientMusicDir();
      const targetDir = folderParam ? path.join(baseDir, folderParam) : baseDir;

      if (!fs.existsSync(targetDir)) {
        send(res, 404, { ok: false, error: 'Pasta não encontrada' });
        return;
      }

      const validExts = ['.opus', '.webm', '.flac', '.ogg', '.m4a', '.mp3', '.wav', '.aac'];
      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      const tracks = entries
        .filter(e => e.isFile() && validExts.includes(path.extname(e.name).toLowerCase()))
        .map(e => {
          const ext = path.extname(e.name).toLowerCase();
          const baseName = path.basename(e.name, ext).replace(/_/g, ' ');
          const fullPath = path.join(targetDir, e.name);
          const stat = fs.statSync(fullPath);
          return {
            fileName: e.name,
            name: baseName,
            ext,
            size: stat.size,
            folder: folderParam,
            url: `/api/ambient-audio/stream?path=${encodeURIComponent(fullPath)}`
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));

      send(res, 200, { ok: true, baseDir, currentFolder: folderParam, tracks });
    } catch(err) {
      sendApiError(res, err);
    }
    return;
  }
  if (req.url.startsWith('/api/automate-gemini')) {
    const handled = await automationRoutes(req, res);
    if (handled) return;
  }
  
  // Rota de reset de emergÃªncia: limpa localStorage no browser e redireciona
  if (req.url === '/reset' || req.url === '/reset/') {
    const resetHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Resetando banco de dados...</title>
  <style>
    body { margin:0; background:#000; display:flex; align-items:center; justify-content:center; height:100vh; flex-direction:column; font-family:monospace; color:#00aeef; }
    h1 { font-size:2rem; margin-bottom:16px; }
    p { color:#aaa; font-size:1rem; }
  </style>
</head>
<body>
  <h1>ðŸ—‘ï¸ Limpando banco de dados...</h1>
  <p>Redirecionando para o sistema limpo...</p>
  <script>
    localStorage.clear();
    setTimeout(() => { window.location.href = '/'; }, 800);
  </script>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(resetHtml);
    return;
  }
  send(res,404,{error:'Rota de API nÃ£o encontrada.'});
}

prepareLocalWorkspace();

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    handleApi(req, res);
    return;
  }
  serveStatic(req, res);
});
browserExtensionBridge.attachServer(server);

if (require.main === module) {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('');
      console.error(`[CENTRAL] A porta ${PORT} foi ocupada depois da verificacao de instancia unica.`);
      console.error('[CENTRAL] A inicializacao foi interrompida; nenhum segundo servidor foi criado.');
      process.exit(1);
    } else {
      console.error('Erro no servidor:', err);
      process.exit(1);
    }
  });

  const startStandaloneServer = async () => {
    const connectivity = await checkLLMConnectivity();
    if (!connectivity.reachable) {
      throw new Error(connectivityFailureMessage(connectivity));
    }

    console.log(`[PRE-FLIGHT APIS] OK — Conexão estabelecida com Mistral AI (Criação de Conteúdo) e OpenAI (Whisper-1).`);
    server.listen(PORT, '127.0.0.1', () => {
      serverIsUp = true;
      const url = `http://localhost:${PORT}/index.html?v=${encodeURIComponent(STUDIO_VERSION)}&started=${Date.now()}`;
      console.log('');
      console.log('Central InkVortex com API ativa');
      console.log('Abra: ' + url);
      console.log('Para parar, feche esta janela ou pressione Ctrl+C.');
      console.log('');
      if (env('OPEN_BROWSER', '1') !== '0') {
        exec(`start "" "${url}"`);
      }
    });
  };

  startStandaloneServer().catch(error => {
    console.error('ERRO DE INICIALIZAÃ‡ÃƒO DA CENTRAL: ' + (error.message || error));
    process.exit(1);
  });
}

module.exports = { renderM4AVideoForCampaign, alignM4AText, alignAudioAndText };

