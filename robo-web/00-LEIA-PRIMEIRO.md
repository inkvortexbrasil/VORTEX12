# 00 — LEIA PRIMEIRO: Robôs Web VORTEX11

Status: homologado.

Esta pasta documenta exclusivamente o funcionamento vigente dos robôs ChatGPT e Gemini do VORTEX11. Ela foi criada do zero depois da retirada integral da documentação legada.

## O princípio central

Os provedores não conversam entre si e não acessam o chat um do outro. A coordenação acontece por um manifesto central por minissérie e modo:

`minisseries/<NN>/prompts/robot_manifest_<NN>_<modo>.json`

O manifesto protege posições, concorrência, staging, hash e arquivos aceitos. A presença física do arquivo exibido na miniatura é a verdade operacional de conclusão; URL, provedor e estado `generated` são telemetria auxiliar e não bloqueiam uma nova tentativa sem arquivo.

## Contratos homologados

- GPT e Gemini abrem um chat novo em toda rodada normal.
- O robô prepara o modo “Criar imagem” quando necessário, sem trocar o modelo escolhido pelo operador.
- Sem seleção, o robô recebe a fila oficial completa; com qualquer seleção, recebe somente as posições absolutas marcadas.
- `MARCAR VAZIAS` seleciona apenas miniaturas sem arquivo físico.
- O Resgate usa somente o chat visível deixado pelo Diretor, não envia prompts e não consulta nem reabre URL histórica.
- ChatGPT e Gemini são controlados exclusivamente nas guias atuais do Edge pela Ponte VORTEX.
- Perfis dedicados, portas de depuração e navegadores separados foram aposentados; a pasta raiz `profiles/` não pertence ao fluxo oficial.
- Arquivos concluídos são imutáveis durante a execução normal.
- `.jpg`, `.jpeg`, `.png` e `.webp` da mesma posição representam o mesmo slot lógico.
- Cota esgotada preserva arquivos físicos concluídos e deixa todas as posições sem arquivo disponíveis para nova rodada ou outro provedor.

## Ordem de leitura desta pasta

1. Este arquivo.
2. `ARQUITETURA-HOMOLOGADA.md` — componentes e estados.
3. `OPERACAO-PASSO-A-PASSO.md` — preparação, execução, troca e recuperação.
4. `EXTENSAO-EDGE.md` — Ponte VORTEX, recarga e diagnóstico.
5. `MAPA-DE-ARQUIVOS.md` — autoridades do código e arquivos operacionais.
6. `CHECKLIST-DE-HOMOLOGACAO.md` — testes obrigatórios.

## Estado corrente

Não registre aqui contagens transitórias. Miniaturas e arquivos físicos mudam com cada rodada. Consulte sempre a grade atual e:

`GET /api/robot-manifest/status?number=<NN>&mode=minisseries`

A Ponte homologada opera no Edge em modo `same-chrome-window`, versão `1.1.6` ou superior.
