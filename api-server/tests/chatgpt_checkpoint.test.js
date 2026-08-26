const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { __testHooks } = require('../chatgpt_web_automation');

async function run() {
  const prompts = Array.from({ length: 5 }, (_, index) => ({ sequence: index + 1, fullPrompt: `prompt-${index + 1}` }));
  const selected = __testHooks.selectPromptsBySequence(prompts, [2, 5]);
  assert.deepStrictEqual(selected.map(item => item.sequence), [2, 5], 'Somente as cenas marcadas devem entrar no lote.');

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-chatgpt-checkpoint-'));
  try {
    const targetDir = path.join(tempRoot, 'minisseries', '18', 'M18');
    fs.mkdirSync(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, 'img_002.jpg');
    const content = Buffer.from('imagem-cena-2');
    fs.writeFileSync(targetPath, content);
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    __testHooks.recordChatGPTGenerated({
      numStr: '18',
      mode: 'minisseries',
      sequence: 2,
      prompt: 'prompt-2',
      imageKey: 'conversation-turn-4',
      conversationUrl: 'https://chatgpt.com/c/teste',
      rootDir: tempRoot
    });

    __testHooks.recordChatGPTGenerated({
      numStr: '18',
      mode: 'minisseries',
      sequence: 2,
      prompt: 'prompt-2',
      imageKey: 'conversation-turn-repetido',
      conversationUrl: 'https://chatgpt.com/c/teste',
      rootDir: tempRoot
    });
    assert.strictEqual(
      __testHooks.readChatGPTCheckpoint('18', 'minisseries', tempRoot).generated['2'].imageKey,
      'conversation-turn-4',
      'A primeira imagem confirmada deve permanecer imutável dentro do mesmo chat.'
    );

    assert.deepStrictEqual(
      __testHooks.generatedCheckpointSequences('18', 'minisseries', 'https://chatgpt.com/c/teste', tempRoot),
      [2],
      'A imagem confirmada deve ser registrada antes do download.'
    );
    assert.deepStrictEqual(
      __testHooks.completedCheckpointSequences('18', 'minisseries', tempRoot),
      [],
      'A geração confirmada não pode ser confundida com download concluído.'
    );

    __testHooks.recordChatGPTCheckpoint({
      numStr: '18',
      mode: 'minisseries',
      sequence: 2,
      targetPath,
      hash,
      conversationUrl: 'https://chatgpt.com/c/teste',
      rootDir: tempRoot
    });

    assert.deepStrictEqual(
      __testHooks.completedCheckpointSequences('18', 'minisseries', tempRoot),
      [2],
      'A retomada deve reconhecer a cena baixada e validada.'
    );
    assert.deepStrictEqual(
      __testHooks.missingImageSequences('18', 5, 'minisseries', tempRoot),
      [1, 3, 4, 5],
      'A nova rodada deve ser montada pelos números realmente ausentes na pasta.'
    );
    assert.strictEqual(
      __testHooks.readChatGPTCheckpoint('18', 'minisseries', tempRoot).conversationUrl,
      'https://chatgpt.com/c/teste',
      'O mesmo chat deve permanecer registrado para as próximas rodadas.'
    );
    assert.deepStrictEqual(
      __testHooks.generatedCheckpointSequences('18', 'minisseries', 'https://chatgpt.com/c/outro-chat', tempRoot),
      [],
      'Uma imagem registrada em outro chat não pode ser reaproveitada.'
    );

    fs.unlinkSync(targetPath);
    assert.deepStrictEqual(
      __testHooks.completedCheckpointSequences('18', 'minisseries', tempRoot),
      [],
      'Checkpoint sem o arquivo correspondente deve voltar para a fila de faltantes.'
    );
    assert.deepStrictEqual(
      __testHooks.missingImageSequences('18', 5, 'minisseries', tempRoot),
      [1, 2, 3, 4, 5],
      'Uma miniatura sem arquivo deve voltar a ser considerada faltante.'
    );

    const recoveryUrl = 'https://chatgpt.com/c/recuperacao-em-ordem';
    [1, 4].forEach(sequence => __testHooks.recordChatGPTGenerated({
      numStr: '18',
      mode: 'minisseries',
      sequence,
      prompt: `prompt-${sequence}`,
      imageKey: `chave-antiga-${sequence}`,
      conversationUrl: recoveryUrl,
      rootDir: tempRoot
    }));
    let evaluateCalls = 0;
    const recovered = await __testHooks.reconcileGeneratedImages({
      page: {
        url: () => recoveryUrl,
        evaluate: async (_fn, items) => {
          evaluateCalls += 1;
          if (items) {
            return [1, 4, 5].map(sequence => ({
              sequence,
              imageKey: `imagem-atual-${sequence}`
            }));
          }
          return {
            completedImageTurnIds: ['imagem-atual-1', 'imagem-atual-4', 'imagem-atual-5', 'imagem-extra'],
            completedResponseTurnIds: [],
            busy: false
          };
        }
      },
      numStr: '18',
      mode: 'minisseries',
      prompts: [1, 4, 5].map(sequence => ({ sequence, fullPrompt: `prompt-${sequence}` })),
      conversationUrl: recoveryUrl,
      rootDir: tempRoot
    });
    assert.strictEqual(evaluateCalls, 2, 'A recuperacao deve inspecionar imagens e pares de prompts uma vez.');
    assert.deepStrictEqual(
      Array.from(recovered.entries()).map(([sequence, value]) => [sequence, value.imageKey]),
      [[1, 'imagem-atual-1'], [4, 'imagem-atual-4'], [5, 'imagem-atual-5']],
      'A recuperacao deve religar somente as respostas encontradas pelo prompt exato.'
    );

    [1, 4].forEach(sequence => __testHooks.recordChatGPTGenerated({
      numStr: '19',
      mode: 'minisseries',
      sequence,
      prompt: `prompt-${sequence}`,
      imageKey: `chave-antiga-${sequence}`,
      conversationUrl: recoveryUrl,
      rootDir: tempRoot
    }));
    const rejectedPositionalRecovery = await __testHooks.reconcileGeneratedImages({
      page: {
        url: () => recoveryUrl,
        evaluate: async (_fn, items) => items
          ? []
          : {
              completedImageTurnIds: ['imagem-atual-1', 'imagem-atual-4', 'imagem-atual-5'],
              completedResponseTurnIds: [],
              busy: false
            }
      },
      numStr: '19',
      mode: 'minisseries',
      prompts: [1, 4].map(sequence => ({ sequence, fullPrompt: `prompt-${sequence}` })),
      conversationUrl: recoveryUrl,
      rootDir: tempRoot
    });
    assert.deepStrictEqual(
      Array.from(rejectedPositionalRecovery.entries()),
      [],
      'Identidades antigas nunca podem ser religadas por posicao quando o prompt exato nao foi localizado.'
    );

    const resumeUrl = 'https://chatgpt.com/c/retomada-automatica';
    [1, 2].forEach(sequence => __testHooks.recordChatGPTGenerated({
      numStr: '20',
      mode: 'minisseries',
      sequence,
      prompt: `prompt-${sequence}`,
      imageKey: `imagem-${sequence}`,
      conversationUrl: resumeUrl,
      rootDir: tempRoot
    }));
    const resumePlan = __testHooks.findChatGPTResumePlan({
      numStr: '20',
      mode: 'minisseries',
      prompts: [1, 2, 3].map(sequence => ({ sequence, fullPrompt: `prompt-${sequence}` })),
      rootDir: tempRoot
    });
    assert.strictEqual(resumePlan.resumable, true);
    assert.deepStrictEqual(resumePlan.recoveredSequences, [1, 2]);
    assert.strictEqual(resumePlan.resumeFrom, 3);
    assert.strictEqual(
      __testHooks.sameChatGPTConversation(
        'https://chatgpt.com/c/retomada-automatica?source=a',
        'https://chatgpt.com/c/retomada-automatica?source=b'
      ),
      true
    );
    const incompatiblePlan = __testHooks.findChatGPTResumePlan({
      numStr: '20',
      mode: 'minisseries',
      prompts: [
        { sequence: 1, fullPrompt: 'prompt-1-alterado' },
        { sequence: 2, fullPrompt: 'prompt-2' },
        { sequence: 3, fullPrompt: 'prompt-3' }
      ],
      rootDir: tempRoot
    });
    assert.strictEqual(incompatiblePlan.resumable, false, 'Prompt alterado deve bloquear a retomada do chat antigo.');
    assert.deepStrictEqual(incompatiblePlan.recoveredSequences, []);

    const olderChat = 'https://chatgpt.com/c/grupo-maior';
    const newerChat = 'https://chatgpt.com/c/teste-parcial-novo';
    [1, 2].forEach(sequence => __testHooks.recordChatGPTGenerated({
      numStr: '21',
      mode: 'minisseries',
      sequence,
      prompt: `prompt-${sequence}`,
      imageKey: `grupo-maior-${sequence}`,
      conversationUrl: olderChat,
      rootDir: tempRoot
    }));
    __testHooks.recordChatGPTGenerated({
      numStr: '21',
      mode: 'minisseries',
      sequence: 3,
      prompt: 'prompt-3',
      imageKey: 'teste-parcial-3',
      conversationUrl: newerChat,
      rootDir: tempRoot
    });
    const groupedPlan = __testHooks.findChatGPTResumePlan({
      numStr: '21',
      mode: 'minisseries',
      prompts: [1, 2, 3, 4].map(sequence => ({ sequence, fullPrompt: `prompt-${sequence}` })),
      rootDir: tempRoot
    });
    assert.strictEqual(groupedPlan.conversationUrl, olderChat, 'Um teste parcial novo não pode apagar a identidade do chat com a maior sequência compatível.');
    assert.deepStrictEqual(groupedPlan.recoveredSequences, [1, 2]);
  } finally {
    const resolvedTemp = path.resolve(tempRoot);
    const resolvedBase = path.resolve(os.tmpdir()) + path.sep;
    if (!resolvedTemp.startsWith(resolvedBase)) throw new Error('Diretório temporário fora da área segura.');
    fs.rmSync(resolvedTemp, { recursive: true, force: true });
  }

  console.log('chatgpt-checkpoint-ok');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
