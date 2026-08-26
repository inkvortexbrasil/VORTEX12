const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  saveFullMiniseriesCampaign,
  readPhysicalCampaignWorkspace
} = require('../services/miniseries_workspace_service');

const sampleCampaign = {
  number: '01',
  cNum: '01',
  id: 'camp_01',
  subject: {
    title: 'Nanotecnologia Quântica Aplicada',
    description: 'Estudo aprofundado dos pontos quânticos na indústria biomédica.'
  },
  scenes: [
    { no: 1, prompt: 'Visão microscópica dos pontos quânticos brilhando em neon.' },
    { no: 2, prompt: 'Estruturas moleculares alinhadas em laboratório high-tech.' }
  ],
  scenes40: [
    { no: 11, prompt: 'Espectrometria de massa revelando ligações iônicas.' }
  ],
  scenes50: [
    { no: 1, prompt: 'Cena esteira 01' }
  ],
  geminiScenes: [
    { no: 1, prompt: 'Câmera orbital em 360 graus navegando pelo feixe de luz.' }
  ],
  flow: {
    prompt: 'Estrutura Flow Master com introdução, clímax e conclusão.'
  },
  social: {
    caption: 'Descubra como a nanotecnologia quântica está revolucionando o mundo moderno.'
  },
  flowMusic: {
    prompt: '[LYRICS]\nat 01s [VERSE 1]\nNanotecnologia em sintonia profunda'
  }
};

test('readPhysicalCampaignWorkspace lê a verdade física de todos os 10 artefatos no disco', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-physical-sync-'));
  try {
    // 1. Salva a campanha no disco
    saveFullMiniseriesCampaign(tempRoot, sampleCampaign);

    // 2. Lê fisicamente do disco
    const syncRes = readPhysicalCampaignWorkspace(tempRoot, '01');
    assert.equal(syncRes.ok, true);
    assert.equal(syncRes.exists, true);
    assert.equal(syncRes.campaignNumber, '01');

    const camp = syncRes.campaign;
    assert.ok(camp, 'Campanha física deve existir');
    assert.equal(camp.title, 'Nanotecnologia Quântica Aplicada');
    assert.equal(camp.subject.title, 'Nanotecnologia Quântica Aplicada');
    assert.equal(camp.scenes.length, 2);
    assert.equal(camp.scenes[0].prompt, 'Visão microscópica dos pontos quânticos brilhando em neon.');
    assert.equal(camp.scenes40.length, 1);
    assert.equal(camp.scenes50.length, 1);
    assert.equal(camp.geminiScenes.length, 1);
    assert.ok(camp.flow && camp.flow.prompt.includes('Estrutura Flow Master'));
    assert.ok(camp.social && camp.social.caption.includes('nanotecnologia quântica'));
    assert.ok(camp.flowMusic && camp.flowMusic.prompt.includes('[LYRICS]'));

    // 3. Modifica um arquivo físico diretamente no disco (simulando edição externa via Bloco de Notas / robô)
    const gptJsonPath = path.join(tempRoot, 'minisseries', '01', 'prompts', '10_prompts_gpt_01.json');
    const modifiedScenes = [
      { no: 1, prompt: 'NOVO PROMPT FISICO EDITADO EXTERNAMENTE NO DISCO' }
    ];
    fs.writeFileSync(gptJsonPath, JSON.stringify(modifiedScenes, null, 2), 'utf8');

    // 4. Nova leitura física deve refletir a modificação física imediatamente
    const resAfterEdit = readPhysicalCampaignWorkspace(tempRoot, '01');
    assert.equal(resAfterEdit.campaign.scenes[0].prompt, 'NOVO PROMPT FISICO EDITADO EXTERNAMENTE NO DISCO');
    assert.equal(resAfterEdit.campaign.generatedGPT, true);

  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('serveStatic bloqueia cache para todas as pastas de minisseries', () => {
  const serverPath = path.join(__dirname, '..', 'server.js');
  const serverSource = fs.readFileSync(serverPath, 'utf8');

  assert.ok(serverSource.includes("pathname.startsWith('/minisseries') || isMediaRequest"));
  assert.ok(serverSource.includes("staticHeaders['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate'"));
  assert.ok(serverSource.includes("staticHeaders.Pragma = 'no-cache'"));
  assert.ok(serverSource.includes("staticHeaders.Expires = '0'"));
  assert.ok(serverSource.includes('/api/minisseries/workspace-data'));
});

test('Frontend implementa syncPhysicalWorkspaceForCampaign e openCampaignWorkspace com no-store', () => {
  const uiPath = path.join(__dirname, '..', '..', 'js', 'ui.js');
  const docPath = path.join(__dirname, '..', '..', 'js', 'documentarios.js');
  const uiSource = fs.readFileSync(uiPath, 'utf8');
  const docSource = fs.readFileSync(docPath, 'utf8');

  assert.ok(uiSource.includes('window.syncPhysicalWorkspaceForCampaign'));
  assert.ok(uiSource.includes('window.openCampaignWorkspace'));
  assert.ok(uiSource.includes('/api/minisseries/workspace-data?number='));
  assert.ok(uiSource.includes("cache: 'no-store'"));

  // Garante que force-cache foi eliminado de createDocThumbnail
  assert.ok(!docSource.includes("cache: 'force-cache'"));
  assert.ok(docSource.includes("async function createDocThumbnail(sourceUrl) {"));
});
