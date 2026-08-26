# Mapa oficial de arquivos

## Motor de áudio com capa

| Arquivo | Responsabilidade |
|---|---|
| `api-server/server.js` | Resolve ativos, expõe rotas, define opções do ASS e executa a passagem única. |
| `api-server/services/audio_service.js` | Envia somente o M4A ao Whisper-1, lê o TXT local, executa Needleman–Wunsch e interpola ausências. |
| `api-server/ass_generator.js` | Agrupa até quatro palavras, gera o estilo dançante e impede sobreposição entre frases. |
| `api-server/services/video_service.js` | Resolve `ffmpeg.exe`/`ffprobe.exe`, mede duração e executa comandos com limite de tempo. |
| `api-server/tests/ass_generator_overlap.test.js` | Garante máximo de quatro palavras, duração positiva e ausência de colisões. |
| `api-server/tests/audio_renderer_contract.test.js` | Impede retorno de TXT no Whisper, rota Voxtral duplicada ou duas passagens no áudio com capa. |

## Motor da minissérie final e Acervo

| Arquivo | Responsabilidade |
|---|---|
| `api-server/services/final_minisserie_renderer.js` | Resolve ativos, conta imagens dinamicamente, calcula tempos pelo M4A, monta o comando único, usa staging e promove a saída validada. |
| `api-server/services/video_service.js` | Fornece FFmpeg/FFprobe e valida duração, vídeo, áudio, codec e dimensões. |
| `api-server/server.js` | Expõe `GET /api/documentaries` e `POST /api/render-final-minisserie`; delega ao serviço oficial. |
| `js/documentarios.js` | Exibe estados verdadeiros no Acervo, aciona a renderização e reproduz o MP4 final no player embutido. |
| `css/components.css` | Animação “Invocando Motores IA” durante a renderização. |
| `api-server/tests/final_minisserie_renderer_contract.test.js` | Garante catálogo verdadeiro, quantidade dinâmica, uma passagem, ASS existente e mixagem dos três áudios. |

## Executáveis e fontes

| Caminho | Uso |
|---|---|
| `ffmpeg/bin/ffmpeg.exe` | Renderização local oficial. |
| `ffmpeg/bin/ffprobe.exe` | Medição e inspeção local oficial. |
| `fonts/Space_Grotesk/` | Fonte do ASS de áudio com capa. |

## Outros motores

| Arquivo | Situação |
|---|---|
| `api-server/documentary_engine.js` | Utilitários de documentário e ASS; verificar chamador antes de qualquer mudança. |
| `api-server/shorts_engine.js` | Montagem e queima de legendas para shorts; contrato independente. |
| `api-server/server.js::renderM4AVideoForCampaign` | Fluxo interno de vídeo social; não confundir com áudio de capa. |

## Dados por minissérie

| Caminho | Conteúdo |
|---|---|
| `minisseries/<NN>/sonoplastia/flow-music/` | Prompt do Flow Music; fora da legenda. |
| `minisseries/<NN>/sonoplastia/m4a/` | M4A e TXT oficial com mesmo nome-base. |
| `minisseries/<NN>/sonoplastia/ass/` | ASS final preservado. |
| `minisseries/<NN>/sonoplastia/mp4/` | Capa e MP4 legendado final. |
| `minisseries/<NN>/flow/master.mp4` | Abertura da minissérie final; não é resultado final. |
| `minisseries/<NN>/M<NN>/` | Quantidade dinâmica de imagens da minissérie final. |
| `minisseries/logo/logo.mp4` | Encerramento compartilhado com áudio preservado. |
| `minisseries/video social/` | Saída oficial dos MP4 finais e staging temporário protegido. |

## Rotas

| Rota | Função principal |
|---|---|
| `POST /api/render-m4a-video` | Fluxo completo homologado. |
| `POST /api/render-m4a-video-final` | Alias do fluxo completo homologado. |
| `POST /api/generate-m4a-ass` | Geração/alinhamento do ASS; renderiza se houver capa. |
| `POST /api/burn-m4a-ass` | Queima ASS já preparado em passagem única. |
| `POST /api/transcribe-m4a-video` | Transcrição e alinhamento sem assumir renderização final. |
| `GET /api/documentaries` | Catálogo verdadeiro do Acervo, baseado nos arquivos reais. |
| `POST /api/render-final-minisserie` | Motor oficial da minissérie completa em uma passagem. |
| `POST /api/render-documentary` | Atualmente resposta de confirmação, sem render real. |
