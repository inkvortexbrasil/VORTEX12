# Continuidade Operacional — Estúdio VORTEX 12.0

Este arquivo é a memória de voo operacional do estúdio VORTEX 12.0. Ele garante que qualquer agente que assuma o comando compreenda imediatamente os contratos, as decisões do Diretor-Geral, o estado real do projeto e as regras sagradas de governança.

---

## 👑 REGRA NÚMERO 1: DESREGULAMENTAÇÃO TOTAL DA CENTRAL E AUTONOMIA CRIATIVA DA IA (MANDATO SOBERANO DO DIRETOR-GERAL)

Esta é a regra fundamental, inviolável e mais importante de todas no VORTEX 12.0. Todo agente que operar neste estúdio deve lê-la, compreendê-la e cumpri-la com fidelidade absoluta:

1. **A Central Trabalha a Favor do Estúdio, Nunca Contra:**
   - A Central é exclusivamente um motor de infraestrutura, transporte, renderização e interface operacional.
   - Ela **NÃO é juíza**, fiscalizadora nem polícia da inteligência artificial.
   - Está terminantemente revogado qualquer código vigilante, auditoria cega, contagem coercitiva de palavras, regexes de bloqueio ou descarte automático de materiais gerados.

2. **Autonomia e Soberania Criativa da Mistral AI:**
   - A **Mistral AI** é a parceira criativa oficial do Diretor-Geral para todo o conteúdo editorial, poético, visual, musical e narrativo do estúdio.
   - Ela possui **autonomia criativa total** para expressar sua riqueza literária e imagética sem amarras ou bloqueios artificiais.
   - Caso seja necessário calibrar o estilo ou corrigir desvios, o ajuste será feito exclusivamente pelo **Diretor-Geral** através dos parâmetros oficiais da IA (temperatura, prompts de sistema, direcionamento temático), **nunca por filtros, regexes ou intervenções mecânicas da Central**.

3. **Veto Absoluto a Regras Autônomas e Ocultas de Agentes:**
   - Nenhum agente tem autorização para criar regras autônomas, censuras, normalizações arbitrárias, filtros burocráticos ou normas "por debaixo dos panos".
   - Criar barreiras não autorizadas é considerado **jogar contra o patrimônio do estúdio**, gerando bugs silenciosos e desperdício de tempo e tokens em retrabalho desnecessário.
   - Qualquer alteração técnica ou comportamental deve ser previamente explicada, comunicada e expressamente autorizada pelo Diretor-Geral antes de ser aplicada.

4. **Inviolabilidade Sagrada do Disco Físico:**
   - Os arquivos gravados em disco (`D:\VORTEX12_FILES` e `F:\VORTEX12`) representam a **verdade física e o patrimônio consolidado do estúdio**.
   - Nenhuma rota de API, rotina de montagem de esteira ou requisição de frontend pode sobrescrever, apagar ou esvaziar arquivos físicos existentes sem uma ordem deliberada do Diretor-Geral. Se o arquivo existe em disco, o disco tem precedência absoluta sobre qualquer estado em memória do navegador.

---

## 🏛️ Governança e Hierarquia Operacional

1. **O Diretor-Geral é a Autoridade Suprema e Final:** Todas as decisões estéticas, de engenharia e de fluxo pertencem a ele.
2. **`AGENTS.md` é a Autoridade de Entrada:** Governa as permissões, os limites de escrita e os procedimentos operacionais.
3. **A Tríade Homologada e Blindada:** `Todos_Contratos.md`, `robo-web/` e `renderizador-ffmpeg/` são pilares protegidos contra modificações autônomas.
4. **Janela Visível da Central:** O Diretor controla o servidor operacional através da janela preta visível iniciada por `iniciar-central.bat`. Nenhum agente pode iniciar, reiniciar ou substituir esse processo em segundo plano. Quando houver alteração em `api-server/` ou `js/`, o agente deve solicitar: *"Diretor, é necessário reiniciar a Central por aí"*.

---

## 🏗️ Arquitetura de Raiz Dupla Vigente (VORTEX12 & VORTEX12_FILES)

O estúdio opera fisicamente desacoplado em duas unidades:
- **`F:\VORTEX12` — Núcleo de Software Leve (~2 a 3 MB sem `node_modules`):**
  - Contém exclusivamente o código-fonte editável, scripts, frontend, backend, contratos e testes. Destinado a versionamento e backup ágil.
- **`D:\VORTEX12_FILES` — Repositório de Mídia e Dados Fixos (~2,6 GB):**
  - Contém os arquivos pesados, permanentes e gerados: `minisseries/`, `palco/`, `logo-inkvortex/`, `fonts/`, `video/`, `som/`, `stacher/` e binários `ffmpeg/bin/`.
  - Resolução transparente via `api-server/utils/paths.js` e `serveStatic`.

---

## 🤖 Operação Homologada dos Robôs Oficiais (ChatGPT e Gemini)

- **Autoridade Compartilhada:** `api-server/robot_manifest.js` (provedores oficiais restritos estritamente a `chatgpt` e `gemini`).
- **Verdade Operacional:** A miniatura física na interface dita o estado — preenchida = concluída; vazia = disponível.
- **Ponte VORTEX do Edge/Opera/Chrome:** ChatGPT e Gemini operam exclusivamente nas guias já abertas pelo Diretor na mesma janela do navegador; perfis dedicados, Qwen e DALL-E 3 foram extintos do estúdio.
- **Resgate Fiel:** O botão Resgate nunca cria chat novo nem navega; utiliza apenas o chat visível deixado pelo Diretor e salva as imagens pelas posições absolutas correspondentes.
- **Downloads:** Passam por staging isolado, verificação de hash SHA-256 e commit protegido no manifesto; posições já concluídas nunca são sobrescritas.

