# Continuidade operacional do VORTEX11

Este arquivo permite que um novo chat retome o trabalho com o mesmo contexto prático. Ele não contém conversa bruta, segredos, raciocínio interno ou uma autoridade concorrente.

## Hierarquia

1. O Diretor-Geral é a autoridade final.
2. `AGENTS.md` é a autoridade operacional de entrada.
3. `Todos_Contratos.md`, `robo-web/` e `renderizador-ffmpeg/` são a tríade técnica blindada.
4. Este arquivo apenas registra continuidade e deve ser corrigido quando o estado real mudar, sempre respeitando autorização e blindagem.

Se este arquivo divergir da tríade ou do código vigente, pare e apresente a divergência ao Diretor-Geral. Não improvise uma correção.

## Forma de trabalho com o Diretor

- O Diretor acompanha e valida o resultado na ponta.
- Antes de escrever em área protegida, apresente diagnóstico, arquivos, impacto, riscos, testes e restauração; aguarde aprovação específica.
- O Diretor controla a Central pela janela preta visível aberta por `iniciar-central.bat`.
- O agente não inicia, reinicia nem encerra a Central em segundo plano.
- Quando o código exigir reinício, diga: “Diretor, é necessário reiniciar a Central por aí” e aguarde.
- Não recarregue a extensão do Edge por mudança apenas em `api-server/`, `js/` ou CSS.
- Geração real, download real e renderização real dependem de autorização explícita.

## Robôs ChatGPT e Gemini

- Autoridade compartilhada: `api-server/robot_manifest.js`.
- A miniatura física é a verdade operacional: preenchida significa arquivo concluído; vazia significa posição disponível.
- Sem seleção, qualquer robô recebe a fila oficial completa; com seleção, recebe somente as posições absolutas marcadas. `MARCAR VAZIAS` seleciona apenas slots sem arquivo.
- ChatGPT e Gemini não compartilham chat; compartilham posições absolutas, arquivos concluídos e proteção de concorrência pelo manifesto.
- Toda rodada normal de GPT ou Gemini abre um chat novo na guia atual; o robô prepara o modo de imagem necessário sem trocar o modelo escolhido pelo Diretor.
- Tentativa gerada sem arquivo físico não bloqueia chat novo, nova rodada nem outro provedor.
- O Resgate usa somente o chat visível deixado pelo Diretor, não envia prompts, não cria chat, não navega para URL histórica e preserva a numeração absoluta.
- Ambos os provedores usam exclusivamente as guias atuais do Edge pela Ponte VORTEX; perfis dedicados, portas de depuração e Chrome separado foram aposentados.
- Download passa por staging, hash e commit protegido; posição concluída não é sobrescrita.
- Documentação obrigatória: `robo-web/00-LEIA-PRIMEIRO.md` e a sequência definida em `AGENTS.md`.

## Legenda e áudio com capa

- Whisper-1 recebe somente o M4A.
- O TXT oficial de letra fica ao lado do M4A; nunca é enviado ao Whisper.
- Needleman–Wunsch combina a ortografia do TXT com os tempos provisórios do Whisper.
- O ASS usa no máximo quatro palavras e não permite duas frases simultâneas.
- Capa + M4A + ASS são renderizados em uma passagem.
- Documentação obrigatória: `renderizador-ffmpeg/00-LEIA-PRIMEIRO.md` e a sequência definida em `AGENTS.md`.

## Novo Acervo e minissérie final

Decisão aprovada: o Acervo é a única interface de renderização da minissérie final. A antiga fase de renderização da Esteira foi retirada.

Contrato:

```text
abertura = minisseries/<NN>/flow/master.mp4
imagens  = todos os arquivos aceitos em minisseries/<NN>/M<NN>/
logo     = minisseries/logo/logo.mp4
áudio    = M4A de minisseries/<NN>/sonoplastia/m4a/
legenda  = ASS pronto de minisseries/<NN>/sonoplastia/ass/
saída    = minisseries/video social/MINISSERIE_<NN>_FINAL.mp4
```

- Quantidade de imagens dinâmica, mínimo uma; não existe obrigação de 50.
- M4A governa a duração total.
- Tempo por imagem = `(M4A - abertura - logo) / quantidade real de imagens`.
- Abertura, imagens e logo formam a pista visual em 1920×1080, 24 fps.
- M4A toca integralmente; áudio da abertura e da logo também toca com ganho nominal de 100% em seus trechos.
- Um limitador evita clipping na soma dos três áudios.
- O ASS pronto é queimado; não há nova chamada ao Whisper nem novo alinhamento.
- Uma passagem FFmpeg, H.264 `ultrafast`, AAC 192 kbps e `faststart`.
- Staging, FFprobe e promoção protegida impedem final incompleto.
- O Acervo não usa a expressão “8K” e não inventa status, tamanho, data ou arquivo.
- `flow/master.mp4` é somente abertura e nunca pode aparecer como vídeo final.

Arquivos principais:

- `api-server/services/final_minisserie_renderer.js`
- `api-server/services/video_service.js`
- `api-server/server.js`
- `js/documentarios.js`
- `css/components.css`
- `api-server/tests/final_minisserie_renderer_contract.test.js`

Rotas:

- `GET /api/documentaries` — catálogo real.
- `POST /api/render-final-minisserie` — renderização final.

## Estado no ponto desta gravação

Concluído:

