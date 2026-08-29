const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function normalizeCampaignNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) throw new Error('Número da minissérie inválido.');
  return String(Number.parseInt(digits, 10)).padStart(2, '0');
}

function naturalCompare(left, right) {
  return left.localeCompare(right, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

function isJpegImage(filePath) {
  try {
    const buf = Buffer.alloc(4);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return bytesRead >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  } catch (e) {
    return false;
  }
}

function escapeConcatPath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/'/g, "'\\''");
}

function escapeFilterPath(filePath) {
  return filePath
    .replace(/\\/g, '/')
    .replace(':', '\\:')
    .replace(/'/g, "\\'");
}

function findCaseInsensitive(files, expectedName) {
  const expected = expectedName.toLowerCase();
  return files.find(file => file.toLowerCase() === expected) || null;
}

function findFinalVideoFile(videoSocialDir, campaignNumber) {
  if (!fs.existsSync(videoSocialDir)) return null;
  const files = fs.readdirSync(videoSocialDir)
    .filter(file => file.toLowerCase().endsWith('.mp4'))
    .sort(naturalCompare);

  const officialName = `MINISSERIE_${campaignNumber}_FINAL.mp4`;
  const official = findCaseInsensitive(files, officialName);
  if (official) return official;

  const escapedNumber = campaignNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return files.find(file => {
    const stem = path.parse(file).name;
    return new RegExp(`^${escapedNumber}(?:\\s*[-_]|$)`, 'i').test(stem)
      || new RegExp(`^MINISSERIE[_ -]?${escapedNumber}(?:[_ -]|$)`, 'i').test(stem);
  }) || null;
}

function resolveFinalMinisserieAssets(root, campaignNumber, selectedM4aFile) {
  const number = normalizeCampaignNumber(campaignNumber);
  const campaignDir = path.join(root, 'minisseries', number);
  const flowDir = path.join(campaignDir, 'flow');
  const imageDir = path.join(campaignDir, `M${number}`);
  const sonoplastiaDir = path.join(campaignDir, 'sonoplastia');
  const m4aDir = path.join(sonoplastiaDir, 'm4a');
  const assDir = path.join(sonoplastiaDir, 'ass');
  const resolveMaster = (num) => {
    const candidate1 = path.join(flowDir, `master_${num}.mp4`);
    const candidate2 = path.join(flowDir, `master${num}.mp4`);
    if (fs.existsSync(candidate1)) return candidate1;
    if (fs.existsSync(candidate2)) return candidate2;
    return candidate1;
  };
  const intro1Path = resolveMaster(1);
  const intro2Path = resolveMaster(2);
  const logoPath = path.join(root, 'minisseries', 'logo', 'logo.mp4');
  const videoSocialDir = path.join(root, 'minisseries', 'video social');

  const imageFiles = fs.existsSync(imageDir)
    ? fs.readdirSync(imageDir)
      .filter(file => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
      .sort(naturalCompare)
    : [];

  const duplicateStems = [];
  const stems = new Set();
  for (const imageFile of imageFiles) {
    const stem = path.parse(imageFile).name.toLowerCase();
    if (stems.has(stem)) duplicateStems.push(stem);
    stems.add(stem);
  }

  const m4aFiles = fs.existsSync(m4aDir)
    ? fs.readdirSync(m4aDir).filter(file => file.toLowerCase().endsWith('.m4a'))
    : [];

  let audioFile = null;
  if (selectedM4aFile && typeof selectedM4aFile === 'string') {
    const cleanReq = path.basename(selectedM4aFile);
    audioFile = findCaseInsensitive(m4aFiles, cleanReq);
  }
  if (!audioFile) {
    audioFile = m4aFiles.find(file => !file.toLowerCase().includes('legendado')) || m4aFiles[0] || null;
  }
  const audioPath = audioFile ? path.join(m4aDir, audioFile) : null;
  const audioBaseName = audioFile ? path.parse(audioFile).name : null;

  const assFiles = fs.existsSync(assDir)
    ? fs.readdirSync(assDir).filter(file => file.toLowerCase().endsWith('.ass'))
    : [];
  const expectedAssName = audioBaseName ? `${audioBaseName} legendado.ass` : null;
  const assFile = expectedAssName
    ? findCaseInsensitive(assFiles, expectedAssName)
      || findCaseInsensitive(assFiles, `${audioBaseName}.ass`)
    : null;
  const assPath = assFile ? path.join(assDir, assFile) : null;

  const finalFileName = `MINISSERIE_${number}_FINAL.mp4`;
  const finalPath = path.join(videoSocialDir, finalFileName);

  return {
    number,
    campaignDir,
    flowDir,
    imageDir,
    sonoplastiaDir,
    m4aDir,
    assDir,
    intro1Path,
    intro2Path,
    logoPath,
    videoSocialDir,
    imageFiles,
    imagePaths: imageFiles.map(file => path.join(imageDir, file)),
    duplicateStems,
    audioFile,
    audioBaseName,
    audioPath,
    assFile,
    assPath,
    finalFileName,
    finalPath
  };
}

function buildMissingAssetList(assets) {
  const missing = [];
  if (!fs.existsSync(assets.campaignDir)) missing.push(`pasta minisseries/${assets.number}`);
  if (!fs.existsSync(assets.intro1Path)) missing.push(`flow/master_1.mp4`);
  if (!fs.existsSync(assets.intro2Path)) missing.push(`flow/master_2.mp4`);
  if (assets.imagePaths.length === 0) missing.push(`ao menos uma imagem em M${assets.number}/`);
  if (assets.duplicateStems.length > 0) missing.push(`imagens duplicadas: ${assets.duplicateStems.join(', ')}`);
  if (!assets.audioPath) missing.push('arquivo M4A em sonoplastia/m4a/');
  if (!assets.assPath) missing.push('ASS correspondente em sonoplastia/ass/');
  if (!fs.existsSync(assets.logoPath)) missing.push('minisseries/logo/logo.mp4');
  return missing;
}

function inspectFinalMinisserieProject(root, campaignNumber, selectedM4aFile) {
  const assets = resolveFinalMinisserieAssets(root, campaignNumber, selectedM4aFile);
  const missing = buildMissingAssetList(assets);
  const existingFinalFile = findFinalVideoFile(assets.videoSocialDir, assets.number);
  const existingFinalPath = existingFinalFile
    ? path.join(assets.videoSocialDir, existingFinalFile)
    : null;
  const finalStat = existingFinalPath ? fs.statSync(existingFinalPath) : null;

  const m4aFiles = fs.existsSync(assets.m4aDir)
    ? fs.readdirSync(assets.m4aDir).filter(file => file.toLowerCase().endsWith('.m4a'))
    : [];
  const assFiles = fs.existsSync(assets.assDir)
    ? fs.readdirSync(assets.assDir).filter(file => file.toLowerCase().endsWith('.ass'))
    : [];
  const m4aList = m4aFiles.map(file => {
    const stem = path.parse(file).name;
    const hasAss = assFiles.some(af => {
      const afStem = path.parse(af).name.toLowerCase();
      return afStem === `${stem.toLowerCase()} legendado` || afStem === stem.toLowerCase();
    });
    return { name: file, stem, hasAss };
  });

  return {
    id: `minisserie-${assets.number}`,
    docNumStr: assets.number,
    title: `Minissérie #${assets.number}`,
    ready: missing.length === 0,
    missing,
    imageCount: assets.imagePaths.length,
    hasIntro: Boolean(assets.intro1Path && fs.existsSync(assets.intro1Path) && assets.intro2Path && fs.existsSync(assets.intro2Path)),
    hasAudio: Boolean(assets.audioPath),
    hasAss: Boolean(assets.assPath),
    hasLogo: Boolean(assets.logoPath && fs.existsSync(assets.logoPath)),
    selectedAudioFile: assets.audioFile,
    m4aList,
    finalized: Boolean(existingFinalPath),
    finalFileName: existingFinalFile,
    videoUrl: existingFinalFile
      ? `/minisseries/video%20social/${encodeURIComponent(existingFinalFile)}`
      : null,
    sizeMb: finalStat ? `${(finalStat.size / (1024 * 1024)).toFixed(1)} MB` : null,
    date: finalStat ? finalStat.mtime.toLocaleDateString('pt-BR') : null,
    modifiedAt: finalStat ? finalStat.mtimeMs : null
  };
}

function listFinalMinisserieCatalog(root) {
  const minisseriesDir = path.join(root, 'minisseries');
  if (!fs.existsSync(minisseriesDir)) return [];

  return fs.readdirSync(minisseriesDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^\d+$/.test(entry.name))
    .map(entry => normalizeCampaignNumber(entry.name))
    .sort(naturalCompare)
    .map(number => inspectFinalMinisserieProject(root, number));
}

function buildImageConcatFile(imagePaths, perImageSeconds) {
  let content = '';
  for (const imagePath of imagePaths) {
    content += `file '${escapeConcatPath(imagePath)}'\n`;
    content += `duration ${perImageSeconds.toFixed(6)}\n`;
  }
  content += `file '${escapeConcatPath(imagePaths[imagePaths.length - 1])}'\n`;
  return content;
}

function buildSinglePassCommand({
  ffmpegPath,
  intro1Path,
  intro2Path,
  middleMp4Path,
  imageListPath,
  logoPath,
  audioPath,
  assPath,
  fontsDir,
  outputPath,
  intro1Seconds,
  intro2Seconds,
  middleSeconds,
  outroSeconds,
  totalSeconds
}) {
  const intro1Duration = intro1Seconds.toFixed(6);
  const intro2Duration = intro2Seconds.toFixed(6);
  const middleDuration = middleSeconds.toFixed(6);
  const outroDuration = outroSeconds.toFixed(6);
  const totalDuration = totalSeconds.toFixed(6);
  const intro2DelayMs = Math.max(0, Math.round(intro1Seconds * 1000));
  const outroDelayMs = Math.max(0, Math.round((totalSeconds - outroSeconds) * 1000));
  const escapedAss = escapeFilterPath(assPath);
  const escapedFonts = escapeFilterPath(fontsDir);
  const normalizeVideo = 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,fps=24,format=yuv420p';

  const filters = [
    `[0:v:0]trim=duration=${intro1Duration},setpts=PTS-STARTPTS,${normalizeVideo}[intro1_v]`,
    `[1:v:0]trim=duration=${intro2Duration},setpts=PTS-STARTPTS,${normalizeVideo}[intro2_v]`,
    `[2:v:0]trim=duration=${middleDuration},setpts=PTS-STARTPTS,${normalizeVideo}[images_v]`,
    `[3:v:0]trim=duration=${outroDuration},setpts=PTS-STARTPTS,${normalizeVideo}[outro_v]`,
    `[intro1_v][intro2_v][images_v][outro_v]concat=n=4:v=1:a=0[visual]`,
    `[visual]subtitles='${escapedAss}':fontsdir='${escapedFonts}'[video_out]`,
    `[4:a:0]atrim=duration=${totalDuration},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume=1[m4a_audio]`,
    `[0:a:0]atrim=duration=${intro1Duration},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume=1[intro1_audio]`,
    `[1:a:0]atrim=duration=${intro2Duration},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume=1,adelay=${intro2DelayMs}:all=1[intro2_audio]`,
    `[3:a:0]atrim=duration=${outroDuration},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume=1,adelay=${outroDelayMs}:all=1[outro_audio]`,
    `[m4a_audio][intro1_audio][intro2_audio][outro_audio]amix=inputs=4:duration=first:dropout_transition=0:weights='1 1 1 1':normalize=0,alimiter=limit=0.98:level=false:latency=true[audio_out]`
  ].join(';');

  const middleSource = middleMp4Path || imageListPath;
  const isConcatList = !middleMp4Path && imageListPath;
  const middleInputArg = isConcatList
    ? `-r 25 -f concat -safe 0 -i "${middleSource}"`
    : `-i "${middleSource}"`;

  return `${ffmpegPath} -y -i "${intro1Path}" -i "${intro2Path}" ${middleInputArg} -i "${logoPath}" -i "${audioPath}" -filter_complex "${filters}" -map "[video_out]" -map "[audio_out]" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 192k -t ${totalDuration} -movflags +faststart "${outputPath}"`;
}

function createFinalMinisserieRenderer({ root, videoService }) {
  if (!root || !videoService) throw new Error('Dependências do renderizador final ausentes.');

  async function renderFinalMinisserieVideo(payload = {}) {
    const assets = resolveFinalMinisserieAssets(root, payload.campaignNum || payload.campaignId || '01', payload.m4aFile);
    const missing = buildMissingAssetList(assets);
    if (missing.length > 0) {
      throw new Error(`Renderização bloqueada. Arquivos ausentes ou conflitantes: ${missing.join('; ')}.`);
    }

    const currentFinalFile = findFinalVideoFile(assets.videoSocialDir, assets.number);
    const currentFinalPath = currentFinalFile
      ? path.join(assets.videoSocialDir, currentFinalFile)
      : null;
    if (currentFinalPath && payload.overwrite !== true) {
      throw new Error(`O vídeo final da minissérie ${assets.number} já existe. Confirme a substituição no Acervo.`);
    }

    const [audioProbe, intro1Probe, intro2Probe, logoProbe] = await Promise.all([
      videoService.probeMediaFile(assets.audioPath),
      videoService.probeMediaFile(assets.intro1Path),
      videoService.probeMediaFile(assets.intro2Path),
      videoService.probeMediaFile(assets.logoPath)
    ]);

    if (!audioProbe.hasAudio) throw new Error('O M4A não possui fluxo de áudio válido.');
    if (!intro1Probe.hasVideo || !intro1Probe.hasAudio) throw new Error('flow/master_1.mp4 precisa conter vídeo e áudio.');
    if (!intro2Probe.hasVideo || !intro2Probe.hasAudio) throw new Error('flow/master_2.mp4 precisa conter vídeo e áudio.');
    if (!logoProbe.hasVideo || !logoProbe.hasAudio) throw new Error('logo/logo.mp4 precisa conter vídeo e áudio.');

    const totalSeconds = audioProbe.duration;
    const intro1Seconds = intro1Probe.duration;
    const intro2Seconds = intro2Probe.duration;
    const outroSeconds = logoProbe.duration;
    const middleSeconds = totalSeconds - intro1Seconds - intro2Seconds - outroSeconds;
    if (!(middleSeconds > 0)) {
      throw new Error('O M4A precisa ser maior que a soma dos vídeos Master (1 e 2) e da logo.');
    }
    const perImageSeconds = middleSeconds / assets.imagePaths.length;

    fs.mkdirSync(assets.videoSocialDir, { recursive: true });
    const stagingDir = path.join(assets.videoSocialDir, '.render-staging');
    fs.mkdirSync(stagingDir, { recursive: true });
    const runToken = `${assets.number}_${Date.now()}_${process.pid}`;
    const imageListPath = path.join(stagingDir, `${runToken}_imagens.txt`);
    const middleMp4Path = path.join(stagingDir, `${runToken}_middle.mp4`);
    const stagingOutputPath = path.join(stagingDir, `${runToken}.mp4`);
    const fontsDir = path.join(root, 'fonts', 'Space_Grotesk');
    const ffmpegPath = videoService.getFfmpegPath();

    const stagingImages = [];
    const conversionPromises = [];

    for (let i = 0; i < assets.imagePaths.length; i++) {
      const src = assets.imagePaths[i];
      const target = path.join(stagingDir, `${runToken}_frame_${String(i + 1).padStart(3, '0')}.jpg`);
      stagingImages.push(target);
      conversionPromises.push(
        videoService.execFfmpegAsync(
          `${ffmpegPath} -y -i "${src}" -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1" -pix_fmt yuvj420p -q:v 2 "${target}"`,
          30000
        )
      );
    }

    if (conversionPromises.length > 0) {
      await Promise.all(conversionPromises);
    }

    for (const framePath of stagingImages) {
      if (!fs.existsSync(framePath) || fs.statSync(framePath).size <= 0) {
        throw new Error(`Falha na preparação do frame de staging para renderização: ${path.basename(framePath)}`);
      }
    }

    fs.writeFileSync(imageListPath, buildImageConcatFile(stagingImages, perImageSeconds), 'utf8');

    const cmdMiddle = `${ffmpegPath} -y -f concat -safe 0 -i "${imageListPath}" -vf "fps=24,format=yuv420p" -c:v libx264 -preset ultrafast "${middleMp4Path}"`;
    await videoService.execFfmpegAsync(cmdMiddle, 10 * 60 * 1000);

    const command = buildSinglePassCommand({
      ffmpegPath,
      intro1Path: assets.intro1Path,
      intro2Path: assets.intro2Path,
      middleMp4Path,
      logoPath: assets.logoPath,
      audioPath: assets.audioPath,
      assPath: assets.assPath,
      fontsDir,
      outputPath: stagingOutputPath,
      intro1Seconds,
      intro2Seconds,
      middleSeconds,
      outroSeconds,
      totalSeconds
    });

    try {
      await videoService.execFfmpegAsync(command, 20 * 60 * 1000);
      const outputProbe = await videoService.probeMediaFile(stagingOutputPath);
      if (!outputProbe.hasVideo || !outputProbe.hasAudio) {
        throw new Error('O MP4 de staging não contém vídeo e áudio válidos.');
      }
      if (Math.abs(outputProbe.duration - totalSeconds) > 0.5) {
        throw new Error(`Duração final divergente do M4A: ${outputProbe.duration.toFixed(3)}s versus ${totalSeconds.toFixed(3)}s.`);
      }

      const displacedPath = currentFinalPath ? path.join(stagingDir, `${runToken}_anterior.mp4`) : null;
      if (currentFinalPath) fs.renameSync(currentFinalPath, displacedPath);
      try {
        fs.renameSync(stagingOutputPath, assets.finalPath);
      } catch (promotionError) {
        if (displacedPath && fs.existsSync(displacedPath)) fs.renameSync(displacedPath, currentFinalPath);
        throw promotionError;
      }
      if (displacedPath && fs.existsSync(displacedPath)) fs.unlinkSync(displacedPath);

      const finalStat = fs.statSync(assets.finalPath);
      return {
        success: true,
        ok: true,
        campaignNum: assets.number,
        mode: 'final-minisserie-single-pass',
        imageCount: assets.imagePaths.length,
        totalAudioSec: totalSeconds,
        intro1Sec: intro1Seconds,
        intro2Sec: intro2Seconds,
        outroSec: outroSeconds,
        middleSec: middleSeconds,
        perImageSec: perImageSeconds,
        finalMp4Name: assets.finalFileName,
        finalMp4Path: assets.finalPath,
        videoUrl: `/minisseries/video%20social/${encodeURIComponent(assets.finalFileName)}`,
        sizeMb: `${(finalStat.size / (1024 * 1024)).toFixed(1)} MB`,
        width: outputProbe.width,
        height: outputProbe.height,
        fps: 24
      };
    } finally {
      for (const stagedImg of stagingImages) {
        if (fs.existsSync(stagedImg)) try { fs.unlinkSync(stagedImg); } catch(e) {}
      }
      if (fs.existsSync(imageListPath)) try { fs.unlinkSync(imageListPath); } catch(e) {}
      if (fs.existsSync(middleMp4Path)) try { fs.unlinkSync(middleMp4Path); } catch(e) {}
      if (fs.existsSync(stagingOutputPath)) try { fs.unlinkSync(stagingOutputPath); } catch(e) {}
      if (fs.existsSync(stagingDir)) try {
        if (fs.readdirSync(stagingDir).length === 0) fs.rmdirSync(stagingDir);
      } catch(e) {}
    }
  }

  return { renderFinalMinisserieVideo };
}

module.exports = {
  createFinalMinisserieRenderer,
  normalizeCampaignNumber,
  resolveFinalMinisserieAssets,
  inspectFinalMinisserieProject,
  listFinalMinisserieCatalog,
  buildImageConcatFile,
  buildSinglePassCommand
};
