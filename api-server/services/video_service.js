const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const { getFfmpegDir } = require('../utils/paths');

function getFfmpegPath() {
  const ffmpegDir = getFfmpegDir();
  const ffmpegPath = path.join(ffmpegDir, 'bin', 'ffmpeg.exe');
  if (!fs.existsSync(ffmpegPath)) {
    throw new Error(`FFmpeg local não encontrado: ${ffmpegPath}`);
  }
  return `"${ffmpegPath}"`;
}

function getFfprobePath() {
  const ffmpegDir = getFfmpegDir();
  const ffprobePath = path.join(ffmpegDir, 'bin', 'ffprobe.exe');
  if (!fs.existsSync(ffprobePath)) {
    throw new Error(`FFprobe local não encontrado: ${ffprobePath}`);
  }
  return `"${ffprobePath}"`;
}

async function getAudioDurationStr(audioPath) {
  try {
    const cmd = `${getFfprobePath()} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
    const { stdout } = await execPromise(cmd);
    return stdout.trim();
  } catch(e) {
    return '180';
  }
}

async function probeMediaFile(mediaPath) {
  if (!mediaPath || !fs.existsSync(mediaPath)) {
    throw new Error(`Arquivo de mídia não encontrado: ${mediaPath || '(caminho vazio)'}`);
  }

  const cmd = `${getFfprobePath()} -v error -show_entries format=duration -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels -of json "${mediaPath}"`;
  try {
    const { stdout } = await execPromise(cmd);
    const data = JSON.parse(stdout);
    const duration = Number.parseFloat(data?.format?.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('duração ausente ou inválida');
    }

    const streams = Array.isArray(data.streams) ? data.streams : [];
    const videoStream = streams.find(stream => stream.codec_type === 'video') || null;
    const audioStream = streams.find(stream => stream.codec_type === 'audio') || null;
    return {
      duration,
      hasVideo: Boolean(videoStream),
      hasAudio: Boolean(audioStream),
      width: Number(videoStream?.width) || null,
      height: Number(videoStream?.height) || null,
      frameRate: videoStream?.r_frame_rate || null,
      videoCodec: videoStream?.codec_name || null,
      audioCodec: audioStream?.codec_name || null,
      sampleRate: Number(audioStream?.sample_rate) || null,
      channels: Number(audioStream?.channels) || null
    };
  } catch (error) {
    throw new Error(`FFprobe não conseguiu validar ${path.basename(mediaPath)}: ${error.message || error}`);
  }
}

async function execFfmpegAsync(cmd, timeoutMs = 300000) {
  try {
    const { stdout } = await execPromise(cmd, { timeout: timeoutMs });
    return stdout;
  } catch (error) {
    const stderrDetail = error.stderr ? ` | stderr: ${error.stderr.slice(0,500)}` : '';
    throw new Error('Erro FFmpeg: ' + error.message + stderrDetail);
  }
}

module.exports = {
  getFfmpegPath,
  getFfprobePath,
  getAudioDurationStr,
  probeMediaFile,
  execFfmpegAsync
};
