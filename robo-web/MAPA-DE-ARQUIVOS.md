# Mapa de arquivos e autoridades

## Autoridades principais

| Arquivo | Responsabilidade |
|---|---|
| `AGENTS.md` | Ordem e regras para agentes |
| `robo-web/00-LEIA-PRIMEIRO.md` | Entrada da documentação dos robôs |
| `api-server/robot_manifest.js` | Estado compartilhado, reservas e commit seguro |
| `api-server/chatgpt_web_automation.js` | Automação e recuperação do GPT |
| `api-server/gemini_current_tab_automation.js` | Automação e recuperação do Gemini na guia atual |
| `api-server/browser_extension_bridge.js` | Transporte entre servidor e extensão |
| `api-server/routes/chatgpt_automation_routes.js` | Rotas GPT, Gemini 50 e estado do manifesto |
| `api-server/routes/automation_routes.js` | Rotas Gemini Flow e resgates |
| `chrome-extension-vortex/manifest.json` | Contrato e versão da extensão |
| `chrome-extension-vortex/background.js` | Service worker da Ponte VORTEX |

Arquivos e caminhos aposentados que não devem ser recriados:

- `api-server/gemini_web_automation.js`;
- `profiles/`;
- rotas ChatGPT de enumeração ou reset de contas dedicadas;
- qualquer lançamento com `--user-data-dir` ou porta de depuração própria.

## Dados por minissérie

### Prompts oficiais

Pasta: `minisseries/<NN>/prompts/`.

Para a M01, a fila final de 50 posições é:

- `50_prompts_esteira_chatgpt_01.json`
- `50_prompts_esteira_chatgpt_01.txt`

As fontes GPT e complementares permanecem na mesma pasta e não devem ser apagadas durante manutenção dos robôs.

### Manifesto compartilhado

- Minissérie: `robot_manifest_<NN>_minisseries.json`
- Flow: `robot_manifest_<NN>_flow.json`

Este é o registro operacional comum dos provedores.

### Checkpoints de provedor

- `chatgpt_checkpoint_<NN>_<modo>.json`
- `gemini_checkpoint_<NN>_minisseries.json`

Eles guardam telemetria e identidades observadas durante uma tentativa. São auxiliares, não autorizam navegação para chat histórico e não bloqueiam uma nova rodada quando não existe arquivo físico.

### Status de jobs

- `robot_job_status_chatgpt_<NN>.json`
- `robot_job_status_gemini_<NN>.json`

Servem para telemetria e para conservar a última seleção absoluta usada por um Resgate. Não decidem conclusão, não autorizam sobrescrita e não tornam uma URL de chat obrigatória.

### Imagens oficiais

- Minissérie: `minisseries/<NN>/M<NN>/img_NNN.ext`
- Flow: `minisseries/<NN>/flow/cena_NN.ext`

Uma única posição lógica pode ter somente um arquivo oficial.

## Testes essenciais

- `api-server/tests/robot_manifest.test.js`
- `api-server/tests/robot_quota_handoff.test.js`
- `api-server/tests/robot_recovery_routes.test.js`
- `api-server/tests/robot_provider_ui.test.js`
- `api-server/tests/chatgpt_checkpoint.test.js`
- `api-server/tests/chatgpt_direct_input.test.js`
- `api-server/tests/chatgpt_generation_wait.test.js`
- `api-server/tests/gemini_checkpoint.test.js`
- `api-server/tests/gemini_generation_order.test.js`
- `api-server/tests/gemini_flow_current_tab.test.js`

## Limites de autoridade

- `Todos_Contratos.md` define contratos de inteligência e prompts de sistema; não é manual operacional dos robôs.
- `ffmpeg/` e `renderizador-ffmpeg/` possuem outro domínio e não devem ser alterados por manutenção dos robôs.
