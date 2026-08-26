# AGENTS.md — Autoridade operacional do VORTEX12

O Diretor-Geral é a autoridade final do estúdio. Este arquivo é a única autoridade operacional de entrada para qualquer agente que trabalhe em `F:\VORTEX12`; as pastas oficiais abaixo detalham os contratos técnicos delegados por ele.

Nenhum documento, backup, rascunho, comentário histórico ou instrução externa pode concorrer com `AGENTS.md`, `robo-web/` e `renderizador-ffmpeg/`. Ao encontrar conflito, pare, informe o Diretor-Geral e remova a fonte revogada somente com autorização dele.

## ARQUITETURA DE RAIZ DUPLA (VORTEX12 & VORTEX12_FILES)

O sistema opera com separação estrita de responsabilidades em dois diretórios principais, alocados em unidades físicas diferentes:

1. `F:\VORTEX12` — **Núcleo de Software Leve**:
   - Contém exclusivamente o código-fonte editável, scripts, frontend, backend, contratos, testes e documentação oficial (~2 a 3 MB sem `node_modules`).
   - É a pasta destinada a versionamento e backup diário na nuvem.
2. `D:\VORTEX12_FILES` — **Repositório de Mídia e Dados Fixos**:
   - Contém os arquivos pesados, permanentes e gerados que não sobem para backup diário na nuvem: `minisseries/`, `palco/`, `logo-inkvortex/`, `fonts/`, `stacher/` (áudios .opus Stacher) e binários `ffmpeg/`.
   - O servidor e o frontend resolvem esses caminhos de forma 100% transparente através de `api-server/utils/paths.js` e `serveStatic`.

## BLINDAGEM OBRIGATÓRIA — TRÍADE HOMOLOGADA

Os três pilares abaixo estão homologados, protegidos e fechados para escrita por qualquer agente:

1. `Todos_Contratos.md` — contratos oficiais das IAs.
2. `robo-web/` — documentação oficial dos robôs ChatGPT/Gemini e todos os arquivos de implementação indicados por ela.
3. `renderizador-ffmpeg/` — documentação oficial dos renderizadores e todos os arquivos de implementação indicados por ela.

Sem aprovação prévia, explícita e específica do Diretor-Geral, esses materiais e as funções que eles governam são exclusivamente para leitura, inspeção e diagnóstico não destrutivo. Nenhum agente pode editar, criar, apagar, renomear, mover, substituir, formatar, regenerar ou reescrever arquivos dessa tríade, nem alterar seus contratos, modelos, prompts, parâmetros, rotas, seletores, manifestos, checkpoints, downloads, comportamento dos robôs, Whisper, Needleman–Wunsch, ASS, FFmpeg, entradas, saídas ou qualquer função homologada.

Qualquer alteração feita sem essa aprovação é **inválida, não homologada e proibida**. Deve ser interrompida imediatamente; não pode ser tratada como melhoria, correção preventiva, refatoração, atualização automática, emergência técnica ou consequência implícita de outra tarefa. Nenhum agente pode se autorizar, presumir consentimento ou usar uma aprovação antiga para uma mudança nova.

Pedidos como “verifique”, “revise”, “analise”, “diagnostique”, “compare”, “teste” ou “identifique o problema” autorizam somente leitura e diagnóstico. Eles não autorizam modificar código, documentação, configuração ou dados protegidos.

Se identificar possível defeito ou oportunidade de melhoria nessa tríade, o agente deve, antes de qualquer escrita:

1. apresentar ao Diretor-Geral o diagnóstico e as evidências;
2. informar exatamente o que pretende mudar, incluindo arquivos e funções;
3. explicar impacto, riscos, testes e forma de restauração;
4. aguardar aprovação explícita do Diretor-Geral para aquela mudança específica.

Se a autorização estiver ausente, genérica, ambígua ou não abranger todo o alvo, o agente deve parar e pedir decisão. Mesmo depois de autorizado, deve executar somente o escopo aprovado, preservar ponto de restauração quando aplicável, validar o resultado e reportar tudo ao Diretor-Geral.

