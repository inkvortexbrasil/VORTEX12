const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  scanMediaSources,
  formatDuration,
  getMediaDuration,
  getFFmpegPath
} = require('../services/social_mixer_service');

test('Contrato Social Mixer: scan de fontes e formatação de duração', () => {
  // 1. Validação de formatação de tempo
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(60), '01:00');
  assert.equal(formatDuration(19 * 60), '19:00');
  assert.equal(formatDuration(3600 + 19 * 60 + 5), '01:19:05');

  // 2. Validação do scan de fontes
  const sources = scanMediaSources();
  assert.ok(Array.isArray(sources.videos), 'Deve retornar array de vídeos');
  assert.ok(Array.isArray(sources.audios), 'Deve retornar array de áudios');

  // Valida que encontrou os arquivos presentes em C:\voyage ou stacher
  if (sources.videos.length > 0) {
    const v = sources.videos[0];
    assert.ok(v.name, 'Vídeo deve ter nome');
    assert.ok(v.filePath, 'Vídeo deve ter filePath');
    assert.ok(typeof v.durationSec === 'number', 'Vídeo deve ter durationSec numérico');
  }

  if (sources.audios.length > 0) {
    const a = sources.audios[0];
    assert.ok(a.name, 'Áudio deve ter nome');
    assert.ok(a.filePath, 'Áudio deve ter filePath');
    assert.ok(['.opus', '.m4a', '.mp3', '.wav', '.aac', '.ogg', '.flac'].includes(a.ext), 'Áudio deve ter extensão válida');
  }
});

test('Contrato Social Mixer: binário FFmpeg disponível', () => {
  const ffmpeg = getFFmpegPath();
  assert.ok(typeof ffmpeg === 'string' && ffmpeg.length > 0, 'FFmpeg path deve ser válido');
});
