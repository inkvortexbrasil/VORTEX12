const fs = require('fs');
const path = require('path');

function parseEnvFile(envPath) {
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function applyEnvVars(pairs, { overwrite = false } = {}) {
  for (const [key, value] of Object.entries(pairs)) {
    if (overwrite || !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Carrega o .env para dentro de process.env UMA ÚNICA VEZ por processo.
const ENV_PATH = path.resolve(__dirname, '..', '.env');
applyEnvVars(parseEnvFile(ENV_PATH), { overwrite: false });

function reloadEnvFile() {
  return applyEnvVars(parseEnvFile(ENV_PATH), { overwrite: true });
}

function env(name, fallback = '') {
  return process.env[name] !== undefined ? process.env[name] : fallback;
}

module.exports = { env, reloadEnvFile, ENV_PATH, parseEnvFile };
