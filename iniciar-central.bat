@echo off
setlocal
title Central VORTEX 12.0
color 0B
echo ===================================================
echo INICIANDO CENTRAL INKVORTEX V12.0
echo ===================================================

cd /d F:\VORTEX12

echo.
echo [1/3] Verificando acesso HTTPS as APIs LLM (OpenAI e Mistral)...
node api-server\llm_connectivity_check.js
if errorlevel 1 (
  color 0C
  echo.
  echo ===================================================
  echo CENTRAL NAO INICIADA
  echo O pre-teste de rede falhou. A Central anterior,
  echo se existir, foi preservada sem alteracao.
  echo Se aparecer EACCES, execute este arquivo diretamente
  echo pelo Windows, fora de qualquer agente ou sandbox.
  echo ===================================================
  echo.
  pause
  exit /b 1
)

echo.
echo [2/3] Garantindo uma unica Central na porta 8787...
node api-server\central_process_guard.js --replace
if errorlevel 1 (
  color 0C
  echo.
  echo ===================================================
  echo CENTRAL NAO ALTERADA
  echo A porta 8787 pertence a outro processo ou nao foi
  echo possivel confirmar com seguranca a Central antiga.
  echo Nenhum processo desconhecido foi encerrado.
  echo ===================================================
  echo.
  pause
  exit /b 1
)

echo.
echo [3/3] Iniciando o servidor operacional...
echo O navegador sera aberto uma unica vez quando a API
echo estiver pronta. Mantenha esta janela aberta.
echo.
set OPEN_BROWSER=0
node api-server\server.js

if errorlevel 1 (
  color 0C
  echo.
  echo A Central foi encerrada por uma falha operacional.
  echo Leia a mensagem acima; contratos e dados foram preservados.
  echo.
  pause
  exit /b 1
)

echo.
echo A Central foi encerrada.
pause
endlocal
