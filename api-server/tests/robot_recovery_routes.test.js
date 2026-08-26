const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const createChatGPTAutomationRouter = require('../routes/chatgpt_automation_routes');
const { sanitizeNumericId } = require('../utils/security');
const routeSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'chatgpt_automation_routes.js'), 'utf8');

assert(routeSource.includes('prompts: readFinalChatGPTQueue(ROOT, numStr).queue'));
assert(!routeSource.includes('findChatGPTResumePlan'));
assert(!routeSource.includes('findGeminiResumePlan'));
assert(routeSource.includes('resume: false'));
assert(routeSource.includes('recoverSameChat: false'));
assert(routeSource.includes('reuseCurrentChat: false'));
assert(routeSource.includes('const selectedSequences = prompts.map'));
assert(routeSource.includes('const absoluteSequence = Number(cleaned.sequence || cleaned.finalSequence || index + 1);'));
assert(routeSource.includes("sceneNum: String(absoluteSequence).padStart(3, '0')"));

function prepareCompleteMiniseries(root, number) {
  const promptDir = path.join(root, 'minisseries', number, 'prompts');
  const imageDir = path.join(root, 'minisseries', number, `M${number}`);
  fs.mkdirSync(promptDir, { recursive: true });
  fs.mkdirSync(imageDir, { recursive: true });
  const queue = Array.from({ length: 50 }, (_, index) => ({
    sequence: index + 1,
    sceneNum: String(index + 1).padStart(3, '0'),
    title: `Cena ${index + 1}`,
    fullPrompt: `Prompt ${index + 1}`
  }));
  fs.writeFileSync(
    path.join(promptDir, `50_prompts_esteira_chatgpt_${number}.json`),
    JSON.stringify(queue),
    'utf8'
  );
  queue.forEach(item => {
    fs.writeFileSync(path.join(imageDir, `img_${item.sceneNum}.jpg`), `image-${item.sequence}`);
  });
}

async function callRoute({ root, url, body }) {
  let response = null;
  const router = createChatGPTAutomationRouter({
    activeChatGPTWebJobs: {},
    send: (_res, status, payload) => { response = { status, payload }; },
    sendApiError: (_res, error) => { throw error; },
    readBody: async () => body,
    ROOT: root,
    sanitizeNumericId
  });
  const handled = await router({ url, method: 'POST' }, {});
  assert.strictEqual(handled, true);
  assert(response);
  return response;
}

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-recovery-routes-'));
  try {
    prepareCompleteMiniseries(root, '17');

    await assert.rejects(
      callRoute({
        root,
        url: '/api/automate-gemini-vortex/start',
        body: { number: '17', recoveryMode: 'prompts' }
      }),
      /funções PROMPTS e FOTOS foram retiradas/
    );

    await assert.rejects(
      callRoute({
        root,
        url: '/api/automate-chatgpt/start',
        body: { number: '17', fullQueue: true, resumeMissing: true, continueExistingChat: true }
      }),
      /funções PROMPTS e FOTOS foram retiradas/
    );

    await assert.rejects(
      callRoute({
        root,
        url: '/api/automate-gemini-vortex/start',
        body: { number: '17', recoveryMode: 'photos' }
      }),
      /funções PROMPTS e FOTOS foram retiradas/
    );

    await assert.rejects(
      callRoute({
        root,
        url: '/api/automate-chatgpt/start',
        body: { number: '17', fullQueue: true, missingPhotosNewChat: true }
      }),
      /funções PROMPTS e FOTOS foram retiradas/
    );

    console.log('robot-recovery-routes-ok');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
