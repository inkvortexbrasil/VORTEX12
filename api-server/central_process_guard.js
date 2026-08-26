'use strict';

// Gerenciador minimo de instancia unica da Central VORTEX.
// Nao le chaves, contratos, campanhas ou prompts. Ele apenas identifica o
// processo que ocupa a porta local da Central e, com --replace, substitui uma
// instancia VORTEX antiga antes de o inicializador subir a nova.

const http = require('http');
const { execFileSync } = require('child_process');

const PORT = Math.max(1, Number(process.env.PORT || 8787));
const HOST = '127.0.0.1';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseListeningPids(netstatText, port = PORT) {
  const suffix = `:${port}`;
  const pids = new Set();
  for (const rawLine of String(netstatText || '').split(/\r?\n/)) {
    const parts = rawLine.trim().split(/\s+/);
    if (parts.length < 5) continue;
    if (String(parts[0]).toUpperCase() !== 'TCP') continue;
    if (!String(parts[1]).endsWith(suffix)) continue;
    if (String(parts[3]).toUpperCase() !== 'LISTENING') continue;
    const pid = Number(parts[4]);
    if (Number.isInteger(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
}

function listeningPids() {
  const output = execFileSync('netstat.exe', ['-ano', '-p', 'tcp'], {
    encoding: 'utf8',
    windowsHide: true
  });
  return parseListeningPids(output, PORT);
}

function readProcessInfo(pid) {
  const numericPid = Number(pid);
  if (!Number.isInteger(numericPid) || numericPid <= 0) {
    throw new Error(`PID invalido recebido do netstat: ${pid}`);
  }
  const command = [
    `$processInfo = Get-CimInstance Win32_Process -Filter \"ProcessId = ${numericPid}\"`,
    'if ($null -eq $processInfo) { exit 3 }',
    '[PSCustomObject]@{ Name = $processInfo.Name; CommandLine = $processInfo.CommandLine } | ConvertTo-Json -Compress'
  ].join('; ');
  const output = execFileSync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    command
  ], { encoding: 'utf8', windowsHide: true }).trim();
  return JSON.parse(output);
}

function isCentralServerProcess(info) {
  const name = String(info && info.Name || '').trim().toLowerCase();
  const commandLine = String(info && info.CommandLine || '');
  return name === 'node.exe' && /api-server[\\/]server\.js["']?(?:\s|$)/i.test(commandLine);
}

function pingCentral(timeoutMs = 2500) {
  return new Promise(resolve => {
    const request = http.get({ host: HOST, port: PORT, path: '/api/ping', timeout: timeoutMs }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(response.statusCode === 200 && parsed && parsed.ok === true && parsed.status === 'online');
        } catch (_) {
          resolve(false);
        }
      });
    });
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve(false));
  });
}

async function waitUntilPortIsFree(timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (listeningPids().length === 0) return true;
    await delay(250);
  }
  return false;
}

async function inspectOrReplace({ replace = false } = {}) {
  const pids = listeningPids();
  if (pids.length === 0) {
    console.log(`[CENTRAL] Porta ${PORT} livre. Nenhuma instancia anterior encontrada.`);
    return { replaced: false, pids: [] };
  }

  const centralResponded = await pingCentral();
  const processes = pids.map(pid => ({ pid, info: readProcessInfo(pid) }));
  const invalid = processes.find(item => !isCentralServerProcess(item.info));
  if (!centralResponded || invalid) {
    const occupied = pids.join(', ');
    throw new Error(`A porta ${PORT} esta ocupada pelo PID ${occupied}, mas o processo nao foi confirmado como a Central VORTEX. Nada foi encerrado.`);
  }

  if (!replace) {
    console.log(`[CENTRAL] Instancia VORTEX ativa na porta ${PORT}: PID ${pids.join(', ')}.`);
    return { replaced: false, pids };
  }

  for (const item of processes) {
    console.log(`[CENTRAL] Encerrando somente a instancia VORTEX anterior: PID ${item.pid}.`);
    execFileSync('taskkill.exe', ['/PID', String(item.pid), '/F'], {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }

  if (!await waitUntilPortIsFree()) {
    throw new Error(`A instancia anterior foi encerrada, mas a porta ${PORT} nao ficou livre no tempo esperado.`);
  }
  console.log(`[CENTRAL] Porta ${PORT} liberada. A nova Central pode iniciar.`);
  return { replaced: true, pids };
}

async function main() {
  const replace = process.argv.includes('--replace');
  await inspectOrReplace({ replace });
}

if (require.main === module) {
  main().catch(error => {
    console.error('[CENTRAL] INICIALIZACAO INTERROMPIDA: ' + (error && error.message ? error.message : error));
    process.exitCode = 1;
  });
}

module.exports = {
  PORT,
  parseListeningPids,
  isCentralServerProcess,
  pingCentral,
  inspectOrReplace
};
