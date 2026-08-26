const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { __testHooks } = require('../gemini_current_tab_automation');

function run() {
  assert.strictEqual(__testHooks.promptSequence({ sceneNum: '04' }, 0), 4);
  assert.strictEqual(__testHooks.promptSequence({ sceneNum: '05' }, 1), 5);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-gemini-checkpoint-'));
  try {
    __testHooks.recordGeminiGenerated({
      numStr: '18',
      sequence: 21,
      prompt: 'prompt-21',
      imageKey: 'gemini-image-21',
      imageOrdinal: 7,
      conversationUrl: 'https://gemini.google.com/u/1/app/chat-18',
      rootDir: tempRoot
    });
    let checkpoint = __testHooks.readGeminiCheckpoint('18', tempRoot);
    assert.strictEqual(checkpoint.generated['21'].imageKey, 'gemini-image-21');
    assert.strictEqual(checkpoint.generated['21'].imageOrdinal, 7);
    assert.strictEqual(checkpoint.completed['21'], undefined, 'Gerar não pode marcar o download como concluído.');

    const targetDir = path.join(tempRoot, 'minisseries', '18', 'M18');
    fs.mkdirSync(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, 'img_021.jpg');
    const content = Buffer.from('gemini-imagem-21');
    fs.writeFileSync(targetPath, content);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    __testHooks.recordGeminiDownloaded({
      numStr: '18',
      sequence: 21,
      targetPath,
      hash,
      conversationUrl: 'https://gemini.google.com/u/1/app/chat-18',
      rootDir: tempRoot
    });
    checkpoint = __testHooks.readGeminiCheckpoint('18', tempRoot);
    assert.strictEqual(checkpoint.completed['21'].sha256, hash);
    assert.strictEqual(checkpoint.generated['21'].imageKey, 'gemini-image-21');

    const queue = [
      { sequence: 21, fullPrompt: 'prompt-21' },
      { sequence: 22, fullPrompt: 'prompt-22' }
    ];
    const resumePlan = __testHooks.findGeminiResumePlan({ numStr: '18', prompts: queue, rootDir: tempRoot });
    assert.strictEqual(resumePlan.resumable, false, 'Cena já baixada não deve prender a próxima rodada ao chat antigo.');
    assert.deepStrictEqual(resumePlan.recoveredSequences, []);
    assert.strictEqual(resumePlan.resumeFrom, 22);
    assert.strictEqual(
      __testHooks.sameGeminiConversation(
        'https://gemini.google.com/u/1/app/chat-18?source=a',
        'https://gemini.google.com/u/1/app/chat-18?source=b'
      ),
      true
    );
    const incompatiblePlan = __testHooks.findGeminiResumePlan({
      numStr: '18',
      prompts: [
        { sequence: 21, fullPrompt: 'prompt-21-alterado' },
        { sequence: 22, fullPrompt: 'prompt-22' }
      ],
      rootDir: tempRoot
    });
    assert.strictEqual(incompatiblePlan.resumable, false, 'Prompt alterado deve bloquear a retomada do chat antigo.');
    assert.deepStrictEqual(incompatiblePlan.recoveredSequences, []);

    const olderChat = 'https://gemini.google.com/u/0/app/grupo-maior';
    const newerChat = 'https://gemini.google.com/u/0/app/teste-parcial';
    [1, 2].forEach(sequence => __testHooks.recordGeminiGenerated({
      numStr: '19',
      sequence,
      prompt: `prompt-${sequence}`,
      imageKey: `grupo-maior-${sequence}`,
      imageOrdinal: sequence - 1,
      conversationUrl: olderChat,
      rootDir: tempRoot
    }));
    __testHooks.recordGeminiGenerated({
      numStr: '19',
      sequence: 3,
      prompt: 'prompt-3',
      imageKey: 'teste-parcial-3',
      imageOrdinal: 0,
      conversationUrl: newerChat,
      rootDir: tempRoot
    });
    const groupedPlan = __testHooks.findGeminiResumePlan({
      numStr: '19',
      prompts: [1, 2, 3, 4].map(sequence => ({ sequence, fullPrompt: `prompt-${sequence}` })),
      rootDir: tempRoot
    });
    assert.strictEqual(groupedPlan.conversationUrl, olderChat, 'Um teste parcial novo não pode substituir o chat Gemini com a maior sequência compatível.');
    assert.deepStrictEqual(groupedPlan.recoveredSequences, [1, 2]);
  } finally {
    const resolved = path.resolve(tempRoot);
    const base = path.resolve(os.tmpdir()) + path.sep;
    if (!resolved.startsWith(base)) throw new Error('Diretório temporário inválido.');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
  console.log('gemini-checkpoint-ok');
}

run();
