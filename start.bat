@echo off
chcp 65001 >nul
echo ========================================
echo   Telegram Mini App - Анонимный чат
echo ========================================
echo.

REM Проверка наличия Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] Node.js не установлен!
    echo Пожалуйста, установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js найден
node --version
echo.

REM Проверка наличия node_modules
if not exist "node_modules\" (
    echo [INFO] Установка зависимостей...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ОШИБКА] Не удалось установить зависимости!
        echo [INFO] Попробуйте запустить fix-db.bat для исправления проблем
        pause
        exit /b 1
    )
    echo [OK] Зависимости установлены
    echo.
)

REM Проверка наличия better-sqlite3 (старая версия)
if exist "node_modules\better-sqlite3" (
    echo [ПРЕДУПРЕЖДЕНИЕ] Обнаружен better-sqlite3, который может вызывать проблемы
    echo [INFO] Рекомендуется запустить fix-db.bat для исправления
    echo.
)

REM Проверка наличия базы данных (опционально)
if not exist "database.db" (
    echo [INFO] База данных будет создана при первом запуске
    echo.
)

echo [INFO] Запуск сервера...
echo [INFO] Сервер будет доступен по адресу: http://localhost:3000
echo [INFO] Для остановки нажмите Ctrl+C
echo.
echo ========================================
echo.

REM Запуск сервера
node server.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ОШИБКА] Сервер завершился с ошибкой!
    pause
    exit /b 1
)

pause