- **Migração Arquitetônica**: O repositório de mídia pesada (`VORTEX12_FILES`) foi configurado no sistema para operar a partir da unidade `D:\`, dissociando-o da unidade `F:\` do software leve (`AGENTS.md`, `paths.js` e `social.js` atualizados).
- ponto de restauração em `scratch/restoration/baseline_novo_acervo.zip`;
- motor dinâmico de uma passagem;
- catálogo verdadeiro;
- interface do novo Acervo e animação “Invocando Motores IA”;
- retirada da fase antiga de renderização da Esteira;
- retirada da rota antiga de Windows Media Player;
- testes contratuais sintéticos do novo motor.

Pendente:

1. quando houver imagem e autorização, executar uma renderização real;
2. o Diretor homologar visualmente imagem, três áudios, legenda, duração e desempenho.

Verificações concluídas neste estado:

- `node --check` nos quatro arquivos JavaScript alterados;
- teste de sobreposição do ASS: 1 aprovado;
- contrato Whisper/áudio com capa: 3 aprovados;
- contrato do renderizador final e verdade da interface: 6 aprovados;
- catálogo local confirmou zero finais físicos e bloqueio correto das minisséries sem imagens.
- Central reiniciada manualmente pelo Diretor e `/api/ping` confirmado;
- novo Acervo validado ao vivo no Edge: 12 minisséries, zero finais físicos, nenhum “8K” e nenhuma abertura apresentada como final;
- Minissérie 04 mostrou corretamente M4A e ASS encontrados, zero imagens e botão de renderização bloqueado;
- a antiga etapa 5 não aparece mais na Esteira.

Reparo autorizado e validado na entrada da Central:

- removida a referência inexistente `js/typography.js?v=236`; a tipografia vigente permanece em `js/ui.js`;
- removida a referência inexistente `css/variables.css?v=110`; as variáveis vigentes permanecem em `css/main.css`;
- corrigida uma linha truncada de `copyZoomImage` no script embutido de `index.html`, restaurando a captura por `html2canvas`;
- criado `api-server/tests/index_local_assets_contract.test.js` para validar existência dos ativos locais e sintaxe dos scripts embutidos;
- Central recarregada no Edge sem novos erros de console; menu de Tipografia, Multiverso Minisséries e Acervo validados ao vivo.

Simplificação autorizada do painel:

- o painel oficial possui somente `Multiverso Flow Music`, `Multiverso Biblioteca` e `Multiverso Minisséries`;
- a antiga sala `Multiverso Audiovisual`, seu HTML e `js/flow.js` foram retirados do código ativo;
- `flow/master.mp4` e o contrato `FlowMaster` permanecem preservados como abertura da minissérie final;
- o contrato musical legado `Audio`, de 60 segundos e três atos, foi revogado; somente `FlowMusic` permanece no bloco musical de `Todos_Contratos.md`;
- as rotas legadas de montagem audiovisual no backend foram apenas auditadas e não foram apagadas.

Revisão editorial vigente dos contratos de IA:

- o contrato global inativo `System` foi aposentado; o parser reconhece sete contratos geradores ativos, todos com prompt não vazio;
- `Themes` foi revisado e homologado com temperatura `0.82` e oito campos por ideia, incluindo `description` como Contexto Mestre de 180 a 260 palavras encaminhado diretamente às etapas seguintes;
- `Scenes50` foi revisado e homologado com temperatura `0.76`, exatamente 40 complementos, dez blocos rígidos de quatro posições cinematográficas complementares (Plano Geral, Macro/Detalhe, Ângulo Dinâmico e Plano Médio/Transição), proibição explícita de clones de cena, prompts de 110 a 170 palavras, assinatura discreta e validação sem correção silenciosa pela Central;
- `Scenes45` foi revisado e homologado com temperatura `0.78`, exatamente 10 cenas-âncora 16:9, títulos de 10 a 12 palavras, prompts de 130 a 180 palavras, Bíblia Visual, hierarquia entre manchete e marca e validação sem correção, preenchimento ou renumeração silenciosa pela Central;
- `Scenes916` e `FlowMaster` foram revisados em conjunto por autorização específica do Diretor para consolidar a ligação Flow → Gemini: cinco referências estáticas numeradas, cinco cenas técnicas e correspondência obrigatória `[01] → Scene 1` até `[05] → Scene 5`;
- o `FlowMaster` agora produz `globalDirective` e cinco cenas com `imageReference`, tempo, quadro de referência e comandos separados de câmera, sujeito, ambiente, quadro final e transição; literatura decorativa e introdução narrativa foram retiradas desse contrato;
- o prefixo externo `flow/flow.txt`, suas três concatenações na interface e a pasta raiz vazia `flow/` foram retirados; o prompt copiado é autossuficiente e prompts legados sem o mapa interno são bloqueados;
- a lista de pastas obrigatórias da inicialização também deixou de conter `flow`, impedindo que a Central recrie o diretório legado vazio após novo início;
- a validação estática e a suíte dos robôs foram aprovadas; o Diretor reiniciou manualmente a Central e a verificação confirmou novo processo online, Ponte VORTEX 1.1.6 conectada, manifesto intacto, `js/app.js` novo servido e resposta HTTP 404 para o antigo `flow/flow.txt`;
- a validação do conteúdo real gerado pelo novo `FlowMaster` permanece pendente e não deve executar imagem ou vídeo real sem nova autorização do Diretor;
- por autorização específica do Diretor, os sete contratos ativos (`Themes`, `Scenes50`, `Scenes45`, `Scenes916`, `FlowMaster`, `Caption` e `FlowMusic`) adotaram Structured Outputs com `response_format.type = json_schema`, esquema estrito e chave raiz própria;
- o JSON Schema governa somente a embalagem indispensável — objeto, chaves, tipos e cardinalidades essenciais — e substitui o antigo `json_object`, que assegurava JSON válido, mas não garantia a estrutura solicitada;
- passou a vigorar a política global **ENTREGA PRIMEIRO**: contagem editorial de palavras ou linhas, emojis, hashtags, pontuação, aspas, prefixos, frases exatas e escolhas estilísticas continuam orientando a Mistral, porém não descartam uma resposta estruturalmente utilizável;
- a Central não reescreve nem completa o conteúdo criativo da Mistral; limita-se a normalizar o invólucro quando necessário, preservar o texto recebido e bloquear somente resposta vazia, estrutura essencial ausente ou falha real de API;
- cada etapa admite no máximo uma retentativa de validação; se uma etapa posterior falhar, o resultado útil já obtido na etapa anterior permanece disponível em vez de toda a geração ser perdida;
- `Caption` aceita `socialCaption` e invólucros equivalentes utilizáveis e entrega o texto integral da Mistral para avaliação do Diretor;
- `FlowMusic` gera `lyrics`, `musicalComposition` e `voice`, enquanto o Flow Music continua sendo o único responsável por criar letra, música e voz;
- a orientação do `FlowMusic` foi simplificada e otimizada por aprovação do Diretor: (1) `lyrics` organiza a narrativa em três atos emocionais claros (Beginning [Cenas 01–04], Turning Point [Cenas 05–08] e Climax & Resolution [Cenas 09–10]), com diretrizes para início imediato do canto em `[Verse 1]` no segundo 0:01 com 1s de intro dinâmica (evitando corte seco de áudio, zero delay e sem tags de intro faladas), rimas naturais em pt-BR, refrão marcante, desenvolvimento completo de versos para preencher 180s (3:00) e assinatura "InkVortex Brasil" estritamente no [Outro]; (2) `musicalComposition` foi calibrada para 45–95 palavras com tags de comando `[No Intro], [Direct Vocal Start at 0:01], Target Duration: 180s (3:00 full track)` e tags técnicas essenciais (Tempo, Key, Groove & Energy, Instrumentation, Signature Hook e Structure iniciando obrigatoriamente com `[Verse 1: Vocals at 0:01] -> ... -> [Outro: Fade Out at 3:00]`); (3) `voice` foca puramente em atributos acústicos e ataque vocal imediato a partir do segundo 0:01 (`Vocal Delivery: Upfront immediate vocals starting at second 0:01 with zero intro delay`);
- as temperaturas e motores foram calibrados e homologados por aprovação do Diretor em Todos_Contratos.md e server.js:
  * Camada Criativa/Narrativa (`mistral-large-latest`): `Themes` (0.82), `Scenes45` (0.78), `Scenes50` (0.76) e `Scenes916` (0.76);
  * Camada Estrutural/Técnica (`mistral-small-latest`): `FlowMaster` (0.72), `Caption` (0.74) e `FlowMusic` (0.76);
- os contratos `FlowMaster` e `Scenes916` foram reformulados e conectados explicitamente: `FlowMaster` foca em comandos operacionais de câmera para Google Flow / Veo 3.1 com fatias de 2.0s e define o blueprint estático no `referenceFrame`; `Scenes916` usa o `referenceFrame` como âncora composicional primária e traduz a dinâmica de câmera e física em imagens estáticas 16:9 widescreen para o Gemini;
- a função `resetMiniseriesWorkspace` em `miniseries_workspace_service.js` foi reforçada para contornar o erro `EPERM` de `renameSync` no Windows, aplicando remoção forçada com retentativas via `fs.rmSync` e recriação segura do workspace oficial; o workspace da Minissérie 03 foi inicializado 100% limpo e os testes unitários foram validados;
- ponto de restauração desta arquitetura em `scratch/restoration/delivery_first_json_schema_2026-08-11_071234/`;
- a validação sintática e todos os testes direcionados e de regressão passaram com 100% de sucesso;
- não houve chamada real à Mistral, geração de imagem, download ou renderização nesta implementação; a avaliação de conteúdo permanece com o Diretor após reinício manual da Central.

Migração autorizada para navegador único:

- criado ponto de restauração do código em `scratch/restoration/bridge_only_profiles_retired_2026-08-11/`;
- retirado `api-server/gemini_web_automation.js`, que abria Chrome com perfil dedicado;
- retiradas as rotas ChatGPT de enumeração e reset de contas dedicadas;
- `chatgpt_web_automation.js` não contém mais `profileDir`, porta de depuração, `--user-data-dir` nem criação de `profiles/`;
- a rota utilizada pela interface em `/api/automate-gemini/start-doc` foi preservada, mas passou a executar `runGeminiCurrentTabAutomation` na guia preparada do Edge;
- o teste `browser_profiles_retired.test.js` e os dez testes obrigatórios dos robôs passaram; na suíte global, 39 de 41 testes passaram e permaneceram somente as duas falhas antigas sem relação com os robôs;
- não houve geração ou download real;
- o Diretor excluiu fisicamente `profiles/` e reiniciou manualmente a Central; o processo 4472 iniciou em `2026-08-11T08:42:42.631Z` com Ponte VORTEX 1.1.6 conectada em `same-chrome-window`;
- `profiles/` não foi recriada, `api-server/gemini_web_automation.js` permanece ausente e as rotas legadas `/api/automate-chatgpt/accounts` e `/api/automate-chatgpt/reset-account` respondem 404;
- o manifesto da minissérie 01 permaneceu íntegro, com 50 posições pendentes, zero conflitos e zero reservas;
- depois que o Diretor abriu as duas guias ao lado do Studio, a Ponte reconheceu corretamente o ChatGPT e o Gemini na mesma janela do Edge; permaneceu `active: false`, sem controle, geração ou download durante o diagnóstico.

Layout operacional homologado para uso com a extensão lateral do ChatGPT no Edge:

- o Dashboard possui o **Portal Vivo**: a aba transparente `SEJA BEM-VINDO`, centralizada no olho do vórtice, inicia por clique real o MP4 `palco/00-portal-vivo-inkvortex.mp4` em tela inteira e com áudio; o término natural desembarca em `Multiverso Minisséries > ACERVO`, localiza a Minissérie `01` pela identidade real do catálogo e abre diretamente o seu cartão/player, enquanto `Esc` ou `FECHAR PORTAL` cancela e retorna ao Dashboard;
- quando a Minissérie `01` possui MP4 final físico, o desembarque abre o Zoom nativo, desativa repetição infinita e inicia o Play com áudio; sem MP4, permanece corretamente no player da `01`, sem inventar vídeo nem estado de finalização;
- a validação real no Edge confirmou 10 segundos, vídeo com som, camada acima de toda a interface e desembarque direto no player da Minissérie `01`; como ainda não existe MP4 final da `01`, o bloqueio do Zoom/Play também foi confirmado. A assinatura ativa é `js/living-stage.js?v=2` e o ponto de restauração permanece em `scratch/restoration/dashboard_living_portal_2026-08-11_1055/`;

- camada responsiva oficial em `css/extension-mode.css`, carregada depois de `css/main.css`;
- torre única na lateral esquerda, com 360×760 px, reunindo cockpit e os três acessos oficiais sem vão;
- painel de prompts na lateral direita, também com 360×760 px, cenas compactas e texto branco;
- centro do Dashboard reservado ao wallpaper e ao vórtice, com 782 px livres na validação de 1526×884;
- o mesmo desenho agora atende o Edge sem a extensão lateral exposta: em 1912×884, a torre esquerda e o painel direito medem 360×760 px, ficam a 20 px das bordas e deixam 1152 px livres para o portal central;
- a regra de tela ampla atua somente no Dashboard; Flow Music, Biblioteca, Esteira e Acervo preservam seus layouts centralizados;
- nenhuma superfície do modo extensão usa `backdrop-filter: blur`; os painéis são cristalinos e não fosqueiam o palco;
- Flow Music, Biblioteca, Esteira e Acervo foram abertos e validados ao vivo no Edge;
- no Acervo, o painel direito é fixo: player flexível, status e avisos cabem simultaneamente sem rolagem;
- Biblioteca confirmou 12 minisséries e 7 completas; os três acessos retornaram corretamente ao Dashboard;
- testes do contrato visual, ativos locais e simplificação do Dashboard aprovados, sem erro no console do Edge;
- ponto de restauração anterior ao redesenho: `scratch/restoration/baseline_before_extension_mode_visual_refactor.zip`;
- a futura versão 12.0 permanece uma evolução posterior à homologação da primeira renderização final real; não é pendência funcional do layout 11.0.

- Correção homologada no renderizador final (`api-server/services/final_minisserie_renderer.js`): o demuxer `concat` do FFmpeg passava por falha de decodificação (`Invalid PNG signature`) em minisséries contendo imagens de formatos mistos (ex.: âncoras PNG e complementares JPG); implementada a normalização automática de imagens no diretório temporário e isolado de staging (`.render-staging`), com cópia de JPEGs e conversão temporária de imagens PNG/WebP, mantendo as imagens de produção em `minisseries/<NN>/M<NN>/` intactas; testes do contrato de renderização aprovados com 100% de sucesso; ponto de restauração em `scratch/restoration/final_minisserie_renderer.js.bak`.

## VORTEX 12.0 — Separação Arquitetural de Raiz Dupla e Genoma Central

- Criada a pasta de código leve `F:\VORTEX12` (~2,2 MB), contendo apenas arquivos de software, contratos, frontend e backend limpos, sem arquivos residuais, scripts de depuração soltos ou logs antigos;
- Criada a pasta de mídia e dados fixos `F:\VORTEX12_FILES` (~2,58 GB), isolando `minisseries/`, `palco/`, `logo-inkvortex/`, `fonts/` e `ffmpeg/`;
- Implementado o módulo `api-server/utils/paths.js` e atualizado `serveStatic` no `server.js` para entrega transparente de arquivos estáticos e rotas de API em ambas as raízes sem alteração nas URLs do frontend;
- Atualizados `iniciar-central.bat`, `AGENTS.md`, `Todos_Contratos.md`, `index.html` e suite de testes para a versão 12.0;
- Todos os testes de contrato e homologação de vídeo, áudio, ASS, robôs e Bridge do Edge foram executados e aprovados com 100% de sucesso no ambiente `F:\VORTEX12`;
- Padronizada a resolução de `ffmpeg.exe` e `ffprobe.exe` em `api-server/services/video_service.js`, `api-server/documentary_engine.js` e `api-server/shorts_engine.js` através de `utils/paths.js` (`getFfmpegDir()`), apontando com precisão para `F:\VORTEX12_FILES\ffmpeg\bin\`;
- Mapeamento explícito do Genoma Central (`Themes`): implementada a seção formal de extração e mapeamento dos 12 campos e 4 blocos em todos os 6 contratos subordinados de `Todos_Contratos.md` (`Scenes50`, `Scenes45`, `Scenes916`, `FlowMaster`, `Caption` e `FlowMusic`), garantindo rastreabilidade estrutural estrita entre a matriz temática e todas as esteiras de geração;
- Otimização e Desacoplamento do `FlowMusic`: removida a dependência e injeção de 10 cenas visuais no prompt e no contrato oficial; o brief musical é gerado diretamente a partir de `title`, `description` (Contexto Mestre) e `musicStoryArc` (`beginning`, `turningPoint`, `resolution`) do Genoma Central, eliminando poluição de jargões gráficos; promovido o motor para `mistral-large-latest` com temperatura `0.82`, elevando a autoridade e densidade do brief sonoro e narrativo;
- Padronização Integral dos Contratos Mistral: todos os 7 contratos ativos (`Themes`, `Scenes50`, `Scenes45`, `Scenes916`, `FlowMaster`, `Caption` e `FlowMusic`) foram unificados no motor topo de linha `mistral-large-latest` com temperatura `0.82`, eliminando por completo a dependência do motor Small e assegurando consistência estilística, precisão terminológica e alta densidade editorial em todas as esteiras;
- Limpeza e Preparação do Diretório de Minisséries: executada a limpeza de todas as pastas legadas (`01` a `27`) e dos vídeos legados em `video social/` em `F:\VORTEX12_FILES\minisseries\`, mantendo preservados os recursos fixos `cta/` e `logo/` e a pasta `video social/` pronta para novos renders; validada a rotina de provisionamento automático (`ensureMiniseriesWorkspace` via `/api/init-render-folders`), garantindo que a geração de qualquer novo assunto crie instantaneamente a pasta da respectiva ID com todas as 10 subpastas operacionais padrão (`assunto`, `cta`, `flow`, `legendas`, `M<NN>`, `prompts`, `sonoplastia/m4a`, `sonoplastia/ass`, `sonoplastia/mp4`, `sonoplastia/flow-music`).
- Persistência Física Integral do Genoma Central e de Todos os Materiais Gerados em Disco:
  - Pasta `assunto/`: criada e provisionada automaticamente no workspace (`minisseries/<NN>/assunto/`), armazenando `genoma_central_<NN>.json` (estrutura completa com todos os 12 campos de DNA editorial da Mistral) e `genoma_central_<NN>.txt` (relatório editorial completo, humanamente legível e estruturado para auditoria do Diretor);
  - Pasta `legendas/`: persistência automática de `legenda_social_<NN>.txt` e `.json` gerados na esteira editorial e em `/api/generate-caption`;
  - Pasta `flow/`: persistência automática de `flow_master_prompts_<NN>.txt` e `.json` gerados no FlowMaster;
  - Pasta `prompts/`: persistência automática imediata de `10_prompts_gpt_<NN>.txt`/`.json`, `40_prompts_complementares_minisserie_<NN>.txt`/`.json`, `50_prompts_esteira_chatgpt_<NN>.txt`/`.json` e `5_prompts_gemini_motions_<NN>.txt`/`.json`;
  - Pasta `sonoplastia/flow-music/`: higienização preventiva de nomes de arquivos em disco para o padrão ASCII limpo `FLOW MUSIC - #<NN>.txt` (sem emojis de 4 bytes nem em-dash que provocavam artefatos `??` no sistema de arquivos Windows NTFS);
  - Rota de API `POST /api/minisseries/save-subject` e método `API.saveSubject` no frontend integrados com sucesso;
  - Minissérie 01 atualizada fisicamente com 100% dos seus arquivos gravados nas respectivas pastas;
