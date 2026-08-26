const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  ensureMiniseriesWorkspace,
  saveMiniseriesSubject,
  saveMiniseriesCaption,
  saveMiniseriesFlowMaster,
  saveMiniseriesGeminiMotions,
  saveMiniseriesGptScenes,
  saveMiniseriesComplementaryScenes,
  saveMiniseriesQueue50,
  saveMiniseriesFlowMusic,
  saveFullMiniseriesCampaign,
  restoreFullBackup,
  exportFullBackup
} = require('../services/miniseries_workspace_service');

const sampleCompleteCampaign = {
  id: 'camp_test_01',
  number: '01',
  cNum: '01',
  title: 'Eletrofiação de Nanofibras de Celulose',
  subject: {
    title: 'Eletrofiação de Nanofibras de Celulose',
    description: 'Processo industrial sustentável sem uso de água para ancoragem molecular de pigmentos.',
    angle: 'Ancoragem eletrostática.',
    centralQuestion: 'Por que a estamparia digital ainda precisa de água?',
    editorialPromise: 'Compreender a eliminação de 100% de efluentes líquidos.',
    technicalTruth: 'Adesão intermolecular controlada por viscosidade e campo elétrico.',
    why: 'Crise hídrica e exigência de processos a seco na indústria gráfica.',
    visualDirection: 'Cinematografia macro 16:9 hiper-realista.',
    visualUniverse: {
      style: 'Hiper-realismo industrial e científico',
      coreSubject: 'Eletrofiação de nanofibras de celulose',
      materialsAndTextures: 'Nanofibras iridescentes e malha têxtil híbrida'
    },
    socialNarrative: {
      keyFacts: [
        '01. Fato 1 sobre nanofibras',
        '02. Fato 2 sobre celulose',
        '03. Fato 3 sobre eletrofiação',
        '04. Fato 4 sobre solventes',
        '05. Fato 5 sobre campo elétrico',
        '06. Fato 6 sobre gotículas piezoelétricas',
        '07. Fato 7 sobre forças de Van der Waals',
        '08. Fato 8 sobre redução de consumo térmico',
        '09. Fato 9 sobre validação pela InkVortex Brasil',
        '10. Fato 10 sobre projeção 2030'
      ],
      keywords: ['Eletrofiacao', 'Sustentabilidade', 'InkVortex']
    },
    motionBlueprint: {
      actionVector: 'Jato de nanofibras cônico em alta tensão.',
      dynamicElements: 'Feixes de laser e microfios em suspensão.'
    },
    musicStoryArc: {
      beginning: 'Início com tensão de bancada.',
      turningPoint: 'Nanofibras se entrelaçam perfeitamente.',
      resolution: 'Produção industrial em ritmo acelerado.'
    }
  },
  scenes: [
    { no: 1, title: 'Injeção de Nanofibras', assembledPrompt: 'TITLE EXACT: "Injeção de Nanofibras"\nMacro shot of electrospinning nozzle.' },
    { no: 2, title: 'Malha Eletrostática', assembledPrompt: 'TITLE EXACT: "Malha Eletrostática"\nMicroscopic view of woven cellulose mesh.' },
    { no: 3, title: 'Ancoragem de Pigmentos', assembledPrompt: 'TITLE EXACT: "Ancoragem de Pigmentos"\nPiezoelectric inkjet drops hitting fiber.' },
    { no: 4, title: 'Interação Molecular', assembledPrompt: 'TITLE EXACT: "Interação Molecular"\nVan der Waals bonds forming dry adhesion.' },
    { no: 5, title: 'Substrato Têxtil Híbrido', assembledPrompt: 'TITLE EXACT: "Substrato Têxtil Híbrido"\nContinuous fabric roll moving at high speed.' },
    { no: 6, title: 'Controle de Campo Elétrico', assembledPrompt: 'TITLE EXACT: "Controle de Campo Elétrico"\nHigh voltage generator glowing with blue LEDs.' },
    { no: 7, title: 'Câmara de Eletrofiação', assembledPrompt: 'TITLE EXACT: "Câmara de Eletrofiação"\nSealed climate chamber with nitrogen atmosphere.' },
    { no: 8, title: 'Inspeção Óptica de Precisão', assembledPrompt: 'TITLE EXACT: "Inspeção Óptica de Precisão"\nLaser micrometer scanning uniform layer.' },
    { no: 9, title: 'Piloto Industrial InkVortex', assembledPrompt: 'TITLE EXACT: "Piloto Industrial InkVortex"\nWide industrial floor with zero liquid waste.' },
    { no: 10, title: 'Revolução Sustentável 2030', assembledPrompt: 'TITLE EXACT: "Revolução Sustentável 2030"\nFuturistic textile sample under pure sunlight.' }
  ],
  scenes40: Array.from({ length: 40 }, (_, i) => ({
    index: i + 1,
    gptSceneRef: Math.floor(i / 4) + 1,
    block: Math.floor(i / 4) + 1,
    positionInBlock: (i % 4) + 2,
    prompt: `Macro complementary angle ${i + 1} with high detail lighting.`
  })),
  geminiScenes: [
    { number: 1, motionPrompt: 'Slow 2-second macro push-in on electrospinning needle.' },
    { number: 2, motionPrompt: 'Smooth orbital rotation around cellulose nanomeshes.' },
    { number: 3, motionPrompt: 'Rapid macro tilt down following inkjet drop impact.' },
    { number: 4, motionPrompt: 'Gentle lateral pan across moving hybrid textile web.' },
    { number: 5, motionPrompt: 'Cinematic pull-out revealing clean industrial floor.' }
  ],
  flow: {
    globalDirective: 'Cinematografia macro 16:9 com iluminação fria e contrastada.',
    scenes: [
      {
        number: 1,
        timeRange: '0:00 - 0:02',
        camera: 'Push-in lento',
        subjectMotion: 'Jato de nanofibras',
        environmentMotion: 'Névoa suave'
      }
    ],
    prompt: '[GLOBAL VIDEO DIRECTIVE]\nCinematografia macro 16:9...'
  },
  social: {
    socialCaption: 'Eletrofiação de Nanofibras de Celulose\n\n1. Fato 1\n2. Fato 2\n\n#InkVortexBrasil'
  },
  flowMusic: {
    lyrics: 'Verso 1: Fios no ar\nRefrão: Celulose a brilhar',
    musicalComposition: 'Eletrônica industrial com sintetizadores analógicos e batida precisa.',
    voice: 'Voz feminina suave em português.',
    prompt: 'FLOW MUSIC - #01\n================================================================================\n\n[LYRICS]\nVerso 1: Fios no ar\n\n[MUSICAL COMPOSITION]\nEletrônica industrial\n\n[VOICE]\nVoz feminina suave'
  }
};

