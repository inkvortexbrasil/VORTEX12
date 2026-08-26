const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  findWindowsMediaPlayerPath,
  resolveDocumentaryVideoPath,
  launchWindowsMediaPlayer
} = require('../services/windows_media_player_service');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-windows-player-'));

try {
  const finalDir = path.join(root, 'minisseries', 'video social');
  const masterDir = path.join(root, 'minisseries', '18', 'flow');
  fs.mkdirSync(finalDir, { recursive: true });
  fs.mkdirSync(masterDir, { recursive: true });
  const finalVideo = path.join(finalDir, '14 - Vortex Espectral.mp4');
  const masterVideo = path.join(masterDir, 'master.mp4');
  fs.writeFileSync(finalVideo, 'final-video');
  fs.writeFileSync(masterVideo, 'master-video');

  assert.strictEqual(
    resolveDocumentaryVideoPath(root, '/minisseries/video%20social/14%20-%20Vortex%20Espectral.mp4'),
    finalVideo
  );
  assert.strictEqual(resolveDocumentaryVideoPath(root, '/minisseries/18/flow/master.mp4'), masterVideo);
  assert.throws(() => resolveDocumentaryVideoPath(root, '/api-server/server.js'), /fora do Acervo oficial/);
  assert.throws(() => resolveDocumentaryVideoPath(root, '/minisseries/18/flow/missing.mp4'), /fora do Acervo oficial/);
  assert.throws(() => resolveDocumentaryVideoPath(root, '/minisseries/19/flow/master.mp4'), /não encontrado no Acervo/);

  const fakePlayer = 'C:\\Program Files\\Windows Media Player\\wmplayer.exe';
  assert.strictEqual(findWindowsMediaPlayerPath({
    environment: { ProgramFiles: 'C:\\Program Files' },
    existsSync: candidate => candidate === fakePlayer
  }), fakePlayer);

  let spawnCall = null;
  let unrefCalled = false;
  const launch = launchWindowsMediaPlayer(finalVideo, {
    playerPath: fakePlayer,
    spawnProcess: (command, args, options) => {
      spawnCall = { command, args, options };
      return { pid: 1234, unref: () => { unrefCalled = true; } };
    }
  });
  assert.strictEqual(launch.pid, 1234);
  assert.strictEqual(spawnCall.command, fakePlayer);
  assert.deepStrictEqual(spawnCall.args, [finalVideo]);
  assert.strictEqual(spawnCall.options.detached, true);
  assert.strictEqual(unrefCalled, true);

  const documentarios = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'documentarios.js'), 'utf8');
  assert(documentarios.includes('/api/documentaries/open-windows-player'));
  assert(documentarios.includes('Imagem inicial de ${titleStr}'));
  assert(documentarios.includes('window.tryNextAcervoPoster'));
  assert(documentarios.includes('/flow/cena_01.png'));
  assert(documentarios.includes('/flow/cena_01.jpg'));
  assert(documentarios.includes('aria-label="Reproduzir no Player do Windows"'));
  assert(documentarios.includes('data-icon-only="true"'));
  assert(!documentarios.includes('REPRODUZIR NO PLAYER DO WINDOWS'));
  assert(!documentarios.includes('Reprodução completa pelo Windows Media Player, fora do navegador.'));
  assert(!documentarios.includes('<video src="${videoUrl}" controls autoplay'));

  console.log('windows-media-player-ok');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