- Unificação da Interface do Multiverso Minisséries & Eliminação Definitiva de Fases/CTA:
  - Fim das 4 fases intermediárias e eliminação de CTA (`minisseries/cta/` fixa e `minisseries/<NN>/cta/` deletadas do disco e removidas do provisionamento de workspaces em `miniseries_workspace_service.js`);
  - Ao abrir o Multiverso Minisséries ou clicar em uma minissérie na barra lateral à esquerda, o painel abre **diretamente a Esteira de Produção** (grade de 50 miniaturas com botões do robô);
  - Adicionado o botão destacado `✨ GERAR 40 PROMPTS` ao lado do título da minissérie (`Minissérie #<NN>`) na Esteira;
  - Modal flutuante e elegante de conferência dos 50 prompts (`openDocPromptsModal`), permitindo gerar os 40 prompts via Mistral (`/api/generate-scenes50`), copiar os 50 prompts (`copy50PromptsFromModal`) e fechar para comandar o robô imediatamente na esteira;
  - Limpeza completa de funções e submenus legados (`openDocPhase1Submenu`, `openDocPhase3Submenu`, `openDocPhase4Submenu`, `handleGenerateDocCTA`, `handleGenerateDocCaption`, `renderExpandedDocCardHTML`);
  - Suite de testes atualizada e 100% aprovada (`miniseries_workspace.test.js`, `final_minisserie_acervo_ui.test.js`, `final_minisserie_renderer_contract.test.js`).
