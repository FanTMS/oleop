#!/bin/bash

echo "============================================================"
echo "🚀 Запуск локального сервера для разработки"
echo "============================================================"
echo ""

# Проверяем наличие Python
if command -v python3 &> /dev/null; then
    echo "✅ Python3 найден, запускаем сервер..."
    echo ""
    python3 server.py
elif command -v python &> /dev/null; then
    echo "✅ Python найден, запускаем сервер..."
    echo ""
    python server.py
# Проверяем наличие Node.js
elif command -v node &> /dev/null; then
    echo "✅ Node.js найден, запускаем сервер..."
    echo ""
    node server.js
else
    echo "❌ Не найден Python или Node.js"
    echo ""
    echo "💡 Установите один из них:"
    echo "   - Python: https://www.python.org/downloads/"
    echo "   - Node.js: https://nodejs.org/"
    echo ""
    exit 1
fi

