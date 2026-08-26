# 00 — LEIA PRIMEIRO: renderização e legendas do VORTEX11

Esta pasta é a fonte oficial e atual para qualquer tarefa envolvendo FFmpeg, FFprobe, M4A, MP4, OpenAI Whisper-1, TXT de letra, Needleman–Wunsch e arquivos ASS no VORTEX11.

## Ordem obrigatória

1. Leia este arquivo integralmente.
2. Leia `CONTRATO-OPERACIONAL.md` integralmente.
3. Consulte `OPERACAO-PASSO-A-PASSO.md` antes de executar uma renderização.
4. Consulte `MAPA-DE-ARQUIVOS.md` antes de editar código.
5. Execute `CHECKLIST-DE-HOMOLOGACAO.md` depois de qualquer mudança.
6. Leia `MUDANCAS-E-HOMOLOGACAO.md` antes de editar o motor.

## Verdades que não podem ser reinterpretadas

- O Whisper-1 recebe somente o M4A. O TXT nunca vai como arquivo, `prompt`, contexto ou parâmetro.
- O TXT oficial de letra fica em `minisseries/<NN>/sonoplastia/m4a/` e possui o mesmo nome-base do M4A.
- O TXT em `sonoplastia/flow-music/` é somente o prompt levado ao Flow Music e não participa da legenda.
- O texto reconhecido pelo Whisper serve apenas para localizar tempos provisórios.
- Needleman–Wunsch combina as palavras corretas do TXT com os tempos do Whisper.
- O ASS usa no máximo quatro palavras por frase e uma frase nunca permanece ativa depois que a seguinte começa.
- O renderizador de áudio com capa aprovado usa uma única passagem: capa + M4A + ASS → MP4 final.
- A passagem única foi validada com áudio idêntico, mesma duração e redução de tempo mensurável.
- A minissérie final possui contrato próprio: `flow/master.mp4` + quantidade dinâmica de imagens + `logo/logo.mp4` + M4A + ASS pronto → MP4 final em uma única passagem.
- A duração total da minissérie final vem exclusivamente do M4A; o tempo intermediário é dividido igualmente pela quantidade real de imagens encontrada em `M<NN>/`.
- O motor final reutiliza o ASS homologado existente e não chama Whisper, não realinha o TXT e não recria a legenda.
- Os áudios do M4A, do vídeo de abertura e da logo participam da mixagem final com ganho nominal de 100%; um limitador de segurança impede clipping.
- Documentários, shorts e outros vídeos sociais continuam sendo fluxos distintos. Não aplique automaticamente os contratos acima neles.
- Nenhum parâmetro de sincronismo, fonte, estilo, resolução, codec, entrada ou saída pode ser alterado sem autorização do Diretor e teste comparativo.

## Estado homologado

O fluxo oficial de áudio com capa é:

```text
M4A ──> Whisper-1 ──> palavras provisórias + start/end
TXT local ──> palavras ortograficamente corretas
Whisper + TXT ──> Needleman–Wunsch ──> palavras do TXT com tempos alinhados
sequência alinhada ──> ASS, máximo 4 palavras, zero colisões entre frases
capa + M4A + ASS ──> FFmpeg em passagem única ──> MP4 final
```

O fluxo oficial da minissérie final é:

```text
flow/master.mp4 ─┐
M<NN>/*.{jpg,jpeg,png,webp} ─┼─> concatenação visual dinâmica ─┐
logo/logo.mp4 ───┘                                         │
M4A ──> duração total + áudio principal                    ├─> ASS pronto + FFmpeg em uma passagem ─> video social/MINISSERIE_<NN>_FINAL.mp4
áudios da abertura e da logo ──> mixagem nominal 100% ─────┘
```

Esse motor aceita uma ou mais imagens. Não existe obrigação técnica de 50 imagens e nenhuma interface pode anunciar resolução, finalização ou arquivo que não tenham sido confirmados no disco e pelo FFprobe.

## Proteção

Não use rascunhos, caches ou resultados experimentais como autoridade. O código vigente, o `AGENTS.md` e esta pasta oficial sempre prevalecem.