- Aba CAPA (9:16 Vertical) e Reposicionamento do Botão COPIAR no Studio (Direção de Arte GPT):
  - Criada a aba/botão `CAPA` no **extremo esquerdo** da barra de controle de prompts (diretamente abaixo dos seletores de cena `01..10`);
  - Reposicionado o botão `📋 COPIAR` no **extremo direito** da mesma barra com alinhamento flex (`justify-content: space-between; width: 100%`);
  - Implementada a transformação programática local `window.formatCapaPrompt`: converte o prompt da **Cena 01** para o formato `9:16 vertical` (`A 9:16 vertical cinematic shot...`), mantendo o restante do prompt e permitindo cópia direta para a área de transferência;
  - Alternância perfeita entre a aba `CAPA` e as cenas `01..10`, com cópia contextual (`campaign.copiedCapa` e `s.copiedGPT`);
  - Estilização harmônica no Cockpit (`css/extension-mode.css`) e cobertura total na suite automatizada (`api-server/tests/extension_mode_visual_contract.test.js`).
- Backup e Restauração Direta na Pasta Raiz F:\VORTEX12:
  - Implementadas as funções `saveOfficialBackupToRoot`, `findLatestBackupInRoot` e `restoreLatestBackupFromRoot` em `api-server/services/miniseries_workspace_service.js`;
  - Rotas dedicadas `/api/backup/export-to-root`, `/api/backup/import-latest-root` e `/api/backup/latest-info` em `server.js`;
  - Exportação e importação operam diretamente no sistema de arquivos do servidor, salvando `VORTEX12-BACKUP-OFICIAL-YYYY-MM-DD.json` diretamente na raiz `F:\VORTEX12` sem exigir caixas de download de navegador ou seletores de arquivo;
  - Teste de contrato `api-server/tests/root_backup_restore_contract.test.js` criado e 100% aprovado.
