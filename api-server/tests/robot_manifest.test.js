const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const manifest = require('../robot_manifest');

function imageBuffer(label) {
  return Buffer.concat([Buffer.from(label), Buffer.alloc(2048, 7)]);
}

function run() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-robot-manifest-'));
  try {
    const prompts = [1, 2, 3].map(sequence => ({ sequence, fullPrompt: `prompt-${sequence}` }));
    const gptRun = manifest.beginRun({
      numStr: '01',
      provider: 'chatgpt',
      runId: 'gpt-run-000001',
      prompts,
      total: 3,
      rootDir
    });
    assert.deepStrictEqual(gptRun.runnableSequences, [1, 2, 3]);

    assert.throws(() => manifest.updateRunConversation({
      numStr: '01',
      provider: 'chatgpt',
      runId: 'gpt-run-000001',
      conversationUrl: 'https://chatgpt.com/c/WEB:internal-target-id',
      rootDir
    }), /URL de conversa chatgpt inv/i, 'O manifesto deve rejeitar a identidade interna WEB da Ponte.');

    manifest.updateRunConversation({
      numStr: '01',
      provider: 'chatgpt',
      runId: 'gpt-run-000001',
      conversationUrl: 'https://chatgpt.com/c/rodada-gpt?x=1',
      rootDir
    });
    manifest.markGenerated({
      numStr: '01',
      provider: 'chatgpt',
      runId: 'gpt-run-000001',
      sequence: 1,
      prompt: 'prompt-1',
      imageKey: 'gpt-image-1',
      conversationUrl: 'https://chatgpt.com/c/rodada-gpt?x=2',
      rootDir
    });

    const geminiBlocked = manifest.beginRun({
      numStr: '01',
      provider: 'gemini',
      runId: 'gemini-run-000001',
      prompts: [prompts[0]],
      conversationUrl: 'https://gemini.google.com/u/0/app/chat-gemini',
      total: 3,
      rootDir
    });
    assert.deepStrictEqual(geminiBlocked.runnableSequences, []);
    assert.strictEqual(geminiBlocked.skipped[0].reason, 'claimed');

    const first = imageBuffer('gpt-scene-1');
    const saved = manifest.commitBuffer({
      numStr: '01',
      sequence: 1,
      buffer: first,
      extension: '.jpg',
      rootDir
    });
    manifest.markCompleted({
      numStr: '01',
      provider: 'chatgpt',
      runId: 'gpt-run-000001',
      sequence: 1,
      targetPath: saved.targetPath,
      hash: saved.hash,
      conversationUrl: 'https://chatgpt.com/c/rodada-gpt',
      rootDir
    });
    assert.deepStrictEqual(manifest.existingSequences({ numStr: '01', total: 3, rootDir }), [1]);

    assert.throws(() => manifest.commitBuffer({
      numStr: '01',
      sequence: 1,
      buffer: imageBuffer('gemini-different-scene-1'),
      extension: '.png',
      rootDir
    }), error => error && error.code === 'ROBOT_POSITION_OCCUPIED');
    assert.strictEqual(fs.existsSync(path.join(rootDir, 'minisseries', '01', 'M01', 'img_001.png')), false);

    manifest.markGenerated({
      numStr: '01',
      provider: 'chatgpt',
      runId: 'gpt-run-000001',
      sequence: 2,
      prompt: 'prompt-2',
      imageKey: 'gpt-image-2',
      conversationUrl: 'https://chatgpt.com/c/rodada-gpt',
      rootDir
    });

    manifest.finishRun({
      numStr: '01',
      provider: 'chatgpt',
      runId: 'gpt-run-000001',
      status: 'quota_exhausted',
      rootDir
    });
    const geminiContinuation = manifest.beginRun({
      numStr: '01',
      provider: 'gemini',
      runId: 'gemini-run-000002',
      prompts,
      conversationUrl: 'https://gemini.google.com/u/0/app/chat-gemini',
      total: 3,
      rootDir
    });
    assert.deepStrictEqual(geminiContinuation.runnableSequences, [2, 3]);
    assert.strictEqual(geminiContinuation.skipped[0].reason, 'completed');
    manifest.finishRun({
      numStr: '01',
      provider: 'gemini',
      runId: 'gemini-run-000002',
      status: 'failed',
      rootDir
    });

    const gptRecovery = manifest.beginRecoveryRun({
      numStr: '01',
      provider: 'chatgpt',
      runId: 'gpt-recovery-000001',
      sequences: [2],
      conversationUrl: 'https://chatgpt.com/c/rodada-gpt?recovery=1',
      total: 3,
      rootDir
    });
    assert.deepStrictEqual(gptRecovery.runnableSequences, [2]);

    const absolutePrompts = [5, 7, 12].map(sequence => ({ sequence, fullPrompt: `absolute-${sequence}` }));
    const absoluteRun = manifest.beginRun({
      numStr: '02',
      provider: 'gemini',
      runId: 'gemini-absolute-000001',
      prompts: absolutePrompts,
      total: 50,
      rootDir
    });
    assert.deepStrictEqual(absoluteRun.runnableSequences, [5, 7, 12]);
    assert.deepStrictEqual(
      absoluteRun.manifest.sessions['gemini-absolute-000001'].selectedSequences,
      [5, 7, 12],
      'Uma seleção parcial deve conservar as posições absolutas, sem renumerar 1..N.'
    );

    const state = manifest.readManifest('01', 'minisseries', rootDir);
    assert.strictEqual(state.scenes['001'].provider, 'chatgpt');
    assert.strictEqual(state.scenes['001'].acceptedFile, 'img_001.jpg');
    assert.strictEqual(state.scenes['001'].sha256, crypto.createHash('sha256').update(first).digest('hex'));
    assert.strictEqual(state.sessions['gpt-run-000001'].status, 'quota_exhausted');
    assert.strictEqual(state.sessions['gemini-run-000002'].conversationUrl, 'https://gemini.google.com/u/0/app/chat-gemini');
    assert(state.events.some(event => event.type === 'scene_completed'));

    const stale = { claims: { '003': { runId: 'old-process', processId: process.pid + 1, expiresAt: new Date(Date.now() + 60000).toISOString() } }, events: [] };
    manifest.__testHooks.expireClaims(stale);
    assert.deepStrictEqual(stale.claims, {}, 'Uma reserva deixada pelo processo anterior deve ser liberada após reiniciar a Central.');
    assert.strictEqual(stale.events[0].type, 'claim_released_after_restart');
  } finally {
    const resolved = path.resolve(rootDir);
    const base = path.resolve(os.tmpdir()) + path.sep;
    if (!resolved.startsWith(base)) throw new Error('Diretório temporário inválido.');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
  console.log('robot-manifest-ok');
}

run();
