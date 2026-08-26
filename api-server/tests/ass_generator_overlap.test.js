const test = require('node:test');
const assert = require('node:assert/strict');
const { generateTikTokAssScript } = require('../ass_generator');

function parseTime(value) {
  const match = /^(\d+):(\d{2}):(\d{2})\.(\d{2})$/.exec(value);
  assert.ok(match, `Tempo ASS inválido: ${value}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 100;
}

test('limita a quatro palavras e não sobrepõe frases consecutivas', () => {
  const words = [
    { word: 'uma', start: 1.00, end: 1.08, lineIdx: 0 },
    { word: 'frase', start: 1.10, end: 1.18, lineIdx: 0 },
    { word: 'com', start: 1.20, end: 1.28, lineIdx: 0 },
    { word: 'quatro', start: 1.30, end: 1.38, lineIdx: 0 },
    { word: 'outra', start: 1.40, end: 1.48, lineIdx: 0 },
    { word: 'frase', start: 1.50, end: 1.58, lineIdx: 0 },
    { word: 'entra', start: 1.60, end: 1.68, lineIdx: 0 },
    { word: 'agora', start: 1.70, end: 1.78, lineIdx: 0 }
  ];

  const { assContent } = generateTikTokAssScript(words, {
    playResX: 1080,
    playResY: 1080,
    maxWordsPerPhrase: 4
  });

  const events = assContent
    .split(/\r?\n/)
    .filter(line => line.startsWith('Dialogue:'))
    .map(line => {
      const match = /^Dialogue: [^,]+,([^,]+),([^,]+),[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,(.*)$/.exec(line);
      assert.ok(match, `Evento ASS inválido: ${line}`);
      const visibleText = match[3].replace(/\{[^}]*\}/g, '').trim();
      return {
        start: parseTime(match[1]),
        end: parseTime(match[2]),
        visibleText
      };
    });

  assert.equal(events.length, words.length);
  for (const event of events) {
    assert.ok(event.end > event.start, 'Cada palavra precisa ter duração positiva.');
    assert.ok(event.visibleText.split(/\s+/).length <= 4, 'Uma frase ultrapassou quatro palavras.');
  }
  for (let index = 1; index < events.length; index += 1) {
    assert.ok(events[index - 1].end <= events[index].start, 'Duas frases ficaram visíveis simultaneamente.');
  }
});
