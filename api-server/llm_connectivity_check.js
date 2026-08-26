'use strict';

const { describeNetworkError } = require('./services/network_error_details');

const OPENAI_CONNECTIVITY_URL = 'https://api.openai.com/v1/chat/completions/v1/models';
const MISTRAL_CONNECTIVITY_URL = 'https://api.mistral.ai/v1/chat/completions';
const DEFAULT_TIMEOUT_MS = 8000;

async function checkSingleAPI(url, name, options = {}) {
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS));
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('connectivity-timeout'), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });

    if (response.body && typeof response.body.cancel === 'function') {
      try { await response.body.cancel(); } catch (_) {}
    }

    return {
      reachable: true,
      status: Number(response.status),
      code: '',
      detail: `${name} respondeu por HTTPS com HTTP ${response.status}.`
    };
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return {
        reachable: false,
        status: 0,
        code: 'ETIMEDOUT',
        detail: `Tempo limite de ${timeoutMs}ms ao testar ${url}.`
      };
    }

    const described = describeNetworkError(error);
    return {
      reachable: false,
      status: 0,
      code: described.code || 'NETWORK_ERROR',
      detail: described.message
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkLLMConnectivity(options = {}) {
  const [openai, mistral] = await Promise.all([
    checkSingleAPI(OPENAI_CONNECTIVITY_URL, 'OpenAI', options),
    checkSingleAPI(MISTRAL_CONNECTIVITY_URL, 'Mistral', options)
  ]);

  if (!openai.reachable) return openai;
  if (!mistral.reachable) return mistral;

  return {
    reachable: true,
    status: 200,
    code: '',
    detail: `Ambas APIs responderam (OpenAI HTTP ${openai.status}, Mistral HTTP ${mistral.status})`
  };
}

function connectivityFailureMessage(result) {
  const code = result && result.code ? result.code : 'NETWORK_ERROR';
  const detail = result && result.detail ? result.detail : 'Falha de rede sem detalhe.';
  if (code === 'EACCES') {
    return `A Central foi iniciada em um ambiente sem permissão para acessar a internet. ${detail} Use iniciar-central.bat no Windows ou reinicie o servidor fora do sandbox.`;
  }
  return `A Central não conseguiu alcançar a API necessária. ${code}: ${detail}`;
}

async function runCli() {
  const result = await checkLLMConnectivity();
  if (!result.reachable) {
    console.error('[PRE-FLIGHT APIS] FALHA');
    console.error(connectivityFailureMessage(result));
    process.exitCode = 1;
    return;
  }

  console.log(`[PRE-FLIGHT APIS] OK — HTTPS alcançou as APIs LLM.`);
}

if (require.main === module) {
  runCli().catch(error => {
    const described = describeNetworkError(error);
    console.error(`[PRE-FLIGHT APIS] FALHA INESPERADA: ${described.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  checkLLMConnectivity,
  connectivityFailureMessage
};
