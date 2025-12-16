#!/usr/bin/env python3
"""
Простой HTTP сервер для локальной разработки Telegram Mini App
Запуск: python server.py
"""

import http.server
import socketserver
import webbrowser
import os
from urllib.parse import urlparse

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Добавляем заголовки для CORS и правильной работы Telegram Web App
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Улучшенное логирование
        print(f"[{self.address_string()}] {format % args}")

def main():
    # Переходим в директорию скрипта
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    Handler = MyHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print("=" * 60)
            print(f"🚀 Сервер запущен!")
            print(f"📱 Откройте в браузере: http://localhost:{PORT}")
            print(f"📱 Или: http://127.0.0.1:{PORT}")
            print("=" * 60)
            print(f"📂 Рабочая директория: {os.getcwd()}")
            print(f"🛑 Для остановки нажмите Ctrl+C")
            print("=" * 60)
            
            # Автоматически открываем браузер
            try:
                webbrowser.open(f'http://localhost:{PORT}')
            except:
                pass
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n\n🛑 Сервер остановлен")
    except OSError as e:
        if e.errno == 98 or e.errno == 48:  # Address already in use
            print(f"\n❌ Порт {PORT} уже занят!")
            print(f"💡 Попробуйте другой порт или остановите процесс на порту {PORT}")
        else:
            print(f"\n❌ Ошибка: {e}")

if __name__ == "__main__":
    main()

