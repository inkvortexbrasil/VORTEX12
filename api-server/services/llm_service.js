const contractParser = require('../contract_parser');

const { env } = require('../utils/env_loader');
const { describeNetworkError } = require('./network_error_details');

const LLM_MAX_ATTEMPTS = 4;
const LLM_TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);
const DEFAULT_API_TIMEOUT_MS = 240000;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function llmRetryDelay(attempt, response) {
  const retryAfter = Number(response && response.headers && response.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return Math.ceil(retryAfter * 1000) + 1000;
  const backoff = Math.min(30000, 2000 * (2 ** Math.max(0, attempt - 1)));
  return backoff + Math.floor(Math.random() * 750);
}

function isRetryableNetworkError(error) {
  const detail=String(error&&error.message||error||'');
  if(/parameter=timeoutMs|generation_cancelled/i.test(detail))return false;
  return /fetch failed|network|socket|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|UND_ERR|connection reset|conex[aã]o/i.test(detail);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_API_TIMEOUT_MS) {
  const controller = new AbortController();
  const externalSignal=options&&options.signal;
  const requestOptions={...options,signal:controller.signal};
  const abortFromExternal=()=>controller.abort('external');
  if(externalSignal){
    if(externalSignal.aborted)controller.abort('external');
    else externalSignal.addEventListener('abort',abortFromExternal,{once:true});
  }
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  try {
    return await fetch(url, requestOptions);
  } catch (error) {
    if (error && error.name === 'AbortError') {
      if(externalSignal&&externalSignal.aborted){
        const cancelled=new Error('Falha de API: parameter=generation_cancelled; motivo=operação cancelada pelo usuário.');
        cancelled.code='GENERATION_CANCELLED';
        throw cancelled;
      }
      const timeoutError = new Error(`Falha de API: parameter=timeoutMs; value=${timeoutMs}; motivo=tempo limite de processamento excedido.`);
      throw timeoutError;
    }
    if (error && error.cause) {
      const described = describeNetworkError(error);
      const causeCode = described.code ? `${described.code} — ` : '';
      const causeMsg = described.message;
      const enriched = new Error(`${error.message} (causa real: ${causeCode}${causeMsg})`);
      enriched.name = error.name;
      enriched.cause = error.cause;
      enriched.originalError = error;
      throw enriched;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    if(externalSignal)externalSignal.removeEventListener('abort',abortFromExternal);
  }
}

async function fetchLLMWithRetry(url, options = {}, timeoutMs = DEFAULT_API_TIMEOUT_MS) {
  let lastError;
  for (let attempt = 1; attempt <= LLM_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      if (!LLM_TRANSIENT_STATUSES.has(response.status) || attempt === LLM_MAX_ATTEMPTS) {
        return { response, attempts: attempt };
      }
      await wait(llmRetryDelay(attempt, response));
    } catch (error) {
      lastError = error;
      if (!isRetryableNetworkError(error) || attempt === LLM_MAX_ATTEMPTS) {
        error.llmAttempts = attempt;
        throw error;
      }
      await wait(llmRetryDelay(attempt));
    }
  }
  lastError.llmAttempts = LLM_MAX_ATTEMPTS;
  throw lastError;
}

function validateOutputSchema(taskName, jsonOut) {
  if (!jsonOut) return { valid: false, error: 'JSON vazio ou nulo.' };

  if (taskName === 'themes') {
    const candidateKeys = ['topics', 'themes', 'ideas', 'subjects', 'temas', 'assuntos', 'sugestoes', 'sugestões', 'items', 'list'];
    const hasRecognizableList = Array.isArray(jsonOut)
      || candidateKeys.some(key => Array.isArray(jsonOut[key]))
      || Object.values(jsonOut).some(value => Array.isArray(value) && value.length > 0 && typeof value[0] === 'object');
    if (!hasRecognizableList) {
      return { valid: false, error: 'Nenhuma lista de assuntos foi encontrada na resposta. Responda estritamente com um objeto JSON contendo a chave "topics" associada a um array de assuntos.' };
    }
  }

  if (taskName === 'caption') {
    const captionCandidates = jsonOut && typeof jsonOut === 'object' && !Array.isArray(jsonOut)
      ? [jsonOut.socialCaption, jsonOut.caption, jsonOut.social_caption, jsonOut.text, ...Object.values(jsonOut)]
      : [];
    if (!captionCandidates.some(value => typeof value === 'string' && value.trim())) {
      return { valid: false, error: 'A resposta da legenda não contém texto utilizável.' };
    }
  }

  if (taskName === 'flowMusic') {
    const rootFields = jsonOut && typeof jsonOut === 'object' && !Array.isArray(jsonOut)
      ? Object.keys(jsonOut)
      : [];
    if (!rootFields.includes('lyrics') || (!rootFields.includes('musicalComposition') && !rootFields.includes('sound'))) {
      return { valid: false, error: 'FlowMusic deve conter lyrics e musicalComposition.' };
    }
    if (typeof jsonOut.lyrics !== 'string' || !jsonOut.lyrics.trim()) {
      return { valid: false, error: 'FlowMusic exige lyrics como string não vazia.' };
    }
    const comp = jsonOut.musicalComposition || jsonOut.sound;
    if (typeof comp !== 'string' || !comp.trim()) {
      return { valid: false, error: 'FlowMusic exige musicalComposition como string não vazia.' };
    }
  }

  return { valid: true };
}

function extractJsonValue(text) {
  const source = String(text ?? '').replace(/^\uFEFF/, '').trim();
  if (!source) throw new Error('Resposta vazia.');

  try {
    return JSON.parse(source);
  } catch (_) { }

  for (let start = 0; start < source.length; start += 1) {
    if (source[start] !== '{' && source[start] !== '[') continue;

    const stack = [];
    let inString = false;
    let escaped = false;

    for (let index = start; index < source.length; index += 1) {
      const char = source[index];

      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{' || char === '[') {
        stack.push(char);
        continue;
      }

      if (char === '}' || char === ']') {
        const expected = char === '}' ? '{' : '[';
        if (stack.pop() !== expected) break;
        if (stack.length === 0) {
          const candidate = source.slice(start, index + 1);
          try {
            return JSON.parse(candidate);
          } catch (_) {
            break;
          }
        }
      }
    }
  }

  throw new Error('Nenhum objeto ou array JSON válido encontrado na resposta.');
}

function buildResponseFormat(responseSchema, profileName) {
  if (!responseSchema) return null;
  if (responseSchema === true) return { type: 'json_object' };
  if (!responseSchema || typeof responseSchema !== 'object' || Array.isArray(responseSchema)) {
    throw new Error('Schema estruturado inválido para a resposta da Mistral.');
  }

  const schema = responseSchema.schema && typeof responseSchema.schema === 'object'
    ? responseSchema.schema
    : responseSchema;
  const name = String(responseSchema.name || `${profileName || 'vortex'}_output`)
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .slice(0, 64) || 'vortex_output';

  return {
    type: 'json_schema',
    json_schema: {
      name,
      strict: responseSchema.strict !== false,
      schema
    }
  };
}

async function generateStage({ taskName, profileName, prompt, responseSchema, strictJson = false, validateResult, validationRetries = 1, contract, signal }) {
  const apiKey = env('MISTRAL_API_KEY', '');
  if (!apiKey) throw new Error('MISTRAL_API_KEY não configurada no Cofre de APIs');

  const c = typeof contractParser !== 'undefined' ? contractParser.getContract(profileName) : null;
  const finalModel = (c && c.motor) ? c.motor : 'gpt-4o-mini';
  const finalContract = (c && c.prompt) ? c.prompt : (contract || 'Você é assistente especializado da InkVortex.');
  const temp = (c && c.parameters && c.parameters.temperature !== undefined) ? c.parameters.temperature : 0.2;

  if (!c || !c.prompt) {
    console.warn(`[OpenAI] ALERTA: nenhum contrato válido foi encontrado para profileName="${profileName}" (taskName="${taskName}").`);
  }

  const url = 'https://api.mistral.ai/v1/chat/completions';

  const body = {
    model: finalModel,
    messages: [
      { role: 'system', content: finalContract },
      { role: 'user', content: prompt }
    ],
    temperature: temp
  };

  const responseFormat = buildResponseFormat(responseSchema, profileName);
  if (responseFormat) body.response_format = responseFormat;

  const MAX_RETRIES = Math.max(0, Math.min(1, Number(validationRetries) || 0));
  let lastErrorMsg = '';

  for (let r = 0; r <= MAX_RETRIES; r++) {
    const resObj = await fetchLLMWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!resObj.response.ok) {
      const errBody = await resObj.response.text();
      throw new Error(`Falha de API: http=${resObj.response.status}; detalhe=${errBody.slice(0,300)}`);
    }

    const jsonRes = await resObj.response.json();
    const textOut = jsonRes.choices && jsonRes.choices[0] && jsonRes.choices[0].message && jsonRes.choices[0].message.content;
    
    try {
      const parsed = responseSchema
        ? (strictJson ? JSON.parse(String(textOut ?? '').trim()) : extractJsonValue(textOut))
        : JSON.parse(textOut);
      
      let validatedResult = parsed;
      let validation = validateOutputSchema(profileName, parsed);
      if (validation.valid && typeof validateResult === 'function') {
        try {
          validatedResult = validateResult(parsed);
        } catch (validationError) {
          validation = {
            valid: false,
            error: String(validationError && validationError.message || validationError || 'Validação contratual rejeitada.')
          };
        }
      }
      if (validation.valid) {
         return validatedResult;
      } else {
         console.warn(`[QC Algorítmico] Falha na validação do ${profileName} (Tentativa ${r+1}): ${validation.error}`);
         lastErrorMsg = validation.error;
         body.messages.push({ role: 'assistant', content: textOut });
         body.messages.push({ role: 'user', content: `Por favor, forneça a resposta estritamente no formato JSON solicitado: ${validation.error}` });
      }
    } catch(e) {
      if (!responseSchema) return { rawText: textOut };
      lastErrorMsg = "Formato JSON inválido devolvido pela IA.";
    }
  }
  
  throw new Error(`O Controle de Qualidade barrou a geração após múltiplas tentativas: ${lastErrorMsg}`);
}

module.exports = {
  generateStage,
  fetchLLMWithRetry,
  fetchWithTimeout,
  validateOutputSchema,
  extractJsonValue,
  buildResponseFormat
};
