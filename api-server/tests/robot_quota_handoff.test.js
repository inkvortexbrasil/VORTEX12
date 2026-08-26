const assert = require('assert');
const chatgpt = require('../chatgpt_web_automation').__testHooks;
const gemini = require('../gemini_current_tab_automation').__testHooks;

[
  [chatgpt, 'ChatGPT'],
  [gemini, 'Gemini']
].forEach(([hooks, provider]) => {
  assert.strictEqual(hooks.isQuotaExhaustedMessage("You've reached your image generation limit"), true);
  assert.strictEqual(hooks.isQuotaExhaustedMessage('Você atingiu o limite de geração de imagens'), true);
  assert.strictEqual(hooks.isQuotaExhaustedMessage('A imagem foi criada normalmente'), false);
  const error = hooks.quotaExhaustedError(provider);
  assert.strictEqual(error.code, 'ROBOT_QUOTA_EXHAUSTED');
  assert(error.message.includes('permanecem disponíveis para uma nova rodada ou outro provedor'));
});

console.log('robot-quota-handoff-ok');