---

## 🎬 Renderizador FFmpeg e Engenharia de Áudio / Legendas

- **Whisper-1 Puro:** O modelo OpenAI Whisper-1 recebe exclusivamente o arquivo de áudio M4A. O arquivo TXT de letra oficial nunca é enviado ao Whisper.
- **Alinhamento Needleman–Wunsch:** A letra do TXT é a autoridade ortográfica final; o alinhamento vincula cada palavra às âncoras temporais provisórias do Whisper.
- **Legendas ASS TikTok:** Máximo de 4 palavras por marcação, durações estritamente positivas e corte seco com zero sobreposição de falas consecutivas.
- **Passagem Única de Áudio com Capa:** Capa + M4A + ASS → MP4 em uma única passagem rápida FFmpeg (sem geração de MP4-base intermediário).
- **Minissérie Final (Acervo Oficial):**
  - Contrato: `abertura (master.mp4) + imagens dinâmicas (M<NN>/) + logo (logo.mp4) + M4A integral + ASS pronto → MP4 final em video social/`.
  - O M4A governa a duração total. O ASS pronto é reaproveitado diretamente sem nova transcrição.

---

## 📜 Os 5 Contratos Ativos de Inteligência Artificial (`Todos_Contratos.md`)

Todos os contratos são gerados pela **Mistral AI** (`mistral-large-latest`), 100% em **Português do Brasil**:

1. **`## Contrato: Themes` (Genoma Central do Assunto):**
   - Cria o DNA completo da minissérie (12 campos essenciais, Contexto Mestre e arco dramático humano).
2. **`## Contrato: Scenes45` (10 Cenas-Âncora Cinematográficas 16:9):**
   - 10 cenas cinematográficas completas com `number`, `title` e `prompt`. Título provocativo na Cena 1 e desenvolvimento visual progressivo. Integração orgânica do título e da assinatura "InkVortex Brasil" no cenário.
3. **`## Contrato: Scenes50` (40 Prompts Complementares de Produção):**
   - 4 posições complementares para cada uma das 10 cenas GPT (Lifestyle/Mundo Real, Detalhe Tátil, Ação Dinâmica Humana e Celebração/Conexão), formando a esteira oficial de 50 prompts.
4. **`## Contrato: Caption` (Legenda Social Oficial):**
   - Legenda editorial concisa e engajadora em 10 linhas para Instagram e LinkedIn.
5. **`## Contrato: FlowMusic` (Composição, Letra e Capa Fine-Art):**
   - Brief musical poético e humanizado; vocais cantados em pt-BR com início instantâneo ($t=0{,}0\text{s}$ no beat 1), letra romântica/emocional sem jargões técnicos, e capa artística fine-art com assinatura manuscrita sutil 'InkVortex Brasil'.

---

## 🎯 Estado Consolidado e Últimas Conquistas

1. **Desregulamentação Concluída:**
   - Purgadas do contrato `Scenes45` todas as regras coercitivas e proibições punitivas;
   - Eliminados códigos mortos de auditoria/policiamento em `server.js` e `llm_service.js`.
2. **Blindagem Contra Sobrescrita de Disco:**
   - `generateScenes50Prompt` em `server.js` e `buildChatGPTQueue` em `chatgpt_automation_routes.js` priorizam sempre o arquivo físico em disco. Se `10_prompts_gpt_NN.json` existe, o disco é lido e preservado intacto.
3. **Títulos Explícitos nos Arquivos TXT:**
   - `writeGPTSourcePrompts` e `buildChatGPTQueue` agora imprimem explicitamente a linha `Título: <título>` no cabeçalho de cada cena nos arquivos `.txt`, eliminando qualquer separação visual do título.
4. **Minissérie 02 100% Pronta em Disco:**
   - `10_prompts_gpt_02.json`, `10_prompts_gpt_02.txt`, `50_prompts_esteira_chatgpt_02.json` e `50_prompts_esteira_chatgpt_02.txt` estão perfeitamente salvos com os 10 títulos editoriais e prompts cinematográficos completos.
5. **Higienização de Mojibake no Terminal:**
   - Mensagens de log em `audio_service.js` e `server.js` restauradas com acentuação limpa e emojis nítidos (`🎵 ÁUDIO`, `🎙️ Whisper-1`, `📄 Letra mestre`, `🎬 Renderizando`).
6. **Erradicação Total de DALL-E 3 e Qwen:**
   - Excluídos fisicamente os scripts `qwen_web_automation.js`, `qwen_automation_routes.js`, `dalle_api_service.js` e `dalle_api_contract.test.js`;
   - A extensão (`chrome-extension-vortex/`) e a Central operam exclusivamente com a dupla oficial: ChatGPT e Gemini;
   - Removidos todos os botões e telemetrias residuais de Qwen e DALL-E no frontend (`js/app.js`, `js/documentarios.js`, `index.html`).
7. **Critério Definitivo de Minissérie Completa na Biblioteca:**
   - Revogada a checagem arcaica de `generatedGemini` (contrato antigo de 9:16);
   - A função canônica `isCampaignComplete` em `js/ui.js` valida se a minissérie possui Genoma Central e roteiros/prompts oficiais gerados;
   - Minissérie 01 e 02 são reconhecidas como Obras Completas (`COMPLETO`) no Multiverso Biblioteca.
8. **Suíte Oficial de Homologação:**
   - Todos os 20 testes automatizados passaram com 100% de sucesso.