- Compactação Completa do Sistema (ZIP) para Unidade Secundária D:\ (VORTEX D:):
  - Criado o serviço `api-server/services/system_zip_service.js` com suporte a `tar.exe` nativo e fallback para PowerShell `Compress-Archive`;
  - Gera arquivos compactados no formato `D:\VORTEX12-YYYY-MM-DD.zip` a partir de `F:\VORTEX12`, empacotando 100% de todos os arquivos e pastas sem qualquer exclusão (`node_modules`, `.git`, `.gemini`, backups oficiais e arquivos ocultos), garantindo que ao descompactar em qualquer ambiente o sistema funcione imediatamente e de forma 100% autossuficiente;
  - Rotas registradas em `server.js`: `POST/GET /api/backup/zip-system-to-d` e `GET /api/backup/zip-list`;
  - Botão `🗜️ COMPACTAR SISTEMA (ZIP)` adicionado ao menu `⚙️ SISTEMA` (`#dropdownSystem`) em `index.html` e integrado com feedback visual/toast em `js/ui.js` (`window.zipSystemToDriveD`);
- Homologação da Nova Arquitetura de Latência Zero do Flow Music ($t=0{,}0\text{s}$ no Beat 1):
  - Aprovada pelo Diretor-Geral a reformulação baseada na pesquisa de Engenharia de Prompt e Atenção Cruzada (Cross-Attention) para modelos de difusão de áudio (Flow Music, Suno AI, Udio):
    1. `[STYLE / MUSICAL COMPOSITION]`: Pureza de Tokens Positivos — eliminada 100% de qualquer ocorrência da palavra "intro" ou negações em linguagem natural (`no intro`, `no lead-in`) que contaminavam o espaço latente; aplicados atratores afirmativos de disparo imediato (`Immediate vocal start, direct vocal opening, instant vocal entry...`).
    2. `[EXCLUDE / NEGATIVE PROMPT]`: Supressão Negativa Expandida — centralização de todos os termos de exclusão temporal e micropausa (`intro, instrumental intro, intro riff, ambient intro, humming, oohs, aahs, pre-vocal pickup, soundscape riser, silence at start, delayed vocal start, spoken intro, acoustic intro solo, drum fill intro, guitar solo intro, synth pad buildup, breathy vocal delay, riser effect, gradual instrumental entrance, count-in, lead-in, instrumental buildup`).
    3. `[LYRICS]`: Eliminação de Ruído e Anacrusa — removidas meta-tags não canônicas (`[No Intro]`, `[Start immediately on beat 1]`) e textos em prosa explicativa que causavam fallback para intros automáticas de 2 a 8 compassos; o bloco agora inicia estritamente com a tag canônica `[Verse 1]`, exigindo que a primeira sílaba possua ataque consonantal tônico forte (eliminando anacrusa de artigos átonos como "Um" ou "O"); versos e refrões completos em pt-BR desenvolvidos para 180s com encerramento `[Fade Out]` e menção oficial à `InkVortex Brasil` no `[Outro]`.
    4. `[VOICE]`: Instrução acústica direta e sem ruído transiente: `Language: pt-BR; [Voz], [Timbre], powerful expressive phrasing, upfront vocal attack at 0.0s on beat 1, precise pt-BR enunciation...`.
  - Atualizados `Todos_Contratos.md` (`## Contrato: FlowMusic`), `F:\VORTEX12_FILES\minisseries\08\sonoplastia\flow-music\FLOW MUSIC - #08.txt` e `FLOW_MUSIC_08.json`;
  - Testes de contrato `api-server/tests/flow_music_direct_mistral_contract.test.js` e toda a suíte de 23 testes automatizados 100% aprovados.

