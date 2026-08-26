const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { CODE_ROOT } = require('../utils/paths');

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getTodayZipFileName() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  return `VORTEX12-${dateStr}.zip`;
}

function zipSystemToDriveD(options = {}) {
  const sourceRoot = options.sourceRoot || CODE_ROOT || 'F:\\VORTEX12';
  const baseDrive = options.targetDrive || 'D:\\';
  
  // Prioriza a pasta D:\VORTEX\ para manter a unidade de backup organizada
  let targetFolder = path.join(baseDrive, 'VORTEX');
  if (!fs.existsSync(targetFolder)) {
    try {
      fs.mkdirSync(targetFolder, { recursive: true });
    } catch (_) {
      targetFolder = baseDrive;
    }
  }

  const fileName = options.fileName || getTodayZipFileName();
  const targetFilePath = path.join(targetFolder, fileName);

  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Pasta de origem do sistema não encontrada: ${sourceRoot}`);
  }

  // Verifica se a unidade de destino existe/está acessível
  if (!fs.existsSync(baseDrive)) {
    throw new Error(`Unidade de destino ${baseDrive} não está acessível ou montada no Windows.`);
  }

  // Inclui 100% dos arquivos e pastas do sistema (node_modules, .git, .gemini, backups e pastas ocultas)
  // para que ao descompactar o sistema funcione imediatamente sem requerer instalações adicionais.
  try {
    const cmd = `tar.exe -a -c -f "${targetFilePath}" -C "${sourceRoot}" .`;
    execSync(cmd, { stdio: 'pipe', windowsHide: true, maxBuffer: 50 * 1024 * 1024, timeout: 300000 });
  } catch (tarErr) {
    // Fallback: PowerShell Compress-Archive
    try {
      const psCmd = `powershell.exe -NoProfile -Command "Compress-Archive -Path '${sourceRoot}\\*' -DestinationPath '${targetFilePath}' -Force"`;
      execSync(psCmd, { stdio: 'pipe', windowsHide: true, maxBuffer: 50 * 1024 * 1024, timeout: 300000 });
    } catch (psErr) {
      throw new Error(`Falha ao compactar sistema para ${targetFilePath}: ${tarErr.message || psErr.message}`);
    }
  }

  if (!fs.existsSync(targetFilePath)) {
    throw new Error(`Arquivo ZIP não foi gerado em ${targetFilePath}`);
  }

  const stat = fs.statSync(targetFilePath);

  return {
    ok: true,
    success: true,
    fileName,
    filePath: targetFilePath,
    targetDrive: baseDrive,
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    createdAt: stat.mtime.toISOString(),
    timestamp: Date.now()
  };
}

function listSystemZipsInDrive(targetDrive = 'D:\\') {
  if (!fs.existsSync(targetDrive)) {
    return { ok: false, error: `Unidade ${targetDrive} inacessível`, zips: [] };
  }

  try {
    const foldersToScan = [targetDrive];
    const vortexSubfolder = path.join(targetDrive, 'VORTEX');
    if (fs.existsSync(vortexSubfolder)) {
      foldersToScan.push(vortexSubfolder);
    }

    const zips = [];
    const seenPaths = new Set();

    for (const folder of foldersToScan) {
      try {
        const files = fs.readdirSync(folder);
        for (const f of files) {
          if (f.toLowerCase().endsWith('.zip') && (f.toLowerCase().includes('vortex') || f.toLowerCase().includes('backup'))) {
            const fullPath = path.join(folder, f);
            if (seenPaths.has(fullPath)) continue;
            seenPaths.add(fullPath);
            try {
              const stat = fs.statSync(fullPath);
              zips.push({
                fileName: f,
                filePath: fullPath,
                sizeBytes: stat.size,
                sizeFormatted: formatBytes(stat.size),
                mtime: stat.mtime.toISOString()
              });
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    zips.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

    return { ok: true, success: true, targetDrive, zips };
  } catch (err) {
    return { ok: false, error: err.message, zips: [] };
  }
}

module.exports = {
  zipSystemToDriveD,
  listSystemZipsInDrive,
  getTodayZipFileName,
  formatBytes
};
