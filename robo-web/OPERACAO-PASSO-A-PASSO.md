# Operação passo a passo

## 1. Iniciar a Central

Use `F:\VORTEX11\iniciar-central.bat` diretamente no Windows.

O inicializador:

1. verifica acesso HTTPS às APIs;
2. garante uma única Central na porta 8787;
3. inicia `api-server/server.js`.

Não mantenha duas instâncias da Central.

## 2. Confirmar a Ponte VORTEX

No Edge, mantenha na mesma janela:

- Central em `http://127.0.0.1:8787/`;
- uma guia do ChatGPT autenticada;
- uma guia do Gemini autenticada.

Não abra Chrome separado nem crie perfil dedicado. A pasta raiz `profiles/` foi aposentada e não participa de login, geração, recuperação ou download.

Verifique:

- `GET /api/ping` → Central online;
- `GET /api/automate-chatgpt/browser-bridge` → `connected: true`;
- versão da extensão → `1.1.6` ou superior;
- modo → `same-chrome-window`.

## 3. Preparar as guias

Antes de iniciar qualquer robô, autentique ChatGPT e Gemini e deixe as guias ao lado da Central. Escolha manualmente o modelo desejado. A rodada normal abre um chat novo e prepara o modo de imagem necessário, sem trocar o modelo.

Na grade:

1. nenhuma caixa marcada solicita a fila oficial completa;
2. qualquer caixa marcada solicita exclusivamente as posições absolutas marcadas;
3. `MARCAR VAZIAS` seleciona automaticamente só as miniaturas sem arquivo físico;
4. marcar todas equivale à fila completa.

## 4. Executar uma rodada GPT

1. Confirme a guia ChatGPT autenticada.
2. Inicie o robô no dashboard ou no Multiverso Minisséries.
3. O GPT abre um chat novo.
4. A URL observada pode ser registrada apenas para diagnóstico.
5. Cada imagem é registrada como `generated` assim que confirmada.
6. Os downloads ocorrem depois da fase de geração.
7. Cada arquivo só vira `completed` após validação.

## 5. Executar uma rodada Gemini

1. Confirme a guia Gemini autenticada e o modelo desejado.
2. Inicie o robô correspondente.
3. O sistema utiliza a guia atual, abre um chat novo e ativa o modo de imagem.
4. O sistema não troca o modelo escolhido pelo operador.
5. Gera primeiro e baixa depois.
6. Registra geração e conclusão no manifesto central.

A mesma regra vale para o botão Gemini da Esteira: a rota histórica da interface foi mantida por compatibilidade, mas seu motor agora é exclusivamente a guia atual pela Ponte VORTEX.

## 6. Continuar com outro provedor

Se a cota acabar:

1. encerre ou aguarde o job indicar cota esgotada;
2. prepare o outro provedor;
3. inicie a mesma minissérie;
4. arquivos físicos `completed` serão ignorados e preservados;
5. use `MARCAR VAZIAS` para selecionar somente as posições ainda sem miniatura;
6. a nova rodada abre outro chat e mantém os números absolutos selecionados.

Não renumere nem remova arquivos para “forçar” a troca.

## 7. Recuperar downloads pendentes

Para GPT ou Gemini:

1. deixe visível na guia do provedor exatamente o chat que contém as imagens desejadas;
2. clique em `RESGATE`;
3. o robô não envia prompts, não cria chat e não navega para conversa histórica;
4. os arquivos encontrados são gravados pelas posições absolutas correspondentes;
5. posições já concluídas permanecem protegidas.

## 8. Consultar o estado

Use:

`GET /api/robot-manifest/status?number=01&mode=minisseries`

Resumo esperado:

- `pending` — não possui arquivo oficial;
- `generated` — tentativa sem arquivo oficial; pode ser gerada novamente;
- `completed` — preservar;
- `conflicts` — parar e diagnosticar;
- `activeClaims` — posições atualmente reservadas.

## 9. O que nunca fazer

- Não apagar prompts para reiniciar robôs.
- Não copiar uma imagem sobre outra posição concluída.
- Não trocar a guia do provedor durante uma execução ativa.
- Não editar manualmente o manifesto enquanto a Central estiver rodando.
- Não usar checkpoint isolado como autoridade de conclusão.
- Não realizar limpeza global sem autorização explícita e conferência dos alvos.
