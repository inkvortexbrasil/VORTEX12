const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function findWindowsMediaPlayerPath(options = {}) {
  const existsSync = options.existsSync || fs.existsSync;
  const environment = options.environment || process.env;
  const candidates = [
    path.join(environment.ProgramW6432 || environment.ProgramFiles || 'C:\\Program Files', 'Windows Media Player', 'wmplayer.exe'),
    path.join(environment['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Windows Media Player', 'wmplayer.exe')
  ];
  const found = candidates.find(candidate => existsSync(candidate));
  if (!found) throw new Error('Windows Media Player não encontrado neste computador.');
  return found;
}

function resolveDocumentaryVideoPath(root, videoUrl) {
  const parsed = new URL(String(videoUrl || ''), 'http://127.0.0.1');
  const pathname = decodeURIComponent(parsed.pathname);
  const minisseriesRoot = path.resolve(root, 'minisseries');
  const resolved = path.resolve(root, '.' + pathname.replace(/\//g, path.sep));
  const relative = path.relative(minisseriesRoot, resolved);
  const parts = relative.split(path.sep);
  const isFinalVideo = parts.length === 2
    && parts[0].toLowerCase() === 'video social'
    && parts[1].toLowerCase().endsWith('.mp4');
  const isFlowMaster = parts.length === 3
    && /^\d+$/.test(parts[0])
    && parts[1].toLowerCase() === 'flow'
    && (parts[2].toLowerCase() === 'master.mp4' || parts[2].toLowerCase() === 'master_1.mp4' || parts[2].toLowerCase() === 'master_2.mp4');

  if (relative.startsWith('..') || path.isAbsolute(relative) || (!isFinalVideo && !isFlowMaster)) {
    throw new Error('Vídeo fora do Acervo oficial.');
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error('Arquivo de vídeo não encontrado no Acervo.');
  }
  return resolved;
}

function launchWindowsMediaPlayer(videoPath, options = {}) {
  const playerPath = options.playerPath || findWindowsMediaPlayerPath(options);
  const spawnProcess = options.spawnProcess || spawn;
  const child = spawnProcess(playerPath, [videoPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  });
  if (child && typeof child.unref === 'function') child.unref();
  return { playerPath, pid: child && child.pid ? child.pid : null };
}

module.exports = {
  findWindowsMediaPlayerPath,
  resolveDocumentaryVideoPath,
  launchWindowsMediaPlayer
};
