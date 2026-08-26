const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const diff = require('diff');

const { getFfmpegDir } = require('./utils/paths');

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

// 1. Concatena múltiplos arquivos MP3 de forma fluida em um único áudio contínuo
function concatAudioTracks(mp3List, outputPath) {
  return new Promise((resolve, reject) => {
    if (!mp3List || mp3List.length === 0) {
      return reject(new Error('Nenhuma trilha MP3 fornecida para concatenação.'));
    }
    // Usamos apad para preencher com silÃƒÂªncio e atrim para cortar em 60s exatos.
    const inputs = mp3List.map(p => `-i "${p}"`).join(' ');
    
    let filterString = '';
    for (let i = 0; i < mp3List.length; i++) {
        filterString += `[${i}:a]`;
    }
    filterString += `concat=n=${mp3List.length}:v=0:a=1[outa]`;

    const cmd = `${getFfmpegPath()} -y ${inputs} -filter_complex "${filterString}" -map "[outa]" -c:a libmp3lame -b:a 192k "${outputPath}"`;
    
    exec(cmd, (err) => {
      if (err) return reject(err);
      resolve(outputPath);
    });
  });
}

// 2. Mede a duraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o total em segundos do arquivo de ÃƒÆ’Ã‚Â¡udio
function getAudioDuration(audioPath) {
  return new Promise((resolve) => {
    const cmd = `${getFfprobePath()} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
    exec(cmd, (err, stdout) => {
      if (err || !stdout) {
        resolve(60); // fallback 60s
      } else {
        const dur = parseFloat(stdout.trim());
        resolve(isNaN(dur) ? 60 : dur);
      }
    });
  });
}

function formatDurationSec(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatStrophicText(text, maxWordsPerLine = 5) {
  // NormalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o total: remove quebras reais, ASS \N existentes, aspas e espaÃƒÆ’Ã‚Â§os extras
  const clean = text
    .replace(/\\N/g, ' ')      // remove ASS hard-breaks que possam vir no texto
    .replace(/[\r\n]+/g, ' ')  // remove quebras de linha reais
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')      // colapsa mÃƒÆ’Ã‚Âºltiplos espaÃƒÆ’Ã‚Â§os em um ÃƒÆ’Ã‚Âºnico
    .trim();

  const words = clean.split(' ').filter(Boolean);

  // REGRA PROIBITIVA: SEMPRE fatia em chunks de maxWordsPerLine, sem exceÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  // Nenhuma linha pode ter mais de maxWordsPerLine palavras
  const lines = [];
  for (let i = 0; i < words.length; i += maxWordsPerLine) {
    lines.push(words.slice(i, i + maxWordsPerLine).join(' '));
  }
  return lines.join('\\N');
}


// 3. Gera o arquivo de Legendas ASS FluÃƒÆ’Ã‚Â­das em Estrofes Compactas no Centro da Tela (Alignment: 5)
function generateDocumentaryAssScript(sections, totalDuration) {
  // ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ASS 1920x1080 (Full HD Horizontal) com Legenda em Estrofe Centralizada (Alignment: 5)
  const header = `[Script Info]
Title: Multiverso DocumentÃƒÆ’Ã‚Â¡rios 9.0 Legendas EstrÃƒÆ’Ã‚Â³ficas Centralizadas
ScriptType: v4.00+
WrapStyle: 2
ScaledBorderAndShadow: yes
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: DocSubtitle,Montserrat,48,&H00FFFFFF,&H0000E6FF,&H00000000,&H99000000,1,0,0,0,100,100,0,0,1,1.5,3.5,2,150,150,85,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  function formatTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.floor((sec % 1) * 100);
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  }

  const numSections = sections.length;
  const sectionDuration = totalDuration / (numSections || 1);
  let events = '';

  sections.forEach((sec, sIdx) => {
    const secStartT = sIdx * sectionDuration;
    const lines = sec.lines || [];

    if (lines.length > 0) {
      const lineDuration = sectionDuration / lines.length;
      lines.forEach((lineText, lIdx) => {
        const lineStart = secStartT + (lIdx * lineDuration);
        const lineEnd = secStartT + ((lIdx + 1) * lineDuration);

        // Formata o texto em estrofes compactas de NO MÃƒÆ’Ã‚ÂXIMO 6 PALAVRAS POR LINHA
        const strophicText = formatStrophicText(lineText, 5);

        events += `Dialogue: 0,${formatTime(lineStart)},${formatTime(lineEnd)},DocSubtitle,,0,0,0,,${strophicText}\n`;
      });
    }
  });

  return header + events;
}

// ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¬ MOTOR POLIVALENTE ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Âudio manda, tudo calculado do que existe na pasta
// sections = [{ title, lines: string[], duration: number }]
//   duration  = duraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do ÃƒÆ’Ã‚Â¡udio daquela campanha em segundos
//   lines     = frases de legenda (qualquer quantidade)
// subtitleSec = override opcional; se 0 (padrÃƒÆ’Ã‚Â£o), calcula dinamicamente
function generateReassembleAssScript(sections, subtitleSec = 0) {
  const header = `[Script Info]
Title: VORTEX10 Remontagem Polivalente
ScriptType: v4.00+
WrapStyle: 2
ScaledBorderAndShadow: yes
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: DocSubtitle,Montserrat,48,&H00FFFFFF,&H0000E6FF,&H00000000,&H99000000,1,0,0,0,100,100,0,0,1,1.5,3.5,2,150,150,85,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  function formatTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.floor((sec % 1) * 100);
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  }

  let events = '';
  let currentTime = 0; // acumula entre campanhas

  sections.forEach(sec => {
    const rawLines = sec.lines || [];
    const lines = [];
    
    // Seleciona exatamente: 1Ã‚Âª, 2Ã‚Âª, 5Ã‚Âª, 6Ã‚Âª, 9Ã‚Âª, 10Ã‚Âª (ÃƒÂ­ndices 0, 1, 4, 5, 8, 9)
    [0, 1, 4, 5, 8, 9].forEach(idx => {
      if (rawLines[idx]) lines.push(rawLines[idx]);
    });
    // Se nÃƒÂ£o tiver essas exatas 6 por algum motivo, pega as primeiras que tiver limitando a 6
    if (lines.length === 0 && rawLines.length > 0) {
      lines.push(...rawLines.slice(0, 6));
    }
    
    const secDuration = Math.max(sec.duration || 60, 1);
    const secEnd = currentTime + secDuration;

    if (lines.length === 0) {
      currentTime = secEnd;
      return;
    }

    // DuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de cada legenda: override fixo ou calcula automaticamente
    // ÃƒÆ’Ã‚ÂUDIO MANDA: divide o tempo da campanha pelo nÃƒÆ’Ã‚Âºmero de legendas
    const lineDur = subtitleSec > 0 ? subtitleSec : (secDuration / lines.length);

    lines.forEach((lineText, lIdx) => {
      const isLast = (lIdx === lines.length - 1);
      const lineStart = currentTime + (lIdx * lineDur);

      if (lineStart >= secEnd) return; // seguranÃƒÆ’Ã‚Â§a

      // ÃƒÆ’Ã…Â¡ltima legenda: estica atÃƒÆ’Ã‚Â© o fim exato da campanha
      const lineEnd = isLast ? secEnd : Math.min(lineStart + lineDur, secEnd);

      const strophicText = formatStrophicText(lineText, 5);
      events += `Dialogue: 0,${formatTime(lineStart)},${formatTime(lineEnd)},DocSubtitle,,0,0,0,,${strophicText}\n`;
    });

    currentTime = secEnd; // prÃƒÆ’Ã‚Â³xima campanha comeÃƒÆ’Ã‚Â§a exatamente aqui
  });

  return header + events;
}

// Gera legendas dinâmicas estilo Karaokê/TikTok para Documentários 16:9
// ABORDAGEM IDÊNTICA AO MULTIVERSO AUDITIVO (ass_generator.js):
// usa rawWords diretamente com correção de marca inline — sem LCS, sem drift.
function generateDocumentaryDynamicAss(rawWords, editedTranscription) {

  if (!rawWords || rawWords.length === 0) return '';

  // ── Normaliza texto para comparação ──────────────────────────────────────────
  function norm(w) {
    return (w || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  }

  // ── Copia rawWords para não mutar o original ──────────────────────────────────
  const words = rawWords.map(w => ({
    word:  (w.word || w.text || '').trim(),
    start: Math.max(0, w.start),
    end:   Math.max(0, w.end)
  })).filter(w => w.word.length > 0);

  // ── Dicionário de Correção Ortográfica PT-BR / Termos Técnicos ────────────────
  const PT_BR_CORRECTIONS = {
    'algodao':'algodão','impressao':'impressão','tecnica':'técnica','tecnico':'técnico',
    'polimero':'polímero','sublimacao':'sublimação','producao':'produção','atencao':'atenção',
    'evolucao':'evolução','revolucao':'revolução','solucao':'solução','minisserie':'minissérie',
    'nao':'não','sao':'são','estao':'estão','tambem':'também','ja':'já','ate':'até',
    'voce':'você','voces':'vocês','termica':'térmica','termico':'térmico','epson':'Epson',
    'dtg':'DTG','dgt':'DTG','btg':'DTG','bgt':'DTG','ttg':'DTG','dtf':'DTF','dft':'DTF',
    'ttf':'DTF','silicar':'sílica','consagracao':'consagração','bio':'Bio'
  };

  // ── Correções de Marca e Fusão Fonética (mesmo algoritmo do Auditivo) ─────────
  for (let i = 0; i < words.length; i++) {
    const clean    = norm(words[i].word);
    const nextClean = i < words.length - 1 ? norm(words[i+1].word) : '';
    const prevClean = i > 0               ? norm(words[i-1].word) : '';

    // Fusão "D T G" / "D T F" (3 tokens)
    if (['d','t','b','de','te'].includes(clean) && ['t','te','ti'].includes(nextClean) && i < words.length - 2) {
      const after2 = norm(words[i+2].word);
      if (['g','ge','gui','j','je'].includes(after2)) {
        words[i].word = 'DTG'; words[i].end = words[i+2].end;
        words[i+1].word = ''; words[i+2].word = ''; continue;
      }
      if (['f','fe','fi','ef'].includes(after2)) {
        words[i].word = 'DTF'; words[i].end = words[i+2].end;
        words[i+1].word = ''; words[i+2].word = ''; continue;
      }
    }
    // Fusão "D G" / "D F" (2 tokens)
    if (['d','de','t','te','di','ti','dt'].includes(clean)) {
      if (['g','ge','gui','j','je','dtg'].includes(nextClean)) {
        words[i].word = 'DTG'; words[i].end = words[i+1].end; words[i+1].word = ''; continue;
      }
      if (['f','fe','fi','ef','dtf'].includes(nextClean)) {
        words[i].word = 'DTF'; words[i].end = words[i+1].end; words[i+1].word = ''; continue;
      }
    }
    if (['dg','deg','teg','tg','dtg'].includes(clean)) { words[i].word = 'DTG'; continue; }
    if (['df','def','tef','tf','dtf'].includes(clean)) { words[i].word = 'DTF'; continue; }

    // "em que Vortex" / "e que Vortex" → InkVortex
    if (['e','eh','in','em','ein'].includes(clean) && nextClean === 'que' && i < words.length - 2) {
      const after2 = norm(words[i+2].word);
      if (/^(?:vort|fort|bort)/i.test(after2)) {
        words[i].word = 'InkVortex'; words[i].end = words[i+2].end;
        words[i+1].word = ''; words[i+2].word = '';
        if (i+3 < words.length && /brasil|brazil/i.test(words[i+3].word)) words[i+3].word = 'Brasil';
        continue;
      }
    }
    // "ink* vort*" → InkVortex (1 token composto)
    if (/^(?:ink|inki|inky|inc|inque|emque|imque|enque|eing|wink|infort|imfort|emfort|incvort|inkvort|winkvort)[a-z]*(?:vort|fort|bort)[a-z]*/i.test(clean)) {
      if (nextClean === 'brasil' || nextClean === 'brazil') {
        words[i].word = 'InkVortex'; words[i+1].word = 'Brasil';
      } else { words[i].word = 'InkVortex'; }
      continue;
    }
    // Prefixo + sufixo separados: "ink" + "vortex"
    if (['ink','inki','inky','inc','inque','eing','einque','enque','emque','imque','em','im','in','wink'].includes(clean)) {
      if (/^(?:vort|fort|bort)/i.test(nextClean)) {
        words[i].word = 'InkVortex'; words[i].end = words[i+1].end; words[i+1].word = '';
        if (i+2 < words.length && /brasil|brazil/i.test(words[i+2].word)) words[i+2].word = 'Brasil';
      }
    }
    // "vortex" isolado em contexto de marca
    if (/^(?:vortex|vortics|vortecx|fortex|vortes|bortex)$/i.test(clean)) {
      if (['ink','inki','inky','inc','inque','eing','em','in','im','wink'].includes(prevClean)) {
        words[i-1].word = 'InkVortex'; words[i-1].end = words[i].end; words[i].word = '';
      } else if (/brasil|brazil|de|no|em/i.test(nextClean)) {
        words[i].word = 'InkVortex';
        if (/brasil|brazil/i.test(nextClean)) words[i+1].word = 'Brasil';
      }
    }
    // "link na bio"
    if (['link','linqui','linc'].includes(clean)) {
      words[i].word = 'link';
      if (['navio','nabio','enavio'].includes(nextClean)) { words[i+1].word = 'na Bio'; }
      continue;
    }
    // Correção dicionarizada
    if (PT_BR_CORRECTIONS[clean]) {
      const pre  = words[i].word.match(/^[^a-zA-ZáéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]+/)?.[0] || '';
      const suf  = words[i].word.match(/[^a-zA-ZáéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]+$/)?.[0] || '';
      words[i].word = pre + PT_BR_CORRECTIONS[clean] + suf;
    }
  }

  // ── Agrupa em frases (máx 5 palavras, gap > 1s quebra a frase) ───────────────
  const cleanWords = words.filter(w => w.word.trim().length > 0);

  // ── APLICA EDIÇÃO MANUAL (1:1 com os timestamps sobreviventes) ───────────────
  if (editedTranscription && typeof editedTranscription === 'string' && editedTranscription.trim().length > 0) {
    const customWords = editedTranscription.split(/\s+/).filter(w => w.trim().length > 0);
    for (let i = 0; i < Math.min(cleanWords.length, customWords.length); i++) {
      cleanWords[i].word = customWords[i];
    }
    // Se o usuário digitou palavras a mais, agrupa-as na última palavra cronológica
    if (customWords.length > cleanWords.length && cleanWords.length > 0) {
      cleanWords[cleanWords.length - 1].word += ' ' + customWords.slice(cleanWords.length).join(' ');
    }
  }
  const MAX_WORDS  = 5;
  const MAX_GAP    = 1.0;
  const phrases    = [];
  let cur = [];

  for (const w of cleanWords) {
    if (cur.length > 0 && (w.start - cur[cur.length-1].end > MAX_GAP || cur.length >= MAX_WORDS)) {
      phrases.push(cur); cur = [];
    }
    cur.push(w);
  }
  if (cur.length > 0) phrases.push(cur);

  // ── formatAssTime ─────────────────────────────────────────────────────────────
  function formatAssTime(sec) {
    const s = Math.max(0, sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = Math.floor(s % 60);
    const cs = Math.floor((s % 1) * 100);
    return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  }

  // ── Cabeçalho ASS (1920×1080 Documentário) ───────────────────────────────────
  const header = `[Script Info]\r\nTitle: Documentarios 16:9 Dynamic Subtitles\r\nScriptType: v4.00+\r\nWrapStyle: 1\r\nScaledBorderAndShadow: yes\r\nPlayResX: 1920\r\nPlayResY: 1080\r\n\r\n[V4+ Styles]\r\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\r\nStyle: DocStyle,Space Grotesk,90,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,8,4,2,80,80,80,1\r\n\r\n[Events]\r\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\r\n`;

  // ── N eventos por frase: 1 por palavra ativa (idêntico ao Auditivo) ───────────
  let events = '';

  for (const phrase of phrases) {
    const plainWords = phrase.map(w => w.word.trim().toUpperCase());

    for (let i = 0; i < phrase.length; i++) {
      const activeWord = phrase[i];
      let startT = activeWord.start;
      let endT   = i < phrase.length - 1 ? phrase[i+1].start : activeWord.end;
      if (endT <= startT) endT = startT + 0.08;

      let line = '';
      for (let j = 0; j < plainWords.length; j++) {
        if (j === i) {
          line += `{\\c&H0000E6FF&\\fscx112\\fscy112}${plainWords[j]}{\\r} `;
        } else {
          line += `{\\c&H00FFFFFF&\\fscx100\\fscy100}${plainWords[j]}{\\r} `;
        }
      }
      events += `Dialogue: 0,${formatAssTime(startT)},${formatAssTime(endT)},DocStyle,,0,0,0,,${line.trim()}\n`;
    }
  }

  return header + events;
}


// Aplica apenas a etapa de correção de marca/ortografia ao rawWords,
// retornando o array de palavras corrigidas (com timestamps intactos)
// e o texto pré-corrigido como string — para prévia antes de renderizar.
function correctDocumentaryWords(rawWords) {
  if (!rawWords || rawWords.length === 0) return { words: [], text: '' };

  function norm(w) {
    return (w || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  }

  const words = rawWords.map(w => ({
    word:  (w.word || w.text || '').trim(),
    start: Math.max(0, w.start),
    end:   Math.max(0, w.end)
  })).filter(w => w.word.length > 0);

  const PT_BR_CORRECTIONS = {
    'algodao':'algodão','impressao':'impressão','tecnica':'técnica','tecnico':'técnico',
    'polimero':'polímero','sublimacao':'sublimação','producao':'produção','atencao':'atenção',
    'evolucao':'evolução','revolucao':'revolução','solucao':'solução','minisserie':'minissérie',
    'nao':'não','sao':'são','estao':'estão','tambem':'também','ja':'já','ate':'até',
    'voce':'você','voces':'vocês','termica':'térmica','termico':'térmico','epson':'Epson',
    'dtg':'DTG','dgt':'DTG','btg':'DTG','bgt':'DTG','ttg':'DTG','dtf':'DTF','dft':'DTF',
    'ttf':'DTF','silicar':'sílica','consagracao':'consagração','bio':'Bio'
  };

  for (let i = 0; i < words.length; i++) {
    const clean    = norm(words[i].word);
    const nextClean = i < words.length - 1 ? norm(words[i+1].word) : '';
    const prevClean = i > 0               ? norm(words[i-1].word) : '';

    if (['d','t','b','de','te'].includes(clean) && ['t','te','ti'].includes(nextClean) && i < words.length - 2) {
      const after2 = norm(words[i+2].word);
      if (['g','ge','gui','j','je'].includes(after2)) {
        words[i].word = 'DTG'; words[i].end = words[i+2].end;
        words[i+1].word = ''; words[i+2].word = ''; continue;
      }
      if (['f','fe','fi','ef'].includes(after2)) {
        words[i].word = 'DTF'; words[i].end = words[i+2].end;
        words[i+1].word = ''; words[i+2].word = ''; continue;
      }
    }
    if (['d','de','t','te','di','ti','dt'].includes(clean)) {
      if (['g','ge','gui','j','je','dtg'].includes(nextClean)) {
        words[i].word = 'DTG'; words[i].end = words[i+1].end; words[i+1].word = ''; continue;
      }
      if (['f','fe','fi','ef','dtf'].includes(nextClean)) {
        words[i].word = 'DTF'; words[i].end = words[i+1].end; words[i+1].word = ''; continue;
      }
    }
    if (['dg','deg','teg','tg','dtg'].includes(clean)) { words[i].word = 'DTG'; continue; }
    if (['df','def','tef','tf','dtf'].includes(clean)) { words[i].word = 'DTF'; continue; }
    if (['e','eh','in','em','ein'].includes(clean) && nextClean === 'que' && i < words.length - 2) {
      const after2 = norm(words[i+2].word);
      if (/^(?:vort|fort|bort)/i.test(after2)) {
        words[i].word = 'InkVortex'; words[i].end = words[i+2].end;
        words[i+1].word = ''; words[i+2].word = '';
        if (i+3 < words.length && /brasil|brazil/i.test(words[i+3].word)) words[i+3].word = 'Brasil';
        continue;
      }
    }
    if (/^(?:ink|inki|inky|inc|inque|emque|imque|enque|eing|wink|infort|imfort|emfort|incvort|inkvort|winkvort)[a-z]*(?:vort|fort|bort)[a-z]*/i.test(clean)) {
      words[i].word = nextClean === 'brasil' || nextClean === 'brazil' ? 'InkVortex' : 'InkVortex';
      if (nextClean === 'brasil' || nextClean === 'brazil') words[i+1].word = 'Brasil';
      continue;
    }
    if (['ink','inki','inky','inc','inque','eing','einque','enque','emque','imque','em','im','in','wink'].includes(clean)) {
      if (/^(?:vort|fort|bort)/i.test(nextClean)) {
        words[i].word = 'InkVortex'; words[i].end = words[i+1].end; words[i+1].word = '';
        if (i+2 < words.length && /brasil|brazil/i.test(words[i+2].word)) words[i+2].word = 'Brasil';
      }
    }
    if (/^(?:vortex|vortics|vortecx|fortex|vortes|bortex)$/i.test(clean)) {
      if (['ink','inki','inky','inc','inque','eing','em','in','im','wink'].includes(prevClean)) {
        words[i-1].word = 'InkVortex'; words[i-1].end = words[i].end; words[i].word = '';
      } else if (/brasil|brazil|de|no|em/i.test(nextClean)) {
        words[i].word = 'InkVortex';
        if (/brasil|brazil/i.test(nextClean)) words[i+1].word = 'Brasil';
      }
    }
    if (['link','linqui','linc'].includes(clean)) {
      words[i].word = 'link';
      if (['navio','nabio','enavio'].includes(nextClean)) words[i+1].word = 'na Bio';
      continue;
    }
    if (PT_BR_CORRECTIONS[clean]) {
      const pre = words[i].word.match(/^[^a-zA-ZáéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]+/)?.[0] || '';
      const suf = words[i].word.match(/[^a-zA-ZáéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]+$/)?.[0] || '';
      words[i].word = pre + PT_BR_CORRECTIONS[clean] + suf;
    }
  }

  const cleanWords = words.filter(w => w.word.trim().length > 0);
  const text = cleanWords.map(w => w.word).join(' ');
  return { words: cleanWords, text };
}

module.exports = {
  concatAudioTracks,
  getAudioDuration,
  formatDurationSec,
  generateDocumentaryAssScript,
  generateReassembleAssScript,
  generateDocumentaryDynamicAss,
  correctDocumentaryWords
};