## Regra de atualização

- Ao concluir tarefa, registre o estado, os arquivos alterados e os testes aplicados.
- Se houver pendência real, anote-a de forma objetiva no final.
- Não apague histórico consolidado sem autorização do Diretor-Geral.
- Autoridade Suprema da Verdade Física em Disco para TODAS as Pastas de Minisséries:
  - Implementada a função `readPhysicalCampaignWorkspace(root, rawCampaignNumber)` em `api-server/services/miniseries_workspace_service.js`, que lê diretamente do disco todos os 10 artefatos de cada minissérie (`assunto/`, `prompts/10_prompts_gpt_*.json`, `prompts/40_prompts_complementares.json`, `prompts/50_prompts_esteira_*.json`, `prompts/5_prompts_gemini_motions_*.json`, `flow/flow_master_prompts_*.json`, `legendas/legenda_social_*.json`, `sonoplastia/flow-music/FLOW MUSIC - #*.txt`, `sonoplastia/m4a/`, `M<NN>/`);
  - Registrado o endpoint `GET /api/minisseries/workspace-data?number=<NN>` em `api-server/server.js`;
  - Atualizado `serveStatic` no `api-server/server.js` para injetar cabeçalhos `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache` e `Expires: 0` para qualquer requisição em `/minisseries/` e pastas de mídia;
  - No frontend (`js/ui.js` e `js/documentarios.js`), eliminados pontos de `force-cache` e implementadas as rotinas `window.syncPhysicalWorkspaceForCampaign` e `window.openCampaignWorkspace` com `{ cache: 'no-store' }`, garantindo que toda seleção ou exibição de minissérie leia imediatamente os arquivos físicos gravados no disco, mantendo a tela 100% fiel à verdade física do diretório;
  - Teste unitário e de contrato `api-server/tests/miniseries_physical_disk_sync.test.js` criado e 100% aprovado junto com a suíte completa de 28 testes do estúdio.
