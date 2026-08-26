# Operação passo a passo

## 1. Preparar os arquivos

Para `minisseries/<NN>/sonoplastia/` confirme:

1. `m4a/Nome.m4a` existe.
2. `m4a/Nome.txt` existe e possui o mesmo nome-base.
3. `mp4/capa.jpg`, `capa.jpeg`, `capa.png`, `capa.webp` ou equivalente `cover.*` existe.
4. O TXT correto é a letra final; não use o arquivo de `flow-music/`.
5. Registre tamanho e SHA-256 de M4A, TXT e capa antes de um teste real.

## 2. Iniciar a Central

Use `iniciar-central.bat`. Alterações somente em `api-server/` exigem reinício da Central, não recarga da extensão do Edge.

Confirme:

```text
GET http://127.0.0.1:8787/api/ping
```

## 3. Executar o fluxo completo

Somente com autorização explícita para uso real:

```http
POST http://127.0.0.1:8787/api/render-m4a-video
Content-Type: application/json

{"campaignNum":"04"}
```

O servidor:

1. resolve M4A, TXT e capa;
2. mede a duração com FFprobe;
3. envia somente o M4A ao Whisper-1;
4. alinha o TXT local por Needleman–Wunsch;
5. grava o ASS sem sobreposição;
6. renderiza capa + M4A + ASS em uma passagem;
7. grava o MP4 final na pasta `mp4/`.

## 4. Gerar ou queimar separadamente

- `/api/generate-m4a-ass`: transcreve, alinha e grava o ASS; se houver capa, também renderiza o MP4.
- `/api/burn-m4a-ass`: recebe um ASS pronto ou texto editado com alinhamento existente e renderiza o MP4.
- `/api/transcribe-m4a-video`: etapa de transcrição/alinhamento para fluxos que precisam inspecionar o resultado antes da queima.

## 5. Conferir o resultado

Validação mínima:

- ASS e MP4 existem nos caminhos oficiais;
- contagem de palavras ativas do ASS coincide com o TXT processado;
- nenhuma duração de evento é zero ou negativa;
- nenhuma frase invade o início da próxima;
- nenhuma frase contém mais de quatro palavras;
- FFprobe confirma H.264, 1080×1080, 25 fps e AAC estéreo;
- duração do MP4 fica tecnicamente equivalente à do M4A;
- o vídeo abre pela Central e aceita leitura por intervalos;
- o Diretor confere sincronismo perceptivo, ortografia e ausência de legenda dupla.

Sincronismo cantado não é matematicamente perfeito em todas as sílabas. O critério é proximidade perceptiva estável, texto correto e ausência de colisões visuais.

## 6. Preparar a minissérie final no Acervo

Para `minisseries/<NN>/`, confirme:

1. `flow/master.mp4` existe e contém vídeo e áudio.
2. `M<NN>/` contém ao menos uma imagem `.jpg`, `.jpeg`, `.png` ou `.webp`; a quantidade existente será usada.
3. `sonoplastia/m4a/` contém o M4A principal.
4. `sonoplastia/ass/` contém o ASS já homologado com o mesmo nome-base do M4A.
5. `minisseries/logo/logo.mp4` existe e contém vídeo e áudio.
6. O M4A é mais longo que a soma da abertura e da logo.
7. A pasta `minisseries/video social/` é a única saída final; `flow/master.mp4` nunca é tratado como final.

## 7. Renderizar pelo novo Acervo

Na Central, entre em Multiverso Minisséries e selecione `ACERVO`. O catálogo informa somente estados verificados:

- `AGUARDANDO`: faltam ativos e o botão permanece bloqueado;
- `PRONTA`: todos os ativos existem e a quantidade real de imagens é mostrada;
- `FINALIZADO`: existe um MP4 físico na pasta de saída.

Selecione a minissérie e clique em `RENDERIZAR VÍDEO`. Durante a execução, o player mostra “Invocando Motores IA”. O servidor chama:

```http
POST http://127.0.0.1:8787/api/render-final-minisserie
Content-Type: application/json

{"campaignNum":"04","overwrite":false}
```

Se já existir final, a interface pede confirmação e envia `overwrite: true`. O resultado validado aparece no player embutido e fica em:

```text
minisseries/video social/MINISSERIE_<NN>_FINAL.mp4
```

Esse fluxo reutiliza o ASS existente e não consome Whisper.

## 8. Em caso de falha

1. Não faça nova alteração em cadeia.
2. Preserve erro, comando, arquivos e hashes.
3. Consulte `MUDANCAS-E-HOMOLOGACAO.md`.
4. Descarte somente o experimento que falhou; não ressuscite implementação antiga.
5. Reinicie a Central se o código vigente tiver sido alterado.
6. Repita primeiro os testes sintéticos; teste real somente com autorização.
