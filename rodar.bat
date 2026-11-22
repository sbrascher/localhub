@echo off
setlocal
cd /d "%~dp0src"

if not exist "node_modules" (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

echo Compilando e iniciando o LocalHub...
call npm run electron:preview
if errorlevel 1 (
  echo Erro ao executar o aplicativo.
  pause
  exit /b 1
)
