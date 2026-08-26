const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const {
  zipSystemToDriveD,
  listSystemZipsInDrive,
  getTodayZipFileName
} = require('../services/system_zip_service');

test('Contrato de Compactação do Sistema (ZIP): geração completa sem exclusões e listagem', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-zip-test-'));
  const fakeSource = path.join(tmpDir, 'VORTEX12');
  const fakeDriveD = path.join(tmpDir, 'DriveD');
  fs.mkdirSync(fakeSource, { recursive: true });
  fs.mkdirSync(fakeDriveD, { recursive: true });

  // Cria arquivos simulados de código
  fs.writeFileSync(path.join(fakeSource, 'index.html'), '<html>VORTEX</html>');
  fs.writeFileSync(path.join(fakeSource, 'package.json'), JSON.stringify({ name: 'vortex' }));
  fs.mkdirSync(path.join(fakeSource, 'js'), { recursive: true });
  fs.writeFileSync(path.join(fakeSource, 'js', 'ui.js'), 'console.log("ui");');

  // Cria pasta node_modules, .git, .gemini que DEVEM ser incluídas no backup total
  fs.mkdirSync(path.join(fakeSource, 'node_modules', 'dummy-pkg'), { recursive: true });
  fs.writeFileSync(path.join(fakeSource, 'node_modules', 'dummy-pkg', 'large.bin'), 'DUMMY_HEAVY_FILE');
  fs.mkdirSync(path.join(fakeSource, '.git'), { recursive: true });
  fs.writeFileSync(path.join(fakeSource, '.git', 'config'), 'GIT_CONFIG');
  fs.mkdirSync(path.join(fakeSource, '.gemini'), { recursive: true });
  fs.writeFileSync(path.join(fakeSource, '.gemini', 'state.json'), '{"state":"ok"}');

  // 1. Executa compactação total para a unidade simulada
  const result = zipSystemToDriveD({
    sourceRoot: fakeSource,
    targetDrive: fakeDriveD,
    fileName: 'VORTEX12-TEST-BACKUP.zip'
  });

  assert.ok(result.ok);
  assert.strictEqual(result.fileName, 'VORTEX12-TEST-BACKUP.zip');
  assert.ok(fs.existsSync(result.filePath));
  assert.ok(result.sizeBytes > 0);
  assert.ok(typeof result.sizeFormatted === 'string');

  // 2. Valida que o zip contém 100% de todos os arquivos e pastas (inclusive node_modules e .git)
  const listCmd = `tar.exe -tf "${result.filePath}"`;
  const entries = execSync(listCmd).toString();
  assert.ok(entries.includes('index.html'), 'Zip deve conter index.html');
  assert.ok(entries.includes('js/ui.js') || entries.includes('js\\ui.js'), 'Zip deve conter js/ui.js');
  assert.ok(entries.includes('node_modules'), 'Zip deve conter node_modules para auto-suficiência');
  assert.ok(entries.includes('.git') || entries.includes('.git/'), 'Zip deve conter .git');
  assert.ok(entries.includes('.gemini') || entries.includes('.gemini/'), 'Zip deve conter .gemini');

  // 3. Testa listagem de zips no drive
  const listResult = listSystemZipsInDrive(fakeDriveD);
  assert.ok(listResult.ok);
  assert.strictEqual(listResult.zips.length, 1);
  assert.strictEqual(listResult.zips[0].fileName, 'VORTEX12-TEST-BACKUP.zip');

  // Limpeza
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

