const assert = require('assert');
const fs = require('fs');
const path = require('path');

const automationPath = path.join(__dirname, '..', 'chatgpt_web_automation.js');
const { __testHooks } = require(automationPath);

async function run() {
  const expected = 'TITLE EXACT: "Teste direto"\n\nCena técnica com acentuação e emoji 🎯';
  let methodReceived = null;
  let paramsReceived = null;
  let focusEvaluator = '';
  const page = {
    evaluate: async callback => {
      focusEvaluator = callback.toString();
      return { found: true, focused: true };
    },
    _client: () => ({
      send: async (method, params) => {
        methodReceived = method;
        paramsReceived = params;
      }
    })
  };

  await __testHooks.insertPromptDirectly(page, expected);
  assert.strictEqual(methodReceived, 'Input.insertText', 'A Ponte VORTEX deve usar o comando direto de texto.');
  assert.deepStrictEqual(paramsReceived, { text: expected }, 'A inserção direta deve preservar integralmente o prompt.');

  assert.ok(focusEvaluator.includes('composer.focus'), 'O editor real deve receber foco antes da insercao direta.');
  assert.ok(focusEvaluator.includes('range.collapse(false)'), 'O cursor deve ficar no fim do editor antes da insercao.');

  const source = fs.readFileSync(automationPath, 'utf8');
  assert.ok(!source.includes('navigator.clipboard'), 'O Robô GPT não pode acessar a área de transferência.');
  assert.ok(!source.includes("keyboard.press('V')"), 'O Robô GPT não pode usar Ctrl+V.');
  assert.ok(!source.includes('selectHighModelPhysically'), 'O Robô GPT não pode abrir nem alterar o seletor Alto.');
  assert.ok(source.includes('async function selectImageMode('), 'O Robô GPT deve continuar ativando Criar imagem.');
  assert.strictEqual((source.match(/await selectImageMode\(page/g) || []).length, 1, 'Criar imagem deve ser acionado uma única vez por tentativa.');
  assert.ok(!source.includes("dispatchEvent(new InputEvent('beforeinput'"), 'A inserção direta não deve sintetizar eventos que dessincronizem o editor.');
  assert.ok(source.includes('consecutiveTechnicalFailures >= 3'), 'Falhas técnicas repetidas devem parar sem criar um ciclo infinito.');
  assert.ok(source.includes("latestUserText = '';"), 'Cada prompt visível deve ser consumido depois da primeira resposta com imagem.');
  assert.ok(source.includes('pairs.some(pair => pair.sequence === matched.sequence)'), 'A mesma cena não pode ser associada duas vezes na leitura do chat.');

  let visibilityEvaluator = '';
  let visibilityOffset = null;
  const visibilityPage = {
    evaluate: async (callback, offset) => {
      visibilityEvaluator = callback.toString();
      visibilityOffset = offset;
      return { found: true, pinned: true, fullyVisible: true };
    }
  };
  const visibility = await __testHooks.ensureComposerVisible(visibilityPage);
  assert.strictEqual(visibility.fullyVisible, true, 'O compositor deve ser confirmado dentro da área visível.');
  assert.strictEqual(visibilityOffset, 64, 'O compositor completo deve compensar a faixa de depuração do Chrome.');
  assert.ok(visibilityEvaluator.includes("composer.closest('form')"), 'O deslocamento deve atingir o formulário inteiro, não apenas o campo de texto.');
  assert.ok(visibilityEvaluator.includes("setProperty('translate'"), 'O compositor deve permanecer fixado acima da faixa durante a geração.');
  assert.ok(!visibilityEvaluator.includes('scrollIntoView'), 'A correção visual não pode depender da rolagem da conversa.');

  let releaseEvaluator = '';
  await __testHooks.releaseComposerOffset({
    evaluate: async callback => {
      releaseEvaluator = callback.toString();
    }
  });
  assert.ok(releaseEvaluator.includes("removeProperty('translate')"), 'O deslocamento deve ser removido ao liberar a Ponte.');

  console.log('chatgpt-direct-input-ok');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
