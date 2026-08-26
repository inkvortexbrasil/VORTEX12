const assert = require('assert');
const fs = require('fs');
const path = require('path');

const automationSource = fs.readFileSync(
  path.join(__dirname, '..', 'gemini_current_tab_automation.js'),
  'utf8'
);
const routesSource = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'automation_routes.js'),
  'utf8'
);
const manifestSource = fs.readFileSync(
  path.join(__dirname, '..', 'robot_manifest.js'),
  'utf8'
);

const flowStart = automationSource.indexOf('async function runGeminiFlowCurrentTabAutomation');
const flowEnd = automationSource.indexOf('async function recoverGeminiFlowDownloadsCurrentTab', flowStart);
const flowBlock = automationSource.slice(flowStart, flowEnd);
const generationLoop = automationSource.indexOf('for (let index = 0; index < prompts.length; index++)', flowStart);
const generationWait = automationSource.indexOf('await sendPromptAndWait', generationLoop);
const downloadPhase = automationSource.indexOf('Gemini: geracao encerrada; baixando', generationWait);
const downloadCall = automationSource.indexOf('downloadGeminiImage({', downloadPhase);

assert(flowStart >= 0, 'O fluxo Gemini do painel deve existir.');
assert(flowBlock.includes('await startNewGeminiChat'), 'Cada rodada normal do Flow deve abrir um novo chat Gemini.');
assert(flowBlock.includes('await activateGeminiImageMode'), 'O novo chat deve ser preparado no modo Criar imagem.');
assert(!flowBlock.includes('await activateGeminiComplexReasoning'), 'O fluxo não pode trocar o modelo Flash/Estendido preparado pelo operador.');
assert(flowBlock.includes('Novo chat Gemini preparado'), 'A telemetria deve declarar a preparação do novo chat.');
assert(automationSource.includes('Modo Criar imagem ativado e confirmado no Gemini.'), 'A telemetria deve distinguir clique de confirmação real do modo.');
assert(automationSource.includes('depois do clique único'), 'Uma falha deve preservar a regra de um único clique e registrar evidência.');
assert(generationLoop > flowStart && generationWait > generationLoop, 'Os prompts devem ser enviados no chat preparado antes dos downloads.');
assert(downloadPhase > generationWait && downloadCall > downloadPhase, 'Os downloads devem comecar somente depois da geracao.');
assert(automationSource.includes("targetFileName: `cena_${String(entry.sequence).padStart(2, '0')}.png`"));
assert(automationSource.includes('waitForGeminiPromptAccepted'));
assert(!automationSource.includes('GEMINI_SEND_NOT_CONFIRMED'), 'Uma espera operacional do Gemini nao pode encerrar o lote.');
assert(automationSource.includes('while (!accepted)'), 'O envio deve continuar aguardando ate a seta aceitar o prompt.');
assert(automationSource.includes('await page.mouse.move(point.hoverX, point.hoverY)'));
assert(automationSource.includes('const clickPoint = await page.evaluate'), 'O botao deve ser localizado novamente depois do movimento do mouse.');
assert(automationSource.includes('browserExtensionBridge.armDownload(temporaryName)'));
assert(automationSource.includes('browserExtensionBridge.waitDownload(armed.token)'));
assert(automationSource.includes('browserExtensionBridge.beginNativeDownloadSession()'));
assert(automationSource.includes('browserExtensionBridge.endNativeDownloadSession()'));
assert(automationSource.includes('await page.mouse.click(clickPoint.x, clickPoint.y)'));
assert(automationSource.includes('imageOrdinal: entry.imageOrdinal'), 'O download deve reler a imagem pela posicao real no chat.');
assert(automationSource.includes('concluido e validado'), 'A telemetria deve confirmar apenas arquivos validados.');
assert(automationSource.includes('pendente; arquivo nao salvo'), 'A telemetria deve distinguir download pendente.');
assert(!automationSource.includes('concluido ou mantido pendente'));
assert(!automationSource.includes('concluído ou mantido pendente'));
assert(manifestSource.includes('sha256File(targetPath) !== hash'), 'O arquivo final deve ser validado depois da copia.');
assert(manifestSource.includes('sobrescrita bloqueada'), 'Uma posicao ocupada nao pode ser sobrescrita silenciosamente.');
assert(automationSource.includes('robotManifest.commitFile({'), 'O Gemini deve gravar somente pelo manifesto unificado.');
assert(automationSource.includes('const sequence = requestedSequences[index];'), 'A recuperacao deve usar exatamente as posicoes solicitadas, sem renumeracao implicita.');
assert(!automationSource.includes('Page.setDownloadBehavior'));
assert(automationSource.includes("platform: 'gemini'"));
assert(!automationSource.includes('puppeteer.launch'));

const routeStart = routesSource.indexOf("req.url === '/api/automate-gemini/start'");
const routeEnd = routesSource.indexOf("req.url === '/api/automate-gemini/start-doc'", routeStart);
const routeBlock = routesSource.slice(routeStart, routeEnd);
assert(routeBlock.includes('runGeminiFlowCurrentTabAutomation'));
assert(routeBlock.includes('if (err.result) activeGeminiWebJobs[jobId].result = err.result;'));
assert(!routeBlock.includes('runGeminiAutomation({'));

const recoveryRouteStart = routesSource.indexOf("req.url === '/api/automate-gemini/recover-flow-downloads'");
const recoveryRouteBlock = routesSource.slice(recoveryRouteStart);
assert(recoveryRouteBlock.includes('const sequences = Array.isArray(payload.sequences)'));
assert(recoveryRouteBlock.includes('sequences,'));

console.log('gemini-flow-current-tab-ok');