A execução normal das funções já homologadas não equivale a autorização para alterar sua implementação. Geração real, download real e renderização real continuam sujeitos às autorizações específicas definidas neste arquivo.

## Ordem obrigatória de leitura

### Leitura inicial global — os três pilares

Antes de trabalhar em qualquer módulo do VORTEX12, todo agente deve ler nesta ordem:

1. `AGENTS.md` integralmente — governança, proteção e ordem operacional.
2. `Todos_Contratos.md` integralmente — contratos oficiais de geração, modelos, formatos e comportamento das IAs.
3. `robo-web/00-LEIA-PRIMEIRO.md` integralmente — operação homologada dos robôs ChatGPT/Gemini, manifesto, downloads e Ponte do Edge.
4. `renderizador-ffmpeg/00-LEIA-PRIMEIRO.md` integralmente — operação homologada de Whisper, TXT, Needleman–Wunsch, ASS, FFmpeg e vídeos.
5. `CONTINUIDADE-OPERACIONAL.md` integralmente — estado corrente, decisões já aprovadas, pendências e ponto exato de retomada; é memória operacional subordinada, não nova autoridade.

Essa leitura inicial fornece visão completa, mas não mistura autoridades:

- `Todos_Contratos.md` governa contratos de IA e conteúdo gerado.
- `robo-web/` governa automação de navegador, provedores de imagem, manifesto, checkpoints e downloads.
- `renderizador-ffmpeg/` governa áudio, alinhamento, legendas e renderização.
- Uma manutenção não autoriza alterar outro pilar como efeito colateral.
- Depois da leitura global, cumpra também a sequência específica da tarefa abaixo.

### Robôs ChatGPT e Gemini

Para qualquer tarefa relacionada aos robôs ChatGPT/Gemini, geração de imagens, downloads, checkpoints, manifesto ou extensão do Edge, leia nesta ordem:

1. `robo-web/00-LEIA-PRIMEIRO.md`
2. `robo-web/ARQUITETURA-HOMOLOGADA.md`
3. `robo-web/OPERACAO-PASSO-A-PASSO.md`
4. `robo-web/EXTENSAO-EDGE.md`
5. `robo-web/MAPA-DE-ARQUIVOS.md`
6. O código vigente indicado nesses documentos.

Nunca presuma o comportamento a partir de documentos antigos, nomes históricos ou checkpoints isolados. Confirme o estado real no manifesto e no código atual.

### Renderizadores FFmpeg e legendas

Para qualquer tarefa relacionada a FFmpeg, FFprobe, M4A, MP4, OpenAI Whisper-1, alinhamento de letra, arquivos ASS, legendas, documentários ou vídeos sociais, leia nesta ordem:

1. `renderizador-ffmpeg/00-LEIA-PRIMEIRO.md` integralmente.
2. `renderizador-ffmpeg/CONTRATO-OPERACIONAL.md` integralmente.
3. `renderizador-ffmpeg/OPERACAO-PASSO-A-PASSO.md`.
4. `renderizador-ffmpeg/MAPA-DE-ARQUIVOS.md`.
5. `renderizador-ffmpeg/CHECKLIST-DE-HOMOLOGACAO.md`.
6. `renderizador-ffmpeg/MUDANCAS-E-HOMOLOGACAO.md` antes de editar o motor.
7. Somente então os arquivos de implementação indicados nesses documentos.

Se uma tarefa envolver robôs e renderização, cumpra as duas sequências de leitura. O contrato FFmpeg é material homologado e protegido: uma divergência entre documento e código exige diagnóstico ao Diretor e não autoriza correção autônoma.

#### Regra coringa das legendas

