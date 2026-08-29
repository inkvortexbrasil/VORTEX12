const assert = require('assert');
const { runChatGPTAutomation, recoverChatGPTDownloadsCurrentTab, __testHooks } = require('../chatgpt_web_automation');

async function run() {
  const automationSource = runChatGPTAutomation.toString();
  const generationPhase = automationSource.indexOf('// FASE 1:');
  const downloadPhase = automationSource.indexOf('// FASE 2:');
  const firstDownload = automationSource.indexOf('downloadGeneratedImageByKey', generationPhase);
  assert(generationPhase >= 0 && downloadPhase > generationPhase, 'A geração deve ocorrer antes da fase de download.');
  assert(firstDownload > downloadPhase, 'Nenhuma imagem pode ser baixada dentro da fase de geração.');
  assert(
    automationSource.includes('expectedRecoveredSequences'),
    'A retomada GPT deve validar todas as imagens esperadas antes de enviar novos prompts.'
  );
  assert(
    automationSource.includes('const openedConversationUrl = canonicalChatGPTConversationUrl(page.url())'),
    'Uma rodada nova deve aceitar temporariamente a pagina inicial antes de existir uma conversa /c/.'
  );
  assert(
    automationSource.includes('registerRunConversation') && automationSource.includes('sendPromptAndWait'),
    'O primeiro envio deve registrar a conversa criada antes de prosseguir com a geracao.'
  );
  const exactPromptReconciliation = automationSource.indexOf('inspectGeneratedPromptPairs(page, [item])');
  const promptSend = automationSource.indexOf('await sendPromptAndWait');
  assert(
    exactPromptReconciliation > generationPhase && exactPromptReconciliation < promptSend,
    'Antes de enviar ou reenviar, o robô deve procurar a imagem já ligada ao prompt exato no final do chat.'
  );

  for (const identityInspector of [
    __testHooks.inspectGenerationCompletionState,
    __testHooks.inspectGeneratedPromptPairs,
    __testHooks.openShareDialogForImageKey
  ]) {
    const identitySource = identityInspector.toString();
    assert(
      identitySource.indexOf("turn && turn.getAttribute('data-testid')")
        < identitySource.indexOf("response && response.getAttribute('data-message-id')"),
      'A identidade estável do turno deve preceder o data-message-id provisório request-WEB.'
    );
  }

  const acceptedTail = __testHooks.validateRecoveredPromptPrefix(
    [1, 2, 3],
    [1, 2, 3, 4],
    [1, 2, 3, 4, 5]
  );
  assert.strictEqual(acceptedTail.ok, true, 'Uma cauda contígua já existente deve ser incorporada na retomada.');
  assert.deepStrictEqual(acceptedTail.extraSequences, [4], 'A cena adicional deve ser informada como reconciliação real.');
  assert.strictEqual(
    __testHooks.validateRecoveredPromptPrefix([1, 2, 3], [1, 2, 4], [1, 2, 3, 4, 5]).ok,
    false,
    'A retomada deve parar quando uma imagem esperada não for confirmada.'
  );
  assert.strictEqual(
    __testHooks.validateRecoveredPromptPrefix([1, 2], [1, 2, 4], [1, 2, 3, 4, 5]).ok,
    false,
    'Uma imagem descoberta depois de uma lacuna nunca pode provocar salto de prompt.'
  );

  const reconciliationSource = __testHooks.reconcileGeneratedImages.toString();
  assert(
    !reconciliationSource.includes('visibleImageKeys[reconciled.size]')
      && !reconciliationSource.includes('visibleImageKeys[index]'),
    'A retomada não pode religar imagens por posição visual quando a identidade interna mudou.'
  );
  const rescueSource = recoverChatGPTDownloadsCurrentTab.toString();
  assert(
    rescueSource.includes('inspectGeneratedPromptPairs(page, sourcePrompts)')
      && rescueSource.includes('imageKeyBySequence.get(seq)'),
    'O RESGATE deve associar diretamente o prompt visível à posição absoluta antes do download.'
  );

  let conversationUrlPolls = 0;
  const newChatPage = {
    url: () => {
      conversationUrlPolls += 1;
      if (conversationUrlPolls < 3) return 'https://chatgpt.com/';
      if (conversationUrlPolls < 5) return 'https://chatgpt.com/c/WEB:internal-target-id';
      return 'https://chatgpt.com/c/12345678-1234-1234-1234-123456789abc?model=auto';
    }
  };
  const createdConversationUrl = await __testHooks.waitForChatGPTConversationUrl(newChatPage, 500, 1);
  assert.strictEqual(
    createdConversationUrl,
    'https://chatgpt.com/c/12345678-1234-1234-1234-123456789abc',
    'A URL deve ser registrada somente depois que o primeiro envio criar a conversa canonica.'
  );
  assert.strictEqual(conversationUrlPolls, 5, 'A pagina inicial e a identidade WEB interna devem ser ignoradas ate surgir a URL publica.');

  await assert.rejects(
    () => __testHooks.waitForChatGPTConversationUrl({ url: () => 'https://chatgpt.com/' }, 5, 1),
    /nao criou uma URL de conversa \/c\//,
    'Se o ChatGPT nao criar a conversa depois do envio, o robo deve parar com diagnostico claro.'
  );
  await assert.rejects(
    () => __testHooks.waitForChatGPTConversationUrl({ url: () => 'https://chatgpt.com/c/WEB:internal-target-id' }, 5, 1),
    /nao criou uma URL de conversa \/c\//,
    'Uma identidade WEB da Ponte nunca pode ser aceita como conversa do ChatGPT.'
  );

  assert.strictEqual(
    __testHooks.isSupportedImageBuffer(Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.alloc(1020), Buffer.from([0xff, 0xd9])])),
    true,
    'O download real deve aceitar um JPEG completo antes de grava-lo na pasta oficial.'
  );
  assert.strictEqual(
    __testHooks.isSupportedImageBuffer(Buffer.alloc(2048)),
    false,
    'Um arquivo sem assinatura de imagem nao pode ser registrado como download concluido.'
  );

  let closeDialogEvaluateCalls = 0;
  const closeDialogClicks = [];
  const closeDialogKeys = [];
  const closeDialogPage = {
    evaluate: async () => {
      closeDialogEvaluateCalls += 1;
      if (closeDialogEvaluateCalls === 1) return true;
      if (closeDialogEvaluateCalls === 2) return true;
      return false;
    },
    mouse: {
      click: async (x, y) => closeDialogClicks.push({ x, y })
    },
    keyboard: {
      press: async key => closeDialogKeys.push(key)
    }
  };
  await __testHooks.dismissImageShareDialog(closeDialogPage);
  assert.deepStrictEqual(
    closeDialogClicks,
    [],
    'O quadro de compartilhamento deve acionar diretamente o botao proprio de fechar, sem coordenadas.'
  );
  assert.deepStrictEqual(
    closeDialogKeys,
    [],
    'A tecla Escape deve permanecer apenas como alternativa quando o botao proprio falhar.'
  );

  assert.strictEqual(
    __testHooks.isGenerationBusyLabel('Parar de responder'),
    true,
    'O controle real do ChatGPT deve bloquear o próximo prompt.'
  );
  assert.strictEqual(
    __testHooks.isGenerationBusyLabel('Stop responding'),
    true,
    'A interface em inglês também deve bloquear o próximo prompt.'
  );
  assert.strictEqual(
    __testHooks.isGenerationBusyLabel('Enviar mensagem'),
    false,
    'A seta de envio não pode ser confundida com geração ativa.'
  );

  let idlePolls = 0;
  const activeGenerationPage = {
    evaluate: async () => {
      idlePolls += 1;
      return {
        completedImageTurnIds: [],
        completedResponseTurnIds: [],
        busy: idlePolls < 4
      };
    }
  };
  await __testHooks.waitForGenerationToBecomeIdle(activeGenerationPage, null, 1);
  assert.strictEqual(idlePolls, 4, 'O robô deve aguardar até o controle de parada desaparecer.');

  let imagePolls = 0;
  const virtualizedPage = {
    evaluate: async () => {
      imagePolls += 1;
      if (imagePolls === 1) {
        return {
          completedImageTurnIds: ['turn-a', 'turn-b'],
          completedResponseTurnIds: [],
          busy: true
        };
      }
      return {
        completedImageTurnIds: ['turn-b', 'turn-c'],
        completedResponseTurnIds: [],
        busy: false
      };
    }
  };

  const completed = await __testHooks.waitForGenerationOutcome(
    virtualizedPage,
    { completedImageTurnIds: ['turn-a', 'turn-b'], completedResponseTurnIds: [] },
    { pollMs: 1, settleGraceMs: 50 }
  );
  assert.strictEqual(completed.kind, 'image', 'Uma nova imagem deve liberar o avanço do robô.');
  assert.strictEqual(completed.turnId, 'turn-c', 'A imagem nova deve ser reconhecida pela própria identidade.');

  const messagePage = {
    evaluate: async () => ({
      completedImageTurnIds: ['turn-a'],
      completedResponseTurnIds: ['message-a', 'message-b'],
      busy: false
    })
  };
  const message = await __testHooks.waitForGenerationOutcome(
    messagePage,
    { completedImageTurnIds: ['turn-a'], completedResponseTurnIds: ['message-a'] },
    { pollMs: 1, settleGraceMs: 50 }
  );
  assert.strictEqual(message.kind, 'message', 'Uma resposta explícita sem imagem deve permitir a repetição do prompt.');

  let busyPolls = 0;
  const slowPage = {
    evaluate: async () => {
      busyPolls += 1;
      if (busyPolls < 8) {
        return { completedImageTurnIds: ['turn-a'], completedResponseTurnIds: [], busy: true };
      }
      return { completedImageTurnIds: ['turn-a', 'turn-b'], completedResponseTurnIds: [], busy: false };
    }
  };
  const slowResult = await __testHooks.waitForGenerationOutcome(
    slowPage,
    { completedImageTurnIds: ['turn-a'], completedResponseTurnIds: [] },
    { pollMs: 1, settleGraceMs: 2 }
  );
  assert.strictEqual(slowResult.kind, 'image', 'Enquanto o ChatGPT trabalha, o robô deve continuar aguardando.');

  const uncertainPage = {
    evaluate: async () => ({
      completedImageTurnIds: ['turn-a'],
      completedResponseTurnIds: [],
      busy: false
    })
  };
  const uncertain = await __testHooks.waitForGenerationOutcome(
    uncertainPage,
    { completedImageTurnIds: ['turn-a'], completedResponseTurnIds: [] },
    { pollMs: 1, settleGraceMs: 5 }
  );
  assert.strictEqual(uncertain.kind, 'uncertain', 'Um estado ambíguo deve pausar sem repetir o prompt.');

  const cancelPage = {
    evaluate: async () => ({ completedImageTurnIds: [], completedResponseTurnIds: [], busy: true })
  };
  await assert.rejects(
    () => __testHooks.waitForGenerationOutcome(
      cancelPage,
      { completedImageTurnIds: [], completedResponseTurnIds: [] },
      { pollMs: 1, settleGraceMs: 50, shouldCancel: () => true }
    ),
    /__CHATGPT_CANCELLED__/
  );

  console.log('chatgpt-generation-wait-ok');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
