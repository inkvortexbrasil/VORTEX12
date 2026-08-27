const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildImageConcatFile,
  buildSinglePassCommand,
  inspectFinalMinisserieProject,
  listFinalMinisserieCatalog
} = require('../services/final_minisserie_renderer');

function createProjectFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-final-render-'));
  const campaignDir = path.join(root, 'minisseries', '01');
  const flowDir = path.join(campaignDir, 'flow');
  const imageDir = path.join(campaignDir, 'M01');
  const m4aDir = path.join(campaignDir, 'sonoplastia', 'm4a');
  const assDir = path.join(campaignDir, 'sonoplastia', 'ass');
  const logoDir = path.join(root, 'minisseries', 'logo');
  for (const dir of [flowDir, imageDir, m4aDir, assDir, logoDir]) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(flowDir, 'master_1.mp4'), 'intro1');
  fs.writeFileSync(path.join(flowDir, 'master_2.mp4'), 'intro2');
  fs.writeFileSync(path.join(imageDir, 'img_001.jpg'), 'image-1');
  fs.writeFileSync(path.join(imageDir, 'img_002.png'), 'image-2');
  fs.writeFileSync(path.join(m4aDir, 'Faixa.m4a'), 'audio');
  fs.writeFileSync(path.join(assDir, 'Faixa legendado.ass'), 'subtitle');
  fs.writeFileSync(path.join(logoDir, 'logo.mp4'), 'logo');
  return root;
}

test('catálogo nunca apresenta master.mp4 como vídeo final', t => {
  const root = createProjectFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const project = inspectFinalMinisserieProject(root, '01');
  assert.equal(project.ready, true);
  assert.equal(project.imageCount, 2);
  assert.equal(project.finalized, false);
  assert.equal(project.videoUrl, null);
  assert.ok(Array.isArray(project.m4aList) && project.m4aList.length === 1);
  assert.equal(project.m4aList[0].name, 'Faixa.m4a');
  assert.equal(project.m4aList[0].hasAss, true);

  const catalog = listFinalMinisserieCatalog(root);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].finalized, false);
});

test('seletor de M4A resolve a faixa e o ASS correspondente mantendo passagem única', t => {
  const root = createProjectFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const m4aDir = path.join(root, 'minisseries', '01', 'sonoplastia', 'm4a');
  const assDir = path.join(root, 'minisseries', '01', 'sonoplastia', 'ass');
  fs.writeFileSync(path.join(m4aDir, 'Faixa2.m4a'), 'audio2');
  fs.writeFileSync(path.join(assDir, 'Faixa2 legendado.ass'), 'subtitle2');

  const project = inspectFinalMinisserieProject(root, '01', 'Faixa2.m4a');
  assert.equal(project.selectedAudioFile, 'Faixa2.m4a');
  assert.equal(project.m4aList.length, 2);
  assert.equal(project.hasAudio, true);
  assert.equal(project.hasAss, true);
});

test('catálogo só declara finalizado quando existe MP4 físico em video social', t => {
  const root = createProjectFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const outputDir = path.join(root, 'minisseries', 'video social');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'MINISSERIE_01_FINAL.mp4'), 'final-video');

  const project = inspectFinalMinisserieProject(root, '01');
  assert.equal(project.finalized, true);
  assert.equal(project.finalFileName, 'MINISSERIE_01_FINAL.mp4');
  assert.match(project.videoUrl, /video%20social\/MINISSERIE_01_FINAL\.mp4$/);
});

test('lista de imagens aceita quantidade dinâmica e preserva a duração calculada', () => {
  const paths = Array.from({ length: 20 }, (_, index) => `F:\\M01\\img_${String(index + 1).padStart(3, '0')}.jpg`);
  const content = buildImageConcatFile(paths, 8);
  assert.equal((content.match(/^duration 8\.000000$/gm) || []).length, 20);
  assert.equal((content.match(/^file /gm) || []).length, 21);
});

test('comando final usa uma passagem, ASS existente e mixagem nominal dos quatro áudios', () => {
  const command = buildSinglePassCommand({
    ffmpegPath: '"F:/VORTEX11/ffmpeg/bin/ffmpeg.exe"',
    intro1Path: 'F:/VORTEX11/minisseries/01/flow/master_1.mp4',
    intro2Path: 'F:/VORTEX11/minisseries/01/flow/master_2.mp4',
    imageListPath: 'F:/VORTEX11/minisseries/video social/.render-staging/images.txt',
    logoPath: 'F:/VORTEX11/minisseries/logo/logo.mp4',
    audioPath: 'F:/VORTEX11/minisseries/01/sonoplastia/m4a/Faixa.m4a',
    assPath: 'F:/VORTEX11/minisseries/01/sonoplastia/ass/Faixa legendado.ass',
    fontsDir: 'F:/VORTEX11/fonts/Space_Grotesk',
    outputPath: 'F:/VORTEX11/minisseries/video social/.render-staging/output.mp4',
    intro1Seconds: 10,
    intro2Seconds: 10,
    middleSeconds: 150,
    outroSeconds: 10,
    totalSeconds: 180
  });

  assert.ok(command.includes("subtitles='F\\:/VORTEX11/minisseries/01/sonoplastia/ass/Faixa legendado.ass'"));
  assert.match(command, /amix=inputs=4:duration=first/);
  assert.match(command, /weights='1 1 1 1':normalize=0/);
  assert.match(command, /alimiter=limit=0\.98:level=false/);
  assert.match(command, /-map "\[video_out\]" -map "\[audio_out\]"/);
  assert.match(command, /-t 180\.000000/);
  assert.doesNotMatch(command, /pass1_raw_visual|pass2|50 imagens/i);
});
