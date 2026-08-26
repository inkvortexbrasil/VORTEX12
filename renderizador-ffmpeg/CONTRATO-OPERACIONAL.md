# Contrato operacional oficial do renderizador FFmpeg

## 1. Escopo e autoridade

Este contrato descreve o comportamento homologado do renderizador de áudio com capa e delimita os outros motores de vídeo existentes no VORTEX11. Divergência entre este documento e o código exige diagnóstico ao Diretor; não autoriza correção autônoma.

## 2. Motor homologado: áudio com capa e legenda dançante

### Entradas obrigatórias

Para a minissérie `<NN>`:

```text
minisseries/<NN>/sonoplastia/
├── flow-music/
│   └── prompt do Flow Music.txt        # não participa da legenda
├── m4a/
│   ├── Nome da Música.m4a              # áudio ouvido pelo Whisper
│   └── Nome da Música.txt              # letra oficial local
├── ass/
│   └── Nome da Música legendado.ass    # saída intermediária preservada
└── mp4/
    ├── capa.jpg                         # também aceita jpeg/png/webp
    └── Nome da Música legendado.mp4     # saída final
```

Regras:

- M4A e TXT oficial devem possuir o mesmo nome-base.
- O TXT de `flow-music/` não é letra, não é lido pelo alinhador e não é enviado ao Whisper.
- A capa deve se chamar `capa` ou `cover` com uma extensão aceita.
- O M4A, o TXT, a capa, o ASS e o MP4 final são ativos protegidos.

### Descoberta dos ativos

`api-server/server.js`, em `resolveAudioRenderAssets`, localiza:

- o primeiro M4A não legendado da pasta `m4a/`;
- o TXT com o mesmo nome-base;
- a capa em `mp4/`;
- as pastas de saída `ass/` e `mp4/`.

Ausência de M4A ou capa interrompe a renderização com erro explícito. A ausência de TXT ainda é tolerada pelo código, mas não representa o fluxo homologado.

## 3. Whisper-1: somente escuta do M4A

O código oficial está em `api-server/services/audio_service.js`, função `transcribeAudioWithOpenAIWhisper`.

A requisição contém:

- `file`: somente o M4A;
- `model`: `whisper-1`;
- `language`: `pt`;
- `response_format`: `verbose_json`;
- `timestamp_granularities[]`: `word`.

É proibido incluir o TXT no campo `prompt` ou em qualquer outra parte da requisição. A implementação oficial não possui parâmetro nem bloco de envio de letra ao Whisper.

O Whisper devolve palavras provisórias com `start` e `end`. A ortografia dele não é autoridade quando existe o TXT oficial.

## 4. TXT oficial e Needleman–Wunsch

Depois de receber a resposta do Whisper, `alignAudioAndText` lê localmente o TXT de mesmo nome-base.

Preparação do TXT:

- linhas entre colchetes, como `[Verse]`, são removidas;
- as demais palavras preservam a forma escrita no TXT;
- parênteses podem ser retirados visualmente pelo gerador, sem trocar a palavra-base.

O alinhamento usa Needleman–Wunsch com os pesos atuais:

- correspondência: `2.0`;
- divergência: `-0.5`;
- lacuna no TXT: `-1.5`;
- lacuna no Whisper: `-1.5`.

Para comparar, as palavras são normalizadas em minúsculas, sem acentos e sem pontuação. Para produzir o resultado, a palavra vem do TXT e o tempo vem da âncora correspondente do Whisper. Palavras sem correspondência direta recebem tempos interpolados entre as âncoras vizinhas.

O resultado final nunca deve substituir a ortografia oficial pela transcrição do Whisper.

## 5. Construção do ASS

O gerador oficial é `api-server/ass_generator.js`, função `generateTikTokAssScript`.

Parâmetros do áudio com capa definidos em `api-server/server.js`:

- resolução do ASS: 1080×1080;
- fonte: Space Grotesk;
- tamanho: 60;
- margem horizontal: 36;
- margem vertical: 120;
- máximo: quatro palavras por frase.

