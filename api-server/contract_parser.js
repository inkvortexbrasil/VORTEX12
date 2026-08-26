const fs = require('fs');
const path = require('path');

const contractsPath = path.join(__dirname, '..', 'Todos_Contratos.md');

let cachedContracts = {};

function parseContracts(markdown) {
  const contracts = {};
  
  // Dividir o documento pelos cabeçalhos de contratos
  const blocks = markdown.split('## Contrato: ');
  blocks.shift(); // Remove o texto introdutório antes do primeiro contrato

  for (const block of blocks) {
    const lines = block.split('\n');
    const idLine = lines.shift().trim();
    const rawId = idLine.split(' ')[0].trim().toLowerCase(); // Extrai apenas a palavra do ID e normaliza para lowercase

    let motor = 'gpt-4o'; // fallback padrão
    let parameters = {};
    let prompt = '';

    // Extração do Contrato Integral (Texto do Prompt)
    // Âncora apenas nas palavras "Contrato Integral" (sem exigir uma ordem
    // exata de negrito/dois-pontos) e captura tudo até o primeiro bloco de
    // código. Isso é resiliente tanto a "**Contrato Integral:**" (dois-pontos
    // dentro do negrito) quanto a "**Contrato Integral**:" (dois-pontos fora),
    // e a variações futuras de formatação no Markdown.
    const textMatch = block.match(/Contrato Integral[\s\S]*?```(?:text)?\r?\n([\s\S]*?)```/i);
    if (textMatch) {
      prompt = textMatch[1].trim();
    } else {
      // Fallback pra textos que possam estar fora de blocos de código
      const altMatch = block.match(/Contrato Integral\s*:?\s*\*{0,2}:?\s*([\s\S]*?)(?:\n##|$)/i);
      if (altMatch) {
         prompt = altMatch[1].replace(/```text/g, '').replace(/```/g, '').trim();
      }
    }

    const motorMatch = block.match(/- \*\*Motor:\*\* (.*)/);
    if (motorMatch) {
      const rawMotor = motorMatch[1].trim();
      motor = rawMotor;
    }

    // Extração de Parâmetros
    const paramMatch = block.match(/- \*\*Parâmetros:\*\* `(\{.*\})`/);
    if (paramMatch) {
      try {
        // Converte sintaxe JS simples em JSON puro para o parse (ex: { temperature: 0.86, reasoningEffort: 'none' } -> {"temperature":0.86,"reasoningEffort":"none"})
        const jsonStr = paramMatch[1].replace(/([\w]+)\s*:/g, '"$1":').replace(/'/g, '"');
        parameters = JSON.parse(jsonStr);
      } catch (e) {
        console.warn(`[Contratos] Falha ao decodificar JSON de parâmetros no contrato ${rawId}:`, paramMatch[1]);
      }
    }

    if (rawId) {
      // rawId já vem normalizado em lowercase (linha acima), então não há
      // necessidade de nenhum ajuste adicional de capitalização aqui.
      const cleanId = rawId;

      if (!prompt) {
        // Falha catastrófica e silenciosa no passado: um contrato sem texto
        // faz a IA cair no fallback genérico sem nenhuma instrução real de
        // formato/esquema JSON. Isso NUNCA deve passar despercebido de novo.
        console.warn(`[Contratos] ALERTA: o contrato "${cleanId}" foi carregado com o prompt VAZIO. Verifique a formatação da seção "Contrato Integral" desse bloco em Todos_Contratos.md.`);
      }

      contracts[cleanId] = {
        id: cleanId,
        motor: motor,
        parameters: parameters,
        prompt: prompt
      };
    }
  }

  return contracts;
}

// Variável para evitar múltiplos reloads ao salvar o arquivo
let reloadTimeout = null;

function loadContracts(isHotReload = false) {
  try {
    if (fs.existsSync(contractsPath)) {
      const content = fs.readFileSync(contractsPath, 'utf8');
      const newContracts = parseContracts(content);
      
      if (Object.keys(newContracts).length > 0) {
        cachedContracts = newContracts;
        if (isHotReload) {
           console.log(`[Contratos] HOT RELOAD: Arquivo atualizado! ${Object.keys(cachedContracts).length} contratos sincronizados do Multiverso Central.`);
        } else {
           console.log(`[Contratos] INICIALIZAÇÃO: ${Object.keys(cachedContracts).length} contratos carregados com sucesso.`);
        }
      }
    } else {
      console.warn(`[Contratos] ALERTA CRÍTICO: Arquivo Todos_Contratos.md não encontrado na raiz (${contractsPath}).`);
    }
  } catch (err) {
    console.error('[Contratos] Erro catastrófico ao ler contratos:', err);
  }
}

// Inicia observador (Hot-Reload)
if (fs.existsSync(contractsPath)) {
  fs.watch(contractsPath, (eventType) => {
    if (eventType === 'change') {
      clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(() => {
        loadContracts(true);
      }, 500);
    }
  });
}

// Carregamento inicial no boot
loadContracts();

function getContract(id) {
  if (!id) return null;
  return cachedContracts[id.toLowerCase()] || null;
}

function getAllContracts() {
  return cachedContracts;
}

module.exports = {
  getContract,
  getAllContracts
};
