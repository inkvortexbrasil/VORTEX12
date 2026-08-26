const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { FILES_ROOT, CODE_ROOT, getStacherDir } = require('../utils/paths');

// Binário oficial do FFmpeg
function getFFmpegPath() {
  const customStacher = path.join(getStacherDir(), 'ffmpeg.exe');
  if (fs.existsSync(customStacher)) return customStacher;
  const vortexFfmpeg = path.join(FILES_ROOT, 'ffmpeg', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(vortexFfmpeg)) return vortexFfmpeg;
  return 'ffmpeg';
}

function getFFprobePath() {
  const customStacher = path.join(getStacherDir(), 'ffprobe.exe');
  if (fs.existsSync(customStacher)) return customStacher;
  const vortexFfprobe = path.join(FILES_ROOT, 'ffmpeg', 'bin', 'ffprobe.exe');
  if (fs.existsSync(vortexFfprobe)) return vortexFfprobe;
  return 'ffprobe';
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getMediaDuration(filePath) {
  try {
    const ffprobe = getFFprobePath();
    const cmd = `"${ffprobe}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }).toString().trim();
    const dur = parseFloat(out);
    return Number.isFinite(dur) ? dur : 0;
  } catch (_) {
    return 0;
  }
}

function scanMediaSources() {
  const videoExts = ['.mp4', '.mkv', '.webm', '.mov', '.avi'];
  const audioExts = ['.opus', '.m4a', '.mp3', '.wav', '.aac', '.ogg', '.flac'];

  const directVideoFolder = 'D:\\Video Social';
  const directAudioFolder = 'D:\\Audio Social';
  const batchVideoFolder = 'D:\\Videos';
  const batchAudioFolder = 'D:\\Musicas';
  const finalVideoFolder = 'D:\\Video Social Completo';

  const directVideos = [];
  const directAudios = [];
  const batchVideos = [];
  const batchAudios = [];
  const finalVideos = [];

  const scanFolder = (baseFolder, list, exts, label) => {
    if (!fs.existsSync(baseFolder)) {
      try { fs.mkdirSync(baseFolder, { recursive: true }); } catch (_) {}
      return;
    }

    const walkSync = (dir, fileList = []) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name.includes('_temp') || e.name.startsWith('.')) continue;
          const fullPath = path.join(dir, e.name);
          if (e.isDirectory()) {
            walkSync(fullPath, fileList);
          } else if (e.isFile()) {
            const ext = path.extname(e.name).toLowerCase();
            if (exts.includes(ext)) fileList.push(fullPath);
          }
        }
      } catch (_) {}
      return fileList;
    };

    const files = walkSync(baseFolder);
    for (const fullPath of files) {
      try {
        const stat = fs.statSync(fullPath);
        const relPath = path.relative(baseFolder, fullPath);
        list.push({
          name: relPath.replace(/\\/g, ' / '),
          folder: label,
          filePath: fullPath,
          ext: path.extname(fullPath).toLowerCase(),
          sizeBytes: stat.size,
          durationSec: 0,
          durationFormatted: formatBytes(stat.size),
          url: `/api/social-media/file?path=${encodeURIComponent(fullPath)}`
        });
      } catch (_) {}
    }
  };

  scanFolder(directVideoFolder, directVideos, videoExts, 'Video Social (D:)');
  scanFolder(directAudioFolder, directAudios, audioExts, 'Audio Social (D:)');
  scanFolder(batchVideoFolder, batchVideos, videoExts, 'Videos (D:)');
  scanFolder(batchAudioFolder, batchAudios, audioExts, 'Músicas (D:)');
  scanFolder(finalVideoFolder, finalVideos, videoExts, 'Completo (D:)');

  const sortAlpha = (list) => list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));

  return {
    directVideos: sortAlpha(directVideos),
    directAudios: sortAlpha(directAudios),
    batchVideos: sortAlpha(batchVideos),
    batchAudios: sortAlpha(batchAudios),
    finalVideos: sortAlpha(finalVideos)
  };
}

// Jobs em background
const activeSocialJobs = {};

function startBatchSplitJob(options = {}) {
  const {
    type = 'both', // 'video' | 'audio' | 'both'
    videoPath,
    audioPath,
    segmentDuration = 19 * 60, // em segundos (ex: 1140 = 19 min, 180 = 3 min, 60 = 1 min)
    outputVideoFolder = 'D:\\Video Social',
    outputAudioFolder = 'D:\\Audio Social'
  } = options;

  if (type === 'video' || type === 'both') {
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error('Arquivo de vídeo de origem não encontrado.');
    }
  }
  if (type === 'audio' || type === 'both') {
    if (!audioPath || !fs.existsSync(audioPath)) {
      throw new Error('Arquivo de áudio não encontrado.');
    }
  }

  if (!fs.existsSync(outputVideoFolder)) fs.mkdirSync(outputVideoFolder, { recursive: true });
  if (!fs.existsSync(outputAudioFolder)) fs.mkdirSync(outputAudioFolder, { recursive: true });

  const jobId = `batch-split-${Date.now()}`;
  const job = {
    id: jobId,
    type: 'batch_split',
    status: 'running',
    progress: 0,
    currentStep: 'Iniciando fatiamento...',
    generatedVideos: [],
    generatedAudios: [],
    startTime: Date.now(),
    error: null
  };
  activeSocialJobs[jobId] = job;

  const ffmpeg = getFFmpegPath();

  (async () => {
    // Yield the event loop IMMEDIATELY so the POST request returns to the browser and pollJob can start!
    await new Promise(r => setTimeout(r, 20));
    try {
      // 1. Fatiar Vídeo
      if ((type === 'video' || type === 'both') && videoPath && fs.existsSync(videoPath)) {
        const videoDuration = getMediaDuration(videoPath);
        if (videoDuration > 20) {
          const skipSeconds = 20;
          const effectiveDuration = videoDuration - skipSeconds;
          const segDur = segmentDuration > 0 ? segmentDuration : effectiveDuration;
          const totalSegments = Math.ceil(effectiveDuration / segDur);
          const videoBase = path.basename(videoPath, path.extname(videoPath));
          const videoExt = path.extname(videoPath) || '.mp4';
          const specificOutputVideoFolder = path.join(outputVideoFolder, videoBase);
          if (!fs.existsSync(specificOutputVideoFolder)) fs.mkdirSync(specificOutputVideoFolder, { recursive: true });

          for (let i = 0; i < totalSegments; i++) {
            const startSec = skipSeconds + (i * segDur);
            const remaining = videoDuration - startSec;
            const thisDur = Math.min(segDur, remaining);
            if (thisDur <= 0 || thisDur < segDur - 5) break;

            const partNum = String(i + 1).padStart(2, '0');
            const outName = `${videoBase}_Parte_${partNum}${videoExt}`;
            const outPath = path.join(specificOutputVideoFolder, outName);

            job.currentStep = `Fatiando vídeo: Parte ${i + 1} de ${totalSegments}...`;
            job.progress = Math.round(((i + 0.1) / totalSegments) * (type === 'both' ? 50 : 100));

            const cmd = `"${ffmpeg}" -y -ss ${startSec} -i "${videoPath}" -t ${thisDur} -c copy -avoid_negative_ts make_zero "${outPath}"`;
            try {
              execSync(cmd, { stdio: ['ignore', 'ignore', 'ignore'], timeout: 120000 });
              if (fs.existsSync(outPath)) {
                job.generatedVideos.push(outName);
              }
            } catch (errSplit) {
              console.error(`Erro ao fatiar parte ${i + 1} do vídeo:`, errSplit);
            }
            // Yield the event loop to allow progress API to respond
            await new Promise(r => setTimeout(r, 50));
          }
        }
      }
      // 2. Fatiar Áudio
      if ((type === 'audio' || type === 'both') && audioPath && fs.existsSync(audioPath)) {
        const audioDuration = getMediaDuration(audioPath);
        if (audioDuration > 20) {
          const skipSeconds = 20;
          const effectiveDuration = audioDuration - skipSeconds;
          const segDur = segmentDuration > 0 ? segmentDuration : effectiveDuration;
          const totalSegments = Math.ceil(effectiveDuration / segDur);
          const audioBase = path.basename(audioPath, path.extname(audioPath));
          const audioExt = path.extname(audioPath) || '.opus';
          const specificOutputAudioFolder = path.join(outputAudioFolder, audioBase);
          if (!fs.existsSync(specificOutputAudioFolder)) fs.mkdirSync(specificOutputAudioFolder, { recursive: true });

          for (let i = 0; i < totalSegments; i++) {
            const startSec = skipSeconds + (i * segDur);
            const remaining = audioDuration - startSec;
            const thisDur = Math.min(segDur, remaining);
            if (thisDur <= 0 || thisDur < segDur - 5) break;

            const partNum = String(i + 1).padStart(2, '0');
            const outName = `${audioBase}_Parte_${partNum}${audioExt}`;
            const outPath = path.join(specificOutputAudioFolder, outName);

            job.currentStep = `Fatiando áudio: Parte ${i + 1} de ${totalSegments}...`;
            const baseProg = type === 'both' ? 50 : 0;
            const factor = type === 'both' ? 50 : 100;
            job.progress = baseProg + Math.round(((i + 0.1) / totalSegments) * factor);

            const cmd = `"${ffmpeg}" -y -ss ${startSec} -i "${audioPath}" -t ${thisDur} -c copy "${outPath}"`;
            try {
              execSync(cmd, { stdio: ['ignore', 'ignore', 'ignore'], timeout: 120000 });
              if (fs.existsSync(outPath)) {
                job.generatedAudios.push(outName);
              }
            } catch (errSplit) {
              try {
                const cmdFallback = `"${ffmpeg}" -y -ss ${startSec} -i "${audioPath}" -t ${thisDur} -c:a aac -b:a 320k "${outPath.replace(/\.[^.]+$/, '.m4a')}"`;
                execSync(cmdFallback, { stdio: ['ignore', 'ignore', 'ignore'], timeout: 120000 });
                if (fs.existsSync(outPath.replace(/\.[^.]+$/, '.m4a'))) {
                  job.generatedAudios.push(outName.replace(/\.[^.]+$/, '.m4a'));
                }
              } catch (errFallback) {
                console.error(`Erro ao fatiar parte ${i + 1} do áudio:`, errFallback);
              }
            }
            await new Promise(r => setTimeout(r, 50));
          }
        }
      }

      job.status = 'done';
      job.progress = 100;
      job.currentStep = 'Fatiamento em lote concluído com sucesso!';
    } catch (err) {
      job.status = 'error';
      job.error = err.message;
    }
  })();

  return job;
}

function registerExternalFile(rawPath) {
  if (!rawPath || !fs.existsSync(rawPath)) {
    throw new Error('Arquivo não encontrado no caminho informado.');
  }
  const stat = fs.statSync(rawPath);
  const ext = path.extname(rawPath).toLowerCase();
  const durationSec = getMediaDuration(rawPath);
  const name = path.basename(rawPath);
  const folder = path.dirname(rawPath);

  return {
    name,
    folder,
    filePath: rawPath,
    ext,
    sizeBytes: stat.size,
    durationSec,
    durationFormatted: formatDuration(durationSec),
    url: `/api/social-media/file?path=${encodeURIComponent(rawPath)}`
  };
}

function openNativeFileDialog(type = 'video', title = 'Selecione o Arquivo') {
  const scriptPath = path.join(__dirname, '..', 'utils', 'pick_file.ps1');
  const cmd = `powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -Type "${type}" -Title "${title}"`;
  try {
    const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 120000 }).toString().trim();
    if (!out || !fs.existsSync(out)) return null;
    return registerExternalFile(out);
  } catch (err) {
    console.error('Erro ao abrir diálogo do Windows:', err);
    return null;
  }
}

function browseFilesystem(currentDir = '') {
  let targetDir = currentDir ? path.normalize(currentDir) : '';
  if (!targetDir || targetDir === '.') {
    const drives = [];
    ['C', 'D', 'E', 'F', 'G', 'H'].forEach(letter => {
      const root = `${letter}:\\`;
      if (fs.existsSync(root)) {
        drives.push({ name: `Disco Local (${letter}:)`, path: root, isDir: true });
      }
    });
    return { currentDir: '', parentDir: '', items: drives };
  }

  if (!fs.existsSync(targetDir)) {
    throw new Error('Diretório não encontrado: ' + targetDir);
  }

  const parentDir = path.dirname(targetDir);
  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  const items = [];

  for (const entry of entries) {
    if (entry.name.startsWith('$') || entry.name.startsWith('System Volume Information') || entry.name.startsWith('.')) continue;
    const fullPath = path.join(targetDir, entry.name);
    try {
      if (entry.isDirectory()) {
        items.push({ name: entry.name, path: fullPath, isDir: true });
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.mp4', '.mkv', '.webm', '.mov', '.avi', '.opus', '.m4a', '.mp3', '.wav', '.flac', '.aac'].includes(ext)) {
          const stat = fs.statSync(fullPath);
          items.push({
            name: entry.name,
            path: fullPath,
            isDir: false,
            ext,
            sizeMb: (stat.size / (1024 * 1024)).toFixed(1)
          });
        }
      }
    } catch (_) {}
  }

  items.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  return {
    currentDir: targetDir,
    parentDir: parentDir === targetDir ? '' : parentDir,
    items
  };
}

function startSocialMixRender(options = {}) {
  const {
    videoPath,
    audioPath,
    startTime = 0,
    duration = 0, // 0 = duração total do vídeo
    outputFolder = 'D:\\Video Social Completo',
    outputFileName,
    qualityProfile = 'fast_remux' // 'fast_remux' (3-5s ultra-rápido) | 'master_crf15'
  } = options;

  if (!videoPath || !fs.existsSync(videoPath)) {
    throw new Error('Arquivo de vídeo de origem não encontrado.');
  }
  if (!audioPath || !fs.existsSync(audioPath)) {
    throw new Error('Arquivo de áudio novo não encontrado.');
  }

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const finalFileName = outputFileName || path.basename(videoPath);
  
  // Tentar herdar o nome da subpasta original (ex: "cyber_hacker") se existir
  const parentDirName = path.basename(path.dirname(videoPath));
  let specificOutputFolder = outputFolder;
  if (parentDirName && parentDirName !== 'Video Social' && parentDirName !== 'Audio Social') {
    specificOutputFolder = path.join(outputFolder, parentDirName);
  }
  
  if (!fs.existsSync(specificOutputFolder)) {
    fs.mkdirSync(specificOutputFolder, { recursive: true });
  }

  const finalFilePath = path.join(specificOutputFolder, finalFileName);
  const tempFilePath = path.join(specificOutputFolder, `temp_${Date.now()}_${finalFileName}`);

  const totalVideoDuration = getMediaDuration(videoPath);
  let targetDuration = duration > 0 ? Math.min(duration, totalVideoDuration) : totalVideoDuration;
  if (targetDuration <= 0 && duration > 0) {
    targetDuration = duration; // Fallback se o ffprobe falhar
  }

  const jobId = `social-job-${Date.now()}`;
  activeSocialJobs[jobId] = {
    id: jobId,
    status: 'running',
    progress: 0,
    currentSec: 0,
    totalSec: targetDuration,
    finalFilePath,
    finalFileName,
    startTime: Date.now(),
    error: null
  };

  const ffmpeg = getFFmpegPath();

  // Argumentos FFmpeg — Ultra Rápido (3 a 5 segundos via cópia direta de vídeo)
  const args = ['-y'];

  if (startTime > 0) {
    args.push('-ss', String(startTime));
  }
  if (targetDuration > 0) {
    args.push('-t', String(targetDuration));
  }
  args.push('-i', videoPath);

  // Áudio novo cortado no tempo
  if (targetDuration > 0) {
    args.push('-t', String(targetDuration));
  }
  args.push('-i', audioPath);

  args.push('-map', '0:v:0', '-map', '1:a:0');
  
  // Limpa todos os metadados (importante para evitar bloqueios em redes sociais)
  args.push('-map_metadata', '-1', '-map_chapters', '-1');

  // Padrão: Remux Ultrarrápido (3-5s) com cópia direta do vídeo (sem perder qualidade)
  args.push('-c:v', 'copy');
  args.push('-c:a', 'aac', '-b:a', '320k', '-ar', '48000');

  args.push(tempFilePath);

  // ─── SOLUÇÃO DEFINITIVA PARA WINDOWS ──────────────────────────────────────
  // spawn+pipe no Windows tem deadlock de buffer quando FFmpeg escreve muito no
  // stderr. A única abordagem 100% confiável é execFile com callback.
  // O progresso é estimado por tempo decorrido (funciona mesmo se o FFmpeg for
  // ultra-rápido e terminar antes do primeiro poll do frontend).
  // ──────────────────────────────────────────────────────────────────────────

  const { execFile } = require('child_process');
  
  // A mixagem (cópia de vídeo + recode Opus p/ AAC 320k) leva cerca de 17% do tempo real do vídeo.
  // Ex: Um vídeo de 19 min (1140s) leva ~193 segundos (3m 13s) para mixar.
  // Se não tivermos o targetDuration exato, assumimos 19 minutos como padrão de minissérie (1140s).
  const durationForCalc = (targetDuration > 0) ? targetDuration : 1140; 
  const expectedProcessTimeSecs = durationForCalc * 0.17;
  // Daremos 9 saltos de 10% (para chegar a 90%), então calculamos o tempo de cada salto
  const timePer10PercentMs = Math.max(1000, (expectedProcessTimeSecs / 9) * 1000);

  let fakeProgress = 0;
  const progressTimer = setInterval(() => {
    if (!activeSocialJobs[jobId] || activeSocialJobs[jobId].status !== 'running') {
      clearInterval(progressTimer);
      return;
    }
    if (fakeProgress < 90) {
      fakeProgress += 10;
    }
    activeSocialJobs[jobId].progress = fakeProgress;
  }, timePer10PercentMs);

  execFile(ffmpeg, args, { windowsHide: true, maxBuffer: 64 * 1024 * 1024 }, (error, _stdout, stderr) => {
    clearInterval(progressTimer);

    // CRÍTICO: NÃO confiamos no exit code do FFmpeg no Windows.
    // Algumas versões do FFmpeg saem com código 1 mesmo gerando arquivo válido (warnings não fatais).
    // A prova real de sucesso é a existência do arquivo temporário com tamanho > 0.
    const tempExists = fs.existsSync(tempFilePath);
    const tempSize = tempExists ? fs.statSync(tempFilePath).size : 0;
    const ffmpegSucceeded = tempExists && tempSize > 0;

    if (!ffmpegSucceeded) {
      const errMsg = stderr ? stderr.split('\n').filter(l => l.includes('Error') || l.includes('error') || l.includes('Invalid')).pop() : (error ? error.message : 'Arquivo de saída vazio ou não criado');
      console.error('[Social Mixer] FFmpeg falhou. Exit code:', error ? error.code : 0, '| Erro:', errMsg);
      activeSocialJobs[jobId].status = 'error';
      activeSocialJobs[jobId].error = errMsg || 'FFmpeg não gerou o arquivo de saída';
      if (tempExists) {
        try { fs.unlinkSync(tempFilePath); } catch (_) {}
      }
      return;
    }

    if (error) {
      console.warn('[Social Mixer] FFmpeg saiu com código não-zero mas arquivo gerado com', tempSize, 'bytes — tratando como sucesso.');
    }

    // Sucesso — renomeia temp → final
    try {
      if (fs.existsSync(finalFilePath)) {
        try { fs.unlinkSync(finalFilePath); } catch (e) {
          console.error('[Social Mixer] Erro ao deletar original:', e);
        }
      }
      fs.renameSync(tempFilePath, finalFilePath);
      activeSocialJobs[jobId].status = 'done';
      activeSocialJobs[jobId].progress = 100;
      activeSocialJobs[jobId].sizeBytes = fs.statSync(finalFilePath).size;
    } catch (err) {
      activeSocialJobs[jobId].status = 'error';
      activeSocialJobs[jobId].error = err.message;
    }
  });

  return activeSocialJobs[jobId];
}

function getSocialJobStatus(jobId) {
  return activeSocialJobs[jobId] || { status: 'not_found' };
}

module.exports = {
  scanMediaSources,
  startSocialMixRender,
  startBatchSplitJob,
  registerExternalFile,
  openNativeFileDialog,
  browseFilesystem,
  getSocialJobStatus,
  formatDuration,
  getMediaDuration,
  getFFmpegPath,
  getFFprobePath
};