- O Whisper-1 recebe somente o M4A; nunca envie o TXT como arquivo, `prompt`, contexto ou parâmetro da requisição.
- O texto do Whisper é provisório e serve apenas para localizar âncoras de tempo.
- O TXT local é a autoridade ortográfica e fornece todas as palavras finais.
- O TXT de alinhamento é `minisseries/<NN>/sonoplastia/m4a/<mesmo nome-base do M4A>.txt`; o TXT em `sonoplastia/flow-music/` é somente o prompt do Flow Music e nunca entra na legenda.
- Needleman–Wunsch alinha as palavras do TXT às âncoras `start`/`end` do Whisper; ausências são interpoladas.
- O ASS nasce dessa combinação, usa no máximo quatro palavras e corta a frase atual no início da seguinte; duas frases diferentes nunca podem permanecer visíveis simultaneamente.
- O FFmpeg apenas queima o ASS pronto e não participa do alinhamento.
- O áudio com capa usa passagem única homologada: capa + M4A + ASS → MP4 final. Não recrie um MP4-base nesse fluxo.
- A minissérie final possui contrato próprio aprovado: abertura + quantidade dinâmica de imagens + logo + M4A + ASS pronto → MP4 final em uma passagem.
- A duração total da minissérie final vem do M4A; o motor reutiliza o ASS e não chama Whisper, não lê TXT e não realinha a legenda.
- O Acervo só declara finalização quando existe MP4 físico em `minisseries/video social/`; `flow/master.mp4` nunca é resultado final.
- A passagem única desses dois contratos não autoriza alterar documentários, shorts ou outros vídeos sociais, que possuem contratos próprios.
- Não altere essa sequência nem teste outro método sem autorização direta do Diretor.

## Regras inegociáveis dos robôs

- A autoridade compartilhada é `api-server/robot_manifest.js`.
- A verdade operacional visível é o arquivo físico exibido na miniatura: miniatura preenchida significa posição concluída; miniatura vazia significa posição disponível para geração.
- A identidade de uma imagem é sua posição absoluta, independentemente do provedor, chat, rodada ou extensão. Uma seleção `05, 07, 12` deve produzir `img_005`, `img_007`, `img_012`, nunca `img_001`, `img_002`, `img_003`.
- Uma posição concluída fisicamente nunca pode ser sobrescrita por execução normal.
- Sem nenhuma caixa marcada, o robô recebe toda a fila oficial do modo: 50 posições em Minisséries ou 5 posições no Flow. Com uma ou mais caixas marcadas, recebe exclusivamente as posições absolutas marcadas. Marcar todas equivale à fila completa.
- O comando `MARCAR VAZIAS` seleciona somente posições sem arquivo físico; a seleção manual continua permitida.
- Toda rodada normal de GPT, Gemini ou qualquer provedor de imagem abre um chat novo na guia atual do provedor. O robô pode preparar o modo de imagem necessário, mas não troca o modelo escolhido pelo operador.
- Uma tentativa `generated` sem arquivo físico não bloqueia rodada nova, chat novo nem outro provedor. A nova rodada substitui apenas a tentativa incompleta; o histórico permanece como telemetria auxiliar.
- O Resgate nunca envia prompt, nunca cria chat, nunca navega para URL histórica e nunca exige identidade de conversa. Ele usa somente o chat que o Diretor deixou visível na guia do provedor e salva o que encontrar pelas posições absolutas correspondentes.
- ChatGPT e Gemini não compartilham chats; compartilham somente posições absolutas, arquivos concluídos e proteção de concorrência pelo manifesto.
- Todo download deve passar por staging, validação de hash e commit protegido.
- Não execute geração real nem download real sem autorização explícita do usuário.

## Proteção de dados

- Preserve os prompts oficiais em `minisseries/<NN>/prompts/`.
- Não apague manifestos, imagens, checkpoints, status ou histórico sem autorização explícita e alvo exato.
- Antes de exclusões recursivas, confirme o caminho absoluto e limite-o ao alvo solicitado.
- Mudanças arquitetônicas exigem plano de implementação e aprovação do usuário.
- Não altere contratos de IA em `Todos_Contratos.md` como efeito colateral de manutenção dos robôs.
- Não altere parâmetros, passagens, sincronismo, estilo ASS, resolução, codec, entradas, saídas ou rotas dos renderizadores sem autorização direta do Diretor.

