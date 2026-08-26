# Checklist de homologação

## Antes de testar

- [ ] Central iniciada na porta 8787.
- [ ] Ponte VORTEX conectada.
- [ ] Guia ChatGPT autenticada.
- [ ] Guia Gemini autenticada e modelo desejado selecionado.
- [ ] Manifesto sem conflitos.
- [ ] Nenhum outro job usando as mesmas posições.

## Verificação estática

Execute:

```powershell
node --check api-server\robot_manifest.js
node --check api-server\chatgpt_web_automation.js
node --check api-server\gemini_current_tab_automation.js
node --check api-server\routes\chatgpt_automation_routes.js
node --check api-server\routes\automation_routes.js
node api-server\tests\browser_profiles_retired.test.js
```

## Testes obrigatórios dos robôs

```powershell
node api-server\tests\robot_manifest.test.js
node api-server\tests\robot_quota_handoff.test.js
node api-server\tests\robot_recovery_routes.test.js
node api-server\tests\robot_provider_ui.test.js
node api-server\tests\chatgpt_checkpoint.test.js
node api-server\tests\chatgpt_direct_input.test.js
node api-server\tests\chatgpt_generation_wait.test.js
node api-server\tests\gemini_checkpoint.test.js
node api-server\tests\gemini_generation_order.test.js
node api-server\tests\gemini_flow_current_tab.test.js
node api-server\tests\browser_profiles_retired.test.js
```

## APIs de saúde

```text
GET http://127.0.0.1:8787/api/ping
GET http://127.0.0.1:8787/api/robot-manifest/status?number=01&mode=minisseries
GET http://127.0.0.1:8787/api/automate-chatgpt/browser-bridge
```

## Teste real — somente com autorização

1. Sem marcar caixas, confirme que GPT e Gemini recebem a fila oficial completa e abrem chat novo.
2. Marque posições não contíguas, como `05, 07, 12`, e confirme que somente elas são solicitadas.
3. Confirme que os arquivos mantêm os nomes absolutos `img_005`, `img_007`, `img_012`, sem renumeração `1..N`.
4. Use `MARCAR VAZIAS` e confirme que apenas miniaturas sem arquivo físico foram selecionadas.
5. Confirme `generated`, depois `completed`, arquivo, tamanho e SHA-256.
6. Tente selecionar uma posição concluída e confirme que foi ignorada e não sobrescrita.
7. Simule cota encerrada e confirme que posições sem arquivo continuam disponíveis em nova rodada ou outro provedor.
8. Deixe um chat com imagens visível e execute o Resgate; confirme que nenhum prompt foi enviado e nenhuma URL histórica foi aberta.
9. Tente colisão em outra extensão e confirme bloqueio.

## Critérios de aceite

- Nenhuma posição concluída é sobrescrita.
- Não há dois arquivos oficiais para a mesma posição.
- A seleção parcial preserva a numeração absoluta.
- Sem seleção, a fila oficial completa é usada.
- GPT e Gemini abrem chat novo em cada rodada normal e não trocam o modelo escolhido.
- Resgate usa exclusivamente o chat visível, sem prompt, navegação ou validação de URL histórica.
- Troca de chat ou provedor não repete arquivos concluídos; tentativas sem arquivo não bloqueiam nova geração.
- Reinício da Central preserva estado e libera reservas do processo anterior.
- Nenhum código ativo referencia `profiles/`, `--user-data-dir`, perfil dedicado ou porta de depuração própria.

## Observação sobre a suíte geral

O teste `audio_layout_ui.test.js` pertence ao layout visual de áudio e não mede os robôs. Uma falha nele deve ser tratada separadamente e nunca mascarada por alterações nos robôs.
