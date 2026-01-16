@echo off
setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set FRONTEND_DIR=%SCRIPT_DIR%..\frontend
set STATIC_DIR=%SCRIPT_DIR%staticfiles

if exist "%FRONTEND_DIR%" (
  echo [INFO] Construindo frontend...
  pushd "%FRONTEND_DIR%"
  call npm install
  call npm run build
  popd

  echo [INFO] Atualizando arquivos estaticos...
  if exist "%STATIC_DIR%" rmdir /s /q "%STATIC_DIR%"
  mkdir "%STATIC_DIR%"
  xcopy "%FRONTEND_DIR%\dist\*" "%STATIC_DIR%" /E /I /Y
) else (
  echo [WARN] Diretorio do frontend nao encontrado: %FRONTEND_DIR%
)

echo [INFO] Gerando executavel (Windows onefile)...
pyinstaller --clean --noconfirm "%SCRIPT_DIR%marmitaria_desktop.spec"

echo [INFO] Build concluido. Verifique a pasta dist\Marmitaria.exe
endlocal
