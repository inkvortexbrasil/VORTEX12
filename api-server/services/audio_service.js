const fs = require('fs');
const path = require('path');
const contractParser = require('../contract_parser');
const videoService = require('./video_service');

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

async function generateTranscriptionData(audioFilePath, promptText = '') {
  let lyricsTxt = promptText;
  if (!lyricsTxt) {
    const dir = path.dirname(audioFilePath);
    const base = path.basename(audioFilePath, path.extname(audioFilePath)).replace(/ legendado$/i, '');
    if (fs.existsSync(dir)) {
      const txtFiles = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.txt'));
      const txtMatch = txtFiles.find(f => f.toLowerCase() === `${base.toLowerCase()}.txt`) || txtFiles[0];
      if (txtMatch && fs.existsSync(path.join(dir, txtMatch))) {
        lyricsTxt = fs.readFileSync(path.join(dir, txtMatch), 'utf8');
      }
    }
  }

  const alignedWords = await alignAudioAndText(audioFilePath, lyricsTxt);
  
  const words = alignedWords.map(w => ({
    word: w.word,
    start: w.start,
    end: w.end
  }));

  return { words, segments: words };
}

async function transcribeAudioWithOpenAIWhisper(audioPath) {
  const fs = require('fs');
  const path = require('path');
  const openaiApiKey = env('OPENAI_API_KEY', '');
  if (!openaiApiKey) throw new Error('OPENAI_API_KEY nÃ£o configurada no .env');

  console.log(`ðŸŽ™ï¸ Transcrevendo Ã¡udio via OpenAI Whisper-1 (somente M4A)...`);
  const fileBuffer = fs.readFileSync(audioPath);
  const fileBlob = new Blob([fileBuffer], { type: 'audio/m4a' });
  const form = new FormData();
  form.append('file', fileBlob, path.basename(audioPath));
  form.append('model', 'whisper-1');
  form.append('language', 'pt');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiApiKey}` },
    body: form
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error('Erro na API da OpenAI (Whisper-1): ' + (data.error?.message || JSON.stringify(data)));
  }

  const words = [];
  if (data.words && Array.isArray(data.words)) {
    data.words.forEach(w => {
      if (w.word && String(w.word).trim()) {
        words.push({
          word: String(w.word).trim(),
          start: Number(w.start || 0),
          end: Number(w.end || 0)
        });
      }
    });
  } else if (data.segments && Array.isArray(data.segments)) {
    data.segments.forEach(seg => {
      if (seg.words && seg.words.length > 0) {
        seg.words.forEach(w => {
          words.push({
            word: String(w.word || '').trim(),
            start: Number(w.start || 0),
            end: Number(w.end || 0)
          });
        });
      } else if (seg.text) {
        const segWords = seg.text.trim().split(/\s+/).filter(Boolean);
        const segStart = Number(seg.start || 0);
        const segEnd = Number(seg.end || segStart + 1.0);
        const step = (segEnd - segStart) / segWords.length;
        segWords.forEach((w, idx) => {
          words.push({
            word: w.trim(),
            start: segStart + idx * step,
            end: segStart + (idx + 1) * step
          });
        });
      }
    });
  }

  return words;
}

async function alignAudioAndText(audioPath, lyricsTxt) {
  const fs = require('fs');
  const path = require('path');

  const openaiApiKey = env('OPENAI_API_KEY', '');
  if (!openaiApiKey) throw new Error('OPENAI_API_KEY não configurada no .env');

  let aiWords = null;
  try {
    const openAiWords = await transcribeAudioWithOpenAIWhisper(audioPath);
    if (openAiWords && openAiWords.length > 0) {
      console.log(`✅ OpenAI Whisper-1 respondeu com ${openAiWords.length} palavras ancoradas com sucesso!`);
      aiWords = openAiWords;
    }
  } catch(e) {
    throw new Error(`OpenAI Whisper falhou: ${e.message}`);
  }

  if (!aiWords || aiWords.length === 0) {
    throw new Error("A IA (Whisper) não retornou nenhuma palavra válida no áudio enviado.");
  }

  let textToAlign = lyricsTxt;
  if (!textToAlign) {
    textToAlign = 'NO_ALIGN';
  }

  let totalDuration = 180;
  try {
    const durStr = await videoService.getAudioDurationStr(audioPath);
    totalDuration = parseFloat(durStr) || 180;
  } catch(e) {}

  if (textToAlign === 'NO_ALIGN') {
    return aiWords;
  }

  const lines = textToAlign.split(/\r?\n/);
  const correctWords = [];
  lines.forEach((line, lineIdx) => {
    const cleanLine = line.replace(/\[[^\]]+\]/g, '').trim();
    if (!cleanLine) return;
    
    const wordsInLine = cleanLine.split(/\s+/).filter(Boolean);
    wordsInLine.forEach(w => {
      const cleaned = w.replace(/[()]/g, '');
      if (cleaned) {
        correctWords.push({ word: w, lineIdx });
      }
    });
  });

  if (correctWords.length === 0) {
    return aiWords;
  }

  const n = correctWords.length;
  const m = aiWords.length;

  function normalizeWord(str) {
    return str.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "");
  }

  // Needleman-Wunsch algorithm with custom weights
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const traceback = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  const GAP_TXT = -1.5;
  const GAP_AI = -1.5;
  const MATCH = 2.0;
  const MISMATCH = -0.5;

  for (let i = 1; i <= n; i++) {
    dp[i][0] = dp[i-1][0] + GAP_TXT;
    traceback[i][0] = 1;
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = dp[0][j-1] + GAP_AI;
    traceback[0][j] = 2;
  }

  for (let i = 1; i <= n; i++) {
    const normA = normalizeWord(correctWords[i - 1].word);
    for (let j = 1; j <= m; j++) {
      const normB = normalizeWord(aiWords[j - 1].word);
      const score = (normA === normB) ? MATCH : MISMATCH;
      
      const matchScore = dp[i - 1][j - 1] + score;
      const skipTxtScore = dp[i - 1][j] + GAP_TXT;
      const skipAiScore = dp[i][j - 1] + GAP_AI;
      
      if (matchScore >= skipTxtScore && matchScore >= skipAiScore) {
        dp[i][j] = matchScore;
        traceback[i][j] = 0;
      } else if (skipTxtScore >= skipAiScore) {
        dp[i][j] = skipTxtScore;
        traceback[i][j] = 1;
      } else {
        dp[i][j] = skipAiScore;
        traceback[i][j] = 2;
      }
    }
  }

  // Backtrack
  let i = n, j = m;
  const alignment = [];
  while (i > 0 || j > 0) {
    if (traceback[i][j] === 0) {
      alignment.push({ txtIdx: i - 1, aiIdx: j - 1 });
      i--; j--;
    } else if (traceback[i][j] === 1) {
      alignment.push({ txtIdx: i - 1, aiIdx: null });
      i--;
    } else if (traceback[i][j] === 2) {
      j--;
    }
  }
  alignment.reverse();

  // Mapeia as palavras corretas do TXT e preenche com os tempos reais do Whisper-1.
  const alignedWords = correctWords.map((cw, idx) => {
    const alignInfo = alignment.find(a => a.txtIdx === idx);
    if (alignInfo && alignInfo.aiIdx !== null) {
      const mw = aiWords[alignInfo.aiIdx];
      return {
        word: cw.word,
        lineIdx: cw.lineIdx,
        start: mw.start,
        end: mw.end,
        matched: true
      };
    }
    return {
      word: cw.word,
      lineIdx: cw.lineIdx,
      start: null,
      end: null,
      matched: false
    };
  });

  // InterpolaÃ§Ã£o proporcional precisa para cobrir eventuais palavras puladas
  let lastMatchedIdx = -1;
  for (let idx = 0; idx < alignedWords.length; idx++) {
    if (alignedWords[idx].matched) {
      interpolateRange(alignedWords, lastMatchedIdx, idx);
      lastMatchedIdx = idx;
    }
  }
  interpolateRange(alignedWords, lastMatchedIdx, alignedWords.length);

  function interpolateRange(wordsList, startIdx, endIdx) {
    const count = endIdx - startIdx - 1;
    if (count <= 0) return;

    let tL = 0;
    if (startIdx >= 0) {
      tL = wordsList[startIdx].end;
    }

    if (endIdx >= wordsList.length) {
      // Palavras finais da mÃºsica: distribui atÃ© o fim real da voz (totalDuration - 3s)
      const vocalEndLimit = Math.max(tL + count * 0.5, totalDuration - 3.1);
      const remainingTime = vocalEndLimit - tL;
      const step = remainingTime / count;
      for (let p = 1; p <= count; p++) {
        const targetIdx = startIdx + p;
        const startTempo = tL + (p - 1) * step;
        let endTempo = tL + p * step;
        if (endTempo - startTempo > 0.8) {
          endTempo = startTempo + 0.8;
        }
        wordsList[targetIdx].start = startTempo;
        wordsList[targetIdx].end = endTempo;
      }
      return;
    }

    let tR = totalDuration;
    if (endIdx < wordsList.length) {
      tR = wordsList[endIdx].start;
    }

    const gap = tR - tL;
    for (let p = 1; p <= count; p++) {
      const targetIdx = startIdx + p;
      const startTempo = tL + gap * ((p - 1) / count);
      let endTempo = tL + gap * (p / count);
      if (endTempo - startTempo > 0.8) {
        endTempo = startTempo + 0.8;
      }
      wordsList[targetIdx].start = startTempo;
      wordsList[targetIdx].end = endTempo;
    }
  }

  return alignedWords;
}

function buildAssFromEditedRawText(alignedWords, editedRawText, assOptions = {}) {
  const { generateTikTokAssScript } = require('../ass_generator.js');
  if (!alignedWords || !Array.isArray(alignedWords) || alignedWords.length === 0) {
    throw new Error('Alinhamento original de tempos ausente.');
  }

  if (!editedRawText || !String(editedRawText).trim()) {
    const { assContent } = generateTikTokAssScript(alignedWords, assOptions);
    return assContent;
  }

  const editedWords = String(editedRawText).trim().split(/\s+/).filter(Boolean);
  const mappedWords = editedWords.map((wordStr, idx) => {
    if (idx < alignedWords.length) {
      return {
        word: wordStr,
        start: alignedWords[idx].start,
        end: alignedWords[idx].end
      };
    } else {
      const last = alignedWords[alignedWords.length - 1] || { start: 0, end: 1 };
      const extraOffset = (idx - alignedWords.length + 1) * 0.4;
      return {
        word: wordStr,
        start: last.end + extraOffset,
        end: last.end + extraOffset + 0.35
      };
    }
  });

  const { assContent } = generateTikTokAssScript(mappedWords, assOptions);
  return assContent;
}

function autocorrectPortugueseWords(alignedWords) {
  if (!alignedWords || !Array.isArray(alignedWords)) return alignedWords;

  const replacements = {
    'artÃ­culas': 'partÃ­culas',
    'articula': 'partÃ­cula',
    'articulada': 'particulada',
    'fotons': 'fÃ³tons',
    'foton': 'fÃ³ton',
    'estacoes': 'estaÃ§Ãµes',
    'estacao': 'estaÃ§Ã£o',
    'invisivel': 'invisÃ­vel',
    'perceptivel': 'perceptÃ­vel',
    'atomo': 'Ã¡tomo',
    'grao': 'grÃ£o',
    'graos': 'grÃ£os',
    'angulo': 'Ã¢ngulo',
    'sobra': 'sombra',
    'frequencia': 'frequÃªncia',
    'materia': 'matÃ©ria',
    'nanodimensao': 'nanodimensÃ£o',
    'ilusao': 'ilusÃ£o',
    'caleidoscopio': 'caleidoscÃ³pio',
    'tatil': 'tÃ¡til',
    'fisica': 'fÃ­sica',
    'danca': 'danÃ§a',
    'misterio': 'mistÃ©rio',
    'vibracoes': 'vibraÃ§Ãµes',
    'dimensoes': 'dimensÃµes',
    'vortice': 'vÃ³rtice',
    'vortices': 'vÃ³rtices',
    'codigo': 'cÃ³digo'
  };

  return alignedWords.map(item => {
    if (!item || !item.word) return item;
    const cleanLower = item.word.toLowerCase().replace(/[.,!?;:]/g, '');
    if (replacements[cleanLower]) {
      const punct = item.word.match(/[.,!?;:]+$/);
      const suffix = punct ? punct[0] : '';
      const corrected = replacements[cleanLower];
      const isUpper = (item.word[0] === item.word[0].toUpperCase() && item.word[0] !== item.word[0].toLowerCase());
      const finalWord = isUpper ? corrected.charAt(0).toUpperCase() + corrected.slice(1) : corrected;
      return { ...item, word: finalWord + suffix };
    }
    return item;
  });
}

async function alignM4AText(audioPath, assOptions = {}) {
  const fs = require('fs');
  const path = require('path');
  console.log(`ðŸŽ™ï¸ Alinhando Ã¡udio integral via OpenAI Whisper-1...`);

  let lyricsTxt = assOptions.lyricsTxt || null;
  if (!lyricsTxt && fs.existsSync(path.dirname(audioPath))) {
    const m4aDir = path.dirname(audioPath);
    const baseName = path.basename(audioPath, path.extname(audioPath));
    const exactTxtPath = path.join(m4aDir, `${baseName}.txt`);

    if (fs.existsSync(exactTxtPath)) {
      lyricsTxt = fs.readFileSync(exactTxtPath, 'utf8');
      console.log(`ðŸ“„ Letra mestre lida com nome idÃªntico ao M4A: ${baseName}.txt`);
    } else {
      const files = fs.readdirSync(m4aDir);
      const txtFile = files.find(f => f.toLowerCase() === `${baseName.toLowerCase()}.txt`) || files.find(f => f.toLowerCase().endsWith('.txt'));
      if (txtFile) {
        lyricsTxt = fs.readFileSync(path.join(m4aDir, txtFile), 'utf8');
        console.log(`ðŸ“„ Letra mestre lida do arquivo: ${txtFile}`);
      }
    }
  }

  const rawaiWords = await alignAudioAndText(audioPath, lyricsTxt);
  const alignedWords = lyricsTxt ? rawaiWords : autocorrectPortugueseWords(rawaiWords);

  const { generateTikTokAssScript } = require('../ass_generator.js');
  const { assContent } = generateTikTokAssScript(alignedWords, { ...assOptions, lyricsTxt });
  const rawText = alignedWords.map(w => w.word).join(' ');

  return { assContent, rawText, alignedWords };
}

module.exports = {
  generateTranscriptionData,
  alignAudioAndText,
  alignM4AText,
  buildAssFromEditedRawText,
  autocorrectPortugueseWords
};