- Limpeza dos 21 Eixos Tecnológicos e Simplificação do Modal (22 Eixos com Tema Livre sob demanda):
  - Em atendimento à determinação do Diretor-Geral, foram completamente eliminados os blocos intermediários descritivos do modal `Expandir Inteligência Editorial` (card de preview descritivo e campo fixo inferior de briefing longo que induziam a Mistral a ancorar em processos específicos);
  - O modal passou a conter exclusivamente o seletor principal de eixos tecnológicos com 22 opções:
    - 01 a 21: os 21 Eixos Tecnológicos de vanguarda, enviando estritamente `${t.title} [${t.category}]` para a Mistral (ex: `21. Impressão Têxtil Digital & Estamparia de Vanguarda [Impressão Têxtil Industrial]`), garantindo liberdade temática total para a IA explorar a vastidão de cada setor sem qualquer subtexto restritivo;
    - 22: `22. ✨ TEMA LIVRE / PERSONALIZADO`, que abre sob demanda um campo de texto dinâmico para o Diretor digitar livremente qualquer assunto/briefing personalizado;
  - Atualizados `api-server/utils/tech_themes.js`, `js/ui.js` e o cache busting em `index.html` (`?v=247`);
  - Teste de contrato `api-server/tests/tech_themes_modal_contract.test.js` atualizado para validar os 22 eixos com 100% de aprovação.
