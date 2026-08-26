# Checklist de homologação

## Sem renderização real

Execute após mudanças no motor:

```powershell
node --check api-server/ass_generator.js
node --check api-server/services/audio_service.js
node --check api-server/services/video_service.js
node --check api-server/services/final_minisserie_renderer.js
node --check api-server/server.js
node --check js/documentarios.js
node --test api-server/tests/ass_generator_overlap.test.js
node --test api-server/tests/audio_renderer_contract.test.js
node --test api-server/tests/final_minisserie_renderer_contract.test.js
node --test api-server/tests/final_minisserie_acervo_ui.test.js
```

Confirme também:

- nenhum `form.append('prompt', ...)` ativo na função do Whisper;
- `form.append('file', ...)` recebe o M4A;
- o resultado alinhado usa `word` do TXT e `start`/`end` do Whisper;
- `maxWordsPerPhrase` permanece em quatro;
- o gerador limita o fim da frase ao início da seguinte;
- o áudio com capa usa `renderAudioAssSinglePass`;
- o retorno informa `audio-cover-single-pass`;
- não existe criação de MP4-base nesse fluxo;
- FFmpeg e FFprobe locais existem em `ffmpeg/bin/`.
- o catálogo nunca apresenta `flow/master.mp4` como final;
- a minissérie final aceita qualquer quantidade positiva de imagens;
- a duração intermediária é dividida pela contagem real de imagens;
- o comando final usa uma passagem, queima o ASS já existente e não chama Whisper;
- o M4A determina a duração total;
- abertura, M4A e logo entram com ganho nominal `volume=1` e limitador de segurança;
- um arquivo final existente exige confirmação explícita de substituição;
- a interface não anuncia “8K” nem qualquer qualidade não verificada.

Depois de reiniciar a Central:

```text
GET /api/ping
```

## Com teste real autorizado

Antes:

- registre SHA-256 das entradas e saídas existentes;
- confirme que o alvo pode ser sobrescrito ou use nome/pasta de laboratório;
- preserve um ponto de restauração.

Depois:

- compare palavras do TXT com palavras ativas do ASS;
- confirme zero sobreposições e máximo de quatro palavras;
- use FFprobe para codecs, resolução, fps, áudio e duração;
- compare o hash do áudio decodificado quando houver baseline;
- extraia amostras visuais nos limites entre frases;
- assista ao vídeo completo;
- somente o Diretor pode declarar a homologação perceptiva.

Para a minissérie final, confirme adicionalmente:

- ordem natural de todas as imagens existentes;
- abertura primeiro, imagens no meio e logo no final;
- áudio do M4A durante toda a obra;
- áudio próprio da abertura e da logo audível em seus respectivos trechos;
- legenda ASS existente dançando sem regressão e sem nova transcrição;
- duração final tecnicamente equivalente ao M4A;
- MP4 promovido para `minisseries/video social/` e reproduzido pelo player do Acervo;
- estado, tamanho, data e quantidade de imagens mostrados pelo Acervo correspondem ao disco.

## Critério de falha

Falhe a homologação se ocorrer qualquer um destes casos:

- TXT enviado ao Whisper;
- palavra final que não venha do TXT oficial;
- duas frases diferentes simultâneas;
- mais de quatro palavras na mesma frase;
- evento de duração nula ou negativa;
- áudio ausente, truncado ou diferente sem justificativa;
- mudança involuntária de resolução, fps, fonte, estilo ou caminho;
- criação de arquivo intermediário no áudio com capa;
- apresentação de abertura, cache ou arquivo inexistente como vídeo final;
- exigência rígida de 50 imagens;
- nova chamada ao Whisper durante a montagem da minissérie final;
- sobrescrita do MP4 final sem confirmação;
- aplicação automática desta arquitetura a outro renderizador.
