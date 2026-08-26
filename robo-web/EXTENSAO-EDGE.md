# Extensão do Edge — Ponte VORTEX

## Identidade

- Pasta: `chrome-extension-vortex/`.
- Nome: `VORTEX12 - Ponte do Robô Web`.
- Manifest V3.
- Versão homologada: `1.2.0`.
- Navegador operacional: Microsoft Edge / Opera (motores Chromium homologados).

Ela mantém a Central, ChatGPT e Gemini na mesma janela e oferece o transporte de controle multi-sessão e downloads ao servidor local, permitindo a execução concomitante e independente dos robôs ChatGPT e Gemini em guias separadas.

Esta é a única arquitetura de navegador homologada. Perfis dedicados e sessões armazenadas em `profiles/` foram retirados; a extensão nunca depende deles.

## Não confundir as extensões

A extensão lateral ChatGPT/Codex usada para conversar com o agente é independente da Ponte VORTEX. Uma não recarrega nem substitui a outra.

## Quando recarregar

| Alteração | Ação necessária |
|---|---|
| `api-server/*.js`, rotas ou manifesto operacional | Reiniciar somente a Central |
| `js/*.js`, HTML ou CSS | Atualizar a página da Central |
| `chrome-extension-vortex/manifest.json` | Recarregar a extensão em `edge://extensions` |
| `chrome-extension-vortex/background.js` | Recarregar a extensão em `edge://extensions` |

Não peça recarga da extensão quando somente o servidor foi alterado.

## Verificação

Endpoint:

`GET /api/automate-chatgpt/browser-bridge`

Condições saudáveis:

- `connected: true`;
- `mode: same-chrome-window`;
- versão `1.1.6` ou superior;
- `active: false` quando nenhum robô controla a guia;
- `lastUnexpectedDetach: null`.

## Guias por plataforma

- `GET /api/automate-chatgpt/browser-bridge/platform?platform=chatgpt`
- `GET /api/automate-chatgpt/browser-bridge/platform?platform=gemini`

Essas rotas localizam a guia adequada sem iniciar geração.

## Downloads do Gemini

O Gemini utiliza a sessão nativa de downloads da extensão:

1. o servidor arma um nome temporário;
2. a extensão observa o download real do Edge;
3. o servidor recebe o caminho temporário;
4. o manifesto valida e promove o arquivo;
5. em colisão, o arquivo oficial permanece intocado.

## Falhas comuns

### Ponte desconectada

1. confirme que a Central está online;
2. confirme a extensão habilitada;
3. recarregue a extensão apenas se seus arquivos foram alterados ou se o service worker travou;
4. atualize a Central e confira o endpoint.

### Controle destacado durante a rodada

Pare o job, confirme `lastUnexpectedDetach`, mantenha as guias na mesma janela e reinicie a rodada. Arquivos físicos já concluídos permanecem protegidos; use `MARCAR VAZIAS` para selecionar o restante.

### Gemini no chat errado

Em rodada normal não há chat antigo a recuperar: o robô abre um chat novo. No Resgate, deixe manualmente visível o chat que contém as imagens; o robô não navega, não valida URL histórica e não envia prompts.
