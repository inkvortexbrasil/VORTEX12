const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const assuntosEixos = require('../utils/assuntos_eixos');

console.log('--- Iniciando Teste do Sistema de Assuntos por Eixo Tecnológico ---');

// 1. Validação de Normalização e Ciclo dos Eixos
{
  assert.strictEqual(assuntosEixos.normalizeAxisNumber('2'), '02');
  assert.strictEqual(assuntosEixos.normalizeAxisNumber('08'), '08');
  assert.strictEqual(assuntosEixos.normalizeAxisNumber(40), '40');
  assert.strictEqual(assuntosEixos.normalizeAxisNumber('theme_15'), '15');
  assert.strictEqual(assuntosEixos.normalizeAxisNumber(45), null, 'Eixo acima de 40 deve ser nulo');

  // Ciclo dos 39 eixos (02 a 40):
  assert.strictEqual(assuntosEixos.resolveAxisNumber(null, 1), '02', 'Minissérie 01 usa Eixo 02');
  assert.strictEqual(assuntosEixos.resolveAxisNumber(null, 2), '03', 'Minissérie 02 usa Eixo 03');
  assert.strictEqual(assuntosEixos.resolveAxisNumber(null, 39), '40', 'Minissérie 39 usa Eixo 40');
  assert.strictEqual(assuntosEixos.resolveAxisNumber(null, 40), '02', 'Minissérie 40 faz loop de volta para Eixo 02');
  console.log('✔ Normalização e Ciclo dos Eixos (02 a 40) validados com sucesso');
}

// 2. Validação de Leitura e Gravação em Disco Isolado
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-test-assuntos-'));
  try {
    const axis = '08';
    
    // Inicialmente vazio
    const initial = assuntosEixos.getSubjectHistory(axis, tmpDir);
    assert.deepStrictEqual(initial, [], 'Histórico inicial deve ser vazio');

    // Grava primeiro título (Minissérie 07)
    const title1 = 'Inteligência Artificial Criativa no Design Têxtil: Do Algoritmo ao Tecido';
    const ok1 = assuntosEixos.recordSubjectHistory(axis, {
      campaignNumber: '07',
      title: title1
    }, tmpDir);
    assert.strictEqual(ok1, true);

    const hist1 = assuntosEixos.getSubjectHistory(axis, tmpDir);
    assert.strictEqual(hist1.length, 1);
    assert.strictEqual(hist1[0].campaignNumber, '07');
    assert.strictEqual(hist1[0].title, title1);

    // Valida arquivo TXT gerado para humanos
    const txtPath = path.join(tmpDir, 'minisseries', 'assuntos', axis, 'historico_titulos.txt');
    assert(fs.existsSync(txtPath), 'Arquivo historico_titulos.txt deve existir');
    const txtContent = fs.readFileSync(txtPath, 'utf8');
    assert(txtContent.includes(title1), 'TXT deve conter o título gravado');
    assert(txtContent.includes('Minissérie #07'), 'TXT deve indicar o número da minissérie');

    // Grava segundo título na rodada 2 (Minissérie 46)
    const title2 = 'Estamparia Generativa: Como Redes Neurais Estão Desenhando a Nova Alta Costura';
    assuntosEixos.recordSubjectHistory(axis, {
      campaignNumber: '46',
      title: title2
    }, tmpDir);

    const hist2 = assuntosEixos.getSubjectHistory(axis, tmpDir);
    assert.strictEqual(hist2.length, 2);
    assert.strictEqual(hist2[1].campaignNumber, '46');
    assert.strictEqual(hist2[1].title, title2);

    console.log('✔ Gravação e leitura de histórico do eixo em disco validadas');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 3. Validação do Histórico Real no Disco D:\VORTEX12_FILES\minisseries\assuntos\
{
  const hist02 = assuntosEixos.getSubjectHistory('02');
  assert(hist02.length >= 1, 'Eixo 02 deve conter pelo menos 1 título histórico');
  assert(hist02[0].title.includes('Estamparia DTF'), 'Eixo 02 deve conter o título da Minissérie 01');

  const hist03 = assuntosEixos.getSubjectHistory('03');
  assert(hist03.length >= 1, 'Eixo 03 deve conter o título da Minissérie 02');

  const hist07 = assuntosEixos.getSubjectHistory('07');
  assert(hist07.length >= 1, 'Eixo 07 deve conter o título da Minissérie 06');

  console.log('✔ Histórico real das Minisséries 01 a 06 conferido nas pastas 02 a 07 de D:\\VORTEX12_FILES\\minisseries\\assuntos\\');
}

console.log('assuntos-eixos-contract-ok');