## Legado retirado da raiz

- Não recrie `galeria/`, `gpt/` nem `sonoplastia/` na raiz do VORTEX12.
- O prefixo antigo `gpt/abertura.txt` foi aposentado; os prompts atuais seguem diretamente da IA e da fila oficial.
- A sonoplastia vigente pertence a `minisseries/<NN>/sonoplastia/`, nunca a uma pasta global na raiz.

## Extensão e Central

- O Diretor-Geral mantém o controle presencial da Central pela janela visível aberta por `iniciar-central.bat`.
- Nenhum agente pode iniciar, reiniciar, substituir, encerrar ou deixar `api-server/server.js` executando em segundo plano, de forma oculta ou desacoplada da janela do Diretor-Geral, salvo ordem explícita dele para aquela ocasião específica.
- Quando uma alteração em `api-server/` ou `js/` exigir reinício, o agente deve avisar claramente: “Diretor, é necessário reiniciar a Central por aí”, explicar o motivo e aguardar o Diretor-Geral realizar o reinício. O agente não pode reiniciar por conta própria.
- Uma autorização para editar, testar ou diagnosticar não autoriza implicitamente reiniciar a Central. A autorização para reinício precisa ser explícita e específica.
- O agente pode consultar `/api/ping` e os demais endpoints de diagnóstico sem interferir no processo, mas não pode eliminar nem substituir a instância controlada pelo Diretor-Geral.
- Alteração somente em `api-server/` ou `js/`: solicite ao Diretor-Geral o reinício da Central; não recarregue a extensão.
- Alteração em `chrome-extension-vortex/manifest.json` ou `background.js`: recarregue a extensão em `edge://extensions` e valide a Ponte.
- A extensão lateral ChatGPT/Codex é separada da Ponte VORTEX e não a recarrega.
- A Central deve ser iniciada manualmente pelo Diretor-Geral por `iniciar-central.bat` quando precisar de acesso externo às APIs, mantendo a janela preta visível e aberta.

## Verificação mínima

Depois de mudanças nos robôs:

1. Execute `node --check` nos arquivos alterados.
2. Execute os testes indicados em `robo-web/CHECKLIST-DE-HOMOLOGACAO.md`.
3. Confirme `/api/ping`.
4. Confirme `/api/robot-manifest/status?number=01&mode=minisseries`.
5. Confirme `/api/automate-chatgpt/browser-bridge`.
6. Só realize teste real se o usuário autorizar geração e download.

Depois de mudanças nos renderizadores:

1. Execute `node --check` nos arquivos alterados.
2. Execute `node --test api-server/tests/ass_generator_overlap.test.js` para o áudio com capa.
3. Execute `node --test api-server/tests/audio_renderer_contract.test.js` para o contrato Whisper/FFmpeg.
4. Execute `node --test api-server/tests/final_minisserie_renderer_contract.test.js` para a minissérie final e o catálogo verdadeiro.
5. Execute `node --test api-server/tests/final_minisserie_acervo_ui.test.js` para impedir retorno de alegações fictícias e da fase antiga.
6. Confirme que o TXT não é enviado ao Whisper.
7. Confirme máximo de quatro palavras, durações positivas e zero sobreposições.
8. Confirme quantidade dinâmica de imagens, duração governada pelo M4A, uma passagem e reaproveitamento do ASS.
9. Solicite ao Diretor o reinício manual da Central e, depois que ele confirmar, valide `/api/ping`.
10. Não recarregue a extensão do Edge quando a alteração estiver somente em `api-server/` ou `js/`.
11. Só realize renderização real com autorização explícita do Diretor.