- Multiverso Social Expandido (Fatiador em Lote, Seletor Livre de Qualquer HD e Pastas Oficiais):
  - Criadas e integradas as pastas físicas oficiais: `F:\VORTEX12_FILES\video\` (destino dos vídeos e fatias de vídeo fatiadas) e `F:\VORTEX12_FILES\som\` (destino dos áudios e trilhas fatiadas);
  - Criado o serviço de varredura `browseFilesystem(dir)` em `api-server/services/social_mixer_service.js`, listando unidades do sistema (`C:`, `D:`, `E:`, `F:`) e permitindo navegação em qualquer pasta do computador;
  - Criado o modal de navegação visual `openSocialFsExplorer(type)` em `js/social.js` com botões rápidos de HDs (`Disco C:`, `Disco D:`, `Disco E:`, `VORTEX F:`, `Stacher F:`, `Vídeos F:`), navegação por pastas com `⬆️ Pasta Anterior`, filtragem de arquivos de mídia com tamanho em MB e seleção com 1 clique;
  - Criado o script `api-server/utils/pick_file.ps1` com formulário `TopMost` forçado para abertura da janela nativa do Windows Explorer em primeiro plano;
  - Corrigido o parsing de rotas em `api-server/server.js` (`/api/social-mixer/pick-file`, `/api/social-mixer/browse-fs`, `/api/social-media/file`) utilizando `new URL(req.url, 'http://127.0.0.1:' + PORT)` e eliminando o erro `parsedUrl is not defined`;
  - Criadas abas duplas na Coluna 3 do Multiverso Social: `⚡ 1. Mixagem Direta` (geração de MP4 final em 3 a 5 segundos via Fast Remux) e `✂️ 2. Fatiar em Lote` (desmembramento em fatias de 19 min, 3 min, 60s ou 10 min salvas automaticamente em `video/` e `som/`);
  - Removido o texto fixo `"VORTEX 12.0"` do topo central acima do portal no `index.html` (`#topbarTitle` limpo no estado inicial);
  - Diagnóstico técnico de miniaturas do Stacher concluído: o Stacher embute a imagem no `.opus` com sucesso, mas o Windows Explorer só renderiza miniaturas nativas para `.m4a` e `.mp3` (ou utilizando o utilitário `Icaros Thumbnail Provider`);
  - Cache-busting atualizado para `v=284` em `index.html`;
  - Suíte completa de 24 testes automatizados 100% aprovados;
  - Terceira Via Oficial de Geração de Imagens: DALL-E 3 (OpenAI API Direta):
  - Implementada a terceira via oficial de geração de imagens na Esteira de Produção, permitindo alternância direta no seletor de plataforma entre `GPT`, `GEMINI` e `DALL-E 3 (API)`;
  - Criado o serviço backend `api-server/services/dalle_api_service.js` integrando a API oficial da OpenAI com modelo `dall-e-3`, formato widescreen 16:9 (`1792x1024`), decodificação base64 direta (`b64_json`), staging isolado, cálculo de hash SHA-256 e commit protegido através de `robot_manifest.js`;
  - Criado o roteador de endpoints `api-server/routes/dalle_automation_routes.js` (`POST /api/automate-dalle/start`, `GET /api/automate-dalle/status`, `POST /api/automate-dalle/cancel`) e registrado em `api-server/server.js`;
  - Atualizado `api-server/robot_manifest.js` (`safeProvider`) para reconhecer `'dalle'` como provedor oficial ao lado de `'chatgpt'` e `'gemini'`;
  - Adicionado o container de telemetria visual `#docDalleMonitorContainer` em `index.html` e implementadas as funções no frontend `js/app.js` (`window.startDocDalleAutomation`, `window.pollDocDalleAutomationStatus`, `window.cancelDocDalleRobot`, `window.showDocDalleTopbarTelemetry`, `window.hideDocDalleTopbarTelemetry`);
  - Cache-busting atualizado para `v=285` em `index.html`;
  - Som Ambiente / Focus Studio com Navegação em Pastas (D:\Músicas):
  - Direcionada a biblioteca oficial de Som Ambiente do estúdio para a pasta `D:\Músicas` (com fallback transparente para `F:\VORTEX12_FILES\stacher` e `downloads`);
  - Criada navegação em dois níveis: Nível 1 lista as pastas/estilos disponíveis (`ambiente`, `Diversas`, `mix`, `strange kind of woman`) com contadores em tempo real; Nível 2 lista as faixas de áudio da pasta selecionada com suporte a busca rápida instantânea;
  - Adicionado botão `⬅ Ver Pastas` para retorno ao menu de estilos, suporte a streaming com range de bytes (`/api/ambient-audio/stream`), persistência da pasta e faixa ativa em `localStorage`, e reprodução contínua automática (`ended` -> próxima música);
  - Atualizados `api-server/utils/paths.js` (`getAmbientMusicDir`), `api-server/server.js` (`/api/ambient-audio/folders`, `/api/ambient-audio/list`, `/api/ambient-audio/stream`), `css/extension-mode.css` (`.ambient-folder-item`), `index.html` e `js/audio.js`;
  - Correção e Blindagem do Servidor Estático para Imagens e Palcos (serveStatic):
  - Corrigido o escopo da variável `isMediaRequest` em `api-server/server.js` na função `serveStatic`, eliminando o `ReferenceError` que bloqueava a entrega de imagens de cenários e miniaturas sem parâmetro de versão;
  - Atualizado o wallpaper mestre em `:root`, `js/app.js`, `index.html` e nos fallbacks para o arquivo físico real `/palco/01-obra-prima-inkvortex-hd.png`;
  - Implementada função de normalização e autocura `window.normalizeWallpaperUrl` que detecta e substitui caminhos legados quebrados pelo wallpaper oficial em qualquer sala do estúdio;
  - Adicionado teste de contrato em `api-server/tests/extension_mode_visual_contract.test.js`;
  - Aperfeiçoamento da Telemetria Visual e Resolução de Chaves do DALL-E 3 (OpenAI API):
  - Corrigida a função `getOpenAIApiKey` em `api-server/services/dalle_api_service.js` para garantir a resolução correta da função `env('OPENAI_API_KEY')` e `process.env.OPENAI_API_KEY`;
  - Integrada a telemetria do DALL-E 3 em `window.isDocRobotRunning` e `window.syncTopbarTitlesAndTelemetries` em `js/app.js`, permitindo que a barra de progresso verde (#10b981) e os logs de geração substituam o título da sala durante a execução;
  - Adicionada animação de status em tempo real no botão da esteira (`⏳ GERANDO [X/Y] (Z%)`), auto-resume ao recarregar a página e emissão de toasts de sucesso e de erro detalhados;
  - Atualizado tratamento de falha no loop assíncrono para marcar `status = 'error'` e reter o log de erro explicativo da OpenAI quando nenhuma imagem for gerada;
  - Restauração e Estabilização do Layout da Topbar:
  - Revertidas as alterações experimentais de posicionamento para restaurar a integridade visual original da `vortexTopbar` no dashboard e nas salas;
  - Aperfeiçoada a função `window.updateTopbarTitle` em `js/app.js` para ocultar automaticamente o container do título (`display: none`) quando em `multiverseWelcome`, impedindo que textos residuais apareçam sobrepostos ao portal central e ao neon;
  - Testes de contrato visuais em `api-server/tests/` 100% aprovados;
  - Cache-busting atualizado para `v=293` em `index.html`.






## Regra de atualização

- Ao concluir tarefa, registre o estado, os arquivos alterados e os testes aplicados.
- Se houver pendência real, anote-a de forma objetiva no final.
- Não apague histórico consolidado sem autorização do Diretor-Geral.


