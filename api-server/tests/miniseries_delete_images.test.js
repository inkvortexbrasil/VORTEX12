const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const robotManifest = require('../robot_manifest');

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-del-images-'));

try {
  const docNum = '99';
  const campaignDir = path.join(temporaryRoot, 'minisseries', docNum, `M${docNum}`);
  const promptsDir = path.join(temporaryRoot, 'minisseries', docNum, 'prompts');
  fs.mkdirSync(campaignDir, { recursive: true });
  fs.mkdirSync(promptsDir, { recursive: true });

  // Cria 4 imagens físicas
  fs.writeFileSync(path.join(campaignDir, 'img_001.jpg'), Buffer.from('image-1'));
  fs.writeFileSync(path.join(campaignDir, 'img_002.png'), Buffer.from('image-2'));
  fs.writeFileSync(path.join(campaignDir, 'img_003.webp'), Buffer.from('image-3'));
  fs.writeFileSync(path.join(campaignDir, 'img_004.jpeg'), Buffer.from('image-4'));

  // Inicializa o manifesto com as 4 concluídas
  const initialManifest = robotManifest.reconcileManifest({
    numStr: docNum,
    mode: 'minisseries',
    total: 50,
    rootDir: temporaryRoot
  });

  assert.strictEqual(initialManifest.scenes['001'].status, 'completed');
  assert.strictEqual(initialManifest.scenes['002'].status, 'completed');
  assert.strictEqual(initialManifest.scenes['003'].status, 'completed');
  assert.strictEqual(initialManifest.scenes['004'].status, 'completed');
  assert.strictEqual(initialManifest.scenes['005']?.status || 'pending', 'pending');

  // Simula a exclusão física das sequências 2 e 3 (como faz a rota /api/minisseries/delete-images)
  const sequencesToDelete = [2, 3];
  const supportedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const deletedFiles = [];

  for (const seq of sequencesToDelete) {
    const padded = String(seq).padStart(3, '0');
    for (const ext of supportedExtensions) {
      const filePath = path.join(campaignDir, `img_${padded}.${ext}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deletedFiles.push(`img_${padded}.${ext}`);
      }
    }
  }

  assert.deepStrictEqual(deletedFiles, ['img_002.png', 'img_003.webp']);

  // Verifica que arquivos 001 e 004 continuam no disco, enquanto 002 e 003 sumiram
  assert.ok(fs.existsSync(path.join(campaignDir, 'img_001.jpg')), 'img_001.jpg deve permanecer');
  assert.ok(!fs.existsSync(path.join(campaignDir, 'img_002.png')), 'img_002.png deve ter sido excluído');
  assert.ok(!fs.existsSync(path.join(campaignDir, 'img_003.webp')), 'img_003.webp deve ter sido excluído');
  assert.ok(fs.existsSync(path.join(campaignDir, 'img_004.jpeg')), 'img_004.jpeg deve permanecer');

  // Reconcilia o manifesto após a exclusão
  const updatedManifest = robotManifest.reconcileManifest({
    numStr: docNum,
    mode: 'minisseries',
    total: 50,
    rootDir: temporaryRoot
  });

  assert.strictEqual(updatedManifest.scenes['001'].status, 'completed');
  assert.strictEqual(updatedManifest.scenes['002'].status, 'pending', 'Cena 002 deve voltar para pending');
  assert.strictEqual(updatedManifest.scenes['003'].status, 'pending', 'Cena 003 deve voltar para pending');
  assert.strictEqual(updatedManifest.scenes['004'].status, 'completed');
  assert.strictEqual(updatedManifest.scenes['002'].acceptedFile, undefined);
  assert.strictEqual(updatedManifest.scenes['003'].acceptedFile, undefined);

  // Verificação estática do código-fonte da interface (documentarios.js)
  const documentariosCode = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'documentarios.js'), 'utf8');
  assert(documentariosCode.includes('🗑️ DELETAR MARCADAS'), 'Botão DELETAR MARCADAS deve estar presente na UI');
  assert(documentariosCode.includes('window.deleteSelectedDocPhase2Images'), 'Função deleteSelectedDocPhase2Images deve estar definida');
  assert(documentariosCode.includes('□ MARCAR VAZIAS'), 'Botão MARCAR VAZIAS deve ser preservado');
  assert(!documentariosCode.includes('onclick="window.toggleDocPhase2Checkboxes'), 'O template da Fase 2 não deve mais invocar toggleDocPhase2Checkboxes');

  // Verificação estática do servidor (server.js)
  const serverCode = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert(serverCode.includes("req.url === '/api/minisseries/delete-images' && req.method === 'POST'"), 'Rota delete-images deve existir no server.js');
  assert(serverCode.includes("robotManifest.reconcileManifest"), 'Server deve reconciliar o manifesto após exclusão');

  console.log('miniseries-delete-images-test-passed-successfully');
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
