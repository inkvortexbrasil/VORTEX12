const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  saveOfficialBackupToRoot,
  findLatestBackupInRoot,
  restoreLatestBackupFromRoot,
  saveFullMiniseriesCampaign
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
      keyFacts: ['01. Fato 1 sobre nanofibras'],
      keywords: ['Eletrofiacao', 'Sustentabilidade', 'InkVortex']
    },
    motionBlueprint: {
      actionVector: 'Jato de nanofibras cônico em alta tensão.',
      dynamicElements: 'Feixes de laser e microfios em suspensão.'
    }
  },
  scenes: [
    { number: 1, prompt: 'Macro shot of spinning nozzle.' }
  ],
  complementaryScenes: [
    { number: 1, prompt: 'Side view of electrified collector plate.' }
  ],
  queue50: [
    { position: 1, prompt: 'Prompt 1: Close-up of nozzle.' }
  ],
  geminiMotions: [
    { number: 1, motionPrompt: 'Cinematic slow tilt down.' }
  ],
  flow: {
    globalDirective: 'Cinematografia macro 16:9.',
    scenes: [
      { number: 1, timeRange: '0:00 - 0:02', camera: 'Push-in lento', subjectMotion: 'Jato de nanofibras', environmentMotion: 'Névoa suave' }
    ],
    prompt: '[GLOBAL VIDEO DIRECTIVE]\nCinematografia macro 16:9...'
  },
  social: {
    socialCaption: 'Eletrofiação de Nanofibras de Celulose\n\n#InkVortexBrasil'
  },
  flowMusic: {
    lyrics: 'Verso 1: Fios no ar\nRefrão: Celulose a brilhar',
    musicalComposition: 'Eletrônica industrial.',
    voice: 'Voz feminina suave em português.',
    prompt: 'FLOW MUSIC - #01\n[LYRICS]\nVerso 1: Fios no ar'
  }
};

test('Contrato de Backup Direto na Raiz: exportação, detecção do mais recente e restauração', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-root-backup-test-'));
  const fakeCodeRoot = path.join(tmpDir, 'VORTEX12');
  const fakeFilesRoot = path.join(tmpDir, 'VORTEX12_FILES');
  fs.mkdirSync(fakeCodeRoot, { recursive: true });
  fs.mkdirSync(fakeFilesRoot, { recursive: true });

  // Criar arquivos padrão do sistema para validar que o filtro os ignora corretamente
  fs.writeFileSync(path.join(fakeCodeRoot, 'package.json'), JSON.stringify({ name: 'vortex' }));
  fs.writeFileSync(path.join(fakeCodeRoot, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3 }));
  fs.writeFileSync(path.join(fakeCodeRoot, 'manifest.json'), JSON.stringify({ manifest_version: 3 }));

  // 1. Salvar campanha física em fakeFilesRoot primeiro
  saveFullMiniseriesCampaign(fakeFilesRoot, sampleCompleteCampaign);

  // Salvar backup antigo para testar critério de desempate por data
  const oldBackupName = 'VORTEX12-BACKUP-OFICIAL-2026-08-10.json';
  fs.writeFileSync(path.join(fakeCodeRoot, oldBackupName), JSON.stringify({
    version: '12.0',
    date: '2026-08-10',
    campaigns: [{ number: '01', title: 'Assunto Antigo' }]
  }, null, 2));

  // Exportar backup oficial atual para a raiz
  const exported = saveOfficialBackupToRoot(fakeCodeRoot, fakeFilesRoot, [sampleCompleteCampaign]);
  assert.ok(exported.ok, 'Exportação para raiz deve retornar ok');
  assert.ok(fs.existsSync(exported.filePath), 'Arquivo de backup deve existir fisicamente na raiz');
  assert.ok(exported.fileName.startsWith('VORTEX12-BACKUP-OFICIAL-'), 'Nome do arquivo deve ter prefixo oficial');

  // 2. Testar findLatestBackupInRoot
  const latest = findLatestBackupInRoot(fakeCodeRoot);
  assert.ok(latest, 'Deve encontrar o backup mais recente');
  assert.strictEqual(latest.fileName, exported.fileName, 'Deve selecionar o backup de hoje e não o de 2026-08-10');
  assert.strictEqual(latest.backupData.version, '12.0');

  // 3. Limpar a pasta física para simular restauração limpa
  fs.rmSync(fakeFilesRoot, { recursive: true, force: true });
  fs.mkdirSync(fakeFilesRoot, { recursive: true });

  // 4. Testar restauração a partir da raiz
  const restored = restoreLatestBackupFromRoot(fakeCodeRoot, fakeFilesRoot);
  assert.ok(restored.ok, 'Restauração deve retornar sucesso');
  assert.strictEqual(restored.fileName, exported.fileName);
  assert.strictEqual(restored.restoredCount, 1);

  // 5. Validar que os artefatos foram gravados em VORTEX12_FILES
  const targetDir = path.join(fakeFilesRoot, 'minisseries', '01');
  assert.ok(fs.existsSync(path.join(targetDir, 'assunto', 'genoma_central_01.json')), 'genoma_central_01.json deve existir');
  assert.ok(fs.existsSync(path.join(targetDir, 'assunto', 'genoma_central_01.txt')), 'genoma_central_01.txt deve existir');
  assert.ok(fs.existsSync(path.join(targetDir, 'prompts', '10_prompts_gpt_01.json')), '10_prompts_gpt_01.json deve existir');
  assert.ok(fs.existsSync(path.join(targetDir, 'prompts', '40_prompts_complementares.json')), '40_prompts_complementares.json deve existir');
  assert.ok(fs.existsSync(path.join(targetDir, 'prompts', '5_prompts_gemini_motions_01.json')), '5_prompts_gemini_motions_01.json deve existir');
  assert.ok(fs.existsSync(path.join(targetDir, 'flow', 'flow_master_prompts_01.json')), 'flow_master_prompts_01.json deve existir');
  assert.ok(fs.existsSync(path.join(targetDir, 'legendas', 'legenda_social_01.json')), 'legenda_social_01.json deve existir');
  assert.ok(fs.existsSync(path.join(targetDir, 'sonoplastia', 'flow-music', 'FLOW MUSIC - #01.txt')), 'FLOW MUSIC - #01.txt deve existir');

  // Limpar tmp
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
