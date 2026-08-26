# Arquitetura homologada dos robôs

## Visão geral

```text
Central VORTEX
    |
    +-- Fila oficial de prompts
    |
    +-- Manifesto compartilhado por posição
    |       +-- cenas
    |       +-- sessões
    |       +-- reservas
    |       +-- eventos
    |
    +-- Ponte VORTEX 1.1.6 no Edge
            +-- guia ChatGPT
            +-- guia Gemini autenticada
```

ChatGPT e Gemini nunca compartilham uma conversa. O manifesto é o protocolo comum.

## Navegador único

- O operador abre e autentica as guias ChatGPT e Gemini na mesma janela do Edge que contém a Central.
- A Ponte VORTEX entrega ao robô somente a guia correspondente ao provedor solicitado.
- Não existe perfil dedicado, `--user-data-dir`, porta de depuração, Chrome separado ou armazenamento de sessão em `profiles/`.
- A geração de 5 cenas Flow e a geração de 50 imagens de minissérie usam a mesma arquitetura `same-chrome-window`.
- ChatGPT e Gemini abrem um chat novo dentro da própria guia em toda rodada normal.
- O Resgate é a exceção: permanece no chat visível escolhido pelo Diretor e não envia prompts.

## Autoridade central

Arquivo: `api-server/robot_manifest.js`.

Responsabilidades:

- reconciliar manifesto e arquivos existentes;
- reservar posições para uma execução;
- registrar URL da conversa apenas como telemetria auxiliar;
- registrar geração antes do download;
- registrar conclusão somente depois da validação física;
- liberar reservas ao terminar, cancelar, falhar ou esgotar cota;
- rejeitar sobrescrita em qualquer extensão suportada;
- recuperar reservas abandonadas depois de reiniciar a Central.

## Estados de uma cena

| Estado | Significado | Pode ir para outro provedor? |
|---|---|---|
| `pending` | Não há arquivo oficial aceito | Sim |
| `generated` | A tentativa produziu uma resposta, mas ainda não existe arquivo oficial | Sim; pode haver nova rodada, chat ou provedor |
| `completed` | Arquivo oficial e SHA-256 validados | Não; deve ser preservada |
| `conflict` | Mais de um arquivo ocupa a mesma posição lógica | Não; exige diagnóstico humano |

## Identidade da posição

- Minisséries: `001` a `050`, arquivos `img_NNN.ext`.
- Flow: `01` a `05`, arquivos `cena_NN.ext`.
- Extensões aceitas: `.jpg`, `.jpeg`, `.png`, `.webp`.
- A extensão não cria outra posição. `img_001.jpg` e `img_001.png` colidem.

## Gravação protegida

1. O robô recebe ou captura o arquivo original.
2. Calcula SHA-256.
3. Verifica todas as extensões da posição.
4. Grava em `.robot-staging`.
5. Confere tamanho e hash do staging.
6. Promove com criação exclusiva para o nome final.
7. Confere novamente o arquivo final.
8. Só então marca `completed` no manifesto.

## Reservas e concorrência

Cada execução recebe um `runId`. Antes de enviar prompts, ela reserva posições pendentes. Outra execução não pode usar a mesma posição enquanto a reserva estiver ativa. Reservas possuem prazo e PID da Central; uma reserva de processo antigo é liberada após reinício.

## Seleção e identidade absoluta

- Sem caixas marcadas: fila oficial completa, com 50 posições em Minisséries ou 5 no Flow.
- Com uma ou mais caixas marcadas: somente as posições absolutas selecionadas.
- Marcar todas: fila completa.
- `MARCAR VAZIAS`: somente posições sem arquivo físico.
- A ordem do lote não altera identidade. As posições `05, 07, 12` continuam `05, 07, 12` no prompt, manifesto e arquivo final.

## Sessões e conversas

Cada sessão registra:

- provedor;
- modo;
- posições solicitadas, executáveis e ignoradas;
- URL observada da conversa, somente para diagnóstico;
- horário e resultado.

Nenhuma URL ou identidade interna de resposta é autoridade para uma rodada nova ou para o Resgate. A autoridade de conclusão é o arquivo físico validado na posição absoluta.

## Troca por cota

Quando o sistema reconhece limite de uso:

1. a sessão termina como `quota_exhausted`;
2. reservas de cenas não geradas são liberadas;
3. arquivos físicos concluídos permanecem protegidos;
4. qualquer posição sem arquivo físico pode seguir em chat novo, na mesma plataforma ou em outro provedor.

## Resgate no chat visível

O Diretor deixa aberto o chat desejado na guia do provedor. O Resgate não envia prompt, não cria chat, não navega para URL anterior e não valida identidade histórica. Ele apenas identifica as respostas presentes, associa-as às posições absolutas solicitadas e tenta os downloads protegidos.

## Quatro fluxos cobertos

| Fluxo | Provedor | Modo | Rota inicial |
|---|---|---|---|
| Dashboard | GPT | Flow, 5 cenas | `/api/automate-chatgpt/start` |
| Dashboard | Gemini | Flow, 5 cenas | `/api/automate-gemini/start` |
| Multiverso Minisséries | GPT | 50 cenas | `/api/automate-chatgpt/start` com fila completa |
| Multiverso Minisséries | Gemini | 50 cenas | `/api/automate-gemini-vortex/start` |

Todos utilizam o mesmo núcleo de manifesto e proteção de arquivos.