Comportamento visual:

- texto em maiúsculas;
- palavra ativa destacada em amarelo com micro-pop;
- demais palavras em branco;
- fundo, contorno e sombra definidos pelo estilo ASS;
- cada palavra ativa recebe um evento `Dialogue`.

Comportamento temporal:

- a frase parte das âncoras alinhadas do Whisper;
- duração máxima de tela: 2,8 segundos;
- frases muito curtas podem receber duração mínima de 1,4 segundo;
- essa duração mínima é obrigatoriamente cortada no início da frase seguinte;
- uma frase nunca pode continuar ativa depois que a próxima começou;
- o limite de quatro palavras continua preservado mesmo quando a janela é encurtada.

Essa última regra elimina a legenda dupla que aparecia atrás da frase atual.

## 6. FFmpeg em passagem única

O renderizador oficial é `renderAudioAssSinglePass`, em `api-server/server.js`.

Fluxo:

```text
capa + M4A + filtro de escala/corte + filtro subtitles/ASS
    └── uma codificação H.264 + uma codificação AAC
        └── MP4 final
```

Parâmetros homologados:

- imagem em loop a 25 fps;
- escala e corte central para 1080×1080;
- `setsar=1`;
- filtro `subtitles` com a pasta da Space Grotesk;
- vídeo H.264 por `libx264`;
- `preset ultrafast`;
- formato solicitado `yuv420p`;
- áudio AAC a 192 kbps;
- duração medida do M4A pelo FFprobe;
- `-shortest`;
- `-movflags +faststart`.

Não existe MP4-base intermediário no fluxo oficial. O ASS já contém toda a pista temporal necessária para a legenda dançar; portanto ele pode ser queimado junto da capa e do áudio.

## 7. Saídas e rotas

Rotas que usam o fluxo oficial de áudio com capa:

- `POST /api/render-m4a-video`;
- `POST /api/render-m4a-video-final`;
- `POST /api/generate-m4a-ass`, quando existe capa;
- `POST /api/burn-m4a-ass`.

O retorno do renderizador identifica `mode: audio-cover-single-pass`.

O MP4 final fica em:

```text
minisseries/<NN>/sonoplastia/mp4/<nome-base> legendado.mp4
```

O ASS fica em:

```text
minisseries/<NN>/sonoplastia/ass/<nome-base> legendado.ass
```

## 8. Evidência de homologação

O teste comparativo da minissérie 04 confirmou:

- 214 palavras no TXT e 214 palavras ativas no ASS;
- zero substituições de palavras;
- limite máximo de quatro palavras;
- redução de 21 sobreposições para zero;
- duração final idêntica entre uma e duas passagens;
- 3.836 quadros em ambas as saídas;
- áudio decodificado com SHA-256 idêntico;
- redução do FFmpeg de 113,98 para 87,86 segundos;
- ganho de 26,12 segundos, ou 22,91%;
- PSNR médio de 48,649255 dB entre as duas saídas;
- aprovação visual do Diretor.

Esses números são evidência do teste, não metas rígidas para músicas futuras.

## 9. Motor oficial da minissérie final

O motor vigente está em `api-server/services/final_minisserie_renderer.js` e é chamado por `POST /api/render-final-minisserie`.

### Entradas

Para a minissérie `<NN>`:

- abertura: `minisseries/<NN>/flow/master.mp4`, obrigatoriamente com vídeo e áudio;
- imagens: todos os arquivos `.jpg`, `.jpeg`, `.png` e `.webp` de `minisseries/<NN>/M<NN>/`, em ordem natural;
- áudio principal e autoridade de duração: primeiro M4A válido de `minisseries/<NN>/sonoplastia/m4a/`;
- legenda: ASS de mesmo nome-base, preferencialmente `<nome> legendado.ass`, em `sonoplastia/ass/`;
- encerramento: `minisseries/logo/logo.mp4`, obrigatoriamente com vídeo e áudio;
- saída: `minisseries/video social/MINISSERIE_<NN>_FINAL.mp4`.

