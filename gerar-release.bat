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

echo Gerando build de producao (Angular + Electron)...
call npm run build:all
if errorlevel 1 (
  echo Erro durante o build da aplicacao.
  pause
  exit /b 1
)

echo Empacotando release do LocalHub para Windows...
call npx electron-builder --win
if errorlevel 1 (
  echo Erro ao gerar o release.
  pause
  exit /b 1
)

echo.
echo ===================================================
echo Release do LocalHub gerado na pasta "release"!
echo ===================================================
pause
