# Mudanças e homologação futura

Esta pasta oficial e o código vigente são as únicas referências para o renderizador. Não existe contrato legado autorizado.

Qualquer nova mudança deve seguir:

1. diagnóstico escrito sobre o código vigente;
2. autorização do Diretor-Geral;
3. experimento separado, sem sobrescrever o resultado oficial antes da aprovação;
4. uma variável técnica por teste;
5. comparação objetiva de texto, tempos, áudio, vídeo, duração e desempenho;
6. validação perceptiva do Diretor-Geral;
7. implementação no motor oficial;
8. atualização desta pasta e do `AGENTS.md`;
9. execução integral de `CHECKLIST-DE-HOMOLOGACAO.md`;
10. remoção de rascunhos e instruções substituídas para que não se tornem autoridade concorrente.

Se uma mudança falhar antes da homologação, descarte apenas o experimento e mantenha o motor oficial vigente. Não ressuscite contratos ou implementações antigas.

## Estado atual da minissérie final

O novo Acervo e o motor `final-minisserie-single-pass` foram implementados após diagnóstico, plano e aprovação explícita do Diretor-Geral.

Já verificado sem renderização real:

- sintaxe dos arquivos alterados;
- catálogo baseado em arquivos reais;
- `flow/master.mp4` excluído da condição de finalização;
- quantidade dinâmica de imagens;
- cálculo governado pela duração do M4A;
- ASS existente queimado sem Whisper;
- mixagem nominal dos três áudios;
- staging, validação e promoção protegida;
- ausência de alegação “8K” na interface do novo Acervo.

Ainda pendente:

- reinício manual da Central pelo Diretor-Geral;
- validação visual da nova interface;
- primeira renderização real quando existir ao menos uma imagem e o Diretor autorizar;
- homologação perceptiva de imagem, áudios, legenda e desempenho.

Até essa validação real, não altere parâmetros técnicos para “otimizar” o motor. Primeiro execute o contrato atual, preserve o ponto de restauração e apresente evidências ao Diretor-Geral.