É obrigatório existir ao menos uma imagem. A quantidade é dinâmica e nunca deve ser fixada em 50. Nomes-base duplicados de imagens bloqueiam a renderização para impedir ambiguidade.

### Duração e divisão das imagens

O FFprobe mede M4A, abertura e logo. O cálculo oficial é:

```text
tempo_intermediario = duração_M4A - duração_abertura - duração_logo
tempo_por_imagem = tempo_intermediario / quantidade_real_de_imagens
```

O M4A precisa ser maior que a soma da abertura e da logo. A saída deve divergir no máximo 0,2 segundo da duração medida do M4A.

### Vídeo, legenda e áudio em uma passagem

O comando único:

1. normaliza abertura, sequência de imagens e logo para 1920×1080, 24 fps e `yuv420p`;
2. concatena os três blocos visuais;
3. queima o ASS homologado já existente;
4. mantém o M4A ao longo de toda a duração;
5. mantém o áudio da abertura durante a abertura;
6. atrasa o áudio da logo para o início do encerramento;
7. mistura os três áudios com pesos `1 1 1`, `normalize=0` e limitador de segurança;
8. codifica H.264 com `preset ultrafast`, AAC 192 kbps e `faststart`.

“100%” significa ganho nominal `volume=1` para cada fonte. O limitador não reduz intencionalmente uma trilha; ele evita saturação quando as três somas ultrapassam o teto digital.

O ASS já está alinhado. Este motor não chama Whisper, não lê TXT, não executa Needleman–Wunsch e não altera o arquivo ASS.

### Catálogo verdadeiro e promoção protegida

`GET /api/documentaries` usa o mesmo resolvedor de ativos. Um item só é `finalized` quando existe um MP4 físico correspondente em `minisseries/video social/`. `flow/master.mp4` nunca é vídeo final e nunca pode aparecer como tal.

A renderização nasce em `minisseries/video social/.render-staging/`. Depois de validar vídeo, áudio e duração com FFprobe, o motor promove o MP4 para o nome oficial. Um final existente só pode ser substituído quando o operador confirma `overwrite: true`; se a promoção falhar, o arquivo anterior é restaurado.

`renderM4AVideoForCampaign` é um fluxo interno legado separado e não é autoridade do novo Acervo nem do áudio com capa.

## 10. Outros motores: não misturar contratos

### Documentário

As rotas `/api/generate-documentary` e `/api/render-documentary` atualmente retornam respostas de confirmação e não executam uma renderização real nesse servidor. `api-server/documentary_engine.js` fornece utilitários de áudio e geração de ASS, mas não deve ser apresentado como uma rota final ativa sem verificar os chamadores vigentes.

### Shorts e vídeo social

`api-server/shorts_engine.js` possui montagem em passagem única e uma função separada de queima de ASS. Esses contratos são independentes do áudio com capa.

## 11. Proibições

- Não enviar TXT ao Whisper.
- Não usar o prompt de `flow-music/` como letra.
- Não substituir Needleman–Wunsch por pareamento apenas por índice.
- Não permitir frases com mais de quatro palavras.
- Não reintroduzir duração mínima que invada a frase seguinte.
- Não reintroduzir um MP4-base no áudio com capa sem novo teste e autorização.
- Não exigir 50 imagens nem anunciar resolução ou finalização sem comprovação real.
- Não apresentar `flow/master.mp4` como vídeo final.
- Não chamar Whisper nem realinhar o TXT ao montar a minissérie final; reutilizar o ASS pronto.
- Não sobrescrever um vídeo final sem confirmação explícita do operador.
- Não aplicar automaticamente estes contratos a documentários, shorts ou outros renderizadores.
- Não sobrescrever entradas, resultados ou backups fora da execução explicitamente autorizada.