test('saveFullMiniseriesCampaign materializa todos os 8 artefatos JSON e TXT no workspace', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-save-full-'));
  const res = saveFullMiniseriesCampaign(root, sampleCompleteCampaign);

  assert.equal(res.ok, true);
  assert.equal(res.campaignNumber, '01');
  assert.ok(res.savedArtifacts.length >= 7);

  const baseDir = path.join(root, 'minisseries', '01');

  // 1. Assunto
  assert.ok(fs.existsSync(path.join(baseDir, 'assunto', 'genoma_central_01.json')));
  assert.ok(fs.existsSync(path.join(baseDir, 'assunto', 'genoma_central_01.txt')));

  // 2. 10 Prompts GPT
  assert.ok(fs.existsSync(path.join(baseDir, 'prompts', '10_prompts_gpt_01.json')));
  assert.ok(fs.existsSync(path.join(baseDir, 'prompts', '10_prompts_gpt_01.txt')));

  // 3. 40 Complementares
  assert.ok(fs.existsSync(path.join(baseDir, 'prompts', '40_prompts_complementares.json')));
  assert.ok(fs.existsSync(path.join(baseDir, 'prompts', '40_prompts_complementares_minisserie_01.txt')));

  // 4. Gemini Motions
  assert.ok(fs.existsSync(path.join(baseDir, 'prompts', '5_prompts_gemini_motions_01.json')));
  assert.ok(fs.existsSync(path.join(baseDir, 'prompts', '5_prompts_gemini_motions_01.txt')));

  // 5. Flow Master
  assert.ok(fs.existsSync(path.join(baseDir, 'flow', 'flow_master_prompts_01.json')));
  assert.ok(fs.existsSync(path.join(baseDir, 'flow', 'flow_master_prompts_01.txt')));

  // 6. Legendas
  assert.ok(fs.existsSync(path.join(baseDir, 'legendas', 'legenda_social_01.json')));
  assert.ok(fs.existsSync(path.join(baseDir, 'legendas', 'legenda_social_01.txt')));

  // 7. Sonoplastia / Flow Music
  assert.ok(fs.existsSync(path.join(baseDir, 'sonoplastia', 'flow-music', 'FLOW MUSIC - #01.txt')));
  assert.ok(fs.existsSync(path.join(baseDir, 'sonoplastia', 'flow-music', 'FLOW_MUSIC_01.json')));
});

