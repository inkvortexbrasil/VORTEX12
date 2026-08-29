const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { __testHooks: chatgptHooks } = require('../chatgpt_web_automation');
const { __testHooks: geminiHooks } = require('../gemini_current_tab_automation');

console.log('--- Iniciando Teste de Blindagem de Posições no Resgate ---');

// 1. ChatGPT: Valida que imagens geradas na conversa preservam suas posições reais (16, 21, 26, 31)
// mesmo que a lista recebida da interface comece com caixas vazias (2, 3, 4, 5...)
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-test-rescue-'));
  try {
    const numStr = '03';
    const mode = 'minisseries';
    const convUrl = 'https://chatgpt.com/c/test-conversation-16-21-26-31';

    // Registra que nesta conversa foram geradas as cenas 16, 21, 26 e 31
    [16, 21, 26, 31].forEach((seq, idx) => {
      chatgptHooks.recordChatGPTGenerated({
        numStr,
        mode,
        sequence: seq,
        prompt: `Prompt da cena ${seq} com titulo exclusivo`,
        imageKey: `key-img-${seq}`,
        conversationUrl: convUrl,
        rootDir: tmpDir
      });
    });

    const checkpoint = chatgptHooks.readChatGPTCheckpoint(numStr, mode, tmpDir);
    const convGroup = checkpoint.conversations[convUrl];
    assert(convGroup, 'Conversa deve existir no checkpoint');
    
    const genSeqs = Object.keys(convGroup.generated || {})
      .map(Number)
      .filter(s => !convGroup.completed?.[String(s)])
      .sort((a, b) => a - b);
    
    assert.deepStrictEqual(genSeqs, [16, 21, 26, 31], 'As posições geradas na conversa devem ser 16, 21, 26 e 31');
    console.log('✔ ChatGPT: Posições geradas da conversa aberta identificadas corretamente como [16, 21, 26, 31]');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 2. Gemini: Valida que imagens geradas na conversa aberta preservam a ordem cronológica
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-test-gemini-rescue-'));
  try {
    const numStr = '03';
    const convUrl = 'https://gemini.google.com/app/test-conversation-gemini';

    // Registra que foram geradas as posições 2, 3, 4, 5
    [2, 3, 4, 5].forEach((seq, idx) => {
      geminiHooks.recordGeminiGenerated({
        numStr,
        sequence: seq,
        prompt: `Prompt complementar ${seq}`,
        imageKey: `gemini-key-${seq}`,
        imageOrdinal: idx,
        conversationUrl: convUrl,
        rootDir: tmpDir
      });
    });

    const checkpoint = geminiHooks.readGeminiCheckpoint(numStr, tmpDir);
    const convGroup = checkpoint.conversations[convUrl];
    assert(convGroup, 'Conversa Gemini deve existir no checkpoint');

    const genSeqs = Object.entries(convGroup.generated || {})
      .map(([seq, data]) => ({ sequence: Number(seq), ordinal: data.imageOrdinal }))
      .sort((a, b) => a.ordinal - b.ordinal)
      .map(e => e.sequence);

    assert.deepStrictEqual(genSeqs, [2, 3, 4, 5], 'Sequências ordenadas do Gemini devem ser [2, 3, 4, 5]');
    console.log('✔ Gemini: Posições geradas da conversa aberta preservam exatamente a ordem [2, 3, 4, 5]');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log('rescue-exact-position-override-ok');
