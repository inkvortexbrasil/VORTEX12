const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const apiDir = path.resolve(__dirname, '..');
const serverSource = fs.readFileSync(path.join(apiDir, 'server.js'), 'utf8');
const audioServiceSource = fs.readFileSync(path.join(apiDir, 'services', 'audio_service.js'), 'utf8');

test('Whisper recebe somente o arquivo de áudio', () => {
  assert.match(audioServiceSource, /form\.append\(['"]file['"]/);
  assert.match(audioServiceSource, /form\.append\(['"]model['"],\s*['"]whisper-1['"]\)/);

  const activeLines = audioServiceSource
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');

  assert.doesNotMatch(activeLines, /form\.append\(['"]prompt['"]/);
  assert.doesNotMatch(audioServiceSource, /lyricsPrompt/);
});

test('rota de transcrição delega ao alinhador oficial', () => {
  const start = serverSource.indexOf('async function apiTranscribeM4AVideo(payload)');
  const end = serverSource.indexOf('async function apiRenderM4AVideoFinal(payload)', start);
  assert.ok(start >= 0 && end > start, 'Rota de transcrição oficial não localizada.');

  const routeFunction = serverSource.slice(start, end);
  assert.match(routeFunction, /alignM4AText\(targetAudio, AUDIO_TIKTOK_ASS_OPTIONS\)/);
  assert.doesNotMatch(routeFunction, /voxtral|mistral/i);
});

test('áudio com capa usa somente uma passagem FFmpeg', () => {
  const start = serverSource.indexOf('async function renderAudioAssSinglePass');
  const end = serverSource.indexOf('async function apiGenerateM4AASS', start);
  assert.ok(start >= 0 && end > start, 'Renderizador oficial não localizado.');

  const rendererFunction = serverSource.slice(start, end);
  assert.match(rendererFunction, /mode: 'audio-cover-single-pass'/);
  assert.match(rendererFunction, /subtitles='\$\{escapedAssPath\}'/);
  assert.doesNotMatch(rendererFunction, /baseMp4Path|\.render-temp|PASSAGEM 1\/2/);
});