test('restoreFullBackup restaura lote completo de campanhas e sincroniza arquivos físicos', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-restore-full-'));
  const backupPayload = {
    systemName: 'InkVortex Brasil VORTEX 12.0',
    version: '12.0',
    timestamp: new Date().toISOString(),
    campaigns: [
      sampleCompleteCampaign,
      {
        ...sampleCompleteCampaign,
        id: 'camp_test_02',
        number: '02',
        cNum: '02',
        title: 'Segunda Minissérie de Teste'
      }
    ]
  };

  const result = restoreFullBackup(root, backupPayload);
  assert.equal(result.ok, true);
  assert.equal(result.restoredCount, 2);
  assert.equal(result.version, '12.0');

  // Verifica que minissérie 01 e 02 foram criadas
  assert.ok(fs.existsSync(path.join(root, 'minisseries', '01', 'assunto', 'genoma_central_01.json')));
  assert.ok(fs.existsSync(path.join(root, 'minisseries', '02', 'assunto', 'genoma_central_02.json')));
  assert.ok(fs.existsSync(path.join(root, 'minisseries', '02', 'prompts', '10_prompts_gpt_02.json')));
  assert.ok(fs.existsSync(path.join(root, 'minisseries', '02', 'sonoplastia', 'flow-music', 'FLOW MUSIC - #02.txt')));
});

test('exportFullBackup enriquece campanhas com arquivos físicos do disco e gera VORTEX 12.0', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-export-full-'));
  
  // Salva campanha no disco
  saveFullMiniseriesCampaign(root, sampleCompleteCampaign);

  // Exporta passando apenas uma referência simplificada (simulando cache leve de memória)
  const clientCampaigns = [
    {
      id: 'camp_test_01',
      number: '01',
      cNum: '01',
      title: 'Eletrofiação de Nanofibras de Celulose'
    }
  ];

  const exported = exportFullBackup(root, clientCampaigns);
  assert.equal(exported.version, '12.0');
  assert.equal(exported.systemName, 'InkVortex Brasil VORTEX 12.0');
  assert.equal(exported.campaignsCount, 1);
  assert.equal(exported.campaigns.length, 1);

  const camp = exported.campaigns[0];
  assert.ok(camp.subject, 'Subject deve ter sido enriquecido a partir do disco');
  assert.equal(camp.subject.title, sampleCompleteCampaign.subject.title);
  assert.ok(camp.scenes && camp.scenes.length === 10, '10 Prompts GPT devem ter sido enriquecidos');
  assert.ok(camp.flow, 'Flow Master deve ter sido enriquecido');
  assert.ok(camp.social, 'Legenda Social deve ter sido enriquecida');
  assert.ok(camp.flowMusic, 'Flow Music deve ter sido enriquecido');
});
