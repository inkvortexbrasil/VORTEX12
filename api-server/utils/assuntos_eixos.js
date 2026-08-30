const fs = require('fs');
const path = require('path');
const { FILES_ROOT } = require('./paths');

function normalizeAxisNumber(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\D/g, '');
  if (!cleaned) return null;
  const num = parseInt(cleaned, 10);
  if (num >= 1 && num <= 40) {
    return String(num).padStart(2, '0');
  }
  return null;
}

function resolveAxisNumber(rawAxis, campaignNumber) {
  const parsed = normalizeAxisNumber(rawAxis);
  if (parsed) return parsed;

  // Fallback canônico: Minissérie 01 usa Eixo 02; Minissérie 39 usa Eixo 40; ciclo de 39 eixos fixos (02 a 40)
  if (campaignNumber) {
    const cNum = parseInt(String(campaignNumber).replace(/\D/g, ''), 10);
    if (!isNaN(cNum) && cNum > 0) {
      // Ciclo: (cNum - 1) % 39 + 2
      const axis = ((cNum - 1) % 39) + 2;
      return String(axis).padStart(2, '0');
    }
  }
  return '02';
}

function getAssuntosBaseDir(rootDir = null) {
  const filesRoot = rootDir || FILES_ROOT;
  return path.join(filesRoot, 'minisseries', 'assuntos');
}

function getSubjectHistory(axisNumber, rootDir = null) {
  const axis = normalizeAxisNumber(axisNumber);
  if (!axis) return [];

  const folder = path.join(getAssuntosBaseDir(rootDir), axis);
  const jsonPath = path.join(folder, 'historico_titulos.json');

  if (!fs.existsSync(jsonPath)) return [];

  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[ASSUNTOS] Erro ao ler histórico do eixo ${axis}:`, error.message);
    return [];
  }
}

function recordSubjectHistory(axisNumber, { campaignNumber, title, date }, rootDir = null) {
  const axis = normalizeAxisNumber(axisNumber);
  if (!axis || !title) return false;

  const folder = path.join(getAssuntosBaseDir(rootDir), axis);
  fs.mkdirSync(folder, { recursive: true });

  const jsonPath = path.join(folder, 'historico_titulos.json');
  const txtPath = path.join(folder, 'historico_titulos.txt');

  const history = getSubjectHistory(axis, rootDir);
  
  // Evita duplicata idêntica de título para a mesma minissérie
  const cleanTitle = String(title).trim();
  const cNum = String(campaignNumber || '').padStart(2, '0');

  const existingIndex = history.findIndex(h => h.campaignNumber === cNum || h.title.toLowerCase() === cleanTitle.toLowerCase());
  const entry = {
    campaignNumber: cNum,
    title: cleanTitle,
    date: date || new Date().toISOString()
  };

  if (existingIndex >= 0) {
    history[existingIndex] = entry;
  } else {
    history.push(entry);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(history, null, 2), 'utf8');

  // Atualiza arquivo TXT legível
  const lines = [
    '================================================================================',
    `INKVORTEX BRASIL — HISTÓRICO DE TÍTULOS DO EIXO #${axis}`,
    '================================================================================',
    ''
  ];
  history.forEach(h => {
    lines.push(`- Minissérie #${h.campaignNumber || '??'}: ${h.title}`);
  });
  lines.push('');
  fs.writeFileSync(txtPath, lines.join('\n'), 'utf8');

  return true;
}

module.exports = {
  normalizeAxisNumber,
  resolveAxisNumber,
  getAssuntosBaseDir,
  getSubjectHistory,
  recordSubjectHistory
};
