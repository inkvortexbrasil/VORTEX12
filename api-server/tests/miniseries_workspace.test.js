const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  normalizeCampaignNumber,
  ensureMiniseriesWorkspace,
  deleteMiniseriesWorkspace,
  resetMiniseriesWorkspace,
  matchesCampaignPrefix,
  buildCompactionMappings,
  compactMiniseriesWorkspaces,
  deleteAndCompactMiniseriesWorkspaces
} = require('../services/miniseries_workspace_service');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-miniseries-workspace-'));

try {
  assert.strictEqual(normalizeCampaignNumber(1), '01');
  assert.strictEqual(normalizeCampaignNumber('22'), '22');
  assert.throws(() => normalizeCampaignNumber('../1'), /inválido/);
  assert.throws(() => normalizeCampaignNumber(''), /inválido/);
  assert.throws(() => normalizeCampaignNumber(0), /intervalo/);
  assert.throws(() => normalizeCampaignNumber(10000), /inválido|intervalo/);

  const workspace = ensureMiniseriesWorkspace(root, 22);
  const expectedDirectories = [
    'assunto',
    'flow',
    'legendas',
    'M22',
    'prompts',
    path.join('sonoplastia', 'm4a'),
    path.join('sonoplastia', 'ass'),
    path.join('sonoplastia', 'mp4'),
    path.join('sonoplastia', 'flow-music')
  ];
  expectedDirectories.forEach(relativePath => {
    assert(fs.statSync(path.join(workspace.campaignRoot, relativePath)).isDirectory());
  });
  assert.strictEqual(fs.existsSync(path.join(workspace.campaignRoot, 'imagens')), false);

  const targetRoot = path.join(root, 'minisseries', '01');
  const neighborRoot = path.join(root, 'minisseries', '02');
  const videoSocialRoot = path.join(root, 'minisseries', 'video social');
  fs.mkdirSync(targetRoot, { recursive: true });
  fs.mkdirSync(neighborRoot, { recursive: true });
  fs.mkdirSync(path.join(videoSocialRoot, '01'), { recursive: true });
  fs.mkdirSync(path.join(videoSocialRoot, '02'), { recursive: true });
  fs.writeFileSync(path.join(targetRoot, 'imagem.png'), 'target');
  fs.writeFileSync(path.join(neighborRoot, 'imagem.png'), 'neighbor');
  fs.writeFileSync(path.join(videoSocialRoot, '01', 'video.mp4'), 'target-dir');
  fs.writeFileSync(path.join(videoSocialRoot, '02', 'video.mp4'), 'neighbor-dir');
  fs.writeFileSync(path.join(videoSocialRoot, '1 - final.mp4'), 'target-file');
  fs.writeFileSync(path.join(videoSocialRoot, '01.mp4'), 'target-file-padded');
  fs.writeFileSync(path.join(videoSocialRoot, '10 - preservar.mp4'), 'neighbor-ten');
  fs.writeFileSync(path.join(videoSocialRoot, '02 - preservar.mp4'), 'neighbor-two');

  assert.strictEqual(matchesCampaignPrefix('01.mp4', '01'), true);
  assert.strictEqual(matchesCampaignPrefix('1 - final.mp4', '01'), true);
  assert.strictEqual(matchesCampaignPrefix('10 - preservar.mp4', '01'), false);

  const deletion = deleteMiniseriesWorkspace(root, 1);
  assert.strictEqual(deletion.campaignNumber, '01');
  assert.strictEqual(fs.existsSync(targetRoot), false);
  assert.strictEqual(fs.existsSync(path.join(videoSocialRoot, '01')), false);
  assert.strictEqual(fs.existsSync(path.join(videoSocialRoot, '1 - final.mp4')), false);
  assert.strictEqual(fs.existsSync(path.join(videoSocialRoot, '01.mp4')), false);
  assert.strictEqual(fs.existsSync(neighborRoot), true);
  assert.strictEqual(fs.existsSync(path.join(videoSocialRoot, '02')), true);
  assert.strictEqual(fs.existsSync(path.join(videoSocialRoot, '10 - preservar.mp4')), true);
  assert.strictEqual(fs.existsSync(path.join(videoSocialRoot, '02 - preservar.mp4')), true);

  const resetRoot = path.join(root, 'reset');
  const resetWorkspace = ensureMiniseriesWorkspace(resetRoot, 5);
  const resetNeighbor = ensureMiniseriesWorkspace(resetRoot, 6);
  const resetVideoRoot = path.join(resetRoot, 'minisseries', 'video social');
  fs.mkdirSync(path.join(resetVideoRoot, '05'), { recursive: true });
  fs.mkdirSync(path.join(resetVideoRoot, '06'), { recursive: true });
  fs.writeFileSync(path.join(resetWorkspace.campaignRoot, 'prompts', 'antigo.json'), '{}');
  fs.writeFileSync(path.join(resetWorkspace.campaignRoot, 'M05', 'antiga.png'), 'old-image');
  fs.writeFileSync(path.join(resetNeighbor.campaignRoot, 'prompts', 'preservar.json'), '{}');
  fs.writeFileSync(path.join(resetVideoRoot, '05', 'antigo.mp4'), 'old-video-dir');
  fs.writeFileSync(path.join(resetVideoRoot, '5 - final.mp4'), 'old-video-file');
  fs.writeFileSync(path.join(resetVideoRoot, '06', 'preservar.mp4'), 'neighbor-video');

  const reset = resetMiniseriesWorkspace(resetRoot, 5);
  assert.strictEqual(reset.campaignNumber, '05');
  expectedDirectories.forEach(relativePath => {
    const adjustedPath = relativePath === 'M22' ? 'M05' : relativePath;
    assert(fs.statSync(path.join(resetWorkspace.campaignRoot, adjustedPath)).isDirectory());
  });
  assert.strictEqual(fs.existsSync(path.join(resetWorkspace.campaignRoot, 'prompts', 'antigo.json')), false);
  assert.strictEqual(fs.existsSync(path.join(resetWorkspace.campaignRoot, 'M05', 'antiga.png')), false);
  assert.strictEqual(fs.existsSync(path.join(resetWorkspace.campaignRoot, 'imagens')), false);
  assert.strictEqual(fs.existsSync(path.join(resetVideoRoot, '05')), false);
  assert.strictEqual(fs.existsSync(path.join(resetVideoRoot, '5 - final.mp4')), false);
  assert.strictEqual(fs.existsSync(path.join(resetNeighbor.campaignRoot, 'prompts', 'preservar.json')), true);
  assert.strictEqual(fs.existsSync(path.join(resetVideoRoot, '06', 'preservar.mp4')), true);
  assert.throws(() => resetMiniseriesWorkspace(resetRoot, '../5'), /inválido/);

  assert.deepStrictEqual(buildCompactionMappings([22, 23, 25]), [
    { oldNumber: '22', newNumber: '01' },
    { oldNumber: '23', newNumber: '02' },
    { oldNumber: '25', newNumber: '03' }
  ]);
  assert.throws(() => buildCompactionMappings([22, '22']), /duplicados/);

  const compactionRoot = path.join(root, 'compaction');
  const campaign22 = ensureMiniseriesWorkspace(compactionRoot, 22).campaignRoot;
  const campaign23 = ensureMiniseriesWorkspace(compactionRoot, 23).campaignRoot;
  const future34 = ensureMiniseriesWorkspace(compactionRoot, 34).campaignRoot;
  const emptyDestination10 = ensureMiniseriesWorkspace(compactionRoot, 10).campaignRoot;
  fs.writeFileSync(path.join(campaign22, 'M22', 'img_001.jpg'), 'image-22');
  fs.writeFileSync(path.join(campaign23, 'prompts', 'chatgpt_checkpoint_23_minisseries.json'), JSON.stringify({
    version: 2,
    number: '23',
    generated: { 1: { number: 23, promptSha256: 'preserve' } }
  }));
  fs.writeFileSync(path.join(future34, 'prompts', 'preservar.txt'), 'future');
  assert.strictEqual(fs.existsSync(emptyDestination10), true);
  const compactionVideoRoot = path.join(compactionRoot, 'minisseries', 'video social');
  fs.mkdirSync(path.join(compactionVideoRoot, '23'), { recursive: true });
  fs.writeFileSync(path.join(compactionVideoRoot, '22 - final.mp4'), 'video-22');
  fs.writeFileSync(path.join(compactionVideoRoot, '23', 'master.mp4'), 'video-23');

  const compacted = compactMiniseriesWorkspaces(compactionRoot, [22, 23]);
  assert.strictEqual(compacted.changed, 2);
  assert.strictEqual(fs.existsSync(campaign22), false);
  assert.strictEqual(fs.existsSync(campaign23), false);
  assert.strictEqual(fs.readFileSync(path.join(compactionRoot, 'minisseries', '01', 'M01', 'img_001.jpg'), 'utf8'), 'image-22');
  const rewrittenCheckpointPath = path.join(compactionRoot, 'minisseries', '02', 'prompts', 'chatgpt_checkpoint_02_minisseries.json');
  const rewrittenCheckpoint = JSON.parse(fs.readFileSync(rewrittenCheckpointPath, 'utf8'));
  assert.strictEqual(rewrittenCheckpoint.number, '02');
  assert.strictEqual(rewrittenCheckpoint.generated['1'].number, 23);
  assert.strictEqual(rewrittenCheckpoint.generated['1'].promptSha256, 'preserve');
  assert.strictEqual(fs.readFileSync(path.join(compactionVideoRoot, '1 - final.mp4'), 'utf8'), 'video-22');
  assert.strictEqual(fs.readFileSync(path.join(compactionVideoRoot, '02', 'master.mp4'), 'utf8'), 'video-23');
  assert.strictEqual(fs.readFileSync(path.join(future34, 'prompts', 'preservar.txt'), 'utf8'), 'future');
  const compactedRetry = compactMiniseriesWorkspaces(compactionRoot, [22, 23]);
  assert.strictEqual(compactedRetry.changed, 2);
  assert.strictEqual(fs.readFileSync(path.join(compactionRoot, 'minisseries', '01', 'M01', 'img_001.jpg'), 'utf8'), 'image-22');

  const deletionCompactionRoot = path.join(root, 'delete-compaction');
  ensureMiniseriesWorkspace(deletionCompactionRoot, 1);
  const deleteTwo = ensureMiniseriesWorkspace(deletionCompactionRoot, 2).campaignRoot;
  const shiftThree = ensureMiniseriesWorkspace(deletionCompactionRoot, 3).campaignRoot;
  fs.writeFileSync(path.join(deleteTwo, 'prompts', 'delete.txt'), 'delete');
  fs.writeFileSync(path.join(shiftThree, 'prompts', 'keep.txt'), 'keep');
  const deleteAndCompact = deleteAndCompactMiniseriesWorkspaces(deletionCompactionRoot, 2, [1, 3]);
  assert.strictEqual(deleteAndCompact.deletion.campaignNumber, '02');
  assert.strictEqual(fs.existsSync(path.join(deletionCompactionRoot, 'minisseries', '03')), false);
  assert.strictEqual(fs.readFileSync(path.join(deletionCompactionRoot, 'minisseries', '02', 'prompts', 'keep.txt'), 'utf8'), 'keep');

  const appSource = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'app.js'), 'utf8');
  const uiSource = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'ui.js'), 'utf8');
  const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert(appSource.includes('EXCLUSÃO TOTAL DA MINISSÉRIE'));
  assert(appSource.includes('/api/minisseries/delete-workspace'));
  assert(appSource.includes('/api/minisseries/compact-workspaces'));
  assert(appSource.includes('remainingCampaignNumbers'));
  assert(appSource.includes('window.applyCampaignNumberMappings(data.mappings)'));
  assert(appSource.includes('As minisséries posteriores serão renumeradas automaticamente'));
  assert(appSource.includes('await window.initializeCampaignWorkspace(newCampaign.number)'));
  assert(uiSource.includes("window.handleDeleteCampaign('${c.id}')"));
  assert(!uiSource.includes('AppState.campaigns = AppState.campaigns.filter(camp => camp.id'));
  assert(serverSource.includes("req.url === '/api/minisseries/delete-workspace'"));
  assert(serverSource.includes("req.url === '/api/minisseries/compact-workspaces'"));
  assert(serverSource.includes("req.url === '/api/minisseries/reset-workspace'"));

  console.log('miniseries-workspace-ok');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
